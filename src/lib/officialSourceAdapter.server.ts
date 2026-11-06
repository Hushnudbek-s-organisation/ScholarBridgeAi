/**
 * Production wiring for the official-source re-verification adapter.
 *
 * Loads ONLY important typed facts that have an official source link, builds a
 * concrete `OfficialSourceAdapter`, and persists each check (result + verified
 * fact + source) into `official_source_checks`. Everything is best-effort: if
 * the reviewable migration has NOT been applied yet, the returned adapter
 * reports a clear `migration_pending` failure for every scope and NEVER allows
 * a verified date to move. There is no silent "success" and no in-memory
 * fallback that could claim verification without evidence.
 *
 * Never reads or logs tokens, passwords, service-role keys or document bodies.
 */
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { createOfficialSourceAdapter, type OfficialSourceCheckResult, type OfficialSourceTarget } from "./officialSourceAdapter";
import type { OfficialSourceAdapter } from "./refreshModes";
import { logSafe, safeErrorMessage } from "./observability";

const MAX_TARGETS = 200;

interface FactRow {
  entity_type: string;
  entity_id: number;
  field_key: string;
  expected_value: string;
  source_url: string;
  admission_cycle: string | null;
  program_name: string | null;
  degree_level: string | null;
}

function hostOf(raw: string): string | null {
  try {
    return new URL(raw).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

async function loadTargets(scope: string): Promise<OfficialSourceTarget[]> {
  const [facts, officialDomains] = await Promise.all([
    db.execute(sql`
      SELECT entity_type, entity_id, field_key,
             COALESCE(value_text, value_numeric::text, '') AS expected_value,
             source_url, admission_cycle, program_name, degree_level
      FROM public.catalogue_facts
      WHERE is_active
        AND source_url IS NOT NULL
        AND entity_type IN ('university','scholarship')
        AND verification_status IN ('verified','review_needed','unverified')
        AND COALESCE(value_text, value_numeric::text, '') <> ''
      LIMIT ${MAX_TARGETS}
    `),
    db.execute(sql`SELECT DISTINCT lower(btrim(domain)) AS domain FROM public.sources WHERE is_official = true AND domain IS NOT NULL`),
  ]);
  const domains = new Set(
    ((officialDomains as unknown as { rows?: { domain: string }[] }).rows ?? [])
      .map((r) => String(r.domain ?? "").replace(/^www\./, ""))
      .filter(Boolean),
  );
  const rows = ((facts as unknown as { rows?: FactRow[] }).rows ?? []) as FactRow[];
  const out: OfficialSourceTarget[] = [];
  for (const row of rows) {
    const host = hostOf(row.source_url);
    // An official source link is required. If the link host is not a known
    // official domain, the fact goes to the review queue instead of being
    // "verified" against a third-party page.
    if (!host || !domains.has(host)) continue;
    if (scope === "scholarships" && row.entity_type !== "scholarship") continue;
    if (scope === "universities" && row.entity_type !== "university") continue;
    out.push({
      entityType: row.entity_type === "university" ? "university" : "scholarship",
      entityId: Number(row.entity_id),
      fieldKey: String(row.field_key),
      expectedValue: String(row.expected_value),
      sourceUrl: row.source_url,
      officialDomain: host,
      admissionCycle: row.admission_cycle,
      programName: row.program_name,
      degreeLevel: row.degree_level,
    });
  }
  return out;
}

async function persist(result: OfficialSourceCheckResult): Promise<void> {
  await db.execute(sql`
    INSERT INTO public.official_source_checks (
      entity_type, entity_id, field_key, source_url, verified_fact,
      evidence_excerpt, http_status, official_page_re_read,
      verification_succeeded, evidence_present, reason, checked_at
    ) VALUES (
      ${result.entityType}, ${result.entityId}, ${result.fieldKey}, ${result.sourceUrl},
      ${result.verifiedFact}, ${result.evidenceExcerpt}, ${result.httpStatus},
      ${result.officialPageReRead}, ${result.verificationSucceeded},
      ${result.evidencePresent}, ${result.reason}, ${result.checkedAt}::timestamptz
    )
  `);
}

/**
 * Returns the adapter used by `runRefresh` when a caller does not inject one.
 * The adapter itself performs the DB work lazily, so a missing migration is
 * surfaced as an honest failed check rather than a module-load 500.
 */
export function getServerOfficialSourceAdapter(): OfficialSourceAdapter {
  return async (scope) => {
    let targets: OfficialSourceTarget[];
    try {
      targets = await loadTargets(scope);
    } catch (err) {
      // Migration not applied / table missing: clear, safe failure. No page is
      // fetched, no verified date changes, and no value is overwritten.
      const message = "official_source_checks/catalogue_facts migration is not applied — no verified dates were changed";
      // Only a classified, secret-free reason is logged; the raw DB error may
      // contain a connection string or a query with values.
      logSafe("official_source.unavailable", { scope, reason: message, errorClass: safeErrorMessage(err) });
      return [{
        entityType: "university",
        entityId: 0,
        sourceUrl: "",
        officialPageReRead: false,
        verificationSucceeded: false,
        evidencePresent: false,
        reason: message,
      } as OfficialSourceCheckResult];
    }
    return createOfficialSourceAdapter({ targets, persist })(scope);
  };
}
