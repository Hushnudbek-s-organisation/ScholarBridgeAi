"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { HelpCircle, Lightbulb, X } from "lucide-react";
import { HELP_SECTIONS, type HelpSection, type SectionHelpOverride } from "@/lib/growth/defaults";

// ---------------------------------------------------------------------------
// Admin overrides (GET /api/config/guide) — fetched once per page load and
// shared by every banner.
// ---------------------------------------------------------------------------
let helpCache: Record<string, SectionHelpOverride> | null = null;
let helpPromise: Promise<Record<string, SectionHelpOverride>> | null = null;

function loadHelp(): Promise<Record<string, SectionHelpOverride>> {
  if (helpCache) return Promise.resolve(helpCache);
  if (!helpPromise) {
    helpPromise = fetch("/api/config/guide", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { help: {} }))
      .then((d) => (helpCache = d?.help && typeof d.help === "object" ? d.help : {}))
      .catch(() => (helpCache = {}));
  }
  return helpPromise;
}

/** Admin → Guide & help calls this after saving so open pages update live. */
export function invalidateSectionHelp() {
  helpCache = null;
  helpPromise = null;
  if (typeof window !== "undefined") window.dispatchEvent(new Event("scholarbridge:help-updated"));
}

// ---------------------------------------------------------------------------
// "I've read it" — dismissed banners, persisted per browser.
// ---------------------------------------------------------------------------
const DISMISS_KEY = "scholarbridge_help_dismissed";
const listeners = new Set<() => void>();

function readDismissed(): string {
  try {
    return localStorage.getItem(DISMISS_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function writeDismissed(list: string[]) {
  try {
    localStorage.setItem(DISMISS_KEY, JSON.stringify(list));
  } catch {
    // storage unavailable — the banner simply comes back next visit
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function parse(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function isHelpSection(id: string): id is HelpSection {
  return (HELP_SECTIONS as readonly string[]).includes(id);
}

/**
 * Short "What is this page and how do I use it?" banner shown at the top of
 * a section, so a first-time visitor never lands on an unexplained screen.
 * Dismissible (remembered per browser) and re-openable with the "?" chip.
 * Text: translated default, or the admin's custom text; the admin can also
 * switch a banner off (Admin → Growth tools → Guide & help).
 */
export function SectionIntro({ section }: { section: string }) {
  const t = useTranslations("help");
  const [overrides, setOverrides] = useState<Record<string, SectionHelpOverride> | null>(helpCache);
  const dismissedRaw = useSyncExternalStore(subscribe, readDismissed, () => "[]");
  const dismissed = parse(dismissedRaw);

  useEffect(() => {
    let live = true;
    const load = () =>
      loadHelp().then((h) => {
        if (live) setOverrides(h);
      });
    void load();
    const onUpdate = () => void load();
    window.addEventListener("scholarbridge:help-updated", onUpdate);
    return () => {
      live = false;
      window.removeEventListener("scholarbridge:help-updated", onUpdate);
    };
  }, []);

  if (!isHelpSection(section)) return null;
  const o = overrides?.[section];
  if (o && o.enabled === false) return null;
  const text = o?.text || t(section);
  const isDismissed = dismissed.includes(section);

  const toggle = () => {
    const next = isDismissed ? dismissed.filter((s) => s !== section) : [...dismissed, section];
    writeDismissed(next);
  };

  return (
    <AnimatePresence initial={false} mode="wait">
      {isDismissed ? (
        <motion.div key="chip" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-3 flex justify-end">
          <button
            onClick={toggle}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:border-indigo-200 hover:text-indigo-600"
          >
            <HelpCircle className="h-3.5 w-3.5" /> {t("show")}
          </button>
        </motion.div>
      ) : (
        <motion.div
          key="banner"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="mb-4 flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3"
          role="note"
        >
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-xs">
            <Lightbulb className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-indigo-900">{t("title")}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-indigo-800">{text}</p>
          </div>
          <button
            onClick={toggle}
            className="shrink-0 rounded-lg p-1 text-indigo-400 hover:bg-white hover:text-indigo-700"
            aria-label={t("hide")}
            title={t("hide")}
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
