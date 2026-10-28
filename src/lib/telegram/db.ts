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
import { ensureCoreSchema } from "@/lib/core/db";
import { telegramStatements } from "./ddl";

/**
 * `ensureCoreSchema` runs first: `telegram_links` and friends have foreign keys
 * into `student_profiles`, so on a fresh database this module used to fail with
 * "relation student_profiles does not exist" and take the whole bot panel with it.
 */
const bootstrap = createTableBootstrap(
  "telegram",
  telegramStatements,
  (stmt) => db.execute(sql.raw(stmt)),
  undefined,
  ensureCoreSchema
);

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
