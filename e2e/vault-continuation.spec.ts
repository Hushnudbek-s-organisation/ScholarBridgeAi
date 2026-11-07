import {test,expect,type APIRequestContext} from "@playwright/test";
import {readFileSync} from "node:fs";
import {Client} from "pg";
const f=JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!,"utf8"));
type VaultRecord={id:number;status:string;reviewIdentity:string;title:string;fileName:string|null;verificationProvenance:string|null;usedBy:{applicationId:number}[]};

/** No remote database, real payment, provider upload or test-only API bypass.
 * SQL controls only the disposable fixture's entitlement and lock timing; all
 * document operations exercise the production HTTP routes and signed cookies. */
test("C11 vault Free/Pro, review CAS, every metadata edit, ownership, downgrade locks and rollback",async({page,browser})=>{
 test.setTimeout(120_000);
 const url=new URL(process.env.E2E_DATABASE_URL!);
 expect(url.hostname).toBe("127.0.0.1");expect(url.pathname).toMatch(/^\/sb_e2e_\d+$/);expect(f.fixtureProgramId).toBeTruthy();
 const db=new Client({connectionString:url.toString()}),adminContext=await browser.newContext();
 await db.connect();const admin=adminContext.request;
 const login=async(request:APIRequestContext,isAdmin=false)=>expect((await request.post("/api/auth/sign-in",{data:{email:isAdmin?f.adminEmail:f.studentEmail,password:isAdmin?f.adminPassword:f.studentPassword}})).status()).toBe(200);
 await login(page.request);await login(admin,true);
 const path="/api/vault/documents";
 let id:number|undefined,appId:number|undefined,otherAppId:number|undefined,missing=false;
 const patch=(data:Record<string,unknown>,request=page.request)=>request.patch(path,{data:{profileId:f.studentId,id,...data}});
 const record=async()=>{const response=await page.request.get(`${path}?profileId=${f.studentId}`);expect(response.status()).toBe(200);expect(response.headers()["cache-control"]).toContain("no-store");const body=await response.json();return body.documents.find((row:VaultRecord)=>row.id===id) as VaultRecord;};
 const review=async()=>{const current=await record();expect((await patch({status:"verified",expectedIdentity:current.reviewIdentity},admin)).status()).toBe(200);expect((await record()).status).toBe("verified");};
 try{
  await db.query("UPDATE student_profiles SET is_premium=false,premium_until=NULL WHERE id=$1",[f.studentId]);
  const app=await db.query("INSERT INTO applications(profile_id,university_name) VALUES($1,'FICTIONAL vault own application') RETURNING id",[f.studentId]);appId=app.rows[0].id;
  const other=await db.query("INSERT INTO applications(profile_id,university_name) VALUES($1,'FICTIONAL other owner application') RETURNING id",[f.otherProfileId]);otherAppId=other.rows[0].id;
  expect((await page.request.post(path,{data:{profileId:f.studentId,title:"FICTIONAL forged Pro",fileName:"file.pdf",isPremium:true,isAdmin:true}})).status()).toBe(403);
  const created=await page.request.post(path,{data:{profileId:f.studentId,title:"FICTIONAL vault matrix",docType:"passport",status:"verified",applicationIds:[appId]}});expect(created.status()).toBe(200);id=(await created.json()).document.id;
  expect((await record()).status).toBe("self_confirmed");
  expect((await patch({status:"verified",isAdmin:true})).status()).toBe(200);expect((await record()).verificationProvenance).toBe("self_confirmed");
  expect((await patch({profileId:f.otherProfileId,title:"forged owner"})).status()).toBe(403);
  const foreign=(await db.query("SELECT id FROM user_documents WHERE profile_id=$1 LIMIT 1",[f.otherProfileId])).rows[0].id;
  expect((await patch({id:foreign,title:"wrong document"})).status()).toBe(404);
  const before=await record();expect((await patch({title:"must roll back",applicationIds:[otherAppId]})).status()).toBe(403);expect((await record()).title).toBe(before.title);expect((await record()).usedBy.map(row=>row.applicationId)).toEqual([appId]);
  expect((await patch({fileUrl:"javascript:alert(1)"})).status()).toBe(400);
  expect((await patch({fileUrl:"https://user:password@example.test/file"})).status()).toBe(400);
  expect((await patch({status:"verified"},admin)).status()).toBe(409);
  await review();
  const workspace=await page.request.get(`/api/workspace?profileId=${f.studentId}&applicationId=${appId}`);expect(workspace.status()).toBe(200);expect((await workspace.json()).documents.find((row:VaultRecord)=>row.id===id).status).toBe("verified");
  await db.query("UPDATE student_profiles SET is_premium=true,premium_until=now()+interval '1 day' WHERE id=$1",[f.studentId]);
  const edits=[{title:"FICTIONAL changed title"},{docType:"transcript"},{verificationNote:"FICTIONAL changed metadata note"},{fileUrl:"https://fixture.example.test/private-link-not-a-secure-upload"},{fileName:"fixture.pdf"},{fileSizeBytes:123},{mimeType:"application/pdf"},{issuedAt:"2026-01-01"},{expiresAt:"2028-01-01"}];
  for(const edit of edits){
   const previous=await record();expect(previous.status).toBe("verified");expect((await patch(edit)).status()).toBe(200);
   const changed=await record();expect(changed.status).toBe("needs_update");expect(changed.reviewIdentity).not.toBe(previous.reviewIdentity);
   expect((await patch({status:"verified",expectedIdentity:previous.reviewIdentity},admin)).status()).toBe(409);
   await review();
  }
  const stale=await record();
  const race=await Promise.all([patch({title:"FICTIONAL concurrent edit"}),patch({status:"verified",expectedIdentity:stale.reviewIdentity},admin)]);
  expect(race[0].status()).toBe(200);expect([200,409]).toContain(race[1].status());expect((await record()).status).toBe("needs_update");
  const parallel=await Promise.all(Array.from({length:8},(_,index)=>patch({fileName:`fixture-${index}.pdf`})));expect(parallel.map(response=>response.status())).toEqual(Array(8).fill(200));
  const oldFile=(await record()).fileName;
  // The preflight sees old Pro MVCC state, but the in-transaction SHARE lock
  // must wait for the actual downgrade and then recheck on THAT connection.
  await db.query("BEGIN");await db.query("UPDATE student_profiles SET is_premium=false,premium_until=NULL WHERE id=$1",[f.studentId]);
  const pending=patch({fileName:"must-not-survive-downgrade.pdf"});
  await expect.poll(async()=>{await db.query("SELECT pg_stat_clear_snapshot()");return Number((await db.query("SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query ILIKE '%student_profiles%FOR SHARE%'")).rows[0].count);}).toBeGreaterThan(0);
  await db.query("COMMIT");expect((await pending).status()).toBe(403);expect((await record()).fileName).toBe(oldFile);
  await db.query("INSERT INTO subscriptions(profile_id,status,current_period_end) VALUES($1,'active',now()+interval '1 day')",[f.studentId]);
  expect((await patch({fileName:"subscription-only.pdf"})).status()).toBe(200);
  await db.query("BEGIN");await db.query("UPDATE subscriptions SET status='cancelled' WHERE profile_id=$1",[f.studentId]);
  const subscriptionPending=patch({fileName:"must-not-survive-cancellation.pdf"});
  await expect.poll(async()=>{await db.query("SELECT pg_stat_clear_snapshot()");return Number((await db.query("SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query ILIKE '%subscriptions%FOR SHARE%'")).rows[0].count);}).toBeGreaterThan(0);
  await db.query("COMMIT");expect((await subscriptionPending).status()).toBe(403);expect((await record()).fileName).toBe("subscription-only.pdf");
  // Metadata remains readable and removable after downgrade, but is not
  // magically a verified file, even in other production consumers.
  const search=await page.request.get(`/api/search?profileId=${f.studentId}&q=FICTIONAL`);expect(search.status()).toBe(200);expect(search.headers()["cache-control"]).toContain("no-store");
  const searchBody=await search.json();expect(JSON.stringify(searchBody)).toContain("needs_update");
  const unchanged=await record();
  await db.query("ALTER TABLE document_review_records RENAME TO document_review_records_fixture_unavailable");missing=true;
  const absent=await patch({status:"verified",expectedIdentity:unchanged.reviewIdentity},admin);expect(absent.status()).toBe(503);expect((await absent.json()).code).toBe("migration_pending");
  await db.query("ALTER TABLE document_review_records_fixture_unavailable RENAME TO document_review_records");missing=false;
  expect((await record()).status).toBe(unchanged.status);
  expect((await page.request.delete(`${path}?profileId=${f.studentId}&id=${id}`)).status()).toBe(200);id=undefined;
 }finally{
  await db.query("ROLLBACK");
  if(missing)await db.query("ALTER TABLE document_review_records_fixture_unavailable RENAME TO document_review_records");
  if(id)await db.query("DELETE FROM user_documents WHERE id=$1",[id]);
  await db.query("DELETE FROM applications WHERE id=ANY($1::int[])",[[appId,otherAppId].filter(Boolean)]);
  await db.query("DELETE FROM subscriptions WHERE profile_id=$1",[f.studentId]);
  await db.query("UPDATE student_profiles SET is_premium=true,premium_until=now()+interval '30 days' WHERE id=$1",[f.studentId]);
  await db.end();await adminContext.close();
 }
});
