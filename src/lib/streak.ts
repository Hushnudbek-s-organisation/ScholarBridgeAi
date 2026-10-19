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

function dayKey(value: Date | string, formatter: Intl.DateTimeFormat): string | null {
  // A date-only value is already a calendar day, not a UTC timestamp. Keep
  // it stable in every timezone; timestamps are projected into the student's
  // local calendar day below.
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = formatter.formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function shiftDay(day: string, amount: number): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function computeDailyStreak(
  activityDates: readonly (Date | string)[],
  now: Date = new Date(),
  timeZone = "UTC",
): DailyStreak {
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    // An invalid/missing browser timezone must not break the rewards screen.
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }
  const today = dayKey(now, formatter)!;
  const days = new Set(activityDates.map((value) => dayKey(value, formatter)).filter((day): day is string => !!day && day <= today));
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
