/**
 * Profile data utilities and a transparent profile-record coverage view.
 * This module deliberately does not estimate or classify admission chances.
 * Programme-fit comparisons live in `matching.ts`; they are catalogue
 * comparisons, not eligibility decisions or admission predictions.
 */

import { gpaTo40Scale } from "./gpa";
import { clamp, roundTo } from "./scoring";

/** Shared API state: ScholarBridge does not currently calculate admission probability. */
export const ADMISSION_PROBABILITY = {
  available: false,
  reason: "no-validated-methodology",
} as const;

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export interface ChancingProfile {
  gpa?: number | null;
  gpaScale?: number | null;
  ieltsScore?: number | null;
  toeflScore?: number | null;
  satScore?: number | null;
  actScore?: number | null;
  greScore?: number | null;
  duolingoScore?: number | null;
  country?: string | null;
  targetMajor?: string | null;
  degreeLevel?: string | null;
  extracurriculars?: string | null;
  leadership?: string | null;
  volunteering?: string | null;
  sports?: string | null;
  clubs?: string | null;
  researchExperience?: string | null;
  projects?: string | null;
  olympiads?: string | null;
  awards?: string | null;
  competitions?: string | null;
  certificates?: string | null;
  workExperienceYears?: number | null;
  researchPublications?: number | null;
  /**
   * Rows from the Activities pane (`student_activities`). The profile's own
   * text columns are what the student typed in the profile; this is the
   * structured portfolio they maintain on the Activities tab. Both describe
   * the SAME person, so readiness must count both — otherwise adding an
   * activity changes nothing and the portfolio looks disconnected.
   */
  savedActivities?: { category?: string | null; role?: string | null; achievements?: string | null }[] | null;
  budgetAnnualUsd?: number | null;
  familyIncomeUsd?: number | null;
  careerGoal?: string | null;
  graduationYear?: number | null;
  needScholarship?: boolean | null;
  needsFinancialAid?: boolean | null;
  requiresFullScholarship?: boolean | null;
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** Parse a JSON array column (or a comma-separated legacy string) → items. */
export function parseListColumn(raw: unknown): string[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  const text = raw.trim();
  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) =>
            typeof item === "string"
              ? item
              : item && typeof item === "object"
                ? String((item as Record<string, unknown>).title ?? (item as Record<string, unknown>).name ?? JSON.stringify(item))
                : String(item)
          )
          .map((s) => s.trim())
          .filter(Boolean);
      }
    } catch {
      // fall through to comma splitting
    }
  }
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * GPA normalised to a 4.0 scale.
 *
 * Delegates to the ONE canonical implementation (src/lib/gpa.ts) that the
 * university matcher and the recommender already use. The previous local copy
 * clamped an unscaled "85" to a perfect 4.0 — i.e. it INVENTED a top GPA for a
 * student whose scale is unknown — while the matcher correctly reported
 * "unknown". Same profile, two answers. Now there is exactly one rule:
 * an explicit scale converts proportionally, a bare value ≤ 4 is comparable,
 * anything else is null (unknown, never a 4.0).
 */
export function normalizedGpa(profile: ChancingProfile): number | null {
  return gpaTo40Scale(profile.gpa, profile.gpaScale);
}

/** Rough word-overlap similarity (0–1) between two free-text majors. */
export function majorSimilarity(a?: string | null, b?: string | null): number {
  const norm = (s?: string | null) =>
    (s || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2);
  const A = norm(a);
  const B = norm(b);
  if (!A.length || !B.length) return 0.5; // unknown → neutral, never punitive
  const setB = new Set(B);
  const overlap = A.filter((w) => setB.has(w)).length;
  return clamp(overlap / Math.min(A.length, B.length), 0, 1);
}

/** Count distinct extracurricular/achievement items across all columns. */
/** Roles that make an activity a leadership role (case-insensitive). */
const LEADERSHIP_ROLE =
  /\b(lead|leader|president|vice[- ]?president|captain|head|founder|co-?founder|chair|coordinator|director|manager|mentor)\b/i;

export function countActivities(profile: ChancingProfile): {
  activities: number;
  leadership: number;
  research: number;
  awards: number;
} {
  const activities = [
    ...parseListColumn(profile.extracurriculars),
    ...parseListColumn(profile.volunteering),
    ...parseListColumn(profile.sports),
    ...parseListColumn(profile.clubs),
    ...parseListColumn(profile.projects),
  ].length;
  const leadership = parseListColumn(profile.leadership).length;
  // A JSON `researchPublications` column can arrive as null (never entered),
  // as a numeric string, or as NaN from a bad import. Only a finite, positive
  // count is a record; anything else is "not recorded" — never a negative and
  // never NaN poisoning the section totals downstream.
  const pubsRaw = Number(profile.researchPublications);
  const pubs = Number.isFinite(pubsRaw) ? Math.max(0, pubsRaw) : 0;
  const research = parseListColumn(profile.researchExperience).length + pubs;
  const saved = profile.savedActivities ?? [];
  const savedLeadership = saved.filter(
    (a) =>
      a.category === "leadership" ||
      LEADERSHIP_ROLE.test(String(a.role ?? ""))
  ).length;
  const savedResearch = saved.filter((a) => a.category === "research").length;
  // A competition ENTRY is an activity; it only becomes an award once the
  // student recorded an achievement for it. Counting entries as awards would
  // inflate the score without evidence.
  const savedAwards = saved.filter(
    (a) => a.category === "competition" && String(a.achievements ?? "").trim().length > 0
  ).length;

  const awards = [
    ...parseListColumn(profile.awards),
    ...parseListColumn(profile.olympiads),
    ...parseListColumn(profile.competitions),
    ...parseListColumn(profile.certificates),
  ].length + savedAwards;
  return {
    activities: activities + saved.length,
    leadership: leadership + savedLeadership,
    research: research + savedResearch,
    awards,
  };
}

/**
 * 0–1: how much relevant profile information the student has recorded.
 *
 * The activity / leadership / award checks reuse `countActivities`, which is
 * also the source of the portfolio summary: the same saved activity now moves
 * the completeness bar and the strength panel together, instead of one seeing
 * the profile text columns and the other seeing nothing.
 */
export function profileCompletenessRatio(profile: ChancingProfile): number {
  const act = countActivities(profile);
  const checks = [
    Number(profile.gpa) > 0,
    Number(profile.gpaScale) > 0,
    Number(profile.ieltsScore) > 0 || Number(profile.toeflScore) > 0 || Number(profile.duolingoScore) > 0,
    Number(profile.satScore) > 0 || Number(profile.actScore) > 0 || Number(profile.greScore) > 0,
    Boolean(profile.country),
    Boolean(profile.targetMajor),
    Number(profile.budgetAnnualUsd) > 0 || Number(profile.familyIncomeUsd) > 0 || profile.needsFinancialAid != null || profile.requiresFullScholarship != null || profile.needScholarship === true,
    act.activities > 0,
    act.leadership > 0,
    act.awards > 0,
    Boolean(profile.careerGoal),
    Number(profile.graduationYear) > 0,
  ];
  return checks.filter(Boolean).length / checks.length;
}

// ---------------------------------------------------------------------------
// Profile information coverage and activity evidence summary
// ---------------------------------------------------------------------------

export interface StrengthSection {
  key: string;
  label: string;
  /** Percent of the section's relevant information fields that are on file. */
  score: number;
  /** Precise form of the displayed coverage percentage. */
  scorePrecise: number;
  /** No details recorded; optional sections are excluded from the overall. */
  unknown?: boolean;
  /** 0–1 share of the section's relevant information that is on file. */
  coverage: number;
  /** Stable translation keys for details not yet recorded. */
  missing: string[];
}

export interface ProfileStrength {
  /** Coverage of profile fields, not applicant strength or eligibility. */
  overall: number;
  overallPrecise: number;
  sections: StrengthSection[];
  scoredSections: number;
  totalSections: number;
  basis: string;
}

/**
 * Summarize which profile information is on file. The output never grades
 * GPA/test values, counts extracurricular quantity as merit, or says a field
 * is required. Empty optional sections stay unknown rather than becoming a
 * penalty. Programme requirements must be checked separately.
 */
export function profileStrength(
  profile: ChancingProfile,
  opts: { essayScore?: number | null } = {}
): ProfileStrength {
  const makeSection = (
    key: string,
    label: string,
    recorded: number,
    total: number,
    missing: string[],
    optional = true
  ): StrengthSection => {
    const present = Math.max(0, Math.min(total, recorded));
    const unknown = optional && present === 0;
    const coverage = total > 0 ? present / total : 0;
    return {
      key,
      label,
      score: unknown ? 0 : Math.round(coverage * 100),
      scorePrecise: roundTo(unknown ? 0 : coverage * 100, 1),
      unknown,
      coverage: unknown ? 0 : coverage,
      missing: present < total ? missing : [],
    };
  };

  const gpa = Number(profile.gpa) > 0;
  const gpaScale = Number(profile.gpaScale) > 0;
  const degreeLevel = Boolean(profile.degreeLevel?.trim());
  const academicMissing = [
    ...(!gpa ? ["gpaValue"] : []),
    ...(gpa && !gpaScale ? ["gpaScale"] : []),
    ...(!degreeLevel ? ["degreeLevel"] : []),
  ];
  const activity = countActivities(profile);
  const hasAnyTest = [profile.ieltsScore, profile.toeflScore, profile.duolingoScore, profile.satScore, profile.actScore, profile.greScore]
    .some((value) => Number(value) > 0);
  const hasBudget = Number(profile.budgetAnnualUsd) > 0;
  const hasIncome = Number(profile.familyIncomeUsd) > 0;
  const hasFundingNeed =
    profile.needsFinancialAid != null || profile.requiresFullScholarship != null || profile.needScholarship != null;
  const financeMissing = [
    ...(!hasBudget ? ["budgetPlan"] : []),
    ...(!hasIncome ? ["incomeDetail"] : []),
    ...(!hasFundingNeed ? ["fundingPreference"] : []),
  ];
  const essayRecorded = typeof opts.essayScore === "number" && Number.isFinite(opts.essayScore);

  const sections: StrengthSection[] = [
    makeSection("academics", "Academic details", Number(gpa) + Number(gpaScale) + Number(degreeLevel), 3, academicMissing),
    makeSection("tests", "Test results on file", Number(hasAnyTest), 1, ["testPolicy"]),
    makeSection("extracurriculars", "Activities on file", Number(activity.activities > 0 || activity.leadership > 0 || activity.research > 0 || activity.awards > 0), 1, ["activitiesOptional"]),
    makeSection("leadership", "Leadership records", Number(activity.leadership > 0), 1, ["leadershipOptional"]),
    makeSection("awards", "Awards and results", Number(activity.awards > 0), 1, ["awardsOptional"]),
    makeSection("research", "Research records", Number(activity.research > 0), 1, ["researchOptional"]),
    makeSection("essays", "Essay review on file", Number(essayRecorded), 1, ["essayOptional"]),
    makeSection("financial", "Funding-plan details", Number(hasBudget) + Number(hasIncome) + Number(hasFundingNeed), 3, financeMissing),
  ];

  const measuredSections = sections.filter((item) => !item.unknown);
  const scoredSections = measuredSections.length;
  // MONOTONICITY (2026-10 fix): the headline coverage index used a denominator
  // of *measured* sections only, so recording the very first detail of an
  // optional area dropped the headline percentage — a full academic record
  // read 100 %, then adding a budget read 78 %. Progress that punishes a
  // student for telling us more is a lie about progress.
  //
  // The headline now runs over a FIXED canonical denominator (every section in
  // the profile record), and each section contributes a coverage value that can
  // only rise as details are added. "X of Y sections started" stays honest in
  // `scoredSections` / `totalSections`; the percentage itself is monotone:
  // adding any recorded detail never lowers it.
  const overallPrecise = sections.length
    ? roundTo(sections.reduce((sum, item) => sum + item.coverage * 100, 0) / sections.length, 1)
    : 0;
  const overall = Math.round(overallPrecise);
  const basis = `This percentage is average information coverage across all ${sections.length} profile areas, counted against a fixed list so recording one more detail can never lower it. Areas with nothing recorded yet contribute 0 and stay marked as not recorded, not as a penalty. It does not measure eligibility, application quality, or admission likelihood.`;
  return {
    overall,
    overallPrecise,
    sections,
    scoredSections,
    totalSections: sections.length,
    basis,
  };
}

export interface ExtracurricularAnalysis {
  activities: number;
  leadership: number;
  research: number;
  awards: number;
}

/**
 * Counts recorded activity fields; it does not score quality or merit.
 *
 * `countActivities` already folds `researchPublications` into `research`; the
 * previous version added it a second time here, so three publications were
 * reported as six research records in the strength panel while the section
 * itself counted three. One profile, one number.
 */
export function analyzeExtracurriculars(profile: ChancingProfile): ExtracurricularAnalysis {
  const counts = countActivities(profile);
  return {
    activities: counts.activities,
    leadership: counts.leadership,
    research: counts.research,
    awards: counts.awards,
  };
}
