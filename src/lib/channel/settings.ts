/**
 * Channel settings — defaults live in code, overrides live in `channel_settings`
 * and are read at run time (Phase 2). Nothing here reads the database or the
 * environment, so templates and tests get an explicit, validated object.
 *
 * Only secrets and the kill-switch default stay in the environment
 * (`CHANNEL_AUTOPOST`, `TELEGRAM_BOT_TOKEN`). The bot token is never part of
 * settings and must never appear in the admin UI.
 */

import { isSameOrigin } from "./links";
import { canonicalChannelId, normalizeChannelIdentifier } from "./config";

/**
 * How the publisher behaves.
 *
 *   off       nothing is planned and nothing is sent
 *   dryrun    the plan is built, posts go only to the admin chat
 *   approval  the plan is built, every post is sent to the admin chat with
 *             [Approve] [Reject] [Edit] buttons and reaches the channel only
 *             after an admin presses Approve
 *   on        posts go straight to the channel
 *
 * `approval` exists because "dry run" and "live" were two ends of one switch:
 * an operator who wanted to read a post before it went public had to keep the
 * publisher off and post by hand. The confirmation step is the middle.
 */
export type ChannelMode = "off" | "dryrun" | "approval" | "on";

export interface LinkItem {
  label: string;
  url: string;
}

/**
 * Channel connection, editable in Admin → Kanal. The bot token is NOT here: it
 * lives in Admin → Telegram (or the environment) and never appears in the
 * channel UI.
 */
export interface ChannelConnection {
  /** `-100…` id or `@username` of the channel the bot posts to. */
  channelId: string;
  /** Private admin chat: dry-run target and failure alerts. */
  adminChatId: string;
  /** Feature switch. `CHANNEL_AUTOPOST=off` still forces everything off. */
  mode: ChannelMode;
  /** Last day (inclusive, Asia/Tashkent) the publisher stays paused. */
  pausedUntil: string | null;
  /**
   * A channel the bot was added to (or that an admin forwarded a post from) but
   * which is not the one configured above.
   *
   * Discovery is automatic because the bot is *told*: Telegram sends
   * `my_chat_member` when it is promoted, and a forwarded post carries
   * `forward_from_chat`. Storing the candidate means the panel can offer a
   * one-click "connect this one" instead of asking the operator to hunt for a
   * `-100…` id in a Telegram client that will not show it.
   */
  discoveredChannel: DiscoveredChannel | null;
}

export interface DiscoveredChannel {
  /** `-100…` — the only form that survives a username change. */
  id: string;
  title: string | null;
  username: string | null;
  /** ISO timestamp of the discovery. */
  at: string;
}

export interface ChannelSettings {
  /** Channel wiring; empty values mean "not connected yet". */
  connection: ChannelConnection;
  /** Shown in placeholders and admin headers. */
  brand: string;
  /** Without the leading @. */
  channelUsername: string;
  /** Without the leading @. */
  botUsername: string;
  /** Public origin; "" = links are dropped rather than broken. */
  siteUrl: string;
  /** Footer for main posts. Empty ⇒ the "Kanal | Bot" default is used. */
  footerMain: LinkItem[];
  /** Footer for the weekly post. Empty ⇒ default "Telegram | YouTube | Instagram" is NOT invented: omitted. */
  footerSocial: LinkItem[];
  hashtags: {
    /** Per post kind, stored without "#". */
    kinds: Record<string, string[]>;
    /** Country key → tag, without "#". */
    countries: Record<string, string>;
    /**
     * Funding tag, picked by stored data: `full` for a fully funded award,
     * `partial` otherwise. An empty string switches it off.
     *
     * The reference post ends with `#to'liq_moliyalashtiriladi`, and that is a
     * fact we hold (`isFullyFunded`), not an editorial claim.
     */
    funding: { full: string; partial: string };
    /** Degree level → tag, without "#". */
    levels: Record<string, string>;
    /** Weekly-post tags ("#haftalik_eslatmalar #reminders" by default). */
    weekly: string[];
  };
  /** Allow link previews per kind; the default everywhere is no preview. */
  linkPreview: Record<string, boolean>;
  /** Footer per kind (default on for main kinds). */
  footerEnabled: Record<string, boolean>;
  plan: {
    /** Hard cap per day, 1–3. */
    dailyCap: number;
    /** Preferred number of posts per day (min/max, both ≤ dailyCap). */
    budgetMin: number;
    budgetMax: number;
    quietDayEnabled: boolean;
    /** "HH:MM" local windows. */
    morningWindow: { start: string; end: string };
    eveningWindow: { start: string; end: string };
    /** Minimum items for the Sunday weekly post; below it the day plans normally. */
    weeklyMinItems: number;
    weeklyPin: boolean;
    digestEnabled: boolean;
    /**
     * Countries the audience actually targets, in the operator's own order.
     *
     * After the near deadlines have been posted, the planner prefers these —
     * the alternative is a channel that keeps re-announcing whatever happens to
     * sort first, instead of what an Uzbek applicant can realistically act on.
     * The list is editable in the panel and is a preference, not a statistic:
     * no number about how many students go where is stored or shown.
     */
    priorityCountries: string[];
  };
  /** Minimum days between two polls. */
  pollCadenceDays: number;
}

export const DEFAULT_FOOTER_LABELS = { channel: "Kanal", bot: "Bot" } as const;

/**
 * Where the audience most often applies, as a **starting order the operator can
 * change** — not a measured ranking.
 *
 * Names match the `country` column of `scholarships`, so "United States" covers
 * every US programme. Anything not in the list still gets posted; it just sorts
 * after these while both are equally far from their deadline.
 */
export const DEFAULT_PRIORITY_COUNTRIES = [
  "United States",
  "United Kingdom",
  "Germany",
  "South Korea",
  "Japan",
  "Turkey",
  "Canada",
  "Netherlands",
  "Italy",
  "France",
  "Poland",
  "Hungary",
  "China",
  "Malaysia",
] as const;

/** Normalise an operator-typed country list: trimmed, de-duplicated, capped. */
export function cleanPriorityCountries(raw: unknown, fallback: readonly string[]): string[] {
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? raw.split(/[,\n;]/)
      : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    const value = String(item ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= 30) break;
  }
  // An empty list is a valid choice ("no preference"), but a *corrupt* value
  // must not silently erase a configured one — the fallback only applies when
  // the submitted block had no such key at all.
  return raw === undefined ? [...fallback] : out;
}

export const DEFAULT_CHANNEL_SETTINGS: ChannelSettings = {
  connection: { channelId: "", adminChatId: "", mode: "off", pausedUntil: null, discoveredChannel: null },
  brand: "ScholarBridge",
  channelUsername: "",
  botUsername: "",
  siteUrl: "",
  footerMain: [],
  footerSocial: [],
  hashtags: {
    kinds: {
      scholarship_rich: ["grant", "talaba"],
      scholarship_single: ["grant"],
      fully_funded: ["grant", "moliyalashtirish"],
      // Urgency posts deliberately carry no hashtags.
      deadline_digest: ["muddat"],
      country_spotlight: ["chetxildaokish"],
      tip: ["maslahat"],
      checklist: ["ro'yxat"],
      qa: ["savoljavob"],
      story: ["tajriba"],
    },
    countries: {},
    // No apostrophe: `hashtags()` keeps only [a-z0-9_], so a tag written with one
    // would silently lose letters. The default is already the published form.
    funding: { full: "toliq_moliyalashtiriladi", partial: "" },
    levels: { bachelor: "bakalavr", master: "magistratura", phd: "phd" },
    weekly: ["haftalik_eslatmalar", "reminders"],
  },
  linkPreview: {},
  footerEnabled: {},
  plan: {
    dailyCap: 3,
    budgetMin: 1,
    budgetMax: 3,
    quietDayEnabled: true,
    morningWindow: { start: "09:00", end: "11:00" },
    eveningWindow: { start: "18:30", end: "21:00" },
    weeklyMinItems: 2,
    weeklyPin: false,
    digestEnabled: true,
    priorityCountries: [...DEFAULT_PRIORITY_COUNTRIES],
  },
  pollCadenceDays: 14,
};

/** URL rules for admin-entered links: https anywhere, or t.me. */
export function isAllowedLinkUrl(raw: unknown): boolean {
  if (typeof raw !== "string") return false;
  const value = raw.trim();
  if (!value) return false;
  try {
    const url = new URL(value);
    if (url.protocol === "https:") return Boolean(url.hostname) && url.hostname.includes(".");
    if (url.protocol === "http:") return false;
    return false;
  } catch {
    return false;
  }
}

/** t.me links are https already; this only documents the allowed shape. */
export function isTelegramLink(raw: unknown): boolean {
  if (!isAllowedLinkUrl(raw)) return false;
  try {
    return /(^|\.)t\.me$/i.test(new URL(String(raw)).hostname);
  } catch {
    return false;
  }
}

function str(value: unknown, fallback: string): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function boolOr(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function intIn(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/**
 * Footer links. External links must be public HTTPS; a link to our own site is
 * allowed on whatever origin the site actually runs on (localhost and staging
 * included), exactly like `/go` site links.
 */
function links(value: unknown, fallback: LinkItem[], siteUrl = ""): LinkItem[] {
  if (!Array.isArray(value)) return fallback;
  const out: LinkItem[] = [];
  for (const entry of value.slice(0, 8)) {
    if (!entry || typeof entry !== "object") continue;
    const label = str((entry as LinkItem).label, "").slice(0, 40);
    const url = str((entry as LinkItem).url, "");
    if (!label) continue;
    if (!isAllowedLinkUrl(url) && !(siteUrl && isSameOrigin(url, siteUrl))) continue;
    out.push({ label, url });
  }
  return out;
}

/** A site origin from settings: http(s) only, no path, no trailing slash. */
function normalizeSite(value: string): string {
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? `${url.protocol}//${url.host}` : "";
  } catch {
    return "";
  }
}

function tagList(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  return value
    .map((v) => String(v).trim().replace(/^#+/, "").toLowerCase())
    .filter((v) => /^[a-z0-9_]{1,30}$/.test(v))
    .slice(0, 10);
}

function tagMap(value: unknown, fallback: Record<string, string>): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const out: Record<string, string> = { ...fallback };
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const tag = String(raw ?? "").trim().replace(/^#+/, "").toLowerCase();
    if (!/^[a-z0-9_]{1,30}$/.test(tag)) continue;
    out[key] = tag;
  }
  return out;
}

/**
 * Funding tags. An explicit empty string switches the tag off, so this cannot
 * fall back the way `str()` does for a missing key.
 */
function fundingTags(value: unknown, fallback: { full: string; partial: string }): { full: string; partial: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const raw = value as Record<string, unknown>;
  const clean = (input: unknown, alt: string): string => {
    if (typeof input !== "string") return alt;
    const tag = input.trim().replace(/^#+/, "").toLowerCase();
    if (tag === "") return "";
    return /^[a-z0-9_]{1,30}$/.test(tag) ? tag : alt;
  };
  return { full: clean(raw.full, fallback.full), partial: clean(raw.partial, fallback.partial) };
}

function boolMap(value: unknown, fallback: Record<string, boolean>): Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const out: Record<string, boolean> = { ...fallback };
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === "boolean") out[key] = raw;
  }
  return out;
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const ISO_DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const MODES: readonly ChannelMode[] = ["off", "dryrun", "approval", "on"];

/** `-100…` numeric id or `@username` — the same rule the sender applies. */
export function looksLikeChannelId(raw: unknown): boolean {
  if (typeof raw !== "string") return false;
  // One definition of "a channel identifier" for the whole module: the panel,
  // the settings merge and the env checklist all go through
  // `normalizeChannelIdentifier`, so `https://t.me/name` cannot be accepted in
  // one place and rejected in another.
  return normalizeChannelIdentifier(raw).ok;
}

/** Private chats are always numeric. */
export function looksLikeChatId(raw: unknown): boolean {
  if (typeof raw !== "string") return false;
  return /^-?\d{5,20}$/.test(raw.trim());
}

export function isChannelMode(raw: unknown): raw is ChannelMode {
  return typeof raw === "string" && MODES.includes(raw as ChannelMode);
}

function time(value: unknown, fallback: string): string {
  return typeof value === "string" && TIME_RE.test(value) ? value : fallback;
}

/** Deep, validating merge of stored JSON over the defaults. */
/** A discovered candidate, or null. Never trusted: it is written by a webhook. */
export function parseDiscoveredChannel(raw: unknown): DiscoveredChannel | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const id = String(obj.id ?? "").trim();
  if (!/^-?\d{5,20}$/.test(id)) return null;
  const title = typeof obj.title === "string" ? obj.title.trim().slice(0, 120) : null;
  const username = typeof obj.username === "string" ? obj.username.trim().replace(/^@/, "").slice(0, 32) : null;
  const at = typeof obj.at === "string" && !Number.isNaN(Date.parse(obj.at)) ? obj.at : new Date(0).toISOString();
  return { id, title: title || null, username: username || null, at };
}

export function mergeChannelSettings(raw: unknown): ChannelSettings {
  const d = DEFAULT_CHANNEL_SETTINGS;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return d;
  const b = raw as Record<string, unknown>;
  // Resolved first: footer links are validated against our own origin.
  const siteUrl = normalizeSite(str(b.siteUrl, d.siteUrl));
  const plan = (b.plan && typeof b.plan === "object" ? b.plan : {}) as Record<string, unknown>;
  const morning = (plan.morningWindow && typeof plan.morningWindow === "object" ? plan.morningWindow : {}) as Record<string, unknown>;
  const evening = (plan.eveningWindow && typeof plan.eveningWindow === "object" ? plan.eveningWindow : {}) as Record<string, unknown>;
  const hashtagBlock = (b.hashtags && typeof b.hashtags === "object" ? b.hashtags : {}) as Record<string, unknown>;
  const kinds: Record<string, string[]> = { ...d.hashtags.kinds };
  if (hashtagBlock.kinds && typeof hashtagBlock.kinds === "object" && !Array.isArray(hashtagBlock.kinds)) {
    for (const [key, value] of Object.entries(hashtagBlock.kinds as Record<string, unknown>)) {
      kinds[key] = tagList(value, kinds[key] ?? []);
    }
  }

  const connectionRaw = (b.connection && typeof b.connection === "object" && !Array.isArray(b.connection)
    ? b.connection
    : {}) as Record<string, unknown>;
  const pausedRaw = str(connectionRaw.pausedUntil, "").trim();

  const dailyCap = intIn(plan.dailyCap, d.plan.dailyCap, 1, 3);
  const budgetMin = intIn(plan.budgetMin, d.plan.budgetMin, 0, dailyCap);
  const budgetMax = intIn(plan.budgetMax, d.plan.budgetMax, budgetMin, dailyCap);

  return {
    connection: {
      // Stored value *and* legacy rows are canonicalised on the way out, so a
      // `t.me/…` link saved by an older build still resolves to `@name`.
      channelId: looksLikeChannelId(connectionRaw.channelId)
        ? canonicalChannelId(str(connectionRaw.channelId, ""))
        : d.connection.channelId,
      adminChatId: looksLikeChatId(connectionRaw.adminChatId)
        ? str(connectionRaw.adminChatId, "").trim()
        : d.connection.adminChatId,
      mode: isChannelMode(connectionRaw.mode) ? connectionRaw.mode : d.connection.mode,
      pausedUntil: ISO_DAY_RE.test(pausedRaw) ? pausedRaw : null,
      discoveredChannel: parseDiscoveredChannel(connectionRaw.discoveredChannel),
    },
    brand: str(b.brand, d.brand).slice(0, 40) || d.brand,
    channelUsername: str(b.channelUsername, d.channelUsername).replace(/^@/, "").slice(0, 32),
    botUsername: str(b.botUsername, d.botUsername).replace(/^@/, "").slice(0, 32),
    siteUrl,
    footerMain: links(b.footerMain, d.footerMain, siteUrl),
    footerSocial: links(b.footerSocial, d.footerSocial, siteUrl),
    hashtags: {
      kinds,
      countries: tagMap(hashtagBlock.countries, d.hashtags.countries),
      funding: fundingTags(hashtagBlock.funding, d.hashtags.funding),
      levels: tagMap(hashtagBlock.levels, d.hashtags.levels),
      weekly: tagList(hashtagBlock.weekly, d.hashtags.weekly),
    },
    linkPreview: boolMap(b.linkPreview, d.linkPreview),
    footerEnabled: boolMap(b.footerEnabled, d.footerEnabled),
    plan: {
      dailyCap,
      budgetMin,
      budgetMax,
      quietDayEnabled: boolOr(plan.quietDayEnabled, d.plan.quietDayEnabled),
      morningWindow: {
        start: time(morning.start, d.plan.morningWindow.start),
        end: time(morning.end, d.plan.morningWindow.end),
      },
      eveningWindow: {
        start: time(evening.start, d.plan.eveningWindow.start),
        end: time(evening.end, d.plan.eveningWindow.end),
      },
      weeklyMinItems: intIn(plan.weeklyMinItems, d.plan.weeklyMinItems, 1, 10),
      weeklyPin: boolOr(plan.weeklyPin, d.plan.weeklyPin),
      digestEnabled: boolOr(plan.digestEnabled, d.plan.digestEnabled),
      priorityCountries: cleanPriorityCountries(plan.priorityCountries, d.plan.priorityCountries),
    },
    pollCadenceDays: intIn(b.pollCadenceDays, d.pollCadenceDays, 1, 90),
  };
}

/**
 * The default footer: the channel and the bot from settings, no brand names of
 * any third party. Empty when the usernames are not configured (a dead link is
 * worse than no footer).
 */
export function resolvedFooterMain(settings: ChannelSettings): LinkItem[] {
  if (settings.footerMain.length) return settings.footerMain;
  const items: LinkItem[] = [];
  if (settings.channelUsername) items.push({ label: DEFAULT_FOOTER_LABELS.channel, url: `https://t.me/${settings.channelUsername}` });
  if (settings.botUsername) items.push({ label: DEFAULT_FOOTER_LABELS.bot, url: `https://t.me/${settings.botUsername}` });
  return items;
}

/** Social footer for the weekly post: only what the operator configured. */
export function resolvedFooterSocial(settings: ChannelSettings): LinkItem[] {
  return settings.footerSocial;
}

/** Should this kind allow a link preview? Default: no. */
export function linkPreviewFor(settings: ChannelSettings, kind: string): boolean {
  return settings.linkPreview[kind] === true;
}

/**
 * Should this kind carry the footer? Default: yes, for every kind.
 *
 * Urgency was the one exception — and it is the kind readers see most often, so
 * the social line the operator configured was missing from exactly the posts
 * that matter. An operator who wants it gone can still turn it off per kind.
 */
export function footerEnabledFor(settings: ChannelSettings, kind: string): boolean {
  return settings.footerEnabled[kind] ?? true;
}

/* ------------------------------------------------------------------ storage */

/** Keys written to `channel_settings`; each row holds one JSON object. */
export const SETTINGS_KEYS = [
  "connection",
  "brand",
  "footer_main",
  "footer_social",
  "hashtags",
  "link_preview",
  "footer_enabled",
  "plan",
] as const;

export type SettingsKey = (typeof SETTINGS_KEYS)[number];

/** Split a full settings object into the rows we persist. */
export function settingsRows(settings: ChannelSettings): Record<SettingsKey, unknown> {
  return {
    connection: settings.connection,
    brand: {
      brand: settings.brand,
      channelUsername: settings.channelUsername,
      botUsername: settings.botUsername,
      siteUrl: settings.siteUrl,
    },
    footer_main: settings.footerMain,
    footer_social: settings.footerSocial,
    hashtags: settings.hashtags,
    link_preview: settings.linkPreview,
    footer_enabled: settings.footerEnabled,
    plan: { ...settings.plan, pollCadenceDays: settings.pollCadenceDays },
  };
}

/** Rebuild a full settings object from stored rows (missing keys keep defaults). */
export function settingsFromRows(rows: { key: string; value: string | null }[]): ChannelSettings {
  const raw: Record<string, unknown> = {};
  for (const row of rows) {
    if (!SETTINGS_KEYS.includes(row.key as SettingsKey)) continue;
    let parsed: unknown = null;
    try {
      parsed = row.value ? JSON.parse(row.value) : null;
    } catch {
      parsed = null;
    }
    if (row.key === "brand" && parsed && typeof parsed === "object") {
      Object.assign(raw, parsed as Record<string, unknown>);
      continue;
    }
    if (row.key === "plan" && parsed && typeof parsed === "object") {
      raw.plan = parsed;
      continue;
    }
    if (row.key === "connection") raw.connection = parsed;
    if (row.key === "hashtags") raw.hashtags = parsed;
    if (row.key === "footer_main") raw.footerMain = parsed;
    if (row.key === "footer_social") raw.footerSocial = parsed;
    if (row.key === "link_preview") raw.linkPreview = parsed;
    if (row.key === "footer_enabled") raw.footerEnabled = parsed;
  }
  return mergeChannelSettings(raw);
}
