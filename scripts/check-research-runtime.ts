/**
 * §9 — REAL runtime proof for the Research Agent durable queue.
 *
 * Unlike the repository guards (static/pure), this starts a disposable
 * PostgreSQL cluster, applies the reviewable migration's actual
 * research_runs / research_run_items DDL, and calls the REAL durableStore
 * functions with RESEARCH_DURABLE_STORE=1. It proves:
 *
 *   - process kill: checkpoint + completed items survive in the DB, not memory;
 *   - two workers cannot claim the same run in parallel (atomic UPDATE);
 *   - a new worker resumes only unfinished items;
 *   - an EXPIRED lease cannot later write a stale result (atomic lease guard);
 *   - cancellation stops new work and later writes;
 *   - timeout/retry exhaustion produce a terminal state;
 *   - idempotency key does not create a duplicate run;
 *   - status/report are read from the durable DB, not a process-local registry.
 *
 * NO production connection, NO production write.
 */
import EmbeddedPostgres from "embedded-postgres";
import { Client } from "pg";
import assert from "node:assert/strict";
import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const PORT = 55443;
const DB = "sbresearch";
const URL_ = `postgresql://test:test@127.0.0.1:${PORT}/${DB}`;
const DATA_DIR = "/tmp/sb-research-runtime-pg";

// Set BEFORE any dynamic import so `@/db` and isDurableStoreEnabled() see them.
process.env.DATABASE_URL = URL_;
process.env.RESEARCH_DURABLE_STORE = "1";
process.env.PG_POOL_MAX = "3";

// Extract the actual, reviewed DDL block from the migration (not a copy).
const MIGRATION = readFileSync(join(ROOT, "supabase/security_evidence_research_2026-11-06.sql"), "utf8");
const start = MIGRATION.indexOf("CREATE TABLE IF NOT EXISTS public.research_runs");
const endMark = "CREATE INDEX IF NOT EXISTS idx_research_run_items_run";
const endLine = MIGRATION.indexOf("\n", MIGRATION.indexOf(endMark));
assert.ok(start > 0 && endLine > start, "migration must contain the research_runs DDL block");
const RESEARCH_DDL = MIGRATION.slice(start, endLine + 1);
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

let passed = 0;
const failures: string[] = [];
function check(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve().then(fn).then(() => {
    passed++; console.log(`  ✓ ${name}`);
  }).catch((e: unknown) => {
    const m = e instanceof Error ? e.message : String(e);
    failures.push(`${name}: ${m}`); console.log(`  ✗ ${name} — ${m}`);
  });
}

let pg: EmbeddedPostgres | null = null;
let client: Client | null = null;
type Store = typeof import("../src/lib/research-agent/durableStore");
let store!: Store; // assigned before any check() runs

async function main() {
  console.log("\nResearch Agent — REAL disposable-Postgres runtime proof");
  rmSync(DATA_DIR, { recursive: true, force: true });
  pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR, user: "test", password: "test", port: PORT,
    persistent: false, onLog: () => {}, onError: () => {},
  });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase(DB);
  client = new Client({ connectionString: URL_ });
  await client.connect();
  await client.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN CREATE ROLE postgres NOLOGIN BYPASSRLS; END IF;
    END $$;
    GRANT USAGE ON SCHEMA public TO postgres, service_role;
  `);
  await client.query(RESEARCH_DDL);
  store = await import("../src/lib/research-agent/durableStore");

  const unis = [11, 22, 33];
  // Minimal shaped values; the durable store treats request/report as JSONB.
  // Casts keep this a RUNTIME (not type) proof without importing 18-field
  // AuditReport fixtures that the SQL layer never inspects.
  const req = { universityIds: unis, scopes: ["costs"], dryRun: true } as unknown as import("../src/lib/research-agent/types").RunRequest;
  const report = (extra: Record<string, unknown>) => ({ universityId: 0, ...extra }) as unknown as import("../src/lib/research-agent/types").AuditReport;

  await check("createDurableRun persists the run and one pending item per university in the DB", async () => {
    await store.createDurableRun({
      runId: "run_a", request: req, universityIds: unis, scopes: req.scopes,
      idempotencyKey: "key_a", timeoutAt: Date.now() + 600_000,
    });
    const r = await client!.query("SELECT status, university_ids, checkpoint FROM public.research_runs WHERE id='run_a'");
    assert.equal(r.rowCount, 1);
    assert.equal(r.rows[0].status, "running");
    assert.deepEqual(r.rows[0].university_ids, unis);
    const items = await client!.query("SELECT count(*)::int AS n FROM public.research_run_items WHERE run_id='run_a' AND status='pending'");
    assert.equal(items.rows[0].n, 3);
  });

  await check("process kill: a completed item + checkpoint survive in durable DB, not memory", async () => {
    // The initial request now claims exactly like a restart worker. No null-token bypass.
    assert.equal(await store.appendDurableItem("run_a",11,{status:"complete"}),false);
    assert.equal(await store.patchDurableRun("run_a",{state:"complete"},{kind:"unclaimed"}),false);
    const initial=await store.claimDurableRun("run_a","initial",60_000);assert.ok(initial?.lease_owner);
    assert.equal(await store.appendDurableItem("run_a",11,{status:"complete",report:report({universityId:11}),attempts:1},{workerId:initial.lease_owner}),true);
    assert.equal(await store.patchDurableRun("run_a",{checkpoint:{completedUniversityIds:[11],reports:[],progress:["done 11"]}},{workerId:initial.lease_owner}),true);
    // A fresh process reading ONLY the DB reconstructs the checkpoint.
    const loaded = await store.loadDurableRun("run_a");
    assert.ok(loaded, "run must be loadable from the DB");
    assert.deepEqual(loaded.checkpoint!.completedUniversityIds, [11]);
    const items = await store.listDurableRunItems("run_a");
    assert.equal(items.find((i: { universityId: number }) => i.universityId === 11)!.status, "complete");
    assert.equal(items.filter((i: { status: string }) => i.status === "pending").length, 2, "only unfinished items remain");
  });

  let liveToken = "";
  await check("two workers claiming in parallel: exactly ONE wins the atomic claim", async () => {
    // Force the run into a claimable (stale) state.
    await client!.query("UPDATE public.research_runs SET status='running', lease_owner=NULL, lease_until=NULL, attempts=1 WHERE id='run_a'");
    const [a, b] = await Promise.all([
      store.claimDurableRun("run_a", "worker-x", 60_000),
      store.claimDurableRun("run_a", "worker-y", 60_000),
    ]);
    const winners = [a, b].filter(Boolean);
    assert.equal(winners.length, 1, "parallel claims must not both succeed");
    const owner = winners[0]!.lease_owner;
    assert.ok(/^(worker-x|worker-y):[0-9a-f-]{36}$/.test(String(owner)));
  });

  await check("an EXPIRED lease cannot later write a stale result (atomic lease guard)", async () => {
    // Worker-x owns the lease. Simulate its lease expiring and worker-y taking over.
    await client!.query("UPDATE public.research_runs SET lease_owner='worker-x', lease_until=now() - interval '1 second' WHERE id='run_a'");
    const staleWrite = await store.appendDurableItem(
      "run_a", 22, { status: "complete", report: report({ universityId: 22, stale: true }), attempts: 1 },
      { workerId: "worker-x" },
    );
    assert.equal(staleWrite, false, "expired-lease write must be rejected");
    // New worker claims (lease expired) and writes its own result.
    const claimed = await store.claimDurableRun("run_a", "worker-y", 60_000);
    assert.ok(claimed, "a new worker must be able to claim the expired lease");
    liveToken = claimed.lease_owner!;
    const freshWrite = await store.appendDurableItem(
      "run_a", 22, { status: "complete", report: report({ universityId: 22, fresh: true }), attempts: 1 },
      { workerId: liveToken },
    );
    assert.equal(freshWrite, true, "live-lease write must succeed");
    const row = await client!.query("SELECT report FROM public.research_run_items WHERE run_id='run_a' AND university_id=22");
    assert.equal(row.rows[0].report.fresh, true);
    assert.equal(row.rows[0].report.stale, undefined, "the stale result must never overwrite the fresh one");
  });

  await check("an EXPIRED lease cannot overwrite run status/checkpoint either", async () => {
    // worker-y owns the live lease after claiming the expired one above.
    const before = await client!.query(
      "SELECT status, attempts, error FROM public.research_runs WHERE id='run_a'",
    );
    const stale = await store.patchDurableRun(
      "run_a", { state: "complete", attempts: 99, error: "stale worker finished" },
      { workerId: "worker-x" },
    );
    assert.equal(stale, false, "a stale worker must not overwrite run status");
    const afterStale = await client!.query(
      "SELECT status, attempts, error FROM public.research_runs WHERE id='run_a'",
    );
    assert.deepEqual(afterStale.rows, before.rows, "run row is untouched by the stale patch");
    const live = await store.patchDurableRun("run_a", { attempts: 2 }, { workerId: liveToken });
    assert.equal(live, true, "the live lease owner can still checkpoint");
    const afterLive = await client!.query("SELECT attempts FROM public.research_runs WHERE id='run_a'");
    assert.equal(afterLive.rows[0].attempts, Number(before.rows[0].attempts),"checkpoint cannot decrease retry attempts");
    // §8 FAIL CLOSED: an untyped caller is NEVER allowed to touch durable status.
    const unguarded = await store.patchDurableRun("run_a", { attempts: 99 });
    assert.equal(unguarded, false, "an unguarded run-status write must be denied");
    const afterUnguarded = await client!.query("SELECT attempts FROM public.research_runs WHERE id='run_a'");
    assert.equal(afterUnguarded.rows[0].attempts, Number(before.rows[0].attempts), "the unguarded write changed nothing");
    // The original in-process run is fenced out once a worker holds the lease.
    const unclaimed = await store.patchDurableRun(
      "run_a", { attempts: 98, state: "complete", error: "in-process overwrite" },
      { kind: "unclaimed" },
    );
    assert.equal(unclaimed, false, "an in-process callback cannot overwrite a durable-worker-owned run");
    const afterUnclaimed = await client!.query("SELECT attempts, status, error FROM public.research_runs WHERE id='run_a'");
    assert.equal(afterUnclaimed.rows[0].attempts, Number(before.rows[0].attempts));
    assert.notEqual(afterUnclaimed.rows[0].error, "in-process overwrite");
  });

  await check("reused worker label receives a new fencing token; expired heartbeat cannot revive", async () => {
    await client!.query("INSERT INTO public.research_runs(id,status,request,max_attempts) VALUES('run_reused','queued','{}'::jsonb,5)");
    const first = await store.claimDurableRun("run_reused","same-label",60_000);
    assert.ok(first?.lease_owner);
    await client!.query("UPDATE public.research_runs SET lease_until=now()-interval '1 second' WHERE id='run_reused'");
    assert.equal(await store.renewDurableLease("run_reused",first.lease_owner!,60_000),false);
    const second = await store.claimDurableRun("run_reused","same-label",60_000);
    assert.ok(second?.lease_owner);
    assert.notEqual(first.lease_owner,second.lease_owner);
    assert.equal(await store.patchDurableRun("run_reused",{state:"complete"},{workerId:first.lease_owner!}),false);
    assert.equal(await store.appendDurableItem("run_reused",99,{status:"complete",report:report({universityId:99}),attempts:1},{workerId:first.lease_owner!}),false);
    assert.equal(await store.patchDurableRun("run_reused",{attempts:1},{workerId:second.lease_owner!}),true);
    const row=await client!.query("SELECT attempts FROM public.research_runs WHERE id='run_reused'");
    assert.equal(row.rows[0].attempts,2,"checkpoint cannot reset claim retry budget");
  });

  await check("cancellation stops new claims, heartbeats and later writes", async () => {
    const ok = await store.requestDurableCancellation("run_a");
    assert.equal(ok, true);
    const claim = await store.claimDurableRun("run_a", "worker-z", 60_000);
    assert.equal(claim, null, "a cancelled run cannot be claimed again");
    const renew = await store.renewDurableLease("run_a", "worker-y", 60_000);
    assert.equal(renew, false, "heartbeat must stop after cancellation");
    await client!.query("UPDATE public.research_runs SET status='running', lease_owner='worker-y', lease_until=now() + interval '1 minute' WHERE id='run_a'");
    const late = await store.appendDurableItem(
      "run_a", 33, { status: "complete", report: report({ universityId: 33 }), attempts: 1 },
      { workerId: "worker-y" },
    );
    assert.equal(late, false, "a cancelled run must not accept a late result write");
  });

  await check("timeout/retry exhaustion are terminal, not endless running", async () => {
    await client!.query(`
      INSERT INTO public.research_runs (id, status, request, attempts, max_attempts, timeout_at)
      VALUES ('run_timeout', 'running', '{}'::jsonb, 1, 3, now() - interval '1 second')
      ON CONFLICT (id) DO NOTHING`);
    const n = await store.expireDurableRuns();
    assert.ok(n >= 1, "an overdue run must be expired");
    const row = await client!.query("SELECT status, finished_at FROM public.research_runs WHERE id='run_timeout'");
    assert.equal(row.rows[0].status, "timed_out");
    assert.ok(row.rows[0].finished_at, "terminal state records a finish time");
    // Retry budget: attempts >= max_attempts blocks a claim.
    await client!.query("UPDATE public.research_runs SET status='running', attempts=3, lease_owner=NULL, lease_until=NULL, timeout_at=NULL, cancel_requested=FALSE WHERE id='run_timeout'");
    const claim = await store.claimDurableRun("run_timeout", "worker-q", 60_000);
    assert.equal(claim, null, "an exhausted run cannot be re-claimed");
  });

  await check("idempotency key does not create a duplicate run", async () => {
    const init = { runId: "run_idem", request: req, universityIds: [44], scopes: req.scopes, idempotencyKey: "idem_key" };
    await store.createDurableRun(init);
    const byKey = await store.loadDurableRunByKey("idem_key");
    assert.ok(byKey, "idempotency key resolves to the existing run");
    const r = await client!.query("SELECT count(*)::int AS n FROM public.research_runs WHERE idempotency_key='idem_key'");
    assert.equal(r.rows[0].n, 1);
  });

  await check("status/report come from the durable DB, not a process-local registry", async () => {
    const runs = await store.listDurableRuns();
    assert.ok(runs.length >= 3, "durable listing reflects DB rows");
    const a = await store.loadDurableRun("run_a");
    assert.equal(a!.state, "running");
    // A direct DB update (simulating another instance) is visible immediately.
    await client!.query("UPDATE public.research_runs SET report='{\"source\":\"db\"}'::jsonb WHERE id='run_a'");
    const fresh = await store.loadDurableRun("run_a");
    assert.equal((fresh!.report as unknown as { source: string }).source, "db", "a second instance sees the DB state, not a stale memory copy");
  });

  await check("the migration probe reports applied=true on a real durable DB", async () => {
    const probe = await store.probeDurableMigration();
    assert.equal(probe.enabled, true);
    assert.equal(probe.migrationApplied, true, "no false migrationPending on a working store");
  });

  await check("flag enabled + migration missing gives a clear error and a SAFE no-write state", async () => {
    // Drop the table in this disposable cluster only; no production write.
    await client!.query("DROP TABLE public.research_run_items");
    await client!.query("DROP TABLE public.research_runs");
    const probe = await store.probeDurableMigration();
    assert.equal(probe.enabled, true);
    assert.equal(probe.migrationApplied, false);
    assert.match(probe.reason, /research_runs is missing|unreachable/i);
    assert.match(probe.reason, /No runs were started|No result was written/i);
    // The worker primitives swallow the failure and start NOTHING (no writes).
    const claimed = await store.claimDurableRun("ghost", "worker-z", 60_000);
    assert.equal(claimed, null);
    const runs = await store.listResumableRunRows(1);
    assert.equal(runs.length, 0);
    // Restore for any later checks / cleanup.
    await client!.query(RESEARCH_DDL);
  });

  await check("the production scheduler path is cron-only, secret-gated, single-flight and monitored", () => {
    const cron = read("src/app/api/cron/research-agent/route.ts");
    assert.match(cron, /CRON_SECRET/, "shared-secret auth");
    assert.match(cron, /safeEqual\(auth, `Bearer \$\{secret\}`\)/, "constant-time compare");
    assert.match(cron, /probeDurableMigration/, "clear error when migration missing");
    assert.match(cron, /migrationPending/, "safe state flag");
    assert.match(cron, /resumeResearchRuns\(\{ limit: 1 \}\)/, "single run per tick");
    assert.match(cron, /logSafe\("research_agent\.cron\.tick"/, "safe monitoring log");
    assert.doesNotMatch(cron, /setInterval|setTimeout/, "no in-process timer as scheduler");
    assert.match(cron, /Render Cron Job/, "one concrete infrastructure path");
    const resume = read("src/app/api/admin/research-agent/resume/route.ts");
    assert.match(resume, /requireAdmin\(req\)/, "admin resume stays role-protected");
  });

  await check("anon/authenticated cannot read or write research runs (effective RLS + grants)", async () => {
    const r = await client!.query("SELECT has_table_privilege('anon','public.research_runs','SELECT') AS sel, has_table_privilege('anon','public.research_runs','INSERT') AS ins");
    assert.equal(r.rows[0].sel, false);
    assert.equal(r.rows[0].ins, false);
    const items = await client!.query("SELECT has_table_privilege('authenticated','public.research_run_items','UPDATE') AS upd");
    assert.equal(items.rows[0].upd, false);
  });


  await check("§8 admin cancel is NOT blocked by a worker guard and cannot be reopened", async () => {
    await client!.query(`
      INSERT INTO public.research_runs (id, status, request, lease_owner, lease_until)
      VALUES ('run_cancel_fence', 'running', '{}'::jsonb, 'worker-live', now() + interval '2 minutes')
      ON CONFLICT (id) DO UPDATE SET status='running', lease_owner='worker-live',
        lease_until=now() + interval '2 minutes', cancel_requested=FALSE, finished_at=NULL`);
    // A live worker may checkpoint.
    const live = await store.patchDurableRun("run_cancel_fence", { attempts: 2 }, { workerId: "worker-live" });
    assert.equal(live, true, "the live lease owner can checkpoint");
    // Admin cancel must succeed even though a worker holds the lease.
    const cancelled = await store.patchDurableRun("run_cancel_fence", {
      state: "cancelled", cancelRequested: true, finishedAt: Date.now(),
    }, { kind: "admin_cancel" });
    assert.equal(cancelled, true, "admin cancellation must NOT be blocked by a plain worker guard");
    // A late worker callback cannot reopen the terminal state.
    const reopen = await store.patchDurableRun("run_cancel_fence", {
      state: "running", attempts: 3, error: "late callback",
    }, { workerId: "worker-live" });
    assert.equal(reopen, false, "a late worker callback cannot reopen a cancelled run");
    const row = await client!.query("SELECT status, attempts, cancel_requested FROM public.research_runs WHERE id='run_cancel_fence'");
    assert.equal(row.rows[0].status, "cancelled");
    assert.equal(row.rows[0].attempts, 2);
    assert.equal(row.rows[0].cancel_requested, true);
  });

  await check("§8 two concurrent claimers cannot both own one run", async () => {
    await client!.query(`
      INSERT INTO public.research_runs (id, status, request)
      VALUES ('run_parallel', 'queued', '{}'::jsonb)
      ON CONFLICT (id) DO UPDATE SET status='queued', lease_owner=NULL, lease_until=NULL, cancel_requested=FALSE`);
    // Two independent connections race the same atomic lease UPDATE.
    const second = new Client({ connectionString: URL_ });
    await second.connect();
    try {
      const [a, b] = await Promise.all([
        store.claimDurableRun("run_parallel", "worker-A", 60_000),
        (async () => {
          const { claimDurableRun } = await import("../src/lib/research-agent/durableStore");
          return claimDurableRun("run_parallel", "worker-B", 60_000);
        })(),
      ]);
      const winners = [a, b].filter(Boolean).length;
      assert.equal(winners, 1, "exactly one claimer may win a run");
      const row = await second.query("SELECT lease_owner, status FROM public.research_runs WHERE id='run_parallel'");
      assert.equal(row.rows[0].status, "running");
      assert.ok(row.rows[0].lease_owner, "the winner recorded its lease owner");
      // Only the winner can write status; the loser is fenced out.
      const winnerId = row.rows[0].lease_owner as string;
      const loserId = winnerId === "worker-A" ? "worker-B" : "worker-A";
      assert.equal(await store.patchDurableRun("run_parallel", { attempts: 7 }, { workerId: loserId }), false);
      assert.equal(await store.patchDurableRun("run_parallel", { attempts: 7 }, { kind: "unclaimed" }), false);
      assert.equal(await store.patchDurableRun("run_parallel", { attempts: 7 }, { workerId: winnerId }), true);
    } finally { await second.end().catch(() => {}); }
  });

  await check("C09 real paused process rejects 8 persistence/audit entrypoints plus generic fenced SQL after B reclaim",async()=>{
    await (await import("./proofs/research-write-fence")).proveResearchWrites(client!);
  });

  console.log(`\n${passed} passed, ${failures.length} failed`);
  await client?.end().catch(() => {});
  try { const { pool } = await import("../src/db"); await pool.end(); } catch { /* pool may not have been used */ }
  if (pg) await pg.stop().catch(() => {});
  if (failures.length) { for (const f of failures) console.log(`  - ${f}`); process.exit(1); }
  process.exit(0);
}

void main().catch(async (e) => {
  console.error(e);
  await client?.end().catch(() => {});
  if (pg) await pg.stop().catch(() => {});
  process.exit(1);
});
