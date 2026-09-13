import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { getAnalyticsOverview, normalizeDays } from "@/lib/analytics";

/**
 * Admin analytics endpoint (server-side only).
 *
 * Protected by the same is_admin check used by every admin API in the app.
 * All metrics are computed with the server-side Drizzle pool — the database
 * connection is never exposed to the client and nothing is written here.
 *
 * Query params:
 *   adminProfileId  (required) — the signed-in admin's profile id
 *   days            7 | 30 | 90 (default 30) — the reporting window
 *   fresh           1 — bypass the ~45s cache (the dashboard Refresh button)
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const adminProfileId = searchParams.get("adminProfileId");

    if (!(await isAdmin(adminProfileId))) {
      return NextResponse.json({ error: "Forbidden: admin access required" }, { status: 403 });
    }

    const days = normalizeDays(searchParams.get("days"));
    const fresh = searchParams.get("fresh") === "1" || searchParams.get("fresh") === "true";

    const overview = await getAnalyticsOverview({ days, fresh });
    return NextResponse.json(overview);
  } catch (error) {
    console.error("GET /api/admin/analytics error:", error);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
