/** Isolated regression for the dated primary-source review (no production connection). */
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { Pool } from "pg";
import EmbeddedPostgres from "embedded-postgres";

async function main() {
  const manifest = JSON.parse(readFileSync("data/official-review/2026-11-02-batch-01.json", "utf8")) as {
    programs: { id: number; expected_name: string; requirement_id: number; academic_year: string }[];
    rankings: { id: number; university_id: number; university_name: string; provider: string; edition: string; year: number; rank: number | null; rank_label: string }[];
    sources: { key: string; url: string; retrieval: string }[];
  };
  assert.equal(manifest.programs.length, 20);
  assert.equal(manifest.rankings.length, 11);
  for (const s of manifest.sources) {
    assert.equal(s.retrieval, "primary_page_read");
    assert.ok(new URL(s.url).pathname.length > 1);
  }
  mkdirSync(".cache", { recursive: true });
  const dir = mkdtempSync(`${process.cwd()}/.cache/official-review-`);
  const pg = new EmbeddedPostgres({ databaseDir: dir, user: "test", password: "test", port: 55453,
    persistent: false, onLog: () => {}, onError: () => {} });
  let pool: Pool | undefined;
  try {
    await pg.initialise(); await pg.start(); await pg.createDatabase("review_test");
    pool = new Pool({ connectionString: "postgresql://test:test@127.0.0.1:55453/review_test" });
    pool.on("error", () => undefined);
    await pool.query(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA scholarbridge_maintenance;
      CREATE TABLE universities(id int PRIMARY KEY,name text);
      CREATE TABLE sources(id serial PRIMARY KEY,url text UNIQUE,title text,domain text,source_type text,accessed_at timestamp,is_official boolean,is_verified boolean);
      CREATE TABLE program_sources(id serial PRIMARY KEY,program_id int,source_id int REFERENCES sources,source_type text);
      CREATE TABLE programs(id int PRIMARY KEY,university_id int,name text,degree_level text,annual_tuition numeric,tuition_amount int,tuition_currency text,tuition_period text,min_ielts float,min_sat int,official_url text,program_url text,source_url text,application_url text,description text,verification_status text,is_verified boolean,last_verified_at timestamp);
      CREATE TABLE program_requirements(id int PRIMARY KEY,program_id int,academic_year text,min_ielts float,min_toefl float,min_det float,min_sat int,min_act int,min_gpa float,minimum_value float,ib_requirement text,a_level_requirement text,ap_requirement text,subject_requirements text,portfolio_required boolean,interview_required boolean,recommendation_required boolean,personal_statement_required boolean,other_requirements text,value_text text,notes text,source_url text,verification_status text,is_verified boolean,last_verified_at timestamp);
      CREATE TABLE university_rankings(id int PRIMARY KEY,university_id int,ranking_provider text,ranking_name text,ranking_year int,rank int,rank_label text,score numeric,source_id int REFERENCES sources,verified_at timestamp,verification_status text);
      CREATE TABLE application_cycles(id int PRIMARY KEY,is_active boolean,deadline date,verification_status text,is_verified boolean,is_estimated boolean);
      INSERT INTO universities VALUES(13,'Princeton University');
      INSERT INTO programs(id,university_id,name,degree_level,annual_tuition,verification_status,is_verified) VALUES(250,13,'GRADUATE SENTINEL','PhD',59710,'unverified',false);
      INSERT INTO application_cycles VALUES(3031,false,'2026-01-01','verified',true,false);
    `);
    for (const p of manifest.programs) {
      await pool.query(`INSERT INTO programs(id,university_id,name,degree_level,annual_tuition,tuition_amount,min_ielts,min_sat,verification_status,is_verified) VALUES($1,13,$2,'Bachelor''s',59710,59710,7,1510,'unverified',false)`, [p.id, p.expected_name]);
      await pool.query(`INSERT INTO program_requirements(id,program_id,academic_year,min_ielts,min_toefl,min_det,min_sat,min_act,min_gpa,minimum_value,portfolio_required,interview_required,verification_status,is_verified) VALUES($1,$2,$3,7,100,125,1510,34,3.9,3.9,true,true,'unverified',false)`, [p.requirement_id,p.id,p.academic_year]);
    }
    for (const r of manifest.rankings) {
      await pool.query(`INSERT INTO universities VALUES($1,$2) ON CONFLICT DO NOTHING`, [r.university_id,r.university_name]);
      await pool.query(`INSERT INTO university_rankings(id,university_id,ranking_provider,ranking_name,ranking_year,rank,rank_label,score,verification_status) VALUES($1,$2,$3,$4,$5,999,'999-1049',1,'unverified')`, [r.id,r.university_id,r.provider,r.edition,r.year]);
    }
    await pool.query(readFileSync("supabase/catalogue_verification_flags_2026-11-02.sql", "utf8"));
    const migration = readFileSync("supabase/official_source_review_2026-11-02_batch_01.sql", "utf8");
    // Failure midway rolls back source writes, backups, and all facts.
    await pool.query(`UPDATE program_requirements SET academic_year='WRONG' WHERE id=1901`);
    await assert.rejects(pool.query(`BEGIN; ${migration} COMMIT;`), /Requirement identity\/year drift/);
    await pool.query("ROLLBACK");
    assert.equal((await pool.query("SELECT count(*)::int AS n FROM sources")).rows[0].n, 0);
    await pool.query(`UPDATE program_requirements SET academic_year='2026-2027' WHERE id=1901`);
    await pool.query(`BEGIN; ${migration} COMMIT;`);
    const snapshotSql = `SELECT jsonb_build_object('programs',(SELECT jsonb_agg(to_jsonb(p) ORDER BY id) FROM programs p),'requirements',(SELECT jsonb_agg(to_jsonb(r) ORDER BY id) FROM program_requirements r),'rankings',(SELECT jsonb_agg(to_jsonb(r) ORDER BY id) FROM university_rankings r),'links',(SELECT jsonb_agg(to_jsonb(s) ORDER BY id) FROM program_sources s),'backups',(SELECT jsonb_agg(to_jsonb(b) ORDER BY entity,row_id) FROM scholarbridge_maintenance.official_review_backup_20261102_01 b)) AS data`;
    const first = (await pool.query(snapshotSql)).rows[0].data;
    await pool.query(`BEGIN; ${migration} COMMIT;`);
    assert.deepEqual((await pool.query(snapshotSql)).rows[0].data, first, "idempotent replay");
    const checks = (await pool.query(`SELECT
      (SELECT count(*)::int FROM programs WHERE is_verified AND annual_tuition=68140 AND tuition_amount=68140 AND min_sat IS NULL AND min_ielts IS NULL) AS programs,
      (SELECT count(*)::int FROM program_requirements WHERE is_verified AND min_sat IS NULL AND min_ielts IS NULL AND min_toefl IS NULL AND min_det IS NULL AND min_act IS NULL AND min_gpa IS NULL AND minimum_value IS NULL AND NOT portfolio_required AND NOT interview_required) AS requirements,
      (SELECT count(*)::int FROM scholarbridge_maintenance.official_review_backup_20261102_01) AS backups,
      (SELECT count(*)::int FROM program_sources) AS links,
      (SELECT annual_tuition=59710 AND NOT is_verified FROM programs WHERE id=250) AS graduate_untouched,
      (SELECT NOT is_active AND deadline='2026-01-01' FROM application_cycles WHERE id=3031) AS cycle_untouched,
      has_table_privilege('anon','scholarbridge_maintenance.official_review_backup_20261102_01','SELECT') AS public_backup`)).rows[0];
    assert.equal(checks.programs, 20); assert.equal(checks.requirements, 20);
    assert.equal(checks.backups, 51); assert.equal(checks.links, 140);
    assert.equal(checks.graduate_untouched, true); assert.equal(checks.cycle_untouched, true);
    assert.equal(checks.public_backup, false);
    for (const r of manifest.rankings) {
      const actual: { rank: number | null; rank_label: string; verification_status: string } = (await pool.query(`SELECT rank,rank_label,verification_status FROM university_rankings WHERE id=$1`, [r.id])).rows[0];
      assert.deepEqual(actual, { rank: r.rank, rank_label: r.rank_label, verification_status: "verified" });
    }
    await pool.query(`UPDATE programs SET annual_tuition=12345 WHERE id=230`);
    await assert.rejects(pool.query(`BEGIN; ${migration} COMMIT;`), /Review replay conflicts with a later edit/);
    await pool.query("ROLLBACK");
    assert.equal(Number((await pool.query(`SELECT annual_tuition FROM programs WHERE id=230`)).rows[0].annual_tuition), 12345);
    console.log("✓ Official-source batch: 20 programs + 20 requirements + 11 rankings; rollback, private before-images, provenance, idempotency, drift protection, graduate/cycle isolation passed");
  } finally {
    await pool?.end(); await pg.stop().catch(() => {});
    rmSync(dir, { recursive: true, force: true });
  }
}
void main().catch((error: unknown) => { console.error(error); process.exit(1); });
