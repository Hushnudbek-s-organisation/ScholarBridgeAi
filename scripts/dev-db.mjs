/**
 * Local development database.
 *
 * Spins up a throwaway PostgreSQL instance (the `embedded-postgres` dev
 * dependency — no Docker, no system Postgres) so `npm run dev`, the check
 * scripts in `scripts/` and `npm run db:push` all work on a fresh clone.
 *
 *   node scripts/dev-db.mjs            # start, keep running
 *   node scripts/dev-db.mjs --init     # start, then push the Drizzle schema + seed
 *
 * The data directory defaults to `.pgdata/` (git-ignored) and is *persistent*,
 * so stopping and restarting keeps your local data. Delete the directory to
 * start from scratch.
 */
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import EmbeddedPostgres from "embedded-postgres";

const DATA_DIR = process.env.PGDATA_DIR || ".pgdata";
const USER = "sb";
const PASSWORD = "sb";
const PORT = Number(process.env.PGPORT || 5433);
const DB = "scholarbridge";

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: USER,
    password: PASSWORD,
    port: PORT,
    persistent: true,
  });

  const fresh = !existsSync(DATA_DIR) || !existsSync(`${DATA_DIR}/PG_VERSION`);
  if (fresh) {
    console.log(`[dev-db] initialising cluster in ${DATA_DIR} …`);
    await pg.initialise();
  }

  await pg.start();
  console.log(`[dev-db] postgres listening on 127.0.0.1:${PORT}`);

  if (fresh) {
    await pg.createDatabase(DB).catch(() => {});
    console.log(`[dev-db] created database "${DB}"`);
  }

  const url = `postgresql://${USER}:${PASSWORD}@127.0.0.1:${PORT}/${DB}`;
  console.log(`[dev-db] DATABASE_URL=${url}`);

  if (process.argv.includes("--init")) {
    await run("npx", ["drizzle-kit", "push", "--force"], url);
    await run("npx", ["tsx", "src/db/seed.ts"], url);
  }

  const stop = async () => {
    console.log("\n[dev-db] stopping …");
    await pg.stop().catch(() => {});
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  // Keep the process alive.
  setInterval(() => {}, 1 << 30);
}

function run(cmd, args, databaseUrl) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: databaseUrl },
    });
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} exited with ${code}`))
    );
  });
}

main().catch((err) => {
  console.error("[dev-db] failed:", err);
  process.exit(1);
});
