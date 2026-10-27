/**
 * Journey Core — lazy, additive schema bootstrap.
 *
 * Same pattern as `ensureGrowthTables` (src/lib/growth/db.ts): the DDL in
 * `ddl.ts` is idempotent, so the app runs it once per process on first use.
 * A deploy therefore never breaks because somebody forgot a manual migration.
 *
 * If the bootstrap fails the routes answer 503 politely and the rest of the app
 * keeps working — a missing journey table must never take the product down.
 */
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureRichPlatformDataSeeded } from "@/db/seedRichPlatformData";
import {
  ensureSchemaOnce,
  forceSchemaRepair,
  schemaGateSnapshot,
  tableExistenceVerify,
  tablesInStatements,
} from "@/lib/schemaGate";
import { journeyStatements } from "./ddl";

const GATE = "journey";

async function repair(): Promise<void> {
  for (const stmt of journeyStatements()) {
    await db.execute(sql.raw(stmt));
  }
  await ensureRichPlatformDataSeeded();
}

/**
 * Once per PROCESS (not per route bundle — see `lib/schemaGate.ts`), and never
 * on a request path when `SCHEMA_AUTO_REPAIR=off`: a managed database gets its
 * schema from `supabase/*.sql` or the seed CLI, so a user request must not wait
 * for `CREATE TABLE`.
 */
export function ensureJourneyTables(): Promise<boolean> {
  return ensureSchemaOnce(GATE, repair, tableExistenceVerify(tablesInStatements(journeyStatements())));
}

/** Admin "retry" action / CLI: run the DDL now regardless of the mode. */
export function forceJourneyRepair(): Promise<boolean> {
  return forceSchemaRepair(GATE, repair);
}

export function journeySchemaStatus() {
  return schemaGateSnapshot().entries[GATE] ?? { ready: null, at: null, how: null, problems: [] };
}

/** Standard 503 body when the tables could not be prepared. */
export const JOURNEY_UNAVAILABLE = {
  error: "This feature is temporarily unavailable. Please try again in a minute.",
  code: "unavailable",
};
