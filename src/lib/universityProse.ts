/**
 * University descriptions: the two shapes the live catalogue actually stores.
 *
 * 356 universities each carry a description, and **348 of them are machine
 * generated from the same two sentences** (measured 2026-10-30):
 *
 *   194 ×  "<Name> is a premier global research university in <City>, <Country>
 *           (QS World Ranking #<N>), renowned for academic excellence,
 *           cutting-edge laboratories, and international career outcomes."
 *   154 ×  "<Name> is a <public|private> university in <City>, <Country>
 *           (founded <Y>). Annual tuition for international students is about
 *           $<T> and estimated living costs are $<L> per year (accommodation
 *           about $<A>). Headline funding: <F>. Graduates can stay up to <V>
 *           year(s) on a post-study work visa. Listed in the 13-country Top-10
 *           guide for applicants from Uzbekistan (<Country> #<N>)."
 *
 * The localizer's existing template (`UNI_TEMPLATE_1`) was written for a third
 * shape — "ranked in the top N" / "consistently ranked among the world's top N"
 * — which no longer occurs, so it matched nothing and every uz/ru university
 * page showed this English paragraph raw.
 *
 * These templates read the structured facts back out, in the reader's language.
 * The rule from Phase T holds: **clean or verbatim**. If any segment cannot be
 * rendered faithfully (a funding headline naming a scheme in English, an
 * unforeseen wording), the whole description stays in its source language and
 * the page labels it, rather than printing a half-Uzbek sentence.
 */
import type { Locale } from "@/i18n/config";
import { localizeCity, localizeCountry, localizeUniversityType } from "@/lib/catalogLocalizer";

export interface NarrativeResult {
  /** The text to render. */
  text: string;
  /** True when `text` is the source string, unchanged. */
  verbatim: boolean;
}

/** Money as the catalogue stores it: "$24000", "$6000", "$0.5". */
function money(raw: string): string {
  const value = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(value)) return `$${raw}`;
  const rounded = Math.round(value);
  const formatted = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(rounded);
  return `$${formatted}`;
}

/** QS rank "#1" → "1". */
function rankNumber(raw: string): string {
  return raw.replace(/[^\d]/g, "");
}

const PREMIER = /^(.+?) is a premier global research university in (.+), (.+?) \(QS World Ranking #(\d+)\), renowned for academic excellence, cutting-edge laboratories, and international career outcomes\.$/;

/**
 * The second shape is assembled from sentences, and the live rows disagree on
 * which ones are present (measured 2026-10-30, active universities):
 *
 *   46 ×  "… in <City>, <Country> (founded Y). Annual tuition for international
 *          students is about $T and estimated living costs are $L per year
 *          (accommodation about $A). Headline funding: <F>. Graduates can stay
 *          up to V year(s) on a post-study work visa. Listed in the 13-country
 *          Top-10 guide for applicants from Uzbekistan (<Country> #N)."
 *   91 ×  same, public, no funding sentence, no founded year
 *   17 ×  same as above, private
 *
 * So the paragraph is parsed sentence by sentence instead of matched whole,
 * and any sentence the parser does not recognise makes the whole description
 * verbatim.
 */
interface PlainParts {
  name: string;
  kind: string;
  location: string;
  founded?: string;
  tuition: string;
  living: string;
  accommodation?: string;
  /** True when the source said "for international students". */
  tuitionForIntl: boolean;
  funding?: string;
  visaYears?: string;
  guideCountry?: string;
  guideRank?: string;
}

function parsePlain(text: string): PlainParts | null {
  let rest = text.trim();
  const head = rest.match(
    /^(.+?) is a (public|private) university in (.+?)(?: \(founded (\d{4})\))?\.(?=\s|$)/
  );
  if (!head) return null;
  rest = rest.slice(head[0].length).trim();

  const costs = rest.match(
    /^Annual tuition( for international students)? is about \$([\d,.]+) and estimated living costs are \$([\d,.]+) per year(?: \(accommodation about \$([\d,.]+)\))?\.(?=\s|$)/
  );
  if (!costs) return null;
  rest = rest.slice(costs[0].length).trim();

  const parts: PlainParts = {
    name: head[1],
    kind: head[2],
    location: head[3],
    founded: head[4],
    tuition: costs[2],
    living: costs[3],
    accommodation: costs[4],
    tuitionForIntl: Boolean(costs[1]),
  };

  // Each of the remaining sentences is optional, but must appear in order and
  // must be consumed exactly — no leftover text is ever ignored.
  const funding = rest.match(/^Headline funding: (.+?)\.(?=\s*(?:Graduates|$))/);
  if (funding) {
    parts.funding = funding[1];
    rest = rest.slice(funding[0].length).trim();
  }
  const visa = rest.match(/^Graduates can stay up to ([\d.]+) year\(s\) on a post-study work visa\.(?=\s|$)/);
  if (visa) {
    parts.visaYears = visa[1];
    rest = rest.slice(visa[0].length).trim();
  }
  const guide = rest.match(
    /^Listed in the 13-country Top-10 guide for applicants from Uzbekistan \((.+?) #(\d+)\)\.(?=\s|$)/
  );
  if (guide) {
    parts.guideCountry = guide[1];
    parts.guideRank = guide[2];
    rest = rest.slice(guide[0].length).trim();
  }
  return rest === "" ? parts : null;
}

/** "Cambridge, MA, United States" → city "Cambridge, MA", country "United States". */
function splitLocation(location: string): { city: string; country: string } {
  const parts = location.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length === 1) return { city: parts[0], country: "" };
  return { city: parts.slice(0, -1).join(", "), country: parts[parts.length - 1] };
}

/**
 * The funding headline is "<scheme names> — <what it pays>". The scheme names
 * are proper nouns and stay exactly as stored; the payment side comes from a
 * closed vocabulary because it is generated copy, not free text ("Full Ride
 * (100% Tuition + Dorm + Monthly Stipend + Insurance)").
 *
 * Multi-word phrases are mapped before single words — "Full Tuition Waiver" is
 * "to'liq kontraktdan ozod qilish", not "to'liq kontrakt imtiyozi" — and any
 * word outside this vocabulary makes the segment unrenderable. The caller then
 * keeps the whole description in its source language: clean or verbatim, never
 * a sentence that is half one language and half the other.
 */
type Term = { uz: string; ru: string };

const FUNDING_PHRASES: Array<[RegExp, Term]> = [
  [/full tuition waiver/gi, { uz: "to'liq kontraktdan ozod qilish", ru: "полное освобождение от оплаты обучения" }],
  [/tuition fee waiver/gi, { uz: "kontrakt to'lovidan ozod qilish", ru: "освобождение от оплаты обучения" }],
  [/tuition waiver/gi, { uz: "kontraktdan ozod qilish", ru: "освобождение от оплаты обучения" }],
  [/tuition fee deduction/gi, { uz: "kontrakt to'lovidan chegirma", ru: "скидка на оплату обучения" }],
  [/full tuition/gi, { uz: "to'liq kontrakt", ru: "полная оплата обучения" }],
  [/full ride/gi, { uz: "to'liq qoplov", ru: "полное покрытие" }],
  [/free dormitory/gi, { uz: "bepul yotoqxona", ru: "бесплатное общежитие" }],
  [/free dorm/gi, { uz: "bepul yotoqxona", ru: "бесплатное общежитие" }],
  [/free housing/gi, { uz: "bepul turar joy", ru: "бесплатное жильё" }],
  [/free canteen/gi, { uz: "bepul oshxona", ru: "бесплатная столовая" }],
  [/monthly high-grade stipend/gi, { uz: "oylik yuqori baholi stipendiya", ru: "ежемесячная стипендия за высокие оценки" }],
  [/monthly stipend/gi, { uz: "oylik stipendiya", ru: "ежемесячная стипендия" }],
  [/academic stipend/gi, { uz: "akademik stipendiya", ru: "академическая стипендия" }],
  [/budget place/gi, { uz: "byudjet o'rni", ru: "бюджетное место" }],
  [/budget\/grant/gi, { uz: "byudjet yoki grant", ru: "бюджет или грант" }],
  [/top gpa students/gi, { uz: "yuqori GPA talabalari", ru: "студенты с высоким GPA" }],
  [/best-student discount/gi, { uz: "eng yaxshi talaba chegirmasi", ru: "скидка лучшему студенту" }],
  [/merit discount/gi, { uz: "yutuqlar uchun chegirma", ru: "скидка за успехи" }],
  [/guaranteed dorm/gi, { uz: "kafolatlangan yotoqxona", ru: "гарантированное общежитие" }],
  [/primary medical ins\.?/gi, { uz: "asosiy tibbiy sug'urta", ru: "основная медстраховка" }],
  [/dormitory waiver|dorm waiver/gi, { uz: "bepul yotoqxona", ru: "бесплатное общежитие" }],
  [/top-applicant bsc waiver/gi, { uz: "eng yaxshi abituriyent uchun BSc kontraktdan ozod qilish", ru: "освобождение от оплаты BSc для лучшего абитуриента" }],
  [/1-yr turkish course/gi, { uz: "1 yillik turk tili kursi", ru: "1-летний курс турецкого языка" }],
  [/top entrance/gi, { uz: "yuqori kirish balli", ru: "высокий вступительный балл" }],
];

/**
 * Degree and currency abbreviations read the same in all three languages, so
 * they pass through instead of forcing the whole paragraph back to English.
 */
const FUNDING_KEEP = new Set([
  "msc", "bsc", "phd", "mba", "bsc", "gpa", "topik", "gks", "huf", "pln", "eur", "usd", "gbp",
  "chf", "rmb", "krw", "jpy", "rf", "nu", "eu", "uk", "us",
]);

const FUNDING_WORDS: Record<string, Term> = {
  full: { uz: "to'liq", ru: "полная" },
  partial: { uz: "qisman", ru: "частичная" },
  tuition: { uz: "kontrakt", ru: "обучение" },
  waiver: { uz: "ozod qilish", ru: "освобождение" },
  dorm: { uz: "yotoqxona", ru: "общежитие" },
  dormitory: { uz: "yotoqxona", ru: "общежитие" },
  housing: { uz: "turar joy", ru: "жильё" },
  meals: { uz: "ovqat", ru: "питание" },
  stipend: { uz: "stipendiya", ru: "стипендия" },
  insurance: { uz: "sug'urta", ru: "страховка" },
  flight: { uz: "aviabilet", ru: "авиабилет" },
  scholarship: { uz: "stipendiya", ru: "стипендия" },
  discount: { uz: "chegirma", ru: "скидка" },
  deduction: { uz: "chegirma", ru: "скидка" },
  grant: { uz: "grant", ru: "грант" },
  grants: { uz: "grantlar", ru: "гранты" },
  award: { uz: "mukofot", ru: "награда" },
  course: { uz: "kurs", ru: "курс" },
  students: { uz: "talabalari", ru: "студенты" },
  entrance: { uz: "kirish balli", ru: "вступительный балл" },
  monthly: { uz: "oylik", ru: "ежемесячная" },
  or: { uz: "yoki", ru: "или" },
  and: { uz: "va", ru: "и" },
  to: { uz: "–", ru: "–" },
  via: { uz: "orqali", ru: "через" },
  for: { uz: "uchun", ru: "для" },
  of: { uz: "", ru: "" },
  the: { uz: "", ru: "" },
  a: { uz: "", ru: "" },
  yr: { uz: "yiliga", ru: "в год" },
  y: { uz: "yil", ru: "год" },
  mo: { uz: "oyiga", ru: "в месяц" },
  k: { uz: "ming", ru: "тыс." },
};


function fundingTerms(raw: string, tl: "uz" | "ru"): string | null {
  const parts = raw.split(/\s+—\s+/);
  const terms = (parts.length > 1 ? parts[parts.length - 1] : "").trim();
  if (!terms) return null;

  // Phrase pass: swap each known phrase for a placeholder that survives the
  // word pass, so compounds are not translated word by word.
  const phrases: Term[] = [];
  let working = ` ${terms} `;
  for (const [pattern, term] of FUNDING_PHRASES) {
    if (!pattern.test(working)) continue;
    working = working.replace(pattern, () => `__p${phrases.push(term) - 1}__`);
  }

  // `\p{L}` so a word like "Türkiye" stays one token instead of being cut at
  // the first non-ASCII letter and read as an unknown "T".
  const tokens = working.match(/__p\d+__|[\p{L}][\p{L}'-]*|\d+(?:[.,]\d+)?%?|[()+/:,–—-]/gu);
  if (!tokens || tokens.length === 0) return null;
  const out: string[] = [];
  for (const token of tokens) {
    const placeholder = /^__p(\d+)__$/.exec(token);
    if (placeholder) {
      out.push(phrases[Number(placeholder[1])][tl]);
      continue;
    }
    // Numbers, percentages, parentheses and "+" carry over unchanged.
    if (!/^\p{L}/u.test(token)) {
      out.push(token);
      continue;
    }
    const hit = FUNDING_WORDS[token.toLowerCase()];
    if (hit) {
      if (hit[tl]) out.push(hit[tl]);
      continue;
    }
    // A word carrying diacritics is a foreign proper noun ("Türkiye",
    // "İTÜ"), and an abbreviation from the keep-list reads the same anywhere.
    if (/[^\x00-\x7F]/.test(token) || FUNDING_KEEP.has(token.toLowerCase())) {
      out.push(token);
      continue;
    }
    return null; // an unknown word: keep the source sentence
  }
  const joined = out
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(/\s+([),/])/g, "$1")
    .replace(/\(\s+/g, "(")
    .replace(/\s+([:–—-])/g, " $1")
    .trim();
  return joined || null;
}

/**
 * The stored description and the ranking chip were both generated from a
 * pre-correction rank sequence, and the catalogue then corrected its ranks to
 * the official QS 2026 edition (docs/QS2026_RANK_VERIFICATION_2026-10-23.md):
 * measured 2026-10-30, **178 of the 194** universities that state a QS position
 * in their prose state a different number from `universities.world_ranking` —
 * off by 601 places for the University of Latvia (prose #200, QS 2026 801).
 *
 * Phase X made both sentences readable in Uzbek and Russian, so the profile now
 * printed two contradictory QS ranks in the reader's own language. The stored
 * sentence keeps its shape; only the figure is brought up to the catalogue's
 * verified one. A row with no verified rank keeps its prose untouched — the
 * number is never invented, and a non-QS "#' is never rewritten.
 */
export function reconcileEmbeddedRank(text: string, rank: number | null | undefined): string {
  if (!text) return text;
  if (rank == null || !Number.isFinite(rank) || rank <= 0) return text;
  return text.replace(/(QS World(?: University)? Rankings? #)(\d+)/g, (whole, prefix: string, digits: string) =>
    digits === String(rank) ? whole : `${prefix}${rank}`
  );
}

/**
 * Render a stored university description in `locale`, or say it could not be
 * rendered. `en` is handled by the caller (it is the source language).
 */
export function localizeUniversityNarrative(text: string, locale: Locale): NarrativeResult {
  const verbatim: NarrativeResult = { text, verbatim: true };
  if (locale === "en") return { text, verbatim: false };
  const tl: "uz" | "ru" = locale === "ru" ? "ru" : "uz";
  const trimmed = text.trim();

  const premier = trimmed.match(PREMIER);
  if (premier) {
    const [, name, cityRaw, countryRaw, rank] = premier;
    const city = localizeCity(cityRaw, locale) || cityRaw;
    const country = localizeCountry(countryRaw, locale) || countryRaw;
    const n = rankNumber(rank);
    return {
      text:
        tl === "uz"
          ? `${name} — ${country}ning ${city} shahridagi jahon miqyosidagi yetakchi tadqiqot universiteti. QS jahon reytingida ${n}-o'rin; akademik mukammallik, zamonaviy laboratoriyalar va xalqaro karyera imkoniyatlari bilan tanilgan.`
          : `${name} — ведущий исследовательский университет мирового уровня в городе ${city}, ${country}. В мировом рейтинге QS занимает ${n}-е место; известен академическим превосходством, современными лабораториями и международными карьерными возможностями.`,
      verbatim: false,
    };
  }

  const plain = parsePlain(trimmed);
  if (!plain) return verbatim;
  const { city: cityRaw, country: countryRaw } = splitLocation(plain.location);
  const city = localizeCity(cityRaw, locale) || cityRaw;
  const country = localizeCountry(countryRaw, locale) || countryRaw;
  const type = localizeUniversityType(plain.kind, locale) || plain.kind;
  // The funding headline is the one segment that can genuinely resist
  // translation; when it does, the whole description stays in its source
  // language (clean or verbatim) instead of shipping a half-translated sentence.
  const terms = plain.funding ? fundingTerms(plain.funding, tl) : "";
  if (terms === null) return verbatim;
  const scheme = plain.funding ? plain.funding.split(/\s+—\s+/)[0] : "";
  // "Macau, Macau SAR" / "Singapore, Singapore": naming the country again in
  // the same sentence reads as a stutter, so the city carries it alone.
  const samePlace = city !== "" && country.toLowerCase().startsWith(city.toLowerCase());
  const guideCountry = plain.guideCountry
    ? localizeCountry(plain.guideCountry, locale) || plain.guideCountry
    : "";

  if (tl === "ru") {
    const head = `${plain.name} — ${type.toLowerCase()} университет в городе ${city}${country && !samePlace ? `, ${country}` : ""}${plain.founded ? ` (основан в ${plain.founded} г.)` : ""}.`;
    const costs = `${plain.tuitionForIntl ? "Стоимость обучения для иностранных студентов" : "Стоимость обучения"} — около ${money(plain.tuition)} в год, расходы на проживание — ${money(plain.living)} в год${plain.accommodation ? ` (жильё около ${money(plain.accommodation)})` : ""}.`;
    const fundingLine = terms ? ` Финансирование: ${scheme} — ${terms}.` : "";
    const visa = plain.visaYears ? ` После выпуска можно остаться до ${plain.visaYears} г. по визе для работы после учёбы.` : "";
    const guide = plain.guideRank ? ` Включён в справочник Top-10 по 13 странам для абитуриентов из Узбекистана (${guideCountry} #${plain.guideRank}).` : "";
    return { text: `${head} ${costs}${fundingLine}${visa}${guide}`, verbatim: false };
  }

  const head = `${plain.name} — ${country && !samePlace ? `${country}ning ` : ""}${city} shahridagi ${type.toLowerCase()} universitet${plain.founded ? ` (${plain.founded}-yilda tashkil etilgan)` : ""}.`;
  const costs = `${plain.tuitionForIntl ? "Xalqaro talabalar uchun yillik kontrakt" : "Yillik kontrakt"} taxminan ${money(plain.tuition)}, yashash xarajatlari yiliga ${money(plain.living)}${plain.accommodation ? ` (turar joy taxminan ${money(plain.accommodation)})` : ""}.`;
  const fundingLine = terms ? ` Moliyalashtirish: ${scheme} — ${terms}.` : "";
  const visa = plain.visaYears ? ` Bitiruvchilar o'qishdan keyin ishlash vizasi bo'yicha ${plain.visaYears} yilgacha qolishi mumkin.` : "";
  const guide = plain.guideRank ? ` O'zbekistonlik abituriyentlar uchun 13 davlat bo'yicha Top-10 qo'llanmasiga kiritilgan (${guideCountry} #${plain.guideRank}).` : "";
  return { text: `${head} ${costs}${fundingLine}${visa}${guide}`, verbatim: false };
}
