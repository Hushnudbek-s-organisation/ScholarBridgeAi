/** Exercise evidence migrations against an isolated, fictional PostgreSQL DB. */
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { Pool } from "pg";
import EmbeddedPostgres from "embedded-postgres";

async function main() {
  mkdirSync(".cache", { recursive: true });
  const dir = mkdtempSync(`${process.cwd()}/.cache/catalogue-migration-`);
  const pg = new EmbeddedPostgres({ databaseDir: dir, user: "test", password: "test", port: 55452,
    persistent: false, onLog: () => {}, onError: () => {} });
  let pool: Pool | undefined;
  try {
    await pg.initialise();
    await pg.start();
    await pg.createDatabase("catalogue_test");
    pool = new Pool({ connectionString: "postgresql://test:test@127.0.0.1:55452/catalogue_test" });
    pool.on("error", () => undefined);
    await pool.query(`
      CREATE ROLE anon; CREATE ROLE authenticated;
      CREATE TABLE universities(id int PRIMARY KEY,name text,world_ranking int,qs_rank_year int);
      CREATE TABLE university_rankings(id int PRIMARY KEY,verification_status text,source_id int,verified_at timestamp,rank int);
      CREATE TABLE programs(id int PRIMARY KEY,name text,is_active boolean,verification_status text DEFAULT 'verified',is_verified boolean NOT NULL DEFAULT false,source_url text,last_verified_at timestamp,annual_tuition numeric);
      CREATE TABLE program_requirements(id int PRIMARY KEY,program_id int,verification_status text,is_verified boolean NOT NULL DEFAULT true,source_url text,last_verified_at timestamp,min_ielts float);
      CREATE TABLE application_cycles(id int PRIMARY KEY,is_active boolean,verification_status text,is_verified boolean,is_estimated boolean,deadline date,deadline_timezone text);
      INSERT INTO universities VALUES(37,'FICTIONAL-FIXTURE',53,2026),(99,'OTHER-FIXTURE',1,2026);
      INSERT INTO university_rankings VALUES(1,'verified',NULL,NULL,53),(2,'verified',7,now(),1);
      INSERT INTO programs VALUES(1,'ROOT-FIXTURE',true,'verified',true,'https://fixture.edu/',now(),9999),(2,'SPECIFIC-FIXTURE',true,'verified',true,'https://fixture.edu/programs/cs',now(),1234.5);
      INSERT INTO program_requirements VALUES(1,1,'verified',true,'https://fixture.edu/',now(),7),(2,2,'verified',true,'https://fixture.edu/programs/cs',now(),6.5);
      INSERT INTO application_cycles VALUES(1,true,'verified',true,false,'2020-01-01','America/New_York'),(2,true,'verified',true,false,'2099-01-01','UTC');
    `);
    const repair = readFileSync("supabase/catalogue_evidence_repair_2026-11-02.sql", "utf8");
    const flags = readFileSync("supabase/catalogue_verification_flags_2026-11-02.sql", "utf8");
    // Separate calls mirror two independently applied transactional migrations.
    await pool.query(`BEGIN; ${repair} COMMIT;`);
    await pool.query(`BEGIN; ${flags} COMMIT;`);
    await pool.query(`BEGIN; ${repair} COMMIT;`); // Idempotent replay, immutable backup.
    const { rows } = await pool.query(`SELECT
      (SELECT world_ranking IS NULL FROM universities WHERE id=37) AS qs_cleared,
      (SELECT annual_tuition=9999 AND NOT is_verified AND verification_status='unverified' FROM programs WHERE id=1) AS quarantined_preserved,
      (SELECT annual_tuition=1234.5 AND is_verified FROM programs WHERE id=2) AS specific_preserved,
      (SELECT NOT is_active AND is_verified AND deadline='2020-01-01' FROM application_cycles WHERE id=1) AS historical_archived,
      (SELECT is_active FROM application_cycles WHERE id=2) AS future_open,
      (SELECT count(*) FROM scholarbridge_maintenance.catalogue_evidence_backup_20261102) AS backups,
      has_table_privilege('anon','scholarbridge_maintenance.catalogue_evidence_backup_20261102','SELECT') AS anon_backup`);
    for (const key of ["qs_cleared", "quarantined_preserved", "specific_preserved", "historical_archived", "future_open"]) assert.equal(rows[0][key], true, key);
    assert.equal(Number(rows[0].backups), 5);
    assert.equal(rows[0].anon_backup, false);
    await assert.rejects(pool.query(`UPDATE programs SET verification_status='verified' WHERE id=1`), { code: "23514" });
    await assert.rejects(pool.query(`UPDATE university_rankings SET verification_status='verified' WHERE id=1`), { code: "23514" });
    await pool.query(`UPDATE programs SET is_verified=false WHERE id=2;
      UPDATE program_requirements SET is_verified=false WHERE id=2;
      UPDATE application_cycles SET is_verified=false,is_estimated=true WHERE id=2;`);
    const consistent = await pool.query(`SELECT
      (SELECT is_verified FROM programs WHERE id=2) AND
      (SELECT is_verified FROM program_requirements WHERE id=2) AND
      (SELECT is_verified AND NOT is_estimated FROM application_cycles WHERE id=2) AS synced`);
    assert.equal(consistent.rows[0].synced, true);
    await pool.query(`INSERT INTO programs(id,name) VALUES(3,'DEFAULT-FIXTURE');
      INSERT INTO program_requirements(id,program_id,verification_status) VALUES(3,3,'unverified');`);
    const defaults = await pool.query(`SELECT
      (SELECT verification_status='unverified' AND NOT is_verified FROM programs WHERE id=3) AND
      (SELECT NOT is_verified FROM program_requirements WHERE id=3) AS safe`);
    assert.equal(defaults.rows[0].safe, true);
    console.log("✓ Transactional repair, idempotency, private backups, preserved amounts/dates, evidence constraints, defaults and verification triggers passed");
  } finally {
    await pool?.end();
    await pg.stop().catch(() => {});
    rmSync(dir, { recursive: true, force: true });
  }
}
void main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
