/**
 * Channel autopilot — "connect the channel and it starts by itself".
 *
 * Two things were missing before this file:
 *
 *   1. **Nothing happened on connect.** An operator saved the channel id, the
 *      admin chat and the mode, and then... nothing. The first post only
 *      appeared when an external cron called `/api/cron/channel`, which on a
 *      free host is a separate thing to set up (and forget). The chat stayed
 *      silent, so "is it connected?" had no answer you could see.
 *
 *   2. **Nothing ran in between.** Even with a cron configured to every 30
 *      minutes, a post that became due just after a tick waited half an hour,
 *      and a deployment without cron never posted at all.
 *
 * So: saving the connection kicks the publisher once, immediately (one message
 * in the admin chat, then the first post), and a lightweight in-process loop
 * keeps ticking afterwards — no extra service, no external cron required.
 *
 * This module is pure (no database, no network) so the rules can be tested
 * without a connection; the loop and the kick live in `boot.ts`. The hierarchy
 * mirrors `approval.ts` / `approvalStore.ts`:
 *
 *   autopilot.ts   rules: interval, on/off switches, "should this connection
 *                  kick?", the welcome text                        (pure)
 *   boot.ts        the kick (one message + first posts) and the loop
 *
 * Nothing here decides *what* is posted: the kick calls the same
 * `runPostsNow` the cron endpoint and the panel button call, so the daily cap,
 * the send windows, the quiet day and the approval step all still apply.
 */
import type { ChannelMode } from "./settings";
import type { ChannelRuntime } from "./config";

/* -------------------------------------------------------------------------- */
/* Loop cadence                                                               */
/* -------------------------------------------------------------------------- */

/** Minutes between two publisher ticks when `CHANNEL_TICK_MINUTES` is unset. */
export const AUTOPILOT_DEFAULT_MINUTES = 15;

/** Never tick faster than this: Telegram is rate limited and a post is not chat. */
export const AUTOPILOT_MIN_MINUTES = 5;

/** Never tick slower than this: a due post should not wait a whole afternoon. */
export const AUTOPILOT_MAX_MINUTES = 120;

/**
 * Tick interval in minutes, clamped to 5–120.
 *
 * A value that is not a number keeps the default instead of turning the loop
 * off: a typo in an environment variable must not silently stop publishing,
 * the same way it must not silently start it (see `parseAutopost`).
 */
export function autopilotIntervalMinutes(env: Record<string, string | undefined> = process.env): number {
  const raw = Number(env.CHANNEL_TICK_MINUTES ?? AUTOPILOT_DEFAULT_MINUTES);
  if (!Number.isFinite(raw) || raw <= 0) return AUTOPILOT_DEFAULT_MINUTES;
  return Math.min(AUTOPILOT_MAX_MINUTES, Math.max(AUTOPILOT_MIN_MINUTES, Math.round(raw)));
}

export function autopilotIntervalMs(env: Record<string, string | undefined> = process.env): number {
  return autopilotIntervalMinutes(env) * 60_000;
}

/**
 * Is the in-process loop allowed to run here?
 *
 * The same shape as the reminder scheduler, for the same reasons:
 *   - `CHANNEL_AUTOPILOT=off` turns it off (a host that prefers its own cron);
 *   - a development server stays quiet unless explicitly asked
 *     (`CHANNEL_AUTOPILOT=on`), so `next dev` does not post;
 *   - without a database there is nothing to plan against.
 *
 * `CHANNEL_AUTOPOST=off` is *not* checked here: the loop still needs to run so
 * that a post edited/approved in the panel is delivered, and `runPostsNow`
 * refuses on the runtime's `blockedReason` anyway.
 */
export function autopilotEnabled(env: Record<string, string | undefined> = process.env): boolean {
  const raw = (env.CHANNEL_AUTOPILOT ?? "").trim().toLowerCase();
  if (raw === "off") return false;
  if (!env.DATABASE_URL) return false;
  if (env.NODE_ENV !== "production" && raw !== "on") return false;
  return true;
}

/* -------------------------------------------------------------------------- */
/* The kick                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Should saving the connection immediately run the publisher?
 *
 * Only on a transition: the connection just became usable (it was off, not
 * connected or paused before), or the wiring itself changed (another channel,
 * another admin chat, another mode). Saving the same values twice must not
 * send the same welcome message twice.
 */
export function shouldKickAfterConnect(before: ChannelRuntime, after: ChannelRuntime): boolean {
  if (after.blockedReason) return false;
  if (before.blockedReason) return true;
  return (
    before.mode !== after.mode || before.channelId !== after.channelId || before.adminChatId !== after.adminChatId
  );
}

/* -------------------------------------------------------------------------- */
/* Operator texts (Uzbek — the channel's language)                            */
/* -------------------------------------------------------------------------- */

/** Mode labels, in the same words the panel uses. */
export const MODE_LABELS: Record<ChannelMode, string> = {
  off: "O'chirilgan",
  dryrun: "Sinov rejimi",
  approval: "Tasdiqlash bilan",
  on: "Jonli",
};

/**
 * Everything the welcome message says, in one reviewable block. No AI, no
 * claims, no numbers about scholarships: this is a status report to the
 * operator, not content for the channel.
 */
export const AUTOPILOT_TEXTS = {
  header: "✅ <b>Kanal ulandi</b>",
  introApproval: "Endi har bir post avval shu chatga keladi. Tasdiqlasangiz kanalga chiqadi.",
  introLive: "Endi postlar kanalga avtomatik chiqadi. Muammo bo'lsa shu chatga yozaman.",
  introDryrun: "Sinov rejimi: postlar faqat shu chatga keladi, kanalga hech narsa chiqmaydi.",
  mode: "Rejim",
  channel: "Kanal",
  site: "Sayt",
  firstPost: "Birinchi post pastda: ✅ Tasdiqlash · ❌ Rad etish · ✏️ Tahrirlash.",
  firstPostSent: "Birinchi post hozir yuborildi — pastda ko'rasiz.",
  noPostToday: "Bugun navbatda post yo'q (dam kuni). Navbat paydo bo'lishi bilan shu chatga keladi.",
  problemsTitle: "⚠️ <b>Diqqat</b>",
  problemNoChannelAdmin: "Bot kanalda administrator emas yoki «Post messages» ruxsati yo'q.",
  problemNoAdminChat: "Bu chatga yozib bo'lmadi — botni bu yerda bir marta ochib /start bosing.",
  problemNoSite: "Sayt manzili yo'q — postlardagi havolalar tushib qoladi.",
  kickFailed: "Birinchi postni hozir yuborib bo'lmadi — tizim keyingi tekshiruvda yana urinadi.",
} as const;

/** `har 15 daqiqada` — the cadence, spelled out for the operator. */
export function cadenceLine(minutes: number): string {
  return `Tizim o'zi har ${minutes} daqiqada tekshiradi — siz hech narsa qilmasangiz ham davom etadi.`;
}

export interface ConnectMessageInput {
  mode: ChannelMode;
  /** What the operator typed, echoed back so a typo is visible at once. */
  channelId: string;
  siteUrl: string;
  /** Human-readable problems found by the connection check (already localised). */
  problems: string[];
  /** False when today's plan is empty (a quiet day), so the operator is not waiting for a post. */
  hasPost: boolean;
  minutes: number;
}

/**
 * The one message that arrives the moment the channel is connected.
 *
 * It states the mode, says what happens next (first post below / quiet day
 * today), how often the loop runs, and — the part that saves a support
 * message — anything the connection check already knows is wrong.
 */
export function connectMessage(input: ConnectMessageInput): string {
  const intro =
    input.mode === "approval"
      ? AUTOPILOT_TEXTS.introApproval
      : input.mode === "on"
        ? AUTOPILOT_TEXTS.introLive
        : AUTOPILOT_TEXTS.introDryrun;

  const lines = [
    AUTOPILOT_TEXTS.header,
    intro,
    `${AUTOPILOT_TEXTS.mode}: <b>${MODE_LABELS[input.mode]}</b>`,
    input.channelId ? `${AUTOPILOT_TEXTS.channel}: <code>${escapeText(input.channelId)}</code>` : null,
    input.siteUrl ? `${AUTOPILOT_TEXTS.site}: ${escapeText(input.siteUrl)}` : null,
    !input.hasPost
      ? AUTOPILOT_TEXTS.noPostToday
      : input.mode === "approval"
        ? AUTOPILOT_TEXTS.firstPost
        : AUTOPILOT_TEXTS.firstPostSent,
    cadenceLine(input.minutes),
  ].filter(Boolean);

  if (input.problems.length) {
    lines.push("", AUTOPILOT_TEXTS.problemsTitle, ...input.problems.map((p) => `• ${p}`));
  }
  return lines.join("\n");
}

/** The same escaping the channel templates use for operator-supplied text. */
function escapeText(raw: string): string {
  return raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
