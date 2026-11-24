"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { SchollyModel } from "@/components/SchollyModel";
import { useTranslations } from "next-intl";
import { isLocale, type Locale } from "@/i18n/config";
import { useLocaleContext } from "@/i18n/LocaleProvider";
import { useTheme } from "@/components/ThemeProvider";
import "./flight-landing.css";

const localized = {
  en: { terms: "Terms", privacy: "Privacy" },
  uz: { terms: "Shartlar", privacy: "Maxfiylik" },
  ru: { terms: "Условия", privacy: "Конфиденциальность" },
};
type AuthLabels = Record<Locale, { menu: string; signIn: string }>;

export function FlightLanding({ markup, onStart, onSignIn }: {
  markup: string;
  onStart: () => void;
  onSignIn: () => void;
}) {
  const { locale, setLocale } = useLocaleContext();
  const t = useTranslations("landing");
  const themeLabels = useTranslations("theme");
  const { resolvedTheme, toggleTheme } = useTheme();
  const root = useRef<HTMLDivElement>(null);
  const [html] = useState(() => ({ __html: markup
    .replace('aria-label="Open navigation menu"', `aria-label="${locale === "uz" ? "Sahifa bo‘limlari" : locale === "ru" ? "Разделы страницы" : "Page sections"}"`)
    .replaceAll(">Sign in</button>", `>${locale === "uz" ? "Kirish" : locale === "ru" ? "Войти" : "Sign in"}</button>`),
  }));
  const authLabels = useRef<AuthLabels>({
    en: { menu: "Open navigation menu", signIn: "Sign in" },
    uz: { menu: "Navigatsiya menyusini ochish", signIn: "Kirish" },
    ru: { menu: "Открыть меню навигации", signIn: "Войти" },
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [mascot, setMascot] = useState<Element | null>(null);
  const [waving, setWaving] = useState(false);
  const waveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMascot(root.current?.querySelector("[data-flight-scholly]") ?? null));
    return () => { cancelAnimationFrame(frame); if (waveTimer.current) clearTimeout(waveTimer.current); };
  }, []);
  function wave() {
    setWaving(true);
    if (waveTimer.current) clearTimeout(waveTimer.current);
    waveTimer.current = setTimeout(() => setWaving(false), 1100);
  }
  const switchLanguage = useRef(setLocale);
  useEffect(() => { switchLanguage.current = setLocale; }, [setLocale]);
  useEffect(() => {
    root.current?.querySelector("[data-flight-theme]")?.setAttribute(
      "aria-label", themeLabels(resolvedTheme === "dark" ? "switchToLight" : "switchToDark"),
    );
  }, [resolvedTheme, themeLabels]);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    authLabels.current[locale] = { menu: t("navAria"), signIn: t("signIn") };
    const labels = localized[locale];
    for (const key of ["terms", "privacy"] as const) {
      const anchor = element.querySelector(`[data-i18n="${key}"]`);
      if (anchor) anchor.textContent = labels[key];
    }
    let disposed = false;
    let cleanup: (() => void) | undefined;
    void import("./flight-interactions").then(({ mountFlightLanding }) => {
      if (!disposed) cleanup = mountFlightLanding(element, locale, (value: string) => {
        if (isLocale(value)) switchLanguage.current(value);
      }, authLabels.current);
    }).catch(error => console.error("Landing interactions unavailable", error));
    return () => { disposed = true; cleanup?.(); };
  }, [locale, t]);

  function activate(event: MouseEvent<HTMLDivElement>) {
    if (!(event.target instanceof Element)) return;
    const actions = event.target.closest("[data-flight-start],[data-flight-sign-in],[data-flight-menu],[data-flight-theme]");
    if (!actions) {
      if (menuOpen && event.target.closest("#flight-page-sections a")) {
        root.current?.querySelector("[data-flight-menu]")?.setAttribute("aria-expanded", "false");
        setMenuOpen(false);
      }
      return;
    }
    if (actions.hasAttribute("data-flight-start")) onStart();
    if (actions.hasAttribute("data-flight-sign-in")) onSignIn();
    if (actions.hasAttribute("data-flight-theme")) toggleTheme();
    if (actions.hasAttribute("data-flight-menu")) {
      actions.setAttribute("aria-expanded", String(!menuOpen));
      setMenuOpen(!menuOpen);
    }
  }

  // Build-owned markup from the supplied design. Incoming content never enters this HTML.
  return <>
    <div ref={root} className="sb-flight-landing" data-flight-actions={menuOpen}
      onClick={activate} dangerouslySetInnerHTML={html} />
    {mascot && createPortal(
      <Button variant="unstyled" type="button" className="flight-scholly-wave" onClick={wave}
        aria-label={locale === "uz" ? "Scholly bilan salomlashish" : locale === "ru" ? "Помахать Scholly" : "Wave to Scholly"}>
        <SchollyModel motion={waving ? "wave" : "idle"} />
      </Button>, mascot)}
  </>;
}
