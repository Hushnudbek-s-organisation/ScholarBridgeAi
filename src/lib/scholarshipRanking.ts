/**
 * One relevance number for the scholarships list, built from three separate
 * questions a student actually asks at the same time:
 *
 *   1. **Fit** — does this award suit my profile?      (`calculateScholarshipMatch`)
 *   2. **University** — is the university behind it a
 *      good match for me?                              (`calculateUniversityMatch`)
 *   3. **Chance** — do I meet the requirements the
 *      award itself publishes?                         (`evaluateChance`)
 *
 * Before this module the list was ordered by (1) alone, so an award at a
 * university that fits a student badly could sit above one at a university
 * that fits them well. Now the three are combined transparently:
 *
 *     relevance = Σ(weight × part) / Σ(weight)      over the parts that exist
 *
 * Weights: fit 0.5, university 0.3, chance 0.2. Weights renormalise when a part
 * is missing (an award not linked to any university simply has no university
 * part — it is not scored as a zero), so an unlinked award is never punished
 * for data the catalogue does not have.
 *
 * What this is NOT: an admission probability. `chancing.ts` refuses to estimate
 * one (`ADMISSION_PROBABILITY.available = false`), and the "chance" part here is
 * a banded verdict on the *published gates only* — meets / unknown / below.
 */
import type { ChanceBucket } from "./scholarshipGates";

/** The three parts and how much each moves the final number. */
export const RELEVANCE_WEIGHTS = {
  fit: 0.5,
  university: 0.3,
  chance: 0.2,
} as const;

export type RelevancePartKey = keyof typeof RELEVANCE_WEIGHTS;

/**
 * The chance band as 0–100 points.
 *
 * `meets` means every comparable published gate passes. `unknown` sits in the
 * middle on purpose: with nothing comparable we know nothing, so the award
 * stays neutral instead of being pushed to the bottom for missing data.
 * `below` is a real, published shortfall — it stays on the list (the student may
 * still fix it), it just does not lead it.
 */
export const CHANCE_POINTS: Record<ChanceBucket, number> = {
  meets: 100,
  unknown: 55,
  below: 20,
};

export interface RelevanceInput {
  /** `calculateScholarshipMatch(...).matchScore` — 30…98, or null when unverified. */
  fit: number | null;
  /** `calculateUniversityMatch(...).matchScore` — only when the award links a university. */
  university: number | null;
  /** Published-gate verdict; null when no profile was loaded. */
  chance: ChanceBucket | null;
}

export interface RelevancePart {
  key: RelevancePartKey;
  /** The raw 0–100 value this part contributed. */
  value: number;
  /** The weight it actually received after renormalisation (0…1). */
  weight: number;
}

export interface RelevanceResult {
  /** 0–100, one decimal. Null when no part had data. */
  score: number | null;
  parts: RelevancePart[];
}

function usable(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Clamp to the 0–100 window the score is defined on. */
function clamp100(value: number): number {
  return Math.min(100, Math.max(0, value));
}

/**
 * Fuse the three parts into one 0–100 relevance number.
 *
 * A part with no data is dropped and its weight is shared by the others, so the
 * score always sits on the same 0–100 scale no matter how much the catalogue
 * knows about a row. That is what makes it safe to sort on: a sparse row does
 * not silently rank as a middling one.
 */
export function combinedRelevance(input: RelevanceInput): RelevanceResult {
  const raw: { key: RelevancePartKey; value: number }[] = [];
  if (usable(input.fit)) raw.push({ key: "fit", value: clamp100(input.fit) });
  if (usable(input.university)) raw.push({ key: "university", value: clamp100(input.university) });
  if (input.chance) raw.push({ key: "chance", value: CHANCE_POINTS[input.chance] ?? CHANCE_POINTS.unknown });

  if (raw.length === 0) return { score: null, parts: [] };

  const totalWeight = raw.reduce((sum, part) => sum + RELEVANCE_WEIGHTS[part.key], 0);
  let weighted = 0;
  const parts: RelevancePart[] = raw.map((part) => {
    const weight = RELEVANCE_WEIGHTS[part.key] / totalWeight;
    weighted += weight * part.value;
    return { key: part.key, value: Math.round(part.value * 10) / 10, weight: Math.round(weight * 1000) / 1000 };
  });

  return { score: Math.round(clamp100(weighted) * 10) / 10, parts };
}
