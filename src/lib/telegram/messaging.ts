/**
 * Sending + delivery log + shared lookups for the Telegram bot.
 * (Split out of service.ts so the bot commands and the linking flow can use
 * it without an import cycle.)
 */
import { eq, lt } from "drizzle-orm";
import { configuredAppUrl } from "@/lib/appUrl";
import { db } from "@/db";
import { studentProfiles, telegramLinks, telegramMessages } from "@/db/schema";
import { tgEditMessage, tgSendMessage, type InlineButton, type Keyboard } from "./api";
import { appLink, BOT_TEXTS, isButtonUrl, pickLang, type BotLang } from "./core";
import type { TelegramSettings } from "./core";

export type LinkRow = typeof telegramLinks.$inferSelect;
export type ProfileRow = typeof studentProfiles.$inferSelect;

export interface RetryPayload {
  profileId: number;
  type: string;
  title: string;
  body: string;
  link?: string | null;
}

export async function logMessage(entry: {
  profileId?: number | null;
  chatId?: string | null;
  kind: string;
  type?: string | null;
  preview?: string | null;
  ok: boolean;
  error?: string | null;
  retryPayload?: RetryPayload | null;
}) {
  try {
    await db.insert(telegramMessages).values({
      profileId: entry.profileId ?? null,
      chatId: entry.chatId ?? null,
      kind: entry.kind,
      type: entry.type ?? null,
      preview: entry.preview ? entry.preview.slice(0, 160) : null,
      status: entry.ok ? "sent" : "failed",
      error: entry.error ? entry.error.slice(0, 300) : null,
      retryPayload: !entry.ok && entry.retryPayload ? JSON.stringify(entry.retryPayload) : null,
    });
    // Keep the log small: prune rows older than 90 days now and then.
    if (Math.random() < 0.02) {
      await db.delete(telegramMessages).where(lt(telegramMessages.createdAt, new Date(Date.now() - 90 * 86_400_000)));
    }
  } catch (err) {
    console.warn("[telegram] log write failed:", err instanceof Error ? err.message : err);
  }
}

/** Mark a chat blocked (Telegram answered 403) or reachable again. */
export async function markChatReachable(chatId: string, ok: boolean, errorCode?: number) {
  if (!ok && errorCode === 403) {
    await db.update(telegramLinks).set({ blocked: true }).where(eq(telegramLinks.chatId, chatId)).catch(() => undefined);
  } else if (ok) {
    await db
      .update(telegramLinks)
      .set({ lastMessageAt: new Date(), blocked: false })
      .where(eq(telegramLinks.chatId, chatId))
      .catch(() => undefined);
  }
}

/** Send + log; marks the chat as blocked when Telegram answers 403. */
export async function sendToChat(
  token: string,
  chatId: string,
  html: string,
  meta: { profileId?: number | null; kind: string; type?: string | null; preview?: string | null; retryPayload?: RetryPayload | null },
  buttons: Keyboard = []
): Promise<{ ok: boolean; error?: string; errorCode?: number; messageId?: number }> {
  const res = await tgSendMessage(token, chatId, html, buttons);
  // Codes are never written to the log — only the fact that one was sent.
  await logMessage({
    ...meta,
    chatId,
    ok: res.ok,
    error: res.ok ? null : res.description,
    // A blocked chat (403) will not start working by retrying.
    retryPayload: res.ok || res.error_code === 403 ? null : meta.retryPayload ?? null,
  });
  await markChatReachable(chatId, res.ok, res.error_code);
  return res.ok
    ? { ok: true, messageId: res.result?.message_id }
    : { ok: false, error: res.description || "send failed", errorCode: res.error_code };
}

/** Replace a bot message in place (used after inline-button presses). Falls back to a new message. */
export async function editOrSend(
  token: string,
  chatId: string,
  messageId: number | null | undefined,
  html: string,
  meta: { profileId?: number | null; kind: string; preview?: string | null },
  buttons: Keyboard = []
) {
  if (messageId) {
    const res = await tgEditMessage(token, chatId, messageId, html, buttons);
    if (res.ok) return { ok: true };
    // "message is not modified" is fine — anything else: send a fresh message.
    if (/not modified/i.test(res.description || "")) return { ok: true };
  }
  return sendToChat(token, chatId, html, meta, buttons);
}

export function publicSiteUrl(settings: Pick<TelegramSettings, "siteUrl">): string {
  // The canonical deployment URL (APP_URL) wins so a domain move is a config
  // change only; the address saved when the webhook was connected is the
  // fallback for deployments that have not set APP_URL.
  return configuredAppUrl() || settings.siteUrl || "";
}

export function siteButton(siteUrl: string, lang: BotLang, link?: string | null, label?: string): InlineButton[] {
  const url = appLink(siteUrl || configuredAppUrl(), link ?? null);
  return isButtonUrl(url) ? [{ text: label ?? BOT_TEXTS[lang].openSite, url }] : [];
}

/**
 * The Mini App URL: env TELEGRAM_MINI_APP_URL when set, otherwise `<site>/tg`.
 * Telegram only opens https Mini Apps, so anything else yields null.
 */
export function miniAppUrl(settings: Pick<TelegramSettings, "siteUrl">): string | null {
  return miniAppUrlFor(publicSiteUrl(settings));
}

/** Mini App URL for an explicit site base (used right after setWebhook). */
export function miniAppUrlFor(site: string): string | null {
  const override = process.env.TELEGRAM_MINI_APP_URL?.trim();
  const url = override || (site ? `${site.replace(/\/+$/, "")}/tg` : "");
  return isButtonUrl(url) ? url : null;
}

export function openAppButton(settings: Pick<TelegramSettings, "siteUrl">, label: string): InlineButton[] {
  const url = miniAppUrl(settings);
  return url ? [{ text: label, web_app: { url } }] : [];
}

export async function getLinkByProfile(profileId: number): Promise<LinkRow | null> {
  const [row] = await db.select().from(telegramLinks).where(eq(telegramLinks.profileId, profileId)).limit(1);
  return row ?? null;
}

export async function getLinkByTelegramUser(telegramUserId: string): Promise<LinkRow | null> {
  const [row] = await db.select().from(telegramLinks).where(eq(telegramLinks.telegramUserId, telegramUserId)).limit(1);
  return row ?? null;
}

export async function getProfileRow(id: number): Promise<ProfileRow | null> {
  const [row] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, id)).limit(1);
  return row ?? null;
}

export function langOf(profile: { preferredLocale?: string | null } | null, fallback?: string | null): BotLang {
  return pickLang(profile?.preferredLocale || fallback);
}
