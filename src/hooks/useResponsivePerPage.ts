"use client";

import { useEffect, useState } from "react";
import { ROWS_PER_PAGE } from "@/lib/pagination";

export interface ResponsiveColumns {
  /** Columns below the `md` breakpoint (default 1). */
  base?: number;
  /** Columns from `md` (768px) up. */
  md?: number;
  /** Columns from `lg` (1024px) up. */
  lg?: number;
}

function computePerPage(
  base: number,
  md: number,
  lg: number,
  rows: number,
): number {
  if (typeof window === "undefined") return base * rows;
  if (window.matchMedia("(min-width: 1024px)").matches) return lg * rows;
  if (window.matchMedia("(min-width: 768px)").matches) return md * rows;
  return base * rows;
}

/**
 * Items-per-page that always fills exactly `rows` (default 8) grid rows:
 * columns-for-the-current-breakpoint × rows.
 *
 * Pass the SAME column counts as the grid's Tailwind classes, e.g.
 * `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` →
 * `useResponsivePerPage({ base: 1, md: 2, lg: 3 })` → 8 / 16 / 24.
 *
 * The lazy initializer reads the real viewport on the client, so the first
 * fetch already uses the correct page size (no double-fetch on load).
 */
export function useResponsivePerPage(
  columns: ResponsiveColumns,
  rowsPerPage = ROWS_PER_PAGE,
): number {
  const { base = 1, md = base, lg = md } = columns;

  const [perPage, setPerPage] = useState<number>(() =>
    computePerPage(base, md, lg, rowsPerPage),
  );

  useEffect(() => {
    const onChange = () =>
      setPerPage(computePerPage(base, md, lg, rowsPerPage));
    const mdQuery = window.matchMedia("(min-width: 768px)");
    const lgQuery = window.matchMedia("(min-width: 1024px)");
    mdQuery.addEventListener("change", onChange);
    lgQuery.addEventListener("change", onChange);
    // Sync in case the viewport changed between first render and now.
    onChange();
    return () => {
      mdQuery.removeEventListener("change", onChange);
      lgQuery.removeEventListener("change", onChange);
    };
  }, [base, md, lg, rowsPerPage]);

  return perPage;
}
