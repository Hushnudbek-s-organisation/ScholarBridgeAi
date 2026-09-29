import { NextResponse } from "next/server";
import { db } from "@/db";
import { forumReports, studentProfiles } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAdmin, requireProfileAccess } from "@/lib/auth";
import { premiumGate } from "@/lib/premium";
import { LIMITS, checkRateLimit, rateLimitedResponse } from "@/lib/rate-limit";
import { notifyAdminsLocalized } from "@/lib/notifications";
import { NOTIFY_TEXTS } from "@/lib/notificationTexts";
import { readJsonBody } from "@/lib/request";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "open";
    const adminProfileId = searchParams.get("adminProfileId");

    // Reports are sensitive — only admins may list them.
    const access = await requireAdmin(req);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      );
    }

    const rows = await db
      .select({
        id: forumReports.id,
        reporterId: forumReports.reporterId,
        targetType: forumReports.targetType,
        targetId: forumReports.targetId,
        reason: forumReports.reason,
        status: forumReports.status,
        createdAt: forumReports.createdAt,
        resolvedAt: forumReports.resolvedAt,
        reporterName: studentProfiles.name,
      })
      .from(forumReports)
      .leftJoin(studentProfiles, eq(forumReports.reporterId, studentProfiles.id))
      .where(eq(forumReports.status, status))
      .orderBy(desc(forumReports.createdAt));

    return NextResponse.json({ reports: rows });
  } catch (error) {
    console.error("GET /api/forum/reports error:", error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // Size-capped parse: even an authenticated community write must never
    // hand an unbounded body to the JSON parser.
    const parsed = await readJsonBody<Record<string, any>>(req, 16 * 1024);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error, code: parsed.code }, { status: parsed.status });
    const body = parsed.body;
    const { reporterId, targetType, targetId, reason } = body;

    if (!reporterId || !targetType || !targetId || !reason) {
      return NextResponse.json({ error: "reporterId, targetType, targetId and reason are required" }, { status: 400 });
    }

    // The reporter must be the signed-in caller; reporting is throttled so it
    // cannot be used to spam/DoS the moderation queue.
    const access = await requireProfileAccess(req, reporterId);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      );
    }
    const locked = await premiumGate(access.session.profile.id, "forum_write");
    if (locked) return locked;
    const writeLimit = checkRateLimit(`forum:${access.session.profile.id}`, LIMITS.forumWrite);
    if (!writeLimit.ok) return rateLimitedResponse(writeLimit.retryAfterSec);

    const [report] = await db
      .insert(forumReports)
      .values({
        reporterId: Number(reporterId),
        targetType,
        targetId: Number(targetId),
        reason,
        status: "open",
      })
      .returning();

    // Notify every admin about the new report so it shows up in their
    // notification bell immediately (spec §20).
    try {
      await notifyAdminsLocalized({
        type: "forum_report",
        link: `/forum?reports=open`,
        text: (lang) => NOTIFY_TEXTS.adminForumReport(lang, { isThread: targetType === "thread", id: targetId, reason: String(reason) }),
      });
    } catch (err) {
      console.error("Failed to notify admins about report:", err);
    }

    return NextResponse.json({ report });
  } catch (error) {
    console.error("POST /api/forum/reports error:", error);
    return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
  }
}
