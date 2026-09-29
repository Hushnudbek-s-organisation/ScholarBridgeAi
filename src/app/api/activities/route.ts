import { NextResponse } from "next/server";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { activityEvidence, studentActivities, userDocuments } from "@/db/schema";
import { dateOnly, guardStudent, idParam, isoDate, jsonError, oneOf, readBody, serverError, text } from "@/lib/journey/api";

export const dynamic = "force-dynamic";

export const ACTIVITY_CATEGORIES = [
  "volunteering",
  "leadership",
  "competition",
  "project",
  "club",
  "research",
  "work",
  "community",
  "sport",
  "creative",
] as const;

const EVIDENCE_TYPES = ["certificate", "photo", "url", "document"] as const;

/**
 * GET/POST/PATCH/DELETE /api/activities — the Activity Portfolio (spec §14).
 *
 * SPEC §14: "Do not fabricate activities or achievements." Every field here is
 * student-entered, and the AI essay studio reads them as *source material* —
 * it never adds to them. Evidence is optional but encouraged: a certificate or
 * link is what makes a claim checkable.
 */
export async function GET(req: Request) {
  const g = await guardStudent(req, new URL(req.url).searchParams.get("profileId"));
  if (!g.ok) return g.response;
  const { profileId } = g.value;
  try {
    const rows = await db
      .select()
      .from(studentActivities)
      .where(eq(studentActivities.profileId, profileId))
      .orderBy(asc(studentActivities.sortOrder), desc(studentActivities.id));
    const evidence = rows.length
      ? await db
          .select()
          .from(activityEvidence)
          .where(inArray(activityEvidence.activityId, rows.map((r) => r.id)))
      : [];

    return NextResponse.json({
      categories: ACTIVITY_CATEGORIES,
      activities: rows.map((r) => ({
        id: r.id,
        category: r.category,
        title: r.title,
        role: r.role,
        organization: r.organization,
        startDate: r.startDate ? String(r.startDate).slice(0, 10) : null,
        endDate: r.endDate ? String(r.endDate).slice(0, 10) : null,
        hours: r.hours,
        description: r.description,
        achievements: r.achievements,
        evidence: evidence.filter((e) => e.activityId === r.id),
      })),
      summary: {
        total: rows.length,
        totalHours: rows.reduce((s, r) => s + (r.hours ?? 0), 0),
        byCategory: ACTIVITY_CATEGORIES.map((c) => ({ category: c, count: rows.filter((r) => r.category === c).length })),
        withEvidence: rows.filter((r) => evidence.some((e) => e.activityId === r.id)).length,
      },
    });
  } catch (err) {
    return serverError("activities GET", err);
  }
}

export async function POST(req: Request) {
  const b = await readBody(req);
  if (!b.ok) return b.response;
  const g = await guardStudent(req, b.value.profileId, { write: true });
  if (!g.ok) return g.response;
  const { profileId } = g.value;
  const title = text(b.value.title, 200);
  if (!title) return jsonError(400, "title is required", "bad_request");
  try {
    const [row] = await db
      .insert(studentActivities)
      .values({
        profileId,
        category: oneOf(b.value.category, ACTIVITY_CATEGORIES, "project"),
        title,
        role: text(b.value.role, 120),
        organization: text(b.value.organization, 160),
        startDate: isoDate(dateOnly(b.value.startDate)),
        endDate: isoDate(dateOnly(b.value.endDate)),
        hours: numberOrNull(b.value.hours),
        description: text(b.value.description, 4000),
        achievements: text(b.value.achievements, 4000),
      })
      .returning();
    const withEvidence = await attachEvidence(profileId, row.id, b.value.evidence);
    return NextResponse.json({ ok: true, activity: { ...row, evidence: withEvidence } });
  } catch (err) {
    return serverError("activities POST", err);
  }
}

export async function PATCH(req: Request) {
  const b = await readBody(req);
  if (!b.ok) return b.response;
  const g = await guardStudent(req, b.value.profileId, { write: true });
  if (!g.ok) return g.response;
  const { profileId } = g.value;
  const id = Number(b.value.id);
  if (!Number.isInteger(id) || id <= 0) return jsonError(400, "id is required", "bad_request");
  try {
    const [row] = await db
      .select()
      .from(studentActivities)
      .where(and(eq(studentActivities.id, id), eq(studentActivities.profileId, profileId)))
      .limit(1);
    if (!row) return jsonError(404, "Activity not found", "not_found");

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (b.value.category !== undefined) patch.category = oneOf(b.value.category, ACTIVITY_CATEGORIES, row.category);
    if (b.value.title !== undefined) patch.title = text(b.value.title, 200) ?? row.title;
    if (b.value.role !== undefined) patch.role = text(b.value.role, 120);
    if (b.value.organization !== undefined) patch.organization = text(b.value.organization, 160);
    if (b.value.startDate !== undefined) patch.startDate = isoDate(dateOnly(b.value.startDate));
    if (b.value.endDate !== undefined) patch.endDate = isoDate(dateOnly(b.value.endDate));
    if (b.value.hours !== undefined) patch.hours = numberOrNull(b.value.hours);
    if (b.value.description !== undefined) patch.description = text(b.value.description, 4000);
    if (b.value.achievements !== undefined) patch.achievements = text(b.value.achievements, 4000);
    await db.update(studentActivities).set(patch).where(eq(studentActivities.id, id));

    let evidence = null;
    if (b.value.evidence !== undefined) {
      await db.delete(activityEvidence).where(eq(activityEvidence.activityId, id));
      evidence = await attachEvidence(profileId, id, b.value.evidence);
    }
    return NextResponse.json({ ok: true, id, evidence });
  } catch (err) {
    return serverError("activities PATCH", err);
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const g = await guardStudent(req, searchParams.get("profileId"), { write: true });
  if (!g.ok) return g.response;
  const id = idParam(req);
  if (!id) return jsonError(400, "id is required", "bad_request");
  try {
    const deleted = await db
      .delete(studentActivities)
      .where(and(eq(studentActivities.id, id), eq(studentActivities.profileId, g.value.profileId)))
      .returning({ id: studentActivities.id });
    if (!deleted.length) return jsonError(404, "Activity not found", "not_found");
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return serverError("activities DELETE", err);
  }
}

// ---------------------------------------------------------------------------

async function attachEvidence(profileId: number, activityId: number, raw: unknown) {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const rows: { activityId: number; evidenceType: string; label: string; url: string | null; documentId: number | null }[] = [];
  for (const item of raw.slice(0, 12) as Record<string, unknown>[]) {
    const label = text(item?.label, 160);
    if (!label) continue;
    let documentId: number | null = numberOrNull(item?.documentId);
    if (documentId != null) {
      // A document can only be attached if the student actually owns it.
      const [owned] = await db
        .select({ id: userDocuments.id })
        .from(userDocuments)
        .where(and(eq(userDocuments.id, documentId), eq(userDocuments.profileId, profileId)))
        .limit(1);
      if (!owned) documentId = null;
    }
    rows.push({
      activityId,
      evidenceType: oneOf(item?.evidenceType, EVIDENCE_TYPES, "url"),
      label,
      url: text(item?.url, 800),
      documentId,
    });
  }
  if (!rows.length) return [];
  return db.insert(activityEvidence).values(rows).returning();
}

function numberOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}
