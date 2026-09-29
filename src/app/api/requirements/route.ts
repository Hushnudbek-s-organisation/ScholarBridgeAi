import { NextResponse } from "next/server";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  applicationRequirements,
  applications,
  essayVersions,
  programRequirements,
  universityPrograms as programs,
  recommendationRequests,
  requirementTemplates,
  studentProfiles,
  testPlans,
  universities,
  userDocuments,
} from "@/db/schema";
import { dateOnly, guardStudent, idParam, isoDate, jsonError, oneOf, readBody, serverError, text } from "@/lib/journey/api";
import {
  buildRequirements,
  DEFAULT_REQUIREMENT_TEMPLATES,
  normalizeVerification,
  type RequirementItem,
  type RequirementSection,
} from "@/lib/journey/requirements";
import { computeWorkspaceProgress } from "@/lib/journey/workspace";
import { isNotNull } from "drizzle-orm";

export const dynamic = "force-dynamic";

const STATUSES = ["todo", "in_progress", "done", "blocked", "not_required"] as const;

/**
 * GET /api/requirements?profileId=&applicationId=
 *
 * The personalized requirements checklist for one application (spec §5) plus
 * the workspace progress bar that every row feeds (spec §6).
 *
 * When the application has no rows yet they are GENERATED from
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
        .where(eq(applicationRequirements.applicationId, applicationId))
        .orderBy(asc(applicationRequirements.sortOrder), asc(applicationRequirements.id)),
      db.select().from(studentProfiles).where(eq(studentProfiles.id, profileId)).limit(1),
      app.universityId
        ? db.select().from(universities).where(eq(universities.id, app.universityId)).limit(1)
        : Promise.resolve([]),
      db.select().from(userDocuments).where(eq(userDocuments.profileId, profileId)),
      db.select().from(essayVersions).where(eq(essayVersions.profileId, profileId)),
      db.select().from(recommendationRequests).where(eq(recommendationRequests.applicationId, applicationId)),
      db.select().from(testPlans).where(eq(testPlans.profileId, profileId)),
    ]);

    const progress = computeWorkspaceProgress(
      rows.map((r) => ({ key: r.itemKey, section: r.section, status: r.status, isRequired: r.isRequired })),
      Object.fromEntries(rows.map((r) => [r.itemKey, r.title])),
      {
        recommendationsSubmitted: recs.filter((r) => r.status === "submitted").length,
        recommendationsTotal: recs.length || rows.filter((r) => r.section === "recommendations").length,
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
        profileComplete: !!profile[0]?.gpa,
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
  if (!Number.isInteger(id) || id <= 0) return jsonError(400, "id is required", "bad_request");
  try {
    const [row] = await db
      .select()
      .from(applicationRequirements)
      .where(and(eq(applicationRequirements.id, id), eq(applicationRequirements.profileId, profileId)))
      .limit(1);
    if (!row) return jsonError(404, "Requirement not found", "not_found");

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

// ---------------------------------------------------------------------------

/**
 * Build the checklist if it is missing (or force a rebuild).
 *
 * Items already ticked are never reset on a rebuild — the student's own work
 * survives, only the template-derived rows are refreshed.
 */
async function ensureRequirements(profileId: number, applicationId: number, force = false): Promise<number> {
  const existing = await db
    .select()
    .from(applicationRequirements)
    .where(eq(applicationRequirements.applicationId, applicationId));
  if (existing.length > 0 && !force) return 0;

  const [app] = await db.select().from(applications).where(eq(applications.id, applicationId)).limit(1);
  if (!app) return 0;

  const uni = app.universityId
    ? (await db.select().from(universities).where(eq(universities.id, app.universityId)).limit(1))[0]
    : null;

  // Programme-level published requirements (sourced) take precedence.
  let program: typeof programRequirements.$inferSelect | null = null;
  const progRows = await db
    .select({ id: programs.id, name: programs.name })
    .from(programs)
    .where(eq(programs.universityId, app.universityId ?? -1));
  const named = progRows.find((p) => !app.programName || p.name.toLowerCase() === app.programName.toLowerCase()) ?? progRows[0];
  if (named) {
    program =
      (await db.select().from(programRequirements).where(eq(programRequirements.programId, named.id)).limit(1))[0] ?? null;
  }

  // Admin-published templates for this university (or the generic fallback).
  const templates = uni
    ? await db
        .select()
        .from(requirementTemplates)
        .where(and(eq(requirementTemplates.universityId, uni.id), eq(requirementTemplates.verificationStatus, "verified")))
        .orderBy(asc(requirementTemplates.sortOrder))
    : [];
  const useTemplates = templates.length
    ? templates
    : DEFAULT_REQUIREMENT_TEMPLATES.map((t) => ({
        ...t,
        sourceUrl: null,
        sourceName: null,
        sourceType: null,
        lastVerifiedAt: null,
        verificationStatus: "unverified" as const,
      }));

  const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, profileId)).limit(1);
  const [docs, essays, plans, recs] = await Promise.all([
    db.select().from(userDocuments).where(eq(userDocuments.profileId, profileId)),
    db.select().from(essayVersions).where(eq(essayVersions.profileId, profileId)),
    db.select().from(testPlans).where(eq(testPlans.profileId, profileId)),
    db.select().from(recommendationRequests).where(and(eq(recommendationRequests.profileId, profileId), eq(recommendationRequests.applicationId, applicationId))),
  ]);

  const items: RequirementItem[] = buildRequirements({
    university: uni ?? { id: 0, name: app.universityName || "This university" },
    profile: profile ?? {},
    program,
    templates: useTemplates.map((t) => ({
      section: t.section,
      itemKey: t.itemKey,
      title: t.title,
      instructions: t.instructions ?? null,
      isRequired: t.isRequired,
      sourceUrl: t.sourceUrl ?? null,
      sourceName: t.sourceName ?? null,
      sourceType: t.sourceType ?? null,
      lastVerifiedAt: t.lastVerifiedAt ?? null,
      verificationStatus: t.verificationStatus,
    })),
    progress: {
      hasDocument: (docType) => docs.some((d) => d.docType === docType && d.status !== "rejected" && !isExpired(d.expiresAt)),
      hasEssay: (essayType) => essays.some((e) => e.essayType === essayType || (essayType === "personal_statement" && e.essayType === "sop")),
      recommendationSubmitted: recs.filter((r) => r.status === "submitted").length,
      recommendationNeeded: Math.max(recs.length, 1),
      testPlanScore: (testType) => plans.find((p) => p.testType === testType)?.currentScore ?? null,
      applicationFeePaid: app.applicationFeePaid,
    },
    deadline: app.deadline ? String(app.deadline).slice(0, 10) : null,
    existingItemKeys: existing.map((e) => e.itemKey),
  });

  const doneKeys = new Set(existing.filter((e) => e.status === "done" || e.status === "not_required").map((e) => e.itemKey));
  const toInsert = items
    .filter((i) => !existing.some((e) => e.itemKey === i.itemKey))
    .map((i, idx) => ({
      applicationId,
      profileId,
      section: i.section,
      itemKey: i.itemKey,
      title: i.title,
      instructions: i.instructions ?? null,
      isRequired: i.isRequired,
      status: doneKeys.has(i.itemKey) ? "done" : i.state === "met" ? "done" : i.state === "todo" ? "todo" : "todo",
      dueDate: typeof i.dueDate === "string" ? i.dueDate.slice(0, 10) : isoDate(i.dueDate as Date | null),
      sourceUrl: i.sourceUrl ?? null,
      sourceName: i.sourceName ?? null,
      sourceType: i.sourceType ?? null,
      lastVerifiedAt: i.lastVerifiedAt ? new Date(i.lastVerifiedAt) : null,
      verificationStatus: normalizeVerification(i.verificationStatus),
      linkedType: i.linkedType ?? null,
      completedAt: i.state === "met" ? new Date() : null,
      sortOrder: idx,
    }));
  if (!toInsert.length) return 0;
  await db.insert(applicationRequirements).values(toInsert);
  return toInsert.length;
}

function isExpired(expiresAt: Date | string | null): boolean {
  if (!expiresAt) return false;
  const d = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  return d.getTime() < Date.now();
}
