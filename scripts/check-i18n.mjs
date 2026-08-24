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
const COMPONENTS_DIR = "src/components";

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

// ---- 1 & 2: ICU validity + parity -------------------------------------------
const flat = {};
let keyCount = 0;
for (const loc of LOCALES) {
  const raw = readFileSync(join(MESSAGES_DIR, `${loc}.json`), "utf8");
  const parsed = JSON.parse(raw);
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
})(COMPONENTS_DIR);

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
console.log(`  namespaces: ${[...new Set([...nsOf.values()].flat())].sort().join(", ")}`);
console.log(`  translated component files: ${nsOf.size}`);
console.log(`  t() call sites checked: ${tCalls}`);

if (errors) {
  console.error(`\ni18n check FAILED with ${errors} problem(s).`);
  process.exit(1);
}
console.log("\ni18n check passed.");
