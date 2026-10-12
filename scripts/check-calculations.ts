import { completionSummary, percentage, summarizeStatuses } from "../src/lib/calculations";
import { summarizeApplications } from "../src/lib/journey/applicationSummary";
import { clamp, interpolate, meets, normalize, ratio, roundTo, saturatingCurve, shortfall, weightedMean } from "../src/lib/scoring";

let passed = 0;
function equal(actual: unknown, expected: unknown, label: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
  passed++;
  console.log(`  ✓ ${label}`);
}

console.log("Shared backend calculations");
equal(percentage(1, 3), 33, "rounds a normal ratio");
equal(percentage(9, 3), 100, "clamps above 100");
equal(percentage(-2, 3), 0, "clamps negative progress");
equal(percentage(2, 0), 0, "empty denominator is 0, not NaN or complete");
equal(percentage(Number.NaN, 2), 0, "invalid input is safe");
equal(
  completionSummary(3, 5),
  { done: 3, total: 5, remaining: 2, pct: 60, complete: false },
  "returns one canonical summary"
);
equal(completionSummary(0, 0).complete, false, "empty work is never falsely complete");
equal(completionSummary(9, 4).done, 4, "done cannot exceed total");
equal(completionSummary(4, 4).complete, true, "real finished work is complete");
equal(
  summarizeStatuses(
    [{ status: "done" }, { status: "pending" }, { status: "not_required" }],
    (row) => row.status === "done" || row.status === "not_required"
  ).pct,
  67,
  "status semantics are supplied once by the domain caller"
);
equal(
  summarizeApplications(
    [
      { id: 1, submittedAt: null },
      { id: 2, submittedAt: "2026-10-01" },
      { id: 3, submittedAt: "2026-10-02" },
    ],
    [
      { applicationId: 2, status: "pending" },
      { applicationId: 3, status: "accepted" },
      { applicationId: 3, status: "accepted" },
    ]
  ),
  { total: 3, preparing: 1, submitted: 2, decision: 1 },
  "application decisions are deduplicated and pending is not a decision"
);

// ---------------------------------------------------------------------------
// src/lib/scoring.ts — the precision primitives every engine is built on.
// These assertions exist because the engines' accuracy rests on them: a
// rounding bug here moves the fit score, the readiness score and the strength
// dashboard at the same time.
console.log("\nPrecision primitives (scoring.ts)");

// clamp — inclusive, NaN-safe.
equal(clamp(5, 0, 10), 5, "clamp keeps an in-range value");
equal(clamp(-3, 0, 10), 0, "clamp respects the floor");
equal(clamp(30, 0, 10), 10, "clamp respects the ceiling");
equal(clamp(Number.NaN, 0, 10), 0, "clamp turns NaN into the floor, never NaN");

// roundTo — half-up, and the ONLY place rounding happens.
equal(roundTo(2.345, 2), 2.35, "roundTo is half-up at the given precision");
equal(roundTo(2.5), 3, "roundTo defaults to whole numbers (pass decimals!)");
equal(roundTo(-2.344, 2), -2.34, "roundTo rounds a negative value to the nearest step");
equal(roundTo(-2.346, 2), -2.35, "roundTo keeps the sign on the way down");
equal(roundTo(0.1 + 0.2, 1), 0.3, "roundTo repairs float drift at the edge");

// interpolate — piecewise linear, flat beyond the ends.
const curve = [
  { x: -1, y: 0 },
  { x: 0, y: 50 },
  { x: 1, y: 100 },
];
equal(interpolate(0, curve), 50, "interpolate hits its anchor exactly");
equal(interpolate(0.5, curve), 75, "interpolate is linear between anchors");
equal(interpolate(-5, curve), 0, "interpolate is flat below the first anchor");
equal(interpolate(5, curve), 100, "interpolate is flat above the last anchor");
equal(interpolate(0.9, curve) > interpolate(0.8, curve), true, "interpolate is strictly monotone");

// ratio / normalize — null on an unusable denominator, never a fake 0.
equal(ratio(3, 4), 0.75, "ratio divides when the denominator is usable");
equal(ratio(3, 0), null, "ratio is null on a zero denominator, not Infinity");
equal(ratio(3, Number.NaN), null, "ratio is null on a missing/non-numeric denominator");
equal(ratio(-1, 4), 0, "ratio clamps a negative part to 0 instead of going negative");
equal(normalize(50, 0, 100), 0.5, "normalize maps a range to 0–1");
equal(normalize(200, 0, 100), 1, "normalize clamps above the range");
equal(normalize(50, 100, 100), null, "normalize is null on a degenerate range");

// weightedMean — a NULL dimension is left out; an explicit 0 counts.
equal(weightedMean([80, 100]), 90, "weightedMean averages the measured values");
equal(weightedMean([0, 100]), 50, "weightedMean keeps a real zero (0 is a score, null is not-measured)");
equal(weightedMean([null, 100]), 100, "weightedMean drops null as not-measured");
equal(weightedMean([null]), null, "weightedMean is null when nothing was measured");
equal(weightedMean([]), null, "weightedMean is null on an empty list, never NaN");
equal(weightedMean([Number.NaN, 50]), 50, "weightedMean ignores a non-finite entry");

// meets — the bar itself is worth `edgeShare` of the award, then linear.
equal(meets(7, 7, 1, 10, 0), 0, "meeting a minimum exactly earns nothing at edgeShare 0");
equal(meets(7.5, 7, 1, 10, 0), 5, "half a span above the bar earns half the award");
equal(meets(8, 7, 1, 10, 0), 10, "a full span above the bar earns the full award");
equal(meets(8.5, 7, 1, 10, 0), 10, "the award never exceeds its cap");
equal(meets(6.5, 7, 1, 10, 0), 0, "below the bar never earns a positive award");
equal(roundTo(meets(7, 7, 1, 10), 2), 3.33, "the default edgeShare gives the documented third");
equal(meets(7, 7, 0, 10, 0), 10, "a zero span means at-or-above is fully met");

// shortfall — returns a NEGATIVE penalty (or 0), never a positive number.
equal(shortfall(6.5, 7, 1, 20), -10, "shortfall scales with the distance below the bar");
equal(shortfall(7.5, 7, 1, 20), 0, "shortfall is 0 above the bar, never positive");
equal(shortfall(5, 7, 0, 20), -20, "a zero span treats any miss as the full penalty");

// saturatingCurve — square-root approach to 1, capped.
equal(saturatingCurve(0, 4), 0, "saturatingCurve starts at 0");
equal(saturatingCurve(-3, 4), 0, "saturatingCurve never goes below 0");
equal(saturatingCurve(4, 4), 1, "saturatingCurve reaches 1 at its reference");
equal(saturatingCurve(16, 4), 1, "saturatingCurve never exceeds 1");
equal(saturatingCurve(1, 4), 0.5, "saturatingCurve halves at a quarter of the reference");
equal(saturatingCurve(9, 4), saturatingCurve(16, 4), "the curve flattens at the cap");
equal(saturatingCurve(3, 0), 1, "an unusable reference saturates, it never returns Infinity or NaN");

console.log(`\ncalculation test passed (${passed} assertions)`);
