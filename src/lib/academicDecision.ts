import {verifiedEvidenceDate} from "./typedEvidence";
import type {PresentedFact} from "./factPresentation";
import type {ApplicantContext} from "./applicantContext";
import {recordedToefl} from "./applicantContext";
import {evaluateApplicantRequirementGroup,type ApplicantRequirementInput,type RequirementEvaluation} from "./requirementGroups";
import {evaluateUniversityDecision,type DecisionProfileInput,type DecisionUniversityInput,type UniversityDecision} from "./decisionPills";

/** API-resolved scope only. Raw university columns never enter this verdict. */
export interface ResolvedAcademicDecisionInput {
 evidence:Record<string,PresentedFact>;
 summary:Record<string,{single:number;unit:string|null}|null>;
 requirementGroup:PresentedFact|null;
}
export interface OriginalAcademicProfile extends DecisionProfileInput {
 applicantContext?:ApplicantContext|null;actScore?:number|null;duolingoScore?:number|null;
}
export interface ScopedDecisionUniversity extends DecisionUniversityInput {
 academicRequirements?:ResolvedAcademicDecisionInput|null;
}
export function originalAcademicRequirementInput(profile:OriginalAcademicProfile|null|undefined){
 const context=profile?.applicantContext,exam=recordedToefl(context,profile?.toeflScore);
 return {gpa:context?.gpa?.value??profile?.gpa,gpaScale:context?.gpa?.minimum!=null?context.gpa.maximum:null,gpaMinimum:context?.gpa?.minimum,ielts:profile?.ieltsScore,sat:profile?.satScore,act:profile?.actScore,duolingo:profile?.duolingoScore,toefl:exam.score,toeflScale:exam.scale,toeflRecord:context?.toefl};
}
/** A reviewed group owns the fields it authors. English total alternatives are
 * one family, not separate mandatory clauses. Independent GPA/SAT/etc remain
 * mandatory: an English OR must never make an unrelated shortfall disappear. */
export function evaluateResolvedAcademicCriteria(requirements:ResolvedAcademicDecisionInput|null|undefined,original:ApplicantRequirementInput,asOfDate:string):RequirementEvaluation {
 const group=requirements?.requirementGroup;
 const reviewed=group?.trust==="official_verified"&&group.valueType==="official_requirement"&&group.verificationStatus==="verified"&&group.sourceUrl?.startsWith("https://")&&verifiedEvidenceDate(group.verifiedAt);
 const result=reviewed?evaluateApplicantRequirementGroup(group.value,original,asOfDate):null;
 const covered=new Set<string>();
 const visit=(node:RequirementEvaluation)=>{if(node.field)covered.add(node.field);node.children.forEach(visit);};
 if(result)visit(result);
 const englishTotals=new Set(["ielts","toefl","duolingo","pte","cambridgeEnglish"]);
 const groupedEnglish=[...covered].some(field=>englishTotals.has(field));
 const children=Object.entries(requirements?.summary??{}).flatMap(([field,value])=>{
  const evidence=requirements?.evidence[field];
  if(!value||!evidence?.isOfficialMinimum||covered.has(field)||(groupedEnglish&&englishTotals.has(field)))return [];
  return [{id:`recorded-${field}`,kind:"minimum",field,value:value.single,unit:value.unit==="GPA 4.0"||value.unit==="4.0"?"4":value.unit==="IELTS band"?"9":value.unit}];
 });
 // An exemption exempts that group, not unrelated numeric criteria.
 // IDs/labels are never used to infer a field or a waiver domain.
 if(result&&!children.length)return result;
 const independent=evaluateApplicantRequirementGroup({id:"recorded-criteria",operator:"allOf",children},original,asOfDate);
 if(!result)return independent;
 // Evaluate separately, so admin-owned IDs cannot collide with generated IDs.
 // Keep the malformed/unknown group in the proof instead of dropping it.
 const applicable=[result,independent].filter(child=>child.state!=="not_applicable");
 const state=applicable.some(child=>child.state==="unmet")?"unmet":applicable.some(child=>child.state==="unknown")?"unknown":"met";
 return {id:"scoped-recorded-criteria",label:"scoped-recorded-criteria",operator:"allOf",state,reason:"group",children:[result,independent]};
}
export function evaluateRecordedAcademicCriteria(requirements:ResolvedAcademicDecisionInput|null|undefined,profile:OriginalAcademicProfile|null|undefined,asOfDate:string):RequirementEvaluation {
 return evaluateResolvedAcademicCriteria(requirements,originalAcademicRequirementInput(profile),asOfDate);
}
/** Budget/work-visa engines are preserved. Academic UI uses only the scoped
 * envelope and original score units, including grouped English alternatives.
 * "Recorded checks met" is not a claim that every admissions criterion exists. */
export function evaluateScopedUniversityDecision(university:ScopedDecisionUniversity,profile:OriginalAcademicProfile|null|undefined,asOfDate:string):UniversityDecision {
 const decision=evaluateUniversityDecision({...university,minGpa:null,minIelts:null,minSat:null},profile);
 const result=evaluateRecordedAcademicCriteria(university.academicRequirements,profile,asOfDate);
 const state=result.state;
 decision.pills[0]={id:"eligibility",tone:state==="met"?"positive":state==="unmet"?"caution":"neutral",stateKey:`recorded_${state}`,params:{},hintKey:"recordedHint",hintParams:{}};
 decision.eligibility=state==="unmet"?"not_met":state==="met"?"partial":"unknown";
 decision.personalised=decision.personalised||state==="met"||state==="unmet";
 return decision;
}
