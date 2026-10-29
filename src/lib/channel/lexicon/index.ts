/**
 * The academic dictionary, as code.
 *
 * `lexicon.uz.json` is generated from the 606-page *ScholarBridgeAI akademik
 * tarjima lug'ati* by `scripts/import/lexicon/extract_pdf.py`: 12 732 English
 * headwords with a short Uzbek gloss (and the Russian gloss where the source
 * had one). It is bundled, not fetched, so the channel stays offline-testable
 * and a render never waits on a network call.
 *
 * What this module is for — and what it refuses to do:
 *
 *  * It translates **fragments**: noun lists such as `bachelor's degree, strong
 *    academic transcript, motivation letter, IELTS 6.5`. Those are how the
 *    database's `requirements` column is actually written, and a term list is
 *    exactly the right tool.
 *  * It refuses to translate a fragment it cannot finish. Every word must be a
 *    known term, a number, an allow-listed acronym, or one of the handful of
 *    connectors in `GLUE`. The moment one word is unknown the fragment returns
 *    `null` and the caller drops it — a half-English bullet is worse than no
 *    bullet (docs/CHANNEL.md §4b-3). A dictionary cannot conjugate verbs, so
 *    "candidates must have submitted" is out of scope by design.
 *
 * The publisher also keeps this list in the database (`translation_lexicon`),
 * so an operator can extend or correct a gloss without a deploy; `overlay()`
 * lets such rows win over the bundled copy.
 */
import data from "./lexicon.uz.json";

export interface LexiconEntry {
  /** Headword as printed in the dictionary. */
  en: string;
  /** Short Uzbek gloss. */
  uz: string;
  /** Russian gloss, when the source had one. */
  ru?: string;
}

const BUNDLED = data.terms as Record<string, LexiconEntry>;

/** Admin rows from `translation_lexicon`, consulted before the bundled copy. */
const OVERLAY = new Map<string, LexiconEntry>();

export const LEXICON_META = data.meta;

export function lexiconSize(): number {
  return Object.keys(BUNDLED).length;
}

export function lexiconVersion(): string {
  return `pdf-${data.meta.terms}-${data.meta.aliases}`;
}

/**
 * Every bundled row, in insertable shape — used once by
 * `store.ts#installLexicon()` to copy the dictionary into the database.
 */
export function vocabulary(): Array<{ key: string; en: string; uz: string; ru: string | null }> {
  return Object.entries(BUNDLED).map(([key, entry]) => ({
    key,
    en: entry.en,
    uz: entry.uz,
    ru: entry.ru ?? null,
  }));
}

/** Replace the overlay (called once per publisher tick, never per post). */
export function overlay(entries: Array<{ key: string; en: string; uz: string; ru?: string | null }>): void {
  OVERLAY.clear();
  for (const entry of entries) {
    if (!entry.key || !entry.uz) continue;
    OVERLAY.set(normalise(entry.key), { en: entry.en, uz: entry.uz, ru: entry.ru ?? undefined });
  }
}

function normalise(text: string): string {
  return text
    .replace(/[\u2018\u2019\u02bb\u02bc`]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Exact headword lookup. */
export function lookup(text: string): LexiconEntry | null {
  const key = normalise(text);
  return OVERLAY.get(key) ?? BUNDLED[key] ?? null;
}

/**
 * The bundled gloss for a headword, ignoring operator edits.
 *
 * `reset` needs exactly this: restoring a term means putting the dictionary's
 * own gloss back, not deleting the row. (Deleting was the old behaviour, and it
 * quietly emptied the table one correction at a time — the bundle kept
 * translating, so nothing looked broken until an operator searched for a term
 * they had "restored".)
 */
export function bundledGloss(text: string): LexiconEntry | null {
  const key = normalise(text);
  return BUNDLED[key] ?? null;
}

/**
 * Connectors a term list needs and a dictionary never bothers to define.
 * Deliberately tiny: every entry is a word that appears *inside* requirement
 * lists and carries no meaning of its own.
 */
const GLUE: Record<string, string> = {
  and: "va",
  or: "yoki",
  "at least": "kamida",
  minimum: "kamida",
  "a minimum of": "kamida",
  with: "bilan",
  without: "siz",
  in: "ichida",
  for: "uchun",
  of: "",
  the: "",
  a: "",
  an: "",
  plus: "va",
  including: "jumladan",
  such: "kabi",
  as: "sifatida",
  to: "",
  at: "",
  on: "",
  by: "",
  from: "",
  be: "",
  is: "",
  are: "",
  "as well as": "va",
  "such as": "kabi",
  "e.g.": "masalan",
};

/** Acronyms and test names that stay as they are in Uzbek. */
const KEEP = new Set([
  "ielts", "toefl", "toeic", "det", "pte", "duolingo", "hsk", "topik", "jlpt",
  "dsh", "testdaf", "delf", "dele", "gmat", "gre", "sat", "act", "gpa", "cv",
  "phd", "bsc", "msc", "ba", "ma", "mba", "bba", "llb", "llm", "bcs", "eu",
  "uk", "usa", "uae", "us", "ai", "stem", "f1", "j1", "h1b", "eoi", "sop",
]);

/** Numbers, amounts and codes pass through untouched. */
function isNeutral(token: string): boolean {
  if (KEEP.has(token)) return true;
  if (/^[\d.,%$€£¥+\-/]+$/.test(token)) return true;
  if (/^[a-z]{1,2}\d+$/i.test(token)) return true; // HSK4, B2, Q1
  return false;
}

export interface FragmentTranslation {
  /** Uzbek rendering of the fragment. */
  uz: string;
  /** Terms that came from the dictionary — the caller can order by count. */
  hits: number;
  /** Words that were skipped because they carry no meaning (`of`, `the`). */
  glue: number;
}

/**
 * Translate one fragment. Returns `null` unless *every* word is accounted for.
 *
 * Longest match wins (`bachelor's degree` before `bachelor`), a trailing `s` is
 * retried as a singular, and the result is post-checked: if any Latin word
 * survives that is neither an allow-listed acronym nor part of a dictionary
 * gloss, the whole fragment is refused.
 */
export function translateFragment(text: string | null | undefined): FragmentTranslation | null {
  const source = normalise(text ?? "");
  if (!source) return null;
  const words = source.split(" ").filter(Boolean);
  if (words.length === 0 || words.length > 18) return null;

  const out: string[] = [];
  let hits = 0;
  let glue = 0;
  let i = 0;
  while (i < words.length) {
    let matched = false;
    for (let size = Math.min(5, words.length - i); size >= 1; size -= 1) {
      const phrase = words.slice(i, i + size).join(" ").replace(/^[^a-z0-9]+|[^a-z0-9')]+$/g, "");
      if (!phrase) continue;
      const entry = OVERLAY.get(phrase) ?? BUNDLED[phrase];
      if (entry) {
        out.push(condense(entry.uz));
        hits += 1;
        i += size;
        matched = true;
        break;
      }
      if (size === 1) {
        const singular = phrase.replace(/s$/, "");
        const singularEntry = singular !== phrase ? OVERLAY.get(singular) ?? BUNDLED[singular] : null;
        if (singularEntry) {
          out.push(condense(singularEntry.uz));
          hits += 1;
          i += 1;
          matched = true;
          break;
        }
        if (phrase in GLUE) {
          const joined = GLUE[phrase];
          if (joined) out.push(joined);
          glue += 1;
          i += 1;
          matched = true;
          break;
        }
        if (isNeutral(phrase)) {
          out.push(phrase);
          glue += 1;
          i += 1;
          matched = true;
          break;
        }
      }
    }
    if (!matched) return null;
  }

  const uz = tidy(out.join(" "));
  if (!uz) return null;
  /**
   * The gate is structural: an unmatched source word already returns `null`,
   * so nothing English can slip in through the loop. What is checked here is
   * the other direction — a gloss that itself carries an English function word
   * ("Students must…"), which would mean the dictionary row was not a
   * translation. Such a fragment is refused rather than posted.
   */
  if (ENGLISH_LEFTOVER.test(uz)) return null;
  return { uz, hits, glue };
}

/**
 * Words that only appear in an *English* sentence, never in an Uzbek gloss.
 *
 * The lookbehind is load-bearing: Uzbek writes its digraphs with an apostrophe
 * (`ilg'or`, `o'qish`), and JavaScript counts the apostrophe as a word
 * boundary — so a plain `\bor\b` rejects `ilg'or` and, with it, every gloss
 * containing "advanced". 74 entries in the supplied dictionary were being
 * dropped that way; only the genuine English ones (provider names such as
 * "American University of Beirut") are still refused.
 */
const ENGLISH_LEFTOVER =
  /(?<!['\u2019])\b(?:the|and|or|of|must|should|will|with|students?|applicants?|candidates?|required|requirements?|please|your)\b/i;

/** True when `text` still reads as English. One rule, used everywhere. */
export function looksEnglish(text: string | null | undefined): boolean {
  return ENGLISH_LEFTOVER.test(String(text ?? ""));
}

/**
 * A dictionary gloss often lists two senses (`to'liq / tugallamoq`). Inside a
 * bullet the second sense is noise, so a long gloss keeps only its head, and a
 * gloss longer than a short phrase is dropped back to its first two words.
 */
function condense(gloss: string): string {
  const parts = gloss.split(" / ").map((part) => part.trim()).filter(Boolean);
  const head = parts[0] ?? gloss;
  if (parts.length > 1 && parts.join(" / ").split(" ").length <= 6) return parts.join(" / ");
  return head;
}

function tidy(text: string): string {
  const cleaned = text
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/([,;:])\1+/g, "$1")
    .replace(/^[,;:\s]+|[,;:\s]+$/g, "")
    // A dropped connector can leave " , " or " va ,".
    .replace(/\s+(va|yoki)\s+(va|yoki)\s+/g, " $1 ")
    .replace(/\s*(?:,|;)\s*(?:,|;)\s*/g, ", ");
  if (!cleaned) return "";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/**
 * Scan prose for dictionary headwords, skipping what we do not know.
 *
 * This is the useful direction for real requirement text: a sentence will
 * always contain verbs and proper nouns, but its *terms* are in the dictionary.
 * Matching stops being all-or-nothing — every recognised phrase of two or more
 * words becomes one chip (`strong academic results` → `Kuchli akademik
 * natijalar`), and the caller decides how many chips a bullet may hold.
 */
export function phraseScan(text: string | null | undefined, max = 3): string[] {
  const source = normalise(text ?? "");
  if (!source) return [];
  const words = source.split(" ").filter(Boolean);
  const out: string[] = [];
  let i = 0;
  while (i < words.length && out.length < max) {
    let matched = false;
    for (let size = Math.min(5, words.length - i); size >= 2; size -= 1) {
      const phrase = words.slice(i, i + size).join(" ").replace(/^[^a-z0-9]+|[^a-z0-9')]+$/g, "");
      if (phrase.split(" ").length < 2) continue;
      const entry = OVERLAY.get(phrase) ?? BUNDLED[phrase];
      if (!entry) continue;
      const chip = condense(entry.uz);
      const words2 = chip.split(" ");
      if (words2.length < 2 || chip.length > 40) continue;
      if (/^(?:va|yoki|bilan|uchun|kabi)$/i.test(words2[0])) continue;
      if (ENGLISH_LEFTOVER.test(chip)) continue;
      if (!out.includes(chip)) out.push(chip);
      i += size;
      matched = true;
      break;
    }
    if (!matched) i += 1;
  }
  return out;
}

/**
 * Split English prose into list fragments and translate the ones that resolve.
 *
 * Requirement sentences are overwhelmingly noun lists separated by commas,
 * semicolons or "and": `Bachelor degree, strong academic transcript, motivation
 * letter, 3 recommendation letters`. Each fragment stands on its own, so a
 * fragment we cannot finish is dropped instead of poisoning the whole line.
 */
export function translateList(text: string | null | undefined, max = 6): string[] {
  const source = (text ?? "").replace(/\s+/g, " ").trim();
  if (!source) return [];
  const fragments = source
    .split(/[;•\u2022]|,\s|\.\s+|\s+and\s+|\s+or\s+/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 2);
  const out: string[] = [];
  for (const fragment of fragments) {
    const translated = translateFragment(fragment);
    if (!translated) continue;
    if (translated.hits === 0) continue; // connectors only — nothing learned
    if (out.includes(translated.uz)) continue;
    out.push(translated.uz);
    if (out.length >= max) break;
  }
  return out;
}
