/**
 * §2 — REAL disposable-Postgres proof for forward/recovery separation.
 *
 * Applies the ACTUAL forward chain twice, proves guarded abort, proves the v2
 * recovery refuses a row whose forward marker is gone and preserves a field
 * that was legitimately edited AFTER the correction, and proves the security
 * recovery keeps LOGO readable while anon cannot read a private object.
 *
 * NO production connection. Run: npm run test:migration-recovery
 */
import EmbeddedPostgres from "embedded-postgres";
import { Client } from "pg";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const PORT = 55445;
const DB = "sbrecovery";
const URL_ = `postgresql://test:test@127.0.0.1:${PORT}/${DB}`;
const DATA_DIR = "/tmp/sb-recovery-pg";
const sql = (f: string) => readFileSync(join(ROOT, "supabase", f), "utf8");

const F_SECURITY = "security_evidence_research_2026-11-06.sql";
const F_CORRECT = "official_source_corrections_2026-11-06.sql";
const F_V2 = "official_source_followup_2026-11-06_v2.sql";
const R_V2 = "official_source_corrections_2026-11-06_rollback_v2.sql";
const R_SEC = "security_evidence_research_2026-11-06_recovery.sql";

let passed = 0;
const failures: string[] = [];
async function check(name: string, fn: () => void | Promise<void>) {
  try { await fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { const m = e instanceof Error ? e.message : String(e); failures.push(`${name}: ${m}`); console.log(`  ✗ ${name} — ${m}`); }
}
/** A failed multi-statement SQL leaves the pg connection in an aborted
 *  transaction; ROLLBACK is required before the next assertion. */
async function expectSqlFailure(queryText: string, re: RegExp) {
  let message = "";
  try { await client.query(queryText); }
  catch (e) { message = e instanceof Error ? e.message : String(e); }
  try { await client.query("ROLLBACK"); } catch { /* no open transaction */ }
  assert.ok(message, "expected the SQL to fail, but it succeeded");
  assert.match(message, re);
}

let pg: EmbeddedPostgres | null = null;
let client!: Client;

async function main() {
  console.log("\nMigration forward / recovery — REAL disposable Postgres (no production)");
  rmSync(DATA_DIR, { recursive: true, force: true });
  pg = new EmbeddedPostgres({ databaseDir: DATA_DIR, user: "test", password: "test", port: PORT,
    persistent: false, onLog: () => {}, onError: () => {} });
  await pg.initialise(); await pg.start(); await pg.createDatabase(DB);

  execSync("npx drizzle-kit push --force", { cwd: ROOT,
    env: { ...process.env, DATABASE_URL: URL_ }, encoding: "utf8",
    stdio: ["ignore", "ignore", "pipe"], timeout: 240_000 });

  client = new Client({ connectionString: URL_ }); await client.connect();
  await client.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='postgres') THEN CREATE ROLE postgres NOLOGIN BYPASSRLS; END IF;
    END $$;
    GRANT USAGE ON SCHEMA public TO postgres, service_role;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
    CREATE SCHEMA IF NOT EXISTS storage;
    CREATE TABLE IF NOT EXISTS storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text);
    GRANT USAGE ON SCHEMA storage TO anon, authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO anon, authenticated;
    GRANT ALL ON storage.objects TO postgres, service_role;
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Public can read LOGO assets" ON storage.objects;
    CREATE POLICY "Public can read LOGO assets" ON storage.objects FOR SELECT TO public USING (bucket_id = 'LOGO');
    INSERT INTO storage.objects (bucket_id, name) VALUES ('LOGO','logo.png'), ('PRIVATE_DOCUMENTS','other.pdf');
    INSERT INTO public.universities
      (name, country, description, website_url, min_gpa, min_sat, acceptance_rate,
       data_source, source_url, verification_status, source_reliability, is_active)
    VALUES ('Massachusetts Institute of Technology (MIT)','United States','Disposable','https://www.mit.edu',
            3.91,1520,4.5,'Top 300 Universities dataset (user PDF, 2026)','https://www.mit.edu','verified',7,TRUE);
    INSERT INTO public.scholarships
      (title, provider, country, coverage_type, amount_usd_value, award_currency, award_period,
       award_basis, deadline, degree_levels, eligible_majors, min_ielts, description, requirements,
       website_url, deadline_type, recurrence, application_status, verification_status,
       source_reliability, is_active, eligible_countries, english_requirements, required_documents,
       notes, funding_type, tuition_coverage, accommodation, living_allowance, travel_allowance,
       last_verified_at, source_url)
    VALUES ('Yenching Academy Fellowship (Peking University)','Peking University','China',
      'Full Tuition + Stipend',5040,'CNY','month','full_tuition','30 November 2026, 09:00 Beijing time',
      '["Master","PhD"]','["All Majors"]',NULL,'Disposable','Disposable test requirements',
      'https://yenchingacademy.pku.edu.cn/ADMISSIONS.htm','fixed','annual','open','verified',7,TRUE,
      '["Uzbekistan","All Countries"]',
      'English proficiency evidence is required; the official page does not publish minimum scores',
      '["Official high school transcripts demonstrating academic excellence"]',
      'Verified 2026-10-23: minimum English test scores are deliberately left out because the official admissions page does not print them - only third-party blogs do.',
      'Fully funded','Full tuition','',3000,NULL,TIMESTAMP '2026-10-23 08:00:00',
      'https://yenchingacademy.pku.edu.cn/ADMISSIONS.htm');
  `);

  await check("FORWARD chain applies in the documented order", async () => {
    await client.query(sql(F_SECURITY));
    await client.query(sql(F_CORRECT));
    await client.query(sql(F_V2));
    const c = await client.query("SELECT count(*)::int AS n FROM public.catalogue_facts");
    assert.ok(c.rows[0].n >= 30, `typed facts created (${c.rows[0].n})`);
  });

  await check("official findings are separate facts, not one overloaded field", async () => {
    const r = await client.query(`
      SELECT field_key, value_numeric::float AS v, value_type, admission_cycle
      FROM public.catalogue_facts WHERE entity_id IN (1,894)`);
    const by = (k: string) => r.rows.filter((x) => x.field_key === k);
    assert.equal(by("min_toefl_legacy")[0].v, 90);
    assert.equal(by("min_toefl_legacy")[0].value_type, "official_requirement");
    assert.equal(by("recommended_toefl_legacy")[0].v, 100);
    assert.equal(by("recommended_toefl_legacy")[0].value_type, "recommended_score");
    assert.equal(by("min_toefl_new_scale")[0].v, 5);
    assert.equal(by("recommended_toefl_new_scale")[0].v, 5.5);
    assert.equal(by("min_ielts")[0].v, 7);
    assert.equal(by("recommended_ielts")[0].v, 7.5);
    assert.equal(by("sat_math_middle_50_low")[0].value_type, "observed_statistic");
    assert.equal(by("acceptance_rate").length, 2, "4.5 and 4.6 coexist with different cycles");
    assert.equal(by("monthly_stipend")[0].value_type, "not_published", "no invented 5040");
    assert.equal(by("annual_cohort_size")[0].value_type, "observed_statistic", "not an acceptance rate");
  });

  await check("a SECOND apply of all three forward files is idempotent", async () => {
    const before = await client.query("SELECT count(*)::int AS n FROM public.catalogue_facts");
    await client.query(sql(F_SECURITY));
    await client.query(sql(F_CORRECT));
    await client.query(sql(F_V2));
    const after = await client.query("SELECT count(*)::int AS n FROM public.catalogue_facts");
    assert.equal(after.rows[0].n, before.rows[0].n, "no duplicated facts");
    const chk = await client.query(`SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint
      WHERE conname = 'catalogue_facts_value_type_check'`);
    assert.match(chk.rows[0].def, /recommended_score/);
  });

  await check("guarded abort: a second plausible Yenching row stops the correction", async () => {
    await client.query(`
      INSERT INTO public.scholarships
        (title, provider, country, coverage_type, description, requirements, website_url,
         deadline_type, recurrence, application_status, is_active)
      VALUES ('Yenching Academy Fellowship (Peking University)','Peking University','China',
        'Full Tuition + Stipend','d','r','https://yenchingacademy.pku.edu.cn/ADMISSIONS.htm',
        'fixed','annual','open',TRUE)`);
    await expectSqlFailure(sql(F_CORRECT), /Yenching guard found 2 candidate rows/i);
    const n = await client.query(`SELECT count(*)::int AS n FROM public.scholarships
      WHERE notes ILIKE '%Re-read the official 2027-cohort admissions page%'`);
    assert.equal(n.rows[0].n, 1, "the original correction is untouched by the abort");
    await client.query(`DELETE FROM public.scholarships WHERE id = (
      SELECT max(id) FROM public.scholarships WHERE title ILIKE '%Yenching Academy%')`);
  });

  await check("recovery REFUSES when the forward marker was legitimately changed", async () => {
    await client.query(`UPDATE public.scholarships
      SET notes = 'Operator re-verified this row on a newer official page.'
      WHERE notes ILIKE '%Re-read the official 2027-cohort admissions page%'`);
    await expectSqlFailure(sql(R_V2), /PREFLIGHT FAILED/i);
    const v = await client.query(`SELECT amount_usd_value, notes FROM public.scholarships
      WHERE title ILIKE '%Yenching Academy%'`);
    assert.equal(v.rows[0].amount_usd_value, null, "no partial rollback was made");
    assert.match(v.rows[0].notes, /Operator re-verified/);
  });

  await check("recovery v2 restores ONLY unchanged fields and preserves a later legitimate edit", async () => {
    await client.query(`UPDATE public.scholarships
      SET notes = 'Re-read the official 2027-cohort admissions page on 2026-11-06. Official minimums are published; numeric award values remain unknown, not zero.',
          requirements = 'OPERATOR-VERIFIED NEW OFFICIAL REQUIREMENTS 2027'
      WHERE title ILIKE '%Yenching Academy%'`);
    await client.query(sql(R_V2));
    const r = await client.query(`SELECT amount_usd_value, min_ielts, requirements, eligible_countries
      FROM public.scholarships WHERE title ILIKE '%Yenching Academy%'`);
    assert.equal(r.rows[0].amount_usd_value, 5040, "forward-nulled field restored");
    assert.equal(r.rows[0].min_ielts, null, "forward-set IELTS restored");
    assert.equal(r.rows[0].eligible_countries, '["Uzbekistan","All Countries"]');
    assert.equal(r.rows[0].requirements, "OPERATOR-VERIFIED NEW OFFICIAL REQUIREMENTS 2027",
      "a later legitimate edit MUST NOT be overwritten");
  });

  await check("security recovery keeps LOGO public and private documents private", async () => {
    await client.query(sql(R_SEC));
    await client.query("SET ROLE anon");
    const logo = await client.query("SELECT name FROM storage.objects WHERE bucket_id='LOGO'");
    const priv = await client.query("SELECT name FROM storage.objects WHERE bucket_id='PRIVATE_DOCUMENTS'");
    await client.query("RESET ROLE");
    assert.equal(logo.rows.length, 1, "legitimate public asset still works");
    assert.equal(priv.rows.length, 0, "anon cannot see another profile's document");
    const grants = await client.query(`
      SELECT has_table_privilege('service_role','storage.objects','INSERT') AS w,
             has_table_privilege('anon','storage.objects','INSERT') AS anon_w`);
    assert.equal(grants.rows[0].w, true, "backend write path preserved");
    assert.equal(grants.rows[0].anon_w, false, "anon write stays revoked");
    const tables = await client.query(`SELECT count(*)::int AS n FROM information_schema.tables
      WHERE table_schema='public' AND table_name IN
      ('catalogue_facts','review_queue_items','research_runs','official_source_checks')`);
    assert.equal(tables.rows[0].n, 4, "recovery did NOT drop user-work tables");
  });

  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) { for (const f of failures) console.error(`  - ${f}`); process.exitCode = 1; }
}
void main().catch(error=>{console.error(error);process.exitCode=1;}).finally(async () => {
  try { await client?.end(); } catch { /* already closed */ }
  try { await pg?.stop(); } catch { /* already stopped */ }
  rmSync(DATA_DIR, { recursive: true, force: true });
}).finally(()=>process.exit(process.exitCode??0));
