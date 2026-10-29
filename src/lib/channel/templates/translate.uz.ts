/**
 * English scholarship data → Uzbek post lines, without an LLM.
 *
 * The channel publishes in Uzbek (docs/CHANNEL.md §4), but the database stores
 * its prose in English: `requirements`, `english_requirements`,
 * `tuition_coverage`, `description`. The 547 active awards hold ~3000 English
 * sentences and ~2770 of them are unique, so a sentence-for-sentence dictionary
 * would cover less than a fifth of them — and a word-for-word renderer would
 * produce exactly the broken mixed-language text the channel must never post.
 *
 * So nothing here "translates prose". Instead it **reads the English for the
 * facts it states** — degree level, GPA floor, percentage, IELTS/TOEFL/HSK
 * scores, citizenship, nomination, exclusivity, documents — and writes each of
 * them as an Uzbek sentence from a fixed template. What is not recognised is
 * dropped: no line ever contains a guess, an English leftover, or a number the
 * source did not contain.
 *
 * Why not the free AI models the rest of the app uses? Channel copy must be
 * reviewable template/bank text with no per-post AI call (docs §1, §4b) — an
 * operator has to be able to read the exact sentence that will be published
 * before it is published.
 */

import { phraseScan, translateList } from "../lexicon";
import { isCountryName } from "./format";

export interface SignalContext {
  /** Degrees already listed from structured columns, to avoid a repeat. */
  degrees?: string | null;
  /** GPA floor from the structured column, when it exists. */
  minGpa?: number | null;
}

/** `IELTS 6.5`, `TOEFL 85`, `DET 115`, `HSK 5`, `TOPIK 4`, `German C1`. */
interface Score {
  label: string;
  value: string;
}

const NUMBER = "[0-9]+(?:[.,][0-9]+)?";

/** Every score we recognise, in the order they should be printed. */
const SCORE_PATTERNS: Array<{ re: RegExp; format: (m: RegExpMatchArray) => Score | null }> = [
  { re: /ielts\s*(?:academic\s*)?(?:overall\s*)?([0-9](?:[.,][05])?)/gi, format: (m) => ({ label: "IELTS", value: m[1].replace(",", ".") }) },
  { re: /toefl\s*(?:ibt|itp|cbt|pbt)?\s*:?\s*([0-9]{2,3})/gi, format: (m) => ({ label: "TOEFL", value: m[1] }) },
  { re: /\bdet\s*:?\s*([0-9]{2,3})/gi, format: (m) => ({ label: "DET", value: m[1] }) },
  { re: /\bpte\s*(?:academic)?\s*:?\s*([0-9]{2,3})/gi, format: (m) => ({ label: "PTE", value: m[1] }) },
  { re: /\bduolingo\s*(?:english\s*test\s*)?:?\s*([0-9]{2,3})/gi, format: (m) => ({ label: "Duolingo", value: m[1] }) },
  { re: /\bhsk\s*(?:level\s*)?([1-9])/gi, format: (m) => ({ label: "HSK", value: `${m[1]}-daraja` }) },
  { re: /\btopik\s*(?:level\s*)?([1-9])/gi, format: (m) => ({ label: "TOPIK", value: `${m[1]}-daraja` }) },
  { re: /\bgerman\s*(b[12]|c[12])/gi, format: (m) => ({ label: "Nemis tili", value: m[1].toUpperCase() }) },
  { re: /\b(dsh|testdaf)\s*([0-9]{1,2})/gi, format: (m) => ({ label: m[1].toUpperCase(), value: m[2] }) },
];

function stripNoise(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Every score stated in the text, de-duplicated, in a stable order. */
export function extractScores(raw: string | null | undefined): Score[] {
  if (!raw) return [];
  const found: Score[] = [];
  for (const pattern of SCORE_PATTERNS) {
    for (const match of raw.matchAll(pattern.re)) {
      const score = pattern.format(match);
      if (!score) continue;
      if (!found.some((s) => s.label === score.label && s.value === score.value)) found.push(score);
    }
  }
  return found;
}

/**
 * `Til talabi` line from `english_requirements`.
 *
 * Three shapes: concrete scores; "no single score is published" (a real answer,
 * not a gap); and a language-of-instruction note (German/Chinese/Korean-taught
 * programmes). Anything else — including the "not verified for this row"
 * bookkeeping sentences — returns null and the line is omitted.
 */
export function translateEnglishRequirement(raw: string | null | undefined): string | null {
  const text = stripNoise(raw ?? "");
  if (!text) return null;
  if (/not verified|could not be read|not published for this row/i.test(text)) return null;

  const scores = extractScores(text);
  // Levels and language labels already read as a phrase; only test scores take
  // the "+" (a reader sees "IELTS 6.5+" as "at least 6.5").
  const parts = scores.map((s) =>
    s.label === "Nemis tili" || s.value.endsWith("-daraja") ? `${s.label} ${s.value}` : `${s.label} ${s.value}+`
  );

  // "A Chinese-taught master's programme requires HSK level 4" — the language
  // of instruction is the point, not the score.
  if (/chinese-taught/i.test(text) && !scores.some((s) => s.label === "HSK")) parts.push("Xitoy tilida o'qitiladigan dasturlar uchun HSK talabi");
  if (/korean-taught|korean proficiency/i.test(text) && !scores.some((s) => s.label === "TOPIK")) parts.push("Koreys tilida o'qitiladigan dasturlar uchun TOPIK talabi");
  if (/german-taught|german proficiency/i.test(text) && !scores.some((s) => s.label === "Nemis tili")) parts.push("Nemis tilida o'qitiladigan dasturlar uchun nemis tili kerak");

  if (parts.length > 0) {
    // "IELTS 6.5 or equivalent English test" — the alternative matters to a
    // reader without an IELTS certificate.
    const equivalent = /or (?:an? )?equivalent|or equivalent/i.test(text);
    return `${parts.join(" · ")}${equivalent ? " yoki ekvivalent imtihon" : ""}`;
  }

  if (
    /no (?:single |separate |scholarship[- ]level |fixed |formal )?(?:english(?:[- ]language)? )?(?:score|requirement|ielts|toefl|cut-?off|minimum|threshold)|sets no (?:single |separate |fixed )?(?:score|language|ielts|toefl|cut-?off)|no language (?:score|requirement) is published/i.test(
      text
    )
  ) {
    return "Yagona til balli yo'q — talab tanlangan dasturga bog'liq";
  }
  const cefr = /\b(italian|english|french|german|spanish)\b[^.;]{0,20}?\b(?:cefr\s*)?(a2|b1|b2|c1|c2)\b/i.exec(text);
  if (cefr) {
    const language = cefr[1].charAt(0).toUpperCase() + cefr[1].slice(1).toLowerCase();
    return `${language} tili ${cefr[2].toUpperCase()} darajasi`;
  }
  if (/(?:english|language) proficiency is required|required.{0,30}english proficiency|english proficiency requirement/i.test(text)) {
    return "Ingliz tili darajasi talab qilinadi";
  }
  if (/equivalent english test|equivalent (?:to )?english/i.test(text)) return "Ekvivalent ingliz tili imtihoni";
  if (/evidence|proof/i.test(text) && /english/i.test(text)) return "Ingliz tili darajasi tasdiqlanadi (sertifikat)";
  return null;
}

/** One Uzbek bullet per fact the English text states. */
export function translateRequirements(raw: string | null | undefined, ctx: SignalContext = {}): string[] {
  const text = stripNoise(raw ?? "");
  if (!text) return [];
  const out: string[] = [];
  const degrees = (ctx.degrees ?? "").toLowerCase();
  const push = (line: string) => {
    if (!out.includes(line)) out.push(line);
  };

  // --- degree level -------------------------------------------------------
  const wantsBachelor = /\bbachelor(?:'s|s)?\b|\bundergraduate\b/i.test(text);
  const wantsMaster = /\bmaster(?:'s|s)?\b|\bpostgraduate\b|\bgraduate (?:programme|program|degree)\b/i.test(text);
  const wantsPhd = /\bphd\b|\bdoctoral\b|\bdoctorate\b|\bdphil\b/i.test(text);
  const degreeLine = [
    wantsBachelor && !degrees.includes("bakalavr") ? "Bakalavr" : null,
    wantsMaster && !degrees.includes("magistratura") ? "Magistratura" : null,
    wantsPhd && !degrees.includes("doktorantura") ? "Doktorantura (PhD)" : null,
  ].filter(Boolean) as string[];
  if (degreeLine.length > 0) {
    const joined = degreeLine
      .map((part, index) => (index === 0 ? part : part.charAt(0).toLowerCase() + part.slice(1)))
      .join(" yoki ");
    push(`${joined} darajasi`);
  }

  // --- GPA floor ----------------------------------------------------------
  if (ctx.minGpa === null || ctx.minGpa === undefined) {
    const gpa = new RegExp(`(?:gpa|grade point (?:average|equivalent))[^0-9]{0,24}(${NUMBER})`, "i").exec(text);
    if (gpa) push(`GPA ${gpa[1].replace(",", ".")}+`);
    /**
     * A letter-grade floor carries no digit: "a minimum GPA of A- on the
     * qualification used for entry is required" (University of Waikato). The
     * numeric reader above cannot see it, and the dictionary turned the bare
     * phrase into a `Minimal GPA` bullet — a floor with no value, which is
     * worse than saying nothing. The grade is in the text, so it is printed.
     */
    else {
      // The sign must be captured with the letter: `\b` alone stops between
      // "A" and "-", so the bullet would say "A" for an A- floor.
      const letter = /\b(?:gpa|grade point average|grade average)\b\s*(?:of|:)?\s*([A-C][+-]?)(?![A-Za-z0-9])/i.exec(text);
      if (letter) push(`Minimal GPA: ${letter[1]}`);
    }
  }

  // --- percentage floor ---------------------------------------------------
  const percent =
    /(?:at least|minimum(?: of)?|overall|above|no less than)[^0-9]{0,30}(\d{1,3})\s*(?:%|percent|per cent)/i.exec(text) ??
    /(\d{1,3})\s*(?:%|percent|per cent)\s*(?:or (?:more|higher|above)|minimum)/i.exec(text);
  if (percent) push(`O'rtacha ball kamida ${percent[1]}%`);

  // --- who may apply ------------------------------------------------------
  // "any country outside X" is the more specific statement, so it wins over
  // the generic "be a citizen of …" one instead of sitting next to it.
  const hostExcluded = /\bany country (?:outside|other than)\b|\bfrom (?:a|any) country outside\b/i.test(text);
  if (hostExcluded) {
    push("Mezbon davlatdan tashqari barcha davlatlar fuqarolari uchun");
  } else if (/\bbe a citizen of|\bmust be a (?:citizen|national)|\bcitizen of a\b|\bhold .{0,20}citizenship\b/i.test(text)) {
    push("Ko'rsatilgan davlatlar fuqarolari uchun");
  }
  if (
    !out.some((line) => line.includes("fuqarolari uchun")) &&
    /\binternational (?:student|applicant)s?\b|\bnon-?eu\b|\bnon-?local\b/i.test(text)
  ) {
    push("Xalqaro talabalar uchun");
  }
  if (/\b(?:be|currently) (?:enrolled|registered)\b|\benrolled (?:in|at)\b/i.test(text)) {
    push("Biror ta'lim dasturiga yozilgan bo'lish");
  }
  if (/\b(?:be|already) (?:admitted|accepted)\b|\badmission to\b|\badmitted to\b/i.test(text)) {
    push("Tanlangan dasturga qabul qilingan bo'lish");
  }
  if (/\bnominat/i.test(text)) push("Universitet yoki vazirlik tavsiyasi (nominatsiya) kerak");

  // --- conditions ---------------------------------------------------------
  if (/\bno other\b|\bmust not hold\b|\bmay not hold\b|\bnot (?:receive|hold) (?:another|any other)\b|\bonly one\b.{0,30}scholarship/i.test(text)) {
    push("Boshqa stipendiya olmaslik sharti");
  }
  const age = /\bunder (?:the age of )?(\d{2})\b|\baged? (\d{2})\b|\b(\d{2}) years (?:of age|old) or (?:younger|under)\b/i.exec(text);
  if (age) push(`Yosh chegarasi: ${age[1] ?? age[2] ?? age[3]} yoshgacha`);

  // --- documents and steps ------------------------------------------------
  if (/\bmotivation letter\b|\bstatement of purpose\b|\bpersonal statement\b/i.test(text)) push("Motivatsion xat");
  if (/\brecommendation\b|\breference letter\b|\btwo referees?\b/i.test(text)) push("Tavsiyanoma");
  if (/\bportfolio\b/i.test(text)) push("Portfolio");
  if (/\bresearch proposal\b/i.test(text)) push("Ilmiy tadqiqot rejasi (research proposal)");
  if (/\btranscript\b/i.test(text)) push("Baholar varaqasi (transcript)");
  if (/\bcurriculum vitae\b|\bresume\b|\bcv\b/i.test(text)) push("CV");
  if (/\binterview\b/i.test(text)) push("Suhbat (intervju)");
  if (/\bapplication fee\b/i.test(text) && /\bno\b|\bfree\b|\bwithout\b/i.test(text)) push("Ariza uchun to'lov yo'q");

  // --- dictionary terms ---------------------------------------------------
  /**
   * The academic dictionary (12 732 headwords, `lexicon.uz.json`) covers what
   * the patterns above cannot name: `strong academic transcript`, `research
   * proposal`, `proof of funds`. `translateList` only returns fragments whose
   * every word the dictionary knows, so a partly-understood sentence adds
   * nothing rather than a half-English line.
   */
  const fromDictionary = dictionaryLine(text, out);
  if (fromDictionary) push(fromDictionary);

  return out.slice(0, 6);
}

/**
 * `Kimlar uchun` bullet built from dictionary terms.
 *
 * Two shapes, in order of quality:
 *
 *  1. a requirement *list* whose fragments all resolve end-to-end
 *     (`bachelor's degree, motivation letter` → `Bakalavr darajasi ·
 *     Motivatsion xat`) — this is what the column usually looks like;
 *  2. otherwise the terms the sentence does contain (`strong academic record,
 *     English proficiency` → `Akademik ma'lumotlar · ingliz tili darajasi`).
 *
 * Anything the patterns above already said is dropped, so the post never
 * repeats itself, and a fragment that reads as more than one sense is refused
 * rather than shrunk.
 */
/**
 * A chip that names a place, or a threshold with no value, is not a requirement.
 *
 * Both came straight out of live prose: "New Zealand" became a bullet (the
 * country is already in the header), and "Minimal GPA" — the dictionary's gloss
 * for the phrase "minimum GPA" — promised a floor without saying where it is.
 */
function isRequirementChip(chip: string): boolean {
  if (isCountryName(chip)) return false;
  if (/\b(?:minimal|maksimal|kamida)\b/i.test(chip) && !/\d/.test(chip)) return false;
  return true;
}

export function dictionaryLine(raw: string, existing: readonly string[] = []): string | null {
  const seen = existing.map((line) => line.toLowerCase());
  const fresh = (fragment: string) => {
    if (fragment.length > 55 || fragment.includes(",") || fragment.includes(" / ")) return false;
    if (!isRequirementChip(fragment)) return false;
    if (fragment.split(" ").length < 2) return false;
    const low = fragment.toLowerCase();
    return !seen.some((line) => line === low || line.includes(low) || low.includes(line));
  };

  const list = translateList(raw, 5).filter(fresh);
  const chips = phraseScan(raw, 4).filter(fresh);
  const chosen = (list.length >= 2 ? list.slice(0, 3) : chips.slice(0, 3)).map(
    (part) => part.charAt(0).toUpperCase() + part.slice(1)
  );
  if (chosen.length === 0) return null;
  const line = chosen.join(" · ");
  return line.length > 120 ? null : line;
}

/**
 * `Foydali tomonlari` line from `tuition_coverage` / `funding_type`.
 *
 * Only patterns that state something checkable: a percentage, "full"/"partial",
 * "no tuition fee", or a named stipend amount. Free prose returns null.
 */
export function translateCoverage(raw: string | null | undefined): string | null {
  const text = stripNoise(raw ?? "");
  if (!text) return null;
  if (/^none$/i.test(text) || /no coverage can be stated/i.test(text)) return null;

  // A range first: "Between 50% and 100% of the amount payable" → 50–100%.
  /**
   * Never print "100%": the channel lint treats any "100%" as an absolute
   * promise (docs §6), and the sender refuses such a message. A range that ends
   * at the full fee is therefore said in words.
   */
  const range = /(?:between|from)\s*(\d{1,3})\s*(?:%|percent)\s*(?:and|to)\s*(\d{1,3})\s*(?:%|percent)/i.exec(text);
  if (range) {
    return Number(range[2]) >= 100
      ? `Kontraktning ${range[1]}%idan to'liq qismigacha qoplanadi`
      : `Kontraktning ${range[1]}–${range[2]}% qismi qoplanadi`;
  }

  const single = /(\d{1,3})\s*(?:%|percent|per cent)(?:\s*(?:of|off))?\s*(?:the\s*)?(?:annual\s*)?(?:tuition|fee|amount|cost)/i.exec(text);
  if (single) {
    return Number(single[1]) >= 100 ? "Kontrakt to'liq qoplanadi" : `Kontraktning ${single[1]}% qismi qoplanadi`;
  }

  // A named periodic amount: "a stipend of HK$344,400 a year".
  // The filler may not eat the currency letters themselves: without this,
  // "HK$344,400" matched as "HK" + "$344,400" and the post lost the HK.
  const money =
    /(?:stipend|allowance|grant|salary)[^0-9]{0,40}?(HK\$|US\$|USD|EUR|GBP|€|£|\$)\s?([\d,]{3,})/i.exec(text) ??
    /(HK\$|US\$|USD|EUR|GBP|€|£|\$)\s?([\d,]{3,})\s*(?:\/|per\s)?(?:year|month|annum)?[^.;]{0,24}?\b(?:stipend|allowance|grant)\b/i.exec(text);
  if (money) {
    const period = /\b(?:a|per)\s*(month|year|annum)\b/i.exec(text);
    const periodUz = period ? (period[1].toLowerCase().startsWith("m") ? " (oyiga)" : " (yiliga)") : "";
    return `Stipendiya: ${money[1]}${money[2]}${periodUz}`;
  }

  if (/full tuition|tuition.{0,20}(?:is )?(?:fully )?covered|all tuition fees.{0,40}covered|cover(?:s|ed)? (?:the )?(?:annual |full )?(?:tuition|fees)|full fees/i.test(text)) {
    // "…plus an annual stipend" is a second component worth keeping.
    if (/plus an? (?:annual |monthly )?stipend|and an? (?:annual |monthly )?stipend/i.test(text)) return "To'liq kontrakt va stipendiya";
    return "Kontrakt to'liq qoplanadi";
  }
  if (/pays (?:a|an) (?:monthly|annual) allowance, not tuition/i.test(text)) return "Oylik nafaqa to'lanadi (kontrakt emas)";
  if (/monthly allowance/i.test(text) && /not tuition/i.test(text)) return "Oylik nafaqa to'lanadi (kontrakt emas)";
  if (/partial or full/i.test(text)) return "Kontraktning bir qismi yoki to'liq qismi qoplanadi";
  if (/partial/i.test(text)) return "Kontraktning bir qismi qoplanadi";
  if (/no tuition fee|tuition[- ]free|no tuition is charged/i.test(text)) return "Kontrakt to'lovi yo'q";
  return null;
}

/**
 * A short English sentence → Uzbek, for the few shapes that are genuinely
 * generic. Used only by `description`, and only when the whole sentence maps;
 * a partial match returns null rather than a half-English line.
 */
const SENTENCE_BANK: Array<{ re: RegExp; uz: (m: RegExpMatchArray) => string }> = [
  { re: /^open to (?:all )?(?:international )?students/i, uz: () => "Barcha xalqaro talabalar uchun ochiq" },
  { re: /^the (?:programme|scheme|award|scholarship) (?:covers|pays|provides)/i, uz: () => "Dastur to'lov va qo'shimcha xarajatlarni qoplaydi" },
  { re: /^applying does not require paying/i, uz: () => "Ariza topshirish uchun to'lov talab qilinmaydi" },
  { re: /^applications? (?:are|is) (?:accepted|open) (?:online|year-round)/i, uz: () => "Ariza onlayn topshiriladi" },
];

export function translateSentence(raw: string): string | null {
  const text = stripNoise(raw).replace(/[.;]+$/, "");
  if (!text) return null;
  for (const entry of SENTENCE_BANK) {
    const match = entry.re.exec(text);
    if (match) return entry.uz(match);
  }
  return null;
}
