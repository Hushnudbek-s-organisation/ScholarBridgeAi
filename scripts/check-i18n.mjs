/**
 * i18n consistency checker.
 *
 *  1. Every message in en/uz/ru must parse as valid ICU MessageFormat
 *     (catches stray apostrophes / unbalanced braces that only blow up at
 *     runtime, never at `next build` time).
 *  2. Key parity: uz and ru must have exactly the same key set as en.
 *  3. Every `t("<key>")` call inside a component must exist in its namespace.
 *
 * Usage:  node scripts/check-i18n.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import IntlMessageFormat from "intl-messageformat";

const LOCALES = ["en", "uz", "ru"];
const MESSAGES_DIR = "src/i18n/messages";
const SOURCE_DIR = "src";

let errors = 0;
const fail = (msg) => {
  errors += 1;
  console.error("  ✗ " + msg);
};

function flatten(obj, prefix = "", out = new Map()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") flatten(v, key, out);
    else out.set(key, v);
  }
  return out;
}

/**
 * next-intl forbids a "." INSIDE a message key — the dot is the nesting
 * separator, so a flat `"match.strong"` key makes `useTranslations("ns")`
 * throw `INVALID_KEY` at render time (that is how the career-discovery panel
 * broke in production while every static check stayed green). Nest them
 * instead: `"match": { "strong": … }`; lookups like `t("match.strong")` keep
 * working, because that is exactly the path next-intl already resolves.
 */
function assertNoDottedKeys(obj, path = "") {
  for (const [k, v] of Object.entries(obj)) {
    if (k.includes(".")) fail(`[${path || "root"}] key "${k}" contains a "." — nest it instead`);
    if (v && typeof v === "object") assertNoDottedKeys(v, path ? `${path}.${k}` : k);
  }
}

/** Keep the onboarding cards on the nested path shape next-intl resolves. */
function assertCareerPathMessages(locale, messages) {
  const careerDiscovery = messages?.careerDiscovery;
  const path = careerDiscovery?.path;
  if (!path || typeof path !== "object" || Array.isArray(path)) {
    fail(`[${locale}] careerDiscovery.path must be a nested object`);
    return;
  }

  for (const id of ["goal", "interests", "undecided"]) {
    const card = path[id];
    if (!card || typeof card !== "object" || Array.isArray(card)) {
      fail(`[${locale}] careerDiscovery.path.${id} must be a nested object`);
      continue;
    }
    for (const field of ["title", "body"]) {
      if (typeof card[field] !== "string" || !card[field].trim()) {
        fail(`[${locale}] careerDiscovery.path.${id}.${field} must be non-empty translated text`);
      }
    }
  }

  // Catch the exact legacy regression even if a future change tries to add a
  // second, flat version alongside the valid nested messages.
  for (const key of ["path.goal.title", "path.goal.body", "path.interests.title", "path.interests.body", "path.undecided.title", "path.undecided.body"]) {
    if (Object.hasOwn(careerDiscovery, key)) {
      fail(`[${locale}] careerDiscovery.${key} is flat; keep it under careerDiscovery.path`);
    }
  }
}

function assertRecLetterMessages(locale, messages) {
  const recLetter = messages?.recLetter;
  if (!recLetter || typeof recLetter.rmEmptyHint !== "string" || !recLetter.rmEmptyHint.trim()) {
    fail(`[${locale}] recLetter.rmEmptyHint must be translated guidance`);
    return;
  }
  if (locale === "en") {
    const advice = JSON.stringify(recLetter);
    if (/two or three|no more than two|one or two relevant examples|4–6 weeks|two weeks early|about a week before|Most universities ask for one or two letters/i.test(advice)) {
      fail("[en] recLetter still contains unsupported example-count or timing guidance");
    }
  }
}

function assertCvMessages(locale, messages) {
  const cv = messages?.cvBuilder;
  if (!cv || typeof cv !== "object") {
    fail(`[${locale}] cvBuilder must be an object`);
    return;
  }
  for (const key of ["cvTitle", "cvMeta", "copy", "copied", "missingTitle", "missingNote"]) {
    if (typeof cv[key] !== "string" || !cv[key].trim()) fail(`[${locale}] cvBuilder.${key} must be translated text`);
  }
  for (const key of ["fullName", "email", "country", "targetMajor", "gpa", "graduationYear", "testScores"]) {
    if (typeof cv.missing?.[key] !== "string" || !cv.missing[key].trim()) fail(`[${locale}] cvBuilder.missing.${key} must be translated text`);
  }
  for (const key of ["noActivities", "empty", "noEvidence", "length", "manyEntries"]) {
    if (typeof cv.warning?.[key] !== "string" || !cv.warning[key].trim()) fail(`[${locale}] cvBuilder.warning.${key} must be translated text`);
  }
  if (locale === "en") {
    const advice = JSON.stringify(cv);
    if (/two or three strongest|prioritize sustained responsibility over|usually easiest to scan|under two minutes per file|first thing a reader looks for|strongest two pages/i.test(advice)) {
      fail("[en] cvBuilder still contains unsupported universal admissions guidance");
    }
  }
}

// ---- 1 & 2: ICU validity + parity -------------------------------------------
const flat = {};
let keyCount = 0;
for (const loc of LOCALES) {
  const raw = readFileSync(join(MESSAGES_DIR, `${loc}.json`), "utf8");
  const parsed = JSON.parse(raw);
  assertNoDottedKeys(parsed, loc);
  assertCareerPathMessages(loc, parsed);
  assertCvMessages(loc, parsed);
  assertRecLetterMessages(loc, parsed);
  const map = flatten(parsed);
  flat[loc] = map;
  if (loc === "en") keyCount = map.size;
  for (const [key, value] of map) {
    try {
      new IntlMessageFormat(value, loc);
    } catch (e) {
      fail(`[${loc}] ${key} is not valid ICU: ${e.message.split("\n")[0]}`);
    }
  }
}

const enKeys = [...flat.en.keys()].sort();
for (const loc of LOCALES.slice(1)) {
  const keys = [...flat[loc].keys()].sort();
  const missing = enKeys.filter((k) => !flat[loc].has(k));
  const extra = keys.filter((k) => !flat.en.has(k));
  if (missing.length) fail(`[${loc}] missing ${missing.length} key(s): ${missing.slice(0, 8).join(", ")}`);
  if (extra.length) fail(`[${loc}] ${extra.length} key(s) not present in en: ${extra.slice(0, 8).join(", ")}`);
}

// ---- 3: every t("key") resolves inside its namespace ------------------------
const nsOf = new Map(); // file -> namespace(s) used
const files = [];
(function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) files.push(full);
  }
})(SOURCE_DIR);

let tCalls = 0;
for (const file of files) {
  const src = readFileSync(file, "utf8");
  if (!src.includes("useTranslations")) continue;
  // varName -> namespace
  const hooks = new Map();
  for (const m of src.matchAll(/const\s+(\w+)\s*=\s*useTranslations\(\s*"([^"]+)"\s*\)/g)) {
    hooks.set(m[1], m[2]);
  }
  nsOf.set(file, [...hooks.values()]);
  for (const m of src.matchAll(/\b(\w+)\(\s*"([A-Za-z0-9_.]+)"\s*[,)]/g)) {
    const [, fn, key] = m;
    const ns = hooks.get(fn);
    if (!ns) continue; // not a translations function
    tCalls += 1;
    const full = `${ns}.${key}`;
    for (const loc of LOCALES) {
      if (!flat[loc].has(full)) fail(`${file}: ${fn}("${key}") -> [${loc}] missing "${full}"`);
    }
  }
}

console.log(`  locales: ${LOCALES.join(", ")}`);
console.log(`  keys per locale (en): ${keyCount}`);
console.log("  careerDiscovery path cards: nested title/body checked in all locales");
console.log(`  namespaces: ${[...new Set([...nsOf.values()].flat())].sort().join(", ")}`);
console.log(`  translated component files: ${nsOf.size}`);
console.log(`  t() call sites checked: ${tCalls}`);

if (errors) {
  console.error(`\ni18n check FAILED with ${errors} problem(s).`);
  process.exit(1);
}
console.log("\ni18n check passed.");
