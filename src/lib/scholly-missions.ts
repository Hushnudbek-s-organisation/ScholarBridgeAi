import type { SchollySegment } from "./scholly-audience";

export const SCHOLLY_DEPARTURE_KIND = "departure";

export const SCHOLLY_MISSION_TYPES = ["fill_profile_fields", "save_universities", "upload_document", "sop_paragraph", "ielts_vocabulary", "visa_practice"] as const;
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
  hasIeltsScoreGap?: boolean;
  hasDepartureWithinSixtyDays?: boolean;
  latestVisaPracticeId?: number;
}

export interface SchollyMissionHistory {
  recentStatuses: readonly string[];
  completedStreak: number;
  segments?: readonly SchollySegment[];
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
  latestVisaPracticeId?: number;
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
  if (!rows.length) return { recentStatuses: [], completedStreak: 0 };
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
  if (context.hasIeltsScoreGap) choices.push({ type: "ielts_vocabulary", targetCount: 5 });
  if (context.hasDepartureWithinSixtyDays && !context.latestVisaPracticeId) choices.push({ type: "visa_practice", targetCount: 1 });
  if (context.hasIncompleteRequiredDocuments) choices.push({ type: "upload_document", targetCount: 1 });

  const fallback: Record<SchollyMissionTheme, SchollyMissionType> = {
    plan: context.missingProfileFields.length ? "fill_profile_fields" : "save_universities",
    writing: "sop_paragraph",
    language: "ielts_vocabulary",
    search: "save_universities",
    speaking: "visa_practice",
    light: "save_universities",
    review: context.missingProfileFields.length ? "fill_profile_fields" : "sop_paragraph",
  };
  const targets: Record<SchollyMissionType, number> = {
    fill_profile_fields: Math.max(1, Math.min(2, context.missingProfileFields.length)),
    save_universities: 1, upload_document: 1, sop_paragraph: 50, ielts_vocabulary: 5, visa_practice: 1,
  };
  choices.push({ type: fallback[theme], targetCount: targets[fallback[theme]] });
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
  const shortSession = history.segments?.some((segment) => segment === "new" || segment === "cooling" || segment === "returned");
  const reduceSize = missedInRecentThree >= 2 || shortSession;
  const isStar = history.completedStreak >= 5;
  let targetCount = selected.targetCount;
  if (reduceSize) {
    targetCount = selected.type === "sop_paragraph" ? 25 : 1;
  } else if (isStar) {
    if (selected.type === "fill_profile_fields") targetCount = Math.min(context.missingProfileFields.length, targetCount + 1);
    if (selected.type === "save_universities") targetCount++;
    if (selected.type === "sop_paragraph") targetCount += 25;
    if (selected.type === "ielts_vocabulary") targetCount += 2;
  }
  const sizeMin = reduceSize ? 1 : isStar || selected.type === "sop_paragraph" ? 5 : 3;
  const missionTheme = selected.type === "ielts_vocabulary" ? "language" : selected.type === "visa_practice" ? "speaking" : theme;
  return { type: selected.type, targetCount, sizeMin, isStar, points: isStar ? 20 : 10, theme: missionTheme };
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
  } else if (type === "sop_paragraph") {
    progress = Math.max(0, current.sopWordCount - baseline.sopWordCount);
  } else if (type === "visa_practice") {
    progress = (current.latestVisaPracticeId ?? 0) > (baseline.latestVisaPracticeId ?? 0) ? 1 : 0;
  }
  // Older short SOP rows stored 1 while displaying and requiring 50 words.
  let target = Math.max(1, targetCount);
  if (type === "sop_paragraph" && target === 1) target = 50;
  if (type === "fill_profile_fields") target = Math.max(1, Math.min(target, baseline.missingFields.length));
  const boundedProgress = Math.min(progress, target);
  return { progress: boundedProgress, target, complete: boundedProgress >= target };
}
