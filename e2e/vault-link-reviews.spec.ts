import {test,expect,type APIRequestContext} from "@playwright/test";
import {readFileSync} from "node:fs";
import {Client} from "pg";
const f=JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!,"utf8"));
type DocumentRecord={id:number;title:string;status:string;reviewIdentity:string;usedBy:{applicationId:number}[]};

test("document review binds normalized application links, rejects stale review CAS, and rolls back link revisions",async({page,browser})=>{
 const url=new URL(process.env.E2E_DATABASE_URL!);expect(url.hostname).toBe("127.0.0.1");expect(url.pathname).toMatch(/^\/sb_e2e_\d+$/);
 const db=new Client({connectionString:url.toString()}),adminContext=await browser.newContext();await db.connect();
 const admin=adminContext.request;
 for(const [request,isAdmin] of [[page.request,false],[admin,true]] as const)expect((await request.post("/api/auth/sign-in",{data:{email:isAdmin?f.adminEmail:f.studentEmail,password:isAdmin?f.adminPassword:f.studentPassword}})).status()).toBe(200);
 const apps:number[]=[];let id:number|undefined;
 const path="/api/vault/documents";
 const patch=(data:Record<string,unknown>,request:APIRequestContext=page.request)=>request.patch(path,{data:{profileId:f.studentId,id,...data}});
 const record=async()=>{const response=await page.request.get(`${path}?profileId=${f.studentId}`);expect(response.status()).toBe(200);return (await response.json()).documents.find((d:DocumentRecord)=>d.id===id) as DocumentRecord;};
 const review=async()=>{const current=await record();expect((await patch({status:"verified",expectedIdentity:current.reviewIdentity},admin)).status()).toBe(200);expect((await record()).status).toBe("verified");};
 const revision=async()=>Number((await db.query("SELECT revision FROM cache_revisions WHERE scope=$1",[`documents:${f.studentId}`])).rows[0]?.revision??1);
 try{
  for(const owner of [f.studentId,f.studentId,f.otherProfileId])apps.push((await db.query("INSERT INTO applications(profile_id,university_name) VALUES($1,'FICTIONAL link review fixture') RETURNING id",[owner])).rows[0].id);
  const [a,b,foreign]=apps;
  const created=await page.request.post(path,{data:{profileId:f.studentId,title:"FICTIONAL link-bound document",docType:"passport",applicationIds:[a]}});expect(created.status()).toBe(200);id=(await created.json()).document.id;
  await review();let previous=await record();
  for(const applicationIds of [null,"bad",[null],[true],[0],[-1],[1.5],["oops"]])expect((await patch({applicationIds})).status()).toBe(400);
  expect((await record()).status).toBe("verified");
  expect((await patch({applicationIds:[a,a]})).status()).toBe(200);expect((await record()).reviewIdentity).toBe(previous.reviewIdentity);expect((await record()).status).toBe("verified");
  expect((await patch({applicationIds:[b,a]})).status()).toBe(200);
  let changed=await record();expect(changed.status).toBe("needs_update");expect(changed.reviewIdentity).not.toBe(previous.reviewIdentity);
  expect((await patch({status:"verified",expectedIdentity:previous.reviewIdentity},admin)).status()).toBe(409);
  await review();previous=await record();
  expect((await patch({applicationIds:[a,b,b]})).status()).toBe(200);expect((await record()).status).toBe("verified");expect((await record()).reviewIdentity).toBe(previous.reviewIdentity);
  const workspace=await page.request.get(`/api/workspace?profileId=${f.studentId}&applicationId=${b}`);expect(workspace.status()).toBe(200);expect((await workspace.json()).documents.find((d:DocumentRecord)=>d.id===id).status).toBe("verified");
  expect((await patch({applicationIds:[]})).status()).toBe(200);changed=await record();expect(changed.status).toBe("needs_update");expect(changed.reviewIdentity).not.toBe(previous.reviewIdentity);
  await review();previous=await record();
  expect((await patch({applicationIds:[foreign],title:"must not commit"})).status()).toBe(403);expect(await record()).toMatchObject({title:previous.title,status:"verified",reviewIdentity:previous.reviewIdentity});
  const race=await Promise.all([patch({applicationIds:[a]}),patch({status:"verified",expectedIdentity:previous.reviewIdentity},admin)]);
  expect(race[0].status()).toBe(200);expect([200,409]).toContain(race[1].status());expect((await record()).status).toBe("needs_update");
  await review();previous=await record();const beforeRevision=await revision();
  // A direct relationship writer must invalidate the shared revision in the
  // SAME transaction. Rollback restores both the link and the revision.
  await db.query("BEGIN");await db.query("DELETE FROM application_document_links WHERE document_id=$1",[id]);expect(await revision()).toBeGreaterThan(beforeRevision);await db.query("ROLLBACK");
  expect(await revision()).toBe(beforeRevision);expect((await record()).status).toBe("verified");
  // Bind usage metadata too, not only application IDs or updatedAt timestamps.
  await db.query("UPDATE application_document_links SET usage='submitted' WHERE document_id=$1",[id]);
  changed=await record();expect(changed.status).toBe("needs_update");expect(changed.reviewIdentity).not.toBe(previous.reviewIdentity);
  expect((await patch({status:"verified",expectedIdentity:previous.reviewIdentity},admin)).status()).toBe(409);
  const changedWorkspace=await page.request.get(`/api/workspace?profileId=${f.studentId}&applicationId=${a}`);expect(changedWorkspace.status()).toBe(200);expect((await changedWorkspace.json()).documents.find((d:DocumentRecord)=>d.id===id).status).toBe("needs_update");
 }finally{
  await db.query("ROLLBACK");if(id)await db.query("DELETE FROM user_documents WHERE id=$1",[id]);if(apps.length)await db.query("DELETE FROM applications WHERE id=ANY($1::int[])",[apps]);await db.end();await adminContext.close();
 }
});
