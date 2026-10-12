/**
 * Shared deterministic calculation primitives.
 *
 * Business calculations belong in server-safe pure modules, not route handlers
 * or React components. These helpers deliberately accept plain values, have no
 * database/clock/network dependency, and define edge-case behaviour once.
 */

export interface CompletionSummary {
  done: number;
  total: number;
  remaining: number;
  pct: number;
  complete: boolean;
}

/** Clamp and round a percentage. An empty denominator is 0%, never NaN/100%. */
export function percentage(part: number, whole: number): number {
  if (!Number.isFinite(part) || !Number.isFinite(whole) || whole <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((Math.max(0, part) / whole) * 100)));
}

/** One canonical completion summary for checklists, courses and workspaces. */
export function completionSummary(done: number, total: number): CompletionSummary {
  const safeTotal = Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0;
  const safeDone = Number.isFinite(done)
    ? Math.min(safeTotal, Math.max(0, Math.floor(done)))
    : 0;
  return {
    done: safeDone,
    total: safeTotal,
    remaining: safeTotal - safeDone,
    pct: percentage(safeDone, safeTotal),
    // Empty is not completed: completion must represent actual confirmed work.
    complete: safeTotal > 0 && safeDone === safeTotal,
  };
}

/** Summarise rows without leaking status semantics into API/UI layers. */
export function summarizeStatuses<T>(
  rows: readonly T[],
  isDone: (row: T) => boolean
): CompletionSummary {
  return completionSummary(rows.filter(isDone).length, rows.length);
}
