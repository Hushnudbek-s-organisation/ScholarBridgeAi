import {profileFromSessionEnvelope} from "../src/lib/authenticatedProfile";
import {parseRecordedFundingUsd,buildFundingPlan,buildFundingScenario,postAdmissionFunding,type FundingItemLike} from "../src/lib/journey/funding";
import {evaluateScopedUniversityDecision,evaluateRecordedAcademicCriteria} from "../src/lib/academicDecision";
import {academicDecisionEnvelope,resolveAcademicRequirements,withScopedDetailRequirements} from "../src/lib/universityDetailRequirements";
import {universityProgrammeDiscovery} from "../src/lib/universityProgrammeDiscovery";
import {buildRequirements} from "../src/lib/journey/requirements";
import {resolveScopedFact} from "../src/lib/factResolver";
import {exactChecklistProgramme,scopedChecklistEvidence} from "../src/lib/journey/checklistEvidence";
import type {CatalogueFact} from "../src/lib/evidencePolicy";
import assert from "node:assert/strict";
import {verifiedEvidenceDate,databaseVerificationISO} from "../src/lib/typedEvidence";
import {academicRecordText} from "../src/lib/applicantContextPresentation";
import {selectDashboardActions} from "../src/lib/dashboardActions";
import {parseApplicantContext,recordedToefl} from "../src/lib/applicantContext";
import {evaluateRequirementGroup as evaluate} from "../src/lib/requirementGroups";
import {catalogueFactInput} from "../src/lib/catalogueFactInput";
import {assessEligibility,type RecommendRequirement} from "../src/lib/recommend";
import {gpaTo40Scale} from "../src/lib/gpa";
let passed=0;
function check(name:string,test:()=>void){test();passed++;console.log(`PASS ${name}`);}
const date="2026-11-07";
check("funding input: unknown/coercible values never become recorded zero",()=>{for(const value of [undefined,null,false,true,"","   ",[],{},"not-money",NaN,Infinity,-Infinity,-1])assert.equal(parseRecordedFundingUsd(value),null);});
check("funding input: explicit numeric/string zero is retained",()=>{assert.equal(parseRecordedFundingUsd(0),0);assert.equal(parseRecordedFundingUsd("0"),0);assert.equal(parseRecordedFundingUsd(" 0 "),0);});
check("funding input: legacy nearest-whole-USD rounding remains explicit and compatible",()=>{assert.equal(parseRecordedFundingUsd(12.49),12);assert.equal(parseRecordedFundingUsd("12.5"),13);assert.equal(parseRecordedFundingUsd(0.49),0);});
check("funding input: rounded PostgreSQL integer boundary is checked before write",()=>{assert.equal(parseRecordedFundingUsd(2147483647),2147483647);assert.equal(parseRecordedFundingUsd(2147483647.49),2147483647);assert.equal(parseRecordedFundingUsd(2147483647.5),null);assert.equal(parseRecordedFundingUsd(2147483648),null);});
const minimum=(id:string,field:string,value:number,unit:string)=>({id,kind:"minimum",field,value,unit});
const english={id:"english",operator:"anyOf",children:[minimum("ielts","ielts",7,"9"),{id:"toefl-group",operator:"allOf",children:[minimum("toefl","toefl",5.5,"6"),minimum("reading","toefl.reading",5,"6")]}]};
check("C04 canonical action preserves order, removes repeated ids, removes primary from remaining list",()=>{const result=selectDashboardActions([{id:"one",tab:"profile"},{id:"one",tab:"profile"},{id:"two",tab:"universities"}]);assert.equal(result.primary?.id,"one");assert.deepEqual(result.remaining.map(item=>item.id),["two"]);assert.equal(selectDashboardActions([]).primary,null);});
check("C12 explicit null/absence; zero is a recorded value, false is not a score",()=>{assert.equal(parseApplicantContext(undefined),undefined);assert.equal(parseApplicantContext(null),null);assert.throws(()=>parseApplicantContext({toefl:{score:false,scale:"120"}}));assert.equal(parseApplicantContext({toefl:{score:0,scale:"120"}})?.toefl?.score,0);});
for(const [score,scale] of [[100,"120"],[5.5,"6"]] as const)check(`C12 original TOEFL ${score}/${scale} retained`,()=>{const input={toefl:{score,scale,examDate:"2026-02-01",validUntil:"2028-02-01",sections:{reading:scale==="120"?25:5.5}}};assert.equal(parseApplicantContext(input)?.toefl?.score,score);assert.equal(parseApplicantContext(input)?.toefl?.scale,scale);});
for(const [score,scale] of [[95,"6"],[121,"120"],[5.2,"6"],[-1,"120"]])check(`C12 reject invalid TOEFL ${score}/${scale}`,()=>assert.throws(()=>parseApplicantContext({toefl:{score,scale}})));
check("C12 no invented scale on legacy TOEFL",()=>{assert.equal(recordedToefl(null,95).scale,null);assert.equal(recordedToefl(null,95).score,95);});
check("C12 original GPA + min/max + context survive without conversion",()=>{const gpa={value:4.5,minimum:1,maximum:5,country:"UZ",system:"Institution transcript"};assert.deepEqual(parseApplicantContext({gpa})?.gpa,gpa);assert.equal(gpaTo40Scale(4.5,5,1),3.5);assert.equal(gpaTo40Scale(4.5,5,null),null);assert.throws(()=>parseApplicantContext({gpa:{...gpa,value:6}}));});
check("C12 unproven institution GPA conversion is not silently fabricated",()=>{assert.throws(()=>parseApplicantContext({gpa:{value:95,minimum:0,maximum:100,conversion:{method:"institution_published",value:3.9}}}));});
check("C12 citizenship and residency are not destinations",()=>{const input=parseApplicantContext({citizenships:["uz","us"],residency:"DE"});assert.deepEqual(input?.citizenships,["UZ","US"]);assert.equal(input?.residency,"DE");assert.equal((input as Record<string,unknown>).preferredCountries,undefined);});
check("C12 invalid dates and backwards validity cannot persist",()=>{assert.throws(()=>parseApplicantContext({toefl:{score:100,scale:"120",examDate:"2026-02-30"}}));assert.throws(()=>parseApplicantContext({toefl:{score:100,scale:"120",examDate:"2026-02-01",validUntil:"2025-01-01"}}));});
check("C13 allOf sections nested under anyOf; a passing IELTS does not need TOEFL",()=>{assert.equal(evaluate(english,{ielts:{value:7.5,unit:"9"}},date).state,"met");assert.equal(evaluate(english,{toefl:{value:6,unit:"6"},"toefl.reading":{value:4,unit:"6"}},date).state,"unknown");});
check("C13 a complete alternative passes, the other missing alternative is not counted as failure",()=>assert.equal(evaluate(english,{toefl:{value:6,unit:"6"},"toefl.reading":{value:5,unit:"6"}},date).state,"met"));
check("C13 unknown operator fails unknown, never assumes OR",()=>assert.equal(evaluate({...english,operator:"xor"},{ielts:{value:9,unit:"9"}},date).state,"unknown"));
check("C13 optional/not-applicable testing never becomes a blocker",()=>assert.equal(evaluate({id:"testing",operator:"not_applicable"},{},date).state,"not_applicable"));
check("C13 missing GPA scale, mismatched TOEFL scale stay unknown",()=>{assert.equal(evaluate(minimum("gpa","gpa",3.7,"4"),{gpa:{value:98,unit:"100"}},date).state,"unknown");assert.equal(evaluate(minimum("test","toefl",5.5,"6"),{toefl:{value:110,unit:"120"}},date).state,"unknown");});
check("C13 expired result and missing validity are actionable unknown, not perfect fit",()=>{const rule={...minimum("test","toefl",90,"120"),requireValid:true};assert.equal(evaluate(rule,{toefl:{value:110,unit:"120",validUntil:"2025-01-01",examDate:"2023-01-01"}},date).reason,"expired");assert.equal(evaluate(rule,{toefl:{value:110,unit:"120"}},date).reason,"validity_unknown");});
check("C13 malformed/deep groups are bounded and unknown",()=>{assert.equal(evaluate({id:"x",operator:"allOf",children:[]},{},date).state,"unknown");let deep:unknown=minimum("leaf","sat",1200,"1600");for(let n=0;n<12;n++)deep={id:`depth${n}`,operator:"allOf",children:[deep]};assert.equal(evaluate(deep,{sat:{value:1600,unit:"1600"}},date).state,"unknown");});
check("C13 the real recommender consumes authored groups instead of flat AND minima",()=>{const req:RecommendRequirement={programId:1,minGpa:null,minIelts:7,minToefl:110,minDet:null,minSat:null,minAct:null,ibRequirement:null,aLevelRequirement:null,apRequirement:null,subjectRequirements:null,otherRequirements:null,requirementGroup:english};const result=assessEligibility({ielts:7.5},[req]);assert.equal(result.met,1);assert.equal(result.unmet,0);assert.equal(result.group?.state,"met");});
check("C12 planning GPA conversion cannot meet or fail an official native-4 cutoff",()=>{const req:RecommendRequirement={programId:1,minGpa:3,minIelts:null,minToefl:null,minDet:null,minSat:null,minAct:null,ibRequirement:null,aLevelRequirement:null,apRequirement:null,subjectRequirements:null,otherRequirements:null};assert.equal(assessEligibility({gpa:4.5,gpaScale:5,gpaMinimum:1},[req]).items[0].status,"unknown");assert.equal(assessEligibility({gpa:3.8,gpaScale:4},[req]).items[0].status,"met");});
check("C08 admin/import fact shape persists scope; editing cannot keep verification",()=>{const record=catalogueFactInput({entityType:"program",entityId:2,fieldKey:"min_toefl",valueNumeric:5.5,unit:"6",applicantScope:"international",valueType:"official_requirement",sourceUrl:"https://fictional.example.edu/requirements",verificationStatus:"verified"});assert.equal(record.applicant_scope,"international");assert.equal(record.unit,"6");assert.equal(record.verification_status,"review_needed");assert.equal(record.verified_at,null);});
check("C08 unknown and not-published cannot be confused with numerical zero; personal probabilities unavailable",()=>{assert.throws(()=>catalogueFactInput({entityType:"university",entityId:1,fieldKey:"gpa",valueType:"not_published",valueNumeric:0}));assert.throws(()=>catalogueFactInput({entityType:"university",entityId:1,fieldKey:"probability",valueType:"personal_admission_probability",valueNumeric:95}));});
check("C08 future and malformed check dates never upgrade an official cutoff",()=>{assert.equal(verifiedEvidenceDate("2099-01-01"),false);assert.equal(verifiedEvidenceDate("2026-02-30"),false);assert.equal(verifiedEvidenceDate("2026"),false);assert.equal(verifiedEvidenceDate("2026-11-06"),true);});
check("C08 persisted UTC PostgreSQL timestamp normalises without relaxing user-date or future-date policy",()=>{
 assert.equal(verifiedEvidenceDate("2024-01-01 12:30:00"),false);
 assert.equal(databaseVerificationISO("2024-01-01 12:30:00.123456"),"2024-01-01T12:30:00.123456Z");
 assert.equal(verifiedEvidenceDate(databaseVerificationISO("2024-01-01 12:30:00")),true);
 assert.equal(verifiedEvidenceDate(databaseVerificationISO("2026-02-30 12:30:00")),false);
 assert.equal(verifiedEvidenceDate(databaseVerificationISO("2099-01-01 12:30:00")),false);
});
check("C12 original-scale Telegram/export text never presents 6-scale as 120 or loses a recorded IELTS alternative",()=>{const text=academicRecordText({ieltsScore:7,applicantContext:{toefl:{score:5.5,scale:"6",examDate:"2026-02-01",sections:{reading:5}}}},"unknown");assert.match(text.english,/IELTS 7/);assert.match(text.english,/TOEFL 5.5 \/ 6/);assert.match(text.english,/reading: 5/);assert.doesNotMatch(text.english,/120/);});
const checklistProgress={hasDocument:()=>false,hasEssay:()=>false,recommendationSubmitted:0,recommendationNeeded:0,testPlanScore:()=>null};
const checklistSource={verificationStatus:"verified" as const,sourceUrl:"https://fictional.example.edu/programme",lastVerifiedAt:"2026-11-06"};
const checklist=(group:unknown,profile:Parameters<typeof buildRequirements>[0]["profile"])=>buildRequirements({university:{id:1,name:"FICTIONAL",...checklistSource},profile,publishedGroup:{value:group,source:checklistSource},asOfDate:date,progress:checklistProgress});
check("checklist: exact programme only, absent/unknown/ambiguous names never select a first row",()=>{
 const rows=[{name:"Alpha"},{name:"Beta"}];assert.equal(exactChecklistProgramme(rows,null),null);assert.equal(exactChecklistProgramme(rows,"missing"),null);assert.equal(exactChecklistProgramme([...rows,{name:"alpha"}],"Alpha"),null);assert.equal(exactChecklistProgramme(rows," beta "),rows[1]);
});
check("checklist: grouped IELTS alternative does not require TOEFL; shares canonical evaluator",()=>{
 const rows=checklist(english,{ieltsScore:7.5});assert.equal(rows.length,1);assert.equal(rows[0].state,"met");assert.match(rows[0].instructions!,/toefl-group: unknown/);
 const eligibility=assessEligibility({ielts:7.5,asOfDate:date},[{programId:1,academicYear:null,requirementGroup:english,minGpa:null,minIelts:null,minToefl:null,minDet:null,minSat:null,minAct:null,ibRequirement:null,aLevelRequirement:null,apRequirement:null,subjectRequirements:null,otherRequirements:null}],"Bachelor");assert.equal(eligibility.group?.state,"met");
});
check("checklist: original 6-scale TOEFL + reading, expiry and no scale conversion",()=>{
 const profile={applicantContext:{toefl:{score:5.5,scale:"6" as const,sections:{reading:5},examDate:"2026-02-01",validUntil:"2028-02-01"}}};assert.equal(checklist(english,profile)[0].state,"met");
 assert.equal(checklist(english,{toeflScore:110})[0].state,"unknown");
 assert.equal(checklist(english,{applicantContext:{toefl:{...profile.applicantContext.toefl,validUntil:"2025-01-01"}}})[0].state,"unknown");
});
check("checklist: unknown operators remain unknown; explicit not-applicable is not required",()=>{
 assert.equal(checklist({id:"unknown-op",operator:"xor",children:[]},{})[0].state,"unknown");assert.equal(checklist({id:"waiver",operator:"not_applicable"},{})[0].isRequired,false);
});
check("checklist: original GPA record wins over contradictory legacy or planning-converted values",()=>{
 const profile={gpa:4,gpaScale:4,applicantContext:{gpa:{value:4.5,minimum:1,maximum:5,conversion:{method:"proportional_planning" as const,value:3.9}}}};
 assert.equal(checklist(minimum("gpa","gpa",3.5,"4"),profile)[0].state,"unknown");
 const flat=buildRequirements({university:{id:1,name:"FICTIONAL",minGpa:3.5,minGpaScale:4},profile,progress:checklistProgress});assert.equal(flat[0].state,"unknown");
 assert.equal(assessEligibility({gpa:3.8,gpaScale:4,gpaMinimum:1},[{programId:1,academicYear:null,minGpa:3.5,minIelts:null,minToefl:null,minDet:null,minSat:null,minAct:null,ibRequirement:null,aLevelRequirement:null,apRequirement:null,subjectRequirements:null,otherRequirements:null}],"Bachelor").unknown,1);
});
check("checklist: flat English fields without operator are not AND blockers",()=>{
 const rows=buildRequirements({university:{id:1,name:"FICTIONAL",minIelts:7,minToefl:100,minToeflScale:"120"},profile:{ieltsScore:8},progress:checklistProgress});assert.equal(rows.length,2);assert.ok(rows.every(row=>!row.isRequired&&row.state==="unknown"));
});
check("checklist: field provenance and publisher/cycle/scope conflicts are resolved exactly",()=>{
 const fact:CatalogueFact={entityType:"program",entityId:1,fieldKey:"min_gpa",valueNumeric:3.5,valueText:null,unit:"4",currency:null,period:null,degreeLevel:"Bachelor",programName:"FICTIONAL",admissionCycle:"2027",applicantScope:"international",sourceUrl:checklistSource.sourceUrl,verifiedAt:"2026-11-06",verificationStatus:"verified",valueType:"official_requirement",publisherOfficial:true};
 const context={programName:"FICTIONAL",degreeLevel:"Bachelor",admissionCycle:"2027",applicantScope:"international"};
 const actual=scopedChecklistEvidence([fact],context);assert.equal(actual.minGpa,3.5);assert.equal(actual.minGpaScale,4);assert.equal(actual.fieldSources.minGpa?.sourceUrl,fact.sourceUrl);
 assert.equal(scopedChecklistEvidence([fact],{...context,applicantScope:null}).minGpa,null);assert.equal(scopedChecklistEvidence([fact],{...context,admissionCycle:"2028"}).minGpa,null);
 assert.equal(scopedChecklistEvidence([{...fact,publisherOfficial:false}],context).minGpa,null);assert.equal(scopedChecklistEvidence([fact,{...fact,valueNumeric:3.7}],context).minGpa,null);
 assert.equal(scopedChecklistEvidence([],context).minGpa,null);
});
check("resolver: discover explicit unit without pre-knowing it; incompatible units conflict even at identical numbers",()=>{
 const fact:CatalogueFact={entityType:"program",entityId:1,fieldKey:"min_toefl",valueNumeric:6,valueText:null,unit:"6",currency:null,period:null,degreeLevel:null,programName:null,admissionCycle:null,sourceUrl:checklistSource.sourceUrl,verifiedAt:"2026-11-06",verificationStatus:"verified",valueType:"official_requirement",publisherOfficial:true};
 assert.equal(resolveScopedFact([fact],"min_toefl",{})?.unit,"6");
 assert.equal(resolveScopedFact([fact,{...fact,unit:"120"}],"min_toefl",{}),null);
 assert.equal(resolveScopedFact([fact,{...fact,unit:"120"}],"min_toefl",{unit:"120"})?.unit,"120");
 assert.equal(resolveScopedFact([fact],"min_toefl",{unit:"120"}),null);
});

const detailScope={programId:10,admissionCycle:"2027",applicantScope:"international",degreeLevel:"Bachelor"};
const detailFact:CatalogueFact={entityType:"program",entityId:10,fieldKey:"min_toefl",valueNumeric:5.5,unit:"6",programName:"FICTIONAL Alpha",degreeLevel:"Bachelor",admissionCycle:"2027",applicantScope:"international",sourceUrl:"https://fictional.example.edu/criteria",verifiedAt:"2026-11-06",verificationStatus:"verified",valueType:"official_requirement",publisherOfficial:true};
const detailBase={university:{id:1,minGpa:3.9,minIelts:8,minSat:1500},universityRequirements:{toefl:{values:[110],single:110},gpa:{values:[3.9],single:3.9},other:["FICTIONAL IELTS 8 or TOEFL 110"],undergraduateTestsApply:true},programs:[{id:10,name:"FICTIONAL Alpha",degree:"Bachelor",minToefl:110,portfolioRequired:true,requirements:[{requirementType:"toefl",minimumValue:110,valueText:null,sourceUrl:detailFact.sourceUrl,lastVerifiedAt:detailFact.verifiedAt!,verificationStatus:"verified",admissionCycle:"2026"}]},{id:11,name:"FICTIONAL Beta",degree:"Master",minToefl:95,requirements:[]}]};
check("detail: legacy row verification and free text never become scoped official minima",()=>{
 const before=JSON.stringify(detailBase),result=withScopedDetailRequirements(detailBase,[],new Map(),{});
 assert.equal(result.programs[0].minToefl,null);assert.equal(result.universityRequirements.toefl,null);assert.equal(result.university.minGpa,null);
 assert.equal(result.university.recordedMinimums.minGpa,3.9);assert.equal(result.programs[0].recordedRequirements[0].minimumValue,110);assert.equal(result.programs[0].recordedRequirements[0].evidence.trust,"legacy_unknown");assert.equal(JSON.stringify(detailBase),before);
});
check("detail: native six-scale TOEFL is scoped to exact programme/cycle/applicants",()=>{
 const result=withScopedDetailRequirements(detailBase,[],new Map([[10,[detailFact]]]),detailScope);
 assert.equal(result.programs[0].minToefl,5.5);assert.equal(result.programs[0].minToeflScale,"6");assert.equal(result.universityRequirements.toefl?.single,5.5);assert.equal(result.universityRequirements.toefl?.unit,"6");assert.equal(result.programs[1].minToefl,null);
 assert.deepEqual(result.requirementContexts.admissionCycles,["2027"]);assert.deepEqual(result.requirementContexts.applicantScopes,["international"]);
});
for(const override of [{admissionCycle:"Fall 2027"},{admissionCycle:"2028"},{applicantScope:null},{applicantScope:"domestic"}])check(`detail: mismatched or absent scope stays unknown ${JSON.stringify(override)}`,()=>{
 const result=withScopedDetailRequirements(detailBase,[],new Map([[10,[detailFact]]]),{...detailScope,...override});assert.equal(result.universityRequirements.toefl,null);assert.equal(result.programs[0].minToefl,null);
});
check("detail: institutional summary never unions different programme minima",()=>{
 const result=withScopedDetailRequirements(detailBase,[],new Map([[10,[detailFact]],[11,[{...detailFact,entityId:11,programName:"FICTIONAL Beta",degreeLevel:"Master",valueNumeric:95,unit:"120"}]]]),{...detailScope,programId:null});
 assert.equal(result.universityRequirements.toefl,null);assert.equal(result.programs[0].minToefl,5.5);assert.equal(result.programs[1].minToefl,95);
});
check("detail: conflicting equal-priority values or units do not fall back to legacy",()=>{
 for(const peer of [{...detailFact,valueNumeric:6},{...detailFact,unit:"120"}]){
  const result=withScopedDetailRequirements(detailBase,[],new Map([[10,[detailFact,peer]]]),detailScope);assert.equal(result.universityRequirements.toefl,null);assert.equal(result.programs[0].minToefl,null);assert.equal(result.programs[0].recordedRequirements[0].minimumValue,110);
 }
});
check("detail: unproven publisher, dates, missing unit and recommendation cannot make a cutoff",()=>{
 for(const patch of [{publisherOfficial:false},{verifiedAt:"2099-01-01"},{verifiedAt:"2026-02-30"},{unit:null},{unit:"unrecorded"},{valueType:"recommended_score" as const}]){
  const result=resolveAcademicRequirements([{...detailFact,...patch}],{...detailScope,programName:"FICTIONAL Alpha"});assert.equal(result.minima.minToefl,null);assert.equal(result.evidence.toefl.isOfficialMinimum,false);
 }
});
check("detail: original 100-scale GPA retained, never converted to four",()=>{
 const fact={...detailFact,fieldKey:"min_gpa",valueNumeric:85,unit:"100"};const result=withScopedDetailRequirements(detailBase,[],new Map([[10,[fact]]]),detailScope);
 assert.equal(result.programs[0].minGpa,85);assert.equal(result.programs[0].minGpaScale,"100");assert.equal(result.universityRequirements.gpa?.single,85);assert.equal(result.university.minGpa,null);
});
check("detail: not published / not applicable / missing are distinct states",()=>{
 const context={...detailScope,programName:"FICTIONAL Alpha"};
 for(const valueType of ["not_published","not_applicable"] as const){const result=resolveAcademicRequirements([{...detailFact,valueNumeric:null,valueType}],context);assert.equal(result.evidence.toefl.valueType,valueType);assert.equal(result.minima.minToefl,null);}
 assert.equal(resolveAcademicRequirements([],context).evidence.toefl.valueType,"unknown");
});
check("detail: group operator and source are preserved, unknown context does not borrow a reviewed group",()=>{
 const fact={...detailFact,fieldKey:"requirement_group",valueNumeric:null,valueText:JSON.stringify(english),unit:null};
 assert.equal(withScopedDetailRequirements(detailBase,[],new Map([[10,[fact]]]),detailScope).programs[0].requirementGroup?.value,fact.valueText);
 assert.equal(withScopedDetailRequirements(detailBase,[],new Map([[10,[fact]]]),{}).programs[0].requirementGroup,null);
});
check("detail: cache context A -> B -> A returns A without contaminating the shared base",()=>{
 const before=JSON.stringify(detailBase),facts=new Map([[10,[detailFact]]]);
 const a=withScopedDetailRequirements(detailBase,[],facts,detailScope);const b=withScopedDetailRequirements(detailBase,[],facts,{...detailScope,applicantScope:null});const again=withScopedDetailRequirements(detailBase,[],facts,detailScope);
 assert.equal(a.universityRequirements.toefl?.single,5.5);assert.equal(b.universityRequirements.toefl,null);assert.deepEqual(a,again);assert.equal(JSON.stringify(detailBase),before);
 assert.throws(()=>withScopedDetailRequirements(detailBase,[],facts,{programId:999}),/programme_scope_mismatch/);
});
const recordedProgramme={id:10,universityId:1,name:"FICTIONAL Alpha",field:"Computer Science",degreeLevel:"Bachelor"};
check("list/detail shared discovery: no programme is synthesized from a preferred major",()=>{
 for(const programmes of [[],[{...recordedProgramme,name:""}],[{...recordedProgramme,universityId:999}]]){const result=universityProgrammeDiscovery({id:1,name:"FICTIONAL"},programmes,{targetMajor:"Computer Science"},{},true);assert.equal(result.chance,null);assert.equal(result.programmeDiscovery.selectedProgrammeId,null);assert.equal(result.programmeDiscovery.status,"no_programmes");}
});
check("list/detail shared discovery: no planning index for any caller, and no invented chance",()=>{
 // The retired composite index is never produced — not for the default path,
 // not for a sparse programme and not for the old explicit opt-in flag.
 const ordinary=universityProgrammeDiscovery({id:1,name:"FICTIONAL"},[recordedProgramme],null,{},false);assert.equal(ordinary.chance,null);assert.equal(ordinary.programmeDiscovery.selectedProgrammeId,10);
 const sparse=universityProgrammeDiscovery({id:1,name:"FICTIONAL"},[{...recordedProgramme,degreeLevel:null}],null,{},true);assert.equal(sparse.chance,null);assert.equal(sparse.programmeDiscovery.selectedProgrammeId,10);
 const explicit=universityProgrammeDiscovery({id:1,name:"FICTIONAL"},[recordedProgramme],null,{},true);assert.equal(explicit.chance,null);assert.equal(explicit.programmeDiscovery.selectedProgrammeId,10);
 assert.equal(explicit.programmeDiscovery.personalAdmissionProbability,null);
});
check("detail: impossible values on a recorded scale cannot become official numeric cutoffs",()=>{
 for(const [fieldKey,valueNumeric,unit] of [["min_toefl",95,"6"],["min_gpa",85,"4"],["min_ielts",10,"9"]] as const){
  const result=resolveAcademicRequirements([{...detailFact,fieldKey,valueNumeric,unit}],{...detailScope,programName:detailFact.programName});
  const key=fieldKey==="min_toefl"?"toefl":fieldKey==="min_gpa"?"gpa":"ielts";
  assert.equal(result.summary[key],null);assert.equal(result.evidence[key].isOfficialMinimum,false);assert.equal(result.evidence[key].value,valueNumeric);
 }
});
check("detail: legacy postgraduate taxonomy cannot label a scoped published SAT cutoff not applicable",()=>{
 const result=withScopedDetailRequirements({...detailBase,universityRequirements:{undergraduateTestsApply:false}},[],new Map([[10,[{...detailFact,fieldKey:"min_sat",valueNumeric:1500,unit:"1600"}]]]),detailScope);
 assert.equal(result.universityRequirements.sat?.single,1500);assert.equal(result.universityRequirements.undergraduateTestsApply,null);
});
check("scoped pill: legacy catalogue numbers never create a pass or shortfall on list/detail/compare",()=>{
 const result=evaluateScopedUniversityDecision({minGpa:3.9,minIelts:8,minSat:1500},{gpa:2,gpaScale:4,ieltsScore:4,satScore:1000},date);
 assert.equal(result.eligibility,"unknown");assert.equal(result.pills[0].stateKey,"recorded_unknown");
});
check("scoped pill: native 100 GPA needs original minimum and maximum; no planning conversion",()=>{
 const resolved=resolveAcademicRequirements([{...detailFact,fieldKey:"min_gpa",valueNumeric:85,unit:"100"}],{...detailScope,programName:detailFact.programName});
 assert.equal(evaluateRecordedAcademicCriteria(resolved,{gpa:98,gpaScale:100},date).state,"unknown");
 assert.equal(evaluateRecordedAcademicCriteria(resolved,{applicantContext:{gpa:{value:90,minimum:0,maximum:100}}},date).state,"met");
 assert.equal(evaluateRecordedAcademicCriteria(resolved,{applicantContext:{gpa:{value:4.5,minimum:1,maximum:5}}},date).state,"unknown");
});
check("scoped pill: reviewed OR wins without flattening English alternatives into AND",()=>{
 const resolved=resolveAcademicRequirements([{...detailFact,fieldKey:"requirement_group",valueNumeric:null,valueText:JSON.stringify(english)}],{...detailScope,programName:detailFact.programName});
 assert.equal(evaluateRecordedAcademicCriteria(resolved,{ieltsScore:7.5},date).state,"met");
 const result=evaluateScopedUniversityDecision({academicRequirements:resolved},{ieltsScore:7.5},date);
 assert.equal(result.pills[0].stateKey,"recorded_met");assert.equal(result.eligibility,"partial");
});
check("discovery: the selected programme never depends on an uneditioned rank or a planning index",()=>{
 const programme={id:10,universityId:1,name:"FICTIONAL Computer Science",degreeLevel:"Bachelor",field:"Computer Science"};
 const profile={gpa:3.5,gpaScale:4,ielts:6.5,targetMajor:"Computer Science",degreeLevel:"Bachelor"};
 const raw={id:1,name:"FICTIONAL",country:"Germany",worldRanking:2};
 const a=universityProgrammeDiscovery(raw,[programme],profile,profile,true),b=universityProgrammeDiscovery({...raw,worldRanking:null},[programme],profile,profile,true);
 // The retired composite index is gone; the same programme is selected either
 // way, and no chance score is produced for any caller.
 assert.equal(a.chance,null);assert.equal(b.chance,null);
 assert.equal(a.programmeDiscovery.selectedProgrammeId,10);
 assert.equal(b.programmeDiscovery.selectedProgrammeId,10);
 assert.equal(a.programmeDiscovery.personalAdmissionProbability,null);
});
check("decision envelope: missing eight fields are compact unknown, not repeated empty evidence",()=>{
 const compact=academicDecisionEnvelope(resolveAcademicRequirements([],{}));
 assert.deepEqual(compact,{summary:{},evidence:{},requirementGroup:null});
 assert.ok(Buffer.byteLength(JSON.stringify(compact))<100);
 const native=academicDecisionEnvelope(resolveAcademicRequirements([detailFact],{...detailScope,programName:detailFact.programName}));
 assert.equal(native.summary.toefl?.single,5.5);assert.equal(native.evidence.toefl.unit,"6");
});
check("detail: not-published / N-A claims need verified publisher proof, not a draft marker",()=>{
 const context={...detailScope,programName:detailFact.programName};
 for(const valueType of ["not_published","not_applicable"] as const){
  for(const edit of [{verificationStatus:"review_needed" as const},{publisherOfficial:false},{verifiedAt:"2026-02-30"},{sourceUrl:"http://fictional.example.edu/policy"}]){
   const result=resolveAcademicRequirements([{...detailFact,valueType,valueNumeric:null,...edit}],context);
   assert.equal(result.evidence.toefl.valueType,"unknown");assert.equal(result.summary.toefl,null);
  }
  const proved=resolveAcademicRequirements([{...detailFact,valueType,valueNumeric:null}],context);
  assert.equal(proved.evidence.toefl.valueType,valueType);assert.equal(proved.summary.toefl,null);
 }
});
const academicContext={...detailScope,programName:detailFact.programName};
const academicFacts=(extra:Partial<CatalogueFact>[]=[])=>([
 {...detailFact,fieldKey:"requirement_group",valueNumeric:null,valueText:JSON.stringify(english),unit:null},
 ...extra.map(fact=>({...detailFact,...fact})),
]);
check("composition: English OR does not erase an independent original-scale GPA shortfall",()=>{
 const resolved=resolveAcademicRequirements(academicFacts([{fieldKey:"min_gpa",valueNumeric:85,unit:"100"}]),academicContext);
 const result=evaluateRecordedAcademicCriteria(resolved,{ieltsScore:7.5,applicantContext:{gpa:{value:80,minimum:0,maximum:100}}},date);
 assert.equal(result.state,"unmet");assert.equal(result.children[0].state,"met");assert.equal(result.children[1].children[0].field,"gpa");
 assert.equal(evaluateScopedUniversityDecision({academicRequirements:resolved},{ieltsScore:7.5,applicantContext:{gpa:{value:80,minimum:0,maximum:100}}},date).eligibility,"not_met");
});
check("composition: English OR cannot hide missing GPA or compare a planning conversion",()=>{
 const resolved=resolveAcademicRequirements(academicFacts([{fieldKey:"min_gpa",valueNumeric:85,unit:"100"}]),academicContext);
 assert.equal(evaluateRecordedAcademicCriteria(resolved,{ieltsScore:7.5},date).state,"unknown");
 assert.equal(evaluateRecordedAcademicCriteria(resolved,{ieltsScore:7.5,applicantContext:{gpa:{value:4.5,minimum:1,maximum:5,conversion:{method:"proportional_planning",value:3.8}}}},date).state,"unknown");
 assert.equal(evaluateRecordedAcademicCriteria(resolved,{ieltsScore:7.5,applicantContext:{gpa:{value:90,minimum:0,maximum:100}}},date).state,"met");
});
check("composition: explicit official SAT is independent even on a graduate-labelled scope",()=>{
 const resolved=resolveAcademicRequirements(academicFacts([{fieldKey:"min_sat",valueNumeric:1500,unit:"1600"}]),academicContext);
 assert.equal(evaluateRecordedAcademicCriteria(resolved,{ieltsScore:7.5,satScore:1400},date).state,"unmet");
 assert.equal(evaluateRecordedAcademicCriteria(resolved,{ieltsScore:7.5},date).state,"unknown");
 assert.equal(evaluateRecordedAcademicCriteria(resolved,{ieltsScore:7.5,satScore:1550},date).state,"met");
});
check("composition: canonical English totals remain alternatives rather than flattened mandatory tests",()=>{
 const resolved=resolveAcademicRequirements(academicFacts([{fieldKey:"min_toefl",valueNumeric:110,unit:"120"},{fieldKey:"min_ielts",valueNumeric:7,unit:"9"},{fieldKey:"min_gpa",valueNumeric:85,unit:"100"}]),academicContext);
 assert.equal(evaluateRecordedAcademicCriteria(resolved,{ieltsScore:7.5,applicantContext:{gpa:{value:90,minimum:0,maximum:100}}},date).state,"met");
});
check("composition: authored fields are not duplicated and admin IDs cannot collide with generated IDs",()=>{
 const facts=academicFacts([{fieldKey:"min_gpa",valueNumeric:85,unit:"100"}]);
 facts[0]={...facts[0],valueText:JSON.stringify({...english,id:"recorded-gpa"})};
 assert.equal(evaluateRecordedAcademicCriteria(resolveAcademicRequirements(facts,academicContext),{ieltsScore:7.5,applicantContext:{gpa:{value:90,minimum:0,maximum:100}}},date).state,"met");
});
check("composition: an unknown operator stays in the proof, not replaced by a passing independent GPA",()=>{
 const facts=academicFacts([{fieldKey:"min_gpa",valueNumeric:85,unit:"100"}]);facts[0]={...facts[0],valueText:JSON.stringify({id:"unknown-op",operator:"futureOperator",children:[]})};
 const result=evaluateRecordedAcademicCriteria(resolveAcademicRequirements(facts,academicContext),{applicantContext:{gpa:{value:90,minimum:0,maximum:100}}},date);
 assert.equal(result.state,"unknown");assert.equal(result.children[0].reason,"unknown_operator");
});
check("composition: group N-A does not exempt an unrelated explicit numeric GPA",()=>{
 const facts=academicFacts([{fieldKey:"min_gpa",valueNumeric:85,unit:"100"}]);facts[0]={...facts[0],valueText:JSON.stringify({id:"optional-part",operator:"not_applicable"})};
 assert.equal(evaluateRecordedAcademicCriteria(resolveAcademicRequirements(facts,academicContext),{applicantContext:{gpa:{value:80,minimum:0,maximum:100}}},date).state,"unmet");
});
check("composition: draft independent minima never become blockers beside a reviewed group",()=>{
 const resolved=resolveAcademicRequirements(academicFacts([{fieldKey:"min_gpa",valueNumeric:85,unit:"100",verificationStatus:"review_needed"}]),academicContext);
 assert.equal(evaluateRecordedAcademicCriteria(resolved,{ieltsScore:7.5},date).state,"met");
});
check("program match: same canonical original-unit composition as list/detail/compare",()=>{
 const academicRequirements=academicDecisionEnvelope(resolveAcademicRequirements(academicFacts([{fieldKey:"min_gpa",valueNumeric:85,unit:"100"}]),academicContext));
 const req:RecommendRequirement={programId:1,academicRequirements,minGpa:null,minIelts:null,minToefl:null,minDet:null,minSat:null,minAct:null,ibRequirement:null,aLevelRequirement:null,apRequirement:null,subjectRequirements:"FICTIONAL publisher prerequisite",otherRequirements:null};
 const good=assessEligibility({ielts:7.5,gpa:90,gpaMinimum:0,gpaScale:100},[req]);assert.equal(good.group?.state,"met");assert.equal(good.textRequirements[0].text,req.subjectRequirements);
 assert.equal(assessEligibility({ielts:7.5,gpa:80,gpaMinimum:0,gpaScale:100},[req]).group?.state,"unmet");
 assert.equal(assessEligibility({ielts:7.5,gpa:90,gpaScale:100},[req]).group?.state,"unknown");
});
check("original GPA: invalid forged override cannot pass a native four-point cutoff",()=>{
 const resolved=resolveAcademicRequirements([{...detailFact,fieldKey:"min_gpa",valueNumeric:3.5,unit:"4"}],academicContext);
 for(const value of [95,-1,Number.POSITIVE_INFINITY])assert.equal(evaluateRecordedAcademicCriteria(resolved,{applicantContext:{gpa:{value,minimum:0,maximum:4}}},date).state,"unknown");
});
check("program match: an empty canonical envelope never falls back to rejected raw aliases",()=>{
 const req:RecommendRequirement={programId:1,academicRequirements:academicDecisionEnvelope(resolveAcademicRequirements([],{})),minGpa:4,minIelts:10,minToefl:120,minDet:null,minSat:null,minAct:null,ibRequirement:null,aLevelRequirement:null,apRequirement:null,subjectRequirements:null,otherRequirements:null};
 const result=assessEligibility({gpa:2,gpaScale:4,ielts:6},[req]);assert.equal(result.met,0);assert.equal(result.unmet,0);assert.equal(result.unknown,1);assert.equal(result.group,undefined);
});
const fundingLines=[{key:"tuition",label:"Tuition",cost:10000},{key:"living",label:"Living",cost:10000}];
const fundingItem=(status:FundingItemLike["status"],amountUsd=20000,covers:string|null=null):FundingItemLike=>({kind:"scholarship",name:"FICTIONAL funding record",status,amountUsd,covers});
check("finance: confirmed default never counts planned/applied/awarded/declined as secured",()=>{
 for(const status of ["planned","applied","awarded","declined"] as const){const plan=buildFundingScenario({annualCost:20000,lines:fundingLines,items:[fundingItem(status)]});assert.equal(plan.scenario,"confirmed");assert.equal(plan.fundingGap,20000);assert.equal(plan.securedTotal,0);assert.equal(plan.isCovered,false);assert.equal(plan.byLine[0].covered,0);}
});
check("finance: optimistic requires explicit opt-in, without changing the retained projection engine",()=>{
 const input={annualCost:20000,lines:fundingLines,items:[fundingItem("applied")]};
 assert.equal(buildFundingPlan(input).fundingGap,0);assert.equal(buildFundingScenario(input).fundingGap,20000);
 const optimistic=buildFundingScenario(input,"optimistic");assert.equal(optimistic.fundingGap,0);assert.equal(optimistic.securedGap,20000);assert.equal(optimistic.securedTotal,0);assert.equal(optimistic.isCovered,true);
});
check("finance: restricted surplus cannot close an unrelated annual living gap",()=>{
 for(const scenario of ["confirmed","optimistic"] as const){const plan=buildFundingScenario({annualCost:20000,lines:fundingLines,items:[fundingItem("confirmed",40000,JSON.stringify(["tuition"]))]},scenario);assert.equal(plan.securedTotal,40000);assert.equal(plan.securedAllocatedTotal,10000);assert.equal(plan.fundingGap,10000);assert.equal(plan.isCovered,false);assert.equal(plan.byLine[1].covered,0);}
});
check("finance: unrestricted cash is still allocated once, after restricted awards",()=>{
 const plan=buildFundingScenario({annualCost:20000,lines:fundingLines,items:[fundingItem("confirmed",10000),fundingItem("confirmed",10000,JSON.stringify(["tuition"]))]});assert.equal(plan.fundingGap,0);assert.equal(plan.securedAllocatedTotal,20000);assert.equal(plan.isCovered,true);
});
check("finance: awarded/planned become conditional totals, not confirmed by-line coverage",()=>{
 const plan=buildFundingScenario({annualCost:20000,lines:fundingLines,items:[fundingItem("confirmed",2000),fundingItem("awarded",3000),fundingItem("planned",4000),fundingItem("declined",9000)]});assert.equal(plan.securedTotal,2000);assert.equal(plan.projectedTotal,9000);assert.equal(plan.conditionalTotal,7000);assert.equal(plan.fundingGap,18000);assert.equal(plan.optimisticGap,11000);
});
check("finance: missing or inconsistent annual cost lines produce unknown, never a false zero",()=>{
 for(const input of [{annualCost:null,lines:fundingLines},{annualCost:20000,lines:[{key:"tuition",label:"Tuition",cost:null}]},{annualCost:30000,lines:fundingLines}]){const plan=buildFundingScenario({...input,items:[fundingItem("confirmed",100000)]});assert.equal(plan.fundingGap,null);assert.equal(plan.isCovered,null);}
});
check("finance: zero is a known zero only when every included line is known",()=>{
 const plan=buildFundingScenario({annualCost:0,lines:[{key:"tuition",label:"Tuition",cost:0}],items:[]});assert.equal(plan.fundingGap,0);assert.equal(plan.isCovered,true);assert.equal(plan.upfrontGap,null);
});
check("finance: confirmed loans remain repayable and disbursement timing remains unknown",()=>{
 const plan=buildFundingScenario({annualCost:20000,lines:fundingLines,items:[{...fundingItem("confirmed"),kind:"loan"}]});assert.equal(plan.fundingGap,0);assert.equal(plan.repayableTotal,20000);assert.equal(plan.upfrontGap,null);assert.equal(plan.timingRecorded,false);assert.equal(plan.basis,"student_recorded_cash_commitments");
});
check("Finance post-admission awarded is conditional, never confirmed tuition coverage",()=>{
 const result=postAdmissionFunding({tuition:60000,universityName:"FICTIONAL",items:[{kind:"scholarship",name:"FICTIONAL awarded only",amountUsd:90000,status:"awarded"}]});
 assert.equal(result.scholarship,0);assert.equal(result.conditionalTotal,90000);assert.equal(result.tuitionRemaining,60000);assert.equal(result.confirmedAllocatedToTuition,0);
});
check("Finance post-admission living restrictions cannot pay tuition; confirmed allocation matches the shared adapter",()=>{
 const items:FundingItemLike[]=[{kind:"scholarship",name:"FICTIONAL living only",amountUsd:70000,status:"confirmed",covers:'["living"]'},{kind:"savings",name:"FICTIONAL tuition cash",amountUsd:5000,status:"confirmed"}];
 const result=postAdmissionFunding({tuition:60000,items,universityName:"FICTIONAL"});
 const plan=buildFundingScenario({annualCost:60000,lines:[{key:"tuition",label:"Tuition",cost:60000}],items});
 assert.equal(result.tuitionRemaining,plan.fundingGap);assert.equal(result.tuitionRemaining,55000);assert.equal(result.confirmedAllocatedToTuition,5000);assert.equal(result.confirmedNotAllocatedToTuition,70000);
});
check("Finance post-admission loans stay repayable and do not silently remove the deposit",()=>{
 const result=postAdmissionFunding({tuition:6000,items:[{kind:"loan",name:"FICTIONAL repayable loan",amountUsd:1500,status:"confirmed"}],depositAmount:3000,depositDueDate:"2027-01-01",universityName:"FICTIONAL"});
 assert.equal(result.repayableTotal,1500);assert.equal(result.tuitionRemaining,4500);assert.equal(result.payableNow.amount,3000);assert.equal(result.upfrontGap,null);assert.equal(result.timingRecorded,false);
});
check("Finance post-admission invalid/unknown tuition is not a recorded zero",()=>{
 for(const tuition of [null,NaN,Infinity,-1])assert.equal(postAdmissionFunding({tuition,items:[],universityName:"FICTIONAL"}).tuitionRemaining,null);
 assert.equal(postAdmissionFunding({tuition:0,items:[],universityName:"FICTIONAL"}).tuitionRemaining,0);
});
check("Auth client shape guard accepts matching server profile/session, never a stored profile alone",()=>{
 const profile={id:7,name:"FICTIONAL",email:"fixture@example.test",isAdmin:false};
 assert.equal(profileFromSessionEnvelope({profile,session:{profileId:7,isAdmin:false}})?.id,7);
 assert.equal(profileFromSessionEnvelope(profile),null);assert.equal(profileFromSessionEnvelope({profile}),null);
});
check("Auth client shape guard rejects missing, mismatched and forged role envelopes",()=>{
 const profile={id:7,name:"FICTIONAL",email:"fixture@example.test",isAdmin:false};
 for(const session of [null,{},[],{profileId:8,isAdmin:false},{profileId:7,isAdmin:true},{profileId:7,isAdmin:0}])assert.equal(profileFromSessionEnvelope({profile,session}),null);
 assert.equal(profileFromSessionEnvelope({profile:{...profile,isAdmin:true},session:{profileId:7,isAdmin:true}})?.isAdmin,true);
});
check("Auth client shape guard rejects malformed IDs/names and retains real profile metadata",()=>{
 const profile={id:7,name:"FICTIONAL",email:"fixture@example.test",isAdmin:false,applicantContext:{citizenships:["UZ"]}};
 assert.deepEqual(profileFromSessionEnvelope({profile,session:{profileId:7,isAdmin:false}})?.applicantContext,profile.applicantContext);
 for(const id of [null,undefined,0,-1,1.5,"7",Infinity])assert.equal(profileFromSessionEnvelope({profile:{...profile,id},session:{profileId:id,isAdmin:false}}),null);
 for(const patch of [{name:null},{email:1},{isAdmin:undefined}])assert.equal(profileFromSessionEnvelope({profile:{...profile,...patch},session:{profileId:7,isAdmin:false}}),null);
});
console.log(`${passed} continuation behaviour checks passed`);
