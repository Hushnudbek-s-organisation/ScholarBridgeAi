import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const f=JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!,'utf8'));
test('real profile API rejects invalid exams atomically and round-trips zero and original TOEFL/GPA',async({request})=>{
 expect((await request.post('/api/auth/sign-in',{data:{email:f.studentEmail,password:f.studentPassword}})).status()).toBe(200);
 const url=`/api/profiles/${f.studentId}`;
 const read=async()=>{const response=await request.get(url);expect(response.status()).toBe(200);return (await response.json()).profile;};
 const original=await read();
 const fields=['name','ieltsScore','satScore','actScore','duolingoScore','toeflScore','greScore','applicantContext'];
 const projection=(profile:Record<string,unknown>)=>Object.fromEntries(fields.map(key=>[key,profile[key]]));
 try{
  for(const input of [{greScore:999},{greScore:300.5},{ieltsScore:99},{ieltsScore:7.25},{satScore:0},{satScore:1205},{actScore:37},{actScore:25.5},{duolingoScore:112},{toeflScore:100.5},{ieltsScore:true},{satScore:'0x640'},{satScore:'1e3'},{satScore:[]},{satScore:{score:1400}}]){
   const response=await request.put(url,{data:{name:'FICTIONAL invalid write MUST NOT persist',...input}});
   expect(response.status(),JSON.stringify(input)).toBe(400);expect((await response.json()).code).toBe('academic_input_invalid');
   expect(projection(await read()),'invalid request must not partially write profile').toEqual(projection(original));
  }
  const record={gpa:{value:4.5,minimum:1,maximum:5,country:'UZ',system:'FICTIONAL original scale'},toefl:{score:5.5,scale:'6',examDate:'2026-02-01',validUntil:'2028-02-01',sections:{reading:5,listening:5.5}}};
  expect((await request.put(url,{data:{ieltsScore:0,satScore:1400,actScore:25,duolingoScore:115,applicantContext:record}})).status()).toBe(200);
  const saved=await read();expect(saved.ieltsScore).toBe(0);expect(saved.satScore).toBe(1400);expect(saved.applicantContext.toefl).toEqual(record.toefl);expect(saved.applicantContext.gpa).toEqual(record.gpa);
  const invalid=await request.put(url,{data:{name:'FICTIONAL invalid date MUST NOT persist',applicantContext:{toefl:{score:5.5,scale:'6',examDate:'2099-01-01'}}}});expect(invalid.status()).toBe(400);expect(projection(await read())).toEqual(projection(saved));
 }finally{expect((await request.put(url,{data:projection(original)})).status()).toBe(200);expect(projection(await read())).toEqual(projection(original));}
});

test('real recommendation API rejects forged scores rather than clamping; reviewed EN/UZ/RU subject aliases agree',async({request})=>{
 expect((await request.post('/api/auth/sign-in',{data:{email:f.studentEmail,password:f.studentPassword}})).status()).toBe(200);
 const recommend=(extra:Record<string,unknown>)=>request.post('/api/programs/recommend',{data:{profileId:f.studentId,interests:['Computer Science'],...extra}});
 for(const extra of [{ielts:99},{ielts:7.25},{sat:1205},{act:37},{duolingo:112},{ielts:true},{sat:'0x640'},{toefl:95,toeflScale:'6'},{toefl:5.25,toeflScale:'6'}]){const response=await recommend(extra);expect(response.status(),JSON.stringify(extra)).toBe(400);expect((await response.json()).code).toBe('academic_input_invalid');}
 for(const interest of ['Computer Science','Kompyuter fanlari','Компьютерные науки']){
  const response=await recommend({interests:[interest]});expect(response.status()).toBe(200);const body=await response.json();
  const programme=body.results.find((row:{program:{id:number}})=>row.program.id===f.fixtureProgramId);expect(programme).toBeTruthy();expect(programme.subjectFit.score).toBe(1);expect(['exact','synonym']).toContain(programme.subjectFit.level);expect(body.probability.available).toBe(false);
 }
 const unknownScale=await recommend({toefl:100,toeflScale:null});expect(unknownScale.status()).toBe(200);expect((await unknownScale.json()).inputs.toefl.scale).toBeNull();
 const explicitUnknown=await recommend({ielts:null,sat:null,act:null,duolingo:null});expect(explicitUnknown.status()).toBe(200);const body=await explicitUnknown.json();expect(body.inputs.ielts.value).toBeNull();expect(body.inputs.ielts.source).toBe('request');
});
