import type { CSSProperties } from "react";
import { cn } from "./cn";

const TONES = {
  brand: "bg-indigo-600",
  good: "bg-emerald-600",
  warn: "bg-amber-500",
  bad: "bg-rose-600",
} as const;

export function ProgressFill({
  value,
  className,
  minimum = 0,
  as = "div",
}: {
  value: number;
  className?: string;
  /** Optional visible minimum for non-zero chart shares. */
  minimum?: number;
  /** Use span inside phrasing-content layouts. */
  as?: "div" | "span";
}) {
  const normalized = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const width = normalized > 0 ? Math.max(minimum, normalized) : 0;
  // Data-driven width is the only inline style in the shared progress primitive.
  const fillStyle: CSSProperties = { width: `${width}%` };
  const Component = as;
  return <Component aria-hidden="true" className={cn("h-full rounded-full transition-[width]", className)} style={fillStyle} />;
}

export function ProgressBar({
  value,
  label,
  tone = "brand",
  className,
  fillClassName,
  showValue = false,
}: {
  value: number;
  label: string;
  tone?: keyof typeof TONES;
  className?: string;
  fillClassName?: string;
  showValue?: boolean;
}) {
  const normalized = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (
    <div
      className={cn("h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700", className)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(normalized)}
      aria-valuetext={showValue ? `${Math.round(normalized)}%` : undefined}
    >
      <ProgressFill value={normalized} className={cn(TONES[tone], fillClassName)} />
    </div>
  );
}
