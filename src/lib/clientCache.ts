/**
 * A 15-second in-memory GET cache shared by every client panel.
 *
 * WHY
 * ---
 * Hub tabs unmount on switch, so jumping Dashboard → Scholarships →
 * Dashboard re-fetched every endpoint from zero and flashed a spinner for
 * data that changed seconds ago. This cache deduplicates those reads: a
 * GET issued within the TTL is reused (even mid-flight, so two panels
 * mounting together fire ONE request). Every mutation goes through
 * `sendJson`, which invalidates the whole cache — so a saved application
 * never reads stale. The TTL bounds staleness for mutations that bypass
 * the shared helper.
 */

const DEFAULT_TTL_MS = 15_000;

type CacheEntry = { at: number; promise: Promise<unknown> };

// Map lives on globalThis so Fast Refresh / multiple chunks share one cache.
const store: Map<string, CacheEntry> =
  (globalThis as { __sbClientCache?: Map<string, CacheEntry> }).__sbClientCache ??
  new Map<string, CacheEntry>();
(globalThis as { __sbClientCache?: Map<string, CacheEntry> }).__sbClientCache = store;

/** Drop one endpoint (prefix match) or everything (no argument). */
export function invalidateClientCache(urlPrefix?: string): void {
  if (!urlPrefix) {
    store.clear();
    return;
  }
  for (const key of [...store.keys()]) {
    if (key.startsWith(urlPrefix)) store.delete(key);
  }
}

/** `GET url` → parsed JSON, deduplicated for `ttlMs` (0 disables caching). */
export function cachedFetchJson<T>(url: string, fallback: string, ttlMs: number = DEFAULT_TTL_MS): Promise<T> {
  if (ttlMs <= 0) return freshFetch(url, fallback) as Promise<T>;
  const now = Date.now();
  const hit = store.get(url);
  if (hit && now - hit.at < ttlMs) return hit.promise as Promise<T>;
  const promise: Promise<unknown> = freshFetch(url, fallback).catch((err: unknown) => {
    // A failed read must not poison the cache — drop only THIS entry.
    if (store.get(url)?.promise === promise) store.delete(url);
    throw err;
  });
  store.set(url, { at: now, promise });
  if (store.size > 128) {
    // Trim the oldest entries; a full dashboard set is ~10 keys.
    const stale = [...store.entries()].sort((a, b) => a[1].at - b[1].at).slice(0, store.size - 96);
    for (const [key] of stale) store.delete(key);
  }
  return promise as Promise<T>;
}

async function freshFetch(url: string, fallback: string): Promise<unknown> {
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string })?.error || fallback);
  return json;
}
