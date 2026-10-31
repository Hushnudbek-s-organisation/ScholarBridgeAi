/**
 * Phase AE — does every catalogue rank really equal the QS 2026 position?
 *
 * `universities.world_ranking` is the one number the whole product repeats:
 * the profile badge, the catalogue cards, the rank table, the chancing badge,
 * the shortlist, the recommendation cards, the planner and the dashboard. The
 * public gates can only check the *shape* of those surfaces, and the benchmark
 * table (`qsTop200Benchmarks.ts`) only covers 201 institutions. Nothing checked
 * the stored catalogue values themselves against the edition — so measured on
 * 2026-10-30, six were one place low and two claimed a position for a
 * university QS 2026 does not rank at all.
 *
 * This module is the audit that found them, kept as code so it can be re-run:
 * a catalogue row and the official table go in, a verdict comes out. It is
 * pure — the CSV reader lives in the gate and the database reader in the CLI —
 * so it can be unit-tested and it can never drift from what the gate asserts.
 *
 * Matching is deliberately explicit. QS renamed half of these institutions
 * between editions ("Penn State University" ↔ "Pennsylvania State University",
 * "TU Wien" ↔ "Vienna University of Technology"), and a fuzzy matcher would
 * silently attach a rank to the wrong university — the exact failure this audit
 * exists to catch. Unmatched names are reported as `unknown`, never guessed.
 */

/** The columns the audit needs; any row shape that carries them works. */
export interface CatalogueRankRow {
  id: number;
  name: string;
  worldRanking: number | null;
  qsRankYear: number | null;
}

/** One official table entry. `band` is a published range ("701-710"). */
export interface OfficialRankEntry {
  name: string;
  rank: number | null;
  band: [number, number] | null;
}

export type RankVerdict =
  /** The stored rank is the official position. */
  | "match"
  /** The official table lists a range and the stored rank falls inside it. */
  | "band-match"
  /** The official table lists a range and the stored rank falls outside it. */
  | "band-miss"
  /** The stored rank is not the official position. */
  | "mismatch"
  /** The edition ranks the institution; the catalogue stores nothing. */
  | "not-filled"
  /** Neither the edition nor the catalogue ranks it. */
  | "not-ranked"
  /** The catalogue claims a rank the edition does not publish. */
  | "unverified-claim"
  /** A rank with no recorded edition (Phase AD) — not a position. */
  | "undated"
  /** The name resolves to no official entry, so nothing can be checked. */
  | "unknown";

export interface RankAuditResult {
  verdict: RankVerdict;
  row: CatalogueRankRow;
  official: OfficialRankEntry | null;
}

export interface RankAuditSummary {
  results: RankAuditResult[];
  byVerdict: Record<RankVerdict, RankAuditResult[]>;
  /** Every finding a build should fail on, in row order. */
  problems: RankAuditResult[];
}

/**
 * Catalogue name → the exact spelling the QS 2026 table uses.
 *
 * Only names whose *words* differ need an entry; accents, curly quotes, the
 * leading "The", trailing parentheticals and the "X (Y)" ↔ "Y (X)" swap are
 * handled by {@link officialKeys}. Each pair was verified by hand against
 * `data/qs2026_top1500.csv` — a wrong alias here would re-introduce exactly the
 * bug this file exists to prevent, so the gate asserts every row resolves.
 */
export const QS_NAME_ALIASES: Record<string, string> = {
  "unsw sydney": "The University of New South Wales",
  "nanyang technological university": "Nanyang Technological University, Singapore (NTU Singapore)",
  "universite psl paris sciences and lettres": "PSL University",
  "lmu munich": "Ludwig-Maximilians-Universität München",
  "university of illinois urbana champaign": "University of Illinois at Urbana-Champaign",
  "penn state university": "Pennsylvania State University",
  postech: "Pohang University of Science And Technology (POSTECH)",
  "universite de montreal": "University of Montreal",
  "osaka university": "The University of Osaka",
  uclouvain: "Université Catholique de Louvain (UCL)",
  "university of bologna": "Alma Mater Studiorum - University of Bologna",
  "university of gottingen": "Georg-August-Universität Göttingen",
  "university of cologne": "Universität zu Köln",
  "rwth aachen university": "Rheinisch-Westfälische Technische Hochschule Aachen",
  "tu wien": "Vienna University of Technology",
  "queen s university at kingston": "Queen's University, Ontario",
  "trinity college dublin": "Trinity College Dublin, The University of Dublin",
  "university of adelaide": "Adelaide University",
  "universidad de los andes": "Universidad de Los Andes Colombia",
  "tu dresden": "Technische Universität Dresden",
  "khalifa university": "Khalifa University of Science and Technology",
  "university of minnesota twin cities": "University of Minnesota (System)",
  "radboud university": "Radboud University Nijmegen",
  "university of galway": "University of Galway / Ollscoil na Gaillimhe",
  "indian institute of science": "Indian Institute of Science (IISc) Bangalore",
  "moscow institute of physics and technology": "Moscow Institute of Physics and Technology State University",
  "adam mickiewicz university poznan": "Adam Mickiewicz University",
  "university of north carolina at chapel hill": "University of North Carolina, Chapel Hill",
  "complutense university of madrid": "University Complutense Madrid",
  "autonomous university of madrid": "Universidad Autónoma de Madrid",
  "university of freiburg": "Universität Freiburg",
  "university of erlangen nurnberg": "Universität Erlangen-Nürnberg",
  "university of bonn": "Rheinische Friedrich-Wilhelms-Universität Bonn",
  "university of campinas": "Universidade Estadual de Campinas (Unicamp)",
  "university of padua": "University of Padova",
  "gadjah mada university": "Universitas Gadjah Mada",
  "canadian university dubai": "Canadian University of Dubai",
  "university of tubingen": "Eberhard Karls Universität Tübingen",
  "king abdulaziz university": "King Abdul Aziz University (KAU)",
  "technical university of darmstadt": "Technische Universität Darmstadt",
  "ankara university": "Ankara Üniversitesi",
  "hungarian university of agriculture and life sciences": "MATE Hungarian University of Agriculture and Life Sciences",
  "hse university": "National Research University Higher School of Economics (HSE, Moscow)",
  "wroclaw university of science and technology": "Wroclaw University of Science and Technology (WUST)",
};

/** Letters NFKD does not decompose into ASCII. */
const LETTER_FOLDS: Record<string, string> = {
  "ı": "i",
  "İ": "I",
  ą: "a",
  ć: "c",
  ę: "e",
  ł: "l",
  ń: "n",
  ø: "o",
  œ: "oe",
  ß: "ss",
  ś: "s",
  ź: "z",
  ż: "z",
};

/** Lower-case, accent-free, punctuation-free, leading "the" removed. */
export function normalizeInstitutionName(raw: string): string {
  const folded = raw
    .split("")
    .map((ch) => LETTER_FOLDS[ch] ?? ch)
    .join("")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
  const cleaned = folded
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.replace(/^the /, "");
}

/**
 * `"University of X (ABC)"` → `["university of x (abc)", "university of x"]`.
 * The parenthetical has to be removed from the RAW name: normalisation turns
 * every bracket into a space, so stripping afterwards would be a no-op and half
 * the catalogue would look unmatched.
 */
function baseKeys(name: string): string[] {
  const full = normalizeInstitutionName(name);
  const bare = normalizeInstitutionName(name.replace(/\([^)]*\)/g, " "));
  return bare && bare !== full ? [full, bare] : [full];
}

/** `"ABC (University of X)"` → `"university of x (abc)"`, and the bare form. */
function swappedKey(name: string): string | null {
  const match = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(name.trim());
  if (!match) return null;
  const [, outer, inner] = match;
  const head = normalizeInstitutionName(inner);
  const tail = normalizeInstitutionName(outer);
  return tail ? `${head} (${tail})` : head;
}

/**
 * Every key an official entry answers to. The audit looks a catalogue name up
 * in this map, so the same table serves both sides and a rename only has to be
 * written once.
 */
export function officialKeys(entry: OfficialRankEntry): string[] {
  const keys = new Set<string>();
  for (const key of baseKeys(entry.name)) keys.add(key);
  const swapped = swappedKey(entry.name);
  if (swapped) {
    keys.add(swapped);
    const bare = swapped.replace(/\(.*\)/, "").trim();
    if (bare) keys.add(bare);
  }
  return [...keys];
}

/** The columns the audit compares — one list, so the rule is stated once. */
export function isRankProblem(verdict: RankVerdict): boolean {
  return (
    verdict === "mismatch" ||
    verdict === "band-miss" ||
    verdict === "unverified-claim" ||
    verdict === "undated" ||
    verdict === "unknown"
  );
}

const ALL_VERDICTS: RankVerdict[] = [
  "match",
  "band-match",
  "band-miss",
  "mismatch",
  "not-filled",
  "not-ranked",
  "unverified-claim",
  "undated",
  "unknown",
];

/**
 * Compare catalogue rows with the official edition.
 *
 * `official` is keyed by {@link officialKeys}: the caller builds it once from
 * the CSV, this function does the matching and the verdicts.
 */
export function auditCatalogueRanks(
  rows: CatalogueRankRow[],
  official: Map<string, OfficialRankEntry>
): RankAuditSummary {
  const results: RankAuditResult[] = rows.map((row) => {
    // 1. the stored spelling, 2. the same name with its parts swapped
    //    ("ABC (University of X)" ↔ "University of X (ABC)"), 3. the rename
    //    table for either of those keys.
    const candidates: string[] = [];
    const push = (name: string) => {
      for (const key of baseKeys(name)) if (!candidates.includes(key)) candidates.push(key);
    };
    push(row.name);
    const swapped = swappedKey(row.name);
    if (swapped) push(swapped);
    for (const key of [...candidates]) {
      const alias = QS_NAME_ALIASES[key];
      if (!alias) continue;
      push(alias);
      const aliasSwapped = swappedKey(alias);
      if (aliasSwapped) push(aliasSwapped);
    }

    let entry: OfficialRankEntry | null = null;
    for (const key of candidates) {
      const hit = official.get(key);
      if (hit) {
        entry = hit;
        break;
      }
    }

    if (!entry) {
      // Nothing in the edition answers to this name: no position may be claimed.
      const verdict: RankVerdict = row.worldRanking == null ? "not-ranked" : "unverified-claim";
      return { verdict, row, official: null };
    }
    if (row.worldRanking == null) {
      return { verdict: entry.rank == null && entry.band == null ? "not-ranked" : "not-filled", row, official: entry };
    }
    if (row.qsRankYear == null) {
      return { verdict: "undated", row, official: entry };
    }
    if (entry.band && entry.rank == null) {
      const inside = row.worldRanking >= entry.band[0] && row.worldRanking <= entry.band[1];
      return { verdict: inside ? "band-match" : "band-miss", row, official: entry };
    }
    if (entry.rank == null) {
      return { verdict: "not-filled", row, official: entry };
    }
    return { verdict: row.worldRanking === entry.rank ? "match" : "mismatch", row, official: entry };
  });

  const byVerdict = Object.fromEntries(
    ALL_VERDICTS.map((verdict) => [verdict, results.filter((r) => r.verdict === verdict)])
  ) as Record<RankVerdict, RankAuditResult[]>;

  return { results, byVerdict, problems: results.filter((r) => isRankProblem(r.verdict)) };
}
