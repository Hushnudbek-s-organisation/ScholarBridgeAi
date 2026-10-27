/**
 * Channel publisher configuration — env only, never admin input.
 *
 *   CHANNEL_AUTOPOST=off|dryrun|on     (a KILL SWITCH; unset = the panel decides)
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

/* ------------------------------------------------------------------------- */
/* Effective runtime: admin settings first, environment as the safety net.    */
/* ------------------------------------------------------------------------- */

import type { ChannelSettings } from "./settings";

/** Asia/Tashkent calendar day (the publisher's only timezone). */
export function tashkentDay(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export interface ChannelRuntime {
  /** Effective mode: the environment can only make it quieter, never louder. */
  mode: AutopostMode;
  channelId: string;
  adminChatId: string;
  siteUrl: string;
  discussionEnabled: boolean;
  paused: boolean;
  pausedUntil: string | null;
  /** True when `CHANNEL_AUTOPOST=off` overrides the admin switch. */
  envKillSwitch: boolean;
  /**
   * What the environment says, or null when the variable is absent.
   * `null` means "the admin panel decides" — an absent variable is not a
   * kill switch, otherwise the panel's mode switch could never switch
   * anything on and every deployment would start disabled for no reason.
   */
  envAutopost: AutopostMode | null;
  /** Why nothing may be sent right now, or null when the publisher may run. */
  blockedReason: string | null;
}

/**
 * `off` in the environment always wins (deploy-level kill switch), so removing
 * admin access or a compromised account cannot start posting. Otherwise the
 * admin switch decides, and the ids come from settings with an env fallback so
 * an existing deployment keeps working with only env configured.
 */
export function resolveChannelRuntime(
  settings: ChannelSettings,
  env: Env = process.env,
  now: Date = new Date()
): ChannelRuntime {
  // Only an explicit value is a kill switch. `off` (or a typo, which parses as
  // `off`) still wins over everything; an empty variable means the panel is in
  // charge, which is the whole point of "everything is managed from the panel".
  const envRaw = (env.CHANNEL_AUTOPOST ?? "").trim();
  const envMode = parseAutopost(envRaw);
  const envKillSwitch = envRaw !== "" && envMode === "off";
  // The environment is a CEILING, the panel is the switch underneath it:
  // `off` silences everything, `dryrun` keeps live posting impossible, and an
  // absent variable leaves the decision entirely to the panel.
  let mode: AutopostMode = settings.connection.mode;
  if (envKillSwitch) mode = "off";
  else if (envMode === "dryrun" && mode === "on") mode = "dryrun";
  const channelId = settings.connection.channelId || (env.TELEGRAM_CHANNEL_ID ?? "").trim();
  const adminChatId = settings.connection.adminChatId || (env.TELEGRAM_ADMIN_CHAT_ID ?? "").trim();
  const siteUrl =
    settings.siteUrl || normalizeSiteUrl(env.CHANNEL_SITE_URL) || normalizeSiteUrl(env.APP_URL);
  const pausedUntil = settings.connection.pausedUntil;
  const paused = Boolean(pausedUntil && pausedUntil >= tashkentDay(now));

  let blockedReason: string | null = null;
  if (envKillSwitch) blockedReason = "CHANNEL_AUTOPOST=off is set in this deployment's environment (kill switch) — it overrides the panel";
  else if (mode === "off") blockedReason = "Posting is off in the panel — choose Dry run or Live above";
  else if (paused) blockedReason = `Paused until ${pausedUntil}`;
  else if (!validChannelId(channelId)) blockedReason = "The channel is not connected yet";
  else if (!validAdminChatId(adminChatId)) blockedReason = "The admin chat is not set";
  else if (!siteUrl) blockedReason = "The site URL is not set";

  return {
    mode,
    envAutopost: envRaw === "" ? null : envMode,
    channelId,
    adminChatId,
    siteUrl,
    discussionEnabled: truthy(env.CHANNEL_DISCUSSION_ENABLED),
    paused,
    pausedUntil: pausedUntil ?? null,
    envKillSwitch,
    blockedReason,
  };
}

/* ------------------------------------------------------------------------- */
/* Deployment environment checklist (read-only, shown in the admin panel)     */
/* ------------------------------------------------------------------------- */

export interface EnvCheckRow {
  key: string;
  /** `required` for live posting, `optional` for extras. */
  level: "required" | "optional";
  set: boolean;
  /** Usable value? `null` for secrets, which are never echoed or inspected beyond a shape check. */
  valid: boolean | null;
  /** Non-secret preview (channel handle, site origin, mode). Never a token. */
  preview: string | null;
}

/**
 * Every channel-related environment variable with a verdict, so the panel can
 * say "this is what the server has" instead of the operator guessing which
 * value in Render's dashboard is wrong. Nothing secret ever leaves this
 * function: the bot token is reported as present/absent only.
 *
 * The environment cannot be *written* from the app (hosts do not expose that),
 * which is exactly why the panel shows the list with where each value comes
 * from — everything else is editable in the panel itself.
 */
export function channelEnvChecklist(env: Env = process.env): EnvCheckRow[] {
  const autopostRaw = (env.CHANNEL_AUTOPOST ?? "").trim();
  const botToken = (env.TELEGRAM_BOT_TOKEN ?? "").trim();
  const channelId = (env.TELEGRAM_CHANNEL_ID ?? "").trim();
  const adminChat = (env.TELEGRAM_ADMIN_CHAT_ID ?? "").trim();
  const site = normalizeSiteUrl(env.CHANNEL_SITE_URL) || normalizeSiteUrl(env.APP_URL);

  return [
    {
      key: "CHANNEL_AUTOPOST",
      level: "optional",
      set: autopostRaw !== "",
      // Empty is a valid state: the panel decides. A typo silently means "off".
      valid: null,
      preview: autopostRaw === "" ? null : parseAutopost(autopostRaw),
    },
    { key: "TELEGRAM_CHANNEL_ID", level: "required", set: channelId !== "", valid: validChannelId(channelId), preview: channelId ? channelId.slice(0, 40) : null },
    { key: "TELEGRAM_ADMIN_CHAT_ID", level: "required", set: adminChat !== "", valid: validAdminChatId(adminChat), preview: adminChat || null },
    { key: "CHANNEL_SITE_URL", level: "optional", set: Boolean(normalizeSiteUrl(env.CHANNEL_SITE_URL)), valid: Boolean(normalizeSiteUrl(env.CHANNEL_SITE_URL)), preview: normalizeSiteUrl(env.CHANNEL_SITE_URL) || null },
    { key: "APP_URL", level: "optional", set: Boolean(normalizeSiteUrl(env.APP_URL)), valid: Boolean(normalizeSiteUrl(env.APP_URL)), preview: normalizeSiteUrl(env.APP_URL) || site || null },
    { key: "CHANNEL_DISCUSSION_ENABLED", level: "optional", set: (env.CHANNEL_DISCUSSION_ENABLED ?? "").trim() !== "", valid: null, preview: truthy(env.CHANNEL_DISCUSSION_ENABLED) ? "on" : "off" },
    // Secret: presence + shape only, never the value.
    { key: "TELEGRAM_BOT_TOKEN", level: "optional", set: botToken !== "", valid: botToken === "" ? null : /^\d{5,}:[A-Za-z0-9_-]{20,}$/.test(botToken), preview: null },
  ];
}
