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
 *  4. clamps the user-supplied prompt so a 10 MB message cannot be turned into
 *     a huge bill.
 */
import { NextResponse } from "next/server";
import { optionalProfileAccess } from "@/lib/auth";
import {
  LIMITS,
  checkRateLimit,
  clientIp,
  rateLimitedResponse,
} from "@/lib/rate-limit";
import { clampPrompt, readJsonBody } from "@/lib/request";

export type AiGuardResult =
  | { ok: true; body: Record<string, any>; profileId: number | null }
  | { ok: false; response: ReturnType<typeof NextResponse.json> };

export async function guardAiRequest(
  req: Request,
  opts: { bodyLimit?: number } = {}
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

  // Authenticated callers are limited per account; anonymous ones per IP and
  // far more tightly — an unauthenticated AI proxy is how bills get burned.
  const limit = access.session
    ? checkRateLimit(`ai:${access.session.profile.id}`, LIMITS.ai)
    : checkRateLimit(`ai:ip:${clientIp(req)}`, LIMITS.aiAnonymous);
  if (!limit.ok) {
    return { ok: false, response: rateLimitedResponse(limit.retryAfterSec) };
  }

  return { ok: true, body: parsed.body, profileId: access.targetId };
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
