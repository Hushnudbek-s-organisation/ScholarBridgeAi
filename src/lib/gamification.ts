import { randomInt } from "crypto";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { DAILY_ACTIVITY_REASON, isStreakActivity } from "@/lib/streak";
import { loadSchollyStreak } from "@/lib/scholly-streak.server";
import { schollyTimeZone } from "@/lib/scholly-mission-store.server";
import { isSupportedTimeZone } from "@/lib/scholly-profile";
import { logSchollyEvent } from "@/lib/scholly-events";
import { syncSchollyPointCache } from "@/lib/scholly-points-balance.server";
import type { SchollyPointBucket } from "@/lib/scholly-point-rules";
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
type Executor = Pick<typeof db, "select" | "insert" | "update" | "execute">;
async function withProfileLock<T>(profileId: number, run: (tx: Executor) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM student_profiles WHERE id = ${profileId} FOR NO KEY UPDATE`);
    return run(tx);
  });
}

export async function ensureUserPoints(profileId: number, executor: Executor = db) {
  const [existing] = await executor.select().from(userPoints).where(eq(userPoints.profileId, profileId));
  if (existing) return existing;
  await executor.insert(userPoints).values({ profileId, totalPoints: 0, currentLevel: 1 }).onConflictDoNothing({ target: userPoints.profileId });
  const [row] = await executor.select().from(userPoints).where(eq(userPoints.profileId, profileId));
  return row;
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
export async function getLevels(executor?: Executor): Promise<(typeof levels.$inferSelect)[]> {
  const connection = executor ?? db;
  const existing = await connection.select().from(levels).orderBy(levels.minPoints);
  if (existing.length > 0) return existing;
  if (!executor) return db.transaction((tx) => getLevels(tx));
  // Only the empty-table path locks. Different students cannot seed duplicates.
  await executor.execute(sql`SELECT pg_advisory_xact_lock(73624, 1)`);
  const again = await executor.select().from(levels).orderBy(levels.minPoints);
  if (again.length > 0) return again;
  await executor.insert(levels).values(DEFAULT_LEVELS);
  return executor.select().from(levels).orderBy(levels.minPoints);
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

async function schollyLedgerDay(profileId: number, recordedAt: string, executor: Executor) {
  const zone = await schollyTimeZone(profileId, executor);
  const timeZone = isSupportedTimeZone(zone) && !/^[+-]/.test(zone) ? zone : "Asia/Tashkent";
  const localBoundary = sql`date_trunc('day', timezone(${timeZone}, ${recordedAt}::timestamptz) - interval '4 hours') + interval '4 hours'`;
  return {
    start: sql`timezone('UTC', timezone(${timeZone}, ${localBoundary}))`,
    end: sql`timezone('UTC', timezone(${timeZone}, ${localBoundary} + interval '1 day'))`,
  };
}

/**
 * Mark "the student showed up today" in the ledger.
 *
 * WHY: the daily streak is derived from `points_ledger`, but points are granted
 * once per entity (one award per lesson id, one per quiz id). A student who
 * re-watches a lesson or retakes a quiz — the normal way to study — earned no
 * new points, so the day was invisible to the streak unless the student did
 * something new.
 *
 * The marker is a 0-point ledger row (it must never inflate totals or the
 * leaderboard) written at most once per profile per local 04:00 day.
 *
 * Returns true when a new marker was written.
 */
export async function recordDailyActivity(profileId: number, executor?: Executor): Promise<boolean> {
  if (!Number.isFinite(profileId) || profileId <= 0) return false;
  try {
    if (!executor) return await withProfileLock(profileId, (tx) => recordDailyActivity(profileId, tx));
    const recordedAt = new Date();
    const timestamp = recordedAt.toISOString();
    const { start, end } = await schollyLedgerDay(profileId, timestamp, executor);
    const result = await executor.execute(sql`
      INSERT INTO points_ledger (profile_id, points, reason, created_at)
      SELECT ${profileId}, 0, ${DAILY_ACTIVITY_REASON}, ${timestamp}::timestamptz AT TIME ZONE 'UTC'
      WHERE NOT EXISTS (
        SELECT 1 FROM points_ledger
        WHERE profile_id = ${profileId}
          AND reason = ${DAILY_ACTIVITY_REASON}
          AND created_at >= ${start}
          AND created_at < ${end}
      )
      RETURNING id
    `);
    const marked = result.rows.length > 0;
    if (marked) {
      const { awardSchollyStreakBonuses } = await import("./scholly-streak-bonuses.server");
      await awardSchollyStreakBonuses(profileId, executor, recordedAt);
    }
    return marked;
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
  relatedEntityId?: number | null,
  executor?: Executor,
  metadata?: { bucket: SchollyPointBucket; idempotencyKey: string; createdAt: Date },
): Promise<AwardResult> {
  if (!Number.isSafeInteger(points) || points <= 0 || points > 2_147_483_647) {
    throw new Error("points must be a positive integer");
  }

  const run = async (tx: Executor): Promise<AwardResult> => {
    // A repeat action still means the student studied today: record the day
    // BEFORE the duplicate check below, which would otherwise return early and
    // leave a re-watched lesson uncounted.
    if (isStreakActivity(reason)) {
      await recordDailyActivity(profileId, tx);
    }

    // Idempotency: skip if this exact grant already exists in the ledger.
    if (relatedEntityId != null && !metadata) {
      const dup = await tx
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
        const row = await ensureUserPoints(profileId, tx);
        const levelRows = await getLevels(tx);
        return {
          points,
          newTotal: row.totalPoints,
          level: computeLevel(row.totalPoints, levelRows),
          newlyAwardedBadges: [],
        };
      }
    }

    await tx.insert(pointsLedger).values({
      profileId,
      points,
      reason,
      relatedEntityId: relatedEntityId ?? null,
      ...metadata,
    });

    await ensureUserPoints(profileId, tx);
    // Atomic increment: two simultaneous legitimate rewards must not overwrite
    // each other's totals (the old read + write sequence could lose one grant).
    const [updatedPoints] = await tx
      .update(userPoints)
      .set({ totalPoints: sql`${userPoints.totalPoints} + ${points}`, updatedAt: new Date() })
      .where(eq(userPoints.profileId, profileId))
      .returning({ totalPoints: userPoints.totalPoints });
    const newTotal = updatedPoints.totalPoints;
    await syncSchollyPointCache(profileId, newTotal, tx);
    const levelRows = await getLevels(tx);
    const currentLevel = computeLevel(newTotal, levelRows);

    await tx
      .update(userPoints)
      .set({ currentLevel: currentLevel.id, updatedAt: new Date() })
      .where(eq(userPoints.profileId, profileId));

    const newlyAwardedBadges = await grantBadges(profileId, tx);
    const previousLevel = computeLevel(newTotal - points, levelRows);
    if (currentLevel.id !== previousLevel.id) {
      await logSchollyEvent(profileId, "level_up", { id: currentLevel.id, name: currentLevel.name }, tx);
    }

    return {
      points,
      newTotal,
      level: currentLevel,
      newlyAwardedBadges,
    };
  };

  if (executor) {
    await executor.execute(sql`SELECT id FROM student_profiles WHERE id = ${profileId} FOR NO KEY UPDATE`);
    return run(executor);
  }
  return withProfileLock(profileId, run);
}

/** Evaluate a single badge's criteria for a profile. */
export async function evaluateBadge(
  profile: typeof studentProfiles.$inferSelect,
  badge: typeof badges.$inferSelect,
  executor: Executor = db
): Promise<boolean> {
  const criteria = badge.criteria.trim();

  if (criteria.startsWith("points:")) {
    const min = parseInt(criteria.split(":")[1], 10);
    const row = await ensureUserPoints(profile.id, executor);
    return row.totalPoints >= min;
  }

  if (criteria.startsWith("referral:")) {
    const min = parseInt(criteria.split(":")[1], 10) || 1;
    const [count] = await executor
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
    const [count] = await executor
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
export async function grantBadges(profileId: number, executor?: Executor): Promise<(typeof badges.$inferSelect)[]> {
  if (!executor) return withProfileLock(profileId, (tx) => grantBadges(profileId, tx));
  const [profile] = await executor.select().from(studentProfiles).where(eq(studentProfiles.id, profileId));
  if (!profile) return [];

  const allBadges = await executor.select().from(badges);
  const ownedRows = await executor.select().from(userBadges).where(eq(userBadges.profileId, profileId));
  const ownedIds = new Set(ownedRows.map((r) => r.badgeId));

  const toGrant: (typeof badges.$inferSelect)[] = [];
  for (const badge of allBadges) {
    if (ownedIds.has(badge.id)) continue;
    if (await evaluateBadge(profile, badge, executor)) {
      toGrant.push(badge);
    }
  }

  if (toGrant.length > 0) {
    await executor.insert(userBadges).values(
      toGrant.map((b) => ({ profileId, badgeId: b.id }))
    );
  }

  return toGrant;
}

const POINTS_HISTORY_DAYS = 400;
const POINTS_HISTORY_SIZE = 50;

/** Return the full gamification snapshot for a profile. */
export async function getGamification(profileId: number, timeZone = "Asia/Tashkent", dayStartHour = 4) {
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

  const now = new Date();
  const activitySince = new Date(now.getTime() - POINTS_HISTORY_DAYS * 24 * 60 * 60 * 1000);
  const [ledger, streak] = await Promise.all([
    db.select().from(pointsLedger)
      .where(and(eq(pointsLedger.profileId, profileId), gte(pointsLedger.createdAt, activitySince), sql`${pointsLedger.points} > 0`))
      .orderBy(desc(pointsLedger.createdAt))
      .limit(POINTS_HISTORY_SIZE),
    loadSchollyStreak(profileId, now, timeZone, dayStartHour),
  ]);

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
