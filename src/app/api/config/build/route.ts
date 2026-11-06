import { NextResponse } from "next/server";
import { currentBuildId } from "@/lib/buildId";

export const dynamic = "force-dynamic";

/**
 * GET /api/config/build — public, non-secret build marker of THIS process.
 *
 * An old browser tab keeps the HTML and chunk URLs of a previous deploy. When
 * those chunks disappear, BuildVersionMonitor compares its initial <meta>
 * marker with the current one and offers a reload. Only the marker is exposed:
 * no environment values, no database access, no user data.
 *
 * Never cached: a cached 200 would describe an older process and defeat the
 * whole old-tab recovery path.
 */
export async function GET() {
  return NextResponse.json(
    { buildId: currentBuildId() },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
