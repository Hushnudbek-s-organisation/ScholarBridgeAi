"use client";

import { Suspense } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  /** 1-based active page (from `?page=`). */
  currentPage: number;
  /** Total number of pages (`Math.ceil(totalCount / itemsPerPage)`). */
  totalPages: number;
  /** Page numbers shown on each side of the active page. Default: 1 (Google-style). */
  siblingCount?: number;
  /**
   * Optional client-side mode: when provided, renders `<button>`s calling
   * `onPageChange(page)` instead of `<Link>`s - for tab views without URL
   * routing (dashboard UniversityExplorer / ScholarshipHub). When omitted,
   * the classic `?page=` link mode is used (server-rendered pages).
   */
  onPageChange?: (page: number) => void;
}

type PageItem = number | "ellipsis-start" | "ellipsis-end";

/**
 * Google-style page window: always shows the first & last page plus a
 * sliding window around the current page, e.g.
 *   1 … 4 [5] 6 … 20
 */
function getPageItems(
  current: number,
  total: number,
  siblingCount: number,
): PageItem[] {
  // Small result sets: show every page, no ellipsis needed.
  if (total <= siblingCount * 2 + 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const left = Math.max(2, current - siblingCount);
  const right = Math.min(total - 1, current + siblingCount);

  const items: PageItem[] = [1];
  if (left > 2) items.push("ellipsis-start");
  for (let p = left; p <= right; p++) items.push(p);
  if (right < total - 1) items.push("ellipsis-end");
  items.push(total);
  return items;
}

const numberButtonClass = (isActive: boolean) =>
  [
    "inline-flex h-10 min-w-10 items-center justify-center rounded-lg border px-3 text-sm font-medium transition-colors",
    isActive
      ? "border-blue-600 bg-blue-600 text-white shadow-xs"
      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
  ].join(" ");

interface PageControlProps {
  page: number;
  /** `?page=` URL for link mode (ignored when `onSelect` is set). */
  href: string;
  /** When set, renders a `<button>` calling `onSelect(page)` instead. */
  onSelect?: (page: number) => void;
  className: string;
  ariaLabel: string;
  ariaCurrent?: "page";
  children: ReactNode;
}

// One clickable element for both modes: <Link> for `?page=` server pages,
// <button> when the parent drives pagination via state (`onPageChange`).
function PageControl({
  page,
  href,
  onSelect,
  className,
  ariaLabel,
  ariaCurrent,
  children,
}: PageControlProps) {
  if (onSelect) {
    return (
      <button
        type="button"
        onClick={() => onSelect(page)}
        className={`${className} cursor-pointer`}
        aria-label={ariaLabel}
        aria-current={ariaCurrent}
      >
        {children}
      </button>
    );
  }
  return (
    <Link
      href={href}
      className={className}
      aria-label={ariaLabel}
      aria-current={ariaCurrent}
    >
      {children}
    </Link>
  );
}

function PaginationInner({
  currentPage,
  totalPages,
  siblingCount = 1,
  onPageChange,
}: PaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const pageItems = getPageItems(currentPage, totalPages, siblingCount);

  // Preserve every existing query param (filters, search, …) and only
  // change `page`. Page 1 uses the canonical URL without `?page=1`.
  const createPageHref = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) params.delete("page");
    else params.set("page", String(page));
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < totalPages;

  const arrowClass = (enabled: boolean) =>
    [
      "inline-flex h-10 items-center gap-1 rounded-lg border px-3 text-sm font-medium transition-colors",
      enabled
        ? "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
        : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300",
    ].join(" ");

  return (
    <nav
      aria-label="Pagination"
      className="mt-8 flex flex-wrap items-center justify-center gap-1.5"
    >
      {hasPrevious ? (
        <PageControl
          page={currentPage - 1}
          href={createPageHref(currentPage - 1)}
          onSelect={onPageChange}
          className={arrowClass(true)}
          ariaLabel="Go to previous page"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Previous</span>
        </PageControl>
      ) : (
        <span className={arrowClass(false)} aria-disabled="true">
          <ChevronLeft className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Previous</span>
        </span>
      )}

      {pageItems.map((item) =>
        item === "ellipsis-start" || item === "ellipsis-end" ? (
          <span
            key={item}
            aria-hidden="true"
            className="inline-flex h-10 min-w-10 items-center justify-center px-1 text-sm text-slate-400"
          >
            …
          </span>
        ) : (
          <PageControl
            key={item}
            page={item}
            href={createPageHref(item)}
            onSelect={onPageChange}
            ariaLabel={`Go to page ${item}`}
            ariaCurrent={item === currentPage ? "page" : undefined}
            className={numberButtonClass(item === currentPage)}
          >
            {item}
          </PageControl>
        ),
      )}

      {hasNext ? (
        <PageControl
          page={currentPage + 1}
          href={createPageHref(currentPage + 1)}
          onSelect={onPageChange}
          className={arrowClass(true)}
          ariaLabel="Go to next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" aria-hidden />
        </PageControl>
      ) : (
        <span className={arrowClass(false)} aria-disabled="true">
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" aria-hidden />
        </span>
      )}
    </nav>
  );
}

/**
 * Reusable Google-style pagination (Client Component).
 *
 * Reads the current route via `usePathname()` / `useSearchParams()`, so it
 * works on ANY page that uses `?page=` for server-side pagination — just pass
 * `currentPage` + `totalPages` from your Server Component:
 *
 *   <Pagination currentPage={currentPage} totalPages={totalPages} />
 *
 * Client-side (state-driven) mode for tab views without URL routing:
 *
 *   <Pagination currentPage={page} totalPages={total} onPageChange={setPage} />
 *
 * Wrapped in `<Suspense>` so it's safe to drop into statically-rendered
 * pages too (`useSearchParams()` requires a Suspense boundary).
 */
export function Pagination(props: PaginationProps) {
  return (
    <Suspense
      fallback={
        <div
          aria-hidden="true"
          className="mt-8 flex items-center justify-center gap-1.5"
        >
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className="h-10 w-10 animate-pulse rounded-lg bg-slate-100"
            />
          ))}
        </div>
      }
    >
      <PaginationInner {...props} />
    </Suspense>
  );
}
