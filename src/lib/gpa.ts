/** Planning-only proportional conversion. Missing/invalid scale is unknown.
 * Original profile values are never changed; not an official conversion rule. */
export function gpaTo40Scale(gpa: number | null | undefined, scale: number | null | undefined, minimum:number|null=0): number | null {
  if (gpa == null || scale == null || minimum == null) return null;
  const g = Number(gpa), s = Number(scale);
  if (!Number.isFinite(g) || !Number.isFinite(s) || s <= 0 || !Number.isFinite(minimum) || minimum < 0 || minimum >= s || g < minimum || g > s) return null;
  return (g-minimum) / (s-minimum) * 4;
}
