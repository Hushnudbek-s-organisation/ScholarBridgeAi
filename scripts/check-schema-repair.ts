/**
 * check-schema-repair.ts — prove supabase/full_schema.sql is correct on both
 * the fresh-database path and the repair-of-a-broken-database path.
 *
 * SAFE & ISOLATED: spins up its own throwaway embedded Postgres on a private
 * port with a private data dir (wiped on every run). It NEVER reads or writes
 * DATABASE_URL, so it cannot touch the dev or production database. Re-running
 * always starts from scratch.
 *
 * Scenarios:
 *   1. FRESH — apply the file to an empty DB. Assert: full table count, FK
 *      count, the composite programs(id,university_id) unique constraint, the
 *      user_sessions.token_hash UNIQUE constraint (real constraint, not just an
 *      index — so ON CONFLICT works), RLS enabled on all tables, and the
 *      rate-limit storage table present.
 *   2. BROKEN — start from a healthy DB, then simulate the exact damage the
 *      old broken drizzle push left behind (all FKs dropped, the composite and
 *      token_hash uniques demoted to plain unique indexes, rate_limit_hits
 *      dropped, data present). Re-apply the file and assert the repair
 *      restores every FK (including the composite), converts the plain
 *      indexes back into real constraints, restores rate_limit_hits, and —
 *      critically — preserves the existing rows and lets ON CONFLICT
 *      (token_hash) work again.
 *
 * Exit 0 = all assertions pass; exit 1 = any assertion fails.
 */
import { readFileSync, rmSync } from "node:fs";
import EmbeddedPostgres from "embedded-postgres";
import pg from "pg";

const ROOT = new URL("..", import.meta.url).pathname;
const SQL = readFileSync(new URL("../supabase/full_schema.sql", import.meta.url), "utf8");
const PORT = 5521;
const DIR = "/tmp/scholarbridge-schema-repair";
const CONN = `postgresql://t:t@127.0.0.1:${PORT}/sb`;

let passed = 0;
let failed = 0;
const check = (label: string, ok: boolean, detail = "") => {
  if (ok) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.log(`  ✗ ${label}${detail ? " — " + detail : ""}`);
  }
};

const stats = (c: pg.Client) =>
  c.query(`
    SELECT
      (SELECT count(*)::int FROM information_schema.tables WHERE table_schema='public') AS tables,
      (SELECT count(*)::int FROM pg_constraint WHERE contype='f') AS fks,
      (SELECT count(*)::int FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
         WHERE c.contype='u' AND t.relnamespace='public'::regnamespace) AS public_uniques
  `).then((r) => r.rows[0] as { tables: number; fks: number; public_uniques: number });

const uniqueConstraintOn = (
  c: pg.Client,
  table: string,
  cols: string[],
) =>
  c
    .query(
      `SELECT 1 FROM pg_constraint c
       WHERE c.conrelid = 'public.${table}'::regclass AND c.contype = 'u'
         AND c.conkey = ARRAY[${cols
           .map((col) => `(SELECT attnum FROM pg_attribute WHERE attrelid='public.${table}'::regclass AND attname='${col}')::smallint`)
           .join(", ")}]`,
    )
    .then((r) => r.rows.length === 1);

const main = async () => {
  rmSync(DIR, { recursive: true, force: true });
  const inst = new EmbeddedPostgres({
    databaseDir: DIR,
    user: "t",
    password: "t",
    port: PORT,
    persistent: false,
    onLog: () => {},
    onError: () => {},
  });
  await inst.initialise();
  await inst.start();
  await inst.createDatabase("sb");
  const c = new pg.Client({ connectionString: CONN });
  await c.connect();

  // ---------------- Scenario 1: FRESH ----------------
  console.log("\nFRESH database (empty -> full_schema.sql):");
  await c.query(SQL);
  const fresh = await stats(c);
  check("creates the full table set (93)", fresh.tables === 93, `got ${fresh.tables}`);
  check("creates every FK (115)", fresh.fks === 115, `got ${fresh.fks}`);
  check(
    "composite programs(id, university_id) UNIQUE constraint exists",
    await uniqueConstraintOn(c, "programs", ["id", "university_id"]),
  );
  check(
    "application_cycles has the composite FK to programs",
    (
      await c.query(
        `SELECT 1 FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
         WHERE c.contype='f' AND t.relname='application_cycles'
           AND c.confrelid='public.programs'::regclass`,
      )
    ).rows.length === 1,
  );
  check(
    "user_sessions.token_hash is a real UNIQUE constraint (ON CONFLICT capable)",
    await uniqueConstraintOn(c, "user_sessions", ["token_hash"]),
  );
  const rls = (
    await c.query(
      `SELECT count(*)::int total, count(*) FILTER (WHERE relrowsecurity)::int enabled
       FROM pg_class WHERE relkind='r' AND relnamespace='public'::regnamespace`,
    )
  ).rows[0];
  check("RLS enabled on all 93 public tables", rls.total === 93 && rls.enabled === 93, `${rls.enabled}/${rls.total}`);
  check(
    "rate-limit storage table rate_limit_hits exists",
    (await c.query(`SELECT 1 FROM information_schema.tables WHERE table_name='rate_limit_hits'`)).rows.length === 1,
  );

  // ---------------- Scenario 2: BROKEN -> repaired ----------------
  console.log("\nBROKEN database (simulated old failed push -> repair):");
  // Drop every FK (this is the partial/aborted-push state).
  const fks = await c.query(
    `SELECT c.conname, t.relname FROM pg_constraint c
     JOIN pg_class t ON t.oid = c.conrelid WHERE c.contype='f' ORDER BY 1`,
  );
  for (const r of fks.rows) {
    try {
      await c.query(`ALTER TABLE "${r.relname}" DROP CONSTRAINT "${r.conname}"`);
    } catch {
      /* some may already be gone */
    }
  }
  // Demote the two key uniques to plain unique indexes (the 42830 state).
  await c.query("ALTER TABLE programs DROP CONSTRAINT IF EXISTS uq_programs_id_university");
  await c.query("DROP INDEX IF EXISTS uq_programs_id_university");
  await c.query("CREATE UNIQUE INDEX uq_programs_id_university ON programs (id, university_id)");
  await c.query("ALTER TABLE user_sessions DROP CONSTRAINT IF EXISTS uq_user_sessions_token_hash");
  await c.query("DROP INDEX IF EXISTS user_sessions_token_hash_key");
  await c.query("CREATE UNIQUE INDEX uq_user_sessions_token_hash ON user_sessions (token_hash)");
  await c.query("DROP TABLE IF EXISTS rate_limit_hits");
  // Seed rows that MUST survive the repair.
  await c.query(
    `INSERT INTO student_profiles (name, email, password_hash, gpa)
     VALUES ('Repair Survivor', 'survivor@example.com', 'x', 3.9)`,
  );
  const prof = await c.query(`SELECT id FROM student_profiles WHERE email='survivor@example.com'`);
  await c.query(`INSERT INTO user_sessions (profile_id, token_hash, scope) VALUES ($1, 'deadbeef', 'web')`, [prof.rows[0].id]);
  const broken = await stats(c);
  check("damage applied: FKs gone (0)", broken.fks === 0, `got ${broken.fks}`);

  // Repair with the canonical file.
  await c.query(SQL);
  const repaired = await stats(c);
  check("repair restores every FK (115)", repaired.fks === 115, `got ${repaired.fks}`);
  check(
    "repair backfills the composite FK on application_cycles",
    (
      await c.query(
        `SELECT 1 FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
         WHERE c.contype='f' AND t.relname='application_cycles'
           AND c.confrelid='public.programs'::regclass`,
      )
    ).rows.length === 1,
  );
  check(
    "repair converts token_hash plain index -> real UNIQUE constraint",
    await uniqueConstraintOn(c, "user_sessions", ["token_hash"]),
  );
  check(
    "repair restores rate_limit_hits",
    (await c.query(`SELECT 1 FROM information_schema.tables WHERE table_name='rate_limit_hits'`)).rows.length === 1,
  );
  const profAfter = await c.query(`SELECT count(*)::int n FROM student_profiles WHERE email='survivor@example.com'`);
  const sessAfter = await c.query(`SELECT count(*)::int n FROM user_sessions WHERE token_hash='deadbeef'`);
  check("repair preserves existing profile rows", profAfter.rows[0].n === 1, `got ${profAfter.rows[0].n}`);
  check("repair preserves existing session rows", sessAfter.rows[0].n === 1, `got ${sessAfter.rows[0].n}`);
  let onConflictOk = false;
  try {
    await c.query(
      `INSERT INTO user_sessions (profile_id, token_hash, scope) VALUES ($1, 'deadbeef', 'web')
       ON CONFLICT (token_hash) DO NOTHING`,
      [prof.rows[0].id],
    );
    onConflictOk = true;
  } catch {
    onConflictOk = false; // 42P10 would mean no usable unique target
  }
  check("ON CONFLICT (token_hash) works after repair", onConflictOk);

  await c.end();
  await inst.stop();

  console.log(`\n${failed === 0 ? "✅" : "❌"} schema-repair test: ${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
};

main().catch((err) => {
  console.error("schema-repair test crashed:", err);
  process.exit(1);
});
