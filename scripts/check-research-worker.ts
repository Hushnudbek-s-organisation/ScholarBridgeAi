/**
 * Restart-worker regression guard. Pure policy + static wiring checks only;
 * no production connection, no migration apply, no research HTTP calls.
 *
 * Run: npm run test:research-worker
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { planResume, type ResumeItemState } from "../src/lib/research-agent/resumePolicy";

const ROOT = join(import.meta.dirname, "..");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

let passed = 0;
const failures: string[] = [];
function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failures.push(`${name}: ${(error as Error).message}`);
    console.log(`  ✗ ${name} — ${(error as Error).message}`);
  }
}

console.log("\nResearch Agent restart worker — repository guard");

check("resume plan skips finished items and preserves request order", () => {
  const items: ResumeItemState[] = [
    { universityId: 3, status: "error", attempts: 1 },
    { universityId: 5, status: "running", attempts: 0 },
  ];
  const plan = planResume([1, 2, 3, 4, 5, 5], [2], items, 3);
  assert.deepEqual(plan.universityIds, [1, 3, 4, 5]);
  assert.deepEqual(plan.completedIds, [2]);
  assert.deepEqual(plan.retryIds, [3, 5]);
  assert.deepEqual(plan.exhaustedIds, []);
});

check("exhausted item attempts are explicit gaps, not endless running", () => {
  const items: ResumeItemState[] = [
    { universityId: 2, status: "error", attempts: 3 },
    { universityId: 3, status: "complete", attempts: 1 },
    { universityId: 4, status: "skipped", attempts: 3 },
  ];
  const plan = planResume([1, 2, 3, 4], [], items, 3);
  assert.deepEqual(plan.universityIds, [1]);
  assert.deepEqual(plan.completedIds, [3, 4]);
  assert.deepEqual(plan.exhaustedIds, [2]);
  assert.deepEqual(plan.retryIds, []);
});

check("checkpoint completion wins even when an item row is missing or stale", () => {
  const plan = planResume(
    [7, 8, 9],
    [7],
    [{ universityId: 8, status: "running", attempts: 0 }],
    2
  );
  assert.deepEqual(plan.universityIds, [8, 9]);
  assert.deepEqual(plan.completedIds, [7]);
});

check("reviewable migration includes atomic lease columns and index", () => {
  const migration = read("supabase/security_evidence_research_2026-11-06.sql");
  assert.match(migration, /lease_owner text/);
  assert.match(migration, /lease_until timestamptz/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS lease_owner text/);
  assert.match(migration, /idx_research_runs_lease/);
  const executable = migration
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n");
  assert.doesNotMatch(executable, /auth\.uid\(\)/);
});

check("durable store exposes claim, expiry, heartbeat and item state primitives", () => {
  const source = read("src/lib/research-agent/durableStore.ts");
  for (const fn of [
    "expireDurableRuns",
    "listResumableRunRows",
    "listDurableRunItems",
    "claimDurableRun",
    "renewDurableLease",
    "releaseDurableRun",
    "skipDurableItem",
  ]) {
    assert.match(source, new RegExp(`export async function ${fn}\\b`));
  }
  assert.match(source, /RETURNING \*/);
  assert.match(source, /lease_until <= now\(\)/);
  assert.match(source, /attempts < max_attempts/);
  // A stale worker whose lease expired must not write a late result: the item
  // write is gated atomically by a live-lease CTE, and the restart worker
  // passes its workerId into every result/error write.
  assert.match(source, /WITH live_lease AS/);
  assert.match(source, /AND lease_until > now\(\)/);
  assert.match(source, /WHERE EXISTS \(SELECT 1 FROM live_lease\)/);
  assert.match(source, /rowCount\?\: number/);
  const worker = read("src/lib/research-agent/worker.ts");
  assert.match(worker, /recordUniversityResult\(row\.id, report, workerId\)/);
  assert.match(worker, /recordUniversityError\(row\.id, universityId, error, workerId\)/);
  const registry = read("src/lib/research-agent/registry.ts");
  assert.match(registry, /appendDurableItem\([^\n]*guard\)/);
  assert.doesNotMatch(source, /import\s+\{\s*db\s*\}\s+from\s+["']@\/db["']/);
  assert.match(source, /import\(["']@\/db["']\)/);
});

check("worker claims one stale run and resumes only the remaining slice", () => {
  const source = read("src/lib/research-agent/worker.ts");
  for (const token of [
    "expireDurableRuns",
    "claimDurableRun",
    "planResume",
    "adoptDurableRun",
    "runBatch",
    "renewDurableLease",
    "loadDurableRun",
    "releaseDurableRun",
    "dryRun",
  ]) {
    assert.match(source, new RegExp(token));
  }
  assert.match(source, /universityIds: plan\.universityIds/);
  assert.match(source, /isRunActiveLocally/);
  assert.match(source, /cancelRequested/);
  assert.doesNotMatch(source, /service_role|SUPABASE_SERVICE_ROLE_KEY|sb_secret_/);
});

check("resume endpoint is admin-only and exposes no research adapter", () => {
  const route = read("src/app/api/admin/research-agent/resume/route.ts");
  assert.match(route, /requireAdmin/);
  assert.match(route, /resumeResearchRuns/);
  assert.match(route, /Cache-Control.*no-store|no-store/);
  assert.doesNotMatch(route, /OfficialSourceAdapter|official_source_adapter|fetch\(/i);
  assert.doesNotMatch(route, /universityIds|scopes|maxPages/);
});

check("registry can re-attach a durable run without duplicating active work", () => {
  const source = read("src/lib/research-agent/registry.ts");
  assert.match(source, /export function adoptDurableRun/);
  assert.match(source, /export function isRunActiveLocally/);
  assert.match(source, /MAX_ACTIVE_RUNS/);
  assert.match(source, /NOT restart-safe/);
});

check("durable mode remains opt-in and dry-run stays policy-gated", () => {
  const source = read("src/lib/research-agent/durableStore.ts");
  assert.match(source, /RESEARCH_DURABLE_STORE === "1"/);
  assert.match(read("src/lib/evidencePolicy.ts"), /mayRefreshVerifiedDate/);
  assert.match(read("src/lib/refresh.ts"), /official_source_reverification/);
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}
