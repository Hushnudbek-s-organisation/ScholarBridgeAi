import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
  });

// A node-postgres Pool reports problems on its IDLE clients through an 'error'
// event. With no listener attached, Node treats that as an uncaught exception
// and kills the process — which is exactly what made CI intermittently red on
// the embedded-Postgres suites: every assertion had passed, then the database
// was shut down and a lingering idle client reported 57P01 "terminating
// connection due to administrator command". The same thing in production is a
// database restart or an idle-connection reaper taking the whole server down.
// Log it and let the next real query surface a genuine failure instead.
// Guarded so a dev hot-reload that re-evaluates this module cannot stack
// duplicate listeners on the cached pool.
const guardedPool = pool as Pool & { __arenaErrorListenerAttached?: boolean };
if (!guardedPool.__arenaErrorListenerAttached) {
  guardedPool.__arenaErrorListenerAttached = true;
  pool.on("error", (err) => {
    console.error("[db] idle client error:", err?.message ?? err);
  });
}

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
