import { NextResponse } from "next/server";
import { db } from "@/db";
import { forumReports } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { readJsonBody } from "@/lib/request";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const reportId = parseInt(id, 10);
    // Size-capped parse: even an authenticated community write must never
    // hand an unbounded body to the JSON parser.
    const parsed = await readJsonBody<Record<string, any>>(req, 16 * 1024);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error, code: parsed.code }, { status: parsed.status });
    const body = parsed.body;
    const { status, adminProfileId } = body; // 'resolved' | 'dismissed'

    // Only admins may resolve/dismiss reports.
    const access = await requireAdmin(req);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      );
    }

    if (!["resolved", "dismissed"].includes(status)) {
      return NextResponse.json({ error: "status must be 'resolved' or 'dismissed'" }, { status: 400 });
    }

    const [updated] = await db
      .update(forumReports)
      .set({
        status,
        resolvedAt: new Date(),
      })
      .where(eq(forumReports.id, reportId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
    return NextResponse.json({ report: updated });
  } catch (error) {
    console.error("PATCH /api/forum/reports/[id] error:", error);
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 });
  }
}
