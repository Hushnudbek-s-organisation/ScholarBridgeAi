/**
 * Bounded process-local progress with an optional durable PostgreSQL mirror.
 *
 * The in-memory Map remains the low-latency source for active runs. When
 * RESEARCH_DURABLE_STORE=1 and the reviewable migration is applied, run status,
 * checkpoints, per-university reports, timeout, cancellation, retry attempts
 * and idempotency are also persisted. The process-local Map alone is explicitly
 * NOT restart-safe; the durable mirror is the source of truth after a restart.
 */
import { randomUUID } from "node:crypto";
import type { AuditReport, RunRequest, RunStatus } from "./types";
import {
  appendDurableItem,
  createDurableRun,
  isDurableStoreEnabled,
  listDurableRuns,
  loadDurableRun,
  loadDurableRunByKey,
  patchDurableRun,
  requestDurableCancellation,
} from "./durableStore";

export const MAX_ACTIVE_RUNS = 2;
export const MAX_RETAINED_RUNS = 20;
const RETENTION_MS = 30 * 60_000;
const MAX_REPORT_BYTES = 2 * 1024 * 1024;
const runs = new Map<string, RunStatus>();
const idempotencyKeys = new Map<string, string>();

export class ResearchCapacityError extends Error {
  constructor() { super("Research workers are busy. Retry when a run finishes."); this.name = "ResearchCapacityError"; }
}

function active(run: RunStatus) { return run.state === "idle" || run.state === "running"; }

function prune() {
  for (const [id, run] of runs) {
    if (!active(run) && Date.now() - (run.finishedAt ?? run.startedAt) >= RETENTION_MS) {
      runs.delete(id);
      for (const [key, value] of idempotencyKeys) if (value === id) idempotencyKeys.delete(key);
    }
  }
}

export interface CreateRunOptions {
  idempotencyKey?: string | null;
  timeoutAt?: number;
  request?: RunRequest;
  universityIds?: number[];
  scopes?: RunRequest["scopes"];
}

export function createRun(universityId: number | null, options: CreateRunOptions = {}): string {
  prune();
  if (options.idempotencyKey && idempotencyKeys.has(options.idempotencyKey)) {
    return idempotencyKeys.get(options.idempotencyKey)!;
  }
  if ([...runs.values()].filter(active).length >= MAX_ACTIVE_RUNS) throw new ResearchCapacityError();
  while (runs.size >= MAX_RETAINED_RUNS) {
    const oldest = [...runs].find(([, run]) => !active(run));
    if (!oldest) throw new ResearchCapacityError();
    runs.delete(oldest[0]);
  }
  const runId = `run_${randomUUID()}`;
  const run: RunStatus = {
    runId,
    universityId,
    state: "idle",
    progress: [],
    report: null,
    startedAt: Date.now(),
    cancelRequested: false,
    timeoutAt: options.timeoutAt,
    attempts: 1,
    idempotencyKey: options.idempotencyKey ?? undefined,
    checkpoint: { completedUniversityIds: [], reports: [], progress: [] },
  };
  runs.set(runId, run);
  if (options.idempotencyKey) idempotencyKeys.set(options.idempotencyKey, runId);
  if (options.request) {
    void createDurableRun({
      runId,
      request: options.request,
      universityIds: options.universityIds ?? options.request.universityIds,
      scopes: options.scopes ?? options.request.scopes,
      idempotencyKey: options.idempotencyKey,
      timeoutAt: options.timeoutAt,
    }).catch(() => {});
  }
  return runId;
}

export function getRun(runId: string): RunStatus | null {
  prune();
  return runs.get(runId) ?? null;
}

/** True when this process already owns an active in-memory run. */
export function isRunActiveLocally(runId: string): boolean {
  prune();
  const run = runs.get(runId);
  return !!run && active(run);
}

/**
 * Re-attach a durable run to this process after a restart. The durable row
 * remains the source of truth; this only restores the low-latency progress
 * Map so existing batch callbacks can write checkpoints and reports.
 */
export function adoptDurableRun(run: RunStatus): boolean {
  prune();
  if (isRunActiveLocally(run.runId)) return false;
  if ([...runs.values()].filter(active).length >= MAX_ACTIVE_RUNS) return false;
  runs.set(run.runId, {
    ...run,
    state: "running",
    cancelRequested: false,
    error: undefined,
    finishedAt: undefined,
    checkpoint: run.checkpoint ?? { completedUniversityIds: [], reports: [], progress: [] },
  });
  if (run.idempotencyKey) idempotencyKeys.set(run.idempotencyKey, run.runId);
  return true;
}

/** Prefer the restart-safe durable record when the store is enabled. */
export async function getRunAsync(runId: string): Promise<RunStatus | null> {
  if (isDurableStoreEnabled()) {
    const durable = await loadDurableRun(runId);
    if (durable) return durable;
  }
  return getRun(runId);
}

export async function getIdempotentRunAsync(key: string): Promise<RunStatus | null> {
  prune();
  const localId = idempotencyKeys.get(key);
  if (localId) return runs.get(localId) ?? null;
  return isDurableStoreEnabled() ? loadDurableRunByKey(key) : null;
}

export function setRun(
  runId: string,
  patch: Partial<RunStatus>,
  ownerWorkerId?: string
) {
  const current = runs.get(runId);
  if (!current) return;
  // §8 — a terminal state is immutable in memory too. A late callback from a
  // worker that finished before admin cancel must not reopen cancelled/timeout.
  const terminal = !active(current);
  const guardedPatch: Partial<RunStatus> = terminal
    ? { ...patch, state: current.state, cancelRequested: true }
    : { ...patch };
  const next: RunStatus = {
    ...current, ...guardedPatch, runId, startedAt: current.startedAt,
    workerId: ownerWorkerId ?? current.workerId ?? null,
  };
  next.progress = next.progress.slice(-40).map((message) => message.slice(0, 2048));
  if (next.error) next.error = next.error.slice(0, 2048);
  if (patch.report) {
    try {
      if (Buffer.byteLength(JSON.stringify(patch.report), "utf8") > MAX_REPORT_BYTES) throw new Error("Report too large");
    } catch {
      next.report = null;
      next.error = "Progress report omitted: exceeded serialization/size limit. See the persisted audit log.";
    }
  }
  if (!active(next) && next.finishedAt === undefined) next.finishedAt = Date.now();
  runs.set(runId, next);
  // The in-process run may write ONLY while no worker has claimed the lease;
  // a restart worker writes only under its own live lease. A late callback
  // with neither is fenced out by the SQL predicate.
  const guard = next.workerId
    ? { workerId: next.workerId as string }
    : ({ kind: "unclaimed" } as const);
  if (!terminal) void patchDurableRun(runId, next, guard).catch(() => {});
}

export function appendProgress(runId: string, message: string) {
  const run = runs.get(runId);
  if (run) setRun(runId, { progress: [...run.progress, message] });
}

/** Persist every university result, not just the last report. */
export function recordUniversityResult(runId: string, report: AuditReport, workerId?: string) {
  const run = runs.get(runId);
  if (!run) return;
  const previous = run.checkpoint ?? { completedUniversityIds: [], reports: [], progress: run.progress };
  const completedUniversityIds = [...new Set([...previous.completedUniversityIds, report.universityId])];
  const reports = [...previous.reports.filter((item) => item.universityId !== report.universityId), report];
  setRun(runId, {
    universityId: report.universityId,
    report,
    checkpoint: { completedUniversityIds, reports, progress: run.progress },
  }, workerId);
  // A restart worker passes its workerId: the durable write is rejected if its
  // lease expired (another worker may already own the run). The original
  // in-process path has no lease and keeps its unguarded behavior.
  const guard = workerId ? { workerId } : undefined;
  void appendDurableItem(runId, report.universityId, { status: "complete", report, attempts: run.attempts ?? 1 }, guard).catch(() => {});
}

export function recordUniversityError(runId: string, universityId: number, error: string, workerId?: string) {
  const run = runs.get(runId);
  if (!run) return;
  setRun(runId, { universityId, error }, workerId);
  const guard = workerId ? { workerId } : undefined;
  void appendDurableItem(runId, universityId, { status: "error", error, attempts: (run.attempts ?? 1) + 1 }, guard).catch(() => {});
}

export function isRunCancelled(runId: string): boolean {
  const run = runs.get(runId);
  return !!run && (run.cancelRequested === true || run.state === "cancelled" || run.state === "timed_out");
}

export function cancelRun(runId: string): boolean {
  const run = runs.get(runId);
  if (!run || !active(run) || run.cancelRequested) return false;
  setRun(runId, { cancelRequested: true });
  appendProgress(runId, "Cancellation requested; stopping after the current university.");
  void requestDurableCancellation(runId).catch(() => {});
  return true;
}

export function markRunTimedOut(runId: string): boolean {
  const run = runs.get(runId);
  if (!run || !active(run)) return false;
  setRun(runId, {
    state: "timed_out",
    cancelRequested: true,
    error: `Run exceeded the ${Math.round((run.timeoutAt ?? Date.now()) - run.startedAt)} ms deadline.`,
    finishedAt: Date.now(),
  });
  // The timeout is a deliberate terminal transition, not a worker write.
  void patchDurableRun(runId, { state: "timed_out", cancelRequested: true }, { kind: "admin_cancel" }).catch(() => {});
  return true;
}

export function listRuns(): RunStatus[] {
  prune();
  return [...runs.values()].sort((a, b) => b.startedAt - a.startedAt).slice(0, MAX_RETAINED_RUNS);
}

export async function listRunsAsync(): Promise<RunStatus[]> {
  if (isDurableStoreEnabled()) {
    const durable = await listDurableRuns(MAX_RETAINED_RUNS);
    if (durable.length > 0) return durable;
  }
  return listRuns();
}
