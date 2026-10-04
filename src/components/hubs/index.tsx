"use client";

/**
 * The fourteen destinations, in one place.
 *
 * Every hub is a thin composition layer: page title + one-line explanation +
 * one primary action + tabs (shared shell in `./ui`) and then the EXISTING
 * feature components, unchanged, in the tab that owns them. No feature was
 * rewritten to move it here — panels keep their own APIs, data, permissions
 * and Premium gates, and each one still brings its own loading / empty /
 * error / success states.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Empty } from "@/components/journey/ui";
import { UniversityExplorer } from "@/components/UniversityExplorer";
import { ScholarshipHub } from "@/components/ScholarshipHub";
import { ChancingPanel } from "@/components/ChancingPanel";
import { RecommendationStudio } from "@/components/RecommendationStudio";
import { CountryComparePanel } from "@/components/CountryComparePanel";
import { OpportunitiesPanel } from "@/components/OpportunitiesPanel";
import { PlanningStudio } from "@/components/PlanningStudio";
import { TaskRoadmap } from "@/components/TaskRoadmap";
import { DeadlineCenter } from "@/components/DeadlineCenter";
import { ProfileStrengthPanel } from "@/components/ProfileStrengthPanel";
import { SimilarProfiles } from "@/components/SimilarProfiles";
import { CompleteProfileForm } from "@/components/CompleteProfileForm";
import { SessionsPanel } from "@/components/SessionsPanel";
import { ApplicationCenter } from "@/components/ApplicationCenter";
import { PremiumGate } from "@/components/PremiumGate";
import { AiSopStudio } from "@/components/AiSopStudio";
import { EssayRubricStudio } from "@/components/EssayRubricStudio";
import { AiChatMentor } from "@/components/AiChatMentor";
import { AdmissionsAdvisor } from "@/components/AdmissionsAdvisor";
import { ConsultingSection } from "@/components/ConsultingSection";
import { MentorMarketplace } from "@/components/MentorMarketplace";
import { ForumSection } from "@/components/ForumSection";
import { CoursesSection } from "@/components/CoursesSection";
import { FaqSection } from "@/components/FaqSection";
import { AnswerVault } from "@/components/growth/AnswerVault";
import { DepartureChecklist } from "@/components/growth/DepartureChecklist";
import { GoalPlanner } from "@/components/growth/GoalPlanner";
import { ScholarshipAutopilot } from "@/components/growth/ScholarshipAutopilot";
import { SuccessStories } from "@/components/growth/SuccessStories";
import { CareerExplorerPanel, InterviewCenterPanel, VisaCenterPanel } from "@/components/journey/ExplorePanels";
import { ApplicationWorkspacePanel } from "@/components/journey/ApplicationWorkspacePanel";
import {
  FinancialPlanPanel,
  LearningProvidersPanel,
  OffersPanel,
  RecommendationManagerPanel,
} from "@/components/journey/AfterAdmissionPanels";
import {
  ActivityPortfolioPanel,
  DocumentVaultPanel,
  StudyPlanPanel,
  TestPlannerPanel,
} from "@/components/journey/PreparePanels";
import { RequirementsBrowser } from "@/components/journey/RequirementsBrowser";
import { VisaSpeakingAssistant } from "@/components/VisaSpeakingAssistant";
import { HubPage, HubEmpty, usePaneSelection, type HubPaneDef } from "./ui";
import type { StudentProfile } from "@/components/Navbar";
import { NAV_SECTIONS, NAV_SECTION_LABEL_KEYS, visiblePanes } from "@/lib/navSections";

type Profile = StudentProfile | null;

export interface HubProps {
  profile: Profile;
  /** Active tab, owned by the shell (so Back/Forward and deep links work). */
  pane: string | null;
  setPane: (pane: string) => void;
  /** Navigate anywhere by id (`materials/essays`, `payments`, …). */
  navigate: (id: string) => void;
  /** Ids an admin has turned off in Admin → Navigation. */
  hidden: string[];
  /** The application the workspace/materials are working on. */
  workspaceId?: number | null;
  setWorkspaceId?: (id: number | null) => void;
  /** Saved-university / saved-scholarship id sets, owned by the shell. */
  savedUniIds?: Set<number>;
  savedScholarshipIds?: Set<number>;
  onSaveUniversity?: (uniId: number) => Promise<void>;
  onUnsaveUniversity?: (uniId: number) => Promise<void>;
  onSaveScholarship?: (scholarshipId: number) => Promise<void>;
  onUnsaveScholarship?: (scholarshipId: number) => Promise<void>;
  autoOpenUniversityId?: number | null;
  onProfileSaved?: (profile: StudentProfile) => void;
}

/** Resolve a destination's panes with their translated labels. */
function usePanes(sectionId: string): { panes: HubPaneDef[]; visible: { id: string }[]; label: string } {
  const tn = useTranslations("nav");
  const tp = useTranslations("navPanes");
  const section = NAV_SECTIONS.find((s) => s.id === sectionId);
  const panes = useMemo(
    () =>
      (section?.panes ?? []).map((p) => ({
        id: p.id,
        label: tp(p.id as never),
        premium: p.premium,
        // NEW is a badge on a feature, never an extra destination: it travels
        // with the tab into whichever destination the feature now lives in.
        isNew: p.isNew,
      })),
    [section, tp]
  );
  const label = section ? tn(NAV_SECTION_LABEL_KEYS[section.id] as never) : sectionId;
  const visible = useMemo(() => section?.panes ?? [], [section]);
  return { panes, visible, label };
}

/** The tab the hub should show: the URL's pane, else the first visible one. */
function useActivePane(pane: string | null, visible: { id: string }[], hidden: string[]) {
  const allowed = visible.filter((p) => !hidden.includes(p.id));
  const ids = allowed.map((p) => p.id);
  return ids.includes(pane ?? "") ? (pane as string) : ids[0] ?? "";
}

function MissingProfile() {
  return <Empty title="Choose a profile" hint="Sign in and pick a student profile to open this section." />;
}

/** Premium gate wrapper that keeps the existing feature flags and copy. */
function Gated({
  profileId,
  feature,
  title,
  description,
  onUpgrade,
  children,
}: {
  profileId: number | null;
  feature: React.ComponentProps<typeof PremiumGate>["feature"];
  title: string;
  description: string;
  onUpgrade: () => void;
  children: React.ReactNode;
}) {
  return (
    <PremiumGate profileId={profileId} feature={feature} title={title} description={description} onUpgrade={onUpgrade}>
      {children}
    </PremiumGate>
  );
}

/* =========================================================================
 * EXPLORE → Universities & Programs
 * ====================================================================== */
export function UniversitiesHub({
  profile,
  pane,
  setPane,
  hidden,
  savedUniIds,
  onSaveUniversity,
  onUnsaveUniversity,
  autoOpenUniversityId,
  onProfileSaved,
}: HubProps) {
  const t = useTranslations("hubs");
  const tp = useTranslations("navPanes");
  const { panes, visible, label } = usePanes("universities");
  const active = useActivePane(pane, visible, hidden);

  return (
    <HubPage
      title={label}
      intro={t("introUniversities")}
      primaryLabel={t("primaryUniversities")}
      onPrimary={() => setPane("search")}
      panes={panes}
      activePane={active || undefined}
      onPaneChange={setPane}
      hiddenPanes={hidden}
    >
      {active === "search" && (
        <UniversityExplorer
          activeProfile={profile}
          savedUniIds={savedUniIds ?? new Set<number>()}
          onSaveUniversity={onSaveUniversity ?? (async () => undefined)}
          onUnsaveUniversity={onUnsaveUniversity ?? (async () => undefined)}
          autoOpenUniversityId={autoOpenUniversityId ?? null}
        />
      )}
      {active === "careers" && <CareerExplorerPanel onNavigateTab={() => setPane("search")} />}
      {active === "matches" && <RecommendationStudio activeProfile={profile} onProfileSaved={onProfileSaved} />}
      {active === "outlook" && (
        <div className="space-y-3">
          <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] leading-relaxed text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {t("outlookExplain")}
          </p>
          <ChancingPanel activeProfile={profile} />
        </div>
      )}
      {active === "countries" && <CountryComparePanel />}
    </HubPage>
  );
}

/* =========================================================================
 * EXPLORE → Scholarships
 * ====================================================================== */
export function ScholarshipsHub({
  profile,
  pane,
  setPane,
  navigate,
  hidden,
  savedScholarshipIds,
  onSaveScholarship,
  onUnsaveScholarship,
}: HubProps) {
  const t = useTranslations("hubs");
  const { panes, visible, label } = usePanes("scholarships");
  const active = useActivePane(pane, visible, hidden);

  return (
    <HubPage
      title={label}
      intro={t("introScholarships")}
      primaryLabel={t("primaryScholarships")}
      onPrimary={() => setPane("browse")}
      panes={panes}
      activePane={active || undefined}
      onPaneChange={setPane}
      hiddenPanes={hidden}
    >
      {active === "browse" && (
        <ScholarshipHub
          activeProfile={profile}
          savedScholarshipIds={savedScholarshipIds ?? new Set<number>()}
          onSaveScholarship={onSaveScholarship ?? (async () => undefined)}
          onUnsaveScholarship={onUnsaveScholarship ?? (async () => undefined)}
        />
      )}
      {active === "recommended" && (
        <ScholarshipAutopilot activeProfile={profile} onSaveScholarship={onSaveScholarship} onNavigate={navigate} />
      )}
      {active === "opportunities" && <OpportunitiesPanel />}
    </HubPage>
  );
}

/* =========================================================================
 * MY PLAN → Study Plan & Tests
 * ====================================================================== */
export function StudyPlanHub({ profile, pane, setPane, navigate, hidden }: HubProps) {
  const t = useTranslations("hubs");
  const { panes, visible, label } = usePanes("study-plan");
  const active = useActivePane(pane, visible, hidden);
  if (!profile) return <MissingProfile />;

  return (
    <HubPage
      title={label}
      intro={t("introStudyPlan")}
      primaryLabel={t("primaryStudyPlan")}
      onPrimary={() => setPane("plan")}
      panes={panes}
      activePane={active || undefined}
      onPaneChange={setPane}
      hiddenPanes={hidden}
    >
      {active === "plan" && <StudyPlanPanel profileId={profile.id} onNavigateTab={navigate} />}
      {active === "tests" && <TestPlannerPanel profileId={profile.id} />}
      {active === "tools" && <PlanningStudio activeProfile={profile} />}
    </HubPage>
  );
}

/* =========================================================================
 * MY PLAN → Tasks & Timeline
 * ====================================================================== */
export function TasksHub({ profile, pane, setPane, hidden }: HubProps) {
  const t = useTranslations("hubs");
  const { panes, visible, label } = usePanes("tasks");
  const active = useActivePane(pane, visible, hidden);
  if (!profile) return <MissingProfile />;

  return (
    <HubPage
      title={label}
      intro={t("introTasks")}
      panes={panes}
      activePane={active || undefined}
      onPaneChange={setPane}
      hiddenPanes={hidden}
    >
      {active === "tasks" && <TaskRoadmap activeProfile={profile} />}
      {active === "deadlines" && <DeadlineCenter profileId={profile.id} />}
    </HubPage>
  );
}

/* =========================================================================
 * MY PLAN → Profile & Goals
 * ====================================================================== */
export function ProfileHub({
  profile,
  pane,
  setPane,
  hidden,
  onProfileSaved,
}: HubProps) {
  const t = useTranslations("hubs");
  const { panes, visible, label } = usePanes("profile");
  const active = useActivePane(pane, visible, hidden);
  if (!profile) return <MissingProfile />;

  return (
    <HubPage
      title={label}
      intro={t("introProfile")}
      primaryLabel={t("primaryProfile")}
      onPrimary={() => setPane(visible.some((p) => p.id === "details") ? "details" : active)}
      panes={panes}
      activePane={active || undefined}
      onPaneChange={setPane}
      hiddenPanes={hidden}
    >
      {active === "readiness" && <ProfileStrengthPanel activeProfile={profile} />}
      {active === "goals" && <GoalPlanner activeProfile={profile} />}
      {active === "activities" && <ActivityPortfolioPanel profileId={profile.id} />}
      {active === "stories" && <SuccessStories activeProfile={profile} />}
      {active === "similar" && <SimilarProfiles activeProfile={profile} />}
      {active === "details" && (
        <div className="space-y-6">
          <CompleteProfileForm key={`profile-${profile.id}`} activeProfile={profile} onSaved={onProfileSaved ?? (() => undefined)} />
          <SessionsPanel />
        </div>
      )}
    </HubPage>
  );
}

/* =========================================================================
 * MY PLAN → Financial Plan
 * ====================================================================== */
export function FundingHub({ profile, navigate }: HubProps) {
  const t = useTranslations("hubs");
  const { label } = usePanes("funding");
  if (!profile) return <MissingProfile />;
  return (
    <HubPage
      title={label}
      intro={t("introFunding")}
      primaryLabel={t("primaryScholarships")}
      onPrimary={() => navigate("scholarships")}
    >
      <FinancialPlanPanel profileId={profile.id} onNavigateTab={navigate} />
    </HubPage>
  );
}

/* =========================================================================
 * APPLICATIONS → My Applications
 * ====================================================================== */
export function ApplicationsHub({ profile, pane, setPane, navigate, hidden, workspaceId, setWorkspaceId }: HubProps) {
  const t = useTranslations("hubs");
  const { panes, visible, label } = usePanes("applications");
  const active = useActivePane(pane, visible, hidden);
  if (!profile) return <MissingProfile />;

  const openWorkspace = (id: number) => {
    setWorkspaceId?.(id);
    setPane("workspace");
  };

  return (
    <HubPage
      title={label}
      intro={t("introApplications")}
      primaryLabel={t("primaryApplications")}
      onPrimary={() => setPane("tracker")}
      panes={panes}
      activePane={active || undefined}
      onPaneChange={setPane}
      hiddenPanes={hidden}
    >
      {active === "tracker" && <ApplicationCenter activeProfile={profile} onOpenWorkspace={openWorkspace} />}
      {active === "workspace" && (
        <ApplicationWorkspacePanel
          key={`ws-${profile.id}-${workspaceId ?? "list"}`}
          profileId={profile.id}
          applicationId={workspaceId ?? null}
          onSelect={(id) => setWorkspaceId?.(id || null)}
          onNavigateTab={navigate}
        />
      )}
    </HubPage>
  );
}

/* =========================================================================
 * APPLICATIONS → Application Materials
 * ====================================================================== */
export function MaterialsHub({ profile, pane, setPane, navigate, hidden, workspaceId, setWorkspaceId }: HubProps) {
  const t = useTranslations("hubs");
  const { panes, visible, label } = usePanes("materials");
  const active = useActivePane(pane, visible, hidden);
  const profileId = profile?.id ?? null;

  // The list of applications the student can attach materials to. Local state
  // only — it is a view filter, never a second source of truth.
  const [applications, setApplications] = useState<{ id: number; universityName: string; programName: string | null }[]>([]);
  useEffect(() => {
    if (!profileId) return;
    let live = true;
    fetch(`/api/applications?profileId=${profileId}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { applications: [] }))
      .then((d) => {
        if (!live) return;
        setApplications(
          Array.isArray(d.applications)
            ? d.applications.map((a: { id: number; universityName: string; programName: string | null }) => ({
                id: a.id,
                universityName: a.universityName,
                programName: a.programName,
              }))
            : []
        );
      })
      .catch(() => {
        /* the empty state below already explains what to do */
      });
    return () => {
      live = false;
    };
  }, [profileId]);

  const effectiveId = workspaceId ?? applications[0]?.id ?? null;
  const selectApplication = useCallback(
    (id: number | null) => {
      setWorkspaceId?.(id);
    },
    [setWorkspaceId]
  );

  if (!profile) return <MissingProfile />;

  const context =
    applications.length > 0 ? (
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900">
        <label htmlFor="materials-app" className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t("selectedApplication")}
        </label>
        <select
          id="materials-app"
          value={effectiveId ?? ""}
          onChange={(e) => selectApplication(e.target.value ? Number(e.target.value) : null)}
          className="min-h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-semibold text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 sm:max-w-md"
        >
          <option value="">{t("noApplication")}</option>
          {applications.map((a) => (
            <option key={a.id} value={a.id}>
              {a.universityName}
              {a.programName ? ` — ${a.programName}` : ""}
            </option>
          ))}
        </select>
        {effectiveId && (
          <button
            type="button"
            onClick={() => navigate("applications/workspace")}
            className="min-h-10 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {t("openWorkspace")}
          </button>
        )}
      </div>
    ) : (
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        <p className="font-bold text-slate-800 dark:text-slate-100">{t("noApplicationsYet")}</p>
        <p className="mt-1">{t("noApplicationsHint")}</p>
      </div>
    );

  return (
    <HubPage
      title={label}
      intro={t("introMaterials")}
      panes={panes}
      activePane={active || undefined}
      onPaneChange={setPane}
      hiddenPanes={hidden}
    >
      {context}
      {active === "requirements" && (
        <RequirementsBrowser
          profileId={profile.id}
          onOpenWorkspace={(id) => {
            setWorkspaceId?.(id);
            navigate("applications/workspace");
          }}
        />
      )}
      {active === "documents" && (
        <div className="space-y-4">
          <DocumentVaultPanel profileId={profile.id} onNavigateTab={navigate} />
          <AnswerVault activeProfile={profile} />
        </div>
      )}
      {active === "essays" && (
        <div className="space-y-4">
          <Gated
            profileId={profile.id}
            feature="ai_essay"
            title="AI SOP & Essays is Premium"
            description="Generate, evaluate and review your Statement of Purpose with AI — an exclusive Premium feature."
            onUpgrade={() => navigate("payments")}
          >
            <div className="space-y-4">
              <AiSopStudio activeProfile={profile} />
              <EssayRubricStudio activeProfile={profile} />
            </div>
          </Gated>
          <RecommendationManagerPanel profileId={profile.id} />
        </div>
      )}
      {active === "interviews" && <InterviewCenterPanel onNavigateTab={navigate} />}
    </HubPage>
  );
}

/* =========================================================================
 * AFTER ADMISSION → Offers & Decisions
 * ====================================================================== */
export function OffersHub({ profile, pane, setPane, navigate, hidden }: HubProps) {
  const t = useTranslations("hubs");
  const { panes, visible, label } = usePanes("offers");
  const active = useActivePane(pane, visible, hidden);
  if (!profile) return <MissingProfile />;
  return (
    <HubPage
      title={label}
      intro={t("introOffers")}
      panes={panes}
      activePane={active || undefined}
      onPaneChange={setPane}
      hiddenPanes={hidden}
      note={{ tone: "info", text: t("afterAdmissionNote") }}
    >
      <OffersPanel profileId={profile.id} onNavigateTab={navigate} />
    </HubPage>
  );
}

/* =========================================================================
 * AFTER ADMISSION → Funding & Deposits
 * ====================================================================== */
export function PostAdmissionFundingHub({ profile, navigate }: HubProps) {
  const t = useTranslations("hubs");
  const { label } = usePanes("post-admission-funding");
  if (!profile) return <MissingProfile />;
  return (
    <HubPage
      title={label}
      intro={t("introPostAdmissionFunding")}
      primaryLabel={t("primaryPostAdmissionFunding")}
      onPrimary={() => navigate("funding")}
      note={{ tone: "info", text: t("afterAdmissionNote") }}
    >
      <FinancialPlanPanel profileId={profile.id} onNavigateTab={navigate} />
    </HubPage>
  );
}

/* =========================================================================
 * AFTER ADMISSION → Visa & Departure
 * ====================================================================== */
export function VisaHub({ profile, pane, setPane, navigate, hidden }: HubProps) {
  const t = useTranslations("hubs");
  const { panes, visible, label } = usePanes("visa");
  const active = useActivePane(pane, visible, hidden);
  if (!profile) return <MissingProfile />;

  return (
    <HubPage
      title={label}
      intro={t("introVisa")}
      primaryLabel={t("primaryVisa")}
      onPrimary={() => setPane("visa")}
      panes={panes}
      activePane={active || undefined}
      onPaneChange={setPane}
      hiddenPanes={hidden}
      note={{ tone: "info", text: t("afterAdmissionNote") }}
    >
      {active === "visa" && (
        <div className="space-y-4">
          <VisaCenterPanel profileId={profile.id} onNavigateTab={navigate} />
          <VisaSpeakingAssistant activeProfile={profile} />
        </div>
      )}
      {active === "departure" && <DepartureChecklist activeProfile={profile} onNavigate={navigate} />}
    </HubPage>
  );
}

/* =========================================================================
 * HELP & LEARNING → Guidance
 * ====================================================================== */
export function GuidanceHub({ profile, pane, setPane, navigate, hidden }: HubProps) {
  const t = useTranslations("hubs");
  const { panes, visible, label } = usePanes("guidance");
  const active = useActivePane(pane, visible, hidden);
  if (!profile) return <MissingProfile />;

  return (
    <HubPage
      title={label}
      intro={t("introGuidance")}
      primaryLabel={t("primaryGuidance")}
      onPrimary={() => setPane("mentor")}
      panes={panes}
      activePane={active || undefined}
      onPaneChange={setPane}
      hiddenPanes={hidden}
      note={{ tone: "warn", text: t("aiDisclaimer") }}
    >
      {active === "mentor" && (
        <div className="space-y-4">
          <AiChatMentor activeProfile={profile} />
          <AdmissionsAdvisor activeProfile={profile} />
        </div>
      )}
      {active === "consulting" && (
        <div className="space-y-4">
          <ConsultingSection activeProfile={profile} />
          <MentorMarketplace activeProfile={profile} />
        </div>
      )}
      {active === "faq" && <FaqSection />}
    </HubPage>
  );
}

/* =========================================================================
 * HELP & LEARNING → Community & Learning
 * ====================================================================== */
export function CommunityHub({ profile, pane, setPane, hidden }: HubProps) {
  const t = useTranslations("hubs");
  const { panes, visible, label } = usePanes("community");
  const active = useActivePane(pane, visible, hidden);
  if (!profile) return <MissingProfile />;

  return (
    <HubPage
      title={label}
      intro={t("introCommunity")}
      primaryLabel={t("primaryCommunity")}
      onPrimary={() => setPane("forum")}
      panes={panes}
      activePane={active || undefined}
      onPaneChange={setPane}
      hiddenPanes={hidden}
    >
      {active === "forum" && <ForumSection activeProfile={profile} isModerator={profile.isAdmin ?? false} />}
      {active === "courses" && (
        <div className="space-y-4">
          <CoursesSection activeProfile={profile} />
          <LearningProvidersPanel key={`lp-${profile.id}`} profileId={profile.id} />
        </div>
      )}
    </HubPage>
  );
}

export { HubEmpty, usePaneSelection };
