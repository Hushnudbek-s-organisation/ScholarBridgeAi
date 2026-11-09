/** Versioned input policy, not admissions evidence or score conversion.
 * PTE/unknown tests abstain until a vendor policy has been reviewed.
 * No universal two-year validity or cross-scale conversion is invented. */
export const EXAM_POLICY_VERSION='exam-input-v1';
export type ExamKind='ielts'|'sat'|'act'|'duolingo'|'gre'|'toefl';
export type ExamRule={min:number;max:number;step:number};
export function examRule(kind:ExamKind,scale?:string|null,section=false):ExamRule|null{
 if(kind==='toefl')return scale==='6'?{min:1,max:6,step:0.5}:scale==='120'?{min:0,max:section?30:120,step:1}:null;
 return {gre:{min:260,max:340,step:1},ielts:{min:0,max:9,step:0.5},sat:{min:400,max:1600,step:10},act:{min:1,max:36,step:1},duolingo:{min:10,max:160,step:5}}[kind];
}
export function strictAcademicNumber(value:unknown):number|null{
 if(value===null||value===undefined||typeof value==='string'&&!value.trim())return null;
 if(typeof value!=='number'&&typeof value!=='string')throw new Error('Invalid academic number');
 if(typeof value==='string'&&!/^-?\d+(?:\.\d+)?$/.test(value.trim()))throw new Error('Invalid academic number');
 const n=typeof value==='number'?value:Number(value.trim());
 if(!Number.isFinite(n))throw new Error('Invalid academic number');return n;
}
export function validExamNumber(value:unknown,rule:ExamRule|null):boolean{
 return !!rule&&typeof value==='number'&&Number.isFinite(value)&&value>=rule.min&&value<=rule.max&&Math.abs((value-rule.min)/rule.step-Math.round((value-rule.min)/rule.step))<1e-9;
}
/** API accepts explicit unknown, but never clamps/rounds an invalid score. */
export function parseExamInput(kind:ExamKind,value:unknown,scale?:string|null,section=false):number|null|undefined{
 if(value===undefined)return undefined;
 const n=strictAcademicNumber(value);if(n===null)return null;
 const rule=examRule(kind,scale,section);
 if(rule&&!validExamNumber(n,rule))throw new Error('Invalid exam range or step');
 // Unknown TOEFL scale may retain an original plausible value, but no domain
 // comparison is permitted until its scale is recorded.
 if(!rule&&(n<0||n>(section?30:120)||!Number.isInteger(n*2)))throw new Error('Invalid original TOEFL score');
 return n;
}
export function calendarDate(value:unknown):value is string{
 return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
}
export function examDatesState(record:{examDate?:string|null;validUntil?:string|null},asOf:string,required=false):'valid'|'invalid'|'expired'|'missing'{
 if(!calendarDate(asOf))return 'invalid';
 const {examDate,validUntil}=record;
 if(examDate!=null&&(!calendarDate(examDate)||examDate>asOf))return 'invalid';
 if(validUntil!=null&&!calendarDate(validUntil))return 'invalid';
 if(examDate&&validUntil&&validUntil<examDate)return 'invalid';
 if(validUntil&&validUntil<asOf)return 'expired';
 if(required&&(!examDate||!validUntil))return 'missing';return 'valid';
}
/** undefined means a non-exam numeric field, null an unsupported exam policy. */
export function requirementExamRule(field:string,unit?:string|null):ExamRule|null|undefined{
 if(field==='ielts'||field==='sat'||field==='act'||field==='duolingo'||field==='gre')return examRule(field);
 if(field==='toefl'||field.startsWith('toefl.'))return examRule('toefl',field==='toefl'?unit:unit==='30'?'120':unit,field!=='toefl');
 if(field==='pte'||field.startsWith('pte.')||field==='cambridgeEnglish')return null;
 return undefined;
}
