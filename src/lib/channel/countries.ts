/**
 * `channel_countries` — the Uzbek name, locative form and flag for every country
 * we publish about, plus the alias matching that maps a stored
 * `scholarships.country` string onto one of these rows.
 *
 * The table is seeded from this list and is fully editable in admin; the list
 * here is only the initial seed and the fallback used by tests/preview.
 *
 * Unknown country: the English name is shown as stored, there is no locative
 * form (so locative sentences fall back to the plain name), and the tagline is
 * taken only from `tagline_uz`.
 */

export interface ChannelCountry {
  /** Stable key used in settings/hashtags, e.g. "germany". */
  key: string;
  iso2: string;
  flag: string;
  /** "Germaniya" */
  nameUz: string;
  /** "Germaniyada" — locative, used in headlines such as "Germaniyada o'qish". */
  nameUzLoc: string;
  /** Hashtag without "#". */
  hashtag: string;
  /** Stored spellings that map onto this country. */
  aliases: readonly string[];
}

export const CHANNEL_COUNTRIES: readonly ChannelCountry[] = [
  {
    key: "france",
    iso2: "FR",
    flag: "\u{1F1EB}\u{1F1F7}",
    nameUz: "Fransiya",
    nameUzLoc: "Fransiyada",
    hashtag: "fransiya",
    aliases: ["France", "Fransiya", "French Republic"],
  },
  {
    key: "japan",
    iso2: "JP",
    flag: "\u{1F1EF}\u{1F1F5}",
    nameUz: "Yaponiya",
    nameUzLoc: "Yaponiyada",
    hashtag: "yaponiya",
    aliases: ["Japan", "Yaponiya"],
  },
  {
    key: "germany",
    iso2: "DE",
    flag: "\u{1F1E9}\u{1F1EA}",
    nameUz: "Germaniya",
    nameUzLoc: "Germaniyada",
    hashtag: "germaniya",
    aliases: ["Germany", "Deutschland", "Germaniya"],
  },
  {
    key: "uk",
    iso2: "GB",
    flag: "\u{1F1EC}\u{1F1E7}",
    nameUz: "Buyuk Britaniya",
    nameUzLoc: "Buyuk Britaniyada",
    hashtag: "buyukbritaniya",
    aliases: ["United Kingdom", "UK", "Great Britain", "England", "Scotland", "Buyuk Britaniya"],
  },
  {
    key: "usa",
    iso2: "US",
    flag: "\u{1F1FA}\u{1F1F8}",
    nameUz: "AQSh",
    nameUzLoc: "AQShda",
    hashtag: "aqsh",
    aliases: ["United States", "United States of America", "USA", "US", "AQSh"],
  },
  {
    key: "australia",
    iso2: "AU",
    flag: "\u{1F1E6}\u{1F1FA}",
    nameUz: "Avstraliya",
    nameUzLoc: "Avstraliyada",
    hashtag: "avstraliya",
    aliases: ["Australia", "Avstraliya"],
  },
  {
    key: "south_korea",
    iso2: "KR",
    flag: "\u{1F1F0}\u{1F1F7}",
    nameUz: "Janubiy Koreya",
    nameUzLoc: "Janubiy Koreyada",
    hashtag: "janubiykoreya",
    aliases: ["South Korea", "Korea", "Republic of Korea", "Janubiy Koreya"],
  },
  {
    key: "turkey",
    iso2: "TR",
    flag: "\u{1F1F9}\u{1F1F7}",
    nameUz: "Turkiya",
    nameUzLoc: "Turkiyada",
    hashtag: "turkiya",
    aliases: ["Turkey", "Türkiye", "Turkiye", "Turkiya"],
  },
  {
    key: "china",
    iso2: "CN",
    flag: "\u{1F1E8}\u{1F1F3}",
    nameUz: "Xitoy",
    nameUzLoc: "Xitoyda",
    hashtag: "xitoy",
    aliases: ["China", "China (mainland)", "Xitoy"],
  },
  {
    key: "slovakia",
    iso2: "SK",
    flag: "\u{1F1F8}\u{1F1F0}",
    nameUz: "Slovakiya",
    nameUzLoc: "Slovakiyada",
    hashtag: "slovakiya",
    aliases: ["Slovakia", "Slovak Republic", "Slovakiya"],
  },
  {
    key: "uae",
    iso2: "AE",
    flag: "\u{1F1E6}\u{1F1EA}",
    nameUz: "BAA",
    nameUzLoc: "BAAda",
    hashtag: "baa",
    aliases: ["United Arab Emirates", "UAE", "BAA"],
  },
  {
    key: "italy",
    iso2: "IT",
    flag: "\u{1F1EE}\u{1F1F9}",
    nameUz: "Italiya",
    nameUzLoc: "Italiyada",
    hashtag: "italiya",
    aliases: ["Italy", "Italia", "Italiya"],
  },
  {
    key: "canada",
    iso2: "CA",
    flag: "\u{1F1E8}\u{1F1E6}",
    nameUz: "Kanada",
    nameUzLoc: "Kanadada",
    hashtag: "kanada",
    aliases: ["Canada", "Kanada"],
  },
  {
    key: "netherlands",
    iso2: "NL",
    flag: "\u{1F1F3}\u{1F1F1}",
    nameUz: "Niderlandiya",
    nameUzLoc: "Niderlandiyada",
    hashtag: "niderlandiya",
    aliases: ["Netherlands", "The Netherlands", "Holland", "Niderlandiya"],
  },
  {
    key: "switzerland",
    iso2: "CH",
    flag: "\u{1F1E8}\u{1F1ED}",
    nameUz: "Shveytsariya",
    nameUzLoc: "Shveytsariyada",
    hashtag: "shveytsariya",
    aliases: ["Switzerland", "Schweiz", "Shveytsariya"],
  },
  {
    key: "malaysia",
    iso2: "MY",
    flag: "\u{1F1F2}\u{1F1FE}",
    nameUz: "Malayziya",
    nameUzLoc: "Malayziyada",
    hashtag: "malayziya",
    aliases: ["Malaysia", "Malayziya"],
  },
  {
    key: "hungary",
    iso2: "HU",
    flag: "\u{1F1ED}\u{1F1FA}",
    nameUz: "Vengriya",
    nameUzLoc: "Vengriyada",
    hashtag: "vengriya",
    aliases: ["Hungary", "Vengriya"],
  },
  {
    key: "poland",
    iso2: "PL",
    flag: "\u{1F1F5}\u{1F1F1}",
    nameUz: "Polsha",
    nameUzLoc: "Polshada",
    hashtag: "polsha",
    aliases: ["Poland", "Polsha"],
  },
  {
    key: "russia",
    iso2: "RU",
    flag: "\u{1F1F7}\u{1F1FA}",
    nameUz: "Rossiya",
    nameUzLoc: "Rossiyada",
    hashtag: "rossiya",
    aliases: ["Russia", "Russian Federation", "Rossiya"],
  },
  {
    key: "kazakhstan",
    iso2: "KZ",
    flag: "\u{1F1F0}\u{1F1FF}",
    nameUz: "Qozog'iston",
    nameUzLoc: "Qozog'istonda",
    hashtag: "qozogiston",
    aliases: ["Kazakhstan", "Qozog'iston", "Qozogiston"],
  },
  {
    key: "south_africa",
    iso2: "ZA",
    flag: "\u{1F1FF}\u{1F1E6}",
    nameUz: "Janubiy Afrika",
    nameUzLoc: "Janubiy Afrikada",
    hashtag: "janubiyafrika",
    aliases: ["South Africa", "Janubiy Afrika"],
  },
  {
    key: "uzbekistan",
    iso2: "UZ",
    flag: "\u{1F1FA}\u{1F1FF}",
    nameUz: "O'zbekiston",
    nameUzLoc: "O'zbekistonda",
    hashtag: "ozbekiston",
    aliases: ["Uzbekistan", "O'zbekiston", "Ozbekiston", "Republic of Uzbekistan"],
  },
];

function normalizeCountryName(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/\s+/g, " ");
}

const ALIAS_INDEX: Map<string, ChannelCountry> = (() => {
  const map = new Map<string, ChannelCountry>();
  for (const country of CHANNEL_COUNTRIES) {
    for (const alias of [country.nameUz, country.nameUzLoc, ...country.aliases]) {
      map.set(normalizeCountryName(alias), country);
    }
  }
  return map;
})();

/** Country row for a stored country string, or null when we do not know it. */
export function resolveCountry(raw: string | null | undefined, table: readonly ChannelCountry[] = CHANNEL_COUNTRIES): ChannelCountry | null {
  const name = (raw ?? "").trim();
  if (!name) return null;
  if (table === CHANNEL_COUNTRIES) return ALIAS_INDEX.get(normalizeCountryName(name)) ?? null;
  const wanted = normalizeCountryName(name);
  for (const country of table) {
    for (const alias of [country.nameUz, country.nameUzLoc, ...country.aliases]) {
      if (normalizeCountryName(alias) === wanted) return country;
    }
  }
  return null;
}

/**
 * Display data for a stored country: the seeded row when we know the country,
 * otherwise the English name exactly as stored, with no locative form.
 */
export interface CountryDisplay {
  key: string | null;
  flag: string;
  /** Used where a plain name fits ("Davlat: ..."). */
  name: string;
  /** Locative form, or null when the country is unknown/unsupported. */
  locative: string | null;
  hashtag: string | null;
  known: boolean;
}

export function countryDisplay(raw: string | null | undefined, table: readonly ChannelCountry[] = CHANNEL_COUNTRIES): CountryDisplay | null {
  const name = (raw ?? "").trim();
  if (!name) return null;
  const row = resolveCountry(name, table);
  if (!row) {
    return { key: null, flag: "", name, locative: null, hashtag: null, known: false };
  }
  return {
    key: row.key,
    flag: row.flag,
    name: row.nameUz,
    locative: row.nameUzLoc || null,
    hashtag: row.hashtag,
    known: true,
  };
}

/* ------------------------------------------------------------------ storage */

export interface CountryRowLike {
  key: string;
  iso2: string | null;
  flag: string | null;
  nameUz: string;
  nameUzLoc: string | null;
  hashtag: string | null;
  aliases?: string | null;
}

/** Row → `ChannelCountry` with the stored alias JSON parsed. */
export function countryFromRow(row: CountryRowLike): ChannelCountry & { aliases: string[] } {
  let aliases: string[] = [];
  if (row.aliases) {
    try {
      const parsed = JSON.parse(row.aliases);
      if (Array.isArray(parsed)) aliases = parsed.filter((v): v is string => typeof v === "string");
    } catch {
      aliases = [];
    }
  }
  return {
    key: row.key,
    iso2: row.iso2 ?? "",
    flag: row.flag ?? "",
    nameUz: row.nameUz,
    nameUzLoc: row.nameUzLoc ?? "",
    hashtag: row.hashtag ?? "",
    aliases,
  };
}
