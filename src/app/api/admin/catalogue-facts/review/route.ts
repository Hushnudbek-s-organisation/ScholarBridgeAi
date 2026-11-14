import {sql} from "drizzle-orm";
import {db} from "@/db";
import {requireAdmin} from "@/lib/auth";
import {readJsonBody} from "@/lib/request";
import {privateNoStoreJson as json} from "@/lib/apiResponse";
import {catalogueFactInput,manuallyReviewableAwardFact} from "@/lib/catalogueFactInput";
import {invalidateCatalogCache} from "@/lib/catalogCache";
export async function POST(req:Request){
 const access=await requireAdmin(req);if(!access.ok)return json({error:access.error,code:access.code},{status:access.status});
 const body=await readJsonBody<Record<string,unknown>>(req,48*1024);if(!body.ok)return json({error:body.error},{status:body.status});
 const {id,expectedVersion,expectedFact,sourceQuote,confirmsAllLeaves}=body.body;
 if(typeof id!=="string"||!/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(id)||!/^([1-9]\d{0,18})$/.test(String(expectedVersion))||BigInt(String(expectedVersion))>BigInt("9223372036854775807")||typeof sourceQuote!=="string"||sourceQuote.trim().length<40||sourceQuote.length>10000||confirmsAllLeaves!==true)return json({error:"Exact UUID/version, official-source quotation and explicit AND/OR + all-leaf attestation required"},{status:400});
 try{
  const fact=await db.transaction(async tx=>{
   const found=await tx.execute(sql`SELECT f.*,EXISTS(SELECT 1 FROM public.sources s WHERE s.is_official AND lower(regexp_replace(s.domain,'^www[.]',''))=lower(regexp_replace(split_part(split_part(f.source_url,'://',2),'/',1),'^www[.]',''))) AS publisher_official FROM public.catalogue_facts f WHERE f.id=${id}::uuid AND f.version=${String(expectedVersion)}::bigint AND f.is_active FOR UPDATE`);
   const row=found.rows[0];if(!row)throw new Error("conflict");
   if((row.field_key!=="requirement_group"&&!manuallyReviewableAwardFact(row))||row.value_type!=="official_requirement"||row.publisher_official!==true||typeof row.source_url!=="string"||!row.source_url.startsWith("https://"))throw new Error("source_unproven");
   try{catalogueFactInput({entityType:row.entity_type,entityId:row.entity_id,fieldKey:row.field_key,valueType:row.value_type,valueNumeric:row.value_numeric==null?null:Number(row.value_numeric),valueText:row.value_text,sourceUrl:row.source_url});}catch{throw new Error("invalid_group");}
   let expected:Record<string,unknown>;try{expected=catalogueFactInput(expectedFact as Record<string,unknown>);}catch{throw new Error("conflict");}
   for(const [key,value] of Object.entries(expected)){if(key==="verification_status"||key==="verified_at")continue;if(JSON.stringify(key==="value_numeric"&&row[key]!=null?Number(row[key]):row[key])!==JSON.stringify(value))throw new Error("conflict");}
   await tx.execute(sql`INSERT INTO public.catalogue_fact_reviews(fact_id,reviewed_version,reviewer_profile_id,reviewed_snapshot,source_quote) VALUES(${id}::uuid,${String(expectedVersion)}::bigint,${access.session.profile.id},${JSON.stringify(row)}::jsonb,${sourceQuote.trim()})`);
   const result=await tx.execute(sql`UPDATE public.catalogue_facts SET verification_status='verified',verified_at=now() WHERE id=${id}::uuid RETURNING *`);
   await tx.execute(sql`INSERT INTO public.cache_revisions(scope,revision,reason,updated_at) VALUES('catalogue',2,'manual exact group review',now()) ON CONFLICT(scope) DO UPDATE SET revision=cache_revisions.revision+1,reason=EXCLUDED.reason,updated_at=now()`);
   return result.rows[0];
  });
  await invalidateCatalogCache();return json({fact,reviewType:"manual_source_attestation",officialPageReRead:false});
 }catch(error){const reason=error instanceof Error?error.message:"";if(reason==="conflict")return json({error:"Fact changed or inactive; refresh before reviewing",code:"fact_conflict"},{status:409});if(reason==="invalid_group")return json({error:"The saved requirement group is malformed"},{status:400});if(reason==="source_unproven")return json({error:"Only original official requirement groups or allowlisted, fully scoped award fields with recorded official-publisher ownership can be manually reviewed"},{status:400});return json({error:"Manual review unavailable; no success was reported. Check migrations and draft validity."},{status:503});}
}
