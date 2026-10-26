/**
 * Sending one planned item to Telegram.
 *
 * Rules that make this safe to call from a cron job that may run twice:
 *  - the post row is inserted *before* the network call, keyed by the plan
 *    identity, so a retry finds the row and does not send a duplicate;
 *  - `mode = dryrun` always targets the admin chat, never the channel;
 *  - nothing is sent while the publisher is off, paused or unconfigured;
 *  - link previews are off unless an admin enabled them for that kind.
 *
 * The token is read from the Telegram settings (admin panel or environment) and
 * never appears in any response.
 */
import { and, eq, lte } from "drizzle-orm";
import { db } from "@/db";
import { channelPlan, channelPosts } from "@/db/schema";
import { getBotToken } from "@/lib/telegram/settings";
import { tgCall, tgSendPoll } from "@/lib/telegram/api";
import { resolveChannelRuntime, tashkentDay, type ChannelRuntime } from "./config";
import { ensureSiteLink, loadChannelSettings } from "./repo";
import { loadRenderData, loadChannelCountries } from "./runtime";
import { renderPlanItemWithReason, type RenderedPost } from "./render";
import { linkPreviewFor, type ChannelSettings } from "./settings";
import { sanitizeTelegramHtml } from "./sanitize";
import type { PlannedItem } from "./plan";
import { insertPoll } from "./engage";
import { pollPreviewText, pollSendParams, pollSendProblem, pollSpecByKey } from "./polls";

export interface SendOutcome {
  ok: boolean;
  status: "sent" | "dryrun" | "skipped" | "failed";
  chatId: string | null;
  messageId: number | null;
  reason: string | null;
  /** Rendered parts, for the admin preview. */
  parts: string[];
}

const MAX_FLOOD_WAIT_MS = 45_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function planRowToItem(row: typeof channelPlan.$inferSelect): PlannedItem {
  let payload: Record<string, unknown> = {};
  try {
    payload = row.payload ? (JSON.parse(row.payload) as Record<string, unknown>) : {};
  } catch {
    payload = {};
  }
  return {
    slot: row.slot,
    sendAt: row.sendAt,
    kind: row.kind as PlannedItem["kind"],
    lane: (row.lane as PlannedItem["lane"]) ?? "editorial",
    origin: (row.origin as PlannedItem["origin"]) ?? "rotation",
    rung: row.rung ?? null,
    scholarshipId: row.scholarshipId ?? null,
    templateKey: row.templateKey ?? "",
    topic: row.topic ?? null,
    pollType: (row.pollType as PlannedItem["pollType"]) ?? null,
    payload,
    reason: row.reason ?? "",
  };
}

function dedupeKey(row: typeof channelPlan.$inferSelect): string {
  return `post|${row.kind}|${row.scholarshipId ?? "-"}|${row.rung ?? "-"}|${row.planDate}|${row.slot}`;
}

/** Send one message part, honouring a long flood wait once. */
async function sendPart(
  token: string,
  chatId: string,
  html: string,
  disablePreview: boolean
): Promise<{ ok: boolean; messageId: number | null; error: string | null; retryAfter: number }> {
  const params: Record<string, unknown> = {
    chat_id: chatId,
    text: html,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: disablePreview },
  };
  const first = await tgCall<{ message_id: number }>(token, "sendMessage", params, 12_000);
  if (first.ok) return { ok: true, messageId: first.result?.message_id ?? null, error: null, retryAfter: 0 };
  const retryAfter = first.parameters?.retry_after ?? 0;
  if (first.error_code === 429 && retryAfter > 0 && retryAfter * 1000 <= MAX_FLOOD_WAIT_MS) {
    await sleep(retryAfter * 1000);
    const second = await tgCall<{ message_id: number }>(token, "sendMessage", params, 12_000);
    return second.ok
      ? { ok: true, messageId: second.result?.message_id ?? null, error: null, retryAfter }
      : { ok: false, messageId: null, error: second.description ?? "sendMessage failed", retryAfter };
  }
  return { ok: false, messageId: null, error: first.description ?? "sendMessage failed", retryAfter };
}

interface SendContext {
  settings: ChannelSettings;
  runtime: ChannelRuntime;
  token: string;
}

async function prepare(settings?: ChannelSettings): Promise<SendContext | { error: string }> {
  const resolved = settings ?? (await loadChannelSettings());
  const runtime = resolveChannelRuntime(resolved);
  const { token } = await getBotToken();
  if (!token) return { error: "The Telegram bot token is not configured (Admin → Telegram)" };
  return { settings: resolved, runtime, token };
}

/**
 * Render a stored plan row without sending anything — used by the admin preview
 * and by the queue table.
 */
export async function renderPlanRow(row: typeof channelPlan.$inferSelect): Promise<{ item: PlannedItem; parts: string[]; reason: string | null }> {
  const item = planRowToItem(row);
  if (item.kind === "poll") {
    const spec = pollSpecByKey(typeof item.payload.pollKey === "string" ? item.payload.pollKey : null);
    if (!spec) return { item, parts: [], reason: "poll_not_found" };
    const problem = pollSendProblem(spec);
    return {
      item,
      parts: [pollPreviewText(spec.question, spec.options.map((option) => option.text))],
      reason: problem ? `poll_not_sendable: ${problem}` : null,
    };
  }
  const settings = await loadChannelSettings();
  const runtime = resolveChannelRuntime(settings);
  const countries = await loadChannelCountries();
  const data = await loadRenderData([item], new Date(), {
    settings: { ...settings, siteUrl: runtime.siteUrl },
    countries,
  });
  const outcome = renderPlanItemWithReason(item, data);
  const parts = outcome.post?.parts ?? [];
  if (row.textOverride) {
    // An operator edited this post: send exactly that text, still sanitized.
    const clean = sanitizeTelegramHtml(row.textOverride);
    return { item, parts: [clean.html], reason: null };
  }
  return { item, parts, reason: outcome.reason };
}

export interface SendOptions {
  /** Ignore the daily cap and the pause (an explicit admin action). */
  force?: boolean;
  /** Send to the admin chat even when the mode is `on`. */
  toAdminChat?: boolean;
  actorProfileId?: number | null;
}

/**
 * Insert the post row *before* the network call. The dedupe key is the plan
 * identity, so a second concurrent tick finds the row and stops here instead of
 * posting twice.
 */
async function reservePost(
  row: typeof channelPlan.$inferSelect,
  mode: string,
  chatId: string,
  html: string
): Promise<{ postId: number | null; early?: SendOutcome }> {
  const key = dedupeKey(row);
  const inserted = await db
    .insert(channelPosts)
    .values({
      planId: row.id,
      kind: row.kind,
      rung: row.rung,
      scholarshipId: row.scholarshipId,
      planDate: row.planDate,
      slot: row.slot,
      dedupeKey: key,
      mode,
      chatId,
      html,
      lane: row.lane,
      textOverride: row.textOverride,
      status: "pending",
      attempts: 1,
    })
    .onConflictDoNothing({ target: channelPosts.dedupeKey })
    .returning({ id: channelPosts.id });

  let postId = inserted[0]?.id ?? null;
  if (!postId) {
    const existing = await db
      .select({ id: channelPosts.id, status: channelPosts.status })
      .from(channelPosts)
      .where(eq(channelPosts.dedupeKey, key))
      .limit(1);
    const state = existing[0]?.status;
    if (state === "sent") {
      return { postId: null, early: { ok: true, status: "sent", chatId, messageId: null, reason: "Already sent earlier", parts: [html] } };
    }
    if (state === "sending") {
      return { postId: null, early: { ok: false, status: "skipped", chatId, messageId: null, reason: "Another run is sending this post", parts: [html] } };
    }
    postId = existing[0]?.id ?? null;
    if (postId) {
      await db
        .update(channelPosts)
        .set({ status: "pending", mode, chatId, html, updatedAt: new Date() })
        .where(eq(channelPosts.id, postId));
    }
  }
  if (postId) {
    await db.update(channelPosts).set({ status: "sending", updatedAt: new Date() }).where(eq(channelPosts.id, postId));
  }
  return { postId };
}

export { pollPreviewText } from "./polls";

/**
 * A poll row is not a message: it goes out with `sendPoll`, has no HTML body and
 * cannot be multi-part. In dry-run mode it is shown in the admin chat so the
 * operator sees exactly what the channel would get — and no `channel_polls` row
 * is created, because a dry-run poll can never collect a vote.
 */
async function sendPollPlanRow(
  row: typeof channelPlan.$inferSelect,
  ctx: { mode: "dryrun" | "on"; chatId: string; token: string }
): Promise<SendOutcome> {
  const payload = planRowToItem(row).payload;
  const spec = pollSpecByKey(typeof payload.pollKey === "string" ? payload.pollKey : null);
  if (!spec) {
    return { ok: false, status: "skipped", chatId: null, messageId: null, reason: "Poll deck entry not found", parts: [] };
  }
  const problem = pollSendProblem(spec);
  if (problem) {
    return { ok: false, status: "skipped", chatId: null, messageId: null, reason: `Poll is not sendable: ${problem}`, parts: [] };
  }

  const params = pollSendParams(spec);
  const body = pollPreviewText(params.question, params.options);
  const reserved = await reservePost(row, ctx.mode, ctx.chatId, body);
  if (reserved.early) return reserved.early;
  const postId = reserved.postId as number;

  const sent = await tgSendPoll(ctx.token, ctx.chatId, params);
  if (!sent.ok || !sent.result) {
    const reason = sent.description ?? "sendPoll failed";
    await db.update(channelPosts).set({ status: "failed", error: reason, updatedAt: new Date() }).where(eq(channelPosts.id, postId));
    return { ok: false, status: "failed", chatId: ctx.chatId, messageId: null, reason, parts: [body] };
  }

  const now = new Date();
  await db
    .update(channelPosts)
    .set({ status: "sent", messageId: sent.result.message_id, sentAt: now, updatedAt: now, error: null })
    .where(eq(channelPosts.id, postId));
  await db.update(channelPlan).set({ status: "sent" }).where(eq(channelPlan.id, row.id));

  if (ctx.mode === "on") {
    await insertPoll({
      postId,
      messageId: sent.result.message_id,
      pollId: sent.result.poll?.id ?? null,
      pollType: spec.type,
      pollKey: spec.key,
      topic: spec.topic,
      question: params.question,
      options: spec.options,
      correctIndex: typeof params.correct_option_id === "number" ? params.correct_option_id : null,
    });
  }

  return {
    ok: true,
    status: ctx.mode === "on" ? "sent" : "dryrun",
    chatId: ctx.chatId,
    messageId: sent.result.message_id,
    reason: null,
    parts: [body],
  };
}

/**
 * Send one stored plan row. `opts.force` is only used by the admin "send now"
 * action; the cron path always goes through the mode, pause and cap checks.
 */
export async function sendPlanRow(
  row: typeof channelPlan.$inferSelect,
  opts: SendOptions = {}
): Promise<SendOutcome> {
  const prepared = await prepare();
  if ("error" in prepared) {
    return { ok: false, status: "failed", chatId: null, messageId: null, reason: prepared.error, parts: [] };
  }
  const { settings, runtime, token } = prepared;

  const mode = opts.toAdminChat ? "dryrun" : runtime.mode;
  if (mode === "off") {
    return { ok: false, status: "skipped", chatId: null, messageId: null, reason: runtime.blockedReason ?? "Publisher is off", parts: [] };
  }
  if (!opts.force && runtime.blockedReason) {
    return { ok: false, status: "skipped", chatId: null, messageId: null, reason: runtime.blockedReason, parts: [] };
  }
  const chatId = mode === "on" ? runtime.channelId : runtime.adminChatId;
  if (!chatId) {
    return { ok: false, status: "failed", chatId: null, messageId: null, reason: "No target chat configured", parts: [] };
  }

  if (row.kind === "poll") {
    return await sendPollPlanRow(row, { mode, chatId, token });
  }

  // Render first: a post that cannot be rendered must not create a post row.
  const rendered = await renderPlanRow(row);
  let parts: string[] = rendered.parts;
  if (!parts.length) {
    return { ok: false, status: "skipped", chatId: null, messageId: null, reason: rendered.reason ?? "Nothing to send", parts: [] };
  }
  parts = parts.filter((part) => part.trim().length > 0);

  // A tracked link must exist before the message points at it.
  if (row.scholarshipId) await ensureSiteLink(row.scholarshipId, runtime.siteUrl);

  const reserved = await reservePost(row, mode, chatId, parts.join("\n\n———\n\n"));
  if (reserved.early) return reserved.early;
  const postId = reserved.postId as number;

  const disablePreview = !linkPreviewFor(settings, row.kind);
  let firstMessageId: number | null = null;
  for (const [index, part] of parts.entries()) {
    const result = await sendPart(token, chatId, part, disablePreview);
    if (!result.ok) {
      await db
        .update(channelPosts)
        .set({ status: "failed", error: result.error, updatedAt: new Date() })
        .where(eq(channelPosts.id, postId as number));
      return { ok: false, status: "failed", chatId, messageId: null, reason: result.error, parts };
    }
    if (index === 0) firstMessageId = result.messageId;
    if (index < parts.length - 1) await sleep(1200); // never burst multi-part posts
  }

  const now = new Date();
  await db
    .update(channelPosts)
    .set({
      status: "sent",
      messageId: firstMessageId,
      sentAt: now,
      updatedAt: now,
      error: null,
    })
    .where(eq(channelPosts.id, postId as number));
  await db.update(channelPlan).set({ status: "sent" }).where(eq(channelPlan.id, row.id));

  return {
    ok: true,
    status: mode === "on" ? "sent" : "dryrun",
    chatId,
    messageId: firstMessageId,
    reason: null,
    parts,
  };
}

/** Plan rows due now (or a whole day, for the admin queue). */
export async function duePlanRows(now = new Date(), limit = 5) {
  const day = tashkentDay(now);
  const hhmm = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tashkent",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  const rows = await db
    .select()
    .from(channelPlan)
    .where(and(eq(channelPlan.planDate, day), eq(channelPlan.status, "planned"), lte(channelPlan.sendAt, hhmm)))
    .limit(limit);
  return rows;
}

/**
 * Run everything that is due today, at most `limit` messages. The caller (cron
 * route or the admin "run now" button) has already checked the mode.
 */
export async function runDuePosts(now = new Date(), limit = 3): Promise<SendOutcome[]> {
  const rows = await duePlanRows(now, limit);
  const out: SendOutcome[] = [];
  for (const row of rows) {
    out.push(await sendPlanRow(row));
  }
  return out;
}

/** A one-message connectivity test, always to the admin chat. */
export async function sendTestMessage(text?: string): Promise<SendOutcome> {
  const prepared = await prepare();
  if ("error" in prepared) {
    return { ok: false, status: "failed", chatId: null, messageId: null, reason: prepared.error, parts: [] };
  }
  const { runtime, token } = prepared;
  if (!runtime.adminChatId) {
    return { ok: false, status: "failed", chatId: null, messageId: null, reason: "Set the admin chat id first", parts: [] };
  }
  const body =
    text ??
    [
      "🧪 <b>Sinov xabari</b>",
      "Kanal ulanishi tekshirilmoqda. Bu xabar faqat admin chatiga yuboriladi.",
      runtime.siteUrl ? `🔗 <a href="${runtime.siteUrl}">${runtime.siteUrl.replace(/^https?:\/\//, "")}</a>` : null,
    ]
      .filter(Boolean)
      .join("\n\n");
  const result = await sendPart(token, runtime.adminChatId, body, true);
  return {
    ok: result.ok,
    status: result.ok ? "dryrun" : "failed",
    chatId: runtime.adminChatId,
    messageId: result.messageId,
    reason: result.error,
    parts: [body],
  };
}
