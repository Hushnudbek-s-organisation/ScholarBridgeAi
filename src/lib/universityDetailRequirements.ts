import type {CatalogueFact} from "./evidencePolicy";
import {resolveScopedFact,type FactContext} from "./factResolver";
import {adaptLegacyField,fromCatalogueFact,isVerifiedOfficialRequirement,mayAutoReject} from "./typedEvidence";
import {presentFact,type PresentedFact} from "./factPresentation";

const fields={gpa:["min_gpa","minGpa"],ielts:["min_ielts","minIelts"],toefl:["min_toefl","minToefl"],duolingo:["min_det","minDuolingo"],sat:["min_sat","minSat"],act:["min_act","minAct"],pte:["min_pte","minPte"],cambridgeEnglish:["min_cambridge_english","minCambridgeEnglish"]} as const;
export type AcademicField=keyof typeof fields;
export interface DetailRequirement {
  requirementType:string;minimumValue:number|null;valueText:string|null;
  sourceUrl:string|null;lastVerifiedAt:string|null;verificationStatus:string;
  unit?:string|null;admissionCycle?:string|null;evidence?:PresentedFact;
}
interface DetailProgramme extends Record<string,unknown>{id:number;name:string;degree:string|null;requirements:DetailRequirement[]}
const units:Record<AcademicField,readonly string[]>={gpa:[],ielts:["9","IELTS band"],toefl:["120","6"],duolingo:["160"],sat:["1600"],act:["36"],pte:["90"],cambridgeEnglish:["230"]};
function knownUnit(key:AcademicField,unit:string|null):boolean{
  if(!unit)return false;
  if(key==="gpa")return /^(?:\d+(?:\.\d+)?|GPA 4\.0)$/.test(unit)&& (unit==="GPA 4.0"||Number(unit)>0);
  return units[key].includes(unit);
}
function validNumeric(key:AcademicField,value:unknown,unit:string|null):value is number{
  if(typeof value!=="number"||!Number.isFinite(value)||value<0||!knownUnit(key,unit))return false;
  const upper=unit==="GPA 4.0"?4:unit==="IELTS band"?9:Number(unit);
  return value<=upper;
}
/** Context is supplied explicitly. No union/range across programmes, cycles,
 * applicant groups or incompatible score units is an official requirement. */
export function resolveAcademicRequirements(facts:CatalogueFact[],context:FactContext){
  const evidence={} as Record<AcademicField,PresentedFact>;
  const minima={} as Record<(typeof fields)[AcademicField][1],number|null>;
  const summary={} as Record<AcademicField,{values:number[];min:number;max:number;single:number;range:string;unit:string|null}|null>;
  for(const [key,[field,alias]] of Object.entries(fields) as [AcademicField,(typeof fields)[AcademicField]][]){
    const resolved=resolveScopedFact(facts,field,context);
    const numeric=resolved&&mayAutoReject(resolved)&&validNumeric(key,resolved.value,resolved.unit)?resolved.value:null;
    let displayed=resolved&&mayAutoReject(resolved)&&!validNumeric(key,resolved.value,resolved.unit)&&typeof resolved.value==="number"?{...resolved,trust:"official_unverified" as const,note:"Publisher value retained; the original score unit is missing/unsupported or the value lies outside that scale. No numeric cutoff inferred."}:resolved;
    if(resolved&&["not_published","not_applicable"].includes(resolved.valueType)){
      // A claimed absence/exemption is itself a publisher policy claim. Probe
      // the SAME scoped rows through the official-source/date gate without
      // ever treating the marker as a numeric cutoff or changing stored facts.
      const policy=resolveScopedFact(facts.filter(fact=>fact.fieldKey===field&&fact.valueType===resolved.valueType).map(fact=>({...fact,valueType:"official_requirement" as const})),field,context);
      displayed=policy&&isVerifiedOfficialRequirement(policy)?{...policy,valueType:resolved.valueType}:{...resolved,trust:"unknown",valueType:"unknown",note:"An unconfirmed absence/exemption claim is retained for review, not asserted as publisher policy."};
    }
    evidence[key]=presentFact(displayed??adaptLegacyField({fieldKey:field,value:null}),key);
    minima[alias]=numeric;
    summary[key]=numeric==null?null:{values:[numeric],min:numeric,max:numeric,single:numeric,range:String(numeric),unit:resolved!.unit};
  }
  const group=resolveScopedFact(facts,"requirement_group",context);
  return {evidence,minima,summary,requirementGroup:group&&isVerifiedOfficialRequirement(group)?presentFact(group,"requirement_group"):null};
}
/** Compact canonical decision envelope. Missing fields remain missing/unknown;
 * do not repeat eight 600-byte empty envelopes on every list row. */
export function academicDecisionEnvelope(resolved:ReturnType<typeof resolveAcademicRequirements>){
 return {summary:Object.fromEntries(Object.entries(resolved.summary).filter(([,value])=>value!=null)),evidence:Object.fromEntries(Object.entries(resolved.evidence).filter(([,fact])=>!fact.isUnknown||["not_published","not_applicable"].includes(fact.valueType))),requirementGroup:resolved.requirementGroup};
}
const flags=["portfolioRequired","interviewRequired","recommendationRequired","personalStatementRequired"] as const;
/** Operates on a RESPONSE copy, not the shared public base cache. Personal or
 * query scope is never baked into that university-id-only cache. */
export function withScopedDetailRequirements(base:Record<string,unknown>,facts:CatalogueFact[],programFacts:Map<number,CatalogueFact[]>,context:FactContext&{programId?:number|null}){
  const rawUniversity=base.university as Record<string,unknown>;
  const rawPrograms=(base.programs??[]) as DetailProgramme[];
  const programs=rawPrograms.map(p=>{
    const scope={...context,programName:p.name,degreeLevel:p.degree};
    const resolved=resolveAcademicRequirements(programFacts.get(p.id)??[],scope);
    const legacy=p.requirements.map(row=>({...row,evidence:presentFact({...adaptLegacyField({fieldKey:row.requirementType,value:row.minimumValue??row.valueText,sourceUrl:row.sourceUrl,admissionCycle:row.admissionCycle}),programName:p.name,degreeLevel:p.degree},row.requirementType)}));
    const canonical=Object.entries(resolved.evidence).filter(([,fact])=>fact.value!=null||["not_published","not_applicable"].includes(fact.valueType)).map(([key,fact])=>({requirementType:key,minimumValue:resolved.summary[key as AcademicField]?.single??null,valueText:fact.value==null?null:String(fact.value),sourceUrl:fact.sourceUrl,lastVerifiedAt:fact.verifiedAt,verificationStatus:fact.verificationStatus,unit:fact.unit,admissionCycle:fact.admissionCycle,evidence:fact}));
    return {...p,...resolved.minima,minGpaScale:resolved.evidence.gpa.unit,minToeflScale:resolved.evidence.toefl.unit,
      requirementEvidence:resolved.evidence,requirementGroup:resolved.requirementGroup,
      recordedRequirements:legacy,recordedFlags:Object.fromEntries(flags.map(key=>[key,p[key]])),
      ...Object.fromEntries(flags.map(key=>[key,null])),requirements:canonical,
    };
  });
  const selected=context.programId==null?null:programs.find(p=>p.id===context.programId)??null;
  if(context.programId!=null&&!selected)throw new Error("programme_scope_mismatch");
  const institution=resolveAcademicRequirements(facts,{...context,programName:null});
  const resolved=selected?resolveAcademicRequirements(programFacts.get(selected.id)??[],{...context,programName:selected.name,degreeLevel:selected.degree}):institution;
  const recordedCatalogue=base.universityRequirements??null;
  const requirementScope={programId:selected?.id??null,programName:selected?.name??null,degreeLevel:selected?.degree??context.degreeLevel??null,admissionCycle:context.admissionCycle??null,applicantScope:context.applicantScope??null};
  const universityRequirements={...resolved.summary,scope:requirementScope,evidence:resolved.evidence,requirementGroup:resolved.requirementGroup,recordedCatalogue,
    undergraduateTestsApply:null,
    hasUndergraduateAdmission:(recordedCatalogue as Record<string,unknown>|null)?.hasUndergraduateAdmission??null,
    satRequired:resolved.minima.minSat!=null?true:null,actRequired:resolved.minima.minAct!=null?true:null,
    satMinimumPublished:resolved.minima.minSat!=null,actMinimumPublished:resolved.minima.minAct!=null,
    ...Object.fromEntries(flags.map(key=>[key,null])),other:[],subject:[],
  };
  // Legacy university aliases no longer drive an academic verdict. Preserve
  // their values/envelopes separately; do not reinterpret a 5/100-scale GPA as 4.
  const recordedMinimums=Object.fromEntries(["minGpa","minIelts","minSat"].map(key=>[key,rawUniversity[key]??null]));
  return {...base,university:{...rawUniversity,minGpa:null,minIelts:null,minSat:null,recordedMinimums,academicRequirements:academicDecisionEnvelope(resolved)},programs,universityRequirements,
    requirementContext:requirementScope,
    requirementContexts:{admissionCycles:[...new Set([...facts,...[...programFacts.values()].flat()].map(fact=>fact.admissionCycle).filter((value):value is string=>Boolean(value)))].sort(),applicantScopes:[...new Set([...facts,...[...programFacts.values()].flat()].map(fact=>fact.applicantScope).filter((value):value is string=>Boolean(value)))].sort()},
    resolvedFacts:facts.map(fact=>({...presentFact(fromCatalogueFact(fact),fact.fieldKey),fieldKey:fact.fieldKey})),
  };
}
