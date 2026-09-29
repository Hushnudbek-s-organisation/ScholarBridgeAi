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
import { journeyStatements } from "./ddl";

let ready: boolean | null = null;
let lastAttempt = 0;
let inflight: Promise<boolean> | null = null;
const RETRY_MS = 60_000;

export async function ensureJourneyTables(): Promise<boolean> {
  if (ready === true) return true;
  if (inflight) return inflight;
  const now = Date.now();
  if (ready === false && now - lastAttempt < RETRY_MS) return false;
  lastAttempt = now;
  inflight = (async () => {
    try {
      for (const stmt of journeyStatements()) {
        await db.execute(sql.raw(stmt));
      }
      ready = true;
    } catch (err) {
      console.error("[journey] schema bootstrap failed:", err);
      ready = false;
    } finally {
      inflight = null;
    }
    return ready === true;
  })();
  return inflight;
}

/** Standard 503 body when the tables could not be prepared. */
export const JOURNEY_UNAVAILABLE = {
  error: "This feature is temporarily unavailable. Please try again in a minute.",
  code: "unavailable",
};
