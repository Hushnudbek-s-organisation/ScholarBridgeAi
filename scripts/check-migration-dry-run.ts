/**
 * Disposable-PostgreSQL validation of the reviewable 2026-11-06 migrations.
 *
 * This does NOT connect to production. It builds the repository schema with
 * drizzle-kit, seeds the exact Yenching/MIT values observed in the live
 * Supabase project, applies the NOT-APPLIED data and security/evidence/queue
 * migrations twice, and asserts corrections, RLS, typed evidence records and
 * idempotency. Production writes remain out of scope.
 *
 * Run: npm run test:migration-dry-run
 */
import EmbeddedPostgres from "embedded-postgres";
import { Client } from "pg";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const PORT = 55442;
const DB = "sbmigration";
const URL_ = `postgresql://test:test@127.0.0.1:${PORT}/${DB}`;
const DATA_MIGRATION = readFileSync(join(ROOT, "supabase/official_source_corrections_2026-11-06.sql"), "utf8");
const SCHEMA_MIGRATION = readFileSync(join(ROOT, "supabase/security_evidence_research_2026-11-06.sql"), "utf8");
const ROLLBACK_MIGRATION = readFileSync(join(ROOT, "supabase/official_source_corrections_2026-11-06_rollback.sql"), "utf8");
// Transaction-free body for guard tests that must run inside a ROLLBACK block.
const DATA_BODY = DATA_MIGRATION.replace(/^\s*BEGIN;\s*/, "").replace(/\bCOMMIT;\s*$/, "");
const DATA_DIR = "/tmp/sb-migration-pg";

let passed = 0;
const failures: string[] = [];
function check(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed++;
      console.log(`  ✓ ${name}`);
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${name}: ${message}`);
      console.log(`  ✗ ${name} — ${message}`);
    });
}

let pg: EmbeddedPostgres | null = null;
let client: Client | null = null;

async function main() {
  console.log("\nDisposable migration dry-run — no production connection");
  rmSync(DATA_DIR, { recursive: true, force: true });
  pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: "test",
    password: "test",
    port: PORT,
    persistent: false,
    onLog: () => {},
    onError: () => {},
  });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase(DB);

  execSync("npx drizzle-kit push --force", {
    cwd: ROOT,
    env: { ...process.env, DATABASE_URL: URL_ },
    encoding: "utf8",
    stdio: ["ignore", "ignore", "pipe"],
    timeout: 240_000,
  });

  client = new Client({ connectionString: URL_ });
  await client.connect();

  // Supabase-specific roles are created here only to validate the migration's
  // REVOKE/GRANT statements in the disposable cluster.
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN CREATE ROLE postgres NOLOGIN BYPASSRLS; END IF;
    END $$;
    GRANT USAGE ON SCHEMA public TO postgres, service_role;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
  `);

  // Minimal storage stub matching the live project: one public LOGO bucket,
  // one SELECT RLS policy, and unnecessarily broad anon/authenticated DML
  // grants. The migration must reduce this to SELECT + effective RLS only.
  await client.query(`
    CREATE SCHEMA IF NOT EXISTS storage;
    CREATE TABLE IF NOT EXISTS storage.objects (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      bucket_id text,
      name text
    );
    GRANT USAGE ON SCHEMA storage TO anon, authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO anon, authenticated;
    GRANT ALL ON storage.objects TO postgres, service_role;
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Public can read LOGO assets" ON storage.objects;
    CREATE POLICY "Public can read LOGO assets" ON storage.objects
      FOR SELECT TO public USING (bucket_id = 'LOGO');
    INSERT INTO storage.objects (bucket_id, name)
    VALUES ('LOGO', 'logo.png'), ('PRIVATE_DOCUMENTS', 'other-profile.pdf');
  `);

  await client.query(`
    INSERT INTO public.universities
      (name, country, description, website_url, min_gpa, min_sat, acceptance_rate,
       data_source, source_url, verification_status, source_reliability, is_active)
    VALUES
      ('Massachusetts Institute of Technology (MIT)', 'United States',
       'Disposable test row', 'https://www.mit.edu', 3.91, 1520, 4.5,
       'Top 300 Universities dataset (user PDF, 2026)', 'https://www.mit.edu',
       'verified', 7, TRUE)
    RETURNING id;
  `);

  await client.query(`
    INSERT INTO public.scholarships
      (title, provider, country, coverage_type, amount_usd_value, award_currency,
       award_period, award_basis, deadline, degree_levels, eligible_majors,
       min_ielts, description, requirements, website_url, deadline_type,
       recurrence, application_status, verification_status, source_reliability,
       is_active, eligible_countries, english_requirements, required_documents,
       notes, funding_type, tuition_coverage, accommodation, living_allowance,
       travel_allowance, last_verified_at, source_url)
    VALUES
      ('Yenching Academy Fellowship (Peking University)', 'Peking University',
       'China', 'Full Tuition + Stipend', 5040, 'CNY', 'month', 'full_tuition',
       '30 November 2026, 09:00 Beijing time', '["Master","PhD"]', '["All Majors"]',
       NULL, 'Disposable test row', 'Disposable test requirements',
       'https://yenchingacademy.pku.edu.cn/ADMISSIONS.htm', 'fixed',
       'annual', 'open', 'verified', 7, TRUE,
       '["Uzbekistan","All Countries"]',
       'English proficiency evidence is required; the official page does not publish minimum scores',
       '["Official high school transcripts demonstrating academic excellence"]',
       'Verified 2026-10-23: minimum English test scores are deliberately left out because the official admissions page does not print them - only third-party blogs do.',
       'Fully funded', 'Full tuition', '', 3000, NULL,
       TIMESTAMP '2026-10-23 08:00:00',
       'https://yenchingacademy.pku.edu.cn/ADMISSIONS.htm')
    RETURNING id;
  `);

  // First apply: corrects both rows, removes schema drift, creates evidence and
  // durable queue tables. Second apply: must be idempotent.
  await client.query(DATA_MIGRATION);
  await client.query(SCHEMA_MIGRATION);
  await client.query(DATA_MIGRATION);
  await client.query(SCHEMA_MIGRATION);

  async function one<T extends Record<string, unknown>>(sql: string): Promise<T> {
    const result = await client!.query(sql);
    assert.equal(result.rows.length, 1, `expected one row from ${sql.slice(0, 70)}`);
    return result.rows[0] as T;
  }

  await check("Yenching numeric 5040 / 3000 stipend is removed, not replaced with zero", async () => {
    const row = await one<{
      amount_usd_value: number | null;
      living_allowance: number | null;
      award_period: string | null;
      award_basis: string | null;
      verification_status: string;
    }>(`SELECT amount_usd_value, living_allowance, award_period, award_basis, verification_status FROM public.scholarships WHERE title ILIKE '%Yenching Academy%'`);
    assert.equal(row.amount_usd_value, null);
    assert.equal(row.living_allowance, null);
    assert.equal(row.award_period, null);
    assert.equal(row.award_basis, "variable");
    assert.equal(row.verification_status, "verified");
  });

  await check("Yenching official IELTS 7.0 and master's-only requirements replace generic notes", async () => {
    const row = await one<{
      min_ielts: number | null;
      degree_levels: string;
      english_requirements: string;
      notes: string;
      required_documents: string;
      eligible_countries: string;
      eligible_majors: string;
    }>(`SELECT min_ielts, degree_levels, english_requirements, notes, required_documents, eligible_countries, eligible_majors FROM public.scholarships WHERE title ILIKE '%Yenching Academy%'`);
    assert.equal(Number(row.min_ielts), 7.0);
    assert.equal(row.degree_levels, '["Master"]');
    assert.match(row.english_requirements, /IELTS Academic 7\.0/);
    assert.doesNotMatch(row.notes, /does not print them|only third-party blogs/);
    assert.doesNotMatch(row.required_documents, /high school/i);
    assert.equal(row.eligible_countries, "[]");
    assert.equal(row.eligible_majors, "[]");
  });

  await check("MIT invented 3.91 / 1520 / 4.5 values become unknown, not zero", async () => {
    const row = await one<{
      min_gpa: number | null;
      min_sat: number | null;
      acceptance_rate: number | null;
      data_source: string;
      verification_status: string;
    }>(`SELECT min_gpa, min_sat, acceptance_rate, data_source, verification_status FROM public.universities WHERE name ILIKE '%Massachusetts Institute of Technology%'`);
    assert.equal(row.min_gpa, null);
    assert.equal(row.min_sat, null);
    assert.equal(row.acceptance_rate, null);
    assert.match(row.data_source, /mitadmissions\.org\/apply\/firstyear\/tests-scores\//);
    assert.match(row.data_source, /mitadmissions\.org\/apply\/firstyear\/international\//);
    assert.equal(row.verification_status, "review_needed");
  });

  await check("official MIT source links are inserted once and linked to MIT", async () => {
    const sources = await client!.query(
      `SELECT count(*)::int AS n FROM public.sources WHERE url IN ('https://mitadmissions.org/apply/firstyear/tests-scores/','https://mitadmissions.org/apply/firstyear/international/')`
    );
    assert.equal(sources.rows[0].n, 2);
    const links = await client!.query(
      `SELECT count(*)::int AS n FROM public.university_sources us JOIN public.sources s ON s.id = us.source_id JOIN public.universities u ON u.id = us.university_id WHERE u.name ILIKE '%Massachusetts Institute of Technology%' AND s.url IN ('https://mitadmissions.org/apply/firstyear/tests-scores/','https://mitadmissions.org/apply/firstyear/international/')`
    );
    assert.equal(links.rows[0].n, 2);
  });

  await check("scholarship schema drift is corrected for unknown values", async () => {
    const row = await one<{ is_nullable: string; min_default: string | null; majors_default: string | null; degrees_default: string | null }>(`
      SELECT
        MAX(CASE WHEN column_name = 'amount_usd_value' THEN is_nullable END) AS is_nullable,
        MAX(CASE WHEN column_name = 'min_ielts' THEN column_default END) AS min_default,
        MAX(CASE WHEN column_name = 'eligible_majors' THEN column_default END) AS majors_default,
        MAX(CASE WHEN column_name = 'degree_levels' THEN column_default END) AS degrees_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'scholarships'
    `);
    assert.equal(row.is_nullable, "YES");
    assert.equal(row.min_default, null);
    assert.match(String(row.majors_default), /\[\]/);
    assert.match(String(row.degrees_default), /\[\]/);
  });

  await check("new scholarship rows keep unknown values instead of receiving fabricated defaults", async () => {
    await client!.query(`
      INSERT INTO public.scholarships
        (title, provider, country, description, requirements, website_url)
      VALUES
        ('Disposable unknown-scope award', 'Disposable provider', 'Unknown',
         '', '', 'https://example.invalid/unknown')
    `);
    const row = await one<{
      amount_usd_value: number | null;
      min_ielts: number | null;
      degree_levels: string;
      eligible_majors: string;
    }>(`SELECT amount_usd_value, min_ielts, degree_levels, eligible_majors
        FROM public.scholarships WHERE title = 'Disposable unknown-scope award'`);
    assert.equal(row.amount_usd_value, null);
    assert.equal(row.min_ielts, null);
    assert.equal(row.degree_levels, "[]");
    assert.equal(row.eligible_majors, "[]");
    await client!.query(`DELETE FROM public.scholarships WHERE title = 'Disposable unknown-scope award'`);
  });

  await check("guarded migration safely aborts on zero or multiple plausible rows", async () => {
    // Multiple matches: no row should be changed by an ambiguous guard.
    try {
      await client!.query("BEGIN");
      await client!.query(`
        INSERT INTO public.scholarships
          (title, provider, country, description, requirements, website_url, source_url)
        VALUES
          ('Yenching Academy Fellowship (duplicate)', 'Yenching Academy of Peking University',
           'China', '', '', 'https://yenchingacademy.pku.edu.cn/ADMISSIONS.htm',
           'https://yenchingacademy.pku.edu.cn/ADMISSIONS.htm')
      `);
      await assert.rejects(client!.query(DATA_BODY), /Yenching guard found 2 candidate rows/);
    } finally {
      await client!.query("ROLLBACK").catch(() => {});
    }

    // Zero matches: the migration must not silently skip either.
    try {
      await client!.query("BEGIN");
      await client!.query(`UPDATE public.scholarships SET title = 'Renamed fellowship' WHERE title ILIKE '%Yenching Academy%'`);
      await assert.rejects(client!.query(DATA_BODY), /Yenching guard found 0 candidate rows/);
    } finally {
      await client!.query("ROLLBACK").catch(() => {});
    }
  });

  await check("password_reset_tokens RLS is enabled and anon/authenticated DML is revoked", async () => {
    const rls = await one<{ rowsecurity: boolean }>(
      `SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'password_reset_tokens'`
    );
    assert.equal(rls.rowsecurity, true);
    const grants = await client!.query(
      `SELECT count(*)::int AS n FROM information_schema.role_table_grants WHERE table_schema='public' AND table_name='password_reset_tokens' AND grantee IN ('anon','authenticated')`
    );
    assert.equal(grants.rows[0].n, 0);

    // The legitimate Next.js backend connects as a privileged role with
    // BYPASSRLS (live current_user = postgres). RLS must not break the real
    // request / confirm flow that hashes, expires and consumes the token.
    try {
      await client!.query("BEGIN");
      await client!.query("SET LOCAL ROLE postgres");
      const profile = await client!.query(
        `INSERT INTO public.student_profiles (name, email)
         VALUES ('Disposable reset test', 'disposable-reset@example.invalid')
         RETURNING id`
      );
      const profileId = profile.rows[0].id;
      await client!.query(
        `INSERT INTO public.password_reset_tokens (profile_id, token_hash, expires_at)
         VALUES ($1, 'not-a-real-token-hash-only-a-shape-test', now() + interval '1 hour')`,
        [profileId]
      );
      const read = await client!.query(
        `SELECT count(*)::int AS n FROM public.password_reset_tokens WHERE profile_id = $1`,
        [profileId]
      );
      assert.equal(read.rows[0].n, 1);
      await client!.query(
        `UPDATE public.password_reset_tokens SET used_at = now() WHERE profile_id = $1`,
        [profileId]
      );
    } finally {
      await client!.query("ROLLBACK");
    }
  });

  await check("anon cannot read password_reset_tokens but can read active catalogue facts", async () => {
    await client!.query("SET ROLE anon");
    try {
      await assert.rejects(
        client!.query("SELECT 1 FROM public.password_reset_tokens LIMIT 1"),
        /permission denied|relation .* does not exist/i
      );
      const facts = await client!.query("SELECT count(*)::int AS n FROM public.catalogue_facts WHERE is_active");
      assert.ok(facts.rows[0].n >= 7);
    } finally {
      await client!.query("RESET ROLE");
    }
  });

  await check("typed evidence facts separate verified official minimums from review-needed values", async () => {
    const total = await one<{ n: number; review: number; verified: number }>(`
      SELECT count(*)::int AS n,
             count(*) FILTER (WHERE verification_status = 'review_needed')::int AS review,
             count(*) FILTER (WHERE verification_status = 'verified')::int AS verified
      FROM public.catalogue_facts
    `);
    assert.equal(total.n, 7);
    assert.equal(total.review, 5);
    assert.equal(total.verified, 2);
    const mitGpa = await one<{ value_type: string; source_url: string; verified_at: string | null }>(
      `SELECT value_type, source_url, verified_at::text FROM public.catalogue_facts WHERE entity_type='university' AND entity_id=1 AND field_key='min_gpa'`
    );
    assert.equal(mitGpa.value_type, "unverified");
    assert.equal(mitGpa.verified_at, null);
    assert.match(mitGpa.source_url, /mitadmissions\.org/);
  });

  await check("durable research queue tables and refresh modes exist", async () => {
    const tables = await client!.query(
      `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('research_runs','research_run_items','catalogue_facts')`
    );
    assert.equal(tables.rows.length, 3);
    const columns = await client!.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='refresh_jobs' AND column_name IN ('mode','source_pages_read','verified_dates_updated','failed_verification')`
    );
    assert.equal(columns.rows.length, 4);
    const rls = await one<{ rowsecurity: boolean }>(
      `SELECT rowsecurity FROM pg_tables WHERE schemaname='public' AND tablename='research_runs'`
    );
    assert.equal(rls.rowsecurity, true);
  });

  await check("durable run lease is atomic, capped and restart-safe", async () => {
    const columns = await client!.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema='public' AND table_name='research_runs'
         AND column_name IN ('lease_owner','lease_until','attempts','max_attempts','checkpoint')`
    );
    assert.equal(columns.rows.length, 5);
    await client!.query(`
      INSERT INTO public.research_runs
        (id, status, request, dry_run, university_ids, scopes, checkpoint,
         attempts, max_attempts, timeout_at)
      VALUES
        ('run_claim_test', 'running', '{}'::jsonb, TRUE, '[1,2]'::jsonb,
         '[]'::jsonb,
         '{"completedUniversityIds":[1],"reports":[],"progress":[]}'::jsonb,
         0, 3, now() + interval '10 minutes')
    `);
    const claim = (worker: string) => client!.query(
      `UPDATE public.research_runs
       SET lease_owner = $1, lease_until = now() + interval '1 minute',
           attempts = LEAST(attempts + 1, max_attempts), updated_at = now()
       WHERE id = 'run_claim_test'
         AND status IN ('queued','running')
         AND cancel_requested = FALSE
         AND attempts < max_attempts
         AND (timeout_at IS NULL OR timeout_at > now())
         AND (lease_until IS NULL OR lease_until <= now())
       RETURNING id`,
      [worker]
    );
    const first = await claim("worker-a");
    const second = await claim("worker-b");
    assert.equal(first.rows.length, 1);
    assert.equal(second.rows.length, 0);
    const row = await client!.query(
      `SELECT attempts, lease_owner FROM public.research_runs WHERE id = 'run_claim_test'`
    );
    assert.equal(row.rows[0].attempts, 1);
    assert.equal(row.rows[0].lease_owner, "worker-a");
    await client!.query(`DELETE FROM public.research_runs WHERE id = 'run_claim_test'`);
  });

  await check("storage.objects uses least privilege + effective RLS, not grants alone", async () => {
    const result = await client!.query(
      `SELECT grantee, string_agg(privilege_type, ',' ORDER BY privilege_type) AS privileges
       FROM information_schema.role_table_grants
       WHERE table_schema='storage' AND table_name='objects'
         AND grantee IN ('anon','authenticated')
       GROUP BY grantee`
    );
    assert.equal(result.rows.length, 2);
    for (const row of result.rows) assert.equal(row.privileges, "SELECT");
    const rls = await one<{ rowsecurity: boolean }>(
      `SELECT rowsecurity FROM pg_tables WHERE schemaname='storage' AND tablename='objects'`
    );
    assert.equal(rls.rowsecurity, true);
    const policies = await client!.query(
      `SELECT cmd, qual FROM pg_policies WHERE schemaname='storage' AND tablename='objects'`
    );
    assert.equal(policies.rows.length, 1);
    assert.equal(policies.rows[0].cmd, "SELECT");
    assert.match(String(policies.rows[0].qual), /LOGO/);
    const effective = await client!.query(
      `SELECT 'anon'::text AS role,
              has_table_privilege('anon','storage.objects','SELECT') AS can_select,
              has_table_privilege('anon','storage.objects','INSERT') AS can_insert,
              has_table_privilege('anon','storage.objects','UPDATE') AS can_update,
              has_table_privilege('anon','storage.objects','DELETE') AS can_delete`
    );
    assert.deepEqual(effective.rows[0], {
      role: "anon", can_select: true, can_insert: false, can_update: false, can_delete: false,
    });

    // Actual access path: anon sees only the LOGO row (RLS), not the private
    // document row, and cannot write even though the table exists.
    try {
      await client!.query("BEGIN");
      await client!.query("SET LOCAL ROLE anon");
      const visible = await client!.query("SELECT count(*)::int AS n FROM storage.objects");
      assert.equal(visible.rows[0].n, 1);
      const logo = await client!.query("SELECT name FROM storage.objects");
      assert.equal(logo.rows[0].name, "logo.png");
    } finally {
      await client!.query("ROLLBACK");
    }
    let writeBlocked = false;
    try {
      await client!.query("BEGIN");
      await client!.query("SET LOCAL ROLE anon");
      await client!.query("INSERT INTO storage.objects (bucket_id, name) VALUES ('LOGO','evil.png')");
    } catch {
      writeBlocked = true;
    } finally {
      await client!.query("ROLLBACK").catch(() => {});
    }
    assert.equal(writeBlocked, true);
  });

  await check("reviewable value rollback restores both observed rows and keeps official source links", async () => {
    await client!.query(ROLLBACK_MIGRATION);
    const yenching = await one<{ amount_usd_value: number | null; min_ielts: number | null; eligible_majors: string }>(
      `SELECT amount_usd_value, min_ielts, eligible_majors FROM public.scholarships WHERE title ILIKE '%Yenching Academy%'`
    );
    assert.equal(yenching.amount_usd_value, 5040);
    assert.equal(yenching.min_ielts, null);
    assert.equal(yenching.eligible_majors, '["All Majors"]');
    const mit = await one<{ min_gpa: number | null; min_sat: number | null; verification_status: string }>(
      `SELECT min_gpa, min_sat, verification_status FROM public.universities WHERE name ILIKE '%Massachusetts Institute of Technology%'`
    );
    assert.equal(Number(mit.min_gpa), 3.91);
    assert.equal(mit.min_sat, 1520);
    assert.equal(mit.verification_status, "verified");
    const sources = await client!.query(
      `SELECT count(*)::int AS n FROM public.sources WHERE url IN ('https://mitadmissions.org/apply/firstyear/tests-scores/','https://mitadmissions.org/apply/firstyear/international/')`
    );
    assert.equal(sources.rows[0].n, 2);
  });

  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    for (const failure of failures) console.log(`  - ${failure}`);
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error("Disposable migration dry-run failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (client) await client.end().catch(() => {});
    if (pg) await pg.stop().catch(() => {});
    rmSync(DATA_DIR, { recursive: true, force: true });
  }).finally(()=>process.exit(process.exitCode??0));
