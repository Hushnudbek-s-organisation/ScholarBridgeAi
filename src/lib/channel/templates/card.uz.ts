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
import {
  aboutSentences,
  translateCoverage,
  translateEnglishRequirement,
  translateRequirements,
} from "./translate.uz";

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
  /**
   * True when the message already says how many days are left (the urgency
   * banner), so the deadline line does not repeat the countdown.
   */
  suppressCountdown?: boolean;
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

/**
 * The Uzbek one-liner under the title.
 *
 * The reference post opens with `🇯🇵 MEXT (UR): Yaponiyada magistratura va PhD
 * uchun to'liq grant` — a sentence *about* the award, not its official name.
 * The official name is data and stays as stored; this line is built from the
 * stored country/degrees/funding so the first thing a reader sees is Uzbek.
 *
 * Built only from fields the row actually holds: an unknown country or degree
 * list shortens the sentence instead of being guessed.
 */
export function taglineFromFacts(facts: Facts, country: CountryDisplay | null): string | null {
  // "to'liq grant" is the phrase the reference post uses; a partial award
  // keeps its own label so the headline still says what is covered.
  const funding = facts.fullyFunded ? "to'liq grant" : facts.coverage ? `${facts.coverage} grant` : "grant";
  const where = country?.locative ? esc(country.locative) : null;
  const degrees = facts.degrees ? esc(facts.degrees) : null;
  if (where && degrees) return `${where} ${degrees} uchun ${funding}`;
  if (where) return `${where} o'qish uchun ${funding}`;
  if (degrees) return `${cap(degrees)} uchun ${funding}`;
  return null;
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

/**
 * `Til talabi`.
 *
 * Authored copy first, then the English `english_requirements` text rendered
 * into Uzbek (it is the only place TOEFL/DET/HSK and "no single score" live),
 * then the structured IELTS floor as the last resort.
 */
export function languageLabel(facts: Facts, content: ScholarshipContent | null): string | null {
  if (content?.languageReqUz) return esc(content.languageReqUz);
  const translated = translateEnglishRequirement(facts.englishRequirementRaw);
  if (translated) return esc(translated);
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
  /**
   * The English `requirements` prose, read for the facts it states and written
   * back in Uzbek. Structured bullets above come first, so the translated ones
   * only add what the columns do not hold (nomination, documents, an age cap,
   * an exclusivity clause). Duplicates are dropped, and the list stops at six
   * bullets — a wall of text is not a post.
   */
  const translated = translateRequirements(facts.requirementsRaw, {
    degrees: facts.degrees,
    minGpa: facts.minGpa,
  });
  for (const line of translated) {
    if (out.length >= 6) break;
    if (!out.includes(line)) out.push(line);
  }
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
  /**
   * A stated percentage or amount beats our own boolean: "Kontraktning 50–100%
   * qismi" tells the reader more than "To'liq moliyalashtirish" ever could.
   * Otherwise the generic full-funding bullet is added only on an award the
   * data calls full — a partial award gets nothing here rather than a repeat of
   * the header.
   */
  const coverage = translateCoverage(facts.tuitionCoverageRaw);
  const specific = coverage && (coverage.includes("%") || coverage.startsWith("Stipendiya"));
  if (specific) out.push(coverage as string);
  else if (facts.fullyFunded) out.push("To'liq moliyalashtirish");
  else if (coverage) out.push(coverage);
  const living = facts.livingAllowance !== null ? moneyUsd(facts.livingAllowance) : null;
  if (living) out.push(`Yashash uchun to'lov: ${living}`);
  const travel = facts.travelAllowance !== null ? moneyUsd(facts.travelAllowance) : null;
  if (travel) out.push(`Yo'l xarajatlari: ${travel}`);
  return out;
}

/**
 * "Dastur haqida".
 *
 * Order of authority:
 *  1. the admin's own Uzbek copy (Admin → Kanal → Kontent), verbatim, one
 *     bullet per paragraph;
 *  2. a sentence composed from stored columns — where, which degree levels,
 *     on what funding basis;
 *  3. up to two sentences *read* out of the English `description` (taught in
 *     English, N years, fully funded, open to international students).
 *
 * What is never here: the English description itself, and anything the row does
 * not state. Without this the section simply did not exist on the 500+ awards
 * nobody had typed copy for — which is why the published post was thinner than
 * the reference format.
 */
export function aboutBullets(
  facts: Facts,
  content: ScholarshipContent | null,
  country: CountryDisplay | null
): string[] {
  if (content?.aboutUz) {
    return content.aboutUz
      .split(/\n{2,}|\r?\n/)
      .map((part) => part.trim())
      .filter(Boolean);
  }

  const out: string[] = [];
  /**
   * Only the locative form is safe here: "Kanada bakalavr bosqichini" is broken
   * Uzbek, and an unknown country has no locative at all. Without it the
   * sentence simply does not name a place — it never writes the plain name into
   * a position that needs `-da`.
   */
  const where = country?.locative ?? null;
  const degrees = facts.degrees;
  const funding = facts.fullyFunded ? "to'liq moliyalashtirish" : (facts.coverage ?? null);

  if (where && degrees && funding) {
    out.push(`Ushbu dastur ${where} ${degrees} bosqichini ${funding} asosida o'qish imkonini beradi.`);
  } else if (where && degrees) {
    out.push(`Ushbu dastur ${where} ${degrees} bosqichida o'qish imkonini beradi.`);
  } else if (where && funding) {
    out.push(`Ushbu dastur ${where} ${funding} asosida o'qish imkonini beradi.`);
  } else if (degrees && funding) {
    out.push(`Ushbu dastur ${degrees} bosqichini ${funding} asosida o'qish imkonini beradi.`);
  } else if (degrees) {
    out.push(`Ushbu dastur ${degrees} bosqichida o'qish imkonini beradi.`);
  } else if (where) {
    out.push(`Ushbu dastur ${where} o'qish uchun mo'ljallangan.`);
  } else if (funding) {
    out.push(`Ushbu dastur ${funding} asosida o'qishni qoplaydi.`);
  }

  for (const sentence of aboutSentences(facts.descriptionRaw, out)) {
    if (out.length >= 2) break;
    out.push(sentence);
  }
  return out;
}

/** `⏰️Oxirgi muddat: 12-noyabr, 2026 · 36 kun qoldi` */
export function cardDeadlineLine(facts: Facts, suppressCountdown = false): string {
  const { quality, date, daysLeft } = facts.deadline;
  const formatted = formatDateUz(date);
  if (quality === "exact" && formatted) {
    const left = !suppressCountdown && daysLeft !== null ? daysLeftUz(daysLeft) : null;
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

  const authoredTagline = content?.taglineUz ? esc(content.taglineUz) : null;
  const tagline = authoredTagline ?? taglineFromFacts(facts, country);
  const sections: CardSections = {
    headline: headline(facts, tagline, country, chrome.variant),
    provider: facts.provider ? `🏛 ${facts.provider}` : null,
    funding: content?.fundingTypeUz ? esc(content.fundingTypeUz) : fundingLabel(facts),
    language: languageLabel(facts, content),
    eligibility: eligibilityBullets(facts, content),
    benefits: benefitBullets(facts, content),
    about: aboutBullets(facts, content, country),
    deadline: cardDeadlineLine(facts, input.suppressCountdown === true),
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
