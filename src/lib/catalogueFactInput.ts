import {parseRequirementGroup,evaluateRequirementGroup} from "./requirementGroups";
const TYPES=new Set(["official_requirement","recommended_score","observed_statistic","computed_fit","planning_estimate","evidence_coverage","experimental_index","historical_acceptance_rate","unknown","not_published","not_applicable","unverified"]);
const text=(v:unknown,max=300)=>{if(v==null||v==="")return null;if(typeof v!=="string"||v.length>max)throw new Error("Invalid fact text");return v.trim()||null;};
export function catalogueFactInput(input:Record<string,unknown>):Record<string,unknown>{
  if(!["university","program","scholarship","ranking","source"].includes(String(input.entityType)))throw new Error("Invalid entity type");
  const id=Number(input.entityId);if(!Number.isSafeInteger(id)||id<1||id>2147483647)throw new Error("Invalid entity id");
  const field=text(input.fieldKey,100);if(!field||!/^\w+$/.test(field))throw new Error("Invalid field key");
  const kind=String(input.valueType??"unverified");if(!TYPES.has(kind))throw new Error("Unsupported value type (personal probabilities are unavailable)");
  let numeric:number|null=null;if(input.valueNumeric!=null&&input.valueNumeric!==""){if(typeof input.valueNumeric!=="number"||!Number.isFinite(input.valueNumeric))throw new Error("Invalid numeric value");numeric=input.valueNumeric;}
  const string=text(input.valueText,20_000);
  if(numeric!=null&&string!=null)throw new Error("Use one original value, not conflicting numeric and text values");
  if(["unknown","not_published","not_applicable"].includes(kind)&&(numeric!=null||string!=null))throw new Error("An unknown/not-published/not-applicable fact cannot carry an asserted value");
  const source=text(input.sourceUrl,1000);if(source){const u=new URL(source);if(u.protocol!=="https:"||u.username||u.password)throw new Error("Use an HTTPS publisher URL without credentials");}
  if(field==="requirement_group"&&!string&&!["unknown","not_published","not_applicable"].includes(kind))throw new Error("Requirement group JSON is required");
  if(field==="requirement_group"&&string){const parsed=parseRequirementGroup(string);const evaluation=evaluateRequirementGroup(parsed,{},"2000-01-01");const malformed=(node:typeof evaluation):boolean=>["malformed","unknown_operator"].includes(node.reason)||node.children.some(malformed);if(malformed(evaluation))throw new Error("Malformed requirement group; use allOf, anyOf or not_applicable");}
  return {entity_type:input.entityType,entity_id:id,field_key:field,value_numeric:numeric,value_text:string,value_type:kind,
    applicant_scope:text(input.applicantScope,200),program_name:text(input.programName),degree_level:text(input.degreeLevel,100),admission_cycle:text(input.admissionCycle,100),unit:text(input.unit,100),currency:text(input.currency,20),period:text(input.period,100),source_url:source,notes:text(input.notes,2000),
    // Editing invalidates verification. A JSON checkbox cannot manufacture review.
    verification_status:"review_needed",verified_at:null,is_active:input.isActive!==false};
}
