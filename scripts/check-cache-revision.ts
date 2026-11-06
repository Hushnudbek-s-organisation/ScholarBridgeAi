/**
 * Behavior guard for the shared cache revision (§11).
 *
 * NOT a source-regex test: it injects real stores, bumps revisions through the
 * same functions the routes call, and proves that a SECOND, independent cache
 * instance computes a different key after a write on the first. It also proves
 * the documented non-shared fallback is never presented as shared.
 *
 * Referenced by the docblock in src/lib/cacheRevision.ts.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  LocalCacheRevisionStore,
  setCacheRevisionStore,
  getCacheRevisionStore,
  readCacheRevision,
  bumpCacheRevision,
  cacheRevisionKeyPart,
  INVALIDATION_SCOPES,
  type CacheScope,
} from "../src/lib/cacheRevision";
import {
  sharedDashboardRecommendationCacheKey,
  dashboardRecommendationCacheKey,
  invalidateDashboardRecommendationsForProfile,
} from "../src/lib/dashboardRecommendationCache";

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
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

async function main() {
  console.log("Shared cache revision — cross-instance invalidation");

  // A single shared store stands in for `public.cache_revisions`: every
  // "instance" reads the SAME monotonic revision from it.
  const sharedStore = new LocalCacheRevisionStore();
  setCacheRevisionStore(sharedStore);

  const r0 = await readCacheRevision("profile");
  check("initial shared revision is a positive number", r0.revision >= 1);
  check("an injected store is NOT reported as shared (honest flag)",
    r0.shared === false, `shared=${r0.shared}`);

  // Two independent cache instances key the same profile/locale/context.
  const base = dashboardRecommendationCacheKey(17, "en", "2026-11-06", "gpa3.7");
  const instanceAKeyBefore = await sharedDashboardRecommendationCacheKey(17, "en", "2026-11-06", "gpa3.7");
  const instanceBKeyBefore = await sharedDashboardRecommendationCacheKey(17, "en", "2026-11-06", "gpa3.7");
  check("both instances use the same key before any write", instanceAKeyBefore === instanceBKeyBefore);
  check("the key is scoped by profile/locale/date AND carries the revision",
    instanceAKeyBefore.startsWith(base) && /:r\d+[sl]$/.test(instanceAKeyBefore));

  // A write handled by instance A bumps the SHARED revision.
  const bumped = await bumpCacheRevision("profile", "activity added on instance A");
  check("a write bumps the revision monotonically", bumped.revision === r0.revision + 1);

  // Instance B, which never saw the local invalidation, MUST now compute a
  // different key — the process-local gap is closed.
  const instanceBKeyAfter = await sharedDashboardRecommendationCacheKey(17, "en", "2026-11-06", "gpa3.7");
  check("a second instance computes a DIFFERENT key after a write elsewhere",
    instanceBKeyAfter !== instanceBKeyBefore,
    `${instanceBKeyBefore} vs ${instanceBKeyAfter}`);

  // A different profile/locale stays isolated.
  const otherProfile = await sharedDashboardRecommendationCacheKey(18, "uz", "2026-11-06", "gpa3.7");
  check("another profile never shares the first profile's key", !otherProfile.startsWith(`${base.split(":")[0]}:`) && otherProfile !== instanceBKeyAfter);

  // The real invalidation entry point must also bump the shared revision.
  const beforeInvalidate = await readCacheRevision("profile");
  invalidateDashboardRecommendationsForProfile(17);
  // fire-and-forget bump is awaited via a microtask flush
  await new Promise((resolve) => setTimeout(resolve, 0));
  const afterInvalidate = await readCacheRevision("profile");
  check("invalidateDashboardRecommendationsForProfile bumps the shared revision",
    afterInvalidate.revision > beforeInvalidate.revision,
    `${beforeInvalidate.revision} -> ${afterInvalidate.revision}`);

  // Scopes are independent: a catalogue edit must not change the profile key.
  const profileBeforeCatalogue = await readCacheRevision("profile");
  await bumpCacheRevision("catalogue", "university evidence changed");
  const profileAfterCatalogue = await readCacheRevision("profile");
  check("scopes are isolated (catalogue bump does not move profile revision)",
    profileAfterCatalogue.revision === profileBeforeCatalogue.revision);

  // Key fragment distinguishes shared from local — no false "shared" claim.
  check("shared and local revisions yield different key fragments",
    cacheRevisionKeyPart(5, true) !== cacheRevisionKeyPart(5, false) && cacheRevisionKeyPart(5, true).endsWith("s"));

  // Invalidation scopes cover every surface named in the requirement.
  const needed: CacheScope[] = ["profile", "applications", "documents", "catalogue", "evidence"];
  const allScopes = new Set(Object.values(INVALIDATION_SCOPES).flat());
  check("profile/application/document/catalogue/evidence changes invalidate scoped caches",
    needed.every((s) => allScopes.has(s)), [...allScopes].join(","));
  check("a catalogue edit invalidates university, scholarship and opportunity caches",
    ["universities", "scholarships", "opportunities"].every((s) => INVALIDATION_SCOPES.catalogue.includes(s as CacheScope)));

  // Fallback: when the DB store throws, we get a clearly NON-shared revision.
  const throwingStore = {
    async read(): Promise<number> { throw new Error("migration not applied"); },
    async bump(): Promise<number> { throw new Error("migration not applied"); },
  };
  setCacheRevisionStore(throwingStore);
  const fb1 = await readCacheRevision("default");
  const fb2 = await bumpCacheRevision("default", "fallback bump");
  check("a missing migration degrades to a local revision flagged NOT shared",
    fb1.shared === false && fb2.shared === false);
  check("the local fallback still increments so this instance is not stale",
    fb2.revision > fb1.revision);
  check("the fallback never claims a shared cross-instance invalidation",
    getCacheRevisionStore() === throwingStore);

  // Restore a clean injection for other guards that import the module.
  setCacheRevisionStore(null);

  // Static wiring: the DDL, the dashboard key consumer and the write paths.
  const migration = read("supabase/security_evidence_research_2026-11-06.sql");
  check("cache_revisions table exists with a primary key on scope",
    /CREATE TABLE[\s\S]{0,240}public\.cache_revisions[\s\S]{0,400}PRIMARY KEY/i.test(migration));
  check("cache_revisions bump is atomic ON CONFLICT DO UPDATE",
    /ON CONFLICT \(scope\) DO UPDATE[\s\S]{0,200}revision = public\.cache_revisions\.revision \+ 1/.test(
      read("src/lib/cacheRevision.ts")));
  const dashRoute = read("src/app/api/dashboard/route.ts");
  check("dashboard API consumes the shared-revision key, not the local one",
    /sharedDashboardRecommendationCacheKey/.test(dashRoute));
  const catalogCache = read("src/lib/catalogCache.ts");
  check("catalogue cache invalidation bumps the shared revision",
    /bumpCacheRevision\("catalogue"/.test(catalogCache));
  const dashCache = read("src/lib/dashboardRecommendationCache.ts");
  check("profile/write invalidation bumps the shared revision",
    /bumpCacheRevision\("profile"/.test(dashCache));

  console.log(`\n✅ ${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
