/**
 * Telegram side of the channel approval step.
 *
 * `@/lib/channel/send.ts` knows how to publish; this file only decides *who*
 * may press the buttons. Two rules, both enforced here and nowhere else:
 *
 *   1. the press must come from a **private** chat (a group can see nothing and
 *      decide nothing), and
 *   2. the Telegram account must be linked to a profile with `is_admin`.
 *
 * The bot's own `runCallback` whitelist is deliberately untouched: it scopes
 * every button to a *linked student's* session, while an approval button is an
 * operator action that must work even for an admin who never opened the app's
 * menu. Keeping it in a separate dispatcher also means a malformed `ch:` value
 * can never fall through into a student command.
 */
import {
  APPROVAL_TEXTS,
  isApprovalCallback,
  parseApprovalCallback,
  APPROVAL_STATUS,
  approvalKeyboard,
} from "@/lib/channel/approval";
import { editingPostFor, resolveChannelApprover } from "@/lib/channel/approvalStore";
import { ensureChannelTables } from "@/lib/channel/db";
import { db } from "@/db";
import { channelPosts } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import {
  applyApprovalEdit,
  approveApproval,
  refreshApprovalMessage,
  rejectApproval,
} from "@/lib/channel/send";
import { linkPreviewFor } from "@/lib/channel/settings";
import { loadChannelSettings } from "@/lib/channel/repo";

export { isApprovalCallback };

export interface ApprovalCallbackInput {
  /** Raw `callback_data` (`ch:ok:12`). */
  data: string;
  /** Chat the button lives in. */
  chatId: string;
  /** Telegram chat type — only `private` is accepted. */
  chatType: string;
  /** Telegram user who pressed it. */
  telegramUserId: number | string;
  isBot?: boolean;
}

/**
 * Handle one approval button press.
 * Returns the toast text `answerCallbackQuery` shows (empty = silent success).
 */
export async function handleChannelApprovalCallback(input: ApprovalCallbackInput): Promise<string> {
  if (input.chatType !== "private" || input.isBot) return APPROVAL_TEXTS.privateOnly;
  const parsed = parseApprovalCallback(input.data);
  if (!parsed) return APPROVAL_TEXTS.unknownPost;

  if (!(await ensureChannelTables().catch(() => false))) return APPROVAL_TEXTS.sendFailed;

  const approver = await resolveChannelApprover(input.telegramUserId).catch(() => null);
  if (!approver || !approver.isAdmin) return APPROVAL_TEXTS.notAdmin;

  if (parsed.action === "approve") {
    const outcome = await approveApproval(parsed.postId, approver.profileId);
    if (outcome.ok) return APPROVAL_TEXTS.approved;
    if (outcome.status === "skipped") return outcome.reason ?? APPROVAL_TEXTS.rejectedAlready;
    return APPROVAL_TEXTS.sendFailed;
  }

  if (parsed.action === "reject") {
    const result = await rejectApproval(parsed.postId, approver.profileId, "Rejected in Telegram");
    return result.ok ? APPROVAL_TEXTS.rejected : APPROVAL_TEXTS.rejectedAlready;
  }

  // ---- edit: park the post and ask for the new text ----------------------
  const claimed = await db
    .update(channelPosts)
    .set({ status: APPROVAL_STATUS.editing, chatId: input.chatId, updatedAt: new Date() })
    .where(and(eq(channelPosts.id, parsed.postId), inArray(channelPosts.status, [APPROVAL_STATUS.awaiting, APPROVAL_STATUS.editing])))
    .returning({ id: channelPosts.id });
  if (!claimed.length) return APPROVAL_TEXTS.rejectedAlready;

  const settings = await loadChannelSettings().catch(() => null);
  const [row] = await db
    .select({ messageId: channelPosts.messageId })
    .from(channelPosts)
    .where(eq(channelPosts.id, parsed.postId))
    .limit(1);
  await refreshApprovalMessage(parsed.postId, {
    chatId: input.chatId,
    messageId: row?.messageId ?? null,
    disablePreview: settings ? !linkPreviewFor(settings, "scholarship_single") : true,
  }).catch(() => false);

  return APPROVAL_TEXTS.editing;
}

export interface PendingEditInput {
  chatId: string;
  telegramUserId: number | string;
  text: string;
}

/**
 * If this chat is in the middle of an edit, treat the message as the new body.
 *
 * Returns `{ handled: false }` when the chat has no edit in progress, so the
 * caller can continue with the ordinary command/search routing.
 */
export async function handlePendingChannelEdit(
  input: PendingEditInput
): Promise<{ handled: boolean; toast: string | null }> {
  const text = (input.text ?? "").trim();
  if (!text) return { handled: false, toast: null };

  // `/bekor` is the escape hatch; every other command belongs to the bot.
  const isCancel = /^\/bekor(?:@\w+)?$/i.test(text);
  if (!isCancel && text.startsWith("/")) return { handled: false, toast: null };

  if (!(await ensureChannelTables().catch(() => false))) return { handled: false, toast: null };
  const pending = await editingPostFor(input.chatId).catch(() => null);
  if (!pending) return { handled: false, toast: null };

  const approver = await resolveChannelApprover(input.telegramUserId).catch(() => null);
  if (!approver || !approver.isAdmin) return { handled: true, toast: APPROVAL_TEXTS.notAdmin };

  if (isCancel) {
    await db
      .update(channelPosts)
      .set({ status: APPROVAL_STATUS.awaiting, updatedAt: new Date() })
      .where(eq(channelPosts.id, pending.postId));
    return { handled: true, toast: APPROVAL_TEXTS.editCancelled };
  }

  const result = await applyApprovalEdit(pending.postId, text, approver.profileId);
  if (!result.ok) {
    if (result.error === "too_long") return { handled: true, toast: APPROVAL_TEXTS.editTooLong(result.max) };
    if (result.error === "empty") return { handled: true, toast: APPROVAL_TEXTS.editEmpty };
    return { handled: true, toast: APPROVAL_TEXTS.rejectedAlready };
  }

  const settings = await loadChannelSettings().catch(() => null);
  await refreshApprovalMessage(pending.postId, {
    chatId: input.chatId,
    messageId: pending.messageId,
    disablePreview: settings ? !linkPreviewFor(settings, "scholarship_single") : true,
  }).catch(() => false);

  return { handled: true, toast: APPROVAL_TEXTS.editSaved };
}

/** Buttons for a freshly rendered preview (kept here so callers share one shape). */
export function approvalButtons(postId: number) {
  return approvalKeyboard(postId);
}
