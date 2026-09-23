/**
 * AI reply formatting test — deterministic, no DB connection, no network.
 *
 * Exercises the REAL normalizeAiReply()/toPlainText() module
 * (src/lib/ai/format-reply.ts) plus structural checks that the fix is wired
 * end-to-end: callAI normalizes before returning/persisting, the safe
 * AiFormattedText renderer is used by chat / SOP studio / dashboard, and the
 * four AI routes carry the FORMAT RULES.
 *
 * Run:  npm run test:ai-format
 * Exit 0 + "AI format test passed (N assertions)" on success.
 */
process.env.DATABASE_URL = "postgresql://x:x@localhost:5432/x"; // dummy — no queries are executed

import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

// Lazy import AFTER DATABASE_URL is set (keeps the pattern of sibling checks).
async function main() {
const { normalizeAiReply, toPlainText } = await import("../src/lib/ai/format-reply");

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed += 1;
    failures.push(`${name}: ${(err as Error).message}`);
    console.error(`  ✗ ${name} — ${(err as Error).message}`);
  }
}

// ---------------------------------------------------------------------------
// 1. <think> blocks
// ---------------------------------------------------------------------------
check("removes a full <think> block", () => {
  const out = normalizeAiReply("<think>Let me reason step by step about visas.</think>Here is the answer.");
  assert.equal(out, "Here is the answer.");
});

check("removes multiple think blocks + stray unclosed think tag", () => {
  const out = normalizeAiReply("<think>a</think>Part one. <THINK>more</THINK>Part two. <think>never closed");
  assert.equal(out, "Part one. Part two.");
});

// ---------------------------------------------------------------------------
// 2. HTML entities (including nested)
// ---------------------------------------------------------------------------
check("decodes basic named entities", () => {
  assert.equal(normalizeAiReply("Fulbright &amp; Chevening"), "Fulbright & Chevening");
  assert.equal(normalizeAiReply('&quot;quoted&quot; text'), '"quoted" text');
  assert.equal(normalizeAiReply("at&nbsp;the end"), "at the end");
  assert.equal(normalizeAiReply("it&rsquo;s &mdash; fine"), "it’s — fine");
});

check("decodes numeric entities", () => {
  assert.equal(normalizeAiReply("&#65;&#x42; &#38;"), "AB &");
});

check("decodes nested entities (&amp;lt; resolves to <)", () => {
  assert.equal(normalizeAiReply("score &amp;lt; 90"), "score < 90");
  // &amp;lt;b&gt; → &lt;b&gt; → <b> → the tag itself is then stripped
  assert.equal(normalizeAiReply("&amp;lt;b&amp;gt;bold&amp;lt;/b&amp;gt;"), "bold");
});

check("a lone decoded < that is not a tag stays visible", () => {
  assert.equal(normalizeAiReply("GPA &lt; 3.0 is risky"), "GPA < 3.0 is risky");
});

// ---------------------------------------------------------------------------
// 3. Literal "\n" sequences
// ---------------------------------------------------------------------------
check("turns literal backslash-n into real newlines", () => {
  assert.equal(normalizeAiReply("line one\\nline two"), "line one\nline two");
  assert.equal(normalizeAiReply("a\\r\\nb\\nc"), "a\nb\nc");
});

// ---------------------------------------------------------------------------
// 4. HTML tag stripping (XSS safety)
// ---------------------------------------------------------------------------
check("converts <br> to newlines, strips other tags but keeps the text", () => {
  assert.equal(normalizeAiReply("Hello<br>World"), "Hello\nWorld");
  assert.equal(normalizeAiReply("a <b>bold</b> c"), "a bold c");
});

check("removes <script> blocks entirely (content included)", () => {
  const out = normalizeAiReply("Before <script>alert('xss')</script> after");
  assert.equal(out, "Before after");
  assert.ok(!out.toLowerCase().includes("script"));
  assert.ok(!out.includes("alert"));
});

check("strips self-closing / stray tags and event-handler attributes", () => {
  const out = normalizeAiReply('Start <img src=x onerror="alert(1)"> mid <div class="a" onclick=evil()>tail</div>');
  assert.ok(!out.includes("<") && !out.includes(">"));
  assert.ok(!out.includes("onerror") && !out.includes("onclick"));
});

check("leaves plain < in comparisons untouched (not a tag)", () => {
  assert.equal(normalizeAiReply("if x < 5 and y > 2, reply"), "if x < 5 and y > 2, reply");
});

// ---------------------------------------------------------------------------
// 5. Markdown tables → narrow-chat bullets
// ---------------------------------------------------------------------------
const WIDE_TABLE = [
  "### Post-Study Work Visas",
  "",
  "| Country | Visa | Max Stay |",
  "| --- | --- | --- |",
  "| Canada | PGWP | Up to 3 years |",
  "| USA | OPT / STEM OPT | 3 years total |",
  "| UK | Graduate Route | 2 years |",
].join("\n");

check("converts a 3-column table into bold lead + labeled sub-bullets", () => {
  const out = normalizeAiReply(WIDE_TABLE);
  assert.ok(!out.includes("|"), "no table pipes remain");
  assert.ok(!out.includes("---"), "no separator row remains");
  assert.ok(out.includes("- **Canada**"), "bold lead bullet");
  assert.ok(out.includes("  - Visa: PGWP"), "labeled sub-bullet (visa)");
  assert.ok(out.includes("  - Max Stay: Up to 3 years"), "labeled sub-bullet (duration)");
  assert.ok(out.includes("- **USA**") && out.includes("  - Visa: OPT / STEM OPT"));
  assert.ok(out.startsWith("### Post-Study Work Visas"), "heading above the table survives");
});

check("converts a 2-column table into key: value bullets", () => {
  const out = normalizeAiReply([
    "| Scholarship | Benefit |",
    "| --- | --- |",
    "| Fulbright | Full tuition + stipend |",
  ].join("\n"));
  assert.ok(!out.includes("|"));
  assert.ok(out.includes("- **Fulbright:** Full tuition + stipend"));
});

check("handles tables without trailing pipes and single-column tables", () => {
  const out = normalizeAiReply("| Step | Detail\n| --- | ---\n| Month 1 | Outline SOP\n| Month 2 | Apply");
  assert.ok(!out.includes("|"));
  assert.ok(out.includes("- **Month 1:** Outline SOP"));
  const one = normalizeAiReply("| Item |\n| --- |\n| Transcript |");
  assert.ok(one.includes("- Transcript"));
});

check("a single stray | row does not crash and keeps its text", () => {
  const out = normalizeAiReply("Plain line\n| a | b |\nNext line");
  assert.ok(out.includes("a") && out.includes("b"));
  assert.ok(!out.includes("---"));
});

// ---------------------------------------------------------------------------
// 6. Whitespace hygiene
// ---------------------------------------------------------------------------
check("normalizes NBSP / thin / narrow no-break spaces", () => {
  assert.equal(normalizeAiReply("a\u00A0b\u202Fc\u2009d"), "a b c d");
});

check("collapses 3+ newlines to at most one blank line", () => {
  assert.equal(normalizeAiReply("a\n\n\n\n\nb"), "a\n\nb");
});

check("trims trailing spaces per line and trims the ends", () => {
  assert.equal(normalizeAiReply("  hello   \nworld  "), "hello\nworld");
});

// ---------------------------------------------------------------------------
// 7. Plain text passes through unchanged
// ---------------------------------------------------------------------------
check("plain text is unchanged", () => {
  const plain = "Hello! Here is a plain answer.\n\nSecond paragraph with a number: 42 and a dash — done.";
  assert.equal(normalizeAiReply(plain), plain);
});

check("empty / whitespace input stays empty (fallbacks keep working)", () => {
  assert.equal(normalizeAiReply(""), "");
  assert.equal(normalizeAiReply("   \n  "), "");
});

check("normalization is idempotent on messy input", () => {
  const messy =
    "<think>hmm</think>### Title\n\n" +
    "AT&amp;T &quot;quality&quot;\\n\n\n\n" +
    "| A | B |\n| --- | --- |\n| 1 | 2 |\n\n" +
    "End\u00A0\u2028".replace("\u2028", "\n");
  const once = normalizeAiReply(messy);
  const twice = normalizeAiReply(once);
  assert.equal(twice, once);
  assert.ok(!once.includes("<") && !once.includes("|"), "no tags or table pipes left");
  assert.ok(!once.includes("&amp;") && !once.includes("&quot;"), "entities fully decoded");
  assert.ok(!once.includes("\\n"), "no literal \\n left");
  assert.ok(once.includes("AT&T"), "plain & survives decoding");
});

// ---------------------------------------------------------------------------
// 8. toPlainText (SOP "Copy" button)
// ---------------------------------------------------------------------------
check("toPlainText strips markdown markers, keeps structure", () => {
  const raw = [
    "### SOP Review Summary",
    "",
    "Some **bold** and *italic* words, plus `code` and a [link](https://example.com/x).",
    "",
    "- item one",
    "- item two",
  ].join("\n");
  const plain = toPlainText(raw);
  assert.ok(!plain.includes("**") && !plain.includes("###"), "no bold/heading markers");
  assert.ok(plain.includes("SOP Review Summary"), "heading text kept");
  assert.ok(plain.includes("bold") && plain.includes("italic") && plain.includes("code"));
  assert.ok(plain.includes("link") && !plain.includes("https://example.com"), "link becomes its text");
  assert.ok(plain.includes("- item one"), "bullet markers kept as plain dashes");
});

check("toPlainText on an essay returns the essay (no markdown, no HTML)", () => {
  const essay = "Statement of Purpose\n\nCandidate: Jane — MSc CS, MIT\n\nMy fascination with technology began early.";
  const plain = toPlainText(essay);
  assert.equal(plain, essay);
});

// ---------------------------------------------------------------------------
// Structural checks — the fix is wired end-to-end
// ---------------------------------------------------------------------------
const ROOT = join(import.meta.dirname, "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

check("callAI normalizes the reply before returning (DB rows stay clean)", () => {
  const ai = read("src/lib/ai.ts");
  assert.match(ai, /normalizeAiReply/);
  assert.match(ai, /import \{ normalizeAiReply \} from "@\/lib\/ai\/format-reply"/);
});

check("AiFormattedText is a safe renderer (no dangerouslySetInnerHTML, safe links)", () => {
  const comp = read("src/components/AiFormattedText.tsx");
  assert.match(comp, /export function AiFormattedText/);
  assert.ok(!comp.includes("dangerouslySetInnerHTML"), "must never inject raw HTML");
  assert.match(comp, /target="_blank"/);
  assert.match(comp, /rel="noopener noreferrer"/);
  assert.match(comp, /normalizeAiReply/);
});

check("AI chat bubble renders through AiFormattedText (no whitespace-pre-wrap for AI)", () => {
  const comp = read("src/components/AiChatMentor.tsx");
  assert.match(comp, /<AiFormattedText text=\{m\.text\} \/>/);
  // whitespace-pre-wrap may remain only on the USER bubble branch (1 spot total),
  // i.e. on the ternary line right after `m.sender === "user"`.
  const lines = comp.split("\n");
  const preWrapIdx = lines.findIndex((l) => l.includes("whitespace-pre-wrap"));
  assert.notEqual(preWrapIdx, -1, "user bubble keeps pre-wrap");
  assert.equal(lines.filter((l) => l.includes("whitespace-pre-wrap")).length, 1, "AI bubble has no pre-wrap");
  const previousLine = lines[preWrapIdx - 1] ?? "";
  assert.ok(previousLine.includes('m.sender === "user"'), "pre-wrap sits on the user branch");
});

check("SOP studio renders draft+review through AiFormattedText and copies plain text", () => {
  const comp = read("src/components/AiSopStudio.tsx");
  assert.match(comp, /<AiFormattedText text=\{generatedSop\}/);
  assert.match(comp, /<AiFormattedText text=\{sopReview\}/);
  assert.match(comp, /copyToClipboard\(toPlainText\(generatedSop\)\)/);
  assert.ok(!comp.includes("whitespace-pre-wrap"), "pre-wrap removed from AI output panels");
  assert.ok(!comp.includes("{generatedSop}\n") && !comp.includes("{sopReview}\n"), "no raw text interpolation left in output panels");
});

check("dashboard audit renders through AiFormattedText", () => {
  const comp = read("src/components/DashboardView.tsx");
  assert.match(comp, /<AiFormattedText text=\{aiEvaluation\}/);
  assert.ok(!comp.includes("whitespace-pre-wrap"), "pre-wrap removed from the audit panel");
});

check("all 4 AI routes carry the FORMAT RULES", () => {
  for (const route of [
    "src/app/api/ai/chat/route.ts",
    "src/app/api/ai/evaluate-profile/route.ts",
    "src/app/api/ai/review-sop/route.ts",
    "src/app/api/ai/draft-sop/route.ts",
  ]) {
    const src = read(route);
    assert.match(src, /FORMAT RULES \(follow exactly\)/, `${route} must include FORMAT RULES`);
    assert.match(src, /NO HTML/, `${route} must forbid HTML`);
    assert.match(src, /NO markdown tables/, `${route} must forbid tables`);
    assert.ok(!src.includes("&amp;"), `${route} must not contain entity examples`);
    assert.ok(!src.includes("| --- |") && !src.includes("|---|"), `${route} fallback must not contain tables`);
  }
});

check("fallbacks are normalized server-side (chat + evaluate + review + draft)", () => {
  for (const route of [
    "src/app/api/ai/chat/route.ts",
    "src/app/api/ai/evaluate-profile/route.ts",
    "src/app/api/ai/review-sop/route.ts",
    "src/app/api/ai/draft-sop/route.ts",
  ]) {
    assert.match(read(route), /normalizeAiReply\(/, `${route} fallback must be normalized`);
  }
});

check("draft-sop prompt demands a plain 5-paragraph essay", () => {
  const src = read("src/app/api/ai/draft-sop/route.ts");
  assert.match(src, /5 flowing academic paragraphs/);
  assert.match(src, /NO markdown headings/);
  // Language requirement (preferredLocale) must survive intact.
  assert.match(src, /ABSOLUTE LANGUAGE REQUIREMENT/);
  assert.match(src, /localeToLanguageName/);
});

check("visa (groq) and research-agent paths are untouched", () => {
  const groq = read("src/lib/groq.ts");
  assert.ok(!groq.includes("format-reply"), "src/lib/groq.ts must not depend on the formatter");
  const visaChat = read("src/app/api/visa/chat/route.ts");
  const visaAnalyze = read("src/app/api/visa/analyze/route.ts");
  assert.ok(!visaChat.includes("format-reply") && !visaAnalyze.includes("format-reply"));
  const researchPrompts = read("src/lib/research-agent/prompts.ts");
  assert.ok(!researchPrompts.includes("format-reply"));
});

check("OpenRouter default model id is unchanged", () => {
  const aiIndex = read("src/lib/ai/index.ts");
  assert.match(aiIndex, /meta-llama\/llama-3\.3-70b-instruct/);
});

check("package.json exposes test:ai-format", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.ok(pkg.scripts["test:ai-format"].startsWith("tsx "));
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log("");
if (failed > 0) {
  console.error(`AI format test FAILED — ${failed} assertion(s) failed:`);
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}
console.log(`AI format test passed (${passed} assertions)`);
}

main().catch((err) => {
  console.error("AI format test crashed:", err);
  process.exit(1);
});
