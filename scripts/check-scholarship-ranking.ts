/**
 * check-scholarship-ranking.ts (npm run test:ranking) — regression coverage for
 * the combined scholarship ordering and the two personal filters.
 *
 *   • `combinedRelevance`  — fit + university + chance as ONE number, the same
 *     number the catalogue sorts by (src/lib/scholarshipRanking.ts)
 *   • `evaluateChance`     — the published-gate check behind the "Chance"
 *     filter (src/lib/scholarshipGates.ts). It is an evidence check, never an
 *     admission probability; `chancing.ts` still refuses to estimate one.
 *   • `fitBucket`          — the three bands behind the "Fit" filter
 *   • `scholarshipMatchesFilters` / `scholarshipActiveFilterCount` — the new
 *     `chance` and `fit` dimensions, including the "no bucket" case
 *
 * Deterministic and offline: no database, no network. Run: npm run test:ranking
 */
import { combinedRelevance, CHANCE_POINTS, RELEVANCE_WEIGHTS } from "../src/lib/scholarshipRanking";
import { evaluateChance, fitBucket } from "../src/lib/scholarshipGates";
import {
  EMPTY_SCHOLARSHIP_FACETS,
  EMPTY_SCHOLARSHIP_FILTERS,
  scholarshipActiveFilterCount,
  scholarshipMatchesFilters,
  type ScholarshipFilterRow,
  type ScholarshipFilters,
} from "../src/lib/scholarshipFilters";

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

/* ------------------------------------------------------------------ ranking */

const strong = combinedRelevance({ fit: 90, university: 80, chance: "meets" });
const expected = 90 * RELEVANCE_WEIGHTS.fit + 80 * RELEVANCE_WEIGHTS.university + CHANCE_POINTS.meets * RELEVANCE_WEIGHTS.chance;
check(
  "all three parts fuse with the documented weights (0.5 / 0.3 / 0.2)",
  strong.score !== null && Math.abs(strong.score - Math.round(expected * 10) / 10) < 0.05,
  `got ${strong.score}, expected ${Math.round(expected * 10) / 10}`
);
check("the result reports which parts it used", strong.parts.map((p) => p.key).join(",") === "fit,university,chance");

// A sparse row is not punished for the data it does not have: with no
// university link the remaining weights renormalise to 1.0 again.
const noUni = combinedRelevance({ fit: 90, university: null, chance: "meets" });
const renormalised = (90 * 0.5 + 100 * 0.2) / 0.7;
check(
  "an award with no university link is scored on the parts it has (weights renormalise)",
  noUni.score !== null && Math.abs(noUni.score - Math.round(renormalised * 10) / 10) < 0.05,
  `got ${noUni.score}, expected ${Math.round(renormalised * 10) / 10}`
);
check("a missing part is absent, not a zero", !noUni.parts.some((p) => p.key === "university"));
check("part weights always add up to 1", Math.abs(noUni.parts.reduce((s, p) => s + p.weight, 0) - 1) < 0.01);

check("no comparable part at all → no invented score", combinedRelevance({ fit: null, university: null, chance: null }).score === null);

// The point of the phase: the university now moves the order.
const sameFitGoodUni = combinedRelevance({ fit: 75, university: 92, chance: "meets" });
const sameFitBadUni = combinedRelevance({ fit: 75, university: 48, chance: "meets" });
check(
  "equal scholarship fit: the better university match ranks higher",
  (sameFitGoodUni.score ?? 0) > (sameFitBadUni.score ?? 0),
  `${sameFitGoodUni.score} vs ${sameFitBadUni.score}`
);
const strongFitWeakUni = combinedRelevance({ fit: 95, university: 50, chance: "meets" });
const weakFitStrongUni = combinedRelevance({ fit: 85, university: 95, chance: "meets" });
check(
  "a large scholarship-fit gap decides when the universities are comparable",
  combinedRelevance({ fit: 95, university: 70, chance: "meets" }).score! >
    combinedRelevance({ fit: 60, university: 70, chance: "meets" }).score!
);
// ...and the reverse must also be possible: that IS "judging them together".
// At 0.5 / 0.3 a university gap must be roughly 1.7× the fit gap to win, so a
// 10-point fit difference is outweighed by a 45-point university difference.
check(
  "a much better university can outweigh a better scholarship fit",
  (weakFitStrongUni.score ?? 0) > (strongFitWeakUni.score ?? 0),
  `${weakFitStrongUni.score} vs ${strongFitWeakUni.score}`
);

// Chance orders exactly as its bands claim.
const meetsChance = combinedRelevance({ fit: 70, university: 70, chance: "meets" });
const unknownChance = combinedRelevance({ fit: 70, university: 70, chance: "unknown" });
const belowChance = combinedRelevance({ fit: 70, university: 70, chance: "below" });
check(
  "meets > unknown > below at equal fit and university",
  (meetsChance.score ?? 0) > (unknownChance.score ?? 0) && (unknownChance.score ?? 0) > (belowChance.score ?? 0),
  `${meetsChance.score} / ${unknownChance.score} / ${belowChance.score}`
);
check("a met gate never scores below a missed one", CHANCE_POINTS.meets > CHANCE_POINTS.below);
check("the score stays inside 0–100", [strong, noUni, belowChance].every((r) => r.score !== null && r.score >= 0 && r.score <= 100));

/* ------------------------------------------------------------------- chance */

const gpaOnly = evaluateChance({ gpa: 3.2, gpaScale: 4 }, { minGpa: 3.5 });
check("a GPA below the published floor is 'below'", gpaOnly.bucket === "below", gpaOnly.bucket);
check("the failing gate is named", gpaOnly.gates[0]?.gate === "gpa");

check(
  "meeting every published gate is 'meets'",
  evaluateChance({ gpa: 3.8, gpaScale: 4, ieltsScore: 7, degreeLevel: "Master" }, { minGpa: 3.5, minIelts: 6.5, degreeLevels: '["Master","PhD"]' }).bucket === "meets"
);

const nothingPublished = evaluateChance({ gpa: 3.8, gpaScale: 4 }, {});
check("an award that publishes no numeric gate is 'unknown', never 'below'", nothingPublished.bucket === "unknown", nothingPublished.bucket);
check("nothing comparable is reported as zero compared gates", nothingPublished.compared === 0);

check(
  "a profile with no GPA leaves the GPA gate unknown (not failed)",
  evaluateChance({ gpa: null, gpaScale: null }, { minGpa: 3.5 }).bucket === "unknown"
);
// A 3.2/5.0 GPA must not be compared with a 3.5/4.0 floor as if it were on the
// same scale: `gpaTo40Scale` normalises it to 2.56 first, so the shortfall is
// real and reported.
check(
  "a stated 5.0-scale GPA is normalised to 4.0 before comparing",
  evaluateChance({ gpa: 3.2, gpaScale: 5 }, { minGpa: 3.5 }).bucket === "below",
  evaluateChance({ gpa: 3.2, gpaScale: 5 }, { minGpa: 3.5 }).bucket
);
// With NO scale stated, a value that cannot be a 4.0-scale GPA stays unknown —
// the gate is never decided on a guess.
check(
  "a GPA above 4 with no stated scale leaves the gate unknown",
  evaluateChance({ gpa: 4.2, gpaScale: null }, { minGpa: 3.5 }).bucket === "unknown",
  evaluateChance({ gpa: 4.2, gpaScale: null }, { minGpa: 3.5 }).bucket
);
check(
  "a recognised 5.0 scale IS normalised before comparing",
  evaluateChance({ gpa: 4.6, gpaScale: 5 }, { minGpa: 3.5 }).bucket === "meets"
);
check(
  "a degree-level mismatch is 'below'",
  evaluateChance({ degreeLevel: "Bachelor" }, { degreeLevels: '["Master","PhD"]' }).bucket === "below"
);
check(
  "an unrecognised degree label never counts as a mismatch",
  evaluateChance({ degreeLevel: "Something odd" }, { degreeLevels: '["Master"]' }).bucket !== "below"
);
check(
  "one missed gate is enough to be 'below'",
  evaluateChance({ gpa: 3.9, gpaScale: 4, ieltsScore: 5.5 }, { minGpa: 3.5, minIelts: 6.5 }).bucket === "below"
);

/* ---------------------------------------------------------------------- fit */

check("98 → strong", fitBucket(98) === "strong");
check("80 → strong (the band boundary)", fitBucket(80) === "strong");
check("79 → good", fitBucket(79) === "good");
check("60 → good (the isEligible boundary)", fitBucket(60) === "good");
check("59 → low", fitBucket(59) === "low");
check("no score → no bucket", fitBucket(null) === null && fitBucket(undefined) === null);

/* ------------------------------------------------------------------ filters */

const baseRow: ScholarshipFilterRow = {
  country: "Germany",
  coverageType: "Full Tuition",
  degreeLevels: '["Master"]',
  meritBased: true,
  financialNeedBased: false,
  computedStatus: "open",
  chanceBucket: "meets",
  fitBucket: "strong",
};

const withFilter = (patch: Partial<ScholarshipFilters>): ScholarshipFilters => ({
  ...EMPTY_SCHOLARSHIP_FILTERS,
  ...patch,
});

check("no filters keep the row", scholarshipMatchesFilters(baseRow, EMPTY_SCHOLARSHIP_FILTERS));
check(
  "chance keeps the matching bucket",
  scholarshipMatchesFilters(baseRow, withFilter({ chance: ["meets"] }))
);
check(
  "chance drops a different bucket",
  !scholarshipMatchesFilters(baseRow, withFilter({ chance: ["below"] }))
);
check("fit keeps the matching band", scholarshipMatchesFilters(baseRow, withFilter({ fit: ["strong"] })));
check("fit drops a different band", !scholarshipMatchesFilters(baseRow, withFilter({ fit: ["low"] })));
check(
  "chance and fit apply together (both must match)",
  scholarshipMatchesFilters(baseRow, withFilter({ chance: ["meets"], fit: ["strong"] })) &&
    !scholarshipMatchesFilters(baseRow, withFilter({ chance: ["meets"], fit: ["low"] }))
);
// Anonymous rows carry no buckets. Selecting a bucket must not surface them...
check(
  "a row with no bucket is not returned by a chance filter",
  !scholarshipMatchesFilters({ ...baseRow, chanceBucket: null }, withFilter({ chance: ["unknown"] }))
);
// ...but a chance-filtered list must not hide rows from an unrelated dimension.
check(
  "a row with no bucket still passes every other dimension",
  scholarshipMatchesFilters({ ...baseRow, chanceBucket: null, fitBucket: null }, withFilter({ country: "Germany" }))
);
check(
  "the facet helper can skip the dimension it is counting",
  scholarshipMatchesFilters({ ...baseRow, chanceBucket: null }, withFilter({ chance: ["meets"] }), ["chance"])
);
check(
  "active filter count includes chance and fit",
  scholarshipActiveFilterCount(withFilter({ chance: ["meets"], fit: ["good"] })) === 2
);
check(
  "chance and fit default to empty (so every account starts unfiltered)",
  EMPTY_SCHOLARSHIP_FILTERS.chance.length === 0 && EMPTY_SCHOLARSHIP_FILTERS.fit.length === 0
);
check(
  "the facet payload starts with empty personal buckets",
  Object.keys(EMPTY_SCHOLARSHIP_FACETS.chance).length === 0 && Object.keys(EMPTY_SCHOLARSHIP_FACETS.fit).length === 0
);

console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
