/** Deterministic daily streak projection. A day counts only after a server-awarded meaningful activity. */
export interface DailyStreak {
  current: number;
  longest: number;
  activeToday: boolean;
  lastActiveDate: string | null;
  nextMilestone: number | null;
  daysToMilestone: number;
  recentDays: { date: string; active: boolean }[];
}

export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 365] as const;

function isoDay(value: Date | string): string | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : null;
}

function shiftDay(day: string, amount: number): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function computeDailyStreak(activityDates: readonly (Date | string)[], now: Date = new Date()): DailyStreak {
  const today = now.toISOString().slice(0, 10);
  const days = new Set(activityDates.map(isoDay).filter((day): day is string => !!day && day <= today));
  const ordered = [...days].sort();

  let longest = 0;
  let run = 0;
  let previous: string | null = null;
  for (const day of ordered) {
    run = previous && shiftDay(previous, 1) === day ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = day;
  }

  const activeToday = days.has(today);
  // A streak remains visible through the day after the latest activity, so a
  // student has the whole current day to continue it. Older gaps reset it.
  let cursor = activeToday ? today : shiftDay(today, -1);
  let current = 0;
  while (days.has(cursor)) {
    current++;
    cursor = shiftDay(cursor, -1);
  }

  const nextMilestone = STREAK_MILESTONES.find((milestone) => milestone > current) ?? null;
  return {
    current,
    longest,
    activeToday,
    lastActiveDate: ordered.at(-1) ?? null,
    nextMilestone,
    daysToMilestone: nextMilestone == null ? 0 : nextMilestone - current,
    recentDays: Array.from({ length: 7 }, (_, index) => {
      const date = shiftDay(today, index - 6);
      return { date, active: days.has(date) };
    }),
  };
}
