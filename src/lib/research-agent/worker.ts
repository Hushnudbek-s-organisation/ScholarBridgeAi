/**
 * Restart worker / resume consumer for the durable Research Agent queue.
 *
 * The normal POST /admin/research-agent/run starts a detached batch in the
 * current process. After a restart that process-local Map is empty; this module
 * claims stale durable rows with one atomic SQL UPDATE, rebuilds the remaining
 * work slice from checkpoints + per-item attempts, and resumes only that slice.
 * It is deliberately PostgreSQL-backed — no new paid queue service.
 *
 * Production scheduling is still an explicit operational choice: call the
 * admin resume endpoint (or a cron pointed at it) after migration + env flag.
 */
import { randomUUID } from "node:crypto";
import { AGENT_CONFIG } from "./config";
import {
  claimDurableRun,
  expireDurableRuns,
  isDurableStoreEnabled,
  listDurableRunItems,
  listResumableRunRows,
  loadDurableRun,
  parseJson,
  patchDurableRun,
  releaseDurableRun,
  renewDurableLease,
  skipDurableItem,
  toMillis,
  toRunStatus,
  type DurableRow,
} from "./durableStore";
import { planResume, type ResumeItemState } from "./resumePolicy";
import { runBatch } from "./run-batch";
import {
  adoptDurableRun,
  flushDurableRunWrites,
  appendProgress,
  isRunActiveLocally,
  isRunCancelled,
  recordUniversityError,
  recordUniversityResult,
  setRun,
} from "./registry";
import type { RunRequest, RunStatus } from "./types";

export const DEFAULT_WORKER_LEASE_MS = 60_000;
const HEARTBEAT_MS = 15_000;

export interface ResumeSummary {
  enabled: boolean;
  expired: number;
  considered: number;
  claimed: number;
  resumed: number;
  finished: number;
  skipped: number;
  errors: string[];
}

interface CheckpointShape {
  completedUniversityIds?: number[];
  reports?: RunStatus["checkpoint"] extends { reports: infer R } ? R : never[];
  progress?: string[];
}

function requestFromRow(row: DurableRow): RunRequest {
  const request = parseJson<RunRequest>(row.request, { universityIds: [], scopes: [] });
  const universityIds = parseJson<number[]>(row.university_ids, request.universityIds ?? []);
  const scopes = parseJson<RunRequest["scopes"]>(row.scopes, request.scopes ?? []);
  return {
    ...request,
    universityIds,
    scopes,
    dryRun: row.dry_run === true || request.dryRun === true,
  };
}

function checkpointFromRow(row: DurableRow): CheckpointShape {
  return parseJson<CheckpointShape>(row.checkpoint, { completedUniversityIds: [], reports: [], progress: [] });
}

async function markTerminalWithoutWork(
  runId: string,
  workerId: string,
  exhaustedIds: number[]
): Promise<void> {
  const hasExhausted = exhaustedIds.length > 0;
  await patchDurableRun(runId, {
    state: hasExhausted ? "error" : "complete",
    error: hasExhausted
      ? `No remaining work; ${exhaustedIds.length} university item(s) exhausted their retry budget.`
      : "No remaining work; all university items already have durable results.",
    finishedAt: Date.now(),
  }, { workerId });
  await releaseDurableRun(runId, workerId);
}

function terminalState(runId: string): RunStatus["state"] {
  const local = isRunCancelled(runId);
  return local ? "cancelled" : "complete";
}

/**
 * Claim and resume stale durable runs. Returns as soon as the work is
 * scheduled; the batch itself remains detached, like the original run route.
 */
export async function resumeResearchRuns(
  options: { limit?: number; leaseMs?: number; workerId?: string } = {}
): Promise<ResumeSummary> {
  const summary: ResumeSummary = {
    enabled: isDurableStoreEnabled(),
    expired: 0,
    considered: 0,
    claimed: 0,
    resumed: 0,
    finished: 0,
    skipped: 0,
    errors: [],
  };
  if (!summary.enabled) return summary;

  const workerId = options.workerId ?? `worker_${randomUUID()}`;
  const leaseMs = Math.max(1_000, Math.min(options.leaseMs ?? DEFAULT_WORKER_LEASE_MS, AGENT_CONFIG.runTimeoutMs));
  summary.expired = await expireDurableRuns();
  const rows = await listResumableRunRows(options.limit ?? 2);
  summary.considered = rows.length;

  for (const row of rows) {
    if (isRunActiveLocally(row.id)) {
      summary.skipped++;
      continue;
    }
    const claimed = await claimDurableRun(row.id, workerId, leaseMs);
    if (!claimed) {
      summary.skipped++;
      continue;
    }
    summary.claimed++;
    const claimToken = claimed.lease_owner;
    if (!claimToken) { summary.errors.push(`${row.id}: missing lease token`); continue; }

    const timeoutAt = toMillis(claimed.timeout_at);
    if (timeoutAt && Date.now() >= timeoutAt) {
      await patchDurableRun(row.id, {
        state: "timed_out",
        cancelRequested: true,
        error: "Run deadline passed before a worker resumed it.",
        finishedAt: Date.now(),
      }, { workerId: claimToken });
      await releaseDurableRun(row.id, claimToken);
      summary.finished++;
      continue;
    }

    const items: ResumeItemState[] = await listDurableRunItems(row.id);
    const request = requestFromRow(claimed);
    const checkpoint = checkpointFromRow(claimed);
    const plan = planResume(
      request.universityIds,
      checkpoint.completedUniversityIds ?? [],
      items,
      claimed.max_attempts
    );

    for (const id of plan.exhaustedIds) {
      await skipDurableItem(row.id, id, "Retry budget exhausted; not shown as a successful report.", claimToken);
    }
    if (plan.universityIds.length === 0) {
      await markTerminalWithoutWork(row.id, claimToken, plan.exhaustedIds);
      if (plan.exhaustedIds.length) summary.errors.push(`${row.id}: ${plan.exhaustedIds.length} exhausted item(s)`);
      summary.finished++;
      continue;
    }

    if (!adoptDurableRun({...toRunStatus(claimed),workerId:claimToken})) {
      await releaseDurableRun(row.id, claimToken);
      summary.skipped++;
      continue;
    }
    setRun(row.id, {
      state: "running",
      checkpoint: {
        completedUniversityIds: plan.completedIds,
        reports: checkpoint.reports ?? [],
        progress: checkpoint.progress ?? [],
      },
      progress: [
        `Restart worker resumed ${plan.universityIds.length} remaining universit${plan.universityIds.length === 1 ? "y" : "ies"}.`,
        plan.retryIds.length ? `Retrying ${plan.retryIds.length} previously failed item(s).` : "No prior item retries.",
      ],
    });
    appendProgress(row.id, `Claimed by ${claimToken.slice(0, 18)}; durable lease is renewed while active.`);

    let cancelled = false;
    const heartbeat = setInterval(() => {
      void loadDurableRun(row.id)
        .then((fresh) => {
          if (fresh?.cancelRequested || fresh?.state === "cancelled" || fresh?.state === "timed_out") {
            cancelled = true;
            setRun(row.id, {
              cancelRequested: true,
              state: fresh.state === "timed_out" ? "timed_out" : "cancelled",
            });
          }
        })
        .catch(() => {});
      void renewDurableLease(row.id, claimToken, leaseMs).then(ok => { if (!ok) cancelled = true; }).catch(() => { cancelled = true; });
    }, HEARTBEAT_MS);
    if (typeof heartbeat.unref === "function") heartbeat.unref();

    void runBatch(
      { ...request, universityIds: plan.universityIds },
      (universityId, message) => {
        if (cancelled || isRunCancelled(row.id)) return;
        setRun(row.id, { universityId });
        appendProgress(row.id, message);
      },
      () => cancelled || isRunCancelled(row.id),
      {
        lease:{runId:row.id,workerId:claimToken},
        onUniversityComplete: (report) => recordUniversityResult(row.id, report, claimToken),
        onUniversityError: (universityId, error) => recordUniversityError(row.id, universityId, error, claimToken),
      }
    )
      .then(({ reports, errors }) => {
        const state = cancelled || isRunCancelled(row.id) ? terminalState(row.id) : "complete";
        setRun(row.id, {
          state,
          report: reports[reports.length - 1] ?? null,
          error: state === "cancelled"
            ? "Run stopped by cancellation. Completed university reports remain available."
            : errors.length > 0
              ? errors.join("; ")
              : undefined,
          finishedAt: Date.now(),
        });
        appendProgress(row.id, state === "cancelled" ? "Stopped by cancellation." : "Restart worker finished.");
      })
      .catch(() => {
        setRun(row.id, { state: "error", error: "Restart worker failed. Check server logs.", finishedAt: Date.now() });
      })
      .finally(async () => {
        clearInterval(heartbeat);
        await flushDurableRunWrites(row.id);
        await releaseDurableRun(row.id, claimToken);
      });

    summary.resumed++;
  }

  return summary;
}
