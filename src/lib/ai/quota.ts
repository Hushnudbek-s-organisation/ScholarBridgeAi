/**
 * Daily AI quota (spec §16). The limits are admin-editable config keys:
 *
 *   ai_free_requests_per_day / ai_premium_requests_per_day
 *   ai_free_tokens_per_day   / ai_premium_tokens_per_day
 *
 * Window: the last 24 hours (rolling — independent of the server timezone).
 * Admins are not limited. Signed-in accounts are counted from `ai_usage`
 * (one row per successful AI reply, logged against the caller). Anonymous
 * callers get the free request allowance per IP, counted in memory (like
 * every other rate limit here — see SECURITY.md about multi-instance limits).
 *
 * A value of 0 means "no AI requests on this plan"; a missing or invalid
 * value falls back to the default in CONFIG_DEFAULTS.
 */
import { NextResponse } from "next/server";
import type { Session } from "@/lib/auth";
import { CONFIG_DEFAULTS, getConfig } from "@/lib/config";
import { getPremiumStatus } from "@/lib/premium";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { aiUsageSince } from "@/lib/ai/usage";

export const AI_QUOTA_WINDOW_MS = 24 * 60 * 60 * 1000;
export const AI_QUOTA_EXCEEDED_CODE = "ai_quota_exceeded";

export type AiQuotaPlan = "free" | "premium";

/** Parse an admin-entered limit: a non-negative integer, else the default. */
export function parseQuotaLimit(raw: string | null | undefined, fallback: string): number {
  const pick = (v: string | null | undefined) => {
    if (v === null || v === undefined || v.trim() === "") return null;
    const n = Number(v);
    return Number.isInteger(n) && n >= 0 ? n : null;
  };
  return pick(raw) ?? pick(fallback) ?? 0;
}

export async function quotaLimits(plan: AiQuotaPlan): Promise<{ requests: number; tokens: number }> {
  const reqKey = `ai_${plan}_requests_per_day`;
  const tokKey = `ai_${plan}_tokens_per_day`;
  const [reqRaw, tokRaw] = await Promise.all([getConfig(reqKey), getConfig(tokKey)]);
  return {
    requests: parseQuotaLimit(reqRaw, CONFIG_DEFAULTS[reqKey]),
    tokens: parseQuotaLimit(tokRaw, CONFIG_DEFAULTS[tokKey]),
  };
}

/** Pure decision (unit-tested): is another request allowed with this usage? */
export function quotaDecision(
  usage: { requests: number; tokens: number },
  limits: { requests: number; tokens: number }
): { ok: true } | { ok: false; reason: "requests" | "tokens" } {
  if (usage.requests >= limits.requests) return { ok: false, reason: "requests" };
  if (usage.tokens >= limits.tokens) return { ok: false, reason: "tokens" };
  return { ok: true };
}

function exceeded(plan: AiQuotaPlan, limit: number, retryAfterSec: number, reason: "requests" | "tokens") {
  const retry = Math.max(1, Math.ceil(retryAfterSec));
  return NextResponse.json(
    {
      error:
        plan === "free"
          ? "You have used today's free AI requests. Try again later or upgrade to Premium."
          : "You have used today's AI allowance. Please try again later.",
      code: AI_QUOTA_EXCEEDED_CODE,
      plan,
      reason,
      limit,
      retryAfterSec: retry,
    },
    { status: 429, headers: { "Retry-After": String(retry) } }
  );
}

export async function checkAiQuota(
  req: Request,
  session: Session | null
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  if (session?.isAdmin) return { ok: true };

  if (!session) {
    const { requests } = await quotaLimits("free");
    if (requests === 0) return { ok: false, response: exceeded("free", 0, AI_QUOTA_WINDOW_MS / 1000, "requests") };
    const r = checkRateLimit(`ai:quota:ip:${clientIp(req)}`, { limit: requests, windowMs: AI_QUOTA_WINDOW_MS });
    return r.ok ? { ok: true } : { ok: false, response: exceeded("free", requests, r.retryAfterSec, "requests") };
  }

  const profileId = session.profile.id;
  const plan: AiQuotaPlan = (await getPremiumStatus(profileId)).isPremium ? "premium" : "free";
  const limits = await quotaLimits(plan);
  const now = Date.now();
  const usage = await aiUsageSince(profileId, new Date(now - AI_QUOTA_WINDOW_MS));
  const decision = quotaDecision(usage, limits);
  if (decision.ok) return { ok: true };
  // The allowance frees up when the oldest counted request leaves the window.
  const retryAfterSec = usage.oldest
    ? (usage.oldest.getTime() + AI_QUOTA_WINDOW_MS - now) / 1000
    : AI_QUOTA_WINDOW_MS / 1000;
  const limit = decision.reason === "requests" ? limits.requests : limits.tokens;
  return { ok: false, response: exceeded(plan, limit, retryAfterSec, decision.reason) };
}
