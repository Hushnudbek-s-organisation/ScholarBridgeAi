/**
 * Channel publisher configuration — env only, never admin input.
 *
 *   CHANNEL_AUTOPOST=off|dryrun|on     (default off)
 *   TELEGRAM_CHANNEL_ID                (-100… numeric id, or @username)
 *   TELEGRAM_ADMIN_CHAT_ID             (numeric; dryrun target + failure alerts)
 *   CHANNEL_SITE_URL                   (falls back to APP_URL)
 *   CHANNEL_DISCUSSION_ENABLED         (enables the linked discussion group)
 *
 * A typo in any of these never turns posting on: anything unrecognised is
 * treated as `off`, and `on` additionally needs a valid channel id, a valid
 * admin chat and a site URL, so a half-configured deployment stays silent.
 */

export type AutopostMode = "off" | "dryrun" | "on";

export const AUTOPOST_MODES: readonly AutopostMode[] = ["off", "dryrun", "on"] as const;

export interface ChannelConfig {
  mode: AutopostMode;
  /** -100… id or @username; "" when unset. */
  channelId: string;
  /** Numeric chat id; "" when unset. */
  adminChatId: string;
  /** Origin without a trailing slash; "" when unset/invalid. */
  siteUrl: string;
  discussionEnabled: boolean;
}

type Env = Record<string, string | undefined>;

/** `on` / `dryrun` in any capitalisation; every other value (typos, "true", "") is off. */
export function parseAutopost(raw: string | undefined | null): AutopostMode {
  const v = (raw ?? "").trim().toLowerCase();
  return v === "on" || v === "dryrun" ? v : "off";
}

function truthy(raw: string | undefined | null): boolean {
  const v = (raw ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

/** Numeric chat ids (channels/supergroups start with -100) or an @username. */
export function validChannelId(raw: string): boolean {
  const v = raw.trim();
  if (!v) return false;
  if (/^-?\d{5,20}$/.test(v)) return true;
  return /^@[A-Za-z][A-Za-z0-9_]{4,31}$/.test(v);
}

/** Private/admin chat ids are always numeric (possibly negative). */
export function validAdminChatId(raw: string): boolean {
  return /^-?\d{5,20}$/.test(raw.trim());
}

/** Absolute http(s) origin with no trailing slash; "" if unusable. */
export function normalizeSiteUrl(raw: string | undefined | null): string {
  const v = (raw ?? "").trim();
  if (!v) return "";
  try {
    const url = new URL(v);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    if (!url.hostname) return "";
    return `${url.protocol}//${url.host}${url.pathname.replace(/\/+$/, "")}`;
  } catch {
    return "";
  }
}

export function channelConfig(env: Env = process.env): ChannelConfig {
  return {
    mode: parseAutopost(env.CHANNEL_AUTOPOST),
    channelId: (env.TELEGRAM_CHANNEL_ID ?? "").trim(),
    adminChatId: (env.TELEGRAM_ADMIN_CHAT_ID ?? "").trim(),
    siteUrl: normalizeSiteUrl(env.CHANNEL_SITE_URL) || normalizeSiteUrl(env.APP_URL),
    discussionEnabled: truthy(env.CHANNEL_DISCUSSION_ENABLED),
  };
}

/**
 * Why the publisher must stay silent, or null when it may run. `off` is not an
 * error — it is the default and the operator's kill switch.
 */
export function channelBlockReason(cfg: ChannelConfig): string | null {
  if (cfg.mode === "off") return "CHANNEL_AUTOPOST is off";
  if (!validChannelId(cfg.channelId)) return "TELEGRAM_CHANNEL_ID is missing or invalid";
  if (!validAdminChatId(cfg.adminChatId)) return "TELEGRAM_ADMIN_CHAT_ID is missing or invalid";
  if (!cfg.siteUrl) return "CHANNEL_SITE_URL (or APP_URL) is missing or invalid";
  return null;
}

/** Where a post goes: dryrun always talks to the admin chat, never the channel. */
export function targetChatId(cfg: ChannelConfig): string {
  return cfg.mode === "on" ? cfg.channelId : cfg.adminChatId;
}
