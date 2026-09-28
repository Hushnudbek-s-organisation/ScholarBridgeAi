/**
 * Local Telegram Bot API mock — for developing/testing the bot without
 * internet access or a real bot.
 *
 *   node scripts/telegram-mock.mjs            # listens on 127.0.0.1:8099
 *   TG_MOCK_FORWARD_TO=http://127.0.0.1:3000  # deliver webhook calls to the local dev server
 *   TELEGRAM_API_BASE=http://127.0.0.1:8099   # in .env.local, then restart `next dev`
 *
 * Implements getMe, getWebhookInfo, setWebhook, deleteWebhook, setMyCommands,
 * setChatMenuButton, sendMessage, editMessageText, answerCallbackQuery and
 * sendChatAction. Any token whose secret part starts with "bad" is rejected
 * with 401 (to test error handling).
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
 *   POST /_reset                   → clear everything
 */
import http from "node:http";

const PORT = Number(process.env.TG_MOCK_PORT || 8099);
// update_id keeps growing across /_reset, like real Telegram: the server
// de-duplicates update ids, so reusing one would be (correctly) ignored.
let lastUpdateId = Math.floor(Date.now() / 1000) * 100;
const fresh = () => ({ webhook: null, secret: null, messages: [], answers: [], commands: {}, menuButton: null, updateId: lastUpdateId, messageId: 1 });
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
    case "sendMessage": {
      if (String(body.chat_id) === "403403") {
        return json(res, 403, { ok: false, error_code: 403, description: "Forbidden: bot was blocked by the user" });
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
