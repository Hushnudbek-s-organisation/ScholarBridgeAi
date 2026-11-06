"use client";

import React from "react";
import { cn } from "./cn";

/**
 * §3 — exactly ONE primary action per view, with clearly visible secondary
 * actions. Grouping must never make a secondary action undiscoverable: it
 * stays in the DOM, keyboard reachable, and labelled.
 *
 * Hover/active use `.sb-hover-lift` (transform only, no layout shift, disabled
 * and reduced-motion safe — see globals.css). All actions are real buttons.
 */
export interface ActionItem {
  id: string;
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  title?: string;
}

export function ActionBar({
  primary,
  secondary = [],
  className,
  label,
}: {
  primary: ActionItem;
  secondary?: ActionItem[];
  className?: string;
  /** Accessible name for the group so screen readers know what it controls. */
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("sb-stack flex flex-wrap items-center gap-2", className)}
    >
      <button
        type="button"
        onClick={primary.onClick}
        disabled={primary.disabled}
        title={primary.title}
        className={cn(
          "sb-hover-lift inline-flex min-h-11 items-center justify-center gap-2 rounded-control",
          "bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm",
          "hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
          "disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-400",
        )}
        data-action="primary"
      >
        {primary.icon}
        <span>{primary.label}</span>
      </button>
      {secondary.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={a.onClick}
          disabled={a.disabled}
          title={a.title ?? a.label}
          className={cn(
            "sb-hover-lift inline-flex min-h-11 items-center justify-center gap-2 rounded-control",
            "border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700",
            "hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500",
            "disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
          )}
          data-action="secondary"
          data-action-id={a.id}
        >
          {a.icon}
          <span>{a.label}</span>
        </button>
      ))}
    </div>
  );
}
