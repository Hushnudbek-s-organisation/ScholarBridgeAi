import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { dailyMissions, studentProfiles } from "@/db/schema";
import { getTotalPoints } from "@/lib/gamification";
import { awardSchollyPoints } from "@/lib/scholly-points.server";
import { awardSchollyMissionBonuses } from "@/lib/scholly-streak-bonuses.server";
import { logSchollyEvent } from "@/lib/scholly-events";
import { awardSchollyFriendStreak } from "@/lib/scholly-friends.server";
import { loadSchollyAudience } from "@/lib/scholly-audience.server";
import { gradeIeltsExercise, publicIeltsExercise } from "@/lib/scholly-ielts.server";
import { requireProfileAccess } from "@/lib/auth";
import { privateNoStoreJson } from "@/lib/apiResponse";
import { readJsonBody } from "@/lib/request";
import {
  SCHOLLY_MISSION_TYPES,
  missionProgress,
  pickSchollyMission,
  schollyDayKey,
  type SchollyMissionType,
} from "@/lib/scholly-missions";
import {
  criteriaFromStored,
  currentSchollyDay,
  ensureSchollyProfile,
  loadSchollyMissionContext,
  missionCriteriaFromContext,
  missionEvidenceTime,
  recentSchollyMissionHistory,
} from "@/lib/scholly-mission-store.server";

const MISSION_TYPES = new Set<SchollyMissionType>(SCHOLLY_MISSION_TYPES);

type MissionRow = typeof dailyMissions.$inferSelect;
type MissionTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type SprintWindow = { startedAt: string; endsAt: string; cancelled?: true };

function missionMetadata(criteria: unknown) {
  return criteria && typeof criteria === "object" && !Array.isArray(criteria)
    ? criteria as Record<string, unknown> : {};
}

function sprintWindow(criteria: unknown): SprintWindow | null {
  const sprint = missionMetadata(criteria).sprint;
  if (!sprint || typeof sprint !== "object" || Array.isArray(sprint)) return null;
  const value = sprint as Record<string, unknown>;
  if (typeof value.startedAt !== "string" || typeof value.endsAt !== "string" ||
      !(Date.parse(value.startedAt) < Date.parse(value.endsAt))) return null;
  return { startedAt: value.startedAt, endsAt: value.endsAt, ...(value.cancelled === true ? { cancelled: true } : {}) };
}

async function lockMissionProfile(tx: MissionTransaction, profileId: number) {
  await tx.select({ id: studentProfiles.id }).from(studentProfiles)
    .where(eq(studentProfiles.id, profileId)).for("no key update").limit(1);
}

function missionPayload(row: typeof dailyMissions.$inferSelect, progress: ReturnType<typeof missionProgress>) {
  const shownProgress = row.status === "done"
    ? { progress: progress.target, target: progress.target, complete: true }
    : progress;
  const earned = missionMetadata(row.criteria).awardedPoints;
  return {
    id: row.id,
    day: row.day,
    type: row.type,
    theme: row.theme,
    sizeMin: row.sizeMin,
    points: row.status === "done" && typeof earned === "number" ? earned : row.points,
    targetCount: row.targetCount,
    isStar: row.isStar,
    status: row.status,
    anotherUsed: row.anotherUsed,
    progress: shownProgress.progress,
    target: shownProgress.target,
    complete: row.status === "done" || progress.complete,
    sprint: sprintWindow(row.criteria),
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
  profileId: number, row: MissionRow, day: string,
  ielts?: { missionId: number; answers: unknown },
) {
  return db.transaction(async (tx) => {
    await lockMissionProfile(tx, profileId);
    const [locked] = await tx.select().from(dailyMissions)
      .where(eq(dailyMissions.id, row.id)).for("update").limit(1);
    if (!locked) return { error: "This mission is no longer available", status: 409 as const };
    const now = new Date();
    const local = await currentSchollyDay(profileId, now, tx);
    if (local.day !== day) return { error: "Your Scholly day has changed", status: 409 as const };
    const target = locked.targetCount;
    let progress = { progress: 0, target, complete: false };
    let evidenceAt: Date | undefined;
    if (ielts && (ielts.missionId !== locked.id || locked.type !== "ielts_vocabulary" || locked.status === "skipped")) {
      return { error: "This IELTS exercise is no longer available", status: 409 as const };
    }
    if (locked.type === "ielts_vocabulary") {
      if (ielts && locked.status === "pending") {
        const correct = gradeIeltsExercise(locked.day, target, ielts.answers);
        if (correct === null) return { error: "Submit one answer per question", status: 400 as const };
        progress = { progress: correct, target, complete: correct === target };
        if (!progress.complete) return { row: locked, progress, justCompleted: false, ieltsCorrect: correct };
        evidenceAt = now;
      }
    } else if (locked.status === "pending") {
      const context = await loadSchollyMissionContext(profileId, day, local.timeZone, tx);
      const baseline = criteriaFromStored(locked.criteria);
      progress = missionProgress(locked.type as SchollyMissionType, target, baseline, missionCriteriaFromContext(context));
      if (progress.complete) evidenceAt = missionEvidenceTime(locked.type, progress.target, baseline, context.evidence);
    }
    if (locked.status !== "pending" || !progress.complete) return { row: locked, progress, justCompleted: false };

    const completedAt = new Date();
    if (schollyDayKey(completedAt, local.timeZone) !== day) {
      return { error: "Your Scholly day has changed", status: 409 as const };
    }
    const sprint = sprintWindow(locked.criteria);
    const actionAt = evidenceAt?.getTime();
    const timed = sprint && !sprint.cancelled && actionAt !== undefined &&
      actionAt >= Date.parse(sprint.startedAt) && actionAt <= Date.parse(sprint.endsAt);
    const points = timed ? Math.min(30, locked.points * 1.5) : locked.points;
    const [done] = await tx.update(dailyMissions).set({
      status: "done", doneAt: completedAt, criteria: { ...missionMetadata(locked.criteria), awardedPoints: points },
    })
      .where(and(eq(dailyMissions.id, locked.id), eq(dailyMissions.status, "pending"))).returning();
    if (!done) return { row: locked, progress, justCompleted: false };
    const grant = await awardSchollyPoints(profileId, "mission_complete", `mission:${profileId}:${day}`,
      tx, { relatedEntityId: done.id, at: completedAt, points });
    await logSchollyEvent(profileId, "mission_done",
      { missionId: done.id, type: done.type, points: grant.points, day: done.day, sprint: Boolean(timed) }, tx);
    await awardSchollyMissionBonuses(profileId, { day, id: done.id, doneAt: completedAt }, tx);
    return { row: done, progress, justCompleted: true };
  });
}

async function startMissionSprint(profileId: number, id: number) {
  return db.transaction(async (tx) => {
    await lockMissionProfile(tx, profileId);
    const [mission] = await tx.select().from(dailyMissions).where(and(
      eq(dailyMissions.id, id), eq(dailyMissions.userId, profileId),
    )).for("update").limit(1);
    const now = new Date();
    const { day, timeZone } = await currentSchollyDay(profileId, now, tx);
    if (!mission || mission.day !== day || mission.status !== "pending") return false;
    if (sprintWindow(mission.criteria)) return true; // Retrying never extends this window.
    if (mission.type !== "ielts_vocabulary") {
      const context = await loadSchollyMissionContext(profileId, day, timeZone, tx);
      const progress = missionProgress(mission.type as SchollyMissionType, mission.targetCount,
        criteriaFromStored(mission.criteria), missionCriteriaFromContext(context));
      if (progress.complete) return false;
    }
    // Check the actual current instant after all reads, before persisting the timer.
    const started = new Date();
    if ((await currentSchollyDay(profileId, started, tx)).day !== day) return false;
    const sprint = {
      startedAt: started.toISOString(),
      endsAt: new Date(started.getTime() + mission.sizeMin * 60_000).toISOString(),
    };
    await tx.update(dailyMissions).set({ criteria: { ...missionMetadata(mission.criteria), sprint } })
      .where(eq(dailyMissions.id, mission.id));
    await logSchollyEvent(profileId, "mission_sprint_started", { missionId: mission.id, day }, tx);
    return true;
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
  const evaluated = await evaluateMission(profileId, row, day, ielts);
  if ("error" in evaluated) return privateNoStoreJson({ error: evaluated.error }, { status: evaluated.status });
  if (evaluated.justCompleted) {
    await awardSchollyFriendStreak(profileId).catch(error => {
      console.warn("Scholly friend reward could not be evaluated:", (error as Error)?.name);
    });
  }
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
    if (action === "submit_ielts" || action === "start_sprint") {
      if (profileId !== access.session.profile.id) {
        return privateNoStoreJson({ error: "You can only update your own mission", code: "forbidden" }, { status: 403 });
      }
      const { missionId, answers } = parsed.body;
      if (typeof missionId !== "number" || !Number.isSafeInteger(missionId) || missionId <= 0) {
        return privateNoStoreJson({ error: "Invalid mission ID", code: "invalid_mission" }, { status: 400 });
      }
      if (action === "submit_ielts") return await responseFor(profileId, { missionId, answers });
      if (!await startMissionSprint(profileId, missionId)) {
        return privateNoStoreJson({ code: "sprint_not_available" }, { status: 409 });
      }
      return await responseFor(profileId);
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
        await lockMissionProfile(tx, profileId);
        const [locked] = await tx.select().from(dailyMissions)
          .where(eq(dailyMissions.id, current.id)).for("update").limit(1);
        if (!locked || locked.status !== "pending" || locked.anotherUsed ||
            (await currentSchollyDay(profileId, new Date(), tx)).day !== day) {
          return { error: "A different mission is no longer available", status: 409 as const };
        }
        const [context, history, segments] = await Promise.all([
          loadSchollyMissionContext(profileId, day, timeZone, tx),
          recentSchollyMissionHistory(profileId, day, tx),
          loadSchollyAudience(profileId, timeZone, {}, tx),
        ]);
        const exclude = MISSION_TYPES.has(locked.type as SchollyMissionType) ? locked.type as SchollyMissionType : undefined;
        const choice = pickSchollyMission(context, { ...history, segments }, exclude);
        if (choice.type === exclude) return { error: "No different mission is available today", status: 409 as const };
        const sprint = sprintWindow(locked.criteria);
        const [updated] = await tx.update(dailyMissions).set({
          type: choice.type,
          sizeMin: choice.sizeMin,
          points: choice.points,
          targetCount: choice.targetCount,
          theme: choice.theme,
          isStar: choice.isStar,
          criteria: { ...missionCriteriaFromContext(context),
            ...(sprint ? { sprint: { ...sprint, cancelled: true } } : {}) },
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
