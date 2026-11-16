import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { dailyMissions } from "@/db/schema";
import { awardPoints, getTotalPoints } from "@/lib/gamification";
import { logSchollyEvent } from "@/lib/scholly-events";
import { checkSchollySeasonalRewards } from "@/lib/scholly-wardrobe.server";
import { loadSchollyAudience } from "@/lib/scholly-audience.server";
import { gradeIeltsExercise, publicIeltsExercise } from "@/lib/scholly-ielts.server";
import { requireProfileAccess } from "@/lib/auth";
import { privateNoStoreJson } from "@/lib/apiResponse";
import { readJsonBody } from "@/lib/request";
import {
  SCHOLLY_MISSION_TYPES,
  missionProgress,
  pickSchollyMission,
  type SchollyMissionType,
} from "@/lib/scholly-missions";
import {
  criteriaFromStored,
  currentSchollyDay,
  ensureSchollyProfile,
  loadSchollyMissionContext,
  missionCriteriaFromContext,
  recentSchollyMissionHistory,
} from "@/lib/scholly-mission-store.server";

const MISSION_TYPES = new Set<SchollyMissionType>(SCHOLLY_MISSION_TYPES);

function missionPayload(row: typeof dailyMissions.$inferSelect, progress: ReturnType<typeof missionProgress>) {
  const shownProgress = row.status === "done"
    ? { progress: progress.target, target: progress.target, complete: true }
    : progress;
  return {
    id: row.id,
    day: row.day,
    type: row.type,
    theme: row.theme,
    sizeMin: row.sizeMin,
    points: row.points,
    targetCount: row.targetCount,
    isStar: row.isStar,
    status: row.status,
    anotherUsed: row.anotherUsed,
    progress: shownProgress.progress,
    target: shownProgress.target,
    complete: row.status === "done" || progress.complete,
    exercise: row.status === "pending" && row.type === "ielts_vocabulary"
      ? publicIeltsExercise(row.day, row.targetCount) : undefined,
  };
}

async function getOrCreateMission(profileId: number, day: string, timezone: string) {
  const existing = await db.select().from(dailyMissions)
    .where(and(eq(dailyMissions.userId, profileId), eq(dailyMissions.day, day))).limit(1);
  if (existing[0]) return existing[0];

  const [context, history, segments] = await Promise.all([
    loadSchollyMissionContext(profileId, day, timezone),
    recentSchollyMissionHistory(profileId, day),
    loadSchollyAudience(profileId, timezone),
  ]);
  const choice = pickSchollyMission(context, { ...history, segments });
  await db.transaction(async (tx) => {
    const [created] = await tx.insert(dailyMissions).values({
      userId: profileId,
      day,
      type: choice.type,
      sizeMin: choice.sizeMin,
      points: choice.points,
      targetCount: choice.targetCount,
      theme: choice.theme,
      isStar: choice.isStar,
      criteria: missionCriteriaFromContext(context),
    }).onConflictDoNothing({ target: [dailyMissions.userId, dailyMissions.day] }).returning();
    if (created) await logSchollyEvent(profileId, "mission_shown", { missionId: created.id, type: created.type, day }, tx);
  });
  const [row] = await db.select().from(dailyMissions)
    .where(and(eq(dailyMissions.userId, profileId), eq(dailyMissions.day, day))).limit(1);
  if (!row) throw new Error("Daily mission could not be created");
  return row;
}

async function evaluateMission(
  profileId: number, row: typeof dailyMissions.$inferSelect, day: string, timezone: string,
  ielts?: { missionId: number; answers: unknown },
) {
  return db.transaction(async (tx) => {
    const [locked] = await tx.select().from(dailyMissions)
      .where(eq(dailyMissions.id, row.id)).for("update").limit(1);
    if (!locked) return { error: "This mission is no longer available", status: 409 as const };
    const target = locked.targetCount;
    let progress = { progress: 0, target, complete: false };
    if (ielts && (ielts.missionId !== locked.id || locked.type !== "ielts_vocabulary" || locked.status === "skipped")) {
      return { error: "This IELTS exercise is no longer available", status: 409 as const };
    }
    if (locked.type === "ielts_vocabulary") {
      if (ielts && locked.status === "pending") {
        const correct = gradeIeltsExercise(locked.day, target, ielts.answers);
        if (correct === null) return { error: "Submit one answer per question", status: 400 as const };
        progress = { progress: correct, target, complete: correct === target };
        if (!progress.complete) return { row: locked, progress, justCompleted: false, ieltsCorrect: correct };
      }
    } else {
      const context = await loadSchollyMissionContext(profileId, day, timezone, tx);
      progress = missionProgress(locked.type as SchollyMissionType, target,
        criteriaFromStored(locked.criteria), missionCriteriaFromContext(context));
    }
    if (locked.status !== "pending" || !progress.complete) return { row: locked, progress, justCompleted: false };

    const [done] = await tx.update(dailyMissions).set({ status: "done", doneAt: new Date() })
      .where(and(eq(dailyMissions.id, locked.id), eq(dailyMissions.status, "pending"))).returning();
    if (!done) return { row: locked, progress, justCompleted: false };
    await awardPoints(profileId, done.points, "scholly_daily_mission", done.id, tx);
    await logSchollyEvent(profileId, "mission_done", { missionId: done.id, type: done.type, points: done.points, day: done.day }, tx);
    return { row: done, progress, justCompleted: true };
  });
}

async function responseFor(profileId: number, ielts?: { missionId: number; answers: unknown }) {
  if (!await ensureSchollyProfile(profileId)) return privateNoStoreJson({ error: "Profile not found" }, { status: 404 });
  const { day, timeZone } = await currentSchollyDay(profileId);
  const row = ielts
    ? (await db.select().from(dailyMissions).where(and(eq(dailyMissions.id, ielts.missionId),
      eq(dailyMissions.userId, profileId), eq(dailyMissions.day, day))).limit(1))[0]
    : await getOrCreateMission(profileId, day, timeZone);
  if (!row) return privateNoStoreJson({ error: "This IELTS exercise is no longer available" }, { status: 409 });
  const evaluated = await evaluateMission(profileId, row, day, timeZone, ielts);
  if ("error" in evaluated) return privateNoStoreJson({ error: evaluated.error }, { status: evaluated.status });
  if (evaluated.row.status === "done") await checkSchollySeasonalRewards(profileId, day);
  const points = await getTotalPoints(profileId);
  return privateNoStoreJson({
    mission: missionPayload(evaluated.row, evaluated.progress),
    points,
    justCompleted: evaluated.justCompleted,
    ieltsCorrect: evaluated.ieltsCorrect,
    timezone: timeZone,
  });
}

export async function GET(req: Request) {
  try {
    const access = await requireProfileAccess(req, new URL(req.url).searchParams.get("profileId"));
    if (!access.ok) return privateNoStoreJson({ error: access.error, code: access.code }, { status: access.status });
    if (access.targetId == null) return privateNoStoreJson({ error: "Profile not found" }, { status: 404 });
    return await responseFor(access.targetId);
  } catch (error) {
    console.error("GET /api/scholly/mission error:", error);
    return privateNoStoreJson({ error: "Daily mission is unavailable" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const parsed = await readJsonBody<Record<string, unknown>>(req);
    if (!parsed.ok) return privateNoStoreJson({ error: parsed.error, code: parsed.code }, { status: parsed.status });
    const access = await requireProfileAccess(req, parsed.body.profileId);
    if (!access.ok) return privateNoStoreJson({ error: access.error, code: access.code }, { status: access.status });
    if (access.targetId == null) return privateNoStoreJson({ error: "Profile not found" }, { status: 404 });

    const action = parsed.body.action;
    const profileId = access.targetId;
    if (action === "submit_ielts") {
      if (profileId !== access.session.profile.id) {
        return privateNoStoreJson({ error: "You can only submit your own exercise", code: "forbidden" }, { status: 403 });
      }
      const { missionId, answers } = parsed.body;
      if (typeof missionId !== "number" || !Number.isSafeInteger(missionId) || missionId <= 0) {
        return privateNoStoreJson({ error: "Invalid mission ID", code: "invalid_mission" }, { status: 400 });
      }
      return await responseFor(profileId, { missionId, answers });
    }
    if (action !== "skip" && action !== "another" && action !== "refresh") {
      return privateNoStoreJson({ error: "Invalid mission action", code: "invalid_action" }, { status: 400 });
    }
    if (!await ensureSchollyProfile(profileId)) return privateNoStoreJson({ error: "Profile not found" }, { status: 404 });
    const { day, timeZone } = await currentSchollyDay(profileId);
    const current = await getOrCreateMission(profileId, day, timeZone);

    if (action === "skip") {
      const skipped = await db.transaction(async (tx) => {
        const [updated] = await tx.update(dailyMissions).set({ status: "skipped" })
          .where(and(eq(dailyMissions.id, current.id), eq(dailyMissions.status, "pending"))).returning();
        if (updated) await logSchollyEvent(profileId, "mission_skipped", { missionId: updated.id, type: updated.type, day }, tx);
        return updated;
      });
      if (!skipped) return privateNoStoreJson({ error: "This mission is no longer pending", code: "mission_not_pending" }, { status: 409 });
    } else if (action === "another") {
      const replacement = await db.transaction(async (tx) => {
        const [locked] = await tx.select().from(dailyMissions)
          .where(eq(dailyMissions.id, current.id)).for("update").limit(1);
        if (!locked || locked.status !== "pending" || locked.anotherUsed) return { error: "A different mission is no longer available", status: 409 as const };
        const [context, history, segments] = await Promise.all([
          loadSchollyMissionContext(profileId, day, timeZone, tx),
          recentSchollyMissionHistory(profileId, day, tx),
          loadSchollyAudience(profileId, timeZone, {}, tx),
        ]);
        const exclude = MISSION_TYPES.has(locked.type as SchollyMissionType) ? locked.type as SchollyMissionType : undefined;
        const choice = pickSchollyMission(context, { ...history, segments }, exclude);
        if (choice.type === exclude) return { error: "No different mission is available today", status: 409 as const };
        const [updated] = await tx.update(dailyMissions).set({
          type: choice.type,
          sizeMin: choice.sizeMin,
          points: choice.points,
          targetCount: choice.targetCount,
          theme: choice.theme,
          isStar: choice.isStar,
          criteria: missionCriteriaFromContext(context),
          anotherUsed: true,
        }).where(and(eq(dailyMissions.id, locked.id), eq(dailyMissions.status, "pending"))).returning();
        if (!updated) return { error: "A different mission is no longer available", status: 409 as const };
        await logSchollyEvent(profileId, "mission_another", { missionId: updated.id, type: updated.type, day }, tx);
        return { row: updated };
      });
      if ("error" in replacement) return privateNoStoreJson({ error: replacement.error, code: "mission_not_available" }, { status: replacement.status });
    }
    return await responseFor(profileId);
  } catch (error) {
    console.error("POST /api/scholly/mission error:", error);
    return privateNoStoreJson({ error: "Daily mission could not be updated" }, { status: 500 });
  }
}
