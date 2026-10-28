/**
 * Channel autopilot — the two things that make "connect it and it works" true:
 * one kick when the connection is saved, and an in-process loop afterwards.
 *
 * `autopilot.ts` holds the rules (how often, when to kick, what to say); this
 * file is the part that talks to the database and to Telegram. Keeping them
 * apart is what lets `scripts/check-channel.ts` test the rules without a
 * database — the same split as `approval.ts` / `approvalStore.ts`.
 *
 * What the kick does, in order:
 *   1. re-reads the settings the panel just saved (never trusts the request);
 *   2. refuses if the runtime is blocked (mode off, paused, unconnected);
 *   3. checks the connection, so a missing channel-admin right is said out
 *      loud instead of being discovered later;
 *   4. builds today's plan (idempotent);
 *   5. sends ONE welcome message to the admin chat;
 *   6. sends ONE post — the first one that is due, or the first planned one
 *      when nothing is due yet — through the normal publisher, so the mode,
 *      the approval step and the daily cap still decide what happens.
 *
 * "One" is deliberate: connecting should not dump three posts into the chat.
 * The loop picks up the rest on its next tick, which is exactly the
 * "one message, then it keeps going" behaviour the operator asked for.
 */
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { channelPlan } from "@/db/schema";
import { tgSendMessage } from "@/lib/telegram/api";
import { getChannelBotToken } from "./token";
import { resolveChannelRuntime, tashkentDay } from "./config";
import { ensureChannelTables } from "./db";
import { loadChannelSettings, writeChannelAudit } from "./repo";
import { checkChannelConnection } from "./connect";
import { runPlanForToday } from "./adminActions";
import { sendPlanRow, type SendOutcome } from "./send";
import {
  AUTOPILOT_TEXTS,
  autopilotEnabled,
  autopilotIntervalMinutes,
  connectMessage,
} from "./autopilot";

/** Outcomes that mean "the operator (or the channel) now has this post". */
const DELIVERED_STATUSES = ["sent", "dryrun", "approval"] as const;

function delivered(outcome: SendOutcome): boolean {
  return (DELIVERED_STATUSES as readonly string[]).includes(outcome.status);
}

export interface KickResult {
  kicked: boolean;
  /** Why the kick did nothing (null when it ran). */
  reason: string | null;
  /** The welcome message id in the admin chat (null when it could not be sent). */
  messageId: number | null;
  /** Posts planned for today after the plan was built. */
  planned: number;
  /** 1 when a post was handed over, 0 when today has nothing (quiet day). */
  delivered: number;
  /** Localised lines the welcome message reported as wrong. */
  problems: string[];
}

const g = globalThis as unknown as {
  __sbChannelAutopilotStarted?: boolean;
  __sbChannelTickRunning?: boolean;
};

/**
 * The post to hand over on connect: the earliest due one, or — when nothing is
 * due yet (an evening connect on a morning/evening plan) — the earliest one
 * still planned, so the operator sees the feature working instead of waiting
 * until tomorrow.
 */
async function firstPostForKick(now: Date) {
  const day = tashkentDay(now);
  const rows = await db
    .select()
    .from(channelPlan)
    .where(and(eq(channelPlan.planDate, day), eq(channelPlan.status, "planned")))
    .orderBy(asc(channelPlan.sendAt))
    .limit(5);
  if (!rows.length) return null;
  const hhmm = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tashkent",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  return rows.find((row) => row.sendAt <= hhmm) ?? rows[0] ?? null;
}

/**
 * Run the publisher once, right now, because the connection was just saved.
 *
 * Safe to call on every `connection` save: `shouldKickAfterConnect` decides
 * whether it should actually do anything, and every step below is idempotent
 * (the plan cannot be built twice, a post row is reserved before it is sent).
 */
export async function kickChannelAutopilot(
  actorProfileId: number | null,
  now: Date = new Date()
): Promise<KickResult> {
  const idle = (reason: string | null, extra: Partial<KickResult> = {}): KickResult => ({
    kicked: false,
    reason,
    messageId: null,
    planned: 0,
    delivered: 0,
    problems: [],
    ...extra,
  });

  if (!(await ensureChannelTables())) return idle("channel tables unavailable");

  const settings = await loadChannelSettings();
  const runtime = resolveChannelRuntime(settings, process.env, now);
  if (runtime.blockedReason) return idle(runtime.blockedReason);
  if (!runtime.adminChatId) return idle("The admin chat is not set");

  const { token } = await getChannelBotToken();
  if (!token) return idle("The bot token is not set");

  // A wrong channel id or a bot that was never promoted is the most common
  // mistake; say it in the first message instead of at the first failed post.
  const problems: string[] = [];
  try {
    const connection = await checkChannelConnection(runtime);
    if (!connection.channel.canPost) problems.push(AUTOPILOT_TEXTS.problemNoChannelAdmin);
    if (!connection.adminChat.reachable) problems.push(AUTOPILOT_TEXTS.problemNoAdminChat);
    if (!connection.siteUrl) problems.push(AUTOPILOT_TEXTS.problemNoSite);
  } catch {
    // A connection check is a courtesy, not a gate: a Telegram hiccup must not
    // stop the first post from being offered.
  }

  // The plan is idempotent, so building it here cannot duplicate a cron tick.
  let planned = 0;
  try {
    planned = (await runPlanForToday(actorProfileId)).planned;
  } catch (err) {
    console.warn("[channel] autopilot plan failed:", err instanceof Error ? err.message : err);
  }

  const hasPost = planned > 0;
  const minutes = autopilotIntervalMinutes();
  const text = connectMessage({
    mode: runtime.mode,
    channelId: runtime.channelId,
    siteUrl: runtime.siteUrl,
    problems,
    hasPost,
    minutes,
  });

  let messageId: number | null = null;
  const welcome = await tgSendMessage(token, runtime.adminChatId, text);
  if (welcome.ok) {
    messageId = welcome.result?.message_id ?? null;
  } else {
    // Without the welcome the kick is still worth completing: the post itself
    // is the thing the operator actually wanted.
    problems.push(welcome.description ?? AUTOPILOT_TEXTS.kickFailed);
  }

  let deliveredCount = 0;
  if (hasPost) {
    try {
      const row = await firstPostForKick(now);
      if (row) {
        const outcome = await sendPlanRow(row, { force: true, actorProfileId });
        if (delivered(outcome)) deliveredCount = 1;
        else problems.push(outcome.reason ?? AUTOPILOT_TEXTS.kickFailed);
      }
    } catch (err) {
      problems.push(AUTOPILOT_TEXTS.kickFailed);
      console.warn("[channel] autopilot first post failed:", err instanceof Error ? err.message : err);
    }
  }

  await writeChannelAudit({
    actorProfileId,
    action: "autopilot_kick",
    entity: "settings",
    entityId: "connection",
    after: { mode: runtime.mode, planned, delivered: deliveredCount, messageId, problems },
  });

  return {
    kicked: true,
    reason: null,
    messageId,
    planned,
    delivered: deliveredCount,
    problems,
  };
}

/**
 * The in-process tick. Same work as `/api/cron/channel`, minus the secret:
 * build the plan if today has none, then send whatever is due.
 *
 * Started once per server process from `src/instrumentation.ts`. It is a
 * convenience, not a replacement for cron: on a host that sleeps when idle the
 * loop sleeps with it, so `docs/CHANNEL.md` still tells operators to point an
 * external cron at `/api/cron/channel` when they can.
 */
export function startChannelAutopilot(): void {
  if (!autopilotEnabled()) return;
  if (g.__sbChannelAutopilotStarted) return;
  g.__sbChannelAutopilotStarted = true;

  const minutes = autopilotIntervalMinutes();

  const tick = async () => {
    if (g.__sbChannelTickRunning) return;
    g.__sbChannelTickRunning = true;
    try {
      const settings = await loadChannelSettings();
      const runtime = resolveChannelRuntime(settings);
      // Nothing to do when the publisher is off, paused or unconnected: the
      // check is repeated on every tick because the panel can change it.
      if (runtime.blockedReason) return;
      const { runPostsNow } = await import("./adminActions");
      const summary = await runPostsNow(null);
      if (summary.attempted > 0) {
        console.log(
          `[channel] tick: ${summary.sent} sent, ${summary.approval} awaiting approval, ${summary.skipped} skipped`
        );
      }
    } catch (err) {
      console.warn("[channel] tick failed:", err instanceof Error ? err.message : err);
    } finally {
      g.__sbChannelTickRunning = false;
    }
  };

  const first = setTimeout(tick, 60_000);
  const every = setInterval(tick, minutes * 60_000);
  // Never keep the process alive just for the timers.
  first.unref?.();
  every.unref?.();
  console.log(`[channel] autopilot every ${minutes}m (first tick in 1 min)`);
}
