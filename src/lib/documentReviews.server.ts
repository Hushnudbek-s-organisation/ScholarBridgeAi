import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/db";
export type DocumentReviewLink = { applicationId:number; usage:string };
/** Bind relationship context, not timestamps. Order/duplicate presentation of
 * the same link set is not a content edit; usage metadata IS part of a link. */
export function documentIdentity(doc: Record<string, unknown>, links:DocumentReviewLink[]=[]): string {
  const normalizedLinks=[...new Map(links.map(link=>[link.applicationId,{applicationId:link.applicationId,usage:link.usage}])).values()].sort((a,b)=>a.applicationId-b.applicationId);
  return createHash("sha256")
    .update(
      JSON.stringify([
        doc.docType,
        doc.title,
        doc.verificationNote,
        doc.fileUrl,
        doc.fileName,
        doc.fileSizeBytes,
        doc.mimeType,
        doc.expiresAt,
        doc.issuedAt,
        // Preserve existing identities for unlinked records. Reviewed linked
        // records need a fresh review because the old hash did not bind links.
        ...(normalizedLinks.length?[{applicationLinks:normalizedLinks}]:[]),
      ]),
    )
    .digest("hex");
}
export type DocumentReview = {
  document_id: number;
  content_hash: string;
  reviewer_profile_id: number;
  verified_at: string;
};
let unavailableUntil = 0;
export async function loadDocumentReviews(
  ids: number[],
  executor:Pick<typeof db,"execute">=db,
): Promise<Map<number, DocumentReview>> {
  if (!ids.length || Date.now() < unavailableUntil) return new Map();
  try {
    const r = await executor.execute(
      sql`SELECT document_id,content_hash,reviewer_profile_id,verified_at FROM public.document_review_records WHERE document_id IN (${sql.join(
        ids.map((id) => sql`${id}`),
        sql`,`,
      )})`,
    );
    return new Map(
      (r.rows as unknown as DocumentReview[]).map((row) => [
        row.document_id,
        row,
      ]),
    );
  } catch (e) {
    if (
      (e as { cause?: { code?: string }; code?: string }).cause?.code ===
        "42P01" ||
      (e as { code?: string }).code === "42P01"
    ) {
      unavailableUntil = Date.now() + 60000;
      if(executor!==db)throw e;
      return new Map();
    }
    throw e;
  }
}

export async function loadDocumentReviewContext(ids:number[],executor:Pick<typeof db,"execute">=db){
  const reviews=await loadDocumentReviews(ids,executor);
  const links=new Map<number,DocumentReviewLink[]>();
  if(ids.length){
    const result=await executor.execute(sql`SELECT document_id,application_id,usage FROM public.application_document_links WHERE document_id IN (${sql.join(ids.map(id=>sql`${id}`),sql`,`)}) ORDER BY document_id,application_id`);
    for(const row of result.rows as unknown as {document_id:number;application_id:number;usage:string}[]){
      const current=links.get(row.document_id)??[];current.push({applicationId:row.application_id,usage:row.usage});links.set(row.document_id,current);
    }
  }
  return {reviews,links};
}

/** Shared effective projection for vault/workspace/search/checklist consumers.
 * Review binds metadata AND application links; external metadata links are
 * still not secure private uploads. A known review mismatch needs re-review. */
export async function resolveDocumentStatuses<T extends {id:number;status:string;expiresAt?:string|Date|null}>(documents:T[],executor:Pick<typeof db,"execute">=db){
  const {reviews,links}=await loadDocumentReviewContext(documents.map(document=>document.id),executor);
  const {effectiveDocumentStatus}=await import("./documentStatus");
  return documents.map(document=>{const status=effectiveDocumentStatus(document,reviews.get(document.id)?.content_hash===documentIdentity(document as Record<string,unknown>,links.get(document.id)),undefined,reviews.has(document.id));return {...document,status,storedStatus:document.status,verificationProvenance:status==="verified"?"platform_reviewed":status==="self_confirmed"?"self_confirmed":null};});
}
