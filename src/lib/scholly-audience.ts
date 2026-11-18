import { schollyDayKey } from "./scholly-missions";

export type SchollySegment =
  | "new" | "active" | "cooling" | "returned" | "deadline-near" | "incomplete-profile";

export const SCHOLLY_VISIT_INTERVAL_MS = 30 * 60_000;
const DAY_MS = 86_400_000;

export function classifySchollyAudience(input: {
  now: Date;
  timeZone: string;
  registeredAt: Date;
  visits: readonly Date[];
  profileCompleteness: number;
  nearestDeadlineDays?: number | null;
}): SchollySegment[] {
  const { now, timeZone, registeredAt, visits, profileCompleteness, nearestDeadlineDays } = input;
  const segments: SchollySegment[] = [];
  const today = schollyDayKey(now, timeZone);
  const ageOf = (date: Date) => (Date.parse(today) - Date.parse(schollyDayKey(date, timeZone))) / DAY_MS;
  const registrationAge = ageOf(registeredAt);
  if (registrationAge >= 0 && registrationAge <= 3) segments.push("new");

  const nowMs = now.getTime();
  const recentVisitBuckets = new Set<number>([Math.floor(nowMs / SCHOLLY_VISIT_INTERVAL_MS)]);
  let latestPreviousDayVisit: Date | undefined;
  for (const visit of visits) {
    const visitMs = visit.getTime();
    if (!Number.isFinite(visitMs) || visitMs > nowMs) continue;
    if (nowMs - visitMs <= 3 * DAY_MS) recentVisitBuckets.add(Math.floor(visitMs / SCHOLLY_VISIT_INTERVAL_MS));
    const age = ageOf(visit);
    if (age > 0 && (!latestPreviousDayVisit || visit > latestPreviousDayVisit)) latestPreviousDayVisit = visit;
  }
  if (recentVisitBuckets.size >= 2) segments.push("active");

  if (latestPreviousDayVisit) {
    const gap = ageOf(latestPreviousDayVisit);
    if (gap >= 7) segments.push("returned");
    else if (gap >= 3) segments.push("cooling");
  }
  if (nearestDeadlineDays != null && nearestDeadlineDays >= 0 && nearestDeadlineDays <= 7) segments.push("deadline-near");
  if (profileCompleteness < 60) segments.push("incomplete-profile");
  return segments;
}
