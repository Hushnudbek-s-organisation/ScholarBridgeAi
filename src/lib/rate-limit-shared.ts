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
 * Clear the shared counters. INTENDED FOR TESTS ONLY: concurrency checks that
 * assert "exactly one of N parallel requests wins" need a clean budget, and
 * the in-process `resetRateLimits()` alone no longer does that once the
 * route under test counts against the shared table.
 */
export async function resetSharedRateLimits(): Promise<void> {
  await db.delete(rateLimitHits);
}
