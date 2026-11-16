import { privateNoStoreJson } from "@/lib/apiResponse";
import { requireProfileAccess } from "@/lib/auth";
import { loadSchollyStreak } from "@/lib/scholly-streak.server";

export async function GET(req: Request) {
  try {
    const access = await requireProfileAccess(req, new URL(req.url).searchParams.get("profileId"));
    if (!access.ok) return privateNoStoreJson({ error: access.error, code: access.code }, { status: access.status });
    if (access.targetId == null) return privateNoStoreJson({ error: "Profile not found" }, { status: 404 });
    const streak = await loadSchollyStreak(access.targetId);
    return privateNoStoreJson({ streak });
  } catch (error) {
    console.error("GET /api/scholly/streak error:", error);
    return privateNoStoreJson({ error: "Scholly streak is unavailable" }, { status: 500 });
  }
}
