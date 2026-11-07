import {evaluateApplicantRequirementGroup,type RequirementEvaluation} from "../requirementGroups";
import {recordedToefl,type ApplicantContext} from "../applicantContext";
/**
 * Application Requirements Engine (spec §5).
 *
 * When a student adds a university, ScholarBridge generates a PERSONALISED
 * checklist — academic, English, testing, documents, essays, finance,
 * application — where every item says whether the student already meets it.
 *
 * THE HONESTY RULE (spec §4, §5, §30)
 * -----------------------------------
 * A requirement is only ever built from data that carries a source:
 *   1. an admin-published `requirement_templates` row, or
 *   2. a published `program_requirements` / `application_cycles` row, or
 *   3. a university column that is itself sourced
 *      (`sourceUrl` / `lastVerifiedAt` / `verificationStatus`).
 * Anything else is emitted with `verificationStatus: "unverified"` and the UI
 * renders it as "Not specified". The AI never contributes a requirement here.
 *
 * PURE MODULE — no DB, no AI, no clock. Asserted in `scripts/check-journey.ts`.
 */

export type RequirementSection =
  | "academic"
  | "english"
  | "testing"
  | "documents"
  | "essays"
  | "recommendations"
  | "finance"
  | "application";

export const REQUIREMENT_SECTIONS: readonly RequirementSection[] = [
  "academic",
  "english",
  "testing",
  "documents",
  "essays",
  "recommendations",
  "finance",
  "application",
] as const;

export const SECTION_LABELS: Record<RequirementSection, string> = {
  academic: "Academic",
  english: "English",
  testing: "Testing",
  documents: "Documents",
  essays: "Essays",
  recommendations: "Recommendations",
  finance: "Finance",
  application: "Application",
};

export type VerificationStatus = "verified" | "needs_review" | "outdated" | "unverified";

/** Where a requirement row came from. Printed next to the requirement. */
export interface RequirementSource {
  sourceUrl?: string | null;
  sourceName?: string | null;
  sourceType?: string | null;
  lastVerifiedAt?: Date | string | null;
  verificationStatus: VerificationStatus;
}

export interface RequirementItem extends RequirementSource {
  /** Stable key — used as the unique key per application. */
  itemKey: string;
  section: RequirementSection;
  title: string;
  instructions?: string | null;
  isRequired: boolean;
  /** Does the student meet it right now? `null` = we do not know. */
  state: "met" | "not_met" | "in_progress" | "unknown" | "todo";
  /** The concrete comparison, e.g. "Your 6.5 vs required 7.0". */
  detail?: string;
  dueDate?: string | null;
  /** What completing this row means — drives the workspace's progress maths. */
  linkedType?: "document" | "essay" | "recommendation" | "test" | "payment" | "manual" | null;
}

/** What we know about the university (only sourced fields are used). */
export type MinimumField = "minGpa"|"minIelts"|"minToefl"|"minSat"|"minAct"|"minDuolingo"|"minDet"|"applicationFee";
export interface MinimumEvidence {
  minGpaScale?:number|null;
  minToeflScale?:string|null;
  fieldSources?:Partial<Record<MinimumField,RequirementSource>>;
}
export interface RequirementUniversity extends MinimumEvidence {
  id: number;
  name: string;
  minGpa?: number | null;
  minIelts?: number | null;
  minSat?: number | null;
  minToefl?: number | null;
  minAct?: number | null;
  minDuolingo?: number | null;
  applicationFee?: number | null;
  officialWebsiteUrl?: string | null;
  admissionsUrl?: string | null;
  applicationUrl?: string | null;
  sourceUrl?: string | null;
  lastVerifiedAt?: Date | string | null;
  verificationStatus?: string | null;
}

/** The student's own facts. Missing values stay `null` — never defaulted. */
export interface RequirementProfile {
  applicantContext?:ApplicantContext|null;
  gpa?: number | null;
  gpaScale?: number | null;
  ieltsScore?: number | null;
  toeflScore?: number | null;
  satScore?: number | null;
  actScore?: number | null;
  duolingoScore?: number | null;
}

export interface ProgramRequirementFacts extends MinimumEvidence {
  minGpa?: number | null;
  minIelts?: number | null;
  minToefl?: number | null;
  minDet?: number | null;
  minSat?: number | null;
  minAct?: number | null;
  ibRequirement?: string | null;
  aLevelRequirement?: string | null;
  apRequirement?: string | null;
  subjectRequirements?: string | null;
  portfolioRequired?: boolean | null;
  interviewRequired?: boolean | null;
  recommendationRequired?: boolean | null;
  personalStatementRequired?: boolean | null;
  otherRequirements?: string | null;
  sourceUrl?: string | null;
  lastVerifiedAt?: Date | null;
  verificationStatus?: string | null;
}

/** The student's progress against the non-university parts of the checklist. */
export interface StudentProgressFacts {
  /** A vault document of this type exists and is not expired. */
  hasDocument: (docType: string) => boolean;
  hasEssay: (essayType: string) => boolean;
  recommendationSubmitted: number;
  recommendationNeeded: number;
  testPlanScore: (testType: string) => number | null;
  applicationFeePaid?: boolean;
  financeItemsTotal?: number;
}

const UNVERIFIED: VerificationSource = { verificationStatus: "unverified" };
type VerificationSource = Pick<RequirementSource, "verificationStatus">;

/** Normalise the several spellings a `verification_status` column may carry. */
export function normalizeVerification(value: unknown): VerificationStatus {
  const v = String(value ?? "").toLowerCase().replace(/[\s-]+/g, "_");
  if (v === "verified" || v === "official" || v === "confirmed") return "verified";
  if (v === "needs_review" || v === "needsreview" || v === "pending_review") return "needs_review";
  if (v === "outdated" || v === "stale" || v === "expired") return "outdated";
  return "unverified";
}

/** "2026-09-20" — the date is only meaningful together with its source. */
export function verifiedLabel(src: RequirementSource): string {
  if (!src.lastVerifiedAt) return "";
  const d = src.lastVerifiedAt instanceof Date ? src.lastVerifiedAt : new Date(src.lastVerifiedAt);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

/**
 * Build the personalised checklist.
 *
 * `templates` are the admin-published rows for this university / programme
 * (already filtered to the ones that apply). Anything the templates do not
 * cover but the university's own sourced columns prove (GPA, IELTS, SAT, fee)
 * is added here.
 */
export function buildRequirements(input: {
  university: RequirementUniversity;
  profile: RequirementProfile;
  program?: ProgramRequirementFacts | null;
  templates?: {
    section: string;
    itemKey: string;
    title: string;
    instructions?: string | null;
    isRequired: boolean;
    sourceUrl?: string | null;
    sourceName?: string | null;
    sourceType?: string | null;
    lastVerifiedAt?: Date | null;
    verificationStatus?: string | null;
  }[];
  publishedGroup?:{value:unknown;source:RequirementSource}|null;
  asOfDate?:string;
  progress: StudentProgressFacts;
  deadline?: string | null;
  /** Already-known item keys — these are returned as `in_progress`. */
  existingItemKeys?: string[];
}): RequirementItem[] {
  const { university: u, profile, program, progress, deadline } = input;
  const items: RequirementItem[] = [];
  const already = new Set(input.existingItemKeys ?? []);

  const push = (item: Omit<RequirementItem, "verificationStatus"> & { verificationStatus?: string | null }) => {
    const status = normalizeVerification(item.verificationStatus ?? u.verificationStatus);
    items.push({ ...item, verificationStatus: status });
  };

  const sourceOf = (
    override?: {
      sourceUrl?: string | null;
      sourceName?: string | null;
      sourceType?: string | null;
      lastVerifiedAt?: Date | string | null;
      verificationStatus?: string | null;
    } | null
  ): RequirementSource => ({
    sourceUrl: override?.sourceUrl ?? u.sourceUrl ?? null,
    sourceName: override?.sourceName ?? (u.sourceUrl ? u.name : null),
    sourceType: override?.sourceType ?? (u.sourceUrl ? "official_website" : null),
    lastVerifiedAt: override?.lastVerifiedAt ?? u.lastVerifiedAt ?? null,
    verificationStatus: normalizeVerification(override?.verificationStatus ?? u.verificationStatus),
  });

  // ---- Admin-published templates come first, verbatim -----------------------
  for (const t of input.templates ?? []) {
    const section = (REQUIREMENT_SECTIONS as readonly string[]).includes(t.section)
      ? (t.section as RequirementSection)
      : "documents";
    const state = stateFor(section, t.itemKey, progress, already);
    push({
      itemKey: t.itemKey,
      section,
      title: t.title,
      instructions: t.instructions ?? null,
      isRequired: t.isRequired,
      state,
      detail: detailFor(section, t.itemKey, progress),
      dueDate: deadline ?? null,
      linkedType: linkedTypeFor(section, t.itemKey),
      ...sourceOf(t),
    });
  }

  const sourceFor=(field:MinimumField)=>{
    const programmeValue=program?.[field as keyof ProgramRequirementFacts]!=null;
    return sourceOf(programmeValue?(program?.fieldSources?.[field]??program):(u.fieldSources?.[field==="minDet"?"minDuolingo":field]??null));
  };
  if(input.publishedGroup){
    const test=recordedToefl(profile.applicantContext,profile.toeflScore);
    const group=evaluateApplicantRequirementGroup(input.publishedGroup.value,{gpa:profile.applicantContext?.gpa?profile.applicantContext.gpa.value:profile.gpa,gpaScale:profile.applicantContext?.gpa?profile.applicantContext.gpa.maximum:profile.gpaScale,gpaMinimum:profile.applicantContext?.gpa?.minimum,ielts:profile.ieltsScore,sat:profile.satScore,act:profile.actScore,duolingo:profile.duolingoScore,toefl:test.score,toeflScale:test.scale,toeflRecord:profile.applicantContext?.toefl},input.asOfDate??"");
    const describe=(node:RequirementEvaluation,depth=0):string=>`${"  ".repeat(depth)}${node.label}: ${node.state} (${node.reason})${node.children.length?"\n"+node.children.map(child=>describe(child,depth+1)).join("\n"):""}`;
    push({itemKey:"published.requirement_group",section:"academic",title:group.label==="unknown"?"Published programme requirements":group.label,instructions:describe(group),isRequired:group.state!=="not_applicable",state:group.state==="met"?"met":group.state==="unmet"?"not_met":"unknown",detail:"Published allOf / anyOf requirements; checklist completion is not admission eligibility.",dueDate:deadline??null,linkedType:"manual",...input.publishedGroup.source});
  } else {
  // ---- Academic: GPA -------------------------------------------------------
  const minGpa = program?.minGpa ?? u.minGpa ?? null;
  if (minGpa != null) {
    const studentGpa = profile.applicantContext?.gpa?profile.applicantContext.gpa.value:profile.gpa??null;
    const scale = profile.applicantContext?.gpa?profile.applicantContext.gpa.maximum:profile.gpaScale;
    const requiredScale=program?.minGpa!=null?program.minGpaScale:u.minGpaScale;
    // A student scale is not the publisher's scale. A planning conversion is
    // never evidence of meeting an official minimum.
    const comparable=scale===4&&requiredScale===4&&(profile.applicantContext?.gpa?.minimum??0)===0;
    push({
      itemKey: "academic.gpa",
      section: "academic",
      title: `Minimum GPA — ${minGpa} (${requiredScale==null?"published scale not recorded":`${requiredScale} scale`})`,
      isRequired: true,
      state: studentGpa==null||!comparable ? "unknown" : studentGpa>=minGpa ? "met" : "not_met",
      detail: studentGpa==null?"Add your GPA in Profile":!comparable?"Original GPA and published minimum need comparable native scales; no planning conversion is used.":`Your ${studentGpa} (${scale} scale)`,
      dueDate: deadline ?? null,
      linkedType: "manual",
      ...sourceFor("minGpa"),
    });
  }

  // Without a published group, simultaneous English minima do not establish
  // AND versus OR. Do not auto-complete them or make each one a hard blocker.
  const englishCount=[program?.minIelts??u.minIelts,program?.minToefl??u.minToefl,program?.minDet??u.minDuolingo].filter(value=>value!=null).length;
  // ---- English -------------------------------------------------------------
  const minIelts = program?.minIelts ?? u.minIelts ?? null;
  if (minIelts != null) {
    const mine = profile.ieltsScore ?? null;
    push({
      itemKey: "english.ielts",
      section: "english",
      title: `IELTS — ${minIelts} minimum`,
      isRequired: englishCount<=1,
      state: englishCount>1||mine == null ? "unknown" : mine >= minIelts ? "met" : "not_met",
      detail: englishCount>1?"Published English alternatives/operator need review; separate tests are not cumulative blockers":mine == null ? "No IELTS score on your profile yet" : `Current ${mine} · target ${minIelts}`,
      dueDate: deadline ?? null,
      linkedType: "test",
      ...sourceFor("minIelts"),
    });
  }
  const minToefl = program?.minToefl ?? u.minToefl ?? null;
  if (minToefl != null) {
    const test=recordedToefl(profile.applicantContext,profile.toeflScore);
    const requiredScale=program?.minToefl!=null?program.minToeflScale:u.minToeflScale;
    const record=profile.applicantContext?.toefl;
    const mine=test.scale&&test.scale===requiredScale&&record?.examDate&&record.validUntil&&input.asOfDate&&record.examDate<=input.asOfDate&&record.validUntil>=input.asOfDate?test.score:null;
    push({
      itemKey: "english.toefl",
      section: "english",
      title: `TOEFL — ${minToefl} minimum (${requiredScale??"scale not recorded"})`,
      isRequired: englishCount<=1,
      state: englishCount>1||mine == null ? "unknown" : mine >= minToefl ? "met" : "not_met",
      detail: englishCount>1?"Published English alternatives/operator need review; separate tests are not cumulative blockers":mine == null ? "Record a comparable TOEFL scale, exam date and validity in Profile" : `Current ${mine} · target ${minToefl}`,
      dueDate: deadline ?? null,
      linkedType: "test",
      ...sourceFor("minToefl"),
    });
  }

  // ---- Testing -------------------------------------------------------------
  const minSat = program?.minSat ?? u.minSat ?? null;
  if (minSat != null) {
    const mine = profile.satScore ?? null;
    push({
      itemKey: "testing.sat",
      section: "testing",
      title: `SAT — ${minSat} minimum`,
      isRequired: true,
      state: mine == null ? "unknown" : mine >= minSat ? "met" : "not_met",
      detail: mine == null ? "No SAT score on your profile yet" : `Current ${mine} · target ${minSat}`,
      dueDate: deadline ?? null,
      linkedType: "test",
      ...sourceFor("minSat"),
    });
  }
  const minDet = program?.minDet ?? u.minDuolingo ?? null;
  if (minDet != null) {
    const mine = profile.duolingoScore ?? null;
    push({
      itemKey: "testing.duolingo",
      section: "testing",
      title: `Duolingo English Test — ${minDet} minimum`,
      isRequired: englishCount<=1,
      state: englishCount>1||mine == null ? "unknown" : mine >= minDet ? "met" : "not_met",
      detail: englishCount>1?"Published English alternatives/operator need review; separate tests are not cumulative blockers":mine == null ? "No DET score on your profile yet" : `Current ${mine} · target ${minDet}`,
      dueDate: deadline ?? null,
      linkedType: "test",
      ...sourceFor("minDet"),
    });
  }

  } // no full published requirement group

  // ---- Finance / application fee ------------------------------------------
  if (u.applicationFee != null) {
    push({
      itemKey: "application.fee",
      section: "application",
      title: `Application fee — $${u.applicationFee}`,
      instructions: "Pay on the university's official portal and keep the receipt.",
      isRequired: true,
      state: progress.applicationFeePaid ? "met" : already.has("application.fee") ? "in_progress" : "todo",
      detail: progress.applicationFeePaid ? "Marked as paid" : "Not marked as paid yet",
      dueDate: deadline ?? null,
      linkedType: "payment",
      ...sourceFor("applicationFee"),
    });
  }

  return items;
}

function stateFor(
  section: RequirementSection,
  itemKey: string,
  progress: StudentProgressFacts,
  already: Set<string>
): RequirementItem["state"] {
  if (section === "documents" && progress.hasDocument(itemKey.replace(/^documents?\./, ""))) return "met";
  if (section === "essays" && progress.hasEssay(itemKey.replace(/^essays?\./, ""))) return "met";
  if (section === "recommendations" && progress.recommendationSubmitted > 0) return "met";
  if (section === "testing" && progress.testPlanScore(itemKey.replace(/^testing?\./, "")) != null) return "met";
  if (section === "finance" && (progress.financeItemsTotal ?? 0) > 0) return "in_progress";
  return already.has(itemKey) ? "in_progress" : "todo";
}

function detailFor(
  section: RequirementSection,
  itemKey: string,
  progress: StudentProgressFacts
): string | undefined {
  if (section === "documents") {
    return progress.hasDocument(itemKey.replace(/^documents?\./, "")) ? "In your vault" : "Not in your vault yet";
  }
  if (section === "recommendations") {
    return `${progress.recommendationSubmitted} of ${Math.max(progress.recommendationNeeded, progress.recommendationSubmitted)} submitted`;
  }
  if (section === "testing") {
    const score = progress.testPlanScore(itemKey.replace(/^testing?\./, ""));
    return score == null ? "No plan score yet" : `Planned score ${score}`;
  }
  return undefined;
}

function linkedTypeFor(section: RequirementSection, itemKey: string): RequirementItem["linkedType"] {
  if (section === "documents") return "document";
  if (section === "essays") return "essay";
  if (section === "recommendations") return "recommendation";
  if (section === "testing" || section === "english") return "test";
  if (section === "finance") return "manual";
  if (section === "application" && itemKey === "application.fee") return "payment";
  return "manual";
}

/** Default template catalogue for a university with no published templates. */
export const DEFAULT_REQUIREMENT_TEMPLATES: {
  section: RequirementSection;
  itemKey: string;
  title: string;
  instructions: string;
  isRequired: boolean;
}[] = [
  { section: "documents", itemKey: "documents.passport", title: "Passport", instructions: "Valid for at least 6 months beyond your study period.", isRequired: true },
  { section: "documents", itemKey: "documents.transcript", title: "Official transcript", instructions: "Issued by your school or university, sealed where required.", isRequired: true },
  { section: "documents", itemKey: "documents.cv", title: "Academic CV", instructions: "Use your Answer Vault and Activity Portfolio to build it.", isRequired: true },
  { section: "essays", itemKey: "essays.personal_statement", title: "Personal statement", instructions: "Adapt your vault answers to this university — do not paste the same text everywhere.", isRequired: true },
  { section: "recommendations", itemKey: "recommendations.letter", title: "Recommendation letter", instructions: "Request from a teacher or mentor who knows your work.", isRequired: false },
  { section: "finance", itemKey: "finance.proof_of_funds", title: "Proof of funds", instructions: "Bank statement or sponsor letter covering the first year.", isRequired: true },
  { section: "application", itemKey: "application.final_submission", title: "Final review & submission", instructions: "Check every item, then submit on the official portal.", isRequired: true },
];
