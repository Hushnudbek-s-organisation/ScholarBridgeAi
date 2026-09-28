import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { studentProfiles, successStories } from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import { clampString } from "@/lib/request";
import { STORY_STATUSES } from "@/lib/growth/defaults";
import { bool, guardAdmin, idParam, jsonError, oneOf, readBody, serverError } from "@/lib/growth/api";
import { publicStory, storyValues } from "@/lib/growth/stories";

export const dynamic = "force-dynamic";

/**
 * Admin → Growth tools → Success stories: moderation queue + editor.
 * GET ?status=pending|approved|rejected|all · POST create (published) ·
 * PUT edit / approve / reject / verify / feature · DELETE ?id=
 */
export async function GET(req: Request) {
  const g = await guardAdmin(req);
  if (!g.ok) return g.response;
  try {
    const status = new URL(req.url).searchParams.get("status") || "all";
    const rows = await db
      .select({ story: successStories, authorEmail: studentProfiles.email, authorName: studentProfiles.name })
      .from(successStories)
      .leftJoin(studentProfiles, eq(studentProfiles.id, successStories.profileId))
      .where(status !== "all" && (STORY_STATUSES as readonly string[]).includes(status) ? eq(successStories.status, status) : undefined)
      .orderBy(desc(successStories.createdAt));
    const counts = { pending: 0, approved: 0, rejected: 0 } as Record<string, number>;
    const all = await db.select({ status: successStories.status }).from(successStories);
    for (const r of all) counts[r.status] = (counts[r.status] ?? 0) + 1;
    return NextResponse.json({
      items: rows.map((r) => ({
        ...publicStory(r.story),
        status: r.story.status,
        adminNote: r.story.adminNote,
        profileId: r.story.profileId,
        authorEmail: r.authorEmail,
        authorName: r.authorName,
      })),
      counts,
    });
  } catch (err) {
    return serverError("admin stories GET", err);
  }
}

export async function POST(req: Request) {
  const g = await guardAdmin(req, { write: true });
  if (!g.ok) return g.response;
  const b = await readBody(req);
  if (!b.ok) return b.response;
  try {
    const values = storyValues(b.value);
    if (!values.admittedUniversity) return jsonError(400, "University is required", "validation");
    const [row] = await db
      .insert(successStories)
      .values({
        ...values,
        status: oneOf(b.value.status, STORY_STATUSES, "approved"),
        isVerified: bool(b.value.isVerified),
        isFeatured: bool(b.value.isFeatured),
        adminNote: clampString(b.value.adminNote, 500) || null,
      })
      .returning({ id: successStories.id });
    await writeAudit({ entityType: "success_story", entityId: row.id, fieldChanged: "created", newValue: values.admittedUniversity, actor: "ADMIN", source: "admin" });
    return NextResponse.json({ id: row.id }, { status: 201 });
  } catch (err) {
    return serverError("admin stories POST", err);
  }
}

export async function PUT(req: Request) {
  const g = await guardAdmin(req, { write: true });
  if (!g.ok) return g.response;
  const b = await readBody(req);
  if (!b.ok) return b.response;
  const id = Number(b.value.id);
  if (!Number.isInteger(id) || id <= 0) return jsonError(400, "id is required", "bad_request");
  try {
    const [existing] = await db.select().from(successStories).where(eq(successStories.id, id)).limit(1);
    if (!existing) return jsonError(404, "Not found", "not_found");
    // Quick moderation actions send only the flags; a full edit sends the form.
    const patch: Partial<typeof successStories.$inferInsert> = { updatedAt: new Date() };
    if (b.value.admittedUniversity !== undefined) {
      const values = storyValues(b.value);
      if (!values.admittedUniversity) return jsonError(400, "University is required", "validation");
      Object.assign(patch, values);
    }
    if (b.value.status !== undefined) patch.status = oneOf(b.value.status, STORY_STATUSES, existing.status as (typeof STORY_STATUSES)[number]);
    if (b.value.isVerified !== undefined) patch.isVerified = bool(b.value.isVerified);
    if (b.value.isFeatured !== undefined) patch.isFeatured = bool(b.value.isFeatured);
    if (b.value.adminNote !== undefined) patch.adminNote = clampString(b.value.adminNote, 500) || null;
    await db.update(successStories).set(patch).where(eq(successStories.id, id));
    const changed = Object.keys(patch).filter((k) => k !== "updatedAt");
    await writeAudit({
      entityType: "success_story",
      entityId: id,
      fieldChanged: changed.length === 1 ? changed[0] : "updated",
      oldValue: changed.includes("status") ? existing.status : undefined,
      newValue: changed.includes("status") ? patch.status : changed.join(", "),
      actor: "ADMIN",
      source: "admin",
    });
    return NextResponse.json({ id });
  } catch (err) {
    return serverError("admin stories PUT", err);
  }
}

export async function DELETE(req: Request) {
  const g = await guardAdmin(req, { write: true });
  if (!g.ok) return g.response;
  const id = idParam(req);
  if (!id) return jsonError(400, "id is required", "bad_request");
  try {
    const [row] = await db.delete(successStories).where(eq(successStories.id, id)).returning();
    if (!row) return jsonError(404, "Not found", "not_found");
    await writeAudit({ entityType: "success_story", entityId: id, fieldChanged: "deleted", oldValue: row.admittedUniversity, actor: "ADMIN", source: "admin" });
    return NextResponse.json({ deleted: id });
  } catch (err) {
    return serverError("admin stories DELETE", err);
  }
}
