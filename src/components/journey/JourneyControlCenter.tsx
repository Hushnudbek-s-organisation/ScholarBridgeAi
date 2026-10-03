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
import React, { useCallback } from "react";
import { useTranslations } from "next-intl";
import { useResource } from "./useResource";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { formatMoney } from "@/lib/format";
import { ArrowRight, CalendarClock, Compass, RefreshCw, Sparkles } from "lucide-react";
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
  profile: { id: number; name: string; plan: string; completeness: number };
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
    title: string;
    detail: string;
    urgency: string;
    dot: string;
    dueInDays: number | null;
    tab: string;
  }[];
  deadlines: { id: string; kind: string; title: string; dueDate: string; daysRemaining: number | null; tab: string }[];
  applications: { total: number; preparing: number; submitted: number; decision: number };
  readiness: {
    categories: { key: string; label: string; pct: number; state: string; gaps: string[]; tab: string }[];
    weakest: { key: string; label: string; pct: number; gaps: string[]; tab: string }[];
    overall: number;
  };
  phases: { key: string; title: string; icon: string; tab: string; status: string; pct: number; missing: string[] }[];
  testGaps: { testType: string; state: string; current: number | null; required: number; message: string }[];
  funding: { annualCost: number; isCovered: boolean; fundingGap: number; securedGap: number; items: number; calculated: boolean; estimated: boolean };
  expiringDocuments: { id: number; title: string; docType: string; expiresAt: string | null; daysRemaining: number | null }[];
  recommended: {
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
      annualTuitionUsd: number | null;
      verificationStatus: string;
      lastVerifiedAt: string | null;
      saved: boolean;
      reason: string;
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
    }[];
    opportunities: { id: number; title: string; provider: string; country: string | null; type: string; deadlineDate: string | null; url: string }[];
  };
  learning: { connected: boolean; providers: { providerKey: string; name: string; kind: string; linked: boolean }[] };
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
  const t = useTranslations("journey");
  const reduceMotion = useReducedMotion();

  /** Scholarship award label — inside the component so it can use t(). */
  const scholarshipAwardLabel = (s: JourneyDashboard["recommended"]["scholarships"][number]): string => {
    if (s.awardBasis === "need_based") return t("jccAwardNeedBased");
    if (s.awardBasis === "full_tuition") return t("jccAwardFullTuition");
    if (s.awardBasis === "range") return t("jccAwardRange");
    if (s.awardBasis === "variable") return t("jccAwardVariable");
    if (s.awardAmount != null) {
      const period = s.awardPeriod === "year" ? t("jccAwardPerYear") : s.awardPeriod === "month" ? t("jccAwardPerMonth") : "";
      return formatMoney(s.awardAmount, s.awardCurrency, { suffix: period });
    }
    if (s.amountUsdValue != null) return formatMoney(s.amountUsdValue, "USD");
    return s.tuitionCoverage || t("jccAwardNotPublished");
  };

  /** Next-step button label — inside the component so it can use t(). */
  const actionLabelForStep = (id: string, tab: string): string => {
    if (id === "requirements-open") return t("jccActionOpenWorkspace");
    if (id.startsWith("test-")) return t("jccActionTestPlanner");
    if (id.startsWith("readiness-")) return t("jccActionImproveProfile");
    if (id === "documents-expiring" || id === "documents-missing") return t("jccActionReviewDocuments");
    if (id === "funding-gap") return t("jccActionFindScholarships");
    if (id === "recommendations") return t("jccActionManageLetters");
    if (id === "profile") return t("jccActionCompleteProfile");
    if (tab === "universities") return t("jccActionSaveUniversities");
    if (tab === "chancing") return t("jccActionCheckFit");
    if (tab === "activities") return t("jccActionAddActivities");
    if (tab === "workspace") return t("jccActionOpenWorkspace");
    if (tab === "study-plan") return t("jccActionOpenStudyPlan");
    return t("jccActionOpenGeneric", { tab: tab.replaceAll("-", " ") });
  };

  /**
   * Journey stages and study-plan phases are served by /api/dashboard as plain
   * English text (src/lib/journey/stages.ts and planning.ts). Their ids/keys are
   * stable, so we render a localized label for the ids this build knows and fall
   * back to the server text for anything else — the API contract stays untouched
   * and no content is invented for unknown records.
   */
  const stageLabel = (s: { id: string; label: string }): string => {
    const keys: Record<string, () => string> = {
      discover: () => t("jccStageLabel_discover"),
      match: () => t("jccStageLabel_match"),
      prepare: () => t("jccStageLabel_prepare"),
      apply: () => t("jccStageLabel_apply"),
      accepted: () => t("jccStageLabel_accepted"),
      fund: () => t("jccStageLabel_fund"),
      visa: () => t("jccStageLabel_visa"),
      depart: () => t("jccStageLabel_depart"),
    };
    return keys[s.id] ? keys[s.id]() : s.label;
  };
  const stageDoneWhen = (s: { id: string; doneWhen: string }): string => {
    const keys: Record<string, () => string> = {
      discover: () => t("jccStageDone_discover"),
      match: () => t("jccStageDone_match"),
      prepare: () => t("jccStageDone_prepare"),
      apply: () => t("jccStageDone_apply"),
      accepted: () => t("jccStageDone_accepted"),
      fund: () => t("jccStageDone_fund"),
      visa: () => t("jccStageDone_visa"),
      depart: () => t("jccStageDone_depart"),
    };
    return keys[s.id] ? keys[s.id]() : s.doneWhen;
  };
  const phaseTitle = (p: { key: string; title: string }): string => {
    const keys: Record<string, () => string> = {
      profile: () => t("jccPhaseTitle_profile"),
      tests: () => t("jccPhaseTitle_tests"),
      university_research: () => t("jccPhaseTitle_university_research"),
      scholarship_research: () => t("jccPhaseTitle_scholarship_research"),
      documents: () => t("jccPhaseTitle_documents"),
      applications: () => t("jccPhaseTitle_applications"),
      interviews: () => t("jccPhaseTitle_interviews"),
      admission: () => t("jccPhaseTitle_admission"),
      visa: () => t("jccPhaseTitle_visa"),
      departure: () => t("jccPhaseTitle_departure"),
    };
    return keys[p.key] ? keys[p.key]() : p.title;
  };
  const load = useCallback(async () => {
    const res = await fetch(`/api/dashboard?profileId=${profileId}`, { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || t("jccLoadError"));
    return json as JourneyDashboard;
  }, [profileId, t]);
  const resource = useResource<JourneyDashboard | null>(
    () => profileId ? load() : Promise.resolve(null),
    [profileId],
    { initial: null, errorFallback: t("jccLoadError") }
  );
  const { error, reload: refresh } = resource;
  const data = resource.data;
  const loading = resource.loading || (!error && !!profileId && data?.profile.id !== profileId);

  if (!profileId) {
    return (
      <Empty
        title={t("jccSelectProfile")}
        hint={t("jccSignedOutHint")}
      />
    );
  }
  if (loading) return <Loading label={t("jccLoading")} cards={2} />;
  if (error) {
    return (
      <Empty
        title={t("jccErrorTitle")}
        hint={error}
        action={
          <Button variant="outline" onClick={() => void refresh()}>
            <RefreshCw className="h-3.5 w-3.5" />{t("jccTryAgain")}</Button>
        }
      />
    );
  }
  if (!data) return null;

  const { journey, nextSteps, deadlines, applications, readiness, recommended } = data;
  const completedBeforeOpen = journey.stages.some((stage, index) =>
    stage.done && journey.stages.slice(0, index).some((earlier) => !earlier.done)
  );

  return (
    <div className="space-y-4">
      {/* ---- 1. The journey bar ------------------------------------------ */}
      <JourneyCard tone="hero">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0 flex-1">
            {/* The label carries the journey's own accent in both themes — the
                generic `text-indigo-500` remap washes out on the dark hero. */}
            <p className="sb-journey-eyebrow text-[11px] font-bold uppercase tracking-wider">{t("jccTitle")}</p>
            {/* The stage icon gets a soft halo so the hero reads at a glance. */}
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-extrabold text-slate-900 dark:text-white sm:text-3xl">
              <motion.span
                aria-hidden
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 320, damping: 18 }}
                className="grid h-10 w-10 place-items-center rounded-2xl bg-white/70 shadow-sm ring-1 ring-indigo-200/70 dark:bg-white/10 dark:ring-indigo-400/30"
              >
                {journey.currentIcon}
              </motion.span>
              <span className="sb-gradient-text">{journey.currentLabel}</span>
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
              {journey.stillNeeded.length > 0
                ? journey.stillNeeded[0].text
                : t("jccStageCompleteNote")}
            </p>
            {journey.next && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-300 dark:ring-slate-700">{t("jccNextUp")}<ArrowRight className="h-3 w-3" aria-hidden /> {journey.next}
              </p>
            )}
          </div>
          <ProgressRing
            pct={journey.progressPct}
            size={104}
            label={t("jccProgress")}
            caption={t("jccStagesDone", { done: journey.stages.filter((st) => st.done).length, total: journey.stages.length })}
            tone={journey.progressPct >= 100 ? "good" : "brand"}
          />
        </div>

        {/* The seven-stage visual bar, with the current stage highlighted. */}
        <ol className="mt-4 flex flex-wrap items-center gap-1.5" aria-label={t("jccStagesAria")}>
          {journey.stages.map((s, i) => (
            <motion.li
              key={s.id}
              className="flex items-center gap-1.5"
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduceMotion ? 0 : i * 0.05, duration: 0.32 }}
            >
              <motion.button
                type="button"
                onClick={() => onNavigateTab(s.tab)}
                title={stageDoneWhen(s)}
                whileHover={reduceMotion ? undefined : { y: -1, scale: 1.03 }}
                whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                className={`group flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
                  s.current
                    ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                    : s.done
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : "border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
                }`}
              >
                <span aria-hidden>{s.icon}</span>
                <span className="hidden sm:inline">{stageLabel(s)}</span>
                <span className="sm:hidden">{stageLabel(s).slice(0, 3)}</span>
              </motion.button>
              {i < journey.stages.length - 1 && (
                <span aria-hidden className={`h-px w-3 ${s.done ? "bg-emerald-300" : "bg-slate-200 dark:bg-slate-700"}`} />
              )}
            </motion.li>
          ))}
        </ol>
        <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
          {t("jccStagesExplainer", { stages: journey.stages.length, phases: data.phases.length })}
        </p>
        {completedBeforeOpen && (
          <p className="mt-1 rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200">{t("jccStagesOverlap")}</p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => onNavigateTab(journey.continueTab)}>
            {t("jccContinue")} {journey.currentLabel} <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" onClick={() => onNavigateTab("study-plan")}>{t("jccSeeStudyPlan")}</Button>
        </div>
      </JourneyCard>

      {/* ---- 1b. At a glance ---------------------------------------------
          Four numbers the student should not have to hunt for. Each tile is
          tinted by state, not decorated: amber means "still moving", green
          means "done". */}
      <RevealGroup className="grid grid-cols-2 gap-3 lg:grid-cols-4" stagger={0.06}>
        <RevealItem>
          <StatTile
            label={t("jccPanelApplications")}
            value={applications.total}
            hint={applications.total === 0 ? t("jccAddFirstUniversity") : `${applications.submitted} submitted`}
            icon={<Compass className="h-3.5 w-3.5" aria-hidden />}
            state={applications.total === 0 ? "warn" : "brand"}
          />
        </RevealItem>
        <RevealItem>
          <StatTile
            label={t("jccPanelReadiness")}
            value={readiness.overall}
            suffix="%"
            hint={t("jccReadinessHint", { areas: data.readiness.categories.length })}
            icon={<Sparkles className="h-3.5 w-3.5" aria-hidden />}
            state={readiness.overall >= 75 ? "good" : readiness.overall >= 45 ? "warn" : "bad"}
          />
        </RevealItem>
        <RevealItem>
          <StatTile
            label={t("jccPanelFinancialGap")}
            value={data.funding.calculated ? Math.max(0, Math.round(data.funding.fundingGap)) : "—"}
            prefix={data.funding.calculated ? "$" : ""}
            hint={data.funding.calculated ? `${data.funding.isCovered ? t("jccCostCovered") : t("jccStillToFind")}${data.funding.estimated ? t("jccIncludesEstimates") : ""}` : t("jccNotCalculatedShort")}
            icon={<CalendarClock className="h-3.5 w-3.5" aria-hidden />}
            state={!data.funding.calculated ? "neutral" : data.funding.isCovered ? "good" : "warn"}
            onClick={!data.funding.calculated ? () => onNavigateTab("funding") : undefined}
          />
        </RevealItem>
        <RevealItem>
          <StatTile
            label={t("jccPanelNextDeadline")}
            value={deadlines.length && deadlines[0].daysRemaining != null ? deadlines[0].daysRemaining < 0 ? "Overdue" : deadlines[0].daysRemaining : "—"}
            suffix={deadlines.length && deadlines[0].daysRemaining != null && deadlines[0].daysRemaining >= 0 ? " days" : ""}
            hint={deadlines[0] ? t("jccDueOn", { date: `${deadlines[0].title} · ${deadlines[0].dueDate}` }) : t("jccUnscheduled")}
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
      <JourneyCard
        title={t("jccPanelNextSteps")}
        subtitle={t("jccNextStepsSubtitle")}
      >
        {nextSteps.length === 0 ? (
          <Empty title={t("jccNothingOutstanding")} hint={t("jccAddUniversityChecklist")} />
        ) : (
          <ul className="space-y-2">
            {nextSteps.map((s, i) => (
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
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{s.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {s.detail}
                    {s.dueInDays != null && s.dueInDays >= 0 && (
                      <span className="ml-1 font-semibold text-slate-600 dark:text-slate-300">· {daysLabel(s.dueInDays)}</span>
                    )}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => onNavigateTab(s.tab)}>
                  {actionLabelForStep(s.id, s.tab)}
                </Button>
              </motion.li>
            ))}
          </ul>
        )}
      </JourneyCard>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ---- 3. Deadlines ---------------------------------------------- */}
        <JourneyCard
          title={t("jccPanelUpcomingDeadlines")}
          subtitle={t("jccDeadlinesSubtitle")}
          action={<CalendarClock className="h-4 w-4 text-slate-400" aria-hidden />}
        >
          {deadlines.length === 0 ? (
            <Empty
              title={t("jccNoDeadlinesYet")}
              hint={t("jccNoDeadlinesHint")}
              action={<Button size="sm" variant="outline" onClick={() => onNavigateTab("universities")}>{t("jccExploreUniversities")}</Button>}
            />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {deadlines.map((d, i) => (
                <motion.li
                  key={d.id}
                  initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-30px 0px" }}
                  transition={{ delay: reduceMotion ? 0 : i * 0.04, duration: 0.3 }}
                  className="flex items-center gap-3 py-2"
                >
                  <Pill tone={toneForDays(d.daysRemaining)}>{daysLabel(d.daysRemaining)}</Pill>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{d.title}</p>
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">{d.kind}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => onNavigateTab(d.tab)}>{t("jccOpen")}</Button>
                </motion.li>
              ))}
            </ul>
          )}
        </JourneyCard>

        {/* ---- 4. Application progress ----------------------------------- */}
        <JourneyCard
          title={t("jccPanelApplicationProgress")}
          subtitle={t("jccAppsSubtitle")}
        >
          {applications.total === 0 ? (
            <Empty
              title={t("jccNoApplicationsYet")}
              hint={t("jccAppsHint")}
              action={<Button size="sm" onClick={() => onNavigateTab("applications")}>{t("jccStartApplication")}</Button>}
            />
          ) : (
            <>
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { label: t("jccTotal"), value: applications.total, tone: "text-slate-900 dark:text-white" },
                  { label: t("jccPreparing"), value: applications.preparing, tone: "text-amber-600 dark:text-amber-400" },
                  { label: t("jccSubmitted"), value: applications.submitted, tone: "text-sky-600 dark:text-sky-400" },
                  { label: t("jccDecision"), value: applications.decision, tone: "text-emerald-600 dark:text-emerald-400" },
                ].map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.97 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true, margin: "-30px 0px" }}
                    transition={{ delay: reduceMotion ? 0 : i * 0.06, type: "spring", stiffness: 320, damping: 26 }}
                    className="rounded-xl bg-slate-50 px-2 py-3 dark:bg-slate-800/60"
                  >
                    <p className={`text-2xl font-extrabold tabular-nums ${s.tone}`}>
                      <CountUp value={s.value} />
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{s.label}</p>
                  </motion.div>
                ))}
              </div>
              <Button className="mt-3 w-full" variant="outline" onClick={() => onNavigateTab("workspace")}>{t("jccOpenWorkspaces")}</Button>
            </>
          )}
        </JourneyCard>
      </div>

      {/* ---- 5. Profile readiness ----------------------------------------- */}
      <JourneyCard
        title={t("jccPanelReadiness")}
        subtitle={t("jccReadinessSubtitle")}
      >
        {/* 2 columns on phones too: seven full-width tiles made a ~700px
            stack that pushed the next actions off the first screen. */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {readiness.categories.map((c) => (
            <motion.button
              key={c.key}
              type="button"
              onClick={() => onNavigateTab(c.tab)}
              whileHover={reduceMotion ? undefined : { y: -2 }}
              whileTap={reduceMotion ? undefined : { scale: 0.99 }}
              className="rounded-xl border border-slate-200 p-3 text-left transition hover:border-indigo-300 hover:bg-indigo-50/40 dark:border-slate-700 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/30"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{c.label}</span>
                <span
                  className={`text-sm font-extrabold ${
                    c.pct >= 75 ? "text-emerald-600" : c.pct >= 45 ? "text-amber-600" : "text-rose-600"
                  }`}
                >
                  {c.pct}%
                </span>
              </div>
              <div className="mt-1.5">
                <ProgressBar
                  pct={c.pct}
                  size="sm"
                  tone={c.pct >= 75 ? "good" : c.pct >= 45 ? "warn" : "bad"}
                  label={c.gaps[0] ?? t("jccLookingGood")}
                />
              </div>
            </motion.button>
          ))}
        </div>
      </JourneyCard>

      {/* ---- Test gaps (spec §8) ------------------------------------------ */}
      {data.testGaps.length > 0 && (
        <JourneyCard title={t("jccPanelTestRequirements")} subtitle={t("jccTestsSubtitle")}>
          <ul className="space-y-2">
            {data.testGaps.map((g) => (
              <li key={g.testType} className="flex flex-wrap items-center gap-2 text-sm">
                <Pill tone={g.state === "met" ? "good" : g.state === "below" ? "warn" : "slate"}>
                  {g.testType.toUpperCase()}
                </Pill>
                <span className="min-w-0 flex-1 text-slate-700 dark:text-slate-200">{g.message}</span>
                <Button size="sm" variant="ghost" onClick={() => onNavigateTab("tests")}>{t("jccTestPlanner")}</Button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-slate-400">{t("jccTestGapNote")}</p>
        </JourneyCard>
      )}

      {/* ---- 6. Recommended for you --------------------------------------- */}
      <JourneyCard
        title={t("jccPanelRecommended")}
        subtitle={t("jccRecommendedSubtitle")}
        action={<Compass className="h-4 w-4 text-slate-400" aria-hidden />}
      >
        <div className="space-y-4">
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("jccUniversities")}</h3>
            {recommended.universities.length === 0 ? (
              <p className="text-xs text-slate-500">{t("jccNoUniversityMatches")}</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {recommended.universities.slice(0, 6).map((u) => (
                  <div key={u.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {u.flagEmoji} {u.name}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {u.city ? `${u.city} · ` : ""}{u.country} · {u.worldRanking != null ? `QS #${u.worldRanking}` : t("jccRankingUnavailable")}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300">{u.reason}</p>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <SourceTag
                        url={u.sourceUrl}
                        verificationStatus={u.verificationStatus}
                        lastVerified={u.lastVerifiedAt}
                      />
                      <Button size="sm" variant="ghost" onClick={() => onNavigateTab("universities")}>{t("jccView")}</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {recommended.scholarships.length > 0 ? (
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">{t("jccScholarshipsHeading")}</h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {recommended.scholarships.slice(0, 6).map((s) => (
                  <div key={s.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{s.title}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{s.provider}</p>
                    <p className="mt-1 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                      {scholarshipAwardLabel(s)}
                    </p>
                    {s.deadlineDate && (
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {t("jccDeadlineLabel")} {new Date(`${s.deadlineDate}T00:00:00`).toLocaleDateString()}
                      </p>
                    )}
                    <p className={`text-xs ${s.gpaOk ? "text-slate-600 dark:text-slate-300" : "font-semibold text-amber-700 dark:text-amber-300"}`}>
                      {s.minGpa == null
                        ? t("jccGpaNotSpecified")
                        : !s.gpaProvided
                          ? t("jccMinGpaAddYoursValue", { gpa: s.minGpa })
                          : `${t("jccMinGpaValue", { gpa: s.minGpa })}${s.gpaOk ? ` ${t("jccMeetsMin")}` : ` ${t("jccBelowMin")}`}`}
                    </p>
                    <SourceTag url={s.sourceUrl} lastVerified={s.lastVerifiedAt} verificationStatus={s.verificationStatus} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
              {t("jccNoScholarshipMatches")}
            </div>
          )}

          {recommended.opportunities.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("jccOpportunities")}</h3>
              <ul className="space-y-1.5">
                {recommended.opportunities.map((o) => (
                  <li key={o.id} className="flex items-center gap-2 text-sm">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200">
                      {o.title}
                      {o.provider && <span className="text-slate-400"> · {o.provider}</span>}
                    </span>
                    {o.url && (
                      <a
                        href={o.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-indigo-700 hover:underline dark:text-indigo-300"
                      >
                        {t("jccOpen")}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="border-t border-slate-200 pt-3 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300">{t("jccDisclaimer")}</p>
        </div>
      </JourneyCard>

      {/* ---- Documents about to expire (spec §7) -------------------------- */}
      {data.expiringDocuments.length > 0 && (
        <JourneyCard title={t("jccDocumentsExpiring")} subtitle={t("jccDocumentsSubtitle")}>
          <ul className="space-y-1.5">
            {data.expiringDocuments.map((d) => (
              <li key={d.id} className="flex items-center gap-2 text-sm">
                <Pill tone={toneForDays(d.daysRemaining)}>{daysLabel(d.daysRemaining)}</Pill>
                <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200">{d.title}</span>
                <Button size="sm" variant="ghost" onClick={() => onNavigateTab("documents")}>{t("jccOpenVault")}</Button>
              </li>
            ))}
          </ul>
        </JourneyCard>
      )}

      {/* ---- Funding summary (spec §9) ------------------------------------ */}
      {data.funding.items > 0 && (
        <JourneyCard title={t("jccFunding")} subtitle={t("jccFundingSubtitle")}>
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">{data.funding.estimated ? t("jccEstimatedAnnualCost") : t("jccAnnualCost")}</p>
              <p className="text-xl font-extrabold text-slate-900 dark:text-white">
                {data.funding.calculated ? formatMoney(data.funding.annualCost, "USD") : t("jccNotCalculated")}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">{data.funding.estimated ? t("jccEstimatedRemainingGap") : t("jccRemainingGap")}</p>
              <p
                className={`text-xl font-extrabold ${
                  !data.funding.calculated ? "text-slate-600 dark:text-slate-300" : data.funding.fundingGap > 0 ? "text-rose-700 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300"
                }`}
              >
                {data.funding.calculated ? formatMoney(data.funding.fundingGap, "USD") : t("jccUnavailable")}
              </p>
            </div>
            {!data.funding.calculated ? (
              <p className="basis-full text-xs text-slate-600 dark:text-slate-300">{t("jccFundingGapHint")}</p>
            ) : data.funding.estimated ? (
              <p className="basis-full text-xs text-slate-600 dark:text-slate-300">{t("jccFundingEstimatesHint")}</p>
            ) : null}
            <Button variant="outline" onClick={() => onNavigateTab("funding")}>{t("jccOpenFinancialPlan")}</Button>
          </div>
        </JourneyCard>
      )}

      {/* ---- The ten study-plan phases (spec §12) ------------------------- */}
      <JourneyCard title={t("jccPanelStudyPlan")} subtitle={t("jccStudyPlanSubtitle", { phases: data.phases.length })}>
        <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {data.phases.map((p) => (
            <li key={p.key}>
              <button
                type="button"
                onClick={() => onNavigateTab(p.tab)}
                className={`h-full w-full rounded-xl border p-3 text-left transition hover:shadow-sm ${
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
                <p className="mt-1 text-xs font-bold text-slate-800 dark:text-slate-100">{phaseTitle(p)}</p>
                <div className="mt-1.5">
                  <ProgressBar pct={p.pct} size="sm" tone={p.status === "done" ? "good" : "brand"} />
                </div>
                <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                  {p.status === "done" ? t("jccDone") : (p.missing[0] ?? `${p.pct}%`)}
                </p>
              </button>
            </li>
          ))}
        </ol>
      </JourneyCard>
    </div>
  );
}
