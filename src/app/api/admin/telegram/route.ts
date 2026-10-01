import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { LIMITS, rateLimitedResponse } from "@/lib/rate-limit";
import { checkSharedRateLimit } from "@/lib/rate-limit-shared";
import { readJsonBody } from "@/lib/request";
import { tgCall } from "@/lib/telegram/api";
import {
  BOT_TEXTS,
  looksLikeBotToken,
  maskToken,
  MAX_BROADCAST_CHARS,
  normalizeSiteUrl,
  pickLang,
  sanitizeSettingsPatch,
  TELEGRAM_NOTIFICATION_TYPES,
} from "@/lib/telegram/core";
import { broadcast, getLinkByProfile, linkedUsers, recentMessages, sendToChat, telegramStats, unlinkProfile } from "@/lib/telegram/service";
import { miniAppUrl, miniAppUrlFor, publicSiteUrl } from "@/lib/telegram/messaging";
import { appUrlSource, configuredAppUrl } from "@/lib/appUrl";
import { lastSweep, recordSweep, runScheduledTelegramJobs } from "@/lib/notificationSweep";
import { getBotToken, getTelegramSettings, saveBotToken, saveTelegramSettings, webhookSecret } from "@/lib/telegram/settings";
import { tgJsonError, tgTablesOr503 } from "@/lib/telegram/http";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // broadcasts to many chats take a while

/**
 * Admin → System → Telegram bot.
 *  GET              → settings, token status, stats, linked users, delivery log (+ live bot info with ?live=1)
 *  PUT              → { token?, clearToken?, ...settings } (a new token is verified with getMe first)
 *  POST { action }  → status | setWebhook | deleteWebhook | test | broadcast | sweep
 *  DELETE ?profileId=… → disconnect one student's Telegram
 */
async function guard(req: Request, write = false) {
  const unavailable = await tgTablesOr503();
  if (unavailable) return { ok: false as const, response: unavailable };
  const auth = await requireAdmin(req);
  if (!auth.ok) return { ok: false as const, response: tgJsonError(auth.status, auth.error, auth.code) };
  if (write) {
    const rl = await checkSharedRateLimit(`admin:${auth.session.profile.id}`, LIMITS.adminWrite);
    if (!rl.ok) return { ok: false as const, response: rateLimitedResponse(rl.retryAfterSec) };
  }
  return { ok: true as const, session: auth.session };
}

/** Public origin of this request (behind the proxy), https only. */
function requestOrigin(req: Request): string {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  return normalizeSiteUrl(host ? `${proto.split(",")[0].trim()}://${host.split(",")[0].trim()}` : "");
}

interface BotInfo {
  id: number;
  username: string;
  first_name: string;
}
interface WebhookInfo {
  url: string;
  pending_update_count: number;
  last_error_date?: number;
  last_error_message?: string;
}

async function liveInfo(token: string) {
  const [me, hook] = await Promise.all([tgCall<BotInfo>(token, "getMe"), tgCall<WebhookInfo>(token, "getWebhookInfo")]);
  return {
    reachable: me.ok || (me.error_code ?? 0) > 0,
    bot: me.ok && me.result ? { id: me.result.id, username: me.result.username, name: me.result.first_name } : null,
    botError: me.ok ? null : me.description ?? "unknown error",
    webhook: hook.ok && hook.result
      ? {
          url: hook.result.url || "",
          pending: hook.result.pending_update_count,
          lastError: hook.result.last_error_message ?? null,
          lastErrorAt: hook.result.last_error_date ? new Date(hook.result.last_error_date * 1000).toISOString() : null,
        }
      : null,
  };
}

export async function GET(req: Request) {
  const g = await guard(req);
  if (!g.ok) return g.response;
  try {
    const url = new URL(req.url);
    const [settings, tokenInfo] = await Promise.all([getTelegramSettings(), getBotToken()]);
    const [stats, users, messages] = await Promise.all([
      telegramStats(),
      linkedUsers({ q: url.searchParams.get("q") ?? "" }),
      recentMessages(40),
    ]);
    const base = publicSiteUrl(settings) || requestOrigin(req);
    // After a domain move the webhook stays registered on the old address
    // until the admin reconnects it — surface that instead of failing quietly.
    const canonical = configuredAppUrl();
    return NextResponse.json(
      {
        settings,
        token: { set: Boolean(tokenInfo.token), source: tokenInfo.source, masked: maskToken(tokenInfo.token) },
        webhookUrl: base ? `${base}/api/telegram/webhook` : null,
        suggestedSiteUrl: canonical || requestOrigin(req),
        appUrl: { value: canonical || null, source: appUrlSource() },
        webhookBaseMismatch: Boolean(canonical && settings.siteUrl && settings.siteUrl !== canonical),
        registeredSiteUrl: settings.siteUrl || null,
        types: TELEGRAM_NOTIFICATION_TYPES,
        stats,
        users,
        messages,
        myLink: Boolean(await getLinkByProfile(g.session.profile.id)),
        miniAppUrl: miniAppUrl(settings),
        lastSweep: await lastSweep(),
        cron: { secretSet: Boolean(process.env.CRON_SECRET?.trim()), path: "/api/cron/notifications" },
        live: url.searchParams.get("live") === "1" && tokenInfo.token ? await liveInfo(tokenInfo.token) : null,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("GET /api/admin/telegram error:", err);
    return tgJsonError(500, "Could not load Telegram settings.");
  }
}

export async function PUT(req: Request) {
  const g = await guard(req, true);
  if (!g.ok) return g.response;
  const parsed = await readJsonBody<Record<string, unknown>>(req, 16 * 1024);
  if (!parsed.ok) return tgJsonError(parsed.status, parsed.error, parsed.code);
  const body = parsed.body;
  try {
    const before = await getTelegramSettings();
    // The bot identity is only ever set from getMe, never typed in.
    const { botUsername: _u, botName: _n, ...patch } = body;
    let next = sanitizeSettingsPatch(patch, before);
    if ("siteUrl" in body && typeof body.siteUrl === "string" && body.siteUrl.trim() && !next.siteUrl) {
      return tgJsonError(400, "Site URL must be an https:// address.", "bad_site_url");
    }

    if (body.clearToken === true) {
      await saveBotToken(null);
      next = { ...next, botUsername: "", botName: "" };
      await writeAudit({ entityType: "config", entityId: 0, fieldChanged: "telegram_bot_token", oldValue: "set", newValue: "cleared" });
    } else if (typeof body.token === "string" && body.token.trim()) {
      const token = body.token.trim();
      if (!looksLikeBotToken(token)) return tgJsonError(400, "This does not look like a bot token (123456789:AA…).", "bad_token");
      const me = await tgCall<BotInfo>(token, "getMe");
      if (!me.ok || !me.result) {
        return tgJsonError(
          me.error_code === 401 || me.error_code === 404 ? 400 : 502,
          me.error_code === 401 || me.error_code === 404
            ? "Telegram rejected this token. Copy it again from @BotFather."
            : `Could not reach Telegram to check the token (${me.description ?? "network error"}).`,
          "token_check_failed"
        );
      }
      await saveBotToken(token);
      next = { ...next, botUsername: me.result.username, botName: me.result.first_name };
      await writeAudit({ entityType: "config", entityId: 0, fieldChanged: "telegram_bot_token", oldValue: before.botUsername || null, newValue: `@${me.result.username}` });
    }

    await saveTelegramSettings(next);
    await writeAudit({ entityType: "config", entityId: 0, fieldChanged: "telegram_settings", oldValue: before, newValue: next });
    const tokenInfo = await getBotToken();
    return NextResponse.json({ settings: next, token: { set: Boolean(tokenInfo.token), source: tokenInfo.source, masked: maskToken(tokenInfo.token) } });
  } catch (err) {
    console.error("PUT /api/admin/telegram error:", err);
    return tgJsonError(500, "Could not save Telegram settings.");
  }
}

export async function POST(req: Request) {
  const g = await guard(req, true);
  if (!g.ok) return g.response;
  const parsed = await readJsonBody<{ action?: unknown; url?: unknown; text?: unknown; includeMuted?: unknown }>(req, 16 * 1024);
  if (!parsed.ok) return tgJsonError(parsed.status, parsed.error, parsed.code);
  const { action } = parsed.body;
  const { token } = await getBotToken();
  if (!token) return tgJsonError(400, "Save a bot token first.", "not_configured");
  const settings = await getTelegramSettings();

  try {
    if (action === "status") {
      return NextResponse.json({ live: await liveInfo(token) });
    }

    if (action === "setWebhook") {
      const base = normalizeSiteUrl(parsed.body.url) || configuredAppUrl() || settings.siteUrl || requestOrigin(req);
      if (!base || !base.startsWith("https://")) {
        return tgJsonError(400, "Telegram needs a public https:// address. Set the site URL first.", "bad_site_url");
      }
      const url = `${base}/api/telegram/webhook`;
      const res = await tgCall(token, "setWebhook", {
        url,
        secret_token: webhookSecret(token),
        allowed_updates: ["message", "callback_query", "my_chat_member"],
        drop_pending_updates: true,
      });
      if (!res.ok) return tgJsonError(502, `Telegram: ${res.description ?? "setWebhook failed"}`, "webhook_failed");
      // Command menu in each language (best effort).
      for (const lang of ["uz", "ru", "en"] as const) {
        const lines = BOT_TEXTS[lang].help.split("\n").slice(1);
        const commands = lines
          .map((l) => /^\/(\w+)(?: [^—]+)? — (.+)$/.exec(l))
          .filter((m): m is RegExpExecArray => !!m)
          .map((m) => ({ command: m[1], description: m[2].slice(0, 256) }));
        await tgCall(token, "setMyCommands", { commands, ...(lang === "en" ? {} : { language_code: lang }) });
      }
      // Menu button → Mini App (https only; best effort).
      // The address the webhook was just set on IS the public site: buttons,
      // deep links and the Mini App all use it.
      const appUrl = miniAppUrlFor(base);
      if (appUrl) {
        await tgCall(token, "setChatMenuButton", { menu_button: { type: "web_app", text: "ScholarBridge", web_app: { url: appUrl } } });
      }
      if (settings.siteUrl !== base) await saveTelegramSettings({ ...settings, siteUrl: base });
      await writeAudit({ entityType: "config", entityId: 0, fieldChanged: "telegram_webhook", newValue: url });
      return NextResponse.json({ ok: true, url });
    }

    if (action === "deleteWebhook") {
      const res = await tgCall(token, "deleteWebhook", { drop_pending_updates: false });
      if (!res.ok) return tgJsonError(502, `Telegram: ${res.description ?? "deleteWebhook failed"}`, "webhook_failed");
      await writeAudit({ entityType: "config", entityId: 0, fieldChanged: "telegram_webhook", newValue: null });
      return NextResponse.json({ ok: true });
    }

    if (action === "test") {
      const link = await getLinkByProfile(g.session.profile.id);
      if (!link) return tgJsonError(400, "Connect your own Telegram first (Telegram & notifications page).", "not_linked");
      const lang = pickLang(g.session.profile.preferredLocale);
      const res = await sendToChat(token, link.chatId, BOT_TEXTS[lang].test, { profileId: link.profileId, kind: "test", preview: "admin test" });
      return res.ok ? NextResponse.json({ ok: true }) : tgJsonError(502, res.error || "send failed", "send_failed");
    }

    if (action === "sweep") {
      const rl = await checkSharedRateLimit(`admin:tg-sweep:${g.session.profile.id}`, { limit: 6, windowMs: 60 * 60_000 });
      if (!rl.ok) return rateLimitedResponse(rl.retryAfterSec);
      const summary = await runScheduledTelegramJobs();
      await recordSweep(summary, "admin");
      return NextResponse.json({ summary });
    }

    if (action === "broadcast") {
      const text = typeof parsed.body.text === "string" ? parsed.body.text.trim() : "";
      if (!text) return tgJsonError(400, "Write a message first.", "validation");
      if (text.length > MAX_BROADCAST_CHARS) return tgJsonError(400, `Keep it under ${MAX_BROADCAST_CHARS} characters.`, "validation");
      const rl = await checkSharedRateLimit(`admin:tg-broadcast:${g.session.profile.id}`, { limit: 3, windowMs: 60 * 60_000 });
      if (!rl.ok) return rateLimitedResponse(rl.retryAfterSec);
      const result = await broadcast(text, { includeMuted: parsed.body.includeMuted === true });
      await writeAudit({ entityType: "config", entityId: 0, fieldChanged: "telegram_broadcast", newValue: { text: text.slice(0, 200), ...result } });
      return NextResponse.json(result);
    }

    return tgJsonError(400, "Unknown action", "validation");
  } catch (err) {
    console.error("POST /api/admin/telegram error:", err);
    return tgJsonError(500, "Telegram action failed.");
  }
}

export async function DELETE(req: Request) {
  const g = await guard(req, true);
  if (!g.ok) return g.response;
  const profileId = Number(new URL(req.url).searchParams.get("profileId"));
  if (!Number.isInteger(profileId) || profileId <= 0) return tgJsonError(400, "profileId is required", "validation");
  try {
    const removed = await unlinkProfile(profileId, "admin");
    return NextResponse.json({ removed });
  } catch (err) {
    console.error("DELETE /api/admin/telegram error:", err);
    return tgJsonError(500, "Could not disconnect.");
  }
}
