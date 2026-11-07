/**
 * Shared cache revision — fixes the process-local invalidation gap.
 *
 * The dashboard recommendation cache, catalog cache and profile-match cache are
 * process-local TTL caches. `invalidateDashboardRecommendationsForProfile()`
 * only clears the instance that handled the write, so a second instance served
 * stale data until its TTL expired. A fingerprint helps when the *same* profile
 * row is re-read, but catalogue evidence, application and document changes do
 * not always change that fingerprint.
 *
 * The fix is a single, cheap, monotonically-increasing revision per scope in
 * `public.cache_revisions` (see the reviewable migration). Every cache key
 * includes the revision; any authenticated write bumps it, so EVERY instance
 * computes a different key on its next read without a shared cache service.
 *
 * The store is injectable, so `scripts/check-cache-revision.ts` proves the
 * cross-instance behavior offline. The DB-backed default is loaded lazily and
 * degrades to a clearly-marked local revision (never a false "shared" claim).
 */
import { getDb } from "@/lib/research-agent/durableStore";

export type CacheScope =
  | `profile:${number}`
  | `applications:${number}`
  | `documents:${number}`
  | "default"
  | "catalogue"
  | "scholarships"
  | "universities"
  | "opportunities"
  | "profile"
  | "applications"
  | "documents"
  | "evidence";

export interface CacheRevisionStore {
  read(scope: CacheScope): Promise<number>;
  bump(scope: CacheScope, reason: string): Promise<number>;
}

/** In-memory store used by tests and as a documented, non-shared fallback. */
export class LocalCacheRevisionStore implements CacheRevisionStore {
  private revisions = new Map<CacheScope, number>();
  public readonly shared = false;
  async read(scope: CacheScope): Promise<number> {
    return this.revisions.get(scope) ?? 1;
  }
  async bump(scope: CacheScope, _reason: string): Promise<number> {
    const next = (this.revisions.get(scope) ?? 1) + 1;
    this.revisions.set(scope, next);
    return next;
  }
}

/** DB-backed store. Reads are cheap; bumps are a single atomic UPSERT. */
export class DbCacheRevisionStore implements CacheRevisionStore {
  public readonly shared = true;
  async read(scope: CacheScope): Promise<number> {
    const db = await getDb();
    const result = await (db as any).execute(
      // Imported lazily to keep this module usable in offline guards.
      (await import("drizzle-orm")).sql`SELECT revision FROM public.cache_revisions WHERE scope = ${scope}`,
    );
    const rows = (result as { rows?: { revision: string | number }[] }).rows ?? [];
    return rows.length ? Number(rows[0].revision) || 1 : 1;
  }
  async bump(scope: CacheScope, reason: string): Promise<number> {
    const db = await getDb();
    const result = await (db as any).execute(
      (await import("drizzle-orm")).sql`
        INSERT INTO public.cache_revisions (scope, revision, reason, updated_at)
        VALUES (${scope}, 2, ${reason}, now())
        ON CONFLICT (scope) DO UPDATE
          SET revision = public.cache_revisions.revision + 1,
              reason = EXCLUDED.reason,
              updated_at = now()
        RETURNING revision
      `,
    );
    const rows = (result as { rows?: { revision: string | number }[] }).rows ?? [];
    return rows.length ? Number(rows[0].revision) || 1 : 1;
  }
}

let store: CacheRevisionStore | null = null;
/** Override the store (tests, or a deployment without the migration). */
export function setCacheRevisionStore(next: CacheRevisionStore | null): void {
  store = next;
  fallbackUntil = 0;
}
export function getCacheRevisionStore(): CacheRevisionStore {
  if (!store) store = new DbCacheRevisionStore();
  return store;
}

/**
 * Read the shared revision. When the migration/DB is unavailable we fall back
 * to a process-local counter that is explicitly returned as `shared = false`,
 * so callers never present a local-only invalidation as a cross-instance one.
 */
let localFallback: LocalCacheRevisionStore | null = null;
let warned = false;
let fallbackUntil = 0;
export async function readCacheRevision(scope: CacheScope = "default"): Promise<{ revision: number; shared: boolean }> {
  const active = getCacheRevisionStore();
  try {
    if (Date.now() < fallbackUntil) throw new Error("revision store cooling down");
    return { revision: await active.read(scope), shared: active instanceof DbCacheRevisionStore };
  } catch {
    fallbackUntil ||= Date.now() + 5000;
    if (Date.now() >= fallbackUntil) fallbackUntil = Date.now() + 5000;
    if (!warned) {
      warned = true;
      console.warn("cache_revisions unavailable — using process-local revision (NOT shared across instances)");
    }
    if (!localFallback) localFallback = new LocalCacheRevisionStore();
    return { revision: await localFallback.read(scope), shared: false };
  }
}

/** Bump after a successful authenticated write; safe to await or fire-and-forget. */
export async function bumpCacheRevision(scope: CacheScope, reason: string): Promise<{ revision: number; shared: boolean }> {
  const active = getCacheRevisionStore();
  try {
    if (Date.now() < fallbackUntil) throw new Error("revision store cooling down");
    return { revision: await active.bump(scope, reason), shared: active instanceof DbCacheRevisionStore };
  } catch {
    if (!localFallback) localFallback = new LocalCacheRevisionStore();
    return { revision: await localFallback.bump(scope, reason), shared: false };
  }
}

/** Stable key fragment carrying user/profile/locale/context + shared revision. */
export function cacheRevisionKeyPart(revision: number, shared: boolean): string {
  return `r${revision}${shared ? "s" : "l"}`;
}

/**
 * Which scopes a write must invalidate. Profile edits affect recommendations
 * AND the catalog-facing profile-match cache; evidence affects the catalogue.
 */
export const INVALIDATION_SCOPES: Record<string, CacheScope[]> = {
  profile: ["profile"],
  application: ["applications", "default"],
  document: ["documents", "default"],
  catalogue: ["catalogue", "universities", "scholarships", "opportunities", "evidence", "default"],
  evidence: ["evidence", "catalogue", "default"],
};
