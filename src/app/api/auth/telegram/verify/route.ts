import { NextResponse } from "next/server";
import { authenticate, sessionCookieHeader } from "@/lib/auth";
import { awardPoints } from "@/lib/gamification";
import { sanitizeProfile } from "@/lib/password";
import { checkRateLimit, clientIp, LIMITS, rateLimitedResponse } from "@/lib/rate-limit";
import { ensureReferralCode } from "@/lib/referrals";
import { readJsonBody } from "@/lib/request";
import { recordVisit } from "@/lib/visits";
import { normalizeCodeInput } from "@/lib/telegram/core";
import { verifyRequest } from "@/lib/telegram/service";
import { tgJsonError, tgTablesOr503 } from "@/lib/telegram/http";

export const dynamic = "force-dynamic";

/**
 * POST { id, nonce, code } — check the 6-digit code the bot sent.
 *  - login attempt → signed session cookie (new account if allowed)
 *  - link attempt  → Telegram connected to the signed-in account
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

  // Optional session: only needed (and checked) for "link" attempts.
  const auth = await authenticate(req);
  const sessionProfileId = auth.ok ? auth.session.profile.id : null;

  try {
    const result = await verifyRequest({
      id: parsed.body.id,
      nonce: parsed.body.nonce,
      code,
      sessionProfileId,
      onNewProfile: async (profile) => {
        await recordVisit({ eventType: "signup", path: "/", profileId: profile.id, locale: profile.preferredLocale, headers: req.headers }).catch(() => undefined);
        await awardPoints(profile.id, 20, "profile_created", profile.id).catch(() => undefined);
        await ensureReferralCode(profile.id).catch(() => undefined);
      },
    });
    if (!result.ok) {
      return tgJsonError(result.status, result.error, result.code, result.attemptsLeft !== undefined ? { attemptsLeft: result.attemptsLeft } : {});
    }
    if (result.kind === "link") {
      return NextResponse.json(
        { linked: true, username: result.link.username, firstName: result.link.firstName },
        { headers: { "Cache-Control": "no-store" } }
      );
    }
    const response = NextResponse.json({
      profile: sanitizeProfile(result.profile),
      session: { profileId: result.profile.id, isAdmin: Boolean(result.profile.isAdmin) },
      isNew: result.isNew,
    });
    response.headers.set("Set-Cookie", sessionCookieHeader(result.profile, req));
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (err) {
    console.error("POST /api/auth/telegram/verify error:", err);
    return tgJsonError(500, "Could not check the code.");
  }
}
