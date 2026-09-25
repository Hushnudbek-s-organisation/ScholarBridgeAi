import { NextResponse } from "next/server";
import { requireProfileAccess, requireRowAccess } from "@/lib/auth";
import { db } from "@/db";
import {
  applicationDocuments,
  savedScholarships,
  studentProfiles,
  savedUniversities,
  scholarships,
  universities,
} from "@/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import { checkDocuments, expectedDocuments, type DocumentRow } from "@/lib/documents";

/** Valid `status` values — anything else is ignored rather than stored. */
const DOC_STATUSES: readonly string[] = ["missing", "uploaded", "not_required"];

/**
 * Document checklist (spec §24).
 * Documents are NOT hardcoded — they come from each scholarship's
 * `required_documents` field. For universities (no document data yet) and
 * general needs, users can add custom documents.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const profileId = Number(searchParams.get("profileId"));
    const access = await requireProfileAccess(req, profileId);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      );
    }
    if (!profileId) {
      return NextResponse.json({ error: "profileId is required" }, { status: 400 });
    }

    // Ensure checklist rows exist for saved scholarships' required documents.
    const savedSch = await db
      .select()
      .from(savedScholarships)
      .where(eq(savedScholarships.profileId, profileId));
    if (savedSch.length > 0) {
      const schRows = await db
        .select()
        .from(scholarships)
        .where(inArray(scholarships.id, savedSch.map((s) => s.scholarshipId)));
      for (const sch of schRows) {
        let required: string[] = [];
        try {
          required = JSON.parse(sch.requiredDocuments || "[]");
        } catch {
          required = [];
        }
        for (const docType of required) {
          const [existing] = await db
            .select()
            .from(applicationDocuments)
            .where(
              and(
                eq(applicationDocuments.profileId, profileId),
                eq(applicationDocuments.entityType, "scholarship"),
                eq(applicationDocuments.entityId, sch.id),
                eq(applicationDocuments.documentType, docType)
              )
            );
          if (!existing) {
            await db.insert(applicationDocuments).values({
              profileId,
              entityType: "scholarship",
              entityId: sch.id,
              documentType: docType,
              label: docType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
              isRequired: true,
              status: "missing",
              deadlineDate: sch.deadlineDate,
            });
          }
        }
      }
    }

    const rows = await db
      .select()
      .from(applicationDocuments)
      .where(eq(applicationDocuments.profileId, profileId));

    // Attach entity names for display.
    const schIds = rows.filter((r) => r.entityType === "scholarship" && r.entityId).map((r) => r.entityId as number);
    const uniIds = rows.filter((r) => r.entityType === "university" && r.entityId).map((r) => r.entityId as number);
    const schMap = new Map<number, string>();
    const uniMap = new Map<number, string>();
    if (schIds.length) {
      const schs = await db.select().from(scholarships).where(inArray(scholarships.id, schIds));
      schs.forEach((s) => schMap.set(s.id, s.title));
    }
    if (uniIds.length) {
      const unis = await db.select().from(universities).where(inArray(universities.id, uniIds));
      unis.forEach((u) => uniMap.set(u.id, u.name));
    }

    const docs = rows.map((r) => ({
      ...r,
      entityName: r.entityType === "scholarship" ? schMap.get(r.entityId as number) : r.entityType === "university" ? uniMap.get(r.entityId as number) : null,
    }));

    // --- Document checker (#7) --------------------------------------------
    // A checklist says what is missing; this says what is WRONG with what was
    // already uploaded — expired, oversized, the wrong format.
    const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, profileId));
    const intakeParam = searchParams.get("intakeDate");
    const intake = intakeParam && !Number.isNaN(new Date(intakeParam).getTime()) ? new Date(intakeParam) : null;

    const check = checkDocuments(rows as DocumentRow[], {
      today: new Date(),
      intakeDate: intake,
    });

    const existingTypes = new Set(rows.map((r) => r.documentType));
    const suggested = expectedDocuments({
      country: profile?.country,
      degreeLevel: profile?.degreeLevel,
      needsVisa: true,
    }).filter((d) => !existingTypes.has(d.documentType));

    return NextResponse.json({ documents: docs, check, suggested });
  } catch (error) {
    console.error("GET /api/documents error:", error);
    return NextResponse.json({ error: "Failed to load documents" }, { status: 500 });
  }
}

/** POST: add a custom document. */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const profileId = Number(body.profileId);
    const access = await requireProfileAccess(req, profileId);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      );
    }
    if (!profileId || !body.label) {
      return NextResponse.json({ error: "profileId and label are required" }, { status: 400 });
    }
    const [doc] = await db
      .insert(applicationDocuments)
      .values({
        profileId,
        entityType: body.entityType || "general",
        entityId: body.entityId ? Number(body.entityId) : null,
        documentType: body.documentType || "custom",
        label: String(body.label),
        isRequired: false,
        status: "missing",
        deadlineDate: body.deadlineDate || null,
      })
      .returning();
    return NextResponse.json({ document: doc });
  } catch (error) {
    console.error("POST /api/documents error:", error);
    return NextResponse.json({ error: "Failed to add document" }, { status: 500 });
  }
}

/** PATCH: update document status (uploaded/missing/not_required) or fileUrl. */
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const id = Number(body.id);
    if (!id) {
      return NextResponse.json({ error: "document id is required" }, { status: 400 });
    }

    // Row ids are guessable — confirm the row belongs to the caller before
    // mutating it. Without this any signed-in student could edit anyone's
    // documents (IDOR).
    const [target] = await db.select().from(applicationDocuments).where(eq(applicationDocuments.id, id));
    const rowAccess = await requireRowAccess(req, target);
    if (!rowAccess.ok) {
      return NextResponse.json(
        { error: rowAccess.error, code: rowAccess.code },
        { status: rowAccess.status }
      );
    }

    const [doc] = await db
      .update(applicationDocuments)
      .set({
        status: DOC_STATUSES.includes(String(body.status)) ? String(body.status) : undefined,
        fileUrl: body.fileUrl ?? undefined,
        fileName: body.fileName ?? undefined,
        fileSizeBytes: body.fileSizeBytes != null ? Number(body.fileSizeBytes) : undefined,
        expiresAt: body.expiresAt ?? undefined,
        uploadedAt:
          body.status === "uploaded" && !target.uploadedAt ? new Date() : body.uploadedAt ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(applicationDocuments.id, id))
      .returning();
    return NextResponse.json({ document: doc });
  } catch (error) {
    console.error("PATCH /api/documents error:", error);
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
  }
}

/** DELETE: remove a custom document. */
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) {
      return NextResponse.json({ error: "document id is required" }, { status: 400 });
    }

    // Same IDOR guard as PATCH — deletion by id must be scoped to the owner.
    const [target] = await db.select().from(applicationDocuments).where(eq(applicationDocuments.id, id));
    const rowAccess = await requireRowAccess(req, target);
    if (!rowAccess.ok) {
      return NextResponse.json(
        { error: rowAccess.error, code: rowAccess.code },
        { status: rowAccess.status }
      );
    }

    await db.delete(applicationDocuments).where(eq(applicationDocuments.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/documents error:", error);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
