/**
 * ScholarBridge — profile change fingerprint for live re-scoring.
 *
 * Every catalogue match score is computed from the student's profile data
 * (GPA, test scores, major, budget, …). Cached fetches keyed only by
 * `profileId` go stale the moment the student edits those fields in
 * ProfileModal: the cards on screen keep the OLD score until a full reload.
 *
 * `profileMatchFingerprint` collapses every score-relevant field into one
 * string so result-set keys and effect dependency arrays can react to ANY
 * scoring-relevant change — the edited profile immediately re-scores every
 * card, panel and detail view.
 */

export interface ProfileMatchFingerprintSource {
  id?: number | null;
  degreeLevel?: string | null;
  targetMajor?: string | null;
  studyInterests?: string | string[] | null;
  gpa?: number | string | null;
  gpaScale?: number | string | null;
  ieltsScore?: number | string | null;
  toeflScore?: number | string | null;
  duolingoScore?: number | string | null;
  satScore?: number | string | null;
  actScore?: number | string | null;
  greScore?: number | string | null;
  budgetAnnualUsd?: number | string | null;
  preferredCountries?: string | string[] | null;
  needScholarship?: boolean | null;
  needsFinancialAid?: boolean | null;
  requiresFullScholarship?: boolean | null;
  updatedAt?: string | Date | null;
}

const norm = (value: unknown): string => {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((v) => String(v)).join(",");
  return String(value);
};

/** Stable string that changes whenever a score-relevant profile field changes. */
export function profileMatchFingerprint(p: ProfileMatchFingerprintSource | null | undefined): string {
  if (!p) return "";
  return [
    norm(p.id),
    norm(p.degreeLevel),
    norm(p.targetMajor),
    norm(p.studyInterests),
    norm(p.gpa),
    norm(p.gpaScale),
    norm(p.ieltsScore),
    norm(p.toeflScore),
    norm(p.duolingoScore),
    norm(p.satScore),
    norm(p.actScore),
    norm(p.greScore),
    norm(p.budgetAnnualUsd),
    norm(p.preferredCountries),
    norm(p.needScholarship),
    norm(p.needsFinancialAid),
    norm(p.requiresFullScholarship),
    norm(p.updatedAt),
  ].join("|");
}
