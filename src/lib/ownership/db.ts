/**
 * Lazy, additive bootstrap for the ownership tables (same pattern as the
 * Telegram/growth tables): idempotent DDL, run once per process on first
 * use, retried at most once a minute after a failure.
 */
import { sql } from "drizzle-orm";
import { db } from "@/db";
import {
  ensureSchemaOnce,
  forceSchemaRepair,
  schemaGateSnapshot,
  tableExistenceVerify,
  tablesInStatements,
} from "@/lib/schemaGate";
import { ownershipStatements } from "./ddl";

const GATE = "ownership";

async function repair(): Promise<void> {
  for (const stmt of ownershipStatements()) {
    await db.execute(sql.raw(stmt));
  }
}

/**
 * Once per process (shared with every route bundle — see `lib/schemaGate.ts`),
 * and never at all when `SCHEMA_AUTO_REPAIR=off`.
 */
export function ensureOwnershipTables(): Promise<boolean> {
  return ensureSchemaOnce(GATE, repair, tableExistenceVerify(tablesInStatements(ownershipStatements())));
}

/** Admin "retry" action: run the DDL now, even with request-path repair off. */
export function forceOwnershipRepair(): Promise<boolean> {
  return forceSchemaRepair(GATE, repair);
}

export function ownershipSchemaStatus() {
  return schemaGateSnapshot().entries[GATE] ?? { ready: null, at: null, how: null, problems: [] };
}

export const OWNERSHIP_UNAVAILABLE = {
  error: "Ownership management is temporarily unavailable. Please try again in a minute.",
  code: "unavailable",
};
