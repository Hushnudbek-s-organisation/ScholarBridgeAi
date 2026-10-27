/**
 * Response-time localization is expensive and highly repetitive.
 *
 * `catalogLocalizer` translates database content (university descriptions,
 * program names, scholarship requirements) on the way out of the API. Every one
 * of those translators walks dictionaries, tries several regex patterns and
 * splits compound strings — cheap once, noticeable when the explorer localizes
 * the whole catalogue for every keystroke in the search box.
 *
 * The input, meanwhile, barely changes: the same university row, the same
 * scholarship row, in the same language, until an administrator edits it. That
 * is exactly the shape a cache wants.
 *
 * KEY
 * ---
 * `locale | kind | id | updatedAt | digest(localizable fields)`
 *
 *  * `id` + `locale` + `updatedAt` is the identity the phase brief asks for;
 *  * the digest is there for correctness: a route may pass a row that carries
 *    per-request extras (match score, saved flag, distance) while the
 *    *localizable* fields are identical. Keying on those fields only means two
 *    requests with different scores share the translation, never the numbers.
 *
 * WHAT IS CACHED
 * --------------
 * Only the translated **strings** of an object (`{ city: "Myunxen", … }`), never
 * the object itself. The caller always gets a fresh `{ ...row, ...translated }`,
 * so nothing that leaves this module can be mutated by one request and seen by
 * another.
 *
 * BOUNDS
 * ------
 * `LOCALIZE_MEMO_MAX` entries (default 4 000, LRU by re-insertion) and a TTL
 * (`LOCALIZE_MEMO_TTL_MS`, default 10 min). `invalidateLocalizeMemo()` is called
 * from `invalidateCatalogCache()`, so an admin edit is never served stale.
 */

const MEMO_KEY = "__sbLocalizeMemo";

const MAX_ENTRIES = (() => {
  const raw = Number(process.env.LOCALIZE_MEMO_MAX ?? 4000);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 4000;
})();

const TTL_MS = (() => {
  const raw = Number(process.env.LOCALIZE_MEMO_TTL_MS ?? 600_000);
  return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 600_000;
})();

type Entry = { expiresAt: number; value: Record<string, string> };
type Counters = {
  hits: number;
  misses: number;
  textHits: number;
  textMisses: number;
};
type Store = Map<string, Entry> & { __counters?: Counters };

function counters(cache: Store): Counters {
  if (!cache.__counters) cache.__counters = { hits: 0, misses: 0, textHits: 0, textMisses: 0 };
  return cache.__counters;
}

function store(): Store {
  const g = globalThis as typeof globalThis & { [MEMO_KEY]?: Store };
  if (!g[MEMO_KEY]) g[MEMO_KEY] = new Map() as Store;
  return g[MEMO_KEY]!;
}

/** Cheap, stable 32-bit FNV-1a — enough to tell two strings apart per key. */
export function digest(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/** The value a translator returns for one field: a string or nothing. */
export type LocalizedFields = Record<string, string>;

function signature(source: Record<string, unknown>, fields: readonly string[]): { hash: string; chars: number } {
  let out = "";
  for (const field of fields) {
    const value = source[field];
    if (typeof value === "string") out += `${field}=${value.length}:${value};`;
    else if (value != null && typeof value !== "object") out += `${field}=${String(value)};`;
    else if (value != null) out += `${field}=json:${JSON.stringify(value)};`;
  }
  return { hash: digest(out), chars: out.length };
}

/**
 * Rows whose localizable text is shorter than this are translated on every
 * request: hashing them costs about as much as translating them, so caching
 * would be overhead, not a saving. Real catalogue prose (descriptions,
 * requirement bodies, highlights) is far above the line.
 */
const MIN_ROW_CHARS = 96;

export function memoKeyFor(
  kind: string,
  locale: string,
  id: unknown,
  stamp: unknown,
  source: Record<string, unknown>,
  fields: readonly string[]
): string {
  return `${locale}|${kind}|${String(id ?? "")}|${stamp == null ? "" : String(stamp)}|${signature(source, fields).hash}`;
}

/**
 * Translate the given fields of `row`, reusing a cached result when the same
 * row (same id, same `updatedAt`, same localizable content) was already
 * localized in this language.
 *
 * The returned object is always new; only the translated strings are shared.
 */
export function memoizedLocalize<T extends Record<string, unknown>>(
  kind: string,
  locale: string,
  row: T,
  fields: readonly string[],
  translate: (row: T) => LocalizedFields
): T {
  if (TTL_MS === 0) return { ...row, ...translate(row) };
  const stamp = row.updatedAt ?? row.lastVerifiedAt ?? row.verifiedAt ?? "";
  const sig = signature(row, fields);
  if (sig.chars < MIN_ROW_CHARS) return { ...row, ...translate(row) };
  const key = `${locale}|${kind}|${String(row.id ?? "")}|${String(stamp)}|${sig.hash}`;
  const cache = store();
  const now = Date.now();

  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) {
    // Refresh recency (Map keeps insertion order).
    cache.delete(key);
    cache.set(key, hit);
    counters(cache).hits++;
    return { ...row, ...hit.value };
  }

  const value = translate(row);
  counters(cache).misses++;
  cache.set(key, { expiresAt: now + TTL_MS, value });
  if (cache.size > MAX_ENTRIES) {
    // Drop the oldest entries first (insertion order), and any expired ones.
    for (const [k, entry] of cache) {
      if (cache.size <= MAX_ENTRIES) break;
      if (entry.expiresAt <= now || cache.size > MAX_ENTRIES) cache.delete(k);
    }
  }
  return { ...row, ...value };
}

/**
 * Memoize a pure string→string translator (descriptions, requirement bodies).
 *
 * These run their dictionary + regex layers on every row; the same paragraph is
 * translated again and again for every visitor who opens the same catalogue
 * page. The key is the translator name + language + the input itself, so it can
 * never return a translation for different text.
 */
export function memoizedText(
  kind: string,
  locale: string,
  input: string,
  translate: () => string
): string {
  if (TTL_MS === 0 || input.length < 24) return translate(); // short labels are cheap
  const cache = store();
  const now = Date.now();
  const key = `text|${locale}|${kind}|${input.length}|${digest(input)}`;
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) {
    cache.delete(key);
    cache.set(key, hit);
    counters(cache).textHits++;
    return hit.value.__text ?? input;
  }
  const value = translate();
  counters(cache).textMisses++;
  cache.set(key, { expiresAt: now + TTL_MS, value: { __text: value } });
  if (cache.size > MAX_ENTRIES) {
    for (const [k, entry] of cache) {
      if (cache.size <= MAX_ENTRIES) break;
      if (entry.expiresAt <= now || cache.size > MAX_ENTRIES) cache.delete(k);
    }
  }
  return value;
}

/** Drop every entry and every counter (admin catalogue writes, tests). */
export function invalidateLocalizeMemo(): void {
  const cache = store();
  cache.clear();
  cache.__counters = { hits: 0, misses: 0, textHits: 0, textMisses: 0 };
}

/** Diagnostics for `/api/admin/diagnostics` and the tests. */
export function localizeMemoStats() {
  const cache = store();
  const now = Date.now();
  let live = 0;
  for (const entry of cache.values()) if (entry.expiresAt > now) live++;
  const c = counters(cache);
  return {
    entries: cache.size,
    live,
    maxEntries: MAX_ENTRIES,
    ttlMs: TTL_MS,
    // Row-object translations (universities / scholarships / programs / opportunities)
    hits: c.hits,
    misses: c.misses,
    hitRate: c.hits + c.misses === 0 ? null : Math.round((c.hits / (c.hits + c.misses)) * 1000) / 1000,
    // Pure string translations (descriptions, requirement bodies)
    textHits: c.textHits,
    textMisses: c.textMisses,
    textHitRate:
      c.textHits + c.textMisses === 0 ? null : Math.round((c.textHits / (c.textHits + c.textMisses)) * 1000) / 1000,
  };
}
