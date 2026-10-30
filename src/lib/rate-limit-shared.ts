/**
 * Shared (cross-instance) sliding-window rate limiting — audit A20.
 *
 * `lib/rate-limit.ts` keeps counters in Node process memory. That is correct
 * for a single instance, but with several instances behind a load balancer
 * (or a redeploy in the middle of a window) every instance would hand out its
 * OWN full budget — an attacker with a list of IPs could multiply the sign-in
 * or AI budget by the number of instances.
 *
 * The budgets that matter for money and credentials are therefore counted in
 * Postgres (`rate_limit_hits`, one row per hit):
 *
 *   sign-in / sign-up, AI endpoints (the ones that burn real tokens),
 *   anonymous AI quota, Gemini Live tokens, payment initiation,
 *   Telegram login (start/verify), admin writes.
 *
 * Everything else (everyday student writes, forum, beacons) stays on the
 * fast in-process limiter — per-process is plenty for those, and this keeps
 * two extra queries away from every ordinary request.
 *
 * Call sites use exactly the same `LIMITS` presets and the same result shape
 * as the in-process limiter, so nothing downstream changes.
 *
 * Failure mode: if the database is unavailable the call falls back to the
 * in-process limiter (logged). It deliberately fails OPEN with the weaker
 * local budget rather than locking the app out of sign-in — the per-process
 * limits still apply, and a DB outage is already visible elsewhere.
 */
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { rateLimitHits } from "@/db/schema";
import { checkRateLimit, type RateLimitOptions, type RateLimitResult } from "@/lib/rate-limit";

/** How often to sweep expired rows (piggy-backs on normal traffic). */
const CLEANUP_INTERVAL_MS = 60_000;
/** Never keep rows older than this, whatever their window was. */
const MAX_ROW_AGE_MS = 24 * 60 * 60_000;

let lastCleanupAt = 0;
let fallbackNoticedAt = 0;

/**
 * Record one hit for `key` and report whether it is inside the budget.
 * Sliding window, counted from the shared table.
 */
export async function checkSharedRateLimit(
  key: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const now = options.now ? options.now() : Date.now();
  const windowStart = new Date(now - options.windowMs);

  try {
    await db.insert(rateLimitHits).values({ key, hitAt: new Date(now) });

    const [row] = await db
      .select({
        n: sql<number>`count(*)::int`,
        oldest: sql<Date | null>`min(${rateLimitHits.hitAt})`,
      })
      .from(rateLimitHits)
      .where(and(eq(rateLimitHits.key, key), gt(rateLimitHits.hitAt, windowStart)));

    // Opportunistic pruning so the table cannot grow without bound.
    if (now - lastCleanupAt > CLEANUP_INTERVAL_MS) {
      lastCleanupAt = now;
      await db
        .delete(rateLimitHits)
        .where(lt(rateLimitHits.hitAt, new Date(now - Math.max(options.windowMs, MAX_ROW_AGE_MS))));
    }

    const n = row?.n ?? 1;
    const oldest = row?.oldest ? new Date(row.oldest).getTime() : now;
    const over = n > options.limit;
    const resetMs = Math.max(0, oldest + options.windowMs - now);

    return {
      ok: !over,
      remaining: Math.max(0, options.limit - n),
      limit: options.limit,
      retryAfterSec: over ? Math.max(1, Math.ceil(resetMs / 1000)) : 0,
      resetMs,
    };
  } catch (err) {
    // Degrade to the in-process budget (once per minute of logs, not per hit).
    if (now - fallbackNoticedAt > 60_000) {
      fallbackNoticedAt = now;
      console.error(
        "Shared rate-limit store unavailable — falling back to the in-process limiter:",
        (err as Error)?.message
      );
    }
    return checkRateLimit(key, options);
  }
}

/**
 * Forget the hits recorded for one key — used after a SUCCESSFUL sign-in.
 *
 * The sign-in budget is recorded on every attempt, successful ones included,
 * and a desktop install puts every request behind 127.0.0.1: a student who
 * mistyped their password a few times and then got it right would carry the
 * failures for the rest of the 15-minute window, and eight sign-ins in a day
 * (sign out / sign in again) would trip the limit for a perfectly valid
 * password. Success proves the password, so the counter starts over.
 */
export async function clearSharedRateLimit(key: string): Promise<void> {
  try {
    await db.delete(rateLimitHits).where(eq(rateLimitHits.key, key));
  } catch {
    // Losing this is harmless — the window expires on its own.
  }
}

/**
 * Clear the shared counters. INTENDED FOR TESTS ONLY: concurrency checks that
 * assert "exactly one of N parallel requests wins" need a clean budget, and
 * the in-process `resetRateLimits()` alone no longer does that once the
 * route under test counts against the shared table.
 */
export async function resetSharedRateLimits(): Promise<void> {
  await db.delete(rateLimitHits);
}

/**
 * Hits currently inside the window, read-only (no hit is recorded). Used as a
 * cheap pre-check before doing paid work.
 */
export async function sharedHitCount(
  key: string,
  windowMs: number,
  now: number = Date.now()
): Promise<{ count: number; oldest: Date | null }> {
  const windowStart = new Date(now - windowMs);
  const [row] = await db
    .select({
      n: sql<number>`count(*)::int`,
      oldest: sql<Date | null>`min(${rateLimitHits.hitAt})`,
    })
    .from(rateLimitHits)
    .where(and(eq(rateLimitHits.key, key), gt(rateLimitHits.hitAt, windowStart)));
  return {
    count: Number(row?.n ?? 0),
    oldest: row?.oldest ? new Date(row.oldest) : null,
  };
}

/**
 * Admit ONE unit of an allowance — exactly. At most `limit` admissions happen
 * in any window, even when many requests race (a per-key transaction-scoped
 * advisory lock serialises the count-and-insert).
 *
 * A REJECTED attempt is not recorded, so it cannot use up the allowance (or
 * extend the wait). Use this when only admitted work should count. The
 * per-hour abuse limiters above (`checkSharedRateLimit`) keep recording every
 * hit on purpose.
 *
 * Degrades to the in-process limiter (logged) if the database is unavailable.
 */
export async function reserveSharedSlot(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
  const now = options.now ? options.now() : Date.now();
  const windowStart = new Date(now - options.windowMs);
  try {
    return await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${key}))`);
      const [row] = await tx
        .select({
          n: sql<number>`count(*)::int`,
          oldest: sql<Date | null>`min(${rateLimitHits.hitAt})`,
        })
        .from(rateLimitHits)
        .where(and(eq(rateLimitHits.key, key), gt(rateLimitHits.hitAt, windowStart)));
      const before = Number(row?.n ?? 0);
      if (before >= options.limit) {
        const oldest = row?.oldest ? new Date(row.oldest).getTime() : now;
        const resetMs = Math.max(0, oldest + options.windowMs - now);
        return {
          ok: false,
          remaining: 0,
          limit: options.limit,
          retryAfterSec: Math.max(1, Math.ceil(resetMs / 1000)),
          resetMs,
        };
      }
      await tx.insert(rateLimitHits).values({ key, hitAt: new Date(now) });
      return {
        ok: true,
        remaining: Math.max(0, options.limit - before - 1),
        limit: options.limit,
        retryAfterSec: 0,
        resetMs: options.windowMs,
      };
    });
  } catch (err) {
    if (now - fallbackNoticedAt > 60_000) {
      fallbackNoticedAt = now;
      console.error(
        "Shared rate-limit store unavailable — falling back to the in-process limiter:",
        (err as Error)?.message
      );
    }
    return checkRateLimit(key, options);
  }
}
