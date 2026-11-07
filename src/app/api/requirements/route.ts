import {ensureRequirements} from "@/lib/journey/requirements.server";
import { NextResponse } from "next/server";
import { and, asc, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import {
  applicationDocumentLinks,
  applicationRequirements,
  applications,
  essayVersions,
  recommendationRequests,
  studentProfiles,
  testPlans,
  universities,
  userDocuments,
} from "@/db/schema";
import { dateOnly, guardStudent, isoDate, jsonError, oneOf, readBody, serverError, text } from "@/lib/journey/api";
import { computeWorkspaceProgress } from "@/lib/journey/workspace";

export const dynamic = "force-dynamic";

const STATUSES = ["todo", "in_progress", "done", "blocked", "not_required"] as const;

/**
 * GET /api/requirements?profileId=&applicationId=
 *
 * The personalized requirements checklist for one application (spec §5) plus
 * the workspace progress bar that every row feeds (spec §6).
 *
 * Manual progress is preserved; derived policy evidence refreshes on reads.
 * New checklist rows are GENERATED from
 *   1. the admin-published `requirement_templates` for the university/program,
 *   2. the university's own sourced requirement columns,
 *   3. the published `program_requirements` rows,
 * and saved, so the student can tick them off. Nothing is ever written by AI.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const g = await guardStudent(req, searchParams.get("profileId"));
  if (!g.ok) return g.response;
  const { profileId } = g.value;
  const applicationId = Number(searchParams.get("applicationId"));
  if (!Number.isInteger(applicationId) || applicationId <= 0) {
    return jsonError(400, "applicationId is required", "bad_request");
  }

  try {
    // Ownership: an application row is only ever read by its owner.
    const [app] = await db
      .select()
      .from(applications)
      .where(and(eq(applications.id, applicationId), eq(applications.profileId, profileId)))
      .limit(1);
    if (!app) return jsonError(404, "Application not found", "not_found");

    await ensureRequirements(profileId, applicationId);

    const [rows, profile, uni, docs, essays, recs, plans] = await Promise.all([
      db
        .select()
        .from(applicationRequirements)
        .where(and(eq(applicationRequirements.profileId, profileId), eq(applicationRequirements.applicationId, applicationId)))
        .orderBy(asc(applicationRequirements.sortOrder), asc(applicationRequirements.id)),
      db.select().from(studentProfiles).where(eq(studentProfiles.id, profileId)).limit(1),
      app.universityId
        ? db.select().from(universities).where(eq(universities.id, app.universityId)).limit(1)
        : Promise.resolve([]),
      db
        .select({ id: userDocuments.id })
        .from(userDocuments)
        .innerJoin(applicationDocumentLinks, eq(applicationDocumentLinks.documentId, userDocuments.id))
        .where(and(eq(userDocuments.profileId, profileId), eq(applicationDocumentLinks.applicationId, applicationId))),
      db.select().from(essayVersions).where(and(
        eq(essayVersions.profileId, profileId),
        app.universityId != null
          ? or(eq(essayVersions.universityId, app.universityId), isNull(essayVersions.universityId))
          : isNull(essayVersions.universityId),
      )),
      db.select().from(recommendationRequests).where(and(
        eq(recommendationRequests.profileId, profileId),
        eq(recommendationRequests.applicationId, applicationId),
      )),
      db.select().from(testPlans).where(eq(testPlans.profileId, profileId)),
    ]);

    const progress = computeWorkspaceProgress(
      rows.map((r) => ({ key: r.itemKey, section: r.section, status: r.status, isRequired: r.isRequired, linkedType: r.linkedType })),
      Object.fromEntries(rows.map((r) => [r.itemKey, r.title])),
      {
        recommendationsSubmitted: recs.filter((r) => r.status === "submitted").length,
        recommendationsTotal: recs.length,
        applicationFeePaid: app.applicationFeePaid,
        submitted: !!app.submittedAt,
      }
    );

    return NextResponse.json({
      application: {
        id: app.id,
        universityId: app.universityId,
        universityName: app.universityName,
        programName: app.programName,
        deadline: app.deadline ? String(app.deadline).slice(0, 10) : null,
        status: app.status,
        submittedAt: app.submittedAt,
        applicationFeePaid: app.applicationFeePaid,
        portalUrl: app.portalUrl,
      },
      university: uni[0]
        ? {
            id: uni[0].id,
            name: uni[0].name,
            officialWebsiteUrl: uni[0].officialWebsiteUrl,
            admissionsUrl: uni[0].admissionsUrl,
            applicationUrl: uni[0].applicationUrl,
            verificationStatus: uni[0].verificationStatus,
            lastVerifiedAt: uni[0].lastVerifiedAt,
          }
        : null,
      requirements: rows.map((r) => ({
        id: r.id,
        section: r.section,
        itemKey: r.itemKey,
        title: r.title,
        instructions: r.instructions,
        isRequired: r.isRequired,
        status: r.status,
        dueDate: r.dueDate ? String(r.dueDate).slice(0, 10) : null,
        sourceUrl: r.sourceUrl,
        sourceName: r.sourceName,
        sourceType: r.sourceType,
        lastVerifiedAt: r.lastVerifiedAt,
        verificationStatus: r.verificationStatus,
        linkedType: r.linkedType,
        completedAt: r.completedAt,
      })),
      progress,
      // Live facts used by the checkmarks — the client never recomputes these.
      facts: {
        documents: docs.length,
        essays: essays.length,
        recommendations: recs.length,
        testPlans: plans.length,
        profileComplete: profile[0]?.gpa != null,
      },
    });
  } catch (err) {
    return serverError("requirements GET", err);
  }
}

/** POST — regenerate the checklist from the published templates + columns. */
export async function POST(req: Request) {
  const b = await readBody(req);
  if (!b.ok) return b.response;
  const g = await guardStudent(req, b.value.profileId, { write: true });
  if (!g.ok) return g.response;
  const { profileId } = g.value;
  const applicationId = Number(b.value.applicationId);
  if (!Number.isInteger(applicationId) || applicationId <= 0) {
    return jsonError(400, "applicationId is required", "bad_request");
  }
  try {
    const [app] = await db
      .select()
      .from(applications)
      .where(and(eq(applications.id, applicationId), eq(applications.profileId, profileId)))
      .limit(1);
    if (!app) return jsonError(404, "Application not found", "not_found");
    const created = await ensureRequirements(profileId, applicationId, true);
    return NextResponse.json({ ok: true, created });
  } catch (err) {
    return serverError("requirements POST", err);
  }
}

/** PATCH — mark one item done / in progress / not required. */
export async function PATCH(req: Request) {
  const b = await readBody(req);
  if (!b.ok) return b.response;
  const g = await guardStudent(req, b.value.profileId, { write: true });
  if (!g.ok) return g.response;
  const { profileId } = g.value;
  const id = Number(b.value.id);
  const applicationId = Number(b.value.applicationId);
  if (!Number.isInteger(id) || id <= 0) return jsonError(400, "id is required", "bad_request");
  if (!Number.isInteger(applicationId) || applicationId <= 0) return jsonError(400, "applicationId is required", "bad_request");
  try {
    const [row] = await db
      .select()
      .from(applicationRequirements)
      .where(and(
        eq(applicationRequirements.id, id),
        eq(applicationRequirements.profileId, profileId),
        eq(applicationRequirements.applicationId, applicationId),
      ))
      .limit(1);
    if (!row) return jsonError(404, "Requirement not found", "not_found");
    if(row.itemKey==="published.requirement_group")return jsonError(409,"Published policy status is derived from current evidence and original profile records","derived_requirement");

    const status = b.value.status == null ? row.status : oneOf(b.value.status, STATUSES, row.status);
    const due: string | null =
      b.value.dueDate === undefined ? row.dueDate : isoDate(dateOnly(b.value.dueDate));
    await db
      .update(applicationRequirements)
      .set({
        status,
        isRequired: b.value.isRequired == null ? row.isRequired : !!b.value.isRequired,
        instructions: b.value.instructions === undefined ? row.instructions : text(b.value.instructions),
        dueDate: due,
        completedAt: status === "done" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(applicationRequirements.id, id));
    return NextResponse.json({ ok: true, id, status });
  } catch (err) {
    return serverError("requirements PATCH", err);
  }
}
