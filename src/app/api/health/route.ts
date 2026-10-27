import { db } from "@/db";
import { sql } from "drizzle-orm";
import { hasExplicitSessionSecret } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Which commit is actually serving? Render and Vercel both export the deployed
 * SHA to the runtime, so this answers "did my deploy land?" without a shell.
 * A short SHA of a public repository leaks nothing.
 */
function deployedCommit(): string | null {
  const raw =
    process.env.RENDER_GIT_COMMIT ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GIT_COMMIT ||
    process.env.SOURCE_VERSION ||
    "";
  const sha = raw.trim();
  return /^[0-9a-f]{7,40}$/i.test(sha) ? sha.slice(0, 7) : null;
}

/** Minimal liveness/readiness probe for Render and uptime monitors. */
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    if (process.env.NODE_ENV === "production" && !hasExplicitSessionSecret()) {
      return Response.json({ ok: false, commit: deployedCommit() }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    return Response.json({ ok: true, commit: deployedCommit() }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch {
    // Do not disclose database hostnames, driver codes, or schema details on
    // an unauthenticated endpoint. Detailed diagnostics belong in server logs.
    return Response.json({ ok: false, commit: deployedCommit() }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
