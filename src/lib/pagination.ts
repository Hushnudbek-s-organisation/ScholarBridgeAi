/** 8 rows × 3 columns (md:grid-cols-3). Reflows to 12 rows at grid-cols-2. */
export const ROWS_PER_PAGE = 8;
export const COLUMNS_PER_ROW = 3;
export const ITEMS_PER_PAGE = ROWS_PER_PAGE * COLUMNS_PER_ROW; // 24

/** Parse `?page=` safely → positive integer, defaults to 1. */
export function parsePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/**
 * Supabase `.range(from, to)` is INCLUSIVE on both ends.
 * page 1 → [0, 23], page 2 → [24, 47], page N → [(N-1)*24, N*24-1]
 */
export function getRange(page: number, perPage = ITEMS_PER_PAGE) {
  const from = (page - 1) * perPage;
  return { from, to: from + perPage - 1 };
}

/** Max items a single API page may return (abuse guard for `?perPage=`). */
export const MAX_PER_PAGE = 100;

/** Parse `?perPage=` safely → integer within [1, MAX_PER_PAGE]. */
export function parsePerPage(
  raw: string | null | undefined,
  fallback = ITEMS_PER_PAGE,
): number {
  const n = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(MAX_PER_PAGE, Math.max(1, Math.floor(n)));
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

/**
 * Slice an already-filtered + already-sorted array into one page.
 * Out-of-range pages are clamped to the last valid page (never empty
 * when data exists), so the client can sync `page` from the response.
 */
export function paginateArray<T>(
  all: T[],
  requestedPage: number,
  perPage: number,
): PaginatedResult<T> {
  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const from = (page - 1) * perPage;
  return {
    items: all.slice(from, from + perPage),
    total,
    page,
    perPage,
    totalPages,
  };
}

/**
 * Opt-in pagination wrapper for list APIs (`/api/universities`,
 * `/api/scholarships`). When the client passes `?page=` and/or `?perPage=`,
 * returns `{ [key]: sliced, total, page, perPage, totalPages }`; otherwise
 * returns `{ [key]: all }` untouched, so existing consumers (admin tools,
 * dashboard widgets, …) keep receiving the full list.
 */
export function paginatedPayload<T>(
  key: string,
  all: T[],
  searchParams: URLSearchParams,
): Record<string, unknown> {
  if (
    searchParams.get("page") === null &&
    searchParams.get("perPage") === null
  ) {
    return { [key]: all };
  }
  const perPage = parsePerPage(searchParams.get("perPage"));
  const paged = paginateArray(
    all,
    parsePage(searchParams.get("page") ?? undefined),
    perPage,
  );
  return {
    [key]: paged.items,
    total: paged.total,
    page: paged.page,
    perPage: paged.perPage,
    totalPages: paged.totalPages,
  };
}

/** Normalize trusted/internal pagination without allowing NaN or unbounded SQL. */
export function boundedPageInteger(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(n) && n >= min ? Math.min(n, max) : fallback;
}

/** URL inputs are validated, not silently coerced to a different request. */
export function parsePagination(params: URLSearchParams, defaultLimit = 100) {
  const rawLimit = params.get("limit");
  const rawOffset = params.get("offset");
  const limit = rawLimit === null ? defaultLimit : Number(rawLimit);
  const offset = rawOffset === null ? 0 : Number(rawOffset);
  if (rawLimit?.trim() === "" || rawOffset?.trim() === "" || !Number.isSafeInteger(limit) || limit < 1 || !Number.isSafeInteger(offset) || offset < 0 || offset > 100_000) {
    return { ok: false as const, error: "limit must be a positive integer; offset must be an integer from 0 to 100000" };
  }
  return { ok: true as const, limit: Math.min(limit, 500), offset };
}

/** PostgreSQL serial/integer IDs, never booleans, arrays or partial strings. */
export function postgresId(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !/^[0-9]+$/.test(value)) return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 && id <= 2_147_483_647 ? id : null;
}
