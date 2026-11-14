import assert from 'node:assert/strict';
import {parseExamInput} from '../src/lib/examRecords';
import {assessEligibility,type RecommendRequirement} from '../src/lib/recommend';
import {evaluateApplicantRequirementGroup,evaluateRequirementGroup} from '../src/lib/requirementGroups';
import {parseApplicantContext} from '../src/lib/applicantContext';
let passed=0,failed=0;
function check(name:string,fn:()=>void){try{fn();passed++;console.log(`PASS ${name}`)}catch(e){failed++;console.error(`FAIL ${name}: ${e instanceof Error?e.message:String(e)}`)}}
const asOf='2026-06-01';
const minimum=(field:string,value:number,unit:string)=>({id:'exam',kind:'minimum',field,value,unit});
for(const value of [99,-1,7.25,NaN,Infinity,true,'7',[],{}])check(`domain rejects forged IELTS ${JSON.stringify(value)}`,()=>assert.equal(evaluateApplicantRequirementGroup(minimum('ielts',7,'9'),{ielts:value as number},asOf).state,'unknown'));
for(const [field,unit,threshold,invalid] of [['sat','1600',1200,[0,399,9999,1205]],['act','36',25,[0,37,25.5]],['duolingo','160',110,[0,9,165,112]]] as const){
 for(const value of invalid)check(`${field} range/step ${value} not met/unmet`,()=>assert.equal(evaluateApplicantRequirementGroup(minimum(field,threshold,unit),{[field]:value},asOf).state,'unknown'));
}
check('generic AST cannot bypass exam boundary',()=>assert.equal(evaluateRequirementGroup(minimum('ielts',7,'9'),{ielts:{value:99,unit:'9'}},asOf).state,'unknown'));
check('invalid published threshold is not a valid pass comparison',()=>assert.equal(evaluateApplicantRequirementGroup(minimum('ielts',7.25,'9'),{ielts:8},asOf).state,'unknown'));
for(const date of ['2026-02-30','2026-13-01','bad-date'])check(`malformed calendar ${date}`,()=>assert.equal(evaluateApplicantRequirementGroup(minimum('toefl',5,'6'),{toefl:5.5,toeflScale:'6',toeflRecord:{score:5.5,scale:'6',examDate:date}},asOf).state,'unknown'));
check('future exam is unknown',()=>assert.equal(evaluateApplicantRequirementGroup(minimum('toefl',5,'6'),{toefl:5.5,toeflScale:'6',toeflRecord:{score:5.5,scale:'6',examDate:'2027-01-01'}},asOf).state,'unknown'));
check('reversed exam validity is unknown',()=>assert.equal(evaluateApplicantRequirementGroup(minimum('toefl',5,'6'),{toefl:5.5,toeflScale:'6',toeflRecord:{score:5.5,scale:'6',examDate:'2026-01-01',validUntil:'2025-01-01'}},asOf).state,'unknown'));
check('bad section band cannot pass',()=>assert.equal(evaluateApplicantRequirementGroup(minimum('toefl.reading',5,'6'),{toefl:5.5,toeflScale:'6',toeflRecord:{score:5.5,scale:'6',sections:{reading:5.25}}},asOf).state,'unknown'));
check('IELTS OR missing TOEFL remains met',()=>assert.equal(evaluateApplicantRequirementGroup({id:'english',operator:'anyOf',children:[minimum('ielts',7,'9'),{...minimum('toefl',5,'6'),id:'other'}]},{ielts:7},asOf).state,'met'));
check('valid low score is unmet not unknown',()=>assert.equal(evaluateApplicantRequirementGroup(minimum('ielts',7,'9'),{ielts:6.5},asOf).state,'unmet'));
check('explicit IELTS zero is a valid zero',()=>assert.equal(evaluateApplicantRequirementGroup(minimum('ielts',0,'9'),{ielts:0},asOf).state,'met'));
check('original GPA 1–5 is not converted',()=>{const r=evaluateApplicantRequirementGroup(minimum('gpa',4,'1-5'),{gpa:4.5,gpaMinimum:1,gpaScale:5},asOf);assert.equal(r.state,'met');assert.equal(r.actual,4.5)});
for(const value of ['0x64','1e2',true,[],{}])check(`applicant score rejects coercion ${JSON.stringify(value)}`,()=>assert.throws(()=>parseApplicantContext({toefl:{score:value,scale:'120'}})));
check('six-scale TOEFL is preserved',()=>{const record={score:5.5,scale:'6',examDate:'2026-02-01',validUntil:'2028-02-01',sections:{reading:5,listening:5.5}};assert.deepEqual(parseApplicantContext({toefl:record})?.toefl,{...record});});
const flat:RecommendRequirement={programId:1,minIelts:7,minToefl:null,minDet:null,minSat:null,minAct:null,minGpa:null,ibRequirement:null,aLevelRequirement:null,apRequirement:null,subjectRequirements:null,otherRequirements:null};
for(const score of [99,7.25,true,'7',NaN])check(`flat recommender boundary ${JSON.stringify(score)}`,()=>assert.equal(assessEligibility({ielts:score as number,asOfDate:asOf},[flat]).items[0].status,'unknown'));
check('flat invalid official band threshold cannot pass',()=>assert.equal(assessEligibility({ielts:8,asOfDate:asOf},[{...flat,minIelts:7.25}]).items[0].status,'unknown'));
for(const value of [259,341,300.5,'0x12c',true])check(`GRE input ${JSON.stringify(value)} is invalid`,()=>assert.throws(()=>parseExamInput('gre',value)));
check('GRE original valid composite is unchanged',()=>assert.equal(parseExamInput('gre',320),320));
console.log(`EXAM_BOUNDARIES: ${passed} passed, ${failed} failed`);if(failed)process.exitCode=1;
