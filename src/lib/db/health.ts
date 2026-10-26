/**
 * Read-only database diagnostics for the admin panel.
 *
 * Purpose: when the panel says "temporarily unavailable", the operator must be
 * able to see *which* layer broke — reachability, credentials, or write
 * permission — without reading Render/Vercel logs.
 *
 * Everything here is `SELECT`-only, so it stays safe on a read-only role and
 * never mutates the database. No hostnames, users or driver messages leave this
 * module: only stable codes and booleans (the panel is admin-only, but a
 * screenshot should still not contain a DSN).
 */
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { classifyDbError } from "./bootstrap";

export interface DbDiagnostics {
  reachable: boolean;
  /** `select 1` worked and the session details came back. */
  details: {
    /** Can this role INSERT into the main config table? */
    canInsert: boolean | null;
    /** Can this role CREATE tables in the current schema? */
    canCreateTables: boolean | null;
    /** True when the connection points at a read-only standby/replica. */
    readOnly: boolean | null;
    /** True when the server reports it is in recovery (a replica). */
    inRecovery: boolean | null;
    /** The `app_config` table was visible (schema deployed). */
    configTableVisible: boolean | null;
  } | null;
  reason: string | null;
  hint: string | null;
}

export async function dbDiagnostics(): Promise<DbDiagnostics> {
  try {
    const res = await db.execute<{
      can_insert: boolean | null;
      can_create: boolean | null;
      read_only: boolean | null;
      in_recovery: boolean | null;
      has_config: boolean | null;
    }>(sql`
      select
        coalesce(has_table_privilege(to_regclass('app_config'), 'INSERT'), false) as can_insert,
        coalesce(has_schema_privilege(current_schema(), 'CREATE'), false) as can_create,
        coalesce(current_setting('transaction_read_only')::boolean, false) as read_only,
        coalesce(pg_is_in_recovery(), false) as in_recovery,
        (to_regclass('app_config') is not null) as has_config
    `);
    const row = (res as unknown as { rows?: Record<string, unknown>[] }).rows?.[0] ?? null;
    const details = {
      canInsert: row ? Boolean(row.can_insert) : null,
      canCreateTables: row ? Boolean(row.can_create) : null,
      readOnly: row ? Boolean(row.read_only) : null,
      inRecovery: row ? Boolean(row.in_recovery) : null,
      configTableVisible: row ? Boolean(row.has_config) : null,
    };
    // A reachable database that cannot create tables is the failure mode that
    // looks like "Telegram is broken" while the rest of the site works.
    if (details.readOnly || details.inRecovery) {
      return {
        reachable: true,
        details,
        reason: "read_only",
        hint: "DATABASE_URL points at a read-only connection (a replica, or a read-only role/pooler). Switch it to the read-write endpoint.",
      };
    }
    if (details.canCreateTables === false) {
      return {
        reachable: true,
        details,
        reason: "permission_denied",
        hint: "The role can read but not create tables. Grant CREATE on the schema, or apply the SQL in supabase/ as the owner.",
      };
    }
    if (details.canInsert === false) {
      return {
        reachable: true,
        details,
        reason: "permission_denied",
        hint: "The role cannot write to app_config. Grant INSERT/UPDATE, or point DATABASE_URL at the owner role.",
      };
    }
    return { reachable: true, details, reason: null, hint: null };
  } catch (err) {
    const { reason, hint } = classifyDbError(err);
    return { reachable: false, details: null, reason, hint };
  }
}
