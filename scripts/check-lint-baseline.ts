/**
 * Lint baseline gate (2026-10 follow-up).
 *
 * The repository carries pre-existing React-Compiler / react-hooks debt that
 * predates this work (see docs/LINT.md for the full list and why it is
 * baselined rather than fixed en masse). CI must still FAIL when:
 *
 *   - a NEW file gets any lint problem,
 *   - an existing file's count for a rule INCREASES (worsened debt),
 *   - or ESLint itself fails to run.
 *
 * Fixing debt (a count decreasing, a file becoming clean, a file removed)
 * is always allowed; re-run with `--update` to shrink the baseline after a
 * cleanup. The gate never hides results: the full eslint JSON is parsed,
 * every remaining issue is listed, and `npm run lint` still shows everything.
 *
 * Usage:
 *   npm run lint:baseline            # gate (CI)
 *   npm run lint:baseline -- --update  # regenerate lint-baseline.json
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const BASELINE_PATH = join(ROOT, "lint-baseline.json");
const UPDATE = process.argv.includes("--update");

interface EslintMessage {
  ruleId: string | null;
  severity: number; // 1 warning, 2 error
  line: number;
  message: string;
}
interface EslintResult {
  filePath: string;
  messages: EslintMessage[];
}

const rel = (p: string) => p.replace(`${ROOT}/`, "").replace(/\\/g, "/");

console.log("Running eslint (same file set as `npm run lint`) …");
const eslint = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["eslint", ".", "--format", "json"],
  { cwd: ROOT, encoding: "utf8", maxBuffer: 1024 * 1024 * 64 }
);
if (eslint.error) {
  console.error("eslint failed to start:", eslint.error.message);
  process.exit(1);
}
// eslint exits 1 when it reports problems — that is expected here; 2+ is a crash.
if (eslint.status === null || eslint.status >= 2) {
  console.error("eslint crashed (exit", eslint.status, "):");
  console.error(eslint.stderr);
  process.exit(1);
}

let results: EslintResult[];
try {
  results = JSON.parse(eslint.stdout || "[]");
} catch {
  console.error("Could not parse eslint JSON output.");
  process.exit(1);
}

// Current state: file → rule → count (errors AND warnings; both are debt).
const current: Record<string, Record<string, number>> = {};
const currentIssues: { file: string; rule: string; line: number; severity: number; message: string }[] = [];
for (const r of results) {
  for (const m of r.messages) {
    const file = rel(r.filePath);
    const rule = m.ruleId ?? "(parse)";
    current[file] ??= {};
    current[file][rule] = (current[file][rule] ?? 0) + 1;
    currentIssues.push({ file, rule, line: m.line, severity: m.severity, message: m.message });
  }
}

const totalNow = currentIssues.length;
const errorsNow = currentIssues.filter((i) => i.severity === 2).length;
const warningsNow = totalNow - errorsNow;

if (UPDATE) {
  const baseline: Record<string, Record<string, number>> = {};
  for (const [file, rules] of Object.entries(current).sort()) baseline[file] = Object.fromEntries(Object.entries(rules).sort());
  writeFileSync(
    BASELINE_PATH,
    JSON.stringify(
      {
        _comment:
          "Committed lint baseline — pre-existing debt only. CI (npm run lint:baseline) FAILS on any NEW or WORSENED issue. After fixing debt, re-run `npm run lint:baseline -- --update` to shrink this file. See docs/LINT.md.",
        total: totalNow,
        errors: errorsNow,
        warnings: warningsNow,
        files: baseline,
      },
      null,
      2
    ) + "\n"
  );
  console.log(`Baseline written: ${rel(BASELINE_PATH)} — ${totalNow} issues (${errorsNow} errors, ${warningsNow} warnings) across ${Object.keys(baseline).length} files.`);
  process.exit(0);
}

if (!existsSync(BASELINE_PATH)) {
  console.error(`No lint baseline at ${rel(BASELINE_PATH)}. Run: npm run lint:baseline -- --update`);
  process.exit(1);
}
const baselineDoc = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
const baseline: Record<string, Record<string, number>> = baselineDoc.files ?? {};

const worsened: string[] = [];
const fixed: string[] = [];
const seenBaseline = new Set<string>();

for (const [file, rules] of Object.entries(current)) {
  const baseRules = baseline[file] ?? {};
  const isNewFile = !baseline[file];
  for (const [rule, count] of Object.entries(rules)) {
    const prev = baseRules[rule] ?? 0;
    seenBaseline.add(file);
    if (count > prev) {
      worsened.push(`  ✗ ${file} — ${rule}: ${prev} → ${count}` + (isNewFile ? "  (NEW FILE)" : "  (worsened)"));
    } else if (count < prev) {
      fixed.push(`  ✓ ${file} — ${rule}: ${prev} → ${count} (debt fixed)`);
    }
  }
}
// Baseline entries that disappeared entirely (file deleted or fully fixed).
for (const file of Object.keys(baseline)) {
  if (!current[file]) fixed.push(`  ✓ ${file} — file has no lint problems anymore`);
}

console.log(`\nCurrent: ${totalNow} issues (${errorsNow} errors, ${warningsNow} warnings) across ${Object.keys(current).length} files.`);
console.log(`Baseline: ${baselineDoc.total ?? "?"} issues across ${Object.keys(baseline).length} files.\n`);

if (worsened.length) {
  console.error("NEW OR WORSENED LINT PROBLEMS — the gate fails:\n");
  for (const line of worsened) console.error(line);
  console.error("\nFix them (or, if a rule is misfiring, file an issue and adjust the rule config — do not add blanket disables).");
  process.exit(1);
}

if (fixed.length) {
  console.log("Debt fixed since the baseline (re-run `npm run lint:baseline -- --update` to shrink it):\n");
  for (const line of fixed) console.log(line);
  console.log("");
}

// List every remaining issue so nothing is hidden.
console.log("Remaining baselined debt (full list — nothing hidden):");
for (const i of currentIssues) {
  console.log(`  ${i.file}:${i.line}  [${i.severity === 2 ? "error" : "warn"}] ${i.rule}  ${i.message}`);
}
console.log(`\nLint gate PASSED — no new or worsened problems. ${totalNow} pre-existing issues remain baselined (see docs/LINT.md).`);
process.exit(0);
