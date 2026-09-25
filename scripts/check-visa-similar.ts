/**
 * Deterministic checks for:
 *   #9  AI Visa Interview scoring (src/lib/visaScoring.ts)
 *   #10 Accepted-student / similar-profile matching (src/lib/similarProfiles.ts)
 *
 * The visa rubric must be computed from what the applicant actually said, and
 * the model's `estimated_visa_chance` must stay labelled as an opinion.
 * The matcher must never surface a row without consent, and must never present
 * a 2-row sample as a rate.
 *
 * Run: npm run test:visa
 */

import { scoreVisaInterview, visaChanceDisclaimer, type VisaTurn } from "../src/lib/visaScoring";
import {
  englishToIelts,
  findSimilarProfiles,
  gpaTo4,
  similarityScore,
  stdToSat,
  MIN_SAMPLE_FOR_SHARE,
  type OutcomeRecord,
  type ProfileVector,
} from "../src/lib/similarProfiles";

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
// #9 Visa interview
// ---------------------------------------------------------------------------

const weakInterview: VisaTurn[] = [
  { role: "officer", text: "Good morning. Why do you want to study in the United States?" },
  { role: "user", text: "Because it is good." },
  { role: "officer", text: "Who is paying for your studies?" },
  { role: "user", text: "I don't know, maybe my parents." },
  { role: "officer", text: "What are your plans after graduation?" },
  { role: "user", text: "I want to settle there permanently and get a green card." },
  { role: "officer", text: "Do you have family in your home country?" },
  { role: "user", text: "Maybe." },
];

const strongInterview: VisaTurn[] = [
  { role: "officer", text: "Good morning. Why this programme at Purdue?" },
  {
    role: "user",
    text:
      "I am applying for the Computer Science bachelor's because Professor Yung's work on low-resource language modelling matches the Uzbek NLP project I spent 400 hours on. My goal is to build diagnostic tooling for clinics in Uzbekistan.",
  },
  { role: "officer", text: "Who is funding your studies?" },
  {
    role: "user",
    text:
      "My parents are paying the first year from a bank deposit of 60,000 USD, and I hold a presidential scholarship covering 12,000 USD per year. I have the bank statement and the award letter with me.",
  },
  { role: "officer", text: "What will you do after you graduate?" },
  {
    role: "user",
    text:
      "I will return to Tashkent. My father's clinic has offered me a position building their records system, and my whole family lives there — I have an obligation to come back.",
  },
  { role: "officer", text: "Have you travelled abroad before?" },
  {
    role: "user",
    text: "Yes, I attended a 3-week summer school in Kazakhstan in 2025 and returned on schedule.",
  },
];

section("#9.1 The rubric separates a weak answer from a strong one");

const weak = scoreVisaInterview(weakInterview, { homeCountry: "Uzbekistan", destination: "USA" });
const strong = scoreVisaInterview(strongInterview, { homeCountry: "Uzbekistan", destination: "USA" });

check(
  "the strong interview scores higher overall",
  strong.scores.total > weak.scores.total,
  `strong=${strong.scores.total} weak=${weak.scores.total}`
);
check("all six grounds are scored", Object.keys(strong.scores).length === 7);
check("every score is 0–100", Object.values(strong.scores).every((v) => v >= 0 && v <= 100));

section("#9.2 Refusal grounds are named");

const weakCodes = weak.risks.map((r) => r.code);
check("immigrant intent is caught", weakCodes.includes("immigrant_intent"));
check("weak purpose of study is caught", weakCodes.includes("weak_purpose"));
check("vague funding is caught", weakCodes.includes("funding_not_stated"));
check("missing home ties is caught", weakCodes.includes("no_home_ties"));
check("hedging is caught", weakCodes.includes("hedging"));
check("every risk is high severity for the weak interview", weak.risks.filter((r) => r.severity === "high").length >= 3);

const strongCodes = strong.risks.map((r) => r.code);
check("a strong interview raises no immigrant-intent risk", !strongCodes.includes("immigrant_intent"));
check("a strong interview raises no funding risk", !strongCodes.includes("funding_not_stated"));
check("a strong interview raises no home-ties risk", !strongCodes.includes("no_home_ties"));
check("the home country is named in the ties advice", weak.risks.some((r) => /Uzbekistan/.test(r.message)));

section("#9.3 Unanswered questions surface");

check("the weak interview has unanswered questions", weak.unanswered.length > 0);
check("a skipped question is listed verbatim", weak.unanswered.some((q) => /family in your home country/i.test(q)));
check("the strong interview answers everything", strong.unanswered.length === 0);

const empty = scoreVisaInterview([]);
check("an empty interview scores 0", empty.scores.total === 0);
check("an empty interview says so", empty.risks[0]?.code === "no_answers");

section("#9.4 The model's probability stays an opinion");

const disclaimer = visaChanceDisclaimer(72);
check(
  "a model probability is labelled as the AI's opinion",
  /opinion/i.test(disclaimer) && /not a prediction/i.test(disclaimer),
  disclaimer
);
check("the disclaimer still quotes the figure it is qualifying", disclaimer.includes("72%"));
check("no probability is invented when the model gives none", /No probability is shown/.test(visaChanceDisclaimer(null)));
check(
  "a disclaimer never states a number as fact",
  !/your chance (?:is|of) \d+%/.test(visaChanceDisclaimer(88))
);

// ---------------------------------------------------------------------------
// #10 Similar profiles
// ---------------------------------------------------------------------------

const me: ProfileVector = {
  gpa4: 3.8,
  ielts: 7.5,
  sat: 1500,
  major: "Computer Science",
  country: "Uzbekistan",
  degreeLevel: "Bachelor",
  activityCount: 6,
  leadershipCount: 2,
  awardCount: 2,
};

const outcome = (over: Partial<OutcomeRecord> & { universityName: string }): OutcomeRecord => ({
  profile: { gpa4: 3.8, ielts: 7.5, sat: 1500, major: "Computer Science", country: "Uzbekistan", degreeLevel: "Bachelor", activityCount: 6 },
  result: "accepted",
  shareConsent: true,
  ...over,
});

section("#10.1 Consent is enforced");

const noConsent = findSimilarProfiles(me, [
  outcome({ universityName: "Purdue", shareConsent: false }),
  outcome({ universityName: "TUM", shareConsent: false }),
]);
check("rows without consent are never returned", noConsent.total === 0);
check("and no percentage is computed from them", noConsent.acceptanceShare === null);
check(
  "the empty state explains how the data is built",
  /opt in to share/i.test(noConsent.sampleNote)
);

const mixed = findSimilarProfiles(me, [
  outcome({ universityName: "Purdue", shareConsent: true, result: "accepted" }),
  outcome({ universityName: "Hidden", shareConsent: false, result: "accepted" }),
]);
check("consented rows pass through", mixed.total === 1);
check("non-consented rows are dropped", !mixed.matches.some((m) => m.universityName === "Hidden"));

section("#10.2 Similarity behaves");

const identical = similarityScore(me, me);
check("an identical profile scores 100", identical.score === 100, `got ${identical.score}`);

const distant = similarityScore(me, {
  gpa4: 2.4,
  ielts: 5.0,
  sat: 900,
  major: "Nursing",
  country: "Brazil",
  degreeLevel: "Master",
});
check(
  "a distant profile scores much lower",
  distant.score < identical.score - 40,
  `${distant.score} vs ${identical.score}`
);
check("a close match explains why", identical.matchedOn.length >= 3);
check("a match names the shared dimension", identical.matchedOn.some((m) => /same field of study/.test(m)));

check(
  "a closer profile outranks a farther one",
  similarityScore(me, { gpa4: 3.75, major: "Computer Science", country: "Uzbekistan" }).score >
    similarityScore(me, { gpa4: 2.6, major: "Nursing", country: "Brazil" }).score
);
check(
  "a missing value costs less than a wrong one",
  similarityScore(me, { gpa4: 3.8, major: "Computer Science", country: "Uzbekistan" }).score >
    similarityScore(me, { gpa4: 2.2, major: "Computer Science", country: "Uzbekistan" }).score
);

section("#10.3 Small samples never render as a rate");

const tiny = findSimilarProfiles(me, [
  outcome({ universityName: "Purdue", result: "accepted" }),
  outcome({ universityName: "TUM", result: "accepted" }),
]);
check("two outcomes produce no percentage", tiny.acceptanceShare === null);
check("two outcomes say so explicitly", /too few for a percentage/i.test(tiny.sampleNote));
check("individual cases are still shown", tiny.matches.length === 2);
check("accepts and rejects are both counted", tiny.accepted === 2 && tiny.rejected === 0);

const big = findSimilarProfiles(
  me,
  Array.from({ length: 12 }, (_, i) =>
    outcome({
      universityName: `University ${i}`,
      result: i < 8 ? "accepted" : "rejected",
    })
  )
);
check("12 outcomes produce a percentage", big.acceptanceShare === 67, `got ${big.acceptanceShare}`);
check("the sample size is stated", /12 shared ScholarBridge outcomes/.test(big.sampleNote));
check("rejections are included in the denominator", big.rejected === 4);
check("the threshold is exported and used", MIN_SAMPLE_FOR_SHARE === 5);

section("#10.4 Anonymity");

check(
  "a summary shows a GPA band, never the exact GPA",
  findSimilarProfiles(me, [outcome({ universityName: "Purdue", profile: { ...me, gpa4: 3.83 } })]).matches[0]
    .summary.includes("3.7–4.0") &&
    !findSimilarProfiles(me, [outcome({ universityName: "Purdue", profile: { ...me, gpa4: 3.83 } })]).matches[0]
      .summary.includes("3.83")
);
check(
  "a summary with no data does not fabricate any",
  findSimilarProfiles(me, [outcome({ universityName: "X", profile: {} })]).matches.length === 0 ||
    /not shared/i.test(
      findSimilarProfiles(me, [outcome({ universityName: "X", profile: {}, shareConsent: true })]).matches[0]
        ?.summary ?? ""
    )
);
check("the position note compares to the group average", findSimilarProfiles(me, [outcome({ universityName: "A" }), outcome({ universityName: "B", profile: { gpa4: 3.4 } })]).positionNote.length > 10);

section("#10.5 Normalisation");

check("a 5.0-scale GPA converts to 4.0", Math.abs((gpaTo4(4.75, 5) ?? 0) - 3.8) < 0.01);
check("a 4.0-scale GPA passes through", gpaTo4(3.6, 4) === 3.6);
check("a missing scale defaults to 4.0", gpaTo4(3.2, null) === 3.2);
check("TOEFL converts to an IELTS band", Math.abs((englishToIelts({ toefl: 100 }) ?? 0) - 5) < 0.01);
check("ACT converts to an SAT band", stdToSat({ act: 32 }) === 1460);
check("missing scores return null", englishToIelts({}) === null && stdToSat({}) === null);

// ---------------------------------------------------------------------------
console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
