/**
 * Lazy, additive bootstrap for the channel tables — the same pattern as
 * `src/lib/telegram/db.ts`: idempotent DDL, run once per process on first use,
 * retried every minute after a failure so a temporarily unavailable database
 * does not require a restart.
 */
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { channelStatements } from "./ddl";

let ready: boolean | null = null;
let lastAttempt = 0;
let inflight: Promise<boolean> | null = null;
const RETRY_MS = 60_000;

export async function ensureChannelTables(): Promise<boolean> {
  if (ready === true) return true;
  if (inflight) return inflight;
  const now = Date.now();
  if (ready === false && now - lastAttempt < RETRY_MS) return false;
  lastAttempt = now;
  inflight = (async () => {
    try {
      for (const stmt of channelStatements()) {
        await db.execute(sql.raw(stmt));
      }
      ready = true;
    } catch (err) {
      console.error("[channel] schema bootstrap failed:", err);
      ready = false;
    } finally {
      inflight = null;
    }
    return ready === true;
  })();
  return inflight;
}

/** Test seam: forget the memoised result (used by the integration checks). */
export function resetChannelTablesMemo() {
  ready = null;
  lastAttempt = 0;
  inflight = null;
}

export const CHANNEL_UNAVAILABLE = {
  error: "The channel publisher is temporarily unavailable. Please try again in a minute.",
  code: "unavailable",
};
