/**
 * Shared reader for the official QS 2026 table (`data/qs2026_top1500.csv`).
 *
 * Two callers need it: the gate (`check-qs-catalogue-ranks.ts`) replays the
 * audit over the committed snapshot, and the CLI (`audit-live-ranks.ts`) runs it
 * against the live catalogue. Keeping the parser in one place means the two can
 * never disagree about what the edition says.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { officialKeys, type OfficialRankEntry } from "../../src/lib/qsRankAudit";

/** Minimal CSV reader — names contain commas only inside quotes. */
export function splitCsv(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === "," && !quoted) {
      cells.push(cell);
      cell = "";
    } else cell += ch;
  }
  cells.push(cell);
  return cells;
}

export interface OfficialQsTable {
  entries: OfficialRankEntry[];
  /** Every spelling the audit may look up, keyed by normalised name. */
  index: Map<string, OfficialRankEntry>;
  /** Rows placing an institution inside the top 200 (200 = a full edition). */
  top200Rows: number;
}

export function readOfficialQsTable(root: string): OfficialQsTable {
  const raw = readFileSync(join(root, "data/qs2026_top1500.csv"), "utf8").replace(/^\uFEFF/, "");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const header = splitCsv(lines[0]);
  const nameIndex = header.indexOf("Name");
  const rankIndex = header.indexOf("Rank");
  if (nameIndex < 0 || rankIndex < 0) throw new Error("the official table lost its Rank/Name columns");

  const entries: OfficialRankEntry[] = [];
  const index = new Map<string, OfficialRankEntry>();
  let top200Rows = 0;
  for (const line of lines.slice(1)) {
    const cells = splitCsv(line);
    const name = (cells[nameIndex] ?? "").trim();
    const rawRank = (cells[rankIndex] ?? "").trim();
    if (!name) continue;
    const bandMatch = /^(\d+)\s*-\s*(\d+)$/.exec(rawRank);
    const entry: OfficialRankEntry = {
      name,
      rank: /^\d+$/.test(rawRank) ? Number(rawRank) : null,
      band: bandMatch ? [Number(bandMatch[1]), Number(bandMatch[2])] : null,
    };
    if (entry.rank != null && entry.rank <= 200) top200Rows++;
    entries.push(entry);
    for (const key of officialKeys(entry)) if (!index.has(key)) index.set(key, entry);
  }
  return { entries, index, top200Rows };
}

/** The snapshot format: `id \t name \t rank|- \t edition|-`, one row per line. */
export function parseCatalogueSnapshot(text: string): {
  id: number;
  name: string;
  worldRanking: number | null;
  qsRankYear: number | null;
}[] {
  return text
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const [id, name, rank, year] = line.split("\t");
      return {
        id: Number(id),
        name,
        worldRanking: rank === "-" ? null : Number(rank),
        qsRankYear: year === "-" ? null : Number(year),
      };
    });
}

export function formatCatalogueSnapshot(
  rows: { id: number; name: string; worldRanking: number | null; qsRankYear: number | null }[]
): string {
  return (
    rows
      .map((row) => [row.id, row.name, row.worldRanking ?? "-", row.qsRankYear ?? "-"].join("\t"))
      .join("\n") + "\n"
  );
}
