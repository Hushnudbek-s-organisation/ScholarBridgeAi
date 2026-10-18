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
import { dictionaries } from "./messages";
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

export function LocaleProvider({
  children,
  initialLocale = defaultLocale,
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
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  // Read the persisted choice on mount (no-op when the server already did).
  useEffect(() => {
    let live = true;
    void Promise.resolve().then(() => {
      const stored = getLocaleCookie();
      if (live && isLocale(stored) && stored !== initialLocale) {
        setLocaleState(stored);
      }
    });
    return () => {
      live = false;
    };
  }, [initialLocale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    setLocaleCookie(next);
  }, []);

  // Keep <html lang> truthful when the language changes without a reload:
  // assistive tech re-pronounces the page from the new lang attribute.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const messages = useMemo(
    () => dictionaries[locale] ?? dictionaries[defaultLocale],
    [locale]
  );

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
          let node: unknown = dictionaries.en;
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
