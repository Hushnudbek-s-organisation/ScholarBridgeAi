/**
 * In-memory sliding-window rate limiting (security baseline).
 *
 * Purpose: stop credential brute-forcing, AI-cost abuse and payload spam.
 * The counter lives in the Node process memory, which is correct for a single
 * Render/Node instance (this deployment). If the app is ever scaled to several
 * instances, swap the store for Redis/Upstash — the call sites do not change.
 *
 * Requests that exceed the budget get HTTP 429 + `Retry-After`.
 */
import { NextResponse } from "next/server";

interface Bucket {
  hits: number[];
  /** The window this key was last counted with (sweep uses it to expire). */
  windowMs: number;
  /** Timestamp of the newest hit (sweep uses it to expire). */
  lastHitAt: number;
}

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();
const SWEEP_INTERVAL_MS = 60_000;
/** Never hold more timestamps than this for one key (see `MAX_HITS_SLACK`). */
const MAX_HITS_SLACK = 1;

/**
 * Drop buckets that can no longer block anyone.
 *
 * The previous sweep deleted only buckets whose `hits` array was already empty
 * — and `hits` is pruned on *access*, not by the sweep, so a bucket that had
 * ever been hit never became empty. Idle keys therefore accumulated until the
 * 50 000-entry hard cap kicked in and deleted arbitrary buckets, which could
 * evict budgets that were still live. Expiring by `lastHitAt + windowMs`
 * frees exactly the buckets that cannot affect a verdict any more.
 */
function sweep(now: number): void {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  const minIdleMs = 10 * 60_000;
  for (const [key, bucket] of buckets) {
    if (now - bucket.lastHitAt > Math.max(bucket.windowMs, minIdleMs)) buckets.delete(key);
  }
  // Hard cap: never let a flood of unique keys grow the map without bound.
  if (buckets.size > 50_000) {
    const keys = [...buckets.keys()].slice(0, buckets.size - 25_000);
    for (const key of keys) buckets.delete(key);
  }
}

/** Diagnostics/tests: how much memory the limiter is holding. */
export function rateLimitBucketStats(): { buckets: number; hits: number } {
  let hits = 0;
  for (const bucket of buckets.values()) hits += bucket.hits.length;
  return { buckets: buckets.size, hits };
}

export interface RateLimitOptions {
  /** Max requests inside `windowMs`. */
  limit: number;
  /** Window size in milliseconds. */
  windowMs: number;
  /** Injectable clock (tests). */
  now?: () => number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  limit: number;
  retryAfterSec: number;
  resetMs: number;
}

/**
 * Record one request for `key` and report whether it is still inside budget.
 * The hit is always recorded (so a rejected caller cannot retry for free).
 */
export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = options.now ? options.now() : Date.now();
  sweep(now);

  const bucket = buckets.get(key) ?? { hits: [], windowMs: options.windowMs, lastHitAt: now };
  const windowStart = now - options.windowMs;
  bucket.windowMs = options.windowMs;
  bucket.lastHitAt = now;
  bucket.hits = bucket.hits.filter((t) => t > windowStart);
  bucket.hits.push(now);
  // Bound the memory ONE key can cost. A caller that floods a single key (a
  // broken client retry loop, an attacker) used to grow its timestamp array
  // for the whole window — limit × 10⁶ requests meant 10⁶ numbers retained.
  // The OLDEST hits are the ones that decide when the block lifts, so those
  // are what we keep; the verdict, `remaining` and `Retry-After` stay exactly
  // the same as before, only the redundant tail is dropped.
  const maxHits = Math.max(1, options.limit) + MAX_HITS_SLACK;
  if (bucket.hits.length > maxHits) bucket.hits = bucket.hits.slice(0, maxHits);
  buckets.set(key, bucket);

  const over = bucket.hits.length > options.limit;
  const oldestInWindow = bucket.hits[0] ?? now;
  const resetMs = Math.max(0, oldestInWindow + options.windowMs - now);

  return {
    ok: !over,
    remaining: Math.max(0, options.limit - bucket.hits.length),
    limit: options.limit,
    retryAfterSec: over ? Math.max(1, Math.ceil(resetMs / 1000)) : 0,
    resetMs,
  };
}

/** Remove all counters (used by tests and by admin sign-out). */
export function resetRateLimits(): void {
  buckets.clear();
  // Also re-arm the sweep, so an injected clock in a test is honoured instead
  // of being compared against the process's real start time.
  lastSweep = 0;
}

/**
 * Client IP for rate limiting.
 *
 * SECURITY: `X-Forwarded-For` is `<whatever the client sent>, <added by
 * proxy 1>, <added by proxy 2>…`. Each proxy *appends* the address it saw, so
 * only the rightmost entries were written by infrastructure we trust. The
 * leftmost entry is attacker-controlled: keying on it (as this function used
 * to) let anyone reset every per-IP budget — anonymous AI calls, sign-up,
 * sign-in — by sending a different fake `X-Forwarded-For` on each request.
 *
 * Configuration (env):
 *   CLIENT_IP_HEADER    Optional single-value header set by your edge that the
 *                       client cannot forge (e.g. `cf-connecting-ip` when the
 *                       app is only reachable through Cloudflare). Takes
 *                       priority when present.
 *   TRUSTED_PROXY_HOPS  How many proxies append to X-Forwarded-For in front of
 *                       the app (default 1 — one load balancer, e.g. Render).
 *                       The client IP is the entry that many places from the
 *                       right.
 *
 * Only the *last* X-Forwarded-For value is meaningful when a client sends the
 * header several times; `Headers.get` joins duplicates with ", " in order, so
 * counting from the right handles that case too.
 */
export function clientIp(
  req: Request,
  env: Record<string, string | undefined> = process.env
): string {
  const customHeader = env.CLIENT_IP_HEADER?.trim().toLowerCase();
  if (customHeader) {
    const value = req.headers.get(customHeader)?.split(",").pop()?.trim();
    if (value) return value;
  }

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = Math.max(1, Math.floor(Number(env.TRUSTED_PROXY_HOPS) || 1));
    const chain = forwarded
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    if (chain.length) {
      // Nth from the right; if the chain is shorter than the configured hops
      // the leftmost entry is the best we have.
      return chain[Math.max(0, chain.length - hops)];
    }
  }

  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Standard 429 response. */
export function rateLimitedResponse(retryAfterSec: number, message?: string) {
  return NextResponse.json(
    {
      error: message ?? "Too many requests. Please wait and try again.",
      code: "rate_limited",
      retryAfter: retryAfterSec,
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    }
  );
}

// ---------------------------------------------------------------------------
// Presets — one place to tune the whole app's throttling
// ---------------------------------------------------------------------------
export const LIMITS = {
  /** Email + password sign-in: 8 tries / 15 min per IP, 8 / 15 min per email. */
  signIn: { limit: 8, windowMs: 15 * 60_000 },
  /** Account creation: 5 / hour per IP. */
  signUp: { limit: 5, windowMs: 60 * 60_000 },
  /** AI endpoints: 20 / minute per account (they cost real money). */
  ai: { limit: 20, windowMs: 60_000 },
  /** Anonymous AI/visa calls with no account: 6 / minute per IP. */
  aiAnonymous: { limit: 6, windowMs: 60_000 },
  /** Forum writes: 20 / 10 min per account. */
  forumWrite: { limit: 20, windowMs: 10 * 60_000 },
  /** Payment initiation: 10 / 10 min per account. */
  payment: { limit: 10, windowMs: 10 * 60_000 },
  /** Consulting / contact form: 5 / hour per IP. */
  contact: { limit: 5, windowMs: 60 * 60_000 },
  /** Admin mutations: 240 / 10 min per admin. */
  adminWrite: { limit: 240, windowMs: 10 * 60_000 },
  /** Everyday student writes (goals, answers, checklist ticks): 180 / 10 min per account. */
  userWrite: { limit: 180, windowMs: 10 * 60_000 },
  /** Success-story submissions: 5 / hour per account (admin-moderated). */
  storySubmit: { limit: 5, windowMs: 60 * 60_000 },
  /** Telegram sign-in attempts started: 10 / 15 min per IP. */
  telegramStart: { limit: 10, windowMs: 15 * 60_000 },
  /** Telegram code checks: 20 / 15 min per IP (each attempt also locks after 5 wrong codes). */
  telegramVerify: { limit: 20, windowMs: 15 * 60_000 },
  /** Gemini Live visa-interview tokens (30-min paid sessions): 10 / hour per account. */
  visaLiveToken: { limit: 10, windowMs: 60 * 60_000 },
  /** Public lookup endpoints: 30 / minute per IP. */
  publicLookup: { limit: 30, windowMs: 60_000 },
  /** Analytics beacon: 60 / min per visitor. */
  beacon: { limit: 60, windowMs: 60_000 },
} as const;
