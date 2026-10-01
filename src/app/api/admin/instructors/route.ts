import { NextResponse } from "next/server";
import { db } from "@/db";
import { instructors, courseCategories } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { clampString, readJsonBody } from "@/lib/request";
import { eq, asc } from "drizzle-orm";

/** GET: list instructors and categories (admin). */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const access = await requireAdmin(req);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      );
    }
    const instructorRows = await db.select().from(instructors).orderBy(asc(instructors.sortOrder));
    const categoryRows = await db.select().from(courseCategories).orderBy(asc(courseCategories.sortOrder));
    return NextResponse.json({ instructors: instructorRows, categories: categoryRows });
  } catch (error) {
    console.error("GET /api/admin/instructors error:", error);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

const BODY_LIMIT = 16 * 1024;

/** POST: create instructor or category (based on `type`). */
export async function POST(req: Request) {
  try {
    const parsed = await readJsonBody<Record<string, unknown>>(req, BODY_LIMIT);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error, code: parsed.code }, { status: parsed.status });
    }
    const body = parsed.body;
    const access = await requireAdmin(req);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      );
    }

    if (body.type === "instructor") {
      const [row] = await db
        .insert(instructors)
        .values({
          name: clampString(body.name, 200) || "New Instructor",
          bio: clampString(body.bio, 2000),
          photoUrl: clampString(body.photoUrl, 500) || null,
          university: clampString(body.university, 200) || null,
          program: clampString(body.program, 200) || null,
          country: clampString(body.country, 100) || null,
          scholarshipName: clampString(body.scholarshipName, 200) || null,
          isVerifiedStudent: !!body.isVerifiedStudent,
        })
        .returning();
      return NextResponse.json({ instructor: row });
    }

    if (body.type === "category") {
      const name = clampString(body.name, 100);
      const slug = (clampString(body.slug, 60) || name.toLowerCase().replace(/[^a-z0-9]+/g, "-")).replace(/^-|-$/g, "");
      const [row] = await db
        .insert(courseCategories)
        .values({
          name: name || "New Category",
          slug: slug || `cat-${Date.now()}`,
          description: clampString(body.description, 500),
        })
        .returning();
      return NextResponse.json({ category: row });
    }

    return NextResponse.json({ error: "type must be 'instructor' or 'category'" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/admin/instructors error:", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}

/** DELETE: remove an instructor or category. */
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const access = await requireAdmin(req);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      );
    }
    const type = searchParams.get("type");
    const id = Number(searchParams.get("id"));
    if (!id || !["instructor", "category"].includes(type || "")) {
      return NextResponse.json({ error: "type and id are required" }, { status: 400 });
    }
    if (type === "instructor") {
      await db.delete(instructors).where(eq(instructors.id, id));
    } else {
      await db.delete(courseCategories).where(eq(courseCategories.id, id));
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/instructors error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
