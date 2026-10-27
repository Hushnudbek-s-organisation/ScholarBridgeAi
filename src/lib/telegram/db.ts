/**
 * Lazy, additive bootstrap for the Telegram tables (same pattern as the
 * growth features): the DDL is idempotent, so it runs once per process on
 * first use and a deploy never breaks because a manual migration was missed.
 *
 * The state is memoised *and reported* — see `src/lib/db/bootstrap.ts`.
 */
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { createTableBootstrap } from "@/lib/db/bootstrap";
import { telegramStatements } from "./ddl";

const bootstrap = createTableBootstrap("telegram", telegramStatements, (stmt) => db.execute(sql.raw(stmt)));

export function ensureTelegramTables(): Promise<boolean> {
  return bootstrap.ensure();
}

/**
 * Admin "retry" action: run the DDL even when the request path is configured
 * not to (`SCHEMA_AUTO_REPAIR=off`), because this is an explicit operator step.
 */
export function forceTelegramRepair(): Promise<boolean> {
  return bootstrap.forceRepair();
}

/** Admin diagnostics: why the tables are (not) ready — never the raw error. */
export function telegramBootstrapStatus() {
  return bootstrap.status();
}

/** Force the next call to try again (admin "retry" button, tests). */
export function resetTelegramTablesMemo() {
  bootstrap.reset();
}

export const TELEGRAM_UNAVAILABLE = {
  error: "Telegram features are temporarily unavailable. Please try again in a minute.",
  code: "unavailable",
};
