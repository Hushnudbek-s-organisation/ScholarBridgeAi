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
import { esc, formatDateUz, daysLeftUz } from "./format";
import type { Kind, PostChrome, Rendered } from "./chrome";
import { ctaLine, footerLine } from "./chrome";
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

function requirementsPlain(f: Facts): string | null {
  const parts: string[] = [];
  if (f.minGpa !== null) parts.push(`GPA ${f.minGpa}+`);
  if (f.minIelts !== null) parts.push(`IELTS ${f.minIelts}+`);
  return parts.length ? parts.join(" · ") : null;
}

function requirementsLine(f: Facts): string | null {
  const plain = requirementsPlain(f);
  return plain ? `📊 Minimal talab: ${plain}` : null;
}

function audiencePlain(f: Facts): string | null {
  const parts = [f.degrees, f.majors].filter((p): p is string => Boolean(p));
  return parts.length ? parts.join(" · ") : null;
}

function audienceLine(f: Facts): string | null {
  const plain = audiencePlain(f);
  return plain ? `🎓 Kim uchun: ${plain}` : null;
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

export function renderScholarshipSingle(f: Facts, variant = 0, chrome: PostChrome | null = null): Rendered | null {
  const v = ((variant % 3) + 3) % 3;
  const link = ctaBlock(f, chrome);
  if (v === 0) {
    return {
      key: "single_v1",
      html: block(
        row(`🎓 <b>${clipHtml(f.title, 120)}</b>`, `🏛 ${f.provider}`, f.country ? `📍 ${f.country}` : null),
        row(fundingLine(f), deadlineLine(f), requirementsLine(f), eligibilityLine(f)),
        row(audienceLine(f), link, providerLink(f)),
        footerBlock(chrome)
      ),
    };
  }
  if (v === 1) {
    return {
      key: "single_v2",
      html: block(
        `🎓 <b>${clipHtml(f.title, 120)}</b>`,
        `🏛 ${f.provider}${f.country ? ` · ${f.country}` : ""}`,
        row(fundingLine(f), deadlineLine(f)),
        row(requirementsLine(f), audienceLine(f), eligibilityLine(f)),
        "ℹ️ Ariza yuborishdan oldin talablarni rasmiy sahifada tekshiring.",
        row(link, providerLink(f)),
        footerBlock(chrome)
      ),
    };
  }
  const bullets = row(
    `• Tashkilot: ${f.provider}`,
    f.country ? `• Davlat: ${f.country}` : null,
    fundingPlain(f) ? `• Moliyalashtirish: ${cap(fundingPlain(f) as string)}` : null,
    deadlinePlain(f) ? `• Muddat: ${cap(deadlinePlain(f) as string)}` : null,
    requirementsPlain(f) ? `• Talab: ${requirementsPlain(f)}` : null,
    audiencePlain(f) ? `• Kim uchun: ${audiencePlain(f)}` : null
  );
  return {
    key: "single_v3",
    html: block(
      `📌 <b>${clipHtml(f.title, 120)}</b>`,
      bullets,
      row(eligibilityLine(f), link, providerLink(f)),
      footerBlock(chrome)
    ),
  };
}

export function renderFullyFunded(f: Facts, variant = 0, chrome: PostChrome | null = null): Rendered | null {
  if (!f.fullyFunded) return null;
  const v = ((variant % 3) + 3) % 3;
  const link = ctaBlock(f, chrome);
  if (v === 0) {
    return {
      key: "ff_v1",
      html: block(
        `💰 <b>${clipHtml(f.title, 120)}</b> — to'liq moliyalashtirish`,
        `🏛 ${f.provider}${f.country ? ` · ${f.country}` : ""}`,
        row(deadlineLine(f), requirementsLine(f), eligibilityLine(f)),
        row(audienceLine(f), link, providerLink(f)),
        "Shartlar va qamrovni rasmiy e'londa tasdiqlang.",
        footerBlock(chrome)
      ),
    };
  }
  if (v === 1) {
    return {
      key: "ff_v2",
      html: block(
        `💰 <b>${clipHtml(f.title, 120)}</b>`,
        row(
          `🏛 ${f.provider}`,
          f.country ? `📍 ${f.country}` : null,
          f.coverage ? `💳 E'londagi qamrov: ${cap(f.coverage)}` : null,
          deadlineLine(f)
        ),
        "Bu e'londa moliyalashtirish to'liq deb ko'rsatilgan — kontrakt to'liq qoplanadi.",
        row(requirementsLine(f), audienceLine(f), eligibilityLine(f)),
        row(link, providerLink(f)),
        footerBlock(chrome)
      ),
    };
  }
  return {
    key: "ff_v3",
    html: block(
      `💸 To'liq moliyalashtirish`,
      `🎓 <b>${clipHtml(f.title, 120)}</b>`,
      row(
        `• Tashkilot: ${f.provider}`,
        f.country ? `• Davlat: ${f.country}` : null,
        deadlinePlain(f) ? `• Muddat: ${cap(deadlinePlain(f) as string)}` : null,
        requirementsPlain(f) ? `• Talab: ${requirementsPlain(f)}` : null
      ),
      row(eligibilityLine(f), link, providerLink(f)),
      "To'liq moliyalashtirish qamrovi har bir dasturda farq qiladi — rasmiy e'lonni o'qing.",
      footerBlock(chrome)
    ),
  };
}

/**
 * Urgency post. Never produced for estimated/evergreen deadlines, and the
 * word "shoshiling" appears only when a day or less is actually left.
 */
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
        row(fundingLine(f), requirementsLine(f), audienceLine(f), eligibilityLine(f)),
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
        row(fundingLine(f), requirementsLine(f), eligibilityLine(f)),
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
          fundingPlain(f) ? `• Moliyalashtirish: ${cap(fundingPlain(f) as string)}` : null
        ),
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
      row(fundingLine(f), requirementsLine(f)),
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
