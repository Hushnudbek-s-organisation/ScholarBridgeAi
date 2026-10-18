import { countriesMatch, normalizeCountryAlias } from "./countries";

/**
 * Shared plumbing for the searchable country pickers (visa simulator grid,
 * country compare, profile modal, onboarding). The pickers all follow one
 * rule: show a SHORT curated list first (search + selection always beat
 * length), expand only on demand.
 */

/** True when `query` matches ANY of `parts` (accent/case-insensitive). */
export function countrySearchMatch(query: string, parts: Array<string | null | undefined>): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const qn = normalizeCountryAlias(q);
  return parts.some((part) => {
    const value = (part ?? "").trim().toLowerCase();
    if (!value) return false;
    return value.includes(q) || (qn.length > 0 && normalizeCountryAlias(value).includes(qn));
  });
}

/**
 * Order a country list for a collapsed picker: currently-selected values
 * first (they must never disappear when collapsed), then the priority ISO-2
 * codes in the given order, then everything else in its original order.
 */
export function rankCountryPicks<T>(
  items: T[],
  opts: {
    isSelected: (item: T) => boolean;
    /** Lowercase ISO-2 (or "gl") priority order, best first. */
    priorityCodes?: string[];
    codeOf: (item: T) => string | null;
  }
): T[] {
  const rank = (item: T): number => {
    if (opts.isSelected(item)) return -1;
    const code = opts.codeOf(item);
    if (code && opts.priorityCodes) {
      const idx = opts.priorityCodes.indexOf(code);
      if (idx >= 0) return idx;
    }
    return 100;
  };
  return [...items].sort((a, b) => rank(a) - rank(b));
}

/**
 * The collapsed window: first `limit` items, PLUS every `keep` item beyond
 * the limit (selected values stay visible in compact mode by design).
 */
export function collapsePicks<T>(items: T[], limit: number, expanded: boolean, keep: (item: T) => boolean): T[] {
  if (expanded || items.length <= limit) return items;
  const head = items.slice(0, limit);
  const inHead = new Set(head);
  const forced = items.slice(limit).filter((item) => keep(item) && !inHead.has(item));
  return [...head, ...forced];
}

/** Identity check with the app's alias-tolerant country matcher. */
export function matchesAnyCountry(value: string | null | undefined, list: readonly string[]): boolean {
  return !!value && list.some((entry) => countriesMatch(entry, value));
}
