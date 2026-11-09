"use client";
import {examRule} from "@/lib/examRecords";
import {useId} from "react";
import {useTranslations} from "next-intl";
import type {ApplicantContext} from "@/lib/applicantContext";
export type ToeflRecord=NonNullable<ApplicantContext["toefl"]>;
/** Same original-scale record in profile, onboarding and recommendation overrides. */
export function ToeflRecordFields({value,onChange}:{value:ToeflRecord;onChange:(value:ToeflRecord)=>void}){
 const rule=examRule("toefl",value.scale),sectionRule=examRule("toefl",value.scale,true);
 const t=useTranslations("profile.context"),id=useId();
 const field=(key:string,current:number|string|null|undefined,type:string,change:(value:string)=>void)=><label className="grid gap-1 text-sm" htmlFor={`${id}-${key}`} key={key}><span>{t(key as never)}</span><input id={`${id}-${key}`} type={type} step={type==="number"?(key==="toeflScore"?rule:sectionRule)?.step:undefined} min={type==="number"?(key==="toeflScore"?rule:sectionRule)?.min:undefined} max={type==="number"?(key==="toeflScore"?rule:sectionRule)?.max:undefined} value={current??""} onChange={event=>change(event.target.value)} className="sb-field min-h-11 min-w-0 w-full rounded-control border px-3 py-2"/></label>;
 const number=(value:string)=>value.trim()===""?null:Number(value);
 return <fieldset className="grid gap-3 sm:grid-cols-2"><legend className="mb-2 text-sm font-semibold">TOEFL</legend><label className="grid gap-1 text-sm" htmlFor={`${id}-scale`}><span>{t("toeflScale")}</span><select id={`${id}-scale`} value={value.scale??""} onChange={event=>onChange({...value,scale:(event.target.value||null) as ToeflRecord["scale"]})} className="sb-field min-h-11 rounded-control border px-3 py-2"><option value="">{t("unknown")}</option><option value="120">0–120</option><option value="6">1–6</option></select></label>
 {field("toeflScore",value.score,"number",score=>onChange({...value,score:number(score)}))}{field("examDate",value.examDate,"date",examDate=>onChange({...value,examDate:examDate||null}))}{field("validUntil",value.validUntil,"date",validUntil=>onChange({...value,validUntil:validUntil||null}))}
 {(["reading","listening","speaking","writing"] as const).map(key=>field(key,value.sections?.[key],"number",score=>onChange({...value,sections:{...value.sections,[key]:number(score)}})))}
 </fieldset>;
}
