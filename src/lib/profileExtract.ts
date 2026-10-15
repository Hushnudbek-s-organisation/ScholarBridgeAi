/**
 * Smart auto-fill — a deterministic CV-text → profile-field PREVIEW.
 *
 * The student pastes CV text (or loads a sample to see how it works) and this
 * module lists the values it can read with certainty: GPA and its scale, test
 * scores, graduation year, years of work experience, publication count and
 * the target degree. Every detection carries the exact excerpt it came from,
 * so the preview can show "GPA 4.88 / 5 ← GPA: 4.88 / 5.00" and the student
 * decides what to apply.
 *
 * Rules
 *   • No model, no guessing: a value is returned only when a labelled pattern
 *     matches AND the number is inside the test's real range. A GRE section
 *     score is never promoted to a total; "SAT Math 790" is not an SAT total.
 *   • Nothing here writes anywhere. Callers fill an unsaved form after an
 *     explicit click; saving remains a separate, explicit action.
 *
 * Pure module — asserted in scripts/check-samples.ts.
 */

export interface ExtractedProfileFields {
  gpa?: number;
  gpaScale?: number;
  ieltsScore?: number;
  toeflScore?: number;
  satScore?: number;
  greScore?: number;
  actScore?: number;
  duolingoScore?: number;
  graduationYear?: number;
  workExperienceYears?: number;
  researchPublications?: number;
  degreeLevel?: "Bachelor" | "Master" | "PhD";
}

export type ExtractedKey = keyof ExtractedProfileFields;

export interface ExtractedField {
  key: ExtractedKey;
  value: number | string;
  /** The text the value was read from, for the preview. */
  excerpt: string;
}

const GPA_SCALES = [4, 5, 10, 100];

const num = (s: string) => Number(s.replace(/,/g, ""));
const clean = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, 80);

interface Rule {
  key: ExtractedKey;
  patterns: RegExp[];
  /** Turn the regex match into a value, or null when it fails a range check. */
  read: (m: RegExpMatchArray) => number | string | null;
}

const inRange = (value: number, min: number, max: number) => (Number.isFinite(value) && value >= min && value <= max ? value : null);

const RULES: Rule[] = [
  {
    key: "ieltsScore",
    patterns: [/\bIELTS\b(?:\s+(?:Academic|General(?:\s+Training)?))?[^\d\n]{0,12}(\d(?:\.[05])?)\b/i],
    read: (m) => inRange(num(m[1]), 1, 9),
  },
  {
    key: "toeflScore",
    patterns: [/\bTOEFL\b(?:\s+iBT)?[^\d\n]{0,12}(\d{2,3})\b/i],
    read: (m) => inRange(num(m[1]), 0, 120),
  },
  {
    key: "satScore",
    // "SAT: 1510 (Math 790)" or "scored 1510 on the SAT" — never "SAT Math 790".
    patterns: [/\bSAT\b(?!\s*(?:Math|Reading|Subject|R&W|EBRW))[^\d\n]{0,12}(\d{3,4})\b/i, /\b(\d{3,4})\s+on\s+the\s+SAT\b/i],
    read: (m) => inRange(num(m[1]), 400, 1600),
  },
  {
    key: "greScore",
    // A total only: "GRE: 327" / "GRE General 327". Section scores stay out.
    patterns: [/\bGRE\b(?:\s+General)?(?:\s+(?:total|score))?\s*[:\-–]?\s*(\d{3})\b/i],
    read: (m) => inRange(num(m[1]), 260, 340),
  },
  {
    key: "actScore",
    patterns: [/\bACT\b(?:\s+composite)?\s*[:\-–]?\s*(\d{1,2})\b/],
    read: (m) => inRange(num(m[1]), 1, 36),
  },
  {
    key: "duolingoScore",
    patterns: [/\bDuolingo(?:\s+English\s+Test)?\b[^\d\n]{0,12}(\d{2,3})\b/i, /\bDET\b\s*[:\-–]?\s*(\d{2,3})\b/],
    read: (m) => inRange(num(m[1]), 10, 160),
  },
  {
    key: "graduationYear",
    patterns: [/\b(?:graduat\w*|class of|expected)\b[^\n\d]{0,30}?(?:[A-Za-z]+\s+)?\b(20[0-4]\d)\b/i],
    read: (m) => inRange(num(m[1]), 2000, 2049),
  },
  {
    key: "workExperienceYears",
    patterns: [
      /\bwork(?:ing)?\s+experience\b[^\d\n]{0,10}(\d{1,2}(?:\.\d)?)\s*\+?\s*years?\b/i,
      /\b(\d{1,2}(?:\.\d)?)\s*\+?\s*years?\s+of\s+(?:full-time\s+|professional\s+|work\s+)?(?:work\s+)?experience\b/i,
    ],
    read: (m) => inRange(num(m[1]), 0, 40),
  },
  {
    key: "researchPublications",
    patterns: [
      /\bpublications?\s*:\s*(\d{1,2})\b(?!\s*[–-]?\s*\d)/i,
      /\b(\d{1,2})\s+(?:(?:co-authored|peer-reviewed|published|policy|conference|journal|research|IEEE)\s+){0,2}(?:papers?|publications?|articles?)\b/i,
    ],
    read: (m) => inRange(num(m[1]), 0, 50),
  },
  {
    key: "degreeLevel",
    patterns: [
      /\b(?:applying\s+(?:for|to)|target(?:ing)?|admitted\s+to)\b[^\n]{0,24}?\b(Ph\.?\s?D|doctor(?:al|ate)|M\.?\s?Sc|MSc|M\.?A\b|MBA|MPH|master(?:'s)?|B\.?\s?Sc|BSc|B\.?A\b|bachelor(?:'s)?)/i,
    ],
    read: (m) => {
      const v = m[1].toLowerCase().replace(/[\s.]/g, "");
      if (v.startsWith("phd") || v.startsWith("doctor")) return "PhD";
      if (v.startsWith("m")) return "Master";
      if (v.startsWith("b")) return "Bachelor";
      return null;
    },
  },
];

/** GPA needs its scale: "GPA: 4.88 / 5.00", "GPA 3.92/4.00", "4.95/5.00 GPA", "GPA of 5.00 out of 5". */
function readGpa(text: string): ExtractedField[] {
  const patterns = [
    /\bGPA\b[^\d\n]{0,12}(\d{1,3}(?:\.\d{1,2})?)\s*(?:\/|out\s+of|of)\s*(\d{1,3}(?:\.\d{1,2})?)/i,
    /\b(\d{1,3}(?:\.\d{1,2})?)\s*\/\s*(\d{1,3}(?:\.\d{1,2})?)\s+(?:unweighted\s+)?GPA\b/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (!m) continue;
    const gpa = num(m[1]);
    const scale = num(m[2]);
    if (!GPA_SCALES.includes(scale) || !(gpa > 0) || gpa > scale) continue;
    const excerpt = clean(m[0]);
    return [
      { key: "gpa", value: gpa, excerpt },
      { key: "gpaScale", value: scale, excerpt },
    ];
  }
  return [];
}

/** Every field the text states unambiguously, in a stable order. */
export function extractProfileFields(text: string): ExtractedField[] {
  const source = (text ?? "").slice(0, 20_000);
  if (!source.trim()) return [];
  const found: ExtractedField[] = [...readGpa(source)];
  for (const rule of RULES) {
    for (const re of rule.patterns) {
      const m = source.match(re);
      if (!m) continue;
      const value = rule.read(m);
      if (value == null) continue;
      found.push({ key: rule.key, value, excerpt: clean(m[0]) });
      break;
    }
  }
  return found;
}

/** The detections as a plain object (the shape host forms apply). */
export function toProfileFields(fields: ExtractedField[]): ExtractedProfileFields {
  const out: ExtractedProfileFields = {};
  for (const field of fields) {
    (out as Record<string, number | string>)[field.key] = field.value;
  }
  return out;
}
