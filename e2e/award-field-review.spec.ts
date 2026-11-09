import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import type {SavedUniCoverage,AwardApplicability} from '../src/lib/savedUniCoverage';
type CoverageRow={id:number|string;coverageState:AwardApplicability;coverageAssessment:SavedUniCoverage};
type CoverageResponse={scholarships?:CoverageRow[];recommended?:{scholarships:CoverageRow[]};queue?:CoverageRow[];items?:CoverageRow[]};
const f=JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!,'utf8'));
test('exact admin award-field reviews feed actual scoped coverage in four APIs and a stale edit loses verification',async({request,playwright})=>{
 const url=new URL(process.env.E2E_DATABASE_URL!);expect(url.hostname).toBe('127.0.0.1');expect(url.pathname).toMatch(/^\/sb_e2e_\d+$/);
 const db=new Pool({connectionString:url.toString()}),ids:string[]=[];
 const hadSaved=(await db.query('SELECT id FROM saved_universities WHERE profile_id=$1 AND university_id=$2',[f.studentId,f.verifiedUniversityId])).rows.length>0;
 const original=(await db.query('SELECT verification_status,degree_levels FROM scholarships WHERE id=$1',[f.scholarshipId])).rows[0];
 const programme=(await db.query('SELECT name,degree_level AS degree FROM programs WHERE id=$1',[f.fixtureProgramId])).rows[0];expect(programme).toBeTruthy();
 const admin=await playwright.request.newContext({baseURL:process.env.E2E_BASE_URL});
 try{
  const endpoint='/api/admin/catalogue-facts/review';
  expect((await request.post(endpoint,{data:{}})).status()).toBe(401);
  expect((await request.post('/api/auth/sign-in',{data:{email:f.studentEmail,password:f.studentPassword}})).status()).toBe(200);
  expect((await request.post(endpoint,{data:{}})).status()).toBe(403);
  expect((await admin.post('/api/auth/sign-in',{data:{email:f.adminEmail,password:f.adminPassword}})).status()).toBe(200);
  await db.query("UPDATE scholarships SET degree_levels='[\"Bachelor\"]',verification_status='verified' WHERE id=$1",[f.scholarshipId]);
  expect([200,201]).toContain((await request.post('/api/saved-universities',{data:{profileId:f.studentId,universityId:f.verifiedUniversityId}})).status());
  const fields:[string,number|string][]=[['university_id',f.verifiedUniversityId],['program_id',f.fixtureProgramId],['scope_complete','documented_complete'],['eligible_citizenships','["*"]'],['eligible_residencies','["*"]'],['requirement_group',JSON.stringify({id:'other-criteria',operator:'not_applicable'})],['tuition_coverage','full'],['total_cost_coverage','full']];
  let first:{draft:Record<string,unknown>;version:string}|undefined;
  for(const [field,value] of fields){
   const id=randomUUID();ids.push(id);
   const draft={id,entityType:'scholarship',entityId:f.scholarshipId,fieldKey:field,valueType:'official_requirement',valueNumeric:typeof value==='number'?value:null,valueText:typeof value==='string'?value:null,programName:programme.name,degreeLevel:programme.degree,admissionCycle:'2027',applicantScope:'international',period:'year',sourceUrl:f.fixturePublisherUrl,notes:'FICTIONAL local contract; not an actual award policy'};
   const created=await admin.post('/api/admin/catalogue-facts',{data:draft});expect(created.status(),field).toBe(201);const stored=(await created.json()).fact;
   const review={id,expectedVersion:String(stored.version),expectedFact:draft,sourceQuote:'FICTIONAL isolated fixture: this exact scope and original value are manually attested solely for the test. No real publisher retrieval or funding promise.',confirmsAllLeaves:true};
   const reviewed=await admin.post(endpoint,{data:review});expect(reviewed.status(),`review ${field}`).toBe(200);const body=await reviewed.json();expect(body.officialPageReRead).toBe(false);expect(body.fact.verification_status).toBe('verified');
   if(!first)first={draft,version:String(body.fact.version)};
  }
  const scope=`coverageProgramId=${f.fixtureProgramId}&coverageCycle=2027&coverageApplicantScope=international`;
  const get=async(path:string,selected=true)=>{const r=await request.get(`/api/${path}?profileId=${f.studentId}${selected?'&'+scope:''}`);expect(r.status(),path).toBe(200);return r.json();};
  const row=(path:string,body:CoverageResponse)=>{const rows=path==='dashboard'?body.recommended?.scholarships:path==='autopilot'?body.queue:path==='deadlines'?body.items:body.scholarships;const match=rows?.find(r=>r.id===(path==='deadlines'?`sch-${f.scholarshipId}`:f.scholarshipId));expect(match,path).toBeTruthy();return match!;};
  for(const path of ['scholarships','dashboard','autopilot','deadlines']){
   const match=row(path,await get(path));expect(match,path).toBeTruthy();expect(match.coverageState,path).toBe('applicable');expect(match.coverageAssessment.isFullCoverage,path).toBe(true);const chosen=match.coverageAssessment.universities.find((u:{universityId:number})=>u.universityId===f.verifiedUniversityId);expect(chosen).toBeTruthy();expect(chosen!.programmeId).toBe(f.fixtureProgramId);
   expect(row(path,await get(path,false)).coverageState,path+' without selected programme/cycle').toBe('unknown');
  }
  const changed=await admin.patch('/api/admin/catalogue-facts',{data:{...first!.draft,expectedVersion:first!.version,notes:'FICTIONAL changed source scope requires a new review'}});expect(changed.status()).toBe(200);
  for(const path of ['scholarships','dashboard','autopilot','deadlines'])expect(row(path,await get(path)).coverageState,path+' after exact-field edit').toBe('unknown');
 }finally{
  if(!hadSaved)await db.query('DELETE FROM saved_universities WHERE profile_id=$1 AND university_id=$2',[f.studentId,f.verifiedUniversityId]);
  if(ids.length)await db.query('DELETE FROM catalogue_facts WHERE id=ANY($1::uuid[])',[ids]);
  await db.query('UPDATE scholarships SET verification_status=$2,degree_levels=$3 WHERE id=$1',[f.scholarshipId,original.verification_status,original.degree_levels]);
  await db.query("INSERT INTO cache_revisions(scope,revision) VALUES('catalogue',2) ON CONFLICT(scope) DO UPDATE SET revision=cache_revisions.revision+1");
  await admin.dispose();await db.end();
 }
});
