/**
 * Dependency-audit gate.
 *
 * Why this exists: `npm audit --audit-level=high` fails the whole CI job on ANY
 * high advisory — including ones that have no released fix and no path to one.
 * GHSA-vfj7-8cjw-p6xm (`braces` <= 3.0.3, `first_patched_version: null`) was
 * one, and because it hung off the ESLint toolchain it made the very first CI
 * step of every branch fail, so the other 22 gates never ran at all.
 * (That advisory was withdrawn from the npm database on 2026-10-23 and the
 * exception list is now empty, but the split gate is what surfaced it.)
 *
 * The gate is therefore split in two, and nothing is hidden:
 *
 *   1. Production dependencies — `npm audit --omit=dev --audit-level=high`.
 *      Shipped code has no exceptions; that step still fails CI on its own.
 *   2. Every dependency — this script. It fails on every high/critical advisory
 *      that is not listed in `audit-exceptions.json`, prints EVERY finding
 *      (excepted or not, high or lower), and fails when a listed exception is no
 *      longer needed. An exception needs an advisory id, a package, a reason and
 *      a review date, so the list is an audited decision rather than a mute
 *      `continue-on-error`.
 *
 * Usage:  npm run audit:check
 *         npm run audit:check -- --json   (machine-readable report)
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = join(import.meta.dirname, "..");
const EXCEPTIONS_PATH = join(ROOT, "audit-exceptions.json");
const GATED_SEVERITIES = new Set(["high", "critical"]);
const AS_JSON = process.argv.includes("--json");

interface AdvisoryVia {
  source?: number;
  name?: string;
  title?: string;
  url?: string;
  severity?: string;
}
interface Advisory {
  id: string;
  package: string;
  severity: string;
  title: string;
  url: string;
}
interface Vulnerability {
  name: string;
  severity: string;
  via: (string | AdvisoryVia)[];
}
interface AuditReport {
  metadata?: { vulnerabilities?: Record<string, number> };
  vulnerabilities?: Record<string, Vulnerability>;
}
interface Exception {
  advisory: string;
  package: string;
  severity: string;
  reason: string;
  reviewedOn: string;
  upstream?: string;
}

/**
 * Advisories reachable from a package, following the string links npm emits.
 * `flaggedPackage` stays the package npm flagged, so the report names every
 * package the advisory reaches instead of only the one that owns the advisory.
 */
function advisoriesFor(name: string, report: AuditReport, flaggedPackage = name, seen = new Set<string>()): Advisory[] {
  if (seen.has(name)) return [];
  seen.add(name);
  const pkg = report.vulnerabilities?.[name];
  if (!pkg) return [];
  const found: Advisory[] = [];
  for (const via of pkg.via ?? []) {
    if (typeof via === "string") {
      found.push(...advisoriesFor(via, report, flaggedPackage, seen));
    } else {
      const url = via.url ?? "";
      const id = url.split("/").pop() || `${name}-${via.source ?? "advisory"}`;
      found.push({
        id,
        package: flaggedPackage,
        severity: via.severity ?? pkg.severity,
        title: via.title ?? "(no title in the advisory database)",
        url,
      });
    }
  }
  return found;
}

if (!existsSync(EXCEPTIONS_PATH)) {
  console.error("audit-exceptions.json is missing. It must exist even when empty (`{ \"exceptions\": [] }`) so the gate can tell 'no exceptions' apart from 'the file was lost'. See docs/RELEASE_GATE.md.");
  process.exit(1);
}
const exceptions: Exception[] = (JSON.parse(readFileSync(EXCEPTIONS_PATH, "utf8")) as { exceptions?: Exception[] }).exceptions ?? [];
if (!Array.isArray(exceptions)) {
  console.error("audit-exceptions.json is malformed: `exceptions` must be an array.");
  process.exit(1);
}
for (const entry of exceptions) {
  const missing = (["advisory", "package", "severity", "reason", "reviewedOn"] as const).filter((k) => !entry[k]);
  if (missing.length > 0) {
    console.error(`audit-exceptions.json entry for ${entry.advisory ?? "(no id)"} is incomplete — missing: ${missing.join(", ")}.`);
    process.exit(1);
  }
}
const exceptionIds = new Set(exceptions.map((e) => e.advisory));

const audit = spawnSync("npm", ["audit", "--json"], { cwd: ROOT, encoding: "utf8", maxBuffer: 1024 * 1024 * 64 });
if (audit.error) {
  console.error("Could not run `npm audit`:", audit.error.message);
  process.exit(1);
}
let report: AuditReport;
try {
  report = JSON.parse(audit.stdout || "{}") as AuditReport;
} catch {
  console.error("Could not parse `npm audit --json` output.");
  process.exit(1);
}

const totals = report.metadata?.vulnerabilities ?? {};
const findings: Advisory[] = [];
for (const [name, pkg] of Object.entries(report.vulnerabilities ?? {})) {
  if (!GATED_SEVERITIES.has(pkg.severity)) continue;
  const advisories = advisoriesFor(name, report);
  // A package can be flagged without an advisory of its own (npm links it to a
  // dependency's advisory); keep the package in the report either way.
  findings.push(
    ...(advisories.length > 0
      ? advisories
      : [{ id: `${name} (no advisory id)`, package: name, severity: pkg.severity, title: "", url: "" }])
  );
}

const blocking = findings.filter((a) => !exceptionIds.has(a.id));
const excepted = findings.filter((a) => exceptionIds.has(a.id));
const usedExceptionIds = new Set(excepted.map((a) => a.id));
const stale = exceptions.filter((e) => !usedExceptionIds.has(e.advisory));

/**
 * One advisory reaches a package graph through several paths, so npm flags every
 * package on the way. Group by advisory id so the report reads as decisions
 * rather than as a pile of duplicates.
 */
function groupByAdvisory(list: Advisory[]): { id: string; severity: string; title: string; url: string; packages: string[] }[] {
  const grouped = new Map<string, { id: string; severity: string; title: string; url: string; packages: Set<string> }>();
  for (const a of list) {
    const key = `${a.id}::${a.severity}`;
    const entry = grouped.get(key) ?? { id: a.id, severity: a.severity, title: a.title, url: a.url, packages: new Set<string>() };
    entry.packages.add(a.package);
    if (!entry.title && a.title) entry.title = a.title;
    if (!entry.url && a.url) entry.url = a.url;
    grouped.set(key, entry);
  }
  return [...grouped.values()].map((e) => ({ ...e, packages: [...e.packages].sort() }));
}

const blockingGroups = groupByAdvisory(blocking);
const exceptedGroups = groupByAdvisory(excepted);
const lower = Object.entries(totals).filter(([sev, n]) => n > 0 && !GATED_SEVERITIES.has(sev));

if (AS_JSON) {
  console.log(JSON.stringify({ totals, blocking: blockingGroups, excepted: exceptedGroups, staleExceptions: stale }, null, 2));
} else {
  console.log("Dependency audit — high and critical advisories");
  console.log("------------------------------------------------");
  console.log(
    `Totals: ${totals.critical ?? 0} critical, ${totals.high ?? 0} high, ${totals.moderate ?? 0} moderate, ${totals.low ?? 0} low, ${totals.info ?? 0} info.`
  );
  for (const a of blockingGroups) {
    console.log(`  ✗ [${a.severity}] ${a.id} — ${a.title}`);
    console.log(`      affects: ${a.packages.join(", ")}`);
    console.log(`      ${a.url}`);
  }
  for (const a of exceptedGroups) {
    const entry = exceptions.find((e) => e.advisory === a.id)!;
    console.log(`  • [${a.severity}] ${a.id} — ${a.title}`);
    console.log(`      affects: ${a.packages.join(", ")}`);
    console.log(`      excepted ${entry.reviewedOn}, reviewed: ${entry.reason}`);
    console.log(`      ${a.url || entry.upstream || ""}`);
  }
  if (lower.length > 0) {
    console.log(`  … ${lower.map(([sev, n]) => `${n} ${sev}`).join(", ")} reported by npm but below the gate (run \`npm audit\` for the full list).`);
  }
}

if (blockingGroups.length > 0) {
  console.error(
    `\nFAILED: ${blockingGroups.length} unreviewed high/critical advisory(ies). Fix the dependency, or add a reviewed exception with a reason and a date to audit-exceptions.json (see docs/RELEASE_GATE.md).`
  );
  process.exit(1);
}
if (stale.length > 0) {
  console.error(
    `\nFAILED: ${stale.length} exception(s) are no longer needed — an upstream fix shipped, or the dependency is gone. Remove them from audit-exceptions.json: ${stale
      .map((e) => `${e.advisory} (${e.package})`)
      .join(", ")}.`
  );
  process.exit(1);
}
if (!AS_JSON) {
  console.log(
    `\nPASSED: no unreviewed high or critical advisories. ${exceptedGroups.length} reviewed exception(s) cover ${excepted.length} advisory path(s); production dependencies are gated separately and hard.`
  );
}
