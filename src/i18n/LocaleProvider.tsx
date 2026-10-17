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
      <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Tashkent">
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}
