import {test,expect,type APIRequestContext} from "@playwright/test";
import {readFileSync,mkdirSync,writeFileSync} from "node:fs";
import {randomUUID} from "node:crypto";
const f=JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!,"utf8"));
async function login(request:APIRequestContext,admin=false){const result=await request.post("/api/auth/sign-in",{data:{email:admin?f.adminEmail:f.studentEmail,password:admin?f.adminPassword:f.studentPassword}});expect(result.status()).toBe(200);}
/** Run with E2E_CONTINUATION_SCHEMA=1. The manifest proves it is the opted-in
 * disposable fixture; never silently skip this contract when schema is absent. */
test("real admin author -> exact manual group review -> profile/API grouped criteria and CAS",async({page,browser})=>{
 expect(f.fixtureProgramId).toBeTruthy();
 expect((await page.request.get("/api/admin/catalogue-facts")).status()).toBe(401);
 await login(page.request);
 expect((await page.request.get("/api/admin/catalogue-facts")).status()).toBe(403);
 expect((await page.request.post("/api/admin/catalogue-facts/review",{data:{confirmsAllLeaves:true}})).status()).toBe(403);
 const context=await browser.newContext(),admin=context.request;
 try{
  await login(admin,true);
  const group={id:"english",operator:"anyOf",label:"FICTIONAL fixture English alternatives",children:[{id:"ielts",kind:"minimum",field:"ielts",value:7,unit:"9"},{id:"toefl",operator:"allOf",children:[{id:"total",kind:"minimum",field:"toefl",value:5.5,unit:"6"},{id:"reading",kind:"minimum",field:"toefl.reading",value:5,unit:"6"}]}]};
  const draft={id:randomUUID(),entityType:"program",entityId:f.fixtureProgramId,fieldKey:"requirement_group",valueType:"official_requirement",valueText:JSON.stringify(group),sourceUrl:f.fixturePublisherUrl,applicantScope:"international",notes:"FICTIONAL isolated API proof, not admissions information"};
  const created=await admin.post("/api/admin/catalogue-facts",{data:draft});expect(created.status()).toBe(201);
  const stored=(await created.json()).fact;expect(stored.verification_status).toBe("review_needed");expect(stored.applicant_scope).toBe("international");
  expect((await admin.post("/api/admin/catalogue-facts",{data:draft})).status()).toBe(409);
  const quotation="FICTIONAL fixture: IELTS seven OR TOEFL five point five with reading five. International applicants only; this text is not a real admissions policy.";
  const review={id:draft.id,expectedVersion:String(stored.version),expectedFact:draft,sourceQuote:quotation,confirmsAllLeaves:true};
  expect((await admin.post("/api/admin/catalogue-facts/review",{data:{...review,expectedFact:{...draft,valueText:JSON.stringify({...group,operator:"allOf"})}}})).status()).toBe(409);
  const reviewed=await admin.post("/api/admin/catalogue-facts/review",{data:review});expect(reviewed.status()).toBe(200);
  const confirmed=await reviewed.json();expect(confirmed.officialPageReRead).toBe(false);expect(confirmed.reviewType).toBe("manual_source_attestation");expect(confirmed.fact.verification_status).toBe("verified");
  const profile=await page.request.put(`/api/profiles/${f.studentId}`,{data:{applicantContext:{citizenships:["UZ","US"],residency:"UZ",toefl:{score:5.5,scale:"6",examDate:"2026-02-01",validUntil:"2028-02-01",sections:{reading:5}},gpa:{value:4.5,minimum:1,maximum:5,country:"UZ",system:"FICTIONAL original scale"}}}});
  expect(profile.status()).toBe(200);
  const read=(await(await page.request.get(`/api/profiles/${f.studentId}`)).json()).profile;expect(read.applicantContext.toefl.score).toBe(5.5);expect(read.applicantContext.toefl.scale).toBe("6");expect(read.applicantContext.citizenships).toEqual(["UZ","US"]);
  const recommend=async(extra:Record<string,unknown>={})=>{const response=await page.request.post("/api/programs/recommend",{data:{profileId:f.studentId,interests:["Computer Science"],applicantScope:"international",...extra}});expect(response.status()).toBe(200);const result=await response.json();return result.results.find((row:{program:{id:number}})=>row.program.id===f.fixtureProgramId);};
  const first=await recommend();await test.info().attach("reviewed-group",{body:JSON.stringify({confirmed,first,now:new Date().toISOString()}),contentType:"application/json"});expect(first.eligibility.group.state).toBe("met");
  expect(first.assessment.context.applicantCategory).toBe("international");
  const saved = await page.request.put(`/api/profiles/${f.studentId}`, { data: {
    assessmentPreferences: { version: 1, country: { mode: "must", value: ["Germany"] } },
  } });
  expect(saved.status()).toBe(200);
  try {
    expect((await recommend()).assessment.preferenceFilters).toContainEqual(
      expect.objectContaining({ axis: "country", state: "pass" }),
    );
    expect((await recommend({ countries: ["Germany"] })).assessment.preferenceFilters).not.toContainEqual(
      expect.objectContaining({ axis: "country" }),
    );
    const scope = new URLSearchParams({
      profileId: String(f.studentId), programId: String(f.fixtureProgramId),
      admissionCycle: "2027", applicantScope: "international",
    });
    const detail = await page.request.get(`/api/universities/${f.verifiedUniversityId}?${scope}`);
    expect(detail.status()).toBe(200);
    const assessment = (await detail.json()).assessment;
    expect(assessment.programme.id).toBe(f.fixtureProgramId);
    expect(assessment.context).toMatchObject({ cycle: "2027", applicantCategory: "international" });
    expect(assessment.preferenceFilters).toContainEqual(expect.objectContaining({ axis: "country", state: "pass" }));
    expect(assessment.eligibility.checks).toContainEqual(expect.objectContaining({
      requirementId: "min_sat", sourceUrl: f.fixturePublisherUrl,
    }));
    scope.set("applicantScope", "domestic");
    const other = await page.request.get(`/api/universities/${f.verifiedUniversityId}?${scope}`);
    expect(other.status()).toBe(200);
    expect((await other.json()).assessment.eligibility.checks).not.toContainEqual(
      expect.objectContaining({ requirementId: "min_sat" }),
    );
  } finally {
    expect((await page.request.put(`/api/profiles/${f.studentId}`, { data: { assessmentPreferences: null } })).status()).toBe(200);
  }
  const unknown=await recommend({applicantScope:null});expect(unknown.eligibility.group).toBeUndefined();expect(unknown.eligibility.met).toBe(0);
  expect((await recommend({toefl:100})).eligibility.group.state).toBe("unknown");
  expect((await recommend({toefl:6,toeflScale:"6",toeflExamDate:"2024-01-01",toeflValidUntil:"2025-01-01"})).eligibility.group.state).toBe("unknown");
  const invalid=await page.request.put(`/api/profiles/${f.studentId}`,{data:{applicantContext:{toefl:{score:95,scale:"6"}}}});expect(invalid.status()).toBe(400);
  const edits=await Promise.all(["A","B"].map(notes=>admin.patch("/api/admin/catalogue-facts",{data:{...draft,notes,expectedVersion:String(confirmed.fact.version)}})));expect(edits.map(response=>response.status()).sort()).toEqual([200,409]);
  expect((await recommend()).eligibility.met).toBe(0);
  const listing=await(await admin.get("/api/admin/catalogue-facts")).json();expect(listing.facts.filter((row:{id:string})=>row.id===draft.id)).toHaveLength(1);
 }finally{await context.close();}
});

test("university discovery never synthesizes programmes; experimental index is explicit opt-in",async({page})=>{
 expect(f.fixtureProgramId).toBeTruthy();await login(page.request);
 const get=async(sort:string)=>await(await page.request.get(`/api/universities?profileId=${f.studentId}&sort=${sort}`)).json();
 const ordinary=await get("rank_asc"),rows=ordinary.universities;
 // The retired composite index is gone from the payload entirely — not
 // returned as null, which would invite a client to keep reading it.
 expect(rows.find((row:{id:number})=>row.id===f.verifiedUniversityId)).not.toHaveProperty("chanceScore");
 const noProgramme=rows.find((row:{id:number})=>row.id===f.unverifiedUniversityId);expect(noProgramme.programmeDiscovery.status).toBe("no_programmes");expect(noProgramme.programmeDiscovery.selectedProgrammeId).toBeNull();
 const experimental=await get("chance_desc"),actual=experimental.universities.find((row:{id:number})=>row.id===f.verifiedUniversityId);
 expect(actual.programmeDiscovery.selectedProgrammeId).toBe(f.fixtureProgramId);
 // No composite index exists to opt into any more, and no personal admission
 // probability is produced for any programme a student can see.
 expect(actual.programmeDiscovery.modelOptIn).toBe(false);
 expect(actual.programmeDiscovery.personalAdmissionProbability).toBeNull();
 expect(experimental.universities.find((row:{id:number})=>row.id===f.unverifiedUniversityId)).not.toHaveProperty("chanceScore");
});

/** Cross-persona API invariants. These are fictional profiles against the same
 * real fixture programme, NOT evidence about a real university or award. */
test("C14 persona matrix keeps originals, unknowns and no personal probability",async({page})=>{
 await login(page.request);
 const cases:{id:string;input:Record<string,unknown>}[]=[
  {id:"bachelor",input:{degreeLevel:"Bachelor"}},{id:"master",input:{degreeLevel:"Master"}},{id:"phd",input:{degreeLevel:"PhD"}},
  {id:"old-toefl",input:{toefl:100,toeflScale:"120",toeflExamDate:"2026-02-01",toeflValidUntil:"2028-02-01"}},
  {id:"new-toefl",input:{toefl:5.5,toeflScale:"6",toeflSections:{reading:5}}},
  {id:"optional-tests-absent",input:{sat:null,act:null,duolingo:null}},
  {id:"zero-budget-full-aid",input:{budgetUsd:0,fundingNeed:"full"}},
  {id:"strong-academic-low-budget",input:{gpa:4,gpaScale:4,ielts:9,budgetUsd:1}},
  {id:"sparse",input:{gpa:null,gpaScale:null,ielts:null,toefl:null,sat:null,act:null,countries:[],budgetUsd:null}},
  {id:"past-cycle-request",input:{startYear:2024}},{id:"one-country",input:{countries:["Germany"]}},
  {id:"other-major",input:{interests:["History"]}},{id:"optional-activity-disability-absent",input:{}},
  {id:"citizenship-not-destination",input:{citizenship:"JP",countries:["Germany"]}},
  {id:"unknown-test-scale",input:{toefl:100,toeflScale:null}},
  {id:"expired-test",input:{toefl:5.5,toeflScale:"6",toeflExamDate:"2024-01-01",toeflValidUntil:"2025-01-01"}},
 ];
 const summaries=[];
 for(const persona of cases){
  const response=await page.request.post("/api/programs/recommend",{data:{profileId:f.studentId,interests:["Computer Science"],...persona.input}});expect(response.status(),persona.id).toBe(200);
  const body=await response.json();expect(body.probability.available,persona.id).toBe(false);
  for(const row of body.results){expect(row.program.id).toBe(f.fixtureProgramId);expect(row.probability.available).toBe(false);expect(row.eligibility.unmet).toBe(0);expect(row.affordability.scholarshipMatches).toEqual([]);}
  if(persona.id==="zero-budget-full-aid")expect(body.inputs.budgetUsd.value).toBe(0);
  if(persona.id==="new-toefl"){expect(body.inputs.toefl.value).toBe(5.5);expect(body.inputs.toefl.scale).toBe("6");expect(body.inputs.toefl.sections.reading).toBe(5);}
  if(persona.id==="old-toefl"){expect(body.inputs.toefl.value).toBe(100);expect(body.inputs.toefl.scale).toBe("120");}
  if(persona.id==="sparse"){expect(body.inputs.gpa.value).toBeNull();expect(body.inputs.toefl.value).toBeNull();}
  summaries.push({persona:persona.id,inputs:body.inputs,results:body.results.map((row:{program:{id:number};degreeLevelMatch:string;eligibility:unknown;affordability:unknown})=>({programmeId:row.program.id,degreeLevelMatch:row.degreeLevelMatch,eligibility:row.eligibility,affordability:row.affordability}))});
 }
 mkdirSync("test-results/continuation-2026-11-07",{recursive:true});writeFileSync("test-results/continuation-2026-11-07/persona-matrix.json",JSON.stringify(summaries,null,2));
});
