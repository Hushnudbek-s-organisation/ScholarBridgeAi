import { computeSchollyStreak, type StreakMissionCompletion } from "./streak";

const BONUS_MILESTONES = [
  [3, "streak_3"],
  [7, "streak_7"],
  [14, "streak_14"],
  [30, "streak_30"],
] as const;

type StreakBonusReason = (typeof BONUS_MILESTONES)[number][1] | "weekly_activity" | "comeback";

export interface SchollyStreakBonus {
  reason: StreakBonusReason;
  key: string;
}

function shiftDay(day: string, amount: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function schollyStreakBonusCandidates(
  activityDays: readonly string[],
  missions: readonly StreakMissionCompletion[],
  today: string,
  now: Date,
  missionCompletedToday = false,
): SchollyStreakBonus[] {
  const completed = missions.filter(mission => mission.day <= today && mission.doneAt <= now);
  const activeDays = new Set([...activityDays.filter(day => day <= today), ...completed.map(mission => mission.day)]);
  // Freezes, repairs, and passive reads never count as days of activity.
  if (!activeDays.has(today)) return [];

  const { current } = computeSchollyStreak([...activeDays], completed, today, now);
  const bonuses: SchollyStreakBonus[] = BONUS_MILESTONES
    .filter(([days]) => current >= days)
    .map(([days, reason]) => ({ reason, key: `streak:${days}` }));

  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
  const monday = shiftDay(today, -((weekday + 6) % 7));
  const daysThisWeek = [...activeDays].filter(day => day >= monday).length;
  if (daysThisWeek >= 4) bonuses.push({ reason: "weekly_activity", key: `active-week:${monday}` });

  if (missionCompletedToday && completed.some(mission => mission.day === today)) {
    let firstDayBack = today;
    while (activeDays.has(shiftDay(firstDayBack, -1))) {
      firstDayBack = shiftDay(firstDayBack, -1);
    }
    const previousDay = [...activeDays].filter(day => day < firstDayBack).sort().at(-1);
    const firstMissionBack = !completed.some(mission => mission.day >= firstDayBack && mission.day < today);
    if (firstMissionBack && previousDay && previousDay <= shiftDay(firstDayBack, -8)) {
      bonuses.push({ reason: "comeback", key: `comeback:${firstDayBack}` });
    }
  }

  return bonuses;
}
