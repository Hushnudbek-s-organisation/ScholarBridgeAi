/** Offline primary-source observations, final-state API validation and isolated SQL rehearsal.
 * Does not fetch sources or imply browser/authenticated-route E2E coverage. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { Pool } from "pg";
import EmbeddedPostgres from "embedded-postgres";
import { computeFundsWindow, parseYmd, resolveFundsRequirement } from "../src/lib/apostilleChecker";
import { admissionsStatisticsFor } from "../src/lib/admissionsStatistics";
import { QS_TOP_200_BENCHMARKS } from "../src/lib/qsTop200Benchmarks";
import { countryFactsFor } from "../src/lib/countryFacts";
import { COUNTRY_COST_BENCHMARKS, CURRENCY_RATES_TO_USD } from "../src/lib/countryCostBenchmarks";
import { UK_STUDENT_VISA_FACTS as UK } from "../src/lib/ukStudentVisaFacts";
import { projectVisaEvidence, validEvidenceDate, validateVisaEvidenceWrite, validVisaSourceUrl } from "../src/lib/visaEvidence";

async function main() {
  const harvard = admissionsStatisticsFor("Harvard University");
  assert.equal(harvard.metrics.overallRate.value, 3.7);
  assert.deepEqual(harvard.metrics.overallRate.calculation, { admitted: 2037, considered: 55104 });
  assert.equal(harvard.metrics.internationalRate.value, null);
  assert.match(harvard.metrics.overallRate.basis, /waitlist/);
  const brown = admissionsStatisticsFor("Brown University");
  assert.equal(brown.verifiedMetricCount, 5);
  assert.equal(brown.metrics.overallRate.value, 5.6);
  assert.equal(brown.metrics.sat25.value, 1470); assert.equal(brown.metrics.sat75.value, 1550);
  assert.equal(brown.metrics.act25.value, 34); assert.equal(brown.metrics.act75.value, 36);
  assert.match(brown.metrics.sat25.cohort!, /not separately identified/);
  for (const key of ["edRate", "rdRate", "internationalRate", "sat50", "act50", "gpa50", "ieltsMinimum"] as const) assert.equal(brown.metrics[key].value, null);
  const princeton = admissionsStatisticsFor("Princeton University");
  assert.equal(princeton.reviewedMetricCount, 21); assert.equal(princeton.verifiedMetricCount, 0);
  assert.equal(princeton.metrics.internationalRate.value, null);
  assert.match(princeton.metrics.internationalRate.basis, /NOT an international acceptance rate/);
  const all = QS_TOP_200_BENCHMARKS.map((b) => b.admissionsStatistics);
  assert.equal(all.filter((b) => b.reviewedMetricCount > 0).length, 4);
  assert.equal(all.filter((b) => b.reviewedMetricCount === 0).length, 197);
  assert.equal(all.reduce((n, b) => n + b.verifiedMetricCount, 0), 16);
  assert.equal(all.reduce((n, b) => n + b.reviewedMetricCount, 0), 84);
  for (const b of all) {
    assert.equal(b.personalizedProbabilityAvailable, false);
    for (const m of Object.values(b.metrics)) {
      if (m.value !== null) { assert.equal(m.status, "verified"); assert.ok(m.sourceUrl && m.cohort && m.accessedOn && m.population && m.basis); }
      if (m.calculation) assert.equal(m.value, Math.round(10000 * m.calculation.admitted / m.calculation.considered) / 100);
    }
  }
  const uk = countryFactsFor("United Kingdom")!;
  assert.equal(uk.proofOfFunds.amount, UK.maintenanceOutsideLondonGbpPerMonth * UK.maintenanceMonths);
  assert.equal(uk.proofOfFunds.amount, 10539);
  assert.equal(UK.maintenanceLondonGbpPerMonth * UK.maintenanceMonths, 13761);
  assert.equal(uk.fieldReviews?.proofOfFunds?.checkedOn, "2026-11-03");
  assert.equal(uk.asOf, null);
  assert.equal(uk.postStudyWorkMonths, 24);
  for (const note of Object.values(uk.postStudyWorkNote!)) { assert.match(note, /2026/); assert.match(note, /2027/); }
  assert.equal(COUNTRY_COST_BENCHMARKS["United Kingdom"].visaFeeUsd, Math.round(558 * CURRENCY_RATES_TO_USD.GBP.rateToUsd));
  assert.match(COUNTRY_COST_BENCHMARKS["United Kingdom"].notes, /not a live|reference/);

  assert.equal(resolveFundsRequirement("United Kingdom")?.amount, 13761);
  assert.equal(resolveFundsRequirement("United Kingdom", { ukArea: "outsideLondon" })?.amount, 10539);
  assert.equal(parseYmd("2026-02-30"), null);
  assert.equal(computeFundsWindow("United Kingdom", "2026-02-30").reason, "no_date");
  assert.match(resolveFundsRequirement("United Kingdom")!.note, /planning buffer/);
  assert.ok(!readFileSync("src/db/seed.ts", "utf8").includes("IOM Tashkent"));
  const now = new Date("2026-11-03T12:00:00Z");
  for (const date of ["2026-02-30", "2025-02-29", "garbage", "10/11/2026", "2026", "2027-01-01", "2026-11-03T13:00:00Z", 0, false, {}, new Date(NaN)]) assert.equal(validEvidenceDate(date, now), false, `reject ${String(date)}`);
  for (const date of ["2024-02-29", "2026-11-03", "2026-11-03T11:00:00.000Z", "2026-11-03T16:00:00+05:00", new Date("2026-11-01")]) assert.equal(validEvidenceDate(date, now), true);
  assert.equal(validVisaSourceUrl("https://example.gov\\@evil.com/test"), false);
  const context = { title: "Real requirement", visaType: "Student Visa", sourceUrl: "https://fixture.gov/requirements", sourceType: "government", sourceName: "Fixture", lastVerifiedAt: new Date("2026-11-01"), verificationStatus: "verified" };
  assert.equal(validateVisaEvidenceWrite({}, context, now).ok, true);
  for (const input of [{ sourceType: "teaching_material" }, { lastVerifiedAt: null }, { lastVerifiedAt: "2026-02-30" }, { lastVerifiedAt: "2027-01-01" }, { lastVerifiedAt: false }, { sourceUrl: null }, { sourceUrl: "https://a.gov/ / https://b.gov/" }, { verificationStatus: "verifed" }, { sourceType: 1 }, { sourceUrl: "https://fixture.gov/" + "a".repeat(800) }]) assert.equal(validateVisaEvidenceWrite(input, context, now).ok, false, JSON.stringify(input));
  assert.equal(validateVisaEvidenceWrite({}, { ...context, title: "Interview Q&A 1" }, now).ok, false, "merged title must be checked, not only original row");
  assert.equal(validateVisaEvidenceWrite({}, { ...context, visaType: "Student Visa Interview Q&A" }, now).ok, false);
  const cleared = validateVisaEvidenceWrite({ lastVerifiedAt: null, verificationStatus: "unverified" }, context, now);
  assert.ok(cleared.ok); assert.equal(cleared.evidence.lastVerifiedAt, null);
  assert.equal(validateVisaEvidenceWrite({ lastVerifiedAt: "nonsense" }, { verificationStatus: "unverified" }, now).ok, false);
  assert.equal(validateVisaEvidenceWrite({}, {}, now).ok, true);
  assert.equal(projectVisaEvidence({ ...context, lastVerifiedAt: "2999-01-01" }).verificationStatus, "unverified");
  const route = readFileSync("src/app/api/visa/requirements/route.ts", "utf8");
  assert.match(route, /validateVisaEvidenceWrite\(b.value, \{ \.\.\.row, title: nextTitle \}\)/);
  assert.equal((route.match(/\.\.\.validated.evidence/g) ?? []).length, 2, "POST and PATCH persist the validated values");
  assert.ok(!route.includes("ilike("), "country filter must not accept SQL wildcard patterns");
  assert.match(readFileSync("src/components/journey/ExplorePanels.tsx", "utf8"), /vcCheckApplicability/);

  const manifest = JSON.parse(readFileSync("data/official-review/2026-11-03-admissions-uk-visa.json", "utf8")) as {
    visaRows: Array<{ id: number; previousTitle: string; title: string; instructions: string; sourceUrl: string; isRequired: boolean; expectedPayloadMd5: string }>;
    liveBefore: { other69RowsMd5: string };
    liveAfter: { other69RowsMd5: string; total: number; privateBackups: number; anonCanReadBackup: boolean; payloadMd5ById: Record<string, string> };
  };
  // Saved connector readback is a historical audit artefact, not a fresh DB test.
  assert.equal(manifest.liveAfter.total, 75); assert.equal(manifest.liveAfter.privateBackups, 6);
  assert.equal(manifest.liveAfter.anonCanReadBackup, false);
  assert.equal(manifest.liveAfter.other69RowsMd5, manifest.liveBefore.other69RowsMd5);
  for (const row of manifest.visaRows) {
    const payload = [String(row.id), "United Kingdom", "Student Route Visa", row.title, row.instructions,
      String(row.isRequired), row.sourceUrl, "GOV.UK (review 2026-11-03)", "government", "verified"].join("\x1f");
    const expected = createHash("md5").update(payload).digest("hex");
    assert.equal(row.expectedPayloadMd5, expected);
    assert.equal(manifest.liveAfter.payloadMd5ById[String(row.id)], expected);
  }
  const sql = readFileSync("supabase/official_uk_visa_review_2026-11-03.sql", "utf8");
  mkdirSync(".cache", { recursive: true });
  const dir = mkdtempSync(`${process.cwd()}/.cache/uk-source-test-`);
  const pg = new EmbeddedPostgres({ databaseDir: dir, user: "test", password: "test", port: 55457, persistent: false, onLog: () => {}, onError: () => {} });
  let pool: Pool | undefined;
  try {
    await pg.initialise(); await pg.start(); await pg.createDatabase("uk_test");
    pool = new Pool({ connectionString: "postgresql://test:test@127.0.0.1:55457/uk_test" }); pool.on("error", () => undefined);
    await pool.query(`CREATE ROLE anon; CREATE ROLE authenticated;
      CREATE TABLE visa_requirements(id int PRIMARY KEY,country text,visa_type text,title text,instructions text,is_required boolean,source_url text,source_name text,source_type text,verification_status text,last_verified_at timestamp,updated_at timestamp);
      INSERT INTO visa_requirements SELECT n,'FIXTURE COUNTRY','FIXTURE VISA','Fixture '||n,'Unchanged fixture',true,'https://fixture.gov/rules','Fixture','government','verified',now(),now() FROM generate_series(1,75)n;`);
    for (const row of manifest.visaRows) await pool.query("UPDATE visa_requirements SET country='United Kingdom',visa_type='Student Route Visa',title=$1 WHERE id=$2", [row.previousTitle, row.id]);
    await pool.query(readFileSync("supabase/visa_verified_evidence_guard_2026-11-02.sql", "utf8"));
    const query = async (s: string) => pool!.query(s);
    const replay = async (script = sql) => { try { await query(`BEGIN; ${script} COMMIT;`); } catch (error) { await query("ROLLBACK"); throw error; } };
    const unaffected = "SELECT md5(string_agg(to_jsonb(v)::text,'|' ORDER BY id)) AS hash FROM visa_requirements v WHERE id NOT BETWEEN 7 AND 12";
    const before = (await query(unaffected)).rows[0].hash;
    const oldRows = (await query("SELECT jsonb_agg(to_jsonb(v) ORDER BY id) AS data FROM visa_requirements v WHERE id BETWEEN 7 AND 12")).rows[0].data;
    await query("UPDATE visa_requirements SET country='Wrong fixture country' WHERE id=8");
    await assert.rejects(replay(), /identity\/content drift/);
    await query("UPDATE visa_requirements SET country='United Kingdom' WHERE id=8");
    // Rehearse the exact applied chain: connector transcription typo, then its
    // bounded correction. Canonical review SQL intentionally has the correct URL.
    const wrongClinicUrl = UK.sources.clinic.replace("/tuberculosis-testing-", "/tuberculosis/testing-");
    assert.ok(sql.includes(UK.sources.clinic));
    await replay(sql.replace(UK.sources.clinic, wrongClinicUrl));
    const correction = readFileSync("supabase/official_uk_visa_source_url_correction_2026-11-03.sql", "utf8");
    await replay(correction);
    const first = (await query("SELECT jsonb_agg(to_jsonb(v) ORDER BY id) AS data FROM visa_requirements v")).rows[0].data;
    await replay(); await replay(correction);
    assert.deepEqual((await query("SELECT jsonb_agg(to_jsonb(v) ORDER BY id) AS data FROM visa_requirements v")).rows[0].data, first, "replay must not even rewrite timestamps");
    assert.equal((await query(unaffected)).rows[0].hash, before, "other 69 unchanged");
    assert.equal((await query("SELECT count(*)::int AS n FROM visa_requirements")).rows[0].n, 75);
    assert.deepEqual((await query("SELECT jsonb_agg(row_before ORDER BY id) AS data FROM scholarbridge_maintenance.visa_uk_backup_20261103")).rows[0].data, oldRows);
    assert.equal((await query("SELECT has_table_privilege('anon','scholarbridge_maintenance.visa_uk_backup_20261103','SELECT') AS allowed")).rows[0].allowed, false);
    assert.equal((await query("SELECT relrowsecurity AS enabled FROM pg_class WHERE oid='scholarbridge_maintenance.visa_uk_backup_20261103'::regclass")).rows[0].enabled, true);
    for (const row of manifest.visaRows) {
      const updated: Record<string, unknown> = (await pool.query("SELECT * FROM visa_requirements WHERE id=$1", [row.id])).rows[0];
      assert.equal(updated.title, row.title); assert.equal(updated.instructions, row.instructions);
      assert.equal(updated.source_url, row.sourceUrl); assert.equal(updated.is_required, row.isRequired);
      assert.equal(updated.verification_status, "verified"); assert.ok(updated.last_verified_at);
    }
    await query("UPDATE visa_requirements SET instructions='Later administrator edit' WHERE id=8");
    await assert.rejects(replay(), /identity\/content drift/);
    assert.equal((await query("SELECT instructions FROM visa_requirements WHERE id=8")).rows[0].instructions, "Later administrator edit", "never overwrite later edits on replay");
  } finally { await pool?.end(); await pg.stop().catch(() => {}); rmSync(dir, { recursive: true, force: true }); }
  console.log("✓ Source follow-up: 4 reviewed institutions / 16 numeric observations / 197 unreviewed, UK native amounts, strict merged evidence validation, and isolated 6-row repair/replay/drift/private-backup tests passed");
}
void main().catch((error: unknown) => { console.error(error); process.exit(1); });
