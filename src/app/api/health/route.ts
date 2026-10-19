import { db } from "@/db";
import { sql } from "drizzle-orm";
import { hasExplicitSessionSecret } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Minimal liveness/readiness probe for Render and uptime monitors. */
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    if (process.env.NODE_ENV === "production" && !hasExplicitSessionSecret()) {
      return Response.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    return Response.json({ ok: true }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch {
    // Do not disclose database hostnames, driver codes, or schema details on
    // an unauthenticated endpoint. Detailed diagnostics belong in server logs.
    return Response.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
