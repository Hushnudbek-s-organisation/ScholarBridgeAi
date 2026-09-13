"use client";

import React from "react";

/**
 * Tiny dependency-free chart primitives for the admin Analytics dashboard.
 * Everything is inline SVG scaled with a viewBox, so it stays crisp on any
 * screen and needs no chart library.
 */

const W = 720;
const H = 190;
const PAD = { top: 16, right: 12, bottom: 26, left: 12 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

export interface ChartPoint {
  /** Short x-axis label (e.g. "12.09"). */
  label: string;
  /** Full label used in the tooltip (e.g. "12-sentabr, 2026"). */
  title?: string;
  value: number;
  secondary?: number;
}

/** 1 234 567 → "1.2M" style compact number for chart axes. */
export function compactNumber(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}K`;
  return String(Math.round(n));
}

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "0";
  return n.toLocaleString("en-US");
}

/** Money with thousands separators (payments are stored in UZS by default). */
export function formatMoney(n: number | null | undefined, currency = "UZS"): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return `0 ${currency}`;
  return `${n.toLocaleString("en-US")} ${currency}`;
}

const xAt = (i: number, total: number) => PAD.left + (i + 0.5) * (PLOT_W / Math.max(1, total));
const yAt = (v: number, max: number) => PAD.top + PLOT_H - (max > 0 ? (v / max) * PLOT_H : 0);

function Grid({ max }: { max: number }) {
  return (
    <g>
      {[0, 0.5, 1].map((f) => {
        const y = PAD.top + PLOT_H - f * PLOT_H;
        return (
          <g key={f}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="#e2e8f0" strokeWidth={1} strokeDasharray={f === 0 ? "0" : "3 4"} />
            <text x={PAD.left + 2} y={y - 4} fontSize={10} fill="#94a3b8" fontWeight={600}>
              {compactNumber(max * f)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function XLabels({ points }: { points: ChartPoint[] }) {
  const step = Math.max(1, Math.ceil(points.length / 7));
  return (
    <g>
      {points.map((p, i) =>
        i % step === 0 || i === points.length - 1 ? (
          <text key={`${p.label}-${i}`} x={xAt(i, points.length)} y={H - 8} fontSize={10} fill="#94a3b8" fontWeight={600} textAnchor="middle">
            {p.label}
          </text>
        ) : null
      )}
    </g>
  );
}

export function ChartEmpty({ label }: { label: string }) {
  return (
    <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-400">
      {label}
    </div>
  );
}

/**
 * Bars for `value` + an optional line for `secondary` (e.g. views vs unique
 * visitors). Native SVG `<title>` elements provide the hover tooltip.
 */
export function BarLineChart({
  points,
  barColor = "#6366f1",
  lineColor = "#10b981",
  barName = "Views",
  lineName = "Visitors",
  emptyLabel = "No data yet",
}: {
  points: ChartPoint[];
  barColor?: string;
  lineColor?: string;
  barName?: string;
  lineName?: string;
  emptyLabel?: string;
}) {
  if (!points.length) return <ChartEmpty label={emptyLabel} />;

  const max = Math.max(1, ...points.map((p) => Math.max(p.value, p.secondary ?? 0)));
  const barW = Math.max(2, Math.min(28, (PLOT_W / points.length) * 0.6));
  const hasLine = points.some((p) => typeof p.secondary === "number");
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${xAt(i, points.length)},${yAt(p.secondary ?? 0, max)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${barName} / ${lineName} chart`}>
      <Grid max={max} />
      {points.map((p, i) => (
        <rect
          key={`bar-${i}`}
          x={xAt(i, points.length) - barW / 2}
          y={yAt(p.value, max)}
          width={barW}
          height={Math.max(0, PAD.top + PLOT_H - yAt(p.value, max))}
          rx={Math.min(3, barW / 2)}
          fill={barColor}
          opacity={0.85}
        >
          <title>{`${p.title ?? p.label} — ${barName}: ${formatNumber(p.value)}${hasLine ? ` · ${lineName}: ${formatNumber(p.secondary ?? 0)}` : ""}`}</title>
        </rect>
      ))}
      {hasLine && (
        <>
          <path d={linePath} fill="none" stroke={lineColor} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {points.map((p, i) => (
            <circle key={`dot-${i}`} cx={xAt(i, points.length)} cy={yAt(p.secondary ?? 0, max)} r={points.length > 40 ? 0 : 2.5} fill={lineColor}>
              <title>{`${p.title ?? p.label} — ${lineName}: ${formatNumber(p.secondary ?? 0)}`}</title>
            </circle>
          ))}
        </>
      )}
      <XLabels points={points} />
    </svg>
  );
}

/** Smooth-ish area chart for a single series (e.g. signups per day). */
export function AreaChart({
  points,
  color = "#f59e0b",
  name = "Signups",
  emptyLabel = "No data yet",
}: {
  points: ChartPoint[];
  color?: string;
  name?: string;
  emptyLabel?: string;
}) {
  if (!points.length) return <ChartEmpty label={emptyLabel} />;

  const max = Math.max(1, ...points.map((p) => p.value));
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${xAt(i, points.length)},${yAt(p.value, max)}`).join(" ");
  const baseline = PAD.top + PLOT_H;
  const area = `${line} L${xAt(points.length - 1, points.length)},${baseline} L${xAt(0, points.length)},${baseline} Z`;
  const gradientId = `area-${color.replace("#", "")}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${name} chart`}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <Grid max={max} />
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={`pt-${i}`} cx={xAt(i, points.length)} cy={yAt(p.value, max)} r={points.length > 40 ? 0 : 2.5} fill={color}>
          <title>{`${p.title ?? p.label} — ${name}: ${formatNumber(p.value)}`}</title>
        </circle>
      ))}
      <XLabels points={points} />
    </svg>
  );
}

/** Horizontal ranked list with proportional bars (top pages, referrers, ...). */
export function HBarList({
  items,
  color = "bg-indigo-500",
  emptyLabel = "No data yet",
  valueLabel = "views",
}: {
  items: { label: string; value: number; hint?: string }[];
  color?: string;
  emptyLabel?: string;
  valueLabel?: string;
}) {
  if (!items.length) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-[11px] font-semibold text-slate-400">
        {emptyLabel}
      </p>
    );
  }
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item.label}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-[11px] font-bold text-slate-700" title={item.label}>
              {item.label}
            </span>
            <span className="shrink-0 text-[11px] font-extrabold text-slate-900">
              {formatNumber(item.value)}
              <span className="ml-1 font-semibold text-slate-400">{item.hint ?? valueLabel}</span>
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(3, (item.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Small "value + label" tile used inside panels (content inventory etc.). */
export function MiniStat({
  label,
  value,
  hint,
  tone = "slate",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "slate" | "indigo" | "emerald" | "amber" | "rose" | "sky" | "violet";
}) {
  const tones: Record<string, string> = {
    slate: "text-slate-900",
    indigo: "text-indigo-600",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    rose: "text-rose-600",
    sky: "text-sky-600",
    violet: "text-violet-600",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5">
      <p className={`text-lg font-extrabold leading-none ${tones[tone]}`}>{value}</p>
      <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      {hint ? <p className="mt-0.5 text-[10px] text-slate-400">{hint}</p> : null}
    </div>
  );
}

/** White rounded panel with a title row (matches the rest of the admin UI). */
export function Panel({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-xs ${className}`}>
      <header className="mb-3 flex items-start gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-extrabold text-slate-800">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-[11px] text-slate-500">{subtitle}</p> : null}
        </div>
        {action ? <div className="ml-auto shrink-0">{action}</div> : null}
      </header>
      {children}
    </section>
  );
}

/** Green/red pill showing the change vs. the previous period. */
export function DeltaBadge({ value, suffix = "%" }: { value: number | null | undefined; suffix?: string }) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-400">—</span>;
  }
  const up = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
        up ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
      }`}
      title="Oldingi davrga nisbatan o'zgarish"
    >
      {up ? "▲" : "▼"} {Math.abs(value).toLocaleString("en-US")
      }
      {suffix}
    </span>
  );
}
