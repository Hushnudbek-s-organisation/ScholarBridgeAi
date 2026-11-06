/**
 * Admin review queue — pure model (§11).
 *
 * The reviewable migration creates `public.review_queue_items`; this module
 * decides WHAT becomes an item, WHY, its priority and the NEXT ACTION. It is a
 * pure function of typed facts, verification dates, failed checks and duplicate
 * candidates, so `scripts/check-review-queue.ts` proves the behavior offline.
 *
 * Critical rule: opening an item NEVER marks a fact `verified`. Only an
 * explicit human decision with a reason may move an item to resolved/dismissed,
 * and even then the catalogue value is NOT auto-verified — see
 * `decideReviewItem`, which returns the decision, not a verification write.
 *
 * Field-level trust: a queue item never turns an unverified number into an
 * official minimum; `nextAction` tells the admin which official source to read.
 */
import {
  mayRefreshVerifiedDate, type MetricValueType, type VerificationStatus,
} from "@/lib/evidencePolicy";

/**
 * catalogue_facts.entity_type CHECK includes program/ranking/source. Coercing
 * those to `scholarship` made the queue point an admin at the wrong record.
 * `system` is for failed background jobs, which have no catalogue entity id.
 */
export type ReviewEntityType =
  | "university" | "program" | "scholarship" | "ranking" | "source" | "system" | null;

export type ReviewCategory =
  | "missing_source"
  | "stale_verification"
  | "conflicting_facts"
  | "missing_admission_cycle"
  | "unverified_funding"
  | "duplicate"
  | "failed_job";

export type ReviewPriority = "low" | "medium" | "high" | "critical";
export type ReviewStatus = "open" | "in_review" | "resolved" | "dismissed";

export interface ReviewQueueItem {
  /** Stable deduplication key (category + entity + field + discriminator). */
  itemKey: string;
  category: ReviewCategory;
  entityType: ReviewEntityType;
  entityId: number | null;
  fieldKey: string | null;
  reason: string;
  sourceUrl: string | null;
  priority: ReviewPriority;
  nextAction: string;
  status: ReviewStatus;
  decisionReason: string | null;
  decidedBy: number | null;
  decidedAt: string | null;
}

/** A typed catalogue fact needed to decide whether it must be reviewed. */
export interface ReviewFact {
  entityType: Exclude<ReviewEntityType, "system" | null>;
  entityId: number;
  fieldKey: string;
  valueText: string | null;
  /**
   * Field-level verification status from catalogue_facts. `failed_verification`
   * is a real CHECK value in the migration — it must not collapse to null,
   * otherwise the queue would silently lose those rows.
   */
  verificationStatus: VerificationStatus | null;
  sourceUrl: string | null;
  verifiedAt: string | null;
  admissionCycle: string | null;
  /**
   * `MetricValueType` is the migration's actual CHECK set. The four legacy
   * labels are kept so existing guards/adapters keep compiling, but a row with
   * `official_requirement` MUST now be recognized as an official-minimum claim
   * (the old mapping dropped every real row to null).
   */
  valueType: MetricValueType
    | "official_minimum" | "observed_historical_average" | "third_party_estimate" | "calculated"
    | null;
  /** `university.verified` is NOT field-level proof; kept only for the guard. */
  entityVerified?: boolean | null;
}

export interface FailedCheck {
  entityType: "university" | "scholarship" | "system";
  entityId: number;
  fieldKey: string;
  sourceUrl: string | null;
  reason: string | null;
  checkedAt: string;
  /** Evidence flags — a failed check never advances a verified date. */
  officialPageReRead: boolean;
  verificationSucceeded: boolean;
  evidencePresent: boolean;
}

export interface DuplicateCandidate {
  entityType: "university" | "scholarship";
  canonicalId: number;
  duplicateId: number;
  name: string;
  matchedOn: string;
  /** Linked applications / saved rows / sources must be checked before merge. */
  linkedRows: number;
}

export interface ReviewBuildInput {
  facts?: ReviewFact[];
  failedChecks?: FailedCheck[];
  duplicates?: DuplicateCandidate[];
  /** ISO date used as "now" (injectable for deterministic guards). */
  nowIso?: string;
  /** Days after which a verified fact is considered stale. */
  staleDays?: number;
}

export const CATEGORY_PRIORITY: Record<ReviewCategory, ReviewPriority> = {
  missing_source: "high",
  stale_verification: "medium",
  conflicting_facts: "critical",
  missing_admission_cycle: "high",
  unverified_funding: "high",
  duplicate: "medium",
  failed_job: "high",
};

export const CATEGORY_NEXT_ACTION: Record<ReviewCategory, string> = {
  missing_source: "Attach an official source URL for this field, then re-run official source re-verification.",
  stale_verification: "Re-read the official page for the current admission cycle; only a passed fact check may refresh the date.",
  conflicting_facts: "Compare the two typed values and their sources; keep the official source, mark the other review-needed.",
  missing_admission_cycle: "Record the admission cycle this figure applies to, or mark the fact unknown.",
  unverified_funding: "Verify the funding claim against the fellowship/aid page; do not present it as an official amount.",
  duplicate: "Inspect linked applications, saved rows and sources; keep a canonical row and plan a redirect/merge, never a lossy delete.",
  failed_job: "Inspect the failed refresh/research job log, fix the cause, then retry; no verified date was changed.",
};

function isoDay(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

function openItem(
  category: ReviewCategory,
  itemKey: string,
  entityType: ReviewQueueItem["entityType"],
  entityId: number | null,
  fieldKey: string | null,
  reason: string,
  sourceUrl: string | null,
  extraAction = "",
): ReviewQueueItem {
  return {
    itemKey: `${category}:${itemKey}`,
    category,
    entityType,
    entityId,
    fieldKey,
    reason,
    sourceUrl,
    priority: CATEGORY_PRIORITY[category],
    nextAction: extraAction ? `${CATEGORY_NEXT_ACTION[category]} ${extraAction}` : CATEGORY_NEXT_ACTION[category],
    status: "open",
    decisionReason: null,
    decidedBy: null,
    decidedAt: null,
  };
}

/**
 * Build the review queue. Idempotent: the same input yields the same stable
 * `itemKey`s, so re-running never creates duplicate queue rows (the DDL has a
 * UNIQUE constraint on item_key).
 */
export function buildReviewItems(input: ReviewBuildInput): ReviewQueueItem[] {
  const now = isoDay(input.nowIso ?? new Date().toISOString()) ?? 0;
  const staleMs = (input.staleDays ?? 180) * 86_400_000;
  const items: ReviewQueueItem[] = [];
  const seen = new Set<string>();

  const add = (item: ReviewQueueItem) => {
    if (!seen.has(item.itemKey)) { seen.add(item.itemKey); items.push(item); }
  };

  for (const fact of input.facts ?? []) {
    const key = `${fact.entityType}#${fact.entityId}:${fact.fieldKey}`;
    const important = IMPORTANT_FIELDS.has(fact.fieldKey);

    // 1. A critical fact with no source link.
    if (important && !fact.sourceUrl) {
      add(openItem("missing_source", key, fact.entityType, fact.entityId, fact.fieldKey,
        `${fact.fieldKey} on ${fact.entityType} #${fact.entityId} has no source URL.`, null));
    }

    // 2. Stale verification — only a real field-level verifiedAt counts.
    const verifiedAt = isoDay(fact.verifiedAt);
    if (fact.verificationStatus === "verified" && (verifiedAt == null || now - verifiedAt > staleMs)) {
      add(openItem("stale_verification", key, fact.entityType, fact.entityId, fact.fieldKey,
        verifiedAt == null
          ? `${fact.fieldKey} is marked verified but has no verification date.`
          : `${fact.fieldKey} was last verified ${Math.floor((now - verifiedAt) / 86_400_000)} days ago.`,
        fact.sourceUrl));
    }

    // 3. An unconfirmed number CLAIMING to be an official minimum. Both the
    // legacy label and the migration's real `official_requirement` type must
    // count — otherwise every live catalogue_facts row was silently ignored.
    const claimsOfficialMinimum = fact.valueType === "official_minimum" || fact.valueType === "official_requirement";
    if (fact.verificationStatus !== "verified" && claimsOfficialMinimum && fact.valueText) {
      add(openItem("conflicting_facts", key, fact.entityType, fact.entityId, fact.fieldKey,
        `${fact.fieldKey}=${fact.valueText} is labelled an official minimum but its field-level status is ${fact.verificationStatus ?? "unknown"}. university.verified=true is not field-level proof.`,
        fact.sourceUrl));
    }

    // 4. Missing admission cycle for a cycle-sensitive fact.
    if (CYCLE_SENSITIVE_FIELDS.has(fact.fieldKey) && !fact.admissionCycle) {
      add(openItem("missing_admission_cycle", key, fact.entityType, fact.entityId, fact.fieldKey,
        `${fact.fieldKey} has no admission cycle; a minimum from another year must not be applied to a new intake.`,
        fact.sourceUrl));
    }

    // 5. Unverified funding claim.
    if (FUNDING_FIELDS.has(fact.fieldKey) && fact.verificationStatus !== "verified") {
      add(openItem("unverified_funding", key, fact.entityType, fact.entityId, fact.fieldKey,
        `${fact.fieldKey} is a funding claim with field-level status ${fact.verificationStatus ?? "unknown"}; do not publish it as a guaranteed amount.`,
        fact.sourceUrl));
    }
  }

  // 6. Duplicates — never a lossy delete; linked rows must be inspected.
  for (const d of input.duplicates ?? []) {
    const key = `${d.entityType}:${d.canonicalId}:${d.duplicateId}`;
    add(openItem("duplicate", key, d.entityType, d.duplicateId, null,
      `Possible duplicate of "${d.name}" (matched on ${d.matchedOn}); ${d.linkedRows} linked row(s) require inspection.`,
      null,
      `Canonical candidate #${d.canonicalId}; check applications, saves and source links before any merge.`));
  }

  // 7. Failed research/refresh checks.
  for (const c of input.failedChecks ?? []) {
    const allowed = mayRefreshVerifiedDate({
      officialPageReRead: c.officialPageReRead,
      verificationSucceeded: c.verificationSucceeded,
      evidencePresent: c.evidencePresent,
    });
    if (allowed) continue; // a passed check is not a review item
    const key = `${c.entityType}#${c.entityId}:${c.fieldKey}:${c.checkedAt}`;
    add(openItem("failed_job", key, c.entityType, c.entityId, c.fieldKey,
      c.reason || "Official source check failed or was incomplete; the verified date was left unchanged.",
      c.sourceUrl));
  }

  // Deterministic order: critical first, then category, then key.
  const rank: Record<ReviewPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  items.sort((a, b) => rank[a.priority] - rank[b.priority] || a.category.localeCompare(b.category) || a.itemKey.localeCompare(b.itemKey));
  return items;
}

export const IMPORTANT_FIELDS = new Set([
  "min_gpa", "min_sat", "min_ielts", "min_toefl", "acceptance_rate",
  "tuition_usd", "award_amount", "award_currency", "award_period",
  "degree_levels", "eligible_countries", "eligible_majors", "qs_rank",
  "application_deadline", "program_duration_years",
]);
export const CYCLE_SENSITIVE_FIELDS = new Set([
  "min_gpa", "min_sat", "min_ielts", "min_toefl", "acceptance_rate", "application_deadline", "tuition_usd", "award_amount",
]);
export const FUNDING_FIELDS = new Set([
  "award_amount", "award_basis", "living_allowance", "full_funding", "tuition_waiver", "stipend",
]);

export interface ReviewDecision {
  itemKey: string;
  decision: "resolve" | "dismiss" | "start_review";
  reason: string;
  adminProfileId: number;
  nowIso?: string;
}

/**
 * Apply an EXPLICIT human decision. Returns the updated item; it never returns
 * a catalogue verification write. An empty/whitespace reason is rejected (the
 * admin must say why), and a terminal decision cannot be applied twice.
 */
export function decideReviewItem(item: ReviewQueueItem, decision: ReviewDecision): { ok: boolean; item: ReviewQueueItem; error: string | null } {
  if (decision.itemKey !== item.itemKey) {
    return { ok: false, item, error: "Decision does not match the queue item." };
  }
  if (!decision.reason || !decision.reason.trim()) {
    return { ok: false, item, error: "A written reason is required for every decision." };
  }
  if (!Number.isFinite(decision.adminProfileId) || decision.adminProfileId <= 0) {
    return { ok: false, item, error: "An authenticated admin profile is required." };
  }
  if (item.status === "resolved" || item.status === "dismissed") {
    return { ok: false, item, error: "This item already has a terminal decision." };
  }
  const now = decision.nowIso ?? new Date().toISOString();
  if (decision.decision === "start_review") {
    return { ok: true, error: null, item: { ...item, status: "in_review", decisionReason: decision.reason.trim(), decidedBy: decision.adminProfileId, decidedAt: now } };
  }
  const status: ReviewStatus = decision.decision === "resolve" ? "resolved" : "dismissed";
  // NOTE: no `verificationStatus = 'verified'` write. A queue decision records
  // the human review; the fact still needs its own official-source check.
  return { ok: true, error: null, item: { ...item, status, decisionReason: decision.reason.trim(), decidedBy: decision.adminProfileId, decidedAt: now } };
}

/** Queue counts by status/priority for the admin header (no PII). */
export function summarizeReviewQueue(items: ReviewQueueItem[]) {
  const byStatus: Record<ReviewStatus, number> = { open: 0, in_review: 0, resolved: 0, dismissed: 0 };
  const byPriority: Record<ReviewPriority, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const item of items) {
    byStatus[item.status] += 1;
    if (item.status === "open" || item.status === "in_review") byPriority[item.priority] += 1;
  }
  return { total: items.length, byStatus, byPriority, needsAttention: byStatus.open + byStatus.in_review };
}
