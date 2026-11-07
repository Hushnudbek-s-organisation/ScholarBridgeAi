import assert from "node:assert/strict";
import type {Client} from "pg";
import type {OfficialSourceCheckResult,OfficialSourceTarget} from "../../src/lib/officialSourceAdapter";

export async function proveFactCAS(client:Client){
  const {persistOfficialSourceCheck,loadOfficialSourceTargets}=await import("../../src/lib/officialSourceAdapter.server");
  // The production loader is deliberately bounded to 200 due targets. UUID
  // order is random, so the chosen CAS fixture must be made deterministically
  // due rather than assuming it occurs in an arbitrary batch after pagination.
  await client.query("UPDATE official_source_checks SET checked_at='2000-01-01' WHERE entity_type='program' AND entity_id=211");
  const target=(await loadOfficialSourceTargets("all")).find(row=>row.entityId===211);
  assert.ok(target?.factId&&target.expectedVersion);
  const check=(target:OfficialSourceTarget):OfficialSourceCheckResult=>({...target,verificationSucceeded:true,officialPageReRead:true,evidencePresent:true,verifiedFact:`${target.fieldKey}=${target.expectedValue}`,evidenceExcerpt:"Fictional fixture only",httpStatus:200,reason:null,checkedAt:new Date().toISOString()});
  const snapshot=async()=>(await client.query("SELECT version::text,verified_at::text,unit,value_numeric::text,is_active FROM catalogue_facts WHERE id=$1",[target.factId])).rows[0];
  const a=check(target),b=check(target);
  await Promise.all([persistOfficialSourceCheck(a),persistOfficialSourceCheck(b)]);
  assert.equal([a,b].filter(row=>row.factApplied).length,1,"only one concurrent CAS wins");
  assert.equal([a,b].filter(row=>row.verificationSucceeded).length,1,"stale check is not a success");
  const after=await snapshot();
  assert.equal(after.version,String(Number(target.expectedVersion)+1));
  await client.query("UPDATE catalogue_facts SET value_numeric=95,unit='120',applicant_scope='international' WHERE id=$1",[target.factId]);
  const edited=await snapshot();
  const stale=check(target);await persistOfficialSourceCheck(stale);
  assert.equal(stale.factApplied,false);assert.equal(stale.verificationSucceeded,false);
  assert.deepEqual(await snapshot(),edited,"stale edit cannot change version/date/value");
  const current={...target,expectedVersion:edited.version,expectedValue:"95",unit:"120",applicantScope:"international"};
  const wrongScope=check({...current,applicantScope:"domestic"});await persistOfficialSourceCheck(wrongScope);assert.equal(wrongScope.factApplied,false);
  // Force failure AFTER the fact UPDATE, at audit INSERT. Both must roll back.
  await client.query("ALTER TABLE official_source_checks ADD CONSTRAINT fixture_reject_check CHECK(entity_id<>211) NOT VALID");
  await assert.rejects(()=>persistOfficialSourceCheck(check(current)));
  assert.deepEqual(await snapshot(),edited,"audit-insert failure rolls back the fact and revision");
  await client.query("ALTER TABLE official_source_checks DROP CONSTRAINT fixture_reject_check");
  const failed=check(current);failed.verificationSucceeded=false;failed.officialPageReRead=false;failed.reason="fixture source unavailable";
  await persistOfficialSourceCheck(failed);assert.deepEqual(await snapshot(),edited);
  await client.query("UPDATE catalogue_facts SET is_active=false WHERE id=$1",[target.factId]);
  const inactive=await snapshot();const inactiveCheck=check({...current,expectedVersion:inactive.version});await persistOfficialSourceCheck(inactiveCheck);
  assert.equal(inactiveCheck.factApplied,false);assert.deepEqual(await snapshot(),inactive);
  console.log("PASS C08: actual UUID/version/value/scope CAS, concurrent winner, stale edit, inactive fact, source failure and fact+check rollback.");
}
