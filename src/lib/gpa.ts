/**
 * GPA normalisation — ONE implementation, shared by the discovery matcher
 * (`src/lib/matching.ts`) and the subject-to-program recommender
 * (`src/lib/recommend.ts`).
 *
 * HONESTY RULE (matches the recommender's policy):
 *   • an explicit scale (4, 5, 100, …) → convert proportionally to 4.0;
 *   • no scale + value ≤ 4 → already on a 4.0 scale, safe to compare;
 *   • no scale + value > 4 (e.g. 85 on an unknown 100-point scale) → null
 *     ("unknown"). It is NEVER clamped to a perfect 4.0 and never treated as
 *     a failed requirement — the caller simply cannot compare it.
 */
export function gpaTo40Scale(
  gpa: number | null | undefined,
  scale: number | null | undefined
): number | null {
  const g = Number(gpa);
  if (!Number.isFinite(g) || g <= 0) return null;
  if (scale == null) {
    // No scale given: only a 4.0-scale GPA is safe to compare directly.
    // We cannot assume, so treat as unknown unless it is clearly ≤ 4.
    return g <= 4 ? g : null;
  }
  const s = Number(scale);
  if (!Number.isFinite(s) || s <= 0) return null;
  if (s === 4) return Math.min(4, g);
  // Percentage / 5.0 / other scales: convert proportionally.
  return Math.min(4, (g / s) * 4);
}
