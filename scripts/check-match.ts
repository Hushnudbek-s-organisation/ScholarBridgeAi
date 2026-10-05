/**
 * check-match.ts (npm run test:match) — regression coverage for the discovery
 * matchers in `src/lib/matching.ts`:
 *
 *   • calculateUniversityMatch  — the "Match %" on the University Explorer
 *   • calculateScholarshipMatch — the "Match %" on the Scholarship Hub,
 *     the Scholarship Autopilot queue and the notification sweep
 *   • subjectAlignment / majorOverlap — the field comparison used by both
 *   • the shared GPA and degree-level helpers
 *
 * The behaviours asserted here were introduced after a real defect review:
 * a blank/odd target major could match ANY major-restricted scholarship
 * (`"".includes("")`), short abbreviations ("AI") matched unrelated words by
 * substring ("Sustain-AI-nable"), a "Master's"/"MSc"/"магистратура" profile
 * was reported as "Only open to: Master, PhD", and missing-scale GPAs were
 * clamped to a perfect 4.0. Every case below is deterministic — no DB, no
 * network. Run: npm run test:match
 */

import {
  calculateUniversityMatch,
  calculateScholarshipMatch,
  subjectAlignment,
  majorOverlap,
  subjectTokens,
  type UniversityData,
  type ScholarshipData,
  type StudentProfileData,
} from "../src/lib/matching";
import { assessEligibility, type RecommendRequirement } from "../src/lib/recommend";
import { compareDegreeLevels, hasUndergraduateAdmission, normalizeDegreeLevel, undergraduateTestApplies } from "../src/lib/degreeLevels";
import { gpaTo40Scale } from "../src/lib/gpa";

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

const uni = {
  id: 23,
  name: "Imperial College London",
  country: "United Kingdom",
  city: "London",
  flagEmoji: "🇬🇧",
  worldRanking: 2,
  degreeLevel: "Bachelor",
  programMajor: "Computing",
  annualTuitionUsd: 45500,
  annualLivingEstUsd: 18200,
  minGpa: 3.5,
  minIelts: 6.5,
  minSat: 1400,
  acceptanceRate: 11,
  postStudyWorkVisaYears: 2,
  description: "x",
  highlights: "[]",
  websiteUrl: "https://imperial.ac.uk",
} as unknown as UniversityData;

const baseProfile = {
  degreeLevel: "Bachelor",
  targetMajor: "Computing",
  gpa: 3.8,
  gpaScale: 4.0,
  budgetAnnualUsd: 70000,
  preferredCountries: ["United Kingdom"],
  needScholarship: false,
  workExperienceYears: 0,
  researchPublications: 0,
} as unknown as StudentProfileData;

const scholarship = {
  id: 1,
  title: "Test Award",
  provider: "Test",
  country: "United Kingdom",
  coverageType: "Full Tuition",
  amountUsdValue: 30000,
  deadline: null,
  degreeLevels: JSON.stringify(["Master", "PhD"]),
  eligibleMajors: JSON.stringify(["All"]),
  minGpa: 3.5,
  minIelts: 6.5,
  financialNeedBased: false,
  meritBased: false,
  description: "x",
  requirements: "x",
  websiteUrl: "https://example.org",
} as unknown as ScholarshipData;

// ---------------------------------------------------------------------------
section("1. University match — requirements, cost, country, field");
// ---------------------------------------------------------------------------

// Base 70 + GPA 3.8 vs 3.5 (diff 0.3 → +10) − IELTS missing (−25) − SAT missing
// (−20) + budget fits (+10) + preferred country (+8) + field alignment (+12).
const noTests = calculateUniversityMatch({ ...baseProfile }, uni);
check("no IELTS/SAT → score reflects the two missing bars", noTests.matchScore === 65, String(noTests.matchScore));
check("no IELTS/SAT → category Reach", noTests.matchCategory === "Reach", noTests.matchCategory);
check(
  "no IELTS → the issue names the required band and the missing score",
  noTests.potentialIssues.some((i: string) => /IELTS 6\.5 required — you don't have an IELTS score/.test(i))
);
check(
  "no SAT → the issue names the required band and the missing score",
  noTests.potentialIssues.some((i: string) => /SAT 1400 required — you don't have an SAT score/.test(i))
);
check("field alignment is the top reason (weight 12)", /Offers your field: Computing/.test(noTests.reasons[0] ?? ""), noTests.reasons[0]);

const strong = calculateUniversityMatch({ ...baseProfile, ieltsScore: 7.5, satScore: 1500 }, uni);
check("strong profile → high score", strong.matchScore >= 80, String(strong.matchScore));
check("max 2 reasons", strong.reasons.length <= 2, String(strong.reasons.length));
check("max 2 issues", strong.potentialIssues.length <= 2, String(strong.potentialIssues.length));

const exactIelts = calculateUniversityMatch({ ...baseProfile, ieltsScore: 6.5, satScore: 1450 }, uni);
check("IELTS exactly at the bar → no IELTS issue", !exactIelts.potentialIssues.some((i: string) => /IELTS/.test(i)));

const lowIelts = calculateUniversityMatch({ ...baseProfile, ieltsScore: 5.0 }, uni);
check("IELTS below the bar → penalty vs a score that meets it", lowIelts.matchScore < exactIelts.matchScore, `${lowIelts.matchScore} vs ${exactIelts.matchScore}`);
check(
  "IELTS below → issue shows required vs actual",
  lowIelts.potentialIssues.some((i: string) => /IELTS 6\.5 required — you have 5/.test(i)),
  JSON.stringify(lowIelts.potentialIssues)
);

const uniNoReqs = { ...uni, minIelts: null, minSat: null } as UniversityData;
const noReqs = calculateUniversityMatch({ ...baseProfile }, uniNoReqs);
check("no published minimums → no test issues", !noReqs.potentialIssues.some((i: string) => /IELTS|SAT/.test(i)));
check("no published minimums → high score", noReqs.matchScore >= 85, String(noReqs.matchScore));

// TOEFL instead of IELTS: not "no certificate" — a smaller, honest issue.
const toeflOnly = calculateUniversityMatch({ ...baseProfile, toeflScore: 100 }, uni);
check(
  "TOEFL instead of IELTS → confirm-acceptance issue, not 'no IELTS'",
  toeflOnly.potentialIssues.some((i: string) => /TOEFL 100/.test(i) && /confirm whether it is accepted/.test(i)),
  JSON.stringify(toeflOnly.potentialIssues)
);
check(
  "TOEFL instead of IELTS → smaller penalty than a missing test",
  toeflOnly.matchScore > noTests.matchScore && toeflOnly.matchScore < exactIelts.matchScore,
  `${noTests.matchScore} < ${toeflOnly.matchScore} < ${exactIelts.matchScore}`
);

// Field mismatch must lower the score, and it must be visible whenever the
// hard requirements leave room in the top-2 issue list.
const lawProfile = { ...baseProfile, targetMajor: "Law" } as StudentProfileData;
const lawMatch = calculateUniversityMatch(lawProfile, uni);
const lawStrongProfile = { ...lawProfile, ieltsScore: 7.5, satScore: 1500 } as StudentProfileData;
check(
  "unrelated field → visible issue when requirements are met",
  calculateUniversityMatch(lawStrongProfile, uni).potentialIssues.some((i: string) => /Programmes focus on Computing/.test(i)),
  JSON.stringify(calculateUniversityMatch(lawStrongProfile, uni).potentialIssues)
);
check("unrelated field → lower score than a matching field", lawMatch.matchScore < noTests.matchScore, `${lawMatch.matchScore} < ${noTests.matchScore}`);

// Unknown major → neutral: no field reason, no field issue.
const unknownMajorMatch = calculateUniversityMatch({ ...baseProfile, targetMajor: "" }, uni);
check(
  "unknown target major → no field claim either way",
  !unknownMajorMatch.reasons.some((r: string) => /Offers your field/.test(r)) &&
    !unknownMajorMatch.potentialIssues.some((i: string) => /Programmes focus on/.test(i))
);

// GPA with no scale and a value above 4.0 → not comparable: no GPA reason/issue.
const unscaledGpa = calculateUniversityMatch({ ...baseProfile, gpa: 85, gpaScale: 0 } as StudentProfileData, uni);
check(
  "unscaled GPA > 4 → no GPA comparison (no false 'well above')",
  !unscaledGpa.reasons.some((r: string) => /GPA/.test(r)) && !unscaledGpa.potentialIssues.some((i: string) => /GPA/.test(i))
);

// ---------------------------------------------------------------------------
section("2. subjectAlignment / majorOverlap — word-based, blank-safe");
// ---------------------------------------------------------------------------

check("exact field → strong", subjectAlignment("Computer Science", "Computer Science").level === "strong");
check("superset field → strong", subjectAlignment("Computer Science", "Computer Science & Artificial Intelligence").level === "strong");
check("unrelated field → none", subjectAlignment("Law", "Computing").level === "none");
check("blank student major → unknown", subjectAlignment("", "Computing").level === "unknown");
check("blank program focus → unknown", subjectAlignment("Law", null).level === "unknown");
check("'AI' does NOT match 'Sustainable Engineering'", subjectAlignment("AI", "Sustainable Engineering").level === "none");
check("'AI' matches 'AI & Data Science'", subjectAlignment("AI", "AI & Data Science").level === "strong");
check("short tokens are kept by the tokenizer", subjectTokens("AI & IT").join(",") === "ai,it");
check("stop words are dropped", subjectTokens("Data and Science").join(",") === "data,science");
check("no comparable words → null, not a fake 0.5", majorOverlap("—", "Computing") === null);

// ---------------------------------------------------------------------------
section("3. Scholarship match — level aliases, majors, English tests");
// ---------------------------------------------------------------------------

const masterProfile = {
  ...baseProfile,
  degreeLevel: "Master's",
  targetMajor: "Computer Science",
  gpa: 3.8,
  ieltsScore: 7.0,
} as unknown as StudentProfileData;

const base = calculateScholarshipMatch(masterProfile, scholarship);
check("'Master''s' profile matches a ['Master','PhD'] award", base.reasons.some((r: string) => /Open to Master's applicants/.test(r)), JSON.stringify(base.reasons));
check("'Master''s' is NOT reported as 'Only open to'", !base.potentialIssues.some((i: string) => /Only open to/.test(i)), JSON.stringify(base.potentialIssues));

const phdProfile = { ...masterProfile, degreeLevel: "PhD" } as StudentProfileData;
check("PhD profile matches a ['Master','PhD'] award", calculateScholarshipMatch(phdProfile, scholarship).reasons.some((r: string) => /Open to PhD/.test(r)));

const bachelorProfile = { ...masterProfile, degreeLevel: "Bachelor" } as StudentProfileData;
const bachelorMatch = calculateScholarshipMatch(bachelorProfile, scholarship);
check("Bachelor profile → explicit mismatch issue", bachelorMatch.potentialIssues.some((i: string) => /Only open to: Master, PhD/.test(i)), JSON.stringify(bachelorMatch.potentialIssues));
check("Bachelor profile → lower score than a matching level", bachelorMatch.matchScore < base.matchScore, `${bachelorMatch.matchScore} < ${base.matchScore}`);

const emptyLevelProfile = { ...masterProfile, degreeLevel: "" } as StudentProfileData;
check(
  "missing profile level → unknown (no mismatch claim)",
  !calculateScholarshipMatch(emptyLevelProfile, scholarship).potentialIssues.some((i: string) => /Only open to/.test(i))
);

const uzLevelProfile = { ...masterProfile, degreeLevel: "магистратура" } as StudentProfileData;
check("Cyrillic 'магистратура' matches 'Master'", calculateScholarshipMatch(uzLevelProfile, scholarship).reasons.some((r: string) => /Open to/.test(r)));

// Major-restricted award.
const majorAward = { ...scholarship, eligibleMajors: JSON.stringify(["Engineering", "Public Health"]) } as ScholarshipData;

const blankMajorProfile = { ...masterProfile, targetMajor: "" } as StudentProfileData;
const blankMajorMatch = calculateScholarshipMatch(blankMajorProfile, majorAward);
check(
  "blank target major → NO 'your field is eligible' claim",
  !blankMajorMatch.reasons.some((r: string) => /is eligible/.test(r)),
  JSON.stringify(blankMajorMatch.reasons)
);
check(
  "blank target major → asks the student to add it",
  blankMajorMatch.potentialIssues.some((i: string) => /add your target major/.test(i)),
  JSON.stringify(blankMajorMatch.potentialIssues)
);

const aiProfile = { ...masterProfile, targetMajor: "AI" } as StudentProfileData;
check(
  "'AI' is not reported eligible for an Engineering/Public Health award",
  !calculateScholarshipMatch(aiProfile, majorAward).reasons.some((r: string) => /is eligible/.test(r))
);

const csAward = { ...scholarship, eligibleMajors: JSON.stringify(["Computer Science"]) } as ScholarshipData;
check("'Computer Science' matches a Computer Science award", calculateScholarshipMatch(masterProfile, csAward).reasons.some((r: string) => /is eligible/.test(r)));

const allMajorsAward = { ...scholarship, eligibleMajors: JSON.stringify(["All"]) } as ScholarshipData;
const allMajorsMatch = calculateScholarshipMatch(blankMajorProfile, allMajorsAward);
check("'All' majors award → no field issue for a blank major", !allMajorsMatch.potentialIssues.some((i: string) => /eligible fields/.test(i)));

// English tests on scholarships.
const noEnglish = { ...masterProfile, ieltsScore: null, toeflScore: null } as StudentProfileData;
check(
  "no English test → 'you don't have an IELTS score'",
  calculateScholarshipMatch(noEnglish, scholarship).potentialIssues.some((i: string) => /don't have an IELTS score/.test(i))
);
const toeflScholarship = calculateScholarshipMatch({ ...masterProfile, ieltsScore: null, toeflScore: 100 } as StudentProfileData, scholarship);
check(
  "TOEFL → smaller confirm-acceptance issue",
  toeflScholarship.potentialIssues.some((i: string) => /TOEFL 100/.test(i))
);

// Merit/need signals.
const merit = calculateScholarshipMatch({ ...masterProfile, gpa: 3.9 } as StudentProfileData, { ...scholarship, meritBased: true } as ScholarshipData);
check("merit-based + strong GPA → reason", merit.reasons.some((r: string) => /Merit-based/.test(r)));
const noGpa = calculateScholarshipMatch({ ...masterProfile, gpa: 85, gpaScale: 0 } as unknown as StudentProfileData, { ...scholarship, meritBased: true } as ScholarshipData);
check(
  "merit-based + incomparable GPA → no invented merit reason",
  !noGpa.reasons.some((r: string) => /Merit-based/.test(r))
);

// ---------------------------------------------------------------------------
section("4. Shared helpers — GPA scale and degree levels");
// ---------------------------------------------------------------------------

check("4.0 scale keeps the value", gpaTo40Scale(3.6, 4) === 3.6);
check("100-point scale converts proportionally", Math.abs((gpaTo40Scale(85, 100) ?? 0) - 3.4) < 1e-9, String(gpaTo40Scale(85, 100)));
check("5-point scale converts proportionally", Math.abs((gpaTo40Scale(4.5, 5) ?? 0) - 3.6) < 1e-9, String(gpaTo40Scale(4.5, 5)));
check("no scale, value ≤ 4 → comparable", gpaTo40Scale(3.6, null) === 3.6);
check("no scale, value > 4 → unknown (never 4.0)", gpaTo40Scale(85, null) === null);
check("zero/negative GPA → unknown", gpaTo40Scale(0, 4) === null && gpaTo40Scale(-1, 4) === null);

check("alias: Master's ↔ Master", compareDegreeLevels("Master's", JSON.stringify(["Master", "PhD"])) === "match");
check("alias: MSc ↔ Master", compareDegreeLevels("MSc", "Master") === "match");
check("alias: Bachelor vs Master-only → mismatch", compareDegreeLevels("Bachelor", "Master") === "mismatch");
check("'All' catalogue level matches anything", compareDegreeLevels("Bachelor", "All") === "match");
check("unknown profile level → unknown", compareDegreeLevels("", "Master") === "unknown");
check("unknown catalogue level → unknown", compareDegreeLevels("Master", "") === "unknown");
check("unknown is never coerced to All", normalizeDegreeLevel("something else") === null);
check("multi-level label is recognised", compareDegreeLevels("Master", "Bachelor/Master's/Doctoral") === "match");
check("a label with an unrecognised part stays unspecified", compareDegreeLevels("Master", "Bachelor/Master's/Executive") === "unknown");
check("JSON-array label is compared, not read as unknown", compareDegreeLevels("Master", JSON.stringify(["Master", "PhD"])) === "match");

// ---------------------------------------------------------------------------
section("5. SAT/ACT are undergraduate tests (never a graduate requirement)");
// ---------------------------------------------------------------------------

const gradUni = { ...uni, degreeLevel: "Master", minSat: 1400 } as UniversityData;
const gradStudent = calculateUniversityMatch({ ...baseProfile, degreeLevel: "Master" }, gradUni);
check("graduate applicant at a graduate-only university → no SAT issue", !gradStudent.potentialIssues.some((i: string) => /SAT/.test(i)));
check(
  "a stored undergraduate SAT bar does not move a graduate applicant's score",
  gradStudent.matchScore ===
    calculateUniversityMatch({ ...baseProfile, degreeLevel: "Master" }, { ...gradUni, minSat: null } as UniversityData).matchScore,
  String(gradStudent.matchScore)
);
const undergradUni = { ...uni, degreeLevel: "All", minSat: 1400 } as UniversityData;
check(
  "undergraduate applicant still sees the SAT bar",
  calculateUniversityMatch({ ...baseProfile, degreeLevel: "Bachelor" }, undergradUni).potentialIssues.some((i: string) => /SAT 1400 required/.test(i))
);
check(
  "a graduate applicant at an undergraduate+graduate university is not scored on SAT",
  !calculateUniversityMatch({ ...baseProfile, degreeLevel: "Master" }, undergradUni).potentialIssues.some((i: string) => /SAT/.test(i))
);
check("unknown level still shows the published SAT bar (never hidden)", undergraduateTestApplies("All", "") === true);
check("graduate-only institution → test does not apply", undergraduateTestApplies("Master", "Bachelor") === false);
check("undergraduate institution + undergraduate student → applies", undergraduateTestApplies("Bachelor", "Bachelor") === true);
check("unknown institution level keeps the published bar", undergraduateTestApplies(null, undefined) === true);
check("hasUndergraduateAdmission: All → true", hasUndergraduateAdmission("All") === true);
check("hasUndergraduateAdmission: Master only → false", hasUndergraduateAdmission("Master") === false);
check("hasUndergraduateAdmission: unknown → false (never claimed)", hasUndergraduateAdmission(null) === false);

const masterProgramReqs: RecommendRequirement[] = [{ programId: 1, minGpa: 3.0, minIelts: 6.5, minToefl: null, minDet: null, minSat: 1400, minAct: null, ibRequirement: null, aLevelRequirement: null, apRequirement: null, subjectRequirements: null, otherRequirements: null }];
const masterEligibility = assessEligibility({ gpa: 3.8, gpaScale: 4, ielts: 7, degreeLevel: "Master" }, masterProgramReqs, "Master");
check("a Master programme ignores a stray SAT minimum", !masterEligibility.items.some((i) => i.key === "sat"));
const bachelorEligibility = assessEligibility({ gpa: 3.8, gpaScale: 4, ielts: 7, degreeLevel: "Bachelor" }, masterProgramReqs, "Bachelor");
check("a Bachelor programme still assesses the SAT minimum", bachelorEligibility.items.some((i) => i.key === "sat" && i.status === "unknown"));

console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
