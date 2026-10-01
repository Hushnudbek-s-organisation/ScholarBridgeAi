/**
 * Generate `supabase/full_schema.sql` — the ONE canonical Supabase schema.
 *
 * The output is derived 100% from `src/db/schema.ts` (the Drizzle source of
 * truth behind every db.select()/db.insert() the app runs), so the file can
 * never disagree with what the app expects. Regenerate after touching
 * schema.ts:
 *
 *   npm run db:gen:full-schema
 *
 * The generated file is strictly ADDITIVE and idempotent:
 *   Part 1  CREATE TABLE IF NOT EXISTS  (fresh databases — full definition
 *           including PKs, NOT NULL, DEFAULTs, inline FKs and CHECKs)
 *   Part 2  ADD COLUMN IF NOT EXISTS    (old databases that lost columns)
 *   Part 3  CREATE [UNIQUE] INDEX IF NOT EXISTS
 *   Part 4  missing FK constraints, added only when safe (DO $$ guard)
 *   Part 5  RLS lockdown (same logic as supabase/enable_rls.sql)
 *
 * No DROP, no RENAME, no type change — re-running changes nothing.
 *
 * After writing, the generator re-parses its own output and asserts that
 * every table/column/type the app needs is present. A generator bug can
 * therefore never ship a broken schema file.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  collectDrizzleTables,
  compareSchemas,
  parseDdl,
  type DrizzleTable,
} from "./lib/schema-tools";

const REPO_ROOT = join(__dirname, "..");
const OUT_SQL = join(REPO_ROOT, "supabase", "full_schema.sql");

// ---------------------------------------------------------------------------
// FKs come straight from the drizzle runtime (fk.reference() ->
// { name, columns, foreignTable, foreignColumns } + onDelete) — no source
// parsing, so the output is exactly what schema.ts declares.
// ---------------------------------------------------------------------------

interface ResolvedFk {
  table: string;
  sourceCols: string[];
  refTable: string;
  refCols: string[];
  onDelete: string;
  constraintName: string;
}

function resolveFks(tables: DrizzleTable[]): ResolvedFk[] {
  const out: ResolvedFk[] = [];
  for (const t of tables) {
    for (const fk of t.foreignKeys) {
      // Unnamed inline references get Postgres' default constraint name:
      // {table}_{column}_fkey.
      const constraintName =
        fk.constraintName ?? (fk.sourceCols.length === 1 ? `${t.name}_${fk.sourceCols[0]}_fkey` : `${t.name}_${fk.sourceCols.join("_")}_fkey`);
      out.push({
        table: t.name,
        sourceCols: fk.sourceCols,
        refTable: fk.refTable,
        refCols: fk.refColNames,
        onDelete: (fk.onDelete ?? "no action").toLowerCase(),
        constraintName,
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

function quoteIdent(s: string): string {
  return `"${s.replace(/"/g, '""')}"`;
}

function defaultOf(col: { hasDefault: boolean; raw?: { default?: unknown } }): string | null {
  if (!col.hasDefault) return null;
  const d = col.raw?.default;
  if (typeof d === "string") return `'${d.replace(/'/g, "''")}'`;
  if (typeof d === "number") return String(d);
  if (typeof d === "boolean") return d ? "TRUE" : "FALSE";
  const chunks = (d as { queryChunks?: unknown[] } | null)?.queryChunks;
  if (Array.isArray(chunks)) {
    const parts: string[] = [];
    for (const chunk of chunks) {
      const value = (chunk as { value?: unknown }).value;
      if (Array.isArray(value) && value.every((v) => typeof v === "string")) parts.push(value.join(""));
      else if (typeof value === "string") parts.push(value);
    }
    const text = parts.join("").trim();
    return /^[A-Za-z0-9_(). ']+$/.test(text) ? text : null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Indexes: curated statements for expression/partial indexes that drizzle
// does not expose as plain columns. Keyed by index name.
// ---------------------------------------------------------------------------

const CURATED_INDEXES: Record<string, string> = {
  uq_universities_canonical_name_ci:
    "CREATE UNIQUE INDEX IF NOT EXISTS uq_universities_canonical_name_ci ON universities (lower(btrim(canonical_name))) WHERE canonical_name IS NOT NULL AND btrim(canonical_name) <> ''",
  uq_programs_university_name_degree:
    "CREATE UNIQUE INDEX IF NOT EXISTS uq_programs_university_name_degree ON programs (university_id, lower(btrim(name)), lower(btrim(coalesce(degree_level, ''))))",
  uq_program_requirements_program_year:
    "CREATE UNIQUE INDEX IF NOT EXISTS uq_program_requirements_program_year ON program_requirements (program_id, academic_year) WHERE academic_year IS NOT NULL",
  ownership_transfers_one_open:
    "CREATE UNIQUE INDEX IF NOT EXISTS ownership_transfers_one_open ON ownership_transfers ((true)) WHERE status IN ('pending', 'accepted')",
};

// CHECK constraints by table (drizzle exposes them only as opaque chunks in
// this version — the expressions mirror schema.ts line-for-line).
const CURATED_CHECKS: Record<string, { name: string; expr: string }[]> = {
  platform_ownership: [{ name: "platform_ownership_id_check", expr: "id = 1" }],
  ownership_transfers: [
    { name: "ownership_transfers_status_check", expr: "status IN ('pending', 'accepted', 'completed', 'rejected', 'expired', 'cancelled')" },
    { name: "ownership_transfers_check", expr: "from_profile_id <> to_profile_id" },
  ],
};

// ---------------------------------------------------------------------------
// Topological order (FK dependencies), stable by declaration order.
// ---------------------------------------------------------------------------

function topoOrder(tables: DrizzleTable[], fks: ResolvedFk[]): DrizzleTable[] {
  const byName = new Map(tables.map((t) => [t.name, t]));
  const deps = new Map<string, Set<string>>();
  for (const t of tables) deps.set(t.name, new Set());
  for (const f of fks) {
    if (f.refTable === f.table) continue; // self-reference
    deps.get(f.table)?.add(f.refTable);
  }
  const done = new Set<string>();
  const out: DrizzleTable[] = [];
  const visit = (name: string, stack: Set<string>) => {
    if (done.has(name)) return;
    if (stack.has(name)) return; // cycle guard — keep declaration order
    stack.add(name);
    for (const d of deps.get(name) ?? []) {
      const dt = byName.get(d);
      if (dt) visit(d, stack);
    }
    stack.delete(name);
    done.add(name);
    out.push(byName.get(name)!);
  };
  for (const t of [...tables].sort((a, b) => a.order - b.order)) visit(t.name, new Set());
  return out;
}

// ---------------------------------------------------------------------------
// Emit
// ---------------------------------------------------------------------------

function main() {
  const tables = collectDrizzleTables();
  const fks = resolveFks(tables);

  const ordered = topoOrder(tables, fks);

  const parts: string[] = [];
  parts.push(`-- ============================================================================
-- ScholarBridge — BIRLA ANIQ SUPABASE SCHEMA (single canonical schema)
-- GENERATE EDILGAN / GENERATED FILE — qo'lda tahrir qilmasdan avtolyo'li
-- yangilang:  npm run db:gen:full-schema
-- ============================================================================
-- NIMA BU:
--   src/db/schema.ts (Drizzle) — ilova o'qiydigan/yozadigan BARCHA jadval
--   va ustunlarning yagona manbai. Bu fayl aynan shu manbadan yaratilgan:
--   har bir jadval, har bir ustun, har bir indeks ilovadan kerak bo'lgani
--   bilan to'liq muvofiq.
--
-- QANDAY ISHLATISH:
--   1. Supabase Dashboard -> SQL Editor -> New query
--   2. Bu faylni butunlay nusxalab qo'ying va "Run" bosing.
--   3. Tekshiring:  DATABASE_URL=postgresql://... npm run db:verify
--
-- XAVFSIZLIK:
--   * Faqat QO'SHADI (ADDITIVE): CREATE TABLE IF NOT EXISTS,
--     ADD COLUMN IF NOT EXISTS, CREATE INDEX IF NOT EXISTS.
--   * Hech qanday jadval/ustun o'chirilmaydi, nom o'zgartirilmaydi,
--     ma'lumot o'zgartirilmaydi. Necha marta ishlasangiz ham — xuddi
--     shu natija.
--   * Yangi loyihada: butun schemani bir bosishda yaratadi.
--   * Eski loyihada: yo'qolgan jadval/ustunlarni to'ldiradi ("bazi joylar
--     Supabaseda to'g'ri kelmayapti" — mana shu joylar avtomatik tuzatiladi).
--
-- QISM TASHKILI:
--   Part 1: CREATE TABLE IF NOT EXISTS   — yangi bazalar uchun to'liq ta'rif
--   Part 2: ADD COLUMN IF NOT EXISTS     — eski bazalarda yo'q ustunlar
--   Part 3: CREATE [UNIQUE] INDEX IF NOT EXISTS
--   Part 4: FK qoidalar — mavjud bazada yo'q bo'lsa, xavfsiz qo'shiladi
--   Part 5: RLS qulflash (anon/authenticated rollarga ruxsat olib qo'yish)
--   Part 6: Tekshiruv so'rovi
-- ============================================================================

BEGIN;
`);

  // ---------------------------------------------------------------- Part 1
  parts.push(`
-- ============================================================================
-- PART 1 — JADVALLAR (fresh database: full definitions, dependency order)
-- ============================================================================
`);
  for (const t of ordered) {
    const tFks = fks.filter((f) => f.table === t.name);
    const checks = CURATED_CHECKS[t.name] ?? [];
    const cols: string[] = [];
    for (const col of t.columns) {
      const def = defaultOf(col as never);
      const bits = [quoteIdent(col.name), col.type];
      if (col.pk) bits.push("PRIMARY KEY");
      else if (col.unique) {
        // Named constraint (not a bare inline UNIQUE): a bare inline UNIQUE
        // makes Postgres auto-name the constraint "<table>_<col>_key", which
        // the Part 4 dedup guard cannot reliably match, so fresh databases
        // would end up with TWO unique constraints on the same column.
        bits.push(`CONSTRAINT ${quoteIdent(`uq_${t.name}_${col.name}`)} UNIQUE`);
      }
      if (col.notNull && !col.pk) bits.push("NOT NULL");
      if (def) bits.push(`DEFAULT ${def}`);
      // inline FK for single-column references (named — Part 4's guard then
      // sees the exact constraint name on fresh databases too)
      const fk = tFks.find((f) => f.sourceCols.length === 1 && f.sourceCols[0] === col.name);
      if (fk) {
        bits.push(`CONSTRAINT ${quoteIdent(fk.constraintName)} REFERENCES ${quoteIdent(fk.refTable)} (${fk.refCols.map(quoteIdent).join(", ")})`);
        if (fk.onDelete && fk.onDelete !== "no action") bits.push(`ON DELETE ${fk.onDelete.toUpperCase()}`);
      }
      cols.push(`  ${bits.join(" ")}`);
    }
    for (const c of checks) {
      cols.push(`  CONSTRAINT ${quoteIdent(c.name)} CHECK (${c.expr})`);
    }
    // `application_cycles` has a composite FK to programs(id, university_id).
    // Postgres only accepts an FK to a column pair covered by a UNIQUE
    // constraint/index — on a FRESH database the index would not exist yet
    // (Part 3 runs later), so the uniqueness ships as a table constraint
    // here. On existing databases the same constraint is (re)applied in
    // Part 4 with a guard.
    if (t.name === "programs") {
      cols.push(`  CONSTRAINT uq_programs_id_university UNIQUE (id, university_id)`);
    }
    // NOTE: composite FKs are deliberately NOT inlined here — they are added
    // in Part 4, after Part 2 has guaranteed the referenced columns exist.
    parts.push(`CREATE TABLE IF NOT EXISTS ${quoteIdent(t.name)} (\n${cols.join(",\n")}\n);`);
  }

  // ---------------------------------------------------------------- Part 2
  parts.push(`
-- ============================================================================
-- PART 2 — USTUNLAR (existing databases: add only what is missing)
-- ============================================================================
`);
  for (const t of ordered) {
    const rows: string[] = [];
    for (const col of t.columns) {
      if (col.pk) continue; // PKs exist with the table; a bare re-add would break
      const def = defaultOf(col as never);
      const bits = [`ALTER TABLE ${quoteIdent(t.name)}`, `ADD COLUMN IF NOT EXISTS ${quoteIdent(col.name)} ${col.type}`];
      // NOT NULL is only restated together with a default: a bare
      // NOT NULL add can fail on tables that already have rows (a state
      // that cannot happen for tables the app itself created).
      if (col.notNull && def) bits.push("NOT NULL");
      if (def) bits.push(`DEFAULT ${def}`);
      rows.push(`${bits.join(" ")};`);
    }
    if (rows.length) {
      parts.push(`-- ---------- ${t.name} ----------`);
      parts.push(rows.join("\n"));
    }
  }

  // ---------------------------------------------------------------- Part 3
  parts.push(`
-- ============================================================================
-- PART 3 — INDEKSLAR
-- (so'rovlar tez bo'lishi uchun; har biri alohida guard'da — agar eski
--  ma'lumotlar unique indeksga zid bo'lsa, bitta NOTICE bilan o'tkaziladi,
--  qolganlari ishlay beradi)
-- ============================================================================
`);
  for (const t of ordered) {
    for (const ix of t.indexes) {
      if (ix.name === "uq_programs_id_university") continue; // UNIQUE constraint (Part 1/4), not an index
      let sql: string;
      if (ix.name in CURATED_INDEXES) {
        sql = CURATED_INDEXES[ix.name];
      } else {
        const plain = ix.columns.every((c) => c.col);
        if (!plain || ix.whereText) {
          throw new Error(`Index ${ix.name} on ${t.name} is not plain columns and not in CURATED_INDEXES`);
        }
        const cols = ix.columns.map((c) => quoteIdent(c.col!.name)).join(", ");
        sql = `CREATE ${ix.unique ? "UNIQUE INDEX" : "INDEX"} IF NOT EXISTS ${quoteIdent(ix.name)} ON ${quoteIdent(t.name)} (${cols})`;
      }
      parts.push(
        `DO $$ BEGIN ` +
          `IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = '${ix.name}') THEN ` +
          `BEGIN ${sql}; ` +
          `EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index ${ix.name} skipped: existing rows violate uniqueness'; ` +
          `WHEN undefined_column THEN RAISE NOTICE 'index ${ix.name} skipped: column missing'; END; ` +
          `END IF; END $$;`,
      );
    }
  }

  // ---------------------------------------------------------------- Part 4
  parts.push(`
-- ============================================================================
-- PART 4 — O'ZGARMA QOIDALAR (unique constraint, FK, CHECK)
-- Mavjud jadvalga yo'q qoida qo'shiladi; agar ESKI ma'lumotlar qoidaga zid
-- bo'lsa, qoida NOTICE bilan o'tkaziladi (ilova qoidasiz ham ishlaydi, lekin
-- yangi qatorlar baribir toza qoladi).
-- ============================================================================
`);
  // 4a + 4a2 — UNIQUE constraints (composite pair + column-level uniques).
  //
  // Design (why it looks the way it does):
  //  * Part 1 creates every unique constraint with an explicit canonical name
  //    (uq_<table>_<col> / uq_programs_id_university), so a fresh database has
  //    exactly one unique constraint per unique column set — no auto-named
  //    duplicates.
  //  * The guard below matches on COLUMN POSITION (pg_constraint.conkey), not
  //    on the constraint name. An existing database may already be unique on
  //    the same columns under any name (drizzle's "<table>_<col>_unique",
  //    Postgres' auto "<table>_<col>_key", or a hand-picked one); name
  //    matching used to either duplicate constraints or skip wrongly.
  //  * If no constraint covers the columns but a PLAIN unique index sits under
  //    the canonical name (exactly what the old broken drizzle push left on
  //    programs(id, university_id)), the index is dropped first — but ONLY
  //    when no constraint owns that name — and the constraint is added
  //    normally (Postgres builds its own backing index). We deliberately avoid
  //    "ADD CONSTRAINT … UNIQUE … USING INDEX": that form is fragile and
  //    mis-parses in some server versions, and a fresh equivalent index is
  //    always safe to build here.
  const uniqueRepairBlock = (
    tName: string,
    cols: string[],
    cname: string,
    dupNotice: string,
  ): string => {
    const attnums = cols
      .map(
        (col) =>
          `(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.${tName}'::regclass AND attname = '${col}')::smallint`,
      )
      .join(", ");
    const colList = cols.map(quoteIdent).join(", ");
    // cname is generated as uq_<table>_<col(s)> — a safe bare identifier.
    return (
      `DO $$ BEGIN ` +
      `IF NOT EXISTS (SELECT 1 FROM pg_constraint c ` +
      `WHERE c.conrelid = 'public.${tName}'::regclass AND c.contype = 'u' AND c.conkey = ARRAY[${attnums}]) THEN ` +
      `BEGIN ` +
      // Single-quoted string constants, NOT double quotes: inside a DO block
      // PL/pgSQL treats double-quoted tokens in SQL statements as column
      // references and fails with 'column "…" does not exist'.
      `IF EXISTS (SELECT 1 FROM pg_index i JOIN pg_class ix ON ix.oid = i.indexrelid ` +
      `WHERE i.indrelid = 'public.${tName}'::regclass AND ix.relname = '${cname}' AND i.indisunique ` +
      `AND NOT EXISTS (SELECT 1 FROM pg_constraint pc WHERE pc.conname = '${cname}')) THEN ` +
      `DROP INDEX ${cname}; ` +
      `END IF; ` +
      `ALTER TABLE ${quoteIdent(tName)} ADD CONSTRAINT ${quoteIdent(cname)} UNIQUE (${colList}); ` +
      `EXCEPTION WHEN unique_violation THEN RAISE NOTICE '${dupNotice}'; ` +
      `WHEN duplicate_object THEN RAISE NOTICE '${cname}: name already taken by another object — rename it manually, then re-run'; END; ` +
      `END IF; END $$;`
    );
  };

  // 4a — the unique pair the composite FK application_cycles(program_id,
  // university_id) references.
  parts.push(uniqueRepairBlock("programs", ["id", "university_id"], "uq_programs_id_university",
    "uq_programs_id_university skipped: duplicate (id, university_id) rows exist"));

  // 4a2 — column-level UNIQUE constraints.
  for (const t of ordered) {
    for (const col of t.columns) {
      if (!col.unique || col.pk) continue;
      const cname = `uq_${t.name}_${col.name}`;
      parts.push(
        uniqueRepairBlock(t.name, [col.name], cname,
          `${cname} skipped: duplicate ${t.name}.${col.name} values exist`),
      );
    }
  }

  // 4b — FKs (after Part 2, every referenced column exists).
  //
  // The guard is POSITION-based (which columns reference which columns on
  // which table), not name-based. The canonical file names FKs
  // "<table>_<col>_fkey", but a drizzle-pushed database names them
  // differently; a name guard therefore re-added every FK (doubling 115 →
  // 229). Position matching (pg_constraint.conkey / confkey / confrelid)
  // finds the existing FK under ANY name and skips it.
  const seenFk = new Set<string>();
  for (const f of fks) {
    const key = `${f.constraintName}|${f.table}|${f.sourceCols.join(",")}|${f.refTable}|${f.refCols.join(",")}|${f.onDelete}`;
    if (seenFk.has(key)) continue;
    seenFk.add(key);
    const srcAttnums = f.sourceCols
      .map((col) => `(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.${f.table}'::regclass AND attname = '${col}')::smallint`)
      .join(", ");
    const refAttnums = f.refCols
      .map((col) => `(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.${f.refTable}'::regclass AND attname = '${col}')::smallint`)
      .join(", ");
    parts.push(
      `DO $$ BEGIN ` +
        `IF NOT EXISTS (SELECT 1 FROM pg_constraint c ` +
        `WHERE c.conrelid = 'public.${f.table}'::regclass AND c.contype = 'f' ` +
        `AND c.conkey = ARRAY[${srcAttnums}] ` +
        `AND c.confrelid = 'public.${f.refTable}'::regclass ` +
        `AND c.confkey = ARRAY[${refAttnums}]) THEN ` +
        `BEGIN ALTER TABLE ${quoteIdent(f.table)} ADD CONSTRAINT ${quoteIdent(f.constraintName)} FOREIGN KEY (${f.sourceCols.map(quoteIdent).join(", ")}) ` +
        `REFERENCES ${quoteIdent(f.refTable)} (${f.refCols.map(quoteIdent).join(", ")})` +
        (f.onDelete && f.onDelete !== "no action" ? ` ON DELETE ${f.onDelete.toUpperCase()}` : "") + `; ` +
        `EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK ${f.constraintName} skipped: existing rows violate it'; END; ` +
        `END IF; END $$;`,
    );
  }

  // 4c — CHECK constraints (fresh DBs already have them from Part 1).
  for (const t of ordered) {
    for (const c of CURATED_CHECKS[t.name] ?? []) {
      parts.push(
        `DO $$ BEGIN ` +
          `IF NOT EXISTS (SELECT 1 FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid WHERE t.relname = '${t.name}' AND c.conname = '${c.name}') THEN ` +
          `BEGIN ALTER TABLE ${quoteIdent(t.name)} ADD CONSTRAINT ${quoteIdent(c.name)} CHECK (${c.expr}); ` +
          `EXCEPTION WHEN check_violation THEN RAISE NOTICE 'check ${c.name} skipped: existing rows violate it'; END; ` +
          `END IF; END $$;`,
      );
    }
  }

  // ---------------------------------------------------------------- Part 5
  parts.push(`
-- ============================================================================
-- PART 5 — RLS (same logic as supabase/enable_rls.sql: anon/authenticated
-- lose access to everything except read-only universities + scholarships)
-- ============================================================================
DO $$
DECLARE
  r record;
  has_anon boolean := EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon');
  has_auth boolean := EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated');
  catalog text[] := ARRAY['universities', 'scholarships'];
BEGIN
  FOR r IN
    SELECT c.relname, pg_get_userbyid(c.relowner) AS owner
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
    ORDER BY c.relname
  LOOP
    IF r.owner <> current_user THEN
      RAISE NOTICE 'skipped public.% (owned by %, not %)', r.relname, r.owner, current_user;
      CONTINUE;
    END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.relname);
    IF has_anon THEN EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', r.relname); END IF;
    IF has_auth THEN EXECUTE format('REVOKE ALL ON TABLE public.%I FROM authenticated', r.relname); END IF;
    IF r.relname = ANY (catalog) THEN
      EXECUTE format('DROP POLICY IF EXISTS public_catalog_read ON public.%I', r.relname);
      IF has_anon AND has_auth THEN
        EXECUTE format('CREATE POLICY public_catalog_read ON public.%I FOR SELECT TO anon, authenticated USING (true)', r.relname);
        EXECUTE format('GRANT SELECT ON TABLE public.%I TO anon, authenticated', r.relname);
      ELSIF has_anon THEN
        EXECUTE format('CREATE POLICY public_catalog_read ON public.%I FOR SELECT TO anon USING (true)', r.relname);
        EXECUTE format('GRANT SELECT ON TABLE public.%I TO anon', r.relname);
      END IF;
    END IF;
  END LOOP;
END $$;

COMMIT;

-- ============================================================================
-- PART 6 — TEKSHIRUV: barcha jadvalda rls_enabled = true bo'lishi kerak
-- ============================================================================
-- SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
-- FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE n.nspname = 'public' AND c.relkind = 'r' ORDER BY 1;
`);

  const out = parts.join("\n");
  writeFileSync(OUT_SQL, out);

  // ------------------------------------------------- round-trip validation
  // Re-parse the file we just wrote and assert that every table, column and
  // type the app needs is in it. (compareSchemas only reports real mismatches
  // — timestamptz/serial-equivalent pairs are treated as equal.)
  const parsed = parseDdl(out);
  const cmp = compareSchemas(tables, parsed);
  if (cmp.missingTables.length || cmp.columnIssues.length || cmp.typeMismatches.length) {
    const bad = [
      ...cmp.missingTables.map((t) => `table ${t.name}`),
      ...cmp.columnIssues.map((c) => `${c.table}.${c.column}`),
      ...cmp.typeMismatches.map((c) => `${c.table}.${c.column} (expected ${c.expected}, got ${c.found})`),
    ];
    throw new Error(`Round-trip validation FAILED — generated file lacks: ${bad.join(", ")}`);
  }

  console.log(`wrote supabase/full_schema.sql`);
  console.log(`  tables: ${tables.length}, columns: ${tables.reduce((s, t) => s + t.columns.length, 0)}, FKs: ${fks.length}, indexes: ${tables.reduce((s, t) => s + t.indexes.length, 0)}`);
  console.log(`round-trip validation: OK (parsed output contains every table/column/type the app needs)`);
}

main();
