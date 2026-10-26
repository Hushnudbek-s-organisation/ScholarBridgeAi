/**
 * Shared types and the pieces every template ends with: the tracked short link,
 * the hashtag line and the footer. Kept apart from the templates themselves so
 * the rich, compact and weekly renderers can share them without importing each
 * other.
 */
import type { LinkItem } from "../settings";
import { esc } from "./format";

export type Kind =
  | "scholarship_rich"
  | "scholarship_single"
  | "fully_funded"
  | "urgency"
  | "deadline_digest"
  | "country_spotlight"
  | "tip"
  | "checklist"
  | "weekly_deadlines"
  | "qa"
  | "story";

export const KINDS: readonly Kind[] = [
  "scholarship_rich",
  "scholarship_single",
  "fully_funded",
  "urgency",
  "deadline_digest",
  "country_spotlight",
  "tip",
  "checklist",
  "weekly_deadlines",
  "qa",
  "story",
] as const;

export interface Rendered {
  key: string;
  html: string;
}

export interface ShortLinkView {
  url: string;
  visible: string;
}

/** Everything around the body copy: link, hashtags, footer. */
export interface PostChrome {
  /** Origin without a trailing slash; "" disables link lines. */
  siteUrl: string;
  shortLink: ShortLinkView | null;
  hashtags: string[];
  footer: LinkItem[];
  /** 0-based style variant for headline/CTA lines. */
  variant: number;
}

export const EMPTY_CHROME: PostChrome = { siteUrl: "", shortLink: null, hashtags: [], footer: [], variant: 0 };

export interface RenderOptions {
  siteUrl: string;
  discussionUrl?: string | null;
  shortLink?: ShortLinkView | null;
  footer?: LinkItem[];
  variant?: number;
}

export function chromeFrom(options: RenderOptions): PostChrome {
  return {
    siteUrl: options.siteUrl,
    shortLink: options.shortLink ?? null,
    hashtags: [],
    footer: options.footer ?? [],
    variant: options.variant ?? 0,
  };
}

/** `➡️Batafsil: <a href="…">SITE/go/CODE</a>` — three CTA wordings. */
export function ctaLine(chrome: PostChrome, variant = chrome.variant): string | null {
  if (!chrome.shortLink) return null;
  const labels = ["Batafsil", "Batafsil ma'lumot", "To'liq ma'lumot"];
  const label = labels[((variant % labels.length) + labels.length) % labels.length];
  const { url, visible } = chrome.shortLink;
  return `➡️${label}: <a href="${esc(url)}">${esc(visible)}</a>`;
}

/** `<a href="…">🏛 Rasmiy manba</a>` style official-link tail (compact kinds). */
export function hashtagLine(tags: readonly string[] | null | undefined): string | null {
  const clean = (tags ?? []).filter(Boolean);
  return clean.length ? clean.map((t) => `#${t}`).join(" ") : null;
}

/**
 * `💼 <a>Kanal</a> | <a>Bot</a>` — the admin-configured footer, in order.
 * Empty configuration means no footer line at all.
 */
export function footerLine(footer: readonly LinkItem[] | null | undefined): string | null {
  const items = (footer ?? []).filter((item) => item && item.label && item.url);
  if (!items.length) return null;
  return `💼 ${items.map((item) => `<a href="${esc(item.url)}">${esc(item.label)}</a>`).join(" | ")}`;
}

/** Which kinds ever carry hashtags (urgency deliberately does not). */
export function kindUsesHashtags(kind: Kind): boolean {
  return kind !== "urgency" && kind !== "weekly_deadlines";
}
