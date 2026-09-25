/**
 * #24 — Essay peer review: aggregation.
 *
 * A version the author opened for review can collect structured reviews
 * (the five rubric dimensions + a total + a comment). The author sees the
 * AVERAGES per dimension — no single reviewer can move the number alone,
 * and nothing is invented when a dimension was left empty (it is excluded
 * from its average and counted as such).
 */

export interface ReviewInput {
  hook?: number | null;
  structure?: number | null;
  specificity?: number | null;
  language?: number | null;
  fit?: number | null;
  total?: number | null;
}

export interface ReviewAggregate {
  count: number;
  /** null when nobody scored that dimension yet. */
  avg: {
    hook: number | null;
    structure: number | null;
    specificity: number | null;
    language: number | null;
    fit: number | null;
    total: number | null;
  };
}

function avg(values: (number | null | undefined)[]): number | null {
  const nums = values.filter((v): v is number => v != null && Number.isFinite(v));
  if (!nums.length) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

export function aggregateReviews(reviews: ReviewInput[]): ReviewAggregate {
  return {
    count: reviews.length,
    avg: {
      hook: avg(reviews.map((r) => r.hook)),
      structure: avg(reviews.map((r) => r.structure)),
      specificity: avg(reviews.map((r) => r.specificity)),
      language: avg(reviews.map((r) => r.language)),
      fit: avg(reviews.map((r) => r.fit)),
      total: avg(reviews.map((r) => r.total)),
    },
  };
}

/** Clamp a reviewer-supplied score into the rubric band (0–100). */
export function clampScore(v: unknown): number | null {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.min(100, Math.max(0, Math.round(n)));
}
