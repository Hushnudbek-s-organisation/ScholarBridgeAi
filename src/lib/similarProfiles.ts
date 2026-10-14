/**
 * Opt-in historical application-outcome examples (#10).
 *
 * This module chooses which consented, de-identified outcome examples to show
 * beside a student's profile. The overlap score is a display-order heuristic
 * only: it is not calibrated for admissions, is not returned to clients, and
 * must never be presented as an admission likelihood or a profile-fit score.
 *
 * Missing or incomparable values are excluded from the comparison rather than
 * treated as a negative. Outcomes without a recognized decision are excluded
 * instead of being assigned a fabricated rejection.
 */

export interface ProfileVector {
  /** GPA normalized only when the stored grading scale is explicitly known. */
  gpa4?: number | null;
  ielts?: number | null;
  toefl?: number | null;
  sat?: number | null;
  act?: number | null;
  major?: string | null;
  country?: string | null;
  degreeLevel?: string | null;
}

export const OUTCOME_RESULTS = ["accepted", "rejected", "waitlisted", "deferred", "withdrawn"] as const;
export type OutcomeResult = (typeof OUTCOME_RESULTS)[number];

export type SimilarityField = "gpa" | "englishTest" | "standardizedTest" | "major" | "country" | "degreeLevel";

export interface OutcomeRecord {
  profile: ProfileVector;
  /** Null when neither linked university nor application names the institution. */
  universityName: string | null;
  result: OutcomeResult;
  /** Only rows with explicit consent may be passed in. Rechecked below. */
  shareConsent: boolean;
}

export interface SimilarProfile {
  universityName: string | null;
  result: OutcomeResult;
  /** Fields with values on both records; this is descriptive, not an advantage claim. */
  comparedFields: SimilarityField[];
}

export interface SimilarityResult {
  matches: SimilarProfile[];
  /** All records meeting the display heuristic, before the response limit. */
  total: number;
}

/** Consent is opt-in: only the literal JSON boolean true grants sharing consent. */
export function hasExplicitOutcomeShareConsent(value: unknown): boolean {
  return value === true;
}

/** Convert a recognized outcome to its canonical lower-case value; unknown is not rejection. */
export function normalizeOutcomeResult(value: unknown): OutcomeResult | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return (OUTCOME_RESULTS as readonly string[]).includes(normalized) ? (normalized as OutcomeResult) : null;
}

/**
 * Convert only when the student/outcome's grading scale is explicit and valid.
 * A missing scale is unknown, not an assumed 4.0 scale.
 */
export function gpaTo4(gpa: number | null | undefined, scale: number | null | undefined): number | null {
  if (gpa == null || scale == null) return null;
  const value = Number(gpa);
  const max = Number(scale);
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0 || value < 0 || value > max) return null;
  return (value / max) * 4;
}

function finiteNumber(value: number | null | undefined, allowZero = false): number | null {
  if (value == null || !Number.isFinite(Number(value))) return null;
  const number = Number(value);
  return (allowZero ? number >= 0 : number > 0) ? number : null;
}

/** A normalized distance only exists when both records have comparable values. */
function numericSimilarity(
  a: number | null | undefined,
  b: number | null | undefined,
  span: number,
  allowZero = false
): number | null {
  const left = finiteNumber(a, allowZero);
  const right = finiteNumber(b, allowZero);
  if (left == null || right == null) return null;
  return 1 - Math.min(1, Math.abs(left - right) / span);
}

function normalizedText(value: string | null | undefined): string | null {
  const normalized = typeof value === "string" ? value.trim().toLocaleLowerCase() : "";
  return normalized || null;
}

function majorTokens(value: string | null | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .toLocaleLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((token) => token.length > 2)
  );
}

/** Jaccard overlap for known field labels; absent/unparseable labels stay unknown. */
function majorSimilarity(a: string | null | undefined, b: string | null | undefined): number | null {
  const left = majorTokens(a);
  const right = majorTokens(b);
  if (left.size === 0 || right.size === 0) return null;
  let shared = 0;
  left.forEach((token) => {
    if (right.has(token)) shared += 1;
  });
  return shared / (left.size + right.size - shared);
}

interface ScoredProfile {
  score: number;
  comparedFields: SimilarityField[];
}

/**
 * Equal-weight overlap across known, directly comparable profile dimensions.
 * IELTS is compared only with IELTS, TOEFL only with TOEFL, and likewise SAT
 * with SAT and ACT with ACT; no cross-test or grading-scale conversions are
 * invented. Missing dimensions do not lower or inflate the score.
 */
export function similarityScore(me: ProfileVector, other: ProfileVector): ScoredProfile {
  const comparisons: { field: SimilarityField; score: number }[] = [];
  const add = (field: SimilarityField, score: number | null) => {
    if (score != null && Number.isFinite(score)) comparisons.push({ field, score: Math.max(0, Math.min(1, score)) });
  };

  add("gpa", numericSimilarity(me.gpa4, other.gpa4, 0.8, true));

  // Compare the same English test only. If both IELTS and TOEFL are available,
  // use one shared test type (IELTS first) so English is not double-weighted.
  if (finiteNumber(me.ielts) != null && finiteNumber(other.ielts) != null) {
    add("englishTest", numericSimilarity(me.ielts, other.ielts, 1.2));
  } else if (finiteNumber(me.toefl) != null && finiteNumber(other.toefl) != null) {
    add("englishTest", numericSimilarity(me.toefl, other.toefl, 40));
  }

  // Standardized tests are also compared within the same exam only.
  if (finiteNumber(me.sat) != null && finiteNumber(other.sat) != null) {
    add("standardizedTest", numericSimilarity(me.sat, other.sat, 250));
  } else if (finiteNumber(me.act) != null && finiteNumber(other.act) != null) {
    add("standardizedTest", numericSimilarity(me.act, other.act, 6));
  }

  add("major", majorSimilarity(me.major, other.major));

  const homeCountry = normalizedText(me.country);
  const otherCountry = normalizedText(other.country);
  if (homeCountry && otherCountry) add("country", homeCountry === otherCountry ? 1 : 0);

  const degreeLevel = normalizedText(me.degreeLevel);
  const otherDegreeLevel = normalizedText(other.degreeLevel);
  if (degreeLevel && otherDegreeLevel) add("degreeLevel", degreeLevel === otherDegreeLevel ? 1 : 0);

  const mean = comparisons.length > 0
    ? comparisons.reduce((sum, comparison) => sum + comparison.score, 0) / comparisons.length
    : 0;
  return {
    score: Math.round(mean * 100),
    comparedFields: comparisons.map(({ field }) => field),
  };
}

/**
 * Select a small list of opt-in historical examples. The score and cutoff are
 * deliberately internal; callers receive neither a percentage nor outcome-
 * derived guidance. At least two known dimensions are needed to avoid calling
 * a one-field coincidence a similar profile.
 */
export function findSimilarProfiles(
  me: ProfileVector,
  outcomes: OutcomeRecord[],
  opts: { limit?: number; minSimilarity?: number } = {}
): SimilarityResult {
  const requestedLimit = Number(opts.limit ?? 10);
  const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(50, Math.floor(requestedLimit))) : 10;
  const requestedThreshold = Number(opts.minSimilarity ?? 45);
  const minSimilarity = Number.isFinite(requestedThreshold) ? Math.max(0, Math.min(100, requestedThreshold)) : 45;

  // Defense in depth: the API filters in SQL too; never relax the consent check here.
  const scored = outcomes
    .filter((outcome) => hasExplicitOutcomeShareConsent(outcome.shareConsent))
    .flatMap((outcome) => {
      const result = normalizeOutcomeResult(outcome.result);
      if (!result) return [];
      const comparison = similarityScore(me, outcome.profile);
      if (comparison.comparedFields.length < 2 || comparison.score < minSimilarity) return [];
      return [{ outcome, result, comparison }];
    })
    .sort((a, b) =>
      b.comparison.score - a.comparison.score ||
      (a.outcome.universityName ?? "").localeCompare(b.outcome.universityName ?? "")
    );

  return {
    total: scored.length,
    matches: scored.slice(0, limit).map(({ outcome, result, comparison }) => ({
      universityName: outcome.universityName,
      result,
      comparedFields: comparison.comparedFields,
    })),
  };
}
