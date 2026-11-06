/**
 * Admin review queue — behavior guard (§11, §10).
 *
 * Proves the queue covers all seven required categories, is idempotent, keeps
 * reason/source/priority/next-action on every item, and — critically — that
 * opening or deciding an item NEVER marks a fact `verified` and never changes
 * a verified date.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildReviewItems, decideReviewItem, summarizeReviewQueue,
  CATEGORY_PRIORITY, type ReviewCategory, type ReviewFact,
} from "../src/lib/reviewQueue";

let passed = 0;
const failures: string[] = [];
function check(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failures.push(`${name}: ${(e as Error).message}`); console.log(`  ✗ ${name} — ${(e as Error).message}`); }
}
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

console.log("\nAdmin review queue — reasons, priority and honest decisions");

const fact = (over: Partial<ReviewFact> = {}): ReviewFact => ({
  entityType: "university", entityId: 1, fieldKey: "min_gpa", valueText: "3.91",
  verificationStatus: "review_needed", sourceUrl: "https://mit.edu", verifiedAt: "2026-11-06",
  admissionCycle: "2027 intake", valueType: "observed_historical_average", entityVerified: true,
  ...over,
});

check("a critical fact with no source becomes a high-priority missing_source item", () => {
  const items = buildReviewItems({ facts: [fact({ sourceUrl: null })], nowIso: "2026-11-06T00:00:00Z" });
  const missing = items.find((i) => i.category === "missing_source");
  assert.ok(missing);
  assert.equal(missing.priority, "high");
  assert.match(missing.reason, /no source URL/);
  assert.match(missing.nextAction, /official source URL/i);
});

check("a stale verification is queued when the verified date is old", () => {
  const items = buildReviewItems({
    facts: [fact({ verificationStatus: "verified", verifiedAt: "2025-01-01" })],
    nowIso: "2026-11-06T00:00:00Z",
  });
  const stale = items.find((i) => i.category === "stale_verification");
  assert.ok(stale);
  assert.match(stale.reason, /days ago/);
  assert.match(stale.nextAction, /only a passed fact check/i);
});

check("a fresh verification is NOT queued", () => {
  const items = buildReviewItems({
    facts: [fact({ verificationStatus: "verified", verifiedAt: "2026-11-01" })],
    nowIso: "2026-11-06T00:00:00Z",
  });
  assert.equal(items.some((i) => i.category === "stale_verification"), false);
});

check("an unconfirmed number labelled official_minimum is a CRITICAL conflicting_fact", () => {
  const items = buildReviewItems({
    facts: [fact({ verificationStatus: "unverified", valueType: "official_minimum", entityVerified: true })],
    nowIso: "2026-11-06T00:00:00Z",
  });
  const conflict = items.find((i) => i.category === "conflicting_facts");
  assert.ok(conflict);
  assert.equal(conflict.priority, "critical");
  assert.match(conflict.reason, /university\.verified=true is not field-level proof/);
});

check("a cycle-sensitive fact without an admission cycle is queued", () => {
  const items = buildReviewItems({ facts: [fact({ admissionCycle: null })], nowIso: "2026-11-06T00:00:00Z" });
  const cycle = items.find((i) => i.category === "missing_admission_cycle");
  assert.ok(cycle);
  assert.match(cycle.reason, /no admission cycle/i);
});

check("an unverified funding claim is queued", () => {
  const items = buildReviewItems({
    facts: [fact({ fieldKey: "award_amount", verificationStatus: "review_needed" })],
    nowIso: "2026-11-06T00:00:00Z",
  });
  const funding = items.find((i) => i.category === "unverified_funding");
  assert.ok(funding);
  assert.match(funding.reason, /funding claim/i);
});

check("a duplicate requires inspecting linked rows — never a lossy delete", () => {
  const items = buildReviewItems({
    duplicates: [{ entityType: "scholarship", canonicalId: 1, duplicateId: 185, name: "MBA Award", matchedOn: "name+provider", linkedRows: 4 }],
    nowIso: "2026-11-06T00:00:00Z",
  });
  const dup = items.find((i) => i.category === "duplicate");
  assert.ok(dup);
  assert.match(dup.reason, /4 linked row/);
  assert.match(dup.nextAction, /redirect\/merge, never a lossy delete|before any merge/i);
});

check("a failed refresh/research check is queued; a passed check is not", () => {
  const failed = buildReviewItems({
    failedChecks: [{ entityType: "university", entityId: 1, fieldKey: "min_ielts", sourceUrl: "https://mit.edu",
      reason: "official page request timed out", checkedAt: "2026-11-06T00:00:00Z",
      officialPageReRead: false, verificationSucceeded: false, evidencePresent: false }],
    nowIso: "2026-11-06T00:00:00Z",
  });
  assert.ok(failed.some((i) => i.category === "failed_job"));
  const passed2 = buildReviewItems({
    failedChecks: [{ entityType: "university", entityId: 1, fieldKey: "min_ielts", sourceUrl: "https://mit.edu",
      reason: null, checkedAt: "2026-11-06T00:00:00Z",
      officialPageReRead: true, verificationSucceeded: true, evidencePresent: true }],
    nowIso: "2026-11-06T00:00:00Z",
  });
  assert.equal(passed2.filter((i) => i.category === "failed_job").length, 0);
});

check("every one of the seven categories has a priority and a next action", () => {
  const cats: ReviewCategory[] = ["missing_source", "stale_verification", "conflicting_facts",
    "missing_admission_cycle", "unverified_funding", "duplicate", "failed_job"];
  for (const c of cats) assert.ok(CATEGORY_PRIORITY[c], `missing priority for ${c}`);
  const all = buildReviewItems({
    facts: [
      fact({ sourceUrl: null }),
      fact({ verificationStatus: "verified", verifiedAt: "2020-01-01" }),
      fact({ verificationStatus: "unverified", valueType: "official_minimum" }),
      fact({ admissionCycle: null }),
      fact({ fieldKey: "award_amount", verificationStatus: "unverified" }),
    ],
    duplicates: [{ entityType: "scholarship", canonicalId: 1, duplicateId: 2, name: "X", matchedOn: "name", linkedRows: 1 }],
    failedChecks: [{ entityType: "university", entityId: 1, fieldKey: "min_ielts", sourceUrl: null,
      reason: "parse error", checkedAt: "2026-11-06T00:00:00Z",
      officialPageReRead: false, verificationSucceeded: false, evidencePresent: false }],
    nowIso: "2026-11-06T00:00:00Z",
  });
  for (const c of cats) assert.ok(all.some((i) => i.category === c), `no item for ${c}`);
  for (const i of all) {
    assert.ok(i.itemKey && i.reason && i.priority && i.nextAction, "every item needs reason + priority + next action");
    assert.equal(i.status, "open");
    assert.equal(i.decisionReason, null);
  }
});

check("the queue is idempotent: the same input yields the same stable itemKeys", () => {
  const input = { facts: [fact({ sourceUrl: null })], nowIso: "2026-11-06T00:00:00Z" };
  const a = buildReviewItems(input).map((i) => i.itemKey);
  const b = buildReviewItems(input).map((i) => i.itemKey);
  assert.deepEqual(a, b);
  assert.equal(new Set(a).size, a.length, "no duplicate itemKeys");
});

check("critical items sort before medium ones", () => {
  const items = buildReviewItems({
    facts: [fact({ sourceUrl: null }), fact({ verificationStatus: "unverified", valueType: "official_minimum" })],
    nowIso: "2026-11-06T00:00:00Z",
  });
  assert.equal(items[0].priority, "critical");
});

check("an explicit decision needs a written reason and an authenticated admin", () => {
  const item = buildReviewItems({ facts: [fact({ sourceUrl: null })], nowIso: "2026-11-06T00:00:00Z" })[0];
  assert.equal(decideReviewItem(item, { itemKey: item.itemKey, decision: "resolve", reason: "  ", adminProfileId: 5 }).ok, false);
  assert.equal(decideReviewItem(item, { itemKey: item.itemKey, decision: "resolve", reason: "checked", adminProfileId: 0 }).ok, false);
  assert.equal(decideReviewItem(item, { itemKey: "wrong", decision: "resolve", reason: "checked", adminProfileId: 5 }).ok, false);
  const ok = decideReviewItem(item, { itemKey: item.itemKey, decision: "resolve", reason: "Official page read", adminProfileId: 5, nowIso: "2026-11-06T01:00:00Z" });
  assert.equal(ok.ok, true);
  assert.equal(ok.item.status, "resolved");
  assert.equal(ok.item.decidedBy, 5);
  // A terminal decision cannot be applied twice.
  assert.equal(decideReviewItem(ok.item, { itemKey: item.itemKey, decision: "resolve", reason: "again", adminProfileId: 5 }).ok, false);
});

check("opening or deciding an item NEVER writes a verification status/date", () => {
  const src = read("src/lib/reviewQueue.ts");
  // Only executable code is dangerous; the docblock explicitly says the queue
  // does NOT write a verified status, which is exactly what we assert here.
  const code = src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
  assert.doesNotMatch(code, /verificationStatus\s*=\s*['"]verified['"]/);
  assert.doesNotMatch(code, /verifiedAt\s*[:=]\s*new Date/);
  assert.doesNotMatch(code, /db\.(update|insert|execute)/, "the pure model must not write to the DB");
  assert.match(src, /no `verificationStatus = 'verified'` write/);
  const item = buildReviewItems({ facts: [fact({ sourceUrl: null })], nowIso: "2026-11-06T00:00:00Z" })[0];
  assert.equal(item.status, "open"); // not auto-verified
  assert.equal((item as unknown as Record<string, unknown>).verified, undefined);
});

check("summarize counts open work and needs attention without PII", () => {
  const items = buildReviewItems({ facts: [fact({ sourceUrl: null })], nowIso: "2026-11-06T00:00:00Z" });
  const s = summarizeReviewQueue(items);
  assert.equal(s.needsAttention, s.byStatus.open + s.byStatus.in_review);
  assert.equal(s.total, items.length);
  assert.ok(!("reason" in s));
});

check("the reviewable migration has the queue table with RLS and a UNIQUE item_key", () => {
  const ddl = read("supabase/security_evidence_research_2026-11-06.sql");
  assert.match(ddl, /CREATE TABLE IF NOT EXISTS public\.review_queue_items/);
  assert.match(ddl, /UNIQUE \(item_key\)/);
  assert.match(ddl, /ENABLE ROW LEVEL SECURITY/);
  assert.match(ddl, /REVOKE ALL ON public\.review_queue_items FROM PUBLIC, anon, authenticated/);
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) { for (const f of failures) console.log(`  - ${f}`); process.exit(1); }
