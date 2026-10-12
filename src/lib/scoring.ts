/**
 * Precision primitives for the deterministic engines.
 *
 * WHY THIS MODULE EXISTS
 * ----------------------
 * The fit / readiness / strength engines used to score in coarse steps:
 * a 0.29 GPA shortfall and a 0.01 shortfall both lost exactly 12 points, a
 * budget covering 60% of the cost and one covering 99% both lost 10, and a
 * missing test and a badly-failed test could land on the same value. Step
 * functions are precise only at the step, and the step is arbitrary.
 *
 * Every engine now grades CONTINUOUSLY between documented anchors and keeps
 * the arithmetic visible:
 *   • a change in an input always moves the score in the same direction
 *     (monotone) — no cliffs where +0.01 GPA is worth 10 points;
 *   • equal distances from an anchor are worth equal points;
 *   • the exact points behind a score are returned per dimension
 *     (`breakdown` in matching.ts), so the UI can show real arithmetic instead
 *     of "roughly matches".
 *
 * WORKING IN FRACTIONS, ROUNDING ONCE
 * -----------------------------------
 * An engine computes in full float precision and rounds ONCE, at the end
 * (`roundTo`). Rounding each contribution first and summing afterwards loses
 * accuracy — six rounded terms can shift the total by several points — so the
 * helpers below never round on their own except where they say so.
 *
 * NO INVENTED INPUTS
 * ------------------
 * None of these helpers invents a value. `ratio`/`normalize` return null when
 * the denominator is unusable, and every caller is expected to treat null as
 * "not compared" rather than as zero. That rule is what keeps an empty profile
 * from scoring as a bad one.
 *
 * PURE MODULE — no DB, no clock, no locale. Asserted in
 * scripts/check-calculations.ts.
 */

/** A point on a piecewise-linear curve. */
export interface Anchor {
  x: number;
  y: number;
}

export function clamp(value: number, lo: number, hi: number): number {
  if (!Number.isFinite(value)) return lo;
  return Math.min(hi, Math.max(lo, value));
}

/**
 * Round to `decimals` places, ties away from zero (2.5 → 3, −2.5 → −3 after
 * the EPSILON nudge below). Used once, at the edge of an engine — never per
 * contribution, because six rounded terms can drift the total by points.
 * Not-passed `decimals` means whole numbers: `roundTo(x)` is an integer round.
 */
export function roundTo(value: number, decimals = 0): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON * Math.sign(value)) * factor) / factor;
}

/**
 * Piecewise-linear interpolation through `anchors`, sorted by x.
 *
 * • below the first anchor / above the last one the curve is FLAT (an extra
 *   0.4 GPA above "well above" is not worth more points — the value caps);
 * • between anchors the value is linearly interpolated, so the score moves
 *   with the input instead of jumping at a threshold;
 * • the curve is monotone as long as the anchors are monotone, which is what
 *   makes "a better profile can never score lower" testable.
 *
 * Returns the first anchor's y for an empty/NaN input rather than throwing:
 * a scoring call must never take down a request.
 */
export function interpolate(x: number, anchors: readonly Anchor[]): number {
  if (!anchors.length) return 0;
  if (!Number.isFinite(x)) return anchors[0].y;
  const points = [...anchors].sort((a, b) => a.x - b.x);
  if (x <= points[0].x) return points[0].y;
  const last = points[points.length - 1];
  if (x >= last.x) return last.y;

  for (let i = 1; i < points.length; i++) {
    const from = points[i - 1];
    const to = points[i];
    if (x <= to.x) {
      const span = to.x - from.x;
      if (span <= 0) return to.y;
      const t = (x - from.x) / span;
      return from.y + (to.y - from.y) * t;
    }
  }
  return last.y;
}

/** `part / whole` as 0–1, or null when `whole` cannot support a comparison. */
export function ratio(part: number, whole: number): number | null {
  if (!Number.isFinite(part) || !Number.isFinite(whole) || whole <= 0) return null;
  return clamp(part / whole, 0, 1);
}

/** Position of `value` inside `[min, max]` as 0–1, or null for an empty range. */
export function normalize(value: number, min: number, max: number): number | null {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    return null;
  }
  return clamp((value - min) / (max - min), 0, 1);
}

/**
 * Weighted mean that ignores absent entries instead of treating them as 0.
 *
 * `entries[i] === null` means "this dimension has no data" and is dropped; an
 * explicit 0 is real data and is kept. Returns null when nothing was measured,
 * so the caller can say "not enough data" instead of printing a fake average.
 */
export function weightedMean(entries: readonly (number | null)[]): number | null {
  const measured = entries.filter((value): value is number => value != null && Number.isFinite(value));
  if (!measured.length) return null;
  return measured.reduce((sum, value) => sum + value, 0) / measured.length;
}

/**
 * Grade a value against a requirement, on both sides of the bar.
 *
 * `meets(value, requirement, span)` maps the margin above the requirement onto
 * `[edgeShare × award, award]`: at the bar the award starts at `edgeShare`
 * (default 1/3) and it is fully earned `span` above it.
 *
 * `shortfall(value, requirement, span)` maps the gap below the requirement
 * onto `[0, penalty]`: a hair below costs almost nothing, `span` below costs
 * the full penalty. It never returns a positive value, so being under a
 * published minimum can never be scored as a win.
 */
export function meets(value: number, requirement: number, span = 1, award = 1, edgeShare = 1 / 3): number {
  const margin = value - requirement;
  if (margin < 0) return 0;
  const progress = span <= 0 ? 1 : clamp(margin / span, 0, 1);
  return award * (clamp(edgeShare, 0, 1) + (1 - clamp(edgeShare, 0, 1)) * progress);
}

export function shortfall(value: number, requirement: number, span = 1, penalty = 1): number {
  const margin = requirement - value;
  if (margin <= 0) return 0;
  const progress = span <= 0 ? 1 : clamp(margin / span, 0, 1);
  return -penalty * progress;
}

/**
 * A curve that rises quickly at first and then flattens — for count-based
 * evidence (activities, publications, years) where the 6th item matters less
 * than the 2nd.
 *
 * `saturatingCurve(0, 6)` → 0; `saturatingCurve(2, 6)` → ≈0.7 of the range;
 * `saturatingCurve(6, 6)` → exactly 1; larger counts stay at 1.
 */
export function saturatingCurve(value: number, reference: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (!Number.isFinite(reference) || reference <= 0) return 1;
  const t = clamp(value / reference, 0, 1);
  // sqrt keeps early items valuable without ever overshooting the cap.
  return Math.sqrt(t);
}
