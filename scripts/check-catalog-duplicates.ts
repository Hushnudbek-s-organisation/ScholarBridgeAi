/**
 * Catalogue duplicate check — answers the question:
 *
 *   "Katalogda bir xil universitet ikki marta turibdimi?"
 *
 * Two PDF imports once created a second row for six institutions (DTU, UNIL,
 * POSTECH, UNAM, Universiti Malaya, PUC Chile). Each pair carried the same QS
 * ranking and a different name variant, so the explorer listed the institution
 * twice and a scholarship linked to one row never appeared on the other page.
 * `supabase/merge_duplicate_universities_2026-10-23.sql` merged them; this
 * script is the guard that keeps them merged.
 *
 * A "duplicate" here is two rows in the same country whose names normalise to
 * the same base title — case, punctuation, accents and a trailing parenthetical
 * are ignored, so "University of Lausanne (UNIL)" and
 * "University of Lausanne (UNIL - HEC & Sciences)" collapse to one key.
 *
 * Note that an identical `world_ranking` alone is NOT a duplicate: QS bands
 * legitimately give two different universities the same number (Aberdeen and
 * Surrey both sit at 262).
 *
 * Usage:
 *   DATABASE_URL=… npm run test:duplicates
 *   DATABASE_URL=… npm run test:duplicates -- --fix-dry-run   (same, verbose)
 */
import "./lib/env";
import { Pool } from "pg";

type Row = { id: number; name: string; canonical_name: string | null; country_code: string | null; world_ranking: number | null };

/** Lowercase, strip accents/punctuation and any trailing "(...)" qualifier. */
export function duplicateKey(row: { name: string; canonical_name?: string | null; country_code?: string | null }): string {
  const base = (row.canonical_name || row.name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\([^)]*\)/g, " ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return `${(row.country_code || "").toUpperCase()}::${base}`;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required (Supabase: Project → Settings → Database).");
    process.exit(2);
  }
  const pool = new Pool({ connectionString: url, ssl: url.includes("supabase.co") ? { rejectUnauthorized: false } : undefined });
  try {
    const { rows } = await pool.query<Row>(
      `SELECT id, name, canonical_name, country_code, world_ranking
         FROM universities
        ORDER BY id`,
    );

    const groups = new Map<string, Row[]>();
    for (const row of rows) {
      const key = duplicateKey(row);
      const list = groups.get(key) ?? [];
      list.push(row);
      groups.set(key, list);
    }
    const duplicates = [...groups.entries()].filter(([, list]) => list.length > 1);

    console.log(`\n[duplicates] ${rows.length} universities checked\n`);
    if (duplicates.length === 0) {
      console.log("  ✓ no duplicate universities (same country, same normalised name)\n");
      process.exit(0);
    }

    console.log(`  ✗ ${duplicates.length} duplicate group(s):\n`);
    for (const [key, list] of duplicates) {
      console.log(`    ${key}`);
      for (const row of list) {
        console.log(`      id=${row.id}  rank=${row.world_ranking ?? "–"}  ${row.canonical_name ?? row.name}`);
      }
    }
    console.log(
      "\n  Merge them with supabase/merge_duplicate_universities_2026-10-23.sql" +
        "\n  (re-point every child row first, then delete the duplicate).\n",
    );
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  void main();
}
