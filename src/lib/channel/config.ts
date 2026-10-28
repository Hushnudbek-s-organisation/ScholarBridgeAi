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

/* ------------------------------------------------------------------------- */
/* Channel identifier normalisation                                           */
/* ------------------------------------------------------------------------- */

/**
 * Why a channel identifier is normalised instead of only validated.
 *
 * Operators paste whatever Telegram gave them: `https://t.me/scholarbridge`,
 * `t.me/scholarbridge`, `scholarbridge`, `@scholarbridge`, `-1001234567890`,
 * and — the one that used to fail silently — `https://t.me/+AbCdEf` (an invite
 * link) or `https://t.me/c/1234567890/42` (a message link). The old check
 * (`validChannelId`) rejected every URL form, and the panel only said
 * "invalid value for this block": no hint about what to type instead.
 *
 * This function turns what a human pastes into the two forms the Bot API
 * accepts, and names the one case it cannot fix (an invite link contains no id
 * Telegram will accept as `chat_id`).
 */
export type ChannelIdentifier =
  | { ok: true; value: string; kind: "id" | "username" }
  | { ok: false; reason: "empty" | "invite_link" | "not_a_channel"; hint: string };

/** The hint shown in the panel and returned by the API for an invite link. */
export const INVITE_LINK_HINT =
  "Maxfiy kanal uchun taklif havolasini emas, kanalning `-100…` bilan boshlanuvchi ID raqamini kiriting " +
  "yoki kanaldan botga bitta post forward qiling.";
export const NOT_A_CHANNEL_HINT =
  "Kanal manzili noto'g'ri. `@kanal_nomi`, `https://t.me/kanal_nomi` yoki `-100…` ID kiriting.";

const USERNAME = /^[A-Za-z][A-Za-z0-9_]{4,31}$/;

/**
 * Turn an operator-typed channel reference into `-100…` or `@username`.
 *
 * Accepted: `-1001234567890`, `1234567890`, `@name`, `name`,
 * `https://t.me/name`, `http://t.me/name`, `t.me/name`, `telegram.me/name`,
 * `https://t.me/s/name` (the web-preview link), `https://t.me/c/<id>/<msg>`.
 * Everything is trimmed, lower-cased only where Telegram is case-insensitive
 * (the URL host), and returned without a trailing slash or query string.
 */
export function normalizeChannelIdentifier(raw: string | null | undefined): ChannelIdentifier {
  const original = String(raw ?? "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // pasted zero-width junk
    .trim();
  if (!original) return { ok: false, reason: "empty", hint: NOT_A_CHANNEL_HINT };

  // Strip a scheme and the known Telegram hosts, so every form reduces to a path.
  let rest = original
    .replace(/^https?:\/\//i, "")
    .replace(/^(?:www\.)?(?:t\.me|telegram\.me|telegram\.dog)\//i, "")
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "")
    .trim();

  // A private invite link carries no chat id Telegram accepts.
  if (/^(\+|joinchat\/)/i.test(rest)) {
    return { ok: false, reason: "invite_link", hint: INVITE_LINK_HINT };
  }

  // A message link `t.me/c/<internal id>/<message>` → the channel's real id.
  const privateMessage = /^c\/(\d{5,14})(?:\/\d+)?$/i.exec(rest);
  if (privateMessage) return { ok: true, value: `-100${privateMessage[1]}`, kind: "id" };

  // Web preview links: `t.me/s/<username>`.
  rest = rest.replace(/^s\//i, "");

  // Bare username, with or without the @.
  const username = rest.replace(/^@/, "");
  if (USERNAME.test(username)) return { ok: true, value: `@${username}`, kind: "username" };

  // Numeric ids, as-is (the minus sign matters for supergroups).
  if (/^-?\d{5,20}$/.test(rest)) return { ok: true, value: rest, kind: "id" };

  return { ok: false, reason: "not_a_channel", hint: NOT_A_CHANNEL_HINT };
}

/** Numeric chat ids (channels/supergroups start with -100) or an @username. */
export function validChannelId(raw: string): boolean {
  return normalizeChannelIdentifier(raw).ok;
}

/** The canonical form of an identifier, or the input unchanged when it is unusable. */
export function canonicalChannelId(raw: string): string {
  const normalized = normalizeChannelIdentifier(raw);
  return normalized.ok ? normalized.value : String(raw ?? "").trim();
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
  const rawChannel = (env.TELEGRAM_CHANNEL_ID ?? "").trim();
  const normalized = normalizeChannelIdentifier(rawChannel);
  return {
    mode: parseAutopost(env.CHANNEL_AUTOPOST),
    // The environment is typed by a human in a host dashboard too: accept the
    // same forms as the panel (a `t.me/…` link included), store the canonical id.
    channelId: normalized.ok ? normalized.value : rawChannel,
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

/** Where a post goes: only `on` talks to the channel; every other mode goes to the admin chat. */
export function targetChatId(cfg: ChannelConfig): string {
  return cfg.mode === "on" ? cfg.channelId : cfg.adminChatId;
}

/* ------------------------------------------------------------------------- */
/* Effective runtime: admin settings first, environment as the safety net.    */
/* ------------------------------------------------------------------------- */

import type { ChannelMode, ChannelSettings } from "./settings";

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
  mode: ChannelMode;
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
  /**
   * The same answer as a stable code.
   *
   * Callers need to distinguish "the admin chat is not set" from every other
   * reason: in approval mode that is not a dead end — the post can still be
   * approved from the panel — while a missing channel really is one. Matching
   * on the English message would be a bug waiting for a translation.
   */
  blockedCode: BlockedCode | null;
}

export type BlockedCode = "env_off" | "off" | "paused" | "no_channel" | "no_admin_chat" | "no_site";

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
  let mode: ChannelMode = settings.connection.mode;
  if (envKillSwitch) mode = "off";
  else if (envMode === "dryrun" && mode === "on") mode = "dryrun";
  // Both sides are normalised: a legacy settings row (or a host dashboard entry)
  // may hold `https://t.me/name`, which the Bot API answers with
  // "Bad Request: chat not found".
  const settingChannel = normalizeChannelIdentifier(settings.connection.channelId);
  const envChannel = normalizeChannelIdentifier(env.TELEGRAM_CHANNEL_ID ?? "");
  const channelId = (settingChannel.ok ? settingChannel.value : "") || (envChannel.ok ? envChannel.value : "");
  const adminChatId = settings.connection.adminChatId || (env.TELEGRAM_ADMIN_CHAT_ID ?? "").trim();
  const siteUrl =
    settings.siteUrl || normalizeSiteUrl(env.CHANNEL_SITE_URL) || normalizeSiteUrl(env.APP_URL);
  const pausedUntil = settings.connection.pausedUntil;
  const paused = Boolean(pausedUntil && pausedUntil >= tashkentDay(now));

  let blockedReason: string | null = null;
  let blockedCode: BlockedCode | null = null;
  const block = (code: BlockedCode, reason: string) => {
    blockedCode = code;
    blockedReason = reason;
  };
  if (envKillSwitch)
    block("env_off", "CHANNEL_AUTOPOST=off is set in this deployment's environment (kill switch) — it overrides the panel");
  else if (mode === "off") block("off", "Posting is off in the panel — choose Dry run or Live above");
  else if (paused) block("paused", `Paused until ${pausedUntil}`);
  else if (!validChannelId(channelId)) block("no_channel", "The channel is not connected yet");
  else if (!validAdminChatId(adminChatId)) block("no_admin_chat", "The admin chat is not set");
  else if (!siteUrl) block("no_site", "The site URL is not set");

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
    blockedCode,
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
    {
      key: "TELEGRAM_CHANNEL_ID",
      level: "required",
      set: channelId !== "",
      valid: validChannelId(channelId),
      // Show the canonical form: `https://t.me/x` is accepted, but the operator
      // should see which `@x` it means.
      preview: channelId ? canonicalChannelId(channelId).slice(0, 40) : null,
    },
    { key: "TELEGRAM_ADMIN_CHAT_ID", level: "required", set: adminChat !== "", valid: validAdminChatId(adminChat), preview: adminChat || null },
    { key: "CHANNEL_SITE_URL", level: "optional", set: Boolean(normalizeSiteUrl(env.CHANNEL_SITE_URL)), valid: Boolean(normalizeSiteUrl(env.CHANNEL_SITE_URL)), preview: normalizeSiteUrl(env.CHANNEL_SITE_URL) || null },
    { key: "APP_URL", level: "optional", set: Boolean(normalizeSiteUrl(env.APP_URL)), valid: Boolean(normalizeSiteUrl(env.APP_URL)), preview: normalizeSiteUrl(env.APP_URL) || site || null },
    { key: "CHANNEL_DISCUSSION_ENABLED", level: "optional", set: (env.CHANNEL_DISCUSSION_ENABLED ?? "").trim() !== "", valid: null, preview: truthy(env.CHANNEL_DISCUSSION_ENABLED) ? "on" : "off" },
    // Secret: presence + shape only, never the value.
    { key: "TELEGRAM_BOT_TOKEN", level: "optional", set: botToken !== "", valid: botToken === "" ? null : /^\d{5,}:[A-Za-z0-9_-]{20,}$/.test(botToken), preview: null },
  ];
}
