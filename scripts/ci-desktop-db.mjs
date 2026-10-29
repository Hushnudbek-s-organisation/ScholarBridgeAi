/**
 * CI helper for the desktop-installer workflow — a database for `next build`.
 *
 * The installed app ships and starts its own PostgreSQL; only the BUILD needs
 * one, because Next reads the database while collecting page data. GitHub's
 * Windows and macOS runners cannot use service containers (Linux-only), so this
 * script starts the repository's cross-platform `embedded-postgres` instead:
 *
 *   node scripts/ci-desktop-db.mjs            # start, apply the schema, stay up
 *
 * It prints the connection string and, on GitHub Actions, exports DATABASE_URL
 * to the remaining steps. `.ci-db-ready` is written once the schema is in, so a
 * workflow can wait for it instead of sleeping.
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import EmbeddedPostgres from "embedded-postgres";

const DATA_DIR = process.env.CI_PG_DIR || path.join(process.cwd(), ".ci-pgdata");
const PORT = Number(process.env.CI_PG_PORT || 5433);
const DB = "scholarbridge";
const USER = "ci";
const PASSWORD = "ci";
const READY = path.join(process.cwd(), ".ci-db-ready");

const url = `postgresql://${USER}:${PASSWORD}@127.0.0.1:${PORT}/${DB}`;

async function main() {
  fs.rmSync(READY, { force: true });
  const pgServer = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: USER,
    password: PASSWORD,
    port: PORT,
    persistent: true,
    onLog: () => {},
    onError: (message) => console.error("[ci-db]", message instanceof Error ? message.message : message),
  });

  if (!fs.existsSync(path.join(DATA_DIR, "PG_VERSION"))) {
    console.log("[ci-db] initialising cluster…");
    await pgServer.initialise();
  }
  await pgServer.start();
  await pgServer.createDatabase(DB).catch(() => {});

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    const { rows } = await client.query(
      "select count(*)::int as n from information_schema.tables where table_schema = 'public'"
    );
    if (rows[0].n === 0) {
      console.log("[ci-db] applying supabase/full_schema.sql…");
      await client.query(fs.readFileSync(path.join(process.cwd(), "supabase", "full_schema.sql"), "utf8"));
    }
    const after = await client.query(
      "select count(*)::int as n from information_schema.tables where table_schema = 'public'"
    );
    console.log(`[ci-db] ready — ${after.rows[0].n} tables on ${url}`);
  } finally {
    await client.end().catch(() => {});
  }

  // Export for the following steps, then signal readiness.
  if (process.env.GITHUB_ENV) fs.appendFileSync(process.env.GITHUB_ENV, `DATABASE_URL=${url}\n`);
  fs.writeFileSync(READY, url);
  console.log("[ci-db] holding the connection open (Ctrl-C / job end stops it)");

  const stop = async () => {
    await pgServer.stop().catch(() => {});
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  setInterval(() => {}, 1 << 30);
}

main().catch((error) => {
  console.error("[ci-db] failed:", error);
  process.exit(1);
});
