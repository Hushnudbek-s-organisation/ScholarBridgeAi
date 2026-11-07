import {recordedToefl,type ApplicantContext} from "./applicantContext";
/** Original records only. Shared text for bot, mini-app and exports; never a
 * converted score, official GPA equivalence, probability or eligibility claim. */
export function academicRecordText(profile:{applicantContext?:ApplicantContext|null;gpa?:number|null;gpaScale?:number|null;ieltsScore?:number|null;toeflScore?:number|null},unknown:string){
 const original=profile.applicantContext?.gpa;
 const value=original?original.value:profile.gpa,maximum=original?original.maximum:profile.gpaScale;
 const gpa=value==null?unknown:`${value} / ${maximum??unknown}${original?.minimum!=null?` (min ${original.minimum})`:""}${original?.country?` · ${original.country}`:""}${original?.system?` · ${original.system}`:""}`;
 const test=recordedToefl(profile.applicantContext,profile.toeflScore);
 const toefl=test.score==null?null:`TOEFL ${test.score} / ${test.scale??unknown}${test.examDate?` · ${test.examDate}`:""}${test.validUntil?` → ${test.validUntil}`:""}${Object.entries(test.sections??{}).filter(([,value])=>value!=null).map(([key,value])=>` · ${key}: ${value}`).join("")}`;
 return {gpa,english:[profile.ieltsScore!=null?`IELTS ${profile.ieltsScore}`:null,toefl].filter(Boolean).join(" · ")||unknown};
}
