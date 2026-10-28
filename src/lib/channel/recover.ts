/**
 * "Send it anyway" — the two failures that used to lose a post.
 *
 * Telegram rejects a whole message for two reasons that have nothing to do
 * with the content being wrong:
 *
 *   1. **A button with an unusable URL.** `BUTTON_URL_INVALID` /
 *      "Inline keyboard button URL is invalid": the URL is not absolute https,
 *      or it points at `localhost` / `127.0.0.1` (a deployment that was
 *      configured with `APP_URL=http://localhost:3000`). The text is fine; the
 *      keyboard is not. Dropping the offending buttons and sending again keeps
 *      the post.
 *   2. **Malformed HTML.** "can't parse entities: …" — a stray `<`, an
 *      unbalanced tag, an entity Telegram does not know. The text is fine; the
 *      *markup* is not. Sending it without `parse_mode` shows the operator
 *      something, and `plainText()` keeps it readable.
 *
 * Both are decided by pure functions so `scripts/check-channel.ts` can test
 * them without a network, and both are applied in one place (`send.ts`) so no
 * send path can skip the recovery.
 */
import { plainText } from "./lint";

/* -------------------------------------------------------------------------- */
/* Buttons                                                                    */
/* -------------------------------------------------------------------------- */

export interface ChannelButton {
  text: string;
  /** A URL button; `callback_data` buttons have no URL to validate. */
  url?: string;
  callback_data?: string;
  web_app?: { url: string };
}

/** Telegram's own limits, so a long title cannot fail an otherwise good post. */
export const BUTTON_TEXT_MAX = 64;
export const CALLBACK_DATA_MAX = 64;

/**
 * Is this URL acceptable in an inline button?
 *
 * Telegram requires an absolute **https** URL. `localhost`, `127.0.0.1` and
 * the private ranges are rejected by the API even over https, and a relative
 * path is rejected outright. This is stricter than `isButtonUrl` (which is the
 * bot's UI helper) because here a false positive costs a whole post.
 */
export function isUsableButtonUrl(raw: string | null | undefined): boolean {
  const value = (raw ?? "").trim();
  if (!value) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  if (!host || !host.includes(".")) return false;
  if (host === "localhost" || host.endsWith(".localhost")) return false;
  if (/^(?:0\.0\.0\.0|127\.)/.test(host) || host === "::1" || host === "[::1]") return false;
  if (/^(?:10|192\.168|169\.254)\./.test(host)) return false;
  if (/^172\.(?:1[6-9]|2\d|3[01])\./.test(host)) return false;
  return true;
}

/**
 * The buttons that can actually be sent, and the reason for each one dropped.
 *
 * A dropped button never changes the text, never reorders the rest, and never
 * removes a *row* that still has buttons — so the decision keyboard
 * (`[✅][❌] / [✏️]`) survives unless every button in it was broken.
 */
export function usableButtons(rows: ChannelButton[][]): { rows: ChannelButton[][]; dropped: string[] } {
  const dropped: string[] = [];
  const clean: ChannelButton[][] = [];
  for (const row of rows) {
    const kept: ChannelButton[] = [];
    for (const button of row) {
      const label = (button.text ?? "").trim();
      if (!label) {
        dropped.push("button without a label");
        continue;
      }
      if (button.url !== undefined && !isUsableButtonUrl(button.url)) {
        dropped.push(`url:${button.url}`);
        continue;
      }
      if (button.web_app !== undefined && !isUsableButtonUrl(button.web_app?.url)) {
        dropped.push(`web_app:${button.web_app?.url}`);
        continue;
      }
      if (button.callback_data !== undefined && Buffer.byteLength(button.callback_data, "utf8") > CALLBACK_DATA_MAX) {
        dropped.push("callback_data too long");
        continue;
      }
      if (button.url === undefined && button.callback_data === undefined && button.web_app === undefined) {
        dropped.push("button without an action");
        continue;
      }
      kept.push({ ...button, text: label.slice(0, BUTTON_TEXT_MAX) });
    }
    if (kept.length) clean.push(kept);
  }
  return { rows: clean, dropped };
}

/**
 * Does this failure mean "the keyboard was the problem"?
 *
 * Telegram's wording has changed over the years ("wrong HTTP URL", "BUTTON_URL_INVALID",
 * "Inline keyboard button URL is invalid", "button_url_invalid"), so the check
 * is on the concept, not on one string.
 */
export function isKeyboardError(description: string | null | undefined): boolean {
  const text = (description ?? "").toLowerCase();
  if (!text) return false;
  return (
    text.includes("button_url_invalid") ||
    text.includes("button url") ||
    text.includes("inline keyboard") ||
    text.includes("reply_markup") ||
    text.includes("wrong http url")
  );
}

/** Does this failure mean "the markup was the problem"? */
export function isParseError(description: string | null | undefined): boolean {
  const text = (description ?? "").toLowerCase();
  if (!text) return false;
  return (
    text.includes("can't parse entities") ||
    text.includes("cant parse entities") ||
    text.includes("unclosed") ||
    text.includes("unsupported start tag") ||
    text.includes("can't find end tag")
  );
}

/* -------------------------------------------------------------------------- */
/* The recovery plan                                                          */
/* -------------------------------------------------------------------------- */

export type SendAttempt =
  | { kind: "html"; text: string; withKeyboard: boolean }
  | { kind: "plain"; text: string; withKeyboard: boolean };

/**
 * What to try after a failed `sendMessage`, or `null` when the failure is not
 * recoverable (a 403 "bot was blocked", a deleted channel: retrying the same
 * message only wastes a request).
 *
 * Order: keep the markup and drop the keyboard → drop the markup too. Two
 * retries at most; a post is never lost to a formatting problem.
 */
export function recoveryAttempt(failed: SendAttempt, description: string | null | undefined): SendAttempt | null {
  if (isKeyboardError(description) && failed.withKeyboard) {
    return { ...failed, withKeyboard: false };
  }
  if (isParseError(description) && failed.kind === "html") {
    // Text without markup, and a keyboard is safe again: the reason we were
    // about to drop it was the keyboard of the *previous* attempt, not this one.
    return { kind: "plain", text: plainText(failed.text), withKeyboard: failed.withKeyboard };
  }
  return null;
}

/**
 * The text of a failed HTML message as readable plain text.
 *
 * `plainText` (from `lint.ts`) already turns `<b>a</b>` into `a` and decodes
 * the entities the templates emit; this wrapper exists so the send path has
 * one name for it and so the rule is testable in one place.
 */
export function fallbackPlainText(html: string): string {
  return plainText(html);
}
