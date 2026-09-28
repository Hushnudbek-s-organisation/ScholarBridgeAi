"use client";

import React from "react";
import { Loader2 } from "lucide-react";

/** fetch → JSON with a readable error (API `error` field or HTTP status). */
export async function api<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: init?.body ? { "Content-Type": "application/json", ...(init?.headers ?? {}) } : init?.headers,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string })?.error || `HTTP ${res.status}`);
  return body as T;
}

/** Section header shared by the growth pages: icon, title, one-line purpose, actions. */
export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  accent = "indigo",
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  accent?: "indigo" | "emerald" | "amber" | "violet" | "sky" | "rose";
  children?: React.ReactNode;
}) {
  const tone: Record<string, string> = {
    indigo: "bg-indigo-600",
    emerald: "bg-emerald-600",
    amber: "bg-amber-500",
    violet: "bg-violet-600",
    sky: "bg-sky-600",
    rose: "bg-rose-600",
  };
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm ${tone[accent]}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
          {subtitle && <p className="mt-0.5 max-w-2xl text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "slate",
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: "slate" | "indigo" | "emerald" | "amber" | "rose" | "violet";
}) {
  const color: Record<string, string> = {
    slate: "text-slate-900",
    indigo: "text-indigo-600",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    rose: "text-rose-600",
    violet: "text-violet-600",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-slate-300" />}
      </div>
      <div className={`mt-1 text-2xl font-black ${color[tone]}`}>{value}</div>
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string; count?: number | null }[];
  ariaLabel?: string;
}) {
  return (
    <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1" role="tablist" aria-label={ariaLabel}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.id)}
            className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-bold transition-colors ${
              active ? "bg-slate-900 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {o.label}
            {o.count != null && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon className="h-6 w-6" />
      </span>
      <p className="mt-3 text-sm font-bold text-slate-800">{title}</p>
      {body && <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-500">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-10 text-sm text-slate-500">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}

export function ErrorNote({ message, onRetry, retryLabel }: { message: string; onRetry?: () => void; retryLabel?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700" role="alert">
      <span>{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100">
          {retryLabel ?? "Retry"}
        </button>
      )}
    </div>
  );
}

export const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100";

export const labelCls = "mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500";

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}

/** Tiny toast shown bottom-centre (above the phone tab bar). */
export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[80] flex justify-center px-4 lg:bottom-6" role="status" aria-live="polite">
      <div className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-lg">{message}</div>
    </div>
  );
}

export function useToast(): [string | null, (msg: string) => void] {
  const [msg, setMsg] = React.useState<string | null>(null);
  const timer = React.useRef<number | null>(null);
  const show = React.useCallback((m: string) => {
    setMsg(m);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(null), 2600);
  }, []);
  React.useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);
  return [msg, show];
}
