/**
 * Canonical programme assessment — regression + spec-conformance checks.
 *
 * Covers the mandatory cases from the brief (§11), including the three worked
 * fit examples. Everything here is deterministic: no DB, no network, no clock
 * beyond the pinned `asOfDate`.
 *
 * Run: npm run test:assessment
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assessProgramme,
  displayFit,
  groupAndSortAssessments,
  interpretStudyMode,
  sortAssessments,
  type AssessmentInput,
} from "../src/lib/assessment";
import {
  computePreferenceFit,
  resolvePreferenceSet,
  knownAxis,
  unknownAxis,
  type PreferenceSet,
} from "../src/lib/assessment/preferences";
import { evaluateSubjectRelation, evaluateSubjectRelationDetail } from "../src/lib/assessment/subjectRelation";
import {
  evaluateEligibility,
  simulateGapToClose,
  type RequirementNode,
} from "../src/lib/assessment/eligibility";
import { assessFinance } from "../src/lib/assessment/finance";
import { compareAcademicMetric } from "../src/lib/assessment/academicComparison";
import {
  normalizeAssessmentPreferencesForWrite,
  parseAssessmentPreferences,
  storedPreferencesToSource,
} from "../src/lib/assessmentStored";
import { PREFERENCE_WEIGHTS, SCORING_VERSION } from "../src/lib/assessment/version";

const ROOT = join(import.meta.dirname, "..");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

let passed = 0;
const failures: string[] = [];
function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failures.push(`${name} — ${(error as Error).message}`);
    console.log(`  ✗ ${name} — ${(error as Error).message}`);
  }
}

const close = (a: number | null, b: number, tolerance = 1e-6) =>
  a != null && Math.abs(a - b) <= tolerance;

// ---------------------------------------------------------------------------
console.log("\n1–3. Preference fit arithmetic (the three worked examples)");
// ---------------------------------------------------------------------------

const allKnown: PreferenceSet = {
  subject: { mode: "prefer", value: ["Computer Science"] },
  country: { mode: "prefer", value: ["Germany"] },
  teaching_language: { mode: "prefer", value: ["English"] },
  study_load: { mode: "prefer", value: ["full-time"] },
  delivery_mode: { mode: "prefer", value: ["campus"] },
};

check("Example 1 — subject 0.65 everywhere else 1: fit 79, coverage 100, interval 79–79", () => {
  const fit = computePreferenceFit(allKnown, {
    subject: knownAxis(0.65),
    country: knownAxis(1),
    teaching_language: knownAxis(1),
    study_load: knownAxis(1),
    delivery_mode: knownAxis(1),
  });
  // W = 60×0.65 + 15 + 15 + 5 + 5 = 79, T = K = 100
  assert.ok(close(fit.weightedSimilarity, 79), `W=${fit.weightedSimilarity}`);
  assert.ok(close(fit.totalWeight, 100), `T=${fit.totalWeight}`);
  assert.ok(close(fit.knownFit, 79), `knownFit=${fit.knownFit}`);
  assert.ok(close(fit.coverage, 100), `coverage=${fit.coverage}`);
  assert.ok(close(fit.lowerBound, 79), `lower=${fit.lowerBound}`);
  assert.ok(close(fit.upperBound, 79), `upper=${fit.upperBound}`);
  assert.equal(fit.pointFit, 79);
  assert.equal(fit.missingAxes.length, 0);
  const display = displayFit(fit);
  assert.equal(display.kind, "point");
  assert.equal(display.text, "79/100");
});

check("Example 2 — language unknown: knownFit 100, coverage 85, interval 85–100, no lone 100", () => {
  const fit = computePreferenceFit(allKnown, {
    subject: knownAxis(1),
    country: knownAxis(1),
    teaching_language: unknownAxis("unknown_programme_teaching_language"),
    study_load: knownAxis(1),
    delivery_mode: knownAxis(1),
  });
  // W = 60 + 15 + 5 + 5 = 85, K = 85, T = 100, U = 15
  assert.ok(close(fit.knownFit, 100), `knownFit=${fit.knownFit}`);
  assert.ok(close(fit.coverage, 85), `coverage=${fit.coverage}`);
  assert.ok(close(fit.lowerBound, 85), `lower=${fit.lowerBound}`);
  assert.ok(close(fit.upperBound, 100), `upper=${fit.upperBound}`);
  // The headline number must be the interval, NOT the point `knownFit`.
  assert.equal(fit.pointFit, null);
  const display = displayFit(fit);
  assert.equal(display.kind, "interval");
  assert.equal(display.point, null);
  assert.equal(display.text, "85–100/100");
  assert.deepEqual(fit.missingAxes, ["teaching_language"]);
});

check("Example 3 — subject 0.65, country+language match, load/delivery no_preference: 76.6667", () => {
  const preferences: PreferenceSet = {
    subject: { mode: "prefer", value: ["Computer Science"] },
    country: { mode: "prefer", value: ["Germany"] },
    teaching_language: { mode: "prefer", value: ["English"] },
    study_load: { mode: "no_preference", value: null },
    delivery_mode: { mode: "no_preference", value: null },
  };
  const fit = computePreferenceFit(preferences, {
    subject: knownAxis(0.65),
    country: knownAxis(1),
    teaching_language: knownAxis(1),
    study_load: { state: "not_applicable" },
    delivery_mode: { state: "not_applicable" },
  });
  // W = 60×0.65 + 15 + 15 = 69, T = K = 90
  assert.ok(close(fit.weightedSimilarity, 69), `W=${fit.weightedSimilarity}`);
  assert.ok(close(fit.totalWeight, 90), `T=${fit.totalWeight}`);
  assert.ok(close(fit.knownWeight, 90), `K=${fit.knownWeight}`);
  assert.ok(close(fit.pointFit, 76.6666666667, 1e-6), `fit=${fit.pointFit}`);
  // Rounding happens only at the display edge.
  assert.equal(displayFit(fit).text, "77/100");
});

check("weights are the versioned product settings 60/15/15/5/5", () => {
  assert.equal(PREFERENCE_WEIGHTS.subject, 60);
  assert.equal(PREFERENCE_WEIGHTS.country, 15);
  assert.equal(PREFERENCE_WEIGHTS.teaching_language, 15);
  assert.equal(PREFERENCE_WEIGHTS.study_load, 5);
  assert.equal(PREFERENCE_WEIGHTS.delivery_mode, 5);
});

// ---------------------------------------------------------------------------
console.log("\n4. `must` mismatch and `must` unknown are separate outcomes");
// ---------------------------------------------------------------------------

check("must match → pass, must mismatch → fail, must without data → unknown", () => {
  const preferences: PreferenceSet = {
    country: { mode: "must", value: ["Germany"] },
    teaching_language: { mode: "must", value: ["English"] },
    subject: { mode: "prefer", value: ["Computer Science"] },
  };
  const pass = computePreferenceFit(preferences, {
    country: knownAxis(1),
    teaching_language: knownAxis(0),
    subject: knownAxis(1),
  });
  const byAxis = Object.fromEntries(pass.filters.map((filter) => [filter.axis, filter.state]));
  assert.equal(byAxis.country, "pass");
  assert.equal(byAxis.teaching_language, "fail");

  const unknown = computePreferenceFit(preferences, {
    country: unknownAxis("unknown_programme_country"),
    teaching_language: knownAxis(1),
    subject: knownAxis(1),
  });
  assert.equal(unknown.filters.find((f) => f.axis === "country")?.state, "unknown");
  // A must is a FILTER: it contributes no weight, so it cannot be counted twice.
  assert.ok(pass.breakdown.every((item) => item.mode !== "must" || item.weight === 0));
  assert.ok(close(pass.totalWeight, 60), `T=${pass.totalWeight}`);
});

check("a preference-filter failure is marked as such, not as an eligibility failure", () => {
  const fit = computePreferenceFit(
    { country: { mode: "must", value: ["Germany"] } },
    { country: knownAxis(0) }
  );
  assert.equal(fit.filters[0].isPreferenceFilter, true);
  assert.equal(fit.filters[0].state, "fail");
});

// ---------------------------------------------------------------------------
console.log("\n5. Academic / budget changes never move the preference fit");
// ---------------------------------------------------------------------------

const baseInput = (overrides: Partial<AssessmentInput> = {}): AssessmentInput => ({
  programme: {
    id: 1,
    universityId: 10,
    name: "MSc Computer Science",
    field: "Computer Science",
    degreeLevel: "Master",
    language: "English",
    studyMode: "Full-time",
    country: "Germany",
    universityName: "Fixture University",
    officialProgramUrl: "https://fixture.example.edu/msc-cs",
    sourceUrl: "https://fixture.example.edu/msc-cs",
  },
  context: { cycle: "2027", applicantCategory: "international", degreeLevel: "Master" },
  applicant: {
    interests: ["Computer Science"],
    preferences: {
      subject: { mode: "prefer", value: ["Computer Science"] },
      country: { mode: "prefer", value: ["Germany"] },
      teaching_language: { mode: "prefer", value: ["English"] },
    },
    eligibilityProfile: {
      gpa: { value: 3.6, unit: "4" },
      ielts: { value: 7, unit: "9" },
      sat: { value: 1400, unit: "1600" },
    },
    finance: {
      costs: [{ key: "tuition", kind: "tuition", label: "Tuition", annualUsd: 20000 }],
      availableBudgetUsd: 25000,
    },
  },
  assessedAt: "2026-11-11T09:00:00.000Z",
  ...overrides,
});

check("GPA / IELTS / SAT / budget changes leave preferenceFit identical", () => {
  const base = assessProgramme(baseInput());
  const changed = assessProgramme(
    baseInput({
      applicant: {
        ...baseInput().applicant,
        eligibilityProfile: {
          gpa: { value: 2.4, unit: "4" },
          ielts: { value: 5, unit: "9" },
          sat: { value: 900, unit: "1600" },
        },
        finance: {
          costs: [{ key: "tuition", kind: "tuition", label: "Tuition", annualUsd: 80000 }],
          availableBudgetUsd: 1000,
        },
      },
    })
  );
  assert.deepEqual(
    { fit: base.preferenceFit.pointFit, coverage: base.preferenceFit.coverage },
    { fit: changed.preferenceFit.pointFit, coverage: changed.preferenceFit.coverage }
  );
  assert.equal(base.preferenceFit.knownFit, changed.preferenceFit.knownFit);
  // …while the independent dimensions DO change.
  assert.notEqual(base.finance.status, changed.finance.status);
});

// ---------------------------------------------------------------------------
console.log("\n6. Subject edge cases: unknown, no_preference, T=0, K=0");
// ---------------------------------------------------------------------------

check("active unknown subject suppresses the point fit and says why", () => {
  const fit = computePreferenceFit(
    {
      subject: { mode: "prefer", value: ["Computer Science"] },
      country: { mode: "prefer", value: ["Germany"] },
    },
    { subject: unknownAxis("subject_relation_unknown"), country: knownAxis(1) }
  );
  assert.equal(fit.pointFit, null);
  assert.equal(fit.reason, "subject_unknown_no_point_fit");
  assert.ok(fit.lowerBound != null && fit.upperBound != null);
  assert.ok(fit.lowerBound! <= fit.upperBound!);
});

check("subject no_preference does not block the other factors", () => {
  const fit = computePreferenceFit(
    {
      subject: { mode: "no_preference", value: null },
      country: { mode: "prefer", value: ["Germany"] },
    },
    { subject: { state: "not_applicable" }, country: knownAxis(1) }
  );
  assert.equal(fit.pointFit, 100);
  assert.equal(fit.totalWeight, 15);
  assert.equal(fit.reason, "complete");
});

check("T = 0 → fit null with reason no_active_preferences", () => {
  const fit = computePreferenceFit({ subject: { mode: "no_preference", value: null } }, {});
  assert.equal(fit.pointFit, null);
  assert.equal(fit.knownFit, null);
  assert.equal(fit.lowerBound, null);
  assert.equal(fit.upperBound, null);
  assert.equal(fit.coverage, null);
  assert.equal(fit.reason, "no_active_preferences");
});

check("K = 0 → knownFit null, but the interval boundaries stay defined", () => {
  const fit = computePreferenceFit(
    { subject: { mode: "prefer", value: ["Computer Science"] } },
    { subject: unknownAxis("subject_relation_needs_review") }
  );
  assert.equal(fit.knownFit, null);
  assert.ok(close(fit.coverage, 0), `coverage=${fit.coverage}`);
  assert.ok(close(fit.lowerBound, 0), `lower=${fit.lowerBound}`);
  assert.ok(close(fit.upperBound, 100), `upper=${fit.upperBound}`);
  assert.equal(fit.reason, "no_known_preference_data");
});

check("no NaN / Infinity / division-by-zero in any configuration", () => {
  for (const weightCase of [0, 1]) {
    const fit = computePreferenceFit(
      weightCase ? { subject: { mode: "prefer", value: ["Physics"] } } : {},
      weightCase ? { subject: knownAxis(0.4) } : {}
    );
    for (const value of [fit.knownFit, fit.coverage, fit.lowerBound, fit.upperBound, fit.pointFit]) {
      assert.ok(value == null || Number.isFinite(value), `non-finite value ${value}`);
    }
  }
});

// ---------------------------------------------------------------------------
console.log("\n7–10. Eligibility groups, sub-scores, waivers, empty lists");
// ---------------------------------------------------------------------------

const OFFICIAL = {
  sourceUrl: "https://fixture.example.edu/requirements",
  verificationStatus: "verified",
  valueType: "official_requirement",
};

const languageGroup: RequirementNode = {
  id: "language",
  label: "English language",
  kind: "group",
  operator: "anyOf",
  children: [
    { id: "ielts", label: "IELTS", kind: "minimum", metric: "ielts", value: 6.5, unit: "9", source: OFFICIAL },
    { id: "toefl", label: "TOEFL", kind: "minimum", metric: "toefl", value: 90, unit: "120", source: OFFICIAL },
  ],
};

check("7. IELTS unmet + TOEFL met → the language group is met", () => {
  const result = evaluateEligibility([languageGroup], {
    ielts: { value: 6, unit: "9" },
    toefl: { value: 100, unit: "120" },
    asOfDate: "2026-11-11",
  });
  assert.equal(result.status, "met");
  assert.equal(result.checks[0].status, "met");
  assert.equal(result.checks[0].reason, "any_of_met");
});

check("8. IELTS overall met but a mandatory sub-score unmet → the route is unmet", () => {
  const result = evaluateEligibility(
    [
      {
        id: "ielts",
        label: "IELTS",
        kind: "minimum",
        metric: "ielts",
        value: 6.5,
        unit: "9",
        subMinimums: [{ section: "writing", value: 6.5 }],
        source: OFFICIAL,
      },
    ],
    { ielts: { value: 7, unit: "9", sections: { writing: 6 } }, asOfDate: "2026-11-11" }
  );
  assert.equal(result.status, "unmet");
  assert.equal(result.checks[0].status, "unmet");
  assert.equal(result.checks[0].children[0].status, "unmet");
});

check("9. an unverified waiver route never becomes met", () => {
  const requirements: RequirementNode[] = [
    {
      id: "language",
      label: "English language",
      kind: "group",
      operator: "anyOf",
      children: [
        { id: "ielts", label: "IELTS", kind: "minimum", metric: "ielts", value: 7, unit: "9", source: OFFICIAL },
        { id: "waiver", label: "Waiver", kind: "record", metric: "english_waiver", satisfied: true, confirmedForApplicant: false },
      ],
    },
  ];
  const result = evaluateEligibility(requirements, { ielts: { value: 6, unit: "9" }, asOfDate: "2026-11-11" });
  assert.equal(result.status, "unknown");
  assert.ok(result.unknownReasons.includes("unverified_waiver"));
  // With a CONFIRMED waiver the same group is met — the difference is proof.
  const confirmed = evaluateEligibility(requirements, {
    ielts: { value: 6, unit: "9" },
    asOfDate: "2026-11-11",
    confirmedWaivers: [{ id: "w1", scope: "english_waiver" }],
  });
  assert.equal(confirmed.status, "met");
});

check("10. an empty requirement list is NOT met", () => {
  const result = evaluateEligibility([], { ielts: { value: 8, unit: "9" }, asOfDate: "2026-11-11" });
  assert.equal(result.status, "unknown");
  assert.equal(result.requirementsDocumented, false);
  assert.ok(result.limitations.some((line) => /cannot be decided/.test(line)));
});

check("a requirement without a documented value stays unknown, never met", () => {
  const result = evaluateEligibility(
    [{ id: "gpa", label: "GPA", kind: "minimum", metric: "gpa", value: null, unit: "4", source: OFFICIAL }],
    { gpa: { value: 3.9, unit: "4" }, asOfDate: "2026-11-11" }
  );
  assert.equal(result.status, "unknown");
  assert.ok(result.unknownReasons.includes("missing_requirement"));
});

check("an unverified minimum cannot decide eligibility", () => {
  const result = evaluateEligibility(
    [
      {
        id: "gpa",
        label: "GPA",
        kind: "minimum",
        metric: "gpa",
        value: 3.9,
        unit: "4",
        source: { sourceUrl: "https://fixture.example.edu/requirements", verificationStatus: "unverified", valueType: "official_requirement" },
      },
    ],
    { gpa: { value: 3.2, unit: "4" }, asOfDate: "2026-11-11" }
  );
  assert.equal(result.status, "unknown");
});

check("an incomparable GPA scale is unknown, never converted proportionally", () => {
  const result = evaluateEligibility(
    [{ id: "gpa", label: "GPA", kind: "minimum", metric: "gpa", value: 3.5, unit: "4", source: OFFICIAL }],
    { gpa: { value: 85, unit: "100" }, asOfDate: "2026-11-11" }
  );
  assert.equal(result.status, "unknown");
  assert.ok(result.unknownReasons.includes("incomparable_scale"));
});

check("a requirement from another cycle is unknown with stale_or_wrong_cycle", () => {
  const result = evaluateEligibility(
    [{ id: "gpa", label: "GPA", kind: "minimum", metric: "gpa", value: 3.0, unit: "4", source: OFFICIAL, admissionCycle: "2026" }],
    { gpa: { value: 3.9, unit: "4" }, asOfDate: "2026-11-11", cycle: "2027" }
  );
  assert.equal(result.status, "unknown");
  assert.ok(result.unknownReasons.includes("stale_or_wrong_cycle"));
});

check("gap-to-close re-evaluates every other requirement (+0.5 IELTS fixes nothing else)", () => {
  const requirements: RequirementNode[] = [
    { id: "ielts", label: "IELTS", kind: "minimum", metric: "ielts", value: 7, unit: "9", subMinimums: [{ section: "writing", value: 7 }], source: OFFICIAL },
    { id: "gpa", label: "GPA", kind: "minimum", metric: "gpa", value: 3.5, unit: "4", source: OFFICIAL },
  ];
  const simulation = simulateGapToClose(
    requirements,
    { ielts: { value: 6.5, unit: "9", sections: { writing: 6.5 } }, gpa: { value: 3.2, unit: "4" }, asOfDate: "2026-11-11" },
    { ielts: 7 }
  );
  // Overall band now clears, but writing (6.5) and GPA (3.2) still fail.
  assert.equal(simulation.before.status, "unmet");
  assert.equal(simulation.after.status, "unmet");
  assert.ok(simulation.stillUnmet.includes("ielts:writing"), JSON.stringify(simulation.stillUnmet));
  assert.ok(simulation.stillUnmet.includes("gpa"), JSON.stringify(simulation.stillUnmet));
});

// ---------------------------------------------------------------------------
console.log("\n11. Finance: competitive grants, restrictions, unknown costs");
// ---------------------------------------------------------------------------

check("a competitive grant is a scenario, NOT a reduction of the bill", () => {
  const finance = assessFinance({
    costs: [
      { key: "tuition", kind: "tuition", label: "Tuition", annualUsd: 20000 },
      { key: "living", kind: "living", label: "Living", annualUsd: 10000 },
    ],
    funding: [
      { key: "merit", label: "Competitive merit award", kind: "competitive_grant", annualUsd: 15000, appliesTo: "any", awarded: false },
    ],
    availableBudgetUsd: 25000,
  });
  assert.equal(finance.annualTotalUsd, 30000);
  assert.equal(finance.confirmedFundingUsd, 0);
  assert.equal(finance.netAnnualCostUsd, 30000);
  assert.equal(finance.fundingGapUsd, 5000);
  assert.ok(finance.excludedFunding.some((line) => line.key === "merit" && line.reason === "not_awarded_competitive_grant_is_a_scenario"));
  assert.ok(finance.scenarios.some((scenario) => scenario.key === "with_conditional_awards" && scenario.conditional));
});

check("met eligibility for a grant is not the same as being awarded it", () => {
  const finance = assessFinance({
    costs: [{ key: "tuition", kind: "tuition", label: "Tuition", annualUsd: 10000 }],
    funding: [
      { key: "auto", label: "Automatic award", kind: "automatic_grant", annualUsd: 5000, appliesTo: "tuition", automaticConditionsVerified: false },
    ],
    availableBudgetUsd: 10000,
  });
  assert.equal(finance.confirmedFundingUsd, 0);
  assert.ok(finance.excludedFunding.some((line) => line.reason === "automatic_award_conditions_not_verified"));
});

check("a tuition-only award never pays living costs", () => {
  const finance = assessFinance({
    costs: [
      { key: "tuition", kind: "tuition", label: "Tuition", annualUsd: 8000 },
      { key: "living", kind: "living", label: "Living", annualUsd: 12000 },
    ],
    funding: [{ key: "waiver", label: "Tuition waiver", kind: "tuition_waiver", annualUsd: 20000, appliesTo: "tuition" }],
    availableBudgetUsd: 50000,
  });
  assert.equal(finance.confirmedFundingUsd, 8000);
  assert.equal(finance.netAnnualCostUsd, 12000);
});

check("non-combinable awards are not summed", () => {
  const finance = assessFinance({
    costs: [{ key: "tuition", kind: "tuition", label: "Tuition", annualUsd: 20000 }],
    funding: [
      { key: "a", label: "Award A", kind: "confirmed_award", annualUsd: 15000, appliesTo: "tuition", exclusiveGroup: "g1" },
      { key: "b", label: "Award B", kind: "confirmed_award", annualUsd: 5000, appliesTo: "tuition", exclusiveGroup: "g1" },
    ],
    availableBudgetUsd: 0,
  });
  assert.equal(finance.confirmedFundingUsd, 15000);
  assert.ok(finance.excludedFunding.some((line) => line.key === "b" && /not_combinable/.test(line.reason)));
});

check("an unknown cost line makes the total unknown and the gap an interval", () => {
  const finance = assessFinance({
    costs: [
      { key: "tuition", kind: "tuition", label: "Tuition", annualUsd: 20000 },
      { key: "living", kind: "living", label: "Living", annualUsd: null },
    ],
    availableBudgetUsd: 15000,
  });
  assert.equal(finance.annualTotalUsd, null);
  assert.equal(finance.fundingGapUsd, null);
  assert.deepEqual(finance.fundingGapRangeUsd, { lower: 5000, upper: null });
  assert.equal(finance.status, "cost_unknown");
});

check("a zero budget and an unstated budget are different states", () => {
  const zero = assessFinance({
    costs: [{ key: "tuition", kind: "tuition", label: "Tuition", annualUsd: 1000 }],
    availableBudgetUsd: 0,
  });
  assert.equal(zero.fundingGapUsd, 1000);
  assert.equal(zero.status, "gap");
  const unstated = assessFinance({
    costs: [{ key: "tuition", kind: "tuition", label: "Tuition", annualUsd: 1000 }],
    availableBudgetUsd: null,
  });
  assert.equal(unstated.fundingGapUsd, null);
  assert.equal(unstated.status, "budget_not_stated");
});

// ---------------------------------------------------------------------------
console.log("\n12. Generic words do not create a subject match");
// ---------------------------------------------------------------------------

check("Data Science vs Political Science: only 'science' in common → not a match", () => {
  const relation = evaluateSubjectRelation(["Data Science"], "Political Science");
  assert.notEqual(relation.relation, "identity");
  assert.notEqual(relation.relation, "related");
  assert.notEqual(relation.relation, "accepted_equivalent");
  // No numeric affinity is claimed: the answer is "no relation recorded" or
  // "not enough evidence", never a high score derived from the word "science".
  assert.ok(relation.similarity == null || relation.similarity === 0, String(relation.similarity));
  const reverse = evaluateSubjectRelation(["Political Science"], "Data Science");
  assert.ok(reverse.similarity == null || reverse.similarity === 0, String(reverse.similarity));
});

check("'Management' alone does not relate Business Management to Construction Management", () => {
  const relation = evaluateSubjectRelationDetail("Business Management", "Construction Management");
  assert.notEqual(relation.relation, "identity");
  assert.ok(relation.similarity == null || relation.similarity < 0.5);
});

check("a real identity still scores 1", () => {
  const relation = evaluateSubjectRelation(["Computer Science"], "Computer Science");
  assert.equal(relation.relation, "identity");
  assert.equal(relation.similarity, 1);
});

check("a curated related pair carries its own version and heuristic flag", () => {
  const relation = evaluateSubjectRelation(["Computer Science"], "Software Engineering", [], [
    { from: "Computer Science", to: "Software Engineering", similarity: 0.65, version: "curated-related-v1" },
  ]);
  assert.equal(relation.relation, "related");
  assert.equal(relation.similarity, 0.65);
  assert.equal(relation.heuristic, true);
  assert.equal(relation.ruleVersion, "curated-related-v1");
  assert.match(relation.note, /heuristic/i);
});

check("an accepted equivalent scores 1", () => {
  const relation = evaluateSubjectRelation(["Computer Science"], "Informatics", ["Informatics"]);
  assert.equal(relation.relation, "accepted_equivalent");
  assert.equal(relation.similarity, 1);
});

// ---------------------------------------------------------------------------
console.log("\n13. Admission probability is null everywhere");
// ---------------------------------------------------------------------------

check("every assessment reports admissionProbability null / no_validated_model", () => {
  const assessment = assessProgramme(baseInput());
  assert.equal(assessment.admissionProbability.value, null);
  assert.equal(assessment.admissionProbability.reason, "no_validated_model");
});

check("the assessment type declares no composite/blended score field", () => {
  const source = read("src/lib/assessment/index.ts");
  assert.doesNotMatch(source, /compositeScore|overallScore|chanceScore|admissionPct/);
  assert.match(source, /admissionProbability/);
  const assessment = assessProgramme(baseInput());
  const keys = Object.keys(assessment);
  for (const forbidden of ["chance", "probability", "odds", "safety", "likely", "reach", "target"]) {
    assert.ok(!keys.includes(forbidden), `unexpected top-level field ${forbidden}`);
  }
});

check("academic comparison reports below / within / above, never a percentile", () => {
  const statistics = [
    {
      metric: "gpa" as const,
      unit: "4",
      p25: 3.5,
      p50: 3.75,
      p75: 3.9,
      year: "Class of 2029",
      scope: { kind: "programme" as const, label: "MSc Computer Science" },
      population: "admitted" as const,
      sourceUrl: "https://fixture.example.edu/statistics",
      verificationStatus: "verified",
      valueType: "observed_statistic",
    },
  ];
  const below = compareAcademicMetric({ metric: "gpa", unit: "4", studentValue: 3.2 }, statistics);
  assert.equal(below.position, "below");
  const within = compareAcademicMetric({ metric: "gpa", unit: "4", studentValue: 3.7 }, statistics);
  assert.equal(within.position, "within");
  const above = compareAcademicMetric({ metric: "gpa", unit: "4", studentValue: 3.95 }, statistics);
  assert.equal(above.position, "above");
  assert.ok(!/percentile of applicants/i.test(below.statement));
  // A university-wide statistic is not presented as a programme statistic.
  const mismatched = compareAcademicMetric(
    { metric: "gpa", unit: "4", studentValue: 3.7, expectedScope: { kind: "university" } },
    statistics
  );
  assert.equal(mismatched.position, "unknown");
  assert.equal(mismatched.reason, "scope_mismatch");
  // No published statistic → unknown, not a zero.
  const missing = compareAcademicMetric({ metric: "sat", unit: "1600", studentValue: 1500 }, statistics);
  assert.equal(missing.position, "unknown");
  assert.equal(missing.reason, "no_published_statistic");
});

// ---------------------------------------------------------------------------
console.log("\n14. Grouping, ordering and the conservative sort policy");
// ---------------------------------------------------------------------------

check("four groups exist and a preference failure is not an eligibility failure", () => {
  const meetings = assessProgramme(baseInput());
  assert.equal(meetings.groupKey, meetings.eligibility.status === "met" ? "meets_requirements" : "needs_check");

  const mismatch = assessProgramme(
    baseInput({
      applicant: {
        ...baseInput().applicant,
        preferences: {
          country: { mode: "must", value: ["Netherlands"] },
          subject: { mode: "prefer", value: ["Computer Science"] },
        },
      },
    })
  );
  assert.equal(mismatch.group, 3);
  assert.ok(mismatch.groupReasons.some((reason) => /Required choice not met/.test(reason)));
  // The eligibility dimension is untouched by the preference filter.
  assert.notEqual(mismatch.eligibility.status, "unmet");

  const unmet = assessProgramme(
    baseInput({
      requirements: [
        { id: "gpa", label: "GPA", kind: "minimum", metric: "gpa", value: 3.9, unit: "4", source: OFFICIAL },
      ],
    })
  );
  assert.equal(unmet.group, 2);
});

check("sort: lowerBound desc → coverage desc → stable id asc, unknown never treated as 0", () => {
  const make = (id: number, lower: number | null, coverage: number | null) =>
    ({
      programme: { id },
      preferenceFit: { lowerBound: lower, coverage },
    }) as unknown as Parameters<typeof sortAssessments>[0][number];
  const sorted = sortAssessments([make(3, 70, 100), make(1, 90, 85), make(2, 70, 100), make(4, null, 0), make(5, 70, 60)]);
  assert.deepEqual(sorted.map((item) => item.programme.id), [1, 2, 3, 5, 4]);
  const grouped = groupAndSortAssessments([assessProgramme(baseInput())]);
  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].items.length, 1);
});

// ---------------------------------------------------------------------------
console.log("\n15–16. Interval invariants and monotonicity");
// ---------------------------------------------------------------------------

check("15. for every valid interval: 0 ≤ lower ≤ upper ≤ 100 and knownFit inside", () => {
  const preferenceShapes: PreferenceSet[] = [
    allKnown,
    { subject: { mode: "prefer", value: ["Physics"] } },
    { subject: { mode: "prefer", value: ["Physics"] }, country: { mode: "prefer", value: ["Germany"] } },
    { subject: { mode: "must", value: ["Physics"] }, country: { mode: "prefer", value: ["Germany"] } },
  ];
  const observations = [
    { subject: knownAxis(0), country: knownAxis(0) },
    { subject: knownAxis(0.65), country: knownAxis(1) },
    { subject: knownAxis(1), country: unknownAxis("x") },
    { subject: unknownAxis("x"), country: knownAxis(0) },
    { subject: { state: "not_applicable" as const }, country: { state: "not_applicable" as const } },
  ];
  for (const preferences of preferenceShapes) {
    for (const observation of observations) {
      const fit = computePreferenceFit(preferences, observation);
      if (fit.lowerBound == null || fit.upperBound == null) continue;
      assert.ok(fit.lowerBound >= 0 && fit.lowerBound <= 100, `lower ${fit.lowerBound}`);
      assert.ok(fit.upperBound >= 0 && fit.upperBound <= 100, `upper ${fit.upperBound}`);
      assert.ok(fit.lowerBound <= fit.upperBound + 1e-9, `${fit.lowerBound} > ${fit.upperBound}`);
      if (fit.knownFit != null) {
        assert.ok(
          fit.knownFit >= fit.lowerBound - 1e-9 && fit.knownFit <= fit.upperBound + 1e-9,
          `knownFit ${fit.knownFit} outside ${fit.lowerBound}–${fit.upperBound}`
        );
      }
    }
  }
});

check("16. a better similarity on one factor never lowers the fit", () => {
  const preferences: PreferenceSet = {
    subject: { mode: "prefer", value: ["Computer Science"] },
    country: { mode: "prefer", value: ["Germany"] },
  };
  let previous = -1;
  for (const similarity of [0, 0.2, 0.4, 0.65, 0.8, 1]) {
    const fit = computePreferenceFit(preferences, { subject: knownAxis(similarity), country: knownAxis(1) });
    assert.ok(fit.pointFit != null);
    assert.ok(fit.pointFit! >= previous, `${similarity}: ${fit.pointFit} < ${previous}`);
    previous = fit.pointFit!;
  }
});

// ---------------------------------------------------------------------------
console.log("\n17. Context, study mode interpretation and legacy preference migration");
// ---------------------------------------------------------------------------

check("study mode is interpreted per token, never copied into both axes", () => {
  assert.deepEqual(interpretStudyMode("Full-time").studyLoad, "full-time");
  assert.equal(interpretStudyMode("Full-time").deliveryMode, null);
  const combined = interpretStudyMode("Full-time online");
  assert.equal(combined.studyLoad, "full-time");
  assert.equal(combined.deliveryMode, "online");
  assert.equal(interpretStudyMode("Hybrid part-time").deliveryMode, "hybrid");
  assert.equal(interpretStudyMode("Hybrid part-time").studyLoad, "part-time");
  assert.equal(interpretStudyMode(null).studyLoad, null);
});

check("full-time and hybrid are not opposite values", () => {
  const fit = computePreferenceFit(
    {
      study_load: { mode: "prefer", value: ["full-time"] },
      delivery_mode: { mode: "prefer", value: ["hybrid"] },
    },
    { study_load: knownAxis(1), delivery_mode: knownAxis(1) }
  );
  assert.equal(fit.pointFit, 100);
});

check("a legacy preference without a stored mode migrates to `prefer`, never `must`", () => {
  const set = resolvePreferenceSet({
    legacyPreferredCountries: ["Germany"],
    legacyTeachingLanguage: ["English"],
  });
  assert.equal(set.country?.mode, "prefer");
  assert.equal(set.teaching_language?.mode, "prefer");
  assert.deepEqual(set.country?.value, ["Germany"]);
  // An explicit `must` is honoured.
  const explicit = resolvePreferenceSet({
    preferences: { country: { mode: "must", value: ["Germany"] } },
    legacyPreferredCountries: ["Canada"],
  });
  assert.equal(explicit.country?.mode, "must");
  assert.deepEqual(explicit.country?.value, ["Germany"]);
});

check("the assessment is scoped to one cycle and applicant category", () => {
  const assessment = assessProgramme(baseInput());
  assert.equal(assessment.context.cycle, "2027");
  assert.equal(assessment.context.applicantCategory, "international");
  const unscoped = assessProgramme(
    baseInput({ context: { cycle: null, applicantCategory: null, degreeLevel: "Master" } })
  );
  assert.ok(unscoped.unknowns.some((item) => item.field === "context.cycle"));
});

check("every assessment carries its version, timestamp and evidence references", () => {
  const assessment = assessProgramme(
    baseInput({
      requirements: [
        { id: "gpa", label: "GPA", kind: "minimum", metric: "gpa", value: 3.0, unit: "4", source: OFFICIAL },
      ],
    })
  );
  assert.equal(assessment.scoringVersion, SCORING_VERSION);
  assert.equal(assessment.assessedAt, "2026-11-11T09:00:00.000Z");
  assert.ok(assessment.evidence.some((item) => item.kind === "requirement"));
  assert.deepEqual(assessment.personalData.recordedMetrics.sort(), ["gpa", "ielts", "sat"]);
});

// ---------------------------------------------------------------------------
console.log("\n18. Stored preference payloads (additive migration)");
// ---------------------------------------------------------------------------

check("a stored payload keeps an explicit `must` and round-trips unchanged", () => {
  const stored = parseAssessmentPreferences({
    version: 1,
    subject: { mode: "prefer", value: ["Computer Science"] },
    country: { mode: "must", value: ["Germany"] },
    study_load: { mode: "prefer", value: ["full-time"] },
    delivery_mode: { mode: "no_preference", value: null },
  });
  assert.ok(stored);
  assert.equal(stored!.country?.mode, "must");
  assert.deepEqual(stored!.country?.value, ["Germany"]);
  assert.equal(stored!.delivery_mode?.mode, "no_preference");
  assert.deepEqual(normalizeAssessmentPreferencesForWrite(stored), normalizeAssessmentPreferencesForWrite(JSON.stringify(stored)));
});

check("a stored value WITHOUT a mode becomes `prefer`, not `must`", () => {
  const stored = parseAssessmentPreferences({ country: { value: ["Canada"] } });
  assert.equal(stored?.country?.mode, "prefer");
});

check("`must` without a value degrades to no_preference instead of rejecting everything", () => {
  const stored = parseAssessmentPreferences({ country: { mode: "must", value: [] } });
  assert.equal(stored?.country?.mode, "no_preference");
  assert.equal(stored?.country?.value, null);
});

check("the two learning-format axes are validated separately", () => {
  const stored = parseAssessmentPreferences({
    study_load: { mode: "prefer", value: ["hybrid"] },
    delivery_mode: { mode: "prefer", value: ["part-time"] },
  });
  // `hybrid` is a DELIVERY value and `part-time` is a LOAD value: each is
  // rejected on the other axis rather than silently accepted.
  assert.equal(stored?.study_load?.mode, "no_preference");
  assert.equal(stored?.delivery_mode?.mode, "no_preference");
});

check("malformed stored payloads never throw and never invent a preference", () => {
  for (const raw of [null, undefined, "", "{not json", 42, [], "null"]) {
    assert.equal(parseAssessmentPreferences(raw), null);
  }
});

check("a stored `must` reaches the assessment as a filter, not as weight", () => {
  const stored = parseAssessmentPreferences({ country: { mode: "must", value: ["Germany"] } });
  const source = storedPreferencesToSource(stored);
  const set = resolvePreferenceSet({ preferences: source });
  assert.equal(set.country?.mode, "must");
  const fit = computePreferenceFit(set, { country: knownAxis(0) });
  assert.equal(fit.filters[0]?.state, "fail");
  assert.equal(fit.totalWeight, 0);
});

// ---------------------------------------------------------------------------
console.log("\n19. Surfaces: no legacy chance percentages or Safety labels");
// ---------------------------------------------------------------------------

/**
 * Keys that must not exist anywhere any more. They were deleted from all three
 * locales together with the engine that produced their numbers, so this list is
 * a "cannot come back" guard rather than a "not rendered right now" guard.
 */
const RETIRED_KEYS: { ns: string; key: string }[] = [
  { ns: "university", key: "chanceBadgeLabel" },
  { ns: "university", key: "chanceAdmitRate" },
  { ns: "journey", key: "ccRecChanceChip" },
  { ns: "journey", key: "ccRecAdmitRate" },
  { ns: "timeline", key: "planChanceBadge" },
  { ns: "timeline", key: "planAdmitBadge" },
  { ns: "chancing", key: "selectSafety" },
  { ns: "chancing", key: "selectTarget" },
  { ns: "chancing", key: "selectReach" },
  { ns: "chancing", key: "selectHighReach" },
  { ns: "chancing", key: "tierAbove75" },
  { ns: "chancing", key: "tier5075" },
  { ns: "chancing", key: "tier2550" },
  { ns: "chancing", key: "tierBelow25" },
  { ns: "scholarshipHub", key: "filterChance" },
  { ns: "scholarshipHub", key: "allChance" },
];

check("the retired chance label keys are deleted from every locale", () => {
  for (const locale of ["en", "uz", "ru"]) {
    const messages = JSON.parse(read(`src/i18n/messages/${locale}.json`)) as Record<string, Record<string, unknown>>;
    for (const { ns, key } of RETIRED_KEYS) {
      assert.equal(key in (messages[ns] ?? {}), false, `${locale}.${ns}.${key} came back`);
    }
  }
});

check("the replacement labels exist in every supported locale", () => {
  const required: Record<string, string[]> = {
    scholarshipHub: [
      "filterRequirementStatus",
      "allRequirementStatus",
      "filterRequirementMet",
      "filterRequirementNotMet",
      "filterRequirementUnknown",
      "requirementStatusNote",
    ],
    nav: ["chances"],
    visa: ["visaChance", "visaPreparationSignal"],
    recommend: [
      "assessmentFit",
      "assessmentRequirements",
      "assessmentCost",
      "assessmentGap",
      "assessmentDetails",
      "assessmentAcademic",
      "assessmentUnknowns",
    ],
    chancing: ["probabilityNotProvided", "mustFiltersLabel"],
  };
  for (const locale of ["en", "uz", "ru"]) {
    const messages = JSON.parse(read(`src/i18n/messages/${locale}.json`)) as Record<string, Record<string, unknown>>;
    for (const [ns, keys] of Object.entries(required)) {
      for (const key of keys) {
        const value = messages[ns]?.[key];
        assert.equal(typeof value, "string", `${locale}.${ns}.${key} is missing`);
        assert.ok(String(value).trim().length > 0, `${locale}.${ns}.${key} is empty`);
      }
    }
  }
  // The renamed navigation entry must stop promising "chances".
  const navEn = JSON.parse(read("src/i18n/messages/en.json")) as Record<string, Record<string, string>>;
  assert.doesNotMatch(navEn.nav.chances, /chance/i);
});

check("no UI component prints a chance score, an admit rate or a Safety/Target/Reach label", () => {
  const files = [
    "src/components/ProgrammeAssessmentScreen.tsx",
    "src/components/ChancingPanel.tsx",
    "src/components/UniversityExplorer.tsx",
    "src/components/UniversityDetail.tsx",
    "src/components/SmartTimelineCalendar.tsx",
    "src/components/journey/JourneyControlCenter.tsx",
    "src/components/DeadlineCenter.tsx",
  ];
  for (const file of files) {
    const source = read(file);
    for (const { key } of RETIRED_KEYS) {
      assert.ok(!new RegExp(`t\\(\\s*"${key}"`).test(source), `${file} still renders "${key}"`);
    }
    assert.doesNotMatch(source, /chanceScore\s*[})]/, `${file} still reads chanceScore`);
    assert.doesNotMatch(source, /"Safety \/ Likely"|"Reach"|"Target \/ Match"/, `${file} still names a chance tier`);
  }
});

check("no API route returns a composite chance index or a selectivity label", () => {
  for (const route of [
    "src/app/api/chancing/route.ts",
    "src/app/api/universities/route.ts",
    "src/app/api/universities/[id]/route.ts",
    "src/app/api/deadlines/route.ts",
    "src/app/api/dashboard/route.ts",
    "src/app/api/programs/recommend/route.ts",
  ]) {
    // Comments may NAME the retired field; executable code must not compute it.
    const source = read(route)
      .split("\n")
      .filter((line) => !/^\s*(\*|\/\/|\/\*)/.test(line))
      .join("\n");
    assert.doesNotMatch(source, /compositeProgramFitScore/, `${route}`);
    assert.doesNotMatch(source, /selectivityCategory\s*:/, `${route}`);
    assert.doesNotMatch(source, /chanceScore\s*:\s*(?!undefined|null)/, `${route}`);
  }
});

check("the programme-discovery helper never computes a planning index", () => {
  const source = read("src/lib/universityProgrammeDiscovery.ts");
  assert.doesNotMatch(source, /compositeProgramFitScore/);
  assert.match(source, /chance:null/);
});

check("every assessed route serves the canonical admission-probability policy", () => {
  for (const route of [
    "src/app/api/chancing/route.ts",
    "src/app/api/deadlines/route.ts",
    "src/app/api/programs/recommend/route.ts",
  ]) {
    assert.match(read(route), /ADMISSION_PROBABILITY|admissionProbability/, route);
  }
});


// ---------------------------------------------------------------------------
console.log("\n20. Every surface renders the canonical assessment");
// ---------------------------------------------------------------------------

const STUDIO = "src/components/RecommendationStudio.tsx";
const SCREEN = "src/components/ProgrammeAssessmentScreen.tsx";
const PARTS = "src/components/AssessmentParts.tsx";

check("the recommendation studio renders the assessment, not a positioning block", () => {
  const studio = read(STUDIO);
  assert.match(studio, /assessment: Assessment/);
  assert.match(studio, /assessment\.preferenceFit/);
  assert.match(studio, /assessment\.eligibility/);
  assert.match(studio, /assessment\.finance/);
  assert.match(studio, /assessment\.academicComparisons/);
  assert.match(studio, /<FitInline /);
  assert.match(studio, /<PreferenceFilterList /);
  assert.match(studio, /<EligibilitySummaryLine /);
  assert.match(studio, /<AcademicComparisonList /);
  // The retired block and its "not benchmarked" fallback must not return.
  // (Comments may explain the removal; only executable lines are checked.)
  const code = studio
    .split("\n")
    .filter((line) => !/^\s*(\*|\/\/|\/\*)/.test(line))
    .join("\n");
  assert.doesNotMatch(code, /positioning/);
  assert.doesNotMatch(code, /QS #/);
  assert.doesNotMatch(code, /Not benchmarked/i);
});

check("both surfaces share one renderer instead of re-implementing the formula", () => {
  for (const file of [STUDIO, SCREEN]) {
    const source = read(file);
    assert.match(source, /from "@\/components\/AssessmentParts"/, `${file} does not import the shared parts`);
    // No surface may recompute a fit: the arithmetic lives in src/lib/assessment.
    assert.doesNotMatch(source, /weightedSimilarity\s*\/|\*\s*0\.6\b|\*\s*60\b/, `${file} recomputes a fit`);
    assert.doesNotMatch(source, /knownWeight\s*[+*-]/, `${file} recomputes coverage`);
  }
});

check("the studio has explicit states for missing assessment, no preference and unknown subject", () => {
  const parts = read(PARTS);
  // A fit with no active preference has no number and says so.
  assert.match(parts, /fitNoActivePreferences/);
  // Unknown never becomes a standalone 0 or 0% number. A coverage percentage is
  // rendered as a LABEL ("Data coverage: 85%") next to the interval; itself it
  // is never presented as the fit, so rounding it for the label is safe.
  assert.doesNotMatch(parts, /coverage\s*\?\?\s*0\s*[,;)]?\s*\}/);
  assert.match(parts, /scoreText\(fit\)/);
  // `must` results are their own labelled block, separate from eligibility.
  assert.match(parts, /mustState_fail/);
  assert.match(parts, /mustState_unknown/);
  assert.match(parts, /mustFiltersLabel/);
});

check("an unknown academic comparison never hides the fit", () => {
  const parts = read(PARTS);
  const academic = parts.slice(parts.indexOf("export function AcademicComparisonList"));
  assert.match(academic, /academicNoStatistics/);
  // The academic block renders only inside its own section; the fit is rendered
  // by separate components, so an empty comparison list cannot gate it.
  assert.doesNotMatch(academic, /preferenceFit/);
  const studio = read(STUDIO);
  assert.ok(
    studio.indexOf("<FitInline ") < studio.indexOf("<AcademicComparisonList "),
    "the fit must be rendered before (and independently of) the academic block"
  );
});

check("a grant's met requirements are never subtracted from the cost", () => {
  const finance = read("src/lib/assessment/finance.ts");
  // Only awarded/confirmed funding reduces the bill; a met requirement does not.
  assert.doesNotMatch(finance, /eligibility[^\n]*netCost/i);
  assert.doesNotMatch(finance, /requirementMet\s*&&[^\n]*subtract/i);
  assert.match(finance, /not_awarded_competitive_grant_is_a_scenario/);
});

check("no surface can print a null as 0 %", () => {
  for (const file of [PARTS, STUDIO, SCREEN]) {
    const source = read(file);
    assert.doesNotMatch(source, /\$\{?[^}\n]*\?\?\s*0\s*\}?\s*%/, `${file} prints a null percentage as 0%`);
    assert.doesNotMatch(source, /\?\?\s*0\)?\}/, `${file} coerces a null to 0 in output`);
  }
  const parts = read(PARTS);
  assert.match(parts, /if \(value == null\) return "—";/);
});

console.log(`\n${failures.length === 0 ? "✅" : "❌"} ${passed} passed, ${failures.length} failed`);

if (failures.length) {
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}
