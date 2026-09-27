import { NextResponse } from "next/server";
import { requireProfileAccess, requireRowAccess } from "@/lib/auth";
import { db } from "@/db";
import { applicationTasks, universities } from "@/db/schema";
import { eq } from "drizzle-orm";
import { premiumGate } from "@/lib/premium";
import { clampString, positiveInt, readJsonBody } from "@/lib/request";

/**
 * Application tasks — the "Tasks & Roadmap" section, a Premium feature
 * (`roadmap`). Every method checks ownership AND the plan server-side: the
 * website's PremiumGate only decides what to render.
 */

const BODY_LIMIT = 16 * 1024;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function authError(access: { error: string; code: string; status: number }) {
  return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
}

/** A calendar date (YYYY-MM-DD) or undefined when not supplied; null when invalid. */
function parseDueDate(value: unknown): string | undefined | null {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !DATE_RE.test(value) || Number.isNaN(Date.parse(value))) return null;
  return value;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const profileId = positiveInt(searchParams.get("profileId"));
    if (!profileId) {
      return NextResponse.json({ error: "profileId is required" }, { status: 400 });
    }

    const access = await requireProfileAccess(req, profileId);
    if (!access.ok) return authError(access);
    const locked = await premiumGate(access.session.profile.id, "roadmap");
    if (locked) return locked;

    const tasks = await db
      .select({
        id: applicationTasks.id,
        profileId: applicationTasks.profileId,
        universityId: applicationTasks.universityId,
        title: applicationTasks.title,
        category: applicationTasks.category,
        dueDate: applicationTasks.dueDate,
        isCompleted: applicationTasks.isCompleted,
        priority: applicationTasks.priority,
        createdAt: applicationTasks.createdAt,
        universityName: universities.name,
      })
      .from(applicationTasks)
      .leftJoin(universities, eq(applicationTasks.universityId, universities.id))
      .where(eq(applicationTasks.profileId, profileId));

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("GET /api/tasks error:", error);
    return NextResponse.json({ error: "Failed to fetch application tasks" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const parsed = await readJsonBody<Record<string, unknown>>(req, BODY_LIMIT);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error, code: parsed.code }, { status: parsed.status });
    const body = parsed.body;

    const profileId = positiveInt(body.profileId);
    if (!profileId) {
      return NextResponse.json({ error: "profileId and title are required" }, { status: 400 });
    }
    const access = await requireProfileAccess(req, profileId);
    if (!access.ok) return authError(access);
    const locked = await premiumGate(access.session.profile.id, "roadmap");
    if (locked) return locked;

    const title = clampString(body.title, 300).trim();
    if (!title) {
      return NextResponse.json({ error: "profileId and title are required" }, { status: 400 });
    }
    const dueDate = parseDueDate(body.dueDate || undefined);
    if (dueDate === null) {
      return NextResponse.json({ error: "dueDate must be a YYYY-MM-DD date" }, { status: 400 });
    }

    const [newTask] = await db.insert(applicationTasks).values({
      profileId,
      universityId: positiveInt(body.universityId),
      title,
      category: clampString(body.category, 80).trim() || "Document Prep",
      dueDate: dueDate ?? new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
      isCompleted: false,
      priority: clampString(body.priority, 40).trim() || "Medium",
    }).returning();

    return NextResponse.json({ task: newTask });
  } catch (error) {
    console.error("POST /api/tasks error:", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}

/** Load the owner of a task so the caller can be checked against it. */
async function findTaskOwner(id: number) {
  const [row] = await db
    .select({ id: applicationTasks.id, profileId: applicationTasks.profileId })
    .from(applicationTasks)
    .where(eq(applicationTasks.id, id))
    .limit(1);
  return row ?? null;
}

export async function PATCH(req: Request) {
  try {
    const parsed = await readJsonBody<Record<string, unknown>>(req, BODY_LIMIT);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error, code: parsed.code }, { status: parsed.status });
    const body = parsed.body;

    const id = positiveInt(body.id);
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // Task ids are sequential — acting on one by id alone would let any
    // visitor edit or delete another student's roadmap.
    const access = await requireRowAccess(req, await findTaskOwner(id));
    if (!access.ok) return authError(access);
    const locked = await premiumGate(access.session.profile.id, "roadmap");
    if (locked) return locked;

    const patch: Partial<typeof applicationTasks.$inferInsert> = {};
    if (body.isCompleted !== undefined) {
      if (typeof body.isCompleted !== "boolean") {
        return NextResponse.json({ error: "isCompleted must be true or false" }, { status: 400 });
      }
      patch.isCompleted = body.isCompleted;
    }
    if (body.title !== undefined) {
      const title = clampString(body.title, 300).trim();
      if (!title) return NextResponse.json({ error: "title cannot be empty" }, { status: 400 });
      patch.title = title;
    }
    if (body.dueDate !== undefined) {
      const dueDate = parseDueDate(body.dueDate);
      if (!dueDate) return NextResponse.json({ error: "dueDate must be a YYYY-MM-DD date" }, { status: 400 });
      patch.dueDate = dueDate;
    }
    if (body.priority !== undefined) patch.priority = clampString(body.priority, 40).trim() || "Medium";
    if (body.category !== undefined) patch.category = clampString(body.category, 80).trim() || "Document Prep";
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const [updated] = await db
      .update(applicationTasks)
      .set(patch)
      .where(eq(applicationTasks.id, id))
      .returning();

    return NextResponse.json({ task: updated });
  } catch (error) {
    console.error("PATCH /api/tasks error:", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = positiveInt(searchParams.get("id"));
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const access = await requireRowAccess(req, await findTaskOwner(id));
    if (!access.ok) return authError(access);
    const locked = await premiumGate(access.session.profile.id, "roadmap");
    if (locked) return locked;

    await db.delete(applicationTasks).where(eq(applicationTasks.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/tasks error:", error);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
