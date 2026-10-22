/**
 * Scholarship cycle refresh is intentionally non-mutating. A historical date
 * is not evidence of the next application cycle; never roll it forward.
 * Existing rows are left untouched so administrator edits are preserved.
 */

export const SEEDED_SCHOLARSHIP_TITLES = [
  "Fulbright Foreign Student Program",
  "Chevening Scholarship",
  "DAAD Development-Related Postgraduate Courses (EPOS)",
  "Erasmus Mundus Joint Master Degrees (EMJMD)",
  "Knight-Hennessy Scholars Program",
  "Gates Cambridge Scholarship",
  "MEXT Japanese Government Scholarship",
  "Lester B. Pearson International Scholarship",
] as const;

export interface SeededScholarshipRefreshSummary {
  examined: number;
  rolledForward: number;
}

/** No-op compatibility export for existing seed callers; performs no DB writes. */
export async function refreshSeededScholarshipCycles(): Promise<SeededScholarshipRefreshSummary> {
  return { examined: 0, rolledForward: 0 };
}
