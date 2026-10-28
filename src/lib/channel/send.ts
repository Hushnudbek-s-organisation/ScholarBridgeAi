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
import { and, eq, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import { channelPlan, channelPosts } from "@/db/schema";
import { getChannelBotToken } from "./token";
import { tgCall, tgEditMessage, tgSendPoll, type TgResult } from "@/lib/telegram/api";
import { resolveChannelRuntime, tashkentDay, type ChannelRuntime } from "./config";
import { ensureSiteLink, loadChannelSettings, writeChannelAudit } from "./repo";
import { loadRenderData, loadChannelCountries } from "./runtime";
import { renderPlanItemWithReason, type RenderedPost } from "./render";
import { linkPreviewFor, type ChannelSettings } from "./settings";
import { sanitizeTelegramHtml } from "./sanitize";
import type { PlannedItem } from "./plan";
import { insertPoll } from "./engage";
import {
  APPROVAL_TEXTS,
  approvalHeader,
  approvalKeyboard,
  approvalTtlHours,
  PARTS_SEPARATOR,
  splitApprovalParts,
  APPROVAL_STATUS,
  CONSUMED_POST_STATUSES,
  OPEN_APPROVAL_STATUSES,
  sendablePlanRows,
} from "./approval";
import { pollPreviewText, pollSendParams, pollSendProblem, pollSpecByKey } from "./polls";
import { recoveryAttempt, usableButtons, type SendAttempt } from "./recover";

export interface SendOutcome {
  ok: boolean;
  /** `approval` = it is sitting in the admin chat waiting for a human. */
  status: "sent" | "dryrun" | "approval" | "skipped" | "failed";
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

/**
 * One `sendMessage`, with the recovery ladder from `recover.ts`.
 *
 * Telegram rejects a whole message for reasons that are not about the content:
 * an inline-button URL that is not absolute https (a deployment configured with
 * `APP_URL=http://localhost:3000` produces exactly that) or markup it cannot
 * parse. Both used to lose the post. Now the keyboard is dropped first (the
 * text is what matters), then the markup, and only then is the send reported as
 * failed — with the reason the operator can act on.
 */
async function sendMessageWithRecovery(
  token: string,
  chatId: string,
  html: string,
  params: { disablePreview: boolean; keyboard?: Array<Array<{ text: string; url?: string; callback_data?: string }>> },
  timeoutMs = 12_000
): Promise<{ ok: boolean; messageId: number | null; error: string | null; retryAfter: number; recovered: string | null }> {
  const initialButtons = params.keyboard ?? [];
  const { rows: buttons, dropped } = usableButtons(initialButtons);
  let attempt: SendAttempt = {
    kind: "html",
    text: html,
    withKeyboard: buttons.length > 0,
  };

  let last: TgResult<{ message_id: number }> = { ok: false, description: "not sent" };
  let recovered: string | null = dropped.length ? `dropped_buttons:${dropped.length}` : null;

  for (let step = 0; step < 3; step++) {
    const body: Record<string, unknown> = {
      chat_id: chatId,
      text: attempt.text,
      link_preview_options: { is_disabled: params.disablePreview },
    };
    if (attempt.kind === "html") body.parse_mode = "HTML";
    if (attempt.withKeyboard) body.reply_markup = { inline_keyboard: buttons };

    last = await tgCall<{ message_id: number }>(token, "sendMessage", body, timeoutMs);
    if (last.ok) {
      return { ok: true, messageId: last.result?.message_id ?? null, error: null, retryAfter: 0, recovered };
    }

    const retryAfter = last.parameters?.retry_after ?? 0;
    if (last.error_code === 429 && retryAfter > 0 && retryAfter * 1000 <= MAX_FLOOD_WAIT_MS) {
      await sleep(retryAfter * 1000);
      last = await tgCall<{ message_id: number }>(token, "sendMessage", body, timeoutMs);
      if (last.ok) {
        return { ok: true, messageId: last.result?.message_id ?? null, error: null, retryAfter, recovered };
      }
    }

    const next = recoveryAttempt(attempt, last.description);
    if (!next) break;
    recovered = next.kind === "plain" ? "plain_text" : "without_keyboard";
    attempt = next;
  }

  return {
    ok: false,
    messageId: null,
    error: last.description ?? "sendMessage failed",
    retryAfter: last.parameters?.retry_after ?? 0,
    recovered,
  };
}

/** Send one message part, honouring a long flood wait once. */
async function sendPart(
  token: string,
  chatId: string,
  html: string,
  disablePreview: boolean
): Promise<{ ok: boolean; messageId: number | null; error: string | null; retryAfter: number }> {
  const result = await sendMessageWithRecovery(token, chatId, html, { disablePreview });
  return { ok: result.ok, messageId: result.messageId, error: result.error, retryAfter: result.retryAfter };
}

interface SendContext {
  settings: ChannelSettings;
  runtime: ChannelRuntime;
  token: string;
}

async function prepare(settings?: ChannelSettings): Promise<SendContext | { error: string }> {
  const resolved = settings ?? (await loadChannelSettings());
  const runtime = resolveChannelRuntime(resolved);
  const { token } = await getChannelBotToken();
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
  /**
   * "Send now" from the queue: publish to the channel even in approval mode.
   *
   * The approval step exists so nothing reaches the channel *unread*. An
   * operator pressing "Hozir yuborish" has read it and decided — asking them to
   * confirm their own confirmation is the kind of friction that makes people
   * turn the approval step off.
   */
  direct?: boolean;
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
    // A post that is already with a human must not be re-offered on every cron
    // tick, and one that was rejected or timed out must stay closed for this
    // plan identity (tomorrow's post has its own dedupe key).
    if ((OPEN_APPROVAL_STATUSES as readonly string[]).includes(state ?? "")) {
      return { postId: null, early: { ok: false, status: "skipped", chatId, messageId: null, reason: "Waiting for approval in the admin chat", parts: [html] } };
    }
    if (state === APPROVAL_STATUS.rejected || state === APPROVAL_STATUS.expired) {
      return { postId: null, early: { ok: false, status: "skipped", chatId, messageId: null, reason: `This post was already ${state}`, parts: [html] } };
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

  // `direct` publishes without the approval step; `toAdminChat` is a preview.
  const mode = opts.direct && !opts.toAdminChat ? ("on" as const) : opts.toAdminChat ? ("dryrun" as const) : runtime.mode;
  if (mode === "off") {
    return { ok: false, status: "skipped", chatId: null, messageId: null, reason: runtime.blockedReason ?? "Publisher is off", parts: [] };
  }
  /**
   * Approval mode with no admin chat is not a dead end.
   *
   * The preview cannot be delivered, but the decision can still be taken in the
   * panel (Admin → Kanal → "Tasdiqlash kutilmoqda"). Blocking here would leave
   * the post nowhere: not in Telegram, not in the queue, invisible until TTL.
   * Every other reason still blocks — posting to the channel by accident is
   * worse than waiting.
   */
  const panelOnlyApproval = mode === "approval" && !runtime.adminChatId;
  if (!opts.force && runtime.blockedReason && !panelOnlyApproval) {
    return { ok: false, status: "skipped", chatId: null, messageId: null, reason: runtime.blockedReason, parts: [] };
  }
  const chatId = mode === "on" ? runtime.channelId : runtime.adminChatId;
  if (!chatId && !panelOnlyApproval) {
    return { ok: false, status: "failed", chatId: null, messageId: null, reason: "No target chat configured", parts: [] };
  }

  // Approval mode: nothing is posted until a human presses a button.
  if (mode === "approval") {
    return await sendPlanRowForApproval(row, { settings, runtime, token }, chatId);
  }

  /**
   * "Hozir yuborish" on a post that is already waiting for approval must not
   * dead-end in the inbox. The operator is looking at that row and pressing
   * Send; the stored text is the one they were shown, so publish exactly that
   * (approveApproval reads the row, never a fresh render).
   */
  if (mode === "on" && opts.direct) {
    const [waiting] = await db
      .select({ id: channelPosts.id })
      .from(channelPosts)
      .where(
        and(
          eq(channelPosts.dedupeKey, dedupeKey(row)),
          inArray(channelPosts.status, [...OPEN_APPROVAL_STATUSES])
        )
      )
      .limit(1);
    if (waiting) return await approveApproval(waiting.id, opts.actorProfileId ?? null);
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

/* ==========================================================================
 * Approval mode — nothing is posted until a human presses a button
 * ==========================================================================
 *
 * Flow
 *   1. the cron tick renders the post exactly as it would be published;
 *   2. the body is stored on the post row (byte-for-byte) and sent to the
 *      admin chat, with [Approve] [Reject] [Edit] on the last part;
 *   3. Approve publishes *that stored body* to the channel — it is never
 *      re-rendered, so what the operator read is what the channel gets;
 *   4. Reject closes the post, Edit replaces the body and re-offers it.
 *
 * The row is claimed with a conditional UPDATE before anything is sent, so a
 * double press (or two admins at once) publishes once.
 */

/** One part, optionally carrying the decision buttons. */
async function sendPartWithKeyboard(
  token: string,
  chatId: string,
  html: string,
  disablePreview: boolean,
  keyboard: { text: string; callback_data: string }[][]
): Promise<{ ok: boolean; messageId: number | null; error: string | null }> {
  const result = await sendMessageWithRecovery(token, chatId, html, { disablePreview, keyboard });
  return { ok: result.ok, messageId: result.messageId, error: result.error };
}

/**
 * Render a plan row and send it to the admin chat for confirmation.
 *
 * The header is a separate message so the stored body stays identical to what
 * the channel will receive. `channel_posts.messageId` keeps the id of the LAST
 * part — the one that carries the buttons and the one an edit rewrites.
 */
async function sendPlanRowForApproval(
  row: typeof channelPlan.$inferSelect,
  ctx: SendContext,
  adminChatId: string
): Promise<SendOutcome> {
  const { settings, runtime, token } = ctx;
  const rendered = await renderPlanRow(row);
  const parts = rendered.parts.map((part) => part.trim()).filter(Boolean);
  if (!parts.length) {
    return { ok: false, status: "skipped", chatId: null, messageId: null, reason: rendered.reason ?? "Nothing to send", parts: [] };
  }

  if (row.scholarshipId) await ensureSiteLink(row.scholarshipId, runtime.siteUrl);

  const reserved = await reservePost(row, "approval", adminChatId, parts.join(PARTS_SEPARATOR));
  if (reserved.early) return reserved.early;
  const postId = reserved.postId as number;

  /**
   * No admin chat: keep the post open for the panel.
   *
   * Without this the row was either never created or marked failed, so the
   * operator saw nothing in Telegram *and* nothing to approve — the post simply
   * disappeared until the next tick retried it into the same silence.
   */
  if (!adminChatId) {
    await db
      .update(channelPosts)
      .set({ status: APPROVAL_STATUS.awaiting, error: APPROVAL_TEXTS.panelOnly, updatedAt: new Date() })
      .where(eq(channelPosts.id, postId));
    return {
      ok: true,
      status: "approval",
      chatId: null,
      messageId: null,
      reason: APPROVAL_TEXTS.panelOnly,
      parts,
    };
  }

  const header = approvalHeader({
    kind: row.kind,
    slot: row.slot ?? null,
    partCount: parts.length,
    ttlHours: approvalTtlHours(),
  });
  const head = await sendPart(token, adminChatId, header, true);
  if (!head.ok) {
    /**
     * The admin chat is unreachable (bot never started there, chat deleted).
     * The post is still valid and still needs a decision, so it stays OPEN and
     * the panel shows it with the reason instead of losing it.
     */
    await db
      .update(channelPosts)
      .set({ status: APPROVAL_STATUS.awaiting, error: `preview_not_delivered: ${head.error}`, updatedAt: new Date() })
      .where(eq(channelPosts.id, postId));
    return { ok: true, status: "approval", chatId: null, messageId: null, reason: head.error, parts };
  }

  const keyboard = approvalKeyboard(postId);
  const disablePreview = !linkPreviewFor(settings, row.kind);
  let lastMessageId: number | null = null;
  for (const [index, part] of parts.entries()) {
    const isLast = index === parts.length - 1;
    const result = isLast
      ? await sendPartWithKeyboard(token, adminChatId, part, disablePreview, keyboard)
      : await sendPart(token, adminChatId, part, disablePreview);
    if (!result.ok) {
      // Same rule as the header: a Telegram hiccup must not discard the draft.
      await db
        .update(channelPosts)
        .set({ status: APPROVAL_STATUS.awaiting, error: `preview_not_delivered: ${result.error}`, updatedAt: new Date() })
        .where(eq(channelPosts.id, postId));
      return { ok: true, status: "approval", chatId: null, messageId: null, reason: result.error, parts };
    }
    if (index === 0) lastMessageId = lastMessageId ?? result.messageId;
    lastMessageId = result.messageId;
    if (!isLast) await sleep(1200);
  }

  const now = new Date();
  await db
    .update(channelPosts)
    .set({ status: APPROVAL_STATUS.awaiting, messageId: lastMessageId, updatedAt: now, error: null })
    .where(eq(channelPosts.id, postId));

  return { ok: true, status: "approval", chatId: adminChatId, messageId: lastMessageId, reason: null, parts };
}

/** Claim a post for one actor: only `awaiting_approval`/`editing` can move. */
async function claimApproval(postId: number, now: Date): Promise<typeof channelPosts.$inferSelect | null> {
  const claimed = await db
    .update(channelPosts)
    .set({ status: "sending", updatedAt: now })
    .where(and(eq(channelPosts.id, postId), inArray(channelPosts.status, [...OPEN_APPROVAL_STATUSES])))
    .returning();
  return claimed[0] ?? null;
}

/**
 * Publish an approved post to the channel.
 *
 * The body comes from the stored row, never from a fresh render: the operator
 * approved specific words, and a re-render could change "5 days left" into
 * "4 days left" between the preview and the button press.
 */
export async function approveApproval(
  postId: number,
  actorProfileId: number | null,
  now: Date = new Date()
): Promise<SendOutcome> {
  const prepared = await prepare();
  if ("error" in prepared) {
    return { ok: false, status: "failed", chatId: null, messageId: null, reason: prepared.error, parts: [] };
  }
  const { settings, runtime, token } = prepared;
  const blocked = (reason: string): SendOutcome => ({ ok: false, status: "skipped", chatId: null, messageId: null, reason, parts: [] });

  if (runtime.envKillSwitch) return blocked(APPROVAL_TEXTS.killSwitch);
  if (runtime.mode === "off") return blocked(runtime.blockedReason ?? "Publisher is off");
  if (!runtime.channelId) return blocked("The channel is not connected yet");

  const [existing] = await db.select().from(channelPosts).where(eq(channelPosts.id, postId)).limit(1);
  if (!existing) return blocked(APPROVAL_TEXTS.unknownPost);
  if (existing.status === "sent") return blocked(APPROVAL_TEXTS.alreadySent);
  const post = await claimApproval(postId, now);
  if (!post) return blocked(APPROVAL_TEXTS.rejectedAlready);

  const restore = async (status: string, error: string) => {
    await db.update(channelPosts).set({ status, error, updatedAt: new Date() }).where(eq(channelPosts.id, postId));
  };

  const planRows = post.planId
    ? await db.select().from(channelPlan).where(eq(channelPlan.id, post.planId)).limit(1)
    : [];
  const plan = planRows[0] ?? null;

  // ---- polls: the channel needs a real vote, not the preview text ---------
  if (post.kind === "poll") {
    const spec = plan
      ? pollSpecByKey(typeof planRowToItem(plan).payload.pollKey === "string" ? (planRowToItem(plan).payload.pollKey as string) : null)
      : null;
    if (!spec || !plan) {
      await restore(APPROVAL_STATUS.awaiting, "Poll deck entry not found");
      return blocked("Poll deck entry not found");
    }
    const params = pollSendParams(spec);
    const sent = await tgSendPoll(token, runtime.channelId, params);
    if (!sent.ok || !sent.result) {
      const reason = sent.description ?? "sendPoll failed";
      await restore(APPROVAL_STATUS.awaiting, reason);
      return { ok: false, status: "failed", chatId: runtime.channelId, messageId: null, reason, parts: [] };
    }
    const stamp = new Date();
    await db
      .update(channelPosts)
      .set({ status: "sent", chatId: runtime.channelId, messageId: sent.result.message_id, sentAt: stamp, updatedAt: stamp, error: null })
      .where(eq(channelPosts.id, postId));
    await db.update(channelPlan).set({ status: "sent" }).where(eq(channelPlan.id, plan.id));
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
    await writeChannelAudit({
      actorProfileId,
      action: "approval_approve",
      entity: "post",
      entityId: String(postId),
      after: { channel: runtime.channelId, messageId: sent.result.message_id, kind: post.kind },
    });
    return { ok: true, status: "sent", chatId: runtime.channelId, messageId: sent.result.message_id, reason: null, parts: [] };
  }

  // ---- text posts: exactly the stored body --------------------------------
  const parts = splitApprovalParts(post.html);
  if (!parts.length) {
    await restore(APPROVAL_STATUS.awaiting, "The stored body is empty");
    return blocked("The stored body is empty");
  }
  const disablePreview = !linkPreviewFor(settings, post.kind);
  let firstMessageId: number | null = null;
  for (const [index, part] of parts.entries()) {
    const result = await sendPart(token, runtime.channelId, part, disablePreview);
    if (!result.ok) {
      // Back to the queue: a transient Telegram error must not lose the post.
      await restore(APPROVAL_STATUS.awaiting, result.error ?? "sendMessage failed");
      return { ok: false, status: "failed", chatId: runtime.channelId, messageId: null, reason: result.error, parts };
    }
    if (index === 0) firstMessageId = result.messageId;
    if (index < parts.length - 1) await sleep(1200);
  }

  const stamp = new Date();
  await db
    .update(channelPosts)
    .set({
      status: "sent",
      chatId: runtime.channelId,
      messageId: firstMessageId,
      sentAt: stamp,
      updatedAt: stamp,
      error: null,
    })
    .where(eq(channelPosts.id, postId));
  if (plan) await db.update(channelPlan).set({ status: "sent" }).where(eq(channelPlan.id, plan.id));

  await writeChannelAudit({
    actorProfileId,
    action: "approval_approve",
    entity: "post",
    entityId: String(postId),
    after: { channel: runtime.channelId, messageId: firstMessageId, parts: parts.length, edited: Boolean(plan?.textOverride) },
  });

  return { ok: true, status: "sent", chatId: runtime.channelId, messageId: firstMessageId, reason: null, parts };
}

/** Close a post that should never be published. */
export async function rejectApproval(
  postId: number,
  actorProfileId: number | null,
  reason: string | null = null
): Promise<{ ok: boolean; reason: string | null }> {
  const claimed = await claimApproval(postId, new Date());
  if (!claimed) return { ok: false, reason: APPROVAL_TEXTS.rejectedAlready };
  await db
    .update(channelPosts)
    .set({ status: APPROVAL_STATUS.rejected, error: reason, updatedAt: new Date() })
    .where(eq(channelPosts.id, postId));
  if (claimed.planId) {
    await db
      .update(channelPlan)
      .set({ status: "skipped", skipReason: (reason ?? "Rejected by an admin").slice(0, 200) })
      .where(eq(channelPlan.id, claimed.planId));
  }
  await writeChannelAudit({
    actorProfileId,
    action: "approval_reject",
    entity: "post",
    entityId: String(postId),
    after: { reason },
  });
  return { ok: true, reason: null };
}

/**
 * Replace the body of a post that is waiting for confirmation.
 *
 * The new text goes through the same sanitizer as a template post (Telegram
 * HTML only, https links only) and is written to `channelPlan.textOverride`
 * as well, so a later re-render for the same plan identity keeps the human
 * wording instead of quietly reverting to the template.
 */
export async function applyApprovalEdit(
  postId: number,
  text: string,
  actorProfileId: number | null
): Promise<{ ok: true; html: string } | { ok: false; error: "empty" | "too_long" | "closed"; max: number }> {
  const MAX = 4000;
  const clean = sanitizeTelegramHtml(text ?? "").html.trim();
  if (!clean) return { ok: false, error: "empty", max: MAX };
  if (clean.length > MAX) return { ok: false, error: "too_long", max: MAX };

  const [post] = await db.select().from(channelPosts).where(eq(channelPosts.id, postId)).limit(1);
  if (!post || !(OPEN_APPROVAL_STATUSES as readonly string[]).includes(post.status)) {
    return { ok: false, error: "closed", max: MAX };
  }

  await db
    .update(channelPosts)
    .set({ html: clean, status: APPROVAL_STATUS.awaiting, error: null, updatedAt: new Date() })
    .where(eq(channelPosts.id, postId));
  if (post.planId) {
    await db.update(channelPlan).set({ textOverride: clean }).where(eq(channelPlan.id, post.planId));
  }
  await writeChannelAudit({
    actorProfileId,
    action: "approval_edit",
    entity: "post",
    entityId: String(postId),
    before: { length: (post.html ?? "").length },
    after: { length: clean.length },
  });
  return { ok: true, html: clean };
}

/**
 * Rewrite the confirmation message after an edit, so the operator's chat shows
 * the text that will actually be published (instead of the old one).
 */
export async function refreshApprovalMessage(
  postId: number,
  opts: { chatId: string; messageId: number | null; disablePreview: boolean }
): Promise<boolean> {
  const [post] = await db.select().from(channelPosts).where(eq(channelPosts.id, postId)).limit(1);
  if (!post?.html || !opts.messageId) return false;
  const parts = splitApprovalParts(post.html);
  const body = parts.length ? parts[parts.length - 1] : post.html;
  const { token } = await getChannelBotToken();
  if (!token) return false;
  const result = await tgEditMessage(
    token,
    opts.chatId,
    opts.messageId,
    `${APPROVAL_TEXTS.edited}\n\n${body}`,
    approvalKeyboard(postId)
  );
  return result.ok;
}

/** Plan rows due now (or a whole day, for the admin queue). */
export async function duePlanRows(now = new Date(), limit = 5) {
  const day = tashkentDay(now);
  // Widen the scan so filtering out rows that already produced a post cannot
  // starve a row that is genuinely due.
  const scan = limit * 4;
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
    .limit(scan);
  if (!rows.length) return rows;

  // A plan row that already has a post (sent, waiting for approval, rejected or
  // expired) is done. Without this, every tick re-offers the previews that are
  // still waiting and reports them as "skipped".
  const consumed = await db
    .select({ planId: channelPosts.planId })
    .from(channelPosts)
    .where(
      and(
        inArray(
          channelPosts.planId,
          rows.map((row) => row.id)
        ),
        inArray(channelPosts.status, [...CONSUMED_POST_STATUSES])
      )
    );
  return sendablePlanRows(
    rows,
    consumed.map((row) => row.planId),
    limit
  );
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
