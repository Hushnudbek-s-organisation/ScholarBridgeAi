import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { telegramLinks } from "@/db/schema";
import { authenticate } from "@/lib/auth";
import { checkRateLimit, LIMITS, rateLimitedResponse } from "@/lib/rate-limit";
import { readJsonBody } from "@/lib/request";
import { BOT_TEXTS, parseMutedTypes, pickLang, TELEGRAM_NOTIFICATION_TYPES } from "@/lib/telegram/core";
import { getLinkByProfile, sendToChat } from "@/lib/telegram/service";
import { getBotToken, getTelegramSettings } from "@/lib/telegram/settings";
import { tgJsonError, tgTablesOr503 } from "@/lib/telegram/http";

export const dynamic = "force-dynamic";

/**
 * The signed-in student's own Telegram connection.
 * GET → status · PUT { notifyEnabled?, mutedTypes? } · DELETE → disconnect
 * POST { action: "test" } → send a test message to the connected chat.
 * Always acts on the session's profile — there is no id to tamper with.
 */
async function guard(req: Request, write = false) {
  const unavailable = await tgTablesOr503();
  if (unavailable) return { ok: false as const, response: unavailable };
  const auth = await authenticate(req);
  if (!auth.ok) return { ok: false as const, response: tgJsonError(auth.status, auth.error, auth.code) };
  if (write) {
    const rl = checkRateLimit(`tg:me:${auth.session.profile.id}`, LIMITS.userWrite);
    if (!rl.ok) return { ok: false as const, response: rateLimitedResponse(rl.retryAfterSec) };
  }
  return { ok: true as const, session: auth.session };
}

function present(link: typeof telegramLinks.$inferSelect | null) {
  if (!link) return null;
  return {
    username: link.username,
    firstName: link.firstName,
    notifyEnabled: link.notifyEnabled,
    mutedTypes: parseMutedTypes(link.mutedTypes),
    blocked: link.blocked,
    linkedAt: link.linkedAt,
  };
}

export async function GET(req: Request) {
  const g = await guard(req);
  if (!g.ok) return g.response;
  try {
    const [settings, { token }, link] = await Promise.all([getTelegramSettings(), getBotToken(), getLinkByProfile(g.session.profile.id)]);
    const configured = Boolean(token && settings.botUsername);
    return NextResponse.json(
      {
        bot: {
          configured,
          botUsername: configured ? settings.botUsername : null,
          notificationsEnabled: configured && settings.notificationsEnabled,
          loginEnabled: configured && settings.loginEnabled,
        },
        link: present(link),
        types: settings.types,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("GET /api/telegram/me error:", err);
    return tgJsonError(500, "Could not load Telegram settings.");
  }
}

export async function PUT(req: Request) {
  const g = await guard(req, true);
  if (!g.ok) return g.response;
  const parsed = await readJsonBody<{ notifyEnabled?: unknown; mutedTypes?: unknown }>(req, 8192);
  if (!parsed.ok) return tgJsonError(parsed.status, parsed.error, parsed.code);
  const patch: Partial<typeof telegramLinks.$inferInsert> = {};
  if (typeof parsed.body.notifyEnabled === "boolean") patch.notifyEnabled = parsed.body.notifyEnabled;
  if (Array.isArray(parsed.body.mutedTypes)) {
    const known = new Set<string>(TELEGRAM_NOTIFICATION_TYPES);
    patch.mutedTypes = JSON.stringify(
      Array.from(new Set(parsed.body.mutedTypes.filter((t): t is string => typeof t === "string" && known.has(t))))
    );
  }
  if (Object.keys(patch).length === 0) return tgJsonError(400, "Nothing to update", "validation");
  try {
    const [row] = await db.update(telegramLinks).set(patch).where(eq(telegramLinks.profileId, g.session.profile.id)).returning();
    if (!row) return tgJsonError(404, "Telegram is not connected.", "not_linked");
    return NextResponse.json({ link: present(row) });
  } catch (err) {
    console.error("PUT /api/telegram/me error:", err);
    return tgJsonError(500, "Could not save.");
  }
}

export async function DELETE(req: Request) {
  const g = await guard(req, true);
  if (!g.ok) return g.response;
  try {
    const link = await getLinkByProfile(g.session.profile.id);
    if (!link) return NextResponse.json({ unlinked: false });
    await db.delete(telegramLinks).where(eq(telegramLinks.id, link.id));
    const { token } = await getBotToken();
    if (token) {
      const lang = pickLang(g.session.profile.preferredLocale);
      await sendToChat(token, link.chatId, BOT_TEXTS[lang].unlinked, { profileId: link.profileId, kind: "reply", preview: "unlinked" });
    }
    return NextResponse.json({ unlinked: true });
  } catch (err) {
    console.error("DELETE /api/telegram/me error:", err);
    return tgJsonError(500, "Could not disconnect.");
  }
}

export async function POST(req: Request) {
  const g = await guard(req, true);
  if (!g.ok) return g.response;
  const rl = checkRateLimit(`tg:test:${g.session.profile.id}`, { limit: 3, windowMs: 10 * 60_000 });
  if (!rl.ok) return rateLimitedResponse(rl.retryAfterSec);
  const parsed = await readJsonBody<{ action?: unknown }>(req, 1024);
  if (!parsed.ok || parsed.body.action !== "test") return tgJsonError(400, "Unknown action", "validation");
  try {
    const [{ token }, link] = await Promise.all([getBotToken(), getLinkByProfile(g.session.profile.id)]);
    if (!token) return tgJsonError(503, "The Telegram bot is not configured.", "not_configured");
    if (!link) return tgJsonError(404, "Telegram is not connected.", "not_linked");
    const lang = pickLang(g.session.profile.preferredLocale);
    const res = await sendToChat(token, link.chatId, BOT_TEXTS[lang].test, { profileId: link.profileId, kind: "test", preview: "test" });
    return res.ok ? NextResponse.json({ sent: true }) : tgJsonError(502, res.error || "Telegram did not accept the message.", "send_failed");
  } catch (err) {
    console.error("POST /api/telegram/me error:", err);
    return tgJsonError(500, "Could not send the test message.");
  }
}
