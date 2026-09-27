/**
 * Client-safe helpers for the technical email given to Telegram-only
 * accounts (no crypto imports, so components can use them).
 */
export const TELEGRAM_PLACEHOLDER_DOMAIN = "telegram.scholarbridge.local";

export function telegramPlaceholderEmail(telegramUserId: string): string {
  return `tg${telegramUserId.replace(/\D/g, "")}@${TELEGRAM_PLACEHOLDER_DOMAIN}`;
}

export function isTelegramPlaceholderEmail(email: string | null | undefined): boolean {
  return !!email && /@telegram\.scholarbridge\.local$/i.test(email);
}
