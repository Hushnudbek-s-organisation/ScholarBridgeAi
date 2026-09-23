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
