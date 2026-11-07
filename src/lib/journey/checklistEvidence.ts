import type { CatalogueFact } from "../evidencePolicy";
import { resolveScopedFact, type FactContext } from "../factResolver";
import { isVerifiedOfficialRequirement, mayAutoReject, type TrustedValue } from "../typedEvidence";
import type { MinimumField, RequirementSource } from "./requirements";

/** Ambiguous / absent programme names are discovery, never the first programme. */
export function exactChecklistProgramme<T extends {name:string}>(rows:T[],name:string|null|undefined):T|null {
  if(!name?.trim())return null;
  const matches=rows.filter(row=>row.name.trim().toLowerCase()===name.trim().toLowerCase());
  return matches.length===1?matches[0]:null;
}
const keys={minGpa:"min_gpa",minIelts:"min_ielts",minToefl:"min_toefl",minSat:"min_sat",minAct:"min_act",minDuolingo:"min_det",applicationFee:"application_fee"} as const;
const source=(value:TrustedValue):RequirementSource=>({sourceUrl:value.sourceUrl,sourceName:null,sourceType:"official_website",lastVerifiedAt:value.verifiedAt,verificationStatus:"verified"});
/** Same field/scope/conflict/publisher resolver as Program Match. Legacy entity
 * flags and numbers are not upgraded to official requirements by this adapter. */
export function scopedChecklistEvidence(facts:CatalogueFact[],context:FactContext){
  const fields={} as Record<keyof typeof keys,number|null>;
  const fieldSources:Partial<Record<MinimumField,RequirementSource>>={};
  for(const [field,key] of Object.entries(keys) as [keyof typeof keys,string][]){
    const value=resolveScopedFact(facts,key,context);
    const valid=value&&typeof value.value==="number"&&Number.isFinite(value.value)&&value.value>=0&&
      (field==="applicationFee"?isVerifiedOfficialRequirement(value)&&value.currency==="USD":mayAutoReject(value));
    fields[field]=valid?value.value as number:null;
    if(valid)fieldSources[field]=source(value);
  }
  const gpa=resolveScopedFact(facts,"min_gpa",context),toefl=resolveScopedFact(facts,"min_toefl",context);
  const group=resolveScopedFact(facts,"requirement_group",context);
  return {...fields,fieldSources,minGpaScale:fields.minGpa!=null&&["4","4.0","GPA 4.0"].includes(gpa?.unit??"")?4:null,
    minToeflScale:fields.minToefl!=null&&["120","6"].includes(toefl?.unit??"")?toefl!.unit:null,
    publishedGroup:group&&isVerifiedOfficialRequirement(group)?{value:group.value,source:source(group)}:null};
}
