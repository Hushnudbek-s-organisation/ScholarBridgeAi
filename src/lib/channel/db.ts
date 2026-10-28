/**
 * Lazy, additive bootstrap for the channel tables — the same pattern as
 * `src/lib/telegram/db.ts`: idempotent DDL, run once per process on first use,
 * retried every minute after a failure so a temporarily unavailable database
 * does not require a restart.
 */
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { createTableBootstrap } from "@/lib/db/bootstrap";
import { lockDownTables } from "@/lib/db/lockdown";
import { columnExistenceVerify, tableExistenceVerify, tablesInStatements } from "@/lib/schemaGate";
import { ensureCoreSchema } from "@/lib/core/db";
import { channelColumns, channelStatements } from "./ddl";

/**
 * "Is the channel schema there?" — every table the publisher creates *and*
 * every column it expects.
 *
 * Tables alone are not enough: this module adds columns over time with
 * `ALTER TABLE … ADD COLUMN IF NOT EXISTS` (lane, origin, text_override, the
 * approval-era fields). With `SCHEMA_AUTO_REPAIR=off` the bootstrap only
 * verifies, so a database created by an older build would pass a table-only
 * check and then fail the first post with "column does not exist".
 */
async function verifyChannelSchema(): Promise<{ ok: boolean; problems: string[] }> {
  const tables = await tableExistenceVerify(tablesInStatements(channelStatements()))();
  const columns = await columnExistenceVerify(channelColumns())();
  return { ok: tables.ok && columns.ok, problems: [...tables.problems, ...columns.problems] };
}

const bootstrap = createTableBootstrap(
  "channel",
  channelStatements,
  (stmt) => db.execute(sql.raw(stmt)),
  verifyChannelSchema,
  // `channel_plan` / `channel_posts` reference `scholarships`, so the base
  // schema has to exist before this DDL can succeed.
  ensureCoreSchema,
  // On Supabase a table created this way is public by default: RLS off and a
  // full grant to `anon`/`authenticated`. `supabase/enable_rls.sql` fixes the
  // tables that existed when it was run, not the ones this bootstrap creates
  // afterwards — so lock them down here too.
  () => lockDownTables(tablesInStatements(channelStatements()), (stmt) => db.execute(sql.raw(stmt)))
);

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
