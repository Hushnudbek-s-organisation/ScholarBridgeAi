import type { db } from "@/db";
import { awardSchollyPoints } from "@/lib/scholly-points.server";
import { loadSchollyStreakEvidence } from "@/lib/scholly-streak.server";
import { schollyStreakBonusCandidates } from "@/lib/scholly-streak-bonuses";

type Executor = Pick<typeof db, "select" | "insert" | "update" | "execute">;
type MissionCompletion = { day: string; id: number; doneAt: Date };

async function awardBonuses(profileId: number, tx: Executor, now: Date, mission?: MissionCompletion) {
  const { activityDays, missions, today } = await loadSchollyStreakEvidence(profileId, now, undefined, 4, tx);
  const candidates = schollyStreakBonusCandidates(activityDays, missions, today, now, mission?.day === today);

  for (const { reason, key } of candidates) {
    await awardSchollyPoints(profileId, reason, key, tx, {
      at: now,
      relatedEntityId: reason === "comeback" ? mission?.id : undefined,
    });
  }
}

/** Called while recording the student's own daily activity. */
export function awardSchollyStreakBonuses(profileId: number, tx: Executor, now = new Date()) {
  return awardBonuses(profileId, tx, now);
}

/** Called inside the same transaction as a server-verified mission completion. */
export function awardSchollyMissionBonuses(profileId: number, mission: MissionCompletion, tx: Executor) {
  return awardBonuses(profileId, tx, mission.doneAt, mission);
}
