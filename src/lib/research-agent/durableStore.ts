/**
 * Optional PostgreSQL-backed durable store for Research Agent runs.
 *
 * Enabled only with RESEARCH_DURABLE_STORE=1 and the reviewable migration
 * `supabase/security_evidence_research_2026-11-06.sql`. Without it, the app
 * keeps the existing bounded process-local registry behavior. All failures are
 * swallowed with a generic warning so a missing table in an older deployment
 * never turns into an admin 500 or an unhandled detached-task rejection.
 *
 * This is intentionally a small SQL adapter, not a new paid queue service.
 */
import { sql } from "drizzle-orm";
import { AGENT_CONFIG } from "./config";
import { logSafe } from "@/lib/observability";
import type { AuditReport, RunRequest, RunStatus } from "./types";

// Import the database lazily: importing this module must never require a
// DATABASE_URL in builds/tests that keep the process-local fallback. The
// reviewable migration and RESEARCH_DURABLE_STORE=1 are required for SQL use.
type DbClient = typeof import("@/db").db;
let dbPromise: Promise<DbClient> | null = null;
export async function getDb(): Promise<DbClient> {
  if (!dbPromise) dbPromise = import("@/db").then((module) => module.db);
  return dbPromise;
}

export function isDurableStoreEnabled(): boolean {
  return process.env.RESEARCH_DURABLE_STORE === "1";
}

/**
 * Explicit, safe migration probe for operators/schedulers. The durable-store
 * functions swallow failures by design (an old deployment must not 500), but a
 * scheduler with the flag ENABLED and the migration MISSING needs a clear,
 * actionable error instead of silently doing nothing forever. This reads no
 * run data — only whether the table exists.
 */
export async function probeDurableMigration(): Promise<{
  enabled: boolean;
  migrationApplied: boolean;
  reason: string;
}> {
  if (!isDurableStoreEnabled()) {
    return { enabled: false, migrationApplied: false, reason: "RESEARCH_DURABLE_STORE is not enabled." };
  }
  try {
    const db = await getDb();
    const result = await db.execute(sql`SELECT to_regclass('public.research_runs') AS tbl`);
    const rows = rowsOf(result) as unknown as { tbl: string | null }[];
    if (rows[0]?.tbl) {
      return { enabled: true, migrationApplied: true, reason: "Durable research tables are present." };
    }
    return {
      enabled: true, migrationApplied: false,
      reason: "RESEARCH_DURABLE_STORE=1 but public.research_runs is missing. Apply supabase/security_evidence_research_2026-11-06.sql, or disable the flag. No runs were started.",
    };
  } catch {
    return {
      enabled: true, migrationApplied: false,
      reason: "Durable store is unreachable. Runs were NOT started; check DATABASE_URL and the migration. No result was written.",
    };
  }
}

export interface DurableRow {
  id: string;
  status: string;
  idempotency_key: string | null;
  request: unknown;
  dry_run: boolean;
  university_ids: unknown;
  scopes: unknown;
  checkpoint: unknown;
  report: unknown;
  error: string | null;
  attempts: number;
  max_attempts: number;
  cancel_requested: boolean;
  timeout_at: Date | string | null;
  started_at: Date | string | null;
  finished_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  lease_owner?: string | null;
  lease_until?: Date | string | null;
}

export function rowsOf(result: unknown): DurableRow[] {
  return ((result as { rows?: unknown[] })?.rows ?? []) as DurableRow[];
}

export function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try { return JSON.parse(value) as T; } catch { return fallback; }
  }
  return value as T;
}

export function toMillis(value: Date | string | null | undefined): number | undefined {
  if (value == null) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  const ms = date.getTime();
  return Number.isFinite(ms) ? ms : undefined;
}

function toIso(value: number | undefined): string | null {
  return value == null ? null : new Date(value).toISOString();
}

function stateFromStatus(status: string): RunStatus["state"] {
  switch (status) {
    case "running": return "running";
    case "complete": return "complete";
    case "error": return "error";
    case "cancelled": return "cancelled";
    case "timed_out": return "timed_out";
    default: return "idle";
  }
}

function statusFromState(state: RunStatus["state"]): string {
  switch (state) {
    case "running": return "running";
    case "complete": return "complete";
    case "error": return "error";
    case "cancelled": return "cancelled";
    case "timed_out": return "timed_out";
    default: return "queued";
  }
}

export function toRunStatus(row: DurableRow): RunStatus {
  const checkpoint = parseJson<NonNullable<RunStatus["checkpoint"]>>(row.checkpoint, {
    completedUniversityIds: [],
    reports: [],
    progress: [],
  });
  const report = parseJson<AuditReport | null>(row.report, null);
  const ids = parseJson<number[]>(row.university_ids, []);
  const progress = checkpoint.progress ?? [];
  return {
    runId: row.id,
    universityId: ids[0] ?? null,
    state: stateFromStatus(row.status),
    progress,
    report,
    error: row.error ?? undefined,
    startedAt: toMillis(row.started_at) ?? Date.now(),
    finishedAt: toMillis(row.finished_at),
    cancelRequested: row.cancel_requested,
    timeoutAt: toMillis(row.timeout_at),
    attempts: row.attempts,
    idempotencyKey: row.idempotency_key ?? undefined,
    checkpoint: {
      completedUniversityIds: checkpoint.completedUniversityIds ?? [],
      reports: checkpoint.reports ?? [],
      progress,
    },
  };
}

function warn(): void {
  // Generic, secret-free reason only — never the raw DB error (which may carry
  // a connection string). Correlation comes from the cron/admin request id.
  logSafe("research_durable.unavailable", { reason: "store unavailable; using process-local status" });
}

export interface DurableRunInit {
  runId: string;
  request: RunRequest;
  universityIds: number[];
  scopes: RunRequest["scopes"];
  idempotencyKey?: string | null;
  timeoutAt?: number;
}

export async function createDurableRun(init: DurableRunInit): Promise<void> {
  if (!isDurableStoreEnabled()) return;
  const db = await getDb();
  try {
    const checkpoint = { completedUniversityIds: [], reports: [], progress: [] };
    await db.execute(sql`
      INSERT INTO public.research_runs
        (id, status, idempotency_key, request, dry_run, university_ids, scopes,
         checkpoint, attempts, max_attempts, cancel_requested, timeout_at,
         started_at, created_at, updated_at)
      VALUES
        (${init.runId}, 'running', ${init.idempotencyKey ?? null},
         ${JSON.stringify(init.request)}::jsonb, ${init.request.dryRun ?? false},
         ${JSON.stringify(init.universityIds)}::jsonb, ${JSON.stringify(init.scopes)}::jsonb,
         ${JSON.stringify(checkpoint)}::jsonb, 1, ${AGENT_CONFIG.runMaxAttempts}, FALSE,
         ${toIso(init.timeoutAt)}::timestamptz, now(), now(), now())
      ON CONFLICT (id) DO NOTHING
    `);
    for (const universityId of init.universityIds) {
      await db.execute(sql`
        INSERT INTO public.research_run_items (run_id, university_id, status)
        VALUES (${init.runId}, ${universityId}, 'pending')
        ON CONFLICT (run_id, university_id) DO NOTHING
      `);
    }
  } catch {
    warn();
  }
}

export type DurableRunPatch = Partial<RunStatus>;

/**
 * §8 — FENCING for durable run-status writes. Every caller must state WHY it
 * is allowed to write; an omitted guard is DENIED (fail closed), so a late
 * in-process callback can never overwrite a run that a durable worker claimed.
 *
 *  - `workerId`     : a leased worker; requires a live, matching lease.
 *  - `unclaimed`    : the original in-process run; requires lease_owner NULL.
 *                     Once any worker claims the run this path is fenced out.
 *  - `admin_cancel` : deliberate admin/timeout cancellation; allowed while the
 *                     run is non-terminal, regardless of who holds the lease.
 *                     Admin cancel must NOT be blocked by a plain worker guard.
 *
 * All three also require status IN ('queued','running'): no late callback can
 * reopen a cancelled/timed_out/complete terminal state.
 */
export type DurableRunWriteGuard =
  | { kind?: "worker"; workerId: string }
  | { kind: "unclaimed" }
  | { kind: "admin_cancel" };

export async function patchDurableRun(
  runId: string,
  patch: DurableRunPatch,
  guard?: DurableRunWriteGuard
): Promise<boolean> {
  if (!isDurableStoreEnabled()) return false;
  // FAIL CLOSED: untyped callers are never allowed to touch durable status.
  if (!guard) return false;
  const db = await getDb();
  try {
    const current = await loadDurableRun(runId);
    const progress = patch.progress ?? current?.progress ?? [];
    const checkpoint = patch.checkpoint ?? current?.checkpoint ?? {
      completedUniversityIds: [],
      reports: [],
      progress,
    };
    const normalizedCheckpoint = {
      completedUniversityIds: checkpoint.completedUniversityIds ?? [],
      reports: checkpoint.reports ?? [],
      progress,
    };
    const state = patch.state ?? current?.state ?? "running";
    const report = patch.report ?? current?.report ?? null;
    const error = patch.error ?? current?.error ?? null;
    const finishedAt = patch.finishedAt ?? current?.finishedAt;
    const timeoutAt = patch.timeoutAt ?? current?.timeoutAt;
    const cancelRequested = patch.cancelRequested ?? current?.cancelRequested ?? false;
    const attempts = patch.attempts ?? current?.attempts ?? 1;

    // A worker with an EXPIRED or stolen lease must not overwrite the status,
    // checkpoint or report of the worker that now owns the run. The same
    // atomic live-lease predicate as appendDurableItem gates this UPDATE;
    // callers without a lease (in-process run, admin cancel) omit the guard.
    const leaseGuard = guard.kind === "admin_cancel"
      ? sql` AND status IN ('queued','running')`
      : guard.kind === "unclaimed"
        ? sql` AND lease_owner IS NULL AND status IN ('queued','running')`
        : sql` AND lease_owner = ${guard.workerId}::text AND lease_until > now()
               AND status IN ('queued','running')`;
    const result = await db.execute(sql`
      UPDATE public.research_runs
      SET status = ${statusFromState(state)},
          checkpoint = ${JSON.stringify(normalizedCheckpoint)}::jsonb,
          report = ${report == null ? null : JSON.stringify(report)}::jsonb,
          error = ${error},
          attempts = ${attempts},
          cancel_requested = ${cancelRequested},
          timeout_at = ${toIso(timeoutAt)}::timestamptz,
          finished_at = ${toIso(finishedAt)}::timestamptz,
          updated_at = now()
      WHERE id = ${runId}${leaseGuard}
    `);
    return ((result as { rowCount?: number }).rowCount ?? 0) > 0;
  } catch {
    warn();
    return false;
  }
}

/**
 * Persist one university result. When `guard.workerId` is supplied (the
 * restart worker path), the write is ATOMIC with a live-lease check: a worker
 * whose lease expired — and whose run may already have been claimed by a new
 * worker — can never insert or overwrite a result. A single CTE gates both the
 * INSERT and the ON CONFLICT UPDATE, so there is no check-then-write race.
 * Callers without a lease (the original in-process run) omit the guard.
 */
export interface DurableItemWriteGuard { workerId: string }
export async function appendDurableItem(
  runId: string,
  universityId: number,
  patch: { status: "running" | "complete" | "error" | "skipped"; report?: AuditReport | null; error?: string | null; attempts?: number },
  guard?: DurableItemWriteGuard
): Promise<boolean> {
  if (!isDurableStoreEnabled()) return false;
  const db = await getDb();
  try {
    const result = await db.execute(sql`
      WITH live_lease AS (
        SELECT id FROM public.research_runs
        WHERE id = ${runId}
          AND (${guard?.workerId ?? null}::text IS NULL
               OR (lease_owner = ${guard?.workerId ?? null}::text
                   AND lease_until > now()
                   AND cancel_requested = FALSE
                   AND status IN ('queued','running')))
      )
      INSERT INTO public.research_run_items
        (run_id, university_id, status, report, error, attempts, started_at, finished_at, created_at, updated_at)
      SELECT ${runId}, ${universityId}, ${patch.status},
         ${patch.report == null ? null : JSON.stringify(patch.report)}::jsonb,
         ${patch.error ?? null}, ${patch.attempts ?? 1}, now(),
         CASE WHEN ${patch.status} IN ('complete','error','skipped') THEN now() ELSE NULL END,
         now(), now()
      FROM live_lease
      ON CONFLICT (run_id, university_id) DO UPDATE SET
        status = EXCLUDED.status,
        report = COALESCE(EXCLUDED.report, research_run_items.report),
        error = EXCLUDED.error,
        attempts = GREATEST(research_run_items.attempts, EXCLUDED.attempts),
        finished_at = EXCLUDED.finished_at,
        updated_at = now()
      WHERE EXISTS (SELECT 1 FROM live_lease)
      RETURNING run_id
    `);
    // rowCount is the number of rows actually written; 0 means the lease was
    // expired/cancelled and the stale result was correctly discarded.
    return ((result as { rowCount?: number }).rowCount ?? 0) > 0;
  } catch {
    warn();
    return false;
  }
}

export async function loadDurableRun(runId: string): Promise<RunStatus | null> {
  if (!isDurableStoreEnabled()) return null;
  const db = await getDb();
  try {
    const result = await db.execute(sql`SELECT * FROM public.research_runs WHERE id = ${runId} LIMIT 1`);
    const row = rowsOf(result)[0];
    return row ? toRunStatus(row) : null;
  } catch {
    warn();
    return null;
  }
}

export async function loadDurableRunByKey(key: string): Promise<RunStatus | null> {
  if (!isDurableStoreEnabled()) return null;
  const db = await getDb();
  try {
    const result = await db.execute(sql`SELECT * FROM public.research_runs WHERE idempotency_key = ${key} LIMIT 1`);
    const row = rowsOf(result)[0];
    return row ? toRunStatus(row) : null;
  } catch {
    warn();
    return null;
  }
}

export async function requestDurableCancellation(runId: string): Promise<boolean> {
  if (!isDurableStoreEnabled()) return false;
  const db = await getDb();
  try {
    const result = await db.execute(sql`
      UPDATE public.research_runs
      SET cancel_requested = TRUE, updated_at = now()
      WHERE id = ${runId} AND status IN ('queued','running')
    `);
    const rowCount = (result as { rowCount?: number }).rowCount ?? 0;
    return rowCount > 0;
  } catch {
    warn();
    return false;
  }
}

export async function listDurableRuns(limit = 20): Promise<RunStatus[]> {
  if (!isDurableStoreEnabled()) return [];
  const db = await getDb();
  try {
    const result = await db.execute(sql`
      SELECT * FROM public.research_runs
      ORDER BY created_at DESC
      LIMIT ${Math.max(1, Math.min(limit, 100))}
    `);
    return rowsOf(result).map(toRunStatus);
  } catch {
    warn();
    return [];
  }
}

/* -------------------------------------------------------------------------
 * Restart worker support. These functions are intentionally small SQL
 * primitives; the worker/library in worker.ts holds the resume/retry policy.
 * ---------------------------------------------------------------------- */

export interface DurableRunItemRow {
  universityId: number;
  status: "pending" | "running" | "complete" | "error" | "skipped";
  attempts: number;
  error: string | null;
}

/** Mark runs whose deadline passed before any worker could resume them. */
export async function expireDurableRuns(): Promise<number> {
  if (!isDurableStoreEnabled()) return 0;
  try {
    const db = await getDb();
    const result = await db.execute(sql`
      UPDATE public.research_runs
      SET status = 'timed_out',
          cancel_requested = TRUE,
          error = 'Run exceeded its deadline before a worker resumed it.',
          finished_at = now(),
          lease_owner = NULL,
          lease_until = NULL,
          updated_at = now()
      WHERE status IN ('queued','running')
        AND cancel_requested = FALSE
        AND timeout_at IS NOT NULL
        AND timeout_at <= now()
    `);
    return (result as { rowCount?: number }).rowCount ?? 0;
  } catch {
    warn();
    return 0;
  }
}

/** Stale, uncancelled, unexpired runs an idle worker may claim. */
export async function listResumableRunRows(limit = 5): Promise<DurableRow[]> {
  if (!isDurableStoreEnabled()) return [];
  try {
    const db = await getDb();
    const result = await db.execute(sql`
      SELECT * FROM public.research_runs
      WHERE status IN ('queued','running')
        AND cancel_requested = FALSE
        AND attempts < max_attempts
        AND (timeout_at IS NULL OR timeout_at > now())
        AND (lease_until IS NULL OR lease_until <= now())
      ORDER BY created_at ASC
      LIMIT ${Math.max(1, Math.min(limit, 20))}
    `);
    return rowsOf(result);
  } catch {
    warn();
    return [];
  }
}

export async function listDurableRunItems(runId: string): Promise<DurableRunItemRow[]> {
  if (!isDurableStoreEnabled()) return [];
  try {
    const db = await getDb();
    const result = await db.execute(sql`
      SELECT university_id, status, attempts, error
      FROM public.research_run_items
      WHERE run_id = ${runId}
    `);
    const rows = rowsOf(result) as unknown as Array<{
      university_id: number | string;
      status: string;
      attempts: number | string | null;
      error: string | null;
    }>;
    return rows.map((row) => ({
      universityId: Number(row.university_id),
      status: String(row.status) as DurableRunItemRow["status"],
      attempts: Number(row.attempts ?? 0),
      error: row.error ?? null,
    }));
  } catch {
    warn();
    return [];
  }
}

/**
 * Atomically claim a stale run. Two workers cannot claim the same row: only
 * one UPDATE sees the old NULL/expired lease. The whole-run attempt counter is
 * capped by max_attempts; individual item retries are independent.
 */
export async function claimDurableRun(
  runId: string,
  workerId: string,
  leaseMs: number
): Promise<DurableRow | null> {
  if (!isDurableStoreEnabled()) return null;
  try {
    const db = await getDb();
    const lease = Math.max(1_000, Math.min(Math.floor(leaseMs), AGENT_CONFIG.runTimeoutMs));
    const result = await db.execute(sql`
      UPDATE public.research_runs
      SET status = 'running',
          lease_owner = ${workerId},
          lease_until = now() + (${lease} || ' milliseconds')::interval,
          attempts = LEAST(attempts + 1, max_attempts),
          started_at = COALESCE(started_at, now()),
          updated_at = now()
      WHERE id = ${runId}
        AND status IN ('queued','running')
        AND cancel_requested = FALSE
        AND attempts < max_attempts
        AND (timeout_at IS NULL OR timeout_at > now())
        AND (lease_until IS NULL OR lease_until <= now())
      RETURNING *
    `);
    return rowsOf(result)[0] ?? null;
  } catch {
    warn();
    return null;
  }
}

export async function releaseDurableRun(runId: string, workerId: string): Promise<void> {
  if (!isDurableStoreEnabled()) return;
  try {
    const db = await getDb();
    await db.execute(sql`
      UPDATE public.research_runs
      SET lease_owner = NULL, lease_until = NULL, updated_at = now()
      WHERE id = ${runId}
        AND lease_owner = ${workerId}
        AND status IN ('queued','running')
    `);
  } catch {
    warn();
  }
}

/** Final state for an item that exhausted its retry budget. */
export async function skipDurableItem(runId: string, universityId: number, reason: string): Promise<void> {
  if (!isDurableStoreEnabled()) return;
  try {
    const db = await getDb();
    await db.execute(sql`
      UPDATE public.research_run_items
      SET status = 'skipped', error = ${reason.slice(0, 2000)},
          finished_at = COALESCE(finished_at, now()), updated_at = now()
      WHERE run_id = ${runId} AND university_id = ${universityId}
    `);
  } catch {
    warn();
  }
}


/** Keep a healthy worker's lease alive; a crashed worker's lease expires. */
export async function renewDurableLease(
  runId: string,
  workerId: string,
  leaseMs: number
): Promise<boolean> {
  if (!isDurableStoreEnabled()) return false;
  try {
    const db = await getDb();
    const lease = Math.max(1_000, Math.min(Math.floor(leaseMs), AGENT_CONFIG.runTimeoutMs));
    const result = await db.execute(sql`
      UPDATE public.research_runs
      SET lease_until = now() + (${lease} || ' milliseconds')::interval,
          updated_at = now()
      WHERE id = ${runId}
        AND lease_owner = ${workerId}
        AND status IN ('queued','running')
        AND cancel_requested = FALSE
    `);
    return ((result as { rowCount?: number }).rowCount ?? 0) > 0;
  } catch {
    warn();
    return false;
  }
}
