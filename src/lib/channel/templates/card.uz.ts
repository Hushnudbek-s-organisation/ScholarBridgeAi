/**
 * The channel's scholarship card — one layout for every award post.
 *
 * The operator's reference is the format an Uzbek grant channel actually
 * publishes: a flag + bold title, the two facts a reader scans first
 * (`Moliyalashtirish`, `Til talabi`), then short ➡️ bullet sections, then the
 * deadline, the tracked link, the hashtags and the footer.
 *
 * Two rules shape everything here:
 *
 *  1. **Uzbek only.** Free-form database prose (`description`, `requirements`,
 *     `english_requirements`) is English in production data, and the channel
 *     speaks Uzbek (docs/CHANNEL.md §4), so those fields are never printed.
 *     A section is built from structured, already-translated facts — or, when
 *     the admin has written the Uzbek copy in Admin → Kanal → Kontent, from
 *     that copy.
 *  2. **Silence beats invention.** Every line comes from a stored field. A
 *     missing field drops its line (and its heading), so a thin record produces
 *     a short honest post instead of a fake complete one.
 *
 * `scholarship_rich` keeps its own renderer (it demands authored copy for every
 * section); this module is the fallback shape for the other 500+ awards.
 */
import type { ScholarshipContent } from "../content";
import type { CountryDisplay } from "../countries";
import { visibleLength } from "../lint";
import type { PostChrome, Rendered } from "./chrome";
import { ctaLine, footerLine, hashtagLine } from "./chrome";
import type { Facts } from "./facts";
import { bullets, esc, daysLeftUz, formatDateUz } from "./format";

/** Soft target — past this the "about" paragraph is trimmed first. */
export const CARD_SOFT_LIMIT = 1800;
/** Telegram's limit. Past this the post is shortened, then dropped. */
export const CARD_HARD_LIMIT = 4096;
/** Bullets kept per section when the post has to shrink. */
const REDUCED_BULLETS = 4;

export interface CardInput {
  facts: Facts;
  /** Admin-authored Uzbek copy, when this award has any. */
  content?: ScholarshipContent | null;
  country: CountryDisplay | null;
  chrome: PostChrome;
}

const cap = (value: string) => (value ? value[0].toUpperCase() + value.slice(1) : value);

/** Join the non-empty blocks with exactly one blank line. */
function block(...parts: (string | null | undefined)[]): string {
  return parts.filter((part): part is string => typeof part === "string" && part.trim() !== "").join("\n\n");
}

/** Join the non-empty lines without a gap. */
function line(...parts: (string | null | undefined)[]): string {
  return parts.filter((part): part is string => typeof part === "string" && part.trim() !== "").join("\n");
}

/** `$1,400` — USD is the unit every stored allowance is kept in. */
export function moneyUsd(value: number): string | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

/** The headline, in three styles. Without a tagline there is no dangling dash. */
function headline(facts: Facts, tagline: string | null, country: CountryDisplay | null, variant: number): string {
  const flag = country?.flag ? `${country.flag} ` : "";
  const title = `<b>${facts.title}</b>`;
  if (!tagline) return `${flag}${title}`;
  const v = ((variant % 3) + 3) % 3;
  if (v === 1) return `${flag}${title}\n<i>${tagline}</i>`;
  if (v === 2) return `${flag}${title} · ${tagline}`;
  return `${flag}${title} — ${tagline}`;
}

/** "to'liq moliyalashtirish" → the one word a reader wants: `To'liq`. */
export function fundingLabel(facts: Facts): string | null {
  if (facts.fullyFunded) return "To'liq";
  return facts.coverage ? cap(facts.coverage) : null;
}

/** IELTS is the only language number we store; otherwise it is authored copy. */
export function languageLabel(facts: Facts, content: ScholarshipContent | null): string | null {
  if (content?.languageReqUz) return esc(content.languageReqUz);
  if (facts.minIelts !== null) return `IELTS ${facts.minIelts}+`;
  return null;
}

/**
 * "Kimlar uchun" bullets.
 *
 * Authored copy wins when it exists (it can say things structured fields
 * cannot). Otherwise: degree level, major, GPA and — only when the stored list
 * names Uzbekistan — eligibility.
 */
export function eligibilityBullets(facts: Facts, content: ScholarshipContent | null): string[] {
  if (content && content.eligibilityUz.length > 0) return content.eligibilityUz;
  const out: string[] = [];
  if (facts.degrees) out.push(cap(facts.degrees));
  if (facts.majors) out.push(cap(facts.majors));
  if (facts.minGpa !== null) out.push(`GPA ${facts.minGpa}+`);
  if (facts.eligibility === "uz_eligible") out.push("🇺🇿 O'zbekistonliklar uchun ochiq");
  return out;
}

/**
 * "Foydali tomonlari" bullets — the coverage label plus every stored amount.
 * `living_allowance` / `travel_allowance` are only printed when the row has a
 * positive number; a NULL means the source said nothing.
 */
export function benefitBullets(facts: Facts, content: ScholarshipContent | null): string[] {
  if (content && content.benefitsUz.length > 0) return content.benefitsUz;
  const out: string[] = [];
  // The header already states the coverage ("Moliyalashtirish: …"), so it only
  // becomes a *benefit* bullet when the award is fully funded — there the
  // bullet adds what the one-word header cannot: everything is covered.
  // A partial award repeats nothing; it lists amounts or has no section.
  if (facts.fullyFunded) out.push("To'liq moliyalashtirish");
  const living = facts.livingAllowance !== null ? moneyUsd(facts.livingAllowance) : null;
  if (living) out.push(`Yashash uchun to'lov: ${living}`);
  const travel = facts.travelAllowance !== null ? moneyUsd(facts.travelAllowance) : null;
  if (travel) out.push(`Yo'l xarajatlari: ${travel}`);
  return out;
}

/** "Dastur haqida" — authored Uzbek prose only, one bullet per paragraph. */
function aboutBullets(content: ScholarshipContent | null): string[] {
  if (!content?.aboutUz) return [];
  return content.aboutUz
    .split(/\n{2,}|\r?\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** `⏰️Oxirgi muddat: 12-noyabr, 2026 · 36 kun qoldi` */
export function cardDeadlineLine(facts: Facts): string {
  const { quality, date, daysLeft } = facts.deadline;
  const formatted = formatDateUz(date);
  if (quality === "exact" && formatted) {
    const left = daysLeft !== null ? daysLeftUz(daysLeft) : null;
    return `⏰️<b>Oxirgi muddat:</b> ${formatted}${left ? ` · ${left}` : ""}`;
  }
  if (quality === "estimated") {
    return `⏰️<b>Taxminiy muddat:</b> ${formatted ?? "taxminan"}`;
  }
  if (quality === "evergreen") return "⏰️<b>Muddat:</b> doimiy qabul";
  return "⏰️<b>Muddat:</b> rasmiy sahifada ko'rsatilgan";
}

/** The tracked link, or the plain detail page when no `/go/` code exists. */
function detailLine(facts: Facts, chrome: PostChrome): string | null {
  const tracked = ctaLine(chrome);
  if (tracked) return tracked;
  if (!facts.siteUrl) return null;
  return `➡️<b>Batafsil:</b> <a href="${esc(`${facts.siteUrl}${facts.sitePath}`)}">havola</a>`;
}

interface CardSections {
  headline: string;
  /** Who offers the award — the reader's first trust signal after the title. */
  provider: string | null;
  funding: string | null;
  language: string | null;
  eligibility: string[];
  benefits: string[];
  about: string[];
  deadline: string;
  /** The provider's own page: data, not a link we invent. */
  source: string | null;
  detail: string | null;
  hashtags: string | null;
  footer: string | null;
}

/** Fixed order, fixed headings; a section with no bullets disappears entirely. */
function compose(sections: CardSections, limits: { bullets: number; about: boolean }): string {
  const factLines = line(
    sections.funding ? `<b>Moliyalashtirish:</b> ${sections.funding}` : null,
    sections.language ? `<b>Til talabi:</b> ${sections.language}` : null
  );
  const who = bullets(sections.eligibility.slice(0, limits.bullets));
  const benefits = bullets(sections.benefits.slice(0, limits.bullets));
  const about = limits.about ? bullets(sections.about.slice(0, limits.bullets)) : null;
  const tail = line(sections.deadline, sections.source, sections.detail);
  return block(
    block(sections.headline, sections.provider),
    factLines,
    who ? `<b>Kimlar uchun</b>\n${who}` : null,
    benefits ? `<b>Foydali tomonlari</b>\n${benefits}` : null,
    about ? `<b>Dastur haqida</b>\n${about}` : null,
    tail,
    sections.hashtags,
    sections.footer
  );
}

/**
 * Render one scholarship card. Returns null only when there is nothing to say
 * (no title) or when even the reduced post cannot fit Telegram's limit.
 */
export function renderScholarshipCard(input: CardInput): Rendered | null {
  const { facts, country, chrome } = input;
  const content = input.content ?? null;
  if (!facts.title.trim()) return null;

  const tagline = content?.taglineUz ? esc(content.taglineUz) : null;
  const sections: CardSections = {
    headline: headline(facts, tagline, country, chrome.variant),
    provider: facts.provider ? `🏛 ${facts.provider}` : null,
    funding: content?.fundingTypeUz ? esc(content.fundingTypeUz) : fundingLabel(facts),
    language: languageLabel(facts, content),
    eligibility: eligibilityBullets(facts, content),
    benefits: benefitBullets(facts, content),
    about: aboutBullets(content),
    deadline: cardDeadlineLine(facts),
    source: facts.providerUrl ? `🏛 Rasmiy manba: <a href="${esc(facts.providerUrl)}">havola</a>` : null,
    detail: detailLine(facts, chrome),
    hashtags: hashtagLine(chrome.hashtags),
    footer: footerLine(chrome.footer),
  };

  let html = compose(sections, { bullets: 6, about: true });
  if (visibleLength(html) < CARD_HARD_LIMIT) return { key: "card_v1", html };

  // Shrink in the order that costs the reader least: the prose, then the
  // bullet lists.
  html = compose(sections, { bullets: 6, about: false });
  if (visibleLength(html) < CARD_HARD_LIMIT) return { key: "card_v2", html };
  html = compose(sections, { bullets: REDUCED_BULLETS, about: false });
  if (visibleLength(html) < CARD_HARD_LIMIT) return { key: "card_v3", html };
  return null;
}
