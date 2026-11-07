import {sql} from "drizzle-orm";
import {db} from "@/db";
import {requireAdmin} from "@/lib/auth";
import {readJsonBody} from "@/lib/request";
import {catalogueFactInput} from "@/lib/catalogueFactInput";
import {privateNoStoreJson as json} from "@/lib/apiResponse";
import {invalidateCatalogCache} from "@/lib/catalogCache";
const uuid=(value:unknown)=>typeof value==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
function failure(error:unknown){const code=(error as {cause?:{code?:string};code?:string}).cause?.code??(error as {code?:string}).code;return ["42P01","42703"].includes(code??"")?json({error:"Fact scope/CAS migration pending; no changes committed",code:"migration_pending"},{status:503}):json({error:"Fact store unavailable; no success was reported"},{status:503});}
export async function GET(req:Request){
  const access=await requireAdmin(req);if(!access.ok)return json({error:access.error,code:access.code},{status:access.status});
  try{const result=await db.execute(sql`SELECT * FROM public.catalogue_facts ORDER BY updated_at DESC,id LIMIT 100`);return json({facts:result.rows});}catch(error){return failure(error);}
}
async function save(req:Request,editing:boolean){
  const access=await requireAdmin(req);if(!access.ok)return json({error:access.error,code:access.code},{status:access.status});
  const body=await readJsonBody<Record<string,unknown>>(req,48*1024);if(!body.ok)return json({error:body.error,code:body.code},{status:body.status});
  let values:Record<string,unknown>;
  try{values=catalogueFactInput(body.body);}catch(error){return json({error:error instanceof Error?error.message:"Invalid fact"},{status:400});}
  const id=body.body.id;
  if(!uuid(id))return json({error:"A stable UUID draft id is required"},{status:400});
  const version=String(body.body.expectedVersion??"");
  if(editing&&(!/^[1-9]\d{0,18}$/.test(version)||BigInt(version)>BigInt("9223372036854775807")))return json({error:"Expected version is required"},{status:400});
  try{
    const columns=Object.keys(values);
    const result=await db.transaction(async tx=>{
      const written=editing?await tx.execute(sql`UPDATE public.catalogue_facts SET ${sql.join(columns.map(key=>sql`${sql.identifier(key)}=${values[key]}`),sql`, `)} WHERE id=${id}::uuid AND version=${version}::bigint RETURNING *`)
        :await tx.execute(sql`INSERT INTO public.catalogue_facts(id,${sql.join(columns.map(key=>sql.identifier(key)),sql`, `)}) VALUES(${id}::uuid,${sql.join(columns.map(key=>sql`${values[key]}`),sql`, `)}) ON CONFLICT(id) DO NOTHING RETURNING *`);
      if(written.rows.length)await tx.execute(sql`INSERT INTO public.cache_revisions(scope,revision,reason,updated_at) VALUES('catalogue',2,'admin fact edit',now()) ON CONFLICT(scope) DO UPDATE SET revision=cache_revisions.revision+1,reason=EXCLUDED.reason,updated_at=now()`);
      return written;
    });
    if(!result.rows.length)return json({error:"Draft already exists or was changed elsewhere. Refresh before applying this edit.",code:"fact_conflict"},{status:409});
    await invalidateCatalogCache();
    return json({fact:result.rows[0],verification:"review_needed"},{status:editing?200:201});
  }catch(error){return failure(error);}
}
export const POST=(req:Request)=>save(req,false);
export const PATCH=(req:Request)=>save(req,true);
