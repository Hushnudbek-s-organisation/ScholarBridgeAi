import { AsyncTtlCache } from "@/lib/asyncTtlCache";
import { readCacheRevision, cacheRevisionKeyPart, bumpCacheRevision } from "@/lib/cacheRevision";

/** Recommendations are profile-scoped; the enclosing dashboard is never cached. */
export const DASHBOARD_RECOMMENDATION_CACHE_TTL_MS = 15_000;
const recommendationCache = new AsyncTtlCache<string, unknown>(
  DASHBOARD_RECOMMENDATION_CACHE_TTL_MS,
  500,
);

/** Short, stable digest so a long fingerprint does not bloat every cache key. */
function fingerprintDigest(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/**
 * The key MUST include the profile's score-relevant fingerprint.
 *
 * Previously `${profileId}:${locale}:${todayIso}` kept GPA / IELTS / SAT /
 * major / degree / countries / budget edits stale for 15 s on the same
 * instance — and explicit invalidation only fixes the instance that handled
 * the write. Because the dashboard reads the fresh profile row on every
 * request, a fingerprinted key makes a different instance compute a new key
 * automatically, without a shared cache or a paid service.
 */
export function dashboardRecommendationCacheKey(
  profileId: number,
  locale: string,
  todayIso: string,
  profileFingerprint = "",
): string {
  return `${profileId}:${profileFingerprint ? fingerprintDigest(profileFingerprint) : "none"}:${locale}:${todayIso}`;
}

/**
 * Shared-revision key. Includes profile, locale, date, score-relevant
 * fingerprint AND the DB revision, so a write on ANY instance changes the key
 * on every other instance. `shared=false` is preserved in the key so a local
 * fallback is never mistaken for a cross-instance invalidation.
 */
export async function sharedDashboardRecommendationCacheKey(
  profileId: number,
  locale: string,
  todayIso: string,
  profileFingerprint = "",
): Promise<string> {
  const { revision, shared } = await readCacheRevision("profile");
  return `${dashboardRecommendationCacheKey(profileId, locale, todayIso, profileFingerprint)}:${cacheRevisionKeyPart(revision, shared)}`;
}

export function getCachedDashboardRecommendations<T>(key: string, create: () => Promise<T>): Promise<T> {
  return recommendationCache.getOrCreate(key, create) as Promise<T>;
}

/**
 * Invalidate every locale/date/fingerprint variant for one profile after a
 * successful profile or saved-list mutation. Process-local, but the
 * fingerprinted key is what keeps OTHER instances honest.
 */
export function invalidateDashboardRecommendationsForProfile(profileId: number): number {
  const prefix = `${profileId}:`;
  // ALSO bump the shared revision: this instance's entries are cleared now,
  // and every OTHER instance will compute a new key on its next read.
  // Fire-and-forget; bumpCacheRevision never rejects (documented fallback).
  void bumpCacheRevision("profile", `dashboard recommendation invalidation for profile ${profileId}`);
  return recommendationCache.invalidateWhere((key) => key.startsWith(prefix));
}
