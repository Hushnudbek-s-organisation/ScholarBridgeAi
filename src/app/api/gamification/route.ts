import { NextResponse } from "next/server";
import { requireProfileAccess } from "@/lib/auth";
import { getGamification } from "@/lib/gamification";
import { db } from "@/db";
import { schollyProfiles } from "@/db/schema";
import { isSupportedTimeZone } from "@/lib/scholly-profile";
import { eq } from "drizzle-orm";
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const profileIdStr = searchParams.get("profileId");
    if (!profileIdStr) {
      return NextResponse.json({ error: "profileId is required" }, { status: 400 });
    }
    const profileId = parseInt(profileIdStr, 10);
    const access = await requireProfileAccess(req, profileId);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      );
    }
    // Once Scholly settings exist, the saved zone fixes the reward day.
    // Before setup, legacy clients can still request a local streak preview.
    const [preferences] = await db.select({ timeZone: schollyProfiles.tz })
      .from(schollyProfiles).where(eq(schollyProfiles.userId, profileId)).limit(1);
    const requestedTimeZone = searchParams.get("timeZone");
    const fallback = isSupportedTimeZone(requestedTimeZone) ? requestedTimeZone : "Asia/Tashkent";
    const snapshot = await getGamification(profileId, preferences?.timeZone ?? fallback, 4);
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("GET /api/gamification error:", error);
    return NextResponse.json({ error: "Failed to fetch gamification" }, { status: 500 });
  }
}
