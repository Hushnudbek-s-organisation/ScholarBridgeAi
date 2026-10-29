/**
 * The "connect the Telegram bot" prompt — the rules, without the database.
 *
 * The operator's requirement: *after creating an account, when the student
 * comes back within the first 10 days, ask them to connect the Telegram bot so
 * they can use the site fully.*
 *
 * What already existed and what was wrong with it:
 *
 *  - `TelegramNudge` was shown only on the dashboard tab, only while the bot
 *    was configured, and its dismissal was stored as a single flag
 *    (`…_dismissed = "1"`), i.e. **forever**. One tap on "Hide" on day one
 *    silenced the prompt for the rest of the account's life — the opposite of
 *    "ask them during the first 10 days".
 *  - Nothing anywhere knew how old the account was, so there was no window at
 *    all: the card could appear on a two-year-old account, or never.
 *
 * So the rules live here, as data-in / verdict-out, and are covered by
 * `scripts/check-telegram.ts` without a database:
 *
 *   visible ⟺ the bot is configured AND this account has no Telegram link AND
 *             the account is at most NUDGE_WINDOW_DAYS old AND the student has
 *             not dismissed it *today*.
 *
 * Dismissal is per **day**, not forever: inside the window the prompt returns
 * the next day (a reminder, not a nag — at most once a day), and outside the
 * window it is gone for good. Disconnecting Telegram later does not resurrect
 * it for an old account; the permanent connect card in the Telegram settings
 * tab always remains.
 */

/** How long a new account is reminded, in days. */
export const NUDGE_WINDOW_DAYS = 10;

export type NudgeReason = "shown" | "linked" | "not_configured" | "too_old" | "dismissed_today" | "no_profile";

export interface NudgeInput {
  /** The signed-in profile's age in whole days, or null when unknown. */
  accountAgeDays: number | null;
  /** True when this account already has a Telegram link. */
  linked: boolean;
  /** True when the deployment has a bot username and token. */
  configured: boolean;
  /** True when the student dismissed the prompt today (per profile, per day). */
  dismissedToday?: boolean;
  /** False when the request is anonymous — there is nobody to remind. */
  hasProfile?: boolean;
}

export interface NudgeVerdict {
  show: boolean;
  reason: NudgeReason;
  /** Days left in the window, 0 when the window is over. */
  daysLeft: number;
}

/** Whole days between two instants, floored, never negative. */
export function accountAgeDays(createdAt: Date | string | null | undefined, now: Date = new Date()): number | null {
  if (!createdAt) return null;
  const created = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (!Number.isFinite(created.getTime())) return null;
  const ms = now.getTime() - created.getTime();
  if (ms < 0) return 0;
  return Math.floor(ms / 86_400_000);
}

export function nudgeVerdict(input: NudgeInput): NudgeVerdict {
  const age = input.accountAgeDays;
  const daysLeft = age === null ? 0 : Math.max(0, NUDGE_WINDOW_DAYS - age);
  if (input.hasProfile === false) return { show: false, reason: "no_profile", daysLeft: 0 };
  if (input.linked) return { show: false, reason: "linked", daysLeft };
  if (!input.configured) return { show: false, reason: "not_configured", daysLeft };
  // An unknown age is not a reason to nag: without a creation date there is no
  // window, and an account that might be years old must not be greeted again.
  if (age === null) return { show: false, reason: "too_old", daysLeft: 0 };
  if (age > NUDGE_WINDOW_DAYS) return { show: false, reason: "too_old", daysLeft: 0 };
  if (input.dismissedToday) return { show: false, reason: "dismissed_today", daysLeft };
  return { show: true, reason: "shown", daysLeft };
}

/**
 * The dismissal key: one entry per profile **per day**.
 *
 * `scholarbridge_tg_nudge_<profileId>_<YYYY-MM-DD>` — the date is computed in
 * the browser's own timezone, because "today" is the student's day, not UTC's.
 * Old keys are pruned on write so the storage does not grow one entry per day
 * forever.
 */
export function nudgeDismissKey(profileId: number, day: string): string {
  return `scholarbridge_tg_nudge_${profileId}_${day}`;
}

/** `2026-10-29` in the given timezone offset (browser local by default). */
export function localDayKey(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Which stored keys belong to an older dismissal of this profile (so they can
 * be removed). Anything that is not this profile's or today's key.
 */
export function staleDismissKeys(keys: readonly string[], profileId: number, today: string): string[] {
  const prefix = `scholarbridge_tg_nudge_${profileId}_`;
  const keep = nudgeDismissKey(profileId, today);
  return keys.filter((key) => key.startsWith(prefix) && key !== keep);
}
