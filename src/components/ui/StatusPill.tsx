"use client";

import React from "react";
import { cn } from "./cn";

/**
 * §3 / §4 — a status signal that is NEVER colour alone.
 *
 * Every variant carries a text label AND a shape cue (icon), so the meaning
 * survives greyscale, low contrast, colour-blindness and a transparent
 * background. Colors are tokens from `globals.css`, not arbitrary hex.
 */
export type StatusTone = "success" | "warning" | "error" | "info" | "neutral" | "pending";

const TONE: Record<StatusTone, { cls: string; icon: string; sr: string }> = {
  success: { cls: "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800", icon: "✓", sr: "Done" },
  warning: { cls: "bg-amber-50 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200 border-amber-200 dark:border-amber-800", icon: "!", sr: "Attention" },
  error:   { cls: "bg-rose-50 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200 border-rose-200 dark:border-rose-800", icon: "✕", sr: "Problem" },
  info:    { cls: "bg-indigo-50 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800", icon: "i", sr: "Information" },
  neutral: { cls: "bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700", icon: "–", sr: "Neutral" },
  pending: { cls: "bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 border-dashed", icon: "○", sr: "Not started" },
};

export function StatusPill({
  tone = "neutral", label, compact = false, className,
}: {
  tone?: StatusTone;
  /** Human words, always visible. A status is never an icon alone. */
  label: string;
  compact?: boolean;
  className?: string;
}) {
  const t = TONE[tone];
  return (
    <span
      className={cn(
        "sb-status inline-flex max-w-full items-center gap-1 rounded-control border px-2 py-0.5 text-xs font-semibold leading-tight",
        t.cls, className,
      )}
      data-status-tone={tone}
    >
      <span aria-hidden="true" className="shrink-0 font-bold">{t.icon}</span>
      <span className="min-w-0 break-words">{label}</span>
      {!compact && <span className="sr-only">{t.sr}</span>}
    </span>
  );
}
