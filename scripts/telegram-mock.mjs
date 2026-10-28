/**
 * Local Telegram Bot API mock — for developing/testing the bot without
 * internet access or a real bot.
 *
 *   node scripts/telegram-mock.mjs            # listens on 127.0.0.1:8099
 *   TG_MOCK_FORWARD_TO=http://127.0.0.1:3000  # deliver webhook calls to the local dev server
 *   TELEGRAM_API_BASE=http://127.0.0.1:8099   # in .env.local, then restart `next dev`
 *
 * Implements getMe, getWebhookInfo, setWebhook, deleteWebhook, setMyCommands,
 * setChatMenuButton, sendMessage, editMessageText, answerCallbackQuery,
 * sendChatAction, getChat, getChatMember, getChatMemberCount, sendPoll and
 * stopPoll. Any token whose secret part starts with "bad" is rejected with 401
 * (to test error handling).
 *
 * Polls are answered by the mock itself: `POST /_vote { pollId }` records votes
 * and `stopPoll` returns the aggregate — enough to exercise the whole
 * poll → results → preference-weight path offline.
 *
 * Test helpers (not part of the real API):
 *   GET  /_messages?chat_id=…      → messages the bot "sent"
 *   POST /_press { text, userId?, firstName?, username?, languageCode? }
 *        → delivers a user message to the registered webhook, like a real
 *          user typing in the chat (e.g. text "/start login_<token>")
 *   POST /_tap { data, userId?, messageId?, chatType? }
 *        → the user pressed an inline button (callback_query with `data`)
 *   GET  /_answers                 → answerCallbackQuery calls (toasts)
 *   POST /_block { userId }        → user blocked the bot (my_chat_member)
 *   POST /_member { status, canPost? }
 *        → change what getChatMember answers for the bot, so the "the bot is
 *          not an administrator" / "«Post messages» is off" screens can be
 *          exercised without a real channel (real Telegram: `member`/`left`
 *          and `can_post_messages: false`)
 *   POST /_reset                   → clear everything
 */
import http from "node:http";

const PORT = Number(process.env.TG_MOCK_PORT || 8099);
// update_id keeps growing across /_reset, like real Telegram: the server
// de-duplicates update ids, so reusing one would be (correctly) ignored.
let lastUpdateId = Math.floor(Date.now() / 1000) * 100;
const fresh = () => ({
  webhook: null,
  secret: null,
  messages: [],
  answers: [],
  commands: {},
  menuButton: null,
  polls: {},
  updateId: lastUpdateId,
  messageId: 1,
  // What getChatMember says about the bot. Telegram's real statuses:
  // `creator | administrator | member | restricted | left | kicked`.
  member: { status: "administrator", can_post_messages: true },
});
let state = fresh();

const json = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
};

const readBody = (req) =>
  new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });

// The public https webhook URL is often not reachable from the dev machine
// itself; TG_MOCK_FORWARD_TO=http://127.0.0.1:3000 rewrites its origin.
function target(url) {
  const fwd = process.env.TG_MOCK_FORWARD_TO;
  if (!fwd) return url;
  const u = new URL(url);
  return new URL(u.pathname + u.search, fwd).toString();
}

async function deliver(update) {
  if (!state.webhook) return { ok: false, error: "no webhook set" };
  const res = await fetch(target(state.webhook), {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Telegram-Bot-Api-Secret-Token": state.secret || "" },
    body: JSON.stringify(update),
  });
  return { ok: res.ok, status: res.status };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const body = req.method === "POST" ? await readBody(req) : {};

  if (url.pathname === "/_messages") {
    const chat = url.searchParams.get("chat_id");
    return json(res, 200, { messages: chat ? state.messages.filter((m) => String(m.chat_id) === chat) : state.messages });
  }
  if (url.pathname === "/_press") {
    const userId = Number(body.userId || 777000111);
    const update = {
      update_id: ++state.updateId,
      message: {
        message_id: ++state.messageId,
        date: Math.floor(Date.now() / 1000),
        chat: { id: userId, type: "private" },
        from: {
          id: userId,
          is_bot: false,
          first_name: body.firstName || "Test",
          last_name: body.lastName,
          username: body.username || "test_user",
          language_code: body.languageCode || "uz",
        },
        text: body.text || "/start",
      },
    };
    return json(res, 200, await deliver(update));
  }
  if (url.pathname === "/_answers") return json(res, 200, { answers: state.answers, menuButton: state.menuButton, commands: state.commands });
  if (url.pathname === "/_tap") {
    const userId = Number(body.userId || 777000111);
    const chatType = body.chatType || "private";
    const update = {
      update_id: ++state.updateId,
      callback_query: {
        id: `cq${state.updateId}`,
        from: { id: userId, is_bot: false, first_name: body.firstName || "Test", username: body.username || "test_user", language_code: body.languageCode || "uz" },
        data: String(body.data || ""),
        message: { message_id: Number(body.messageId || state.messageId), chat: { id: chatType === "private" ? userId : -100500, type: chatType } },
      },
    };
    return json(res, 200, await deliver(update));
  }
  if (url.pathname === "/_block") {
    const userId = Number(body.userId || 777000111);
    const update = {
      update_id: ++state.updateId,
      my_chat_member: { chat: { id: userId, type: "private" }, from: { id: userId, is_bot: false, first_name: "Test" }, new_chat_member: { status: "kicked" } },
    };
    return json(res, 200, await deliver(update));
  }
  if (url.pathname === "/_vote") {
    // votes: { "optionIndex": count } — enough to produce an aggregate.
    const poll = state.polls[String(body.pollId)];
    if (!poll) return json(res, 404, { ok: false, error: "no such poll" });
    for (const [index, count] of Object.entries(body.votes || {})) {
      const option = poll.options[Number(index)];
      if (option) option.voter_count += Number(count) || 0;
    }
    return json(res, 200, { ok: true, poll });
  }
  if (url.pathname === "/_member") {
    // `body` is already read once, above; reading the stream twice hangs.
    const status = typeof body.status === "string" ? body.status : "administrator";
    state.member = {
      status,
      // Only an administrator of a channel has the right at all; a plain member
      // never does, whatever the flag says.
      can_post_messages: status === "administrator" || status === "creator" ? body.canPost !== false : false,
    };
    return json(res, 200, { ok: true, member: state.member });
  }
  if (url.pathname === "/_reset") {
    lastUpdateId = state.updateId;
    state = fresh();
    return json(res, 200, { ok: true });
  }

  const m = /^\/bot([^/]+)\/(\w+)$/.exec(url.pathname);
  if (!m) return json(res, 404, { ok: false, error_code: 404, description: "Not Found" });
  const [, token, method] = m;
  if (!/^\d+:/.test(token) || token.split(":")[1].startsWith("bad")) {
    return json(res, 401, { ok: false, error_code: 401, description: "Unauthorized" });
  }
  const botId = Number(token.split(":")[0]);

  switch (method) {
    case "getMe":
      return json(res, 200, { ok: true, result: { id: botId, is_bot: true, first_name: "ScholarBridge Test", username: "ScholarBridgeTestBot" } });
    case "getWebhookInfo":
      return json(res, 200, { ok: true, result: { url: state.webhook || "", has_custom_certificate: false, pending_update_count: 0 } });
    case "setWebhook":
      state.webhook = body.url;
      state.secret = body.secret_token || null;
      return json(res, 200, { ok: true, result: true, description: "Webhook was set" });
    case "deleteWebhook":
      state.webhook = null;
      return json(res, 200, { ok: true, result: true });
    case "setMyCommands":
      state.commands[body.language_code || "default"] = body.commands;
      return json(res, 200, { ok: true, result: true });
    case "setChatMenuButton":
      state.menuButton = body.menu_button || null;
      return json(res, 200, { ok: true, result: true });
    case "sendChatAction":
      return json(res, 200, { ok: true, result: true });
    case "answerCallbackQuery":
      state.answers.push({ id: body.callback_query_id, text: body.text || "", at: new Date().toISOString() });
      if (state.answers.length > 200) state.answers.shift();
      return json(res, 200, { ok: true, result: true });
    case "editMessageText": {
      const target = state.messages.find((x) => x.message_id === Number(body.message_id) && String(x.chat_id) === String(body.chat_id));
      if (!target) return json(res, 400, { ok: false, error_code: 400, description: "Bad Request: message to edit not found" });
      Object.assign(target, { text: body.text, reply_markup: body.reply_markup, editedAt: new Date().toISOString() });
      return json(res, 200, { ok: true, result: { message_id: target.message_id } });
    }
    case "getChat": {
      const id = String(body.chat_id);
      const isChannel = id.startsWith("-100") || id.startsWith("@");
      // Telegram always answers with the numeric id, even for an @username.
      const channelId = id.startsWith("@") ? -1009876543210 : Number(id);
      return json(res, 200, {
        ok: true,
        result: isChannel
          ? { id: channelId, type: "channel", title: "ScholarBridge Test Channel", username: "scholarbridge_test" }
          : { id: Number(id) || id, type: "private", first_name: "Test", username: "test_user" },
      });
    }
    case "getChatMember":
      return json(res, 200, {
        ok: true,
        result: { ...state.member, user: { id: botId, is_bot: true, first_name: "ScholarBridge Test" } },
      });
    case "getChatMemberCount":
      return json(res, 200, { ok: true, result: 128 });
    case "sendPoll": {
      const pollId = `poll_${state.messageId}`;
      const poll = {
        id: pollId,
        question: body.question,
        options: (body.options || []).map((text) => ({ text, voter_count: 0 })),
        total_voter_count: 0,
        is_closed: false,
        is_anonymous: body.is_anonymous !== false,
        type: body.type || "regular",
      };
      const msg = {
        message_id: ++state.messageId,
        chat_id: body.chat_id,
        poll,
        at: new Date().toISOString(),
      };
      state.polls[pollId] = poll;
      state.messages.push(msg);
      if (state.messages.length > 500) state.messages.shift();
      return json(res, 200, { ok: true, result: { message_id: msg.message_id, poll } });
    }
    case "stopPoll": {
      const msg = state.messages.find((x) => x.message_id === Number(body.message_id));
      if (!msg || !msg.poll) return json(res, 400, { ok: false, error_code: 400, description: "Bad Request: poll not found" });
      msg.poll.is_closed = true;
      msg.poll.total_voter_count = msg.poll.options.reduce((total, option) => total + option.voter_count, 0);
      return json(res, 200, { ok: true, result: msg.poll });
    }
    case "sendMessage": {
      if (String(body.chat_id) === "403403") {
        return json(res, 403, { ok: false, error_code: 403, description: "Forbidden: bot was blocked by the user" });
      }
      /**
       * The two rejections real Telegram makes that are not about the content,
       * reproduced here so the recovery ladder in send.ts can be exercised
       * offline: a button URL that is not absolute https (localhost included),
       * and markup it cannot parse.
       */
      const badUrl = inlineButtonProblem(body.reply_markup);
      if (badUrl) {
        return json(res, 400, { ok: false, error_code: 400, description: `Bad Request: BUTTON_URL_INVALID (${badUrl})` });
      }
      const badMarkup = markupProblem(body);
      if (badMarkup) {
        return json(res, 400, { ok: false, error_code: 400, description: `Bad Request: can't parse entities: ${badMarkup}` });
      }
      const msg = { message_id: ++state.messageId, chat_id: body.chat_id, text: body.text, reply_markup: body.reply_markup, at: new Date().toISOString() };
      state.messages.push(msg);
      if (state.messages.length > 500) state.messages.shift();
      return json(res, 200, { ok: true, result: { message_id: msg.message_id } });
    }
    default:
      return json(res, 404, { ok: false, error_code: 404, description: `Method ${method} not mocked` });
  }
});

server.listen(PORT, "127.0.0.1", () => console.log(`[telegram-mock] Bot API mock on http://127.0.0.1:${PORT}`));

/** Telegram rejects any inline button URL that is not a public https URL. */
function inlineButtonProblem(replyMarkup) {
  const rows = replyMarkup?.inline_keyboard;
  if (!Array.isArray(rows)) return null;
  for (const row of rows) {
    for (const button of row ?? []) {
      const url = button?.url ?? button?.web_app?.url;
      if (url === undefined) continue;
      let parsed;
      try {
        parsed = new URL(String(url));
      } catch {
        return String(url);
      }
      const host = parsed.hostname.toLowerCase();
      if (parsed.protocol !== "https:") return String(url);
      if (!host.includes(".") || host === "localhost" || host.endsWith(".localhost") || /^(?:127\.|10\.|192\.168\.)/.test(host)) {
        return String(url);
      }
    }
  }
  return null;
}

/** The subset of "can't parse entities" that a template mistake produces. */
function markupProblem(body) {
  if (body.parse_mode !== "HTML") return null;
  const text = String(body.text ?? "");
  const stack = [];
  const re = /<(\/?)(b|i|u|s|a|code|pre|blockquote|tg-spoiler)(\s[^>]*)?>/gi;
  let match;
  while ((match = re.exec(text)) !== null) {
    const closing = match[1] === "/";
    const name = match[2].toLowerCase();
    if (!closing) stack.push(name);
    else if (stack[stack.length - 1] === name) stack.pop();
    else return `Unexpected end tag </${name}> at byte offset ${match.index}`;
  }
  if (stack.length) return `Unclosed start tag at byte offset 0`;
  if (/<(?!\/?[a-z])/i.test(text)) return "Unsupported start tag at byte offset 0";
  return null;
}
