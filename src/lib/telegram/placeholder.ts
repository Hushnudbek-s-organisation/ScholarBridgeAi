/**
 * Client-safe helper that recognises the technical email an earlier version
 * gave to Telegram-only accounts. New accounts are never created this way any
 * more (Telegram users sign up through the normal website sign-up and then
 * connect Telegram); the check stays so existing rows keep displaying well and
 * nobody can register that reserved domain.
 */
export const TELEGRAM_PLACEHOLDER_DOMAIN = "telegram.scholarbridge.local";

export function isTelegramPlaceholderEmail(email: string | null | undefined): boolean {
  return !!email && /@telegram\.scholarbridge\.local$/i.test(email);
}
