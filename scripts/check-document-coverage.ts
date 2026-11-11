/** Offline document-scope, provenance and live-repair safety regression. */
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { Pool } from "pg";
import EmbeddedPostgres from "embedded-postgres";
import { QS_TOP_200_BENCHMARKS, matchQsUniversityBenchmark } from "../src/lib/qsTop200Benchmarks";
import { admissionsStatisticsFor } from "../src/lib/admissionsStatistics";
import { ESSAY_RUBRIC_SAMPLES, LOR_SAMPLES, SOP_SAMPLES } from "../src/lib/samples/exemplars";
import { evaluatePublishedRequirements } from "../src/lib/publishedRequirements";
import { projectVisaEvidence, validVisaSourceUrl } from "../src/lib/visaEvidence";

async function main() {
  assert.equal(QS_TOP_200_BENCHMARKS.length, 201);
  assert.equal(new Set([...ESSAY_RUBRIC_SAMPLES, ...SOP_SAMPLES].map((s) => s.text)).size, 48, "mirrored SOPs must not inflate coverage");
  assert.equal(LOR_SAMPLES.filter((s) => s.kind !== "requestEmail").length, 5);
  for (const s of ESSAY_RUBRIC_SAMPLES.filter((s) => s.id.startsWith("essayPractice"))) {
    assert.match(s.sourceNote ?? "", /fictional teaching composite/i);
    assert.ok(s.text.split(/\s+/).length >= 120, `${s.id}: substantive example`);
  }
  for (const row of QS_TOP_200_BENCHMARKS) {
    assert.equal(row.admissionsStatistics.institution, row.canonicalName);
    assert.equal(row.admissionsStatistics.personalizedProbabilityAvailable, false);
    for (const metric of Object.values(row.admissionsStatistics.metrics)) {
      if (metric.status === "verified") {
        assert.ok(metric.sourceUrl && metric.accessedOn && metric.cohort && metric.population);
        assert.equal(typeof metric.value, "number");
      } else assert.equal(metric.value, null);
    }
  }
  const mit = admissionsStatisticsFor("Massachusetts Institute of Technology (MIT)");
  assert.equal(mit.metrics.overallRate.value, 4.6);
  assert.deepEqual(mit.metrics.rdRate.calculation, { admitted: 603, considered: 24715 });
  assert.equal(mit.metrics.rdRate.value, 2.44);
  assert.equal(mit.metrics.act25.value, 34);
  assert.equal(mit.metrics.act75.value, 36);
  assert.equal(mit.metrics.act50.value, null, "midpoint is not median");
  assert.equal(mit.metrics.sat25.value, null, "do not sum marginal SAT quantiles");
  assert.equal(mit.metrics.ieltsMinimum.value, null, "page did not establish a language cutoff");
  assert.equal(mit.metrics.edRate.status, "not_applicable");
  assert.equal(admissionsStatisticsFor("Princeton University").verifiedMetricCount, 0, "unknown is not a guessed official minimum");
  assert.equal(matchQsUniversityBenchmark({ name: "Unknown Tashkent College", country: "Uzbekistan", worldRanking: 1 }).admissionsStatistics.verifiedMetricCount, 0);
  assert.equal(matchQsUniversityBenchmark({ name: "MIT", country: "Uzbekistan" }).qsRank, null, "cross-country name collision");
  const projected = evaluatePublishedRequirements({ gpa: 2.8, gpaScale: 4, ieltsScore: 5.5 }, { sourceUrl: "https://admission.princeton.edu/apply/application-checklist", minGpa: null, minIelts: null });
  assert.equal(projected.eligibilityStatus, "unknown_inputs");
  assert.ok(projected.requirementChecks.every((r) => r.status === "info"));
  assert.equal(evaluatePublishedRequirements({ ieltsScore: 5.5 }, { minIelts: 7, sourceUrl: "https://fixture.edu/admissions" }).eligibilityStatus, "below_minimum");
  assert.equal(evaluatePublishedRequirements({ gpa: 3.8, gpaScale: 4 }, { minGpa: 3, minIelts: 7, sourceUrl: "https://fixture.edu/admissions" }).eligibilityStatus, "unknown_inputs", "a missing required test is not satisfied by a GPA");
  assert.equal(evaluatePublishedRequirements({ ieltsScore: 6, toeflScore: 105 }, { minIelts: 7, minToefl: 100, sourceUrl: "https://fixture.edu/admissions" }).eligibilityStatus, "meets_all", "a satisfied alternative must not be overridden by an unused test");
  assert.equal(validVisaSourceUrl("https://tashkent.usembassy.gov/visas/ / https://travel.state.gov"), false);
  assert.equal(validVisaSourceUrl("javascript:alert(1)"), false);
  assert.equal(validVisaSourceUrl("https://user:password@example.com/a"), false);
  const practice = projectVisaEvidence({ visaType: "Student Visa Interview Q&A", verificationStatus: "verified", sourceUrl: "https://travel.state.gov/", isRequired: true, lastVerifiedAt: new Date() });
  assert.equal(practice.isRequired, false); assert.equal(practice.sourceUrl, null); assert.equal(practice.verificationStatus, "needs_review");
  assert.equal(projectVisaEvidence({ verificationStatus: "verified", sourceUrl: "https://example.gov/requirements", lastVerifiedAt: null }).verificationStatus, "unverified");

  mkdirSync(".cache", { recursive: true });
  const dir = mkdtempSync(`${process.cwd()}/.cache/visa-practice-test-`);
  const pg = new EmbeddedPostgres({ databaseDir: dir, user: "test", password: "test", port: 55454, persistent: false, onLog: () => {}, onError: () => {} });
  let pool: Pool | undefined;
  try {
    await pg.initialise(); await pg.start(); await pg.createDatabase("visa_test");
    pool = new Pool({ connectionString: "postgresql://test:test@127.0.0.1:55454/visa_test" });
    pool.on("error", () => undefined);
    await pool.query(`CREATE ROLE anon; CREATE ROLE authenticated;
      CREATE TABLE visa_requirements(id int PRIMARY KEY,country text,visa_type text,title text,instructions text,is_required boolean,source_url text,source_name text,source_type text,verification_status text,last_verified_at timestamp,updated_at timestamp);
      INSERT INTO visa_requirements SELECT n,CASE WHEN n<56 THEN 'FIXTURE COUNTRY' ELSE 'Uzbekistan' END,CASE WHEN n<56 THEN 'FIXTURE VISA' ELSE 'Student Visa Interview Q&A' END,'Interview Q&A '||n, 'Question: Explain your plans.'||chr(92)||'n'||chr(92)||'n'||'Verified Model Response: invented salary',true,CASE WHEN n<56 THEN 'https://fixture.gov/requirements' ELSE 'https://first.gov/ / https://second.gov/' END,'Old fixture','official','verified',now(),now() FROM generate_series(1,75)n;`);
    const unaffected = `SELECT md5(string_agg(to_jsonb(v)::text,'|' ORDER BY id)) AS hash FROM visa_requirements v WHERE id<56`;
    const before = (await pool.query(unaffected)).rows[0].hash;
    const sql = readFileSync("supabase/visa_practice_evidence_repair_2026-11-02.sql", "utf8");
    await pool.query(`BEGIN; ${sql} COMMIT;`);
    const first = (await pool.query("SELECT jsonb_agg(to_jsonb(v) ORDER BY id) AS data FROM visa_requirements v")).rows[0].data;
    await pool.query(`BEGIN; ${sql} COMMIT;`);
    assert.deepEqual((await pool.query("SELECT jsonb_agg(to_jsonb(v) ORDER BY id) AS data FROM visa_requirements v")).rows[0].data, first, "idempotent repair");
    assert.equal((await pool.query(unaffected)).rows[0].hash, before, "other 55 rows unchanged");
    const guard = readFileSync("supabase/visa_verified_evidence_guard_2026-11-02.sql", "utf8");
    await pool.query(guard); await pool.query(guard);
    await assert.rejects(pool.query("UPDATE visa_requirements SET verification_status='verified' WHERE id=56"), { code: "23514" });
    await assert.rejects(pool.query("UPDATE visa_requirements SET source_url='https://first.gov/ / https://second.gov/' WHERE id=1"), { code: "23514" });
    const c = (await pool.query(`SELECT count(*)::int AS total,count(*) FILTER(WHERE source_type='teaching_material' AND NOT is_required AND source_url IS NULL AND last_verified_at IS NULL AND verification_status='needs_review' AND instructions NOT LIKE '%invented salary%')::int AS practice FROM visa_requirements`)).rows[0];
    assert.deepEqual(c, { total: 75, practice: 20 });
    assert.equal((await pool.query("SELECT count(*)::int AS n FROM scholarbridge_maintenance.visa_practice_backup_20261102")).rows[0].n, 20);
    assert.equal((await pool.query("SELECT has_table_privilege('anon','scholarbridge_maintenance.visa_practice_backup_20261102','SELECT') AS allowed")).rows[0].allowed, false);
  } finally { await pool?.end(); await pg.stop().catch(() => {}); rmSync(dir, { recursive: true, force: true }); }
  console.log("✓ 48 distinct essays/SOPs + 5 complete LoRs, 201 provenance-aware records, source denominators/unknowns, bounded eligibility, and private/idempotent 75-row visa repair passed");
}
void main().catch((error: unknown) => { console.error(error); process.exit(1); });
