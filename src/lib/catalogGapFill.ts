/**
 * Filling the gaps the 2026-10-23 catalogue audit reported (spec §4:
 * "fill missing university rank / image / programs").
 *
 * THE RULE
 * --------
 * The audit CSV (`data/universities_missing_rank_image_programs_2026-10-23.csv`)
 * is a *report*, not a data source: its three columns say `yes`/`no`, they do not
 * contain the missing rank, image or programmes. So a gap can only be closed
 * when some other file we hold actually contains the value, and the match that
 * finds it must be **exact**.
 *
 * That is why the resolvers below refuse to guess:
 *   • names are compared after a normalization that only removes accents,
 *     punctuation, a parenthetical alias and the word order of `&`/`and`
 *     — never by prefix or fuzzy distance (loose matching once paired
 *     "New Uzbekistan University" with the University of New South Wales, which
 *     would have published a rank of 19 for a university that has none);
 *   • a QS band ("1201-1400") is not an integer rank and is rejected;
 *   • an image is only resolvable from a real image URL, never from a file name
 *     a PDF extractor produced;
 *   • programmes are only resolvable from the imported programme catalogue.
 *
 * Everything that cannot be resolved stays unresolved and is reported as work
 * for an administrator to do from the official page — the platform shows the
 * honest fallback in the meantime.
 */

export interface UniversityGapRow {
  id: number;
  name: string;
  country: string;
  rankMissing: boolean;
  imageMissing: boolean;
  programsMissing: boolean;
}

/** One row of "this name has this rank, in this file". */
export interface RankSource {
  name: string;
  country?: string | null;
  /** Integer rank only; a band such as "1201-1400" must arrive as `null`. */
  rank: number | null;
  /**
   * The source LISTS this institution and states that it holds no position in
   * the edition the source covers.
   *
   * A null `rank` alone cannot say that: it also means "this table has no row
   * for it" or "the rank was a band". The distinction matters because a table
   * that checked the edition and found nothing is *evidence*, and evidence beats
   * an older export that still claims a number — the campus CSV calls KAIST #37
   * while the app's verified QS 2026 table says the edition does not rank it.
   * Publishing 37 would invent a position.
   */
  unranked?: boolean;
  /** Human-readable file/table name, shown in the report and stored as the source. */
  source: string;
}

export interface ImageSource {
  id?: number | null;
  name: string;
  imageUrl: string | null;
  source: string;
}

export interface Resolution<T> {
  value: T;
  source: string;
}

/**
 * Institution names as the catalogue stores them: "ETH Zurich (Swiss Federal
 * Institute of Technology)", "Ecole Normale Supérieure de Lyon".
 *
 * Accents are stripped, `&` becomes `and`, a trailing parenthetical alias is
 * dropped and everything non-alphanumeric collapses to single spaces. Nothing
 * is stemmed or truncated, so two different institutions can never collide by
 * accident.
 */
export function normalizeInstitutionName(raw: string | null | undefined): string {
  return (raw ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** A QS cell like "205" is a rank; "1201-1400" and "-" are not. */
export function parseIntegerRank(raw: string | number | null | undefined): number | null {
  if (typeof raw === "number") return Number.isInteger(raw) && raw > 0 ? raw : null;
  const text = (raw ?? "").trim();
  if (!/^\d{1,4}$/.test(text)) return null;
  const value = Number.parseInt(text, 10);
  return value > 0 ? value : null;
}

function sameInstitution(a: string, b: string): boolean {
  const left = normalizeInstitutionName(a);
  const right = normalizeInstitutionName(b);
  return left.length > 0 && left === right;
}

export interface RankCandidateMatch {
  /** `null` means the source says "not ranked in this edition". */
  value: number | null;
  source: string;
}

/**
 * Every source that states a rank for `row` under an EXACT normalized name.
 * A source that also states a country must agree on it — two institutions can
 * share a name across countries.
 */
export function ranksFor(
  row: Pick<UniversityGapRow, "name" | "country">,
  sources: RankSource[],
): RankCandidateMatch[] {
  const matches: RankCandidateMatch[] = [];
  for (const candidate of sources) {
    if (candidate.rank == null) continue;
    if (!sameInstitution(candidate.name, row.name)) continue;
    if (candidate.country && row.country && !sameCountry(candidate.country, row.country)) continue;
    matches.push({ value: candidate.rank, source: candidate.source });
  }
  return matches;
}

/**
 * Sources that LIST `row` and state it holds no position in their edition.
 *
 * A non-empty result is a veto, not a missing value: the edition was checked.
 */
export function unrankedFor(
  row: Pick<UniversityGapRow, "name" | "country">,
  sources: RankSource[],
): RankCandidateMatch[] {
  const matches: RankCandidateMatch[] = [];
  for (const candidate of sources) {
    if (!candidate.unranked) continue;
    if (!sameInstitution(candidate.name, row.name)) continue;
    if (candidate.country && row.country && !sameCountry(candidate.country, row.country)) continue;
    if (matches.some((match) => match.source === candidate.source)) continue;
    matches.push({ value: null, source: candidate.source });
  }
  return matches;
}

/**
 * The rank of `row` — but only when every source agrees.
 *
 * The catalogues we hold were compiled in different months (the 2026-10-23
 * campus export, the PDF extraction, the QS extract, the app's own Top-200
 * table), so the same university can carry two different QS ranks: KAIST is 37
 * in the campus export and 53 in the Top-200 table. Publishing either one means
 * picking an edition on the student's behalf, so a conflict resolves to
 * `null` and is reported for an administrator to settle.
 */
export function resolveRank(
  row: Pick<UniversityGapRow, "name" | "country">,
  sources: RankSource[],
): Resolution<number> | null {
  // A source that checked the edition and found the institution unranked
  // outranks any number an older export still carries.
  if (unrankedFor(row, sources).length) return null;
  const matches = ranksFor(row, sources);
  if (!matches.length) return null;
  const distinct = new Set(matches.map((match) => match.value));
  if (distinct.size > 1) return null;
  const value = matches[0].value;
  if (value == null) return null;
  return { value, source: matches[0].source };
}

/** Image URL of `row`, from a source that carries a real URL — never a file name. */
export function resolveImageUrl(
  row: Pick<UniversityGapRow, "id" | "name">,
  sources: ImageSource[],
): Resolution<string> | null {
  for (const candidate of sources) {
    const url = (candidate.imageUrl ?? "").trim();
    if (!/^https?:\/\//i.test(url)) continue;
    const byId = candidate.id != null && candidate.id === row.id;
    if (byId || sameInstitution(candidate.name, row.name)) {
      return { value: url, source: candidate.source };
    }
  }
  return null;
}

/** Number of imported programmes for `row`; 0 means the catalogue has none. */
export function resolvePrograms(
  row: Pick<UniversityGapRow, "id">,
  programCountByUniversityId: Map<number, number>,
  source: string,
): Resolution<number> | null {
  const count = programCountByUniversityId.get(row.id) ?? 0;
  return count > 0 ? { value: count, source } : null;
}

const COUNTRY_ALIASES: Record<string, string> = {
  "united states": "united states",
  "united states of america": "united states",
  usa: "united states",
  "united kingdom": "united kingdom",
  uk: "united kingdom",
  "great britain": "united kingdom",
  "south korea": "south korea",
  "republic of korea": "south korea",
  korea: "south korea",
  czechia: "czechia",
  "czech republic": "czechia",
  russia: "russia",
  "russian federation": "russia",
  turkey: "turkey",
  "türkiye": "turkey",
  turkiye: "turkey",
  china: "china",
  "china (mainland)": "china",
  "hong kong sar": "hong kong sar",
  "hong kong": "hong kong sar",
};

function sameCountry(a: string, b: string): boolean {
  const norm = (value: string) => COUNTRY_ALIASES[value.trim().toLowerCase()] ?? value.trim().toLowerCase();
  return norm(a) === norm(b);
}

export interface GapReportRow {
  id: number;
  name: string;
  country: string;
  rank: Resolution<number> | null;
  /** Sources that disagree about the rank; the admin decides which edition wins. */
  rankConflict: RankCandidateMatch[] | null;
  image: Resolution<string> | null;
  programs: Resolution<number> | null;
  /** Gaps that no file in the repository can close — administrator work. */
  unresolved: ("rank" | "image" | "programs")[];
}

/** Resolve every gap row against every dataset we hold. Pure; no I/O. */
export function buildGapReport(
  rows: UniversityGapRow[],
  data: {
    rankSources: RankSource[];
    imageSources: ImageSource[];
    programCountByUniversityId: Map<number, number>;
    programSource: string;
  },
): GapReportRow[] {
  return rows.map((row) => {
    const rankCandidates = row.rankMissing ? ranksFor(row, data.rankSources) : [];
    const rank = row.rankMissing ? resolveRank(row, data.rankSources) : null;
    const distinctCandidates = rankCandidates.filter(
      (candidate, index) =>
        rankCandidates.findIndex((other) => other.value === candidate.value && other.source === candidate.source) === index,
    );
    const unranked = unrankedFor(row, data.rankSources);
    // A veto (or two different numbers) means the report names both sides and
    // publishes neither — an administrator settles it against the edition.
    const rankConflict =
      unranked.length > 0 || new Set(distinctCandidates.map((c) => c.value)).size > 1
        ? [...distinctCandidates, ...unranked]
        : null;
    const image = row.imageMissing ? resolveImageUrl(row, data.imageSources) : null;
    const programs = row.programsMissing
      ? resolvePrograms(row, data.programCountByUniversityId, data.programSource)
      : null;
    const unresolved: GapReportRow["unresolved"] = [];
    if (row.rankMissing && !rank) unresolved.push("rank");
    if (row.imageMissing && !image) unresolved.push("image");
    if (row.programsMissing && !programs) unresolved.push("programs");
    return {
      id: row.id,
      name: row.name,
      country: row.country,
      rank,
      rankConflict,
      image,
      programs,
      unresolved,
    };
  });
}
