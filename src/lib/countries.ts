import { dictionaries } from "@/i18n/messages";

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

// Runtime localization (uz/ru): register the platform's own translated display
// names as aliases of the same identity keys, so a `country` value that has
// already been localized still resolves through `countryTranslationKey` /
// `countriesMatch` / `qsCountryOption`. No stored data is affected — this only
// widens what the matcher RECOGNIZES. (The keys of `countryNames` are exactly
// the `CountryTranslationKey` union, hence the cast.)
for (const locale of ["uz", "ru"] as const) {
  const names = dictionaries[locale].countryNames as Record<string, string>;
  for (const [key, name] of Object.entries(names)) {
    if (typeof name === "string" && name) {
      COUNTRY_KEY_BY_ALIAS.set(normalizeCountryAlias(name), key as CountryTranslationKey);
    }
  }
}
// In-dictionary names above cover the 38-key set; a few catalog extras that
// localize outside `countryNames` map back to their nearest known identity.
COUNTRY_KEY_BY_ALIAS.set("yevropaittifoqi", "europeanUnion");
COUNTRY_KEY_BY_ALIAS.set("евросоюз", "europeanUnion");
COUNTRY_KEY_BY_ALIAS.set("yevropa", "europeanUnion");

/** Normalize a country label or code for matching, without changing stored data. */
export function normalizeCountryAlias(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    // Keep Latin, digits, and Cyrillic so localized (uz/ru) display names
    // normalize to stable non-empty keys instead of collapsing to "".
    .replace(/[^a-z0-9а-яё]/g, "");
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

/**
 * EU member states, compared by normalized English/romanised alias or by the
 * dictionary key when the label localizes. Used by the scholarship coverage
 * rules: a "European Union" award applies at any EU destination.
 */
const EU_COUNTRY_ALIASES = new Set([
  "austria", "belgium", "bulgaria", "croatia", "cyprus", "czechia", "czechrepublic", "czechrepublic",
  "denmark", "estonia", "finland", "france", "germany", "greece", "hungary", "ireland", "italy",
  "latvia", "lithuania", "luxembourg", "malta", "netherlands", "poland", "portugal", "romania",
  "slovakia", "slovakiarepublic", "slovenia", "espana", "spain", "sweden",
]);
const EU_COUNTRY_KEYS = new Set([
  "austria", "belgium", "bulgaria", "croatia", "cyprus", "czechia", "denmark", "estonia", "finland",
  "france", "germany", "greece", "hungary", "ireland", "italy", "latvia", "lithuania", "luxembourg",
  "malta", "netherlands", "poland", "portugal", "romania", "slovakia", "slovenia", "spain", "sweden",
]);

/** True when the label names an EU member state (aliases/diacritics tolerated). */
export function isEuropeanCountry(value: string | null | undefined): boolean {
  const v = (value ?? "").trim();
  if (!v) return false;
  if (EU_COUNTRY_ALIASES.has(normalizeCountryAlias(v))) return true;
  const key = countryTranslationKey(v);
  return !!key && EU_COUNTRY_KEYS.has(key);
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

/* ==========================================================================
 * Flag/code resolution for EVERY country label the platform stores
 * ==========================================================================
 * `QS_TOP_200_COUNTRIES` is the picker catalogue, but catalogs, saved rows,
 * deadlines and search results carry more identities than it lists
 * (Uzbekistan, Türkiye, the EU as a "country", "Global" award pools …). The
 * map below closes that gap for flag + ISO code rendering only — matching and
 * selection semantics keep using the alias registry above.
 */

export interface ExtraCountryMeta {
  /** Canonical ISO-3166-1 alpha-2 code (upper case), or "GL" for pools. */
  code: string;
  flag: string;
  aliases: readonly string[];
}

/**
 * Extra display identities. Keys double as stable ids; every alias normalizes
 * into the same lookup. "GL" is deliberately not a real ISO code — it is the
 * platform's "open to the whole world" pool marker.
 */
export const EXTRA_COUNTRY_META: Record<string, ExtraCountryMeta> = {
  uzbekistan: {
    code: "UZ",
    flag: "\u{1F1FA}\u{1F1FF}",
    aliases: ["Uzbekistan", "O'zbekiston", "Ozbekiston", "Republic of Uzbekistan", "O‘zbekiston", "Узбекистан", "Республика Узбекистан"],
  },
  europeanUnion: {
    code: "EU",
    flag: "\u{1F1EA}\u{1F1FA}",
    aliases: ["European Union", "Europe", "EU", "Yevropa Ittifoqi", "Yevropa", "Евросоюз", "Европейский союз"],
  },
  turkey: {
    code: "TR",
    flag: "\u{1F1F9}\u{1F1F7}",
    aliases: ["Turkey", "Türkiye", "Turkiye", "Турция"],
  },
  hungary: { code: "HU", flag: "\u{1F1ED}\u{1F1FA}", aliases: ["Hungary", "Vengriya", "Мадиар", "Венгрия"] },
  poland: { code: "PL", flag: "\u{1F1F5}\u{1F1F1}", aliases: ["Poland", "Polyaka", "Польша"] },
  czechRepublic: { code: "CZ", flag: "\u{1F1E8}\u{1F1FF}", aliases: ["Czech Republic", "Czechia", "Chexiya", "Чехия", "Czech"] },
  ukraine: { code: "UA", flag: "\u{1F1FA}\u{1F1E6}", aliases: ["Ukraine", "Ukraina", "Украина"] },
  vietnam: { code: "VN", flag: "\u{1F1FB}\u{1F1F3}", aliases: ["Vietnam", "Viet Nam", "Vyetnam", "Вьетнам"] },
  pakistan: { code: "PK", flag: "\u{1F1F5}\u{1F1F0}", aliases: ["Pakistan", "Пакис­тон", "Пакистан"] },
  bangladesh: { code: "BD", flag: "\u{1F1E7}\u{1F1E9}", aliases: ["Bangladesh", "Banglades", "Бангладеш"] },
  india: { code: "IN", flag: "\u{1F1EE}\u{1F1F3}", aliases: ["India", "Indiya", "Индия"] },
  global: {
    code: "GL",
    flag: "\u{1F30D}",
    aliases: ["Global", "International", "Multiple Countries", "All", "Worldwide", "World", "Dunyo", "Butun dunyo", "Весь мир", "Международные"],
  },
};

const EXTRA_META_BY_ALIAS = new Map<string, ExtraCountryMeta>();
for (const meta of Object.values(EXTRA_COUNTRY_META)) {
  for (const alias of [meta.code, ...meta.aliases]) {
    EXTRA_META_BY_ALIAS.set(normalizeCountryAlias(alias), meta);
  }
}

/** Regional-indicator pair (a flag emoji) → 2-letter code, else null. */
function codeFromFlagEmoji(emoji: string | null | undefined): string | null {
  if (!emoji) return null;
  const codePoints = Array.from(emoji.trim()).map((ch) => ch.codePointAt(0) ?? 0);
  if (codePoints.length !== 2) return null;
  const A = 0x1f1e6;
  if (codePoints[0] < A || codePoints[0] > A + 25 || codePoints[1] < A || codePoints[1] > A + 25) return null;
  return String.fromCharCode(65 + codePoints[0] - A, 65 + codePoints[1] - A).toLowerCase();
}

/**
 * Canonical lowercase ISO-2 for any stored country label: a known name/alias
 * first, a bare 2-letter code as stored, then a flag emoji (fallback or the
 * label itself). Null only when nothing identifies a country.
 */
export function resolveCountryCode(
  countryOrName: string | null | undefined,
  fallbackEmoji?: string | null
): string | null {
  const raw = (countryOrName ?? "").trim();
  if (raw) {
    const opt = qsCountryOption(raw);
    if (opt) return opt.code.toLowerCase();
    const extra = EXTRA_META_BY_ALIAS.get(normalizeCountryAlias(raw));
    if (extra) return extra.code.toLowerCase();
    if (/^[A-Za-z]{2}$/.test(raw)) return raw.toLowerCase();
    const fromLabel = codeFromFlagEmoji(raw);
    if (fromLabel) return fromLabel;
  }
  return codeFromFlagEmoji(fallbackEmoji);
}

/**
 * A trustworthy flag emoji for any country label — never the generic 🌐 when
 * the name identifies a real country (that is exactly how "🌐" sneaks into
 * catalog rows). Falls back to the given emoji, then to 🌐 for the truly
 * unknown.
 */
export function resolveCountryFlagEmoji(
  countryOrName: string | null | undefined,
  fallbackEmoji?: string | null
): string {
  const raw = (countryOrName ?? "").trim();
  if (raw) {
    const opt = qsCountryOption(raw);
    if (opt) return opt.flag;
    const extra = EXTRA_META_BY_ALIAS.get(normalizeCountryAlias(raw));
    if (extra) return extra.flag;
  }
  const code = resolveCountryCode(countryOrName, fallbackEmoji);
  if (code === "gl") return "\u{1F30D}";
  if (code) return codeFromFlagEmoji(fallbackEmoji) === code && fallbackEmoji
    ? fallbackEmoji.trim()
    : String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + (c.charCodeAt(0) - 65)));
  return (fallbackEmoji ?? "").trim() || "\u{1F310}";
}
