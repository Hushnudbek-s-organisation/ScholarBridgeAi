/**
 * Lightweight client-side stale-while-revalidate (SWR) cache for catalogue
 * responses (`/api/universities`, `/api/scholarships` and the university
 * detail payload).
 *
 * Preserves instant 0ms rendering when a student clicks into `UniversityDetail`
 * and presses "Back", or switches between `#universities` and `#scholarships`,
 * while still revalidating in the background so data stays fresh.
 */

/** How long a cached response may be served at all (ms). */
const SWR_TTL_MS = 60_000;
/**
 * How long a cached response is served WITHOUT a background revalidation (ms).
 *
 * Under this age the browser just fetched the data, so revalidating again
 * would only burn a request; above it the data is shown instantly and
 * refreshed in the background.
 */
const SWR_REVALIDATE_AFTER_MS = 15_000;
/** Upper bound per namespace — the catalogue pages never hold more. */
const MAX_ENTRIES_PER_NS = 60;

export type SwrNamespace = "universities" | "scholarships" | "universityDetail";

type SwrEntry<T> = {
  data: T;
  timestamp: number;
};

const stores: Record<SwrNamespace, Map<string, SwrEntry<unknown>>> = {
  universities: new Map(),
  scholarships: new Map(),
  universityDetail: new Map(),
};

export type CatalogSwrHit<T> = {
  data: T;
  /** Age of the cached response in milliseconds. */
  ageMs: number;
  /** Still inside the TTL — safe to render. */
  isFresh: boolean;
  /** Old enough that the data should be refreshed in the background. */
  shouldRevalidate: boolean;
};

export function getCatalogSwr<T>(
  namespace: SwrNamespace,
  key: string,
): CatalogSwrHit<T> | null {
  const store = stores[namespace];
  const entry = store.get(key) as SwrEntry<T> | undefined;
  if (!entry) return null;
  const ageMs = Date.now() - entry.timestamp;
  if (ageMs >= SWR_TTL_MS) {
    // Expired: drop it so a later read starts clean.
    store.delete(key);
    return null;
  }
  return {
    data: entry.data,
    ageMs,
    isFresh: true,
    shouldRevalidate: ageMs >= SWR_REVALIDATE_AFTER_MS,
  };
}

export function setCatalogSwr<T>(
  namespace: SwrNamespace,
  key: string,
  data: T,
): void {
  const store = stores[namespace];
  if (store.size >= MAX_ENTRIES_PER_NS && !store.has(key)) {
    const oldestKey = store.keys().next().value;
    if (oldestKey !== undefined) store.delete(oldestKey);
  }
  store.set(key, { data, timestamp: Date.now() });
}

export function invalidateCatalogSwr(
  namespace?: SwrNamespace,
): void {
  if (namespace) {
    stores[namespace].clear();
    return;
  }
  stores.universities.clear();
  stores.scholarships.clear();
  stores.universityDetail.clear();
}
