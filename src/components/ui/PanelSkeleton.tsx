import React from "react";

/** Lightweight loading UI; do not pull every hub primitive into public routes. */
export function PanelSkeleton({
  rows = 3,
  className = "",
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-3 ${className}`} aria-hidden="true">
      <div className="h-5 w-1/3 animate-pulse rounded-control bg-slate-200 dark:bg-slate-700" />
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-20 w-full animate-pulse rounded-overlay border border-slate-200 bg-white dark:border-slate-700 dark:bg-surface"
        />
      ))}
    </div>
  );
}
