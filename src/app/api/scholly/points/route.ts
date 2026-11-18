import { privateNoStoreJson } from "@/lib/apiResponse";
import { requireProfileAccess } from "@/lib/auth";
import { getSchollyPointsSummary } from "@/lib/scholly-points.server";

export async function GET(req: Request) {
  try {
    const access = await requireProfileAccess(req, new URL(req.url).searchParams.get("profileId"));
    if (!access.ok) return privateNoStoreJson({ code: access.code }, { status: access.status });
    if (access.targetId !== access.session.profile.id) return privateNoStoreJson({ code: "forbidden" }, { status: 403 });
    return privateNoStoreJson(await getSchollyPointsSummary(access.session.profile.id));
  } catch (error) {
    console.error("GET /api/scholly/points error:", error);
    return privateNoStoreJson({ code: "points_unavailable" }, { status: 500 });
  }
}
