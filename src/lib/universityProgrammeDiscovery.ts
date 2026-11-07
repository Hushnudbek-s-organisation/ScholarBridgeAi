import {verifiedQsRankNumber,type QsRankRow} from "./universityRank";
import {supportsDegreeLevel} from "./degreeLevels";
import {subjectAffinity} from "./subjectAffinity";
import {evaluateUniversityAndProgramChance} from "./programChancing";
import {matchQsUniversityBenchmark} from "./qsTop200Benchmarks";

export interface RecordedUniversityProgramme {
  id:number; universityId:number; name:string; field:string|null; degreeLevel:string|null;
}
/** Shared list/detail discovery policy. A major preference is never a programme
 * identity. The experimental index is evaluated only for recorded programmes,
 * after explicit opt-in, and never against legacy minima as official rules. */
export function universityProgrammeDiscovery(
  university:Parameters<typeof evaluateUniversityAndProgramChance>[1]&QsRankRow&{verificationStatus?:string|null},
  programmes:RecordedUniversityProgramme[],
  preferences:{degreeLevel?:string|null;targetMajor?:string|null}|null,
  profile:Parameters<typeof evaluateUniversityAndProgramChance>[0]|null,
  experimental:boolean,
){
  // Both API callers must feed the same rank visibility policy into the
  // planning model. Raw detail rows previously smuggled an undated rank back
  // in even though the list correctly removed it (observable 13 vs 47 drift).
  const modelUniversity={...university,worldRanking:university.verificationStatus==="verified"?verifiedQsRankNumber(university):null,minGpa:null,minIelts:null,minSat:null,acceptanceRate:null};
  const actual=programmes.filter(program=>Number.isSafeInteger(program.id)&&program.id>0&&program.universityId===university.id&&program.name.trim()&&(!preferences?.degreeLevel||supportsDegreeLevel(program.degreeLevel,preferences.degreeLevel)));
  const relevant=actual.map(program=>({program,affinity:subjectAffinity(preferences?.targetMajor?[preferences.targetMajor]:[],program.field).score}));
  const bestAffinity=Math.max(0,...relevant.map(value=>value.affinity));
  const candidates=relevant.filter(value=>value.affinity===bestAffinity).sort((a,b)=>a.program.id-b.program.id);
  let chance:ReturnType<typeof evaluateUniversityAndProgramChance>|null=null;
  let selected=candidates[0]?.program??null;
  if(profile&&experimental){
    for(const {program} of candidates){
      if(!program.degreeLevel?.trim())continue;
      const result=evaluateUniversityAndProgramChance(profile,modelUniversity,{...program,field:program.field??program.name,degreeLevel:program.degreeLevel},null,[],matchQsUniversityBenchmark(modelUniversity));
      if(!chance||result.compositeProgramFitScore>chance.compositeProgramFitScore){chance=result;selected=program;}
    }
  }
  return {chance,programmeDiscovery:{
    status:actual.length?"recorded":"no_programmes",programmeCount:actual.length,
    selectedProgrammeId:selected?.id??null,selectedProgrammeName:selected?.name??null,
    aggregation:chance?"highest_experimental_index_among_best_subject_fit_real_programmes":"preference_discovery_only",
    modelOptIn:Boolean(chance),personalAdmissionProbability:null,
  }};
}
