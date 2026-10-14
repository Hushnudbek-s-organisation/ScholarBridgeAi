/**
 * Deterministic checks for the Personalized Roadmap (#4) and the AI
 * Admissions Advisor (#3) decision logic.
 *
 * Both modules are pure, so the behaviour the product promises can be pinned
 * here without Postgres or an API key:
 *   1. The dashboard shows grounded actions based on tracked records and dates.
 *   2. Missing test scores are not treated as programme requirements or tasks.
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
  type AdvisorFitComparison,
  type AdvisorInput,
  type AdvisorRuleKey,
  type AdvisorRuleTranslator,
} from "../src/lib/advisor";
import enMessages from "../src/i18n/messages/en.json";
import uzMessages from "../src/i18n/messages/uz.json";
import ruMessages from "../src/i18n/messages/ru.json";
import { buildProfileReport, type ReportFacts, type ReportTranslator } from "../src/lib/profileReportFallback";

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

const enRuleMessages = enMessages.ai.advisorRules as Record<string, string>;
const translateEn: AdvisorRuleTranslator = (key: AdvisorRuleKey, values = {}) => {
  let message = enRuleMessages[key] ?? key;
  for (const [name, value] of Object.entries(values)) {
    message = message.replaceAll(`{${name}}`, String(value));
  }
  return message;
};

const reportTranslator = (messages: Record<string, string>): ReportTranslator => (key, values = {}) => {
  let message = messages[key] ?? key;
  for (const [name, value] of Object.entries(values)) {
    message = message.replaceAll(`{${name}}`, String(value));
  }
  return message;
};
const translateReportEn = reportTranslator(enMessages.profileReport as Record<string, string>);
const translateReportUz = reportTranslator(uzMessages.profileReport as Record<string, string>);
const translateReportRu = reportTranslator(ruMessages.profileReport as Record<string, string>);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TODAY = new Date(Date.UTC(2026, 8, 25)); // 25 Sep 2026

const baseContext: NextActionsContext = {
  deadlines: [],
  applications: [],
  recommendationApplicationIds: [],
  savedUniversityCount: 8,
  savedScholarshipCount: 5,
  openTaskCount: 2,
  requiresFullScholarship: false,
  submittedWithoutOutcome: 0,
};

const comparison = (over: Partial<AdvisorFitComparison> & { universityName: string }): AdvisorFitComparison => ({
  universityId: 1,
  fitScore: 78,
  positives: ["The recorded field aligns with this catalogue entry"],
  negatives: ["The university-level SAT catalogue figure needs programme-level verification"],
  ...over,
});

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
  comparisons: [comparison({ universityName: "Ivy Selective University" })],
  nextActions: buildNextActions(baseContext, 3).actions,
  question: "Is my university list balanced?",
};

// ---------------------------------------------------------------------------
section("1. Roadmap returns up to three grounded actions");

check("the roadmap does not pad the list to a fixed count", buildNextActions(baseContext).actions.length > 0 && buildNextActions(baseContext).actions.length <= 3);
check("the list may be shorter when no further tailored action is supported", buildNextActions(baseContext).actions.length === 2);
check("a headline is produced", buildNextActions(baseContext).headline.length > 10);
check(
  "actions are sorted by score, highest first",
  (() => {
    const all = buildCandidateActions({ ...baseContext, openTaskCount: 1 });
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
check("an overdue tracked deadline is action #1", /Past tracked deadline: Purdue/.test(withOverdue.actions[0].title));
check("an overdue deadline is critical", withOverdue.actions[0].urgency === "critical");
check("the dashboard counts it", withOverdue.criticalCount === 1);
// An overdue deadline is NOT "today": the headline must say the date passed,
// and must not claim the student still has time.
check(
  "the headline says the deadline has passed",
  /passed/i.test(withOverdue.headline) && !/needs you today/i.test(withOverdue.headline),
  withOverdue.headline
);

const withNear = buildNextActions({
  ...baseContext,
  deadlines: [{ id: "app-3", title: "ETH Zurich", type: "application", daysRemaining: 5 }],
});
check("a future deadline is shown without a generic urgency window", withNear.actions[0].urgency === "medium");
check("a 5-day deadline outranks polish work", /ETH Zurich/.test(withNear.actions[0].title));

const withFar = buildNextActions({
  ...baseContext,
  deadlines: [{ id: "app-4", title: "Far Away University", type: "application", daysRemaining: 200 }],
});
check(
  "a distant tracked deadline remains visible without a fixed preparation window",
  withFar.actions.some((action) => /Far Away/.test(action.title))
);

section("3. Optional tests and contextual actions");

const withSavedProgrammes = buildNextActions({ ...baseContext, savedUniversityCount: 2 });
check(
  "missing test scores do not create generic English or standardized-test tasks",
  !withSavedProgrammes.actions.concat(withSavedProgrammes.rest).some((action) => /test|IELTS|TOEFL|SAT|ACT|GRE/i.test(`${action.title} ${action.why}`))
);
check(
  "the application count does not create an arbitrary shortlist target",
  !withSavedProgrammes.actions.concat(withSavedProgrammes.rest).some((action) => /add (?:at least )?\d+ (?:applications?|universities)/i.test(action.why))
);

const noShortlist = buildNextActions({
  ...baseContext,
  savedUniversityCount: 0,
  applications: [],
});
check("an empty shortlist triggers 'build a shortlist'", noShortlist.actions.some((action) => action.id === "build-shortlist"));

const noRecommendations = buildNextActions({
  ...baseContext,
  recommendationApplicationIds: [],
  applications: [{ id: 7, universityName: "Purdue", status: "essay", deadlineDaysRemaining: 60 }],
});
check(
  "a missing recommendation record prompts verification, not a universal request or lead time",
  noRecommendations.actions.some((action) => action.id === "check-recommendations") &&
    /Purdue/.test(noRecommendations.actions.find((action) => action.id === "check-recommendations")!.why) &&
    /Timing varies/i.test(noRecommendations.actions.find((action) => action.id === "check-recommendations")!.why)
);

const needsFull = buildNextActions({ ...baseContext, requiresFullScholarship: true, savedScholarshipCount: 0 });
check(
  "an explicit full-scholarship need with no saved options surfaces a funding review",
  needsFull.actions.some((action) => action.id === "scholarship-portfolio")
);

section("4. Determinism");

const runA = buildNextActions({ ...baseContext, openTaskCount: 1 });
const runB = buildNextActions({ ...baseContext, openTaskCount: 1 });
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
// Calendar days, not rounded timestamps: a date ON the reference day is 0
// (due today, not overdue) and the next day is 1, whatever the time of day.
check("a date on the reference day is 0 days away", daysUntil(TODAY, "2026-09-25") === 0);
check(
  "a date on the reference day is never negative, at any hour",
  daysUntil(new Date(Date.UTC(2026, 8, 25, 23, 59)), "2026-09-25") === 0
);
check("the next calendar day is 1 day away", daysUntil(TODAY, "2026-09-26") === 1);
check(
  "the next calendar day is 1 even late at night",
  daysUntil(new Date(Date.UTC(2026, 8, 25, 23, 59)), "2026-09-26") === 1
);

const dueToday = buildNextActions({
  ...baseContext,
  deadlines: [{ id: "app-9", title: "Purdue — due today", type: "application", daysRemaining: 0 }],
});
check("a deadline due today is labeled as tracked and due today", /^Tracked deadline today: /.test(dueToday.actions[0].title));
check("a deadline due today is critical", dueToday.actions[0].urgency === "critical");
check("a deadline due today is not called overdue", !/Overdue/.test(dueToday.actions[0].title));
check("its headline says the tracked deadline is due today", /due today/i.test(dueToday.headline), dueToday.headline);

const mixed = buildNextActions({
  ...baseContext,
  deadlines: [
    { id: "app-7", title: "Overdue one", type: "application", daysRemaining: -4 },
    { id: "app-8", title: "Due today", type: "application", daysRemaining: 0 },
  ],
});
check(
  "a mixed list says what passed AND what is due today",
  /passed/i.test(mixed.headline) && /due today/i.test(mixed.headline),
  mixed.headline
);

section("5. Advisor brief contains only real numbers");

const brief = buildAdvisorBrief(advisorInput);
check("the brief names the student", brief.includes("Aziza"));
// PROBABILITY POLICY: the brief carries the fit score but deliberately
// carries NO admission probability — the model may not invent one, so the
// brief must not hand it a number to quote either.
check(
  "the brief keeps fit and admission probability separate",
  /fit 78%/.test(brief) &&
    /Admission probability: UNAVAILABLE/.test(brief) &&
    !/\b18\b|\b27\b/.test(brief)
);
check("the brief labels catalogue signals for verification", brief.includes("comparison signals to verify") && brief.includes("university-level SAT catalogue figure needs programme-level verification"));
check("the brief carries the question", brief.includes("Is my university list balanced?"));
check("the brief does not present an arbitrary profile-completeness target", !/profile[^\n]*(?:complete|\d+%)/i.test(brief));

section("6. Hallucinated numbers are rejected");

check("a reply inventing an admission probability is still rejected", (() => {
  const r = isTrustworthyReply(
    "Your fit at Ivy Selective is 78%, and the model puts your admission probability at 18%.",
    advisorInput
  );
  return !r.ok;
})());
check(
  "a reply quoting a real figure is accepted",
  isTrustworthyReply(
    "Your fit at Ivy Selective is 78%, and that is a requirements match. We do not provide an admission probability — treat the fit score as a match, not as odds.",
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
check("the system prompt forbids invented numbers", /never\s+compute,\s*estimate,\s*adjust\s+or invent/i.test(ADVISOR_SYSTEM_PROMPT));
check(
  "the system prompt keeps fit and admission probability apart",
  /FIT IS NOT ADMISSION PROBABILITY/.test(ADVISOR_SYSTEM_PROMPT)
);
check("the system prompt forbids guarantees", /NO GUARANTEES/.test(ADVISOR_SYSTEM_PROMPT));

section("7. Rules-based advice stands alone");

const advice = rulesAdvice(advisorInput, translateEn);
check("advice has a summary", advice.summary.length > 40);
check("advice is flagged as rules-based", advice.source === "rules");
check("advice returns only evidence-supported steps", advice.steps.length > 0 && advice.steps.length <= 3);
check("advice lists strengths", advice.strengths.length > 0);
check("the advisor does not create generic risks from optional fields", advice.risks.length === 0);
check("advice has a strategy line", advice.strategy.length > 20);
// The engine compares profile and catalogue fields, not admission-odds tiers.
const stretchOnly = rulesAdvice({
  ...advisorInput,
  comparisons: [comparison({ universityName: "Stretch U", fitScore: 40 })],
}, translateEn);
check(
  "a low fit score is not converted into an admissions tier or risk label",
  stretchOnly.risks.length === 0 && !/reach|match|safety|chance of admission/i.test(stretchOnly.strategy)
);

const variedFitScores = rulesAdvice({
  ...advisorInput,
  comparisons: [
    comparison({ universityName: "Lower Fit U", fitScore: 40 }),
    comparison({ universityName: "Middle Fit U", fitScore: 75 }),
    comparison({ universityName: "Higher Fit U", fitScore: 90 }),
  ],
}, translateEn);
check(
  "the advisor compares the recorded fit range without assigning admissions tiers",
  /Lower Fit U/.test(variedFitScores.strategy) && /does not establish eligibility or predict/i.test(variedFitScores.strategy)
);
check(
  "fit scores are not converted into unverified requirements claims",
  !variedFitScores.risks.some((r) => /guaranteed|meets all requirements|admission odds/i.test(r))
);

const emptyList = rulesAdvice({ ...advisorInput, comparisons: [] }, translateEn);
check("an empty shortlist tells the student to add genuine target programmes", /genuinely consider/i.test(emptyList.summary + emptyList.strategy));
check("an empty shortlist gets only evidence-based steps", emptyList.steps.length > 0 && emptyList.steps.length <= 3);
check("an empty shortlist does not advise booking a test", !emptyList.steps.some((step) => /book|register for.*test/i.test(step)));

const noEnglish = rulesAdvice({
  ...advisorInput,
  profile: { ...advisorInput.profile, ieltsScore: null, toeflScore: null, duolingoScore: null },
}, translateEn);
check(
  "an absent English score alone does not create a test recommendation",
  !/IELTS|TOEFL|Duolingo|book a test|English test/i.test(noEnglish.risks.join(" ") + noEnglish.steps.join(" "))
);
check("recorded GPA is not claimed to clear most requirements", !advice.strengths.join(" ").includes("clears the published minimum"));
check("recorded English score is not described as universally sufficient", !advice.strengths.join(" ").includes("typical requirement"));

section("8. Profile reports stay grounded in current fit data");

const reportFacts: ReportFacts = {
  name: "Amina",
  degreeLevel: "Bachelor",
  targetMajor: "Computer Science",
  gpa: 3.7,
  gpaScale: 4,
  ieltsScore: null,
  budgetAnnualUsd: 12000,
  needScholarship: true,
  workExperienceYears: 0,
  researchPublications: 0,
  extracurriculars: null,
  programmeMatches: [
    { name: "Programme Alpha", country: "Uzbekistan", score: 72, reason: "Major field recorded", issue: null },
    { name: "Programme Beta", country: "Canada", score: 61, reason: null, issue: "Budget data differs" },
  ],
  scholarships: [],
};
const reportEn = buildProfileReport(reportFacts, translateReportEn);
const reportUz = buildProfileReport(reportFacts, translateReportUz);
const reportRu = buildProfileReport(reportFacts, translateReportRu);
check("profile report lists current catalogue comparisons", /Programme Alpha/.test(reportEn) && /72%/.test(reportEn));
check("profile report is clearly a draft and directs official verification", /draft/i.test(reportEn) && /official pages/i.test(reportEn));
check("profile report does not produce readiness/completeness scores or tiers", !/readiness score|profile completeness|\\breach\\b|\\bsafety\\b/i.test(reportEn));
check("profile report next step asks to verify exact programme requirements", /Verify Programme Alpha.*official pages/i.test(reportEn));
check("profile report does not invent documents, references, or essay prescriptions", !/two academic references|statement of purpose draft|visa document/i.test(reportEn));
check("an absent scholarship list is not described as no funding exists", /does not mean that no funding is available/i.test(reportEn));
check("Uzbek and Russian report copies are localized", /Dastur|moslik/i.test(reportUz) && /программ|соответств/i.test(reportRu));

// ---------------------------------------------------------------------------
console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
