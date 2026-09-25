/**
 * Deterministic checks for essay peer-review aggregation
 * (src/lib/essayReviews.ts).
 *
 * Rules: averages exclude empty dimensions and count only what was scored;
 * scores are clamped to the 0–100 rubric band; no reviewer can invent a
 * dimension the others skipped.
 *
 * Run: npm run test:essay-reviews
 */

import { aggregateReviews, clampScore } from "../src/lib/essayReviews";

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(title: string) {
  console.log(`\n${title}`);
}

section("1. Averages are per-dimension and rounded to one decimal");

const agg = aggregateReviews([
  { hook: 80, structure: 70, specificity: 60, language: 90, fit: 80, total: 76 },
  { hook: 84, structure: 76, specificity: 66, language: 92, fit: 82, total: 80 },
]);
check("review count", agg.count === 2, `got ${agg.count}`);
check("hook average", agg.avg.hook === 82, `got ${agg.avg.hook}`);
check("total average", agg.avg.total === 78, `got ${agg.avg.total}`);
check("rounding to one decimal", aggregateReviews([{ hook: 10 }, { hook: 11 }, { hook: 11 }]).avg.hook === 10.7);

section("2. Empty dimensions are excluded, never zero-padded");

const partial = aggregateReviews([
  { hook: 90, structure: null, specificity: 70, language: null, fit: null, total: 80 },
  { hook: null, structure: 80, specificity: 72, language: 80, fit: 78, total: 82 },
]);
check("skipped dimension stays null", partial.avg.hook === 90 && partial.avg.structure === 80, JSON.stringify(partial.avg));
check("specificity averages both", partial.avg.specificity === 71, `got ${partial.avg.specificity}`);
check("fit from the single reviewer", partial.avg.fit === 78);

section("3. Nothing scored yet → all nulls, no NaN");

const empty = aggregateReviews([]);
check("empty list → 0 reviews, null averages", empty.count === 0 && Object.values(empty.avg).every((v) => v === null));
check("no NaN anywhere", !JSON.stringify(empty).includes("NaN"));

const allNulls = aggregateReviews([{ hook: null, structure: null, specificity: null, language: null, fit: null, total: null }, { comment: "just a comment" } as any]);
check("comment-only reviews count, but score nothing", allNulls.count === 2 && allNulls.avg.total === null);

section("4. Scores are clamped into the rubric band");

check("clamp 150 → 100", clampScore(150) === 100);
check("clamp -20 → 0", clampScore(-20) === 0);
check("clamp 73.4 → 73", clampScore(73.4) === 73);
check("clamp garbage → null", clampScore("abc") === null && clampScore(undefined) === null && clampScore(NaN) === null);
check("clamp in-band keeps value", clampScore(55) === 55);

section("5. Determinism");

check("same input → same output", JSON.stringify(aggregateReviews([{ hook: 50, total: 55 }])) === JSON.stringify(aggregateReviews([{ hook: 50, total: 55 }])));

// ---------------------------------------------------------------------------
console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
