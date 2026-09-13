"use client";

import React from "react";
import { DeltaBadge, formatNumber } from "./charts";

/**
 * KPI tile used across the analytics dashboard.
 * Label is English (like the rest of the admin panel) + an Uzbek caption so
 * the owner can read every metric without guessing.
 */
export function StatCard({
  icon,
  label,
  uz,
  value,
  delta,
  hint,
  accent = "bg-indigo-50 text-indigo-600",
  loading = false,
  raw = false,
}: {
  icon: React.ReactNode;
  label: string;
  uz?: string;
  value: number | string | null | undefined;
  delta?: number | null;
  hint?: string;
  accent?: string;
  loading?: boolean;
  /** When true the value is already formatted (money, %, text). */
  raw?: boolean;
}) {
  const display = loading
    ? "—"
    : value === null || value === undefined
      ? "—"
      : raw || typeof value === "string"
        ? value
        : formatNumber(value);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-shadow hover:shadow-sm">
      <div className="flex items-start gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${accent}`}>{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-extrabold uppercase tracking-wide text-slate-400" title={uz ?? label}>
            {label}
          </p>
          <p className="mt-0.5 truncate text-2xl font-extrabold leading-tight text-slate-900" title={String(display)}>
            {display}
          </p>
        </div>
        {delta !== undefined ? <DeltaBadge value={delta} /> : null}
      </div>
      {uz ? <p className="mt-2 truncate text-[10px] font-semibold text-slate-400">{uz}</p> : null}
      {hint ? <p className="mt-1 truncate text-[11px] font-semibold text-slate-500">{hint}</p> : null}
    </div>
  );
}
