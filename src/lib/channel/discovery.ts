/**
 * Telegram tells us which channel the bot was put in — we just have to listen.
 *
 * The hard part of connecting a channel has always been Step 3: "enter the
 * channel's id". Telegram does not show a channel's `-100…` id anywhere in the
 * UI, so operators typed the `@username` (fine), pasted an invite link (which
 * cannot work), or gave up. Three updates carry the answer for free:
 *
 *   `my_chat_member`  — the bot was added to / promoted in a channel;
 *   `channel_post`    — a post appeared in a channel the bot administers;
 *   `message.forward_from_chat` — an admin forwards one channel post to the bot.
 *
 * This module is the **pure** half: it turns an update into a candidate and
 * writes what the operator needs to read. `@/lib/telegram/channelDiscovery.ts`
 * is the half that checks who is asking, stores the candidate and replies.
 *
 * Rules that matter:
 *  - only `chat.type === "channel"` counts (`supergroup` is a group, not a
 *    channel, and posting to it and to a channel are different things);
 *  - the candidate is always the **numeric** id: a username can be renamed;
 *  - nothing is ever posted into the channel by this module — the reply goes to
 *    the operator in a private chat.
 */
import { escapeHtml } from "@/lib/telegram/core";

/** Where the candidate came from. Used to pick the wording of the reply. */
export type DiscoverySource = "my_chat_member" | "channel_post" | "forward";

export interface ChannelCandidate {
  id: string;
  title: string | null;
  username: string | null;
  source: DiscoverySource;
  /** True when the bot is an administrator (only then can it post). */
  botIsAdmin: boolean;
}

interface TgChatLike {
  id?: number | string;
  type?: string;
  title?: string;
  username?: string;
}

/** The subset of a Telegram update this module reads (all fields optional). */
export interface DiscoveryUpdate {
  my_chat_member?: {
    chat?: TgChatLike;
    new_chat_member?: { status?: string; user?: { is_bot?: boolean } };
  };
  channel_post?: { chat?: TgChatLike };
  message?: {
    chat?: TgChatLike;
    from?: { id?: number | string; is_bot?: boolean };
    /** Older Bot API field. */
    forward_from_chat?: TgChatLike;
    /** Bot API 7+ replacement. */
    forward_origin?: { type?: string; chat?: TgChatLike };
  };
}

const ADMIN_STATUSES = ["administrator", "creator"];

/** `-100…` only: a friendly @username is not what we store as a candidate. */
function numericId(chat: TgChatLike | undefined): string | null {
  const id = chat?.id;
  if (typeof id === "number" && Number.isFinite(id) && id < 0) return String(id);
  if (typeof id === "string" && /^-\d{5,20}$/.test(id.trim())) return id.trim();
  return null;
}

function candidateOf(chat: TgChatLike | undefined, source: DiscoverySource): ChannelCandidate | null {
  if (!chat || chat.type !== "channel") return null;
  const id = numericId(chat);
  if (!id) return null;
  const title = typeof chat.title === "string" ? chat.title.trim().slice(0, 120) : "";
  const username = typeof chat.username === "string" ? chat.username.trim().replace(/^@/, "").slice(0, 32) : "";
  return {
    id,
    title: title || null,
    username: username || null,
    source,
    // `my_chat_member` is only sent when the *bot's* membership changes, so the
    // status tells us whether it ended up as an administrator. A `channel_post`
    // proves it: only administrators can post. A forward proves nothing.
    botIsAdmin: source !== "forward",
  };
}

/**
 * The channel this update is about, or null.
 *
 * Order matters: a forwarded post arrives as `message`, so the forward branch
 * must be read before the generic "this is a private message" handling in
 * `service.ts` treats it as a student command.
 */
export function channelCandidateFromUpdate(update: DiscoveryUpdate | null | undefined): ChannelCandidate | null {
  if (!update) return null;

  const member = update.my_chat_member;
  if (member?.chat) {
    const status = (member.new_chat_member?.status ?? "").toLowerCase();
    if (!ADMIN_STATUSES.includes(status)) return null;
    return candidateOf(member.chat, "my_chat_member");
  }

  if (update.channel_post?.chat) return candidateOf(update.channel_post.chat, "channel_post");

  const message = update.message;
  if (message && message.chat?.type === "private" && !message.from?.is_bot) {
    const forwarded =
      message.forward_from_chat ??
      (message.forward_origin?.type === "channel" ? message.forward_origin.chat : undefined);
    if (forwarded) return candidateOf(forwarded, "forward");
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* What the operator reads                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The bot's own words, in Uzbek — the channel's language, like the approval
 * texts. No AI, no claims: this is an instruction, not content.
 */
export const DISCOVERY_TEXTS = {
  title: "✅ <b>Kanal aniqlandi</b>",
  connected: "Kanal ulandi va saqlandi. Admin panelda hech narsa kiritish shart emas.",
  candidate: "Kanaldan bitta post forward qildingiz — shu kanal aniqlandi.",
  modeApproval: "Rejim: <b>Tasdiqlash bilan</b> — har bir post avval shu chatga keladi, tasdiqlaganingizdan keyin kanalga chiqadi.",
  noAdminChat:
    "Avval admin chat ID sini kiriting — tasdiqlash uchun postlar shu chatga keladi. Admin → Kanal → Ulash.",
  nextInPanel: "Admin paneldan bir tugma bilan ulashingiz mumkin: Admin → Kanal → Ulash → «Aniqlangan kanal».",
  botNotAdmin: "Diqqat: bot bu kanalda post yozish huquqiga ega emas. Kanal → Administratorlar bo'limida «Post messages» ruxsatini bering.",
  alreadyConnected: "Bu kanal allaqachon ulangan — hech narsa qilish kerak emas.",
} as const;

export interface DiscoveryMessageInput {
  candidate: ChannelCandidate;
  /** Adopted as the configured channel? */
  connected: boolean;
  /** Mode after adopting (null when nothing was adopted). */
  mode: string | null;
  /** False when there is no admin chat, so approval mode would have nowhere to send. */
  hasAdminChat: boolean;
}

/**
 * The reply.
 *
 * It always contains the two things the operator cannot get from Telegram
 * itself: the numeric id, and what to do next.
 */
export function discoveryMessage(input: DiscoveryMessageInput): string {
  const { candidate } = input;
  const lines = [
    DISCOVERY_TEXTS.title,
    `${candidate.title ? `<b>${escapeHtml(candidate.title)}</b>` : "Kanal"}${
      candidate.username ? ` · @${escapeHtml(candidate.username)}` : ""
    }`,
    `ID: <code>${candidate.id}</code>`,
  ];

  if (candidate.source === "forward") lines.push(DISCOVERY_TEXTS.candidate);

  if (input.connected) {
    lines.push(DISCOVERY_TEXTS.connected);
    // The mode is the part the operator cannot see from Telegram, so say it —
    // and when there is no admin chat, say why nothing will be posted yet
    // (approval needs a chat to preview in, so the mode stayed off).
    if (!input.hasAdminChat) lines.push(DISCOVERY_TEXTS.noAdminChat);
    else if (input.mode === "approval") lines.push(DISCOVERY_TEXTS.modeApproval);
    else lines.push(DISCOVERY_TEXTS.nextInPanel);
  } else {
    lines.push(DISCOVERY_TEXTS.nextInPanel);
  }

  if (!candidate.botIsAdmin) lines.push(DISCOVERY_TEXTS.botNotAdmin);
  return lines.join("\n\n");
}

/**
 * Is this candidate news?
 *
 * The bot receives a `channel_post` for *every* post in a channel it manages,
 * so replying each time would be spam. Only a channel we are not configured for
 * and have not already reported is worth a message.
 */
export function isNewDiscovery(
  candidate: ChannelCandidate,
  state: { channelId: string | null | undefined; discoveredId: string | null | undefined }
): boolean {
  const configured = String(state.channelId ?? "").trim();
  if (configured === candidate.id) return false;
  return String(state.discoveredId ?? "").trim() !== candidate.id;
}
