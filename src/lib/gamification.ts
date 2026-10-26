import { randomInt } from "crypto";
import { eq, and, desc, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { DAILY_ACTIVITY_REASON, computeDailyStreak, isStreakActivity } from "@/lib/streak";
import { profileCompletenessRatio, type ChancingProfile } from "@/lib/chancing";
import {
  userPoints,
  pointsLedger,
  levels,
  badges,
  userBadges,
  referrals,
  certificates,
  studentProfiles,
} from "@/db/schema";

/** Generate a unique-looking referral code (uppercase alphanumeric). */
export function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 10; i++) {
    code += chars[randomInt(chars.length)];
  }
  return code;
}

/** Ensure a points row exists for a profile. */
export async function ensureUserPoints(profileId: number) {
  const [existing] = await db
    .select()
    .from(userPoints)
    .where(eq(userPoints.profileId, profileId));

  if (existing) return existing;

  const [created] = await db
    .insert(userPoints)
    .values({ profileId, totalPoints: 0, currentLevel: 1 })
    .returning();
  return created;
}

export async function getTotalPoints(profileId: number): Promise<number> {
  const row = await ensureUserPoints(profileId);
  return row.totalPoints;
}

const DEFAULT_LEVELS: { name: string; minPoints: number; iconUrl: string }[] = [
  { name: "Explorer", minPoints: 0, iconUrl: "🌱" },
  { name: "Scholar", minPoints: 100, iconUrl: "🎓" },
  { name: "Achiever", minPoints: 250, iconUrl: "🏆" },
  { name: "Ambassador", minPoints: 500, iconUrl: "🌟" },
];

/** Fetch levels ordered by minPoints ascending (seeding defaults if empty). */
export async function getLevels() {
  const existing = await db.select().from(levels).limit(1);
  if (existing.length === 0) {
    await db.insert(levels).values(DEFAULT_LEVELS);
  }
  return db.select().from(levels).orderBy(levels.minPoints);
}

/** Compute the current level name/object from a point total. */
export function computeLevel(totalPoints: number, levelRows: typeof levels.$inferSelect[]): typeof levels.$inferSelect {
  let current = levelRows[0];
  for (const lvl of levelRows) {
    if (totalPoints >= lvl.minPoints) current = lvl;
  }
  return current ?? levelRows[0];
}

/** 0-100 profile completeness percentage. */
/**
 * The fields the completeness percentage is built from. Structural (not the
 * full row) so a lightweight query — e.g. the referral list, which only needs
 * a progress bar — can compute the exact same number the profile screen shows.
 */
export interface CompletenessInput extends ChancingProfile {
  name: string | null;
  email: string | null;
  targetMajor: string | null;
  degreeLevel: string | null;
  gpa: number | null;
  gpaScale: number | null;
  ieltsScore: number | null;
  toeflScore: number | null;
  satScore: number | null;
  greScore: number | null;
  budgetAnnualUsd: number | null;
  extracurriculars: string | null;
  workExperienceYears: number | null;
  researchPublications: number | null;
}

/** Uses the same validated profile facts and normalized coverage as chancing. */
export function computeProfileCompleteness(profile: CompletenessInput): number {
  return Math.round(profileCompletenessRatio(profile) * 100);
}

interface AwardResult {
  points: number;
  newTotal: number;
  level: typeof levels.$inferSelect | null;
  newlyAwardedBadges: (typeof badges.$inferSelect)[];
}

/**
 * Mark "the student showed up today" in the ledger.
 *
 * WHY: the daily streak is derived from `points_ledger`, but points are granted
 * once per entity (one award per lesson id, one per quiz id). A student who
 * re-watches a lesson or retakes a quiz — the normal way to study — earned no
 * new points, so the day was invisible to the streak and the counter froze at
 * the number of distinct days on which they did something NEW. That is why the
 * feature looked broken: 14 of the 15 profiles with any activity had exactly one
 * counted day, the day they signed up.
 *
 * The marker is a 0-point ledger row (it must never inflate totals or the
 * leaderboard) written at most once per profile per UTC day, so a long video
 * session or a page that retries cannot flood the table. The streak itself is
 * still projected into the caller's calendar day at read time, so the marker's
 * timestamp — not the dedupe window — decides which day it lands on.
 *
 * Returns true when a new marker was written.
 */
export async function recordDailyActivity(profileId: number): Promise<boolean> {
  if (!Number.isFinite(profileId) || profileId <= 0) return false;
  try {
    const result = await db.execute(sql`
      INSERT INTO points_ledger (profile_id, points, reason)
      SELECT ${profileId}, 0, ${DAILY_ACTIVITY_REASON}
      WHERE NOT EXISTS (
        SELECT 1 FROM points_ledger
        WHERE profile_id = ${profileId}
          AND reason = ${DAILY_ACTIVITY_REASON}
          -- UTC day start, independent of the connection's TimeZone setting:
          -- created_at is stored as a UTC wall clock (timestamp without tz).
          AND created_at >= date_trunc('day', now() AT TIME ZONE 'UTC')
      )
      RETURNING id
    `);
    return ((result as unknown as { rows?: unknown[] }).rows?.length ?? 0) > 0;
  } catch (err) {
    // Activity tracking must never break the action the student actually took.
    console.error("recordDailyActivity failed:", err);
    return false;
  }
}

/**
 * Award points to a profile: appends a ledger entry, updates the running total,
 * recomputes the level, and auto-grants any badges whose criteria are now met.
 * Idempotent when a relatedEntityId is provided (skips duplicate grants).
 */
export async function awardPoints(
  profileId: number,
  points: number,
  reason: string,
  relatedEntityId?: number | null
): Promise<AwardResult> {
  if (!points || points <= 0) {
    throw new Error("points must be a positive integer");
  }

  // A repeat action still means the student studied today: record the day
  // BEFORE the duplicate check below, which would otherwise return early and
  // leave a re-watched lesson uncounted.
  if (isStreakActivity(reason)) {
    await recordDailyActivity(profileId);
  }

  // Idempotency: skip if this exact grant already exists in the ledger.
  if (relatedEntityId != null) {
    const dup = await db
      .select()
      .from(pointsLedger)
      .where(
        and(
          eq(pointsLedger.profileId, profileId),
          eq(pointsLedger.reason, reason),
          eq(pointsLedger.relatedEntityId, relatedEntityId)
        )
      );
    if (dup.length > 0) {
      const row = await ensureUserPoints(profileId);
      const levelRows = await getLevels();
      return {
        points,
        newTotal: row.totalPoints,
        level: computeLevel(row.totalPoints, levelRows),
        newlyAwardedBadges: [],
      };
    }
  }

  await db.insert(pointsLedger).values({
    profileId,
    points,
    reason,
    relatedEntityId: relatedEntityId ?? null,
  });

  await ensureUserPoints(profileId);
  // Atomic increment: two simultaneous legitimate rewards must not overwrite
  // each other's totals (the old read + write sequence could lose one grant).
  const [updatedPoints] = await db
    .update(userPoints)
    .set({ totalPoints: sql`${userPoints.totalPoints} + ${points}`, updatedAt: new Date() })
    .where(eq(userPoints.profileId, profileId))
    .returning({ totalPoints: userPoints.totalPoints });
  const newTotal = updatedPoints.totalPoints;
  const levelRows = await getLevels();
  const currentLevel = computeLevel(newTotal, levelRows);

  await db
    .update(userPoints)
    .set({ currentLevel: currentLevel.id, updatedAt: new Date() })
    .where(eq(userPoints.profileId, profileId));

  const newlyAwardedBadges = await grantBadges(profileId);

  return {
    points,
    newTotal,
    level: currentLevel,
    newlyAwardedBadges,
  };
}

/** Evaluate a single badge's criteria for a profile. */
export async function evaluateBadge(
  profile: typeof studentProfiles.$inferSelect,
  badge: typeof badges.$inferSelect
): Promise<boolean> {
  const criteria = badge.criteria.trim();

  if (criteria.startsWith("points:")) {
    const min = parseInt(criteria.split(":")[1], 10);
    const row = await ensureUserPoints(profile.id);
    return row.totalPoints >= min;
  }

  if (criteria.startsWith("referral:")) {
    const min = parseInt(criteria.split(":")[1], 10) || 1;
    const [count] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(referrals)
      .where(
        and(
          eq(referrals.referrerProfileId, profile.id),
          eq(referrals.status, "completed")
        )
      );
    return (count?.c ?? 0) >= min;
  }

  if (criteria.startsWith("course:")) {
    const min = parseInt(criteria.split(":")[1], 10) || 1;
    const [count] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(certificates)
      .where(eq(certificates.profileId, profile.id));
    return (count?.c ?? 0) >= min;
  }

  if (criteria === "profile:complete") {
    return computeProfileCompleteness(profile) >= 90;
  }

  return false;
}

/** Auto-grant any badges whose criteria are now satisfied. Returns newly awarded. */
export async function grantBadges(profileId: number): Promise<(typeof badges.$inferSelect)[]> {
  const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, profileId));
  if (!profile) return [];

  const allBadges = await db.select().from(badges);
  const ownedRows = await db.select().from(userBadges).where(eq(userBadges.profileId, profileId));
  const ownedIds = new Set(ownedRows.map((r) => r.badgeId));

  const toGrant: (typeof badges.$inferSelect)[] = [];
  for (const badge of allBadges) {
    if (ownedIds.has(badge.id)) continue;
    if (await evaluateBadge(profile, badge)) {
      toGrant.push(badge);
    }
  }

  if (toGrant.length > 0) {
    await db.insert(userBadges).values(
      toGrant.map((b) => ({ profileId, badgeId: b.id }))
    );
  }

  return toGrant;
}

/** How far back the streak reads (the largest milestone is 365 days). */
const STREAK_HISTORY_DAYS = 400;
/** Safety net against pathological ledgers; 400 days of normal use stays far below it. */
const STREAK_HISTORY_MAX_ROWS = 20_000;

/** Return the full gamification snapshot for a profile. */
export async function getGamification(profileId: number, timeZone = "UTC") {
  const row = await ensureUserPoints(profileId);
  const levelRows = await getLevels();
  const level = computeLevel(row.totalPoints, levelRows);
  const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, profileId));

  const badgeRows = await db
    .select({
      badge: badges,
      awardedAt: userBadges.awardedAt,
    })
    .from(userBadges)
    .innerJoin(badges, eq(userBadges.badgeId, badges.id))
    .where(eq(userBadges.profileId, profileId))
    .orderBy(desc(userBadges.awardedAt));

  // Up to ~13 months of activity is enough for the visible streak and its
  // milestones (the longest is 365 days). The cap used to be a flat "last 1000
  // rows", which silently dropped older days for anyone who studied a lot — the
  // record run and the streak reset then depended on how chatty the ledger was,
  // not on the calendar. A date window keeps the answer honest; the row cap is
  // only a safety net for pathological accounts.
  const activitySince = new Date(Date.now() - STREAK_HISTORY_DAYS * 24 * 60 * 60 * 1000);
  const activityLedger = await db
    .select()
    .from(pointsLedger)
    .where(and(eq(pointsLedger.profileId, profileId), gte(pointsLedger.createdAt, activitySince)))
    .orderBy(desc(pointsLedger.createdAt))
    .limit(STREAK_HISTORY_MAX_ROWS);
  // Only actions the student performed themselves count towards the streak
  // (points received for someone else's like or referral must not extend it).
  const streakActivity = activityLedger.filter((entry) => isStreakActivity(entry.reason));
  const streak = computeDailyStreak(
    streakActivity.map((entry) => entry.createdAt),
    new Date(),
    timeZone
  );
  // The `ledger` payload is the points history the UI may show — the 0-point
  // activity markers are internal bookkeeping and stay out of it.
  const ledger = activityLedger.filter((entry) => entry.points > 0).slice(0, 50);

  // Next level target for the progress bar.
  let nextLevel = null;
  let pointsIntoLevel = row.totalPoints;
  let pointsForLevel = level.minPoints;
  for (const lvl of levelRows) {
    if (lvl.minPoints > row.totalPoints) {
      nextLevel = lvl;
      pointsIntoLevel = row.totalPoints - level.minPoints;
      pointsForLevel = lvl.minPoints - level.minPoints;
      break;
    }
  }

  const completeness = profile ? computeProfileCompleteness(profile) : 0;

  return {
    totalPoints: row.totalPoints,
    level,
    nextLevel,
    pointsIntoLevel,
    pointsForLevel,
    badges: badgeRows.map((b) => ({ ...b.badge, awardedAt: b.awardedAt })),
    ledger,
    streak,
    profileCompleteness: completeness,
  };
}

/** Fetch the leaderboard (top profiles by points). */
export async function getLeaderboard(limit = 20) {
  // Public leaderboard rows are deliberately anonymous until per-profile
  // publication consent is modeled. Do not select names, majors, or profile ids.
  const rows = await db
    .select({
      totalPoints: userPoints.totalPoints,
      levelName: levels.name,
      levelIcon: levels.iconUrl,
    })
    .from(userPoints)
    .leftJoin(levels, eq(userPoints.currentLevel, levels.id))
    .orderBy(desc(userPoints.totalPoints))
    .limit(limit);

  return rows.map((row, index) => ({ rank: index + 1, ...row }));
}
