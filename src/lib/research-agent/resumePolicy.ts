/**
 * Pure restart/resume policy. No database or environment imports, so the rule
 * can be tested deterministically without a production connection.
 */
export interface ResumeItemState {
  universityId: number;
  status: "pending" | "running" | "complete" | "error" | "skipped";
  attempts: number;
}

export interface ResumePlan {
  /** IDs to process now, in the original request order. */
  universityIds: number[];
  /** Already finished; never repeated. */
  completedIds: number[];
  /** Included in universityIds because an earlier attempt failed or stalled. */
  retryIds: number[];
  /** Failed too many times; worker marks them skipped and reports the gap. */
  exhaustedIds: number[];
}

/**
 * Build the next work slice from the durable checkpoint and per-item state.
 *
 * A completed/skipped item is never rerun. A failed/running/pending item is
 * retried while its attempts are below maxAttempts; once the budget is used it
 * becomes an explicit gap, not an endless "running" row. Checkpoints and item
 * rows can disagree after a crash — both are treated as completion evidence.
 */
export function planResume(
  universityIds: number[],
  checkpointCompletedIds: number[],
  items: ResumeItemState[],
  maxAttempts: number
): ResumePlan {
  const cap = Number.isFinite(maxAttempts) ? Math.max(1, Math.floor(maxAttempts)) : 1;
  const byId = new Map<number, ResumeItemState>();
  for (const item of items) byId.set(item.universityId, item);

  const completed = new Set(checkpointCompletedIds);
  for (const item of items) {
    if (item.status === "complete" || item.status === "skipped") completed.add(item.universityId);
  }

  const plan: ResumePlan = { universityIds: [], completedIds: [], retryIds: [], exhaustedIds: [] };
  const seen = new Set<number>();
  for (const id of universityIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    if (completed.has(id)) {
      plan.completedIds.push(id);
      continue;
    }
    const item = byId.get(id);
    const attempts = Math.max(0, Number(item?.attempts ?? 0) || 0);
    if (attempts >= cap) {
      plan.exhaustedIds.push(id);
      continue;
    }
    plan.universityIds.push(id);
    if (attempts > 0 || item?.status === "error" || item?.status === "running") plan.retryIds.push(id);
  }
  return plan;
}
