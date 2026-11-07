import {effectiveDocumentStatus} from "@/lib/documentStatus";
import {db} from "@/db";
import {and,asc,eq,isNull,or} from "drizzle-orm";
import {applicationRequirements,applications,essayVersions,programRequirements,universityPrograms as programs,recommendationRequests,requirementTemplates,studentProfiles,testPlans,universities,userDocuments} from "@/db/schema";
import {resolveDocumentStatuses} from "@/lib/documentReviews.server";
import {loadCatalogueFacts} from "@/lib/catalogueFacts.server";
import {hasVerifiedProgramEvidence} from "@/lib/catalogEvidence";
import {exactChecklistProgramme,scopedChecklistEvidence} from "./checklistEvidence";
import {buildRequirements,DEFAULT_REQUIREMENT_TEMPLATES,normalizeVerification,type RequirementItem} from "./requirements";
import {isoDate} from "./api";

/** Refresh derived policy evidence, preserving the student's manual checklist.
 * An owned application row lock makes simultaneous first loads idempotent. */
export async function ensureRequirements(profileId: number, applicationId: number, force = false): Promise<number> {
  return db.transaction(async tx=>{
  // Serialize initial generation / refresh per owned application.
  const [app]=await tx.select().from(applications).where(and(eq(applications.id,applicationId),eq(applications.profileId,profileId))).limit(1).for("update");
  if(!app)return 0;
  const existing = await tx
    .select()
    .from(applicationRequirements)
    .where(and(
      eq(applicationRequirements.profileId, profileId),
      eq(applicationRequirements.applicationId, applicationId),
    ));

  const uni = app.universityId
    ? (await tx.select().from(universities).where(eq(universities.id, app.universityId)).limit(1))[0]
    : null;

  // Programme-level published requirements (sourced) take precedence.
  let program: typeof programRequirements.$inferSelect | null = null;
  const progRows = await tx
    .select({ id: programs.id, name: programs.name, degree:programs.degree })
    .from(programs)
    .where(and(eq(programs.universityId, app.universityId ?? -1), eq(programs.isActive, true)));
  const named = exactChecklistProgramme(progRows,app.programName);
  if (named) {
    const rows=await tx.select().from(programRequirements).where(and(eq(programRequirements.programId,named.id),eq(programRequirements.verificationStatus,"verified")));
    const scoped=rows.filter(row=>!row.academicYear||row.academicYear===app.intakeTerm);
    program=scoped.length===1?scoped[0]:null;
    if (program && !hasVerifiedProgramEvidence(program)) program = null;
  }

  // Admin-published templates for this university (or the generic fallback).
  const templates = uni
    ? await tx
        .select()
        .from(requirementTemplates)
        .where(and(eq(requirementTemplates.universityId, uni.id), eq(requirementTemplates.verificationStatus, "verified"),named?or(isNull(requirementTemplates.programId),eq(requirementTemplates.programId,named.id)):isNull(requirementTemplates.programId)))
        .orderBy(asc(requirementTemplates.sortOrder))
    : [];
  const useTemplates = templates.length
    ? templates
    : DEFAULT_REQUIREMENT_TEMPLATES.map((t) => ({
        ...t,
        sourceUrl: null,
        sourceName: null,
        sourceType: null,
        lastVerifiedAt: null,
        verificationStatus: "unverified" as const,
      }));

  const [profile] = await tx.select().from(studentProfiles).where(eq(studentProfiles.id, profileId)).limit(1);
  const [docs, essays, plans, recs] = await Promise.all([
    tx.select().from(userDocuments).where(eq(userDocuments.profileId, profileId)),
    tx.select().from(essayVersions).where(eq(essayVersions.profileId, profileId)),
    tx.select().from(testPlans).where(eq(testPlans.profileId, profileId)),
    tx.select().from(recommendationRequests).where(and(eq(recommendationRequests.profileId, profileId), eq(recommendationRequests.applicationId, applicationId))),
  ]);

  const context={programName:named?.name??null,degreeLevel:named?.degree??null,admissionCycle:app.intakeTerm,applicantScope:null};
  // Reuse this transaction's connection: nested global-pool reads can starve
  // a small pool when other requests are waiting for the same application lock.
  // Savepoints preserve the bounded missing-schema fallback without leaving
  // the parent PostgreSQL transaction in an aborted state.
  const optionalSchemaRead=async<T>(read:()=>Promise<T>,fallback:T):Promise<T>=>{
    try{return await read();}catch(error){const e=error as {code?:string;cause?:{code?:string}};if(["42P01","42703"].includes(e.cause?.code??e.code??""))return fallback;throw error;}
  };
  const uniFacts=await optionalSchemaRead(()=>tx.transaction(inner=>loadCatalogueFacts("university",uni?[uni.id]:[],inner)),new Map());
  const programFacts=await optionalSchemaRead(()=>tx.transaction(inner=>loadCatalogueFacts("program",named?[named.id]:[],inner)),new Map());
  const universityEvidence=scopedChecklistEvidence(uniFacts.get(uni?.id??-1)??[],context);
  const programmeEvidence=scopedChecklistEvidence(programFacts.get(named?.id??-1)??[],context);
  const resolvedProgram=named?{...program,...programmeEvidence,minDet:programmeEvidence.minDuolingo,fieldSources:{...programmeEvidence.fieldSources,minDet:programmeEvidence.fieldSources.minDuolingo}}:null;
  const effectiveDocs=await optionalSchemaRead(()=>tx.transaction(inner=>resolveDocumentStatuses(docs,inner)),docs.map(document=>({...document,status:effectiveDocumentStatus(document,false)})));
  const items: RequirementItem[] = buildRequirements({
    university: {...(uni ?? { id: 0, name: app.universityName || "This university" }),...universityEvidence},
    profile: profile ?? {},
    program:resolvedProgram,
    publishedGroup:programmeEvidence.publishedGroup??universityEvidence.publishedGroup,
    asOfDate:new Date().toISOString().slice(0,10),
    templates: useTemplates.map((t) => ({
      section: t.section,
      itemKey: t.itemKey,
      title: t.title,
      instructions: t.instructions ?? null,
      isRequired: t.isRequired,
      sourceUrl: t.sourceUrl ?? null,
      sourceName: t.sourceName ?? null,
      sourceType: t.sourceType ?? null,
      lastVerifiedAt: t.lastVerifiedAt ?? null,
      verificationStatus: t.verificationStatus,
    })),
    progress: {
      hasDocument: (docType) => effectiveDocs.some((d) => d.docType === docType && ["uploaded","verified"].includes(d.status) && Boolean(d.fileUrl||d.fileName) && !isExpired(d.expiresAt)),
      hasEssay: (essayType) => essays.some((e) => e.essayType === essayType || (essayType === "personal_statement" && e.essayType === "sop")),
      recommendationSubmitted: recs.filter((r) => r.status === "submitted").length,
      recommendationNeeded: Math.max(recs.length, 1),
      testPlanScore: (testType) => plans.find((p) => p.testType === testType)?.currentScore ?? null,
      applicationFeePaid: app.applicationFeePaid,
    },
    deadline: app.deadline ? String(app.deadline).slice(0, 10) : null,
    existingItemKeys: existing.map((e) => e.itemKey),
  });

  // Student-owned/manual task completion survives. Only the published group
  // is a derived policy result; it cannot be forged by ticking a checkbox.
  const policyStatus=(item:RequirementItem)=>!item.isRequired?"not_required":item.state==="met"?"done":item.state==="not_met"?"blocked":"todo";
  const derived=new Set(["academic.gpa","english.ielts","english.toefl","testing.sat","testing.duolingo","application.fee","published.requirement_group"]);
  const missingPolicy="Current matching official requirement is not recorded. Review the saved item; it is not an eligibility decision.";
  for(const previous of existing){
    const item=items.find(item=>item.itemKey===previous.itemKey);
    if(!derived.has(previous.itemKey)&&!force)continue;
    const policy=previous.itemKey==="published.requirement_group";
    const metadata=item?{
      title:item.title,isRequired:item.isRequired,sourceUrl:item.sourceUrl??null,sourceName:item.sourceName??null,sourceType:item.sourceType??null,
      lastVerifiedAt:item.lastVerifiedAt?new Date(item.lastVerifiedAt):null,verificationStatus:normalizeVerification(item.verificationStatus),
      ...(policy?{instructions:item.instructions??null,status:policyStatus(item)}:{}),
    }:{isRequired:false,verificationStatus:"needs_review",...(policy?{status:"todo",instructions:missingPolicy}:{})};
    const same=(a:unknown,b:unknown)=>a instanceof Date||b instanceof Date?(a==null?null:new Date(a as string).getTime())===(b==null?null:new Date(b as string).getTime()):a===b;
    if(Object.entries(metadata).some(([key,value])=>!same(value,previous[key as keyof typeof previous]))){
      await tx.update(applicationRequirements).set({...metadata,...(policy?{completedAt:item&&policyStatus(item)==="done"?previous.completedAt??new Date():null}:{}),updatedAt:new Date()}).where(and(eq(applicationRequirements.id,previous.id),eq(applicationRequirements.profileId,profileId)));
    }
  }
  const doneKeys = new Set(existing.filter((e) => e.status === "done" || e.status === "not_required").map((e) => e.itemKey));
  const toInsert = items
    .filter((i) => !existing.some((e) => e.itemKey === i.itemKey))
    .map((i, idx) => ({
      applicationId,
      profileId,
      section: i.section,
      itemKey: i.itemKey,
      title: i.title,
      instructions: i.instructions ?? null,
      isRequired: i.isRequired,
      status: i.itemKey==="published.requirement_group"?policyStatus(i):doneKeys.has(i.itemKey) ? "done" : i.state === "met" ? "done" : i.state === "todo" ? "todo" : "todo",
      dueDate: typeof i.dueDate === "string" ? i.dueDate.slice(0, 10) : isoDate(i.dueDate as Date | null),
      sourceUrl: i.sourceUrl ?? null,
      sourceName: i.sourceName ?? null,
      sourceType: i.sourceType ?? null,
      lastVerifiedAt: i.lastVerifiedAt ? new Date(i.lastVerifiedAt) : null,
      verificationStatus: normalizeVerification(i.verificationStatus),
      linkedType: i.linkedType ?? null,
      completedAt: i.state === "met" ? new Date() : null,
      sortOrder: idx,
    }));
  if (!toInsert.length) return 0;
  await tx.insert(applicationRequirements).values(toInsert).onConflictDoNothing();
  return toInsert.length;
  });
}

function isExpired(expiresAt: Date | string | null): boolean {
  if (!expiresAt) return false;
  const d = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  return d.getTime() < Date.now();
}
