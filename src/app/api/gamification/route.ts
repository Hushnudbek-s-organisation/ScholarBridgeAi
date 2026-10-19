import { NextResponse } from "next/server";
import { requireProfileAccess } from "@/lib/auth";
import { getGamification } from "@/lib/gamification";
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
    // Use the caller's calendar zone for streak day boundaries. The pure
    // streak helper safely falls back to UTC for invalid timezone identifiers.
    const timeZone = (searchParams.get("timeZone") ?? "UTC").slice(0, 100);
    const snapshot = await getGamification(profileId, timeZone);
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("GET /api/gamification error:", error);
    return NextResponse.json({ error: "Failed to fetch gamification" }, { status: 500 });
  }
}
