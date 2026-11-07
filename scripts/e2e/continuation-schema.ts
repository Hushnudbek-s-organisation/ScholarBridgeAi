import {readFileSync} from "node:fs";
import {sql} from "drizzle-orm";
import {db} from "@/db";
/** Optional isolated API fixture. Performance keeps the original fixture/schema
 * unchanged; this opt-in exercises additive SQL, not a production migration. */
export async function continuationFixtureSchema(){
 const historical=readFileSync("supabase/security_evidence_research_2026-11-06.sql","utf8");
 for(const table of ["catalogue_facts","official_source_checks"]){const start=historical.indexOf(`CREATE TABLE IF NOT EXISTS public.${table}`),end=historical.indexOf(`ALTER TABLE public.${table}`,start);if(start<0||end<start)throw new Error("Baseline fixture DDL missing");await db.execute(sql.raw(historical.slice(start,end)));}
 const start=historical.indexOf("CREATE TABLE IF NOT EXISTS public.cache_revisions");await db.execute(sql.raw(historical.slice(start,historical.indexOf(";",start)+1)));
 for(const role of ["anon","authenticated","service_role","postgres"])await db.execute(sql.raw(`DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='${role}') THEN CREATE ROLE ${role};END IF;END $$;`));
 for(const file of ["official_source_program_checks_2026-11-07.sql","fact_scope_cas_2026-11-07.sql","document_review_records_2026-11-07.sql","applicant_context_2026-11-07.sql","atomic_cache_revisions_2026-11-07.sql"])await db.execute(sql.raw(readFileSync(`supabase/${file}`,"utf8")));
}
