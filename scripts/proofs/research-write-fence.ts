import assert from "node:assert/strict";
import {fork,type ChildProcess} from "node:child_process";
import type {Client} from "pg";
import {sql} from "drizzle-orm";
function message(child:ChildProcess){return new Promise<Record<string,unknown>>((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error("Fence child did not reply")),20_000);
  const receive=(value:Record<string,unknown>)=>{clearTimeout(timer);child.off("error",error);resolve(value);};
  const error=(value:Error)=>{clearTimeout(timer);child.off("message",receive);reject(value);};
  child.once("message",receive);child.once("error",error);
});}
export async function proveResearchWrites(client:Client){
  const store=await import("../../src/lib/research-agent/durableStore");
  const {withResearchLease,fenceResearchWrite,researchDb,ResearchLeaseLostError}=await import("../../src/lib/research-agent/writeFence");
  await client.query("CREATE TABLE public.fence_business(id integer PRIMARY KEY,value integer);INSERT INTO public.fence_business VALUES(1,1);INSERT INTO research_runs(id,request,university_ids,scopes,max_attempts) VALUES('run_business','{}','[1]','[]',10)");
  await client.query(`CREATE TABLE IF NOT EXISTS public.sources(id serial PRIMARY KEY,url text NOT NULL,title text,domain text,source_type text,accessed_at timestamp DEFAULT now(),is_official boolean DEFAULT false,is_verified boolean DEFAULT false,created_at timestamp DEFAULT now());
    CREATE TABLE IF NOT EXISTS public.university_sources(id serial PRIMARY KEY,university_id integer NOT NULL,source_id integer REFERENCES sources,source_type text DEFAULT 'university_evidence');
    CREATE TABLE IF NOT EXISTS public.refresh_jobs(id serial PRIMARY KEY,job_type text NOT NULL,status text DEFAULT 'pending',trigger text DEFAULT 'manual',items_processed integer DEFAULT 0,items_changed integer DEFAULT 0,error text,started_at timestamp,finished_at timestamp,created_at timestamp DEFAULT now());`);
  const first=await store.claimDurableRun("run_business","A",60_000);assert.ok(first?.lease_owner);
  const child=fork("scripts/fixtures/research-fence-child.ts",[],{execArgv:["--import","tsx"],env:{PATH:process.env.PATH,DATABASE_URL:process.env.DATABASE_URL,RESEARCH_DURABLE_STORE:"1",NODE_ENV:"test"},stdio:["ignore","ignore","inherit","ipc"]});
  try{
    assert.equal((await message(child)).ready,true);
    // A is a real, separate process paused before its business write.
    await client.query("UPDATE research_runs SET lease_until=now()-interval '1 second' WHERE id='run_business'");
    const second=await store.claimDurableRun("run_business","B",60_000);assert.ok(second?.lease_owner);
    const persist=await import("../../src/lib/research-agent/persist");
    const audit=await import("../../src/lib/research-agent/audit");
    const source=await withResearchLease({runId:"run_business",workerId:second.lease_owner},()=>persist.upsertSource({field:"foundedYear",value:1990,sourceUrl:"https://fictional.example.edu/live-b",sourceTitle:"FICTIONAL B live source",sourceType:"official_university",exactEvidence:"FICTIONAL founded in 1990",confidence:0.99},1));
    assert.ok(source?.sourceId,"B's actual source+link persistence succeeds with valid arguments");
    const log=await withResearchLease({runId:"run_business",workerId:second.lease_owner},()=>audit.logRunStart(1,["identity"]));assert.equal(log,1);
    const reply=message(child);child.send({runId:"run_business",token:first.lease_owner});
    const outcomes=(await reply).outcomes as Record<string,string>;
    assert.equal(Object.keys(outcomes).length,9);
    for(const [name,outcome] of Object.entries(outcomes))assert.equal(outcome,"ResearchLeaseLostError",`${name} rejected before its first SQL write`);
    assert.equal((await client.query("SELECT count(*)::int AS count FROM sources WHERE url LIKE '%stale-a%'" )).rows[0].count,0);
    assert.equal((await client.query("SELECT status FROM refresh_jobs WHERE id=1")).rows[0].status,"running","A cannot finish B's actual audit row");
    const write=fenceResearchWrite(()=>researchDb.execute(sql`UPDATE public.fence_business SET value=2 WHERE id=1`));
    await assert.rejects(()=>write(),ResearchLeaseLostError,"legacy/unclaimed caller fails closed in durable mode");
    await withResearchLease({runId:"run_business",workerId:second.lease_owner},write);
    assert.equal((await client.query("SELECT value FROM fence_business")).rows[0].value,2,"current B token can actually commit a business write");
    const rollback=fenceResearchWrite(async()=>{await researchDb.execute(sql`UPDATE fence_business SET value=3 WHERE id=1`);throw new Error("fixture rollback");});
    await assert.rejects(()=>withResearchLease({runId:"run_business",workerId:second.lease_owner!},rollback),/fixture rollback/);
    assert.equal((await client.query("SELECT value FROM fence_business")).rows[0].value,2);
    assert.equal(await store.appendDurableItem("run_business",1,{status:"complete"}),false,"unguarded items cannot use the former null-token bypass");
    assert.equal(await store.appendDurableItem("run_business",1,{status:"complete"},{workerId:first.lease_owner}),false);
    assert.equal(await store.appendDurableItem("run_business",1,{status:"complete"},{workerId:second.lease_owner}),true);
    await client.query("UPDATE research_runs SET lease_until=clock_timestamp()+interval '100 milliseconds' WHERE id='run_business'");
    const expiresDuringWrite=fenceResearchWrite(async()=>{await researchDb.execute(sql`UPDATE fence_business SET value=4 WHERE id=1`);await researchDb.execute(sql`SELECT pg_sleep(0.15)`);});
    await assert.rejects(()=>withResearchLease({runId:"run_business",workerId:second.lease_owner!},expiresDuringWrite),ResearchLeaseLostError);
    assert.equal((await client.query("SELECT value FROM fence_business")).rows[0].value,2,"lease expiry before commit rolls back already-issued SQL");
    console.log("PASS C09: separate paused A process -> B reclaim -> 8 real stale persistence/audit entrypoints plus generic SQL probe rejected; live B source/link/audit/SQL commits, guarded items, thrown-error and lease-expiry rollbacks.");
  }finally{child.kill("SIGTERM");}
}
