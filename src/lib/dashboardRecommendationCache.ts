import { AsyncTtlCache } from "@/lib/asyncTtlCache";

/** Recommendations are profile-scoped; the enclosing dashboard is never cached. */
export const DASHBOARD_RECOMMENDATION_CACHE_TTL_MS = 15_000;
const recommendationCache = new AsyncTtlCache<string, unknown>(
  DASHBOARD_RECOMMENDATION_CACHE_TTL_MS,
  500,
);

export function dashboardRecommendationCacheKey(profileId: number, locale: string, todayIso: string): string {
  return `${profileId}:${locale}:${todayIso}`;
}

export function getCachedDashboardRecommendations<T>(key: string, create: () => Promise<T>): Promise<T> {
  return recommendationCache.getOrCreate(key, create) as Promise<T>;
}

/**
 * Invalidate every locale/date variant for one profile after a successful
 * profile or saved-list mutation. This cache is process-local; on another
 * instance the 15-second TTL remains the bound on cross-instance freshness.
 */
export function invalidateDashboardRecommendationsForProfile(profileId: number): number {
  const prefix = `${profileId}:`;
  return recommendationCache.invalidateWhere((key) => key.startsWith(prefix));
}
