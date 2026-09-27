/**
 * Minimal Telegram Bot API client (fetch, no SDK). The API base can be
 * overridden with TELEGRAM_API_BASE (env only — never from admin input, so it
 * cannot be turned into an SSRF primitive); tests point it at a local mock.
 */
export interface TgResult<T = unknown> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

export function telegramApiBase(): string {
  const env = process.env.TELEGRAM_API_BASE?.trim();
  return env ? env.replace(/\/+$/, "") : "https://api.telegram.org";
}

export async function tgCall<T = unknown>(
  token: string,
  method: string,
  params: Record<string, unknown> = {},
  timeoutMs = 8000
): Promise<TgResult<T>> {
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

export interface InlineButton {
  text: string;
  url: string;
}

export async function tgSendMessage(
  token: string,
  chatId: string,
  html: string,
  buttons: InlineButton[] = []
): Promise<TgResult<{ message_id: number }>> {
  return tgCall(token, "sendMessage", {
    chat_id: chatId,
    text: html,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    ...(buttons.length ? { reply_markup: { inline_keyboard: buttons.map((b) => [b]) } } : {}),
  });
}
