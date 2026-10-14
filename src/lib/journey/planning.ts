/**
 * Study-plan phase summaries and deadline-aware review checklists.
 *
 * No phase assumes a test, essay, recommender, document, scholarship count or
 * fixed preparation window applies to every student. Completion reflects only
 * records the app can observe; official programme and destination instructions
 * remain the source of truth.
 */

export type PlanPhaseKey =
  | "profile"
  | "tests"
  | "university_research"
  | "scholarship_research"
  | "documents"
  | "applications"
  | "interviews"
  | "admission"
  | "visa"
  | "departure";

export interface PlanPhase {
  key: PlanPhaseKey;
  title: string;
  description: string;
  icon: string;
  /** The sidebar tab where the work for this phase happens. */
  tab: string;
}

export const PLAN_PHASES: readonly PlanPhase[] = [
  { key: "profile", title: "Profile details", description: "Record only information you choose to use for programme comparisons.", icon: "🧱", tab: "profile/details" },
  { key: "tests", title: "Test policy and tracking", description: "Check programme-specific rules; track a test only if it is relevant to your plans.", icon: "📝", tab: "tests" },
  { key: "university_research", title: "Programme research", description: "Compare available catalogue information with official programme pages.", icon: "🔎", tab: "universities" },
  { key: "scholarship_research", title: "Funding research", description: "Review funding options if relevant; eligibility and coverage vary.", icon: "💰", tab: "scholarships" },
  { key: "documents", title: "Application documents", description: "Use each programme’s current official checklist; documents differ.", icon: "📄", tab: "documents" },
  { key: "applications", title: "Applications", description: "Track requested materials, submission steps and decisions.", icon: "📝", tab: "applications" },
  { key: "interviews", title: "Interviews", description: "Prepare if a programme or official process schedules an interview.", icon: "🎤", tab: "interviews" },
  { key: "admission", title: "Admission decisions", description: "Record decisions when you receive them.", icon: "🎓", tab: "offers" },
  { key: "visa", title: "Immigration guidance", description: "Follow current official instructions for your destination and institution.", icon: "🛂", tab: "visa" },
  { key: "departure", title: "Departure planning", description: "Review logistics that apply to your institution and destination.", icon: "✈️", tab: "departure" },
] as const;

export type PhaseStatus = "pending" | "in_progress" | "done";

export interface PhaseProgress {
  key: PlanPhaseKey;
  title: string;
  description: string;
  icon: string;
  tab: string;
  status: PhaseStatus;
  /** 0–100 based only on tracked records; not eligibility or readiness. */
  pct: number;
  /** Stable message keys localized by the UI. */
  missing: string[];
}

/**
 * Build a live summary from records in the app. Thresholds are only used when
 * the underlying fact itself is binary (for example, an application submitted
 * or a document marked uploaded); there are no target counts for activities,
 * universities, scholarships or tests.
 */
export function buildPhaseProgress(counts: {
  /** Whether the student has recorded any profile context they chose to share. */
  profileHasContext: boolean;
  openApplicationRequirements?: number;
  testPlanCount: number;
  savedUniversities: number;
  savedScholarships: number;
  documentsReady: number;
  documentsTotal: number;
  applications: number;
  submittedApplications: number;
  interviewSessions: number;
  offersRecorded: number;
  visaCaseStarted: boolean;
  visaApproved: boolean;
  departureReady: boolean;
}): PhaseProgress[] {
  const ratio = (ready: number, total: number) =>
    total > 0 ? Math.round((Math.max(0, Math.min(total, ready)) / total) * 100) : 0;
  const documentsPct = ratio(counts.documentsReady, counts.documentsTotal);
  const applicationRequirements = Math.max(0, counts.openApplicationRequirements ?? 0);

  const raw: Record<PlanPhaseKey, { p: number; missing: string[] }> = {
    profile: {
      p: counts.profileHasContext ? 100 : 0,
      missing: counts.profileHasContext ? [] : ["profileContext"],
    },
    tests: {
      p: counts.testPlanCount > 0 ? 100 : 0,
      missing: counts.testPlanCount > 0 ? [] : ["testPolicy"],
    },
    university_research: {
      p: counts.savedUniversities > 0 ? 100 : 0,
      missing: counts.savedUniversities > 0 ? [] : ["programmeResearch"],
    },
    scholarship_research: {
      p: counts.savedScholarships > 0 ? 100 : 0,
      missing: counts.savedScholarships > 0 ? [] : ["fundingResearchOptional"],
    },
    documents: {
      p: documentsPct,
      missing: documentsPct >= 100 ? [] : [counts.documentsTotal > 0 ? "documentsPending" : "documentsOfficialChecklist"],
    },
    applications: {
      p: counts.submittedApplications > 0
        ? applicationRequirements === 0 ? 100 : 80
        : counts.applications > 0 ? 50 : 0,
      missing: counts.submittedApplications > 0
        ? applicationRequirements > 0 ? ["applicationRequirementsOpen"] : []
        : counts.applications > 0 ? ["applicationSubmit"] : ["applicationOptional"],
    },
    interviews: {
      p: counts.interviewSessions > 0 ? 100 : 0,
      missing: counts.interviewSessions > 0 ? [] : ["interviewConditional"],
    },
    admission: {
      p: counts.offersRecorded > 0 ? 100 : 0,
      missing: counts.offersRecorded > 0 ? [] : ["recordDecisionWhenReceived"],
    },
    visa: {
      p: counts.visaApproved ? 100 : counts.visaCaseStarted ? 50 : 0,
      missing: counts.visaApproved ? [] : ["officialImmigrationGuidance"],
    },
    departure: {
      p: counts.departureReady ? 100 : 0,
      missing: counts.departureReady ? [] : ["departureChecklist"],
    },
  };

  return PLAN_PHASES.map((phase) => {
    const progress = raw[phase.key];
    const status: PhaseStatus = progress.p >= 100 ? "done" : progress.p > 0 ? "in_progress" : "pending";
    return { ...phase, status, pct: progress.p, missing: progress.missing };
  });
}

// ---------------------------------------------------------------------------
// Deadline-aware review checklist (not a fixed timetable)
// ---------------------------------------------------------------------------

export interface ReverseStep {
  key: string;
  /** Stable fallback text; the UI localizes by key. */
  title: string;
  /** We do not invent dates or preparation windows. */
  date: null;
  daysBefore: null;
  tab: string;
}

/**
 * Return a checklist only when the student has provided a valid deadline.
 * Items are intentionally unscheduled: official requirements, portals and
 * recommender availability determine timing, not a generic countdown model.
 */
export function reversePlan(
  deadline: string,
  kind: "application" | "scholarship" | "visa" = "application",
): ReverseStep[] {
  const parsed = new Date(`${deadline}T00:00:00Z`);
  if (!deadline || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== deadline) return [];

  const checklist: Record<typeof kind, Omit<ReverseStep, "date" | "daysBefore">[]> = {
    application: [
      { key: "confirm_requirements", title: "Confirm programme requirements, deadline and submission route from the official source.", tab: "workspace" },
      { key: "requested_materials", title: "List only the documents, essays and other materials the official checklist requests.", tab: "workspace" },
      { key: "recommendation_if_needed", title: "If recommendations are required, confirm instructions and ask each writer about availability in time for the official deadline.", tab: "recommendations" },
      { key: "submission_review", title: "Review the portal instructions and allow time for the provider’s submission process.", tab: "workspace" },
    ],
    scholarship: [
      { key: "confirm_award", title: "Confirm current eligibility, coverage, materials and deadline with the official award provider.", tab: "scholarships" },
      { key: "requested_materials", title: "Prepare only the materials the award’s official checklist requests.", tab: "workspace" },
      { key: "recommendation_if_needed", title: "If a recommendation is required, confirm the provider’s instructions and the writer’s availability.", tab: "recommendations" },
      { key: "submission_review", title: "Review the award portal instructions and allow time for its submission process.", tab: "workspace" },
    ],
    visa: [
      { key: "official_immigration_guidance", title: "Check current official immigration guidance for your destination and institution.", tab: "visa" },
      { key: "visa_process_timing", title: "Use the official appointment and processing information to set your own dates; procedures vary.", tab: "visa" },
    ],
  };

  return checklist[kind].map((item) => ({ ...item, date: null, daysBefore: null }));
}
