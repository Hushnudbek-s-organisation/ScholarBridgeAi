/**
 * Synthetic applicant stories and cohort outcomes were previously inserted as
 * verified/consented real records. They have no attributable proof or auditable
 * consent, so the candidate dataset is intentionally empty until reviewed
 * first-party records are supplied. Existing rows are not modified.
 */
export interface AdditionalSuccessStorySeed {
  studentName: string;
  universityName: string;
  [key: string]: unknown;
}

/** Compatibility export; unreviewed synthetic candidates are not seed data. */
export const ADDITIONAL_24_SUCCESS_STORIES: AdditionalSuccessStorySeed[] = [];

export async function seedOutcomesAndStories(_options?: {
  forceInTest?: boolean;
}): Promise<{ storiesInserted: number; outcomesInserted: number }> {
  return { storiesInserted: 0, outcomesInserted: 0 };
}

/** Compatibility entry point used by the platform bootstrap. */
export async function ensureOutcomesAndStoriesSeeded(): Promise<void> {
  // Intentionally no-op: synthetic records are never presented as real.
}
