/**
 * Refresh-mode regression guard.
 *
 * Proves that status recomputation is explicitly distinguished from an actual
 * official-page re-read, and that a failed verification cannot refresh a
 * verified date. It does not connect to production.
 *
 * Run: npm run test:refresh-modes
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseRefreshMode, DEFAULT_REFRESH_MODE } from "../src/lib/refreshModes";
import { mayRefreshVerifiedDate } from "../src/lib/evidencePolicy";

const ROOT = join(import.meta.dirname, "..");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

let passed = 0;
const failures: string[] = [];
function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failures.push(`${name}: ${(error as Error).message}`);
    console.log(`  ✗ ${name} — ${(error as Error).message}`);
  }
}

function between(source: string, start: string, end: string): string {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, `could not locate ${start} … ${end}`);
  return source.slice(a, b);
}

console.log("\nRefresh modes — repository guard");

check("default refresh is status-from-existing-dates, not an official re-read", () => {
  assert.equal(DEFAULT_REFRESH_MODE, "status_from_existing_dates");
  assert.equal(parseRefreshMode(undefined), "status_from_existing_dates");
  assert.equal(parseRefreshMode("unknown"), "status_from_existing_dates");
  assert.equal(parseRefreshMode("official_source_reverification"), "official_source_reverification");
});

check("status recomputation never writes last_verified_at", () => {
  const source = between(read("src/lib/refresh.ts"), "async function recomputeStatusFromDates", "async function reverifyOfficialSources");
  assert.match(source, /applicationStatus/);
  assert.match(source, /needs_verification/);
  // Reading lastVerifiedAt to detect stale rows is allowed; writing it is not.
  assert.doesNotMatch(source, /\.set\([^)]*lastVerifiedAt/);
  assert.doesNotMatch(source, /verificationStatus:\s*"verified"/);
  assert.match(source, /Intentionally no last_verified_at/);
});

check("official re-verification requires adapter, evidence and success before a date moves", () => {
  const source = between(read("src/lib/refresh.ts"), "async function reverifyOfficialSources", "export async function runRefresh");
  assert.match(source, /!adapter/);
  assert.match(source, /mayRefreshVerifiedDate/);
  assert.match(source, /if \(!allowed\)/);
  assert.match(source, /continue;/);
  assert.match(source, /lastVerifiedAt: now/);
  assert.match(source, /failedVerification = true/);
  assert.match(source, /verified date unchanged/);
  assert.equal(mayRefreshVerifiedDate({ officialPageReRead: true, verificationSucceeded: false, evidencePresent: true }), false);
});

check("admin refresh route passes an explicit mode but exposes no HTTP adapter", () => {
  const route = read("src/app/api/admin/refresh/route.ts");
  assert.match(route, /parseRefreshMode\(body\.mode\)/);
  assert.match(route, /runRefresh\(scope, \{ mode \}\)/);
  assert.match(route, /No official source adapter is exposed over HTTP/);
  assert.doesNotMatch(route, /officialSourceAdapter:\s*body/);
});

check("reviewable migration records mode, pages read and verified-date updates", () => {
  const migration = read("supabase/security_evidence_research_2026-11-06.sql");
  assert.match(migration, /ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'status_from_existing_dates'/);
  assert.match(migration, /source_pages_read/);
  assert.match(migration, /verified_dates_updated/);
  assert.match(migration, /failed_verification/);
  assert.match(migration, /official_source_reverification/);
});

check("a failed check leaves verifiedAt alone", () => {
  assert.equal(mayRefreshVerifiedDate({ officialPageReRead: true, verificationSucceeded: false, evidencePresent: true }), false);
  assert.equal(mayRefreshVerifiedDate({ officialPageReRead: false, verificationSucceeded: true, evidencePresent: true }), false);
  assert.equal(mayRefreshVerifiedDate({ officialPageReRead: true, verificationSucceeded: true, evidencePresent: false }), false);
  assert.equal(mayRefreshVerifiedDate({ officialPageReRead: true, verificationSucceeded: true, evidencePresent: true }), true);
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}
