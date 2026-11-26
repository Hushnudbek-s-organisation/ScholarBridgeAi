import { db } from "@/db";
import { sql } from "drizzle-orm";
import type { ReviewFact, FailedCheck, DuplicateCandidate, ReviewQueueItem } from "@/lib/reviewQueue";
import { logSafe, safeErrorMessage } from "@/lib/observability";

interface RawFact {
  entity_type: string; entity_id: number; field_key: string;
  value_text: string | null; verification_status: string | null;
  source_url: string | null; verified_at: string | null;
  admission_cycle: string | null; value_type: string | null;
}
interface RawCheck {
  entity_type: string; entity_id: number; field_key: string;
  source_url: string | null; reason: string | null; checked_at: string;
  official_page_re_read: boolean; verification_succeeded: boolean; evidence_present: boolean;
}
interface RawJob {
  id: number; job_type: string; error: string | null; failed_verification: boolean | null;
  finished_at: string | null; created_at: string;
}
interface RawDup {
  entity_type: string; canonical_id: number; duplicate_id: number;
  name: string; matched_on: string; linked_rows: number;
}

function rows<T>(result: unknown): T[] {
  return ((result as { rows?: T[] })?.rows ?? []) as T[];
}

export interface QueueLoadResult {
  facts: ReviewFact[]; failedChecks: FailedCheck[]; duplicates: DuplicateCandidate[];
  /** True ONLY when the primary typed-fact table is unavailable (migration missing). */
  migrationPending: boolean;
  /** Named sources that failed. NEVER swallowed: the admin sees a partial state. */
  partialFailures: string[];
}

const VALUE_TYPES = new Set([
  "official_requirement", "observed_statistic", "computed_fit", "planning_estimate",
  "evidence_coverage", "experimental_index", "historical_acceptance_rate",
  "personal_admission_probability", "unknown", "not_published", "not_applicable", "unverified",
  // legacy labels kept for callers/guards
  "official_minimum", "observed_historical_average", "third_party_estimate", "calculated",
]);
const VERIFICATION_STATUSES = new Set(["verified", "review_needed", "unverified", "failed_verification"]);
const ENTITY_TYPES = new Set(["university", "program", "scholarship", "ranking", "source"]);

/** Preserve the migration's real entity_type — never coerce ranking/program to scholarship. */
function asEntityType(raw: unknown, fallback: "university" | "scholarship" = "scholarship") {
  return (typeof raw === "string" && ENTITY_TYPES.has(raw) ? raw : fallback) as
    "university" | "program" | "scholarship" | "ranking" | "source";
}

/** official_source_checks has a two-value CHECK, unlike catalogue_facts. */
function asCheckEntityType(raw: unknown): "university" | "scholarship" {
  return raw === "university" ? "university" : "scholarship";
}

/**
 * Postgres SQLSTATE is a fixed 5-character classifier (42P01 = missing table,
 * 42501 = permission denied). It explains WHY a source failed without ever
 * echoing the driver message, which can contain a connection string.
 */
function sourceErrorClass(reason: unknown): string {
  // Drizzle wraps the pg error in `cause`; check both levels.
  const candidates = [reason, (reason as { cause?: unknown } | null)?.cause];
  for (const c of candidates) {
    const code = (c as { code?: unknown } | null)?.code;
    if (typeof code === "string" && /^[A-Z0-9]{5}$/.test(code)) return `sqlstate:${code}`;
  }
  return safeErrorMessage(reason);
}

/**
 * Each of the four queue sources runs INDEPENDENTLY. A `Promise.all` + single
 * catch used to hide every successful source as soon as one table/column was
 * missing, reporting a misleading "migrationPending: all clear". Now a failed
 * source is named in `partialFailures` while the other three still feed the
 * queue; only the primary `catalogue_facts` failure means the migration is
 * genuinely not applied. No raw DB error (which may contain a connection
 * string) is logged or returned.
 */
export async function loadQueueInput(): Promise<QueueLoadResult> {
  const sources = {
    catalogue_facts: sql`
      SELECT entity_type, entity_id, field_key,
             COALESCE(value_text, value_numeric::text, '') AS value_text,
             verification_status, source_url, verified_at, admission_cycle, value_type
      FROM public.catalogue_facts WHERE is_active LIMIT 500
    `,
    official_source_checks: sql`
      SELECT entity_type, entity_id, field_key, source_url, reason, checked_at,
             official_page_re_read, verification_succeeded, evidence_present
      FROM public.official_source_checks
      WHERE verification_succeeded = false OR evidence_present = false
      ORDER BY checked_at DESC LIMIT 200
    `,
    refresh_jobs: sql`
      SELECT id, job_type, error, failed_verification, finished_at, created_at
      FROM public.refresh_jobs
      WHERE failed_verification = true OR status = 'failed'
      ORDER BY created_at DESC LIMIT 100
    `,
    // Duplicate candidates are matched on name+provider, NEVER on a single
    // hardcoded id. linked_rows counts applications/saves that must be
    // inspected before any merge.
    // Schema-accurate: scholarships has `title` (NOT `name`), and
    // `applications` links to universities, NOT scholarships. Linked rows are
    // counted from the tables that really reference scholarships.id. A wrong
    // column here used to fail the whole queue via Promise.all + catch.
    duplicates: sql`
      SELECT 'scholarship'::text AS entity_type, a.id AS canonical_id, b.id AS duplicate_id,
             a.title AS name, 'title+provider'::text AS matched_on,
             (SELECT count(*)::int FROM public.saved_scholarships ss WHERE ss.scholarship_id = b.id)
             + (SELECT count(*)::int FROM public.scholarship_sources src WHERE src.scholarship_id = b.id)
             AS linked_rows
      FROM public.scholarships a
      JOIN public.scholarships b
        ON a.id < b.id AND lower(btrim(a.title)) = lower(btrim(b.title))
        AND lower(btrim(coalesce(a.provider,''))) = lower(btrim(coalesce(b.provider,'')))
      LIMIT 100
    `,
  } as const;

  const names = Object.keys(sources) as (keyof typeof sources)[];
  const settled = await Promise.allSettled(names.map((n) => db.execute(sources[n])));
  const partialFailures: string[] = [];
  const ok = (name: keyof typeof sources): unknown => {
    const i = names.indexOf(name);
    const r = settled[i];
    if (r.status === "fulfilled") return r.value;
    partialFailures.push(name);
    logSafe("review_queue.source_failed", { requestId: "queue-load", source: name, errorClass: sourceErrorClass(r.reason) });
    return null;
  };

  const facts: ReviewFact[] = rows<RawFact>(ok("catalogue_facts")).map((r) => ({
    entityType: asEntityType(r.entity_type),
    entityId: Number(r.entity_id), fieldKey: String(r.field_key),
    valueText: r.value_text || null,
    verificationStatus: (VERIFICATION_STATUSES.has(r.verification_status ?? "")
      ? r.verification_status : null) as ReviewFact["verificationStatus"],
    sourceUrl: r.source_url ?? null, verifiedAt: r.verified_at ?? null,
    admissionCycle: r.admission_cycle ?? null,
    valueType: (VALUE_TYPES.has(r.value_type ?? "") ? r.value_type : null) as ReviewFact["valueType"],
  }));

  const failedChecks: FailedCheck[] = rows<RawCheck>(ok("official_source_checks")).map((r) => ({
    entityType: asCheckEntityType(r.entity_type),
    entityId: Number(r.entity_id), fieldKey: String(r.field_key),
    sourceUrl: r.source_url ?? null, reason: r.reason ?? null, checkedAt: String(r.checked_at),
    officialPageReRead: Boolean(r.official_page_re_read),
    verificationSucceeded: Boolean(r.verification_succeeded),
    evidencePresent: Boolean(r.evidence_present),
  }));

  // Failed refresh/research jobs become system-level failed_job items.
  for (const j of rows<RawJob>(ok("refresh_jobs"))) {
    failedChecks.push({
      // A refresh job id is NOT a university id. Labelling it `university`
      // used to send the admin to an unrelated catalogue record.
      entityType: "system", entityId: Number(j.id), fieldKey: `job:${j.job_type}`,
      sourceUrl: null,
      reason: j.error ? String(j.error).slice(0, 240) : "Refresh/research job failed; no verified date was changed.",
      checkedAt: String(j.finished_at ?? j.created_at),
      officialPageReRead: false, verificationSucceeded: false, evidencePresent: false,
    });
  }

  const duplicates: DuplicateCandidate[] = rows<RawDup>(ok("duplicates")).map((r) => ({
    entityType: "scholarship", canonicalId: Number(r.canonical_id), duplicateId: Number(r.duplicate_id),
    name: String(r.name), matchedOn: String(r.matched_on), linkedRows: Number(r.linked_rows) || 0,
  }));

  return {
    facts, failedChecks, duplicates,
    migrationPending: partialFailures.includes("catalogue_facts"),
    partialFailures,
  };
}

/** Persist an explicit decision. Best-effort; the migration may not be applied. */
export async function persistDecision(item: ReviewQueueItem): Promise<boolean> {
  try {
    await db.execute(sql`
      INSERT INTO public.review_queue_items
        (item_key, category, entity_type, entity_id, field_key, reason, source_url,
         priority, next_action, status, decision_reason, decided_by, decided_at, updated_at)
      VALUES
        (${item.itemKey}, ${item.category}, ${item.entityType}, ${item.entityId}, ${item.fieldKey},
         ${item.reason}, ${item.sourceUrl}, ${item.priority}, ${item.nextAction}, ${item.status},
         ${item.decisionReason}, ${item.decidedBy}, ${item.decidedAt}::timestamptz, now())
      ON CONFLICT (item_key) DO UPDATE SET
        status = EXCLUDED.status,
        decision_reason = EXCLUDED.decision_reason,
        decided_by = EXCLUDED.decided_by,
        decided_at = EXCLUDED.decided_at,
        updated_at = now()
    `);
    return true;
  } catch (error) {
    // A failed write must not be silently reported as "no decision needed".
    // Log only the error CLASS, never the DB error text (it may contain a DSN).
    logSafe("review_queue.decision_write_failed", {
      requestId: "queue-decision", itemKey: item.itemKey, errorClass: safeErrorMessage(error),
    });
    return false;
  }
}
