/**
 * Deterministic checks for the Personalized Roadmap (#4) and the AI
 * Admissions Advisor (#3) decision logic.
 *
 * Both modules are pure, so the behaviour the product promises can be pinned
 * here without Postgres or an API key:
 *   1. The dashboard shows exactly three actions, and an overdue deadline
 *      always beats everything else.
 *   2. A missing English test outranks polish work.
 *   3. The advisor never quotes a percentage that is not in its brief, and
 *      never promises an outcome — a model that does gets rejected.
 *   4. The advisor still produces a complete answer with no AI provider.
 *
 * Run: npm run test:roadmap
 */

import {
  buildCandidateActions,
  buildNextActions,
  daysUntil,
  type NextActionsContext,
} from "../src/lib/nextActions";
import {
  ADVISOR_SYSTEM_PROMPT,
  buildAdvisorBrief,
  isTrustworthyReply,
  rulesAdvice,
  type AdvisorInput,
} from "../src/lib/advisor";
import type { ChancingResult } from "../src/lib/chancing";

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

const TODAY = new Date(Date.UTC(2026, 8, 25)); // 25 Sep 2026

const baseContext: NextActionsContext = {
  today: TODAY,
  completeness: 0.9,
  deadlines: [],
  applications: [],
  hasEnglishTest: true,
  needsEnglishTest: true,
  hasStandardizedTest: true,
  requiresStandardizedTest: false,
  hasEssay: true,
  recommendationsRequested: true,
  savedUniversityCount: 8,
  savedScholarshipCount: 5,
  openTaskCount: 2,
  requiresFullScholarship: false,
  submittedWithoutOutcome: 0,
  graduationYear: 2028,
};

const chance = (over: Partial<ChancingResult> & { universityName: string }): ChancingResult =>
  ({
    universityId: 1,
    fitScore: 78,
    admission: { low: 18, high: 27, mid: 22, band: "reach", label: "Reach" },
    subScores: {
      academicFit: 80,
      testFit: 75,
      extracurricularFit: 60,
      majorFit: 90,
      internationalFactors: 65,
      financialFit: 70,
    },
    positives: ["Strong GPA for this programme"],
    negatives: ["SAT below the published 25th percentile"],
    confidence: 55,
    dataBasis: "public-estimate",
    sampleSize: 0,
    disclaimer: "Model estimate — not a guarantee.",
    ...over,
  }) as ChancingResult;

const advisorInput: AdvisorInput = {
  studentName: "Aziza",
  profile: {
    gpa: 3.8,
    gpaScale: 4,
    ieltsScore: 7.5,
    country: "Uzbekistan",
    targetMajor: "Computer Science",
    degreeLevel: "Bachelor",
    careerGoal: "ML engineer",
    budgetAnnualUsd: 40000,
  },
  completenessPct: 88,
  chances: [chance({ universityName: "Ivy Selective University" })],
  nextActions: buildNextActions(baseContext, 3).actions,
  question: "Is my university list balanced?",
};

// ---------------------------------------------------------------------------
section("1. Roadmap always returns exactly three actions");

check("three actions by default", buildNextActions(baseContext).actions.length === 3);
check("never empty", buildNextActions(baseContext).actions.length > 0);
check("a headline is produced", buildNextActions(baseContext).headline.length > 10);
check(
  "actions are sorted by score, highest first",
  (() => {
    const all = buildCandidateActions({ ...baseContext, completeness: 0.2, hasEnglishTest: false });
    return all.every((a, i) => i === 0 || all[i - 1].score >= a.score);
  })()
);
check("limit is respected", buildNextActions(baseContext, 5).actions.length <= 5);

section("2. Deadlines dominate");

const withOverdue = buildNextActions({
  ...baseContext,
  deadlines: [
    { id: "app-1", title: "Purdue — Computer Science", type: "application", daysRemaining: -3 },
    { id: "app-2", title: "TUM — Informatics", type: "application", daysRemaining: 40 },
  ],
});
check("an overdue deadline is action #1", /Overdue: Purdue/.test(withOverdue.actions[0].title));
check("an overdue deadline is critical", withOverdue.actions[0].urgency === "critical");
check("the dashboard counts it", withOverdue.criticalCount === 1);
check("the headline says so", /today/i.test(withOverdue.headline));

const withNear = buildNextActions({
  ...baseContext,
  deadlines: [{ id: "app-3", title: "ETH Zurich", type: "application", daysRemaining: 5 }],
});
check("a 5-day deadline is critical", withNear.actions[0].urgency === "critical");
check("a 5-day deadline outranks polish work", /ETH Zurich/.test(withNear.actions[0].title));

const withFar = buildNextActions({
  ...baseContext,
  deadlines: [{ id: "app-4", title: "Far Away University", type: "application", daysRemaining: 200 }],
});
check(
  "a deadline 200 days out is not in the top three",
  !withFar.actions.some((a) => /Far Away/.test(a.title))
);

section("3. Blockers beat polish");

const missingTest = buildNextActions({ ...baseContext, hasEnglishTest: false });
check("a missing English test makes the top three", missingTest.actions.some((a) => a.id === "book-english-test"));

// Both actions must actually exist before their order means anything.
const thinShortlistNoTest = buildNextActions({
  ...baseContext,
  hasEnglishTest: false,
  savedUniversityCount: 2,
});
check(
  "both candidates are present in the ordering fixture",
  thinShortlistNoTest.rest.concat(thinShortlistNoTest.actions).some((a) => a.id === "book-english-test") &&
    thinShortlistNoTest.rest.concat(thinShortlistNoTest.actions).some((a) => a.id === "balance-shortlist")
);
check(
  "a missing English test outranks widening the shortlist",
  thinShortlistNoTest.actions.findIndex((a) => a.id === "book-english-test") <
    thinShortlistNoTest.actions.findIndex((a) => a.id === "balance-shortlist")
);

const withTest = buildNextActions({ ...baseContext, hasEnglishTest: true });
check(
  "no test reminder once a score is on file",
  !withTest.actions.some((a) => a.id === "book-english-test")
);

const thinProfile = buildNextActions({ ...baseContext, completeness: 0.3 });
check("a 30% profile gets a 'finish your profile' action", thinProfile.actions.some((a) => a.id === "complete-profile"));
check(
  "a thin profile reframes the headline",
  /profile is still thin/i.test(thinProfile.headline)
);

const noShortlist = buildNextActions({
  ...baseContext,
  savedUniversityCount: 0,
  applications: [],
});
check("an empty shortlist triggers 'build a shortlist'", noShortlist.actions.some((a) => a.id === "build-shortlist"));

const noRecommendations = buildNextActions({
  ...baseContext,
  recommendationsRequested: false,
  applications: [{ id: 7, universityName: "Purdue", status: "essay", deadlineDaysRemaining: 60 }],
});
check(
  "missing recommendation letters surface as an action",
  noRecommendations.actions.some((a) => a.id === "request-recommendations")
);

const needsFull = buildNextActions({ ...baseContext, requiresFullScholarship: true, savedScholarshipCount: 1 });
check(
  "full-scholarship need with few saved scholarships surfaces",
  needsFull.actions.some((a) => a.id === "scholarship-portfolio")
);

section("4. Determinism");

const runA = buildNextActions({ ...baseContext, completeness: 0.55, hasEnglishTest: false });
const runB = buildNextActions({ ...baseContext, completeness: 0.55, hasEnglishTest: false });
check(
  "the same context produces the same order every time",
  JSON.stringify(runA.actions.map((a) => a.id)) === JSON.stringify(runB.actions.map((a) => a.id))
);
check(
  "daysUntil handles a past date",
  daysUntil(TODAY, "2026-09-20") === -5,
  `got ${daysUntil(TODAY, "2026-09-20")}`
);
check("daysUntil tolerates null", daysUntil(TODAY, null) === null);
check("daysUntil tolerates garbage", daysUntil(TODAY, "not-a-date") === null);

section("5. Advisor brief contains only real numbers");

const brief = buildAdvisorBrief(advisorInput);
check("the brief names the student", brief.includes("Aziza"));
check("the brief keeps fit and admission separate", /fit 78%, admission estimate 18–27%/.test(brief));
check("the brief lists the weak points", brief.includes("SAT below the published 25th percentile"));
check("the brief carries the question", brief.includes("Is my university list balanced?"));
check("the brief states the completeness figure", brief.includes("88% complete"));

section("6. Hallucinated numbers are rejected");

check(
  "a reply quoting a real figure is accepted",
  isTrustworthyReply(
    "Your fit at Ivy Selective is 78%, and the model puts admission at 18–27%. Focus on the essays.",
    advisorInput
  ).ok
);
check(
  "a reply inventing 63% is rejected",
  !isTrustworthyReply("You have a 63% chance of admission at Ivy Selective.", advisorInput).ok
);
check(
  "the rejection names the invented number",
  (isTrustworthyReply(
    "Based on your 3.8 GPA you have roughly a 63% chance of being admitted to Ivy Selective this cycle.",
    advisorInput
  ).reason ?? "").includes("63")
);
check(
  "a guaranteed-outcome reply is rejected",
  !isTrustworthyReply(
    "With a 3.8 GPA you are guaranteed admission to Ivy Selective University.",
    advisorInput
  ).ok
);
check("an empty reply is rejected", !isTrustworthyReply("", advisorInput).ok);
check("a stub reply is rejected", !isTrustworthyReply("Yes.", advisorInput).ok);
check("the system prompt forbids invented numbers", /never compute, estimate, adjust or invent/i.test(ADVISOR_SYSTEM_PROMPT));
check("the system prompt keeps fit and admission apart", /FIT vs ADMISSION are different things/.test(ADVISOR_SYSTEM_PROMPT));
check("the system prompt forbids guarantees", /NO GUARANTEES/.test(ADVISOR_SYSTEM_PROMPT));

section("7. Rules-based advice stands alone");

const advice = rulesAdvice(advisorInput);
check("advice has a summary", advice.summary.length > 40);
check("advice is flagged as rules-based", advice.source === "rules");
check("advice gives exactly three steps", advice.steps.length === 3);
check("advice lists strengths", advice.strengths.length > 0);
check("advice lists risks", advice.risks.length > 0);
check("advice has a strategy line", advice.strategy.length > 20);
check(
  "an all-reach list is called out",
  /no safety/i.test(rulesAdvice(advisorInput).risks.join(" ") + rulesAdvice(advisorInput).strategy)
);

const balanced = rulesAdvice({
  ...advisorInput,
  chances: [
    chance({ universityName: "Reach U", admission: { low: 8, high: 14, mid: 11, band: "reach", label: "Reach" } }),
    chance({ universityName: "Target U", admission: { low: 35, high: 50, mid: 42, band: "target", label: "Target" } }),
    chance({ universityName: "Safety U", admission: { low: 70, high: 85, mid: 78, band: "safety", label: "Safety" } }),
  ],
});
check("a balanced list gets a different strategy", /Balanced list: 1 reach, 1 target, 1 safety/.test(balanced.strategy));
check("a balanced list raises no safety warning", !balanced.risks.some((r) => /no safety/i.test(r)));

const emptyList = rulesAdvice({ ...advisorInput, chances: [] });
check("an empty shortlist tells the student to build one", /build a shortlist/i.test(emptyList.summary + emptyList.strategy));
check("an empty shortlist still returns three steps", emptyList.steps.length === 3);

const noEnglish = rulesAdvice({
  ...advisorInput,
  profile: { ...advisorInput.profile, ieltsScore: null, toeflScore: null, duolingoScore: null },
});
check("a missing English test is named as a risk", noEnglish.risks.some((r) => /English test/i.test(r)));

// ---------------------------------------------------------------------------
console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
