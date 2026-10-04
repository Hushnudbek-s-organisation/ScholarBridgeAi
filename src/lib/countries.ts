/**
 * Shared, additive country/territory options requested for the QS top-200
 * destination set. `value` follows the app's existing stored/API convention
 * (English country names); `key` is the locale-independent message key.
 *
 * China is kept as the app's existing canonical value, while its display name
 * is explicit about the Mainland so Hong Kong SAR and Taiwan stay distinct.
 */
export const QS_TOP_200_COUNTRIES = [
  { value: "Argentina", key: "argentina", code: "AR", flag: "🇦🇷" },
  { value: "Australia", key: "australia", code: "AU", flag: "🇦🇺" },
  { value: "Austria", key: "austria", code: "AT", flag: "🇦🇹" },
  { value: "Belgium", key: "belgium", code: "BE", flag: "🇧🇪" },
  { value: "Brazil", key: "brazil", code: "BR", flag: "🇧🇷" },
  { value: "Canada", key: "canada", code: "CA", flag: "🇨🇦" },
  { value: "Chile", key: "chile", code: "CL", flag: "🇨🇱" },
  {
    value: "China",
    key: "chinaMainland",
    code: "CN",
    flag: "🇨🇳",
    aliases: ["China (Mainland)", "Mainland China", "China Mainland", "People's Republic of China", "PRC"],
  },
  { value: "Denmark", key: "denmark", code: "DK", flag: "🇩🇰" },
  { value: "Finland", key: "finland", code: "FI", flag: "🇫🇮" },
  { value: "France", key: "france", code: "FR", flag: "🇫🇷" },
  { value: "Germany", key: "germany", code: "DE", flag: "🇩🇪" },
  {
    value: "Hong Kong SAR",
    key: "hongKongSar",
    code: "HK",
    flag: "🇭🇰",
    aliases: ["Hong Kong", "Hong Kong Special Administrative Region", "Hong Kong SAR, China"],
  },
  { value: "India", key: "india", code: "IN", flag: "🇮🇳" },
  { value: "Indonesia", key: "indonesia", code: "ID", flag: "🇮🇩" },
  { value: "Ireland", key: "ireland", code: "IE", flag: "🇮🇪" },
  { value: "Italy", key: "italy", code: "IT", flag: "🇮🇹" },
  { value: "Japan", key: "japan", code: "JP", flag: "🇯🇵" },
  { value: "Kazakhstan", key: "kazakhstan", code: "KZ", flag: "🇰🇿" },
  { value: "Malaysia", key: "malaysia", code: "MY", flag: "🇲🇾" },
  { value: "Mexico", key: "mexico", code: "MX", flag: "🇲🇽" },
  { value: "Netherlands", key: "netherlands", code: "NL", flag: "🇳🇱" },
  { value: "New Zealand", key: "newZealand", code: "NZ", flag: "🇳🇿" },
  { value: "Norway", key: "norway", code: "NO", flag: "🇳🇴" },
  { value: "Qatar", key: "qatar", code: "QA", flag: "🇶🇦" },
  {
    value: "Russia",
    key: "russia",
    code: "RU",
    flag: "🇷🇺",
    aliases: ["Russian Federation"],
  },
  { value: "Saudi Arabia", key: "saudiArabia", code: "SA", flag: "🇸🇦" },
  { value: "Singapore", key: "singapore", code: "SG", flag: "🇸🇬" },
  { value: "South Africa", key: "southAfrica", code: "ZA", flag: "🇿🇦" },
  {
    value: "South Korea",
    key: "southKorea",
    code: "KR",
    flag: "🇰🇷",
    aliases: ["Republic of Korea", "Korea, Republic of", "Korea, South", "Korea South"],
  },
  { value: "Spain", key: "spain", code: "ES", flag: "🇪🇸" },
  { value: "Sweden", key: "sweden", code: "SE", flag: "🇸🇪" },
  { value: "Switzerland", key: "switzerland", code: "CH", flag: "🇨🇭" },
  {
    value: "Taiwan",
    key: "taiwan",
    code: "TW",
    flag: "🇹🇼",
    aliases: ["Taiwan, Province of China", "Chinese Taipei"],
  },
  {
    value: "United Arab Emirates",
    key: "unitedArabEmirates",
    code: "AE",
    flag: "🇦🇪",
    aliases: ["UAE"],
  },
  {
    value: "United Kingdom",
    key: "unitedKingdom",
    code: "GB",
    flag: "🇬🇧",
    aliases: ["UK", "Great Britain", "Britain", "United Kingdom of Great Britain and Northern Ireland"],
  },
  {
    value: "United States",
    key: "unitedStates",
    code: "US",
    flag: "🇺🇸",
    aliases: ["USA", "U.S.", "U.S.A.", "United States of America"],
  },
] as const;

export type CountryNameKey = (typeof QS_TOP_200_COUNTRIES)[number]["key"];
export type CountryTranslationKey = CountryNameKey | "europeanUnion";
export type QsCountryOption = (typeof QS_TOP_200_COUNTRIES)[number];

const COUNTRY_KEY_BY_ALIAS = new Map<string, CountryTranslationKey>();
for (const country of QS_TOP_200_COUNTRIES) {
  for (const alias of [country.value, country.code, ...("aliases" in country ? country.aliases : [])]) {
    COUNTRY_KEY_BY_ALIAS.set(normalizeCountryAlias(alias), country.key);
  }
}
COUNTRY_KEY_BY_ALIAS.set("uk", "unitedKingdom");
COUNTRY_KEY_BY_ALIAS.set("us", "unitedStates");
COUNTRY_KEY_BY_ALIAS.set("eu", "europeanUnion");
COUNTRY_KEY_BY_ALIAS.set("europeanunion", "europeanUnion");

/** Normalize a country label or code for matching, without changing stored data. */
export function normalizeCountryAlias(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");
}

/** Return the message key for a known name, code, or common alias. */
export function countryTranslationKey(value: string): CountryTranslationKey | null {
  return COUNTRY_KEY_BY_ALIAS.get(normalizeCountryAlias(value)) ?? null;
}

/** Country labels compare by known identity first, then by normalized raw name. */
export function countriesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = (a ?? "").trim();
  const right = (b ?? "").trim();
  if (!left || !right) return false;
  const leftKey = countryTranslationKey(left);
  const rightKey = countryTranslationKey(right);
  if (leftKey && rightKey) return leftKey === rightKey;
  const leftAlias = normalizeCountryAlias(left);
  const rightAlias = normalizeCountryAlias(right);
  return !!leftAlias && leftAlias === rightAlias;
}

/** Return shared flag/code metadata for any recognized name or alias. */
export function qsCountryOption(value: string): QsCountryOption | undefined {
  const key = countryTranslationKey(value);
  return key ? QS_TOP_200_COUNTRIES.find((country) => country.key === key) : undefined;
}

/**
 * Preserve existing values and their ordering; append only missing QS entries.
 * Equivalent legacy names/codes reuse the first existing selectable value.
 */
export function withQsTop200Countries(existing: readonly string[]): string[] {
  const options: string[] = [];
  const seen = new Set<string>();

  for (const value of existing) {
    const identity = countryTranslationKey(value) ?? normalizeCountryAlias(value);
    if (!identity || seen.has(identity)) continue;
    options.push(value);
    seen.add(identity);
  }

  for (const country of QS_TOP_200_COUNTRIES) {
    if (seen.has(country.key)) continue;
    options.push(country.value);
    seen.add(country.key);
  }

  return options;
}
