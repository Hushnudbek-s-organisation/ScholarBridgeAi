/**
 * P1 regression — profile edits must recompute derived data everywhere.
 *
 * Reported: effects / caches keyed only on `profileId` kept old GPA, IELTS,
 * SAT, major, degree, countries and budget metrics after an edit. The dashboard
 * recommendations cache had the same flaw, and invalidation only reached the
 * instance that handled the write.
 *
 * Run: npm run test:profile-recompute
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { profileMatchFingerprint } from "../src/lib/profileMatchFingerprint";
import {
  dashboardRecommendationCacheKey,
  getCachedDashboardRecommendations,
  invalidateDashboardRecommendationsForProfile,
} from "../src/lib/dashboardRecommendationCache";

const ROOT = join(import.meta.dirname, "..");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

let passed = 0;
const failures: string[] = [];
function check(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed++;
      console.log(`  ✓ ${name}`);
    })
    .catch((error) => {
      failures.push(`${name}: ${(error as Error).message}`);
      console.log(`  ✗ ${name} — ${(error as Error).message}`);
    });
}

const base = {
  id: 901,
  degreeLevel: "master",
  targetMajor: "Computer Science",
  gpa: 3.4,
  gpaScale: 4,
  ieltsScore: 6.5,
  satScore: 1300,
  budgetAnnualUsd: 20000,
  preferredCountries: ["USA", "Germany"],
  needScholarship: true,
  updatedAt: "2026-11-01T00:00:00.000Z",
};

async function main() {
  console.log("\nP1 — every score-relevant edit changes the fingerprint");
  await check("GPA / IELTS / SAT / major / degree / countries / budget all change it", () => {
    const original = profileMatchFingerprint(base);
    const edits: Record<string, Partial<typeof base>> = {
      gpa: { gpa: 3.9 },
      ielts: { ieltsScore: 7.5 },
      sat: { satScore: 1520 },
      major: { targetMajor: "Data Science" },
      degree: { degreeLevel: "bachelor" },
      countries: { preferredCountries: ["UK"] },
      budget: { budgetAnnualUsd: 35000 },
      aid: { needScholarship: false },
      updatedAt: { updatedAt: "2026-11-06T00:00:00.000Z" },
    };
    for (const [field, patch] of Object.entries(edits)) {
      assert.notEqual(profileMatchFingerprint({ ...base, ...patch }), original, field);
    }
    assert.equal(profileMatchFingerprint({ ...base }), original, "an unchanged profile is stable");
  });

  console.log("\nP1 — the dashboard cache cannot serve stale metrics");

  await check("cache keys differ by fingerprint, not just profileId", () => {
    const before = profileMatchFingerprint(base);
    const after = profileMatchFingerprint({ ...base, gpa: 3.9 });
    const keyBefore = dashboardRecommendationCacheKey(base.id, "uz", "2026-11-06", before);
    const keyAfter = dashboardRecommendationCacheKey(base.id, "uz", "2026-11-06", after);
    assert.notEqual(keyBefore, keyAfter);
    assert.equal(keyBefore, dashboardRecommendationCacheKey(base.id, "uz", "2026-11-06", before));
    assert.notEqual(keyBefore, dashboardRecommendationCacheKey(base.id, "en", "2026-11-06", before), "locale still matters");
    assert.ok(keyBefore.startsWith(`${base.id}:`), "per-profile invalidation still works");
  });

  await check("a changed fingerprint actually recomputes, and invalidation drops every variant", async () => {
    const profileId = 902;
    let calls = 0;
    const create = async () => { calls += 1; return { grantCount: calls }; };
    const first = await getCachedDashboardRecommendations(
      dashboardRecommendationCacheKey(profileId, "en", "2026-11-06", "fp-old"), create,
    );
    const cached = await getCachedDashboardRecommendations(
      dashboardRecommendationCacheKey(profileId, "en", "2026-11-06", "fp-old"), create,
    );
    assert.deepEqual(first, cached);
    assert.equal(calls, 1, "an unchanged profile reuses the result");
    const edited = await getCachedDashboardRecommendations(
      dashboardRecommendationCacheKey(profileId, "en", "2026-11-06", "fp-new"), create,
    );
    assert.deepEqual(edited, { grantCount: 2 });
    assert.equal(calls, 2, "an edited profile re-scores");
    const dropped = invalidateDashboardRecommendationsForProfile(profileId);
    assert.equal(dropped, 2, "both locale/fingerprint variants are invalidated");
  });

  await check("the dashboard passes the fresh profile fingerprint AND the shared revision into the key", () => {
    const route = read("src/app/api/dashboard/route.ts");
    // The key is now the SHARED-revision key: it still carries the fingerprint,
    // but also the DB revision so a write on another instance changes the key.
    assert.match(route, /sharedDashboardRecommendationCacheKey\(/);
    assert.match(route, /profileMatchFingerprint\(profile\)/, "scoring memo also uses it");
    assert.doesNotMatch(route, /const key = dashboardRecommendationCacheKey\(/, "must not fall back to the process-local-only key");
  });

  await check("profile writes invalidate both client caches, and the journey refetches", () => {
    const home = read("src/app/HomeClient.tsx");
    assert.match(home, /invalidateCatalogSwr\(\)/);
    assert.match(home, /invalidateClientCache\(\)/);
    assert.match(home, /profileMatchFingerprint\(activeProfile\)/);
    const journey = read("src/components/journey/JourneyControlCenter.tsx");
    assert.match(journey, /profileVersion/);
    assert.match(journey, /\[profileId, profileVersion\]/);
    const explorer = read("src/components/UniversityExplorer.tsx");
    assert.match(explorer, /profileFingerprint/);
  });

  await check("cross-instance freshness uses a shared DB revision, not just a fingerprint", () => {
    // A second instance reads the fresh profile row and derives a DIFFERENT
    // key (fingerprint), AND a shared revision bump from another instance
    // changes the key too — so catalogue/application/document writes that do
    // not alter THIS profile's fingerprint are no longer served stale.
    const source = read("src/lib/dashboardRecommendationCache.ts");
    assert.match(source, /fingerprintDigest/);
    assert.match(source, /profileFingerprint/);
    assert.match(source, /[Pp]rocess-local/);
    assert.match(source, /sharedDashboardRecommendationCacheKey/);
    assert.match(source, /readCacheRevision|cacheRevisionKeyPart/);
    assert.match(source, /bumpCacheRevision\("profile"/, "profile writes bump the shared revision");
    const oldKey = dashboardRecommendationCacheKey(903, "uz", "2026-11-06", "before-edit");
    const newKey = dashboardRecommendationCacheKey(903, "uz", "2026-11-06", "after-edit");
    assert.notEqual(oldKey, newKey);
    const revision = read("src/lib/cacheRevision.ts");
    assert.match(revision, /public\.cache_revisions/, "the shared revision is DB-backed");
    assert.match(revision, /shared = false|NON.?shared|NOT shared/, "the fallback is honestly non-shared");
  });

  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    for (const failure of failures) console.log(`  - ${failure}`);
    process.exit(1);
  }
}

void main();
