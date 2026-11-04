import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { databasePoolOptions } from "./poolOptions";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

/**
 * Pool sizing for a managed Postgres in front of a serverless/edge runtime.
 *
 * Every instance keeps its own pool, so the limit that matters is
 * `PG_POOL_MAX × instances` against the provider's connection cap (Supabase's
 * small plans are the usual suspect). 15 per instance exhausts a 60-connection
 * allowance with four warm instances, and the failure mode is exactly the one
 * users saw: `53300 too many clients` → every authenticated request answers
 * 503 "Authentication is temporarily unavailable". 5 is plenty for the
 * request-per-page pattern here and leaves room for the pooler.
 *
 * The timeouts are fail-fast on purpose: a request that hangs for the driver's
 * default (no limit) looks like "the site does not open" for the whole page
 * load, while a 8 s connect budget at least produces an answer.
 */
const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool(databasePoolOptions(process.env));

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

globalForDb.__arenaNextJsPostgresqlPool = pool;

export const db = drizzle(pool);
