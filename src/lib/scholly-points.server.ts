import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { pointsLedger, studentProfiles } from "@/db/schema";
import { awardPoints } from "@/lib/gamification";
import { logSchollyEvent } from "@/lib/scholly-events";
import { readSchollyBalance } from "@/lib/scholly-points-balance.server";
import { SCHOLLY_POINT_RULES, SCHOLLY_SMALL_LIMIT, type SchollyPointReason, type SchollyPointsSummary } from "@/lib/scholly-point-rules";
import { schollyTimeZone } from "@/lib/scholly-mission-store.server";
import { isSupportedTimeZone } from "@/lib/scholly-profile";
import { SCHOLLY_LEVEL_THRESHOLDS } from "@/lib/scholly-levels";

type Executor = Pick<typeof db, "execute" | "select" | "insert" | "update">;
type AwardOptions = { relatedEntityId?: number; at?: Date; points?: number };
const smallReasons = Object.values(SCHOLLY_POINT_RULES).filter(rule => rule.bucket === "small").map(rule => rule.ledgerReason);
const ruleByLegacyReason = new Map<string, SchollyPointReason>(Object.entries(SCHOLLY_POINT_RULES).map(
  ([key, rule]) => [rule.ledgerReason, key as SchollyPointReason],
));
const legacyClaims = new Set<SchollyPointReason>(["profile_field_filled", "university_saved", "daily_quiz", "mission_complete", "application_submitted"]);

async function ledgerWindow(profileId: number, at: Date, tx: Executor, window: "day" | "month") {
  const saved = await schollyTimeZone(profileId, tx);
  const zone = isSupportedTimeZone(saved) && !/^[+-]/.test(saved) ? saved : "Asia/Tashkent";
  const local = sql`timezone(${zone}, ${at.toISOString()}::timestamptz)`;
  const start = window === "day"
    ? sql`date_trunc('day', ${local} - interval '4 hours') + interval '4 hours'`
    : sql`date_trunc('month', ${local})`;
  const end = window === "day" ? sql`${start} + interval '1 day'` : sql`${start} + interval '1 month'`;
  return and(
    sql`${pointsLedger.createdAt} >= timezone('UTC', timezone(${zone}, ${start}))`,
    sql`${pointsLedger.createdAt} < timezone('UTC', timezone(${zone}, ${end}))`,
  );
}

/** In an action's transaction, record both positive and capped claims exactly once. */
export async function awardSchollyPoints(
  profileId: number, reason: SchollyPointReason, key: string, tx: Executor, options: AwardOptions = {},
) {
  const rule = SCHOLLY_POINT_RULES[reason];
  const requested = options.points ?? rule.amounts[0];
  if (!(rule.amounts as readonly number[]).includes(requested) || !key || key.length > 240) {
    throw new Error("Invalid Scholly point claim");
  }
  const at = options.at ?? new Date();
  const idempotencyKey = `scholly:${profileId}:${key}`;
  const relatedEntityId = options.relatedEntityId ?? null;
  const empty = { points: 0, awarded: false, limited: false };

  const [profile] = await tx.select({ id: studentProfiles.id }).from(studentProfiles)
    .where(eq(studentProfiles.id, profileId)).for("no key update").limit(1);
  if (!profile) return empty;
  const [claimed] = await tx.select({ id: pointsLedger.id }).from(pointsLedger)
    .where(eq(pointsLedger.idempotencyKey, idempotencyKey)).limit(1);
  if (claimed) return empty;
  if (relatedEntityId !== null && legacyClaims.has(reason)) {
    const [legacy] = await tx.select({ id: pointsLedger.id }).from(pointsLedger).where(and(
      eq(pointsLedger.profileId, profileId), eq(pointsLedger.reason, rule.ledgerReason),
      eq(pointsLedger.relatedEntityId, relatedEntityId), isNull(pointsLedger.idempotencyKey),
    )).limit(1);
    if (legacy) return empty;
  }

  let points = requested;
  if (rule.bucket === "small") {
    const day = await ledgerWindow(profileId, at, tx, "day");
    const [total] = await tx.select({ points: sql<number>`coalesce(sum(${pointsLedger.points}), 0)::int` })
      .from(pointsLedger).where(and(eq(pointsLedger.profileId, profileId), inArray(pointsLedger.reason, smallReasons), day));
    points = Math.min(points, Math.max(0, SCHOLLY_SMALL_LIMIT - total.points));
  }
  if (points && ("dailyLimit" in rule || "monthlyLimit" in rule)) {
    const period = await ledgerWindow(profileId, at, tx, "monthlyLimit" in rule ? "month" : "day");
    const [total] = await tx.select({ count: sql<number>`count(*)::int` }).from(pointsLedger).where(and(
      eq(pointsLedger.profileId, profileId), eq(pointsLedger.reason, rule.ledgerReason), period,
      sql`${pointsLedger.points} > 0`,
    ));
    const limit = "monthlyLimit" in rule ? rule.monthlyLimit : rule.dailyLimit;
    if (total.count >= limit) points = 0;
  }

  const metadata = { bucket: rule.bucket, idempotencyKey, createdAt: at };
  if (points === 0) {
    await tx.insert(pointsLedger).values({ profileId, points, reason: rule.ledgerReason, relatedEntityId, ...metadata });
  } else {
    await awardPoints(profileId, points, rule.ledgerReason, relatedEntityId, tx, metadata);
    await logSchollyEvent(profileId, "points_awarded", { reason: rule.ledgerReason, award: reason, relatedEntityId, points }, tx);
  }
  return { points, awarded: points > 0, limited: points < requested };
}

export async function getSchollyPointsSummary(profileId: number): Promise<SchollyPointsSummary> {
  return db.transaction(async tx => {
    const balance = await readSchollyBalance(profileId, tx);
    const day = await ledgerWindow(profileId, new Date(), tx, "day");
    const reasons = await tx.select({ reason: pointsLedger.reason, points: sql<number>`sum(${pointsLedger.points})::int` })
      .from(pointsLedger).where(and(
        eq(pointsLedger.profileId, profileId), day,
        inArray(pointsLedger.reason, [...ruleByLegacyReason.keys()]), sql`${pointsLedger.points} > 0`,
      )).groupBy(pointsLedger.reason);
    const todayByReason: SchollyPointsSummary["todayByReason"] = {};
    let todayPoints = 0;
    let smallPoints = 0;
    for (const { reason, points } of reasons) {
      const key = ruleByLegacyReason.get(reason);
      if (!key) continue;
      todayByReason[key] = points;
      todayPoints += points;
      if (SCHOLLY_POINT_RULES[key].bucket === "small") smallPoints += points;
    }
    const level = SCHOLLY_LEVEL_THRESHOLDS.filter(threshold => balance.lifetimePoints >= threshold).length;
    return { ...balance, level, nextLevelAt: SCHOLLY_LEVEL_THRESHOLDS[level] ?? null,
      todayPoints, smallPoints: Math.min(smallPoints, SCHOLLY_SMALL_LIMIT), smallLimit: SCHOLLY_SMALL_LIMIT, todayByReason };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
}
