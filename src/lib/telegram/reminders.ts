/**
 * Deadline reminder rules (pure — unit-tested).
 *
 * A reminder fires once per (item, due date, offset bucket). The bucket is the
 * smallest configured offset that is ≥ the days left, so:
 *   - a sweep that runs every few hours hits every offset on its day;
 *   - if a run was missed, the next one still sends that bucket once (with the
 *     real number of days left) instead of silently skipping it;
 *   - when the deadline moves, the due date in the key changes → the new date
 *     gets its own reminders and old ones can never be re-sent for it.
 */

export const DEFAULT_REMINDER_DAYS = [30, 14, 7, 3, 1, 0] as const;
export const MAX_REMINDER_OFFSET = 60;

export const REMINDER_PRESETS: Record<"standard" | "short" | "off", number[]> = {
  standard: [...DEFAULT_REMINDER_DAYS],
  short: [7, 3, 1, 0],
  off: [],
};
export type ReminderPreset = keyof typeof REMINDER_PRESETS;

/** Stored JSON → sorted (desc), unique offsets in 0…60. null/invalid → defaults. */
export function parseReminderDays(raw: string | null | undefined): number[] {
  if (raw == null || raw === "") return [...DEFAULT_REMINDER_DAYS];
  try {
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return [...DEFAULT_REMINDER_DAYS];
    return normalizeReminderDays(v);
  } catch {
    return [...DEFAULT_REMINDER_DAYS];
  }
}

export function normalizeReminderDays(values: unknown[]): number[] {
  const set = new Set<number>();
  for (const x of values) {
    const n = typeof x === "number" ? x : Number(x);
    if (Number.isInteger(n) && n >= 0 && n <= MAX_REMINDER_OFFSET) set.add(n);
  }
  return [...set].sort((a, b) => b - a).slice(0, 10);
}

/** Which offset bucket does `daysLeft` fall in? null → no reminder due. */
export function reminderBucket(daysLeft: number, offsets: readonly number[]): number | null {
  if (!Number.isInteger(daysLeft) || daysLeft < 0 || offsets.length === 0) return null;
  let best: number | null = null;
  for (const o of offsets) if (o >= daysLeft && (best === null || o < best)) best = o;
  return best;
}

/**
 * Timezone used to decide what "today" is for reminders. Profiles have no
 * timezone field, so this is deployment-wide: env REMINDER_TIMEZONE (an IANA
 * name such as "Asia/Tashkent"); default "UTC". Invalid names fall back to UTC.
 */
export function reminderTimezone(env: Record<string, string | undefined> = process.env): string {
  const tz = env.REMINDER_TIMEZONE?.trim();
  if (!tz) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}

/** Calendar date (YYYY-MM-DD) of `now` in `tz`. */
export function localDay(now: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Whole calendar days from today (in tz) until the due date (YYYY-MM-DD or Date). */
export function calendarDaysUntil(due: string | Date, now: Date, tz: string): number | null {
  const dueDay = typeof due === "string" ? due.slice(0, 10) : localDay(due, tz);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDay)) return null;
  const a = Date.parse(`${localDay(now, tz)}T00:00:00Z`);
  const b = Date.parse(`${dueDay}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / 86_400_000);
}
