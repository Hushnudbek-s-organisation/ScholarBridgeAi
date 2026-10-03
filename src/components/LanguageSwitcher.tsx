"use client";

import React from "react";
import { Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import { useLocaleContext } from "@/i18n/LocaleProvider";
import { localeNames, locales, type Locale } from "@/i18n/config";

interface LanguageSwitcherProps {
  onLocaleChange?: (locale: Locale) => void;
  /** Small pill showing the 2-letter code — for tight headers. */
  compact?: boolean;
}

export function LanguageSwitcher({ onLocaleChange, compact = false }: LanguageSwitcherProps) {
  const { locale, setLocale } = useLocaleContext();
  // Accessible name of the control, in the language currently on screen.
  const t = useTranslations("language");

  const handleChange = (next: string) => {
    const value = next as Locale;
    setLocale(value);
    onLocaleChange?.(value);
  };

  if (compact) {
    return (
      <div className="relative flex items-center rounded-lg border border-slate-200 bg-slate-100 pl-1.5">
        <Globe className="h-3.5 w-3.5 shrink-0 text-slate-500" />
        <select
          value={locale}
          onChange={(e) => handleChange(e.target.value)}
          className="cursor-pointer bg-transparent py-1.5 pl-1 pr-1 text-[11px] font-bold uppercase text-slate-800 focus:outline-none"
          aria-label={t("label")}
        >
          {locales.map((l) => (
            <option key={l} value={l}>
              {l.toUpperCase()}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="relative flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
      <Globe className="h-4 w-4 text-slate-500 ml-2 shrink-0" />
      <select
        value={locale}
        onChange={(e) => handleChange(e.target.value)}
        className="bg-transparent text-xs sm:text-sm font-semibold text-slate-800 py-1 pl-1 pr-6 focus:outline-none cursor-pointer"
        aria-label={t("label")}
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {localeNames[l]}
          </option>
        ))}
      </select>
    </div>
  );
}
