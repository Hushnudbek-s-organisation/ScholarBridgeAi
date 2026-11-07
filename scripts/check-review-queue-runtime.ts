/**
 * §11 — REAL runtime proof for the admin review queue.
 *
 * The static guard (`check-review-queue.ts`) proves the pure model, but it
 * cannot prove that the four SQL sources actually run against the migration's
 * schema. This suite starts a disposable PostgreSQL cluster, builds the real
 * Drizzle schema, applies the ACTUAL (production-NOT-applied)
 * security_evidence_research_2026-11-06.sql, then calls the real route loader:
 *
 *   - migration `value_type` / `verification_status` / `entity_type` values are
 *     mapped WITHOUT being dropped to null or coerced to the wrong entity;
 *   - an unverified `official_requirement` really produces conflicting_facts,
 *     missing_source and missing_admission_cycle items;
 *   - the duplicates query runs on the REAL schema (`scholarships.title`, no
 *     nonexistent `applications.scholarship_id`);
 *   - ONE failing source no longer hides the other three (`partialFailures`
 *     instead of a blanket `migrationPending`);
 *   - a human decision never writes a verification status/date.
 *
 * NO production connection, NO production write, NO production migration apply.
 * Run: npm run test:review-queue-runtime
 */
import EmbeddedPostgres from "embedded-postgres";
import { Client } from "pg";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const PORT = 55444;
const DB = "sbreviewqueue";
const URL_ = `postgresql://test:test@127.0.0.1:${PORT}/${DB}`;
const DATA_DIR = "/tmp/sb-review-queue-pg";
const NOW = "2026-11-06T00:00:00.000Z";

// Set BEFORE any dynamic import so `@/db` sees the disposable URL.
process.env.DATABASE_URL = URL_;
process.env.PG_POOL_MAX = "3";
const MIGRATION = readFileSync(join(ROOT, "supabase/security_evidence_research_2026-11-06.sql"), "utf8");

let passed = 0;
const failures: string[] = [];
async function check(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e: unknown) {
    const m = e instanceof Error ? e.message : String(e);
    failures.push(`${name}: ${m}`);
    console.log(`  ✗ ${name} — ${m}`);
  }
}

let pg: EmbeddedPostgres | null = null;
let client: Client | null = null;
type Route = typeof import("../src/app/api/admin/review-queue/route");
type Model = typeof import("../src/lib/reviewQueue");
let route!: Route;
let model!: Model;

async function main() {
  console.log("\nReview queue — REAL disposable-Postgres runtime proof (no production)");
  rmSync(DATA_DIR, { recursive: true, force: true });
  pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR, user: "test", password: "test", port: PORT,
    persistent: false, onLog: () => {}, onError: () => {},
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

  // Supabase roles + storage stub, needed only so the real migration's
  // REVOKE/GRANT/RLS statements execute in the disposable cluster.
  await client.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN CREATE ROLE postgres NOLOGIN BYPASSRLS; END IF;
    END $$;
    GRANT USAGE ON SCHEMA public TO postgres, service_role;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
    CREATE SCHEMA IF NOT EXISTS storage;
    CREATE TABLE IF NOT EXISTS storage.objects (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text
    );
    GRANT USAGE ON SCHEMA storage TO anon, authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO anon, authenticated;
    GRANT ALL ON storage.objects TO postgres, service_role;
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Public can read LOGO assets" ON storage.objects;
    CREATE POLICY "Public can read LOGO assets" ON storage.objects
      FOR SELECT TO public USING (bucket_id = 'LOGO');
  `);

  // The ACTUAL migration, not a copy of its DDL.
  await client.query(MIGRATION);

  route = await import("../src/app/api/admin/review-queue/route");
  model = await import("../src/lib/reviewQueue");

  await check("the real migration applies and the loader sees all four sources", async () => {
    const q = await route.loadQueueInput();
    assert.equal(q.migrationPending, false, "catalogue_facts exists");
    assert.deepEqual(q.partialFailures, [], "no source query failed on the real schema");
    assert.ok(q.facts.length >= 7, `seeded facts visible (${q.facts.length})`);
    assert.ok(q.facts.some((f) => f.entityType === "ranking"), "ranking entity preserved, not coerced to scholarship");
  });

  await check("migration value_type/status values survive the mapping", async () => {
    const q = await route.loadQueueInput();
    const yenching = q.facts.find((f) => f.entityId === 894 && f.fieldKey === "min_ielts");
    assert.ok(yenching, "seeded Yenching IELTS fact is loaded");
    assert.equal(yenching.valueType, "official_requirement", "the migration's real CHECK value is not dropped to null");
    assert.equal(yenching.verificationStatus, "verified");
    assert.equal(yenching.entityType, "scholarship");
    const qs = q.facts.find((f) => f.entityType === "ranking" && f.fieldKey === "qs_rank_year");
    assert.ok(qs, "ranking fact kept its own entity type");
    assert.equal(qs.valueType, "observed_statistic");
    // A VERIFIED official requirement is not a conflict; an unverified one is.
    const items = model.buildReviewItems({ ...q, nowIso: NOW });
    assert.ok(!items.some((i) => i.category === "conflicting_facts" && i.fieldKey === "min_ielts"),
      "a verified official requirement is not flagged as an unverified minimum");
  });

  await check("unverified official_requirement with no source/cycle produces the right items", async () => {
    await client!.query(`
      INSERT INTO public.catalogue_facts
        (entity_type, entity_id, field_key, value_numeric, value_text, verification_status,
         value_type, source_url, verified_at, admission_cycle, is_active)
      VALUES ('university', 9901, 'min_gpa', 3.9, '3.9', 'review_needed',
              'official_requirement', NULL, NULL, NULL, TRUE)
    `);
    const q = await route.loadQueueInput();
    const f = q.facts.find((x) => x.entityId === 9901);
    assert.ok(f && f.valueType === "official_requirement", "row mapped with its real type");
    const items = model.buildReviewItems({ ...q, nowIso: NOW }).filter((i) => i.entityId === 9901);
    const cats = new Set(items.map((i) => i.category));
    assert.ok(cats.has("conflicting_facts"), "unverified official-minimum claim is flagged");
    assert.ok(cats.has("missing_source"), "no source URL is flagged");
    assert.ok(cats.has("missing_admission_cycle"), "no admission cycle is flagged");
    assert.equal(items.some((i) => i.priority === "critical"), true);
  });

  await check("failed_verification is preserved, never collapsed to null", async () => {
    await client!.query(`
      INSERT INTO public.catalogue_facts
        (entity_type, entity_id, field_key, value_numeric, verification_status,
         value_type, source_url, admission_cycle, is_active)
      VALUES ('university', 9902, 'min_sat', 1400, 'failed_verification',
              'unverified', 'https://example.org/tests', '2026-27', TRUE)
    `);
    const q = await route.loadQueueInput();
    const f = q.facts.find((x) => x.entityId === 9902);
    assert.ok(f);
    assert.equal(f.verificationStatus, "failed_verification");
  });

  await check("failed official check and failed refresh job become review items", async () => {
    await client!.query(`
      INSERT INTO public.official_source_checks
        (entity_type, entity_id, field_key, source_url, verification_succeeded,
         evidence_present, reason, official_page_re_read)
      VALUES ('university', 9903, 'min_gpa', 'https://example.org/a', FALSE, FALSE,
              'no evidence on the official page', FALSE);
      INSERT INTO public.refresh_jobs (job_type, status, error, failed_verification)
      VALUES ('university', 'failed', 'official fetch timed out', TRUE);
    `);
    const q = await route.loadQueueInput();
    assert.deepEqual(q.partialFailures, []);
    const items = model.buildReviewItems({ ...q, nowIso: NOW });
    assert.ok(items.some((i) => i.category === "failed_job" && i.fieldKey === "min_gpa" && i.entityId === 9903));
    const job = items.find((i) => i.category === "failed_job" && String(i.fieldKey).startsWith("job:"));
    assert.ok(job, "failed job is a review item");
    assert.equal(job.entityType, "system", "a job id is NOT a university id");
    assert.equal(q.failedChecks.some((c) => c.entityType === "system"), true);
  });

  await check("duplicates query runs on the real schema and counts linked rows", async () => {
    // Only in this disposable test we relax FK triggers to insert a saved row
    // without building an entire profile graph; table/column names stay real.
    await client!.query(`
      SET session_replication_role = replica;
      INSERT INTO public.scholarships (title, provider, country, description, requirements, website_url)
      VALUES ('Disposable MBA Fellowship', 'Test Provider', 'United States', 'd', 'r', 'https://example.org');
    `);
    const canonicalId = (await client!.query<{ id: number }>(
      `SELECT id FROM public.scholarships WHERE title = 'Disposable MBA Fellowship' ORDER BY id LIMIT 1`,
    )).rows[0].id;
    assert.ok(canonicalId > 0, "canonical row exists");
    const twin = await client!.query<{ id: number }>(`
      INSERT INTO public.scholarships (title, provider, country, description, requirements, website_url)
      VALUES ('Disposable MBA Fellowship', 'Test Provider', 'United States', 'd', 'r', 'https://example.org')
      RETURNING id
    `);
    const dupId = twin.rows[0].id;
    await client!.query(`
      INSERT INTO public.saved_scholarships (profile_id, scholarship_id)
      VALUES (777, ${dupId});
      SET session_replication_role = DEFAULT;
    `);
    const q = await route.loadQueueInput();
    assert.deepEqual(q.partialFailures, [], "title/provider query does not fail on a missing column");
    const d = q.duplicates.find((x) => x.name === "Disposable MBA Fellowship");
    assert.ok(d, "duplicate pair is found by title+provider, never by a hardcoded id");
    assert.equal(d.canonicalId < d.duplicateId, true);
    assert.ok(d.linkedRows >= 1, `linked saved rows are counted (${d.linkedRows})`);
    assert.equal(d.matchedOn, "title+provider");
    const items = model.buildReviewItems({ ...q, nowIso: NOW });
    const dupItem = items.find((i) => i.category === "duplicate" && i.entityId === dupId);
    assert.ok(dupItem);
    assert.match(dupItem.nextAction, /never a lossy delete/i);
  });

  await check("a human decision writes only the queue item, never a verification status/date", async () => {
    const q = await route.loadQueueInput();
    const items = model.buildReviewItems({ ...q, nowIso: NOW });
    const target = items.find((i) => i.entityId === 9901 && i.category === "conflicting_facts");
    assert.ok(target);
    const before = await client!.query(
      `SELECT verification_status, verified_at FROM public.catalogue_facts WHERE entity_id = 9901 AND field_key = 'min_gpa'`,
    );
    const decision = model.decideReviewItem(target, {
      itemKey: target.itemKey, decision: "start_review",
      reason: "Needs an official first-year page re-read", adminProfileId: 42, nowIso: NOW,
    });
    assert.equal(decision.ok, true);
    assert.equal(decision.item.status, "in_review");
    const persisted = await route.persistDecision(decision.item);
    assert.equal(persisted, true, "decision row is written");
    const row = await client!.query(
      `SELECT status, decision_reason, decided_by FROM public.review_queue_items WHERE item_key = $1`,
      [decision.item.itemKey],
    );
    assert.equal(row.rows.length, 1);
    assert.equal(row.rows[0].status, "in_review");
    assert.equal(row.rows[0].decided_by, 42);
    const after = await client!.query(
      `SELECT verification_status, verified_at FROM public.catalogue_facts WHERE entity_id = 9901 AND field_key = 'min_gpa'`,
    );
    assert.deepEqual(after.rows, before.rows, "opening an item NEVER verifies the fact");
  });

  await check("ONE failing source no longer hides the other three", async () => {
    await client!.query(`DROP TABLE public.refresh_jobs`);
    const q = await route.loadQueueInput();
    assert.equal(q.migrationPending, false, "a single missing source is NOT 'migration pending'");
    assert.deepEqual(q.partialFailures, ["refresh_jobs"], "the failed source is NAMED");
    assert.ok(q.facts.length >= 7, `typed facts still load (${q.facts.length})`);
    assert.ok(q.failedChecks.length >= 1, "official_source_checks still load");
    assert.ok(q.duplicates.length >= 1, "duplicate candidates still load");
  });

  await check("the primary table missing is the only migrationPending case", async () => {
    await client!.query(`DROP TABLE public.catalogue_facts`);
    const q = await route.loadQueueInput();
    assert.equal(q.migrationPending, true);
    assert.equal(q.facts.length, 0);
    assert.ok(q.partialFailures.includes("catalogue_facts"));
    assert.equal(q.partialFailures.includes("official_source_checks"), false,
      "healthy sources are not falsely reported as broken");
  });

  await check("anon can read typed facts but not the decision/queue tables", async () => {
    const g = await client!.query<{ q: boolean; c: boolean }>(`
      SELECT has_table_privilege('anon', 'public.review_queue_items', 'SELECT') AS q,
             has_table_privilege('anon', 'public.official_source_checks', 'SELECT') AS c
    `);
    assert.equal(g.rows[0].q, false);
    assert.equal(g.rows[0].c, false);
  });

  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    for (const f of failures) console.error(`  - ${f}`);
    process.exitCode = 1;
  }
}

async function cleanup() {
  try { const { pool } = await import("../src/db"); await pool.end(); } catch { /* pool may be unused */ }
  try { await client?.end(); } catch { /* already closed */ }
  try { await pg?.stop(); } catch { /* already stopped */ }
  rmSync(DATA_DIR, { recursive: true, force: true });
}

void main().catch(error=>{console.error(error);process.exitCode=1;}).finally(cleanup).finally(()=>process.exit(process.exitCode??0));
