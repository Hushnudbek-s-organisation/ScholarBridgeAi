import { NextResponse } from "next/server";
import { sessionCookieHeader } from "@/lib/auth";
import { sanitizeProfile } from "@/lib/password";
import { checkRateLimit, clientIp, LIMITS, rateLimitedResponse } from "@/lib/rate-limit";
import { readJsonBody } from "@/lib/request";
import { normalizeCodeInput } from "@/lib/telegram/core";
import { verifyRequest } from "@/lib/telegram/service";
import { tgJsonError, tgTablesOr503 } from "@/lib/telegram/http";

export const dynamic = "force-dynamic";

/**
 * POST { id, nonce, code } — check the 6-digit sign-in code the bot sent to a
 * Telegram that is already connected to an account → signed session cookie.
 * (Connecting Telegram is confirmed with a button in the bot, not a code, and
 * Telegram never creates accounts.)
 */
export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = checkRateLimit(`tg:verify:${ip}`, LIMITS.telegramVerify);
  if (!rl.ok) return rateLimitedResponse(rl.retryAfterSec);
  const unavailable = await tgTablesOr503();
  if (unavailable) return unavailable;

  const parsed = await readJsonBody<{ id?: unknown; nonce?: unknown; code?: unknown }>(req, 4096);
  if (!parsed.ok) return tgJsonError(parsed.status, parsed.error, parsed.code);
  const code = normalizeCodeInput(parsed.body.code);
  if (!code) return tgJsonError(400, "Enter the 6-digit code from the bot.", "bad_code_format");

  try {
    const result = await verifyRequest({ id: parsed.body.id, nonce: parsed.body.nonce, code });
    if (!result.ok) {
      return tgJsonError(result.status, result.error, result.code, result.attemptsLeft !== undefined ? { attemptsLeft: result.attemptsLeft } : {});
    }
    const response = NextResponse.json({
      profile: sanitizeProfile(result.profile),
      session: { profileId: result.profile.id, isAdmin: Boolean(result.profile.isAdmin) },
      isNew: false,
    });
    response.headers.set("Set-Cookie", sessionCookieHeader(result.profile, req));
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (err) {
    console.error("POST /api/auth/telegram/verify error:", err);
    return tgJsonError(500, "Could not check the code.");
  }
}
