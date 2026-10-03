/**
 * Hardcoded UI-text checker.
 *
 * Guards the components that were localised last from regressing back to
 * English-only literals. It parses each guarded file with the TypeScript
 * parser and reports user-visible text that is NOT a `t("…")` call:
 *
 *   - JSX text nodes             (<p>Save your profile</p>)
 *   - text-bearing attributes    (title=, aria-label=, placeholder=, label=, …)
 *   - string literals that end up on screen via JSX expressions, calls such as
 *     setError("…"), ternary branches, arrays and template literals
 *
 * It deliberately ignores `className`, `style`, props that are data
 * (ids, enum values, hrefs, currency codes) and a small allowlist of proper
 * nouns / acronyms, so it does not flag correct code. Anything it does flag is
 * either a real untranslated string or a genuine false positive that belongs in
 * ALLOWLIST below with a comment.
 *
 * Usage:  node scripts/check-ui-text.mjs [--list] [file...]
 */
import { readFileSync } from "node:fs";
import ts from "typescript";

/** Files whose student-facing text must go through the translation layer. */
const GUARDED = [
  "src/components/journey/JourneyControlCenter.tsx",
  "src/components/journey/ui.tsx",
  "src/components/ApplicationCenter.tsx",
  "src/components/PlanningStudio.tsx",
  "src/components/OnboardingWizard.tsx",
  "src/components/ProfileModal.tsx",
];

const ATTRS = new Set([
  "placeholder",
  "title",
  "aria-label",
  "aria-description",
  "aria-placeholder",
  "alt",
  "label",
  "description",
  "subtitle",
  "hint",
  "caption",
  "emptyTitle",
  "emptyHint",
  "note",
  "body",
  "message",
]);

/** Attributes whose string values are never user-visible prose. */
const SKIP_ATTRS = new Set([
  "className",
  "class",
  "style",
  "id",
  "key",
  "href",
  "src",
  "type",
  "name",
  "value",
  "htmlFor",
  "role",
  "variant",
  "size",
  "shape",
  "icon",
  "fill",
  "stroke",
  "testId",
  "data-testid",
  "autoComplete",
  "inputMode",
  "method",
  "action",
]);

/**
 * Strings that are legitimately hardcoded: data values, design tokens, proper
 * nouns, acronyms and units. Keep every entry narrowly anchored — a loose
 * pattern here silently hides real misses.
 */
const ALLOWLIST = [
  // enum / database values sent to APIs
  /^(not_started|preparing|essay|documents|recommendations|fee_paid|submitted|interview|decision|withdrawn)$/,
  /^(accepted|rejected|waitlisted|deferred)$/,
  /^(need_based|full_tuition|range|variable)$/,
  /^(year|month|need|merit|gpa|income)$/,
  /^[a-z][a-z0-9_]*$/,
  // acronyms, units, currency codes and short technical tokens
  /^(GPA|IELTS|TOEFL|SAT|ACT|GRE|GMAT|Duolingo|USD|EUR|UZS|RUB|PDF|DOCX|JPG|PNG|AI|ID|OK|FAQ|STEM|CSS|HTML|URL|API|SMS|OTP|CV|SOP|MIT|TUM|UK|US|USA|EU|UN|Q1|Q2|Q3|Q4)$/,
  /^[A-Z]{2,6}$/,
  /^[0-9][0-9\s.,%$+:/–-]*$/,
  /^[\s\p{Emoji}\p{So}•·—–-]+$/u,
  /^\d{1,2}:\d{2}$/,
  // punctuation-only / symbol-only text
  /^[^\p{L}]+$/u,
  // single letters or two-letter country/state codes rendered from data
  /^[A-Za-z]{1,2}$/,
  // paths, URLs, mime types and header names — never shown to students
  /^[/#][\w./:?=&%-]*$/,
  /^\w+\/[\w.+-]+$/,
  /^[A-Za-z-]+-[A-Za-z]+$/,
  // standalone design tokens that are not a class list on their own
  /^(sr-only|truncate|contents|isolate|inherit|none|auto|true|false)$/,
  // currency / percent / date patterns produced by formatters
  /^[$€£₽]\s?[\d.,]+[KMB]?$/,
  // CSS-ish coordinate lists (inline styles / motion values)
  /^[-\d.]+(px|rem|em|%|deg|s)\s+[-\d.]+(px|rem|em|%|deg|s)(\s+[-\d.]+(px|rem|em|%|deg|s))*$/,
];

/**
 * Per-file tokens that are *translation keys or controlled vocabularies*, not
 * prose: they are passed to `t()` at the point of use. Listing them per file
 * keeps the exemption narrow — a new English sentence in these files still
 * fails the check.
 */
const KEY_VOCABULARY = {
  "src/components/PlanningStudio.tsx": ["tabCost", "tabScholarship", "tabCv", "tabCompare", "statSaved", "statExpected", "statCoverage", "statChance"],
  "src/components/ApplicationCenter.tsx": ["Rolling", "Winter", "Summer", "Spring", "RD", "ED", "EA"],
  // next-step id prefixes matched with startsWith() — data, not prose
  "src/components/journey/JourneyControlCenter.tsx": ["test-", "readiness-"],
  // step-title keys resolved through t(stepInfo.titleKey)
  "src/components/OnboardingWizard.tsx": [
    "stepTitle0", "stepTitle1", "stepTitle2", "stepTitle3", "stepTitle4", "stepTitle5", "stepTitle6", "stepTitle7",
    // stored values, never rendered raw: countries render through t(`countryNames.*`),
    // degrees through <DegreeLevelLabel> (the `degrees` namespace)
    "United States", "United Kingdom", "Canada", "Germany", "Australia", "Singapore", "Netherlands",
    "Switzerland", "Japan", "France", "Sweden", "South Korea", "United Arab Emirates", "China",
    "Bachelor", "Master", "PhD",
    // legacy value compared against, never displayed
    "Computer Science",
    // form field names posted to the API
    "preferredCountries", "degreeLevel", "targetMajor", "gpaScale", "ieltsScore", "toeflScore",
    "satScore", "greScore", "budgetAnnualUsd", "needScholarship", "workExperienceYears", "researchPublications",
  ],
  "src/components/ProfileModal.tsx": [
    // suggestion-chip and achievement keys, resolved through t() at render
    "chipLeadership", "chipLeadershipHint", "chipVolunteering", "chipVolunteeringHint",
    "chipSports", "chipSportsHint", "chipClubs", "chipClubsHint",
    "chipResearch", "chipResearchHint", "chipProjects", "chipProjectsHint",
    "researchExperience",
    // stored country names — rendered through t(`countries.*`) via countryCodeFor()
    "United States", "United Kingdom", "Canada", "Germany", "Australia", "Singapore",
    "Netherlands", "Switzerland", "Japan", "France", "Sweden",
    // stored degree / field values — rendered through DegreeLevelLabel / study-field labels
    "Bachelor", "Master", "PhD", "Diploma", "Computer Science",
  ],
};

/** Per-file exact exceptions (rendered data, not sentences). */
const EXACT_OK = new Set([
  "—",
  "•",
  "·",
  "–",
  "…",
  "×",
  "/ year",
  "/ month",
  "ScholarBridge",
  "ScholarBridgeAI",
]);

const rel = (p) => p.replace(`${process.cwd()}/`, "");

function looksLikeClassList(text) {
  const words = text.split(/\s+/);
  const isUtility = (w) =>
    /^(?:[a-z-]+:)*[a-z0-9]+(?:[-:][a-z0-9./[\]%()-]+)+$/.test(w) ||
    /^(?:[a-z-]+:)?(flex|grid|block|hidden|inline|relative|absolute|fixed|sticky|truncate|uppercase|capitalize|sr-only|contents|isolate|antialiased)$/.test(w);
  if (words.length === 1) return isUtility(words[0]);
  if (words.length < 2) return false;
  const utility = words.filter(isUtility);
  return utility.length >= Math.ceil(words.length * 0.6);
}

function isAllowed(text) {
  if (EXACT_OK.has(text)) return true;
  return ALLOWLIST.some((re) => re.test(text));
}

function candidates(file) {
  const src = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found = [];
  const line = (node) => src.getLineAndCharacterOfPosition(node.getStart()).line + 1;

  const inSkippedAttr = (node) => {
    for (let p = node.parent; p; p = p.parent) {
      if (ts.isJsxAttribute(p) && SKIP_ATTRS.has(p.name.getText())) return true;
      if (ts.isJsxExpression(p) && p.parent && ts.isJsxAttribute(p.parent) && SKIP_ATTRS.has(p.parent.name.getText())) return true;
    }
    return false;
  };

  // Identifiers bound to useTranslations() — their string arguments are keys.
  const tNames = new Set(["t", "tRich", "translate"]);
  for (const m of src.text.matchAll(/const\s+(\w+)\s*=\s*useTranslations\(/g)) tNames.add(m[1]);

  const isTranslationKey = (node) => {
    const p = node.parent;
    if (!p) return false;
    if (ts.isCallExpression(p) && ts.isIdentifier(p.expression) && tNames.has(p.expression.text)) return true;
    // t(`status.${value}`) style dynamic keys
    if (ts.isTemplateExpression(node)) return false;
    return false;
  };

  // Names passed to Map/URLSearchParams-style accessors are not user text.
  const isLookupKey = (node) => {
    const p = node.parent;
    if (!p || !ts.isCallExpression(p) || p.arguments[0] !== node) return false;
    const callee = p.expression;
    if (!ts.isPropertyAccessExpression(callee)) return false;
    return ["set", "get", "append", "has", "delete", "add", "getItem", "setItem"].includes(callee.name.getText());
  };

  const isPropertyName = (node) => {
    const p = node.parent;
    return Boolean(p && ts.isPropertyAssignment(p) && p.name === node);
  };

  const fileVocab = new Set(KEY_VOCABULARY[rel(file)] ?? []);

  const push = (text, node, kind) => {
    const value = String(text).replace(/\s+/g, " ").trim();
    if (fileVocab.has(value)) return;
    if (!value || !/\p{L}/u.test(value)) return;
    if (looksLikeClassList(value)) return;
    if (isAllowed(value)) return;
    // Needs at least two letters in a row to be prose rather than a symbol.
    if (!/[\p{L}]{2}/u.test(value)) return;
    found.push({ value, kind, line: line(node) });
  };

  const walk = (node) => {
    if ((ts.isStringLiteral(node) || ts.isTemplateExpression(node)) && (isTranslationKey(node) || isPropertyName(node) || isLookupKey(node))) {
      // still descend so nested expressions are inspected
    } else if (ts.isJsxText(node)) {
      push(node.text, node, "jsx-text");
    } else if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer)) {
      const name = node.name.getText();
      if (ATTRS.has(name) || name.startsWith("aria-")) push(node.initializer.text, node, `attr:${name}`);
    } else if (ts.isStringLiteral(node) && !ts.isJsxAttribute(node.parent) && !inSkippedAttr(node)) {
      const p = node.parent;
      const visible =
        ts.isCallExpression(p) ||
        ts.isNewExpression(p) ||
        ts.isConditionalExpression(p) ||
        ts.isBinaryExpression(p) ||
        ts.isArrayLiteralExpression(p) ||
        ts.isPropertyAssignment(p) ||
        ts.isJsxExpression(p) ||
        ts.isParenthesizedExpression(p) ||
        ts.isReturnStatement(p) ||
        ts.isVariableDeclaration(p);
      if (visible) push(node.text, node, "literal");
    } else if (ts.isTemplateExpression(node)) {
      const text = node.getText().replace(/\s+/g, " ");
      // Template literals are prose only when they contain a word of 3+ letters
      // outside the interpolations.
      const prose = node.head.text + node.templateSpans.map((s) => s.literal.text).join(" ");
      if (/[\p{L}]{3}/u.test(prose) && /\s/.test(prose.trim())) push(prose.trim(), node, "template");
    }
    ts.forEachChild(node, walk);
  };

  walk(src);
  const seen = new Map();
  for (const item of found) if (!seen.has(item.value)) seen.set(item.value, item);
  return [...seen.values()];
}

const args = process.argv.slice(2);
const list = args.includes("--list");
const explicit = args.filter((a) => !a.startsWith("--"));
const files = explicit.length ? explicit : GUARDED;

let total = 0;
const report = [];
for (const file of files) {
  let hits;
  try {
    hits = candidates(file);
  } catch (e) {
    console.error(`  ✗ ${rel(file)}: could not parse — ${e.message}`);
    process.exitCode = 1;
    continue;
  }
  total += hits.length;
  if (hits.length) report.push({ file: rel(file), hits });
}

if (list) {
  console.log(JSON.stringify(report, null, 2));
} else if (report.length) {
  console.error("Untranslated UI text found:\n");
  for (const { file, hits } of report) {
    console.error(`  ${file}`);
    for (const h of hits) console.error(`    L${h.line} [${h.kind}] ${h.value.length > 100 ? `${h.value.slice(0, 100)}…` : h.value}`);
    console.error("");
  }
} else {
  console.log(`  guarded files: ${files.length}`);
  console.log(`  hardcoded UI strings: 0`);
  console.log("\nUI-text check passed — every guarded string goes through the translation layer.");
}

if (total) {
  console.error(`UI-text check FAILED — ${total} hardcoded string(s) in ${report.length} file(s).`);
  process.exit(1);
}
