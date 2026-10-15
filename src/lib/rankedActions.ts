/**
 * One ordering brain for every "what should I do next?" surface.
 *
 * The dashboard (`/api/dashboard` → `computeNextActions`) and the roadmap
 * endpoints (`/api/next-actions`, `/api/ai/admissions-advisor` →
 * `buildNextActions`) describe the same student state in two shapes: one is
 * fully localised with translation keys, the other carries plain-English
 * sentences for the AI brief. They used to rank with two copies of the same
 * rule, which drifted apart — a school could see a different "next step"
 * first depending on which endpoint rendered the panel.
 *
 * The ranking lives here once: identical score bands for tracked dates and
 * identical tie-breaking, so both engines produce the same order for the same
 * facts. Nothing here reads the clock, the database or the AI.
 */

export interface RankableAction {
  id: string;
  /** Ordering key — higher wins. Never shown to the student. */
  score: number;
  /** Days until the tracked date; null when no date is recorded. */
  dueInDays: number | null;
}

/**
 * Score bands for a tracked date. A past or same-day date must outrank every
 * untimed preparation hint, and a date in the future must outrank a row with
 * no date at all. The exact day count only breaks ties inside a band.
 */
export const ACTION_SCORE = {
  deadlinePassed: 100,
  deadlineToday: 95,
  deadlineFuture: 75,
  deadlineUndated: 30,
} as const;

/** The single definition of "how urgent is this tracked date". */
export function deadlineScore(days: number | null | undefined): number {
  if (days == null) return ACTION_SCORE.deadlineUndated;
  if (days < 0) return ACTION_SCORE.deadlinePassed;
  if (days === 0) return ACTION_SCORE.deadlineToday;
  return ACTION_SCORE.deadlineFuture;
}

/** Urgency band derived from the score, shared by both engines. */
export function actionUrgencyFromScore(score: number): "critical" | "high" | "medium" | "low" {
  if (score >= 90) return "critical";
  if (score >= 60) return "high";
  if (score >= 30) return "medium";
  return "low";
}

/**
 * The comparator: score first, then the nearest tracked date, then the id so
 * the result is deterministic across runs. Undated rows sort after dated ones
 * of the same score.
 */
export function compareRanked<T extends RankableAction>(a: T, b: T): number {
  if (b.score !== a.score) return b.score - a.score;
  const aDue = a.dueInDays ?? Number.MAX_SAFE_INTEGER;
  const bDue = b.dueInDays ?? Number.MAX_SAFE_INTEGER;
  if (aDue !== bDue) return aDue - bDue;
  return a.id.localeCompare(b.id);
}

/** Sort a copy of the list with the shared comparator. */
export function rankActions<T extends RankableAction>(items: T[]): T[] {
  return [...items].sort(compareRanked);
}

/**
 * Drop duplicate rows, keeping the best-ranked one. Both engines key on the
 * action id; `keyOf` lets the localised engine dedupe on the visible label
 * instead, which is what the student would perceive as a repeat.
 */
export function dedupeRanked<T extends RankableAction>(
  items: T[],
  keyOf: (item: T) => string,
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = keyOf(item).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}
