/**
 * Channel templates (Uzbek Latin).
 *
 * Every renderer is pure: it receives facts that are already gated by
 * `publishable()` and already escaped, and it returns either a message or
 * `null` — meaning "there is not enough verified data to say this", which the
 * planner treats as "skip". A line whose data is missing is dropped; there are
 * no "n/a" placeholders and nothing is inferred.
 *
 * Wording rules from the spec, enforced by `scripts/check-channel.ts` over
 * every variant: no "kafolat", no "100%", no "albatta olasiz", no admission or
 * win promise, and "shoshiling" only in the last-day message.
 * Proofread list: docs/CHANNEL.md.
 */
import { bullets, esc, formatDateUz, daysLeftUz } from "./format";
import type { Kind, PostChrome, Rendered } from "./chrome";
import { ctaLine, EMPTY_CHROME, footerLine } from "./chrome";
import { renderScholarshipCard, eligibilityBullets, languageLabel } from "./card.uz";
import type { ScholarshipContent } from "../content";
import type { CountryDisplay } from "../countries";
import type { Facts } from "./facts";
import { TIP_BANK, type TipEntry } from "./tips.uz";
import { CHECKLIST_BANK, type ChecklistEntry } from "./checklist.uz";
import { QA_BANK, type QaEntry } from "./qa.uz";

export type { Kind, Rendered } from "./chrome";
export { KINDS } from "./chrome";

/** Variant counts (the test asserts every one of them renders). */
export const TEMPLATE_VARIANTS: Record<Kind, number> = {
  scholarship_rich: 3,
  scholarship_single: 3,
  fully_funded: 3,
  urgency: 4,
  deadline_digest: 3,
  country_spotlight: 3,
  tip: TIP_BANK.length,
  checklist: CHECKLIST_BANK.length,
  weekly_deadlines: 3,
  qa: QA_BANK.length,
  story: 2,
};

export interface RenderOptions {
  /** Site origin; "" disables every link line instead of printing a dead one. */
  siteUrl: string;
  /** Set only when CHANNEL_DISCUSSION_ENABLED — no comment CTA otherwise. */
  discussionUrl?: string | null;
  /** Tracked `/go/<code>` link; falls back to the plain scholarship page. */
  shortLink?: { url: string; visible: string } | null;
  /** Resolved footer links (admin settings). */
  footer?: { label: string; url: string }[];
  /** Headline/CTA style. */
  variant?: number;
}

/** The chrome a compact template needs, derived from RenderOptions. */
function chromeOf(options?: RenderOptions): PostChrome | null {
  if (!options) return null;
  return {
    siteUrl: options.siteUrl,
    shortLink: options.shortLink ?? null,
    hashtags: [],
    footer: options.footer ?? [],
    variant: options.variant ?? 0,
  };
}

/** CTA: the tracked link when we have one, otherwise the plain detail link. */
function ctaBlock(f: Facts, chrome: PostChrome | null, label = "Batafsil ma'lumot"): string | null {
  if (chrome?.shortLink) return ctaLine(chrome);
  return siteLink(f, label);
}

/** Footer line for compact posts (omitted when nothing is configured). */
function footerBlock(chrome: PostChrome | null): string | null {
  return footerLine(chrome?.footer);
}

const pick = <T,>(arr: readonly T[], v: number): T => arr[((v % arr.length) + arr.length) % arr.length];

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** Join non-empty paragraphs (blank line between them). */
function block(...parts: (string | null | undefined | false)[]): string {
  return parts
    .filter((p): p is string => typeof p === "string" && p.trim() !== "")
    .join("\n\n");
}

/** Join non-empty lines. */
function row(...parts: (string | null | undefined | false)[]): string {
  return parts
    .filter((p): p is string => typeof p === "string" && p.trim() !== "")
    .join("\n");
}

/** Clip already-escaped text without cutting an HTML entity in half. */
function clipHtml(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).replace(/&[a-zA-Z#0-9]*$/, "").trimEnd()}…`;
}

// ---------------------------------------------------------------------------
// Shared building blocks
// ---------------------------------------------------------------------------

/** The deadline as a plain phrase, or null when we cannot state one safely. */
export function deadlinePlain(f: Facts): string | null {
  const d = f.deadline;
  if (d.quality === "exact" && d.date) {
    const date = formatDateUz(d.date);
    if (!date) return null;
    const left = d.daysLeft !== null ? daysLeftUz(d.daysLeft) : null;
    return left ? `${date} · ${left}` : date;
  }
  if (d.quality === "estimated") {
    const date = formatDateUz(d.date);
    return date ? `taxminan ${date} (rasmiy sana kutilmoqda)` : "taxminan — aniq sana hali e'lon qilinmagan";
  }
  if (d.quality === "evergreen") return "doimiy qabul";
  return null;
}

/** The date only — used where the headline already states the countdown. */
function deadlineDateLine(f: Facts): string | null {
  if (f.deadline.quality !== "exact" || !f.deadline.date) return deadlineLine(f);
  const date = formatDateUz(f.deadline.date);
  return date ? `⏳ Muddat: ${date}` : null;
}

function deadlineLine(f: Facts): string | null {
  const plain = deadlinePlain(f);
  return plain ? `⏳ Muddat: ${cap(plain)}` : null;
}

function fundingPlain(f: Facts): string | null {
  return f.fullyFunded ? "to'liq moliyalashtirish" : f.coverage;
}

function fundingLine(f: Facts): string | null {
  const plain = fundingPlain(f);
  return plain ? `💰 ${cap(plain)}` : null;
}

/**
 * `🔤 Til talabi: …` — exactly what the card says, from the card's own reader.
 *
 * A reminder post used to show only `IELTS 6.5`, which loses TOEFL/HSK and any
 * award whose requirement is English prose (`english_requirements`); the
 * language label is already escaped by `languageLabel()`.
 */
function languageLine(f: Facts): string | null {
  const label = languageLabel(f, null);
  return label ? `🔤 Til talabi: ${label}` : null;
}

/** `📊 Minimal talab: GPA 3.5+` — the structured floors the columns hold. */
function requirementsPlain(f: Facts): string | null {
  return f.minGpa !== null ? `GPA ${f.minGpa}+` : null;
}

function requirementsLine(f: Facts): string | null {
  const plain = requirementsPlain(f);
  return plain ? `📊 Minimal talab: ${plain}` : null;
}

/**
 * `🎓 Kimlar uchun` — up to three ➡️ bullets from the card's eligibility
 * reader, so a reminder states who qualifies (degree, major, GPA, citizenship,
 * nomination, documents) instead of only the title and the date. Escaped by
 * `bullets()`; the same reader the card uses, so the two can never disagree.
 */
function whoBlock(f: Facts, max = 3): string | null {
  const items = eligibilityBullets(f, null).slice(0, max);
  if (!items.length) return null;
  const body = bullets(items);
  return body ? `🎓 <b>Kimlar uchun</b>\n${body}` : null;
}

/** Only printed when the data explicitly lists Uzbekistan. */
function eligibilityLine(f: Facts): string | null {
  return f.eligibility === "uz_eligible" ? "🇺🇿 O'zbekistonliklar uchun ochiq" : null;
}

function siteLink(f: Facts, label: string): string | null {
  if (!f.siteUrl) return null;
  return `🔗 <a href="${esc(`${f.siteUrl}${f.sitePath}`)}">${label}</a>`;
}

function providerLink(f: Facts): string | null {
  if (!f.providerUrl) return null;
  return `🏛 Rasmiy manba: <a href="${esc(f.providerUrl)}">havola</a>`;
}

function siteButtonLine(opts: RenderOptions, path: string, label: string): string | null {
  if (!opts.siteUrl) return null;
  return `🔗 <a href="${esc(`${opts.siteUrl}${path}`)}">${label}</a>`;
}

// ---------------------------------------------------------------------------
// Scholarship posts
// ---------------------------------------------------------------------------

/**
 * `scholarship_single` — the standard card (see `card.uz.ts`).
 *
 * It used to be three dense compact variants; the operator asked for the shape
 * every Uzbek grant channel uses: bold title, `Moliyalashtirish` / `Til talabi`,
 * then ➡️ bullet sections. The three variants now only vary the headline style
 * (and the three CTA wordings in `chrome.ts`), so the layout is recognisable
 * across the channel while the wording still rotates.
 */
export function renderScholarshipSingle(
  f: Facts,
  variant = 0,
  chrome: PostChrome | null = null,
  extra: { content?: ScholarshipContent | null; country?: CountryDisplay | null } = {}
): Rendered | null {
  const v = ((variant % 3) + 3) % 3;
  const post = renderScholarshipCard({
    facts: f,
    content: extra.content ?? null,
    country: extra.country ?? null,
    chrome: chrome ?? { ...EMPTY_CHROME, variant: v },
  });
  return post ? { key: `single_v${v + 1}`, html: post.html } : null;
}

/**
 * `fully_funded` — the same card, only ever for an award the data calls full.
 * A partial award stays silent here; the planner then falls back to the
 * standard card instead of mislabelling it.
 */
export function renderFullyFunded(
  f: Facts,
  variant = 0,
  chrome: PostChrome | null = null,
  extra: { content?: ScholarshipContent | null; country?: CountryDisplay | null } = {}
): Rendered | null {
  if (!f.fullyFunded) return null;
  const v = ((variant % 3) + 3) % 3;
  const post = renderScholarshipCard({
    facts: f,
    content: extra.content ?? null,
    country: extra.country ?? null,
    chrome: chrome ?? { ...EMPTY_CHROME, variant: v },
  });
  return post ? { key: `ff_v${v + 1}`, html: post.html } : null;
}

export function renderUrgency(f: Facts, rung: number, variant = 0, chrome: PostChrome | null = null): Rendered | null {
  const d = f.deadline;
  if (d.quality !== "exact" || d.daysLeft === null || d.daysLeft < 0 || d.daysLeft > rung) return null;
  const left = daysLeftUz(d.daysLeft);
  if (!left) return null;
  const lastDay = d.daysLeft <= 1;
  const v = ((variant % 4) + 4) % 4;
  const link = ctaBlock(f, chrome);
  const headline = lastDay ? `⏰ <b>${clipHtml(f.title, 110)}</b>` : `⏳ <b>${clipHtml(f.title, 110)}</b>`;

  if (v === 0) {
    return {
      key: "urgency_v1",
      html: block(
        headline,
        `${lastDay ? "Shoshiling: " : ""}${cap(left)}.`,
        row(`🏛 ${f.provider}`, f.country ? `📍 ${f.country}` : null, deadlineDateLine(f)),
        row(fundingLine(f), languageLine(f), requirementsLine(f), eligibilityLine(f)),
        whoBlock(f, 3),
        row(link, providerLink(f)),
        footerBlock(chrome)
      ),
    };
  }
  if (v === 1) {
    return {
      key: "urgency_v2",
      html: block(
        `${lastDay ? "⚠️ Oxirgi imkoniyat" : "⏳ Muddat yaqinlashmoqda"}`,
        `🎓 <b>${clipHtml(f.title, 110)}</b>`,
        row(
          `🏛 ${f.provider}`,
          f.country ? `📍 ${f.country}` : null,
          `⏳ ${cap(left)}`
        ),
        row(fundingLine(f), languageLine(f), requirementsLine(f), eligibilityLine(f)),
        whoBlock(f, 3),
        row(link, providerLink(f)),
        footerBlock(chrome)
      ),
    };
  }
  if (v === 2) {
    return {
      key: "urgency_v3",
      html: block(
        headline,
        row(
          `• Muddat: ${cap(deadlinePlain(f) as string)}`,
          `• Tashkilot: ${f.provider}`,
          f.country ? `• Davlat: ${f.country}` : null,
          fundingPlain(f) ? `• Moliyalashtirish: ${cap(fundingPlain(f) as string)}` : null,
          languageLabel(f, null) ? `• Til talabi: ${languageLabel(f, null)}` : null
        ),
        whoBlock(f, 3),
        `📌 ${cap(left)}.${lastDay ? " Shoshiling — ariza qabuli bugun yopiladi." : " Hujjatlarni oldindan tayyorlab qo'ying."}`,
        row(eligibilityLine(f), link),
        footerBlock(chrome)
      ),
    };
  }
  return {
    key: "urgency_v4",
    html: block(
      `🗓 ${lastDay ? "Bugun oxirgi kun" : `Muddatgacha ${d.daysLeft} kun`}`,
      `🎓 <b>${clipHtml(f.title, 110)}</b>`,
      `🏛 ${f.provider}${f.country ? ` · ${f.country}` : ""}`,
      row(fundingLine(f), languageLine(f), requirementsLine(f)),
      whoBlock(f, 3),
      row(link, providerLink(f)),
      footerBlock(chrome)
    ),
  };
}

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

/** Upcoming deadlines digest — at least two dated scholarships, nearest first. */
export function renderDeadlineDigest(items: Facts[], variant: number, opts: RenderOptions): Rendered | null {
  const dated = items
    .filter((f) => f.deadline.quality === "exact" && f.deadline.date && f.deadline.daysLeft !== null)
    .sort((a, b) => (a.deadline.daysLeft ?? 0) - (b.deadline.daysLeft ?? 0))
    .slice(0, 5);
  if (dated.length < 2) return null;
  const header = pick(
    [
      "🗓 <b>Yaqin muddatlar</b>",
      "⏳ <b>Yopilayotgan arizalar</b>",
      "📅 <b>Bu hafta nimani unutmaslik kerak</b>",
    ],
    variant
  );
  const body = dated
    .map((f) => {
      const date = formatDateUz(f.deadline.date);
      const left = f.deadline.daysLeft !== null ? daysLeftUz(f.deadline.daysLeft) : null;
      return row(
        `• <b>${clipHtml(f.title, 70)}</b>`,
        `  ${[date, left].filter(Boolean).join(" · ")}`
      );
    })
    .join("\n");
  return {
    key: `digest_v${(variant % 3) + 1}`,
    html: block(header, body, siteButtonLine(opts, "/scholarships", "Barcha imkoniyatlar"), footerBlock(chromeOf(opts))),
  };
}

/** Country spotlight — needs a real country and at least two published rows. */
export function renderCountrySpotlight(
  countryLabel: string,
  items: Facts[],
  variant: number,
  opts: RenderOptions
): Rendered | null {
  const list = items.slice(0, 4);
  if (!countryLabel || list.length < 2) return null;
  const header = pick(
    [
      `🌍 <b>${countryLabel}da o'qish imkoniyatlari</b>`,
      `🎯 <b>${countryLabel}</b>: qaysi dasturlar ochiq`,
      `📚 <b>${countryLabel}da</b> ${list.length} ta imkoniyat`,
    ],
    variant
  );
  const body = list
    .map((f) => {
      const date = f.deadline.date ? formatDateUz(f.deadline.date) : null;
      const left = f.deadline.daysLeft !== null ? daysLeftUz(f.deadline.daysLeft) : null;
      const when = f.deadline.quality === "exact" ? [date, left].filter(Boolean).join(" · ") : f.deadline.quality === "evergreen" ? "doimiy qabul" : null;
      return row(`• <b>${clipHtml(f.title, 70)}</b>`, when ? `  ${when}` : null);
    })
    .join("\n");
  return {
    key: `spotlight_v${(variant % 3) + 1}`,
    html: block(header, body, siteButtonLine(opts, "/scholarships", "Barchasini ko'rish"), footerBlock(chromeOf(opts))),
  };
}

// ---------------------------------------------------------------------------
// Evergreen kinds
// ---------------------------------------------------------------------------

export function renderTip(entry: TipEntry, opts: RenderOptions): Rendered | null {
  if (!entry.body.length) return null;
  return {
    key: entry.key,
    html: block(
      `💡 <b>${esc(entry.title)}</b>`,
      entry.body.map((p) => esc(p)).join("\n\n"),
      siteButtonLine(opts, "/scholarships", "Imkoniyatlarni ko'rish")
    ),
  };
}

export function renderChecklist(entry: ChecklistEntry, opts: RenderOptions): Rendered | null {
  if (entry.items.length < 3) return null;
  return {
    key: entry.key,
    html: block(
      `✅ <b>${esc(entry.title)}</b>`,
      entry.items.map((item) => `☐ ${esc(item)}`).join("\n"),
      siteButtonLine(opts, "/scholarships", "Imkoniyatlarni ko'rish")
    ),
  };
}

export function renderQa(entry: QaEntry, variant: number, opts: RenderOptions): Rendered | null {
  if (!entry.question.trim() || !entry.answer.trim()) return null;
  const v = ((variant % 3) + 3) % 3;
  const discuss = opts.discussionUrl
    ? `💬 Savolingiz bo'lsa, izohlarda yozib qoldiring: <a href="${esc(opts.discussionUrl)}">muhokama</a>`
    : null;
  if (v === 0) {
    return {
      key: "qa_v1",
      html: block(`❓ <b>${esc(entry.question)}</b>`, esc(entry.answer), discuss),
    };
  }
  if (v === 1) {
    return {
      key: "qa_v2",
      html: block(
        "❔ <b>Savol-javob</b>",
        `<b>Savol:</b> ${esc(entry.question)}`,
        `<b>Javob:</b> ${esc(entry.answer)}`,
        discuss
      ),
    };
  }
  return {
    key: "qa_v3",
    html: block(
      `🤔 <b>${esc(entry.question)}</b>`,
      esc(entry.answer),
      siteButtonLine(opts, "/scholarships", "Imkoniyatlarni ko'rish"),
      discuss
    ),
  };
}

export interface StoryEntry {
  title: string;
  body: string;
  authorLabel?: string | null;
}

/** Only ever called with an approved `channel_stories` row. */
export function renderStory(entry: StoryEntry, variant: number): Rendered | null {
  const body = entry.body.trim();
  if (!body) return null;
  const author = entry.authorLabel?.trim();
  const v = ((variant % 2) + 2) % 2;
  if (v === 0) {
    return {
      key: "story_v1",
      html: block(
        `📖 <b>${esc(entry.title)}</b>`,
        esc(body),
        author ? `— ${esc(author)}` : null
      ),
    };
  }
  return {
    key: "story_v2",
    html: block(
      "📖 <b>Tajriba</b>",
      esc(body),
      author ? `✍️ ${esc(author)}` : null
    ),
  };
}

// ---------------------------------------------------------------------------
// Bank accessors (used by the planner and by the lint test)
// ---------------------------------------------------------------------------

export function tipAtIndex(index: number): TipEntry {
  return pick(TIP_BANK, index);
}

export function checklistAtIndex(index: number): ChecklistEntry {
  return pick(CHECKLIST_BANK, index);
}

export function qaAtIndex(index: number): QaEntry {
  return pick(QA_BANK, index);
}

export { TIP_BANK, CHECKLIST_BANK, QA_BANK };
