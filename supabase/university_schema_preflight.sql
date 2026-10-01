-- READ-ONLY PREFLIGHT for the university/program/catalog schema.
-- Safe to run even when expected relations or columns are absent.
-- No DDL, DML, temporary objects, or table renames are performed.

-- 1. Which expected relations exist?
WITH expected(table_name) AS (
  VALUES ('universities'), ('programs'), ('university_programs'),
         ('program_requirements'), ('application_cycles'), ('scholarships'),
         ('sources'), ('university_sources'), ('program_sources'),
         ('scholarship_sources'), ('university_rankings'),
         ('saved_universities'), ('saved_programs'), ('saved_scholarships')
)
SELECT e.table_name, to_regclass(format('public.%I', e.table_name)) AS relation
FROM expected e
ORDER BY e.table_name;

-- 2. Exact columns/types/nullability/defaults for relations that do exist.
SELECT c.table_schema, c.table_name, c.ordinal_position, c.column_name,
       c.data_type, c.udt_name, c.is_nullable, c.column_default
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name IN (
    'universities', 'programs', 'university_programs', 'program_requirements',
    'application_cycles', 'scholarships', 'sources', 'university_sources',
    'program_sources', 'scholarship_sources', 'university_rankings',
    'saved_universities', 'saved_programs', 'saved_scholarships'
  )
ORDER BY c.table_name, c.ordinal_position;

-- 3. Existing PK/unique/FK/check/exclusion constraints and their definitions.
SELECT ns.nspname AS schema_name, tbl.relname AS table_name, con.conname,
       CASE con.contype WHEN 'p' THEN 'PRIMARY KEY' WHEN 'u' THEN 'UNIQUE'
            WHEN 'f' THEN 'FOREIGN KEY' WHEN 'c' THEN 'CHECK'
            WHEN 'x' THEN 'EXCLUSION' ELSE con.contype::text END AS constraint_type,
       pg_get_constraintdef(con.oid, true) AS definition
FROM pg_constraint con
JOIN pg_class tbl ON tbl.oid = con.conrelid
JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
WHERE ns.nspname = 'public'
  AND tbl.relname IN (
    'universities', 'programs', 'university_programs', 'program_requirements',
    'application_cycles', 'scholarships', 'sources', 'university_sources',
    'program_sources', 'scholarship_sources', 'university_rankings',
    'saved_universities', 'saved_programs', 'saved_scholarships'
  )
ORDER BY tbl.relname, con.contype, con.conname;

-- 4. Approximate row counts (statistics can be stale; this is not a data export).
SELECT relname AS table_name, n_live_tup::bigint AS estimated_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND relname IN (
    'universities', 'programs', 'university_programs', 'program_requirements',
    'application_cycles', 'scholarships', 'sources', 'university_rankings',
    'saved_universities', 'saved_programs', 'saved_scholarships'
  )
ORDER BY relname;

-- 5. Duplicate/orphan checks use dynamic read-only query_to_xml so a missing
-- table/column does not make the catalog audit fail. Review XML results in
-- university_schema_data_audit.sql after checking relation/column names above.
-- This file intentionally does not inspect or alter row contents.
