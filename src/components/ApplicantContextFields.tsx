"use client";
import {ToeflRecordFields} from "./ToeflRecordFields";
import {useId} from "react";
import {useTranslations} from "next-intl";
import type {ApplicantContext} from "@/lib/applicantContext";

/** Optional original records; never silently converts the old integer TOEFL field. */
export function ApplicantContextFields({value,onChange,legacyGpa,legacyScale,legacyToefl}:{value:ApplicantContext|null|undefined;onChange:(value:ApplicantContext)=>void;legacyGpa?:number|string|null;legacyScale?:number|string|null;legacyToefl?:number|string|null}){
  const t=useTranslations("profile.context"),id=useId(),data=value??{};
  const toNumber=(v:unknown)=>v==null||v===""?null:Number(v);
  const test=data.toefl??{score:toNumber(legacyToefl),scale:null};
  const gpa=data.gpa??{value:toNumber(legacyGpa),minimum:null,maximum:toNumber(legacyScale)};
  const setGpa=(patch:Partial<NonNullable<ApplicantContext["gpa"]>>)=>onChange({...data,gpa:{...gpa,...patch}});
  const field=(key:string,current:string|number|null|undefined,type:string,change:(value:string)=>void,step?:string)=><label className="grid gap-1 text-sm" htmlFor={`${id}-${key}`} key={key}><span>{t(key as never)}</span><input id={`${id}-${key}`} type={type} step={step} value={current??""} onChange={event=>change(event.target.value)} className="sb-field min-h-11 w-full min-w-0 rounded-control border px-3 py-2"/></label>;
  return <details className="rounded-surface border border-slate-200 p-4 dark:border-slate-700">
    <summary className="cursor-pointer text-sm font-semibold">{t("title")}</summary>
    <p className="my-3 text-sm text-slate-600 dark:text-slate-300">{t("hint")}</p>
    <div className="grid gap-3 sm:grid-cols-2">
      {field("citizenships",data.citizenships?.join(","),"text",value=>onChange({...data,citizenships:value.toUpperCase().split(",")}))}
      {field("residency",data.residency,"text",value=>onChange({...data,residency:value.toUpperCase()}))}
      <div className="sm:col-span-2"><ToeflRecordFields value={test} onChange={toefl=>onChange({...data,toefl})}/></div>
      {field("gpaValue",gpa.value,"number",value=>setGpa({value:toNumber(value)}),"any")}
      {field("gpaMinimum",gpa.minimum,"number",value=>setGpa({minimum:toNumber(value)}),"any")}
      {field("gpaMaximum",gpa.maximum,"number",value=>setGpa({maximum:toNumber(value)}),"any")}
      {field("gpaSystem",gpa.system,"text",value=>setGpa({system:value||null}))}
      {field("gpaCountry",gpa.country,"text",value=>setGpa({country:value.toUpperCase()||null}))}
      {(["householdSize","dependents","assetsUsd","incomeYear"] as const).map(key=>field(key,data.needBased?.[key],"number",value=>onChange({...data,needBased:{...data.needBased,[key]:toNumber(value)}}),key==="assetsUsd"?"any":"1"))}
    </div>
  </details>;
}
