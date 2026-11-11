import {verifiedQsRankNumber,type QsRankRow} from "./universityRank";
import type {ChancingProfile} from "./chancing";
import {supportsDegreeLevel} from "./degreeLevels";
import {subjectAffinity} from "./subjectAffinity";
import {matchQsUniversityBenchmark} from "./qsTop200Benchmarks";

export interface RecordedUniversityProgramme {
  id:number; universityId:number; name:string; field:string|null; degreeLevel:string|null;
}
/** Shared list/detail discovery policy. A major preference is never a programme
 * identity. The experimental index is evaluated only for recorded programmes,
 * after explicit opt-in, and never against legacy minima as official rules. */
export function universityProgrammeDiscovery(
  university:{id:number;name:string;country?:string|null;worldRanking?:number|null;verificationStatus?:string|null}&QsRankRow,
  programmes:RecordedUniversityProgramme[],
  preferences:{degreeLevel?:string|null;targetMajor?:string|null}|null,
  profile:ChancingProfile|null,
  /** Retained for call-site compatibility. It no longer enables a composite
   *  index: the highest-ranking planning score is never computed. */
  _experimental?:boolean,
){
  // Both API callers must feed the same rank visibility policy into the
  // planning model. Raw detail rows previously smuggled an undated rank back
  // in even though the list correctly removed it (observable 13 vs 47 drift).
  const modelUniversity={...university,worldRanking:university.verificationStatus==="verified"?verifiedQsRankNumber(university):null,minGpa:null,minIelts:null,minSat:null,acceptanceRate:null};
  const actual=programmes.filter(program=>Number.isSafeInteger(program.id)&&program.id>0&&program.universityId===university.id&&program.name.trim()&&(!preferences?.degreeLevel||supportsDegreeLevel(program.degreeLevel,preferences.degreeLevel)));
  const relevant=actual.map(program=>({program,affinity:subjectAffinity(preferences?.targetMajor?[preferences.targetMajor]:[],program.field).score}));
  const bestAffinity=Math.max(0,...relevant.map(value=>value.affinity));
  const candidates=relevant.filter(value=>value.affinity===bestAffinity).sort((a,b)=>a.program.id-b.program.id);
  // The programme the university page highlights is chosen by SUBJECT RELATION
  // and a stable id — never by the retired composite "chance" index. Two
  // programmes with equal subject affinity are ordered by id, and the choice is
  // reported as such, so the page never implies that one is "more likely".
  const selected=candidates[0]?.program??null;
  return {chance:null,programmeDiscovery:{
    status:actual.length?"recorded":"no_programmes",programmeCount:actual.length,
    selectedProgrammeId:selected?.id??null,selectedProgrammeName:selected?.name??null,
    aggregation:"best_subject_relation_then_stable_id",
    modelOptIn:false,personalAdmissionProbability:null,
  }};
}
