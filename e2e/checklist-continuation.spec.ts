import {test,expect,type APIRequestContext} from "@playwright/test";
import {readFileSync} from "node:fs";
import {randomUUID} from "node:crypto";
import {Client} from "pg";
const f=JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!,"utf8"));

/** All SQL is fixture setup/failure injection in the asserted disposable local
 * PG. Policy author/review, profile, checklist and workspace use production HTTP. */
test("checklist and workspace share scoped programme criteria, units, provenance, refresh and atomic generation",async({page,browser})=>{
 test.setTimeout(150_000);
 const url=new URL(process.env.E2E_DATABASE_URL!);expect(url.hostname).toBe("127.0.0.1");expect(url.pathname).toMatch(/^\/sb_e2e_\d+$/);expect(f.fixtureProgramId).toBeTruthy();
 const db=new Client({connectionString:url.toString()}),adminContext=await browser.newContext();await db.connect();
 const login=async(request:APIRequestContext,admin=false)=>expect((await request.post("/api/auth/sign-in",{data:{email:admin?f.adminEmail:f.studentEmail,password:admin?f.adminPassword:f.studentPassword}})).status()).toBe(200);
 await login(page.request);await login(adminContext.request,true);
 const originalResponse=await page.request.get(`/api/profiles/${f.studentId}`);expect(originalResponse.status()).toBe(200);const originalProfile=(await originalResponse.json()).profile;
 const admin=adminContext.request,id=randomUUID(),appIds:number[]=[];let templateId:number|undefined,trigger=false;
 try{
  const programme=(await db.query("SELECT name FROM programs WHERE id=$1",[f.fixtureProgramId])).rows[0];
  const group={id:"published",label:"FICTIONAL published entry criteria",operator:"allOf",children:[{id:"gpa",label:"Original GPA",kind:"minimum",field:"gpa",value:3.5,unit:"4"},{id:"english",label:"English alternatives",operator:"anyOf",children:[{id:"ielts",label:"IELTS",kind:"minimum",field:"ielts",value:7,unit:"9"},{id:"toefl",label:"TOEFL",kind:"minimum",field:"toefl",value:5.5,unit:"6",requireValid:true}]}]};
  const draft={id,entityType:"program",entityId:f.fixtureProgramId,fieldKey:"requirement_group",valueType:"official_requirement",valueText:JSON.stringify(group),sourceUrl:f.fixturePublisherUrl,admissionCycle:"2027",programName:programme.name,degreeLevel:"Bachelor",notes:"FICTIONAL disposable checklist fixture"};
  const created=await admin.post("/api/admin/catalogue-facts",{data:draft});expect(created.status()).toBe(201);const stored=(await created.json()).fact;
  const reviewed=await admin.post("/api/admin/catalogue-facts/review",{data:{id,expectedVersion:String(stored.version),expectedFact:draft,sourceQuote:"FICTIONAL fixture: original four point GPA minimum three point five AND IELTS seven OR six scale TOEFL five point five with valid dates. This is not a real university policy.",confirmsAllLeaves:true}});expect(reviewed.status()).toBe(200);const confirmed=(await reviewed.json()).fact;
  const saveProfile=async(five=false)=>expect((await page.request.put(`/api/profiles/${f.studentId}`,{data:{ieltsScore:7.5,applicantContext:{gpa:five?{value:4.5,minimum:1,maximum:5,conversion:{method:"proportional_planning",value:3.9}}:{value:3.8,minimum:0,maximum:4},toefl:{score:5.5,scale:"6",examDate:"2026-02-01",validUntil:"2028-02-01"}}}})).status()).toBe(200);
  await saveProfile();
  for(const name of [programme.name,null,"FICTIONAL no such programme"]){const result=await db.query("INSERT INTO applications(profile_id,university_id,university_name,program_name,intake_term) VALUES($1,$2,'FICTIONAL checklist university',$3,'2027') RETURNING id",[f.studentId,f.verifiedUniversityId,name]);appIds.push(result.rows[0].id);}
  const path=(appId=appIds[0])=>`/api/requirements?profileId=${f.studentId}&applicationId=${appId}`;
  const read=async(appId=appIds[0])=>{const response=await page.request.get(path(appId));expect(response.status()).toBe(200);return response.json();};
  const parallel=await Promise.all(Array.from({length:6},()=>read()));
  for(const body of parallel){const policy=body.requirements.find((row:{itemKey:string})=>row.itemKey==="published.requirement_group");expect(policy.status).toBe("done");expect(policy.sourceUrl).toBe(f.fixturePublisherUrl);expect(policy.verificationStatus).toBe("verified");expect(policy.instructions).toContain("English alternatives: met");expect(body.requirements.some((row:{itemKey:string})=>row.itemKey==="english.toefl")).toBe(false);}
  expect((await db.query("SELECT item_key,count(*) FROM application_requirements WHERE application_id=$1 GROUP BY item_key HAVING count(*)>1",[appIds[0]])).rows).toHaveLength(0);
  for(const appId of appIds.slice(1)){const body=await read(appId);expect(body.requirements.some((row:{itemKey:string})=>row.itemKey==="published.requirement_group")).toBe(false);expect(body.requirements.some((row:{itemKey:string})=>row.itemKey==="academic.gpa")).toBe(false);}
  const initial=parallel[0],policy=initial.requirements.find((row:{itemKey:string})=>row.itemKey==="published.requirement_group");
  expect((await page.request.patch("/api/requirements",{data:{profileId:f.studentId,applicationId:appIds[0],id:policy.id,status:"done"}})).status()).toBe(409);
  const manual=initial.requirements.find((row:{itemKey:string})=>row.itemKey!=="published.requirement_group");expect(manual).toBeTruthy();
  expect((await page.request.patch("/api/requirements",{data:{profileId:f.studentId,applicationId:appIds[0],id:manual.id,status:"done"}})).status()).toBe(200);
  await saveProfile(true);
  const changed=await read();expect(changed.requirements.find((row:{id:number})=>row.id===policy.id).status).toBe("todo");expect(changed.requirements.find((row:{id:number})=>row.id===manual.id).status).toBe("done");
  const rec=await page.request.post("/api/programs/recommend",{data:{profileId:f.studentId,interests:["Computer Science"],startYear:2027}});expect(rec.status()).toBe(200);expect((await rec.json()).results.find((row:{program:{id:number}})=>row.program.id===f.fixtureProgramId).eligibility.group.state).toBe("unknown");
  await saveProfile();
  const workspace=await page.request.get(`/api/workspace?profileId=${f.studentId}&applicationId=${appIds[0]}`);expect(workspace.status()).toBe(200);expect((await workspace.json()).requirements.find((row:{id:number})=>row.id===policy.id).status).toBe("done");
  // A refresh updates derived metadata then inserts a newly published task.
  // Force that insertion to fail: BOTH changes must roll back together.
  templateId=(await db.query("INSERT INTO requirement_templates(university_id,section,item_key,title,is_required,verification_status) VALUES($1,'documents','fixture.rollback','FICTIONAL atomic checklist fixture',true,'verified') RETURNING id",[f.verifiedUniversityId])).rows[0].id;
  await saveProfile(true);
  await db.query("CREATE FUNCTION fixture_checklist_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.item_key='fixture.rollback' THEN RAISE EXCEPTION 'FICTIONAL injected rollback'; END IF; RETURN NEW; END $$");
  await db.query("CREATE TRIGGER fixture_checklist_fail BEFORE INSERT ON application_requirements FOR EACH ROW EXECUTE FUNCTION fixture_checklist_fail()");trigger=true;
  const failed=await page.request.post("/api/requirements",{data:{profileId:f.studentId,applicationId:appIds[0]}});expect(failed.status()).toBe(500);
  expect((await db.query("SELECT status FROM application_requirements WHERE id=$1",[policy.id])).rows[0].status).toBe("done");
  expect((await db.query("SELECT id FROM application_requirements WHERE application_id=$1 AND item_key='fixture.rollback'",[appIds[0]])).rows).toHaveLength(0);
  await db.query("DROP TRIGGER fixture_checklist_fail ON application_requirements; DROP FUNCTION fixture_checklist_fail()");trigger=false;
  expect((await page.request.post("/api/requirements",{data:{profileId:f.studentId,applicationId:appIds[0]}})).status()).toBe(200);
  expect((await read()).requirements.find((row:{id:number})=>row.id===policy.id).status).toBe("todo");
  expect((await admin.patch("/api/admin/catalogue-facts",{data:{...draft,notes:"FICTIONAL changed policy needs a new review",expectedVersion:String(confirmed.version)}})).status()).toBe(200);
  const withdrawn=await read(),saved=withdrawn.requirements.find((row:{id:number})=>row.id===policy.id);expect(saved.status).toBe("todo");expect(saved.verificationStatus).toBe("needs_review");expect(saved.instructions).toContain("not recorded");
  await test.info().attach("checklist-contract-summary",{body:JSON.stringify({parallelLoads:6,exactProgramme:true,legacyMinimaUnknown:true,nativeGpaPositive:true,planningGpaUnknown:true,groupStateParity:true,manualCompletionPreserved:true,rollback:true,recovery:true,reviewWithdrawal:true}),contentType:"application/json"});
 }finally{
  if(trigger)await db.query("DROP TRIGGER IF EXISTS fixture_checklist_fail ON application_requirements; DROP FUNCTION IF EXISTS fixture_checklist_fail()");
  await db.query("DELETE FROM applications WHERE id=ANY($1::int[])",[appIds]);
  if(templateId)await db.query("DELETE FROM requirement_templates WHERE id=$1",[templateId]);
  await db.query("DELETE FROM catalogue_facts WHERE id=$1",[id]);
  // Other specs deliberately start from the fixture's low IELTS record.
  // Restore only this test's profile edits rather than making test order matter.
  expect((await page.request.put(`/api/profiles/${f.studentId}`,{data:{ieltsScore:originalProfile.ieltsScore,gpa:originalProfile.gpa,gpaScale:originalProfile.gpaScale,toeflScore:originalProfile.toeflScore,applicantContext:originalProfile.applicantContext}})).status()).toBe(200);
  await adminContext.close();await db.end();
 }
});
