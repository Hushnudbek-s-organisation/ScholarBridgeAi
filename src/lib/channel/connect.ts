/**
 * "Is the channel actually connected?" — the checks behind the admin button.
 *
 * Everything here is read-only: getMe, getChat and getChatMember. No message is
 * sent, no setting is changed. The result is written so the admin panel can show
 * exactly which step is missing, and it never includes the bot token.
 */
import { tgCall } from "@/lib/telegram/api";
import { getBotToken } from "@/lib/telegram/settings";
import type { ChannelRuntime } from "./config";

export interface ConnectionCheck {
  token: {
    set: boolean;
    source: string;
    botId: number | null;
    botUsername: string | null;
    error: string | null;
  };
  channel: {
    configured: boolean;
    reachable: boolean;
    id: number | null;
    title: string | null;
    username: string | null;
    type: string | null;
    botStatus: string | null;
    canPost: boolean;
    error: string | null;
  };
  adminChat: {
    configured: boolean;
    reachable: boolean;
    id: number | null;
    title: string | null;
    error: string | null;
  };
  siteUrl: string;
  ready: boolean;
  /** Human-readable next steps, most important first. */
  hints: string[];
}

interface TgChat {
  id: number;
  title?: string;
  username?: string;
  type?: string;
}
interface TgUser {
  id: number;
  username?: string;
  first_name?: string;
}
interface TgMember {
  status?: string;
  can_post_messages?: boolean;
  can_edit_messages?: boolean;
}

export const BOT_ADMIN_STATUSES = ["creator", "administrator"] as const;

export async function checkChannelConnection(runtime: ChannelRuntime): Promise<ConnectionCheck> {
  const hints: string[] = [];
  const { token, source } = await getBotToken();

  const report: ConnectionCheck = {
    token: { set: Boolean(token), source, botId: null, botUsername: null, error: null },
    channel: {
      configured: Boolean(runtime.channelId),
      reachable: false,
      id: null,
      title: null,
      username: null,
      type: null,
      botStatus: null,
      canPost: false,
      error: null,
    },
    adminChat: { configured: Boolean(runtime.adminChatId), reachable: false, id: null, title: null, error: null },
    siteUrl: runtime.siteUrl,
    ready: false,
    hints,
  };

  if (!token) {
    hints.push("Add the bot token in Admin → Telegram (or set TELEGRAM_BOT_TOKEN).");
    return report;
  }

  const me = await tgCall<TgUser>(token, "getMe", {}, 8000);
  if (!me.ok || !me.result) {
    report.token.error = me.description ?? "getMe failed";
    hints.push("The bot token is not valid — check it in Admin → Telegram.");
    return report;
  }
  report.token.botId = me.result.id;
  report.token.botUsername = me.result.username ?? null;

  if (!runtime.channelId) {
    hints.push("Enter the channel: its @username (public channel) or -100… id (private channel).");
  } else {
    const chat = await tgCall<TgChat>(token, "getChat", { chat_id: runtime.channelId }, 8000);
    if (!chat.ok || !chat.result) {
      report.channel.error = chat.description ?? "getChat failed";
      hints.push("The bot cannot see that channel yet: add it as an administrator of the channel.");
    } else {
      report.channel.reachable = true;
      report.channel.id = chat.result.id;
      report.channel.title = chat.result.title ?? null;
      report.channel.username = chat.result.username ?? null;
      report.channel.type = chat.result.type ?? null;

      const member = await tgCall<TgMember>(
        token,
        "getChatMember",
        { chat_id: runtime.channelId, user_id: me.result.id },
        8000
      );
      report.channel.botStatus = member.result?.status ?? null;
      const isAdmin = Boolean(report.channel.botStatus && BOT_ADMIN_STATUSES.includes(report.channel.botStatus as "creator" | "administrator"));
      report.channel.canPost = isAdmin && member.result?.can_post_messages !== false;
      if (!isAdmin) hints.push("Promote the bot to channel administrator with the “Post messages” permission.");
      else if (!report.channel.canPost) hints.push("Turn on the “Post messages” permission for the bot in the channel.");
    }
  }

  if (!runtime.adminChatId) {
    hints.push("Set the admin chat id: the numeric id of the private chat that receives dry-run posts.");
  } else {
    const admin = await tgCall<TgChat>(token, "getChat", { chat_id: runtime.adminChatId }, 8000);
    if (!admin.ok || !admin.result) {
      report.adminChat.error = admin.description ?? "getChat failed";
      hints.push("The admin chat is unreachable: open the bot in that chat and press /start once.");
    } else {
      report.adminChat.reachable = true;
      report.adminChat.id = admin.result.id;
      report.adminChat.title = admin.result.title ?? me.result.first_name ?? null;
    }
  }

  if (!runtime.siteUrl) hints.push("Set the site URL — post links are built from it.");
  if (runtime.envKillSwitch) hints.push("CHANNEL_AUTOPOST is off in the environment: posting stays disabled until it changes.");

  report.ready =
    Boolean(token) &&
    report.channel.reachable &&
    report.channel.canPost &&
    report.adminChat.reachable &&
    Boolean(runtime.siteUrl);

  return report;
}
