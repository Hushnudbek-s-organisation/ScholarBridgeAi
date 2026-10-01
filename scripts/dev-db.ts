/**
 * Local dev database — throwaway embedded Postgres on :5433.
 *
 * Run with:  npx tsx scripts/dev-db.ts
 * Keeps the process alive; stop with Ctrl-C / SIGTERM.
 *
 * NOTE: dev-only. Never use for production or against external databases.
 */
import { existsSync } from "node:fs";
import EmbeddedPostgres from "embedded-postgres";

const DATA_DIR = "/tmp/sb-dev-pg";
const PORT = 5433;
const DB = "scholarbridge";

async function main() {
  const fresh = !existsSync(DATA_DIR);
  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: "sb",
    password: "sb",
    port: PORT,
    persistent: true,
    onLog: () => {},
    onError: () => {},
  });

  if (fresh) {
    console.log("initialising new data dir (first run)");
    await pg.initialise();
  }
  await pg.start();
  try {
    await pg.createDatabase(DB);
    console.log(`created database "${DB}"`);
  } catch {
    console.log(`database "${DB}" already exists`);
  }
  console.log(`DEV PG READY on :${PORT} (user sb, db ${DB})`);

  // Keep alive until SIGTERM.
  await new Promise(() => {});
}

main().catch((e) => {
  console.error("dev-db failed:", e);
  process.exit(1);
});
