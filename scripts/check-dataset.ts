/**
 * Deterministic checks for dataset readiness (strategy section).
 *
 * The plan is to grow the dataset from 1k to 100k records before any ML model
 * is trained. These tests make that enforceable: volume alone must NOT unlock
 * a model, and a dataset that fails any quality gate must stay rules-based.
 *
 * Run: npm run test:dataset
 */

import {
  assessDataset,
  universityHasEmpiricalData,
  MIN_RECORDS_FOR_ML,
  MIN_RECORDS_FOR_BLENDING,
  MIN_RECORDS_PER_UNIVERSITY,
  type DatasetCounts,
} from "../src/lib/dataset";

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

/** A dataset that satisfies every gate. */
const healthy: DatasetCounts = {
  totalOutcomes: 120_000,
  consentedOutcomes: 110_000,
  withoutConsent: 10_000,
  accepted: 40_000,
  rejected: 55_000,
  waitlisted: 10_000,
  deferred: 5_000,
  withdrawn: 3_000,
  distinctUniversities: 450,
  distinctMajors: 90,
  distinctCountries: 40,
  distinctStudents: 22_000,
  freshShare: 0.8,
};

// ---------------------------------------------------------------------------
section("1. An empty dataset is honest about itself");

/** Zeroed COUNTS. Distinct from `empty` below, which is the readiness result. */
const zero: DatasetCounts = {
  totalOutcomes: 0,
  consentedOutcomes: 0,
  withoutConsent: 0,
  accepted: 0,
  rejected: 0,
  waitlisted: 0,
  deferred: 0,
  withdrawn: 0,
  distinctUniversities: 0,
  distinctMajors: 0,
  distinctCountries: 0,
  distinctStudents: 0,
  freshShare: 0,
};

const empty = assessDataset(zero);
check("stage is collecting", empty.stage === "collecting", empty.stage);
check("no blending allowed", empty.allowed.empiricalBlending === false);
check("no ML allowed", empty.allowed.mlModel === false);
check("progress is zero", empty.progressPct === 0);
check("every gate is unmet", empty.blockers.length === empty.gates.length);
check("it says numbers are published-data estimates", /published university data/i.test(empty.explanation));
check("forbids 'predicted probability'", empty.forbiddenClaims.includes("predicted probability"));
check("forbids 'machine learning estimate'", empty.forbiddenClaims.includes("machine learning estimate"));
check("forbids guarantee language", empty.forbiddenClaims.some((c) => /guarantee/i.test(c)));

section("2. Volume alone does NOT unlock a model");

// 200k records — well past the 100k target — but every quality gate fails.
const bigButBad = assessDataset({
  ...healthy,
  consentedOutcomes: 250_000,
  totalOutcomes: 260_000,
  accepted: 245_000, // 98% acceptances
  rejected: 3_000,
  waitlisted: 1_000,
  deferred: 1_000,
  distinctUniversities: 6, // a handful of schools
  distinctMajors: 4,
  distinctStudents: 300, // the same people over and over
  freshShare: 0.1, // nearly all a decade old
});
check("records are past the volume target", bigButBad.records >= MIN_RECORDS_FOR_ML);
check("but ML is still NOT allowed", bigButBad.allowed.mlModel === false);
check("class balance is flagged", bigButBad.blockers.some((b) => b.key === "balance"));
check("breadth is flagged", bigButBad.blockers.some((b) => b.key === "breadth"));
check("field coverage is flagged", bigButBad.blockers.some((b) => b.key === "majors"));
check("student independence is flagged", bigButBad.blockers.some((b) => b.key === "students"));
check("freshness is flagged", bigButBad.blockers.some((b) => b.key === "freshness"));
check("only the volume gate passed", bigButBad.gates.filter((g) => g.met).length === 1);
check("progress stays far below 100 despite the volume", bigButBad.progressPct < 50, `${bigButBad.progressPct}%`);
check("the explanation names the quality gap", /quality|overconfident/i.test(bigButBad.explanation));

section("3. Each gate is enforced independently");

const drop = (over: Partial<DatasetCounts>) => assessDataset({ ...healthy, ...over });

check("losing volume blocks ML", drop({ consentedOutcomes: 50_000 }).allowed.mlModel === false);
check("losing balance blocks ML", drop({ accepted: 105_000, rejected: 1_000 }).allowed.mlModel === false);
check("losing breadth blocks ML", drop({ distinctUniversities: 12 }).allowed.mlModel === false);
check("losing majors blocks ML", drop({ distinctMajors: 6 }).allowed.mlModel === false);
check("losing students blocks ML", drop({ distinctStudents: 800 }).allowed.mlModel === false);
check("losing freshness blocks ML", drop({ freshShare: 0.2 }).allowed.mlModel === false);

section("4. A genuinely healthy dataset is ml-ready");

const ready = assessDataset(healthy);
check("stage is ml-ready", ready.stage === "ml-ready", ready.stage);
check("ML is allowed", ready.allowed.mlModel === true);
check("blending is allowed", ready.allowed.empiricalBlending === true);
check("no blockers remain", ready.blockers.length === 0);
check("progress is 100", ready.progressPct === 100, `${ready.progressPct}%`);
check("no claims are forbidden once ready", ready.forbiddenClaims.length === 0);
check("the explanation quotes the real numbers", ready.explanation.includes("110,000"));

section("5. Only consented records count");

const withheld = assessDataset({ ...healthy, totalOutcomes: 500_000, consentedOutcomes: 400 });
check("a large total without consent does not count", withheld.records === 400);
check("so blending is not allowed", withheld.allowed.empiricalBlending === false);
check("and the stage is still collecting", withheld.stage === "collecting");

section("6. Stages progress in order");

const blending = assessDataset({
  ...healthy,
  consentedOutcomes: 5_000,
  distinctUniversities: 300,
  distinctMajors: 50,
  distinctStudents: 4_000,
});
check("past the blending threshold", blending.allowed.empiricalBlending === true);
check("but not ML", blending.allowed.mlModel === false);
check("stage is blending", blending.stage === "blending", blending.stage);
check("stage labels are human-readable", blending.stageLabel.length > 5);

const order: Record<string, number> = { collecting: 0, blending: 1, trainable: 2, "ml-ready": 3 };
check(
  "stages are monotonic in progress",
  order[empty.stage] <= order[blending.stage] && order[blending.stage] <= order[ready.stage]
);

section("7. 'withdrawn' is not a university verdict");

// A student withdrawing says nothing about the university's decision, so it
// must not inflate the label set used for class balance.
const withdrawnHeavy = assessDataset({ ...healthy, withdrawn: 90_000, accepted: 40_000, rejected: 55_000, waitlisted: 10_000, deferred: 5_000 });
check("withdrawals do not count toward decisions", withdrawnHeavy.allowed.mlModel === true);
const withdrawnOnly = assessDataset({ ...zero, withdrawn: 50_000, consentedOutcomes: 50_000, totalOutcomes: 50_000 });
check("a dataset of only withdrawals has no labels", withdrawnOnly.blockers.some((b) => b.key === "balance"));

section("8. Per-university threshold matches the engine");

check("5 outcomes is enough", universityHasEmpiricalData({ accepted: 2, rejected: 2, waitlisted: 1, deferred: 0 }) === true);
check("4 outcomes is not", universityHasEmpiricalData({ accepted: 2, rejected: 2, waitlisted: 0, deferred: 0 }) === false);
check("the constant is 5", MIN_RECORDS_PER_UNIVERSITY === 5);
check("negative counts cannot fake a sample", universityHasEmpiricalData({ accepted: 10, rejected: -10, waitlisted: 0, deferred: 0 }) === true);
check("the thresholds are the documented ones", MIN_RECORDS_FOR_ML === 100_000 && MIN_RECORDS_FOR_BLENDING === 1_000);

section("9. Determinism and robustness");

check("the same input gives the same verdict", JSON.stringify(assessDataset(healthy)) === JSON.stringify(assessDataset(healthy)));
check(
  "a garbage input does not crash or fake readiness",
  assessDataset(undefined as unknown as DatasetCounts).allowed.mlModel === false
);
check("progress never exceeds 100", assessDataset({ ...healthy, consentedOutcomes: 10_000_000 }).progressPct <= 100);

// ---------------------------------------------------------------------------
console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
