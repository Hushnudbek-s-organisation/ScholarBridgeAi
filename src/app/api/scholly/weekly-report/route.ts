import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { schollyEvents, studentProfiles } from "@/db/schema";
import { privateNoStoreJson } from "@/lib/apiResponse";
import { requireProfileAccess } from "@/lib/auth";
import { currentSchollyDay, schollyTimeZone } from "@/lib/scholly-mission-store.server";
import { logSchollyEvent } from "@/lib/scholly-events";
import { readJsonBody } from "@/lib/request";
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

export async function POST(req: Request) {
  try {
    const parsed = await readJsonBody<Record<string, unknown>>(req, 2048);
    if (!parsed.ok) return privateNoStoreJson({ code: parsed.code }, { status: parsed.status });
    const access = await requireProfileAccess(req, parsed.body.profileId);
    if (!access.ok) return privateNoStoreJson({ code: access.code }, { status: access.status });
    const profileId = access.session.profile.id;
    if (access.targetId !== profileId) return privateNoStoreJson({ code: "forbidden" }, { status: 403 });
    const endedOn = parsed.body.endedOn;
    if (typeof endedOn !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(endedOn)) {
      return privateNoStoreJson({ code: "invalid_weekly_report" }, { status: 400 });
    }
    return await db.transaction(async tx => {
      const [profile] = await tx.select({ id: studentProfiles.id }).from(studentProfiles)
        .where(eq(studentProfiles.id, profileId)).for("no key update").limit(1);
      if (!profile) return privateNoStoreJson({ code: "profile_not_found" }, { status: 404 });
      const now = new Date();
      const { day, timeZone } = await currentSchollyDay(profileId, now, tx);
      const { rows: [report] } = await tx.execute<SchollyWeeklyReportRow>(weeklyReportQuery(profileId, timeZone, now));
      if (!report?.has_report || report.ended_on !== endedOn) {
        return privateNoStoreJson({ code: "weekly_report_changed" }, { status: 409 });
      }
      const [prior] = await tx.select({ id: schollyEvents.id }).from(schollyEvents).where(and(
        eq(schollyEvents.userId, profileId), eq(schollyEvents.type, "weekly_report_reviewed"),
        sql`${schollyEvents.payload}->>'day' = ${day}`,
      )).limit(1);
      if (!prior) await logSchollyEvent(profileId, "weekly_report_reviewed", { day, endedOn }, tx);
      return privateNoStoreJson({ reviewed: true, day });
    });
  } catch (error) {
    console.error("POST /api/scholly/weekly-report error:", error);
    return privateNoStoreJson({ code: "weekly_report_unavailable" }, { status: 500 });
  }
}
