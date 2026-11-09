/** Saved-university award coverage. Discovery hints are never proof of scope,
 * award confirmation, annual value, or full total-cost funding. The same result
 * is consumed by dashboard, scholarship hub, deadlines and autopilot. */
import {normalizeFinancePeriod} from './financeModel';
import {countriesMatch,isEuropeanCountry} from './countries';
import type {CatalogueFact} from './evidencePolicy';
import {resolveScopedFact,type FactContext} from './factResolver';
import {isVerifiedOfficialRequirement,type TrustedValue} from './typedEvidence';
import {evaluateApplicantRequirementGroup,type ApplicantRequirementInput} from './requirementGroups';
export const GLOBAL_SCHOLARSHIP_COUNTRY_RE=/^(global|international|all|worldwide|multiple countries)$/i;
export const EU_SCHOLARSHIP_COUNTRY_RE=/^(europe|european union|eu)$/i;
export interface CoverageScholarshipInput{
 title?:string|null;description?:string|null;provider?:string|null;country?:string|null;coverageType?:string|null;tuitionCoverage?:string|null;
 amountUsdValue?:number|null;annualUsdValue?:number|null;
 /** Server-loaded field-level facts, not an entity verification checkbox. */
 catalogueFacts?:CatalogueFact[];
}
export interface SavedUniRef{
 id:number;name:string;country:string|null;annualTuitionUsd:number|null;
 programmeId?:number|null;programName?:string|null;degreeLevel?:string|null;admissionCycle?:string|null;applicantScope?:string|null;
 citizenships?:string[];residency?:string|null;applicant?:ApplicantRequirementInput;asOfDate?:string;
}
export type AwardApplicability='applicable'|'not_applicable'|'unknown';
export type AwardCostCoverage='full'|'partial'|'none'|'unknown';
export interface ScopedUniversityCoverage{
 programmeId:number|null;programName:string|null;admissionCycle:string|null;applicantScope:string|null;
 universityId:number;universityName:string;state:AwardApplicability;tuition:AwardCostCoverage;totalCost:AwardCostCoverage;
 reason:'scope_missing'|'evidence_missing'|'scope_mismatch'|'requirements_unknown'|'requirements_unmet'|'recorded_scope_met'|'coverage_conflict';
 sourceUrls:string[];
}
export interface SavedUniCoverage{
 coveredUniNames:string[];coversSavedUni:boolean;isFullForSavedUni:boolean;isFullCoverage:boolean;
 coverageState:AwardApplicability;tuitionCoverage:AwardCostCoverage;totalCostCoverage:AwardCostCoverage;
 /** Unverified links remain useful discovery, explicitly outside coverage. */
 discoveryUniNames:string[];scopeComplete:boolean;universities:ScopedUniversityCoverage[];
}
/** Legacy wording hint only; never used to assert applicability or rank full funding. */
export function scholarshipSaysFull(s:CoverageScholarshipInput):boolean{
 const text=`${s.coverageType??''} ${s.tuitionCoverage??''}`;
 return !/\b(?:not|no|non|without)\W+full\b/i.test(text)&&/\bfull\b/i.test(text);
}
const scopeKeys=['programName','degreeLevel','admissionCycle','applicantScope'] as const;
const same=(a:unknown,b:unknown)=>typeof a==='string'&&typeof b==='string'&&!!a.trim()&&a.trim().toLowerCase()===b.trim().toLowerCase();
function scopedFact(facts:CatalogueFact[],field:string,context:FactContext):TrustedValue|null{
 const fact=resolveScopedFact(facts,field,context);
 return fact&&isVerifiedOfficialRequirement(fact)&&scopeKeys.every(key=>same(fact[key],context[key]))?fact:null;
}
function listVerdict(fact:TrustedValue|null,values:string[]|undefined):boolean|null{
 if(!fact||typeof fact.value!=='string')return null;
 let entries:unknown;try{entries=JSON.parse(fact.value)}catch{return null}
 if(!Array.isArray(entries)||!entries.length||!entries.every(e=>typeof e==='string'&&e.trim()))return null;
 if(entries.length===1&&entries[0]==='*')return true;
 if(entries.includes('*')||!values?.length)return null;
 return entries.some(entry=>values.some(value=>countriesMatch(entry,value)));
}
function scopedCoverage(s:CoverageScholarshipInput,u:SavedUniRef):ScopedUniversityCoverage{
 const out:ScopedUniversityCoverage={programmeId:u.programmeId??null,programName:u.programName??null,admissionCycle:u.admissionCycle??null,applicantScope:u.applicantScope??null,universityId:u.id,universityName:u.name,state:'unknown',tuition:'unknown',totalCost:'unknown',reason:'scope_missing',sourceUrls:[]};
 if(!Number.isSafeInteger(u.programmeId)||u.programmeId!<1||!Number.isSafeInteger(u.id)||u.id<1||!scopeKeys.every(key=>typeof u[key]==='string'&&u[key]!.trim()))return out;
 const facts=s.catalogueFacts??[],context:FactContext=u;
 const read=(key:string)=>{const fact=scopedFact(facts,key,context);if(fact?.sourceUrl&&!out.sourceUrls.includes(fact.sourceUrl))out.sourceUrls.push(fact.sourceUrl);return fact;};
 const institution=read('university_id'),programme=read('program_id'),complete=read('scope_complete'),citizenships=read('eligible_citizenships'),residency=read('eligible_residencies'),requirements=read('requirement_group');
 const identity=(fact:TrustedValue|null,id:number|undefined|null)=>fact?.value==='*'?true:fact&&typeof fact.value==='number'&&Number.isSafeInteger(fact.value)&&fact.value>0?fact.value===id:null;
 const checks=[identity(institution,u.id),identity(programme,u.programmeId),listVerdict(citizenships,u.citizenships),listVerdict(residency,u.residency?[u.residency]:undefined)];
 if(checks.includes(false))return {...out,state:'not_applicable',reason:'scope_mismatch'};
 if(checks.includes(null)||complete?.value!=='documented_complete'||!requirements)return {...out,reason:'evidence_missing'};
 const group=evaluateApplicantRequirementGroup(requirements.value,u.applicant??{},u.asOfDate??new Date().toISOString().slice(0,10));
 if(group.state==='unknown')return {...out,reason:'requirements_unknown'};
 if(group.state==='unmet')return {...out,state:'not_applicable',reason:'requirements_unmet'};
 const cost=(field:string):AwardCostCoverage=>{const fact=read(field);return fact&&normalizeFinancePeriod(fact.period)==='year'&&['full','partial','none'].includes(String(fact.value))?fact.value as AwardCostCoverage:'unknown';};
 const tuition=cost('tuition_coverage'),totalCost=cost('total_cost_coverage');
 if(totalCost==='full'&&(tuition==='none'||tuition==='partial'))return {...out,state:'applicable',reason:'coverage_conflict',tuition,totalCost:'unknown'};
 return {...out,state:'applicable',reason:'recorded_scope_met',tuition,totalCost};
}
export function evaluateScholarshipForSavedUnis(s:CoverageScholarshipInput,savedUnis:SavedUniRef[]):SavedUniCoverage{
 const text=[s.title,s.description,s.provider].map(v=>(v??'').toLowerCase()).join(' '),country=(s.country??'').trim();
 const discoveryUniNames=savedUnis.filter(u=>!!u.name.trim()&&text.includes(u.name.trim().toLowerCase())||countriesMatch(country,u.country)||GLOBAL_SCHOLARSHIP_COUNTRY_RE.test(country)||EU_SCHOLARSHIP_COUNTRY_RE.test(country)&&isEuropeanCountry(u.country)).map(u=>u.name);
 const universities=savedUnis.map(u=>scopedCoverage(s,u)),applicable=universities.filter(u=>u.state==='applicable');
 const aggregate=(key:'tuition'|'totalCost'):AwardCostCoverage=>applicable.some(u=>u[key]==='full')?'full':applicable.some(u=>u[key]==='partial')?'partial':applicable.length&&applicable.every(u=>u[key]==='none')?'none':'unknown';
 const totalCostCoverage=aggregate('totalCost');
 return {coveredUniNames:applicable.map(u=>u.universityName),coversSavedUni:applicable.length>0,isFullForSavedUni:totalCostCoverage==='full',isFullCoverage:totalCostCoverage==='full',coverageState:applicable.length?'applicable':universities.length&&universities.every(u=>u.state==='not_applicable')?'not_applicable':'unknown',tuitionCoverage:aggregate('tuition'),totalCostCoverage,discoveryUniNames,scopeComplete:universities.length>0&&universities.every(u=>u.state!=='unknown'),universities};
}
/** Only proved applicability/total-cost coverage earns priority. Unknown hints
 * keep their ordinary explicit fit ordering; tuition-only is never a full ride. */
export function coverageTier(cov:SavedUniCoverage):0|1|2|3{
 if(cov.isFullForSavedUni)return 3;if(cov.coversSavedUni)return 2;if(cov.isFullCoverage)return 1;return 0;
}
