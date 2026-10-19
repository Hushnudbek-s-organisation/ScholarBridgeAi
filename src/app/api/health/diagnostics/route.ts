import { db } from "@/db";
import { sql } from "drizzle-orm";
import { dbFailureCode } from "@/lib/dbError";
import { hasExplicitSessionSecret, requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

function hintFor(code: string): string {
  switch (code) {
    case "ENOTFOUND":
    case "EAI_AGAIN":
      return "Database hostname did not resolve; verify DATABASE_URL and the provider project status.";
    case "ECONNREFUSED":
      return "The database refused the connection; verify host, port, and pooler status.";
    case "ETIMEDOUT":
      return "Connection timed out; verify network reachability and use the provider's supported pooler URI.";
    case "28P01":
    case "28000":
      return "Postgres rejected the credentials; verify the current database password and connection URI.";
    case "3D000":
      return "The database named in DATABASE_URL does not exist.";
    default:
      return "Check the database connection, credentials, provider status, and application logs.";
  }
}

/** Detailed database diagnostics are available only to operators with CRON_SECRET. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const authorization = req.headers.get("authorization") ?? "";
  const cronAuthorized = Boolean(secret && authorization === `Bearer ${secret}`);
  if (!cronAuthorized) {
    const admin = await requireAdmin(req);
    if (!admin.ok) {
      return Response.json({ error: "Not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
    }
  }

  let code = "";
  try {
    await db.execute(sql`select 1`);
  } catch (error) {
    code = dbFailureCode(error) || "unclassified";
    return Response.json(
      { ok: false, db: "unreachable", code, hint: hintFor(code), sessionSecretConfigured: hasExplicitSessionSecret() },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const result = await db.execute(sql`
      SELECT (to_regclass('user_sessions') IS NOT NULL) AS user_sessions,
             EXISTS (
               SELECT 1 FROM information_schema.columns
               WHERE table_schema = current_schema()
                 AND table_name = 'student_profiles'
                 AND column_name = 'password_hash'
             ) AS password_hash
    `);
    const row = (result.rows as Record<string, boolean | string>[])[0] ?? {};
    const userSessions = row.user_sessions === true || row.user_sessions === "t";
    const passwordHash = row.password_hash === true || row.password_hash === "t";
    return Response.json(
      {
        ok: true,
        db: "ok",
        sessionSecretConfigured: hasExplicitSessionSecret(),
        schema: { userSessionsTable: userSessions, passwordHashColumn: passwordHash },
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { ok: true, db: "ok", sessionSecretConfigured: hasExplicitSessionSecret(), schema: "unknown" },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }
}
