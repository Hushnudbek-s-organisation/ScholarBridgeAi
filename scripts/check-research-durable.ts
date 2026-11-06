/**
 * Research Agent durable-queue guard.
 *
 * Validates process-local idempotency / cancellation / timeout / per-university
 * checkpoint behavior and static wiring for the optional PostgreSQL mirror.
 * It does not connect to production or require the durable table.
 *
 * Run: npm run test:research-durable
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

let passed = 0;
const failures: string[] = [];
function check(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed++;
      console.log(`  ✓ ${name}`);
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${name}: ${message}`);
      console.log(`  ✗ ${name} — ${message}`);
    });
}

// Keep this suite deterministic: the durable mirror is opt-in and the database
// module is imported lazily, so no DATABASE_URL or connection is needed here.
process.env.RESEARCH_DURABLE_STORE = "0";

async function main() {
  console.log("\nResearch Agent durable queue — repository guard");
  const registry = await import("../src/lib/research-agent/registry");
  const { AGENT_CONFIG } = await import("../src/lib/research-agent/config");
  const { parseRefreshMode } = await import("../src/lib/refreshModes");
  void parseRefreshMode;

  await check("process-local registry is explicitly not the restart-safe source", () => {
    assert.equal(process.env.RESEARCH_DURABLE_STORE, "0");
    assert.equal(AGENT_CONFIG.runTimeoutMs > 0, true);
    assert.equal(AGENT_CONFIG.runMaxAttempts >= 1, true);
    assert.match(read("src/lib/research-agent/registry.ts"), /NOT restart-safe/);
  });

  await check("idempotency key reuses an existing run", () => {
    const a = registry.createRun(1, { idempotencyKey: "sb-check-key-1" });
    const b = registry.createRun(1, { idempotencyKey: "sb-check-key-1" });
    assert.equal(a, b);
    return registry.getIdempotentRunAsync("sb-check-key-1").then((run) => {
      assert.equal(run?.runId, a);
      registry.setRun(a, { state: "complete", finishedAt: Date.now() });
    });
  });

  await check("cancellation is explicit and stops active work", () => {
    const runId = registry.createRun(2);
    registry.setRun(runId, { state: "running" });
    assert.equal(registry.cancelRun(runId), true);
    assert.equal(registry.isRunCancelled(runId), true);
    assert.equal(registry.cancelRun(runId), false);
    assert.equal(registry.getRun(runId)?.cancelRequested, true);
    registry.setRun(runId, { state: "cancelled", finishedAt: Date.now() });
  });

  await check("timeout produces a terminal timed_out state, not endless running", () => {
    const runId = registry.createRun(3, { timeoutAt: Date.now() + 1000 });
    registry.setRun(runId, { state: "running" });
    assert.equal(registry.markRunTimedOut(runId), true);
    const run = registry.getRun(runId);
    assert.equal(run?.state, "timed_out");
    assert.equal(run?.cancelRequested, true);
    assert.ok(run?.finishedAt);
    assert.match(run?.error ?? "", /deadline/);
  });

  await check("every university result is kept in a checkpoint", () => {
    const runId = registry.createRun(4);
    registry.setRun(runId, { state: "running" });
    const fake = (universityId: number) => ({ universityId, universityName: `Uni ${universityId}` }) as any;
    registry.recordUniversityResult(runId, fake(10));
    registry.recordUniversityResult(runId, fake(11));
    registry.recordUniversityResult(runId, fake(11));
    const run = registry.getRun(runId);
    assert.deepEqual(run?.checkpoint?.completedUniversityIds, [10, 11]);
    assert.equal(run?.checkpoint?.reports.length, 2);
    assert.equal(run?.checkpoint?.reports.at(-1)?.universityId, 11);
    registry.setRun(runId, { state: "complete", finishedAt: Date.now() });
  });

  await check("status and cancel admin routes use the restart-safe / cancellation paths", () => {
    const status = read("src/app/api/admin/research-agent/status/route.ts");
    assert.match(status, /getRunAsync/);
    assert.match(status, /listRunsAsync/);
    const cancel = read("src/app/api/admin/research-agent/cancel/route.ts");
    assert.match(cancel, /requireAdmin/);
    assert.match(cancel, /cancelRun/);
    assert.match(cancel, /requestDurableCancellation/);
    assert.match(cancel, /patchDurableRun/);
    const run = read("src/app/api/admin/research-agent/run/route.ts");
    assert.match(run, /Idempotency-Key/);
    assert.match(run, /getIdempotentRunAsync/);
    assert.match(run, /AGENT_CONFIG\.runTimeoutMs/);
    assert.match(run, /markRunTimedOut/);
    assert.match(run, /recordUniversityResult/);
    assert.match(run, /recordUniversityError/);
    assert.match(run, /isRunCancelled/);
  });

  await check("batch runner persists every result and respects dry-run", () => {
    const batch = read("src/lib/research-agent/run-batch.ts");
    assert.match(batch, /onUniversityComplete/);
    assert.match(batch, /onUniversityError/);
    assert.match(batch, /request\.dryRun \?\? false/);
    assert.match(batch, /callbacks\.onUniversityComplete/);
    const durable = read("src/lib/research-agent/durableStore.ts");
    assert.match(durable, /RESEARCH_DURABLE_STORE === "1"/);
    assert.match(durable, /research_run_items/);
    assert.match(durable, /idempotency_key/);
    assert.match(durable, /cancel_requested/);
    assert.match(durable, /timeout_at/);
    assert.match(durable, /checkpoint/);
    assert.doesNotMatch(durable, /import\s+\{\s*db\s*\}\s+from\s+["']@\/db["']/);
    assert.match(durable, /import\(["']@\/db["']\)/);
  });

  await check("reviewable migration contains the durable queue without auth.uid()", () => {
    const migration = read("supabase/security_evidence_research_2026-11-06.sql");
    assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.research_runs/);
    assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.research_run_items/);
    assert.match(migration, /UNIQUE \(run_id, university_id\)/);
    assert.match(migration, /idempotency_key text UNIQUE/);
    assert.match(migration, /cancel_requested boolean/);
    assert.match(migration, /timeout_at timestamp/);
    assert.match(migration, /checkpoint jsonb/);
    const sqlOnly = migration.split("\n").filter((line) => !line.trim().startsWith("--")).join("\n");
    assert.doesNotMatch(sqlOnly, /auth\.uid\(/);
    assert.doesNotMatch(migration, /sb_secret_|eyJhbGciOi/);
  });

  await check("dry-run writes no live DB and verified dates stay policy-gated", () => {
    const route = read("src/app/api/admin/research-agent/run/route.ts");
    assert.doesNotMatch(route, /createMigration|apply_migration|execute_query/i);
    const refresh = read("src/lib/refresh.ts");
    assert.match(refresh, /mayRefreshVerifiedDate/);
    assert.match(refresh, /verified date unchanged/);
  });

  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    for (const failure of failures) console.log(`  - ${failure}`);
    process.exitCode = 1;
  }
}

void main();
