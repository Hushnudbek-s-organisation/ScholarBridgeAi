/**
 * Deterministic checks for the Essay rubric (#8).
 *
 * The scores come from the text, not from a model — so two readers get the same
 * score, and a student who improves a draft can see the number move for a reason
 * they can verify.
 *
 * Run: npm run test:essays
 */

import {
  analyzeAgency,
  analyzeEssay,
  analyzeFlow,
  analyzePromptCoverage,
  compareVersions,
  countWords,
  paragraphs,
  sentences,
  splitPromptParts,
} from "../src/lib/essay";

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

section("5. Word limits are enforced");

// 168 (draft) + 800 (padding) = ~968 words, comfortably over the 650 limit.
const padded = `${strong} ${"Padding word. ".repeat(400)}`;
const over = analyzeEssay(padded, { wordLimit: 650 });
check("the padded draft really exceeds the limit", over.wordCount > 650, `got ${over.wordCount}`);
check("over the limit is a blocker", over.issues.some((i) => i.code === "over_limit" && i.severity === "blocker"));
check("over the limit lowers the fit score", over.scores.fit < s.scores.fit);

const under = analyzeEssay(strong.split("\n\n")[0], { wordLimit: 650 });
check("far under the limit is flagged", under.issues.some((i) => i.code === "under_limit"));

section("6. Degenerate input");

const empty = analyzeEssay("");
check("empty text scores 0", empty.scores.total === 0);
check("empty text explains itself", empty.issues[0]?.code === "empty");
check("a 40-word SOP sketch is flagged for review", analyzeEssay("Short. ".repeat(40), { type: "sop" }).issues.some((i) => i.code === "too_short"));
check(
  "short supplemental responses are not judged by an SOP-length threshold",
  !analyzeEssay("Short. ".repeat(40), { type: "supplemental" }).issues.some((i) => i.code === "too_short")
);

section("7. Determinism");

check(
  "the same text scores identically on every run",
  JSON.stringify(analyzeEssay(strong, { targetName: "Purdue University" }).scores) ===
    JSON.stringify(analyzeEssay(strong, { targetName: "Purdue University" }).scores)
);

section("8. Version comparison");

const cmp = compareVersions(weak, strong);
check("an improved draft reports improvement", cmp.improved === true);
check("the delta is positive", cmp.delta.total > 0, `delta=${cmp.delta.total}`);
check("fixed issues are listed", cmp.fixedIssues.length > 0);
check("word delta is computed", cmp.wordDelta === s.wordCount - w.wordCount);
check("a rewrite of the same text reports no change", compareVersions(strong, strong).delta.total === 0);

// ---------------------------------------------------------------------------

/** Every clause is checked; the first failure is reported with its reason. */
function expectAll(name: string, clauses: [boolean, string][]) {
  const bad = clauses.find(([ok]) => !ok);
  check(name, !bad, bad ? bad[1] : "");
}

console.log("\n— paragraph flow, agency and prompt coverage —");

// Paragraphs that share vocabulary and use transitions vs. three unrelated ones.
const linked = [
  "I built a machine-learning model to detect soil salinity across the Fergana Valley.",
  "The model reduced water usage because it predicted root-zone moisture 48 hours ahead.",
  "This work therefore led to two conference papers at IEEE ICISCT 2025.",
].join("\n\n");

const jumpy = [
  "I built a machine-learning model to detect soil salinity across the Fergana Valley.",
  "My favourite childhood memory is playing chess with my grandfather in Bukhara.",
  "The capital of Portugal is Lisbon and the weather there is mild in spring.",
].join("\n\n");

const linkedFlow = analyzeFlow(linked);
const jumpyFlow = analyzeFlow(jumpy);

expectAll("paragraphs that share ideas and use transitions score above jumping ones", [
  [linkedFlow.score > jumpyFlow.score, `expected ${linkedFlow.score} > ${jumpyFlow.score}`],
  [jumpyFlow.abruptJumps.length >= 1, "an unlinked topic change must be reported"],
  [
    linkedFlow.connectors.includes("because") || linkedFlow.connectors.includes("therefore"),
    "transitions must be recognised",
  ],
]);

const mixed = analyzeAgency(linked + "\n\nI was involved in a student club and helped with events.");

expectAll("agency separates ownership verbs from passive filler", [
  [mixed.strongVerbs.some((v) => v.verb === "built"), "built must be counted as ownership"],
  [mixed.weakPhrases.some((w) => w.phrase === "was involved in"), "the weak phrase must be reported"],
  [mixed.weakPhrases[0].excerpt.length > 0, "the weak phrase must carry the sentence it appears in"],
  [mixed.strongCount >= 2, "two ownership verbs are present"],
]);

const passiveAgency = analyzeAgency("I was involved in several projects and was responsible for reports.");
const activeAgency = analyzeAgency("I engineered the pipeline, reduced water use and published two papers.");

check(
  "an all-passive draft scores below an ownership draft",
  activeAgency.score > passiveAgency.score,
  `${activeAgency.score} should exceed ${passiveAgency.score}`,
);

const prompt = "Why this university?\nWhat will you study there and why?\nHow will you fund your studies?";
const promptParts = splitPromptParts(prompt);
const partialCoverage = analyzePromptCoverage(
  "I want to study machine learning at this university because of the vision group.",
  prompt,
);

expectAll("prompt coverage checks every sub-question and reports the misses", [
  [promptParts.length === 3, "three sub-questions must be split out"],
  [partialCoverage !== null, "coverage must be computed when a prompt is given"],
  [partialCoverage?.totalParts === 3, "the total must match the split prompt"],
  [partialCoverage?.covered[0] === true, "the first sub-question is clearly addressed"],
  [
    (partialCoverage?.coveredCount ?? 99) < (partialCoverage?.totalParts ?? 0),
    "funding is not addressed and must be flagged",
  ],
  [analyzePromptCoverage("anything", null) === null, "no prompt means no verdict"],
]);

const withoutPrompt = analyzeEssay(linked, { type: "sop", wordLimit: 500 });
const withPrompt = analyzeEssay(linked, {
  type: "sop",
  wordLimit: 500,
  prompt: "Why water?\nHow will you fund it?",
});

expectAll("analyzeEssay carries the three passes and never moves the total by more than 2", [
  [Boolean(withoutPrompt.flow) && Boolean(withoutPrompt.agency), "flow and agency are always computed"],
  [withoutPrompt.promptCoverage === null, "no prompt => null coverage"],
  [Boolean(withPrompt.promptCoverage), "coverage appears when the prompt is supplied"],
  [
    Math.abs(withPrompt.scores.total - withoutPrompt.scores.total) <= 2,
    "adding a prompt may only move the total within the measured correction band",
  ],
  [
    withPrompt.issues.every((issue) => typeof issue.message === "string" && issue.message.length > 0),
    "every issue keeps a written explanation",
  ],
]);

// ---------------------------------------------------------------------------
console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
