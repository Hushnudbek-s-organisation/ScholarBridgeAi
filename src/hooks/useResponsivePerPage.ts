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
  /** Columns from `xl` (1280px) up. */
  xl?: number;
  /** Columns from `2xl` (1536px) up. */
  "2xl"?: number;
}

function computePerPage(
  base: number,
  md: number,
  lg: number,
  xl: number,
  twoXl: number,
  rows: number,
): number {
  if (typeof window === "undefined") return base * rows;
  if (window.matchMedia("(min-width: 1536px)").matches) return twoXl * rows;
  if (window.matchMedia("(min-width: 1280px)").matches) return xl * rows;
  if (window.matchMedia("(min-width: 1024px)").matches) return lg * rows;
  if (window.matchMedia("(min-width: 768px)").matches) return md * rows;
  return base * rows;
}

/**
 * Items-per-page that always fills exactly `rows` (default 8) grid rows.
 * Keep these values aligned with the grid's actual Tailwind breakpoints.
 */
export function useResponsivePerPage(
  columns: ResponsiveColumns,
  rowsPerPage = ROWS_PER_PAGE,
): number {
  const { base = 1, md = base, lg = md, xl = lg, "2xl": twoXl = xl } = columns;

  const [perPage, setPerPage] = useState<number>(() =>
    computePerPage(base, md, lg, xl, twoXl, rowsPerPage),
  );

  useEffect(() => {
    const onChange = () =>
      setPerPage(computePerPage(base, md, lg, xl, twoXl, rowsPerPage));
    const queries = [768, 1024, 1280, 1536].map((width) =>
      window.matchMedia(`(min-width: ${width}px)`),
    );
    queries.forEach((query) => query.addEventListener("change", onChange));
    // Sync in case the viewport changed between first render and now.
    onChange();
    return () => queries.forEach((query) => query.removeEventListener("change", onChange));
  }, [base, md, lg, xl, twoXl, rowsPerPage]);

  return perPage;
}
