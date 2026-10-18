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
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Empty } from "@/components/journey/ui";
import { UniversityExplorer } from "@/components/UniversityExplorer";
import { ScholarshipHub } from "@/components/ScholarshipHub";
import { OpportunitiesPanel } from "@/components/OpportunitiesPanel";
import { TaskRoadmap } from "@/components/TaskRoadmap";
import { DeadlineCenter } from "@/components/DeadlineCenter";
import { ProfileStrengthPanel } from "@/components/ProfileStrengthPanel";
import { SimilarProfiles } from "@/components/SimilarProfiles";
import { ApplicationCenter } from "@/components/ApplicationCenter";
import { PremiumGate } from "@/components/PremiumGate";
import { FaqSection } from "@/components/FaqSection";
import { AnswerVault } from "@/components/growth/AnswerVault";
import { DepartureChecklist } from "@/components/growth/DepartureChecklist";
import { GoalPlanner } from "@/components/growth/GoalPlanner";
import { ScholarshipAutopilot } from "@/components/growth/ScholarshipAutopilot";
import { SuccessStories } from "@/components/growth/SuccessStories";
import { InterviewCenterPanel, VisaCenterPanel } from "@/components/journey/ExplorePanels";
import { ApostilleReadinessCard } from "@/components/ApostilleReadinessCard";
import { ArrivalPlanPanel } from "@/components/journey/ArrivalPlanPanel";
import { ApplicationWorkspacePanel } from "@/components/journey/ApplicationWorkspacePanel";
import {
  FinancialPlanPanel,
  LearningProvidersPanel,
  OffersPanel,
  PostAdmissionOfferMatrix,
  RecommendationManagerPanel,
} from "@/components/journey/AfterAdmissionPanels";
import {
  ActivityPortfolioPanel,
  DocumentVaultPanel,
  StudyPlanPanel,
  TestPlannerPanel,
} from "@/components/journey/PreparePanels";
import { RequirementsBrowser } from "@/components/journey/RequirementsBrowser";
import { HubPage, HubEmpty, PanelSkeleton, usePaneSelection, type HubPaneDef } from "./ui";
import { DocumentTemplatesCard } from "@/components/samples/DocumentTemplatesCard";
import { FeeWaiverStudio } from "@/components/FeeWaiverStudio";
import type { StudentProfile } from "@/components/Navbar";
import { NAV_SECTIONS, NAV_SECTION_LABEL_KEYS, visiblePanes } from "@/lib/navSections";

/**
 * The heavy panes are code-split: the visa studio pulls the whole speech
 * SDK, the AI studios pull the model clients, and the mentor marketplace
 * pulls the video player. Opening the explorer therefore downloads the
 * explorer — not every studio in the product.
 */
const panelLoading = () => <PanelSkeleton rows={3} />;
const ChancingPanel = dynamic(() => import("@/components/ChancingPanel").then((m) => m.ChancingPanel), { loading: panelLoading });
const RecommendationStudio = dynamic(() => import("@/components/RecommendationStudio").then((m) => m.RecommendationStudio), { loading: panelLoading });
const CountryComparePanel = dynamic(() => import("@/components/CountryComparePanel").then((m) => m.CountryComparePanel), { loading: panelLoading });
const CareerExplorerPanel = dynamic(() => import("@/components/journey/ExplorePanels").then((m) => m.CareerExplorerPanel), { loading: panelLoading });
const PlanningStudio = dynamic(() => import("@/components/PlanningStudio").then((m) => m.PlanningStudio), { loading: panelLoading });
const AiSopStudio = dynamic(() => import("@/components/AiSopStudio").then((m) => m.AiSopStudio), { loading: panelLoading });
const EssayRubricStudio = dynamic(() => import("@/components/EssayRubricStudio").then((m) => m.EssayRubricStudio), { loading: panelLoading });
const ProfessorOutreachStudio = dynamic(() => import("@/components/ProfessorOutreachStudio").then((m) => m.ProfessorOutreachStudio), { loading: panelLoading });
const VisaSpeakingAssistant = dynamic(() => import("@/components/VisaSpeakingAssistant").then((m) => m.VisaSpeakingAssistant), { loading: panelLoading });
const AiChatMentor = dynamic(() => import("@/components/AiChatMentor").then((m) => m.AiChatMentor), { loading: panelLoading });
const AdmissionsAdvisor = dynamic(() => import("@/components/AdmissionsAdvisor").then((m) => m.AdmissionsAdvisor), { loading: panelLoading });
const ConsultingSection = dynamic(() => import("@/components/ConsultingSection").then((m) => m.ConsultingSection), { loading: panelLoading });
const MentorMarketplace = dynamic(() => import("@/components/MentorMarketplace").then((m) => m.MentorMarketplace), { loading: panelLoading });
const ForumSection = dynamic(() => import("@/components/ForumSection").then((m) => m.ForumSection), { loading: panelLoading });
const CoursesSection = dynamic(() => import("@/components/CoursesSection").then((m) => m.CoursesSection), { loading: panelLoading });

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
  /** Record selected in global search; the catalogue applies its own title filter. */
  autoFocusScholarship?: { id: number; title: string; requestId: number; country?: string | null } | null;
  onProfileSaved?: (profile: StudentProfile) => void;
  onOpenProfileModal?: (isNew?: boolean) => void;
}

/** Resolve a destination's panes with their translated labels. */
function usePanes(sectionId: string): { panes: HubPaneDef[]; visible: { id: string }[]; label: string } {
  const tn = useTranslations("nav");
  const tp = useTranslations("navPanes");
  const section = NAV_SECTIONS.find((s) => s.id === sectionId);
  const panes = useMemo(
    () =>
      // `has` first: a pane whose message key is missing falls back to the
      // English label in navSections.ts instead of taking the hub down
      // (belt and braces next to the provider-level getMessageFallback).
      (section?.panes ?? []).map((p) => ({
        id: p.id,
        label: tp.has(p.id as never) ? tp(p.id as never) : p.label,
        premium: p.premium,
        // NEW is a badge on a feature, never an extra destination: it travels
        // with the tab into whichever destination the feature now lives in.
        isNew: p.isNew,
      })),
    [section, tp]
  );
  const label = section
    ? tn.has(NAV_SECTION_LABEL_KEYS[section.id] as never)
      ? tn(NAV_SECTION_LABEL_KEYS[section.id] as never)
      : section.label
    : sectionId;
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

/**
 * A quiet pill switcher for panels that used to STACK vertically inside one
 * tab (visa simulator under the requirements wall, four essay studios in a
 * row, vault under answers …). Only the selected tool is mounted, so the
 * first thing the student came for opens at the TOP of the viewport instead
 * of a thousand pixels below a neighbor.
 *
 * Deliberately NOT a nested tablist — the pane tabs above already own the
 * tab semantics; these are toggle buttons (aria-pressed) so assistive tech
 * reads a simple two-choice control.
 */
export function SubPills({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
}) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label={ariaLabel}>
      {options.map((o) => {
        const isActive = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            aria-pressed={isActive}
            className={`min-h-11 shrink-0 rounded-xl border px-3.5 py-2 text-xs font-bold transition-colors ${
              isActive
                ? "border-indigo-600 bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/10"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
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
  navigate,
  hidden,
  savedUniIds,
  onSaveUniversity,
  onUnsaveUniversity,
  autoOpenUniversityId,
  onProfileSaved,
  onOpenProfileModal,
  setWorkspaceId,
}: HubProps) {
  const t = useTranslations("hubs");
  const tp = useTranslations("navPanes");
  const { panes, visible, label } = usePanes("universities");
  const active = useActivePane(pane, visible, hidden);

  return (
    <HubPage
      title={label}
      intro={t("introUniversities")}
      // The CTA only makes sense from another tab: on "search" itself it is a
      // button that does nothing, so it is not rendered there.
      primaryLabel={active !== "search" ? t("primaryUniversities") : undefined}
      onPrimary={active !== "search" ? () => setPane("search") : undefined}
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
          onNavigate={navigate}
          onOpenProfileModal={() => onOpenProfileModal?.(false)}
          // Priority 4.1 — "Start Application" on a card opens that university's
          // workspace instead of the list, so the click lands somewhere useful.
          onApplicationStarted={(applicationId) => setWorkspaceId?.(applicationId)}
        />
      )}
      {active === "careers" && (
        <CareerExplorerPanel profileId={profile?.id ?? null} onNavigateTab={() => setPane("search")} />
      )}
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
  autoFocusScholarship,
}: HubProps) {
  const t = useTranslations("hubs");
  const { panes, visible, label } = usePanes("scholarships");
  const active = useActivePane(pane, visible, hidden);

  return (
    <HubPage
      title={label}
      intro={t("introScholarships")}
      primaryLabel={active !== "browse" ? t("primaryScholarships") : undefined}
      onPrimary={active !== "browse" ? () => setPane("browse") : undefined}
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
          autoFocusScholarship={autoFocusScholarship ?? null}
        />
      )}
      {active === "recommended" && (
        <ScholarshipAutopilot activeProfile={profile} onSaveScholarship={onSaveScholarship} onNavigate={navigate} />
      )}
      {active === "opportunities" && <OpportunitiesPanel activeProfile={profile} />}
    </HubPage>
  );
}

/* =========================================================================
 * MY PLAN → Study Plan & Tests
 * ====================================================================== */
export function StudyPlanHub({ profile, pane, setPane, navigate, hidden }: HubProps) {
  const t = useTranslations("hubs");
  const td = useTranslations("disclaimers");
  const { panes, visible, label } = usePanes("study-plan");
  const active = useActivePane(pane, visible, hidden);
  if (!profile) return <MissingProfile />;

  return (
    <HubPage
      title={label}
      intro={t("introStudyPlan")}
      primaryLabel={active !== "plan" ? t("primaryStudyPlan") : undefined}
      onPrimary={active !== "plan" ? () => setPane("plan") : undefined}
      panes={panes}
      activePane={active || undefined}
      onPaneChange={setPane}
      hiddenPanes={hidden}
      note={{ tone: "info", text: td("planning") }}
    >
      {active === "plan" && (
        <StudyPlanPanel profileId={profile.id} onNavigateTab={navigate} profile={profile} />
      )}
      {active === "tests" && <TestPlannerPanel profileId={profile.id} />}
      {active === "tools" && <PlanningStudio activeProfile={profile} />}
    </HubPage>
  );
}

/* =========================================================================
 * MY PLAN → Tasks & Timeline
 * ====================================================================== */
export function TasksHub({ profile, pane, setPane, navigate, hidden }: HubProps) {
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
      {active === "deadlines" && <DeadlineCenter key={profile.id} profileId={profile.id} onNavigateTab={navigate} />}
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
  onOpenProfileModal,
}: HubProps) {
  const t = useTranslations("hubs");
  const td = useTranslations("disclaimers");
  const { panes, visible, label } = usePanes("profile");
  const active = useActivePane(pane, visible, hidden);
  if (!profile) return <MissingProfile />;

  return (
    <HubPage
      title={label}
      intro={t("introProfile")}
      primaryLabel={t("primaryProfile")}
      onPrimary={() => onOpenProfileModal?.(false)}
      panes={panes}
      activePane={active || undefined}
      onPaneChange={setPane}
      hiddenPanes={hidden}
      note={{ tone: "warn", text: td("estimate") }}
    >
      {active === "readiness" && <ProfileStrengthPanel activeProfile={profile} />}
      {active === "goals" && <GoalPlanner activeProfile={profile} />}
      {active === "activities" && <ActivityPortfolioPanel profileId={profile.id} />}
      {active === "stories" && <SuccessStories activeProfile={profile} />}
      {active === "similar" && <SimilarProfiles activeProfile={profile} />}
    </HubPage>
  );
}

/* =========================================================================
 * MY PLAN → Financial Plan
 * ====================================================================== */
export function FundingHub({ profile, navigate }: HubProps) {
  const t = useTranslations("hubs");
  const td = useTranslations("disclaimers");
  const { label } = usePanes("funding");
  // The three funding tools used to stack into one ~2,500 px wall; one is
  // mounted at a time now, and the plan (the reason the tab exists) leads.
  const [fundTool, setFundTool] = useState<"plan" | "waivers" | "templates">("plan");
  if (!profile) return <MissingProfile />;
  return (
    <HubPage
      title={label}
      intro={t("introFunding")}
      primaryLabel={t("primaryScholarships")}
      onPrimary={() => navigate("scholarships")}
      note={{ tone: "warn", text: td("money") }}
    >
      <SubPills
        ariaLabel={label}
        value={fundTool}
        onChange={(id) => setFundTool(id as "plan" | "waivers" | "templates")}
        options={[
          { id: "plan", label: t("pillFundingPlan") },
          { id: "waivers", label: t("pillWaivers") },
          { id: "templates", label: t("pillTemplates") },
        ]}
      />
      {fundTool === "plan" && <FinancialPlanPanel profileId={profile.id} onNavigateTab={navigate} />}
      {/* Priority 5.1 — which of the student's universities are free to apply
          to, whether they have a recorded reason to ask for a waiver, and the
          two letters that actually get one granted. */}
      {fundTool === "waivers" && <FeeWaiverStudio profile={profile} />}
      {/* Sponsor affidavit (Homiylik xati) and the funding cover note. */}
      {fundTool === "templates" && <DocumentTemplatesCard kinds={["affidavit", "coverNote"]} />}
    </HubPage>
  );
}

/* =========================================================================
 * APPLICATIONS → My Applications
 * ====================================================================== */
export function ApplicationsHub({ profile, pane, setPane, navigate, hidden, workspaceId, setWorkspaceId }: HubProps) {
  const t = useTranslations("hubs");
  const td = useTranslations("disclaimers");
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
      primaryLabel={active !== "tracker" ? t("primaryApplications") : undefined}
      onPrimary={active !== "tracker" ? () => setPane("tracker") : undefined}
      panes={panes}
      activePane={active || undefined}
      onPaneChange={setPane}
      hiddenPanes={hidden}
      note={{ tone: "info", text: td("planning") }}
    >
      {active === "tracker" && (
        <div className="space-y-4">
          <ApplicationCenter activeProfile={profile} onOpenWorkspace={openWorkspace} />
          {/* Priority 5.1 — the waiver studio now lives in the Financial Plan
              destination (tab "Fee waivers"); the tracker stays about
              applications, and this one-line pointer keeps the tool reachable. */}
          <button
            type="button"
            onClick={() => navigate("funding")}
            className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-left text-xs font-bold text-slate-600 transition-colors hover:border-indigo-300 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:border-indigo-500/40 dark:hover:text-indigo-200"
          >
            {t("feeWaiverHint")}
          </button>
        </div>
      )}
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
  const tp = useTranslations("navPanes");
  const td = useTranslations("disclaimers");
  const { panes, visible, label } = usePanes("materials");
  const active = useActivePane(pane, visible, hidden);
  const profileId = profile?.id ?? null;

  // The list of applications the student can attach materials to. Local state
  // only — it is a view filter, never a second source of truth.
  const [applications, setApplications] = useState<{ id: number; universityId: number | null; universityName: string; programName: string | null }[]>([]);
  // De-stacked toolbars: the documents pane (vault + saved answers) and the
  // essays pane (four studios that used to form a ~4,000 px wall) each mount
  // ONE tool at a time. View state only — never a second source of truth.
  const [docsView, setDocsView] = useState<"vault" | "answers">("vault");
  const [essayTool, setEssayTool] = useState<"sop" | "rubric" | "recommendations" | "outreach">("sop");
  useEffect(() => {
    if (!profileId) return;
    let live = true;
    fetch(`/api/applications?profileId=${profileId}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { applications: [] }))
      .then((d) => {
        if (!live) return;
        setApplications(
          Array.isArray(d.applications)
            ? d.applications.map((a: { id: number; universityId: number | null; universityName: string; programName: string | null }) => ({
                id: a.id,
                universityId: a.universityId,
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

  const effectiveId = workspaceId !== undefined ? workspaceId : applications[0]?.id ?? null;
  const selectedApplication = applications.find((application) => application.id === effectiveId) ?? null;
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
      note={{ tone: "warn", text: td("ai") }}
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
          <SubPills
            ariaLabel={tp("documents")}
            value={docsView}
            onChange={(id) => setDocsView(id as "vault" | "answers")}
            options={[
              { id: "vault", label: t("pillVault") },
              { id: "answers", label: t("pillAnswers") },
            ]}
          />
          {docsView === "vault" ? (
            <DocumentVaultPanel
              key={`vault-${profile.id}-${effectiveId ?? "none"}`}
              profileId={profile.id}
              applicationId={effectiveId}
              onNavigateTab={navigate}
            />
          ) : (
            <AnswerVault activeProfile={profile} />
          )}
        </div>
      )}
      {active === "essays" && (
        <div className="space-y-4">
          <SubPills
            ariaLabel={tp("essays")}
            value={essayTool}
            onChange={(id) => setEssayTool(id as "sop" | "rubric" | "recommendations" | "outreach")}
            options={[
              { id: "sop", label: t("pillSop") },
              { id: "rubric", label: t("pillRubric") },
              { id: "recommendations", label: t("pillRecommendations") },
              { id: "outreach", label: t("pillOutreach") },
            ]}
          />
          {(essayTool === "sop" || essayTool === "rubric") && (
            <Gated
              profileId={profile.id}
              feature="ai_essay"
              title={t("essayPremiumTitle")}
              description={t("essayPremiumDescription")}
              onUpgrade={() => navigate("payments")}
            >
              {essayTool === "sop" ? (
                <AiSopStudio
                  key={`sop-${profile.id}-${effectiveId ?? "none"}-${selectedApplication?.universityName ?? ""}-${selectedApplication?.programName ?? ""}`}
                  activeProfile={profile}
                  applicationId={effectiveId}
                  universityId={selectedApplication?.universityId ?? null}
                  universityName={selectedApplication?.universityName ?? null}
                  programName={selectedApplication?.programName ?? null}
                />
              ) : (
                <EssayRubricStudio
                  key={`essay-${profile.id}-${effectiveId ?? "none"}`}
                  activeProfile={profile}
                  applicationId={effectiveId}
                  universityId={selectedApplication?.universityId ?? null}
                  universityName={selectedApplication?.universityName ?? null}
                  programName={selectedApplication?.programName ?? null}
                />
              )}
            </Gated>
          )}
          {essayTool === "recommendations" && (
            <RecommendationManagerPanel
              key={`recommendations-${profile.id}-${effectiveId ?? "none"}`}
              profileId={profile.id}
              applicationId={effectiveId}
              universityName={selectedApplication?.universityName ?? null}
            />
          )}
          {/* Priority 5.2 — the first email to a supervisor, built from the
              paper the student actually read and graded 0–100 on the things that
              decide whether it gets an answer. */}
          {essayTool === "outreach" && (
            <ProfessorOutreachStudio
              key={`outreach-${profile.id}-${effectiveId ?? "none"}`}
              profile={profile}
              defaultUniversityName={selectedApplication?.universityName ?? null}
            />
          )}
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
export function PostAdmissionFundingHub({ profile, navigate, workspaceId }: HubProps) {
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
      <PostAdmissionOfferMatrix
        key={`post-admission-funding-${profile.id}-${workspaceId ?? "profile"}`}
        profileId={profile.id}
        onNavigateTab={navigate}
      />
      {workspaceId != null && (
        <FinancialPlanPanel
          key={`application-funding-${profile.id}-${workspaceId}`}
          profileId={profile.id}
          applicationId={workspaceId ?? null}
          onNavigateTab={navigate}
        />
      )}
    </HubPage>
  );
}

/* =========================================================================
 * AFTER ADMISSION → Visa & Departure
 * ====================================================================== */
export function VisaHub({ profile, pane, setPane, navigate, hidden }: HubProps) {
  const t = useTranslations("hubs");
  const td = useTranslations("disclaimers");
  const { panes, visible, label } = usePanes("visa");
  const active = useActivePane(pane, visible, hidden);
  // The departure pane's two planners switch instead of stacking.
  const [departureView, setDepartureView] = useState<"pre" | "arrival">("pre");
  if (!profile) return <MissingProfile />;

  return (
    <HubPage
      title={label}
      intro={t("introVisa")}
      primaryLabel={active !== "visa" ? t("primaryVisa") : undefined}
      onPrimary={active !== "visa" ? () => setPane("visa") : undefined}
      panes={panes}
      activePane={active || undefined}
      onPaneChange={setPane}
      hiddenPanes={hidden}
      note={{ tone: "warn", text: td("visa") }}
    >
      {/* The simulator used to render 1,500 px BELOW the requirements wall in
          one shared "visa" tab. Now every tool owns its pane and the
          simulator IS the default landing pane of this hub. */}
      {active === "speaking" && <VisaSpeakingAssistant activeProfile={profile} />}
      {active === "visa" && (
        <VisaCenterPanel profileId={profile.id} onNavigateTab={navigate} hideApostille />
      )}
      {active === "apostille" && <ApostilleReadinessCard profileId={profile.id} />}
      {active === "departure" && (
        <div className="space-y-4">
          <SubPills
            ariaLabel={label}
            value={departureView}
            onChange={(id) => setDepartureView(id as "pre" | "arrival")}
            options={[
              { id: "pre", label: t("pillPreDeparture") },
              { id: "arrival", label: t("pillArrivalPlan") },
            ]}
          />
          {departureView === "pre" ? (
            <DepartureChecklist activeProfile={profile} onNavigate={navigate} />
          ) : (
            /* After arrival: the 7/30/90-day and first-year plan (product
               journey §14.3-14.4). Lives here so "after the visa" is one
               place — never a second nav section. */
            <ArrivalPlanPanel profileId={profile.id} onNavigateTab={navigate} />
          )}
        </div>
      )}
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
  // AI chat vs the advisor, and booking vs browsing, switch instead of stacking.
  const [mentorTool, setMentorTool] = useState<"chat" | "advisor">("chat");
  const [consultTool, setConsultTool] = useState<"consulting" | "mentors">("consulting");
  if (!profile) return <MissingProfile />;

  return (
    <HubPage
      title={label}
      intro={t("introGuidance")}
      primaryLabel={active !== "mentor" ? t("primaryGuidance") : undefined}
      onPrimary={active !== "mentor" ? () => setPane("mentor") : undefined}
      panes={panes}
      activePane={active || undefined}
      onPaneChange={setPane}
      hiddenPanes={hidden}
      note={{ tone: "warn", text: t("aiDisclaimer") }}
    >
      {active === "mentor" &&
        (hidden.includes("advisor") ? (
          <AiChatMentor activeProfile={profile} />
        ) : (
          <div className="space-y-4">
            <SubPills
              ariaLabel={label}
              value={mentorTool}
              onChange={(id) => setMentorTool(id as "chat" | "advisor")}
              options={[
                { id: "chat", label: t("pillChat") },
                { id: "advisor", label: t("pillAdvisor") },
              ]}
            />
            {mentorTool === "chat" ? <AiChatMentor activeProfile={profile} /> : <AdmissionsAdvisor activeProfile={profile} />}
          </div>
        ))}
      {active === "consulting" &&
        (hidden.includes("mentors") ? (
          <ConsultingSection key={profile.id} activeProfile={profile} />
        ) : (
          <div className="space-y-4">
            <SubPills
              ariaLabel={label}
              value={consultTool}
              onChange={(id) => setConsultTool(id as "consulting" | "mentors")}
              options={[
                { id: "consulting", label: t("pillConsulting") },
                { id: "mentors", label: t("pillMentors") },
              ]}
            />
            {consultTool === "consulting" ? (
              <ConsultingSection key={profile.id} activeProfile={profile} />
            ) : (
              <MentorMarketplace key={profile.id} activeProfile={profile} />
            )}
          </div>
        ))}
      {active === "faq" && <FaqSection />}
    </HubPage>
  );
}

/* =========================================================================
 * HELP & LEARNING → Community & Learning
 * ====================================================================== */
export function CommunityHub({ profile, pane, setPane, hidden }: HubProps) {
  const t = useTranslations("hubs");
  const td = useTranslations("disclaimers");
  const { panes, visible, label } = usePanes("community");
  const active = useActivePane(pane, visible, hidden);
  const [courseTool, setCourseTool] = useState<"courses" | "providers">("courses");
  if (!profile) return <MissingProfile />;

  return (
    <HubPage
      title={label}
      intro={t("introCommunity")}
      primaryLabel={active !== "forum" ? t("primaryCommunity") : undefined}
      onPrimary={active !== "forum" ? () => setPane("forum") : undefined}
      panes={panes}
      activePane={active || undefined}
      onPaneChange={setPane}
      hiddenPanes={hidden}
      note={{ tone: "info", text: td("community") }}
    >
      {active === "forum" && <ForumSection activeProfile={profile} isModerator={profile.isAdmin ?? false} />}
      {active === "courses" && (
        <div className="space-y-4">
          <SubPills
            ariaLabel={label}
            value={courseTool}
            onChange={(id) => setCourseTool(id as "courses" | "providers")}
            options={[
              { id: "courses", label: t("pillCourses") },
              { id: "providers", label: t("pillProviders") },
            ]}
          />
          {courseTool === "courses" ? (
            <CoursesSection activeProfile={profile} />
          ) : (
            <LearningProvidersPanel key={`lp-${profile.id}`} profileId={profile.id} />
          )}
        </div>
      )}
    </HubPage>
  );
}

export { HubEmpty, usePaneSelection };
