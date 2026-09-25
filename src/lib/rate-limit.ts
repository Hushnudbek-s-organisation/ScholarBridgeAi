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
}

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();
const SWEEP_INTERVAL_MS = 60_000;

/** Drop buckets that have been idle longer than their window. */
function sweep(now: number): void {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.hits.length === 0) buckets.delete(key);
  }
  // Hard cap: never let a flood of unique keys grow the map without bound.
  if (buckets.size > 50_000) {
    const keys = [...buckets.keys()].slice(0, buckets.size - 25_000);
    for (const key of keys) buckets.delete(key);
  }
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

  const bucket = buckets.get(key) ?? { hits: [] };
  const windowStart = now - options.windowMs;
  bucket.hits = bucket.hits.filter((t) => t > windowStart);
  bucket.hits.push(now);
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
}

/**
 * Client IP for limiting. Behind Render's proxy the real client address is in
 * `x-forwarded-for` (first hop); `x-real-ip` and `cf-connecting-ip` are
 * fallbacks. Unknown callers share the "unknown" bucket, which is fine because
 * every bucket key also includes the route and (usually) an account id.
 */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    req.headers.get("x-real-ip")?.trim() ||
    req.headers.get("cf-connecting-ip")?.trim() ||
    "unknown"
  );
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
  /** Analytics beacon: 60 / min per visitor. */
  beacon: { limit: 60, windowMs: 60_000 },
} as const;
