/**
 * Why an opportunity was recommended, in the reader's language.
 *
 * `scoreOpportunity()` has always produced its reasons and flags as finished
 * English sentences — `"deadline has passed"`, `"limited to Germany"`,
 * `"listed fields: Biology — outside your major"` — and `OpportunitiesPanel`
 * printed them verbatim on an Uzbek or Russian page. The rest of the product
 * was made trilingual in Phase T; this catalogue kept speaking English inside
 * its own recommendation list.
 *
 * The sentence cannot be translated after the fact without parsing it, so the
 * engine now also emits the *code and its parameters*, and this module renders
 * that in uz / ru / en. The English strings stay exactly as they were: they are
 * the API's existing contract and other consumers read them.
 */
import type { Locale } from "@/i18n/config";
/** Every locale the app ships — English included: it is an answer, not a fallback. */
type NoteLocale = "uz" | "ru" | "en";

/** Every note the scorer can emit. Adding one here is the only way to add one. */
export type OpportunityNoteCode =
  | "field_all"
  | "field_match"
  | "field_outside"
  | "field_unknown"
  | "country_all"
  | "country_home"
  | "country_limited"
  | "level_mismatch"
  | "deadline_recurring"
  | "deadline_invalid"
  | "deadline_passed"
  | "deadline_set";

/** A reason (positive) or a flag (caution), with the values it needs. */
export interface OpportunityNote {
  kind: "reason" | "flag";
  code: OpportunityNoteCode;
  params?: Record<string, string>;
}

type Templates = Record<OpportunityNoteCode, (p: Record<string, string>) => string>;

const EN: Templates = {
  field_all: () => "open to all fields",
  field_match: (p) => `field match: ${p.major ?? ""}`,
  field_outside: (p) => `listed fields: ${p.fields ?? ""} — outside your major`,
  field_unknown: () => "your major is not set in the profile",
  country_all: () => "international — open to all countries",
  country_home: (p) => `home country: ${p.country ?? ""}`,
  country_limited: (p) => `limited to ${p.country ?? ""}`,
  level_mismatch: (p) =>
    `aimed at ${p.wanted ?? ""} level, you are ${p.actual ?? "level unknown"}`,
  deadline_recurring: () => "recurring or date not published — check the official page",
  deadline_invalid: () => "deadline date is not valid — check the official page",
  deadline_passed: () => "deadline has passed",
  deadline_set: (p) => `deadline ${p.date ?? ""}`,
};

const UZ: Templates = {
  field_all: () => "barcha yo'nalishlar uchun ochiq",
  field_match: (p) => `yo'nalishingiz: ${p.major ?? ""}`,
  field_outside: (p) => `e'lon qilingan yo'nalishlar: ${p.fields ?? ""} — sizning yo'nalishingizdan tashqarida`,
  field_unknown: () => "profilingizda yo'nalish ko'rsatilmagan",
  country_all: () => "xalqaro — barcha davlatlar uchun ochiq",
  country_home: (p) => `o'z davlatingiz: ${p.country ?? ""}`,
  country_limited: (p) => `faqat ${p.country ?? ""} uchun`,
  level_mismatch: (p) => `mo'ljallangan bosqich: ${p.wanted ?? ""}, sizning bosqichingiz: ${p.actual ?? "ko'rsatilmagan"}`,
  deadline_recurring: () => "doimiy qabul yoki sana e'lon qilinmagan — rasmiy sahifani tekshiring",
  deadline_invalid: () => "muddat sanasi noto'g'ri — rasmiy sahifani tekshiring",
  deadline_passed: () => "muddat o'tgan",
  deadline_set: (p) => `muddat: ${p.date ?? ""}`,
};

const RU: Templates = {
  field_all: () => "открыто для всех направлений",
  field_match: (p) => `ваше направление: ${p.major ?? ""}`,
  field_outside: (p) => `указанные направления: ${p.fields ?? ""} — вне вашего направления`,
  field_unknown: () => "в профиле не указано направление",
  country_all: () => "международное — открыто для всех стран",
  country_home: (p) => `ваша страна: ${p.country ?? ""}`,
  country_limited: (p) => `только для ${p.country ?? ""}`,
  level_mismatch: (p) => `целевой уровень: ${p.wanted ?? ""}, ваш уровень: ${p.actual ?? "не указан"}`,
  deadline_recurring: () => "постоянный приём или дата не объявлена — проверьте официальную страницу",
  deadline_invalid: () => "некорректная дата — проверьте официальную страницу",
  deadline_passed: () => "срок истёк",
  deadline_set: (p) => `срок: ${p.date ?? ""}`,
};

const TABLES: Record<NoteLocale, Templates> = { uz: UZ, ru: RU, en: EN };

/**
 * Render one note. `locale` accepts the app's full `Locale` ("en" included):
 * English is a first-class answer here, not a fallback.
 */
export function renderOpportunityNote(note: OpportunityNote, locale: Locale): string {
  const table = TABLES[(locale === "ru" ? "ru" : locale === "en" ? "en" : "uz") as NoteLocale];
  const template = table[note.code];
  if (!template) return ""; // an unknown code is dropped, never guessed
  return template(note.params ?? {});
}

/** The notes of one kind, rendered, in the order the scorer produced them. */
export function renderOpportunityNotes(
  notes: readonly OpportunityNote[] | null | undefined,
  locale: Locale,
  kind: "reason" | "flag"
): string[] {
  if (!notes) return [];
  return notes.filter((n) => n.kind === kind).map((n) => renderOpportunityNote(n, locale)).filter(Boolean);
}

/** Does this set of notes contain a specific code? (the panel's "closed" chip) */
export function hasOpportunityNote(
  notes: readonly OpportunityNote[] | null | undefined,
  code: OpportunityNoteCode
): boolean {
  return (notes ?? []).some((n) => n.code === code);
}
