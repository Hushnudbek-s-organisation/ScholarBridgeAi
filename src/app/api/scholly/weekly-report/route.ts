import { db } from "@/db";
import { privateNoStoreJson } from "@/lib/apiResponse";
import { requireProfileAccess } from "@/lib/auth";
import { schollyTimeZone } from "@/lib/scholly-mission-store.server";
import { formatWeeklyReport, weeklyReportQuery, type SchollyWeeklyReportRow } from "@/lib/scholly-weekly-report";

export async function GET(req: Request) {
  try {
    const access = await requireProfileAccess(req, new URL(req.url).searchParams.get("profileId"));
    if (!access.ok) return privateNoStoreJson({ error: access.error, code: access.code }, { status: access.status });
    if (access.targetId == null) return privateNoStoreJson({ error: "Profile not found" }, { status: 404 });

    const timeZone = await schollyTimeZone(access.targetId);
    const { rows } = await db.execute<SchollyWeeklyReportRow>(weeklyReportQuery(access.targetId, timeZone, new Date()));
    const [row] = rows;
    if (!row) return privateNoStoreJson({ error: "Profile not found" }, { status: 404 });
    return privateNoStoreJson(formatWeeklyReport(row));
  } catch (error) {
    console.error("GET /api/scholly/weekly-report error:", error);
    return privateNoStoreJson({ error: "Weekly Scholly report is unavailable" }, { status: 500 });
  }
}
