/** Disposable generated catalogue, production query, real PostgreSQL EXPLAIN.
 * No real admissions data and no network/provider/production connection. */
import assert from "node:assert/strict";
import EmbeddedPostgres from "embedded-postgres";
import {Client} from "pg";
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {createServer} from "node:net";
import {sql} from "drizzle-orm";
async function main(){
 const port=await new Promise<number>((resolve,reject)=>{const server=createServer();server.once("error",reject);server.listen(0,"127.0.0.1",()=>{const port=(server.address() as {port:number}).port;server.close(error=>error?reject(error):resolve(port));});});
 const dir=mkdtempSync(join(tmpdir(),"sb-catalogue-load-"));
 const pg=new EmbeddedPostgres({databaseDir:dir,user:"test",password:"fixture-only",port,persistent:false,onLog:()=>{},onError:()=>{}});
 let client:Client|undefined,pool:{end:()=>Promise<void>}|undefined;
 try{
  await pg.initialise();await pg.start();await pg.createDatabase("catalogue_load");
  process.env.DATABASE_URL=`postgresql://test:fixture-only@127.0.0.1:${port}/catalogue_load`;
  client=new Client({connectionString:process.env.DATABASE_URL});await client.connect();
  const ddl=readFileSync("supabase/security_evidence_research_2026-11-06.sql","utf8");
  for(const table of ["catalogue_facts","official_source_checks"]){const start=ddl.indexOf(`CREATE TABLE IF NOT EXISTS public.${table}`),end=ddl.indexOf(`ALTER TABLE public.${table}`,start);assert.ok(start>0&&end>start);await client.query(ddl.slice(start,end));}
  await client.query(`CREATE TABLE student_profiles(id integer PRIMARY KEY);CREATE TABLE sources(id serial PRIMARY KEY,domain text,is_official boolean);
    CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE postgres;CREATE ROLE service_role;
    INSERT INTO sources(domain,is_official) SELECT 'publisher-'||n||'.invalid',true FROM generate_series(1,5000)n;
    INSERT INTO catalogue_facts(entity_type,entity_id,field_key,value_numeric,source_url,verified_at,verification_status,value_type,notes)
    SELECT 'program',(n-1)/2+1,CASE WHEN n%2=0 THEN 'min_ielts' ELSE 'min_gpa' END,CASE WHEN n%2=0 THEN 7 ELSE 3.5 END,
    'https://publisher-'||(5000-(((n-1)/2+1)%1000))||'.invalid/fictional-requirements','2026-01-01','verified','official_requirement','FICTIONAL GENERATED QUERY FIXTURE — not admissions evidence'
    FROM generate_series(1,100000)n;
    CREATE INDEX idx_catalogue_facts_entity ON catalogue_facts(entity_type,entity_id);
    ANALYZE sources;ANALYZE catalogue_facts;`);
  const database=await import("../src/db");pool=database.pool;
  const {catalogueFactsQuery,loadCatalogueFacts}=await import("../src/lib/catalogueFacts.server");
  const ids=Array.from({length:24},(_,n)=>n+1);
  const explain=async(selected=ids)=>{const result=await database.db.execute(sql`EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) ${catalogueFactsQuery("program",selected)}`);return (result.rows[0] as Record<string,unknown>)["QUERY PLAN"] as {"Execution Time":number;Plan:unknown}[];};
  const before=[];for(let n=0;n<3;n++)before.push(await explain());
  await client.query(readFileSync("supabase/fact_scope_cas_2026-11-07.sql","utf8"));
  await client.query("ANALYZE sources;ANALYZE catalogue_facts");
  const after=[];for(let n=0;n<3;n++)after.push(await explain());
  mkdirSync("test-results/continuation-2026-11-07",{recursive:true});writeFileSync("test-results/continuation-2026-11-07/catalogue-plans-diagnostic.json",JSON.stringify({before,after},null,2));
  const point=await explain([1]);
  writeFileSync("test-results/continuation-2026-11-07/catalogue-plans-diagnostic.json",JSON.stringify({before,after,point},null,2));
  assert.match(JSON.stringify(point),/idx_sources_official_normalized_domain/,"selective real production lookup uses the expression index");
  // PostgreSQL correctly prefers one hashed publisher scan for a whole page.
  // Require no repeated full scan, not a forced/disabled planner strategy.
  function checkScans(node:unknown){if(!node||typeof node!=="object")return;const row=node as Record<string,unknown>;if(row["Relation Name"]==="sources"&&row["Node Type"]==="Seq Scan")assert.ok(Number(row["Actual Loops"])<=1,"no per-fact full publisher scan");for(const value of Object.values(row)){if(Array.isArray(value))value.forEach(checkScans);else if(value&&typeof value==="object")checkScans(value);}}
  after.forEach(checkScans);
  const start=performance.now(),records=await loadCatalogueFacts("program",Array.from({length:1005},(_,n)=>n+1)),elapsedMs=performance.now()-start;
  assert.equal(records.size,1005,"more than two production batches return every requested entity");
  const facts=[...records.values()].flat();assert.equal(facts.length,2010);assert.ok(facts.every(fact=>fact.publisherOfficial&&fact.verifiedAt==="2026-01-01T00:00:00Z"));
  const empty=await loadCatalogueFacts("program",[]);assert.equal(empty.size,0);
  const out="test-results/continuation-2026-11-07";mkdirSync(out,{recursive:true});
  writeFileSync(`${out}/catalogue-query-load.json`,JSON.stringify({fixture:{facts:100000,programEntities:50000,publishers:5000,fictional:true},method:"same process and data, warm SQL plans, 3 runs each; not cold OS cache, HTTP or field metrics",before,after,point,loader:{entities:records.size,facts:facts.length,elapsedMs,decodedJsonBytes:Buffer.byteLength(JSON.stringify([...records])),note:"DTO JSON bytes, not compressed transfer bytes"}},null,2));
  console.log("PASS catalogue-load: 100000 fictional facts / 50000 programmes / 5000 publishers; production EXPLAIN index and 1005-entity batching");
 }finally{await client?.end();await pool?.end();try{await pg.stop();}finally{rmSync(dir,{recursive:true,force:true});}}
}
main().catch(error=>{console.error(error instanceof Error?error.message:"Catalogue fixture failed");process.exit(1);});
