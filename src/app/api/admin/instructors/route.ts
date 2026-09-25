import { NextResponse } from "next/server";
import { db } from "@/db";
import { instructors, courseCategories } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
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

/** POST: create instructor or category (based on `type`). */
export async function POST(req: Request) {
  try {
    const body = await req.json();
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
          name: body.name || "New Instructor",
          bio: body.bio || "",
          photoUrl: body.photoUrl || null,
          university: body.university || null,
          program: body.program || null,
          country: body.country || null,
          scholarshipName: body.scholarshipName || null,
          isVerifiedStudent: !!body.isVerifiedStudent,
        })
        .returning();
      return NextResponse.json({ instructor: row });
    }

    if (body.type === "category") {
      const slug = (body.slug || (body.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-")).replace(/^-|-$/g, "");
      const [row] = await db
        .insert(courseCategories)
        .values({
          name: body.name || "New Category",
          slug: slug || `cat-${Date.now()}`,
          description: body.description || "",
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
