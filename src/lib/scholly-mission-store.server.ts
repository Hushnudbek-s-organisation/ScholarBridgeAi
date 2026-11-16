import { and, desc, eq, inArray, lt, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  aiEvaluations,
  applicationDocuments,
  applications,
  dailyMissions,
  essayVersions,
  journeyDeadlines,
  schollyProfiles,
  studentProfiles,
  testPlans,
  userDocuments,
  savedUniversities,
} from "@/db/schema";
import {
  SCHOLLY_PROFILE_FIELDS,
  SCHOLLY_DEPARTURE_KIND,
  buildSchollyMissionHistory,
  schollyDayKey,
  type SchollyMissionContext,
  type SchollyMissionCriteria,
  type SchollyProfileField,
} from "@/lib/scholly-missions";

type Reader = Pick<typeof db, "select">;

type SchollyProfileFields = Pick<typeof studentProfiles.$inferSelect,
  "country" | "targetMajor" | "degreeLevel" | "gpa" | "gpaScale" | "ieltsScore" | "budgetAnnualUsd" | "preferredCountries"
>;

export function missingSchollyProfileFields(profile: SchollyProfileFields | undefined): SchollyProfileField[] {
  const missing: SchollyProfileField[] = [];
  if (!profile?.country?.trim()) missing.push("country");
  if (!profile?.targetMajor?.trim()) missing.push("targetMajor");
  if (!profile?.degreeLevel?.trim()) missing.push("degreeLevel");
  if (profile?.gpa == null || !Number.isFinite(profile.gpa) || profile.gpa < 0 || profile.gpaScale == null || !Number.isFinite(profile.gpaScale) || profile.gpaScale <= 0 || profile.gpa > profile.gpaScale) missing.push("gpa");
  if (profile?.ieltsScore == null || !Number.isFinite(profile.ieltsScore) || profile.ieltsScore < 0 || profile.ieltsScore > 9) missing.push("ieltsScore");
  if (profile?.budgetAnnualUsd == null || profile.budgetAnnualUsd < 0) missing.push("budgetAnnualUsd");
  if (!hasPreferredCountries(profile?.preferredCountries ?? null)) missing.push("preferredCountries");
  return SCHOLLY_PROFILE_FIELDS.filter((field) => missing.includes(field));
}

export async function ensureSchollyProfile(profileId: number): Promise<boolean> {
  const [student] = await db.select({ preferredLocale: studentProfiles.preferredLocale })
    .from(studentProfiles).where(eq(studentProfiles.id, profileId)).limit(1);
  if (!student) return false;
  await db.insert(schollyProfiles).values({
    userId: profileId,
    lang: student.preferredLocale === "ru" || student.preferredLocale === "en" ? student.preferredLocale : "uz",
  }).onConflictDoNothing({ target: schollyProfiles.userId });
  return true;
}

export async function schollyTimeZone(profileId: number, reader: Reader = db): Promise<string> {
  const [row] = await reader.select({ tz: schollyProfiles.tz }).from(schollyProfiles)
    .where(eq(schollyProfiles.userId, profileId)).limit(1);
  return row?.tz ?? "Asia/Tashkent";
}

export async function currentSchollyDay(profileId: number, now = new Date(), reader: Reader = db) {
  const timeZone = await schollyTimeZone(profileId, reader);
  return { day: schollyDayKey(now, timeZone, 4), timeZone };
}

export async function loadSchollyMissionContext(
  profileId: number,
  day: string,
  timeZone: string,
  reader: Reader = db,
): Promise<SchollyMissionContext> {
  const [profile] = await reader.select({
    country: studentProfiles.country,
    targetMajor: studentProfiles.targetMajor,
    degreeLevel: studentProfiles.degreeLevel,
    gpa: studentProfiles.gpa,
    gpaScale: studentProfiles.gpaScale,
    ieltsScore: studentProfiles.ieltsScore,
    budgetAnnualUsd: studentProfiles.budgetAnnualUsd,
    preferredCountries: studentProfiles.preferredCountries,
  }).from(studentProfiles).where(eq(studentProfiles.id, profileId)).limit(1);

  const [savedRows, documentRows, essayRows, checklistRows, appDeadlines, journeyDueDates, departureRows, visaRows, ieltsPlans] = await Promise.all([
    reader.select({ id: savedUniversities.universityId }).from(savedUniversities)
      .where(eq(savedUniversities.profileId, profileId)).limit(500),
    reader.select({ id: userDocuments.id }).from(userDocuments)
      .where(and(eq(userDocuments.profileId, profileId), inArray(userDocuments.status, ["uploaded", "verified"]))).limit(500),
    reader.select({ wordCount: essayVersions.wordCount }).from(essayVersions)
      .where(and(eq(essayVersions.profileId, profileId), eq(essayVersions.essayType, "sop")))
      .orderBy(desc(essayVersions.versionNumber)).limit(1),
    reader.select({ isRequired: applicationDocuments.isRequired, status: applicationDocuments.status, deadlineDate: applicationDocuments.deadlineDate })
      .from(applicationDocuments).where(eq(applicationDocuments.profileId, profileId)).limit(500),
    reader.select({ deadline: applications.deadline }).from(applications)
      .where(eq(applications.profileId, profileId)).limit(200),
    reader.select({ dueDate: journeyDeadlines.dueDate }).from(journeyDeadlines)
      .where(and(eq(journeyDeadlines.profileId, profileId), eq(journeyDeadlines.isCompleted, false),
        ne(journeyDeadlines.kind, SCHOLLY_DEPARTURE_KIND))).limit(200),
    reader.select({ dueDate: journeyDeadlines.dueDate }).from(journeyDeadlines)
      .where(and(eq(journeyDeadlines.profileId, profileId), eq(journeyDeadlines.kind, SCHOLLY_DEPARTURE_KIND),
        eq(journeyDeadlines.isCompleted, false))).orderBy(desc(journeyDeadlines.id)).limit(1),
    reader.select({ id: aiEvaluations.id }).from(aiEvaluations)
      .where(and(eq(aiEvaluations.profileId, profileId), eq(aiEvaluations.evaluationType, "Visa Practice"),
        sql`${aiEvaluations.content} ~ '"answerCount"[[:space:]]*:[[:space:]]*[1-9][0-9]*'`))
      .orderBy(desc(aiEvaluations.id)).limit(1),
    reader.select({ currentScore: testPlans.currentScore, targetScore: testPlans.targetScore }).from(testPlans)
      .where(and(eq(testPlans.profileId, profileId), eq(testPlans.testType, "ielts"), eq(testPlans.isActive, true)))
      .orderBy(desc(testPlans.updatedAt), desc(testPlans.id)).limit(1),
  ]);

  const hasIncompleteRequiredDocuments = checklistRows.some((row) => row.isRequired
    && !["uploaded", "verified", "not_required"].includes(row.status));
  const deadlineLimit = addDays(day, 7);
  const dates = [
    ...appDeadlines.map((row) => row.deadline),
    ...journeyDueDates.map((row) => row.dueDate),
    ...checklistRows.map((row) => row.deadlineDate),
  ].filter((value): value is string => typeof value === "string");
  const hasDeadlineWithinSevenDays = dates.some((due) => due >= day && due <= deadlineLimit);
  const sopWordCount = essayRows[0]?.wordCount ?? 0;

  const validIeltsScore = (value: number | null | undefined): value is number =>
    typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 9;
  const target = ieltsPlans[0]?.targetScore;
  const current = ieltsPlans[0]?.currentScore ?? profile?.ieltsScore;
  const departureDate = departureRows[0]?.dueDate;

  return {
    day,
    timezone: timeZone,
    missingProfileFields: missingSchollyProfileFields(profile),
    savedUniversityIds: savedRows.map((row) => row.id),
    uploadedDocumentIds: documentRows.map((row) => row.id),
    sopWordCount,
    hasDeadlineWithinSevenDays,
    hasIncompleteRequiredDocuments,
    hasIeltsScoreGap: validIeltsScore(target) && validIeltsScore(current) && current < target,
    hasDepartureWithinSixtyDays: Boolean(departureDate && departureDate >= day && departureDate <= addDays(day, 60)),
    latestVisaPracticeId: visaRows[0]?.id ?? 0,
  };
}

export async function recentSchollyMissionHistory(profileId: number, day: string, reader: Reader = db) {
  const rows = await reader.select({ status: dailyMissions.status, day: dailyMissions.day })
    .from(dailyMissions)
    .where(and(eq(dailyMissions.userId, profileId), lt(dailyMissions.day, day)))
    .orderBy(desc(dailyMissions.day)).limit(5);
  return buildSchollyMissionHistory(day, rows);
}

export function missionCriteriaFromContext(context: SchollyMissionContext): SchollyMissionCriteria {
  return {
    missingFields: [...context.missingProfileFields],
    savedUniversityIds: [...context.savedUniversityIds],
    uploadedDocumentIds: [...context.uploadedDocumentIds],
    sopWordCount: context.sopWordCount,
    latestVisaPracticeId: context.latestVisaPracticeId ?? 0,
  };
}

export function criteriaFromStored(value: unknown): SchollyMissionCriteria {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { missingFields: [], savedUniversityIds: [], uploadedDocumentIds: [], sopWordCount: 0 };
  }
  const row = value as Record<string, unknown>;
  return {
    missingFields: Array.isArray(row.missingFields) ? row.missingFields.filter((field): field is SchollyProfileField => SCHOLLY_PROFILE_FIELDS.includes(field as SchollyProfileField)) : [],
    savedUniversityIds: Array.isArray(row.savedUniversityIds) ? row.savedUniversityIds.filter((id): id is number => Number.isInteger(id) && id > 0) : [],
    uploadedDocumentIds: Array.isArray(row.uploadedDocumentIds) ? row.uploadedDocumentIds.filter((id): id is number => Number.isInteger(id) && id > 0) : [],
    latestVisaPracticeId: typeof row.latestVisaPracticeId === "number" && Number.isSafeInteger(row.latestVisaPracticeId) ? Math.max(0, row.latestVisaPracticeId) : 0,
    sopWordCount: typeof row.sopWordCount === "number" && Number.isFinite(row.sopWordCount) ? Math.max(0, row.sopWordCount) : 0,
  };
}

function hasPreferredCountries(value: string | null) {
  const raw = value?.trim();
  if (!raw) return false;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.some((item) => typeof item === "string" && item.trim().length > 0);
  } catch {
    // Legacy rows may store a comma-separated country list.
  }
  return raw.split(",").some((country) => country.trim().length > 0);
}

function addDays(day: string, amount: number) {
  const date = new Date(`${day}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
