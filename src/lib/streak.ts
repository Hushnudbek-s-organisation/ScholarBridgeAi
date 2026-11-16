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

export interface SchollyStreak extends DailyStreak {
  freezes: number;
  recentDays: { date: string; active: boolean; frozen?: boolean; restored?: boolean }[];
}

export interface StreakMissionCompletion {
  day: string;
  doneAt: Date;
}

export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 365] as const;

/**
 * Ledger reasons that represent something the STUDENT DID.
 *
 * The streak must never count points the student merely RECEIVED:
 *   • `content_liked`     — someone else liked their old post (the author is credited)
 *   • `referral_referred` — someone else applied their code
 *   • `referral_referrer` — a referred friend completed a step
 *   • `admin_award`       — an operator granted points
 *   • `profile_created`   — signing up is not learning
 *
 * `daily_active` is the marker written by `recordDailyActivity()`; it exists so a
 * day still counts when the action earned no new points (a re-watched lesson, a
 * retaken quiz).
 */
export const STREAK_ACTIVITY_REASONS = [
  "lesson_complete",
  "quiz_passed",
  "thread_created",
  "reply_created",
  "scholly_daily_mission",
  "daily_active",
] as const;

const STREAK_ACTIVITY_REASON_SET: ReadonlySet<string> = new Set(STREAK_ACTIVITY_REASONS);

/** True when this ledger reason is an action the student performed themselves. */
export function isStreakActivity(reason: string | null | undefined): boolean {
  return !!reason && STREAK_ACTIVITY_REASON_SET.has(reason);
}

/** Reason written by `recordDailyActivity()` — the per-day "showed up" marker. */
export const DAILY_ACTIVITY_REASON = "daily_active";

function dayKey(value: Date | string, formatter: Intl.DateTimeFormat, dayStartHour: number): string | null {
  // A date-only value is already a calendar day, not a UTC timestamp. Keep
  // it stable in every timezone; timestamps are projected into the student's
  // local calendar day below.
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = formatter.formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  const localDay = `${part("year")}-${part("month")}-${part("day")}`;
  return Number(part("hour")) < dayStartHour ? shiftDay(localDay, -1) : localDay;
}

function shiftDay(day: string, amount: number): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function getDayKey(timeZone: string, dayStartHour: number) {
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    });
  } catch {
    // An invalid/missing browser timezone must not break the rewards screen.
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    });
  }
  const boundary = Number.isInteger(dayStartHour) && dayStartHour >= 0 && dayStartHour <= 23 ? dayStartHour : 0;
  return (value: Date | string) => dayKey(value, formatter, boundary);
}

export function computeDailyStreak(
  activityDates: readonly (Date | string)[],
  now: Date = new Date(),
  timeZone = "UTC",
  dayStartHour = 0,
): DailyStreak {
  const key = getDayKey(timeZone, dayStartHour);
  const today = key(now)!;
  const days = new Set(activityDates.map(key).filter((day): day is string => !!day && day <= today));
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

const DAY_MS = 24 * 60 * 60 * 1000;
const FREEZE_EVERY_DAYS = 7;
const MAX_FREEZES = 2;

/**
 * Replay localized activity rather than spending a freeze on every read.
 * A protected day bridges a gap but is never counted as a day of study.
 */
export function computeSchollyStreak(
  activityDays: readonly string[],
  missions: readonly StreakMissionCompletion[],
  today: string,
  now: Date,
): SchollyStreak {
  const doneAtByDay = new Map(missions
    .filter(({ day, doneAt }) => day <= today && doneAt.getTime() <= now.getTime())
    .map(({ day, doneAt }) => [day, doneAt.getTime()]));
  const days = new Set([...activityDays.filter(day => day <= today), ...doneAtByDay.keys()]);
  const ordered = [...days].sort();
  const frozenDays = new Set<string>();
  const restoredDays = new Set<string>();
  let freezes = 0;
  let current = 0;
  let longest = 0;
  let previous: string | undefined;

  function closeGap(nextDay: string, canRestore: boolean) {
    if (!previous || !current) return;
    let missed = shiftDay(previous, 1);
    const singleMissedDay = shiftDay(missed, 1) === nextDay;
    while (missed < nextDay && freezes > 0) {
      freezes--;
      frozenDays.add(missed);
      missed = shiftDay(missed, 1);
    }
    if (missed >= nextDay) return;

    // A second mission can land on the next local day while still being
    // within 24 hours of the first. Reuse real completed missions only.
    const first = doneAtByDay.get(nextDay);
    const second = doneAtByDay.get(shiftDay(nextDay, 1));
    if (canRestore && singleMissedDay && first != null && second != null && second > first && second - first <= DAY_MS) {
      restoredDays.add(missed);
      return;
    }
    current = 0;
  }

  for (const day of ordered) {
    closeGap(day, true);
    current++;
    longest = Math.max(longest, current);
    if (current % FREEZE_EVERY_DAYS === 0) freezes = Math.min(MAX_FREEZES, freezes + 1);
    previous = day;
  }
  // Today is still open until the next 04:00 local boundary.
  closeGap(today, false);

  const nextMilestone = STREAK_MILESTONES.find(milestone => milestone > current) ?? null;
  return {
    current,
    longest,
    freezes,
    activeToday: days.has(today),
    lastActiveDate: ordered.at(-1) ?? null,
    nextMilestone,
    daysToMilestone: nextMilestone == null ? 0 : nextMilestone - current,
    recentDays: Array.from({ length: 7 }, (_, index) => {
      const date = shiftDay(today, index - 6);
      return { date, active: days.has(date), frozen: frozenDays.has(date), restored: restoredDays.has(date) };
    }),
  };
}
