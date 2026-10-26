/**
 * `scholarship_rich` — the full post for a scholarship that has authored Uzbek
 * copy. The section structure is fixed; only the headline and CTA wording
 * varies (three styles). Empty sections disappear together with their heading
 * and the blank line around them.
 *
 * Length policy: a soft target of 1800 characters (about is trimmed at a word
 * boundary), then the hard Telegram limit — drop "about" first, then cut each
 * bullet list to four items, and if it still does not fit the post is skipped.
 */
import type { ScholarshipContent } from "../content";
import type { CountryDisplay } from "../countries";
import { visibleLength } from "../lint";
import type { PostChrome, Rendered } from "./chrome";
import { ctaLine, footerLine, hashtagLine } from "./chrome";
import type { Facts } from "./facts";
import { bullets, esc, formatDateUz } from "./format";

export const SOFT_LIMIT = 1800;
export const HARD_LIMIT = 4096;
export const MAX_BULLETS_AFTER_DROP = 4;

export interface RichPostInput {
  facts: Facts;
  content: ScholarshipContent;
  country: CountryDisplay | null;
  chrome: PostChrome;
}

/** Deadline line mandated by the spec for the rich post. */
export function richDeadlineLine(facts: Facts): string {
  const { quality, date } = facts.deadline;
  const formatted = formatDateUz(date);
  if (quality === "exact" && formatted) return `🕓Oxirgi muddat: ${formatted}`;
  if (quality === "estimated") return `🕓Taxminiy muddat: ${formatted ?? "taxminan"}`;
  return "🕓Muddat: rasmiy sahifada ko'rsatilgan";
}

function headline(facts: Facts, tagline: string, country: CountryDisplay | null, variant: number): string {
  const flag = country?.flag ? `${country.flag} ` : "";
  const title = `<b>${facts.title}</b>`;
  const v = ((variant % 3) + 3) % 3;
  if (v === 1) return `${flag}${title}\n<i>${tagline}</i>`;
  if (v === 2) return `${flag}${title} · ${tagline}`;
  return `${flag}${title} — ${tagline}`;
}

interface Sections {
  headline: string;
  funding: string | null;
  language: string | null;
  eligibility: string | null;
  benefits: string | null;
  about: string | null;
  deadline: string;
  cta: string | null;
  hashtags: string | null;
  footer: string | null;
}

/** Fixed order from the spec; each block is separated by exactly one blank line. */
function compose(sections: Sections): string {
  const blocks: string[] = [sections.headline];
  const details = [sections.funding, sections.language].filter((v): v is string => Boolean(v));
  if (details.length) blocks.push(details.join("\n"));
  if (sections.eligibility) blocks.push(`<b>Kimlar uchun</b>\n${sections.eligibility}`);
  if (sections.benefits) blocks.push(`<b>Foydali tomonlari</b>\n${sections.benefits}`);
  if (sections.about) blocks.push(`<b>Dastur haqida</b>\n${sections.about}`);
  const tail = [sections.deadline, sections.cta].filter((v): v is string => Boolean(v)).join("\n");
  if (tail) blocks.push(tail);
  if (sections.hashtags) blocks.push(sections.hashtags);
  if (sections.footer) blocks.push(sections.footer);
  return blocks.join("\n\n");
}

/** Cut at a word boundary so a sentence never ends mid-word. */
export function trimAtWord(text: string, max: number): string {
  const clean = text.trim();
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, Math.max(0, max));
  const cut = slice.lastIndexOf(" ");
  const base = cut > max * 0.6 ? slice.slice(0, cut) : slice;
  return `${base.replace(/[\s,;:–—-]+$/, "")}…`;
}

export function renderScholarshipRich(input: RichPostInput): Rendered | null {
  const { facts, content, country, chrome } = input;
  if (!content.taglineUz || !content.fundingTypeUz) return null;
  if (!facts.title.trim()) return null;
  const hasBody = content.eligibilityUz.length > 0 || content.benefitsUz.length > 0 || Boolean(content.aboutUz);
  if (!hasBody) return null;

  const build = (opts: { about: string | null; bullets: number }): string =>
    compose({
      headline: headline(facts, esc(content.taglineUz as string), country, chrome.variant),
      funding: `Moliyalashtirish: ${esc(content.fundingTypeUz as string)}`,
      language: content.languageReqUz ? `Til talabi: ${esc(content.languageReqUz)}` : null,
      eligibility: bullets(content.eligibilityUz.slice(0, opts.bullets)),
      benefits: bullets(content.benefitsUz.slice(0, opts.bullets)),
      about: opts.about ? esc(opts.about) : null,
      deadline: richDeadlineLine(facts),
      cta: ctaLine(chrome),
      hashtags: hashtagLine(chrome.hashtags),
      footer: footerLine(chrome.footer),
    });

  const fullAbout = content.aboutUz ?? null;
  let html = build({ about: fullAbout, bullets: content.eligibilityUz.length > 4 ? 6 : 6 });

  // Soft limit: shrink "about" first, it is the only free-form block.
  if (visibleLength(html) > SOFT_LIMIT && fullAbout) {
    const excess = visibleLength(html) - SOFT_LIMIT;
    const shortened = trimAtWord(fullAbout, Math.max(160, fullAbout.length - excess));
    html = build({ about: shortened, bullets: 6 });
  }

  // Hard limit: drop "about", then cut the bullet lists, then give up.
  if (visibleLength(html) >= HARD_LIMIT) html = build({ about: null, bullets: 6 });
  if (visibleLength(html) >= HARD_LIMIT) html = build({ about: null, bullets: MAX_BULLETS_AFTER_DROP });
  if (visibleLength(html) >= HARD_LIMIT) return null;

  return { key: `rich_v${((chrome.variant % 3) + 3) % 3 + 1}`, html };
}
