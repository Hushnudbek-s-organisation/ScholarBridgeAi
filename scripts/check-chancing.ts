/**
 * Regression checks for profile-data handling and student-facing probability
 * policy. Programme fit and admission probability are deliberately separate:
 * there is no validated admission-probability methodology in ScholarBridge.
 *
 * Run: npm run test:chancing
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ADMISSION_PROBABILITY,
  analyzeExtracurriculars,
  countActivities,
  normalizedGpa,
  parseListColumn,
  profileCompletenessRatio,
  profileStrength,
  type ChancingProfile,
} from "../src/lib/chancing";
import { ADVISOR_SYSTEM_PROMPT } from "../src/lib/advisor";
import {
  QS_TOP_200_BENCHMARKS,
  matchQsUniversityBenchmark,
} from "../src/lib/qsTop200Benchmarks";
import {
  PROGRAM_DEPARTMENT_PROFILES,
  evaluateUniversityAndProgramChance,
  resolveProgramDepartmentProfile,
} from "../src/lib/programChancing";

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

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const profile: ChancingProfile = {
  gpa: 3.8,
  gpaScale: 4,
  degreeLevel: "Bachelor",
  targetMajor: "Computer Science",
  country: "Uzbekistan",
  ieltsScore: 7.5,
  projects: '["Course project"]',
  leadership: '["Club coordinator"]',
  researchExperience: '["Research assistant"]',
  awards: '["Verified regional award"]',
  savedActivities: [{ category: "competition", role: "Participant", achievements: "Finalist" }],
};

console.log("\nProfile data helpers");
check("parseListColumn reads JSON arrays", () => assert.equal(parseListColumn('["a","b"]').length, 2));
check("parseListColumn reads legacy comma-separated text", () => assert.deepEqual(parseListColumn("a, b"), ["a", "b"]));
check("parseListColumn treats null as no recorded items", () => assert.deepEqual(parseListColumn(null), []));
check("normalizedGpa preserves a 4.0-scale value", () => assert.equal(normalizedGpa(profile), 3.8));
check("normalizedGpa converts an explicitly scaled value", () => {
  assert.ok(Math.abs((normalizedGpa({ gpa: 4.5, gpaScale: 5 }) ?? 0) - 3.6) < 0.01);
});
check("normalizedGpa does not guess an unscaled value above 4", () => assert.equal(normalizedGpa({ gpa: 85 }), null));
check("countActivities counts recorded entries, not a merit score", () => {
  const counts = countActivities(profile);
  assert.equal(counts.activities, 2);
  assert.equal(counts.leadership, 1);
  assert.equal(counts.research, 1);
  assert.equal(counts.awards, 2);
});
check("activity analysis exposes counts only", () => {
  const result = analyzeExtracurriculars(profile);
  assert.deepEqual(Object.keys(result).sort(), ["activities", "awards", "leadership", "research"]);
});
check("research publications are counted once and zero is not a recorded achievement", () => {
  assert.equal(countActivities({ researchPublications: 0 }).research, 0);
  assert.equal(analyzeExtracurriculars({ researchPublications: 0 }).research, 0);
  assert.equal(countActivities({ researchPublications: 2 }).research, 2);
  assert.equal(analyzeExtracurriculars({ researchPublications: 2 }).research, 2);
});
check("gamification completeness uses the same validated coverage helper", () => {
  const source = read("src/lib/gamification.ts");
  assert.match(source, /profileCompletenessRatio\(profile\)/);
  assert.equal(profileCompletenessRatio({ researchPublications: 0 }), profileCompletenessRatio({}));
  assert.ok(profileCompletenessRatio({ researchPublications: 1 }) > profileCompletenessRatio({}));
});
check("family income alone is not budget coverage or an explicit contribution", () => {
  assert.equal(profileCompletenessRatio({ familyIncomeUsd: 500000 }), profileCompletenessRatio({}));
  const finance = profileStrength({ familyIncomeUsd: 500000 }).sections.find((section) => section.key === "financial");
  assert.equal(finance?.unknown, true);
  assert.deepEqual(finance?.missing, ["budgetPlan", "fundingPreference"]);
});

console.log("\nProfile-information coverage");
check("an empty profile marks every section unknown", () => {
  const result = profileStrength({});
  assert.equal(result.overall, 0);
  assert.equal(result.scoredSections, 0);
  assert.ok(result.sections.every((section) => section.unknown));
});
check("coverage reports how many sections contained data against a fixed denominator", () => {
  const result = profileStrength({ gpa: 3.8, gpaScale: 4, degreeLevel: "Bachelor" });
  assert.equal(result.scoredSections, 1);
  assert.equal(result.totalSections, 8);
  assert.equal(result.sections.find((section) => section.key === "academics")?.score, 100);
  assert.equal(result.overall, 13);
  assert.match(result.basis, /fixed set of sections/i);
});
check("an absent test is unknown rather than a zero or requirement", () => {
  const result = profileStrength({ gpa: 3.8, gpaScale: 4, degreeLevel: "Bachelor" });
  const tests = result.sections.find((section) => section.key === "tests");
  assert.equal(tests?.unknown, true);
  assert.ok(tests?.missing?.includes("testPolicy"));
});
check("English-only and standardized-test-only records are both recorded without ranking them", () => {
  const english = profileStrength({ ieltsScore: 8 }).sections.find((section) => section.key === "tests");
  const standardized = profileStrength({ satScore: 1500 }).sections.find((section) => section.key === "tests");
  assert.equal(english?.score, 100);
  assert.equal(standardized?.score, 100);
});
check("coverage explains that it is not eligibility or admission likelihood", () => {
  assert.match(profileStrength(profile).basis, /not an eligibility, quality, or admission-likelihood score/i);
});

console.log("\nAdmission probability policy");
check("admission probability is explicitly unavailable", () => {
  assert.equal(ADMISSION_PROBABILITY.available, false);
  assert.equal(ADMISSION_PROBABILITY.reason, "no-validated-methodology");
});
check("AI advisor permits fit percentages only and separates them from odds", () => {
  assert.match(ADVISOR_SYSTEM_PROMPT, /only percentages.*university-fit/i);
  assert.match(ADVISOR_SYSTEM_PROMPT, /FIT IS NOT ADMISSION PROBABILITY/);
});
const chancingRoute = read("src/app/api/chancing/route.ts");
check("chancing API returns availability metadata without spreading an estimate", () => {
  assert.match(chancingRoute, /probability: ADMISSION_PROBABILITY/);
  assert.doesNotMatch(chancingRoute, /\.\.\.estimate/);
  assert.doesNotMatch(chancingRoute, /admission:\s*estimate\.admission/);
});
const planningRoute = read("src/app/api/planning/route.ts");
check("planning API does not return an admission estimate", () => {
  assert.doesNotMatch(planningRoute, /admissionEstimate/);
  assert.match(planningRoute, /probability: ADMISSION_PROBABILITY/);
});
const profileReport = read("src/lib/profileReportFallback.ts");
check("fallback report has no readiness/completeness score logic", () => {
  assert.doesNotMatch(profileReport, /facts\.readiness|f\.readiness|completeness:\s*\d/);
});
const evaluationRoute = read("src/app/api/ai/evaluate-profile/route.ts");
check("profile evaluation does not inject a readiness score into the prompt", () => {
  assert.doesNotMatch(evaluationRoute, /Readiness score|Profile completeness|strength\.completeness/);
});
const aiChatRoute = read("src/app/api/ai/chat/route.ts");
check("AI chat does not receive family income as an available contribution", () => {
  assert.doesNotMatch(aiChatRoute, /Family income:/);
  assert.match(aiChatRoute, /never treat household\/family income as an available contribution or a substitute budget/);
});

console.log("\nQS Top 200 Benchmarks & 5-Layer Program Positioning Engine");
check("QS Top 200 dataset contains all 200 ranked universities plus KAIST", () => {
  assert.ok(QS_TOP_200_BENCHMARKS.length >= 200, `Expected >=200 rows, got ${QS_TOP_200_BENCHMARKS.length}`);
  const ranked = QS_TOP_200_BENCHMARKS.filter((b) => b.qsRank !== null);
  assert.equal(ranked.length, 200, `Expected 200 ranked rows, got ${ranked.length}`);
  const mit = matchQsUniversityBenchmark({ name: "MIT", country: "United States" });
  const tum = matchQsUniversityBenchmark({ name: "Technical University of Munich", country: "Germany" });
  const ox = matchQsUniversityBenchmark({ name: "University of Oxford", country: "United Kingdom" });
  const kaist = matchQsUniversityBenchmark({ name: "KAIST", country: "South Korea" });
  assert.equal(mit.qsRank, 1);
  // QS 2026: TUM is 22, not the 23 this table carried until Phase AC.
  assert.equal(tum.qsRank, 22);
  assert.equal(ox.qsRank, 4);
  assert.equal(kaist.officialDomain, "kaist.ac.kr");
  // KAIST is not in the QS 2026 edition, so its row must carry no position —
  // the admission band still applies, the rank claim does not.
  assert.equal(kaist.qsRank, null);
});
check("every QS benchmark carries its estimate provenance", () => {
  // These bands are compiled from Common Data Sets and admissions statistics —
  // not figures the universities publish as official. No consumer may present
  // them as verified, so the flag must be on EVERY row and on every derived
  // fallback (a row without it could be rendered as a fact).
  const unflagged = QS_TOP_200_BENCHMARKS.filter((b) => b.isEstimated !== true || !b.estimateBasis);
  assert.equal(unflagged.length, 0, `${unflagged.length} benchmark rows lost their provenance flag`);
  const derived = matchQsUniversityBenchmark({
    name: "Some University Nobody Ranked",
    country: "Germany",
    worldRanking: 900,
  });
  assert.equal(derived.isEstimated, true, "a rank-derived band is an estimate");
  assert.match(derived.estimateBasis, /rank/i);
});

check("14 granular department selectivity profiles differentiate CS/AI from Humanities", () => {
  assert.equal(Object.keys(PROGRAM_DEPARTMENT_PROFILES).length, 14);
  const csDept = resolveProgramDepartmentProfile("BSc in Computer Science and AI");
  const humDept = resolveProgramDepartmentProfile("BA in History and Literature");
  assert.equal(csDept.key, "cs_ai");
  assert.equal(humDept.key, "humanities_languages");
  assert.ok(csDept.acceptRateMultiplier < humDept.acceptRateMultiplier);
});
check("evaluateUniversityAndProgramChance computes program-specific 25th/50th/75th percentiles and eligibility", () => {
  const csEval = evaluateUniversityAndProgramChance(
    profile,
    { name: "Technical University of Munich", country: "Germany", worldRanking: 23 },
    {
      id: 101,
      universityId: 23,
      name: "BSc in Computer Science",
      degreeLevel: "Bachelor",
      field: "Computer Science",
    },
    {
      minGpa: 3.4,
      minIelts: 6.5,
      minSat: 1380,
      ibRequirement: "36 IB Points (HL Math 6)",
      aLevelRequirement: "AAA",
    }
  );
  const histEval = evaluateUniversityAndProgramChance(
    profile,
    { name: "Technical University of Munich", country: "Germany", worldRanking: 23 },
    {
      id: 102,
      universityId: 23,
      name: "BA in History & Philosophy of Science",
      degreeLevel: "Bachelor",
      field: "History",
    },
    null
  );
  assert.equal(csEval.eligibilityStatus, "meets_all");
  assert.ok(csEval.effectiveProgramAcceptRatePct < csEval.universityAcceptRatePct);
  assert.ok(csEval.effectiveProgramAcceptRatePct < histEval.effectiveProgramAcceptRatePct);
  assert.ok(csEval.programGpa50 > histEval.programGpa50);
  assert.ok(csEval.studentGpaPercentile !== null && csEval.studentGpaPercentile >= 50);
  assert.ok((histEval.studentGpaPercentile ?? 0) > (csEval.studentGpaPercentile ?? 0));
});

(async () => {
  process.env.DATABASE_URL ||= "postgresql://x:x@localhost:5432/x";
  const { ADDITIONAL_24_SUCCESS_STORIES } = await import("../src/db/seedOutcomesAndStories");
  const { RICH_SUCCESS_STORIES } = await import("../src/db/seedRichPlatformData");
  check("synthetic success stories are not defined as verified public records", () => {
    assert.equal(RICH_SUCCESS_STORIES.length, 0);
    assert.equal(ADDITIONAL_24_SUCCESS_STORIES.length, 0);
  });

  console.log(`\n${failures.length === 0 ? "✅" : "❌"} ${passed} passed, ${failures.length} failed`);
  if (failures.length) process.exitCode = 1;
})();
