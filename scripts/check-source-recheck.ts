/**
 * Regression guard for the 2026-11-06 official-source corrections.
 *
 * It does NOT prove a production database was updated. It proves the repository
 * no longer re-seeds the disproven values, that a reviewable, non-applied
 * migration plus a live-DB findings document exist, and that the migration's
 * guards target the exact values observed in the real Supabase project.
 *
 * Run: npm run test:source-recheck
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

let passed = 0;
const failures: string[] = [];
function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failures.push(`${name}: ${(error as Error).message}`);
    console.log(`  ✗ ${name} — ${(error as Error).message}`);
  }
}

console.log("\nOfficial-source recheck — repository evidence");

check("MIT official pages replace invented GPA/SAT cutoffs in the seed", () => {
  const seed = read("data/supabase_enrichment.sql");
  const mitLine = seed.split("\n").find((line) => line.includes("Massachusetts Institute of Technology (MIT)"))!;
  assert.match(mitLine, /,3\.9,NULL,7\.0,100,NULL,/);
  assert.doesNotMatch(mitLine, /,3\.9,3\.9,7\.0,100,1520,/);
});

check("the parsed PDF registry labels MIT figures as observed, not official", () => {
  const rows = JSON.parse(read("data/top300_universities_pdf_2026.json")) as Array<Record<string, unknown>>;
  const mit = rows.find((row) => row.name === "Massachusetts Institute of Technology (MIT)")!;
  assert.equal(mit.gpa, null);
  assert.equal(mit.sat, null);
  assert.equal(mit.gpa_value_type, "observed_third_party_estimate");
  assert.equal(mit.sat_value_type, "observed_third_party_estimate");
  assert.equal(mit.verification_status, "review_needed");
  assert.equal(mit.official_source_url, "https://mitadmissions.org/apply/firstyear/tests-scores/");
});

check("Yenching seed records the official IELTS 7.0 and no numeric stipend", () => {
  const sql = read("supabase/international_scholarships_batch1_2026-10-23.sql");
  const start = sql.indexOf("-- 894 — Yenching");
  const end = sql.indexOf("\n);", start);
  const block = sql.slice(start, end);
  assert.match(block, /NULL, 7\.0,/);
  assert.match(block, /'Tuition \+ accommodation \+ monthly stipend \+ travel \+ field study \(amounts not published\)', NULL,/);
  assert.match(block, /IELTS Academic 7\.0 overall/);
  assert.match(block, /amount_usd_value is NULL/);
  assert.doesNotMatch(block, /does not print them - only third-party blogs/);
  assert.doesNotMatch(block, /medical insurance/);
  assert.doesNotMatch(block, /"All"\]/);
});

check("Yenching program row is review-needed, not a verified 6.5 / USD 5,500 claim", () => {
  const csv = read("data/programs_enriched_full.csv");
  const row = csv.split("\n").find((line) => line.startsWith("630,22,Yenching"))!;
  assert.match(row, /,7\.0,.*review_needed/);
  assert.doesNotMatch(row, /,5500,USD,year/);
  assert.match(row, /2026-11-30/);
  const duplicate = csv.split("\n").find((line) => line.startsWith("185,1,MBA (MIT Sloan)"))!;
  assert.match(duplicate, /false,review_needed/);
});

check("a reviewable migration exists and is explicitly marked not applied", () => {
  const migration = read("supabase/official_source_corrections_2026-11-06.sql");
  assert.match(migration, /NOT APPLIED BY THE AGENT/);
  assert.match(migration, /BEGIN;/);
  assert.match(migration, /COMMIT;/);
  assert.match(migration, /mitadmissions\.org\/apply\/firstyear\/tests-scores\//);
  assert.match(migration, /yenchingacademy\.pku\.edu\.cn\/ADMISSIONS\.htm/);
  assert.match(migration, /bulk replacement/i);
  assert.match(migration, /no delete/i);
  // Comments intentionally describe what the migration must NOT do; check only
  // executable SQL for destructive statements.
  const sqlOnly = migration
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  assert.doesNotMatch(sqlOnly, /DROP TABLE|TRUNCATE|DELETE FROM public\.students/i);
});

check("the migration guards the exact live Yenching and MIT values", () => {
  const migration = read("supabase/official_source_corrections_2026-11-06.sql");
  for (const phrase of [
    "amount_usd_value = 5040",
    "award_period = 'month'",
    "living_allowance = 3000",
    "english_requirements ILIKE '%does not publish%'",
    "notes ILIKE '%does not print%'",
    "min_gpa = 3.91",
    "min_sat = 1520",
    "acceptance_rate = 4.5",
    "DROP NOT NULL",
    "min_ielts DROP DEFAULT",
    "eligible_majors SET DEFAULT '[]'::text",
    "degree_levels SET DEFAULT '[]'::text",
    "verification_status = 'review_needed'",
    "yenching_candidates <> 1",
    "mit_candidates <> 1",
    "RAISE EXCEPTION 'Yenching guard found",
    "RAISE EXCEPTION 'MIT guard found",
    "yenching_corrected <> 1",
    "mit_corrected <> 1",
    "title ILIKE '%Yenching Academy%'",
    "provider ILIKE '%Peking University%'",
    "yenchingacademy.pku.edu.cn",
    "university_sources us",
    "min(s.id)",
    "min(u.id)",
  ]) assert.ok(migration.includes(phrase), `missing live-value guard: ${phrase}`);
});

check("the migration is repeat-safe, explains table-level effects and has a value rollback", () => {
  const migration = read("supabase/official_source_corrections_2026-11-06.sql");
  const rollback = read("supabase/official_source_corrections_2026-11-06_rollback.sql");
  assert.match(migration, /TABLE-LEVEL EFFECTS/);
  assert.match(migration, /DROP NOT NULL drops ONLY the constraint/);
  assert.match(migration, /'\[\]' is an UNKNOWN/);
  assert.match(migration, /already-corrected row/);
  assert.match(migration, /NOT EXISTS \(/);
  assert.match(rollback, /NOT APPLIED BY THE AGENT/);
  assert.match(rollback, /does NOT delete a row/);
  assert.match(rollback, /Keeping amount_usd_value nullable/);
  assert.match(rollback, /Deliberately NOT restored/);
});

check("remaining evidence gaps are documented as review-needed", () => {
  const doc = read("docs/OFFICIAL_SOURCE_RECHECK_2026-11-06.md");
  for (const phrase of [
    "NOT APPLIED",
    "QS edition",
    "$5,040",
    "duplicate MBA",
    "No blanket",
    "Failed verification",
    "DROP NOT NULL",
    "default `6.5`",
    "356 ta universitet",
  ]) assert.ok(doc.includes(phrase), `missing: ${phrase}`);
  assert.doesNotMatch(doc, /sb_secret_|eyJhbGciOi|SUPABASE_DB_URL.*postgresql:\/\//i);
});

check("the QS 2026 / 2027 source-name mismatch is resolved in seeds", () => {
  for (const file of ["src/db/seedVerifiedUniversityFacts.ts", "src/db/seed.ts", "scripts/check-seed-catalog.ts"]) {
    const source = read(file);
    assert.doesNotMatch(source, /VERIFIED_QS_2027|QS_2027|QS World University Rankings 2027/);
  }
  assert.match(read("src/db/seedVerifiedUniversityFacts.ts"), /VERIFIED_QS_2026/);
  assert.match(read("src/db/seedVerifiedUniversityFacts.ts"), /qsRankYear: 2026/);
});

check("no code or data file presents a numeric 5040 stipend as a fact", () => {
  const targets = [
    "data/top300_universities_pdf_2026.json",
    "data/programs_enriched_full.csv",
    "supabase/international_scholarships_batch1_2026-10-23.sql",
  ];
  for (const file of targets) assert.doesNotMatch(read(file), /5,040|\$5040/);
});

// ---- §5: open official-source items closed with queries, not "data owner" --
check("MIT / Yenching open items have concrete read-only queries and next steps", () => {
  const doc = read("docs/OFFICIAL_SOURCE_OPEN_ITEMS_2026-11-06.md");
  assert.match(doc, /READ-ONLY/, "queries are explicitly read-only");
  assert.match(doc, /amount_usd_value = 5040/, "$5,040 origin query exists");
  assert.match(doc, /lower\(p\.name\) LIKE '%mba%'/, "duplicate MBA detection is name-based");
  assert.match(doc, /count\(DISTINCT a\.id\) AS applications/, "applications are checked before merge");
  assert.match(doc, /count\(DISTINCT sv\.id\) AS saved_rows/, "saved rows are checked before merge");
  assert.match(doc, /lower\(u\.website_url\) LIKE '%mit\.edu%'/, "official domain is a guard, not only id");
  // The query must use the REAL schema: `public.programs`, `website_url`, and
  // no invented foreign key. A read-only query against a nonexistent column is
  // only a declaration, not an executable check.
  assert.match(doc, /FROM public\.programs p/, "program table name matches src/db/schema.ts");
  assert.doesNotMatch(doc, /FROM public\.university_programs/, "no nonexistent table in the query");
  assert.doesNotMatch(doc, /a\.program_id\s*=\s*p\.id/, "no invented applications.program_id FK");
  assert.match(doc, /applications\.program_id` \*\*mavjud emas\*\*/, "the missing FK is documented, not assumed");
  // The document EXPLAINS that id 185 alone is not enough; what must be absent
  // is an executable query that actually filters on that single id.
  const sqlBlocks = [...doc.matchAll(/```sql([\s\S]*?)```/g)].map((m) => m[1]).join("\n");
  assert.doesNotMatch(sqlBlocks, /\bid\s*=\s*185\b/i, "no executable query filters only on id 185");
  assert.match(doc, /DELETE.+o.?rniga|DELETE.*o‘rniga|jismonan o‘chirilmagani/iu, "no lossy delete; redirect/merge plan");
  assert.match(doc, /unknown\/review_needed/, "missing sources stay review-needed");
  assert.match(doc, /keyingi qadam|next step/i, "every unknown has a next step");
  assert.match(doc, /yenchingacademy\.pku\.edu\.cn/, "official Yenching domain");
  assert.match(doc, /mitadmissions\.org|oge\.mit\.edu|eecs\.mit\.edu/, "official MIT program/funding domains");
  assert.match(doc, /dastur davomiyligi.*moliyalashtirish davomiyligi|Program Structure/iu, "duration vs funding duration separated");
  assert.doesNotMatch(doc, /data owner (tasdiqi|kerak)/i, "no 'data owner needed' stop for ordinary checks");
});

check("a waiver/two-year/medical-insurance fact is not marked wrong from one page", () => {
  const doc = read("docs/OFFICIAL_SOURCE_OPEN_ITEMS_2026-11-06.md");
  assert.match(doc, /Noto‘g‘ri deb belgilanmadi|Noto'g'ri deb belgilanmadi/);
  assert.match(doc, /fellowship|Program Structure/i);
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}
