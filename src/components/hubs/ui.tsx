"use client";

/**
 * The shared shape of every destination page (spec §4 "shared destination-page
 * design"):
 *
 *   1. clear page title
 *   2. one short explanation of what the destination helps the student do
 *   3. one primary action when there is a useful next action
 *   4. the tabs/sections of the destination
 *   5. existing feature components and data underneath
 *   6. clear loading / empty / error / success states (the panels bring those)
 *
 * Tabs WRAP on phones instead of scrolling sideways: a student on a 320px
 * screen sees every section of the page without discovering a hidden strip.
 * The same markup is a `tablist` for assistive tech, with arrow-key support.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, TriangleAlert } from "lucide-react";
import { isNewBadgeActive } from "@/lib/navSections";
import { JourneyCard } from "@/components/journey/ui";

export interface HubPaneDef {
  id: string;
  label: string;
  premium?: boolean;
  /** Feature launched recently — badge only, never a destination of its own. */
  isNew?: boolean;
}

export function HubTabs({
  panes,
  active,
  onChange,
  hidden = [],
  ariaLabel,
}: {
  panes: HubPaneDef[];
  active: string;
  onChange: (id: string) => void;
  /** Pane ids the admin has hidden — never rendered, never selected. */
  hidden?: string[];
  ariaLabel: string;
}) {
  const list = panes.filter((p) => !hidden.includes(p.id));
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, id: string) => {
      const ids = list.map((p) => p.id);
      const index = ids.indexOf(id);
      if (index < 0) return;
      let next = -1;
      if (e.key === "ArrowRight") next = (index + 1) % ids.length;
      else if (e.key === "ArrowLeft") next = (index - 1 + ids.length) % ids.length;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = ids.length - 1;
      if (next < 0) return;
      e.preventDefault();
      const id2 = ids[next];
      onChange(id2);
      refs.current[id2]?.focus();
    },
    [list, onChange]
  );

  if (list.length < 2) return null;

  return (
    <div role="tablist" aria-label={ariaLabel} className="flex flex-wrap gap-1.5">
      {list.map((pane) => {
        const isActive = pane.id === active;
        return (
          <button
            key={pane.id}
            ref={(el) => {
              refs.current[pane.id] = el;
            }}
            role="tab"
            id={`hub-tab-${pane.id}`}
            aria-selected={isActive}
            aria-controls={`hub-panel-${pane.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(pane.id)}
            onKeyDown={(e) => onKeyDown(e, pane.id)}
            className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors sm:text-[13px] ${
              isActive
                ? "bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            {pane.label}
            {pane.isNew && isNewBadgeActive() && (
              <span
                aria-hidden="true"
                className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                  isActive ? "bg-white/20 text-white dark:bg-slate-900/10 dark:text-slate-900" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                }`}
              >
                New
              </span>
            )}
            {pane.premium && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                  isActive ? "bg-white/20 text-white dark:bg-slate-900/10 dark:text-slate-900" : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                }`}
              >
                Pro
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function HubPanel({
  id,
  active,
  children,
}: {
  id: string;
  active: string;
  children: React.ReactNode;
}) {
  if (id !== active) return null;
  return (
    <div role="tabpanel" id={`hub-panel-${id}`} aria-labelledby={`hub-tab-${id}`} tabIndex={-1} className="focus:outline-none">
      {children}
    </div>
  );
}

/**
 * The destination header: title, one-line explanation, primary action and the
 * option tabs. `onPrimary` is optional — a destination with nothing useful to
 * do right now shows no button rather than a button that goes nowhere.
 */
export function HubPage({
  title,
  intro,
  primaryLabel,
  onPrimary,
  panes,
  activePane,
  onPaneChange,
  hiddenPanes = [],
  tabListLabel,
  note,
  children,
}: {
  title: string;
  intro: string;
  primaryLabel?: string;
  onPrimary?: () => void;
  panes?: HubPaneDef[];
  activePane?: string;
  onPaneChange?: (id: string) => void;
  hiddenPanes?: string[];
  tabListLabel?: string;
  note?: { tone: "info" | "warn"; text: string };
  children: React.ReactNode;
}) {
  const t = useTranslations("hubs");
  const reduceMotion = useReducedMotion();
  return (
    <div className="space-y-4">
      <JourneyCard tone="hero">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">{title}</h1>
            <p className="mt-1.5 max-w-3xl text-[13px] leading-relaxed text-slate-600 dark:text-slate-300 sm:text-sm">{intro}</p>
          </div>
          {primaryLabel && onPrimary && (
            <button
              type="button"
              onClick={onPrimary}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 sm:w-auto"
            >
              {primaryLabel}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>

        {panes && panes.length > 1 && activePane && onPaneChange && (
          <div className="mt-4 border-t border-slate-200/70 pt-3 dark:border-slate-700/60">
            <HubTabs panes={panes} active={activePane} onChange={onPaneChange} hidden={hiddenPanes} ariaLabel={tabListLabel ?? t("tabListLabel")} />
          </div>
        )}
      </JourneyCard>

      {note && (
        <div
          className={`flex items-start gap-2 rounded-2xl border px-4 py-3 text-[13px] ${
            note.tone === "warn"
              ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
              : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300"
          }`}
          role="note"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>{note.text}</p>
        </div>
      )}

      <motion.div
        key={activePane ?? "single"}
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-4"
      >
        {children}
      </motion.div>
    </div>
  );
}

/**
 * "Which application am I looking at?" — the selected application stays
 * visible inside Application Materials (spec §3), and can be changed without
 * leaving the page.
 */
export function ApplicationContextBar({
  applications,
  selectedId,
  onSelect,
}: {
  applications: { id: number; universityName: string; programName?: string | null }[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}) {
  const t = useTranslations("hubs");
  const selected = applications.find((a) => a.id === selectedId) ?? null;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900">
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("selectedApplication")}</span>
      {applications.length > 0 ? (
        <select
          value={selectedId ?? ""}
          onChange={(e) => onSelect(e.target.value ? Number(e.target.value) : null)}
          aria-label={t("changeApplication")}
          className="min-h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-semibold text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 sm:max-w-md"
        >
          <option value="">{t("noApplication")}</option>
          {applications.map((a) => (
            <option key={a.id} value={a.id}>
              {a.universityName}
              {a.programName ? ` — ${a.programName}` : ""}
            </option>
          ))}
        </select>
      ) : (
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t("noApplication")}</span>
      )}
      {selected && (
        <span className="w-full text-xs text-slate-500 dark:text-slate-400 sm:w-auto">
          {selected.universityName}
          {selected.programName ? ` — ${selected.programName}` : ""}
        </span>
      )}
    </div>
  );
}

/** Shared empty state for a hub pane that has nothing to show yet. */
export function HubEmpty({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center dark:border-slate-700 dark:bg-slate-900">
      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</p>
      {hint && <p className="mx-auto mt-1.5 max-w-xl text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">{hint}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

/**
 * Tracks the visible pane in the URL-free parts of a hub: panes are owned by
 * the app shell, but each hub needs to know when a deep link moved the tab.
 */
export function usePaneSelection(pane: string | null, fallback: string, onChange: (pane: string) => void) {
  const [local, setLocal] = useState(pane ?? fallback);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mirrors the pane the shell owns (deep link, Back/Forward) into the hub
    setLocal(pane ?? fallback);
  }, [pane, fallback]);
  return [
    local,
    (next: string) => {
      setLocal(next);
      onChange(next);
    },
  ] as const;
}

/**
 * A horizontally scrollable region that keyboard users can actually reach.
 *
 * Chrome does not put `overflow-x: auto` containers in the tab order, so a
 * keyboard-only student cannot scroll to the columns hidden off-screen
 * (WCAG 2.1.1 Keyboard). This adds `tabindex="0"` + a label ONLY while the
 * content actually overflows — so an ordinary table costs no extra tab stop.
 */
export function ScrollRegion({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setOverflows(el.scrollWidth > el.clientWidth + 4);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);
    return () => ro.disconnect();
  }, [children]);

  return (
    <div
      ref={ref}
      className={className}
      tabIndex={overflows ? 0 : undefined}
      role={overflows ? "region" : undefined}
      aria-label={overflows ? label : undefined}
      data-scroll-region={overflows ? "scrollable" : undefined}
    >
      {children}
    </div>
  );
}
