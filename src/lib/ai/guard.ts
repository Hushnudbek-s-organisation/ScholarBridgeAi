/**
 * Shared guard for the AI endpoints (they cost real money and are the easiest
 * thing on the site to abuse).
 *
 * Every AI route funnels through `guardAiRequest`, which:
 *  1. caps the request body size,
 *  2. rate limits — authenticated callers per account, anonymous callers per
 *     IP with a much tighter budget,
 *  3. checks that a supplied `profileId` belongs to the session (no reading
 *     another student's profile into a prompt),
 *  4. for Premium AI features (`feature`), requires a signed-in account whose
 *     plan includes it — the website's PremiumGate alone is not enforcement,
 *  5. enforces the admin-configured daily AI quota (see lib/ai/quota),
 *  6. clamps the user-supplied prompt so a 10 MB message cannot be turned into
 *     a huge bill.
 *
 * Routes must log usage against `usageProfileId` (the caller), so the quota
 * counts every request the account made — whichever profile it was about.
 */
import { NextResponse } from "next/server";
import { authenticate, optionalProfileAccess } from "@/lib/auth";
import type { FeatureKey } from "@/lib/entitlements";
import { premiumGate } from "@/lib/premium";
import { checkAiQuota } from "@/lib/ai/quota";
import {
  LIMITS,
  checkRateLimit,
  clientIp,
  rateLimitedResponse,
} from "@/lib/rate-limit";
import { checkSharedRateLimit } from "@/lib/rate-limit-shared";
import { clampPrompt, readJsonBody } from "@/lib/request";

export type AiGuardResult =
  | { ok: true; body: Record<string, any>; profileId: number | null; usageProfileId: number | null }
  | { ok: false; response: ReturnType<typeof NextResponse.json> };

export async function guardAiRequest(
  req: Request,
  opts: { bodyLimit?: number; feature?: FeatureKey } = {}
): Promise<AiGuardResult> {
  const parsed = await readJsonBody<Record<string, any>>(req, opts.bodyLimit ?? 128 * 1024);
  if (!parsed.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: parsed.error, code: parsed.code },
        { status: parsed.status }
      ),
    };
  }

  const claimed = parsed.body?.profileId ?? null;
  const access = await optionalProfileAccess(req, claimed);
  if (!access.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      ),
    };
  }

  // Resolve the caller even when no profileId was sent: otherwise a signed-in
  // account could drop the id and be treated as anonymous (no quota, and
  // Premium checks skipped).
  let session = access.session;
  if (!session) {
    const auth = await authenticate(req);
    if (auth.ok) session = auth.session;
  }

  if (opts.feature) {
    if (!session) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Sign in to use this feature.", code: "unauthenticated" },
          { status: 401 }
        ),
      };
    }
    const locked = await premiumGate(session.profile.id, opts.feature);
    if (locked) return { ok: false, response: locked };
  }

  // Authenticated callers are limited per account; anonymous ones per IP and
  // far more tightly — an unauthenticated AI proxy is how bills get burned.
  const limit = session
    ? await checkSharedRateLimit(`ai:${session.profile.id}`, LIMITS.ai)
    : await checkSharedRateLimit(`ai:ip:${clientIp(req)}`, LIMITS.aiAnonymous);
  if (!limit.ok) {
    return { ok: false, response: rateLimitedResponse(limit.retryAfterSec) };
  }

  const quota = await checkAiQuota(req, session);
  if (!quota.ok) return { ok: false, response: quota.response };

  return {
    ok: true,
    body: parsed.body,
    profileId: access.targetId,
    usageProfileId: session?.profile.id ?? null,
  };
}

/** Clamp the free-text prompt fields an AI route accepts. */
export function safePromptFields(body: Record<string, any>, max = 8000) {
  return {
    message: clampPrompt(body?.message, max),
    sopText: clampPrompt(body?.sopText, 40_000),
    personalHook: clampPrompt(body?.personalHook, 2000),
    careerGoals: clampPrompt(body?.careerGoals, 2000),
    universityName: clampPrompt(body?.universityName, 200),
    programName: clampPrompt(body?.programName, 200),
    targetUniversity: clampPrompt(body?.targetUniversity, 200),
    targetMajor: clampPrompt(body?.targetMajor, 200),
    language: clampPrompt(body?.language, 8),
  };
}
