/**
 * Versioned product settings for the programme assessment.
 *
 * WHY A SINGLE VERSION CONSTANT
 * -----------------------------
 * A stored assessment, a cached response and an exported row must be able to
 * say WHICH rules produced them. Every formula decision in `src/lib/assessment`
 * reads its constants from here, so bumping the version is a reviewable change
 * instead of a silent drift between the dashboard, the detail page, the
 * Chancing screen and the exports.
 *
 * WHAT THESE NUMBERS ARE — AND ARE NOT
 * ------------------------------------
 *  • The preference weights are PRODUCT SETTINGS, not a validated statistical
 *    model or an admissions finding. They rank how well a programme matches
 *    what the student asked for.
 *  • `SUBJECT_RELATED_SIMILARITY` is the existing curated synonym-level value
 *    the codebase already used (`SUBJECT_SIMILARITY_BY_LEVEL.synonym`). It is a
 *    heuristic, marked as such on every match it produces, and it is NOT a
 *    CIP/ISCED classification interpreted as a percentage.
 *  • None of these numbers is an admission probability, a percentile, or a
 *    claim of accuracy.
 *
 * Pure and dependency-free (safe in API routes, React and scripts alike).
 */

/** The single scoring version stamped on every canonical assessment. */
export const SCORING_VERSION = "programme-assessment-2026-11-11.2";

/** Version of the preference axes/modes contract. */
export const PREFERENCE_SETTINGS_VERSION = "preferences-2026-11-11.1";

/** Version of the subject relation rules. */
export const SUBJECT_RULES_VERSION = "subject-rules-2026-11-11.1";

/** Version of the eligibility evaluation rules. */
export const ELIGIBILITY_RULES_VERSION = "eligibility-rules-2026-11-11.1";

/** Version of the finance arithmetic. */
export const FINANCE_RULES_VERSION = "finance-rules-2026-11-11.1";

/**
 * Preference axes and their starting weights.
 *
 * `must` axes are FILTERS and never contribute to the weighted fit, so an axis
 * can never be counted twice (once as a filter and once as a score).
 */
export const PREFERENCE_AXES = [
  "subject",
  "country",
  "teaching_language",
  "study_load",
  "delivery_mode",
] as const;

export type PreferenceAxis = (typeof PREFERENCE_AXES)[number];

export const PREFERENCE_WEIGHTS: Record<PreferenceAxis, number> = {
  subject: 60,
  country: 15,
  teaching_language: 15,
  study_load: 5,
  delivery_mode: 5,
};

/**
 * Similarity used for a curated same-group subject relation.
 *
 * This is the value the repository already shipped
 * (`SUBJECT_SIMILARITY_BY_LEVEL.synonym = 0.8`), kept so existing behaviour is
 * not silently replaced. It is a HEURISTIC and every emitted match says so.
 */
export const SUBJECT_RELATED_SIMILARITY = 0.8;

/**
 * The conservative ordering policy, documented in `docs/ASSESSMENT_MODEL.md`:
 * inside one group we order by the LOWER bound of the fit interval, then by
 * data coverage, then by a stable id. Two programmes whose intervals overlap
 * are NOT claimed to be ordered by a real preference.
 */
export const SORT_POLICY = "lower_bound_desc_coverage_desc_stable_id_asc" as const;

/** No validated model exists for an individual admission probability. */
export const ADMISSION_PROBABILITY_REASON = "no_validated_model" as const;

/**
 * Cache-key prefix for a whole assessed university list.
 *
 * Bumping `SCORING_VERSION`, `PREFERENCE_SETTINGS_VERSION` or the subject rules
 * version invalidates every cached assessment at once — an old list can never
 * be rendered next to a new score. Per-profile invalidation additionally keys
 * on `profileMatchFingerprint` (see `assessmentCacheKey`).
 */
export function assessedUniversitiesCacheKey(): string {
  return `${SCORING_VERSION}|${PREFERENCE_SETTINGS_VERSION}|${SUBJECT_RULES_VERSION}`;
}
