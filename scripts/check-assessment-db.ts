/**
 * Programme-assessment migration + cache-key regression (database-backed).
 *
 * Proves the parts that a pure unit test cannot:
 *   1. `supabase/add_assessment_preferences_2026-11-11.sql` is ADDITIVE and
 *      idempotent — existing rows and columns keep their values, a re-run is a
 *      no-op, and the CHECK constraint rejects a non-object payload;
 *   2. a profile with NO stored preference keeps the legacy behaviour (the
 *      reader migrates `preferred_countries` to `prefer`, never `must`), and a
 *      profile WITH a stored `must` is honoured as a filter;
 *   3. the assessment cache key changes when the scoring version, the profile
 *      fingerprint or the locale changes — and stays equal when none does.
 *
 * Run: npm run test:assessment-db
 */
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { Pool } from "pg";
import EmbeddedPostgres from "embedded-postgres";
import {
  assessCatalogueProgramme,
  assessmentCacheKey,
} from "../src/lib/assessment/adapters";
import { parseAssessmentPreferences } from "../src/lib/assessmentStored";
import { assessedUniversitiesCacheKey, SCORING_VERSION } from "../src/lib/assessment/version";

const MIGRATION = "supabase/add_assessment_preferences_2026-11-11.sql";

const PROGRAMME = {
  id: 501,
  universityId: 77,
  name: "MSc Computer Science",
  field: "Computer Science",
  degree: "Master",
  language: "English",
  studyMode: "Full-time",
  programUrl: "https://fixture.example.edu/msc-cs",
  sourceUrl: "https://fixture.example.edu/msc-cs",
};
const UNIVERSITY = {
  id: 77,
  name: "Fixture University",
  country: "Germany",
  officialWebsiteUrl: "https://fixture.example.edu",
};

function assess(profile: Record<string, unknown>) {
  return assessCatalogueProgramme({
    programme: PROGRAMME,
    university: UNIVERSITY,
    profile,
    requirementRow: null,
    tuitionUsd: 20000,
    livingUsd: 10000,
    cycle: "2027",
    applicantCategory: "international",
    degreeLevel: "Master",
    assessedAt: "2026-11-11T09:00:00.000Z",
    asOfDate: "2026-11-11",
  });
}

async function main() {
  mkdirSync(".cache", { recursive: true });
  const dir = mkdtempSync(`${process.cwd()}/.cache/assessment-migration-`);
  const pg = new EmbeddedPostgres({
    databaseDir: dir,
    user: "test",
    password: "test",
    port: 55453,
    persistent: false,
    onLog: () => {},
    onError: () => {},
  });
  let pool: Pool | undefined;
  try {
    await pg.initialise();
    await pg.start();
    await pg.createDatabase("assessment_test");
    pool = new Pool({ connectionString: "postgresql://test:test@127.0.0.1:55453/assessment_test" });
    pool.on("error", () => undefined);

    // ---- the pre-migration shape (no assessment_preferences column) --------
    await pool.query(`
      CREATE TABLE student_profiles(
        id serial PRIMARY KEY,
        degree_level text,
        target_major text,
        study_interests text,
        preferred_countries text,
        budget_annual_usd integer,
        gpa double precision,
        gpa_scale double precision,
        ielts_score double precision,
        sat_score integer,
        updated_at timestamp NOT NULL DEFAULT now()
      );
      INSERT INTO student_profiles(degree_level,target_major,study_interests,preferred_countries,budget_annual_usd,gpa,gpa_scale,ielts_score,sat_score)
      VALUES
        ('Master','Computer Science','["Computer Science"]','["Germany"]',30000,3.7,4,7.5,1450),
        ('Master','Physics','["Physics"]','["Canada"]',15000,3.2,4,6.5,1200);
    `);
    const before = (await pool.query("SELECT jsonb_agg(to_jsonb(p) ORDER BY id) AS data FROM student_profiles p")).rows[0].data;

    const migration = readFileSync(MIGRATION, "utf8");
    await pool.query(`BEGIN; ${migration} COMMIT;`);
    // Idempotent: a second (or partially retried) run must be a no-op.
    await pool.query(`BEGIN; ${migration} COMMIT;`);

    const after = (await pool.query("SELECT jsonb_agg(to_jsonb(p) - 'assessment_preferences' ORDER BY id) AS data FROM student_profiles p")).rows[0].data;
    assert.deepEqual(after, before, "the migration changed existing profile data");

    const column = (await pool.query(`
      SELECT data_type, is_nullable FROM information_schema.columns
      WHERE table_name = 'student_profiles' AND column_name = 'assessment_preferences'
    `)).rows[0];
    assert.equal(column?.data_type, "jsonb");
    assert.equal(column?.is_nullable, "YES");
    assert.equal(
      (await pool.query("SELECT count(*)::int AS n FROM student_profiles WHERE assessment_preferences IS NULL")).rows[0].n,
      2,
      "the migration must not backfill a preference the student never confirmed"
    );

    // ---- the CHECK constraint rejects a non-object payload -----------------
    await assert.rejects(
      pool.query(`UPDATE student_profiles SET assessment_preferences = '["must"]'::jsonb WHERE id = 1`),
      { code: "23514" }
    );
    await pool.query(`UPDATE student_profiles SET assessment_preferences = '{"country":{"mode":"must","value":["Germany"]}}'::jsonb WHERE id = 1`);

    // ---- business behaviour over the migrated rows -------------------------
    const rows = (await pool.query("SELECT * FROM student_profiles ORDER BY id")).rows;
    const legacyProfile = rows[1];
    const storedProfile = rows[0];

    // Legacy profile: no stored modes → `preferred_countries` counts as
    // `prefer` (a weight), NOT as a `must` filter.
    const stored = parseAssessmentPreferences(storedProfile.assessment_preferences);
    assert.equal(stored?.country?.mode, "must");

    const withoutStored = assess({ ...legacyProfile, preferredCountries: legacyProfile.preferred_countries });
    assert.equal(withoutStored.preferenceFilters.length, 0, "a legacy country must not be a filter");
    assert.ok((withoutStored.preferenceFit.totalWeight ?? 0) > 0, "a legacy country must still weigh");

    const withStored = assess({ ...storedProfile, assessmentPreferences: storedProfile.assessment_preferences, preferredCountries: null });
    assert.equal(withStored.admissionProbability.value, null);
    assert.equal(withStored.admissionProbability.reason, "no_validated_model");

    // A `must` failure is a PREFERENCE outcome, never an eligibility failure.
    const mismatch = assess({
      ...storedProfile,
      assessmentPreferences: { country: { mode: "must", value: ["Canada"] } },
      preferredCountries: null,
    });
    assert.equal(mismatch.group, 3);
    assert.notEqual(mismatch.eligibility.status, "unmet");

    // ---- cache keys --------------------------------------------------------
    const keyA = assessmentCacheKey(legacyProfile, "en");
    assert.equal(assessmentCacheKey(legacyProfile, "en"), keyA, "the key must be stable");
    assert.notEqual(assessmentCacheKey(storedProfile, "en"), keyA, "a profile edit must change the key");
    assert.notEqual(assessmentCacheKey(legacyProfile, "uz"), keyA, "a locale must change the key");
    assert.ok(keyA.startsWith(SCORING_VERSION), "the scoring version must prefix the key");
    assert.equal(assessedUniversitiesCacheKey(), assessedUniversitiesCacheKey());
    assert.ok(assessedUniversitiesCacheKey().includes(SCORING_VERSION));

    console.log("✓ additive/idempotent preference migration, legacy→prefer reading, must-as-filter, and version-keyed assessment caches passed");
  } finally {
    await pool?.end();
    await pg.stop().catch(() => {});
    rmSync(dir, { recursive: true, force: true });
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
