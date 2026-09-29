import { NextResponse } from "next/server";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  admissionOffers,
  applicationRequirements,
  applications,
  essayVersions,
  fundingItems,
  journeyDeadlines,
  recommendationRequests,
  testPlans,
  userDocuments,
  applicationDocumentLinks,
} from "@/db/schema";
import { dateOnly, guardStudent, idParam, jsonError, oneOf, readBody, serverError, text } from "@/lib/journey/api";
import { computeWorkspaceProgress, WORKSPACE_TABS } from "@/lib/journey/workspace";
import { reversePlan } from "@/lib/journey/planning";

export const dynamic = "force-dynamic";

/**
 * GET /api/workspace?profileId=[&applicationId=]
 *
 * The Application Workspace (spec §6): one workspace per university, ten tabs,
 * a live progress bar that every requirement feeds, and a final submission
 * checklist. With no `applicationId` it returns the list of workspaces, which
 * is what the sidebar section opens on.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const g = await guardStudent(req, searchParams.get("profileId"));
  if (!g.ok) return g.response;
  const { profileId } = g.value;
  const applicationId = Number(searchParams.get("applicationId"));

  try {
    const owned = and(eq(applications.profileId, profileId));

    if (!Number.isInteger(applicationId) || applicationId <= 0) {
      const rows = await db
        .select({
          id: applications.id,
          universityId: applications.universityId,
          universityName: applications.universityName,
          programName: applications.programName,
          deadline: applications.deadline,
          status: applications.status,
          submittedAt: applications.submittedAt,
          updatedAt: applications.updatedAt,
        })
        .from(applications)
        .where(owned)
        .orderBy(desc(applications.updatedAt));

      const ids = rows.map((r) => r.id);
      const reqCounts = ids.length
        ? await db
            .select({
              applicationId: applicationRequirements.applicationId,
              total: applicationRequirements.id,
              done: applicationRequirements.status,
            })
            .from(applicationRequirements)
            .where(inArray(applicationRequirements.applicationId, ids))
        : [];

      const workspaces = rows.map((r) => {
        const mine = reqCounts.filter((x) => x.applicationId === r.id);
        const total = mine.length;
        const done = mine.filter((x) => x.done === "done" || x.done === "not_required").length;
        return {
          ...r,
          deadline: r.deadline ? String(r.deadline).slice(0, 10) : null,
          progressPct: r.submittedAt ? 100 : total ? Math.round((done / total) * 100) : 0,
          done,
          total,
        };
      });
      return NextResponse.json({ tabs: WORKSPACE_TABS, workspaces });
    }

    // ---- One workspace -----------------------------------------------------
    const [app] = await db
      .select()
      .from(applications)
      .where(and(eq(applications.id, applicationId), owned))
      .limit(1);
    if (!app) return jsonError(404, "Application not found", "not_found");

    const [requirements, offers, recs, docs, essays, finance, plans, deadlines] = await Promise.all([
      db
        .select()
        .from(applicationRequirements)
        .where(eq(applicationRequirements.applicationId, applicationId))
        .orderBy(asc(applicationRequirements.sortOrder), asc(applicationRequirements.id)),
      db.select().from(admissionOffers).where(eq(admissionOffers.applicationId, applicationId)).limit(1),
      db.select().from(recommendationRequests).where(eq(recommendationRequests.applicationId, applicationId)),
      db
        .select()
        .from(userDocuments)
        .innerJoin(applicationDocumentLinks, eq(applicationDocumentLinks.documentId, userDocuments.id))
        .where(eq(applicationDocumentLinks.applicationId, applicationId)),
      db.select().from(essayVersions).where(eq(essayVersions.profileId, profileId)),
      db.select().from(fundingItems).where(eq(fundingItems.profileId, profileId)),
      db.select().from(testPlans).where(eq(testPlans.profileId, profileId)),
      db.select().from(journeyDeadlines).where(and(eq(journeyDeadlines.profileId, profileId), eq(journeyDeadlines.isCompleted, false))),
    ]);

    const progress = computeWorkspaceProgress(
      requirements.map((r) => ({ key: r.itemKey, section: r.section, status: r.status, isRequired: r.isRequired })),
      Object.fromEntries(requirements.map((r) => [r.itemKey, r.title])),
      {
        recommendationsSubmitted: recs.filter((r) => r.status === "submitted").length,
        recommendationsTotal: recs.length,
        submitted: !!app.submittedAt,
      }
    );

    // ---- Final submission checklist (spec §22) -----------------------------
    const feeItem = requirements.find((r) => r.itemKey === "application.fee");
    const submissionChecklist = [
      { key: "documents", label: "Required documents", ok: requirements.filter((r) => r.section === "documents" && r.isRequired).every((r) => r.status === "done" || r.status === "not_required") },
      { key: "essays", label: "Required essays", ok: requirements.filter((r) => r.section === "essays" && r.isRequired).every((r) => r.status === "done" || r.status === "not_required") },
      { key: "recommendations", label: "Recommendations", ok: recs.length === 0 || recs.every((r) => r.status === "submitted") },
      { key: "tests", label: "Tests", ok: requirements.filter((r) => r.section === "testing" && r.isRequired).every((r) => r.status === "done" || r.status === "not_required") },
      { key: "finance", label: "Financial forms", ok: requirements.filter((r) => r.section === "finance" && r.isRequired).every((r) => r.status === "done" || r.status === "not_required") },
      { key: "fee", label: "Application fee", ok: app.applicationFeePaid || !feeItem },
      { key: "final", label: "Final review", ok: progress.pct >= 100 },
    ];

    const deadline = app.deadline ? String(app.deadline).slice(0, 10) : null;

    return NextResponse.json({
      tabs: WORKSPACE_TABS,
      application: {
        id: app.id,
        universityId: app.universityId,
        universityName: app.universityName,
        programName: app.programName,
        applicationRound: app.applicationRound,
        intakeTerm: app.intakeTerm,
        deadline,
        status: app.status,
        submittedAt: app.submittedAt,
        portalUrl: app.portalUrl,
        feeAmount: app.feeAmount,
        applicationFeePaid: app.applicationFeePaid,
        notes: app.notes,
      },
      progress,
      requirements: requirements.map((r) => ({
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
      })),
      documents: docs.map((d) => ({
        id: d.user_documents.id,
        title: d.user_documents.title,
        docType: d.user_documents.docType,
        status: d.user_documents.status,
        expiresAt: d.user_documents.expiresAt ? String(d.user_documents.expiresAt).slice(0, 10) : null,
        fileUrl: d.user_documents.fileUrl,
        usage: d.application_document_links.usage,
      })),
      essays: essays.map((e) => ({ id: e.id, essayType: e.essayType, title: e.title, wordCount: e.wordCount, versionNumber: e.versionNumber })),
      recommendations: recs,
      tests: plans.map((p) => ({ id: p.id, testType: p.testType, currentScore: p.currentScore, targetScore: p.targetScore, targetDate: p.targetDate ? String(p.targetDate).slice(0, 10) : null })),
      finance: finance.map((f) => ({ id: f.id, kind: f.kind, name: f.name, amountUsd: f.amountUsd, status: f.status })),
      deadlines: deadlines
        .filter((d) => d.entityType === "application" && d.entityId === applicationId)
        .map((d) => ({ id: d.id, title: d.title, dueDate: String(d.dueDate).slice(0, 10), kind: d.kind })),
      offer: offers[0] ?? null,
      submissionChecklist,
      readyToSubmit: submissionChecklist.every((c) => c.ok),
      reversePlan: deadline ? reversePlan(deadline, "application") : [],
    });
  } catch (err) {
    return serverError("workspace GET", err);
  }
}

const APPLICATION_STATUSES = ["not_started", "preparing", "submitted", "accepted", "rejected", "waitlisted", "deferred"] as const;

/** PATCH — update the application, or mark it submitted. */
export async function PATCH(req: Request) {
  const b = await readBody(req);
  if (!b.ok) return b.response;
  const g = await guardStudent(req, b.value.profileId, { write: true });
  if (!g.ok) return g.response;
  const { profileId } = g.value;
  const id = Number(b.value.id);
  if (!Number.isInteger(id) || id <= 0) return jsonError(400, "id is required", "bad_request");

  try {
    const [app] = await db
      .select()
      .from(applications)
      .where(and(eq(applications.id, id), eq(applications.profileId, profileId)))
      .limit(1);
    if (!app) return jsonError(404, "Application not found", "not_found");

    // ---- Mark as submitted (spec §22) ------------------------------------
    if (b.value.markSubmitted) {
      const open = await db
        .select()
        .from(applicationRequirements)
        .where(and(eq(applicationRequirements.applicationId, id), eq(applicationRequirements.isRequired, true)));
      const outstanding = open.filter((r) => r.status !== "done" && r.status !== "not_required");
      if (outstanding.length > 0) {
        return NextResponse.json(
          {
            error: `${outstanding.length} required item(s) are still open.`,
            code: "not_ready",
            outstanding: outstanding.map((r) => ({ id: r.id, title: r.title, section: r.section })),
          },
          { status: 409 }
        );
      }
      const submittedAt = new Date();
      await db
        .update(applications)
        .set({
          status: "submitted",
          submittedAt,
          notes: b.value.notes === undefined ? app.notes : text(b.value.notes),
          updatedAt: submittedAt,
        })
        .where(eq(applications.id, id));

      // Track the decision in the shared deadline table so it shows on the
      // dashboard and in Telegram alerts exactly like any other deadline.
      if (app.deadline) {
        await db.insert(journeyDeadlines).values({
          profileId,
          kind: "university",
          title: `${app.universityName || "Application"} — submitted`,
          dueDate: String(app.deadline).slice(0, 10),
          entityType: "application",
          entityId: id,
          isAutoGenerated: true,
          isCompleted: true,
        });
      }
      return NextResponse.json({ ok: true, id, status: "submitted", submittedAt: submittedAt.toISOString() });
    }

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (b.value.status !== undefined) patch.status = oneOf(b.value.status, APPLICATION_STATUSES, app.status);
    if (b.value.portalUrl !== undefined) patch.portalUrl = text(b.value.portalUrl);
    if (b.value.notes !== undefined) patch.notes = text(b.value.notes);
    if (b.value.feeAmount !== undefined) patch.feeAmount = Number(b.value.feeAmount) || null;
    if (b.value.applicationFeePaid !== undefined) patch.applicationFeePaid = !!b.value.applicationFeePaid;
    if (b.value.deadline !== undefined) patch.deadline = dateOnly(b.value.deadline);

    await db.update(applications).set(patch).where(eq(applications.id, id));
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return serverError("workspace PATCH", err);
  }
}
