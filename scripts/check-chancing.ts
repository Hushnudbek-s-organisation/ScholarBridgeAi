/**
 * Deterministic checks for the chancing engine (src/lib/chancing.ts).
 *
 * The engine must stay pure — no DB, no network — so this runs anywhere and
 * pins the behaviour the product promises:
 *   1. Fit score and admission estimate stay SEPARATE numbers.
 *   2. Estimates are bounded, monotonic in profile strength, and always ship
 *      sub-scores + a "Why?" list + a disclaimer.
 *   3. ScholarBridge's own consented outcomes move the estimate (accepted up,
 *      rejected down) and flip the reported data basis.
 *   4. Missing data lowers confidence and says so, instead of inventing scores.
 *
 * Run: npm run test:chancing
 */

import {
  analyzeExtracurriculars,
  bandFor,
  baselineProbability,
  estimateAdmissionChance,
  majorSimilarity,
  normalizedGpa,
  parseListColumn,
  profileCompletenessRatio,
  profileStrength,
  rangeFor,
  type ChancingProfile,
  type ChancingUniversity,
} from "../src/lib/chancing";

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

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const strongProfile: ChancingProfile = {
  gpa: 3.9,
  gpaScale: 4.0,
  ieltsScore: 7.5,
  satScore: 1520,
  country: "Uzbekistan",
  targetMajor: "Computer Science",
  degreeLevel: "Bachelor",
  leadership: '["Student Council Vice President", "Robotics Club President"]',
  volunteering: '["Red Crescent volunteer, 3 years"]',
  clubs: '["Debate club", "Chess club"]',
  researchExperience: '["NLP research assistant, 1 year"]',
  olympiads: '["National Math Olympiad — 2nd place"]',
  awards: '["Presidential scholarship"]',
  budgetAnnualUsd: 45000,
  careerGoal: "ML engineer in healthcare",
  graduationYear: 2027,
};

const weakProfile: ChancingProfile = {
  gpa: 2.6,
  gpaScale: 4.0,
  country: "Uzbekistan",
};

const ivy: ChancingUniversity = {
  id: 1,
  name: "Ivy Selective University",
  country: "USA",
  worldRanking: 5,
  minGpa: 3.8,
  minIelts: 7.5,
  minSat: 1500,
  acceptanceRate: 5,
  programMajor: "Computer Science",
  annualTuitionUsd: 60000,
  internationalStudentsPercentage: 15,
};

const stateUni: ChancingUniversity = {
  id: 2,
  name: "Open State University",
  country: "USA",
  worldRanking: 400,
  minGpa: 2.8,
  minIelts: 6.0,
  acceptanceRate: 82,
  programMajor: "Computer Science",
  annualTuitionUsd: 20000,
  internationalStudentsPercentage: 12,
};

/** Mid-selective — the estimate lands mid-range, so outcomes can move it both ways. */
const midUni: ChancingUniversity = {
  id: 4,
  name: "Mid Selective University",
  country: "USA",
  worldRanking: 120,
  minGpa: 3.4,
  minIelts: 6.5,
  acceptanceRate: 22,
  programMajor: "Computer Science",
  annualTuitionUsd: 38000,
  internationalStudentsPercentage: 18,
};

const noRateUni: ChancingUniversity = {
  id: 3,
  name: "Unranked Regional Institute",
  country: "Poland",
  worldRanking: null,
  acceptanceRate: null,
  programMajor: "Business Administration",
};

// ---------------------------------------------------------------------------
section("1. Helpers");

check("parseListColumn reads a JSON array", parseListColumn('["a","b"]').length === 2);
check("parseListColumn reads comma-separated legacy text", parseListColumn("a, b").length === 2);
check("parseListColumn tolerates null", parseListColumn(null).length === 0);
check("normalizedGpa keeps a 4.0-scale GPA", normalizedGpa({ gpa: 3.9, gpaScale: 4.0 }) === 3.9);
check(
  "normalizedGpa converts a 5.0-scale GPA down",
  Math.abs((normalizedGpa({ gpa: 4.75, gpaScale: 5.0 }) ?? 0) - 3.8) < 0.01,
  `got ${normalizedGpa({ gpa: 4.75, gpaScale: 5.0 })}`
);
check("normalizedGpa returns null when no GPA", normalizedGpa({}) === null);
check("majorSimilarity is 1 for identical majors", majorSimilarity("Computer Science", "Computer Science") === 1);
check(
  "majorSimilarity is lower for unrelated majors",
  majorSimilarity("Computer Science", "Nursing") < majorSimilarity("Computer Science", "Computer Engineering")
);

section("2. Bands and ranges");

check("bandFor: 70% is safety", bandFor(70).band === "safety");
check("bandFor: 40% is target", bandFor(40).band === "target");
check("bandFor: 20% is reach", bandFor(20).band === "reach");
check("bandFor: 5% is long-reach", bandFor(5).band === "long-reach");

const wide = rangeFor(30, 30);
const narrow = rangeFor(30, 90);
check("rangeFor brackets the point estimate", wide.low <= 30 && wide.high >= 30);
check(
  "rangeFor narrows as confidence rises",
  narrow.high - narrow.low < wide.high - wide.low,
  `narrow=${narrow.high - narrow.low} wide=${wide.high - wide.low}`
);
check("rangeFor stays inside 1–99", wide.low >= 1 && wide.high <= 99);

section("3. Baseline probability");

check("published acceptance rate wins", baselineProbability(ivy).source === "acceptance-rate");
check("published rate maps to 0.05", baselineProbability(ivy).p === 0.05);
check("missing rate falls back to the ranking tier", baselineProbability(noRateUni).source === "ranking-tier");
check(
  "a top-25 school is a harder baseline than a 400-ranked one",
  baselineProbability(ivy).p < baselineProbability(stateUni).p
);

section("4. Fit and admission stay separate");

const ivyStrong = estimateAdmissionChance(strongProfile, ivy, { fitScore: 78 });
check("fit score is passed through untouched", ivyStrong.fitScore === 78);
check(
  "fit score is NOT reused as the admission estimate",
  ivyStrong.admission.mid !== ivyStrong.fitScore,
  `fit=${ivyStrong.fitScore} admission=${ivyStrong.admission.mid}`
);
check("estimate without a fit score still computes", estimateAdmissionChance(strongProfile, ivy).fitScore === null);

section("5. Estimates behave sensibly");

check("admission estimate is a percentage", ivyStrong.admission.mid >= 1 && ivyStrong.admission.mid <= 95);
check(
  "the range brackets the mid estimate",
  ivyStrong.admission.low <= ivyStrong.admission.mid && ivyStrong.admission.mid <= ivyStrong.admission.high
);
check(
  "a stronger profile beats a weaker one at the same university",
  estimateAdmissionChance(strongProfile, stateUni).admission.mid >
    estimateAdmissionChance(weakProfile, stateUni).admission.mid
);
check(
  "the same strong profile scores lower at the Ivy than at the open state uni",
  estimateAdmissionChance(strongProfile, ivy).admission.mid <
    estimateAdmissionChance(strongProfile, stateUni).admission.mid
);
check("weak profile at an Ivy is a long reach", estimateAdmissionChance(weakProfile, ivy).admission.band === "long-reach");

const subScores = Object.values(ivyStrong.subScores);
check("all six sub-scores are returned", subScores.length === 6);
check("sub-scores stay in 0–100", subScores.every((v) => v >= 0 && v <= 100));
check("a 'Why?' list is produced", ivyStrong.positives.length + ivyStrong.negatives.length > 0);
check("confidence is reported", ivyStrong.confidence >= 0 && ivyStrong.confidence <= 100);
check("a disclaimer always ships", ivyStrong.disclaimer.length > 10);

section("6. Missing data is honest, not invented");

const sparse = estimateAdmissionChance({}, noRateUni);
check("empty profile → low confidence", sparse.confidence < 40, `confidence=${sparse.confidence}`);
check(
  "empty profile warns that the baseline is a ranking-tier guess",
  sparse.negatives.some((n) => /acceptance rate/i.test(n))
);
check("empty profile asks for the missing GPA", sparse.negatives.some((n) => /gpa/i.test(n)));
check(
  "a complete profile is more confident than an empty one",
  estimateAdmissionChance(strongProfile, stateUni).confidence > sparse.confidence
);

section("7. ScholarBridge's own outcomes move the number");

const withAccepts = estimateAdmissionChance(strongProfile, midUni, {
  outcomes: { accepted: 18, rejected: 2, waitlisted: 0, deferred: 0 },
});
const withRejects = estimateAdmissionChance(strongProfile, midUni, {
  outcomes: { accepted: 1, rejected: 19, waitlisted: 0, deferred: 0 },
});
const noOutcomes = estimateAdmissionChance(strongProfile, midUni);

check("mostly-accepted outcomes push the estimate up", withAccepts.admission.mid > noOutcomes.admission.mid);
check("mostly-rejected outcomes push the estimate down", withRejects.admission.mid < noOutcomes.admission.mid);
check("rejections are used, not discarded", withRejects.admission.mid < withAccepts.admission.mid);
check("sample size is reported", withAccepts.sampleSize === 20);
check("data basis flips away from public-only", withAccepts.dataBasis !== "public-estimate");
check(
  "more outcomes raise confidence",
  withAccepts.confidence > noOutcomes.confidence,
  `${withAccepts.confidence} vs ${noOutcomes.confidence}`
);

const tinySample = estimateAdmissionChance(strongProfile, midUni, {
  outcomes: { accepted: 2, rejected: 1, waitlisted: 0, deferred: 0 },
});
check(
  "fewer than 5 outcomes are ignored (no wild swings)",
  tinySample.dataBasis === "public-estimate" && tinySample.sampleSize === 0
);

section("8. Profile completeness and strength");

check("empty profile completeness is 0", profileCompletenessRatio({}) === 0);
check("complete profile completeness is 1", profileCompletenessRatio(strongProfile) === 1);
check(
  "completeness is monotonic",
  profileCompletenessRatio(strongProfile) > profileCompletenessRatio({ gpa: 3.9, gpaScale: 4 })
);

const strength = profileStrength(strongProfile, { essayScore: 84 });
check("strength reports 7 sections", strength.sections.length === 7);
check("strength scores stay in 0–100", strength.sections.every((s) => s.score >= 0 && s.score <= 100));
check("the essay score is reflected", strength.sections.find((s) => s.key === "essays")?.score === 84);
check(
  "a stronger profile has a higher overall score",
  profileStrength(strongProfile).overall > profileStrength(weakProfile).overall
);

const analysis = analyzeExtracurriculars(weakProfile);
check("extracurricular analysis returns suggestions for a thin profile", analysis.suggestions.length >= 3);
check(
  "a strong profile gets no remedial suggestions",
  analyzeExtracurriculars(strongProfile).suggestions.length <= 1
);

// ---------------------------------------------------------------------------
console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
