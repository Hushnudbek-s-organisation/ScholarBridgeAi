"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { NextIntlClientProvider } from "next-intl";
import { defaultLocale, isLocale, type Locale } from "./config";
import { dictionaries, englishMessages, loadMessages, registerMessages, type Messages } from "./messages";
import { getLocaleCookie, setLocaleCookie } from "./locale";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: defaultLocale,
  setLocale: () => {},
});

export function useLocaleContext() {
  return useContext(LocaleContext);
}

/**
 * The active locale's messages, read synchronously. `dictionaries[locale]` is
 * populated by this provider, so helpers outside React (date labels, the
 * Telegram mini app) can use it right after render.
 */
export function useMessages(): Messages {
  const { locale } = useLocaleContext();
  return dictionaries[locale] ?? englishMessages;
}

export function LocaleProvider({
  children,
  initialLocale = defaultLocale,
  initialMessages = null,
}: {
  children: React.ReactNode;
  /**
   * The locale the SERVER already resolved from the same cookie. Without it
   * the first HTML paint is always English and the stored language only
   * arrives after hydration — which would make a server-rendered page
   * disagree with its own `<html lang>` (and hide translated content from
   * crawlers). Callers that can read cookies pass it; the rest keep the
   * client-side swap below.
   */
  initialLocale?: Locale;
  /**
   * That locale's dictionary, resolved on the server so hydration matches the
   * server HTML. English is bundled with the app, so it is only sent for
   * Uzbek/Russian — a visitor downloads one language, never three.
   */
  initialMessages?: Messages | null;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [messages, setMessages] = useState<Messages>(() => {
    registerMessages(initialLocale, initialMessages);
    return initialMessages ?? dictionaries[initialLocale] ?? englishMessages;
  });

  // Read the persisted choice on mount (no-op when the server already did) and
  // fetch that language's dictionary if it is not the one we shipped.
  useEffect(() => {
    let live = true;
    void Promise.resolve().then(async () => {
      const stored = getLocaleCookie();
      const next = isLocale(stored) ? stored : initialLocale;
      if (!live || next === initialLocale) return;
      const loaded = await loadMessages(next);
      if (!live) return;
      registerMessages(next, loaded);
      setLocaleState(next);
      setMessages(loaded);
    });
    return () => {
      live = false;
    };
  }, [initialLocale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleCookie(next);
    // English is already in the bundle; the other two arrive as one chunk, and
    // the switch happens only once that chunk is here — otherwise the UI would
    // show the new language's KEYS for a frame while the messages catch up.
    const ready = dictionaries[next];
    if (ready) {
      setLocaleState(next);
      setMessages(ready);
      return;
    }
    void loadMessages(next).then((loaded) => {
      registerMessages(next, loaded);
      setLocaleState(next);
      setMessages(loaded);
    });
  }, []);

  // Keep <html lang> truthful when the language changes without a reload:
  // assistive tech re-pronounces the page from the new lang attribute.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const contextValue = useMemo(
    () => ({ locale, setLocale }),
    [locale, setLocale]
  );

  return (
    <LocaleContext.Provider value={contextValue}>
      <NextIntlClientProvider
        locale={locale}
        messages={messages}
        timeZone="Asia/Tashkent"
        // A missing key must degrade to readable text, never to the red
        // "something went wrong" screen: next-intl throws IntlError on absent
        // messages, and one forgotten key in one locale would otherwise crash
        // the whole hub. Dev keeps a console warning; production gets the
        // English value of the same key, or the bare key as the last resort.
        onError={(error) => {
          if (process.env.NODE_ENV !== "production") console.warn("[i18n]", error.message);
        }}
        getMessageFallback={({ namespace, key }) => {
          const path = namespace ? [namespace, ...key.split(".")] : key.split(".");
          let node: unknown = englishMessages as unknown;
          for (const part of path) {
            if (node && typeof node === "object") node = (node as Record<string, unknown>)[part];
            else return path[path.length - 1] ?? key;
          }
          return typeof node === "string" ? node : (path[path.length - 1] ?? key);
        }}
      >
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}
