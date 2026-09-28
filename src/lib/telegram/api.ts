/**
 * Minimal Telegram Bot API client (fetch, no SDK). The API base can be
 * overridden with TELEGRAM_API_BASE (env only — never from admin input, so it
 * cannot be turned into an SSRF primitive); tests point it at a local mock.
 *
 * Retries are bounded: a 429 waits `parameters.retry_after` (capped), 5xx and
 * network errors back off 0.5 s → 1 s. 4xx (bad request, 403 blocked) never
 * retry — the caller decides what they mean.
 */
export interface TgResult<T = unknown> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
  parameters?: { retry_after?: number };
}

export function telegramApiBase(): string {
  const env = process.env.TELEGRAM_API_BASE?.trim();
  return env ? env.replace(/\/+$/, "") : "https://api.telegram.org";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Longest retry_after we are willing to wait inside one request (seconds). */
export const MAX_RETRY_AFTER_SEC = 5;
export const MAX_TG_ATTEMPTS = 3;

async function tgCallOnce<T>(token: string, method: string, params: Record<string, unknown>, timeoutMs: number): Promise<TgResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${telegramApiBase()}/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal: controller.signal,
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as TgResult<T> | null;
    if (!data) return { ok: false, description: `HTTP ${res.status}`, error_code: res.status };
    return data;
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return { ok: false, description: aborted ? "Telegram API timeout" : "Telegram API unreachable", error_code: 0 };
  } finally {
    clearTimeout(timer);
  }
}

/** Should this failed result be retried, and after how long (ms)? */
export function retryDelayMs(res: TgResult, attempt: number): number | null {
  if (res.ok) return null;
  const code = res.error_code ?? 0;
  if (code === 429) {
    const after = Number(res.parameters?.retry_after ?? 1);
    if (!Number.isFinite(after) || after > MAX_RETRY_AFTER_SEC) return null;
    return Math.max(after, 0.2) * 1000;
  }
  if (code === 0 || code >= 500) return 500 * 2 ** (attempt - 1);
  return null;
}

export async function tgCall<T = unknown>(
  token: string,
  method: string,
  params: Record<string, unknown> = {},
  timeoutMs = 8000
): Promise<TgResult<T>> {
  let res: TgResult<T> = { ok: false, description: "not sent", error_code: 0 };
  for (let attempt = 1; attempt <= MAX_TG_ATTEMPTS; attempt++) {
    res = await tgCallOnce<T>(token, method, params, timeoutMs);
    const delay = attempt < MAX_TG_ATTEMPTS ? retryDelayMs(res, attempt) : null;
    if (delay === null) return res;
    await sleep(delay);
  }
  return res;
}

/** Inline keyboard button: a URL, a callback (≤ 64 bytes) or a Mini App. */
export type InlineButton =
  | { text: string; url: string }
  | { text: string; callback_data: string }
  | { text: string; web_app: { url: string } };

/** One button per row (a flat list) or explicit rows. */
export type Keyboard = InlineButton[] | InlineButton[][];

export function toInlineKeyboard(buttons: Keyboard): InlineButton[][] {
  if (!buttons.length) return [];
  return Array.isArray(buttons[0]) ? (buttons as InlineButton[][]) : (buttons as InlineButton[]).map((b) => [b]);
}

export async function tgSendMessage(
  token: string,
  chatId: string,
  html: string,
  buttons: Keyboard = []
): Promise<TgResult<{ message_id: number }>> {
  const keyboard = toInlineKeyboard(buttons);
  return tgCall(token, "sendMessage", {
    chat_id: chatId,
    text: html,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    ...(keyboard.length ? { reply_markup: { inline_keyboard: keyboard } } : {}),
  });
}

export async function tgEditMessage(
  token: string,
  chatId: string,
  messageId: number,
  html: string,
  buttons: Keyboard = []
): Promise<TgResult> {
  return tgCall(token, "editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text: html,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    reply_markup: { inline_keyboard: toInlineKeyboard(buttons) },
  });
}

/** Always answer a callback query, or the button keeps spinning for the user. */
export async function tgAnswerCallback(token: string, callbackQueryId: string, text?: string, alert = false): Promise<TgResult> {
  return tgCall(token, "answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    ...(text ? { text: text.slice(0, 190), show_alert: alert } : {}),
  });
}

export async function tgSendChatAction(token: string, chatId: string, action: "typing" = "typing"): Promise<TgResult> {
  return tgCall(token, "sendChatAction", { chat_id: chatId, action }, 4000);
}
