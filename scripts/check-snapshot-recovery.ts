import assert from "node:assert/strict";
import {classifyReadFailure,readFailureDiagnostic,readJsonWithSnapshotRecovery} from "../src/lib/readFailure";
let passed=0;
async function check(name:string,fn:()=>void|Promise<void>){await fn();passed++;console.log(`PASS ${name}`);}
function replies(values:{status:number;body:unknown}[]){let calls=0;const methods:string[]=[];const fetcher:typeof fetch=async(_url,init)=>{methods.push(init?.method??"GET");const value=values[calls++];assert.ok(value,"read attempts exceeded the supplied bound");return new Response(JSON.stringify(value.body),{status:value.status,headers:{"Content-Type":"application/json"}});};return {fetcher,count:()=>calls,methods};}
async function main(){
 await check("moving snapshot is a distinct failure; SQL/auth messages are not copied",()=>{
  assert.equal(classifyReadFailure({name:"CacheRevisionChangedError",message:"private-data"}),"snapshot_changed");
  assert.equal(classifyReadFailure({cause:{code:"28P01",message:"private-secret"}}),"database_auth");
  assert.equal(classifyReadFailure({code:"42P01"}),"schema_unavailable");
  assert.equal(classifyReadFailure({code:"40001"}),"database_transient");
  assert.equal(classifyReadFailure(new TypeError("private profile body")),"internal");
 });
 await check("diagnostic contains only fixed taxonomy, never raw errors or unknown codes",()=>{
  const error={name:"DrizzleQueryError",message:"FICTIONAL_SECRET_MESSAGE",query:"FICTIONAL_PRIVATE_SQL",cause:{code:"28P01",message:"FICTIONAL_PASSWORD"}};
  assert.deepEqual(readFailureDiagnostic("universities GET",error),{category:"database_auth",kind:"DrizzleQueryError",dbCode:"28P01",where:"universities GET"});
  assert.equal(JSON.stringify(readFailureDiagnostic("universities GET",error)).includes("FICTIONAL"),false);
  assert.deepEqual(readFailureDiagnostic("https://private.invalid/profile/123",{name:"UNTRUSTED_NAME",code:"UNTRUSTED_CODE"}),{category:"internal",kind:"Error",dbCode:"other",where:"route"});
 });
 for(const [code,category] of [["42P01","schema_unavailable"],["42703","schema_unavailable"],["28P01","database_auth"],["40001","database_transient"],["40P01","database_transient"],["53300","database_transient"],["57P01","database_transient"],["08006","database_transient"]])await check(`safe diagnostic preserves distinct ${code}`,()=>{
  const d=readFailureDiagnostic("universities GET",{cause:{code}});assert.equal(d.category,category);assert.equal(d.dbCode,code);
 });
 await check("one rejected moving snapshot GET recovers to the new payload",async()=>{
  const f=replies([{status:409,body:{code:"snapshot_changed"}},{status:200,body:{revision:2,value:"new"}}]);
  assert.deepEqual(await readJsonWithSnapshotRecovery("/api/dashboard","fallback",f.fetcher),{revision:2,value:"new"});assert.equal(f.count(),2);assert.deepEqual(f.methods,["GET","GET"]);
 });
 await check("continuous writes stop after one recovery read, never serve a stale success",async()=>{
  const f=replies([{status:409,body:{code:"snapshot_changed",error:"moving"}},{status:409,body:{code:"snapshot_changed",error:"still moving"}}]);
  await assert.rejects(readJsonWithSnapshotRecovery("/api/dashboard","fallback",f.fetcher),/still moving/);assert.equal(f.count(),2);
 });
 for(const status of [401,403,500,503])await check(`HTTP ${status} is not automatically retried`,async()=>{
  const f=replies([{status,body:{code:"server_error",error:"failed"}}]);await assert.rejects(readJsonWithSnapshotRecovery("/api/dashboard","fallback",f.fetcher),/failed/);assert.equal(f.count(),1);
 });
 await check("ordinary 409 CAS conflict is not treated as a moving snapshot",async()=>{
  const f=replies([{status:409,body:{code:"fact_conflict"}}]);await assert.rejects(readJsonWithSnapshotRecovery("/api/data","fallback",f.fetcher),/fallback/);assert.equal(f.count(),1);
 });
 await check("transport failures propagate without retry",async()=>{
  let calls=0;const fetcher:typeof fetch=async()=>{calls++;throw new TypeError("transport failed");};await assert.rejects(readJsonWithSnapshotRecovery("/api/dashboard","fallback",fetcher),/transport failed/);assert.equal(calls,1);
 });
 console.log(`${passed} snapshot classification/recovery checks passed`);
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
