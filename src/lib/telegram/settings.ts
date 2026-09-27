/**
 * Telegram settings + bot token storage.
 *
 * - `app_config.telegram_settings` — JSON (see TelegramSettings)
 * - `app_config.telegram_bot_token` — AES-256-GCM encrypted (same scheme as
 *   the AI provider keys). Env TELEGRAM_BOT_TOKEN is the fallback.
 *
 * Values are read straight from the table with a short memo (not the shared
 * config cache) so every server instance sees an admin change within seconds.
 */
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appConfig } from "@/db/schema";
import { decryptWithRotation, encryptApiKey } from "@/lib/ai/settings";
import { sessionSecret } from "@/lib/auth";
import { createHmac } from "crypto";
import { looksLikeBotToken, parseTelegramSettings, type TelegramSettings } from "./core";

const SETTINGS_KEY = "telegram_settings";
const TOKEN_KEY = "telegram_bot_token";
const MEMO_MS = 10_000;

let memo: { at: number; settings: TelegramSettings; storedToken: string | null } | null = null;

async function readKey(key: string): Promise<string | null> {
  const [row] = await db.select().from(appConfig).where(eq(appConfig.key, key)).limit(1);
  return row?.value ?? null;
}

async function writeKey(key: string, value: string, description: string) {
  const [existing] = await db.select().from(appConfig).where(eq(appConfig.key, key)).limit(1);
  if (existing) {
    await db.update(appConfig).set({ value, updatedAt: new Date() }).where(eq(appConfig.key, key));
  } else {
    await db.insert(appConfig).values({ key, value, description });
  }
}

async function load() {
  if (memo && Date.now() - memo.at < MEMO_MS) return memo;
  let settings = parseTelegramSettings(null);
  let storedToken: string | null = null;
  try {
    settings = parseTelegramSettings(await readKey(SETTINGS_KEY));
    // Rotation-aware (AI_KEYS_ENCRYPTION_SECRET_PREVIOUS): a token encrypted
    // with an old secret keeps working and is re-encrypted with the current one.
    const { key, rotated } = decryptWithRotation(await readKey(TOKEN_KEY));
    storedToken = key;
    if (key && rotated) {
      await writeKey(TOKEN_KEY, encryptApiKey(key), "Telegram bot token (encrypted)").catch(() => undefined);
    }
  } catch (err) {
    console.warn("[telegram] settings read failed, using defaults:", err instanceof Error ? err.message : err);
  }
  memo = { at: Date.now(), settings, storedToken };
  return memo;
}

export function invalidateTelegramSettings() {
  memo = null;
}

export async function getTelegramSettings(): Promise<TelegramSettings> {
  return (await load()).settings;
}

export async function saveTelegramSettings(next: TelegramSettings) {
  await writeKey(SETTINGS_KEY, JSON.stringify(next), "Telegram bot settings (Admin → Telegram bot)");
  invalidateTelegramSettings();
}

export type TokenSource = "admin" | "env" | "none";

/** The active bot token and where it came from (admin-stored wins over env). */
export async function getBotToken(): Promise<{ token: string | null; source: TokenSource }> {
  const { storedToken } = await load();
  if (storedToken && looksLikeBotToken(storedToken)) return { token: storedToken, source: "admin" };
  const env = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (env && looksLikeBotToken(env)) return { token: env, source: "env" };
  return { token: null, source: "none" };
}

export async function saveBotToken(token: string | null) {
  await writeKey(TOKEN_KEY, token ? encryptApiKey(token.trim()) : "", "Telegram bot token (encrypted)");
  invalidateTelegramSettings();
}

/**
 * Secret Telegram echoes in `X-Telegram-Bot-Api-Secret-Token` on every
 * webhook call. TELEGRAM_WEBHOOK_SECRET when set (≥ 16 chars); otherwise
 * derived from the session secret + bot id, so nothing extra has to be
 * configured and a new bot automatically gets a new secret.
 */
export function webhookSecret(token: string): string {
  // Optional explicit value (Telegram allows 1–256 chars of A-Z a-z 0-9 _ -).
  const explicit = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (explicit && /^[A-Za-z0-9_-]{16,256}$/.test(explicit)) return explicit;
  const botId = token.split(":")[0];
  return createHmac("sha256", sessionSecret()).update(`telegram-webhook:${botId}`).digest("base64url").slice(0, 48);
}
