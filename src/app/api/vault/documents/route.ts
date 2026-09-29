import { NextResponse } from "next/server";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  applicationDocumentLinks,
  applications,
  userDocuments,
} from "@/db/schema";
import { dateOnly, guardStudent, idParam, isoDate, jsonError, oneOf, readBody, serverError, text } from "@/lib/journey/api";
import { premiumGate } from "@/lib/premium";

export const dynamic = "force-dynamic";

/** The document types the vault understands (spec §7). */
export const DOC_TYPES = [
  "passport",
  "transcript",
  "diploma",
  "ielts",
  "toefl",
  "duolingo",
  "sat",
  "act",
  "cv",
  "award",
  "certificate",
  "recommendation",
  "financial",
  "other",
] as const;

const DOC_STATUSES = ["uploaded", "verified", "needs_update", "expired", "rejected"] as const;

/**
 * GET /api/vault/documents?profileId=
 *
 * The centralized Document Vault (spec §7). One upload is reused across every
 * application, and each document reports which applications use it.
 *
 * SECURITY: every query is filtered on `profile_id = <the caller's own id>`,
 * which `guardStudent` derives from the signed session cookie — never from a
 * client-supplied value. A student can therefore only ever read their own
 * documents.
 */
export async function GET(req: Request) {
  const g = await guardStudent(req, new URL(req.url).searchParams.get("profileId"));
  if (!g.ok) return g.response;
  const { profileId } = g.value;
  try {
    const docs = await db
      .select()
      .from(userDocuments)
      .where(eq(userDocuments.profileId, profileId))
      .orderBy(asc(userDocuments.docType), desc(userDocuments.uploadedAt));

    const links = docs.length
      ? await db
          .select({
            documentId: applicationDocumentLinks.documentId,
            usage: applicationDocumentLinks.usage,
            applicationId: applications.id,
            universityName: applications.universityName,
          })
          .from(applicationDocumentLinks)
          .innerJoin(applications, eq(applications.id, applicationDocumentLinks.applicationId))
          .where(and(eq(applications.profileId, profileId), inArray(applicationDocumentLinks.documentId, docs.map((d) => d.id))))
      : [];

    const byDoc = new Map<number, typeof links>();
    for (const l of links) {
      if (!byDoc.has(l.documentId)) byDoc.set(l.documentId, []);
      byDoc.get(l.documentId)!.push(l);
    }

    return NextResponse.json({
      docTypes: DOC_TYPES,
      documents: docs.map((d) => {
        const expiresAt = d.expiresAt ? String(d.expiresAt).slice(0, 10) : null;
        // An expired document is reported as expired even if the stored status
        // has not caught up yet — the date is the truth.
        const status = expiresAt && expiresAt < today() && d.status !== "rejected" ? "expired" : d.status;
        return {
          id: d.id,
          docType: d.docType,
          title: d.title,
          fileName: d.fileName,
          fileUrl: d.fileUrl,
          fileSizeBytes: d.fileSizeBytes,
          issuedAt: d.issuedAt ? String(d.issuedAt).slice(0, 10) : null,
          expiresAt,
          status,
          verificationNote: d.verificationNote,
          uploadedAt: d.uploadedAt,
          daysToExpiry: expiresAt ? daysTo(expiresAt) : null,
          usedBy: byDoc.get(d.id) ?? [],
        };
      }),
      summary: {
        total: docs.length,
        verified: docs.filter((d) => d.status === "verified").length,
        expiring: docs.filter((d) => d.expiresAt && String(d.expiresAt).slice(0, 10) <= addDays(today(), 120)).length,
        expired: docs.filter((d) => d.expiresAt && String(d.expiresAt).slice(0, 10) < today()).length,
      },
    });
  } catch (err) {
    return serverError("vault/documents GET", err);
  }
}

/** POST — add a document to the vault, optionally attaching it to applications. */
export async function POST(req: Request) {
  const b = await readBody(req);
  if (!b.ok) return b.response;
  const g = await guardStudent(req, b.value.profileId, { write: true });
  if (!g.ok) return g.response;
  const { profileId } = g.value;
  // Checklist metadata is free; uploading a real file is Pro (documents_upload).
  const hasFile = Boolean(text(b.value.fileUrl, 600) || text(b.value.fileName, 240));
  if (hasFile) {
    const locked = await premiumGate(profileId, "documents_upload");
    if (locked) return locked;
  }
  const title = text(b.value.title, 160);
  const docType = oneOf(b.value.docType, DOC_TYPES, "other");
  if (!title) return jsonError(400, "title is required", "bad_request");
  try {
    const applicationIds = Array.isArray(b.value.applicationIds)
      ? (b.value.applicationIds as unknown[]).map(Number).filter((n) => Number.isInteger(n) && n > 0)
      : [];

    const [doc] = await db
      .insert(userDocuments)
      .values({
        profileId,
        docType,
        title,
        fileName: text(b.value.fileName, 240),
        fileUrl: text(b.value.fileUrl, 600),
        fileSizeBytes: Number(b.value.fileSizeBytes) || null,
        mimeType: text(b.value.mimeType, 120),
        issuedAt: isoDate(dateOnly(b.value.issuedAt)),
        expiresAt: isoDate(dateOnly(b.value.expiresAt)),
        status: oneOf(b.value.status, DOC_STATUSES, "uploaded"),
      })
      .returning();

    if (applicationIds.length) {
      // Only the student's OWN applications can be linked.
      const owned = await db
        .select({ id: applications.id })
        .from(applications)
        .where(and(eq(applications.profileId, profileId), inArray(applications.id, applicationIds)));
      if (owned.length) {
        await db
          .insert(applicationDocumentLinks)
          .values(owned.map((a) => ({ applicationId: a.id, documentId: doc.id, usage: "required" })))
          .onConflictDoNothing();
      }
    }
    return NextResponse.json({ ok: true, document: doc });
  } catch (err) {
    return serverError("vault/documents POST", err);
  }
}

/** PATCH — update status, dates, or attach/detach from applications. */
export async function PATCH(req: Request) {
  const b = await readBody(req);
  if (!b.ok) return b.response;
  const g = await guardStudent(req, b.value.profileId, { write: true });
  if (!g.ok) return g.response;
  const { profileId } = g.value;
  const id = Number(b.value.id);
  if (!Number.isInteger(id) || id <= 0) return jsonError(400, "id is required", "bad_request");
  try {
    const [doc] = await db
      .select()
      .from(userDocuments)
      .where(and(eq(userDocuments.id, id), eq(userDocuments.profileId, profileId)))
      .limit(1);
    if (!doc) return jsonError(404, "Document not found", "not_found");

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (b.value.title !== undefined) patch.title = text(b.value.title, 160);
    if (b.value.status !== undefined) {
      const status = oneOf(b.value.status, DOC_STATUSES, doc.status);
      patch.status = status;
      patch.verifiedAt = status === "verified" ? new Date() : null;
    }
    if (b.value.expiresAt !== undefined) patch.expiresAt = isoDate(dateOnly(b.value.expiresAt));
    if (b.value.issuedAt !== undefined) patch.issuedAt = isoDate(dateOnly(b.value.issuedAt));
    if (b.value.fileUrl !== undefined) patch.fileUrl = text(b.value.fileUrl, 600);
    if (b.value.verificationNote !== undefined) patch.verificationNote = text(b.value.verificationNote, 500);
    await db.update(userDocuments).set(patch).where(eq(userDocuments.id, id));

    if (Array.isArray(b.value.applicationIds)) {
      const ids = (b.value.applicationIds as unknown[]).map(Number).filter((n) => Number.isInteger(n) && n > 0);
      const owned = ids.length
        ? await db
            .select({ id: applications.id })
            .from(applications)
            .where(and(eq(applications.profileId, profileId), inArray(applications.id, ids)))
        : [];
      await db.delete(applicationDocumentLinks).where(eq(applicationDocumentLinks.documentId, id));
      if (owned.length) {
        await db
          .insert(applicationDocumentLinks)
          .values(owned.map((a) => ({ applicationId: a.id, documentId: id, usage: "required" })))
          .onConflictDoNothing();
      }
    }
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return serverError("vault/documents PATCH", err);
  }
}

/** DELETE — remove a document from the vault (links cascade). */
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const g = await guardStudent(req, searchParams.get("profileId"), { write: true });
  if (!g.ok) return g.response;
  const id = idParam(req);
  if (!id) return jsonError(400, "id is required", "bad_request");
  try {
    const deleted = await db
      .delete(userDocuments)
      .where(and(eq(userDocuments.id, id), eq(userDocuments.profileId, g.value.profileId)))
      .returning({ id: userDocuments.id });
    if (!deleted.length) return jsonError(404, "Document not found", "not_found");
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return serverError("vault/documents DELETE", err);
  }
}

// ---------------------------------------------------------------------------

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysTo(iso: string): number {
  const now = new Date(`${today()}T00:00:00Z`);
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((new Date(`${iso}T00:00:00Z`).getTime() - start) / 86400000);
}
