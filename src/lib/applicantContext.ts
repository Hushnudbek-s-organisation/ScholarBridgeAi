/** Student-entered context. Never official conversion/eligibility evidence by itself. */
export interface ApplicantContext {
  citizenships?:string[];
  residency?:string|null;
  toefl?:{score:number|null;scale:"120"|"6"|null;examDate?:string|null;validUntil?:string|null;sections?:Partial<Record<"reading"|"listening"|"speaking"|"writing",number|null>>};
  gpa?:{value:number|null;minimum:number|null;maximum:number|null;country?:string|null;system?:string|null;conversion?:{method:"proportional_planning"|"institution_published";value:number;sourceUrl?:string|null}};
  needBased?:{householdSize?:number|null;dependents?:number|null;assetsUsd?:number|null;incomeYear?:number|null;firstGeneration?:boolean|null};
}
const object=(value:unknown):Record<string,unknown>=>{if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("Expected applicant-context object");return value as Record<string,unknown>;};
const number=(value:unknown,min:number,max:number,integer=false):number|null=>{if(value==null||value===""||(typeof value==="string"&&!value.trim()))return null;if(typeof value!=="number"&&typeof value!=="string")throw new Error("Invalid applicant-context number");const n=Number(value);if(!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n)))throw new Error("Invalid applicant-context number");return n;};
const text=(value:unknown,max=160):string|null=>{if(value==null||value==="")return null;if(typeof value!=="string"||value.length>max)throw new Error("Invalid applicant-context text");return value.trim()||null;};
const date=(value:unknown):string|null=>{const s=text(value,10);if(s&&(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s))||new Date(s).toISOString().slice(0,10)!==s))throw new Error("Invalid exam date");return s;};
const country=(value:unknown):string|null=>{const s=text(value,2)?.toUpperCase()??null;if(s&&!/^[A-Z]{2}$/.test(s))throw new Error("Use a two-letter country code");return s;};
export function parseApplicantContext(value:unknown):ApplicantContext|null|undefined{
  if(value===undefined)return undefined;if(value===null)return null;
  const input=object(value),out:ApplicantContext={};
  if(input.citizenships!==undefined){if(!Array.isArray(input.citizenships)||input.citizenships.length>8)throw new Error("Invalid citizenships");out.citizenships=[...new Set(input.citizenships.map(country).filter((x):x is string=>!!x))];}
  if(input.residency!==undefined)out.residency=country(input.residency);
  if(input.toefl!==undefined){
    const test=object(input.toefl),scale=test.scale==null?null:test.scale;
    if(scale!==null&&scale!=="120"&&scale!=="6")throw new Error("TOEFL scale must be 120, 6 or unknown");
    const score=number(test.score,scale==="6"?1:0,scale==="6"?6:120,scale==="120");
    if(scale==="6"&&score!=null&&score*2!==Math.floor(score*2))throw new Error("Invalid TOEFL band");
    const examDate=date(test.examDate),validUntil=date(test.validUntil);
    if(examDate&&validUntil&&validUntil<examDate)throw new Error("Validity precedes exam date");
    const sections:NonNullable<ApplicantContext["toefl"]>["sections"]={};
    if(test.sections){const parts=object(test.sections);for(const key of ["reading","listening","speaking","writing"] as const)if(parts[key]!==undefined)sections[key]=number(parts[key],scale==="6"?1:0,scale==="6"?6:30,scale==="120");}
    if(scale==="6"&&Object.values(sections).some(value=>value!=null&&!Number.isInteger(value*2)))throw new Error("Invalid TOEFL section band");
    out.toefl={score,scale,examDate,validUntil,sections};
  }
  if(input.gpa!==undefined){
    const gpa=object(input.gpa),minimum=number(gpa.minimum,0,100),maximum=number(gpa.maximum,0,100),original=number(gpa.value,0,100);
    if(minimum!=null&&maximum!=null&&minimum>=maximum)throw new Error("Invalid GPA scale");
    if(original!=null&&((minimum!=null&&original<minimum)||(maximum!=null&&original>maximum)))throw new Error("GPA outside original scale");
    out.gpa={value:original,minimum,maximum,country:country(gpa.country),system:text(gpa.system)};
    if(gpa.conversion){const conversion=object(gpa.conversion);if(conversion.method!=="proportional_planning"&&conversion.method!=="institution_published")throw new Error("Invalid conversion provenance");const converted=number(conversion.value,0,4);if(converted==null)throw new Error("Missing converted GPA");let sourceUrl=text(conversion.sourceUrl,600);if(sourceUrl){const url=new URL(sourceUrl);if(url.protocol!=="https:"||url.username||url.password)throw new Error("Invalid conversion source");sourceUrl=url.toString();}if(conversion.method==="institution_published"&&!sourceUrl)throw new Error("Institution conversion needs its source");out.gpa.conversion={method:conversion.method,value:converted,sourceUrl};}
  }
  if(input.needBased!==undefined){const need=object(input.needBased);if(need.firstGeneration!=null&&typeof need.firstGeneration!=="boolean")throw new Error("Invalid first-generation answer");out.needBased={householdSize:number(need.householdSize,1,100,true),dependents:number(need.dependents,0,100,true),assetsUsd:number(need.assetsUsd,0,1e12),incomeYear:number(need.incomeYear,1900,2200,true),firstGeneration:need.firstGeneration as boolean|null|undefined};}
  return out;
}
/** An unlabelled legacy score does not silently acquire a 120-point scale. */
export function recordedToefl(context:ApplicantContext|null|undefined,legacy:number|null|undefined){
  return context?.toefl?{...context.toefl}:{score:legacy??null,scale:null,examDate:null,validUntil:null};
}
