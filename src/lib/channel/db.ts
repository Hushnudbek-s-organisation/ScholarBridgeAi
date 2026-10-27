/**
 * Lazy, additive bootstrap for the channel tables — the same pattern as
 * `src/lib/telegram/db.ts`: idempotent DDL, run once per process on first use,
 * retried every minute after a failure so a temporarily unavailable database
 * does not require a restart.
 */
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { createTableBootstrap } from "@/lib/db/bootstrap";
import { channelStatements } from "./ddl";

const bootstrap = createTableBootstrap("channel", channelStatements, (stmt) => db.execute(sql.raw(stmt)));

export function ensureChannelTables(): Promise<boolean> {
  return bootstrap.ensure();
}

/**
 * Admin "retry" action: run the DDL even when the request path is configured
 * not to (`SCHEMA_AUTO_REPAIR=off`), because this is an explicit operator step.
 */
export function forceChannelRepair(): Promise<boolean> {
  return bootstrap.forceRepair();
}

/** Admin diagnostics: why the tables are (not) ready — never the raw error. */
export function channelBootstrapStatus() {
  return bootstrap.status();
}

/** Test seam: forget the memoised result (used by the integration checks). */
export function resetChannelTablesMemo() {
  bootstrap.reset();
}

export const CHANNEL_UNAVAILABLE = {
  error: "The channel publisher is temporarily unavailable. Please try again in a minute.",
  code: "unavailable",
};
