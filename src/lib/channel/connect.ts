/**
 * "Is the channel actually connected?" — the checks behind the admin button.
 *
 * Three steps, in the order an operator has to fix them, and each one reports
 * a **stable code** instead of an English sentence:
 *
 *   1. `getMe`         — is the bot token real? who is the bot?
 *   2. `getChat`       — does the (normalised) channel id resolve? what is it?
 *   3. `getChatMember` — is the bot an administrator with "Post messages"?
 *
 * Why codes: this panel is trilingual (uz/ru/en) and Telegram picks the
 * operator's language, so a hardcoded English hint is either untranslatable or
 * duplicated three times. The code plus the facts it needs (`botUsername`,
 * `channelTitle`) is translated by the UI, and the same code is what the API
 * returns, so "why did it fail" has exactly one answer everywhere.
 *
 * Everything here is read-only: no message is sent, no setting is changed —
 * except in `saveResolvedChannel`, which the explicit "Verify" action calls to
 * store the id Telegram resolved (a `@username` can be renamed; the numeric id
 * cannot).
 */
import { tgCall } from "@/lib/telegram/api";
import { describeChannelTokenSource, getChannelBotToken, type ChannelTokenSource } from "./token";
import { normalizeChannelIdentifier, type ChannelRuntime } from "./config";

/** Every way the connection can be (not) ready. */
export type ConnectionCode =
  | "ok"
  | "token_missing"
  | "token_invalid"
  | "channel_missing"
  | "channel_invalid"
  | "channel_not_found"
  | "channel_wrong_type"
  | "bot_not_admin"
  | "no_post_permission"
  | "admin_chat_missing"
  | "admin_chat_unreachable"
  | "site_missing"
  | "site_not_public";

export type ConnectionStepId = "token" | "channel" | "permission" | "adminChat" | "site";

export interface ConnectionStep {
  id: ConnectionStepId;
  ok: boolean;
  code: ConnectionCode;
  /** Facts the translated message needs. Never a token, never a secret. */
  params?: Record<string, string | number>;
}

export interface ConnectionCheck {
  token: {
    set: boolean;
    /** Where it came from: the channel-only bot, Admin → Telegram, or the env. */
    source: ChannelTokenSource;
    /** Human line for the panel. Never contains the token itself. */
    sourceLabel: string;
    /** True when the publisher uses a different bot than the DM bot. */
    dedicated: boolean;
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
  /** Ordered, translatable verdicts — one per step, always five entries. */
  steps: ConnectionStep[];
  /** English fallback lines (logs, non-UI callers). The UI uses `steps`. */
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

/**
 * A site URL the *channel* can use.
 *
 * `http://localhost:3000` "works" in a browser tab and fails in Telegram twice:
 * the sanitizer drops every link built from it (https-only anchors), and an
 * inline button pointing at it is rejected outright. Saying so here is cheaper
 * than debugging an empty post.
 */
export function isPublicSiteUrl(raw: string | null | undefined): boolean {
  const value = (raw ?? "").trim();
  if (!value) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  const host = url.hostname.toLowerCase();
  if (!host.includes(".")) return false;
  if (host === "localhost" || host.endsWith(".localhost")) return false;
  if (/^(?:0\.0\.0\.0|127\.)/.test(host) || host === "::1" || host === "[::1]") return false;
  return true;
}

export async function checkChannelConnection(runtime: ChannelRuntime): Promise<ConnectionCheck> {
  const hints: string[] = [];
  const steps: ConnectionStep[] = [];
  const { token, source, dedicated } = await getChannelBotToken();

  const report: ConnectionCheck = {
    token: {
      set: Boolean(token),
      source,
      sourceLabel: describeChannelTokenSource(source),
      dedicated,
      botId: null,
      botUsername: null,
      error: null,
    },
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
    steps,
    hints,
  };

  const finish = () => {
    // Always five steps, in a stable order, so the panel can render them blind.
    const byId = new Map(steps.map((step) => [step.id, step]));
    const ordered: ConnectionStep[] = [
      byId.get("token") ?? { id: "token", ok: false, code: "token_missing" },
      byId.get("channel") ?? { id: "channel", ok: false, code: "channel_missing" },
      byId.get("permission") ?? { id: "permission", ok: false, code: "bot_not_admin" },
      byId.get("adminChat") ?? { id: "adminChat", ok: false, code: "admin_chat_missing" },
      byId.get("site") ?? { id: "site", ok: false, code: "site_missing" },
    ];
    report.steps = ordered;
    report.ready = ordered.every((step) => step.ok);
    return report;
  };

  /* ---------------------------------------------------------------------- */
  /* Step 1 — the token                                                     */
  /* ---------------------------------------------------------------------- */
  if (!token) {
    steps.push({ id: "token", ok: false, code: "token_missing" });
    hints.push("No bot token: add one in Admin → Telegram, or set TELEGRAM_BOT_TOKEN / TELEGRAM_CHANNEL_BOT_TOKEN.");
    return finish();
  }

  const me = await tgCall<TgUser>(token, "getMe", {}, 8000);
  if (!me.ok || !me.result) {
    report.token.error = me.description ?? "getMe failed";
    steps.push({ id: "token", ok: false, code: "token_invalid", params: { detail: report.token.error } });
    hints.push(`The bot token was rejected by Telegram (${report.token.error}). Check it in Admin → Telegram.`);
    return finish();
  }
  report.token.botId = me.result.id;
  report.token.botUsername = me.result.username ?? null;
  steps.push({
    id: "token",
    ok: true,
    code: "ok",
    params: me.result.username ? { botUsername: `@${me.result.username}` } : { botUsername: `#${me.result.id}` },
  });

  /* ---------------------------------------------------------------------- */
  /* Step 2 & 3 — the channel and the bot's rights in it                     */
  /* ---------------------------------------------------------------------- */
  const normalized = normalizeChannelIdentifier(runtime.channelId);
  if (!runtime.channelId) {
    steps.push({ id: "channel", ok: false, code: "channel_missing" });
    steps.push({ id: "permission", ok: false, code: "channel_missing" });
    hints.push("Enter the channel: its @username (public channel) or -100… id (private channel).");
  } else if (!normalized.ok) {
    // The invite-link case lands here when an old settings row still holds one.
    steps.push({ id: "channel", ok: false, code: "channel_invalid", params: { reason: normalized.reason } });
    steps.push({ id: "permission", ok: false, code: "channel_invalid" });
    hints.push(normalized.hint);
  } else {
    const chat = await tgCall<TgChat>(token, "getChat", { chat_id: normalized.value }, 8000);
    if (!chat.ok || !chat.result) {
      report.channel.error = chat.description ?? "getChat failed";
      steps.push({ id: "channel", ok: false, code: "channel_not_found", params: { detail: report.channel.error } });
      steps.push({ id: "permission", ok: false, code: "channel_not_found" });
      hints.push(
        "The bot cannot see that channel: check the @username and add the bot to the channel as an administrator."
      );
    } else if (chat.result.type && chat.result.type !== "channel" && chat.result.type !== "supergroup") {
      // A group or a private chat is not a channel: posting "works" but reaches
      // the wrong audience, so it is refused instead of silently accepted.
      report.channel.type = chat.result.type;
      steps.push({ id: "channel", ok: false, code: "channel_wrong_type", params: { type: chat.result.type } });
      steps.push({ id: "permission", ok: false, code: "channel_wrong_type" });
      hints.push(`That id is a ${chat.result.type}, not a channel.`);
    } else {
      report.channel.reachable = true;
      report.channel.id = chat.result.id;
      report.channel.title = chat.result.title ?? null;
      report.channel.username = chat.result.username ?? null;
      report.channel.type = chat.result.type ?? null;
      steps.push({
        id: "channel",
        ok: true,
        code: "ok",
        params: {
          channelId: String(chat.result.id),
          ...(chat.result.title ? { channelTitle: chat.result.title } : {}),
          ...(chat.result.username ? { channelUsername: `@${chat.result.username}` } : {}),
        },
      });

      const member = await tgCall<TgMember>(
        token,
        "getChatMember",
        { chat_id: chat.result.id, user_id: me.result.id },
        8000
      );
      report.channel.botStatus = member.result?.status ?? null;
      const isAdmin = Boolean(
        report.channel.botStatus && (BOT_ADMIN_STATUSES as readonly string[]).includes(report.channel.botStatus)
      );
      report.channel.canPost = isAdmin && member.result?.can_post_messages !== false;
      const botName = me.result.username ? `@${me.result.username}` : `#${me.result.id}`;
      if (!isAdmin) {
        steps.push({
          id: "permission",
          ok: false,
          code: "bot_not_admin",
          params: { botUsername: botName, ...(chat.result.title ? { channelTitle: chat.result.title } : {}) },
        });
        hints.push(`Promote ${botName} to channel administrator with the “Post messages” permission.`);
      } else if (!report.channel.canPost) {
        steps.push({ id: "permission", ok: false, code: "no_post_permission", params: { botUsername: botName } });
        hints.push(`Turn on “Post messages” for ${botName} in the channel's administrator rights.`);
      } else {
        steps.push({ id: "permission", ok: true, code: "ok", params: { botUsername: botName } });
      }
    }
  }

  /* ---------------------------------------------------------------------- */
  /* The admin chat: not required to post, required for approval mode        */
  /* ---------------------------------------------------------------------- */
  if (!runtime.adminChatId) {
    steps.push({ id: "adminChat", ok: false, code: "admin_chat_missing" });
    hints.push("Set the admin chat id: the numeric id of the private chat that receives previews and alerts.");
  } else {
    const admin = await tgCall<TgChat>(token, "getChat", { chat_id: runtime.adminChatId }, 8000);
    if (!admin.ok || !admin.result) {
      report.adminChat.error = admin.description ?? "getChat failed";
      steps.push({ id: "adminChat", ok: false, code: "admin_chat_unreachable", params: { detail: report.adminChat.error } });
      hints.push("The admin chat is unreachable: open the bot in that chat and press /start once.");
    } else {
      report.adminChat.reachable = true;
      report.adminChat.id = admin.result.id;
      report.adminChat.title = admin.result.title ?? me.result.first_name ?? null;
      steps.push({
        id: "adminChat",
        ok: true,
        code: "ok",
        params: report.adminChat.title ? { chatTitle: report.adminChat.title } : {},
      });
    }
  }

  /* ---------------------------------------------------------------------- */
  /* The site URL the posts are built on                                     */
  /* ---------------------------------------------------------------------- */
  if (!runtime.siteUrl) {
    steps.push({ id: "site", ok: false, code: "site_missing" });
    hints.push("Set the site URL — post links are built from it.");
  } else if (!isPublicSiteUrl(runtime.siteUrl)) {
    steps.push({ id: "site", ok: false, code: "site_not_public", params: { siteUrl: runtime.siteUrl } });
    hints.push("The site URL is local or private: Telegram drops links to it. Use the public https origin.");
  } else {
    steps.push({ id: "site", ok: true, code: "ok", params: { siteUrl: runtime.siteUrl } });
  }

  if (runtime.envKillSwitch)
    hints.push(
      "CHANNEL_AUTOPOST=off is set in this deployment's environment and overrides the panel. Remove it (or set CHANNEL_AUTOPOST=on, or dryrun for tests) in the host's environment variables and redeploy."
    );

  return finish();
}

/**
 * Store the id Telegram resolved, so a later rename of the @username cannot
 * break posting.
 *
 * Called only from the explicit "Verify" action: a read-only GET must never
 * write, and converting a friendly `@name` into `-100…` behind the operator's
 * back would make the panel fields change on their own.
 */
export async function saveResolvedChannel(
  id: number | string | null,
  actorProfileId: number
): Promise<{ ok: boolean; channelId: string | null }> {
  // Only a numeric id is worth pinning: an @username can be renamed and a
  // malformed id is worse than the friendly one the operator typed.
  const numeric = String(id ?? "").trim();
  if (!/^-?\d{5,20}$/.test(numeric)) return { ok: false, channelId: null };
  const value = numeric;
  const { loadChannelSettings, saveChannelSettingsBlock } = await import("./repo");
  const settings = await loadChannelSettings();
  if (settings.connection.channelId === value) return { ok: true, channelId: value };
  await saveChannelSettingsBlock(
    "connection",
    { ...settings.connection, channelId: value },
    actorProfileId
  );
  return { ok: true, channelId: value };
}
