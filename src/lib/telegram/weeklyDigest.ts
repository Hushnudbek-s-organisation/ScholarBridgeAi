/**
 * Weekly micro-action digest — pure logic (no DB, no network, no clock reads).
 *
 * The bot used to be a one-way notifier: reminders arrived, and acting on them
 * meant leaving Telegram. Pillar 5.6 turns the two most common reactions into
 * one tap; this module decides *when* the single Monday check-in goes out and
 * *which* task it names, so both rules are assertable in `check-telegram.ts`
 * instead of being buried in a cron handler.
 *
 * Invariants:
 *  - The digest fires at most once per ISO week (`isoWeekId`), so an hourly
 *    cron and a "run now" button can never double-send.
 *  - Only Monday counts (1 = Monday … 7 = Sunday) in the reminder timezone,
 *    because "this week's plan" read on a Friday is noise.
 *  - The named task is chosen by the same priority rule the dashboard uses:
 *    an overdue tracked date first, then today, then the nearest upcoming one,
 *    and an undated tracked date still beats an undated requirement row.
 */

export type MicroActionKind = "deadline" | "requirement";

export interface MicroActionCandidate {
  /** Which table the row lives in — decides the `act:*` id space. */
  kind: MicroActionKind;
  /** Row id in `journey_deadlines` or `application_requirements`. */
  id: number;
  title: string;
  /** ISO `YYYY-MM-DD`, or null when the student never set a date. */
  dueIso: string | null;
}

/** Local calendar date (YYYY-MM-DD) of an instant in a timezone. */
export function localIsoDate(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** ISO weekday in a timezone: 1 = Monday … 7 = Sunday. */
export function localWeekday(date: Date, timeZone: string): number {
  const day = new Date(`${localIsoDate(date, timeZone)}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

/**
 * ISO-8601 week id (`2026-W42`) in a timezone. Used as the idempotency key:
 * one digest per week, no matter how often the scheduler runs.
 */
export function isoWeekId(date: Date, timeZone: string): string {
  const thursday = new Date(`${localIsoDate(date, timeZone)}T00:00:00Z`);
  const weekday = thursday.getUTCDay() || 7;
  thursday.setUTCDate(thursday.getUTCDate() + 4 - weekday); // Thursday owns the ISO week
  const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((thursday.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function isDigestDay(date: Date, timeZone: string): boolean {
  return localWeekday(date, timeZone) === 1;
}

const dayValue = (iso: string | null): number | null => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const t = Date.parse(`${iso}T00:00:00Z`);
  return Number.isFinite(t) ? Math.round(t / 86_400_000) : null;
};

/**
 * The single task the Monday check-in names, with its 1-tap buttons.
 *
 * Ordering (deterministic, ties broken by kind then id):
 *   1. overdue tracked dates (most overdue first)
 *   2. due today
 *   3. nearest upcoming date
 *   4. no date — a tracked deadline before an application checklist row
 * Returns null when there is nothing to nudge, so the bot sends the friendly
 * "nothing urgent this week" line instead of an empty nudge.
 */
export function pickTopMicroAction(
  candidates: MicroActionCandidate[],
  todayIso: string
): MicroActionCandidate | null {
  const today = dayValue(todayIso);
  const usable = candidates.filter((c) => Number.isInteger(c.id) && c.id > 0 && c.title.trim().length > 0);
  if (usable.length === 0 || today == null) return null;

  const rank = (c: MicroActionCandidate): number => {
    const due = dayValue(c.dueIso);
    if (due == null) return 3; // undated last
    const days = due - today;
    if (days < 0) return 0;
    if (days === 0) return 1;
    return 2;
  };

  const sorted = [...usable].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    const da = dayValue(a.dueIso) ?? Number.MAX_SAFE_INTEGER;
    const db = dayValue(b.dueIso) ?? Number.MAX_SAFE_INTEGER;
    if (ra === 0 && da !== db) return da - db; // most overdue first
    if (ra === 2 && da !== db) return da - db; // soonest upcoming first
    if (ra === 3 && a.kind !== b.kind) return a.kind === "deadline" ? -1 : 1;
    if (a.kind !== b.kind) return a.kind === "deadline" ? -1 : 1;
    return a.id - b.id;
  });
  return sorted[0] ?? null;
}
