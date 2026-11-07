import type { ApplicantContext } from "./applicantContext";
/** Minimum sufficient declarative grouping, not an executable rules language. */
export type RequirementState="met"|"unmet"|"unknown"|"not_applicable";
export type RequirementReason="comparison"|"record_missing"|"scale_unknown"|"expired"|"validity_unknown"|"unknown_operator"|"malformed"|"group";
export interface RequirementEvaluation {id:string;label:string;state:RequirementState;reason:RequirementReason;children:RequirementEvaluation[];field?:string;required?:number;actual?:number|boolean|null;unit?:string|null;operator?:string;}
export interface RequirementFact {value:number|boolean|null;unit?:string|null;validUntil?:string|null;examDate?:string|null;}
export type RequirementFacts=Record<string,RequirementFact|undefined>;
export function evaluateRequirementGroup(raw:unknown,facts:RequirementFacts,asOfDate:string):RequirementEvaluation{
  let nodes=0;const seen=new Set<string>();
  const walk=(raw:unknown,depth:number):RequirementEvaluation=>{
    const node=raw&&typeof raw==="object"&&!Array.isArray(raw)?raw as Record<string,unknown>:{};
    const id=typeof node.id==="string"?node.id.slice(0,100):"unknown";
    const out:RequirementEvaluation={id,label:typeof node.label==="string"?node.label.slice(0,300):id,state:"unknown",reason:"malformed",children:[]};
    if(++nodes>80||depth>8||seen.has(id)||id==="unknown")return out;seen.add(id);
    if(node.operator!==undefined){
      out.operator=String(node.operator);
      if(node.operator==="not_applicable"){if(node.children!==undefined)return out;return {...out,state:"not_applicable",reason:"group"};}
      if(node.operator!=="allOf"&&node.operator!=="anyOf")return {...out,reason:"unknown_operator"};
      if(!Array.isArray(node.children)||!node.children.length||node.children.length>40)return out;
      out.children=node.children.map(child=>walk(child,depth+1));
      const applicable=out.children.filter(child=>child.state!=="not_applicable");
      out.reason="group";
      out.state=!applicable.length?"not_applicable":node.operator==="allOf"
        ? applicable.some(child=>child.state==="unmet")?"unmet":applicable.some(child=>child.state==="unknown")?"unknown":"met"
        : applicable.some(child=>child.state==="met")?"met":applicable.some(child=>child.state==="unknown")?"unknown":"unmet";
      return out;
    }
    if(typeof node.field!=="string"||!node.field||node.field.length>100||!["minimum","record"].includes(String(node.kind)))return out;
    if(node.unit!==undefined&&(typeof node.unit!=="string"||node.unit.length>100))return out;
    if(node.requireValid!==undefined&&typeof node.requireValid!=="boolean")return out;
    if(node.kind==="minimum"&&(typeof node.value!=="number"||!Number.isFinite(node.value)))return out;
    out.field=node.field;
    const fact=facts[node.field];out.actual=fact?.value??null;out.unit=typeof node.unit==="string"?node.unit:null;
    if(!fact||fact.value==null)return {...out,reason:"record_missing"};
    if(node.kind==="record")return typeof fact.value==="boolean"?{...out,state:fact.value?"met":"unmet",reason:"comparison"}:out;
    if(typeof node.value!=="number"||!Number.isFinite(node.value)||typeof fact.value!=="number"||!Number.isFinite(fact.value))return out;
    out.required=node.value;
    if(out.unit&&out.unit!==fact.unit)return {...out,reason:"scale_unknown"};
    // TOEFL and GPA must explicitly name a scale on BOTH sides.
    if((node.field.startsWith("toefl")||node.field==="gpa")&&(!out.unit||!fact.unit))return {...out,reason:"scale_unknown"};
    if(fact.examDate&&fact.examDate>asOfDate)return {...out,reason:"validity_unknown"};
    if(fact.validUntil&&fact.validUntil<asOfDate)return {...out,reason:"expired"};
    if(node.requireValid===true&&(!fact.validUntil||!fact.examDate))return {...out,reason:"validity_unknown"};
    return {...out,state:fact.value>=node.value?"met":"unmet",reason:"comparison"};
  };
  return walk(raw,0);
}
export function parseRequirementGroup(value:unknown):unknown{
  if(typeof value==="string"){if(value.length>20_000)throw new Error("Requirement group too large");return JSON.parse(value);}
  return value;
}

/** Shared applicant adapter: programme match and the saved-application checklist
 * use original units, dates and section records, never a converted GPA/TOEFL. */
export interface ApplicantRequirementInput {
  gpa?:number|null;gpaScale?:number|null;gpaMinimum?:number|null;ielts?:number|null;sat?:number|null;
  act?:number|null;duolingo?:number|null;toefl?:number|null;toeflScale?:string|null;
  toeflRecord?:ApplicantContext["toefl"];
}
export function evaluateApplicantRequirementGroup(raw:unknown,input:ApplicantRequirementInput,asOfDate:string):RequirementEvaluation {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(asOfDate)||!Number.isFinite(Date.parse(asOfDate))||new Date(asOfDate).toISOString().slice(0,10)!==asOfDate)
    return evaluateRequirementGroup(null,{},"");
  const gpaMinimum=input.gpaMinimum??0;
  const validGpa=typeof input.gpa==="number"&&Number.isFinite(input.gpa)&&typeof input.gpaScale==="number"&&Number.isFinite(input.gpaScale)&&Number.isFinite(gpaMinimum)&&gpaMinimum>=0&&input.gpaScale>gpaMinimum&&input.gpaScale<=100&&input.gpa>=gpaMinimum&&input.gpa<=input.gpaScale;
  const facts:RequirementFacts={gpa:{value:validGpa?input.gpa!:null,unit:input.gpaScale==null?null:(input.gpaMinimum??0)===0?String(input.gpaScale):`${input.gpaMinimum}-${input.gpaScale}`},ielts:{value:input.ielts??null,unit:"9"},sat:{value:input.sat??null,unit:"1600"},act:{value:input.act??null,unit:"36"},duolingo:{value:input.duolingo??null,unit:"160"},toefl:{value:input.toefl??null,unit:input.toeflScale??null,examDate:input.toeflRecord?.examDate,validUntil:input.toeflRecord?.validUntil}};
  for(const part of ["reading","listening","speaking","writing"] as const)facts[`toefl.${part}`]={value:input.toeflRecord?.sections?.[part]??null,unit:input.toeflScale==="120"?"30":input.toeflScale??null,examDate:input.toeflRecord?.examDate,validUntil:input.toeflRecord?.validUntil};
  try{return evaluateRequirementGroup(parseRequirementGroup(raw),facts,asOfDate);}
  catch{return evaluateRequirementGroup(null,facts,asOfDate);}
}
