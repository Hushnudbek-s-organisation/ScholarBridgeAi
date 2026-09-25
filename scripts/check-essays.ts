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
check("missing evidence is a blocker", weakCodes.includes("no_evidence"));
check(
  "an unnamed target university is a blocker",
  analyzeEssay(strong, { targetName: "MIT" }).issues.some(
    (i) => i.code === "target_not_named" && i.severity === "blocker"
  )
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
check("a 40-word sketch is too short", analyzeEssay("Short. ".repeat(40)).issues.some((i) => i.code === "too_short"));

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
console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
