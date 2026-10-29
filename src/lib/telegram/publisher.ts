/**
 * Updates that belong to the **publisher bot** when it is not the DM bot.
 *
 * A deployment may run a separate bot for the channel
 * (`TELEGRAM_CHANNEL_BOT_TOKEN`). Such a bot's preview carries the approval
 * buttons, and Telegram delivers the press to *that* bot — not to the DM bot
 * whose webhook the admin panel registers. Before this file existed the
 * dedicated bot's webhook was never registered at all, so Approve did nothing.
 *
 * The publisher bot has exactly two jobs, so this handler does exactly two
 * things and refuses everything else:
 *   1. an approval button press (`ch:ok|no|ed:<postId>`);
 *   2. the admin's next private message while an edit is parked.
 * Anything else — commands, searches, student flows — is the DM bot's business
 * and stays unanswered here.
 *
 * It never touches `telegram_updates`: update ids are numbered per bot, so
 * claiming them against the DM bot's table could drop an unrelated update of
 * the other bot. Approval is idempotent by post id + status, so a duplicate
 * press simply answers "already closed".
 */
import { tgAnswerCallback, tgSendMessage } from "./api";
import { escapeHtml } from "./core";
import { isApprovalCallback } from "@/lib/channel/approval";
import { handleChannelApprovalCallback, handlePendingChannelEdit } from "./approval";

export interface PublisherUpdate {
  callback_query?: {
    id: string;
    data?: string;
    from?: { id: number; is_bot?: boolean; language_code?: string };
    message?: { message_id?: number; chat?: { id: number; type?: string } };
  };
  message?: {
    text?: string;
    from?: { id: number; is_bot?: boolean };
    chat?: { id: number; type?: string };
  };
}

/**
 * Handle one update for the publisher bot.
 *
 * `token` is that bot's token (the caller resolved it from the webhook secret),
 * so answers and edit replies come from the bot the operator is talking to.
 *
 * Returns what it did, which the webhook route logs — never a secret.
 */
export async function handlePublisherUpdate(
  update: PublisherUpdate,
  token: string
): Promise<{ handled: "approval" | "edit" | "ignored"; toast?: string }> {
  const cq = update.callback_query;
  if (cq) {
    const data = String(cq.data ?? "");
    if (!isApprovalCallback(data)) return { handled: "ignored" };
    const chat = cq.message?.chat;
    const toast = await handleChannelApprovalCallback({
      data,
      chatId: String(chat?.id ?? ""),
      chatType: String(chat?.type ?? ""),
      telegramUserId: cq.from?.id ?? "",
      isBot: cq.from?.is_bot,
    }).catch(() => "send_failed");
    // Always answer, or the button spins forever on the operator's screen.
    await tgAnswerCallback(token, cq.id, toast || undefined).catch(() => undefined);
    return { handled: "approval", toast };
  }

  const msg = update.message;
  if (!msg?.from || msg.from.is_bot) return { handled: "ignored" };
  const chat = msg.chat;
  // Edits only ever happen in the admin's private chat, exactly like the DM bot.
  if (chat?.type !== "private") return { handled: "ignored" };

  const edited = await handlePendingChannelEdit({
    chatId: String(chat.id),
    telegramUserId: msg.from.id,
    text: msg.text ?? "",
  }).catch(() => ({ handled: false, toast: null }));
  if (!edited.handled) return { handled: "ignored" };
  if (edited.toast) await tgSendMessage(token, String(chat.id), escapeHtml(edited.toast)).catch(() => undefined);
  return { handled: "edit", toast: edited.toast ?? undefined };
}
