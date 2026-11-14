import {db} from '@/db';
import {universityPrograms} from '@/db/schema';
import {eq} from 'drizzle-orm';
import {loadCatalogueFacts} from './catalogueFacts.server';
import type {CatalogueFact} from './evidencePolicy';
import type {SavedUniRef} from './savedUniCoverage';
import {originalAcademicRequirementInput,type OriginalAcademicProfile} from './academicDecision';
type SelectedScope={programmeId:number;cycle:string;applicantScope:string};
function selectedScope(req?:Request):SelectedScope|null{
 if(!req)return null;
 const params=new URL(req.url).searchParams,id=params.get('coverageProgramId'),cycle=params.get('coverageCycle')?.trim(),applicantScope=params.get('coverageApplicantScope')?.trim();
 if(!id||!/^\d+$/.test(id)||!Number.isSafeInteger(Number(id))||Number(id)<1||Number(id)>2147483647||!cycle||cycle.length>100||!applicantScope||applicantScope.length>200)return null;
 return {programmeId:Number(id),cycle,applicantScope};
}
/** Include exact scope in any enclosing result-cache key. A scoped response
 * must never become an unscoped personal funding promise on the next read. */
export function awardCoverageRequestKey(req?:Request):string{
 const selected=selectedScope(req);return selected?JSON.stringify([selected.programmeId,selected.cycle,selected.applicantScope]):'unselected';
}
/** Existing route auth must succeed before supplying a profile. One programme
 * lookup and one batched fact load only for an explicit real selected scope;
 * ordinary catalogue/dashboard reads incur no new queries. No invented first
 * programme, citizenship from destination, or client-supplied academic scores. */
export async function prepareAwardCoverage(req:Request|undefined,profile:OriginalAcademicProfile|null|undefined,references:SavedUniRef[],awardIds:number[],preloadedFacts?:Map<number,CatalogueFact[]>):Promise<{references:SavedUniRef[];facts:Map<number,CatalogueFact[]>}>{
 const empty={references,facts:preloadedFacts??new Map<number,CatalogueFact[]>()},scope=selectedScope(req);
 if(!scope||!profile||!references.length)return empty;
 const [programme]=await db.select({id:universityPrograms.id,universityId:universityPrograms.universityId,name:universityPrograms.name,degree:universityPrograms.degree,isActive:universityPrograms.isActive}).from(universityPrograms).where(eq(universityPrograms.id,scope.programmeId)).limit(1);
 if(!programme?.isActive||!references.some(ref=>ref.id===programme.universityId))return empty;
 const facts=preloadedFacts??await loadCatalogueFacts('scholarship',awardIds);
 return {facts,references:references.map(ref=>ref.id===programme.universityId?{...ref,programmeId:programme.id,programName:programme.name,degreeLevel:programme.degree,admissionCycle:scope.cycle,applicantScope:scope.applicantScope,citizenships:profile.applicantContext?.citizenships??[],residency:profile.applicantContext?.residency??null,applicant:originalAcademicRequirementInput(profile),asOfDate:new Date().toISOString().slice(0,10)}:ref)};
}
