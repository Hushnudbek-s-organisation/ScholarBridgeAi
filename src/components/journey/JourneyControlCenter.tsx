"use client";

/**
 * JourneyControlCenter — the dashboard (spec §3).
 *
 * The most important page in the product. It answers, in this order:
 *   1. Where am I?        → the journey bar with the current stage
 *   2. What do I do today? → 3–5 prioritized steps, each with [Continue]
 *   3. What's due?         → the nearest deadlines
 *   4. How far along?     → application progress
 *   5. Where am I weak?    → profile readiness, weakest first
 *   6. What should I look at? → recommendations based on the real profile
 */
import React, { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { useResource } from "./useResource";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { formatMoney } from "@/lib/format";
import { MatchEvidenceBadge } from "@/components/MatchEvidenceBadge";
import type { MatchBreakdown } from "@/lib/matching";
import { ArrowRight, CalendarClock, ChevronDown, Compass, Printer, RefreshCw, Sparkles } from "lucide-react";
import { ShowMoreToggle } from "@/components/hubs/ui";
import { AnimatedNumber as CountUp, RevealGroup, RevealItem, SectionTransition } from "@/components/motion";
import {
  Button,
  Empty,
  JourneyCard,
  Loading,
  Pill,
  ProgressBar,
  ProgressRing,
  SourceTag,
  StatTile,
  daysLabel,
  toneForDays,
} from "./ui";

export interface JourneyDashboard {
  profile: { id: number; name: string; plan: string };
  journey: {
    current: string;
    currentLabel: string;
    currentIcon: string;
    continueTab: string;
    progressPct: number;
    next: string | null;
    stillNeeded: { text: string; tab: string }[];
    stages: { id: string; label: string; icon: string; tab: string; done: boolean; current: boolean; doneWhen: string }[];
  };
  nextSteps: {
    id: string;
    titleKey: string;
    detailKey: string;
    values?: Record<string, string | number>;
    rawTitle?: string;
    rawTitleKind?: "deadline" | "journey";
    urgency: string;
    dot: string;
    dueInDays: number | null;
    tab: string;
  }[];
  deadlines: { id: string; kind: string; title: string; dueDate: string; daysRemaining: number | null; tab: string }[];
  applications: { total: number; preparing: number; submitted: number; decision: number };
  readiness: {
    /** Application checklist: what is filled in and linked (documents, applications, funding). */
    categories: { key: string; label: string; pct: number; precise?: number; state: string; gaps: string[]; tab: string; unknown?: boolean }[];
    weakest: { key: string; label: string; pct: number; gaps: string[]; tab: string; unknown?: boolean }[];
    /** Checklist overall — NOT the profile readiness score. */
    overall: number;
    /** Unrounded weighted average behind `overall`. */
    overallPrecise: number;
    /** The shared profile readiness score (same engine as Profile & Goals → Readiness). */
    profile: {
      overall: number;
      /** Unrounded value behind `overall` — printed so both screens agree. */
      overallPrecise: number;
      /** Dimensions that had real data / dimensions the engine measures. */
      measured: number;
      total: number;
    } | null;
  };
  phases: { key: string; title: string; icon: string; tab: string; status: string; pct: number; missing: string[] }[];
  testGaps: { testType: string; state: string; current: number | null; catalogueFigure: number | null; messageKey: string }[];
  funding: { annualCost: number | null; isCovered: boolean | null; fundingGap: number | null; securedGap: number | null; items: number; calculated: boolean; estimated: boolean };
  expiringDocuments: { id: number; title: string; docType: string; expiresAt: string | null; daysRemaining: number | null }[];
  recommended: {
    /** False = the profile has no basis yet, so nothing is personalised. */
    personalised: boolean;
    /** Profile facts the list WAS built from ("countries", "gpa", …). */
    basis: string[];
    /** Profile facts that are still missing ("major", "budget", …). */
    missing: string[];
    universities: {
      id: number;
      name: string;
      country: string;
      city: string | null;
      flagEmoji: string;
      worldRanking: number | null;
      programMajor: string | null;
      sourceUrl: string | null;
      minGpa: number | null;
      minIelts: number | null;
      annualTuition: string | number | null;
      tuitionCurrency: string | null;
      tuitionPeriod: string | null;
      annualTuitionUsd: number | null;
      annualLivingEst: string | number | null;
      livingCostCurrency: string | null;
      livingCostPeriod: string | null;
      annualLivingEstUsd: number | null;
      postStudyWorkVisaYears: number | null;
      verificationStatus: string;
      lastVerifiedAt: string | null;
      saved: boolean;
      /** Real fit from the shared match engine — same number as the Explorer. */
      matchScore: number;
      /**
       * Positioning index from the QS Top 200 + 5-layer program engine.
       * Optional: older payloads and the catalogue-free preview do not carry it,
       * and the panel must render either way.
       */
      chanceScore?: number;
      /** 55% fit + 45% positioning — the order this list is sorted by. */
      combinedScore?: number;
      effectiveAcceptRatePct?: number;
      studentGpaPercentile?: number | null;
      programGpa50?: number;
      matchReasons: string[];
      matchIssues: string[];
      /** Optional for the same reason as `chanceScore` — the panel tolerates absence. */
      matchBreakdown?: MatchBreakdown;
    }[];
    scholarships: {
      id: number;
      title: string;
      provider: string;
      country: string;
      amountUsdValue: number | null;
      awardAmount: number | null;
      awardCurrency: string | null;
      awardPeriod: string | null;
      awardBasis: string | null;
      deadlineDate: string | null;
      minGpa: number | null;
      eligibleCountries: string | null;
      verificationStatus: string;
      tuitionCoverage: string;
      sourceUrl: string | null;
      lastVerifiedAt: string | null;
      gpaOk: boolean;
      gpaProvided: boolean;
      matchScore: number;
      matchReasons: string[];
      matchIssues: string[];
      /** Optional — see the universities list above. */
      matchBreakdown?: MatchBreakdown;
      /** What we can honestly say about the citizenship rule. */
      countryEligibility: "open-to-all" | "citizenship-match" | "unknown";
    }[];
    opportunities: {
      id: number;
      title: string;
      provider: string;
      country: string | null;
      type: string;
      deadlineDate: string | null;
      url: string;
      inPreferredCountry: boolean;
    }[];
  };
  learning: { connected: boolean; providers: { providerKey: string; name: string; kind: string; linked: boolean }[] };
}

/** Profile fields the recommendation list is built from / still needs. */
type RecTranslator = (key: string, values?: Record<string, string | number>) => string;
const REC_FIELD_KEYS: Record<string, string> = {
  degreeLevel: "ccRecFieldDegreeLevel",
  major: "ccRecFieldMajor",
  countries: "ccRecFieldCountries",
  gpa: "ccRecFieldGpa",
  budget: "ccRecFieldBudget",
  ielts: "ccRecFieldIelts",
};
function recFieldLabel(t: RecTranslator) {
  return (field: string) => (REC_FIELD_KEYS[field] ? t(REC_FIELD_KEYS[field]) : field);
}
function useScholarshipAwardLabel() {
  const t = useTranslations("journey");
  return (s: JourneyDashboard["recommended"]["scholarships"][number]): string => {
    if (s.awardBasis === "need_based") return t("ccAwardNeed");
    if (s.awardBasis === "full_tuition") return t("ccAwardFullTuition");
    if (s.awardBasis === "range") return t("ccAwardVaries");
    if (s.awardBasis === "variable") return t("ccAwardVariable");
    if (s.awardAmount != null) {
      const period = s.awardPeriod === "year" ? " / year" : s.awardPeriod === "month" ? " / month" : "";
      return formatMoney(s.awardAmount, s.awardCurrency, { suffix: period });
    }
    if (s.amountUsdValue != null) return formatMoney(s.amountUsdValue, "USD");
    return s.tuitionCoverage || t("ccAwardNotPublished");
  };
}

/**
 * The Continue button's label. Every branch reads a translated string; the
 * last resort names the destination instead of inventing English.
 */
function actionLabelForStep(t: RecTranslator, id: string, tab: string): string {
  if (id === "requirements-open") return t("ccActionOpenWorkspace");
  if (id.startsWith("test-")) return t("ccActionTestPlanner");
  if (id.startsWith("readiness-")) return t("ccActionImproveProfile");
  if (id === "documents-expiring" || id === "documents-review") return t("ccActionReviewDocuments");
  if (id === "funding-gap") return t("ccActionFindScholarships");
  if (id === "recommendations") return t("ccActionManageLetters");
  if (id === "profile") return t("ccActionCompleteProfile");
  if (tab === "universities") return t("ccActionSaveUnis");
  if (tab === "chancing") return t("ccActionCheckFit");
  if (tab === "activities") return t("ccActionAddActivities");
  if (tab === "workspace") return t("ccActionOpenWorkspace");
  if (tab === "study-plan") return t("ccActionStudyPlan");
  return t("ccActionOpenFallback", { tab: tab.replaceAll("-", " ") });
}

/**
 * "Recommended for you" — the dashboard tile that must never show the user
 * something their own profile did not justify.
 *
 * It is a separate component so the profile-driven contract can be RENDERED and
 * asserted (scripts/check-render.ts) instead of only typechecked:
 *   • `personalised: false` (an empty profile) shows the fields to add and no
 *     university cards at all — never a generic "top ranked" list;
 *   • fit chips and evidence lines come straight from the payload, which the
 *     API fills from the shared match engine;
 *   • an award whose citizenship rule is not in our data says so.
 */
export function RecommendedPanel({
  recommended,
  onNavigateTab,
}: {
  recommended: JourneyDashboard["recommended"];
  onNavigateTab: (tab: string) => void;
}) {
  const t = useTranslations("journey");
  const awardLabel = useScholarshipAwardLabel();
  const [showAllRecUnis, setShowAllRecUnis] = useState(false);
  const [showAllRecSchols, setShowAllRecSchols] = useState(false);
  const [showAllRecOpps, setShowAllRecOpps] = useState(false);
  // Every row here is justified by THIS profile: the list stays empty (and
  // names the fields to add) until the profile supplies a basis, the order is
  // the shared fit engine's score, and each card shows the engine's own
  // evidence lines. Nothing is praised that the student did not provide.
  return (
    <JourneyCard
      title={t("ccRecommendedTitle")}
      subtitle={t("ccRecommendedSubtitle")}
      action={
        <div className="flex items-center gap-2">
          {/* Says what the order IS, so "why is this first?" is never a mystery. */}
          <span className="hidden rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-500 sm:inline-block dark:border-slate-700 dark:text-slate-400">
            {t("ccRecSortPill")}
          </span>
          <Compass className="h-4 w-4 text-slate-400" aria-hidden />
        </div>
      }
    >
      <div className="space-y-4">
        {!recommended.personalised && (
          <div className="rounded-xl border border-dashed border-indigo-300 bg-indigo-50/60 px-3 py-3 text-xs text-indigo-900 dark:border-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-200">
            <p className="font-semibold">{t("ccRecNoBasis")}</p>
            {recommended.missing.length > 0 && (
              <p className="mt-1">
                {t("ccRecMissing", { fields: recommended.missing.map(recFieldLabel(t)).join(", ") })}
              </p>
            )}
          </div>
        )}
        {recommended.personalised && recommended.missing.length > 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t("ccRecMissing", { fields: recommended.missing.map(recFieldLabel(t)).join(", ") })}
          </p>
        )}

        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("ccUnisHeading")}</h3>
          {recommended.universities.length === 0 ? (
            <p className="text-xs text-slate-500">
              {recommended.personalised ? t("ccNoUnis") : t("ccRecNoBasisUnis")}
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(showAllRecUnis ? recommended.universities : recommended.universities.slice(0, 3)).map((u) => (
                <div key={u.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {u.flagEmoji} {u.name}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {u.city ? `${u.city} · ` : ""}{u.country} · {u.worldRanking != null ? `QS #${u.worldRanking}` : t("ccRankingUnavailable")}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-semibold text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200">
                      {t("ccRecFitChip", { score: u.matchScore })}
                    </span>
                    {typeof u.chanceScore === "number" && (
                      <span
                        className="rounded-full bg-violet-100 px-2 py-0.5 font-semibold text-violet-800 dark:bg-violet-900/60 dark:text-violet-200"
                        title={t("ccRecCombinedHint")}
                      >
                        {t("ccRecChanceChip", { score: u.chanceScore })}
                        {typeof u.effectiveAcceptRatePct === "number"
                          ? ` · ${t("ccRecAdmitRate", { rate: u.effectiveAcceptRatePct })}`
                          : ""}
                      </span>
                    )}
                    {u.matchBreakdown && (
                      <MatchEvidenceBadge
                        comparedDimensions={u.matchBreakdown.comparedDimensions}
                        totalDimensions={u.matchBreakdown.totalDimensions}
                        evidenceCoveragePct={u.matchBreakdown.evidenceCoveragePct}
                        evidenceLevel={u.matchBreakdown.evidenceLevel}
                      />
                    )}
                    {u.saved && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
                        {t("ccRecSaved")}
                      </span>
                    )}
                  </p>
                  {u.matchReasons.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5">
                      {u.matchReasons.slice(0, 2).map((r, i) => (
                        <li key={i} className="text-xs text-emerald-800 dark:text-emerald-300">+ {r}</li>
                      ))}
                      {u.matchIssues.slice(0, 2).map((r, i) => (
                        <li key={i} className="text-xs text-amber-800 dark:text-amber-300">− {r}</li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <SourceTag
                      url={u.sourceUrl}
                      verificationStatus={u.verificationStatus}
                      lastVerified={u.lastVerifiedAt}
                    />
                    <Button size="sm" variant="ghost" onClick={() => onNavigateTab("universities")}>
                      {t("ccView")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <ShowMoreToggle
            className="mt-2"
            totalCount={recommended.universities.length}
            visibleCount={3}
            expanded={showAllRecUnis}
            onToggle={() => setShowAllRecUnis((v) => !v)}
          />
        </div>

        {recommended.scholarships.length > 0 ? (
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">{t("ccScholarshipsHeading")}</h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(showAllRecSchols ? recommended.scholarships : recommended.scholarships.slice(0, 3)).map((s) => (
                <div key={s.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{s.title}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{s.provider}</p>
                  <p className="mt-1 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                    {awardLabel(s)}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200">
                      {t("ccRecFitChip", { score: s.matchScore })}
                    </span>
                    <MatchEvidenceBadge
                      comparedDimensions={s.matchBreakdown?.comparedDimensions ?? 0}
                      totalDimensions={s.matchBreakdown?.totalDimensions ?? 0}
                      evidenceCoveragePct={s.matchBreakdown?.evidenceCoveragePct}
                      evidenceLevel={s.matchBreakdown?.evidenceLevel}
                    />
                  </div>
                  {s.deadlineDate && (
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {t("ccScholarshipDeadline", { date: new Date(`${s.deadlineDate}T00:00:00`).toLocaleDateString() })}
                    </p>
                  )}
                  {s.matchReasons.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {s.matchReasons.slice(0, 2).map((r, i) => (
                        <li key={i} className="text-xs text-emerald-800 dark:text-emerald-300">+ {r}</li>
                      ))}
                      {s.matchIssues.slice(0, 1).map((r, i) => (
                        <li key={i} className="text-xs text-amber-800 dark:text-amber-300">− {r}</li>
                      ))}
                    </ul>
                  )}
                  <p className={`text-xs ${s.gpaOk ? "text-slate-600 dark:text-slate-300" : "font-semibold text-amber-700 dark:text-amber-300"}`}>
                    {s.minGpa == null ? t("ccGpaNotSpecified") : !s.gpaProvided ? t("ccGpaAdd", { gpa: s.minGpa }) : s.gpaOk ? t("ccGpaMeets", { gpa: s.minGpa }) : t("ccGpaBelow", { gpa: s.minGpa })}
                  </p>
                  {/* Citizenship rule: stated when it is known, never assumed. */}
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {s.countryEligibility === "open-to-all"
                      ? t("ccRecCitOpen")
                      : s.countryEligibility === "citizenship-match"
                        ? t("ccRecCitMatch")
                        : t("ccRecCitUnknown")}
                  </p>
                  <SourceTag url={s.sourceUrl} lastVerified={s.lastVerifiedAt} verificationStatus={s.verificationStatus} />
                </div>
              ))}
            </div>
            <ShowMoreToggle
              className="mt-2"
              totalCount={recommended.scholarships.length}
              visibleCount={3}
              expanded={showAllRecSchols}
              onToggle={() => setShowAllRecSchols((v) => !v)}
            />
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
            {t("ccNoScholarships")}
          </div>
        )}

        {recommended.opportunities.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("ccOpportunitiesHeading")}</h3>
            <ul className="space-y-1.5">
              {(showAllRecOpps ? recommended.opportunities : recommended.opportunities.slice(0, 3)).map((o) => (
                <li key={o.id} className="flex items-center gap-2 text-sm">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" aria-hidden />
                  <span className="min-w-0 flex-1 break-words whitespace-normal text-slate-700 dark:text-slate-200">
                    {o.title}
                    {o.provider && <span className="text-slate-400"> · {o.provider}</span>}
                    <span className="text-slate-400">
                      {o.deadlineDate ? ` · ${t("ccScholarshipDeadline", { date: new Date(`${o.deadlineDate}T00:00:00`).toLocaleDateString() })}` : ` · ${t("ccRecNoDeadline")}`}
                    </span>
                  </span>
                  {o.url && (
                    <a
                      href={o.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-indigo-700 hover:underline dark:text-indigo-300"
                    >
                      {t("ccOpen")}
                    </a>
                  )}
                </li>
              ))}
            </ul>
            <ShowMoreToggle
              className="mt-2"
              totalCount={recommended.opportunities.length}
              visibleCount={3}
              expanded={showAllRecOpps}
              onToggle={() => setShowAllRecOpps((v) => !v)}
            />
          </div>
        )}
        <p className="border-t border-slate-200 pt-3 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300">
          {t("ccRecNote")}
        </p>
      </div>
    </JourneyCard>
  );
}

export function JourneyControlCenter({
  profileId,
  onNavigateTab,
  onOpenWorkspace,
}: {
  profileId: number | null;
  onNavigateTab: (tab: string) => void;
  onOpenWorkspace: (applicationId: number) => void;
}) {
  const reduceMotion = useReducedMotion();
  const t = useTranslations("journey");
  const awardLabel = useScholarshipAwardLabel();
  // Clean-UI pass: every long dashboard list opens as a curated preview and
  // grows through one shared Show-more pill. The hooks sit above the early
  // returns so the hook order never depends on data state.
  const [showAllSteps, setShowAllSteps] = useState(false);
  const [showAllDeadlines, setShowAllDeadlines] = useState(false);
  const [showAllReadiness, setShowAllReadiness] = useState(false);
  const [showAllPhases, setShowAllPhases] = useState(false);
  const load = useCallback(async () => {
    const res = await fetch(`/api/dashboard?profileId=${profileId}`, { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Could not load your dashboard");
    return json as JourneyDashboard;
  }, [profileId]);
  const resource = useResource<JourneyDashboard | null>(
    () => profileId ? load() : Promise.resolve(null),
    [profileId],
    { initial: null, errorFallback: "Could not load your dashboard" }
  );
  const { error, reload: refresh } = resource;
  const data = resource.data;
  const loading = resource.loading || (!error && !!profileId && data?.profile.id !== profileId);

  if (!profileId) {
    return (
      <Empty
        title="Select a profile"
        hint="Sign in and pick a student profile to build your study-abroad journey."
      />
    );
  }
  if (loading) return <Loading label="Building your journey…" cards={2} />;
  if (error) {
    return (
      <Empty
        title="We could not load your dashboard"
        hint={error}
        action={
          <Button variant="outline" onClick={() => void refresh()}>
            <RefreshCw className="h-3.5 w-3.5" /> Try again
          </Button>
        }
      />
    );
  }
  if (!data) return null;

  const { journey, nextSteps, deadlines, applications, readiness, recommended } = data;
  const translatedStageLabel = (id: string, fallback: string) => {
    switch (id) {
      case "discover": return t("stageDiscover");
      case "match": return t("stageMatch");
      case "prepare": return t("stagePrepare");
      case "apply": return t("stageApply");
      case "accepted": return t("stageAccepted");
      case "fund": return t("stageFund");
      case "visa": return t("stageVisa");
      case "depart": return t("stageDepart");
      default: return fallback;
    }
  };
  const translatedStageDone = (id: string) => {
    switch (id) {
      case "discover": return t("ccStageDone.discover");
      case "match": return t("ccStageDone.match");
      case "prepare": return t("ccStageDone.prepare");
      case "apply": return t("ccStageDone.apply");
      case "accepted": return t("ccStageDone.accepted");
      case "fund": return t("ccStageDone.fund");
      case "visa": return t("ccStageDone.visa");
      case "depart": return t("ccStageDone.depart");
      default: return t("ccStageDone.discover");
    }
  };
  const translatedStillNeeded = (text: string) => {
    switch (text) {
      case "Add any profile context you choose to record for more specific programme comparisons": return t("ccNeedDiscover");
      case "Save a programme you are considering, then verify its details on the official page": return t("ccNeedMatchSave");
      case "Check which of them fit your profile": return t("ccNeedMatchCheck");
      case "Add an application to track when you are ready": return t("ccNeedPrepareApplication");
      case "Save a programme you want to compare": return t("ccNeedPrepareUniversities");
      case "Start your first application": return t("ccNeedApplyStart");
      case "Add an application when you are ready to track one": return t("ccNeedApplyStart");
      case "Review the official checklist and submission steps for your tracked application": return t("ccNeedApplySubmit");
      case "Record the offers you receive": return t("ccNeedAcceptedRecord");
      case "Decide on the offers you received": return t("ccNeedAcceptedDecide");
      case "Record how you plan to cover study costs, if relevant": return t("ccNeedFundAdd");
      case "Review recorded amounts, conditions and any estimated funding gap": return t("ccNeedFundClose");
      case "Check current official immigration instructions for your destination": return t("ccNeedVisaStart");
      case "Review official immigration guidance when you know your destination and institution": return t("ccNeedVisaFinish");
      case "Complete the departure checklist": return t("ccNeedDepart");
      default: return text;
    }
  };
  const nextStepTitle = (step: JourneyDashboard["nextSteps"][number]) => {
    if (step.rawTitleKind === "deadline") return step.rawTitle ?? "";
    if (step.rawTitleKind === "journey") return translatedStillNeeded(step.rawTitle ?? "");
    const values: Record<string, string | number> = { ...(step.values ?? {}) };
    if (step.titleKey === "fundingGap") values.amount = formatMoney(Number(values.amount ?? 0), "USD");
    return t(`nextStepTitle.${step.titleKey}` as never, values as never);
  };
  const nextStepDetail = (step: JourneyDashboard["nextSteps"][number]) => {
    const values: Record<string, string | number> = { ...(step.values ?? {}) };
    if (step.detailKey === "testPolicyNoScore" || step.detailKey === "testPolicyCompare") {
      const testType = String(values.test ?? "other");
      values.test = t(`tpTestType.${testType}` as never);
    }
    if (step.detailKey === "fundingGapReview") values.amount = formatMoney(Number(values.amount ?? 0), "USD");
    return t(`nextStepDetail.${step.detailKey}` as never, values as never);
  };
  const currentStageLabel = translatedStageLabel(journey.current, journey.currentLabel);
  const nextStageLabel = journey.next ? translatedStageLabel(journey.next, journey.next) : null;
  const currentDescription = journey.stillNeeded.length > 0
    ? translatedStillNeeded(journey.stillNeeded[0].text)
    : t("ccStageComplete");
  const doneStageCount = journey.stages.filter((stage) => stage.done).length;
  const totalStages = journey.stages.length;
  const completedBeforeOpen = journey.stages.some((stage, index) =>
    stage.done && journey.stages.slice(0, index).some((earlier) => !earlier.done)
  );

  return (
    <div className="space-y-4">
      {/* ---- 1. The journey bar ------------------------------------------ */}
      <JourneyCard tone="hero">
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-5">
          <div className="min-w-0">
            <p className="sb-journey-eyebrow text-[11px] font-bold uppercase tracking-wider">{t("ccEyebrow")}</p>
            <h1 className="mt-1 flex min-w-0 items-center gap-2 text-2xl font-extrabold text-slate-900 dark:text-white sm:text-3xl">
              <motion.span
                aria-hidden
                initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 18 }}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/70 shadow-sm ring-1 ring-indigo-200/70 dark:bg-white/10 dark:ring-indigo-400/30"
              >
                {journey.currentIcon}
              </motion.span>
              <span className="sb-gradient-text min-w-0 break-words">{currentStageLabel}</span>
            </h1>
            <p className="mt-2 max-w-2xl break-words text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {currentDescription}
            </p>
            {nextStageLabel && (
              <p className="mt-3 inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-1 rounded-xl bg-white/70 px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-300 dark:ring-slate-700">
                <span className="font-bold">{t("ccNextUp")}</span>
                <ArrowRight className="h-3 w-3 shrink-0" aria-hidden />
                <span className="min-w-0 break-words">{nextStageLabel}</span>
              </p>
            )}
          </div>
          <div className="flex min-w-0 items-start justify-between gap-3 border-t border-slate-200/70 pt-3 dark:border-slate-700/70 sm:justify-end sm:border-0 sm:pt-1">
            <ProgressRing
              pct={journey.progressPct}
              size={88}
              label={t("ccJourneyProgress")}
              caption={t("ccStagesDone", { done: doneStageCount, total: totalStages })}
              ariaValueText={t("ccProgressAria", { pct: Math.round(journey.progressPct), done: doneStageCount, total: totalStages })}
              tone={journey.progressPct >= 100 ? "good" : "brand"}
            />
            {/* Print is a utility, not a journey step: it sits as a quiet
                icon next to the ring so the CTA row below is only ever
                "Continue" + "See study plan". */}
            <button
              type="button"
              onClick={() => window.print()}
              aria-label={t("printSummaryHint")}
              title={t("printSummary")}
              className="print:hidden mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200/70 bg-white/60 text-slate-500 transition-colors hover:text-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-500 dark:border-slate-700/70 dark:bg-white/10 dark:text-slate-300 dark:hover:text-indigo-200"
            >
              <Printer className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
          <Button
            className="min-h-12 w-full px-4 py-2.5 sm:w-auto"
            onClick={() => onNavigateTab(journey.continueTab)}
          >
            <span className="min-w-0 break-words">{t("ccContinue", { stage: currentStageLabel })}</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
          </Button>
          <Button
            variant="outline"
            className="min-h-11 w-full px-4 py-2.5 sm:w-auto"
            onClick={() => onNavigateTab("study-plan")}
          >
            {t("ccSeeStudyPlan")}
          </Button>
        </div>

        <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label={t("ccStagesAria")}>
          {journey.stages.map((s, i) => {
            const stageLabel = translatedStageLabel(s.id, s.label);
            const stageStatus = s.current
              ? t("ccStatusCurrent")
              : s.done
                ? t("ccStatusCompleted")
                : t("ccStatusUpcoming");
            const stageClass = s.current
              ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
              : s.done
                ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700";
            const statusClass = s.current
              ? "text-indigo-100"
              : s.done
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-slate-500 dark:text-slate-400";

            return (
              <motion.li
                key={s.id}
                className="min-w-0"
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduceMotion ? 0 : i * 0.05, duration: reduceMotion ? 0 : 0.32 }}
              >
                <motion.button
                  type="button"
                  onClick={() => onNavigateTab(s.tab)}
                  title={translatedStageDone(s.id)}
                  aria-current={s.current ? "step" : undefined}
                  whileHover={reduceMotion ? undefined : { y: -1, scale: 1.02 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                  className={`group flex min-h-14 w-full min-w-0 flex-col items-start justify-center rounded-xl border px-2.5 py-2 text-left text-[11px] font-bold leading-tight transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${stageClass}`}
                >
                  <span className="flex w-full min-w-0 items-start gap-1.5">
                    <span aria-hidden className="shrink-0 leading-none">{s.icon}</span>
                    <span className="min-w-0 break-words">{stageLabel}</span>
                  </span>
                  <span className={`mt-1.5 text-[10px] font-semibold leading-tight ${statusClass}`}>{stageStatus}</span>
                </motion.button>
              </motion.li>
            );
          })}
        </ol>

        <details className="group mt-3 min-w-0 rounded-xl border border-slate-200/70 bg-white/40 text-slate-600 dark:border-slate-700 dark:bg-slate-900/20 dark:text-slate-300 sm:hidden">
          <summary className="group flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 [&::-webkit-details-marker]:hidden">
            <span>{t("ccAboutJourney")}</span>
            <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <div className="space-y-2 border-t border-slate-200/70 px-3 pb-3 pt-2 text-xs leading-relaxed dark:border-slate-700">
            <p>{t("ccEightStagesNote")}</p>
            {completedBeforeOpen && <p>{t("ccOverlapNote")}</p>}
          </div>
        </details>
        <div className="mt-2 hidden space-y-1 text-[11px] text-slate-500 dark:text-slate-400 sm:block">
          <p>{t("ccEightStagesNote")}</p>
          {completedBeforeOpen && (
            <p className="rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200">
              {t("ccOverlapNote")}
            </p>
          )}
        </div>

      </JourneyCard>

      {/* ---- 1b. At a glance ---------------------------------------------
          Four numbers the student should not have to hunt for. Each tile is
          tinted by state, not decorated: amber means "still moving", green
          means "done". */}
      <RevealGroup className="grid grid-cols-2 gap-3 lg:grid-cols-4" stagger={0.06}>
        <RevealItem>
          <StatTile
            label={t("ccApplications")}
            value={applications.total}
            hint={
              applications.total === 0
                ? t("ccAddFirstUni")
                : t("ccSubmittedHint", { n: applications.submitted })
            }
            icon={<Compass className="h-3.5 w-3.5" aria-hidden />}
            state={applications.total === 0 ? "warn" : "brand"}
          />
        </RevealItem>
        <RevealItem>
          <StatTile
            label={t("ccReadinessTile")}
            // The unrounded average (one decimal) — the same value the
            // Readiness pane prints. A bare integer here would silently
            // disagree with the pane by up to half a point.
            value={readiness.profile ? readiness.profile.overallPrecise : "—"}
            decimals={1}
            suffix="%"
            hint={
              readiness.profile
                ? t("ccReadinessMeasured", {
                    measured: readiness.profile.measured,
                    total: readiness.profile.total,
                  })
                : t("ccReadinessTileHint")
            }
            icon={<Sparkles className="h-3.5 w-3.5" aria-hidden />}
            state={readiness.profile ? "brand" : "neutral"}
          />
        </RevealItem>
        <RevealItem>
          <StatTile
            label={t("ccFinancialGap")}
            value={data.funding.calculated && data.funding.fundingGap != null ? Math.max(0, Math.round(data.funding.fundingGap)) : "—"}
            prefix={data.funding.calculated && data.funding.fundingGap != null ? "$" : ""}
            hint={
              data.funding.calculated
                ? `${data.funding.isCovered ? t("ccCovered") : t("ccStillToFind")}${
                    data.funding.estimated ? ` ${t("ccIncludesEstimates")}` : ""
                  }`
                : t("ccNotCalculated")
            }
            icon={<CalendarClock className="h-3.5 w-3.5" aria-hidden />}
            state={!data.funding.calculated ? "neutral" : data.funding.isCovered ? "good" : "warn"}
            onClick={!data.funding.calculated ? () => onNavigateTab("funding") : undefined}
          />
        </RevealItem>
        <RevealItem>
          <StatTile
            label={t("ccNextDeadline")}
            value={
              deadlines.length && deadlines[0].daysRemaining != null
                ? deadlines[0].daysRemaining < 0
                  ? t("ccOverdue")
                  : deadlines[0].daysRemaining
                : "—"
            }
            suffix={
              deadlines.length && deadlines[0].daysRemaining != null && deadlines[0].daysRemaining >= 0
                ? t("ccDaysSuffix")
                : ""
            }
            hint={
              deadlines[0]
                ? t("ccDueHint", { title: deadlines[0].title, date: deadlines[0].dueDate })
                : t("ccUnscheduled")
            }
            icon={<CalendarClock className="h-3.5 w-3.5" aria-hidden />}
            state={
              !deadlines.length || deadlines[0].daysRemaining == null
                ? "neutral"
                : deadlines[0].daysRemaining < 0
                  ? "bad"
                  : (deadlines[0].daysRemaining ?? 99) <= 14
                    ? "warn"
                    : "good"
            }
          />
        </RevealItem>
      </RevealGroup>

      {/* ---- 2. Next steps ----------------------------------------------- */}
      <JourneyCard title={t("ccNextStepsTitle")} subtitle={t("ccNextStepsSubtitle")}>
        {nextSteps.length === 0 ? (
          <Empty title={t("ccNothingOutstanding")} hint={t("ccNothingOutstandingHint")} />
        ) : (
          <>
          <ul className="space-y-2">
            {(showAllSteps ? nextSteps : nextSteps.slice(0, 3)).map((s, i) => (
              <motion.li
                key={s.id}
                initial={reduceMotion ? false : { opacity: 0, x: -8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-40px 0px" }}
                transition={{ delay: reduceMotion ? 0 : i * 0.06, duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
                whileHover={reduceMotion ? undefined : { x: 2 }}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700"
              >
                <span className="text-lg leading-none" aria-hidden>
                  {s.dot}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-semibold text-slate-900 dark:text-white">{nextStepTitle(s)}</p>
                  <p className="break-words text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    {nextStepDetail(s)}
                    {s.dueInDays != null && s.dueInDays >= 0 && (
                      <span className="ml-1 font-semibold text-slate-600 dark:text-slate-300">· {daysLabel(s.dueInDays)}</span>
                    )}
                  </p>
                </div>
                <Button size="sm" variant="outline" className="min-h-11 shrink-0" onClick={() => onNavigateTab(s.tab)}>
                  {actionLabelForStep(t, s.id, s.tab)}
                </Button>
              </motion.li>
            ))}
          </ul>
          <ShowMoreToggle
            className="mt-3"
            totalCount={nextSteps.length}
            visibleCount={3}
            expanded={showAllSteps}
            onToggle={() => setShowAllSteps((v) => !v)}
          />
          </>
        )}
      </JourneyCard>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ---- 3. Deadlines ---------------------------------------------- */}
        <JourneyCard
          title={t("ccDeadlinesTitle")}
          subtitle={t("ccDeadlinesSubtitle")}
          action={<CalendarClock className="h-4 w-4 text-slate-400" aria-hidden />}
        >
          {deadlines.length === 0 ? (
            <Empty
              title={t("ccNoDeadlines")}
              hint={t("ccNoDeadlinesHint")}
              action={<Button size="sm" variant="outline" className="min-h-11" onClick={() => onNavigateTab("universities")}>{t("ccExploreUniversities")}</Button>}
            />
          ) : (
            <>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {(showAllDeadlines ? deadlines : deadlines.slice(0, 4)).map((d, i) => (
                <motion.li
                  key={d.id}
                  initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-30px 0px" }}
                  transition={{ delay: reduceMotion ? 0 : i * 0.04, duration: 0.3 }}
                  className="flex min-w-0 items-center gap-3 py-2"
                >
                  <Pill tone={toneForDays(d.daysRemaining)}>{daysLabel(d.daysRemaining)}</Pill>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-medium text-slate-800 dark:text-slate-100">{d.title || t("ccApplicationFallback")}</p>
                    <p className="break-words text-[11px] uppercase tracking-wide text-slate-400">
                      {t(`ccDeadlineKinds.${["application", "university", "scholarship", "test", "document", "visa", "other"].includes(d.kind) ? d.kind : "other"}` as never)}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" className="min-h-11 shrink-0" onClick={() => onNavigateTab(d.tab)}>
                    {t("ccOpen")}
                  </Button>
                </motion.li>
              ))}
            </ul>
            <ShowMoreToggle
              className="mt-3"
              totalCount={deadlines.length}
              visibleCount={4}
              expanded={showAllDeadlines}
              onToggle={() => setShowAllDeadlines((v) => !v)}
            />
            </>
          )}
        </JourneyCard>

        {/* ---- 4. Application progress ----------------------------------- */}
        <JourneyCard
          title={t("ccAppProgressTitle")}
          subtitle={t("ccAppProgressSubtitle")}
        >
          {applications.total === 0 ? (
            <Empty
              title={t("ccNoApplications")}
              hint={t("ccNoApplicationsHint")}
              action={<Button size="sm" className="min-h-11" onClick={() => onNavigateTab("applications")}>{t("ccStartApplication")}</Button>}
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                {[
                  { label: t("ccStatTotal"), value: applications.total, tone: "text-slate-900 dark:text-white" },
                  { label: t("ccStatPreparing"), value: applications.preparing, tone: "text-amber-600 dark:text-amber-400" },
                  { label: t("ccStatSubmitted"), value: applications.submitted, tone: "text-sky-600 dark:text-sky-400" },
                  { label: t("ccStatDecision"), value: applications.decision, tone: "text-emerald-600 dark:text-emerald-400" },
                ].map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.97 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true, margin: "-30px 0px" }}
                    transition={{ delay: reduceMotion ? 0 : i * 0.06, type: "spring", stiffness: 320, damping: 26 }}
                    className="min-w-0 rounded-xl bg-slate-50 px-2 py-3 dark:bg-slate-800/60"
                  >
                    <p className={`text-2xl font-extrabold tabular-nums ${s.tone}`}>
                      <CountUp value={s.value} />
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{s.label}</p>
                  </motion.div>
                ))}
              </div>
              <Button className="mt-3 w-full" variant="outline" onClick={() => onNavigateTab("workspace")}>
                Open application workspaces
              </Button>
            </>
          )}
        </JourneyCard>
      </div>

      {/* ---- 5. Recorded profile and application details ------------------ */}
      <JourneyCard
        title={t("ccChecklistTitle", {
          pct: typeof readiness.overallPrecise === "number" ? readiness.overallPrecise.toFixed(1) : readiness.overall,
        })}
        subtitle={t("ccChecklistSubtitle")}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(showAllReadiness ? readiness.categories : readiness.categories.slice(0, 3)).map((c) => (
            <motion.button
              key={c.key}
              type="button"
              onClick={() => onNavigateTab(c.tab)}
              whileHover={reduceMotion ? undefined : { y: -2 }}
              whileTap={reduceMotion ? undefined : { scale: 0.99 }}
              className="min-h-16 rounded-xl border border-slate-200 p-3 text-left transition hover:border-indigo-300 hover:bg-indigo-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/30"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="min-w-0 break-words text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {t(`ccReadinessCategory.${c.key}` as never)}
                </span>
                <span className="shrink-0 text-sm font-extrabold text-indigo-700 dark:text-indigo-300">
                  {c.unknown ? "—" : `${typeof c.precise === "number" ? c.precise.toFixed(1) : c.pct}%`}
                </span>
              </div>
              <div className="mt-1.5">
                <ProgressBar
                  pct={c.unknown ? 0 : c.pct}
                  size="sm"
                  tone="brand"
                  label={c.gaps[0] ? t(`ccReadinessGap.${c.gaps[0]}` as never) : t("ccLookingGood")}
                />
              </div>
            </motion.button>
          ))}
        </div>
        <ShowMoreToggle
          className="mt-3"
          totalCount={readiness.categories.length}
          visibleCount={3}
          expanded={showAllReadiness}
          onToggle={() => setShowAllReadiness((v) => !v)}
        />
      </JourneyCard>

      {/* ---- University-level test catalogue comparisons ------------------ */}
      {data.testGaps.length > 0 && (
        <JourneyCard title={t("ccTestReqsTitle")} subtitle={t("ccTestReqsSubtitle")}>
          <ul className="space-y-2">
            {data.testGaps.map((gap) => {
              const label = t(`tpTestType.${gap.testType}` as never);
              const message = gap.messageKey === "scoreNotRecorded"
                ? t("tpGapScoreNotRecorded", { test: label, figure: gap.catalogueFigure ?? "—" })
                : gap.messageKey === "belowCatalogueFigure"
                  ? t("tpGapBelowFigure", { test: label, current: gap.current ?? "—", figure: gap.catalogueFigure ?? "—" })
                  : gap.messageKey === "atOrAboveCatalogueFigure"
                    ? t("tpGapAtOrAboveFigure", { test: label, current: gap.current ?? "—", figure: gap.catalogueFigure ?? "—" })
                    : t("tpGapNoFigure", { test: label });
              return (
                <li key={gap.testType} className="flex min-w-0 flex-col items-start gap-2 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700 sm:flex-row sm:items-center">
                  <Pill tone="slate">{label}</Pill>
                  <span className="min-w-0 flex-1 break-words text-slate-700 dark:text-slate-200">{message}</span>
                  <Button size="sm" variant="ghost" className="min-h-11 shrink-0" onClick={() => onNavigateTab("tests")}>
                    {t("tpOpenPlanner")}
                  </Button>
                </li>
              );
            })}
          </ul>
        </JourneyCard>
      )}

      {/* ---- 6. Recommended for you — profile-driven; see RecommendedPanel -- */}
      <RecommendedPanel recommended={recommended} onNavigateTab={onNavigateTab} />

      {/* ---- Documents about to expire (spec §7) -------------------------- */}
      {data.expiringDocuments.length > 0 && (
        <JourneyCard title={t("ccExpiringDocsTitle")} subtitle={t("ccExpiringDocsSubtitle")}>
          <ul className="space-y-1.5">
            {data.expiringDocuments.map((d) => (
              <li key={d.id} className="flex items-center gap-2 text-sm">
                <Pill tone={toneForDays(d.daysRemaining)}>{daysLabel(d.daysRemaining)}</Pill>
                <span className="min-w-0 flex-1 break-words text-slate-700 dark:text-slate-200">{d.title}</span>
                <Button size="sm" variant="ghost" className="min-h-11 shrink-0" onClick={() => onNavigateTab("documents")}>
                  {t("ccOpenVault")}
                </Button>
              </li>
            ))}
          </ul>
        </JourneyCard>
      )}

      {/* ---- Funding summary (spec §9) ------------------------------------ */}
      {data.funding.items > 0 && (
        <JourneyCard title={t("ccFundingTitle")} subtitle={t("ccFundingSubtitle")}>
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">{data.funding.estimated ? t("ccEstimatedAnnualCost") : t("ccAnnualCost")}</p>
              <p className="text-xl font-extrabold text-slate-900 dark:text-white">
                {data.funding.calculated && data.funding.annualCost != null ? formatMoney(data.funding.annualCost, "USD") : t("ccNotCalculatedShort")}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">{data.funding.estimated ? t("ccEstimatedGap") : t("ccRemainingGap")}</p>
              <p
                className={`text-xl font-extrabold ${
                  !data.funding.calculated || data.funding.fundingGap == null ? "text-slate-600 dark:text-slate-300" : data.funding.fundingGap > 0 ? "text-rose-700 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300"
                }`}
              >
                {data.funding.calculated && data.funding.fundingGap != null ? formatMoney(data.funding.fundingGap, "USD") : t("ccUnavailable")}
              </p>
            </div>
            {!data.funding.calculated ? (
              <p className="basis-full break-words text-xs text-slate-600 dark:text-slate-300">{t("ccAddAnnualCostsToCalculateGap")}</p>
            ) : data.funding.estimated ? (
              <p className="basis-full break-words text-xs text-slate-600 dark:text-slate-300">{t("ccEstimatedCostNote")}</p>
            ) : null}
            <Button variant="outline" className="min-h-11" onClick={() => onNavigateTab("funding")}>
              {t("ccOpenFinancialPlan")}
            </Button>
          </div>
        </JourneyCard>
      )}

      {/* ---- The ten study-plan phases (spec §12) ------------------------- */}
      <JourneyCard title={t("ccStudyPlanTitle")} subtitle={t("ccStudyPlanSubtitle")}>
        <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {(showAllPhases
            ? data.phases
            // Collapsed: the three phases that need attention first — in
            // progress before planned before done — while the FULL ordered
            // plan is exactly what the toggle reveals.
            : [...data.phases]
              .sort((a, b) => (a.status === "done" ? 2 : a.status === "in_progress" ? 0 : 1) - (b.status === "done" ? 2 : b.status === "in_progress" ? 0 : 1))
              .slice(0, 3)
          ).map((p) => (
            <li key={p.key}>
              <button
                type="button"
                onClick={() => onNavigateTab(p.tab)}
                className={`min-h-24 h-full w-full rounded-xl border p-3 text-left transition hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  p.status === "done"
                    ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40"
                    : p.status === "in_progress"
                      ? "border-indigo-300 bg-indigo-50/60 dark:border-indigo-800 dark:bg-indigo-950/40"
                      : "border-slate-200 dark:border-slate-700"
                }`}
              >
                <p className="text-base" aria-hidden>
                  {p.icon}
                </p>
                <p className="mt-1 break-words text-xs font-bold text-slate-800 dark:text-slate-100">
                  {t(`spPhase.${p.key}.title` as never)}
                </p>
                <div className="mt-1.5">
                  <ProgressBar pct={p.pct} size="sm" tone={p.status === "done" ? "good" : "brand"} />
                </div>
                <p className="mt-1 break-words text-[10px] leading-snug text-slate-600 dark:text-slate-400">
                  {p.status === "done"
                    ? t("spStatus.done")
                    : p.missing[0]
                      ? t(`spPhaseMissing.${p.missing[0]}` as never)
                      : t(`spStatus.${p.status}` as never)}
                </p>
              </button>
            </li>
          ))}
        </ol>
        <ShowMoreToggle
          className="mt-3"
          totalCount={data.phases.length}
          visibleCount={3}
          expanded={showAllPhases}
          onToggle={() => setShowAllPhases((v) => !v)}
        />
      </JourneyCard>
    </div>
  );
}
