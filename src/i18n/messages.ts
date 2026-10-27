import en from "./messages/en.json";

export type Messages = typeof en;

/**
 * Client-safe translation access.
 *
 * Why this file is careful about what it imports: the app has ~6 200 UI strings
 * per language. Bundling all three dictionaries put **1.4 MB of JSON** into the
 * JavaScript every visitor downloads and parses before the landing page can
 * respond — the single biggest reason the site felt frozen on a phone.
 *
 * The rules now:
 *  - English is bundled. It is the fallback for every missing key, so it must
 *    always be available synchronously (several helpers read it outside React).
 *  - Uzbek and Russian are loaded **one at a time**: the server picks the
 *    visitor's locale, and a language switch fetches exactly one extra chunk.
 *  - `registerMessages` lets synchronous helpers (`daysLabel`, the Telegram
 *    mini app, error screens) read the active locale without a hook.
 *
 * Server-only code that needs all three dictionaries synchronously should
 * import `@/i18n/messages.server` instead.
 */
export const dictionaries: Record<string, Messages> = { en };

export const MESSAGE_LOCALES = ["en", "uz", "ru"] as const;

/** Load one locale. Each branch is its own lazily fetched chunk. */
export async function loadMessages(locale: string): Promise<Messages> {
  if (locale === "uz") return (await import("./messages/uz.json")).default as unknown as Messages;
  if (locale === "ru") return (await import("./messages/ru.json")).default as unknown as Messages;
  return en;
}

/** Make a loaded locale available to synchronous helpers (idempotent). */
export function registerMessages(locale: string, messages: Messages | null | undefined): void {
  if (!messages || locale === "en" || dictionaries[locale] === messages) return;
  dictionaries[locale] = messages;
}

/** The bundled English dictionary — the guaranteed fallback. */
export const englishMessages = en;
