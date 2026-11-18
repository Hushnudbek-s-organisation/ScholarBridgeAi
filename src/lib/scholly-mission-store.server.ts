import { and, asc, desc, eq, inArray, isNotNull, lt, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  aiEvaluations,
  applicationDocuments,
  applications,
  dailyMissions,
  essayVersions,
  journeyDeadlines,
  pointsLedger,
  schollyEvents,
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
import { isSupportedTimeZone } from "@/lib/scholly-profile";

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

type MissionEvidence = {
  profile: Date | undefined;
  universities: { id: number; at: Date }[];
  documents: { id: number; at: Date }[];
  sop: Date | undefined;
  visa: Date | undefined;
  quiz: Date | undefined;
  report: Date | undefined;
};

export async function loadSchollyMissionContext(
  profileId: number,
  day: string,
  timeZone: string,
  reader: Reader = db,
): Promise<SchollyMissionContext & { evidence: MissionEvidence }> {
  const zone = isSupportedTimeZone(timeZone) && !/^[+-]/.test(timeZone) ? timeZone : "Asia/Tashkent";
  const localStart = sql`timezone('UTC', timezone(${zone}, ${day}::date + interval '4 hours'))`;
  const nextLocalStart = sql`timezone('UTC', timezone(${zone}, ${day}::date + interval '1 day 4 hours'))`;
  const [profile] = await reader.select({
    country: studentProfiles.country,
    targetMajor: studentProfiles.targetMajor,
    degreeLevel: studentProfiles.degreeLevel,
    gpa: studentProfiles.gpa,
    gpaScale: studentProfiles.gpaScale,
    ieltsScore: studentProfiles.ieltsScore,
    budgetAnnualUsd: studentProfiles.budgetAnnualUsd,
    preferredCountries: studentProfiles.preferredCountries,
    updatedAt: studentProfiles.updatedAt,
  }).from(studentProfiles).where(eq(studentProfiles.id, profileId)).limit(1);

  const [savedRows, olderSaveClaims, documentRows, essayRows, checklistRows, appDeadlines, journeyDueDates, departureRows, visaRows, ieltsPlans, activities] = await Promise.all([
    reader.select({ id: savedUniversities.universityId, at: savedUniversities.createdAt,
      today: sql<boolean>`${savedUniversities.createdAt} >= ${localStart} AND ${savedUniversities.createdAt} < ${nextLocalStart}` })
      .from(savedUniversities).where(eq(savedUniversities.profileId, profileId))
      .orderBy(desc(savedUniversities.createdAt)).limit(500),
    reader.select({ id: pointsLedger.relatedEntityId }).from(pointsLedger).where(and(
      eq(pointsLedger.profileId, profileId), eq(pointsLedger.reason, "scholly_university_saved"),
      lt(pointsLedger.createdAt, localStart))),
    reader.select({ id: userDocuments.id, at: userDocuments.updatedAt }).from(userDocuments)
      .where(and(eq(userDocuments.profileId, profileId), inArray(userDocuments.status, ["uploaded", "verified", "needs_update", "self_confirmed"]),
        isNotNull(userDocuments.fileUrl))).orderBy(desc(userDocuments.updatedAt)).limit(500),
    reader.select({ wordCount: essayVersions.wordCount,
      practiced: sql<boolean>`EXISTS (SELECT 1 FROM ${schollyEvents} WHERE ${schollyEvents.userId} = ${profileId}
        AND ${schollyEvents.type} = 'sop_practiced'
        AND ${schollyEvents.payload}->>'versionId' = ${essayVersions.id}::text)`,
      at: essayVersions.createdAt, today: sql<boolean>`${essayVersions.createdAt} >= ${localStart} AND ${essayVersions.createdAt} < ${nextLocalStart}`,
    }).from(essayVersions)
      .where(and(eq(essayVersions.profileId, profileId), eq(essayVersions.essayType, "sop")))
      .orderBy(desc(essayVersions.createdAt), desc(essayVersions.id)).limit(1),
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
    reader.select({ id: aiEvaluations.id, at: aiEvaluations.createdAt }).from(aiEvaluations)
      .where(and(eq(aiEvaluations.profileId, profileId), eq(aiEvaluations.evaluationType, "Visa Practice"),
        sql`${aiEvaluations.content} ~ '"answerCount"[[:space:]]*:[[:space:]]*[1-9][0-9]*'`))
      .orderBy(desc(aiEvaluations.id)).limit(1),
    reader.select({ currentScore: testPlans.currentScore, targetScore: testPlans.targetScore }).from(testPlans)
      .where(and(eq(testPlans.profileId, profileId), eq(testPlans.testType, "ielts"), eq(testPlans.isActive, true)))
      .orderBy(desc(testPlans.updatedAt), desc(testPlans.id)).limit(1),
    reader.select({ type: schollyEvents.type, at: schollyEvents.createdAt }).from(schollyEvents)
      .where(and(eq(schollyEvents.userId, profileId), inArray(schollyEvents.type, ["quiz_done", "weekly_report_reviewed"]),
        sql`${schollyEvents.payload}->>'day' = ${day}`))
      .orderBy(asc(schollyEvents.createdAt)).limit(2),
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
  const sop = essayRows[0]?.practiced && essayRows[0]?.today ? essayRows[0] : undefined;

  const validIeltsScore = (value: number | null | undefined): value is number =>
    typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 9;
  const target = ieltsPlans[0]?.targetScore;
  const current = ieltsPlans[0]?.currentScore ?? profile?.ieltsScore;
  const departureDate = departureRows[0]?.dueDate;
  const previouslySaved = new Set(olderSaveClaims.map(row => row.id));
  const todaySaves = savedRows.filter(row => row.today && !previouslySaved.has(row.id));
  const quiz = activities.find(row => row.type === "quiz_done");
  const report = activities.find(row => row.type === "weekly_report_reviewed");

  return {
    day,
    timezone: timeZone,
    missingProfileFields: missingSchollyProfileFields(profile),
    savedUniversityIds: savedRows.map((row) => row.id),
    uploadedDocumentIds: documentRows.map((row) => row.id),
    sopWordCount,
    vettedSopWordCount: sop?.wordCount ?? 0,
    hasDeadlineWithinSevenDays,
    hasIncompleteRequiredDocuments,
    hasIeltsScoreGap: validIeltsScore(target) && validIeltsScore(current) && current < target,
    hasDepartureWithinSixtyDays: Boolean(departureDate && departureDate >= day && departureDate <= addDays(day, 60)),
    latestVisaPracticeId: visaRows[0]?.id ?? 0,
    dailyQuizDone: Boolean(quiz),
    weeklyReportReviewed: Boolean(report),
    todaySavedUniversityIds: todaySaves.map(row => row.id),
    evidence: {
      profile: profile?.updatedAt,
      universities: todaySaves,
      documents: documentRows,
      sop: sop?.at,
      visa: visaRows[0]?.at,
      quiz: quiz?.at,
      report: report?.at,
    },
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
    dailyQuizDone: context.dailyQuizDone ?? false,
    weeklyReportReviewed: context.weeklyReportReviewed ?? false,
    todaySavedUniversityIds: context.todaySavedUniversityIds,
    vettedSopWordCount: context.vettedSopWordCount,
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
    dailyQuizDone: row.dailyQuizDone === true,
    weeklyReportReviewed: row.weeklyReportReviewed === true,
    sopWordCount: typeof row.sopWordCount === "number" && Number.isFinite(row.sopWordCount) ? Math.max(0, row.sopWordCount) : 0,
  };
}

export function missionEvidenceTime(
  type: string,
  target: number,
  baseline: SchollyMissionCriteria,
  evidence: MissionEvidence,
): Date | undefined {
  if (type === "fill_profile_fields") return evidence.profile;
  if (type === "sop_paragraph") return evidence.sop;
  if (type === "visa_practice") return evidence.visa;
  if (type === "daily_quiz") return evidence.quiz;
  if (type === "weekly_review") return evidence.report;
  if (type !== "save_universities" && type !== "upload_document") return undefined;
  const universities = type === "save_universities";
  const seen = new Set(universities ? baseline.savedUniversityIds : baseline.uploadedDocumentIds);
  return (universities ? evidence.universities : evidence.documents)
    .filter(item => !seen.has(item.id))
    .map(item => item.at)
    .sort((left, right) => left.getTime() - right.getTime())[target - 1];
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
