/**
 * Lightweight client-side stale-while-revalidate (SWR) cache for catalogue
 * list responses (`/api/universities` and `/api/scholarships`).
 *
 * Preserves instant 0ms rendering when a student clicks into `UniversityDetail`
 * and presses "Back", or switches between `#universities` and `#scholarships`,
 * while still revalidating in the background so data stays fresh.
 */

const SWR_TTL_MS = 60_000;
const MAX_ENTRIES_PER_NS = 50;

type SwrEntry<T> = {
  data: T;
  timestamp: number;
};

const stores: Record<"universities" | "scholarships", Map<string, SwrEntry<unknown>>> = {
  universities: new Map(),
  scholarships: new Map(),
};

export function getCatalogSwr<T>(
  namespace: "universities" | "scholarships",
  key: string,
): { data: T; isFresh: boolean } | null {
  const store = stores[namespace];
  const entry = store.get(key) as SwrEntry<T> | undefined;
  if (!entry) return null;
  const age = Date.now() - entry.timestamp;
  return {
    data: entry.data,
    isFresh: age < SWR_TTL_MS,
  };
}

export function setCatalogSwr<T>(
  namespace: "universities" | "scholarships",
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
  namespace?: "universities" | "scholarships",
): void {
  if (namespace) {
    stores[namespace].clear();
    return;
  }
  stores.universities.clear();
  stores.scholarships.clear();
}
