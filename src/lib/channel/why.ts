/**
 * "Nega post ketmayapti?" — one honest answer instead of a hunt through logs.
 *
 * The publisher has a long chain of conditions before anything reaches
 * Telegram: a token, a mode, a pause date, a channel, an administer right, an
 * admin chat, a public site URL, a catalogue of verified scholarships, a plan
 * for today, a send window, and — on a host that sleeps — an external tick.
 * When the operator asks "why is nothing arriving?", any one of those can be
 * the answer, and until now the panel said nothing about which.
 *
 * This module is **pure**: it takes a snapshot and returns a verdict. The
 * database half lives in `whyStore.ts`, so every branch below is testable
 * without a Postgres and without a network.
 *
 * The order is the order an operator has to fix things in, and the first
 * `block` is the answer. `warn` means "it works, but not the way you think".
 */
import { isQuietDay, minutesOf } from "./plan";
import type { ChannelMode } from "./settings";

export type WhyLevel = "ok" | "warn" | "block";

/** Stable ids; the panel translates each one (uz/ru/en) with `params`. */
export type WhyId =
  | "ok"
  | "env_off"
  | "mode_off"
  | "paused"
  | "token_missing"
  | "channel_missing"
  | "channel_unreachable"
  | "channel_wrong_type"
  | "bot_not_admin"
  | "no_post_permission"
  | "admin_chat_missing"
  | "admin_chat_unreachable"
  | "site_missing"
  | "site_not_public"
  | "catalogue_empty"
  | "catalogue_stale"
  | "catalogue_no_deadlines"
  | "quiet_day"
  | "plan_empty"
  | "waiting_for_time"
  | "cron_stale"
  | "last_failure";

export interface WhyStep {
  id: WhyId;
  level: WhyLevel;
  /** Values the panel interpolates into the translated sentence. */
  params?: Record<string, string | number>;
}

export interface CatalogueCounts {
  /** Rows in the `scholarships` table. */
  total: number;
  active: number;
  verified: number;
  /** Verified, but older than the re-verification window. */
  stale: number;
  /** Passes every gate the publisher applies (this is the real pool). */
  publishable: number;
  /** Publishable *and* with an exact deadline the countdown can use. */
  withExactDeadline: number;
}

export interface PlanCounts {
  /** YYYY-MM-DD, Asia/Tashkent. */
  date: string;
  /** Rows planned for today (any status). */
  planned: number;
  /** Planned rows with status `planned` (not sent, not skipped). */
  open: number;
  sent: number;
  awaiting: number;
  /** "HH:MM" of the next open row today, null when there is none. */
  nextSendAt: string | null;
}

export interface TickInfo {
  /** When the publisher last ran (cron or in-process), null if never. */
  lastTickAt: Date | null;
  /** How often it is supposed to run. */
  intervalMinutes: number;
}

export interface WhyInput {
  now: Date;
  mode: ChannelMode;
  pausedUntil: string | null;
  /** The deploy-level switch (`CHANNEL_AUTOPOST`), null when unset. */
  envAutopost: string | null;
  hasToken: boolean;
  channelId: string;
  adminChatId: string;
  siteUrl: string;
  /** Null when the live check could not run (no token, network error). */
  connection: {
    channelConfigured: boolean;
    channelReachable: boolean;
    channelType: string | null;
    canPost: boolean;
    adminChatReachable: boolean;
  } | null;
  catalogue: CatalogueCounts;
  plan: PlanCounts;
  tick: TickInfo;
  /** Last post that actually left for Telegram (any status that is not failed). */
  lastDeliveredAt: Date | null;
  /** Sentence from the most recent failed post, null when there is none. */
  lastFailure: string | null;
}

export interface WhyVerdict {
  /** True when nothing blocks the publisher. */
  ready: boolean;
  /** The first blocking step — the one thing to fix. Null when ready. */
  blocked: WhyStep | null;
  /** Everything that is true but worth knowing (quiet day, stale cron, …). */
  warnings: WhyStep[];
  /** Every step, in fix order, for the checklist in the panel. */
  steps: WhyStep[];
  /** "HH:MM" the next post is due today, null when nothing is scheduled. */
  nextSendAt: string | null;
}

const HOUR_MS = 60 * 60 * 1000;

/** Is `pausedUntil` still in the future? `YYYY-MM-DD`, inclusive of that day. */
export function isPaused(pausedUntil: string | null, now: Date): boolean {
  if (!pausedUntil || !/^\d{4}-\d{2}-\d{2}$/.test(pausedUntil)) return false;
  const today = tashkentDayOf(now);
  return pausedUntil >= today;
}

function tashkentDayOf(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function tashkentClock(now: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tashkent",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
}

/** True when the next send time is still ahead of the clock in Tashkent. */
export function waitingForWindow(nextSendAt: string | null, now: Date): boolean {
  if (!nextSendAt) return false;
  const due = minutesOf(nextSendAt);
  const clock = minutesOf(tashkentClock(now));
  if (due === null || clock === null) return false;
  return clock < due;
}

/** Minutes since the last tick; `null` when the publisher never ran. */
export function minutesSinceTick(tick: TickInfo, now: Date): number | null {
  if (!tick.lastTickAt) return null;
  return Math.max(0, Math.round((now.getTime() - tick.lastTickAt.getTime()) / 60_000));
}

/**
 * A tick is "stale" when it is more than three intervals old — one missed tick
 * is a restart, three is a scheduler that is not running at all.
 */
export function tickIsStale(tick: TickInfo, now: Date): boolean {
  const age = minutesSinceTick(tick, now);
  if (age === null) return true;
  return age > Math.max(15, tick.intervalMinutes * 3);
}

export function buildWhy(input: WhyInput): WhyVerdict {
  const steps: WhyStep[] = [];

  // 1. The token: nothing at all works without it.
  steps.push(
    input.hasToken
      ? { id: "ok", level: "ok", params: { check: "token" } }
      : { id: "token_missing", level: "block" }
  );
  if (!input.hasToken) return finish(steps, input);

  // 2. The deploy-level kill switch and the panel mode.
  if (input.envAutopost === "off") {
    steps.push({ id: "env_off", level: "block" });
    return finish(steps, input);
  }
  if (input.mode === "off") {
    steps.push({ id: "mode_off", level: "block" });
    return finish(steps, input);
  }

  // 3. A pause date is not a mistake — it is a decision, but it explains silence.
  if (isPaused(input.pausedUntil, input.now)) {
    steps.push({ id: "paused", level: "block", params: { date: String(input.pausedUntil) } });
    return finish(steps, input);
  }

  // 4. The channel and the right to post in it.
  if (!input.channelId.trim()) {
    steps.push({ id: "channel_missing", level: "block" });
  } else if (input.connection) {
    if (!input.connection.channelReachable) {
      steps.push({ id: "channel_unreachable", level: "block", params: { channelId: input.channelId } });
    } else if (input.connection.channelType && input.connection.channelType !== "channel") {
      steps.push({ id: "channel_wrong_type", level: "block", params: { type: input.connection.channelType } });
    } else if (!input.connection.canPost) {
      // One code or the other, never both: the fix is different.
      steps.push({
        id: input.connection.channelType === "channel" ? "no_post_permission" : "bot_not_admin",
        level: "block",
      });
    }
  }

  // 5. The admin chat. Approval mode cannot work without it (the preview has
  //    nowhere to go); in the other modes it is where failures are reported.
  const approval = input.mode === "approval";
  if (!input.adminChatId.trim()) {
    steps.push({ id: "admin_chat_missing", level: approval ? "block" : "warn", params: { mode: input.mode } });
  } else if (input.connection && !input.connection.adminChatReachable) {
    steps.push({ id: "admin_chat_unreachable", level: approval ? "block" : "warn" });
  }

  // 6. The site URL: a local origin makes Telegram drop the links and the buttons.
  if (!input.siteUrl.trim()) steps.push({ id: "site_missing", level: "warn" });
  else if (!/^https:\/\//i.test(input.siteUrl)) steps.push({ id: "site_not_public", level: "warn", params: { url: input.siteUrl } });

  // A block above already decided the outcome; the remaining checks only matter
  // once the pipe can actually carry a post.
  if (steps.some((step) => step.level === "block")) return finish(steps, input);

  // 7. The catalogue — the answer to "ma'lumotlar kammi?".
  const cat = input.catalogue;
  if (cat.publishable === 0) {
    if (cat.total === 0) steps.push({ id: "catalogue_empty", level: "block", params: { total: cat.total } });
    else
      steps.push({
        id: "catalogue_stale",
        level: "block",
        params: { total: cat.total, active: cat.active, verified: cat.verified, stale: cat.stale },
      });
  } else if (cat.withExactDeadline === 0) {
    // Posts still go out (rolling / estimated deadlines), but no countdown and
    // no "3 days left" reminder can ever be produced.
    steps.push({ id: "catalogue_no_deadlines", level: "warn", params: { publishable: cat.publishable } });
  }

  // 8. Today's plan.
  const plan = input.plan;
  if (plan.planned === 0) {
    if (isQuietDay(plan.date)) steps.push({ id: "quiet_day", level: "warn", params: { date: plan.date } });
    else steps.push({ id: "plan_empty", level: "warn", params: { date: plan.date } });
  } else if (plan.open > 0 && waitingForWindow(plan.nextSendAt, input.now)) {
    steps.push({ id: "waiting_for_time", level: "ok", params: { time: String(plan.nextSendAt) } });
  }

  // 9. The tick. On a host that sleeps, nothing runs unless something wakes it —
  //    which is exactly what an uptime monitor can do.
  if (tickIsStale(input.tick, input.now)) {
    const age = minutesSinceTick(input.tick, input.now);
    steps.push({
      id: "cron_stale",
      level: "warn",
      params: { minutes: age ?? -1, interval: input.tick.intervalMinutes },
    });
  }

  // 10. The last real failure, verbatim, so it can be fixed instead of guessed.
  if (input.lastFailure) steps.push({ id: "last_failure", level: "warn", params: { error: input.lastFailure.slice(0, 200) } });

  return finish(steps, input);
}

function finish(steps: WhyStep[], input: WhyInput): WhyVerdict {
  const blocked = steps.find((step) => step.level === "block") ?? null;
  // An "ok" marker is only useful inside a list; it is not a warning.
  const warnings = steps.filter((step) => step.level === "warn");
  const nextSendAt = input.plan.open > 0 ? input.plan.nextSendAt : null;
  return {
    ready: blocked === null,
    blocked,
    warnings,
    steps,
    nextSendAt,
  };
}

/** A one-line ASCII summary — for logs, cron output and the CLI check. */
export function whySummary(verdict: WhyVerdict): string {
  if (verdict.blocked) {
    const params = verdict.blocked.params ?? {};
    const extra = Object.entries(params)
      .map(([key, value]) => `${key}=${value}`)
      .join(",");
    return `blocked:${verdict.blocked.id}${extra ? ` (${extra})` : ""}`;
  }
  const next = verdict.nextSendAt ? ` next=${verdict.nextSendAt}` : "";
  const warn = verdict.warnings.length ? ` warnings=${verdict.warnings.map((w) => w.id).join("+")}` : "";
  return `ready${next}${warn}`;
}

/** Exported for the panel: "3 soat oldin" instead of a timestamp. */
export function ageLabel(at: Date | null, now: Date): string | null {
  if (!at) return null;
  const hours = (now.getTime() - at.getTime()) / HOUR_MS;
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 48) return `${Math.round(hours)} soat`;
  return `${Math.round(hours / 24)} kun`;
}
