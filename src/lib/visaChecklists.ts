/**
 * REGIONAL SUPER POWERS — embassy document checklists for the destinations a
 * Tashkent applicant actually applies to (Pillar 5.3).
 *
 * The checklist is deliberately *items only*: what to bring to the appointment,
 * matched to the country the student typed, with the official embassy page as
 * the source. Every line lives in the `visaChecklist` namespace of en/uz/ru;
 * this module holds the structure (country codes, aliases, official URLs, item
 * counts) so the UI, the tests and the translation files cannot drift apart.
 *
 * The list is NEVER a promise of a visa: the panel always renders the
 * "requirements change — confirm on the official page" note.
 */

export interface EmbassyChecklist {
  /** Canonical country name used by the visa requirements API. */
  country: string;
  /** Official embassy / visa-centre page. */
  url: string;
  /** Number of i18n item keys that must exist (checked by test:regional). */
  items: number;
  /** Lower-cased name fragments that select this checklist. */
  aliases: string[];
}

export const EMBASSY_CHECKLISTS: readonly EmbassyChecklist[] = [
  {
    country: "USA",
    url: "https://uz.usembassy.gov",
    items: 6,
    aliases: ["usa", "us", "u.s.", "u.s.a.", "united states", "america", "aqsh", "сша"],
  },
  {
    country: "Germany",
    url: "https://tashkent.diplo.de",
    items: 6,
    aliases: ["germany", "deutschland", "germaniya", "германия", "germaniyə"],
  },
  {
    country: "South Korea",
    url: "https://overseas.mofa.go.kr",
    items: 6,
    aliases: ["south korea", "korea", "koreya", "корея", "korea respublikasi"],
  },
  {
    country: "UK",
    url: "https://www.gov.uk/student-visa",
    items: 6,
    aliases: ["uk", "u.k.", "united kingdom", "britain", "great britain", "england", "buyuk britaniya", "великобритания"],
  },
] as const;

export const EMBASSY_CHECKLIST_COUNTRIES: readonly string[] = EMBASSY_CHECKLISTS.map((c) => c.country);

const norm = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Find the checklist for whatever the student typed ("AQSh", "usa",
 * "Buyuk Britaniya", …). Returns null when the country has no checklist yet —
 * the UI then shows nothing rather than a guessed list.
 */
export function embassyChecklistFor(country: string | null | undefined): EmbassyChecklist | null {
  if (!country) return null;
  const q = norm(country);
  if (!q) return null;
  const exact = EMBASSY_CHECKLISTS.find((c) => norm(c.country) === q);
  if (exact) return exact;
  const byAlias = EMBASSY_CHECKLISTS.find((c) => c.aliases.some((a) => a === q));
  if (byAlias) return byAlias;
  // Substring match only for aliases of two characters or more, so "us" cannot
  // hijack "australia" and "uk" cannot hijack "ukraine".
  return (
    EMBASSY_CHECKLISTS.find((c) =>
      c.aliases.some((a) => a.length >= 3 && (q.includes(a) || a.includes(q)))
    ) ?? null
  );
}

/** i18n key inside the `visaChecklist` namespace, e.g. `USA.item0`. */
export function visaChecklistItemKey(country: string, index: number): string {
  return `${country}.item${index}`;
}

export function visaChecklistNameKey(country: string): string {
  return `${country}.name`;
}

/** Never-empty guard for the item list the UI maps over. */
export function embassyChecklistItems(checklist: EmbassyChecklist | null): number[] {
  if (!checklist) return [];
  return Array.from({ length: checklist.items }, (_, i) => i);
}
