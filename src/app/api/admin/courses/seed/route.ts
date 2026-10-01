import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/db";
import { courses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { seedCourses } from "@/db/seed";

/**
 * POST /api/admin/courses/seed
 *
 * Explicitly (re)seed the demo course on a fresh database. The catalogue
 * GET no longer seeds on every request (audit A19): a brand-new deployment
 * still self-bootstraps once per process, and this endpoint is the
 * operator-facing way to guarantee the demo course exists.
 */
export async function POST(req: Request) {
  try {
    const access = await requireAdmin(req);
    if (!access.ok) {
      return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
    }

    await seedCourses();
    const rows = await db.select({ id: courses.id }).from(courses).where(eq(courses.isPublished, true));
    return NextResponse.json({ seeded: true, publishedCourses: rows.length });
  } catch (error) {
    console.error("POST /api/admin/courses/seed error:", error);
    return NextResponse.json({ error: "Failed to seed courses" }, { status: 500 });
  }
}
