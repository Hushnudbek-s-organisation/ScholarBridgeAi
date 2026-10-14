/**
 * Deterministic checks for the recommendation letter helper (src/lib/recLetter.ts).
 *
 * The helper must stay pure and honest:
 *   1. Talking points come ONLY from profile data that exists.
 *   2. An empty profile produces zero talking points and a full gap list —
 *      never invented facts.
 *   3. Outline sections appear only when the facts for them exist.
 *   4. The checklist carries a supplied deadline without asserting universal timing.
 *
 * Run: npm run test:rec-letter
 */

import { buildRecLetterBrief, type RecLetterProfile } from "../src/lib/recLetter";

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
const full: RecLetterProfile = {
  name: "Aziza Karimova",
  gpa: 3.9,
  gpaScale: 4,
  ieltsScore: 7.5,
  targetMajor: "Computer Science",
  olympiads: '["Math Olympiad 2024"]',
  awards: '["Best Paper 2025"]',
  leadership: '["Robotics Club President"]',
  researchExperience: '["ML research assistant"]',
  volunteering: '["Coding for seniors"]',
  workExperienceYears: 1,
};

const empty: RecLetterProfile = {
  name: null,
  gpa: null,
  gpaScale: null,
  ieltsScore: null,
  toeflScore: null,
  satScore: null,
  actScore: null,
  greScore: null,
  duolingoScore: null,
  country: null,
  targetMajor: null,
  extracurriculars: null,
  leadership: null,
  volunteering: null,
  sports: null,
  clubs: null,
  researchExperience: null,
  projects: null,
  olympiads: null,
  awards: null,
  competitions: null,
  certificates: null,
  workExperienceYears: null,
  researchPublications: null,
  budgetAnnualUsd: null,
  careerGoal: null,
  graduationYear: null,
};

const opts = {
  universityTitle: "Technical University of Munich",
  deadline: "2027-01-15",
  relationshipContext: "Computer Science teacher and robotics mentor for two years",
  requestedFocus: "independent research and mentoring younger students",
  supportingExample: "the robotics project where Aziza documented the testing process and coached new members",
};

// ---------------------------------------------------------------------------
section("1. Talking points use only real data");

const fullBrief = buildRecLetterBrief(full, opts);
check("GPA point with the 4.0 conversion", fullBrief.talkingPoints.includes("GPA 3.9 on a 4 scale (3.90/4.0)"), fullBrief.talkingPoints.join(" | "));
check("English point from the real score", fullBrief.talkingPoints.includes("IELTS 7.5"));
check("Olympiad point", fullBrief.talkingPoints.includes("Olympiad: Math Olympiad 2024"));
check("Award point", fullBrief.talkingPoints.includes("Award: Best Paper 2025"));
check("Leadership point", fullBrief.talkingPoints.includes("Leadership: Robotics Club President"));
check("Research point", fullBrief.talkingPoints.includes("Research: ML research assistant"));
check("Community point", fullBrief.talkingPoints.includes("Community: Coding for seniors"));
check("Work-experience point", fullBrief.talkingPoints.includes("1 year of work experience"));
check("a complete profile reports no gaps", fullBrief.dataMissing.length === 0, fullBrief.dataMissing.join(" | "));
const fullAdviceKeys = fullBrief.personalizationAdvice.map((item) => item.key);
check("profile-specific advice reflects all three customization fields", fullAdviceKeys.includes("relationshipProvided") && fullAdviceKeys.includes("focusProvided") && fullAdviceKeys.includes("exampleProvided"));
check("profile-specific advice uses verified achievements and academic context", fullAdviceKeys.includes("evidencePresent") && fullAdviceKeys.includes("academicContext"));

const emptyBrief = buildRecLetterBrief(empty, { universityTitle: opts.universityTitle, deadline: opts.deadline });
check("an empty profile produces zero talking points", emptyBrief.talkingPoints.length === 0, emptyBrief.talkingPoints.join(" | "));
check("an empty profile lists what is missing", emptyBrief.dataMissing.length >= 5, emptyBrief.dataMissing.join(" | "));
check("missing GPA is named", emptyBrief.dataMissing.includes("GPA and scale"));
check("missing leadership is named", emptyBrief.dataMissing.includes("Leadership roles"));
check("missing major is named so the brief can be targeted", emptyBrief.dataMissing.includes("Intended major or program"));
check("empty-profile advice explains how to add evidence without inventing it", emptyBrief.personalizationAdvice.some((item) => item.key === "evidenceMissing"));
check("empty-profile advice has a fully localizable focus prompt without a fabricated field", emptyBrief.personalizationAdvice.some((item) => item.key === "focusMissingNoMajor"));

const gpaOnly = buildRecLetterBrief({ ...empty, gpa: 3.7, gpaScale: 5 }, {});
check("5-point 3.7 is converted to 2.96/4.0, not copied", gpaOnly.talkingPoints[0] === "GPA 3.7 on a 5 scale (2.96/4.0)", gpaOnly.talkingPoints[0]);

section("2. Outline placement");

check("opening names the student", fullBrief.outline[0].draft.includes("Aziza Karimova"), fullBrief.outline[0].draft);
check("opening names the university and major", fullBrief.outline[0].draft.includes("Technical University of Munich program in Computer Science"));
check("full profile receives a detailed outline", fullBrief.outline.length >= 8, fullBrief.outline.map((o) => o.section).join(","));
const evidenceOutline = fullBrief.outline.find((o) => o.section === "Leadership, research, and initiative")?.draft ?? "";
const closingOutline = fullBrief.outline.find((o) => o.section === "Closing endorsement")?.draft ?? "";
check("the recommender brief has no fixed example-count rule", /no universal number/i.test(evidenceOutline) && !/no more than two/i.test(evidenceOutline));
check("the closing selects evidence according to the letter's purpose and length", /purpose and length allow/i.test(closingOutline) && !/two strongest examples/i.test(closingOutline));
check("opening names the supplied recommender context and asks for verification", fullBrief.outline[0].draft.includes(opts.relationshipContext) && /verify/i.test(fullBrief.outline[0].draft));
check("academic section carries the real GPA and warns against unsupported claims", fullBrief.outline.find((o) => o.section === "Academic strengths")?.draft.includes("3.9") === true && /personally observed/i.test(fullBrief.outline.find((o) => o.section === "Academic strengths")?.draft ?? ""));
check("leadership section carries the real role and gives a specific evidence prompt", fullBrief.outline.find((o) => o.section === "Leadership, research, and initiative")?.draft.includes("Robotics Club President") === true && /responsibility.*challenge|challenge.*action/i.test(fullBrief.outline.find((o) => o.section === "Leadership, research, and initiative")?.draft ?? ""));
check("character section carries the real volunteering and requests a concrete example", fullBrief.outline.find((o) => o.section === "Character and commitment")?.draft.includes("Coding for seniors") === true && /specific moment/i.test(fullBrief.outline.find((o) => o.section === "Character and commitment")?.draft ?? ""));
check("student-requested focus is clearly marked for verification", fullBrief.outline.some((o) => o.section.includes("Student-requested") && o.draft.includes(opts.requestedFocus) && /not as a verified claim/i.test(o.draft)));
check("student-suggested example is included but must be independently checked", fullBrief.outline.some((o) => o.section.includes("Student-suggested") && o.draft.includes(opts.supportingExample) && /verify it independently/i.test(o.draft)));
check("empty profile keeps only opening and closing", emptyBrief.outline.length === 2, emptyBrief.outline.map((o) => o.section).join(","));

section("3. No fabrication");

const awardsNull = buildRecLetterBrief({ ...full, awards: null, olympiads: null, competitions: null }, {});
check("no awards in the profile → none invented", !JSON.stringify(awardsNull.outline).includes("Best Paper"));
check("no awards → the gap is listed", awardsNull.dataMissing.includes("Awards, olympiads or competitions"));

section("4. Checklist and determinism");

check("a supplied deadline is included without a universal lead-time rule", fullBrief.checklist[0].includes("2027-01-15") && /portal cutoff|time zone/i.test(fullBrief.checklist[0]), fullBrief.checklist[0]);
check("without a supplied deadline, timing is agreed with the recommender", /what timing works|no universal lead time/i.test(buildRecLetterBrief(full, {}).checklist[0]));
check("request, submission and reminder guidance has no fixed week count", !/4–6 weeks|two weeks early|about a week before/i.test(fullBrief.checklist.join(" ")));
check("five checklist steps", fullBrief.checklist.length === 5, `got ${fullBrief.checklist.length}`);
check("forUniversity and deadline are echoed", fullBrief.forUniversity === "Technical University of Munich" && fullBrief.deadline === "2027-01-15");
check(
  "same input → same output",
  JSON.stringify(buildRecLetterBrief(full, opts)) === JSON.stringify(buildRecLetterBrief(full, opts))
);

// ---------------------------------------------------------------------------
console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
