/**
 * Channel discovery — the database-and-Telegram half of
 * `@/lib/channel/discovery.ts`.
 *
 * Called once per update, before any student routing, because a forwarded post
 * arrives as an ordinary private `message`: without this the bot would answer a
 * forwarded channel post with "here are my commands".
 *
 * What happens for a candidate:
 *   1. nobody but an admin may connect a channel — the sender must be a linked
 *      profile with `is_admin` (a stranger forwarding a post gets silence, not a
 *      confirmation of what the bot can see);
 *   2. if no channel is configured, it is **adopted** — and switched to
 *      `approval` mode when there is an admin chat to preview in, so the very
 *      first post waits for a human instead of surprising a public channel;
 *   3. otherwise the candidate is stored as `connection.discoveredChannel`, so
 *      the panel can offer one click ("ulash") without hunting for a `-100…` id;
 *   4. the reply goes to the operator's private chat (or the configured admin
 *      chat), never into the channel.
 *
 * Discovery never sends anything to the channel itself.
 */
import { tgSendMessage } from "./api";
import { getBotToken } from "./settings";
import { resolveChannelApprover } from "@/lib/channel/approvalStore";
import { ensureChannelTables } from "@/lib/channel/db";
import { loadChannelSettings, saveChannelSettingsBlock } from "@/lib/channel/repo";
import {
  channelCandidateFromUpdate,
  discoveryMessage,
  isNewDiscovery,
  type ChannelCandidate,
  type DiscoveryUpdate,
} from "@/lib/channel/discovery";

export interface DiscoveryOutcome {
  /** True when this update was about a channel and has been dealt with. */
  handled: boolean;
  candidate: ChannelCandidate | null;
  adopted: boolean;
  /** Chat the confirmation was sent to (null when it was not sent). */
  notifiedChatId: string | null;
}

const IGNORED: DiscoveryOutcome = { handled: false, candidate: null, adopted: false, notifiedChatId: null };

/**
 * Handle one update if it is about a channel.
 *
 * Returns `handled: false` for everything else, so the normal bot routing is
 * untouched. Failures are swallowed into `handled: true` on purpose: a broken
 * database must not turn a forwarded post into a student command either.
 */
export async function handleChannelDiscovery(update: DiscoveryUpdate, actorProfileId?: number | null): Promise<DiscoveryOutcome> {
  const candidate = channelCandidateFromUpdate(update);
  if (!candidate) return IGNORED;

  try {
    if (!(await ensureChannelTables())) return { handled: true, candidate, adopted: false, notifiedChatId: null };

    // Who is asking? A channel's `my_chat_member` carries the admin who added
    // the bot; a forward carries the sender; a `channel_post` carries nobody.
    const rawSender =
      update.my_chat_member?.chat?.type === "channel"
        ? (update as unknown as { my_chat_member?: { from?: { id?: number } } }).my_chat_member?.from?.id
        : update.message?.from?.id;
    const senderId = typeof rawSender === "number" ? rawSender : Number(rawSender) || undefined;
    let actor: number | null = actorProfileId ?? null;
    if (actor === null && typeof senderId === "number") {
      const approver = await resolveChannelApprover(senderId).catch(() => null);
      // Silence for non-admins: a forwarded post must not tell a stranger what
      // the bot can reach.
      if (!approver?.isAdmin) return { handled: true, candidate, adopted: false, notifiedChatId: null };
      actor = approver.profileId;
    }
    // A `channel_post` has no sender at all: it only reaches us because an admin
    // promoted the bot, and it only ever produces a stored candidate.
    const byAdmin = actor !== null || candidate.source === "channel_post";

    const settings = await loadChannelSettings();
    const current = settings.connection;
    if (!isNewDiscovery(candidate, { channelId: current.channelId, discoveredId: current.discoveredChannel?.id })) {
      // Already configured (or already reported): nothing to say, nothing to do.
      if (current.channelId === candidate.id) return { handled: true, candidate, adopted: false, notifiedChatId: null };
      return { handled: true, candidate, adopted: false, notifiedChatId: null };
    }
    if (!byAdmin) return { handled: true, candidate, adopted: false, notifiedChatId: null };

    const hasAdminChat = /^-?\d{5,20}$/.test(current.adminChatId.trim());
    // Adopt only when nothing is configured yet: an operator who already wired a
    // channel must not have it swapped by a stray forward.
    const adopt = !current.channelId;
    const nextMode = adopt ? (current.mode === "off" ? (hasAdminChat ? "approval" : "off") : current.mode) : current.mode;

    await saveChannelSettingsBlock(
      "connection",
      {
        ...current,
        channelId: adopt ? candidate.id : current.channelId,
        mode: nextMode,
        discoveredChannel: {
          id: candidate.id,
          title: candidate.title,
          username: candidate.username,
          at: new Date().toISOString(),
        },
      },
      actor
    );

    // Where the confirmation goes: the operator's private chat when we know the
    // sender, otherwise the configured admin chat. Never the channel.
    const target =
      typeof senderId === "number" && candidate.source !== "channel_post"
        ? String(senderId)
        : current.adminChatId.trim() || null;

    let notifiedChatId: string | null = null;
    if (target) {
      const { token } = await getBotToken();
      if (token) {
        const text = discoveryMessage({
          candidate,
          connected: adopt,
          mode: adopt ? nextMode : null,
          hasAdminChat,
        });
        const sent = await tgSendMessage(token, target, text).catch(() => null);
        if (sent?.ok) notifiedChatId = target;
      }
    }

    return { handled: true, candidate, adopted: adopt, notifiedChatId };
  } catch (error) {
    console.warn("[channel] discovery failed:", error instanceof Error ? error.message : error);
    return { handled: true, candidate, adopted: false, notifiedChatId: null };
  }
}
