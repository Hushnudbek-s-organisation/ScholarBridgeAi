/**
 * Subject relatedness — the ONE place two field names are compared.
 *
 * WHY THIS MODULE EXISTS
 * ----------------------
 * Three engines used to answer "is this the student's field?" differently:
 *   • `recommend.ts`      — curated synonym groups + word overlap (best);
 *   • `matching.ts`       — the same engine PLUS canonical tokens;
 *   • `chancing.ts`       — plain word overlap (`majorSimilarity`).
 *
 * The result was visible inside a single API response: the fit engine said
 * "Offers your field: Informatics & Data Engineering" (+12) while the chancing
 * narrative said "Your major (Computer Science) is a shift from Informatics &
 * Data Engineering" — about the same student and the same university.
 *
 * Everything subject-related now lives here and is imported by all of them, so
 * the same two labels always produce the same verdict.
 *
 * The matching is deliberately conservative:
 *   • the synonym groups are hand-curated, not invented on the fly;
 *   • an unknown/blank side is "unknown" (never a mismatch, never a match);
 *   • unrelated fields are "none" — a real, reportable difference.
 */

/** Normalise a subject label for comparison (case, punctuation, spacing). */
export function normalizeSubject(s: string | null | undefined): string {
  return (s || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Conservative synonym groups. A student writing any member matches the
 * others at "synonym" strength. Deliberately small: an unknown pair falls to
 * word overlap, and unknown stays unknown — relationships are not guessed.
 */
export const SYNONYM_GROUPS: string[][] = [
  ["computer science", "computing", "computer engineering", "software engineering", "information technology", "it", "computer systems", "informatics", "information systems", "applied computing"],
  ["data science", "data analytics", "big data", "statistics", "statistical science", "data engineering", "business analytics"],
  ["artificial intelligence", "machine learning", "ai", "deep learning"],
  ["business", "business administration", "management", "business management", "commerce"],
  ["economics", "economy"],
  ["finance", "financial management", "banking"],
  ["marketing", "business marketing"],
  ["engineering", "general engineering"],
  ["mechanical engineering", "mechanical"],
  ["electrical engineering", "electrical", "electronics", "electrical electronics"],
  ["civil engineering", "civil"],
  ["chemical engineering", "chemical"],
  ["biomedical engineering", "biomedical"],
  ["medicine", "medicines", "clinical medicine"],
  ["nursing"],
  ["psychology", "behavioural science", "behavioral science"],
  ["mathematics", "math", "applied mathematics", "pure mathematics"],
  ["physics"],
  ["chemistry", "applied chemistry"],
  ["biology", "biological sciences", "life sciences"],
  ["biotechnology", "biotech", "molecular biology"],
  ["law", "legal studies", "jurisprudence"],
  ["economics and finance"],
  ["international relations", "international relations and diplomacy", "political science", "international relations and geopolitics"],
  ["sociology"],
  ["history"],
  ["philosophy"],
  ["linguistics", "applied linguistics"],
  ["english", "english language", "english literature", "english language and literature"],
  ["journalism", "mass communications", "communications", "media studies", "media and journalism"],
  ["design", "graphic design", "industrial design", "visual arts", "art", "arts"],
  ["architecture"],
  ["education", "pedagogy", "teacher education"],
  ["social work"],
  ["geography", "geology", "geoscience", "earth sciences"],
  ["astronomy", "astrophysics", "space science"],
  ["environmental science", "environmental engineering", "environmental studies", "sustainability"],
  ["food science", "agriculture", "agronomy", "food technology"],
  ["pharmacy", "pharmaceutical sciences"],
  ["aerospace engineering", "aerospace"],
  ["aerospace and aviation"],
  ["robotics", "mechatronics", "control systems"],
  ["cybersecurity", "information security"],
  ["network engineering", "telecommunications", "communication engineering"],
  ["health sciences", "public health"],
];

const SYNONYM_TO_GROUP = new Map<string, number>();
SYNONYM_GROUPS.forEach((group, i) => {
  for (const member of group) SYNONYM_TO_GROUP.set(normalizeSubject(member), i);
});

/** Field words that denote the same subject inside a longer programme name. */
export const SUBJECT_TOKEN_CANON: Record<string, string> = {
  computing: "computer",
  computer: "computer",
  informatics: "computer",
  information: "computer",
  software: "computer",
  it: "computer",
  ml: "ai",
  ai: "ai",
  datascience: "data",
};

/** Word set of a normalised subject (drops short/stop words). */
export function subjectWords(s: string): Set<string> {
  return new Set(
    s
      .split(" ")
      // Keep 2-character tokens ("ai", "it", "ml"): dropping them made the
      // abbreviation-heavy labels real students use invisible to matching.
      .filter((w) => w.length > 1 && !["and", "the", "of", "for", "applied", "science", "sciences", "studies", "technology", "technologies"].includes(w))
  );
}

// Word-level view of the same groups: "Computer Science & Data Science" or
// "AI Systems" contain words ("informatics", "ai", "data", …) that identify
// the group even though the whole phrase is not a listed member.
const WORD_TO_GROUP = new Map<string, number>();
SYNONYM_GROUPS.forEach((group, i) => {
  for (const member of group) {
    for (const word of subjectWords(normalizeSubject(member))) {
      if (!WORD_TO_GROUP.has(word)) WORD_TO_GROUP.set(word, i);
    }
  }
});

export type SubjectFitLevel = "exact" | "synonym" | "partial" | "weak" | "none" | "unknown";

export interface SubjectFit {
  level: SubjectFitLevel;
  /** 0–1 affinity used for ranking (never shown as a probability). */
  score: number;
  matchedInterests: string[];
}

/** Canonical tokens of a label (e.g. "Informatics & Data Engineering"). */
export function canonicalSubjectTokens(value: string | null | undefined): Set<string> {
  return new Set(subjectTokens(value).map((t) => SUBJECT_TOKEN_CANON[t] ?? t));
}

/**
 * Word tokens of a label, keeping 2-character tokens and dropping only
 * pure stop words. This is the tokenizer the whole app shares.
 */
export function subjectTokens(value: string | null | undefined): string[] {
  return (value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !SUBJECT_STOP_WORDS.has(w));
}

export const SUBJECT_STOP_WORDS = new Set([
  "and", "the", "of", "for", "with", "in", "on", "at", "to",
]);

/**
 * Best affinity between ANY of the student's interests and the program field.
 * Levels: exact (string equality) > synonym (same curated group, or a bridge
 * through one group word) > partial (word overlap ≥1 meaningful word) >
 * weak (low overlap ratio) > none (no relation) / unknown (no interest given).
 */
export function subjectAffinity(
  interests: string[] | undefined,
  programField: string | null | undefined
): SubjectFit {
  const interestList = (interests || []).map(normalizeSubject).filter(Boolean);
  const field = normalizeSubject(programField);
  if (!interestList.length) return { level: "unknown", score: 0.5, matchedInterests: [] };
  if (!field) return { level: "none", score: 0.2, matchedInterests: [] };

  let best: SubjectFit = { level: "none", score: 0, matchedInterests: [] };
  const fieldWords = subjectWords(field);
  const fieldGroup = SYNONYM_TO_GROUP.get(field);

  for (const interest of interestList) {
    let level: SubjectFitLevel = "none";
    let score = 0;
    if (interest === field) {
      level = "exact";
      score = 1;
    } else {
      const interestGroup = SYNONYM_TO_GROUP.get(interest);
      // Full-group membership or exact group membership on the field side.
      const inSameGroup =
        fieldGroup != null &&
        interestGroup != null &&
        fieldGroup === interestGroup;
      const groupContains =
        fieldGroup != null && SYNONYM_GROUPS[fieldGroup].some((m) => normalizeSubject(m) === interest);
      if (inSameGroup || groupContains) {
        level = "synonym";
        score = 0.85;
      } else {
        const interestWords = subjectWords(interest);
        const overlap = [...interestWords].filter((w) => fieldWords.has(w));
        if (overlap.length > 0) {
          const ratio = overlap.length / Math.min(interestWords.size || 1, fieldWords.size || 1);
          level = ratio >= 0.5 ? "partial" : "weak";
          score = ratio >= 0.5 ? 0.6 : 0.35;
        } else {
          // No shared word, but the words may still belong to one synonym
          // group ("informatics" ↔ "computer", "ai" ↔ "artificial
          // intelligence"). A single-word bridge is treated as a synonym hit
          // — the groups are hand-curated, so this stays conservative.
          const bridge =
            interestGroup != null && fieldGroup != null
              ? interestGroup === fieldGroup
              : [...interestWords].some((w) => {
                  const g = WORD_TO_GROUP.get(w);
                  if (g == null) return false;
                  if (fieldGroup === g) return true;
                  return [...fieldWords].some((fw) => WORD_TO_GROUP.get(fw) === g);
                });
          level = bridge ? "synonym" : "none";
          score = bridge ? 0.85 : 0;
        }
      }
    }
    if (score > best.score) {
      best = { level, score, matchedInterests: [interest] };
    }
  }
  return best;
}

/**
 * A single 0–1 similarity for two field labels, derived from the shared
 * affinity level. Consumers that only need "how close are these fields?" —
 * chancing sub-scores, scholarship-field checks — use THIS, so they can never
 * contradict the recommender again.
 */
export const SUBJECT_SIMILARITY_BY_LEVEL: Record<SubjectFitLevel, number> = {
  exact: 1,
  synonym: 0.8,
  partial: 0.55,
  weak: 0.3,
  none: 0,
  unknown: 0.5,
};

export function subjectSimilarity(
  a: string | null | undefined,
  b: string | null | undefined
): number {
  const fit = subjectAffinity([a ?? ""], b);
  return SUBJECT_SIMILARITY_BY_LEVEL[fit.level];
}
