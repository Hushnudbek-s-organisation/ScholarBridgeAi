/**
 * Country labels.
 *
 * Students pick countries in onboarding and in the profile editor, and the app
 * stores the English name (the matching logic compares against university
 * records, which are English). The label shown on screen is translated through
 * the `countries` message namespace, so the stored value never changes with the
 * UI language — only what the student reads does.
 */

/** Canonical stored name → message key inside the `countries` namespace. */
export const COUNTRY_CODES: Record<string, string> = {
  "United States": "us",
  "United Kingdom": "uk",
  Canada: "ca",
  Germany: "de",
  Australia: "au",
  Singapore: "sg",
  Netherlands: "nl",
  Switzerland: "ch",
  Japan: "jp",
  France: "fr",
  Sweden: "se",
  "South Korea": "kr",
  "United Arab Emirates": "ae",
  China: "cn",
  "New Zealand": "nz",
  Ireland: "ie",
  Italy: "it",
  Spain: "es",
  "Czech Republic": "cz",
  Poland: "pl",
  Hungary: "hu",
  Turkey: "tr",
  Malaysia: "my",
  "Hong Kong": "hk",
};

/** Message key for a stored country name, or null when it is not a known country. */
export function countryCodeFor(name: string | null | undefined): string | null {
  if (!name) return null;
  return COUNTRY_CODES[name.trim()] ?? null;
}
