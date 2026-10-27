/**
 * One mapping from database rows to the shapes the engines expect.
 *
 * `matching.ts` and `chancing.ts` take plain object shapes so they stay pure
 * and unit-testable. The mapping lives here, in one place, so a column added
 * to `student_profiles` or `universities` reaches EVERY engine at once —
 * previously each route carried its own copy and they had already drifted
 * apart (the chancing copy omitted fields the strength copy passed, and both
 * needed a `as never` cast to satisfy the compiler).
 */
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { studentActivities, type studentProfiles, type universities } from "@/db/schema";
import type { ChancingProfile } from "@/lib/chancing";
import type { StudentProfileData, UniversityData } from "@/lib/matching";

type ProfileRow = typeof studentProfiles.$inferSelect;
type UniversityRow = typeof universities.$inferSelect;
// `selectUniversities()` has a resilient core-column fallback, so the mapper
// accepts the fields the engine actually needs rather than requiring every
// optional admin/provenance column on that fallback shape.
type UniversityMappingRow = Pick<
  UniversityRow,
  | "id"
  | "name"
  | "country"
  | "city"
  | "flagEmoji"
  | "worldRanking"
  | "degreeLevel"
  | "programMajor"
  | "annualTuitionUsd"
  | "annualLivingEstUsd"
  | "minGpa"
  | "minIelts"
  | "minSat"
  | "acceptanceRate"
  | "postStudyWorkVisaYears"
  | "description"
  | "highlights"
  | "websiteUrl"
  | "imageUrl"
> &
  Partial<Pick<
    UniversityRow,
    | "annualTuition" | "tuitionCurrency" | "tuitionPeriod"
    | "annualLivingEst" | "livingCostCurrency" | "livingCostPeriod"
    | "accommodationCostUsd" | "accommodationCost" | "accommodationCostCurrency" | "accommodationCostPeriod"
    | "applicationFee" | "applicationFeeCurrency"
  >>;

/**
 * `student_profiles` → chancing profile.
 *
 * Every field the engines know about is passed through explicitly: adding a
 * column and forgetting it here would silently make a feature invisible.
 */
export function toChancingProfile(row: ProfileRow): ChancingProfile {
  return {
    gpa: row.gpa,
    gpaScale: row.gpaScale,
    ieltsScore: row.ieltsScore,
    toeflScore: row.toeflScore,
    satScore: row.satScore,
    actScore: row.actScore,
    greScore: row.greScore,
    duolingoScore: row.duolingoScore,
    country: row.country,
    targetMajor: row.targetMajor,
    degreeLevel: row.degreeLevel,
    extracurriculars: row.extracurriculars,
    leadership: row.leadership,
    volunteering: row.volunteering,
    sports: row.sports,
    clubs: row.clubs,
    researchExperience: row.researchExperience,
    projects: row.projects,
    olympiads: row.olympiads,
    awards: row.awards,
    competitions: row.competitions,
    certificates: row.certificates,
    workExperienceYears: row.workExperienceYears,
    researchPublications: row.researchPublications,
    budgetAnnualUsd: row.budgetAnnualUsd,
    familyIncomeUsd: row.familyIncomeUsd,
    careerGoal: row.careerGoal,
    graduationYear: row.graduationYear,
    needScholarship: row.needScholarship,
    needsFinancialAid: row.needsFinancialAid,
    requiresFullScholarship: row.requiresFullScholarship,
  };
}

/**
 * The student's structured Activities-pane rows, in the shape the readiness
 * engine counts. Kept separate from `toChancingProfile` so that function stays
 * pure; callers that can await use `chancingProfileWithActivities`.
 */
/**
 * How long one student's activity rows may be reused (ms).
 *
 * Every scoring route needs them (`/api/dashboard`, `/api/chancing`,
 * `/api/universities`, the detail page…), and each call was a database round
 * trip for a table of at most a few dozen rows that changes only when the
 * student edits the Activities pane — which invalidates this memo explicitly
 * (see `invalidateSavedActivities`, called from `/api/activities` and from
 * `invalidateProfileMatchCache`).
 */
const ACTIVITIES_MEMO_TTL_MS = (() => {
  const raw = Number(process.env.ACTIVITIES_MEMO_TTL_MS ?? 15_000);
  return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 15_000;
})();

type ActivitiesRow = {
  category: string | null;
  role: string | null;
  achievements: string | null;
};

const ACTIVITIES_MEMO_KEY = "__sbSavedActivitiesMemo";

function activitiesMemo(): Map<number, { expiresAt: number; rows: ActivitiesRow[] }> {
  const g = globalThis as typeof globalThis & {
    [ACTIVITIES_MEMO_KEY]?: Map<number, { expiresAt: number; rows: ActivitiesRow[] }>;
  };
  if (!g[ACTIVITIES_MEMO_KEY]) g[ACTIVITIES_MEMO_KEY] = new Map();
  return g[ACTIVITIES_MEMO_KEY]!;
}

/** Drop the memoized activity rows — one student, or everybody. */
export function invalidateSavedActivities(profileId?: number): void {
  const memo = activitiesMemo();
  if (profileId == null) memo.clear();
  else memo.delete(profileId);
}

export async function loadSavedActivities(profileId: number) {
  const memo = activitiesMemo();
  const now = Date.now();
  const hit = memo.get(profileId);
  if (hit && hit.expiresAt > now) return hit.rows;

  const rows = (await db
    .select({
      category: studentActivities.category,
      role: studentActivities.role,
      achievements: studentActivities.achievements,
    })
    .from(studentActivities)
    .where(eq(studentActivities.profileId, profileId))) as ActivitiesRow[];

  if (ACTIVITIES_MEMO_TTL_MS > 0) memo.set(profileId, { expiresAt: now + ACTIVITIES_MEMO_TTL_MS, rows });
  return rows;
}

/**
 * `student_profiles` + the Activities pane → the chancing/readiness input.
 * Use this everywhere a student's readiness or fit is computed, so the
 * portfolio they maintain on the Activities tab always counts.
 */
export async function chancingProfileWithActivities(row: ProfileRow): Promise<ChancingProfile> {
  const [profile, activities] = await Promise.all([
    Promise.resolve(toChancingProfile(row)),
    loadSavedActivities(row.id),
  ]);
  return { ...profile, savedActivities: activities };
}

/** `student_profiles` → matching (fit) profile. */
export function toMatchProfile(row: ProfileRow): StudentProfileData {
  return {
    id: row.id,
    name: row.name,
    degreeLevel: row.degreeLevel,
    targetMajor: row.targetMajor,
    gpa: row.gpa,
    gpaScale: row.gpaScale,
    ieltsScore: row.ieltsScore,
    toeflScore: row.toeflScore,
    duolingoScore: row.duolingoScore,
    satScore: row.satScore,
    greScore: row.greScore,
    budgetAnnualUsd: row.budgetAnnualUsd,
    preferredCountries: row.preferredCountries,
    needScholarship: row.needScholarship,
    familyIncomeUsd: row.familyIncomeUsd,
    needsFinancialAid: row.needsFinancialAid,
    requiresFullScholarship: row.requiresFullScholarship,
    extracurriculars: row.extracurriculars,
    leadership: row.leadership,
    volunteering: row.volunteering,
    sports: row.sports,
    clubs: row.clubs,
    researchExperience: row.researchExperience,
    projects: row.projects,
    olympiads: row.olympiads,
    awards: row.awards,
    competitions: row.competitions,
    certificates: row.certificates,
    workExperienceYears: row.workExperienceYears,
    researchPublications: row.researchPublications,
  };
}

/**
 * The matching engine also sees the structured activity portfolio. This keeps
 * Explorer, saved lists, dashboard and AI reports aligned with Chancing.
 */
export async function toMatchProfileWithActivities(row: ProfileRow): Promise<StudentProfileData> {
  const [profile, activities] = await Promise.all([toMatchProfile(row), loadSavedActivities(row.id)]);
  return { ...profile, savedActivities: activities };
}

/**
 * `universities` → the matching engine's university shape.
 *
 * Typed as a real return value (not `as never`) so a renamed or missing column
 * becomes a compile error instead of a silently wrong score.
 */
export function toUniversityData(row: UniversityMappingRow): UniversityData {
  return {
    id: row.id,
    name: row.name,
    country: row.country,
    city: row.city,
    flagEmoji: row.flagEmoji,
    worldRanking: row.worldRanking,
    degreeLevel: row.degreeLevel,
    programMajor: row.programMajor,
    annualTuitionUsd: row.annualTuitionUsd,
    annualLivingEstUsd: row.annualLivingEstUsd,
    annualTuition: row.annualTuition != null ? Number(row.annualTuition) : null,
    tuitionCurrency: row.tuitionCurrency,
    tuitionPeriod: row.tuitionPeriod,
    annualLivingEst: row.annualLivingEst != null ? Number(row.annualLivingEst) : null,
    livingCostCurrency: row.livingCostCurrency,
    livingCostPeriod: row.livingCostPeriod,
    accommodationCostUsd: row.accommodationCostUsd,
    accommodationCost: row.accommodationCost != null ? Number(row.accommodationCost) : null,
    accommodationCostCurrency: row.accommodationCostCurrency,
    accommodationCostPeriod: row.accommodationCostPeriod,
    applicationFee: row.applicationFee,
    applicationFeeCurrency: row.applicationFeeCurrency,
    minGpa: row.minGpa,
    minIelts: row.minIelts,
    minSat: row.minSat,
    acceptanceRate: row.acceptanceRate,
    postStudyWorkVisaYears: row.postStudyWorkVisaYears,
    description: row.description,
    highlights: row.highlights,
    websiteUrl: row.websiteUrl,
    imageUrl: row.imageUrl,
  };
}
