/**
 * Lazy, additive bootstrap for the ownership tables (same pattern as the
 * Telegram/growth tables): idempotent DDL, run once per process on first
 * use, retried at most once a minute after a failure.
 */
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ownershipStatements } from "./ddl";

let ready: boolean | null = null;
let lastAttempt = 0;
let inflight: Promise<boolean> | null = null;
const RETRY_MS = 60_000;

export async function ensureOwnershipTables(): Promise<boolean> {
  if (ready === true) return true;
  if (inflight) return inflight;
  const now = Date.now();
  if (ready === false && now - lastAttempt < RETRY_MS) return false;
  lastAttempt = now;
  inflight = (async () => {
    try {
      for (const stmt of ownershipStatements()) {
        await db.execute(sql.raw(stmt));
      }
      ready = true;
    } catch (err) {
      console.error("[ownership] schema bootstrap failed:", (err as Error)?.message);
      ready = false;
    } finally {
      inflight = null;
    }
    return ready === true;
  })();
  return inflight;
}

export const OWNERSHIP_UNAVAILABLE = {
  error: "Ownership management is temporarily unavailable. Please try again in a minute.",
  code: "unavailable",
};
