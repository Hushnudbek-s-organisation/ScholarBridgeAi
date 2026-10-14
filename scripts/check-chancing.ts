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
  profileStrength,
  type ChancingProfile,
} from "../src/lib/chancing";
import { ADVISOR_SYSTEM_PROMPT } from "../src/lib/advisor";

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

console.log("\nProfile-information coverage");
check("an empty profile marks every section unknown", () => {
  const result = profileStrength({});
  assert.equal(result.overall, 0);
  assert.equal(result.scoredSections, 0);
  assert.ok(result.sections.every((section) => section.unknown));
});
check("coverage reports how many sections contained data", () => {
  const result = profileStrength({ gpa: 3.8, gpaScale: 4, degreeLevel: "Bachelor" });
  assert.equal(result.scoredSections, 1);
  assert.equal(result.totalSections, 8);
  assert.equal(result.sections.find((section) => section.key === "academics")?.score, 100);
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
  assert.match(profileStrength(profile).basis, /does not measure eligibility.*admission likelihood/i);
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

console.log(`\n${failures.length === 0 ? "✅" : "❌"} ${passed} passed, ${failures.length} failed`);
if (failures.length) process.exitCode = 1;
