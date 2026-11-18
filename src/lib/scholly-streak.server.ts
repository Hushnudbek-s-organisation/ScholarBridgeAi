import { and, eq, gte, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { dailyMissions, pointsLedger } from "@/db/schema";
import { schollyTimeZone } from "@/lib/scholly-mission-store.server";
import { schollyDayKey } from "@/lib/scholly-missions";
import { isSupportedTimeZone } from "@/lib/scholly-profile";
import { computeSchollyStreak, STREAK_ACTIVITY_REASONS } from "@/lib/streak";

export async function loadSchollyStreakEvidence(
  profileId: number,
  now: Date = new Date(),
  preferredTimeZone?: string,
  dayStartHour = 4,
  reader: Pick<typeof db, "select"> = db,
  since?: Date,
) {
  const savedTimeZone = preferredTimeZone ?? await schollyTimeZone(profileId, reader);
  const timeZone = isSupportedTimeZone(savedTimeZone) && !/^[+-]/.test(savedTimeZone) ? savedTimeZone : "Asia/Tashkent";
  const boundary = Number.isInteger(dayStartHour) && dayStartHour >= 0 && dayStartHour <= 23 ? dayStartHour : 4;
  const today = schollyDayKey(now, timeZone, boundary);
  // The ledger's timestamp without timezone is a UTC wall clock. Project it
  // into the saved zone, then shift by the local day boundary before grouping.
  const day = sql<string>`to_char(timezone(${timeZone}, ${pointsLedger.createdAt} AT TIME ZONE 'UTC') - make_interval(hours => ${boundary}), 'YYYY-MM-DD')`;
  const [activity, missions] = await Promise.all([
    reader.select({ day }).from(pointsLedger)
      .where(and(
        eq(pointsLedger.profileId, profileId),
        inArray(pointsLedger.reason, [...STREAK_ACTIVITY_REASONS]),
        lte(pointsLedger.createdAt, now),
        since ? gte(pointsLedger.createdAt, since) : undefined,
      )).groupBy(sql`1`),
    reader.select({ day: dailyMissions.day, doneAt: dailyMissions.doneAt }).from(dailyMissions)
      .where(and(eq(dailyMissions.userId, profileId), eq(dailyMissions.status, "done"), isNotNull(dailyMissions.doneAt),
        since ? gte(dailyMissions.doneAt, since) : undefined)),
  ]);
  return {
    activityDays: activity.map(row => row.day),
    missions: missions.flatMap(({ day, doneAt }) => doneAt ? [{ day, doneAt }] : []),
    today,
    timeZone,
  };
}

export async function loadSchollyStreak(
  profileId: number,
  now: Date = new Date(),
  preferredTimeZone?: string,
  dayStartHour = 4,
) {
  const evidence = await loadSchollyStreakEvidence(profileId, now, preferredTimeZone, dayStartHour);
  return computeSchollyStreak(evidence.activityDays, evidence.missions, evidence.today, now);
}
