import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { badges, schollyEvents, studentProfiles, userBadges } from "@/db/schema";
import { profileCompletenessRatio } from "@/lib/chancing";
import { loadSavedActivities, toChancingProfile } from "@/lib/profileMapping";
import { classifySchollyAudience, SCHOLLY_VISIT_INTERVAL_MS } from "./scholly-audience";

type Reader = Pick<typeof db, "select">;

export async function loadSchollyAudience(
  profileId: number,
  timeZone: string,
  options: { now?: Date; nearestDeadlineDays?: number | null } = {},
  reader: Reader = db,
) {
  const { now = new Date(), nearestDeadlineDays } = options;
  const [profileRows, recentVisits, previousVisit, activities] = await Promise.all([
    reader.select().from(studentProfiles).where(eq(studentProfiles.id, profileId)).limit(1),
    reader.select({ createdAt: schollyEvents.createdAt }).from(schollyEvents)
      .where(and(eq(schollyEvents.userId, profileId), eq(schollyEvents.type, "dashboard_open"),
        gte(schollyEvents.createdAt, new Date(now.getTime() - 3 * 86_400_000))))
      .orderBy(desc(schollyEvents.createdAt)).limit(180),
    reader.select({ createdAt: schollyEvents.createdAt }).from(schollyEvents)
      .where(and(eq(schollyEvents.userId, profileId), eq(schollyEvents.type, "dashboard_open"),
        lt(schollyEvents.createdAt, new Date(now.getTime() - 2 * 86_400_000))))
      .orderBy(desc(schollyEvents.createdAt)).limit(1),
    loadSavedActivities(profileId, reader),
  ]);
  const profile = profileRows[0];
  if (!profile) return [];
  return classifySchollyAudience({
    now, timeZone, nearestDeadlineDays,
    registeredAt: profile.createdAt,
    visits: [...recentVisits, ...previousVisit].map((row) => row.createdAt),
    profileCompleteness: Math.round(profileCompletenessRatio({ ...toChancingProfile(profile), savedActivities: activities }) * 100),
  });
}

export async function recordSchollyDashboardVisit(profileId: number, now: Date) {
  const start = new Date(Math.floor(now.getTime() / SCHOLLY_VISIT_INTERVAL_MS) * SCHOLLY_VISIT_INTERVAL_MS);
  // Serialize app requests within one visitor's bucket so concurrent dashboard
  // requests record a single visit without taking a lock used by points writes.
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(73625, ${profileId}::integer)`);
    const [existing] = await tx.select({ id: schollyEvents.id }).from(schollyEvents)
      .where(and(eq(schollyEvents.userId, profileId), eq(schollyEvents.type, "dashboard_open"),
        gte(schollyEvents.createdAt, start)))
      .limit(1);
    if (!existing) await tx.insert(schollyEvents).values({ userId: profileId, type: "dashboard_open", createdAt: now });
  });
}

export async function loadRecentSchollyAchievements(profileId: number, now: Date) {
  const since = new Date(now.getTime() - 86_400_000);
  const [badgeRows, levelRows] = await Promise.all([
    db.select({ id: badges.id, name: badges.name }).from(userBadges)
      .innerJoin(badges, eq(userBadges.badgeId, badges.id))
      .where(and(eq(userBadges.profileId, profileId), gte(userBadges.awardedAt, since)))
      .orderBy(desc(userBadges.awardedAt)).limit(3),
    db.select({ payload: schollyEvents.payload }).from(schollyEvents)
      .where(and(eq(schollyEvents.userId, profileId), eq(schollyEvents.type, "level_up"),
        gte(schollyEvents.createdAt, since)))
      .orderBy(desc(schollyEvents.createdAt)).limit(1),
  ]);
  const payload = levelRows[0]?.payload;
  const level = payload && typeof payload === "object" && "id" in payload && "name" in payload
    && typeof payload.id === "number" && typeof payload.name === "string"
    ? { id: payload.id, name: payload.name } : null;
  return { badges: badgeRows, level };
}
