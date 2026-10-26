/**
 * `weekly_deadlines` — Sunday's "deadlines in the coming week" list.
 *
 * Scope is decided by the planner (open, active, verified, EXACT deadline from
 * today through today+7 in Tashkent days, sorted by deadline then country); this
 * module only lays out what it is given. Blocks never split across parts: a long
 * list becomes `1/2`, `2/2`, … and only the last part carries the closing lines.
 */
import type { LinkItem } from "../settings";
import type { Rendered, ShortLinkView } from "./chrome";
import { esc } from "./format";
import { trimAtWord } from "./rich.uz";

export const WEEKLY_HEADERS = [
  "⏳ Kelayotgan hafta muddati tugaydigan dasturlar",
  "⏳ Bu hafta muddati tugaydiganlar",
  "📅 Yaqin 7 kunda tugaydigan dasturlar",
] as const;

export const WEEKLY_TAGLINE_CHARS = 120;
export const WEEKLY_MAX_CHARS = 4000;

export interface WeeklyItem {
  /** Already escaped. */
  flag: string;
  /** Already escaped. */
  title: string;
  /** Raw tagline (will be trimmed and escaped) or null. */
  tagline: string | null;
  /** `{deadline_day_text}`, e.g. "25-oktabr Yakshanba". */
  deadlineDayText: string;
  shortLink: ShortLinkView | null;
}

export interface WeeklyInput {
  items: WeeklyItem[];
  botUsername: string;
  hashtags: string[];
  footerSocial: LinkItem[];
  variant?: number;
  minItems: number;
  maxChars?: number;
}

export interface WeeklyRendered extends Rendered {
  parts: string[];
}

/** "title — tagline", with the tagline cut at a word boundary (~120 chars). */
export function weeklyTitleLine(item: WeeklyItem): string {
  const tagline = item.tagline ? trimAtWord(item.tagline, WEEKLY_TAGLINE_CHARS) : "";
  const title = item.title.trim();
  return tagline ? `${title} — ${esc(tagline.replace(/^…$/, ""))}` : title;
}

export function weeklyBlock(item: WeeklyItem): string {
  const head = `${item.flag ? `${item.flag} ` : ""}${weeklyTitleLine(item)} [${item.deadlineDayText}]`;
  if (!item.shortLink) return head;
  return `${head}\n👉 <a href="${esc(item.shortLink.url)}">${esc(item.shortLink.visible)}</a>`;
}

function closingLines(input: WeeklyInput): string[] {
  const lines: string[] = [];
  if (input.botUsername) {
    lines.push(`🚀 Kunlik eslatmalar olib turish uchun @${esc(input.botUsername)} telegram botimizdan foydalaning!`);
  }
  if (input.hashtags.length) lines.push(input.hashtags.map((t) => `#${t}`).join(" "));
  if (input.footerSocial.length) {
    lines.push(`💼 ${input.footerSocial.map((item) => `<a href="${esc(item.url)}">${esc(item.label)}</a>`).join(" | ")}`);
  }
  return lines;
}

/**
 * Returns the parts to send, or null when there is nothing worth posting
 * (fewer than `minItems` dated scholarships).
 */
export function renderWeeklyDeadlines(input: WeeklyInput): WeeklyRendered | null {
  if (input.items.length < Math.max(1, input.minItems)) return null;
  const maxChars = Math.min(WEEKLY_MAX_CHARS, input.maxChars ?? WEEKLY_MAX_CHARS);
  const variant = ((input.variant ?? 0) % WEEKLY_HEADERS.length + WEEKLY_HEADERS.length) % WEEKLY_HEADERS.length;
  const header = WEEKLY_HEADERS[variant];
  const blocks = input.items.map(weeklyBlock);
  const closing = closingLines(input);

  const rawLength = [header, ...blocks, ...closing].join("\n\n").length;
  if (rawLength < HARD_MARGIN(maxChars)) {
    return { key: `weekly_v${variant + 1}`, html: [header, ...blocks, ...closing].join("\n\n"), parts: [[header, ...blocks, ...closing].join("\n\n")] };
  }

  // Split at block boundaries; the closing lines go on the last part only.
  const chunks: string[][] = [];
  let current: string[] = [header];
  let currentLength = header.length;
  for (const block of blocks) {
    if (currentLength + block.length + 2 > maxChars - 40 && current.length > 1) {
      chunks.push(current);
      current = [];
      currentLength = 0;
    }
    current.push(block);
    currentLength += block.length + 2;
  }
  chunks.push(current);

  const parts = chunks.map((chunk, index) => {
    const isLast = index === chunks.length - 1;
    const head = index === 0 ? chunk : [`⏳ Davomi (${index + 1}/${chunks.length})`, ...chunk];
    const body = isLast ? [...head, ...closing] : head;
    return body.join("\n\n");
  });

  for (const part of parts) if (part.length >= 4096) return null; // one block is simply too long
  return { key: `weekly_v${variant + 1}`, html: parts.join("\n\n"), parts };
}

/** Leave room for the separator before comparing with Telegram's hard limit. */
function HARD_MARGIN(maxChars: number): number {
  return maxChars - 200;
}

