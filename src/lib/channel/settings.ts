/**
 * Channel settings — defaults live in code, overrides live in `channel_settings`
 * and are read at run time (Phase 2). Nothing here reads the database or the
 * environment, so templates and tests get an explicit, validated object.
 *
 * Only secrets and the kill-switch default stay in the environment
 * (`CHANNEL_AUTOPOST`, `TELEGRAM_BOT_TOKEN`). The bot token is never part of
 * settings and must never appear in the admin UI.
 */

export type ChannelMode = "off" | "dryrun" | "on";

export interface LinkItem {
  label: string;
  url: string;
}

export interface ChannelSettings {
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
  };
  /** Minimum days between two polls. */
  pollCadenceDays: number;
}

export const DEFAULT_FOOTER_LABELS = { channel: "Kanal", bot: "Bot" } as const;

export const DEFAULT_CHANNEL_SETTINGS: ChannelSettings = {
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
    levels: { bachelor: "bakalavr", master: "magistratura", phd: "phd" },
    weekly: ["haftalik_eslatmalar", "reminders"],
  },
  linkPreview: {},
  footerEnabled: { urgency: false },
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

function links(value: unknown, fallback: LinkItem[]): LinkItem[] {
  if (!Array.isArray(value)) return fallback;
  const out: LinkItem[] = [];
  for (const entry of value.slice(0, 8)) {
    if (!entry || typeof entry !== "object") continue;
    const label = str((entry as LinkItem).label, "").slice(0, 40);
    const url = str((entry as LinkItem).url, "");
    if (!label || !isAllowedLinkUrl(url)) continue;
    out.push({ label, url });
  }
  return out;
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

function boolMap(value: unknown, fallback: Record<string, boolean>): Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const out: Record<string, boolean> = { ...fallback };
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === "boolean") out[key] = raw;
  }
  return out;
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function time(value: unknown, fallback: string): string {
  return typeof value === "string" && TIME_RE.test(value) ? value : fallback;
}

/** Deep, validating merge of stored JSON over the defaults. */
export function mergeChannelSettings(raw: unknown): ChannelSettings {
  const d = DEFAULT_CHANNEL_SETTINGS;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return d;
  const b = raw as Record<string, unknown>;
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

  const dailyCap = intIn(plan.dailyCap, d.plan.dailyCap, 1, 3);
  const budgetMin = intIn(plan.budgetMin, d.plan.budgetMin, 0, dailyCap);
  const budgetMax = intIn(plan.budgetMax, d.plan.budgetMax, budgetMin, dailyCap);

  return {
    brand: str(b.brand, d.brand).slice(0, 40) || d.brand,
    channelUsername: str(b.channelUsername, d.channelUsername).replace(/^@/, "").slice(0, 32),
    botUsername: str(b.botUsername, d.botUsername).replace(/^@/, "").slice(0, 32),
    siteUrl: (() => {
      const value = str(b.siteUrl, d.siteUrl);
      if (!value) return "";
      try {
        const url = new URL(value);
        return url.protocol === "https:" || url.protocol === "http:" ? `${url.protocol}//${url.host}` : "";
      } catch {
        return "";
      }
    })(),
    footerMain: links(b.footerMain, d.footerMain),
    footerSocial: links(b.footerSocial, d.footerSocial),
    hashtags: {
      kinds,
      countries: tagMap(hashtagBlock.countries, d.hashtags.countries),
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

/** Should this kind carry the footer? Default: yes, except urgency. */
export function footerEnabledFor(settings: ChannelSettings, kind: string): boolean {
  return settings.footerEnabled[kind] ?? kind !== "urgency";
}

/* ------------------------------------------------------------------ storage */

/** Keys written to `channel_settings`; each row holds one JSON object. */
export const SETTINGS_KEYS = [
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
    if (row.key === "hashtags") raw.hashtags = parsed;
    if (row.key === "footer_main") raw.footerMain = parsed;
    if (row.key === "footer_social") raw.footerSocial = parsed;
    if (row.key === "link_preview") raw.linkPreview = parsed;
    if (row.key === "footer_enabled") raw.footerEnabled = parsed;
  }
  return mergeChannelSettings(raw);
}
