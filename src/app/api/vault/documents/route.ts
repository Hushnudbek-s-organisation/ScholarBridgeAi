import { effectiveDocumentStatus, safeDocumentUrl } from "@/lib/documentStatus";
import { documentIdentity, loadDocumentReviewContext } from "@/lib/documentReviews.server";
import { sql } from "drizzle-orm";
import { bumpCacheRevision } from "@/lib/cacheRevision";
import { NextResponse } from "next/server";
import { privateNoStoreJson } from "@/lib/apiResponse";
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

function applicationLinkIds(value:unknown):number[]|null {
  if(value===undefined)return [];
  if(!Array.isArray(value))return null;
  if(value.some(id=>(typeof id!=="number"&&typeof id!=="string")||!Number.isSafeInteger(Number(id))||Number(id)<=0))return null;
  return [...new Set(value.map(Number))].sort((a,b)=>a-b);
}


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

const DOC_STATUSES = ["self_confirmed", "uploaded", "verified", "needs_update", "expired", "rejected"] as const;

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

    const {reviews,links:reviewLinks} = await loadDocumentReviewContext(docs.map(d=>d.id));
    const statusOf=(d:typeof docs[number])=>effectiveDocumentStatus(d,reviews.get(d.id)?.content_hash===documentIdentity(d,reviewLinks.get(d.id)),undefined,reviews.has(d.id));
    return privateNoStoreJson({
      docTypes: DOC_TYPES,
      documents: docs.map((d) => {
        const expiresAt = d.expiresAt ? String(d.expiresAt).slice(0, 10) : null;
        // An expired document is reported as expired even if the stored status
        // has not caught up yet — the date is the truth.
        const status = statusOf(d);
        return {
          id: d.id,
          reviewIdentity:documentIdentity(d,reviewLinks.get(d.id)),
          docType: d.docType,
          title: d.title,
          fileName: d.fileName,
          fileUrl: d.fileUrl,
          fileSizeBytes: d.fileSizeBytes,
          issuedAt: d.issuedAt ? String(d.issuedAt).slice(0, 10) : null,
          expiresAt,
          status,
          verificationNote: d.verificationNote,
          verificationProvenance: status === "verified" ? "platform_reviewed" : status === "self_confirmed" ? "self_confirmed" : null,
          uploadedAt: d.uploadedAt,
          daysToExpiry: expiresAt ? daysTo(expiresAt) : null,
          usedBy: byDoc.get(d.id) ?? [],
        };
      }),
      summary: {
        total: docs.length,
        verified: docs.filter((d) => statusOf(d) === "verified").length,
        expiring: docs.filter((d) => d.expiresAt && String(d.expiresAt).slice(0, 10) <= addDays(today(), 120)).length,
        expired: docs.filter((d) => statusOf(d) === "expired").length,
      },
    });
  } catch (err) {
    const code=(err as {cause?:{code?:string};code?:string}).cause?.code??(err as {code?:string}).code;
    if(code==="42P01"||code==="42703")return jsonError(503,"Document review migration pending; no verified data returned","migration_pending");
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
  if(b.value.fileUrl!==undefined){try{safeDocumentUrl(b.value.fileUrl);}catch{return jsonError(400,"Invalid document URL","bad_request");}}
  // Plain checklist metadata is free; file/link metadata keeps the existing
  // Pro documents_upload gate. This endpoint does not upload bytes or provide
  // secure/private file storage.
  const hasFile = Boolean(text(b.value.fileUrl, 600) || text(b.value.fileName, 240) || b.value.fileSizeBytes || b.value.mimeType);
  if (hasFile) {
    const locked = await premiumGate(profileId, "documents_upload");
    if (locked) return locked;
  }
  const title = text(b.value.title, 160);
  const docType = oneOf(b.value.docType, DOC_TYPES, "other");
  if (!title) return jsonError(400, "title is required", "bad_request");
  try {
    const applicationIds = applicationLinkIds(b.value.applicationIds);
    if(!applicationIds)return jsonError(400,"applicationIds must contain positive integer IDs","bad_request");

    const response = await db.transaction(async(tx)=>{
    if(hasFile){await tx.execute(sql`SELECT id FROM public.student_profiles WHERE id=${profileId} FOR SHARE`);await tx.execute(sql`SELECT id FROM public.subscriptions WHERE profile_id=${profileId} FOR SHARE`);const locked=await premiumGate(profileId,"documents_upload",tx);if(locked)return locked;}
    const owned = applicationIds.length ? await tx.select({id:applications.id}).from(applications).where(and(eq(applications.profileId,profileId),inArray(applications.id,applicationIds))).for("share") : [];
    if (owned.length !== new Set(applicationIds).size) return jsonError(403,"Application link not permitted","forbidden");
    const [doc] = await tx
      .insert(userDocuments)
      .values({
        profileId,
        docType,
        title,
        fileName: text(b.value.fileName, 240),
        fileUrl: safeDocumentUrl(b.value.fileUrl),
        fileSizeBytes: Number(b.value.fileSizeBytes) || null,
        mimeType: text(b.value.mimeType, 120),
        issuedAt: isoDate(dateOnly(b.value.issuedAt)),
        expiresAt: isoDate(dateOnly(b.value.expiresAt)),
        status: b.value.status === "verified" ? "self_confirmed" : oneOf(b.value.status, DOC_STATUSES, "uploaded"),
      })
      .returning();

    if (applicationIds.length) {
      // Only the student's OWN applications can be linked.
      if (owned.length) {
        await tx
          .insert(applicationDocumentLinks)
          .values(owned.map((a) => ({ applicationId: a.id, documentId: doc.id, usage: "required" })))
          .onConflictDoNothing();
      }
    }
    return NextResponse.json({ ok: true, document: doc });
    });
    if(response.ok) await bumpCacheRevision(`documents:${profileId}`, "document created");
    return response;
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
  if(b.value.fileUrl!==undefined){try{safeDocumentUrl(b.value.fileUrl);}catch{return jsonError(400,"Invalid document URL","bad_request");}}
  const id = Number(b.value.id);
  if (!Number.isInteger(id) || id <= 0) return jsonError(400, "id is required", "bad_request");
  const ids=applicationLinkIds(b.value.applicationIds);
  if(!ids)return jsonError(400,"applicationIds must contain positive integer IDs","bad_request");
  const hasFile = Boolean(text(b.value.fileUrl,600) || text(b.value.fileName,240) || b.value.fileSizeBytes || b.value.mimeType);
  if(hasFile){const locked=await premiumGate(profileId,"documents_upload");if(locked)return locked;}
  try {
    const response = await db.transaction(async(tx)=>{
    if(hasFile){await tx.execute(sql`SELECT id FROM public.student_profiles WHERE id=${profileId} FOR SHARE`);await tx.execute(sql`SELECT id FROM public.subscriptions WHERE profile_id=${profileId} FOR SHARE`);const locked=await premiumGate(profileId,"documents_upload",tx);if(locked)return locked;}
    const [doc] = await tx
      .select()
      .from(userDocuments)
      .where(and(eq(userDocuments.id, id), eq(userDocuments.profileId, profileId)))
      .limit(1).for("update");
    if (!doc) return jsonError(404, "Document not found", "not_found");

    // Parent FOR UPDATE also serializes FK inserts; lock current relation rows
    // so concurrent delete/usage writers cannot change the review snapshot.
    const currentLinks=await tx.select({applicationId:applicationDocumentLinks.applicationId,usage:applicationDocumentLinks.usage}).from(applicationDocumentLinks).where(eq(applicationDocumentLinks.documentId,id)).orderBy(asc(applicationDocumentLinks.applicationId)).for("update");
    const currentIds=currentLinks.map(link=>link.applicationId);
    const linksChanged=Array.isArray(b.value.applicationIds)&&(ids.length!==currentIds.length||ids.some((value,index)=>value!==currentIds[index]));
    const owned = ids.length ? await tx.select({id:applications.id}).from(applications).where(and(eq(applications.profileId,profileId),inArray(applications.id,ids))).for("share") : [];
    if (owned.length !== new Set(ids).size) return jsonError(403,"Application link not permitted","forbidden");
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if(b.value.docType!==undefined){if(!DOC_TYPES.includes(b.value.docType as typeof DOC_TYPES[number]))return jsonError(400,"Invalid document type","bad_request");patch.docType=b.value.docType;}
    if (b.value.title !== undefined) patch.title = text(b.value.title, 160);
    if (b.value.status !== undefined) {
      const status = oneOf(b.value.status, DOC_STATUSES, doc.status);
      const trusted = status === "verified" && g.value.session.profile.isAdmin;
      if(trusted&&b.value.expectedIdentity!==documentIdentity(doc,currentLinks))return jsonError(409,"Document metadata changed; reload and review the exact current record","document_review_conflict");
      patch.status = status === "verified" && !trusted ? "self_confirmed" : status;
      patch.verifiedAt = trusted ? new Date() : null;
    }
    if (b.value.expiresAt !== undefined) patch.expiresAt = isoDate(dateOnly(b.value.expiresAt));
    if (b.value.issuedAt !== undefined) patch.issuedAt = isoDate(dateOnly(b.value.issuedAt));
    if (b.value.fileUrl !== undefined) patch.fileUrl = safeDocumentUrl(b.value.fileUrl);
    if (b.value.verificationNote !== undefined) patch.verificationNote = text(b.value.verificationNote, 500);
    if(b.value.fileName!==undefined)patch.fileName=text(b.value.fileName,240);
    if(b.value.fileSizeBytes!==undefined)patch.fileSizeBytes=Number(b.value.fileSizeBytes)||null;
    if(b.value.mimeType!==undefined)patch.mimeType=text(b.value.mimeType,120);
    const contentChanged=["docType","title","verificationNote","fileUrl","fileName","fileSizeBytes","mimeType","expiresAt","issuedAt"].some(k=>k in patch && String(patch[k])!==String(doc[k as keyof typeof doc]));
    if(contentChanged||linksChanged){patch.verifiedAt=null;if(patch.status==null||patch.status==="verified")patch.status="needs_update";}
    const reviewed = patch.status === "verified" && g.value.session.profile.isAdmin;
    if(reviewed){await tx.execute(sql`INSERT INTO public.document_review_records(document_id,content_hash,reviewer_profile_id,verified_at) VALUES (${id},${documentIdentity({...doc,...patch},currentLinks)},${g.value.session.profile.id},now()) ON CONFLICT(document_id) DO UPDATE SET content_hash=EXCLUDED.content_hash,reviewer_profile_id=EXCLUDED.reviewer_profile_id,verified_at=EXCLUDED.verified_at`);}
    await tx.update(userDocuments).set(patch).where(eq(userDocuments.id, id));

    if (linksChanged) {
      const removed=currentIds.filter(value=>!ids.includes(value));
      if(removed.length)await tx.delete(applicationDocumentLinks).where(and(eq(applicationDocumentLinks.documentId,id),inArray(applicationDocumentLinks.applicationId,removed)));
      const added=owned.filter(application=>!currentIds.includes(application.id));
      if(added.length)await tx.insert(applicationDocumentLinks).values(added.map(application=>({applicationId:application.id,documentId:id,usage:"required"}))).onConflictDoNothing();
    }
    return NextResponse.json({ ok: true, id });
    });
    if(response.ok) await bumpCacheRevision(`documents:${profileId}`, "document updated");
    return response;
  } catch (err) {
    const code=(err as {cause?:{code?:string};code?:string}).cause?.code??(err as {code?:string}).code;
    if(code==="42P01"||code==="42703")return jsonError(503,"Document review migration pending; no changes committed","migration_pending");
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
    await bumpCacheRevision(`documents:${g.value.profileId}`, "document deleted");
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
