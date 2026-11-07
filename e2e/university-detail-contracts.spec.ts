import {test,expect} from "@playwright/test";
import {readFileSync,mkdirSync} from "node:fs";
import {randomUUID} from "node:crypto";
import {Client} from "pg";
import en from "../src/i18n/messages/en.json";
import uz from "../src/i18n/messages/uz.json";
import ru from "../src/i18n/messages/ru.json";
const f=JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!,"utf8"));

/** SQL only creates/deactivates FICTIONAL evidence in the asserted disposable
 * database. Group authorship/review and every consumer read use production HTTP. */
test("detail shares exact scope, native units, conflict/unknown and real-programme opt-in contracts",async({page,browser})=>{
 test.setTimeout(120_000);
 const url=new URL(process.env.E2E_DATABASE_URL!);expect(url.hostname).toBe("127.0.0.1");expect(url.pathname).toMatch(/^\/sb_e2e_\d+$/);
 const db=new Client({connectionString:url.toString()});await db.connect();
 const ids=[randomUUID(),randomUUID(),randomUUID(),randomUUID(),randomUUID()];
 const adminContext=await browser.newContext();
 try{
  const programme=(await db.query("SELECT name,degree_level AS degree FROM programs WHERE id=$1 AND university_id=$2",[f.fixtureProgramId,f.verifiedUniversityId])).rows[0];expect(programme).toBeTruthy();
  expect((await page.request.post("/api/auth/sign-in",{data:{email:f.studentEmail,password:f.studentPassword}})).status()).toBe(200);
  expect((await adminContext.request.post("/api/auth/sign-in",{data:{email:f.adminEmail,password:f.adminPassword}})).status()).toBe(200);
  for(const [index,field,value,unit] of [[0,"min_toefl",5.5,"6"],[1,"min_gpa",85,"100"]] as const){
   await db.query("INSERT INTO catalogue_facts(id,entity_type,entity_id,field_key,value_numeric,unit,program_name,degree_level,admission_cycle,applicant_scope,source_url,verification_status,value_type,verified_at,is_active) VALUES($1,'program',$2,$3,$4,$5,$6,$7,'2027','international',$8,'verified','official_requirement',now(),true)",[ids[index],f.fixtureProgramId,field,value,unit,programme.name,programme.degree,f.fixturePublisherUrl]);
  }
  const group={id:"detail-english",label:"FICTIONAL detail English alternatives",operator:"anyOf",children:[{id:"ielts",label:"IELTS",kind:"minimum",field:"ielts",value:7,unit:"9"},{id:"toefl",label:"TOEFL",kind:"minimum",field:"toefl",value:5.5,unit:"6"}]};
  const draft={id:ids[2],entityType:"program",entityId:f.fixtureProgramId,fieldKey:"requirement_group",valueType:"official_requirement",valueText:JSON.stringify(group),programName:programme.name,degreeLevel:programme.degree,admissionCycle:"2027",applicantScope:"international",sourceUrl:f.fixturePublisherUrl,notes:"FICTIONAL local detail proof; not real admissions information"};
  const created=await adminContext.request.post("/api/admin/catalogue-facts",{data:draft});expect(created.status()).toBe(201);const stored=(await created.json()).fact;
  expect((await adminContext.request.post("/api/admin/catalogue-facts/review",{data:{id:ids[2],expectedVersion:String(stored.version),expectedFact:draft,sourceQuote:"FICTIONAL source quotation: IELTS seven OR TOEFL five point five on the original six scale for the international 2027 cycle only. Not a real admissions policy.",confirmsAllLeaves:true}})).status()).toBe(200);
  const path=`/api/universities/${f.verifiedUniversityId}?profileId=${f.studentId}`;
  const read=async(query="")=>{const r=await page.request.get(path+query);expect(r.status()).toBe(200);return r.json();};
  const ordinary=await read();expect(ordinary.chance).toBeNull();expect(ordinary.universityRequirements.toefl).toBeNull();expect(ordinary.programs.find((p:{id:number})=>p.id===f.fixtureProgramId).minToefl).toBeNull();
  const scope=`&programId=${f.fixtureProgramId}&admissionCycle=2027&applicantScope=international`;
  const scoped=await read(scope),row=scoped.programs.find((p:{id:number})=>p.id===f.fixtureProgramId);
  expect(row.minToefl).toBe(5.5);expect(row.minToeflScale).toBe("6");expect(row.minGpa).toBe(85);expect(row.minGpaScale).toBe("100");expect(scoped.universityRequirements.toefl.single).toBe(5.5);expect(scoped.universityRequirements.toefl.unit).toBe("6");expect(row.requirementGroup.value).toBe(JSON.stringify(group));
  expect(scoped.university.minGpa).toBeNull();expect(scoped.evidence.minGpa.trust).toMatch(/unknown/);expect(Array.isArray(row.recordedRequirements)).toBe(true);expect(row.recordedRequirements.every((r:{evidence:{isOfficialMinimum:boolean}})=>!r.evidence.isOfficialMinimum)).toBe(true);
  const unknown=await read(scope.replace("2027","Fall%202027"));expect(unknown.universityRequirements.toefl).toBeNull();expect(unknown.programs.find((p:{id:number})=>p.id===f.fixtureProgramId).requirementGroup).toBeNull();
  const absent=await read(`&programId=${f.fixtureProgramId}&admissionCycle=2027`);expect(absent.universityRequirements.toefl).toBeNull();
  expect((await read(scope)).universityRequirements.toefl.single).toBe(5.5);
  // An exemption is policy evidence, not merely a draft's value_type marker.
  await db.query("INSERT INTO catalogue_facts(id,entity_type,entity_id,field_key,program_name,degree_level,admission_cycle,applicant_scope,source_url,verification_status,value_type,verified_at,is_active) VALUES($1,'program',$2,'min_sat',$3,$4,'2027','international',$5,'verified','not_applicable',now(),true)",[ids[4],f.fixtureProgramId,programme.name,programme.degree,f.fixturePublisherUrl]);
  expect((await read(scope)).universityRequirements.evidence.sat.valueType).toBe("not_applicable");
  await db.query("UPDATE catalogue_facts SET verification_status='review_needed' WHERE id=$1",[ids[4]]);
  expect((await read(scope)).universityRequirements.evidence.sat.valueType).toBe("unknown");
  await db.query("UPDATE catalogue_facts SET is_active=false WHERE id=$1",[ids[4]]);
  // Same helper and opt-in as the list; opening a detail does not opt in.
  const list=(await(await page.request.get(`/api/universities?profileId=${f.studentId}&sort=chance_desc`)).json()).universities.find((p:{id:number})=>p.id===f.verifiedUniversityId);
  const opt=await read("&sort=chance_desc");expect(opt.chance.score).toBe(list.chanceScore);expect(opt.programmeDiscovery).toEqual(list.programmeDiscovery);expect(opt.programmeDiscovery.selectedProgrammeId).toBe(f.fixtureProgramId);
  expect(list.academicRequirements.summary).toEqual(ordinary.university.academicRequirements.summary);
  expect(list.academicRequirements.evidence).toEqual(ordinary.university.academicRequirements.evidence);
  const noProgramme=await page.request.get(`/api/universities/${f.unverifiedUniversityId}?profileId=${f.studentId}&sort=chance_desc`);expect(noProgramme.status()).toBe(200);const no=await noProgramme.json();expect(no.chance).toBeNull();expect(no.programmeDiscovery.status).toBe("no_programmes");
  expect((await page.request.get(path+"&programId=2147483647")).status()).toBe(400);
  expect((await page.request.get(path+"&applicantScope=%0Ainvalid")).status()).toBe(400);
  const profileBefore=(await(await page.request.get(`/api/profiles/${f.studentId}`)).json()).profile;
  expect((await page.request.put(`/api/profiles/${f.studentId}`,{data:{applicantContext:{gpa:{value:90,minimum:0,maximum:100},toefl:{score:5.5,scale:"6",examDate:"2026-02-01",validUntil:"2028-02-01"}}}})).status()).toBe(200);
  try{
  // The same programme envelope must drive Program Match, including native
  // 100-scale GPA independent of the reviewed English OR. No legacy row exists.
  const matched=async(gpa:number|null)=>{
   const response=await page.request.post("/api/programs/recommend",{data:{profileId:f.studentId,interests:["Computer Science"],applicantScope:"international",gpa,gpaScale:100,gpaMinimum:0,ielts:7.5}});
   expect(response.status()).toBe(200);const result=await response.json();const row=result.results.find((value:{program:{id:number}})=>value.program.id===f.fixtureProgramId);expect(row).toBeTruthy();return row;
  };
  expect((await matched(90)).eligibility.group.state).toBe("met");
  expect((await matched(80)).eligibility.group.state).toBe("unmet");
  expect((await matched(null)).eligibility.group.state).toBe("unknown");
  // Native values remain visible in the REAL localized detail; no API mock.
  const out="test-results/continuation-2026-11-07/detail-screens";mkdirSync(out,{recursive:true});
  for(const locale of ["en","uz","ru"]){
   await page.context().addCookies([{name:"scholarbridge_locale",value:locale,url:process.env.E2E_BASE_URL!}]);
   await page.setViewportSize({width:390,height:844});await page.goto("/#universities/search");await page.reload();
   const copy=({en,uz,ru} as const)[locale as "en"|"uz"|"ru"];
   const open=page.getByRole("button",{name:copy.university.exViewUniversity,exact:true});
   await expect(open.first()).toBeVisible();
   const card=page.locator(`[data-university-id="${f.verifiedUniversityId}"]`);
   await expect(card.getByText(f.verifiedUniversityName,{exact:true})).toBeVisible();
   await card.getByRole("button",{name:copy.university.exViewUniversity,exact:true}).click();
   const programmeSelect=page.locator("#university-requirement-programme");await expect(programmeSelect).toBeVisible();await programmeSelect.focus();await programmeSelect.selectOption(String(f.fixtureProgramId));
   await expect(programmeSelect.locator("..").locator("..")).toHaveAttribute("aria-busy","false");await expect(programmeSelect).toBeFocused();
   await expect(page.locator("#university-requirement-cycle")).toBeVisible();await page.locator("#university-requirement-cycle").selectOption("2027");await expect(page.locator("#university-requirement-cycle").locator("..").locator("..")).toHaveAttribute("aria-busy","false");
   await expect(page.locator("#university-requirement-applicants")).toBeVisible();await page.locator("#university-requirement-applicants").selectOption("international");await expect(page.locator("#university-requirement-applicants").locator("..").locator("..")).toHaveAttribute("aria-busy","false");
   await expect(page.getByText("5.5 / 6",{exact:true}).first()).toBeVisible();await expect(page.getByText("85 / 100",{exact:true}).first()).toBeVisible();
   await expect(page.getByText("FICTIONAL detail English alternatives",{exact:true}).first()).toBeVisible();
   await expect(page.locator("[data-decision-eligibility=partial]")).toHaveCount(1);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
   await page.locator("#university-requirement-programme").scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/native-scope-${locale}-390.png`,animations:"disabled"});
   if(locale==="en"){
    // Explicit HTTP fault only, never a mocked fact. Old scoped success must
    // disappear, selectors remain reachable, and Retry must do a real read.
    await page.route(`**/api/universities/${f.verifiedUniversityId}?**`,route=>route.fulfill({status:503,contentType:"application/json",body:JSON.stringify({error:"FICTIONAL one-shot read fault"})}),{times:1});
    await page.locator("#university-requirement-cycle").selectOption("");
    await expect(page.getByRole("alert").filter({hasText:copy.university.loadFailed})).toBeVisible();
    await expect(page.getByText("5.5 / 6",{exact:true})).toHaveCount(0);
    await expect(programmeSelect).toBeEnabled();await expect(page.locator("[data-decision-eligibility=unknown]")).toHaveCount(1);
    await page.getByRole("button",{name:copy.university.exTryAgain,exact:true}).click();
    await expect(page.getByRole("alert").filter({hasText:copy.university.loadFailed})).toHaveCount(0);
    await page.locator("#university-requirement-cycle").selectOption("2027");
    await expect(page.getByText("5.5 / 6",{exact:true}).first()).toBeVisible();
    // Real profile mutation + reload: English remains met, but GPA must now
    // make the rendered pill a shortfall, not the old English-only success.
    const nativeContext={gpa:{value:80,minimum:0,maximum:100},toefl:{score:5.5,scale:"6",examDate:"2026-02-01",validUntil:"2028-02-01"}};
    expect((await page.request.put(`/api/profiles/${f.studentId}`,{data:{applicantContext:nativeContext}})).status()).toBe(200);
    await page.reload();
    await page.locator(`[data-university-id="${f.verifiedUniversityId}"]`).getByRole("button",{name:copy.university.exViewUniversity,exact:true}).click();
    for(const [selector,value] of [["#university-requirement-programme",String(f.fixtureProgramId)],["#university-requirement-cycle","2027"],["#university-requirement-applicants","international"]]){
     await page.locator(selector).selectOption(value);await expect(page.locator(selector).locator("..").locator("..")).toHaveAttribute("aria-busy","false");
    }
    await expect(page.locator("[data-decision-eligibility=not_met]")).toHaveCount(1);
    expect((await page.request.put(`/api/profiles/${f.studentId}`,{data:{applicantContext:{...nativeContext,gpa:{...nativeContext.gpa,value:90}}}})).status()).toBe(200);
   }

  }
  }finally{expect((await page.request.put(`/api/profiles/${f.studentId}`,{data:{applicantContext:profileBefore.applicantContext??null}})).status()).toBe(200);}
  // Equal-priority conflicting peer must be unknown, not legacy fallback.
  await db.query("INSERT INTO catalogue_facts(id,entity_type,entity_id,field_key,value_numeric,unit,program_name,degree_level,admission_cycle,applicant_scope,source_url,verification_status,value_type,verified_at,is_active) VALUES($1,'program',$2,'min_toefl',6,'6',$3,$4,'2027','international',$5,'verified','official_requirement',now(),true)",[ids[3],f.fixtureProgramId,programme.name,programme.degree,f.fixturePublisherUrl]);
  expect((await read(scope)).universityRequirements.toefl).toBeNull();
  await db.query("UPDATE catalogue_facts SET is_active=false WHERE id=ANY($1::uuid[])",[[ids[0],ids[3]]]);expect((await read(scope)).universityRequirements.toefl).toBeNull();
  const changed=await adminContext.request.patch("/api/admin/catalogue-facts",{data:{...draft,notes:"FICTIONAL withdrawn review",expectedVersion:String((await(await adminContext.request.get('/api/admin/catalogue-facts')).json()).facts.find((p:{id:string})=>p.id===ids[2]).version)}});expect(changed.status()).toBe(200);
  expect((await read(scope)).programs.find((p:{id:number})=>p.id===f.fixtureProgramId).requirementGroup).toBeNull();
  await test.info().attach("detail-contract-summary",{body:JSON.stringify({exactScope:true,nativeToefl6:true,nativeGpa100:true,noSyntheticProgramme:true,modelOptIn:true,localizedMobile:["en","uz","ru"],conflictUnknown:true,inactiveUnknown:true,reviewWithdrawal:true}),contentType:"application/json"});
 }finally{await db.query("DELETE FROM catalogue_facts WHERE id=ANY($1::uuid[])",[ids]);await adminContext.close();await db.end();}
});
