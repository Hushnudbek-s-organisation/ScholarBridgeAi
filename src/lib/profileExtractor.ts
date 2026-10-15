/**
 * PROFILE EXTRACTOR (Pillar 5.2) — "10-second smart onboarding".
 *
 * Turns a pasted CV / transcript / IELTS-TRF text into candidate profile
 * fields. Two stages, in this order:
 *
 *   1. `extractDeterministicProfileFacts` — pure regexes. Works with no AI
 *      provider configured, which is the normal state of a self-hosted
 *      deployment, and it is the fallback when the model is unavailable.
 *   2. (API route) an optional AI pass for fields regexes cannot see
 *      (leadership / award sentences, target major). Its output is validated
 *      and then filtered by `verifyExtractedNumbersInSource`, so a model can
 *      never invent a GPA or an IELTS score: every number must appear verbatim
 *      in the text the student pasted.
 *
 * NOTHING is stored here. The route returns candidates; only the student's
 * explicit "Apply selected to my profile" writes them.
 */

export interface ExtractedFacts {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  degreeLevel: string | null;
  targetMajor: string | null;
  gpa: number | null;
  gpaScale: number | null;
  ieltsScore: number | null;
  toeflScore: number | null;
  satScore: number | null;
  greScore: number | null;
  gmatScore: number | null;
  duolingoScore: number | null;
  researchPublications: number | null;
  budgetAnnualUsd: number | null;
  leadership: string[];
  awards: string[];
  extracurriculars: string[];
}

export const EMPTY_EXTRACTED_FACTS: ExtractedFacts = {
  fullName: null,
  email: null,
  phone: null,
  country: null,
  degreeLevel: null,
  targetMajor: null,
  gpa: null,
  gpaScale: null,
  ieltsScore: null,
  toeflScore: null,
  satScore: null,
  greScore: null,
  gmatScore: null,
  duolingoScore: null,
  researchPublications: null,
  budgetAnnualUsd: null,
  leadership: [],
  awards: [],
  extracurriculars: [],
};

/** Longest input we will scan (a CV + transcript is far smaller). */
export const MAX_EXTRACT_CHARS = 200_000;

const num = (raw: string | undefined): number | null => {
  if (raw == null) return null;
  const n = Number(raw.replace(/,/g, "."));
  return Number.isFinite(n) ? n : null;
};

/** IELTS overall 4.0–9.0 (0.5 steps), accepting "Overall 7.5" / "IELTS: 7.5". */
function ieltsOf(text: string): number | null {
  const patterns = [
    /ielts[^\n]{0,40}?overall[^\d]{0,12}(\d(?:[.,]5)?)/i,
    /overall[^\d]{0,12}(\d(?:[.,]5)?)[^\n]{0,40}?ielts/i,
    /ielts[^\d\n]{0,20}(\d(?:[.,]5)?)/i,
  ];
  for (const re of patterns) {
    const value = num(text.match(re)?.[1]);
    if (value != null && value >= 4 && value <= 9 && Math.round(value * 2) === value * 2) return value;
  }
  return null;
}

const range = (value: number | null, min: number, max: number): number | null =>
  value != null && value >= min && value <= max ? value : null;

/** Every deterministic fact we can see in the text. Never throws. */
export function extractDeterministicProfileFacts(rawText: string): ExtractedFacts {
  const text = String(rawText ?? "").slice(0, MAX_EXTRACT_CHARS);
  const facts: ExtractedFacts = { ...EMPTY_EXTRACTED_FACTS, leadership: [], awards: [], extracurriculars: [] };
  if (!text.trim()) return facts;

  facts.email = text.match(/[\w.+-]+@[\w-]+\.[\w.-]{2,}/)?.[0] ?? null;
  facts.phone = text.match(/(\+?\d[\d\s().-]{7,17}\d)/)?.[0]?.trim() ?? null;

  // The first line that is not an email/phone/section heading is the name.
  const firstLines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 6);
  for (const line of firstLines) {
    if (line.includes("@") || /\d{4,}/.test(line)) continue;
    if (/^(education|cv|resume|curriculum vitae|ta'lim|образование)/i.test(line)) continue;
    if (line.split(/\s+/).length >= 2 && line.split(/\s+/).length <= 5 && /^[\p{Lu}][\p{L}'-]+(\s+[\p{Lu}][\p{L}'-]+)+$/u.test(line)) {
      facts.fullName = line;
      break;
    }
  }

  facts.ieltsScore = ieltsOf(text);
  facts.toeflScore = range(
    num(text.match(/toefl[^\d\n]{0,30}(\d{2,3})/i)?.[1] ?? text.match(/(\d{2,3})[^\n]{0,30}toefl/i)?.[1]),
    0,
    120
  );
  facts.satScore = range(num(text.match(/sat[^\d\n]{0,30}(\d{3,4})/i)?.[1]), 400, 1600);
  facts.greScore = range(num(text.match(/gre[^\d\n]{0,30}(\d{3})/i)?.[1]), 260, 340);
  facts.gmatScore = range(num(text.match(/gmat[^\d\n]{0,30}(\d{3})/i)?.[1]), 200, 800);
  facts.duolingoScore = range(num(text.match(/(?:duolingo|det)[^\d\n]{0,30}(\d{2,3})/i)?.[1]), 10, 160);

  // GPA with an explicit scale: "4.88 / 5.0", "3.8/4.0", "GPA: 3.75 out of 4".
  const gpaMatch =
    text.match(/(?:gpa|cgpa|grade point average|o['‘’]?rtacha baho)[^\d\n]{0,20}(\d{1,3}(?:[.,]\d{1,2})?)\s*(?:\/|out of|dan|из)\s*(\d{1,3}(?:[.,]\d{1,2})?)/i) ??
    text.match(/(\d{1,3}[.,]\d{1,2})\s*\/\s*(\d{1,3}(?:[.,]\d{1,2})?)\s*(?:gpa|scale|shkala|шкала)/i);
  if (gpaMatch) {
    facts.gpa = num(gpaMatch[1]);
    facts.gpaScale = num(gpaMatch[2]);
  }

  if (/(ph\.?d|doctorate|doktorantura|докторант)/i.test(text)) facts.degreeLevel = "PhD";
  else if (/(master|m\.?sc|magistratura|магистратур)/i.test(text)) facts.degreeLevel = "Master";
  else if (/(bachelor|b\.?sc|bakalavr|бакалавр)/i.test(text)) facts.degreeLevel = "Bachelor";

  const major = text.match(/(?:B\.?Sc\.?|B\.?A\.?|M\.?Sc\.?|M\.?A\.?|PhD)\s*(?:in|of|—|-|–)\s*([A-Z][A-Za-z&,\- ]{3,60})/);
  if (major) facts.targetMajor = major[1].trim().replace(/[.,]$/, "");

  // "2 papers", "2 peer-reviewed conference papers", "3 journal publications".
  // Up to three adjectives may sit between the count and the noun.
  facts.researchPublications = range(
    num(
      text.match(/\b(\d{1,2})\s+(?:[A-Za-z][a-z-]*\s+){0,3}(?:papers?|publications?)/i)?.[1] ??
        text.match(/\b(\d{1,2})\s+(?:ilmiy\s+)?maqola/iu)?.[1]
    ),
    0,
    99
  );

  const budget = text.match(/(?:budget|annual funds available)[^\d\n]{0,20}\$?\s?(\d{4,6})/i);
  facts.budgetAnnualUsd = range(num(budget?.[1]), 0, 1_000_000);

  // Sections: leadership / awards / activities — one bullet per line.
  const section = (heading: RegExp, limit = 6): string[] => {
    const lines = text.split(/\r?\n/);
    const out: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (!heading.test(lines[i])) continue;
      for (let j = i + 1; j < lines.length && out.length < limit; j++) {
        const line = lines[j].trim();
        if (!line) continue;
        if (heading.test(line)) break;
        if (/^[A-Z][A-Z\s&]{3,}$/.test(line) && lines[j] === lines[j].toUpperCase()) break; // next ALL-CAPS heading
        out.push(line.replace(/^[•\-*\u2022]\s*/, "").slice(0, 300));
      }
      if (out.length) break;
    }
    return out;
  };
  facts.leadership = section(/^[^\n]{0,40}(leadership|leader|yetakchi|лидерств)/i);
  facts.awards = section(/^[^\n]{0,40}(honors?|awards?|scholarship|mukofot|награ|стипенди)/i);
  facts.extracurriculars = section(/^[^\n]{0,40}(activities|extracurricular|volunteer|faoliyat|деятельн|волонтёр)/i);

  return facts;
}

/**
 * Does the source contain this number as a number (not as part of a longer
 * one)? Single digits need the digit-boundary check, otherwise "5" would be
 * "found" inside "2025" — and the whole honesty rule would be theatre.
 */
function sourceContainsNumber(source: string, value: number): boolean {
  const forms = Number.isInteger(value) ? [String(value)] : [String(value), value.toFixed(1), value.toFixed(2)];
  return forms.some((form) => {
    const escaped = form.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    try {
      return new RegExp(`(?<![\\d])${escaped}(?![\\d])`).test(source);
    } catch {
      return source.includes(form);
    }
  });
}

/** Numeric fields a hallucinating model must not be able to invent. */
const NUMERIC_FIELDS: (keyof ExtractedFacts)[] = [
  "gpa",
  "gpaScale",
  "ieltsScore",
  "toeflScore",
  "satScore",
  "greScore",
  "gmatScore",
  "duolingoScore",
  "researchPublications",
  "budgetAnnualUsd",
];

/**
 * Strict honesty rule (Pillar 5.2): keep a numeric candidate only when its
 * value appears verbatim in the source text. 4.88 survives "4.88 / 5.0"; a
 * model that answers 3.9 for the same CV loses the field (null), and the note
 * explains why. Text fields are trimmed to the source length but not
 * re-verified — they are shown to the student for confirmation anyway.
 */
export function verifyExtractedNumbersInSource(
  sourceText: string,
  extracted: Partial<ExtractedFacts>
): { facts: ExtractedFacts; stripped: string[] } {
  const source = String(sourceText ?? "").slice(0, MAX_EXTRACT_CHARS);
  const facts: ExtractedFacts = { ...EMPTY_EXTRACTED_FACTS, ...extracted };
  const stripped: string[] = [];
  for (const field of NUMERIC_FIELDS) {
    const value = facts[field];
    if (typeof value !== "number") continue;
    const present = sourceContainsNumber(source, value);
    if (!present) {
      (facts[field] as number | null) = null;
      stripped.push(field);
    }
  }
  return { facts, stripped };
}

/** What the UI shows as "detected" — only non-empty fields, in display order. */
export function detectedFieldKeys(facts: Partial<ExtractedFacts>): (keyof ExtractedFacts)[] {
  const order: (keyof ExtractedFacts)[] = [
    "fullName",
    "email",
    "phone",
    "country",
    "degreeLevel",
    "targetMajor",
    "gpa",
    "gpaScale",
    "ieltsScore",
    "toeflScore",
    "satScore",
    "greScore",
    "gmatScore",
    "duolingoScore",
    "researchPublications",
    "budgetAnnualUsd",
    "leadership",
    "awards",
    "extracurriculars",
  ];
  return order.filter((key) => {
    const v = facts[key];
    if (v == null) return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "string") return v.trim().length > 0;
    return true;
  });
}
