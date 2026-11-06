"use client";

/**
 * Shared UI primitives for the Journey sections.
 *
 * The existing feature components use raw Tailwind + a `SectionIntro` header.
 * These keep the new panels visually identical to the rest of the product
 * without dragging in a component library, and they all work in both themes
 * (the app uses CSS variables via `ThemeProvider`).
 */
import React from "react";
import { useTranslations } from "next-intl";
import { m as Motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, Circle, CircleDashed, Info, TriangleAlert, XCircle } from "lucide-react";
import { AnimatedNumber, AnimatedRing, MOTION_TOKENS } from "@/components/motion";
import { dictionaries } from "@/i18n/messages";
import { isLocale } from "@/i18n/config";
import { Button } from "@/components/ui/Button";
import { ProgressFill } from "@/components/ui/ProgressBar";

/**
 * A titled surface — the workhorse of every Journey screen.
 *
 * It reveals itself once when scrolled into view and lifts slightly on hover,
 * which is what makes a long dashboard feel alive without animating anything
 * the student is trying to read. `interactive` opts a card into the lift.
 */
export function JourneyCard({
  title,
  subtitle,
  action,
  children,
  className = "",
  interactive = false,
  delay = 0,
  tone = "plain",
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Adds a hover lift — for cards that open or navigate somewhere. */
  interactive?: boolean;
  /** Stagger cards inside a row by passing 0, 0.05, 0.1 … */
  delay?: number;
  /** `hero` gets the soft ambient mesh backdrop (one per screen, please). */
  tone?: "plain" | "hero" | "accent" | "well";
}) {
  const reduceMotion = useReducedMotion();
  const tones: Record<string, string> = {
    plain: "sb-surface-card bg-white dark:bg-slate-900",
    // The hero gets its own colour identity in both themes (see `.sb-journey-hero`
    // in globals.css) instead of borrowing the card palette: a pale indigo wash
    // on light, a deep indigo→violet on dark. It must stay the ONE hero per
    // screen, so panels keep `plain` / `accent` / `well`.
    hero: "sb-journey-hero relative overflow-hidden bg-white dark:bg-slate-900",
    accent: "sb-surface-card border-indigo-200/80 bg-indigo-50/40 dark:border-indigo-500/25 dark:bg-indigo-950/20",
    well: "border-slate-200/80 bg-slate-50 dark:border-slate-800 dark:bg-slate-800",
  };
  return (
    <Motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px 0px -50px 0px" }}
      transition={{
        duration: MOTION_TOKENS.duration.reveal,
        delay: reduceMotion ? 0 : delay,
        ease: MOTION_TOKENS.ease.out,
      }}
      // `min-w-0` matters: these cards are grid items, and a grid track
      // defaults to `minmax(auto, 1fr)`. A long university name inside a
      // `truncate` (nowrap) <p> then pushed the track to ~640px and gave every
      // phone a horizontal page scroll. Allowing the track to shrink keeps the
      // page at the viewport width (WCAG 1.4.10 Reflow).
      className={`min-w-0 rounded-overlay border border-slate-200 shadow-xs dark:border-slate-700 ${tones[tone]} ${
        interactive ? "sb-card-hover" : ""
      } ${className}`}
    >
      {tone === "hero" && <span aria-hidden className="sb-aurora" />}
      <div className="relative">
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-5">
          <div className="min-w-0">
            {title && <h2 className="sb-type-h3 text-slate-900 dark:text-white">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className="px-4 py-4 sm:px-5">{children}</div>
      </div>
    </Motion.section>
  );
}

export function ProgressBar({
  pct,
  label,
  tone = "brand",
  size = "md",
  animate = true,
}: {
  pct: number;
  label?: string;
  tone?: "brand" | "good" | "warn" | "bad";
  size?: "sm" | "md" | "lg";
  /** Set false for progress that updates every keystroke. */
  animate?: boolean;
}) {
  const value = Math.max(0, Math.min(100, Math.round(pct)));
  const tones: Record<string, string> = {
    brand: "bg-indigo-500",
    good: "bg-emerald-500",
    warn: "bg-amber-500",
    bad: "bg-rose-500",
  };
  const heights: Record<string, string> = { sm: "h-1.5", md: "h-2.5", lg: "h-3.5" };
  const reduceMotion = useReducedMotion();
  const t = useTranslations("journey");
  return (
    <div>
      <div
        className={`w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700 ${heights[size]}`}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? t("uiProgressAria")}
      >
        <ProgressFill value={value} className={`h-full rounded-full transition-all ${tones[tone]}`} />
      </div>
      {label && (
        <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      )}
    </div>
  );
}

export function Pill({
  children,
  tone = "slate",
  className = "",
}: {
  children: React.ReactNode;
  tone?: "slate" | "brand" | "good" | "warn" | "bad" | "info" | "violet";
  className?: string;
}) {
  const tones: Record<string, string> = {
    slate: "border border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200",
    brand: "border border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-900/60 dark:text-indigo-200",
    good: "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-900/60 dark:text-emerald-200",
    warn: "border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-900/60 dark:text-amber-200",
    bad: "border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-900/60 dark:text-rose-200",
    info: "border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-900/60 dark:text-sky-200",
    violet: "border border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-900/60 dark:text-violet-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function StatusIcon({ state, className = "h-4 w-4" }: { state: string; className?: string }) {
  if (state === "done" || state === "met" || state === "verified" || state === "confirmed")
    return <CheckCircle2 className={`${className} text-emerald-500`} aria-hidden />;
  if (state === "blocked" || state === "not_met" || state === "rejected" || state === "expired")
    return <XCircle className={`${className} text-rose-500`} aria-hidden />;
  if (state === "in_progress" || state === "below" || state === "needs_update")
    return <TriangleAlert className={`${className} text-amber-500`} aria-hidden />;
  if (state === "not_required") return <CircleDashed className={`${className} text-slate-500`} aria-hidden />;
  if (state === "no_score" || state === "unknown") return <Info className={`${className} text-sky-500`} aria-hidden />;
  return <Circle className={`${className} text-slate-300 dark:text-slate-600`} aria-hidden />;
}

export function SourceTag({
  url,
  name,
  lastVerified,
  verificationStatus,
}: {
  url?: string | null;
  name?: string | null;
  lastVerified?: string | Date | null;
  verificationStatus?: string | null;
}) {
  const t = useTranslations("journey");
  // SPEC §4: an unsourced requirement must never read as an official fact.
  if (!url) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
        <Info className="h-3 w-3" aria-hidden /> {t("uiNotSpecified")}
      </span>
    );
  }
  const when = lastVerified
    ? lastVerified instanceof Date
      ? lastVerified.toISOString().slice(0, 10)
      : String(lastVerified).slice(0, 10)
    : null;
  const tone =
    verificationStatus === "verified"
      ? "text-emerald-600 dark:text-emerald-400"
      : verificationStatus === "outdated"
        ? "text-amber-600 dark:text-amber-400"
        : "text-slate-500 dark:text-slate-400";
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={`inline-flex items-center gap-1 text-xs font-medium underline-offset-2 hover:underline ${tone}`}
      title={name ?? t("uiOfficialSource")}
    >
      {name ?? t("uiSourceFallback")}
      {when && (
        <span className="text-slate-500 dark:text-slate-400">
          · {verificationStatus === "verified" ? t("uiVerified") : verificationStatus === "outdated" ? t("uiOutdated") : t("uiLastChecked")}{" "}
          {when}
        </span>
      )}
    </a>
  );
}

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-surface border border-dashed border-slate-300 px-4 py-8 text-center dark:border-slate-700">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">{hint}</p>}
      {action && <div className="mt-3 flex justify-center">{action}</div>}
    </div>
  );
}

/**
 * Skeleton placeholder used while a panel loads.
 *
 * A shimmering card reads as "your content is coming" and keeps the page from
 * jumping, which a lone spinner cannot. The widths are deliberately uneven so
 * the placeholder does not look like a broken table.
 */
export function SkeletonCard({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  const widths = ["w-1/3", "w-full", "w-5/6", "w-2/3", "w-3/4"];
  return (
    <div
      className={`sb-surface-card rounded-overlay border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-700 dark:bg-slate-900 sm:p-5 ${className}`}
      aria-hidden
    >
      <div className="sb-skeleton h-4 w-2/5" />
      <div className="mt-4 space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className={`sb-skeleton h-3 ${widths[i % widths.length]}`} />
        ))}
      </div>
    </div>
  );
}

/**
 * Loading state for a whole panel: a status sentence (screen readers get the
 * message) plus skeleton cards shaped like the content that is arriving.
 */
export function Loading({
  label,
  rows = 3,
  cards = 0,
}: {
  label?: string;
  /** Skeleton line count for the inline variant. */
  rows?: number;
  /** > 0 renders full skeleton CARDS instead — for whole-page panels only. */
  cards?: number;
}) {
  const t = useTranslations("journey");
  const shown = label ?? t("uiLoadingDefault");
  const widths = ["w-2/5", "w-full", "w-4/5", "w-3/5", "w-5/6"];
  return (
    <div className="space-y-4" aria-busy="true">
      <p className="sr-only" role="status" aria-live="polite">
        {shown}
      </p>
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
        </span>
        {shown}
      </div>
      {cards > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: cards }).map((_, i) => (
            <SkeletonCard key={i} lines={i === 0 ? 4 : 3} />
          ))}
        </div>
      ) : (
        <div className="space-y-2.5" aria-hidden>
          {Array.from({ length: Math.max(2, rows) }).map((_, i) => (
            <div key={i} className={`sb-skeleton h-3.5 ${widths[i % widths.length]}`} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Compact headline metric: a counting number, an optional unit and a hint.
 *
 * `state` tints the tile so a glance is enough — green when the underlying
 * requirement is genuinely met, amber while it is still moving.
 */
export function StatTile({
  label,
  value,
  decimals = 0,
  suffix = "",
  prefix = "",
  hint,
  icon,
  state = "neutral",
  className = "",
  onClick,
}: {
  label: string;
  value: number | string;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  hint?: string;
  icon?: React.ReactNode;
  state?: "neutral" | "good" | "warn" | "bad" | "brand";
  className?: string;
  onClick?: () => void;
}) {
  const states: Record<string, string> = {
    neutral: "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900",
    brand: "border-indigo-200 bg-indigo-50/50 dark:border-indigo-500/30 dark:bg-indigo-950/20",
    good: "border-emerald-200 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-950/20",
    warn: "border-amber-200 bg-amber-50/50 dark:border-amber-500/30 dark:bg-amber-950/20",
    bad: "border-rose-200 bg-rose-50/50 dark:border-rose-500/30 dark:bg-rose-950/20",
  };
  const valueTones: Record<string, string> = {
    neutral: "text-slate-900 dark:text-white",
    brand: "text-indigo-700 dark:text-indigo-200",
    good: "text-emerald-700 dark:text-emerald-200",
    warn: "text-amber-700 dark:text-amber-200",
    bad: "text-rose-700 dark:text-rose-200",
  };
  const tile = (
    <>
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
        {icon}
        <span className="break-words whitespace-normal">{label}</span>
      </div>
      <p className={`mt-1 text-2xl font-bold tracking-tight tabular-nums ${valueTones[state]}`}>
        {typeof value === "number" ? (
          <AnimatedNumber value={value} decimals={decimals} prefix={prefix} suffix={suffix} />
        ) : value}
      </p>
      {hint && <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{hint}</p>}
    </>
  );
  const tileClassName = `rounded-surface border px-3.5 py-3 text-left ${states[state]} ${className}`;
  return onClick ? (
    <Button variant="unstyled" type="button" onClick={onClick} className={`${tileClassName} w-full transition hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`}>
      {tile}
    </Button>
  ) : (
    <div className={tileClassName}>{tile}</div>
  );
}

/**
 * Progress as a donut. Used where the number is the headline (journey stage,
 * application readiness) — the arc draws itself in on first paint.
 */
export function ProgressRing({
  pct,
  size = 96,
  strokeWidth = 9,
  label,
  caption,
  ariaValueText,
  tone = "brand",
}: {
  pct: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  caption?: string;
  ariaValueText?: string;
  tone?: "brand" | "good" | "warn" | "bad";
}) {
  const value = Math.max(0, Math.min(100, Math.round(pct)));
  const strokes: Record<string, string> = {
    brand: "stroke-indigo-500",
    good: "stroke-emerald-500",
    warn: "stroke-amber-500",
    bad: "stroke-rose-500",
  };
  return (
    <div
      className="flex min-w-0 items-center gap-3"
      role="progressbar"
      aria-label={label ?? "Progress"}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={ariaValueText ?? `${value}%`}
    >
      <AnimatedRing
        value={value}
        size={size}
        strokeWidth={strokeWidth}
        trackClassName="stroke-slate-200 dark:stroke-slate-700"
        progressClassName={strokes[tone]}
      >
        <span aria-hidden="true" className="text-lg font-extrabold tabular-nums text-slate-900 dark:text-white">{value}%</span>
      </AnimatedRing>
      {(label || caption) && (
        <div className="min-w-0">
          {label && <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{label}</p>}
          {caption && <p className="mt-0.5 break-words text-sm text-slate-500 dark:text-slate-400">{caption}</p>}
        </div>
      )}
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <p className="rounded-control border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
      {message}
    </p>
  );
}

/**
 * Inline, dismissible failure banner.
 *
 * Replaces native `alert()` in the journey panels: a browser popup freezes the
 * whole page (and is blocked entirely in some embedded webviews), while the
 * failure itself is almost always "the save didn't go through — try again".
 * The caller keeps the message in state and clears it on retry.
 */
export function InlineAlert({
  message,
  onDismiss,
  className = "",
}: {
  message: string;
  onDismiss?: () => void;
  className?: string;
}) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className={`flex items-start justify-between gap-3 rounded-surface border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300 ${className}`}
    >
      <span className="flex items-start gap-1.5">
        <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {message}
      </span>
      {onDismiss && (
        <Button variant="unstyled"
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="rounded-control p-0.5 text-rose-700 transition-colors hover:bg-rose-100 dark:text-rose-300 dark:hover:bg-rose-900/50"
        >
          <XCircle className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

/** Colours, hover and the indigo focus halo come from `.sb-field` (globals.css),
 *  identical in both themes: white + slate-300 on light, a recessed well on dark. */
export const inputClass = "sb-field w-full rounded-control border px-3 py-2 text-sm text-slate-900 outline-none";

/** "in 4 days" / "today" / "3 days ago" — the format the spec asks for. */
export function daysLabel(days: number | null, locale: string = "en"): string {
  // `dictionaries` only carries English plus whatever locale the provider has
  // registered; an unloaded language falls back to English, never to a crash.
  const m = (isLocale(locale) ? dictionaries[locale] : undefined)?.journey ?? dictionaries.en.journey;
  if (days == null) return m.daysNoDate;
  if (days === 0) return m.daysToday;
  if (days === 1) return m.daysTomorrow;
  if (days === -1) return m.daysYesterday;
  if (days > 0) return m.daysLeft.replace("{n}", String(days));
  return m.daysAgo.replace("{n}", String(Math.abs(days)));
}

export function toneForDays(days: number | null): "good" | "warn" | "bad" | "slate" {
  if (days == null) return "slate";
  if (days < 0) return "bad";
  if (days <= 14) return "warn";
  return "good";
}
