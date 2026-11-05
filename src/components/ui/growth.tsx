"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** fetch → JSON with a readable error (API `error` field or HTTP status). */
export async function api<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: init?.body ? { "Content-Type": "application/json", ...(init?.headers ?? {}) } : init?.headers,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    /**
     * Keep the *reason* visible.
     *
     * A 503 from the table gate says "temporarily unavailable", which is true
     * and useless. When the server also classified the failure
     * (`permission_denied`, `read_only`, `core_schema_missing`, …) the message
     * carries it, so the banner itself is actionable instead of a dead end.
     */
    const payload = body as { error?: string; reason?: string | null };
    const reason = typeof payload?.reason === "string" && payload.reason ? ` [${payload.reason}]` : "";
    throw new Error(`${payload?.error || `HTTP ${res.status}`}${reason}`);
  }
  return body as T;
}

/**
 * Section toolbar shared by the growth pages: icon, title, one-line purpose,
 * actions. These pages render INSIDE a destination (HubPage), which already
 * owns the screen's single hero and `<h1>` — so this is a compact `<h2>`
 * toolbar, not a second hero. Standalone screens pass `level="h1"`.
 */
export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  accent = "indigo",
  level = "h2",
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  accent?: "indigo" | "emerald" | "amber" | "violet" | "sky" | "rose";
  level?: "h1" | "h2";
  children?: React.ReactNode;
}) {
  const tone: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-600 ring-indigo-100 dark:ring-indigo-500/25",
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100 dark:ring-emerald-500/25",
    amber: "bg-amber-50 text-amber-600 ring-amber-100 dark:ring-amber-500/25",
    violet: "bg-violet-50 text-violet-600 ring-violet-100 dark:ring-violet-500/25",
    sky: "bg-sky-50 text-sky-600 ring-sky-100 dark:ring-sky-500/25",
    rose: "bg-rose-50 text-rose-600 ring-rose-100 dark:ring-rose-500/25",
  };
  const Heading = level;
  return (
    <div className="sb-surface-card flex flex-col gap-3 rounded-overlay border border-slate-200 bg-white px-4 py-3.5 shadow-xs dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-surface ring-1 ${tone[accent]}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <Heading
            className={
              level === "h1"
                ? "sb-type-h1 text-slate-900"
                : "sb-type-h2 text-slate-900"
            }
          >
            {title}
          </Heading>
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
    <div className="sb-surface-card rounded-overlay border border-slate-200 bg-white p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="sb-type-eyebrow text-slate-500">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-slate-500" />}
      </div>
      <div className={`mt-1 text-2xl font-bold tracking-tight tabular-nums ${color[tone]}`}>{value}</div>
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
    <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={ariaLabel}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <Button variant="unstyled"
            key={o.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.id)}
            className={`inline-flex min-h-11 min-w-0 max-w-full flex-wrap items-center gap-1.5 rounded-surface px-3.5 py-2 text-left text-xs font-semibold transition-colors ${
              active
                ? "sb-btn-primary border border-indigo-600 bg-indigo-600 text-white"
                : "border border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/10"
            }`}
          >
            {o.label}
            {o.count != null && (
              <span className={`rounded-full px-1.5 py-0.5 text-xs ${active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300"}`}>
                {o.count}
              </span>
            )}
          </Button>
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
    <div className="flex flex-col items-center rounded-overlay border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-overlay bg-slate-100 text-slate-500">
        <Icon className="h-6 w-6" />
      </span>
      <p className="mt-3 text-sm font-bold text-slate-800">{title}</p>
      {body && <p className="mt-1 max-w-md text-sm leading-relaxed text-slate-500">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-overlay border border-slate-200 bg-white px-4 py-10 text-sm text-slate-500">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}

export function ErrorNote({ message, onRetry, retryLabel }: { message: string; onRetry?: () => void; retryLabel?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-surface border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700" role="alert">
      <span>{message}</span>
      {onRetry && (
        <Button variant="unstyled" onClick={onRetry} className="rounded-control border border-rose-200 bg-white px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100">
          {retryLabel ?? "Retry"}
        </Button>
      )}
    </div>
  );
}

/** Field colours, hover and focus halo come from `.sb-field` (globals.css). */
export const inputCls = "sb-field w-full rounded-surface border px-3 py-2.5 text-sm text-slate-900 focus:outline-none";

export const labelCls = "mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500";

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

/** Tiny toast shown bottom-centre (above the phone tab bar). */
export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[80] flex justify-center px-4 lg:bottom-6" role="status" aria-live="polite">
      <div className="rounded-surface bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-lg">{message}</div>
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
