export const SCHOLLY_MISSION_TYPES = ["fill_profile_fields", "save_universities", "upload_document", "sop_paragraph"] as const;
export type SchollyMissionType = (typeof SCHOLLY_MISSION_TYPES)[number];
export type SchollyMissionTheme = "plan" | "writing" | "language" | "search" | "speaking" | "light" | "review";

export const SCHOLLY_PROFILE_FIELDS = [
  "country", "targetMajor", "degreeLevel", "gpa", "ieltsScore", "budgetAnnualUsd", "preferredCountries",
] as const;
export type SchollyProfileField = (typeof SCHOLLY_PROFILE_FIELDS)[number];

export interface SchollyMissionContext {
  day: string;
  timezone: string;
  missingProfileFields: SchollyProfileField[];
  savedUniversityIds: number[];
  uploadedDocumentIds: number[];
  sopWordCount: number;
  hasDeadlineWithinSevenDays: boolean;
  hasIncompleteRequiredDocuments: boolean;
}

export interface SchollyMissionHistory {
  recentStatuses: readonly string[];
  completedStreak: number;
}

export interface SchollyMissionChoice {
  type: SchollyMissionType;
  sizeMin: number;
  points: 10 | 20;
  targetCount: number;
  isStar: boolean;
  theme: SchollyMissionTheme;
}

export interface SchollyMissionCriteria {
  missingFields: SchollyProfileField[];
  savedUniversityIds: number[];
  uploadedDocumentIds: number[];
  sopWordCount: number;
}

export interface SchollyMissionProgress {
  progress: number;
  target: number;
  complete: boolean;
}

export function schollyDayKey(now: Date, timeZone: string, dayStartHour = 4): string {
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23",
    });
  } catch {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tashkent", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23",
    });
  }
  const parts = formatter.formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "0";
  const localDate = `${value("year")}-${value("month")}-${value("day")}`;
  const hour = Number(value("hour"));
  if (!Number.isInteger(dayStartHour) || dayStartHour < 0 || dayStartHour > 23 || hour >= dayStartHour) return localDate;
  const shifted = new Date(`${localDate}T00:00:00.000Z`);
  shifted.setUTCDate(shifted.getUTCDate() - 1);
  return shifted.toISOString().slice(0, 10);
}

export function schollyThemeForDay(day: string): SchollyMissionTheme {
  const parsed = new Date(`${day}T12:00:00.000Z`);
  const weekday = parsed.getUTCDay();
  return (["review", "plan", "writing", "language", "search", "speaking", "light"] as const)[weekday];
}

export function buildSchollyMissionHistory(day: string, rows: readonly { day: string; status: string }[]): SchollyMissionHistory {
  const statusByDay = new Map(rows.map((row) => [row.day, row.status]));
  const recentStatuses = [1, 2, 3].map((offset) => statusByDay.get(shiftMissionDay(day, -offset)) ?? "missed");
  let completedStreak = 0;
  let expectedDay = shiftMissionDay(day, -1);
  for (const row of rows) {
    if (row.day !== expectedDay || row.status !== "done") break;
    completedStreak++;
    expectedDay = shiftMissionDay(expectedDay, -1);
  }
  return { recentStatuses, completedStreak };
}

function shiftMissionDay(day: string, amount: number) {
  const date = new Date(`${day}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function candidates(context: SchollyMissionContext, theme: SchollyMissionTheme): { type: SchollyMissionType; targetCount: number }[] {
  const choices: { type: SchollyMissionType; targetCount: number }[] = [];
  if (context.hasDeadlineWithinSevenDays && context.hasIncompleteRequiredDocuments) choices.push({ type: "upload_document", targetCount: 1 });
  if (context.missingProfileFields.length) choices.push({ type: "fill_profile_fields", targetCount: Math.min(2, context.missingProfileFields.length) });
  if (context.savedUniversityIds.length < 3) choices.push({ type: "save_universities", targetCount: Math.max(1, 3 - context.savedUniversityIds.length) });
  if (context.sopWordCount < 500) choices.push({ type: "sop_paragraph", targetCount: 50 });
  if (context.hasIncompleteRequiredDocuments) choices.push({ type: "upload_document", targetCount: 1 });

  const fallback: Record<SchollyMissionTheme, SchollyMissionType> = {
    plan: context.missingProfileFields.length ? "fill_profile_fields" : "save_universities",
    writing: "sop_paragraph",
    language: context.sopWordCount < 500 ? "sop_paragraph" : "save_universities",
    search: "save_universities",
    speaking: context.sopWordCount < 500 ? "sop_paragraph" : "save_universities",
    light: "save_universities",
    review: context.missingProfileFields.length ? "fill_profile_fields" : "sop_paragraph",
  };
  choices.push({ type: fallback[theme], targetCount: fallback[theme] === "save_universities" ? 1 : fallback[theme] === "fill_profile_fields" ? Math.min(2, context.missingProfileFields.length) || 1 : 50 });
  return choices;
}

export function pickSchollyMission(
  context: SchollyMissionContext,
  history: SchollyMissionHistory = { recentStatuses: [], completedStreak: 0 },
  excludeType?: SchollyMissionType,
): SchollyMissionChoice {
  const theme = schollyThemeForDay(context.day);
  const selected = candidates(context, theme).find((candidate) => candidate.type !== excludeType)
    ?? { type: "save_universities" as const, targetCount: 1 };
  const missedInRecentThree = history.recentStatuses.slice(0, 3).filter((status) => status !== "done").length;
  const reduceSize = missedInRecentThree >= 2;
  const isStar = history.completedStreak >= 5;
  const baseSize: Record<SchollyMissionType, number> = {
    fill_profile_fields: 2,
    save_universities: 3,
    upload_document: 3,
    sop_paragraph: 5,
  };
  let targetCount = selected.targetCount;
  if (reduceSize) targetCount = 1;
  if (isStar && !reduceSize && (selected.type === "fill_profile_fields" || selected.type === "save_universities")) targetCount++;
  const sizeMin = reduceSize ? 1 : Math.min(5, baseSize[selected.type] + (isStar ? 1 : 0));
  return { type: selected.type, targetCount, sizeMin, isStar, points: isStar ? 20 : 10, theme };
}

export function missionProgress(
  type: SchollyMissionType,
  targetCount: number,
  baseline: SchollyMissionCriteria,
  current: SchollyMissionCriteria,
): SchollyMissionProgress {
  let progress = 0;
  if (type === "fill_profile_fields") {
    const now = new Set(current.missingFields);
    progress = baseline.missingFields.filter((field) => !now.has(field)).length;
  } else if (type === "save_universities") {
    const existing = new Set(baseline.savedUniversityIds);
    progress = current.savedUniversityIds.filter((id) => !existing.has(id)).length;
  } else if (type === "upload_document") {
    const existing = new Set(baseline.uploadedDocumentIds);
    progress = current.uploadedDocumentIds.filter((id) => !existing.has(id)).length;
  } else {
    progress = Math.max(0, current.sopWordCount - baseline.sopWordCount);
  }
  const target = type === "sop_paragraph" ? Math.max(50, targetCount) : Math.max(1, targetCount);
  const boundedProgress = Math.min(progress, target);
  return { progress: boundedProgress, target, complete: boundedProgress >= target };
}
