import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path) => readFileSync(resolve(process.cwd(), path), "utf8");
const seed = read("src/db/seed.ts");
const cycles = read("src/db/seedScholarshipCycles.ts");
const programs = read("src/db/seedProgramCatalog.ts");
const rich = read("src/db/seedRichPlatformData.ts");
const outcomes = read("src/db/seedOutcomesAndStories.ts");
const cache = read("src/lib/catalogCache.ts");
const deadlines = read("src/app/api/deadlines/route.ts");
const autopilot = read("src/app/api/autopilot/route.ts");
const scholarshipsApi = read("src/app/api/scholarships/route.ts");

// Fresh seed inserts retain candidate identities but do not assert unreviewed
// metrics, fees, requirements, or application-cycle dates.
assert.match(seed, /annualTuitionUsd: null/);
assert.match(seed, /worldRanking: null/);
assert.match(seed, /verificationStatus: "unverified"/);
assert.match(seed, /deadline: null/);
assert.match(seed, /minGpa: null/);
assert.match(seed, /requiredDocuments: JSON\.stringify\(\[\]\)/);

// Cycle refresh is title-scoped, clears stale unverified legacy dates, and does not overwrite verified/admin-managed rows.
assert.match(cycles, /inArray\(scholarships\.title, SEEDED_SCHOLARSHIP_TITLES\)/);
assert.match(cycles, /if \(row\.verificationStatus === "verified"\) continue/);
assert.match(cycles, /staleLegacyDate/);
assert.match(cycles, /lastVerifiedAt: new Date\("2026-10-22T00:00:00\.000Z"\)/);
assert.match(cycles, /verificationStatus: "estimated"/);
assert.match(cycles, /verificationStatus: "unverified"/);

// Only exact programmes backed by a programme-specific official URL are inserted as verified; the seeder is additive and idempotent.
assert.match(programs, /VERIFIED_PROGRAM_SEEDS/);
assert.match(programs, /programUrl: spec\.programUrl/);
assert.match(programs, /verificationStatus: "verified"/);
assert.match(programs, /\.onConflictDoNothing\(\)/);
assert.doesNotMatch(programs, /db\.update\(universityPrograms\)/);
assert.match(programs, /requirementsInserted/);
assert.match(programs, /cyclesInserted/);

// Unsupported legacy visa, story, and mentor candidates cannot be newly seeded.
assert.match(rich, /const ENABLE_SOURCE_REVIEWED_PUBLIC_CATALOG_SEEDS = false/);
assert.doesNotMatch(rich, /for \(const (story|req|mentor) of RICH_(SUCCESS_STORIES|VISA_REQUIREMENTS|MENTORS)\)/);
assert.doesNotMatch(rich, /2026-10-01|const VERIFIED_DATE/);
assert.match(rich, /RICH_SUCCESS_STORIES = \[\] as const/);
assert.match(rich, /RICH_VISA_REQUIREMENTS = \[\] as const/);
assert.match(rich, /RICH_MENTORS = \[\] as const/);
assert.match(outcomes, /ADDITIONAL_24_SUCCESS_STORIES:[^=]*= \[\]/);
assert.doesNotMatch(outcomes, /db\.(insert|update)\(/);

// Cached, deadline, and autopilot consumers must not promote unverified cycle
// dates or award terms to user-facing claims.
assert.match(cache, /s\.verificationStatus === "verified" \? s/);
assert.match(cache, /deadlineDate: null/);
assert.match(deadlines, /datedScholarships\.filter\(\(\{ s \}\) => s\.isActive && s\.verificationStatus === "verified"\)/);
assert.match(autopilot, /rows\.filter\(\(s\) => s\.verificationStatus === "verified"\)/);

// Existing unverified scholarship rows are sanitized at the API boundary without
// modifying stored/admin-edited records or deriving matching from their claims.
assert.match(scholarshipsApi, /const isVerified = s\.verificationStatus === "verified"/);
assert.match(scholarshipsApi, /if \(matchProfile && isVerified\)/);
assert.match(scholarshipsApi, /deadlineDate: null/);
assert.match(scholarshipsApi, /description: "Current award details are unverified\."/);

console.log("Stage 7 seed safety checks passed.");
