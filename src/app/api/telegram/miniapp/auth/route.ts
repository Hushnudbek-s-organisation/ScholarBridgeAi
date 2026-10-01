import { NextResponse } from "next/server";
import { signTelegramChannelToken, TELEGRAM_CHANNEL_TTL_SECONDS } from "@/lib/auth";
import { sanitizeProfile } from "@/lib/password";
import { clientIp, rateLimitedResponse } from "@/lib/rate-limit";
import { checkSharedRateLimit } from "@/lib/rate-limit-shared";
import { readJsonBody } from "@/lib/request";
import { verifyInitData, MAX_INIT_DATA_LENGTH } from "@/lib/telegram/initData";
import { getLinkByTelegramUser, getProfileRow, publicSiteUrl } from "@/lib/telegram/messaging";
import { getBotToken, getTelegramSettings } from "@/lib/telegram/settings";
import { tgJsonError, tgTablesOr503 } from "@/lib/telegram/http";

export const dynamic = "force-dynamic";

/** Mini App session exchanges: 30 / 5 min per client. */
const MINIAPP_AUTH = { limit: 30, windowMs: 5 * 60_000 };

/**
 * POST { initData } — the Mini App's raw, signed launch string.
 *
 * The server re-verifies Telegram's HMAC with the bot token (never trusting
 * initDataUnsafe), checks auth_date freshness, and then:
 *  - linked Telegram   → a short-lived bearer token for the existing API
 *                        (kept in page memory only — never in localStorage)
 *  - not linked        → { linked: false } + where to sign up / connect.
 *                        No account is ever created here.
 */
export async function POST(req: Request) {
  const rl = await checkSharedRateLimit(`tg:miniapp:${clientIp(req)}`, MINIAPP_AUTH);
  if (!rl.ok) return rateLimitedResponse(rl.retryAfterSec);
  const unavailable = await tgTablesOr503();
  if (unavailable) return unavailable;

  const parsed = await readJsonBody<{ initData?: unknown }>(req, MAX_INIT_DATA_LENGTH + 512);
  if (!parsed.ok) return tgJsonError(parsed.status, parsed.error, parsed.code);

  const { token } = await getBotToken();
  if (!token) return tgJsonError(503, "The Telegram bot is not configured yet.", "not_configured");

  const result = verifyInitData(parsed.body.initData, token);
  if (!result.ok) {
    // One generic answer for every failure reason (no oracle for forgers).
    return tgJsonError(401, "Could not verify the Telegram session. Please reopen the app from the bot.", "invalid_init_data");
  }

  try {
    const settings = await getTelegramSettings();
    const siteUrl = publicSiteUrl(settings) || null;
    const link = await getLinkByTelegramUser(result.user.id);
    const profile = link ? await getProfileRow(link.profileId) : null;
    if (!link || !profile) {
      return NextResponse.json(
        {
          linked: false,
          telegram: { firstName: result.user.firstName, languageCode: result.user.languageCode },
          siteUrl,
          botUsername: settings.botUsername || null,
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }
    const sessionToken = signTelegramChannelToken({ profileId: profile.id, telegramUserId: result.user.id, channel: "miniapp" });
    const safe = sanitizeProfile(profile) as Record<string, unknown>;
    return NextResponse.json(
      {
        linked: true,
        token: sessionToken,
        expiresIn: TELEGRAM_CHANNEL_TTL_SECONDS,
        profile: {
          id: safe.id,
          name: safe.name,
          preferredLocale: safe.preferredLocale,
          degreeLevel: safe.degreeLevel,
          targetMajor: safe.targetMajor,
          gpa: safe.gpa,
          gpaScale: safe.gpaScale,
          ieltsScore: safe.ieltsScore,
          toeflScore: safe.toeflScore,
          preferredCountries: safe.preferredCountries,
          budgetAnnualUsd: safe.budgetAnnualUsd,
        },
        siteUrl,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("POST /api/telegram/miniapp/auth error:", err instanceof Error ? err.message : err);
    return tgJsonError(500, "Could not open the app.");
  }
}
