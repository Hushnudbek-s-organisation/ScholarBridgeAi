import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/gamification";

export const dynamic = "force-dynamic";
const CACHE_MS = 60_000;
let cached: { expiresAt: number; leaderboard: Awaited<ReturnType<typeof getLeaderboard>> } | null = null;

export async function GET() {
  try {
    const now = Date.now();
    if (!cached || cached.expiresAt <= now) {
      cached = { expiresAt: now + CACHE_MS, leaderboard: await getLeaderboard(20) };
    }
    return NextResponse.json(
      { leaderboard: cached.leaderboard },
      { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=30" } },
    );
  } catch (error) {
    console.error("GET /api/gamification/leaderboard error:", error);
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }
}
