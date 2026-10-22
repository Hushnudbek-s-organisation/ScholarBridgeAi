/**
 * Deterministic checks for the Essay rubric (#8).
 *
 * The scores come from the text, not from a model — so two readers get the same
 * score, and a student who improves a draft can see the number move for a reason
 * they can verify.
 *
 * Run: npm run test:essays
 */

import { analyzeEssay, compareVersions, countWords, paragraphs, sentences } from "../src/lib/essay";
import { ESSAY_RUBRIC_SAMPLES, SOP_SAMPLES } from "../src/lib/samples/exemplars";

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

// A weak draft: boilerplate opening, clichés, no evidence, no target named.
const weak = `My name is Aziza Karimova and I am writing to apply for admission.

Ever since I was a child I have been passionate about computers. It has always been my dream to study at a prestigious university and broaden my horizons. In today's world technology is everywhere and I want to be part of it.

I am hardworking and dedicated and I really love to learn new things every day. I believe I would make a difference in the world if given the opportunity to study abroad.

Thank you for considering my application.`;

// A strong draft: concrete opening, numbers, named programme, forward look.
const strong = `At 3 a.m. the training loop finally converged, and the 94% accuracy on our
diabetic-retinopathy set held. I had written the data loader three times.

I learned to programme at 15 on a shared computer in Tashkent, two hours a day,
because that was all the lab allowed. By 17 I had led a team of 6 students
through the national informatics olympiad, where we placed 2nd out of 240 teams.

Last year I worked 400 hours as a research assistant on Uzbek-language NLP. We
published a tokenizer that cut error rates by 18%. I wrote the evaluation harness
myself after the third reviewer said the numbers did not reproduce.

The Computer Science programme at Purdue is where I want to take that work
further. Professor Yung's lab on low-resource language modelling is the closest
match anywhere to the problem I already have, and the CS 352 sequence covers the
distributed-systems background I am missing.

After graduating I plan to build diagnostic tooling for clinics that cannot
afford specialists — starting in the regions where I grew up.`;

const w = analyzeEssay(weak, { targetName: "Purdue University", wordLimit: 650, type: "sop" });
const s = analyzeEssay(strong, { targetName: "Purdue University", wordLimit: 650, type: "sop" });

// ---------------------------------------------------------------------------
section("1. Counting");

check("word count ignores punctuation-only tokens", countWords("hello, world!") === 2);
check("word count on empty text is 0", countWords("   ") === 0);
check("paragraphs split on blank lines", paragraphs("a\n\nb\n\nc").length === 3);
check("sentences split on terminators", sentences("One. Two! Three?").length === 3);

section("2. The rubric separates a good draft from a weak one");

check(
  "the strong draft scores higher overall",
  s.scores.total > w.scores.total,
  `strong=${s.scores.total} weak=${w.scores.total}`
);
check("every sub-score is 0–100", Object.values(s.scores).every((v) => v >= 0 && v <= 100));
check("the total is a weighted blend, not an average", s.scores.total > 0 && s.scores.total <= 100);
check("specificity separates them most", s.scores.specificity - w.scores.specificity >= 30);
check("reading time is derived from word count", Math.abs(s.readingTimeSec - (s.wordCount / 200) * 60) <= 1);

section("3. Weaknesses are named, not just scored");

const weakCodes = w.issues.map((i) => i.code);
check("a boilerplate opening is called out", weakCodes.includes("opening_boilerplate"));
check("clichés are listed", weakCodes.includes("cliches"));
check("the cliché list names the phrase", w.cliches.some((c) => c.phrase === "passionate about"));
check("the cliché list carries counts", w.cliches.every((c) => c.count > 0));
check("unsupported adjectives are flagged", weakCodes.includes("unsupported_adjective"));
check(
  "the numeric-evidence check is caveated rather than treated as proof no evidence exists",
  w.issues.some((i) => i.code === "no_evidence" && i.severity === "warning" && /simple check did not detect/i.test(i.message))
);
check("feedback quotes the student's boilerplate opening", w.issues.some((i) => i.code === "opening_boilerplate" && i.excerpt?.includes("My name is Aziza Karimova")));
check("unsupported self-description feedback quotes exact draft text", w.issues.some((i) => i.code === "unsupported_adjective" && i.excerpt?.includes("I am hardworking")));
check(
  "an unnamed target university is a blocker",
  analyzeEssay(strong, { targetName: "MIT" }).issues.some(
    (i) => i.code === "target_not_named" && i.severity === "blocker"
  )
);
check(
  "short target names are matched as whole words",
  !analyzeEssay("MIT is the programme I am applying to.", { type: "supplemental", targetName: "MIT" }).issues.some((i) => i.code === "target_not_named")
);
check("the weak draft has at least one blocker", w.issues.some((i) => i.severity === "blocker"));

const strongCodes = s.issues.map((i) => i.code);
check("the strong draft has no blockers", !s.issues.some((i) => i.severity === "blocker"));
check("the strong draft names its target", !strongCodes.includes("target_not_named"));
check("the strong draft is not flagged for missing evidence", !strongCodes.includes("no_evidence"));

section("4. Prompt-specific rules");

const whyUs = analyzeEssay(strong, { type: "why_us", targetName: "Purdue University" });
check("a why-us essay naming a professor scores fit", whyUs.scores.fit >= 60);
// The generic variant must contain NONE of the rule's keywords
// (professor / faculty / lab / course / module / curriculum) anywhere — the
// strong draft mentions "the lab allowed" two paragraphs earlier, so a
// single-sentence replacement is not enough.
const KEYWORD_RE = /professor|faculty|\blab\b|course|module|curriculum/i;
const genericText = strong
  .replace(/because that was all the lab allowed/, "because that was all the schedule allowed")
  .replace(/Professor[^\n]*/, "The people there are excellent and I am sure");
check("the generic variant really is keyword-free", !KEYWORD_RE.test(genericText));
const genericWhyUs = analyzeEssay(genericText, {
  type: "why_us",
  targetName: "Purdue University",
});
check(
  "a generic why-us essay is called out",
  genericWhyUs.issues.some((i) => i.code === "why_us_generic")
);

section("5. Flow, action, and prompt coverage stay deterministic and evidence-based");

const stagedEssay = analyzeEssay(
  "I chose this field because I want to solve a problem I saw at home.\n\nI studied statistics and completed relevant coursework at school.\n\nMy research project measured the result and I published the findings with my team.\n\nThis programme's curriculum and lab fit the work I want to continue.\n\nAfter graduation I plan to build tools that improve access to care.",
  { type: "sop" },
);
check("paragraph analysis records a forward-moving narrative sequence", stagedEssay.flowAnalysis.stageSequence.join(",") === "motivation,preparation,evidence,programme_fit,future_impact");
check("logical stage progression is not flagged as an abrupt jump", stagedEssay.flowAnalysis.backwardJumps === 0 && !stagedEssay.issues.some((issue) => issue.code === "abrupt_paragraph_flow"));
const brokenFlow = analyzeEssay("First unrelated topic.\n\nSecond unrelated topic.\n\nThird unrelated topic.\n\nFourth unrelated topic.", { type: "supplemental" });
check("unlinked paragraph flow is identified with a quoted excerpt", brokenFlow.issues.some((issue) => issue.code === "abrupt_paragraph_flow" && Boolean(issue.excerpt)));
const repeatedTransition = analyzeEssay("Opening.\n\nHowever, point two.\n\nHowever, point three.\n\nHowever, point four.", { type: "supplemental" });
check("repeated paragraph transitions are surfaced", repeatedTransition.issues.some((issue) => issue.code === "repeated_transition"));
const agencyEssay = analyzeEssay("I helped with a survey. I participated in two meetings. I engineered the data pipeline and spearheaded the release.", { type: "supplemental" });
check("specific action verbs and weaker phrases are counted separately", agencyEssay.actionVerbs.activeCount === 2 && agencyEssay.actionVerbs.weakCount === 2);
check("action-verb excerpts cite exact sentences", agencyEssay.actionVerbs.activeExcerpts.some((item) => item.verb === "engineered" && item.excerpt.includes("I engineered the data pipeline")) && agencyEssay.actionVerbs.weakExcerpts.some((item) => item.phrase === "helped" && item.excerpt.includes("I helped with a survey")));
check("the action ratio stays unknown when no measured verbs are present", analyzeEssay("A quiet afternoon.", { type: "supplemental" }).actionVerbs.ratioPct === null);
const uncoveredPrompt = analyzeEssay("I enjoy learning about universities.", { prompt: "Describe a leadership experience and explain your financial need." });
check("custom prompt coverage lists missing detected sub-questions", uncoveredPrompt.promptCoverage.source === "custom_prompt" && uncoveredPrompt.promptCoverage.missing.includes("leadership") && uncoveredPrompt.promptCoverage.missing.includes("financial_need"));
check("prompt-coverage findings carry a machine-readable element", uncoveredPrompt.issues.some((issue) => issue.code === "prompt_coverage_missing" && issue.params?.element === "leadership"));
check("essay-type coverage is explicit when no custom prompt is supplied", analyzeEssay("I am interested in this scholarship and contributed to my community.", { type: "scholarship" }).promptCoverage.source === "essay_type");
const contextualComparison = compareVersions("I was involved in a group.", "I led a research project.", {
  previous: { type: "supplemental", prompt: "Describe a research experience." },
  current: { type: "supplemental", prompt: "Describe a research experience." },
});
check("version deltas include context-aware flow and agency dimensions", typeof contextualComparison.delta.flow === "number" && typeof contextualComparison.delta.agency === "number");

section("6. Word limits are enforced");

// 168 (draft) + 800 (padding) = ~968 words, comfortably over the 650 limit.
const padded = `${strong} ${"Padding word. ".repeat(400)}`;
const over = analyzeEssay(padded, { wordLimit: 650 });
check("the padded draft really exceeds the limit", over.wordCount > 650, `got ${over.wordCount}`);
check("over the limit is a blocker", over.issues.some((i) => i.code === "over_limit" && i.severity === "blocker"));
check("over the limit lowers the fit score", over.scores.fit < s.scores.fit);

const under = analyzeEssay(strong.split("\n\n")[0], { wordLimit: 650 });
check("far under the limit is flagged", under.issues.some((i) => i.code === "under_limit"));

section("7. Degenerate input");

const empty = analyzeEssay("");
check("empty text scores 0", empty.scores.total === 0);
check("empty text explains itself", empty.issues[0]?.code === "empty");
check("a 40-word SOP sketch is flagged for review", analyzeEssay("Short. ".repeat(40), { type: "sop" }).issues.some((i) => i.code === "too_short"));
check(
  "short supplemental responses are not judged by an SOP-length threshold",
  !analyzeEssay("Short. ".repeat(40), { type: "supplemental" }).issues.some((i) => i.code === "too_short")
);

section("8. Determinism");

check(
  "the same text scores identically on every run",
  JSON.stringify(analyzeEssay(strong, { targetName: "Purdue University" }).scores) ===
    JSON.stringify(analyzeEssay(strong, { targetName: "Purdue University" }).scores)
);

section("9. Version comparison");

const cmp = compareVersions(weak, strong);
check("an improved draft reports improvement", cmp.improved === true);
check("the delta is positive", cmp.delta.total > 0, `delta=${cmp.delta.total}`);
check("fixed issues are listed", cmp.fixedIssues.length > 0);
check("word delta is computed", cmp.wordDelta === s.wordCount - w.wordCount);
check("a rewrite of the same text reports no change", compareVersions(strong, strong).delta.total === 0);

section("10. Gold-standard exemplars (src/lib/samples/exemplars.ts) on the same rubric");

// Scored exactly as the Essay Rubric Studio scores them after "Load into editor":
// the sample's own type, target, practice word limit and prompt.
const AUTHORED_TARGET = 88; // the brief's acceptance bar
// Verbatim brief essays are reported, never tuned to the rubric. They must
// still be blocker-free and clear a floor, so a regression is visible.
const BRIEF_FLOOR = 60;
const exemplarOptions = (sample: (typeof ESSAY_RUBRIC_SAMPLES)[number]) => ({
  type: sample.essayType,
  targetName: sample.targetName || null,
  wordLimit: sample.wordLimit,
  prompt: sample.prompt || null,
});
const exemplarRows = ESSAY_RUBRIC_SAMPLES.map((sample) => ({ sample, result: analyzeEssay(sample.text, exemplarOptions(sample)) }));

for (const { sample, result } of exemplarRows) {
  const blockers = result.issues.filter((issue) => issue.severity === "blocker").map((issue) => issue.code);
  check(`${sample.id}: 0 blocker issues`, blockers.length === 0, blockers.join(", "));
  if (sample.origin === "authored") {
    check(`${sample.id}: authored exemplar scores ≥ ${AUTHORED_TARGET} (got ${result.scores.total})`, result.scores.total >= AUTHORED_TARGET);
  } else if (sample.origin === "brief") {
    check(`${sample.id}: verbatim brief text scores ≥ ${BRIEF_FLOOR} (got ${result.scores.total})`, result.scores.total >= BRIEF_FLOOR);
  } else {
    check(`${sample.id}: fictional composite is not represented as a verified applicant outcome`, /fictional(?: teaching)? composite/i.test(sample.sourceNote ?? ""));
  }
  check(`${sample.id}: no cliché detected`, result.cliches.length === 0, result.cliches.map((c) => c.phrase).join(", "));
  check(
    `${sample.id}: stays inside its practice word limit`,
    sample.wordLimit == null || result.wordCount <= sample.wordLimit,
    `${result.wordCount} > ${sample.wordLimit}`
  );
}
check("all five essay types have an exemplar", new Set(ESSAY_RUBRIC_SAMPLES.map((sample) => sample.essayType)).size === 5);
check(
  "scholarship exemplars cover El-yurt umidi, Chevening, GKS and DAAD",
  ["essayElYurtUmidi", "essayChevening", "essayGks", "essayDaad"].every((id) =>
    ESSAY_RUBRIC_SAMPLES.some((sample) => sample.id === id && sample.essayType === "scholarship")
  )
);
check(
  "every SOP drafter track is also scoreable in the rubric studio (one shared text)",
  SOP_SAMPLES.every((sop) => ESSAY_RUBRIC_SAMPLES.some((essay) => essay.text === sop.text && essay.essayType === "sop"))
);
check(
  "exemplar scores are deterministic",
  exemplarRows.every(({ sample, result }) => JSON.stringify(analyzeEssay(sample.text, exemplarOptions(sample)).scores) === JSON.stringify(result.scores))
);

console.log("\n  Exemplar scores (src/lib/essay.ts, deterministic):");
for (const { sample, result } of exemplarRows) {
  console.log(
    `    ${sample.id.padEnd(27)} ${sample.essayType.padEnd(18)} ${sample.origin.padEnd(8)} ${String(result.scores.total).padStart(3)}/100  ${String(result.wordCount).padStart(3)} words`
  );
}

// ---------------------------------------------------------------------------
console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
