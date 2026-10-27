/**
 * Per-process memo for fit ("match") and positioning ("chance") scores.
 *
 * WHY
 * ---
 * `/api/universities` scores the **whole filtered catalogue** on every request,
 * not just the page it returns: `calculateUniversityMatch` for each row and
 * `evaluateUniversityAndProgramChance` for each row (5-layer positioning engine,
 * QS benchmark lookup, cohort maths). A student typing in the search box sends a
 * request per keystroke, and every one of them recomputes hundreds of scores that
 * cannot have changed — the profile has not changed, the university has not
 * changed.
 *
 * KEY
 * ---
 * `kind | profileFingerprint | entityId | digest(entity fields the score reads)`
 *
 * `profileFingerprint` comes from `profileMatchFingerprint()` — every
 * score-relevant profile field plus its `updatedAt` — so editing the profile
 * immediately misses the cache. The entity digest covers the university fields
 * that feed the engines (minimums, cost, ranking, acceptance rate, …), so an
 * admin edit misses it too without needing explicit invalidation.
 *
 * WHAT IS CACHED
 * ---------------
 * The score results themselves (numbers, reason codes, params). They are pure
 * functions of (profile, university), the profile is authored by one student and
 * authorized per request before this is consulted, and the memo is per process
 * and bounded — never shared across instances or written to the database.
 *
 * BOUNDS
 * ------
 * `MATCH_MEMO_MAX` entries (default 20 000: ~300 universities × a handful of
 * students), `MATCH_MEMO_TTL_MS` (default 5 min). LRU by re-insertion; expired
 * and overflow entries are dropped on write.
 */

const MEMO_KEY = "__sbMatchMemo";

function envInt(name: string, fallback: number, min: number, max: number): number {
  const raw = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(raw)));
}

const MAX_ENTRIES = envInt("MATCH_MEMO_MAX", 20_000, 0, 200_000);
const TTL_MS = envInt("MATCH_MEMO_TTL_MS", 300_000, 0, 3_600_000);

type Entry = { expiresAt: number; value: unknown };
type Store = Map<string, Entry> & { __hits?: number; __misses?: number };

function store(): Store {
  const g = globalThis as typeof globalThis & { [MEMO_KEY]?: Store };
  if (!g[MEMO_KEY]) g[MEMO_KEY] = new Map() as Store;
  return g[MEMO_KEY]!;
}

/** FNV-1a over the entity's score-relevant values. */
function digestEntity(entity: Record<string, unknown>): string {
  let hash = 0x811c9dc5;
  const add = (text: string) => {
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
  };
  for (const key of Object.keys(entity).sort()) {
    const value = entity[key];
    if (value == null) {
      add(`${key}=;`);
      continue;
    }
    if (typeof value === "object") {
      // Arrays (programme field lists) and nested extras.
      add(`${key}=${JSON.stringify(value)};`);
      continue;
    }
    add(`${key}=${String(value)};`);
  }
  return (hash >>> 0).toString(36);
}

/**
 * Return the memoized result of `compute`, or compute and remember it.
 *
 * Disabled entirely when `MATCH_MEMO_MAX` is 0 or the TTL is 0 — that is the
 * escape hatch for a debugging session that wants every call to hit the engine.
 */
export function memoizeMatch<T>(
  kind: string,
  profileFingerprint: string,
  entityId: unknown,
  entity: Record<string, unknown>,
  compute: () => T
): T {
  if (MAX_ENTRIES === 0 || TTL_MS === 0) return compute();
  // No profile → every visitor shares one bucket, and the result would be the
  // "no profile" answer only. Still correct, and cheap.
  const key = `${kind}|${profileFingerprint}|${String(entityId ?? "")}|${digestEntity(entity)}`;
  const cache = store();
  const now = Date.now();

  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) {
    cache.delete(key);
    cache.set(key, hit);
    cache.__hits = (cache.__hits ?? 0) + 1;
    return hit.value as T;
  }

  const value = compute();
  cache.__misses = (cache.__misses ?? 0) + 1;
  cache.set(key, { expiresAt: now + TTL_MS, value });
  if (cache.size > MAX_ENTRIES) {
    for (const [k, entry] of cache) {
      if (cache.size <= MAX_ENTRIES) break;
      if (entry.expiresAt <= now || cache.size > MAX_ENTRIES) cache.delete(k);
    }
  }
  return value;
}

/** Forget every memoized score (profile/catalogue change, tests). */
export function invalidateMatchMemo(): void {
  store().clear();
}

export function matchMemoStats() {
  const cache = store();
  const now = Date.now();
  let live = 0;
  for (const entry of cache.values()) if (entry.expiresAt > now) live++;
  const hits = cache.__hits ?? 0;
  const misses = cache.__misses ?? 0;
  return {
    entries: cache.size,
    live,
    maxEntries: MAX_ENTRIES,
    ttlMs: TTL_MS,
    hits,
    misses,
    hitRate: hits + misses === 0 ? null : Math.round((hits / (hits + misses)) * 1000) / 1000,
  };
}
