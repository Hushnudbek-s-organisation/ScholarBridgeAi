import { NextResponse } from "next/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { goalTemplates, studentGoals } from "@/db/schema";
import { clampString } from "@/lib/request";
import { GOAL_PILLARS, MAX_ACTIVE_GOALS } from "@/lib/growth/defaults";
import { guardStudent, idParam, jsonError, oneOf, readBody, serverError } from "@/lib/growth/api";
import { goalProgress, parseSteps } from "@/lib/growth/logic";

export const dynamic = "force-dynamic";

/**
 * Goal planner (idea from Crimson Rise's "outcomes", adapted): a student
 * picks at most 6 active goals across four pillars — Academic, Activities,
 * Skills, Career — from an admin-curated library (or writes their own), then
 * ticks off concrete steps. Focus beats a list of 20 vague intentions.
 */
function shape(r: typeof studentGoals.$inferSelect) {
  const steps = parseSteps(r.steps);
  return { ...r, steps, progress: goalProgress(steps) };
}

export async function GET(req: Request) {
  const g = await guardStudent(req, new URL(req.url).searchParams.get("profileId"));
  if (!g.ok) return g.response;
  try {
    const [templates, goals] = await Promise.all([
      db.select().from(goalTemplates).where(eq(goalTemplates.isActive, true)).orderBy(asc(goalTemplates.sortOrder), asc(goalTemplates.id)),
      db.select().from(studentGoals).where(eq(studentGoals.profileId, g.value.profileId)).orderBy(desc(studentGoals.createdAt)),
    ]);
    return NextResponse.json({
      templates: templates.map((t) => ({ ...t, steps: parseSteps(t.steps).map((s) => s.text) })),
      goals: goals.map(shape),
      maxActive: MAX_ACTIVE_GOALS,
    });
  } catch (err) {
    return serverError("goals GET", err);
  }
}

/** POST { profileId, templateId } or { profileId, title, pillar, steps[] } */
export async function POST(req: Request) {
  const b = await readBody(req);
  if (!b.ok) return b.response;
  const g = await guardStudent(req, b.value.profileId, { write: true });
  if (!g.ok) return g.response;
  const { profileId } = g.value;
  try {
    const active = await db
      .select({ id: studentGoals.id })
      .from(studentGoals)
      .where(and(eq(studentGoals.profileId, profileId), eq(studentGoals.status, "active")));
    if (active.length >= MAX_ACTIVE_GOALS) {
      return jsonError(409, `You already have ${MAX_ACTIVE_GOALS} active goals. Finish or remove one first.`, "limit");
    }
    let values: typeof studentGoals.$inferInsert;
    const templateId = Number(b.value.templateId);
    if (Number.isInteger(templateId) && templateId > 0) {
      const [t] = await db.select().from(goalTemplates).where(eq(goalTemplates.id, templateId)).limit(1);
      if (!t || !t.isActive) return jsonError(404, "Goal template not found", "not_found");
      const dup = await db
        .select({ id: studentGoals.id })
        .from(studentGoals)
        .where(and(eq(studentGoals.profileId, profileId), eq(studentGoals.templateId, templateId), eq(studentGoals.status, "active")));
      if (dup.length) return jsonError(409, "This goal is already on your list.", "duplicate");
      values = {
        profileId,
        templateId,
        pillar: t.pillar,
        title: t.title,
        steps: JSON.stringify(parseSteps(t.steps)),
      };
    } else {
      const title = clampString(b.value.title, 120);
      if (!title) return jsonError(400, "Please give your goal a title.", "validation");
      values = {
        profileId,
        pillar: oneOf(b.value.pillar, GOAL_PILLARS, "academic"),
        title,
        steps: JSON.stringify(parseSteps(b.value.steps)),
      };
    }
    const [row] = await db.insert(studentGoals).values(values).returning();
    return NextResponse.json({ goal: shape(row) }, { status: 201 });
  } catch (err) {
    return serverError("goals POST", err);
  }
}

/** PUT { id, steps?, status?, title?, targetDate? } — owner (or admin) only. */
export async function PUT(req: Request) {
  const b = await readBody(req);
  if (!b.ok) return b.response;
  const id = Number(b.value.id);
  if (!Number.isInteger(id) || id <= 0) return jsonError(400, "id is required", "bad_request");
  try {
    const [row] = await db.select().from(studentGoals).where(eq(studentGoals.id, id)).limit(1);
    if (!row) return jsonError(404, "Goal not found", "not_found");
    const g = await guardStudent(req, row.profileId, { write: true });
    if (!g.ok) return g.response;
    const patch: Partial<typeof studentGoals.$inferInsert> = { updatedAt: new Date() };
    if (b.value.steps !== undefined) {
      const steps = parseSteps(b.value.steps);
      patch.steps = JSON.stringify(steps);
      // Ticking the last step completes the goal automatically.
      if (steps.length && steps.every((s) => s.done) && b.value.status === undefined) patch.status = "done";
      else if (row.status === "done" && steps.some((s) => !s.done) && b.value.status === undefined) patch.status = "active";
    }
    if (b.value.status !== undefined) patch.status = oneOf(b.value.status, ["active", "done"] as const, "active");
    if (b.value.title !== undefined) {
      const title = clampString(b.value.title, 120);
      if (title) patch.title = title;
    }
    if (b.value.targetDate !== undefined) {
      const d = typeof b.value.targetDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.value.targetDate) ? b.value.targetDate : null;
      patch.targetDate = d;
    }
    // Re-activating must respect the focus limit too.
    if (patch.status === "active" && row.status !== "active") {
      const active = await db
        .select({ id: studentGoals.id })
        .from(studentGoals)
        .where(and(eq(studentGoals.profileId, row.profileId), eq(studentGoals.status, "active")));
      if (active.length >= MAX_ACTIVE_GOALS) return jsonError(409, `You already have ${MAX_ACTIVE_GOALS} active goals.`, "limit");
    }
    const [updated] = await db.update(studentGoals).set(patch).where(eq(studentGoals.id, id)).returning();
    return NextResponse.json({ goal: shape(updated) });
  } catch (err) {
    return serverError("goals PUT", err);
  }
}

export async function DELETE(req: Request) {
  const id = idParam(req);
  if (!id) return jsonError(400, "id is required", "bad_request");
  try {
    const [row] = await db.select().from(studentGoals).where(eq(studentGoals.id, id)).limit(1);
    if (!row) return jsonError(404, "Goal not found", "not_found");
    const g = await guardStudent(req, row.profileId, { write: true });
    if (!g.ok) return g.response;
    await db.delete(studentGoals).where(eq(studentGoals.id, id));
    return NextResponse.json({ deleted: id });
  } catch (err) {
    return serverError("goals DELETE", err);
  }
}
