/**
 * Formatting helpers for the Uzbek (Latin) channel posts.
 *
 * Two rules:
 *  1. Nothing is transliterated by guesswork. A value we know how to say in
 *     Uzbek is translated from a curated table; anything else is dropped. No
 *     stored English sentence ever reaches a post (docs/CHANNEL.md §4b-3).
 *  2. HTML is escaped here, at the single place text enters a template, so no
 *     template has to remember it.
 */
import { escapeHtml } from "@/lib/telegram/core";
import { resolveCountry } from "../countries";
import { majorListUz } from "./fields.uz";

export const MONTHS_UZ = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avgust",
  "sentabr",
  "oktabr",
  "noyabr",
  "dekabr",
] as const;

/** 0 = Monday … 6 = Sunday, matching the planner. */
export const WEEKDAYS_UZ = [
  "Dushanba",
  "Seshanba",
  "Chorshanba",
  "Payshanba",
  "Juma",
  "Shanba",
  "Yakshanba",
] as const;

function partsOf(day: string | null | undefined): { year: number; month: string; day: number } | null {
  if (!day) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day.slice(0, 10));
  if (!m) return null;
  const month = MONTHS_UZ[Number(m[2]) - 1];
  if (!month) return null;
  const dayNumber = Number(m[3]);
  if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 31) return null;
  return { year: Number(m[1]), month, day: dayNumber };
}

/**
 * `{deadline_text_long}` — "15-dekabr, 2026". Unparseable input → null
 * (the caller drops the line rather than printing a broken date).
 */
export function formatDateUz(day: string | null | undefined): string | null {
  const parts = partsOf(day);
  return parts ? `${parts.day}-${parts.month}, ${parts.year}` : null;
}

/**
 * `{deadline_day_text}` — "25-oktabr Yakshanba". No year: this appears in the
 * weekly list, where the 7-day window makes the year unambiguous.
 */
export function formatDayWithWeekdayUz(day: string | null | undefined): string | null {
  const parts = partsOf(day);
  if (!parts) return null;
  const weekday = WEEKDAYS_UZ[weekdayOfDay(day as string)];
  return weekday ? `${parts.day}-${parts.month} ${weekday}` : null;
}

/** 0 = Monday … 6 = Sunday, computed in UTC on a YYYY-MM-DD plan day. */
function weekdayOfDay(day: string): number {
  const d = new Date(`${day.slice(0, 10)}T00:00:00Z`);
  return (d.getUTCDay() + 6) % 7;
}

/** Human countdown that never overstates the time left. */
export function daysLeftUz(daysLeft: number): string | null {
  if (!Number.isFinite(daysLeft) || daysLeft < 0) return null;
  if (daysLeft === 0) return "bugun oxirgi kun";
  if (daysLeft === 1) return "ertaga oxirgi kun";
  return `${daysLeft} kun qoldi`;
}

/**
 * HTML escaping for Telegram's parser: `&`, `<`, `>` and `"` (the quote only
 * matters inside `href`). Apostrophes are deliberately left alone — Uzbek is
 * full of them, and `&#39;` is not part of Telegram's documented entity set.
 */
export function esc(value: string): string {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

/** Values that come from the database go through here before touching HTML. */
export function escOrNull(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const v = String(value).trim();
  return v ? esc(v) : null;
}

/**
 * `{bullets:field}` — one `➡️` line per array item, HTML-escaped. Empty parts
 * are dropped; an empty list yields `null`, so the caller removes the heading
 * and its blank line together with the field.
 */
export function bullets(items: readonly string[] | null | undefined): string | null {
  const clean = (items ?? []).map((item) => String(item).trim()).filter(Boolean);
  if (!clean.length) return null;
  return clean.map((item) => `➡️ ${esc(item)}`).join("\n");
}

/** `#tag` list, de-duplicated, lower-case, at most `max` entries. */
export function hashtags(tags: readonly (string | null | undefined)[], max = 5): string[] {
  const out: string[] = [];
  for (const raw of tags) {
    const tag = String(raw ?? "")
      .trim()
      .replace(/^#+/, "")
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "");
    if (!tag || out.includes(tag)) continue;
    out.push(tag);
    if (out.length >= max) break;
  }
  return out;
}

/** Join non-empty lines with single newlines — the template blank-line rule. */
export function lines(parts: (string | null | undefined | false)[]): string {
  return parts
    .filter((p): p is string => typeof p === "string" && p.trim() !== "")
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Coverage labels we can say in Uzbek. Anything not listed is dropped.
 *
 * The list must cover every value the live `coverage_type` column actually
 * holds: a missing entry does not print English, it prints **nothing**, so the
 * `Moliyalashtirish:` line silently disappears from the post. The four values
 * added below (`Full Tuition Waiver`, `Tuition Credit`, `Full Ride`,
 * `Living-expenses grant`, …) were exactly that hole — 23 active awards had no
 * funding line at all.
 */
const COVERAGE_UZ: Record<string, string> = {
  "full funding": "to'liq moliyalashtirish",
  "full scholarship": "to'liq grant",
  "full ride": "to'liq moliyalashtirish (barcha xarajatlar)",
  "full tuition": "to'liq o'qish kontrakti",
  "full tuition + stipend": "to'liq kontrakt va stipendiya",
  "full tuition waiver": "kontraktdan to'liq ozod qilish",
  "tuition waiver": "kontraktdan ozod qilish",
  "tuition credit": "kontrakt hisobiga kredit",
  "fee waiver": "to'lovdan ozod qilish",
  "registration fee waiver": "ro'yxatdan o'tish to'lovidan ozod qilish",
  "partial funding": "qisman moliyalashtirish",
  "partial scholarship": "qisman grant",
  "partial tuition": "kontraktning bir qismi",
  "partial (monthly stipend)": "oylik stipendiya",
  "living stipend": "yashash uchun stipendiya",
  "living-expenses grant": "yashash xarajatlari uchun grant",
  "stipend": "stipendiya",
  "stipend only": "faqat stipendiya",
  "accommodation": "turar joy",
  "travel grant": "yo'l xarajatlari granti",
  "research grant": "tadqiqot granti",
};

export function coverageUz(raw: string | null | undefined): string | null {
  const key = (raw ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!key || key === "unspecified") return null;
  return COVERAGE_UZ[key] ?? null;
}

const DEGREE_UZ: Record<string, string> = {
  bachelor: "bakalavr",
  "bachelor's": "bakalavr",
  bachelors: "bakalavr",
  undergraduate: "bakalavr",
  master: "magistratura",
  "master's": "magistratura",
  masters: "magistratura",
  postgraduate: "magistratura",
  phd: "doktorantura (PhD)",
  doctorate: "doktorantura (PhD)",
  doctoral: "doktorantura (PhD)",
};

function parseList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((v) => String(v).trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

/** ["Bachelor's"] → "bakalavr"; unknown labels are dropped, not guessed. */
export function degreesUz(raw: string | null | undefined): string | null {
  const mapped = parseList(raw)
    .map((d) => DEGREE_UZ[d.toLowerCase()] ?? null)
    .filter((d): d is string => d !== null);
  const unique = [...new Set(mapped)];
  return unique.length ? unique.join(", ") : null;
}

/**
 * `eligible_majors` → Uzbek.
 *
 * The column used to fall through to the stored English ("Computer Science",
 * "Mechanical Engineering") or, worse, an entire English sentence. It is now
 * translated by the curated field list in `fields.uz.ts`: a known name becomes
 * one Uzbek phrase, anything unknown is dropped rather than printed.
 */
export function majorsUz(raw: string | null | undefined): string | null {
  return majorListUz(raw);
}

/**
 * Country names we say in Uzbek. Everything else keeps the stored name —
 * that is data, not a guess, and it is never transliterated automatically.
 */
const COUNTRY_UZ: Record<string, string> = {
  "united states": "AQSh",
  "united states of america": "AQSh",
  usa: "AQSh",
  "united kingdom": "Buyuk Britaniya",
  uk: "Buyuk Britaniya",
  england: "Buyuk Britaniya",
  canada: "Kanada",
  germany: "Germaniya",
  france: "Fransiya",
  italy: "Italiya",
  spain: "Ispaniya",
  netherlands: "Niderlandiya",
  "the netherlands": "Niderlandiya",
  sweden: "Shvetsiya",
  norway: "Norvegiya",
  denmark: "Daniya",
  finland: "Finlandiya",
  switzerland: "Shveytsariya",
  austria: "Avstriya",
  belgium: "Belgiya",
  ireland: "Irlandiya",
  poland: "Polsha",
  czechia: "Chexiya",
  "czech republic": "Chexiya",
  hungary: "Vengriya",
  portugal: "Portugaliya",
  greece: "Gretsiya",
  turkey: "Turkiya",
  türkiye: "Turkiya",
  japan: "Yaponiya",
  "south korea": "Janubiy Koreya",
  korea: "Koreya",
  china: "Xitoy",
  "china (mainland)": "Xitoy",
  "hong kong": "Gonkong",
  singapore: "Singapur",
  malaysia: "Malayziya",
  india: "Hindiston",
  australia: "Avstraliya",
  "new zealand": "Yangi Zelandiya",
  uae: "Birlashgan Arab Amirliklari",
  "united arab emirates": "Birlashgan Arab Amirliklari",
  qatar: "Qatar",
  "saudi arabia": "Saudiya Arabistoni",
  israel: "Isroil",
  russia: "Rossiya",
  uzbekistan: "O'zbekiston",
  kazakhstan: "Qozog'iston",
  "south africa": "Janubiy Afrika",
  brazil: "Braziliya",
  mexico: "Meksika",
  global: "Xalqaro",
  worldwide: "Xalqaro",
};

/**
 * True when `text` *is* a country name, in either language.
 *
 * Requirement prose is full of country names ("a New Zealand citizen"), and the
 * dictionary happily translates them, so the term scanner turned "New Zealand"
 * into a `Kimlar uchun` bullet — a place is not a requirement, and the country
 * is already printed in the header. Used to refuse such a chip.
 */
export function isCountryName(text: string | null | undefined): boolean {
  const key = (text ?? "").trim().toLowerCase();
  if (!key) return false;
  if (key in COUNTRY_UZ) return true;
  return Object.values(COUNTRY_UZ).some((name) => name.toLowerCase() === key);
}

/**
 * Stored country → the Uzbek name a post prints.
 *
 * `channel_countries` is the single source of truth: the same row that supplies
 * the flag and the locative form supplies the name, so an award cannot be
 * flagged in one line and named differently in the next. `COUNTRY_UZ` stays as
 * a last resort for a handful of values the table does not carry (`Global`,
 * `Israel`, …); an unknown country keeps its stored spelling rather than being
 * transliterated by guesswork.
 */
export function countryUz(raw: string | null | undefined): string | null {
  const name = (raw ?? "").trim();
  if (!name) return null;
  const mapped = resolveCountry(name)?.nameUz ?? COUNTRY_UZ[name.toLowerCase()];
  return esc(mapped ?? name);
}

/** Only https links are ever put into a post. */
export function safeHttpsUrl(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim();
  if (!v) return null;
  try {
    const url = new URL(v);
    if (url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** "🇨🇦 Kanada" line, or null when the country is unknown. */
export function countryLine(raw: string | null | undefined): string | null {
  const label = countryUz(raw);
  return label ? `📍 ${label}` : null;
}
