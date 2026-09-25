/**
 * Scholarship essay adapter (#18).
 *
 * One essay, many scholarships: deterministic per-scholarship fit scoring
 * plus a concrete adaptation plan.
 *
 * The lib stays pure — no DB, no network, no AI — so it is fully unit-testable
 * and every number it reports is reproducible:
 *   1. word-count limit parsed from the scholarship's published requirements
 *   2. theme overlap between the essay and what the scholarship emphasises
 *   3. major and country eligibility
 *   4. GPA and English minimums against the student's real scores
 *
 * What it refuses to do: invent a limit the scholarship never published,
 * guess eligibility when the profile field is empty (that is reported as a
 * gap, not a pass), or rewrite the essay — the AI rewrite lives in
 * /api/essay-adapter/adapt and degrades to this deterministic plan when the
 * model is unavailable.
 */

import { majorSimilarity, normalizedGpa, parseListColumn } from "./chancing";

export interface EssayInput {
  text: string;
  wordCount?: number;
}

export interface ScholarshipInput {
  id: number;
  title: string;
  description?: string | null;
  requirements?: string | null;
  eligibleMajors?: string | null; // JSON list column
  financialNeedBased?: boolean | null;
  minGpa?: number | null;
  minIelts?: number | null;
  eligibleCountries?: string | null; // JSON list column
}

export interface AdapterProfile {
  major?: string | null;
  country?: string | null;
  gpa?: number | null;
  gpaScale?: number | null;
  ieltsScore?: number | null;
  toeflScore?: number | null;
}

export interface WordLimit {
  min?: number;
  max?: number;
}

export interface EssayFit {
  scholarshipId: number;
  title: string;
  /** 0–100, sum of the six weighted signals below. */
  fit: number;
  /** Human-readable signals that passed. */
  matched: string[];
  /** Human-readable signals that failed. */
  gaps: string[];
  /** Machine codes driving the adaptation plan. */
  codes: string[];
  wordCount: number;
}

const round = (n: number) => Math.round(n);
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function wordCountOf(essay: EssayInput): number {
  if (typeof essay.wordCount === "number" && essay.wordCount > 0) return essay.wordCount;
  const t = essay.text.trim();
  return t ? t.split(/\s+/).length : 0;
}

/**
 * Parse a word-count limit out of free-form requirements text.
 * Handles "at least 500 words", "no more than / up to / at most / maximum N
 * words" and "500–800 words" ranges. Returns {} when nothing is stated — we
 * do not invent a limit the scholarship never published.
 */
export function parseWordLimit(text: string | null | undefined): WordLimit {
  const src = (text ?? "").toLowerCase();
  const limit: WordLimit = {};

  const range = src.match(/(\d{2,5})\s*[-–—]\s*(\d{2,5})\s*words?\b/);
  if (range) return { min: Number(range[1]), max: Number(range[2]) };

  const minM = src.match(/\b(?:at least|min(?:imum)?(?: of)?|no fewer than)\s+(\d{2,5})\s*words?\b/);
  if (minM) limit.min = Number(minM[1]);
  const maxM = src.match(
    /\b(?:no more than|not more than|at most|up to|maximum(?: of)?|max(?:imum)?(?: of)?)\s+(\d{2,5})\s*words?\b/
  );
  if (maxM) limit.max = Number(maxM[1]);
  return limit;
}

// ---------------------------------------------------------------------------
// Themes
// ---------------------------------------------------------------------------

export type ThemeKey =
  | "leadership"
  | "community"
  | "research"
  | "career"
  | "financialNeed"
  | "diversity"
  | "experience";

export const THEME_LABEL: Record<ThemeKey, string> = {
  leadership: "leadership",
  community: "community service",
  research: "research",
  career: "career goals",
  financialNeed: "financial need",
  diversity: "background and diversity",
  experience: "practical experience",
};

const THEME_KEYWORDS: Record<ThemeKey, string[]> = {
  leadership: ["leadership", "leader", "captain", "president", "chair", "organize", "organized", "initiat", "cofound", "co-founder", "managed", "head of"],
  community: ["community", "volunteer", "volunteering", "service", "nonprofit", "ngo", "charity", "mentor", "outreach"],
  research: ["research", "laboratory", "publication", "experiment", "scientific", "thesis", "independent study"],
  career: ["career", "profession", "become", "work in", "industry", "aspirations"],
  financialNeed: ["financial need", "financially", "afford", "economic hardship", "family income", "low income", "need-based", "funding"],
  diversity: ["diversity", "background", "culture", "immigrant", "refugee", "international", "multicultural"],
  experience: ["experience", "internship", "project", "practical", "hands-on"],
};

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countHits(text: string, keyword: string): number {
  if (!keyword) return 0;
  const t = text.toLowerCase();
  if (keyword.includes(" ")) {
    let n = 0;
    let i = 0;
    while ((i = t.indexOf(keyword, i)) !== -1) {
      n++;
      i += keyword.length;
    }
    return n;
  }
  const re = new RegExp(`\\b${escapeRegExp(keyword)}\\b`, "g");
  return (t.match(re) ?? []).length;
}

/** How many times each theme family appears in a text. */
export function themeCounts(text: string): Record<ThemeKey, number> {
  const src = text.toLowerCase();
  const out = {} as Record<ThemeKey, number>;
  for (const [fam, kws] of Object.entries(THEME_KEYWORDS) as [ThemeKey, string[]][]) {
    out[fam] = kws.reduce((n, kw) => n + countHits(src, kw), 0);
  }
  return out;
}

/** Which themes the scholarship text actually emphasises (order = presence). */
export function scholarshipThemes(sh: ScholarshipInput): ThemeKey[] {
  const text = `${sh.title ?? ""} ${sh.description ?? ""} ${sh.requirements ?? ""}`;
  const counts = themeCounts(text);
  const fams = (Object.keys(counts) as ThemeKey[]).filter((f) => counts[f] > 0);
  if (sh.financialNeedBased && !fams.includes("financialNeed")) fams.push("financialNeed");
  return fams;
}

// ---------------------------------------------------------------------------
// Fit scoring
// ---------------------------------------------------------------------------

/**
 * Score one essay against one scholarship for one profile.
 *
 * Signal weights (sum = 100): word count 20 · themes 30 · major 15 ·
 * country 10 · GPA 10 · English 15. Unpublished criteria give a neutral
 * partial credit, never a full pass and never a failure.
 */
export function scoreEssayFit(essay: EssayInput, sh: ScholarshipInput, profile: AdapterProfile): EssayFit {
  const matched: string[] = [];
  const gaps: string[] = [];
  const codes: string[] = [];
  let fit = 0;

  const wc = wordCountOf(essay);

  // 1. Word count (0–20).
  const limit = parseWordLimit(sh.requirements);
  if (limit.min == null && limit.max == null) {
    fit += 15;
    matched.push(`no word limit published (${wc} words)`);
  } else {
    const under = limit.min != null && wc < limit.min;
    const over = limit.max != null && wc > limit.max;
    if (!under && !over) {
      fit += 20;
      const range =
        limit.min != null && limit.max != null
          ? ` of ${limit.min}–${limit.max}`
          : limit.min != null
            ? ` of at least ${limit.min}`
            : ` of ${limit.max}`;
      matched.push(`${wc} words is within the published limit${range}`);
    } else if ((under && limit.min != null && wc >= limit.min * 0.9) || (over && limit.max != null && wc <= limit.max * 1.1)) {
      fit += 10;
      codes.push(under ? "word_limit_below" : "word_limit_over");
      gaps.push(under ? `${wc} words is just under the ${limit.min}-word minimum` : `${wc} words is just over the ${limit.max}-word cap`);
    } else {
      codes.push(under ? "word_limit_below" : "word_limit_over");
      gaps.push(under ? `${wc} words is below the ${limit.min}-word minimum` : `${wc} words exceeds the ${limit.max}-word cap`);
    }
  }

  // 2. Theme overlap (0–30). Each theme the scholarship names counts up to 2
  // mentions in the essay; themes it never names can never be a gap.
  const shThemes = scholarshipThemes(sh);
  const essayCounts = themeCounts(essay.text);
  if (shThemes.length === 0) {
    fit += 18;
    matched.push("no specific themes stated in the scholarship text");
  } else {
    const coverage = shThemes.reduce((n, fam) => n + Math.min(essayCounts[fam], 2), 0) / (2 * shThemes.length);
    fit += round(coverage * 30);
    const present = shThemes.filter((f) => essayCounts[f] > 0);
    const missing = shThemes.filter((f) => essayCounts[f] === 0);
    if (present.length) matched.push(`essay covers ${present.map((f) => THEME_LABEL[f]).join(", ")} — themes the scholarship emphasises`);
    for (const fam of missing) {
      codes.push(`theme_missing:${fam}`);
      gaps.push(`essay does not mention ${THEME_LABEL[fam]}, which the scholarship asks for`);
    }
  }

  // 3. Major (0–15).
  const majors = parseListColumn(sh.eligibleMajors);
  const openToAll = majors.length === 0 || majors.some((m) => m.trim().toLowerCase() === "all");
  if (openToAll) {
    fit += 12;
    matched.push("open to all majors");
  } else if (!profile.major?.trim()) {
    fit += 5;
    codes.push("major_unknown");
    gaps.push("your major is not set in the profile — eligibility cannot be verified");
  } else {
    const best = Math.max(...majors.map((m) => majorSimilarity(profile.major, m)));
    if (best >= 0.5) {
      fit += round(best * 15);
      matched.push(`major "${profile.major}" matches the eligible list`);
    } else {
      codes.push("major_mismatch");
      gaps.push(`major "${profile.major}" is not in the eligible list`);
    }
  }

  // 4. Country (0–10).
  const countries = parseListColumn(sh.eligibleCountries);
  if (countries.length === 0) {
    fit += 8;
    matched.push("no country restriction published");
  } else if (profile.country?.trim()) {
    const ok = countries.some((c) => c.trim().toLowerCase() === profile.country!.trim().toLowerCase());
    if (ok) {
      fit += 10;
      matched.push(`eligible country: ${profile.country}`);
    } else {
      codes.push("country_ineligible");
      gaps.push(`${profile.country} is not in the eligible countries list`);
    }
  } else {
    fit += 4;
    codes.push("country_unknown");
    gaps.push("your country is not set in the profile — eligibility cannot be verified");
  }

  // 5. GPA (0–10).
  const gpa4 = normalizedGpa({ gpa: profile.gpa ?? null, gpaScale: profile.gpaScale ?? null });
  if (sh.minGpa == null) {
    fit += 8;
    matched.push("no GPA minimum published");
  } else if (gpa4 == null) {
    fit += 4;
    codes.push("gpa_unknown");
    gaps.push(`GPA minimum is ${sh.minGpa} but no GPA is set in the profile`);
  } else if (gpa4 >= sh.minGpa) {
    fit += 10;
    matched.push(`GPA ${gpa4.toFixed(2)}/4.0 meets the ${sh.minGpa} minimum`);
  } else {
    codes.push("gpa_below_min");
    gaps.push(`GPA ${gpa4.toFixed(2)}/4.0 is below the ${sh.minGpa} minimum`);
  }

  // 6. English (0–15). TOEFL is converted the same way the rest of the
  // product does: (t − 40) / 12.
  const english =
    profile.ieltsScore != null && profile.ieltsScore > 0
      ? profile.ieltsScore
      : profile.toeflScore != null && profile.toeflScore > 0
        ? (profile.toeflScore - 40) / 12
        : null;
  if (sh.minIelts == null) {
    fit += 12;
    matched.push("no English minimum published");
  } else if (english == null) {
    fit += 5;
    codes.push("english_missing");
    gaps.push(`English minimum is IELTS ${sh.minIelts} but no test score is on file`);
  } else if (english >= sh.minIelts) {
    fit += 15;
    matched.push(`English ${english.toFixed(1)} (IELTS equivalent) meets the ${sh.minIelts} minimum`);
  } else {
    codes.push("english_below_min");
    gaps.push(`English ${english.toFixed(1)} (IELTS equivalent) is below the ${sh.minIelts} minimum`);
  }

  return {
    scholarshipId: sh.id,
    title: sh.title,
    fit: clamp(round(fit), 0, 100),
    matched,
    gaps,
    codes,
    wordCount: wc,
  };
}

// ---------------------------------------------------------------------------
// Adaptation plan
// ---------------------------------------------------------------------------

/**
 * Concrete per-gap adaptation steps. Deterministic: it tells the student what
 * to change and why — it never rewrites the essay itself.
 */
export function adaptationPlan(fit: EssayFit, sh: ScholarshipInput, essay: EssayInput): string[] {
  const plan: string[] = [];
  const limit = parseWordLimit(sh.requirements);

  for (const code of fit.codes) {
    switch (code) {
      case "word_limit_over":
        plan.push(
          `Cut ~${Math.max(0, fit.wordCount - (limit.max ?? 0))} words to get under the ${limit.max}-word cap — trim the opening and merge duplicate examples; keep the strongest story.`
        );
        break;
      case "word_limit_below":
        plan.push(
          `Expand to at least ${limit.min} words: add one concrete example with a measurable outcome (a number, a time frame, people affected).`
        );
        break;
      case "major_mismatch":
        plan.push("Check the scholarship's eligible majors before applying — if your field is close, name your related coursework explicitly in the essay.");
        break;
      case "major_unknown":
        plan.push("Set your major in the profile so eligibility can be verified against the eligible list.");
        break;
      case "country_ineligible":
        plan.push("Your country is not in the published eligible list — verify with the provider before investing time.");
        break;
      case "country_unknown":
        plan.push("Set your country in the profile so eligibility can be verified.");
        break;
      case "gpa_below_min":
        plan.push("Your GPA is below the stated minimum — do not hide it: ask the recommender to stress the upward trend and your strongest courses.");
        break;
      case "gpa_unknown":
        plan.push("Add your GPA and scale to the profile so the minimum can be checked honestly.");
        break;
      case "english_below_min":
        plan.push("Your English score is below the minimum — retake the test or check whether the scholarship accepts alternatives (TOEFL, Duolingo).");
        break;
      case "english_missing":
        plan.push("No English test score on file — take one (IELTS, TOEFL or Duolingo) or confirm the scholarship accepts your background.");
        break;
      default:
        if (code.startsWith("theme_missing:")) {
          const fam = code.split(":")[1] as ThemeKey;
          switch (fam) {
            case "financialNeed":
              plan.push("Add 1–2 sentences on your financial situation and why this funding matters — family context, not complaints.");
              break;
            case "leadership":
              plan.push("Add a short leadership paragraph: the role, how long you held it, and one measurable outcome.");
              break;
            case "community":
              plan.push("Add a community-service moment: who benefited, and what you learned from it.");
              break;
            case "research":
              plan.push("Mention concrete research: the question, the method, and what you found.");
              break;
            case "career":
              plan.push("Tie the ending to a specific career goal that the scholarship's mission supports.");
              break;
            case "diversity":
              plan.push("Add one line on how your background shapes your perspective — facts, not identity claims.");
              break;
            case "experience":
              plan.push("Name one concrete project or internship with the outcome it produced.");
              break;
          }
        }
    }
  }

  if (!plan.length) {
    plan.push("The essay aligns well — read it once against the scholarship's own wording and swap 2–3 generic phrases for its terms.");
  }

  // Name the scholarship if the essay never does.
  const titleWords = (sh.title ?? "")
    .split(/\s+/)
    .filter((w) => w.length > 4)
    .map((w) => w.toLowerCase());
  if (titleWords.length && !titleWords.some((w) => essay.text.toLowerCase().includes(w))) {
    plan.push(`Name the scholarship explicitly in the first two paragraphs (currently "${sh.title}" is not mentioned).`);
  }
  return plan;
}

/** Rank many scholarships for one essay; deterministic tie-break by id. */
export function rankScholarships(essay: EssayInput, profile: AdapterProfile, shs: ScholarshipInput[]): EssayFit[] {
  return shs
    .map((sh) => scoreEssayFit(essay, sh, profile))
    .sort((a, b) => b.fit - a.fit || a.scholarshipId - b.scholarshipId);
}
