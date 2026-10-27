/**
 * Server-only translation access: **all** locales, synchronously.
 *
 * Route handlers and Server Components resolve a locale per request and read
 * it directly (`dictionaries[locale].journey.daysToday`), which a lazily
 * registered client dictionary cannot offer. Importing this file from a
 * `"use client"` module would put every language back into the browser bundle,
 * which is exactly what `src/i18n/messages.ts` exists to prevent — so client
 * code must use that module (or `useTranslations`) instead.
 */
import en from "./messages/en.json";
import ru from "./messages/ru.json";
import uz from "./messages/uz.json";
import type { Messages } from "./messages";

export type { Messages };

export const dictionaries: Record<string, Messages> = { en, uz, ru };

export const MESSAGE_LOCALES = ["en", "uz", "ru"] as const;

export function messagesFor(locale: string | null | undefined): Messages {
  return (locale && dictionaries[locale]) || en;
}

/**
 * What a `LocaleProvider` should receive. English is already inside the client
 * bundle, so sending it again would only grow the page payload — this returns
 * `null` for it and the full dictionary for the other two.
 */
export function clientMessagesFor(locale: string | null | undefined): Messages | null {
  const code = locale && dictionaries[locale] ? locale : "en";
  return code === "en" ? null : dictionaries[code];
}
