import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, recommendationRequests } from "@/db/schema";
import { dateOnly, guardStudent, idParam, isoDate, jsonError, oneOf, readBody, serverError, text } from "@/lib/journey/api";

export const dynamic = "force-dynamic";

const STATUSES = ["not_requested", "requested", "opened", "submitted"] as const;
const TYPES = ["academic", "professional", "personal", "research"] as const;

/**
 * GET/POST/PATCH/DELETE /api/recommendations — the Recommendation Manager
 * (spec §19).
 *
 * SPEC §19: "Recommendation content must remain private when appropriate." The
 * student's own draft instructions never leave this route, and the rows are
 * filtered on `profile_id` so no other student can read them.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const g = await guardStudent(req, searchParams.get("profileId"));
  if (!g.ok) return g.response;
  const { profileId } = g.value;
  try {
    const rows = await db
      .select()
      .from(recommendationRequests)
      .where(eq(recommendationRequests.profileId, profileId))
      .orderBy(asc(recommendationRequests.dueDate), asc(recommendationRequests.id));

    const appIds = [...new Set(rows.map((r) => r.applicationId))];
    const apps = appIds.length
      ? await db
          .select({ id: applications.id, universityName: applications.universityName, programName: applications.programName, deadline: applications.deadline })
          .from(applications)
          .where(and(eq(applications.profileId, profileId)))
      : [];
    const byId = new Map(apps.map((a) => [a.id, a]));

    return NextResponse.json({
      statuses: STATUSES,
      types: TYPES,
      requests: rows.map((r) => ({
        ...r,
        dueDate: r.dueDate ? String(r.dueDate).slice(0, 10) : null,
        application: byId.get(r.applicationId)
          ? {
              id: r.applicationId,
              universityName: byId.get(r.applicationId)!.universityName,
              programName: byId.get(r.applicationId)!.programName,
              deadline: byId.get(r.applicationId)!.deadline ? String(byId.get(r.applicationId)!.deadline).slice(0, 10) : null,
            }
          : null,
      })),
      summary: {
        total: rows.length,
        submitted: rows.filter((r) => r.status === "submitted").length,
        outstanding: rows.filter((r) => r.status !== "submitted").length,
        notRequested: rows.filter((r) => r.status === "not_requested").length,
      },
      /** Copy the student can send their recommender — never written by AI. */
      instructionsTemplate: RECOMMENDER_EMAIL,
    });
  } catch (err) {
    return serverError("recommendations GET", err);
  }
}

const RECOMMENDER_EMAIL = `Dear [Name],

I am applying to [University] for [Program] and would be grateful if you could write a letter of recommendation.

What the programme asks for:
- Your academic view of my work
- One specific example of something I did well
- My contribution to [Club / Project / Competition]

Deadline: [date]

You can reply to this message or use this link: [link]

Thank you very much for considering this.
[Student name]`;

export async function POST(req: Request) {
  const b = await readBody(req);
  if (!b.ok) return b.response;
  const g = await guardStudent(req, b.value.profileId, { write: true });
  if (!g.ok) return g.response;
  const { profileId } = g.value;
  const applicationId = Number(b.value.applicationId);
  const name = text(b.value.recommenderName, 160);
  if (!Number.isInteger(applicationId) || applicationId <= 0) return jsonError(400, "applicationId is required", "bad_request");
  if (!name) return jsonError(400, "recommenderName is required", "bad_request");
  try {
    const [app] = await db
      .select()
      .from(applications)
      .where(and(eq(applications.id, applicationId), eq(applications.profileId, profileId)))
      .limit(1);
    if (!app) return jsonError(404, "Application not found", "not_found");

    const [row] = await db
      .insert(recommendationRequests)
      .values({
        applicationId,
        profileId,
        recommenderName: name,
        recommenderEmail: text(b.value.recommenderEmail, 200),
        relationship: text(b.value.relationship, 160),
        status: oneOf(b.value.status, STATUSES, "not_requested"),
        dueDate: isoDate(dateOnly(b.value.dueDate)) ?? (app.deadline ? String(app.deadline).slice(0, 10) : null),
        instructions: text(b.value.instructions, 4000) ?? RECOMMENDER_EMAIL,
        isPrivate: b.value.isPrivate == null ? true : !!b.value.isPrivate,
      })
      .returning();
    return NextResponse.json({ ok: true, request: row });
  } catch (err) {
    return serverError("recommendations POST", err);
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
      .from(recommendationRequests)
      .where(and(eq(recommendationRequests.id, id), eq(recommendationRequests.profileId, profileId)))
      .limit(1);
    if (!row) return jsonError(404, "Recommendation not found", "not_found");

    const status = b.value.status == null ? row.status : oneOf(b.value.status, STATUSES, row.status);
    await db
      .update(recommendationRequests)
      .set({
        status,
        recommenderName: b.value.recommenderName === undefined ? row.recommenderName : text(b.value.recommenderName, 160) ?? row.recommenderName,
        recommenderEmail: b.value.recommenderEmail === undefined ? row.recommenderEmail : text(b.value.recommenderEmail, 200),
        relationship: b.value.relationship === undefined ? row.relationship : text(b.value.relationship, 160),
        dueDate: b.value.dueDate === undefined ? row.dueDate : isoDate(dateOnly(b.value.dueDate)),
        instructions: b.value.instructions === undefined ? row.instructions : text(b.value.instructions, 4000),
        isPrivate: b.value.isPrivate == null ? row.isPrivate : !!b.value.isPrivate,
        requestedAt: status === "requested" && !row.requestedAt ? new Date() : row.requestedAt,
        submittedAt: status === "submitted" ? new Date() : row.submittedAt,
        updatedAt: new Date(),
      })
      .where(eq(recommendationRequests.id, id));
    return NextResponse.json({ ok: true, id, status });
  } catch (err) {
    return serverError("recommendations PATCH", err);
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
      .delete(recommendationRequests)
      .where(and(eq(recommendationRequests.id, id), eq(recommendationRequests.profileId, g.value.profileId)))
      .returning({ id: recommendationRequests.id });
    if (!deleted.length) return jsonError(404, "Recommendation not found", "not_found");
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return serverError("recommendations DELETE", err);
  }
}
