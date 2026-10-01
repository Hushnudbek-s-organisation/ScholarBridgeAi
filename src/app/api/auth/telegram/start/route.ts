import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth";
import { clientIp, LIMITS, rateLimitedResponse } from "@/lib/rate-limit";
import { checkSharedRateLimit } from "@/lib/rate-limit-shared";
import { readJsonBody } from "@/lib/request";
import { startRequest } from "@/lib/telegram/service";
import { tgJsonError, tgTablesOr503 } from "@/lib/telegram/http";

export const dynamic = "force-dynamic";

/**
 * POST { purpose: "login" | "link" } → { id, nonce, deepLink, expiresAt }.
 * "link" (connect Telegram to the signed-in account) requires a session.
 */
export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = await checkSharedRateLimit(`tg:start:${ip}`, LIMITS.telegramStart);
  if (!rl.ok) return rateLimitedResponse(rl.retryAfterSec);
  const unavailable = await tgTablesOr503();
  if (unavailable) return unavailable;

  const parsed = await readJsonBody<{ purpose?: unknown }>(req);
  if (!parsed.ok) return tgJsonError(parsed.status, parsed.error, parsed.code);
  const purpose = parsed.body.purpose === "link" ? "link" : "login";

  let profileId: number | null = null;
  if (purpose === "link") {
    const auth = await authenticate(req);
    if (!auth.ok) return tgJsonError(auth.status, auth.error, auth.code);
    profileId = auth.session.profile.id;
  }

  try {
    const result = await startRequest({ purpose, profileId, ip });
    if (!result.ok) return tgJsonError(result.status, result.error, result.code);
    const { ok: _ok, ...body } = result;
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("POST /api/auth/telegram/start error:", err);
    return tgJsonError(500, "Could not start Telegram sign-in.");
  }
}
