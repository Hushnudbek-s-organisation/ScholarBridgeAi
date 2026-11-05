/**
 * Public external & community links used across marketing surfaces
 * (landing page Telegram strip, mobile drawer, final CTA, and footer).
 *
 * Deployment override:
 *   Set `NEXT_PUBLIC_TELEGRAM_CHANNEL_URL` (e.g. `https://t.me/your_channel`)
 *   in your environment, or update `DEFAULT_TELEGRAM_CHANNEL_URL` below.
 */
export const DEFAULT_TELEGRAM_CHANNEL_URL = "https://t.me/scholarbridgeai";

export const PUBLIC_TELEGRAM_CHANNEL_URL: string =
  (typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_URL?.trim()) ||
  DEFAULT_TELEGRAM_CHANNEL_URL;

/** Display handle (`@scholarbridgeai`) derived from `PUBLIC_TELEGRAM_CHANNEL_URL`. */
export const PUBLIC_TELEGRAM_HANDLE: string = (() => {
  try {
    const slug = new URL(PUBLIC_TELEGRAM_CHANNEL_URL).pathname
      .replace(/^\/+/, "")
      .replace(/^s\//, "")
      .split("/")[0];
    return slug && !slug.startsWith("+") ? `@${slug}` : "Telegram";
  } catch {
    return "@scholarbridgeai";
  }
})();
