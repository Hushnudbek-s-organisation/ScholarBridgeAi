import { db } from "@/db";
import { sql } from "drizzle-orm";
import { ensureCoreSchema } from "@/lib/core/db";
import { dbFailureCode } from "@/lib/dbError";

export const dynamic = "force-dynamic";

/**
 * Liveness + the auth-path diagnosis in one URL.
 *
 * Render probes this for deploys, but it exists for the incident this app
 * keeps hitting: the whole dashboard answering "Authentication is temporarily
 * unavailable." while the service itself looks alive. That is always the
 * database — a freed Render free-tier DB (ENOTFOUND), a pasted Supabase
 * DIRECT host (IPv6-only → timeout from IPv4-only hosts; the session pooler
 * must be used), rotated credentials (28P01) or a paused project. The plain
 * `select 1` health told you nothing about which; this answers WHY with the
 * driver's own error code and a mapping, so no log access is needed.
 *
 * Secrets: never. Only the DB hostname is echoed; credentials and full DSN
 * stay out of the payload.
 */

/** Host of DATABASE_URL, or null — no user, password, port list or query. */
function dbHost(): string | null {
  try {
    return new URL(process.env.DATABASE_URL ?? "").hostname || null;
  } catch {
    return null;
  }
}

/** Driver-level error code only (Node errno, pg-pool message, Postgres SQLSTATE). */
function errCode(err: unknown): string {
  return dbFailureCode(err) || "unclassified";
}

function hintFor(code: string): string {
  switch (code) {
    case "ENOTFOUND":
    case "EAI_AGAIN":
      return "DNS failure — the database host no longer exists. A Render free-tier Postgres expires after 30 days of inactivity: provision a database (or resume Supabase) and update DATABASE_URL.";
    case "ECONNREFUSED":
      return "Nothing listens at that host:port — check the connection string (Supabase needs the POOLER host, not the direct db.* host, and the right port).";
    case "ETIMEDOUT":
      return "Connection timed out — Supabase DIRECT hosts (db.<ref>.supabase.co:5432) are IPv6-only and unreachable from IPv4-only hosts like Render. Use the Session pooler (aws-0-<region>.pooler.supabase.com:5432) with ?sslmode=require.";
    case "28P01":
    case "28000":
      return "Postgres rejected the credentials — the password was rotated or the connection string is stale; paste a fresh URI.";
    case "3D000":
      return "The database name in DATABASE_URL does not exist (deleted or renamed project).";
    default:
      return "Database unreachable — check DATABASE_URL and the database status (paused, deleted, firewall).";
  }
}

export async function GET() {
  const host = dbHost();
  let connected = true;
  let code = "";
  try {
    await db.execute(sql`select 1`);
  } catch (err) {
    connected = false;
    code = errCode(err);
  }

  if (!connected) {
    return Response.json(
      { ok: false, db: "unreachable", host, code, hint: hintFor(code) },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }

  // Additive core-schema drift (missing user_sessions, password_hash, …) is
  // what made every authenticated request 503 after a deploy ahead of the
  // database. Repair it here too — cached, no-op once up to date.
  const schemaReady = await ensureCoreSchema();

  // Read-only confirmation that the two auth-critical objects are visible to
  // the app's role, so "schema ok" never relies on the repair quietly failing.
  let userSessions = false;
  let passwordHash = false;
  try {
    const probe = await db.execute(sql`
      SELECT (to_regclass('user_sessions') IS NOT NULL) AS user_sessions,
             EXISTS (
               SELECT 1 FROM information_schema.columns
               WHERE table_name = 'student_profiles' AND column_name = 'password_hash'
             ) AS password_hash
    `);
    const row = (probe.rows as Record<string, boolean | string>[])[0] ?? {};
    userSessions = row.user_sessions === true || row.user_sessions === "t";
    passwordHash = row.password_hash === true || row.password_hash === "t";
  } catch {
    // The probe itself failing is worth knowing, but `select 1` already
    // proved connectivity; report the objects as unknown, not broken.
  }

  const authReady = schemaReady && userSessions && passwordHash;
  return Response.json(
    {
      ok: true,
      db: "ok",
      host,
      schema: authReady
        ? "ok"
        : {
            coreRepair: schemaReady ? "ok" : "retrying",
            userSessionsTable: userSessions,
            passwordHashColumn: passwordHash,
            note: authReady
              ? ""
              : "Auth-critical schema objects are missing — run supabase/full_schema.sql (additive, idempotent) or grant DDL so the app can self-repair.",
          },
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}
