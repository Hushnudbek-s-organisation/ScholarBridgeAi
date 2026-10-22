#!/usr/bin/env node
/** Fail-closed read-only preflight for supabase/catalog_and_integrity_2026_patch.sql. */
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";

const ROOT = resolve(import.meta.dirname, "..");
const migrationPath = resolve(ROOT, "supabase/catalog_and_integrity_2026_patch.sql");
const migrationSha256 = "806c7b767e17d8109d2a5ea4ef8e767e3158855c914f849d516f8e0c5c847ca9";
const requiredColumns = {
  universities: ["id", "name", "canonical_name", "short_name", "country", "country_code", "city", "flag_emoji", "world_ranking", "qs_rank_year", "annual_tuition_usd", "annual_tuition", "tuition_currency", "tuition_period", "description", "verification_status", "official_website_url", "website_url"],
  programs: ["id", "university_id", "name", "official_url", "source_url", "last_verified_at", "verification_status", "is_verified"],
  application_cycles: ["id", "university_id", "program_id", "academic_year", "deadline", "source_url", "last_verified_at", "verification_status"],
  sources: ["id", "url", "title", "domain", "source_type", "accessed_at", "is_official", "is_verified"],
  university_rankings: ["university_id", "ranking_provider", "ranking_name", "ranking_year", "rank", "rank_label", "source_id", "verified_at", "verification_status"],
  university_sources: ["university_id", "source_id", "source_type"],
  scholarships: ["id", "title", "provider", "country", "deadline", "deadline_date", "opening_date", "deadline_range_start", "deadline_range_end", "deadline_type", "application_status", "verification_status", "source_url", "last_verified_at", "notes", "is_active", "eligible_countries", "description", "requirements", "website_url", "coverage_type", "amount_usd_value", "award_amount", "award_currency", "award_period", "award_basis", "degree_levels", "eligible_majors"],
  forum_threads: ["id", "title", "body", "updated_at"],
};
const migrationAddedColumns = {
  universities: ["ranking_source", "data_version", "effective_from", "effective_to"],
  programs: ["source_type", "data_version", "effective_from", "effective_to"],
  scholarships: ["source_type", "data_version", "effective_from", "effective_to", "uzbekistan_quota_notes"],
};
const tableNames = Object.keys(requiredColumns);

function fail(message) {
  console.error(`NO-GO: ${message}`);
  process.exitCode = 1;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

// Pull only SELECT/WITH statements explicitly labelled PREVIEW/PREFLIGHT in
// the pinned migration. A small SQL lexer finds the statement terminator while
// respecting strings, quoted identifiers, comments and dollar quotes.
function extractReadOnlyPreviews(sql) {
  const markers = [...sql.matchAll(/^\s*--\s*(PREVIEW(?:\s*\(read-only\))?:[^\n]*|PREFLIGHT\s+\d+[A-Z][^\n]*)$/gim)];
  const previews = [];
  for (const marker of markers) {
    const label = marker[1].trim().replace(/\s+/g, " ");
    const afterMarker = marker.index + marker[0].length;
    const rest = sql.slice(afterMarker);
    const start = rest.search(/^(?:SELECT|WITH)\b/im);
    if (start < 0) throw new Error(`Marker ${label} is not followed by a read-only query`);
    let query = rest.slice(start);
    let single = false;
    let double = false;
    let lineComment = false;
    let blockComment = false;
    let dollarTag = null;
    let end = -1;
    for (let i = 0; i < query.length; i++) {
      const c = query[i];
      const next = query[i + 1];
      if (lineComment) { if (c === "\n") lineComment = false; continue; }
      if (blockComment) { if (c === "*" && next === "/") { blockComment = false; i++; } continue; }
      if (dollarTag) { if (query.startsWith(dollarTag, i)) { i += dollarTag.length - 1; dollarTag = null; } continue; }
      if (single) { if (c === "'" && next === "'") { i++; continue; } if (c === "'") single = false; continue; }
      if (double) { if (c === '"' && next === '"') { i++; continue; } if (c === '"') double = false; continue; }
      if (c === "-" && next === "-") { lineComment = true; i++; continue; }
      if (c === "/" && next === "*") { blockComment = true; i++; continue; }
      if (c === "'") { single = true; continue; }
      if (c === '"') { double = true; continue; }
      if (c === "$" ) {
        const tag = query.slice(i).match(/^\$[A-Za-z_0-9]*\$/)?.[0];
        if (tag) { dollarTag = tag; i += tag.length - 1; continue; }
      }
      if (c === ";") { end = i; break; }
    }
    if (end < 0) throw new Error(`Could not find statement end for ${label}`);
    query = query.slice(0, end).trim();
    const bare = query.replace(/--[^\n]*|\/\*[\s\S]*?\*\//g, " ").replace(/'(?:''|[^'])*'/g, "''");
    if (!/^(?:SELECT|WITH)\b/i.test(query) || /\b(INSERT|UPDATE|DELETE|MERGE|ALTER|DROP|CREATE|TRUNCATE|CALL|DO|GRANT|REVOKE|COPY)\b/i.test(bare)) {
      throw new Error(`Unsafe statement found under ${label}`);
    }
    previews.push({ label, query });
  }
  if (!previews.length) throw new Error("No migration preview queries found");
  return previews;
}

const supplementalQueries = [
  {
    label: "Phase 9 URL exceptions in the precise bulk-stamped verified programme cohort",
    query: `SELECT p.id, p.university_id, p.name, p.official_url, p.source_url,
       u.official_website_url, u.website_url,
       CASE
         WHEN p.official_url IS NULL OR p.source_url IS NULL THEN 'null_program_url'
         WHEN u.official_website_url IS NULL AND u.website_url IS NULL THEN 'null_university_homepage'
         WHEN NOT (
           COALESCE(lower(regexp_replace(rtrim(p.official_url), '/+$', '')) IN (
             lower(regexp_replace(rtrim(u.official_website_url), '/+$', '')),
             lower(regexp_replace(rtrim(u.website_url), '/+$', ''))), false)
           AND COALESCE(lower(regexp_replace(rtrim(p.source_url), '/+$', '')) IN (
             lower(regexp_replace(rtrim(u.official_website_url), '/+$', '')),
             lower(regexp_replace(rtrim(u.website_url), '/+$', ''))), false)
         ) THEN 'deep_link_or_url_exception'
         ELSE 'eligible_homepage_only'
       END AS url_disposition
FROM public.programs p
JOIN public.universities u ON u.id = p.university_id
WHERE p.last_verified_at >= TIMESTAMP '2026-10-17 00:00:00'
  AND p.last_verified_at < TIMESTAMP '2026-10-18 00:00:00'
  AND p.verification_status = 'verified' AND p.is_verified IS TRUE
ORDER BY url_disposition, p.university_id, p.id`,
  },
  {
    label: "Phase 9 application-cycle URL exceptions in the exact draft cohort",
    query: `SELECT c.id, c.university_id, c.program_id, c.academic_year, c.deadline,
       c.source_url, u.official_website_url, u.website_url,
       CASE WHEN c.source_url IS NULL THEN 'null_source_url'
            WHEN u.official_website_url IS NULL AND u.website_url IS NULL THEN 'null_university_homepage'
            WHEN NOT COALESCE(lower(regexp_replace(rtrim(c.source_url), '/+$', '')) IN (
              lower(regexp_replace(rtrim(u.official_website_url), '/+$', '')),
              lower(regexp_replace(rtrim(u.website_url), '/+$', ''))), false)
              THEN 'deep_link_or_url_exception'
            ELSE 'homepage_only_candidate' END AS url_disposition
FROM public.application_cycles c
JOIN public.universities u ON u.id = c.university_id
WHERE c.deadline = DATE '2027-03-01'
  AND c.last_verified_at >= TIMESTAMP '2026-10-17 00:00:00'
  AND c.last_verified_at < TIMESTAMP '2026-10-18 00:00:00'
  AND c.verification_status = 'verified'
ORDER BY url_disposition, c.university_id, c.id`,
  },
  {
    label: "Phase 10 QS source URL upsert and ranking-key collision checks",
    query: `WITH ranking_facts (canonical_key, aliases, rank_value, rank_label, profile_url) AS (
  VALUES
    ('Massachusetts Institute of Technology', ARRAY['Massachusetts Institute of Technology','Massachusetts Institute of Technology (MIT)','MIT'], 1, '1', 'https://www.topuniversities.com/universities/massachusetts-institute-technology-mit'),
    ('University of Oxford', ARRAY['University of Oxford'], 4, '4', 'https://www.topuniversities.com/universities/university-oxford'),
    ('Technical University of Munich', ARRAY['Technical University of Munich','Technical University of Munich (TUM)','TUM'], 25, '25', 'https://www.topuniversities.com/universities/technical-university-munich'),
    ('University of Toronto', ARRAY['University of Toronto','The University of Toronto','U of T'], 32, '32', 'https://www.topuniversities.com/universities/university-toronto'),
    ('EPFL – École polytechnique fédérale de Lausanne', ARRAY['EPFL','EPFL (École Polytechnique Fédérale de Lausanne)','École Polytechnique Fédérale de Lausanne','Ecole Polytechnique Federale de Lausanne'], 22, '=22', 'https://www.topuniversities.com/universities/epfl-ecole-polytechnique-federale-de-lausanne')
), source_rows AS (
  SELECT f.*, s.id AS source_id FROM ranking_facts f
  LEFT JOIN public.sources s ON s.url = f.profile_url
), university_matches AS (
  SELECT f.canonical_key, u.id AS university_id FROM ranking_facts f
  JOIN public.universities u
    ON lower(btrim(coalesce(u.name, ''))) = ANY (SELECT lower(a) FROM unnest(f.aliases) a)
    OR lower(btrim(coalesce(u.canonical_name, ''))) = ANY (SELECT lower(a) FROM unnest(f.aliases) a)
    OR lower(btrim(coalesce(u.short_name, ''))) = ANY (SELECT lower(a) FROM unnest(f.aliases) a)
)
SELECT 'source_url' AS collision_type, profile_url AS key_value,
       count(source_id)::int AS existing_rows, array_agg(source_id) FILTER (WHERE source_id IS NOT NULL) AS row_ids
FROM source_rows GROUP BY profile_url
UNION ALL
SELECT 'ranking_upsert_key', m.canonical_key || ':' || m.university_id::text,
       count(r.university_id)::int, array_agg(r.source_id) FILTER (WHERE r.source_id IS NOT NULL)
FROM university_matches m
JOIN ranking_facts f ON f.canonical_key = m.canonical_key
LEFT JOIN public.university_rankings r ON r.university_id = m.university_id
  AND r.ranking_provider = 'QS' AND r.ranking_name = 'World University Rankings' AND r.ranking_year = 2027
GROUP BY m.canonical_key, m.university_id
ORDER BY 1, 2`,
  },
  {
    label: "Phase 10 regional identity collisions (candidate aliases and canonical names)",
    query: `WITH regional (canonical_name, aliases) AS (
  VALUES
    ('Middle East Technical University', ARRAY['Middle East Technical University','Middle East Technical University (METU)','METU','ODTÜ','ODTU']),
    ('Koç University', ARRAY['Koç University','Koc University']),
    ('Boğaziçi University', ARRAY['Boğaziçi University','Bogazici University']),
    ('Sabancı University', ARRAY['Sabancı University','Sabanci University']),
    ('Eötvös Loránd University', ARRAY['Eötvös Loránd University','Eötvös Loránd University (ELTE)','Eotvos Lorand University','ELTE']),
    ('Budapest University of Technology and Economics', ARRAY['Budapest University of Technology and Economics','Budapest University of Technology and Economics (BME)','BME']),
    ('University of Debrecen', ARRAY['University of Debrecen']),
    ('Nazarbayev University', ARRAY['Nazarbayev University','NU']),
    ('Al-Farabi Kazakh National University', ARRAY['Al-Farabi Kazakh National University','Al-Farabi Kazakh National University (KazNU)','KazNU']),
    ('University of Warsaw', ARRAY['University of Warsaw','Warsaw University']),
    ('Jagiellonian University', ARRAY['Jagiellonian University']),
    ('Charles University', ARRAY['Charles University']),
    ('Czech Technical University in Prague', ARRAY['Czech Technical University in Prague','Czech Technical University in Prague (CTU)','CTU','ČVUT']),
    ('Westminster International University in Tashkent', ARRAY['Westminster International University in Tashkent','Westminster International University in Tashkent (WIUT)','WIUT']),
    ('Inha University in Tashkent', ARRAY['Inha University in Tashkent','Inha University in Tashkent (IUT)','IUT']),
    ('New Uzbekistan University', ARRAY['New Uzbekistan University','NewUU'])
)
SELECT r.canonical_name,
       count(DISTINCT u.id)::int AS alias_match_count,
       array_agg(DISTINCT u.id ORDER BY u.id) FILTER (WHERE u.id IS NOT NULL) AS matched_university_ids,
       count(DISTINCT uc.id)::int AS canonical_unique_index_collision_count,
       array_agg(DISTINCT uc.id ORDER BY uc.id) FILTER (WHERE uc.id IS NOT NULL) AS canonical_collision_ids
FROM regional r
LEFT JOIN public.universities u ON lower(btrim(coalesce(u.name,''))) = ANY(SELECT lower(a) FROM unnest(r.aliases) a)
  OR lower(btrim(coalesce(u.canonical_name,''))) = ANY(SELECT lower(a) FROM unnest(r.aliases) a)
  OR lower(btrim(coalesce(u.short_name,''))) = ANY(SELECT lower(a) FROM unnest(r.aliases) a)
LEFT JOIN public.universities uc ON lower(btrim(coalesce(uc.canonical_name,''))) = lower(btrim(r.canonical_name))
GROUP BY r.canonical_name ORDER BY r.canonical_name`,
  },
  {
    label: "NULL assumptions in the exact verification/date/URL predicates",
    query: `SELECT 'programs_bulk_verified' AS relation,
       count(*) FILTER (WHERE p.verification_status IS NULL)::int AS null_verification_status,
       count(*) FILTER (WHERE p.is_verified IS NULL)::int AS null_is_verified,
       count(*) FILTER (WHERE p.official_url IS NULL)::int AS null_official_url,
       count(*) FILTER (WHERE p.source_url IS NULL)::int AS null_source_url
FROM public.programs p
WHERE p.last_verified_at >= TIMESTAMP '2026-10-17 00:00:00' AND p.last_verified_at < TIMESTAMP '2026-10-18 00:00:00'
UNION ALL
SELECT 'application_cycles_draft_window',
       count(*) FILTER (WHERE c.verification_status IS NULL)::int,
       NULL::int,
       NULL::int,
       count(*) FILTER (WHERE c.source_url IS NULL)::int
FROM public.application_cycles c
WHERE c.deadline = DATE '2027-03-01' AND c.last_verified_at >= TIMESTAMP '2026-10-17 00:00:00' AND c.last_verified_at < TIMESTAMP '2026-10-18 00:00:00'
UNION ALL
SELECT 'scholarships_exact_target_titles',
       count(*) FILTER (WHERE s.verification_status IS NULL)::int,
       count(*) FILTER (WHERE s.is_active IS NULL)::int,
       count(*) FILTER (WHERE s.source_url IS NULL)::int,
       count(*) FILTER (WHERE s.eligible_countries IS NULL)::int
FROM public.scholarships s
WHERE lower(btrim(s.title)) IN ('chevening scholarship','stipendium hungaricum',lower('Türkiye Bursları Scholarship'),
  'gates cambridge scholarship','daad development-related postgraduate courses (epos)',
  'fulbright foreign student program','global korea scholarship (gks graduate 2027)',
  'erasmus mundus joint master degrees (emjmd)','chinese government scholarship (csc 2027/28)',
  'france excellence eiffel scholarship','australia awards scholarships')
UNION ALL
SELECT 'forum_seed_correction', NULL::int, NULL::int, count(*) FILTER (WHERE f.title IS NULL)::int,
       count(*) FILTER (WHERE f.body IS NULL)::int
FROM public.forum_threads f
WHERE f.title = 'Complete Calendar of Fully Funded Scholarships for Uzbek Students (2026–2027 Cycle)'`,
  },
  {
    label: "Required unique upsert constraints (source URL, university ranking key, canonical university identity)",
    query: `SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND indexname IN (
  'uq_sources_url', 'uq_university_ranking_edition', 'uq_universities_canonical_name_ci')
ORDER BY tablename, indexname`,
  },
  {
    label: "Phase 11 scholarship identity-source URL collisions and duplicate title sets",
    query: `WITH source_urls(url) AS (VALUES
  ('https://www.campuschina.org/content/details27_100758.html'),
  ('https://www.campusfrance.org/en/actu/call-for-france-excellence-eiffel-applications-2027'),
  ('https://www.dfat.gov.au/people-to-people/australia-awards/participating-countries'),
  ('https://www.turkiyeburslari.gov.tr/calendar'))
SELECT 'source_url' AS collision_type, u.url AS key_value, count(s.id)::int AS matching_rows,
       array_agg(s.id) FILTER (WHERE s.id IS NOT NULL) AS row_ids
FROM source_urls u LEFT JOIN public.sources s ON s.url = u.url GROUP BY u.url
UNION ALL
SELECT 'normalized_target_scholarship_title', lower(btrim(s.title)), count(*)::int,
       array_agg(s.id ORDER BY s.id)
FROM public.scholarships s
WHERE lower(btrim(s.title)) IN (
  'chevening scholarship','stipendium hungaricum',lower('Türkiye Bursları Scholarship'),
  'gates cambridge scholarship','daad development-related postgraduate courses (epos)',
  'fulbright foreign student program','global korea scholarship (gks graduate 2027)',
  'erasmus mundus joint master degrees (emjmd)','chinese government scholarship (csc 2027/28)',
  'france excellence eiffel scholarship','australia awards scholarships')
GROUP BY lower(btrim(s.title)) ORDER BY 1, 2`,
  },
];

function schemaQuery() {
  const values = tableNames.flatMap((table) => [
    ...requiredColumns[table].map((column) => `('${table}','${column}','existing')`),
    ...(migrationAddedColumns[table] ?? []).map((column) => `('${table}','${column}','added_by_patch')`),
  ]).join(",\n  ");
  return `WITH expected(table_name,column_name,column_class) AS (VALUES\n  ${values}\n)
SELECT e.table_name, e.column_name, e.column_class, c.data_type, c.udt_name, c.is_nullable,
       (c.column_name IS NOT NULL) AS present
FROM expected e
LEFT JOIN information_schema.columns c
  ON c.table_schema = 'public' AND c.table_name = e.table_name AND c.column_name = e.column_name
ORDER BY e.table_name, e.column_name`;
}

function identityQuery() {
  return `SELECT current_database() AS database_name, current_user AS role_name,
       inet_server_addr()::text AS server_address, inet_server_port() AS server_port,
       current_setting('transaction_read_only') AS transaction_read_only,
       pg_is_in_recovery() AS standby,
       r.rolsuper, r.rolcreatedb, r.rolcreaterole, r.rolreplication, r.rolbypassrls
FROM pg_roles r WHERE r.rolname = current_user`;
}

function readOnlySql(previews) {
  const all = [
    { label: "Target identity / read-only role", query: identityQuery() },
    { label: "Required public schema columns; includes NULLability", query: schemaQuery() },
    ...previews,
    ...supplementalQueries,
  ];
  return `-- Generated read-only preflight for migration SHA-256 ${migrationSha256}.\n-- No mutation statements are included. Inspect the target identity before reviewing data rows.\nBEGIN READ ONLY;\n\n${all.map(({ label, query }) => `-- ${label}\n${query};`).join("\n\n")}\n\nROLLBACK;\n`;
}

function parseManifest(raw) {
  const manifest = JSON.parse(raw);
  const required = ["targetId", "environment", "projectRef", "hostname", "port", "database", "readonlyRole", "production", "isolatedFromProduction", "verifiedBy", "independentlyCheckedAt", "expiresAt"];
  for (const key of required) if (manifest[key] === undefined || manifest[key] === null || manifest[key] === "") throw new Error(`Manifest is missing ${key}`);
  if (manifest.environment !== "staging" || manifest.production !== false || manifest.isolatedFromProduction !== true) throw new Error("Manifest must explicitly attest a non-production, isolated staging target");
  if (!/^[a-z0-9]{20}$/.test(manifest.projectRef) || manifest.targetId !== `staging:${manifest.projectRef}`) throw new Error("Target ID must match the exact Supabase staging project ref");
  if (manifest.hostname !== `db.${manifest.projectRef}.supabase.co` || Number(manifest.port) !== 5432 || manifest.database !== "postgres") throw new Error("Manifest must specify the direct Postgres endpoint for that exact staging project");
  if (typeof manifest.readonlyRole !== "string" || !/^phase11_preflight_[a-z0-9_]+$/.test(manifest.readonlyRole)) throw new Error("Use a dedicated phase11_preflight_* database role");
  if (typeof manifest.verifiedBy !== "string" || manifest.verifiedBy.trim().length < 3) throw new Error("Manifest must record who independently verified the target in the provider control plane");
  const checkedAt = Date.parse(manifest.independentlyCheckedAt);
  const expiresAt = Date.parse(manifest.expiresAt);
  const now = Date.now();
  if (!Number.isFinite(checkedAt) || !Number.isFinite(expiresAt) || checkedAt > now || now - checkedAt > 24 * 60 * 60_000 || expiresAt <= now || expiresAt - now > 24 * 60 * 60_000) throw new Error("Target manifest must be independently checked within the last 24 hours and expire within 24 hours");
  return manifest;
}

async function main() {
  const migration = await readFile(migrationPath, "utf8");
  const actualHash = sha256(migration);
  if (actualHash !== migrationSha256) throw new Error(`Migration changed since this preflight was reviewed (expected ${migrationSha256}, got ${actualHash}). Review and regenerate before use.`);
  const previews = extractReadOnlyPreviews(migration);
  const generated = readOnlySql(previews);

  // Static schema sanity: all required tables and columns must exist in both
  // the application Drizzle schema and the checked-in canonical SQL schema.
  const drizzle = await readFile(resolve(ROOT, "src/db/schema.ts"), "utf8");
  const canonical = await readFile(resolve(ROOT, "supabase/full_schema.sql"), "utf8");
  const universityV2 = await readFile(resolve(ROOT, "supabase/university_schema_v2.sql"), "utf8");
  const staticErrors = [];
  for (const [table, columns] of Object.entries(requiredColumns)) {
    const drizzleStart = drizzle.indexOf(`pgTable("${table}"`);
    const sqlStart = canonical.search(new RegExp(`CREATE TABLE IF NOT EXISTS (?:public\\.)?"?${table}"?\\s*\\(`, "i"));
    if (drizzleStart < 0) staticErrors.push(`Drizzle table missing: ${table}`);
    if (sqlStart < 0) staticErrors.push(`canonical SQL table missing: ${table}`);
    for (const column of columns) {
      const camel = column.replace(/_([a-z])/g, (_m, letter) => letter.toUpperCase());
      if (drizzleStart >= 0) {
        const blockEnd = drizzle.indexOf("\n});", drizzleStart);
        const block = drizzle.slice(drizzleStart, blockEnd < 0 ? drizzle.length : blockEnd);
        if (!block.includes(`"${column}"`) && !block.includes(`${camel}:`)) staticErrors.push(`Drizzle ${table}.${column} not found`);
      }
      if (sqlStart >= 0) {
        const blockEnd = canonical.indexOf("\n);", sqlStart);
        const block = canonical.slice(sqlStart, blockEnd < 0 ? canonical.length : blockEnd);
        if (!new RegExp(`\\b${column}\\b`, "i").test(block)) staticErrors.push(`canonical SQL ${table}.${column} not found`);
      }
    }
  }
  const v2Columns = {
    sources: ["url", "title", "domain", "source_type", "accessed_at", "is_official", "is_verified"],
    programs: ["university_id", "name", "official_url", "source_url", "last_verified_at", "verification_status", "is_verified"],
    application_cycles: ["university_id", "program_id", "academic_year", "deadline", "source_url", "last_verified_at", "verification_status"],
    university_rankings: ["university_id", "ranking_provider", "ranking_name", "ranking_year", "rank", "rank_label", "source_id", "verified_at", "verification_status"],
    university_sources: ["university_id", "source_id", "source_type"],
  };
  for (const [table, columns] of Object.entries(v2Columns)) {
    const start = universityV2.indexOf(`CREATE TABLE IF NOT EXISTS public.${table}`);
    const end = start < 0 ? -1 : universityV2.indexOf("\n);", start);
    const block = start < 0 ? "" : universityV2.slice(start, end < 0 ? universityV2.length : end);
    if (start < 0) staticErrors.push(`university_schema_v2 relation missing: ${table}`);
    for (const column of columns) if (start >= 0 && !new RegExp(`\\b${column}\\b`, "i").test(block)) staticErrors.push(`university_schema_v2 ${table}.${column} not found`);
  }
  for (const [table, columns] of Object.entries(migrationAddedColumns)) {
    const start = migration.indexOf(`ALTER TABLE public.${table}`);
    const end = start < 0 ? -1 : migration.indexOf(";", start);
    const block = start < 0 ? "" : migration.slice(start, end < 0 ? migration.length : end);
    for (const column of columns) if (!block.includes(`ADD COLUMN IF NOT EXISTS ${column}`)) staticErrors.push(`migration-added column declaration missing: ${table}.${column}`);
  }
  console.log(`Migration: ${migrationPath}\nSHA-256: ${actualHash}\nExtracted migration read-only preview queries: ${previews.length}\nSupplemental read-only checks: ${supplementalQueries.length}`);
  if (staticErrors.length) {
    console.error("Static schema/migration validation failures:\n" + staticErrors.map((e) => `  - ${e}`).join("\n"));
    fail("source-schema checks failed; no target connection attempted");
    return;
  }
  console.log("Static schemas: required mutation/predicate columns are present in Drizzle and supabase/full_schema.sql.");

  const sqlOut = process.argv.includes("--write-sql") ? resolve(process.cwd(), "phase11-preflight-readonly.sql") : null;
  if (sqlOut) {
    const { writeFile } = await import("node:fs/promises");
    await writeFile(sqlOut, generated, { mode: 0o600 });
    console.log(`Read-only SQL written: ${sqlOut}`);
  }
  if (process.argv.includes("--print-sql")) console.log(`\n${generated}`);

  const manifestArg = process.argv.find((arg) => arg.startsWith("--manifest="))?.slice("--manifest=".length);
  const confirmation = process.argv.find((arg) => arg.startsWith("--confirm-manifest-sha256="))?.slice("--confirm-manifest-sha256=".length);
  const dsn = process.env.PHASE11_PREFLIGHT_DSN;
  if (!manifestArg || !confirmation || !dsn) {
    console.log("\nDatabase checks: BLOCKED — no independently verified staging manifest + matching CLI SHA-256 confirmation + dedicated read-only DSN were supplied. No database connection was attempted.");
    console.log("Overall decision: NO-GO (affected data counts, duplicate identities, schema NULLability, and live URL/upsert collision checks remain uncollected).");
    console.log("Reproducible procedure: create an expiring manifest from the provider control plane for the exact isolated staging project; provide only a dedicated read-only phase11_preflight_* role over TLS; run this command with --manifest=<file> --confirm-manifest-sha256=<sha256 of that exact reviewed file> and PHASE11_PREFLIGHT_DSN. Review all returned rows/counts before any separate migration approval.");
    fail("staging target identity was not verified; data checks are blocked");
    return;
  }

  const manifestPath = resolve(manifestArg);
  const metadata = await stat(manifestPath);
  if ((metadata.mode & 0o077) !== 0) throw new Error("Target manifest permissions must be 0600 (owner-readable only)");
  const manifestRaw = await readFile(manifestPath, "utf8");
  if (sha256(manifestRaw) !== confirmation) throw new Error("Manifest SHA-256 does not match the explicit CLI confirmation; no connection attempted");
  const manifest = parseManifest(manifestRaw);
  const url = new URL(dsn);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error("Only PostgreSQL DSNs are accepted");
  if (decodeURIComponent(url.hostname) !== manifest.hostname || Number(url.port || 5432) !== Number(manifest.port) || decodeURIComponent(url.pathname.slice(1)) !== manifest.database || decodeURIComponent(url.username) !== manifest.readonlyRole) throw new Error("DSN host/port/database/role does not exactly match the reviewed manifest; no connection attempted");
  if (url.searchParams.get("sslmode") === "disable" || url.searchParams.get("sslmode") === "allow") throw new Error("TLS may not be disabled for a verified staging target");

  const { Client } = pg;
  const client = new Client({ connectionString: dsn, ssl: { rejectUnauthorized: true, servername: manifest.hostname }, application_name: "phase11-read-only-preflight" });
  let connected = false;
  try {
    await client.connect();
    connected = true;
    await client.query("BEGIN READ ONLY");
    const identity = (await client.query(identityQuery())).rows[0];
    const identitySafe = identity
      && identity.database_name === manifest.database
      && identity.role_name === manifest.readonlyRole
      && identity.transaction_read_only === "on"
      && identity.standby === false
      && identity.rolsuper === false && identity.rolcreatedb === false
      && identity.rolcreaterole === false && identity.rolreplication === false
      && identity.rolbypassrls === false;
    console.log("\nLive target identity:", JSON.stringify(identity));
    if (!identitySafe) throw new Error("Connected server identity or role safety did not match the reviewed manifest. No migration SQL was executed.");

    const schemaRows = (await client.query(schemaQuery())).rows;
    const missing = schemaRows.filter((row) => !row.present);
    const missingExisting = missing.filter((row) => row.column_class === "existing");
    const missingAdded = missing.filter((row) => row.column_class === "added_by_patch");
    const unexpectedAddedTypes = schemaRows.filter((row) => row.present && row.column_class === "added_by_patch" &&
      ((row.column_name.endsWith("_from") || row.column_name.endsWith("_to")) ? row.data_type !== "date" : row.data_type !== "text"));
    console.log(`Live schema: ${schemaRows.length - missing.length}/${schemaRows.length} required/current-or-patch column pairs present; ${missingAdded.length} patch-added fields are absent before migration.`);
    if (missingExisting.length || unexpectedAddedTypes.length) {
      console.error("Missing pre-existing columns:", missingExisting.map(({ table_name, column_name }) => `${table_name}.${column_name}`).join(", ") || "none");
      console.error("Unexpected types for existing patch-added columns:", unexpectedAddedTypes.map(({ table_name, column_name, data_type }) => `${table_name}.${column_name}=${data_type}`).join(", ") || "none");
      throw new Error("Live schema mismatch; data previews withheld.");
    }

    let livePreviews = previews;
    if (missingAdded.some((row) => row.table_name === "scholarships" && row.column_name === "uzbekistan_quota_notes")) {
      // If this migration-added column is absent, its own ADD COLUMN IF NOT
      // EXISTS will create it NULL for every legacy row. The exact Phase 11A
      // quota-note candidate count is therefore provably zero pre-migration.
      livePreviews = previews.map((preview) => preview.label.startsWith("PREFLIGHT 11A")
        ? { ...preview, query: preview.query.replace(new RegExp("count\\(s\\.id\\) FILTER \\(\\s*WHERE t\\.title = 'Stipendium Hungaricum'[\\s\\S]*?\\) AS unsupported_quota_note_candidates"), "0::bigint AS unsupported_quota_note_candidates") }
        : preview);
    }

    let totalRows = 0;
    let noGo = false;
    for (const { label, query } of [...livePreviews, ...supplementalQueries]) {
      const result = await client.query(query);
      totalRows += result.rowCount ?? result.rows.length;
      console.log(`\n[${label}] rows=${result.rowCount ?? result.rows.length}`);
      for (const row of result.rows) console.log(JSON.stringify(row));
      if (/ambiguous|exception|collision|duplicate/i.test(label) && result.rows.some((row) => Number(row.ambiguous_multiple_matches ?? row.alias_match_count ?? row.canonical_unique_index_collision_count ?? row.existing_rows ?? row.title_matches ?? row.matching_rows ?? row.matching_scholarship_rows ?? 0) > 1 || String(row.url_disposition ?? "").includes("exception"))) noGo = true;
    }
    await client.query("ROLLBACK");
    console.log(`\nRead-only transaction rolled back. Returned ${totalRows} preview/check rows.`);
    console.log(`Overall decision: ${noGo ? "NO-GO" : "GO FOR HUMAN REVIEW ONLY"}. GO is not authorization to execute the migration.`);
    if (noGo) process.exitCode = 1;
  } finally {
    if (connected) {
      try { await client.query("ROLLBACK"); } catch { /* already rolled back */ }
      await client.end();
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  console.error("Overall decision: NO-GO. No migration was run.");
  process.exitCode = 1;
});
