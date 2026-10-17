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
import Link from "next/link";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ChevronDown, ChevronRight, ChevronUp, TriangleAlert } from "lucide-react";
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
  const tn = useTranslations("nav");
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
            className={`inline-flex min-h-11 min-w-11 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors sm:text-[13px] ${
              // Active = royal indigo in BOTH themes, so the selected tab reads
              // as part of the indigo hero instead of a dead-black pill (light)
              // or a washed-out grey one (dark).
              isActive
                ? "border border-indigo-600 bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                : "border border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/10"
            }`}
          >
            {pane.label}
            {pane.premium && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                  isActive ? "bg-white/20 text-white" : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                }`}
              >
                {tn("proBadge")}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The shared "long list → curated preview" footer control.
 *
 * Every list that used to dump dozens of rows (dashboard next steps,
 * deadlines, study-plan phases, detail pages, feeds) now renders a short
 * initial slice followed by this one quiet pill: `Show more (+N)` /
 * `Show less`, localized in en/uz/ru through the shared `common` namespace.
 * It renders nothing when everything already fits on screen — so the
 * controls never appear unless they actually do something.
 */
export function ShowMoreToggle({
  totalCount,
  visibleCount,
  expanded,
  onToggle,
  className = "",
}: {
  totalCount: number;
  visibleCount: number;
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}) {
  const tc = useTranslations("common");
  const hiddenCount = Math.max(0, totalCount - visibleCount);
  // Nothing to reveal AND not expanded → no control. While expanded the pill
  // stays (it is the only way back to the compact preview).
  if (hiddenCount <= 0 && !expanded) return null;
  return (
    <div className={`flex justify-center ${className}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        {expanded ? tc("showLess") : tc("showMoreCount", { count: hiddenCount })}
        {expanded ? <ChevronUp className="h-3.5 w-3.5" aria-hidden /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden />}
      </button>
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
  const isActive = id === active;
  return (
    <div
      role="tabpanel"
      id={`hub-panel-${id}`}
      aria-labelledby={`hub-tab-${id}`}
      tabIndex={isActive ? -1 : undefined}
      hidden={!isActive}
      className="focus:outline-none"
    >
      {isActive ? children : null}
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
  const nav = useTranslations("nav");
  const reduceMotion = useReducedMotion();
  const visibleTabPanes = panes?.filter((pane) => !hiddenPanes.includes(pane.id)) ?? [];
  const hasTabPanels = visibleTabPanes.length > 1 && Boolean(activePane);
  const animatedContent = (
    <motion.div
      key={activePane ?? "single"}
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-4"
    >
      {children}
    </motion.div>
  );
  return (
    <div className="space-y-4">
      <nav aria-label={t("breadcrumbLabel")} className="print:hidden px-1">
        <ol className="flex min-w-0 flex-wrap items-center gap-1 text-xs">
          <li>
            <Link href="/" className="rounded-md font-semibold text-slate-600 underline-offset-2 hover:text-indigo-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-300 dark:hover:text-indigo-300">
              {nav("dashboard")}
            </Link>
          </li>
          <li aria-hidden="true"><ChevronRight className="h-3.5 w-3.5 text-slate-400" /></li>
          <li aria-current="page" className="min-w-0 break-words font-bold text-slate-900 dark:text-white">{title}</li>
        </ol>
      </nav>
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

      {hasTabPanels ? (
        <div className="space-y-4">
          {visibleTabPanes.map((pane) => (
            <HubPanel key={pane.id} id={pane.id} active={activePane ?? ""}>
              {pane.id === activePane ? animatedContent : null}
            </HubPanel>
          ))}
        </div>
      ) : (
        animatedContent
      )}

      {/* The standing disclaimer stays honest but gets quiet: a compact
          11px footnote BELOW the section content (it used to be a banner
          stacked above the explorer — three of these on one screen). */}
      {note && (
        <div
          className={`mt-6 flex items-start gap-1.5 rounded-xl border px-3 py-2 text-[11px] leading-relaxed ${
            note.tone === "warn"
              ? "border-amber-200/70 bg-amber-50/60 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/5 dark:text-amber-300"
              : "border-slate-200/70 bg-slate-50/70 text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400"
          }`}
          role="note"
        >
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
          <p className="min-w-0 break-words">{note.text}</p>
        </div>
      )}
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

/**
 * Lightweight placeholder for a lazily-loaded panel.
 *
 * The heavy panes (the visa studio, the AI studios, the admin panel) are
 * code-split, so this is what the student sees for the few hundred
 * milliseconds while the chunk arrives: the SHAPE of the panel, not a
 * spinner floating in an empty page.
 */
export function PanelSkeleton({
  rows = 3,
  className = "",
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-3 ${className}`} aria-hidden="true">
      <div className="h-5 w-1/3 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-20 w-full animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-[#111a2e]"
        />
      ))}
    </div>
  );
}
