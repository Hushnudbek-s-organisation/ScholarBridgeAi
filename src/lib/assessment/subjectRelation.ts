/**
 * Canonical subject relation — the ONE place a student subject is compared with
 * a programme field for the assessment surface.
 *
 * RELATION TYPES (in priority order, spec §5)
 * -------------------------------------------
 *  1. `identity`  — the same confirmed subject identity / real alias → 1.
 *  2. `accepted_equivalent` — another subject the student explicitly accepted
 *     as equal → 1.
 *  3. `related`   — a confirmed related subject from the curated, versioned
 *     table → a heuristic value (never an admissions finding).
 *  4. `lexical_candidate` — only common words → a candidate for REVIEW. It is
 *     NOT a confident match, so it carries no similarity.
 *  5. `unrelated` — a confirmed mismatch → 0.
 *  6. `unknown`   — not enough evidence → null (never 0, never 0.5).
 *
 * WHY GENERIC WORDS ARE EXCLUDED
 * ------------------------------
 * "Science", "studies", "applied", "management" and similar words appear in
 * dozens of unrelated titles. Matching on them alone would make Data Science
 * and Political Science look related, so they cannot establish an overlap: a
 * shared generic word is at most a lexical candidate for a human to check.
 *
 * The curated groups come from `subjectAffinity.ts` (the existing alias/synonym
 * tables). This module does not invent a new taxonomy; it only distinguishes
 * what those tables MEAN (identity vs related vs nothing).
 */

import {
  normalizeSubject,
  subjectAffinity,
  subjectWords,
  SUBJECT_SIMILARITY_BY_LEVEL,
} from "@/lib/subjectAffinity";
import { SUBJECT_RELATED_SIMILARITY, SUBJECT_RULES_VERSION } from "./version";

export type SubjectRelationType =
  | "identity"
  | "accepted_equivalent"
  | "related"
  | "lexical_candidate"
  | "unrelated"
  | "unknown";

/**
 * One curated related-subject value. The repository does NOT ship a numeric
 * relatedness table of its own (only identity/synonym groups), so these entries
 * come from data a caller supplies and are always reported as heuristics with
 * their own version — no table is invented here.
 */
export interface SubjectRelatedEntry {
  from: string;
  to: string;
  /** 0–1 heuristic value, e.g. 0.65 for a curated "related" pair. */
  similarity: number;
  /** Version of the table this value came from. */
  version: string;
  note?: string | null;
}

export interface SubjectRelationMatch {
  relation: SubjectRelationType;
  /** 0–1 similarity, or null when the relation cannot be scored. */
  similarity: number | null;
  /** Stable rule id + version that produced this verdict. */
  ruleId: string;
  ruleVersion: string;
  /** True when the value comes from a curated heuristic table, not evidence. */
  heuristic: boolean;
  /** Human-readable, publishable explanation (never a probability claim). */
  note: string;
  /** Which of the student's interests produced the best relation. */
  matchedInterest: string | null;
}

/**
 * Words that are too generic to establish a subject relation on their own.
 * They may still be part of a longer meaningful title ("Data Science" keeps
 * "data"), but sharing only these words is not a match.
 */
export const GENERIC_SUBJECT_TOKENS = new Set([
  "science", "sciences", "studies", "study", "applied", "general",
  "management", "technology", "technologies", "programme", "program",
  "course", "courses", "major", "degree", "advanced", "fundamentals",
  "principles", "introduction", "topics", "issues", "research",
]);

/** Meaningful (non-generic) word set of a label. */
export function meaningfulSubjectTokens(value: string | null | undefined): Set<string> {
  const out = new Set<string>();
  for (const token of subjectWords(normalizeSubject(value))) {
    if (!GENERIC_SUBJECT_TOKENS.has(token)) out.add(token);
  }
  return out;
}

const IDENTITY_TOKENS: Record<string, string> = {
  computing: "computer",
  computer: "computer",
  informatics: "computer",
  information: "computer",
  software: "computer",
  it: "computer",
  ai: "ai",
  ml: "ai",
  maths: "mathematics",
  math: "mathematics",
  datascience: "data",
};

/** Canonical token signature used to recognise a real alias. */
function identitySignature(value: string | null | undefined): string {
  const tokens = [...meaningfulSubjectTokens(value)]
    .map((token) => IDENTITY_TOKENS[token] ?? token)
    .sort();
  return tokens.join("|");
}

const asNote = (text: string) => text;

/**
 * Compare one student interest with one programme field.
 * `acceptedEquivalents` are subjects the student explicitly declared equal.
 */
export function evaluateSubjectRelationDetail(
  interest: string | null | undefined,
  programmeField: string | null | undefined,
  acceptedEquivalents: string[] = [],
  relatedTable: SubjectRelatedEntry[] = []
): SubjectRelationMatch {
  const base: Omit<SubjectRelationMatch, "relation" | "similarity" | "note"> = {
    ruleId: "subject-relation",
    ruleVersion: SUBJECT_RULES_VERSION,
    heuristic: false,
    matchedInterest: interest?.trim() || null,
  };
  const interestText = (interest ?? "").trim();
  const fieldText = (programmeField ?? "").trim();

  if (!interestText) {
    return {
      ...base,
      relation: "unknown",
      similarity: null,
      note: asNote("The student has not chosen a subject, so no subject relation can be established."),
    };
  }
  if (!fieldText) {
    return {
      ...base,
      relation: "unknown",
      similarity: null,
      note: asNote("The programme does not publish a subject field, so no subject relation can be established."),
    };
  }

  for (const equivalent of acceptedEquivalents) {
    const sameAsInterest = identitySignature(equivalent) === identitySignature(interestText);
    const sameAsField = identitySignature(equivalent) === identitySignature(fieldText);
    if (sameAsInterest && sameAsField) {
      return {
        ...base,
        relation: "accepted_equivalent",
        similarity: 1,
        note: asNote("The student explicitly accepted this subject as equal to the programme's field."),
      };
    }
  }

  const affinity = subjectAffinity([interestText], fieldText);
  const signatureMatch = identitySignature(interestText) === identitySignature(fieldText);

  // A curated related pair overrides the generic group value: it is the more
  // specific statement, and it carries its own version and note.
  const curated = relatedTable.find(
    (entry) =>
      (identitySignature(entry.from) === identitySignature(interestText) &&
        identitySignature(entry.to) === identitySignature(fieldText)) ||
      (identitySignature(entry.from) === identitySignature(fieldText) &&
        identitySignature(entry.to) === identitySignature(interestText))
  );

  if (affinity.level === "exact" || signatureMatch) {
    return {
      ...base,
      relation: "identity",
      similarity: 1,
      note: asNote("Same confirmed subject identity or a recorded alias of it."),
    };
  }

  if (affinity.level === "unknown") {
    return { ...base, relation: "unknown", similarity: null, note: asNote("No comparable subject data.") };
  }

  if (curated && !signatureMatch) {
    const similarity = Math.min(1, Math.max(0, curated.similarity));
    return {
      ...base,
      relation: "related",
      similarity,
      heuristic: true,
      ruleId: "subject-curated-related-pair",
      ruleVersion: curated.version,
      note: asNote(
        curated.note ??
          `Curated related subject (heuristic value ${similarity}, table ${curated.version}). ` +
            "This is an editorial relation, not a published similarity or a classification percentage."
      ),
    };
  }

  if (affinity.level === "synonym") {
    return {
      ...base,
      relation: "related",
      similarity: SUBJECT_RELATED_SIMILARITY,
      heuristic: true,
      ruleId: "subject-curated-group",
      note: asNote(
        `Curated related subject (heuristic value ${SUBJECT_RELATED_SIMILARITY}, ${SUBJECT_RULES_VERSION}). ` +
          "Group membership is an editorial relation, not a CIP/ISCED classification or a published similarity."
      ),
    };
  }

  const interestMeaningful = meaningfulSubjectTokens(interestText);
  const fieldMeaningful = meaningfulSubjectTokens(fieldText);
  const sharedMeaningful = [...interestMeaningful].filter((token) => fieldMeaningful.has(token));

  // A word-overlap relation needs a meaningfully identifying word on BOTH sides:
  // a bare "Science"/"Studies"/"Management" cannot establish a relation.
  if (sharedMeaningful.length > 0 && interestMeaningful.size > 0 && fieldMeaningful.size > 0) {
    if (affinity.level === "partial" || affinity.level === "weak") {
      return {
        ...base,
        relation: "related",
        similarity: SUBJECT_SIMILARITY_BY_LEVEL.partial,
        heuristic: true,
        ruleId: "subject-shared-meaningful-word",
        note: asNote(
          `Shares the meaningful subject word(s) ${sharedMeaningful.join(", ")}. ` +
            `Heuristic value ${SUBJECT_SIMILARITY_BY_LEVEL.partial}; confirm the programme's actual field.`
        ),
      };
    }
  }

  // Only generic words in common → a candidate a human must check, never a match.
  const genericShared = [...subjectWords(normalizeSubject(interestText))].filter(
    (token) => GENERIC_SUBJECT_TOKENS.has(token) && subjectWords(normalizeSubject(fieldText)).has(token)
  );
  if (genericShared.length > 0) {
    return {
      ...base,
      relation: "lexical_candidate",
      similarity: null,
      ruleId: "subject-generic-word-candidate",
      note: asNote(
        `Only generic word(s) ${genericShared.join(", ")} are shared. This is a candidate to check, ` +
          "not a confirmed subject relation, so it does not produce a numeric fit."
      ),
    };
  }

  // One side identifies no subject at all ("Science", "Studies") → unknown.
  if (interestMeaningful.size === 0 || fieldMeaningful.size === 0) {
    return {
      ...base,
      relation: "unknown",
      similarity: null,
      ruleId: "subject-insufficient-evidence",
      note: asNote("One side names no identifiable subject, so no relation can be established."),
    };
  }

  if (affinity.level === "none") {
    return {
      ...base,
      relation: "unrelated",
      similarity: 0,
      note: asNote(
        "The curated tables record no relation between these subjects. " +
          "This reports a difference, not a proven impossibility."
      ),
    };
  }

  return {
    ...base,
    relation: "lexical_candidate",
    similarity: null,
    ruleId: "subject-insufficient-evidence",
    note: asNote("Not enough evidence to decide whether these subjects are related; flagged for review."),
  };
}

/**
 * Best relation across the student's interests. A tie for the best value is
 * resolved by the FIRST interest, never by the order of the catalogue list.
 */
export function evaluateSubjectRelation(
  interests: string[] | null | undefined,
  programmeField: string | null | undefined,
  acceptedEquivalents: string[] = [],
  relatedTable: SubjectRelatedEntry[] = []
): SubjectRelationMatch {
  const list = (interests ?? []).map((item) => item.trim()).filter(Boolean);
  if (!list.length) {
    return evaluateSubjectRelationDetail(null, programmeField, acceptedEquivalents, relatedTable);
  }

  let best: SubjectRelationMatch | null = null;
  for (const interest of list) {
    const candidate = evaluateSubjectRelationDetail(interest, programmeField, acceptedEquivalents, relatedTable);
    if (!best) {
      best = candidate;
      continue;
    }
    const bestScore = best.similarity;
    const candidateScore = candidate.similarity;
    // A scored relation always beats an unscored one; otherwise keep the first
    // (never use list order as an implicit ranking).
    if (candidateScore != null && (bestScore == null || candidateScore > bestScore)) best = candidate;
    else if (candidateScore != null && bestScore != null && candidateScore === bestScore) continue;
    else if (bestScore == null && candidateScore == null) {
      const rank = (relation: SubjectRelationType) =>
        relation === "lexical_candidate" ? 2 : relation === "unknown" ? 1 : 0;
      if (rank(candidate.relation) > rank(best.relation)) best = candidate;
    }
  }
  return best!;
}
