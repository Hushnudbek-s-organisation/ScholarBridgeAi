function words(value: string): string[] {
  return value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").match(/[\p{L}\p{N}]+/gu) ?? [];
}

function oneEditApart(query: string, word: string): boolean {
  if (query.length < 4 || Math.abs(query.length - word.length) > 1) return false;
  let index = 0;
  while (index < query.length && query[index] === word[index]) index++;
  if (query.length > word.length) return query.slice(index + 1) === word.slice(index);
  if (query.length < word.length) return query.slice(index) === word.slice(index + 1);
  return query.slice(index + 1) === word.slice(index + 1) || (
    query[index] === word[index + 1] &&
    query[index + 1] === word[index] &&
    query.slice(index + 2) === word.slice(index + 2)
  );
}

/** Preserve exact results. Try a bounded typo fallback only when they are empty. */
export function findCatalogueMatches<T>(
  rows: T[],
  search: string,
  exact: (row: T) => boolean,
  getNames: (row: T) => (string | null | undefined)[],
): T[] {
  const matches = rows.filter(exact);
  if (matches.length) return matches;
  const terms = words(search).filter((term) => term.length <= 50);
  if (!terms.length || terms.length > 8 || !terms.some((term) => term.length >= 4)) return [];
  return rows.filter((row) => {
    const candidates = words(getNames(row).filter(Boolean).join(" "));
    return terms.every((term) => candidates.some((word) => word.startsWith(term) || oneEditApart(term, word)));
  });
}
