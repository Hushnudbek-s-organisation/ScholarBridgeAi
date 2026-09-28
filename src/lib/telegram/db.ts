/**
 * Lazy, additive bootstrap for the Telegram tables (same pattern as the
 * growth features): the DDL is idempotent, so it runs once per process on
 * first use and a deploy never breaks because a manual migration was missed.
 */
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { telegramStatements } from "./ddl";

let ready: boolean | null = null;
let lastAttempt = 0;
let inflight: Promise<boolean> | null = null;
const RETRY_MS = 60_000;

export async function ensureTelegramTables(): Promise<boolean> {
  if (ready === true) return true;
  if (inflight) return inflight;
  const now = Date.now();
  if (ready === false && now - lastAttempt < RETRY_MS) return false;
  lastAttempt = now;
  inflight = (async () => {
    try {
      for (const stmt of telegramStatements()) {
        await db.execute(sql.raw(stmt));
      }
      ready = true;
    } catch (err) {
      console.error("[telegram] schema bootstrap failed:", err);
      ready = false;
    } finally {
      inflight = null;
    }
    return ready === true;
  })();
  return inflight;
}

export const TELEGRAM_UNAVAILABLE = {
  error: "Telegram features are temporarily unavailable. Please try again in a minute.",
  code: "unavailable",
};
