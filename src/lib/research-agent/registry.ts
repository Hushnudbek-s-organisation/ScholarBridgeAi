/** Bounded process-local progress; not a durable cross-instance job queue. */
import { randomUUID } from "node:crypto";
import type { RunStatus } from "./types";

export const MAX_ACTIVE_RUNS = 2;
export const MAX_RETAINED_RUNS = 20;
const RETENTION_MS = 30 * 60_000;
const MAX_REPORT_BYTES = 2 * 1024 * 1024;
const runs = new Map<string, RunStatus>();
export class ResearchCapacityError extends Error {
  constructor() { super("Research workers are busy. Retry when a run finishes."); this.name = "ResearchCapacityError"; }
}
function active(run: RunStatus) { return run.state === "idle" || run.state === "running"; }
function prune() {
  for (const [id, run] of runs) if (!active(run) && Date.now() - (run.finishedAt ?? run.startedAt) >= RETENTION_MS) runs.delete(id);
}
export function createRun(universityId: number | null): string {
  prune();
  if ([...runs.values()].filter(active).length >= MAX_ACTIVE_RUNS) throw new ResearchCapacityError();
  while (runs.size >= MAX_RETAINED_RUNS) {
    const oldest = [...runs].find(([, run]) => !active(run));
    if (!oldest) throw new ResearchCapacityError();
    runs.delete(oldest[0]);
  }
  const runId = `run_${randomUUID()}`;
  runs.set(runId, { runId, universityId, state: "idle", progress: [], report: null, startedAt: Date.now() });
  return runId;
}
export function getRun(runId: string): RunStatus | null { prune(); return runs.get(runId) ?? null; }
export function setRun(runId: string, patch: Partial<RunStatus>) {
  const current = runs.get(runId);
  if (!current) return;
  const next = { ...current, ...patch, runId, startedAt: current.startedAt };
  next.progress = next.progress.slice(-40).map((message) => message.slice(0, 2048));
  if (next.error) next.error = next.error.slice(0, 2048);
  if (patch.report) {
    try {
      if (Buffer.byteLength(JSON.stringify(patch.report), "utf8") > MAX_REPORT_BYTES) throw new Error("Report too large");
    } catch { next.report = null; next.error = "Progress report omitted: exceeded serialization/size limit. See the persisted audit log."; }
  }
  if (!active(next) && next.finishedAt === undefined) next.finishedAt = Date.now();
  runs.set(runId, next);
}
export function appendProgress(runId: string, message: string) {
  const run = runs.get(runId);
  if (run) setRun(runId, { progress: [...run.progress, message] });
}
export function listRuns(): RunStatus[] { prune(); return [...runs.values()].sort((a, b) => b.startedAt - a.startedAt).slice(0, MAX_RETAINED_RUNS); }
