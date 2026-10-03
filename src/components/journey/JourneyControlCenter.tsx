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

function scholarshipAwardLabel(s: JourneyDashboard["recommended"]["scholarships"][number]): string {
  if (s.awardBasis === "need_based") return "Need-based; varies by applicant";
  if (s.awardBasis === "full_tuition") return "Full tuition coverage";
  if (s.awardBasis === "range") return "Award varies within a range — see official details";
  if (s.awardBasis === "variable") return "Variable award — see official details";
  if (s.awardAmount != null) {
    const period = s.awardPeriod === "year" ? " / year" : s.awardPeriod === "month" ? " / month" : "";
    return formatMoney(s.awardAmount, s.awardCurrency, { suffix: period });
  }
  if (s.amountUsdValue != null) return formatMoney(s.amountUsdValue, "USD");
  return s.tuitionCoverage || "Award amount not published";
}

function actionLabelForStep(id: string, tab: string): string {
  if (id === "requirements-open") return "Open workspace";
  if (id.startsWith("test-")) return "Open test planner";
  if (id.startsWith("readiness-")) return "Improve profile";
  if (id === "documents-expiring" || id === "documents-missing") return "Review documents";
  if (id === "funding-gap") return "Find scholarships";
  if (id === "recommendations") return "Manage letters";
  if (id === "profile") return "Complete profile";
  if (tab === "universities") return "Save universities";
  if (tab === "chancing") return "Check fit";
  if (tab === "activities") return "Add activities";
  if (tab === "workspace") return "Open workspace";
  if (tab === "study-plan") return "Open study plan";
  return `Open ${tab.replaceAll("-", " ")}`;
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
            <p className="sb-journey-eyebrow text-[11px] font-bold uppercase tracking-wider">Your Study Abroad Journey</p>
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
                : "This stage is complete — your dashboard now points at the next one."}
            </p>
            {journey.next && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-300 dark:ring-slate-700">
                Next up <ArrowRight className="h-3 w-3" aria-hidden /> {journey.next}
              </p>
            )}
          </div>
          <ProgressRing
            pct={journey.progressPct}
            size={104}
            label="Journey progress"
            caption={`${journey.stages.filter((st) => st.done).length} of ${journey.stages.length} stages done`}
            tone={journey.progressPct >= 100 ? "good" : "brand"}
          />
        </div>

        {/* The seven-stage visual bar, with the current stage highlighted. */}
        <ol className="mt-4 flex flex-wrap items-center gap-1.5" aria-label="Journey stages">
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
                title={s.doneWhen}
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
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{s.label.slice(0, 3)}</span>
              </motion.button>
              {i < journey.stages.length - 1 && (
                <span aria-hidden className={`h-px w-3 ${s.done ? "bg-emerald-300" : "bg-slate-200 dark:bg-slate-700"}`} />
              )}
            </motion.li>
          ))}
        </ol>
        <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
          This journey has 8 stages. The study plan expands the same route into 10 detailed work phases.
        </p>
        {completedBeforeOpen && (
          <p className="mt-1 rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200">
            Stages can overlap. Your submitted application is recorded, while earlier preparation can still be in progress.
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => onNavigateTab(journey.continueTab)}>
            Continue {journey.currentLabel} <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" onClick={() => onNavigateTab("study-plan")}>
            See my study plan
          </Button>
        </div>
      </JourneyCard>

      {/* ---- 1b. At a glance ---------------------------------------------
          Four numbers the student should not have to hunt for. Each tile is
          tinted by state, not decorated: amber means "still moving", green
          means "done". */}
      <RevealGroup className="grid grid-cols-2 gap-3 lg:grid-cols-4" stagger={0.06}>
        <RevealItem>
          <StatTile
            label="Applications"
            value={applications.total}
            hint={applications.total === 0 ? "Add your first university" : `${applications.submitted} submitted`}
            icon={<Compass className="h-3.5 w-3.5" aria-hidden />}
            state={applications.total === 0 ? "warn" : "brand"}
          />
        </RevealItem>
        <RevealItem>
          <StatTile
            label="Profile readiness"
            value={readiness.overall}
            suffix="%"
            hint="Profile readiness across 7 areas — not an admission chance"
            icon={<Sparkles className="h-3.5 w-3.5" aria-hidden />}
            state={readiness.overall >= 75 ? "good" : readiness.overall >= 45 ? "warn" : "bad"}
          />
        </RevealItem>
        <RevealItem>
          <StatTile
            label="Financial gap"
            value={data.funding.calculated ? Math.max(0, Math.round(data.funding.fundingGap)) : "—"}
            prefix={data.funding.calculated ? "$" : ""}
            hint={data.funding.calculated ? `${data.funding.isCovered ? "Your yearly cost is covered" : "Still to find for one year"}${data.funding.estimated ? " · includes estimates" : ""}` : "Not calculated — add a university and budget"}
            icon={<CalendarClock className="h-3.5 w-3.5" aria-hidden />}
            state={!data.funding.calculated ? "neutral" : data.funding.isCovered ? "good" : "warn"}
            onClick={!data.funding.calculated ? () => onNavigateTab("funding") : undefined}
          />
        </RevealItem>
        <RevealItem>
          <StatTile
            label="Next deadline"
            value={deadlines.length && deadlines[0].daysRemaining != null ? deadlines[0].daysRemaining < 0 ? "Overdue" : deadlines[0].daysRemaining : "—"}
            suffix={deadlines.length && deadlines[0].daysRemaining != null && deadlines[0].daysRemaining >= 0 ? " days" : ""}
            hint={deadlines[0] ? `${deadlines[0].title} · due ${deadlines[0].dueDate}` : "Unscheduled"}
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
        title="Next steps"
        subtitle="The few things that actually move you forward this week."
      >
        {nextSteps.length === 0 ? (
          <Empty title="Nothing outstanding" hint="Add a university to generate your application checklist." />
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
          title="Upcoming deadlines"
          subtitle="Everything with a real date, nearest first."
          action={<CalendarClock className="h-4 w-4 text-slate-400" aria-hidden />}
        >
          {deadlines.length === 0 ? (
            <Empty
              title="No deadlines yet"
              hint="Save a university or add a scholarship and the real dates appear here."
              action={<Button size="sm" variant="outline" onClick={() => onNavigateTab("universities")}>Explore universities</Button>}
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
                  <Button size="sm" variant="ghost" onClick={() => onNavigateTab(d.tab)}>
                    Open
                  </Button>
                </motion.li>
              ))}
            </ul>
          )}
        </JourneyCard>

        {/* ---- 4. Application progress ----------------------------------- */}
        <JourneyCard
          title="Application progress"
          subtitle="Every application you are working on, in one number."
        >
          {applications.total === 0 ? (
            <Empty
              title="No applications yet"
              hint="Adding a university is all it takes — we build the checklist, tasks and deadline for you."
              action={<Button size="sm" onClick={() => onNavigateTab("applications")}>Start an application</Button>}
            />
          ) : (
            <>
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { label: "Total", value: applications.total, tone: "text-slate-900 dark:text-white" },
                  { label: "Preparing", value: applications.preparing, tone: "text-amber-600 dark:text-amber-400" },
                  { label: "Submitted", value: applications.submitted, tone: "text-sky-600 dark:text-sky-400" },
                  { label: "Decision", value: applications.decision, tone: "text-emerald-600 dark:text-emerald-400" },
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
              <Button className="mt-3 w-full" variant="outline" onClick={() => onNavigateTab("workspace")}>
                Open application workspaces
              </Button>
            </>
          )}
        </JourneyCard>
      </div>

      {/* ---- 5. Profile readiness ----------------------------------------- */}
      <JourneyCard
        title="Profile readiness"
        subtitle="How ready each area is — and exactly what to improve. This is not an admission chance."
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
                  label={c.gaps[0] ?? "Looking good"}
                />
              </div>
            </motion.button>
          ))}
        </div>
      </JourneyCard>

      {/* ---- Test gaps (spec §8) ------------------------------------------ */}
      {data.testGaps.length > 0 && (
        <JourneyCard title="Test requirements" subtitle="Compared against the published minimums of your own applications.">
          <ul className="space-y-2">
            {data.testGaps.map((g) => (
              <li key={g.testType} className="flex flex-wrap items-center gap-2 text-sm">
                <Pill tone={g.state === "met" ? "good" : g.state === "below" ? "warn" : "slate"}>
                  {g.testType.toUpperCase()}
                </Pill>
                <span className="min-w-0 flex-1 text-slate-700 dark:text-slate-200">{g.message}</span>
                <Button size="sm" variant="ghost" onClick={() => onNavigateTab("tests")}>
                  Test planner
                </Button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-slate-400">
            We show the gap against the published minimum. We never estimate how a score change affects your admission chances.
          </p>
        </JourneyCard>
      )}

      {/* ---- 6. Recommended for you --------------------------------------- */}
      <JourneyCard
        title="Recommended for you"
        subtitle="Based on your profile, budget and countries — not on popularity."
        action={<Compass className="h-4 w-4 text-slate-400" aria-hidden />}
      >
        <div className="space-y-4">
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Universities</h3>
            {recommended.universities.length === 0 ? (
              <p className="text-xs text-slate-500">No universities match your country preferences yet.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {recommended.universities.slice(0, 6).map((u) => (
                  <div key={u.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {u.flagEmoji} {u.name}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {u.city ? `${u.city} · ` : ""}{u.country} · {u.worldRanking != null ? `QS #${u.worldRanking}` : "Ranking unavailable"}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300">{u.reason}</p>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <SourceTag
                        url={u.sourceUrl}
                        verificationStatus={u.verificationStatus}
                        lastVerified={u.lastVerifiedAt}
                      />
                      <Button size="sm" variant="ghost" onClick={() => onNavigateTab("universities")}>
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {recommended.scholarships.length > 0 ? (
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">Scholarships</h3>
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
                        Deadline: {new Date(`${s.deadlineDate}T00:00:00`).toLocaleDateString()}
                      </p>
                    )}
                    <p className={`text-xs ${s.gpaOk ? "text-slate-600 dark:text-slate-300" : "font-semibold text-amber-700 dark:text-amber-300"}`}>
                      {s.minGpa == null ? "GPA eligibility not specified" : !s.gpaProvided ? `Minimum GPA ${s.minGpa} — add your GPA to check` : `Minimum GPA ${s.minGpa}${s.gpaOk ? " — meets listed minimum" : " — below listed minimum"}`}
                    </p>
                    <SourceTag url={s.sourceUrl} lastVerified={s.lastVerifiedAt} verificationStatus={s.verificationStatus} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
              No upcoming scholarship matches verified eligibility and current-cycle deadlines yet. Check your citizenship and degree level in your profile, then confirm awards on their official pages.
            </div>
          )}

          {recommended.opportunities.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Opportunities</h3>
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
                        Open
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="border-t border-slate-200 pt-3 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300">
            Recommendations are planning aids, not admission or funding decisions. Confirm current eligibility, costs and deadlines with each official provider.
          </p>
        </div>
      </JourneyCard>

      {/* ---- Documents about to expire (spec §7) -------------------------- */}
      {data.expiringDocuments.length > 0 && (
        <JourneyCard title="Documents expiring" subtitle="A passport or certificate that expires can fail a whole application.">
          <ul className="space-y-1.5">
            {data.expiringDocuments.map((d) => (
              <li key={d.id} className="flex items-center gap-2 text-sm">
                <Pill tone={toneForDays(d.daysRemaining)}>{daysLabel(d.daysRemaining)}</Pill>
                <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200">{d.title}</span>
                <Button size="sm" variant="ghost" onClick={() => onNavigateTab("documents")}>
                  Open vault
                </Button>
              </li>
            ))}
          </ul>
        </JourneyCard>
      )}

      {/* ---- Funding summary (spec §9) ------------------------------------ */}
      {data.funding.items > 0 && (
        <JourneyCard title="Funding" subtitle="What your plan covers and what is still missing.">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">{data.funding.estimated ? "Estimated annual cost" : "Annual cost"}</p>
              <p className="text-xl font-extrabold text-slate-900 dark:text-white">
                {data.funding.calculated ? formatMoney(data.funding.annualCost, "USD") : "Not calculated"}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">{data.funding.estimated ? "Estimated remaining gap" : "Remaining gap"}</p>
              <p
                className={`text-xl font-extrabold ${
                  !data.funding.calculated ? "text-slate-600 dark:text-slate-300" : data.funding.fundingGap > 0 ? "text-rose-700 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300"
                }`}
              >
                {data.funding.calculated ? formatMoney(data.funding.fundingGap, "USD") : "Unavailable"}
              </p>
            </div>
            {!data.funding.calculated ? (
              <p className="basis-full text-xs text-slate-600 dark:text-slate-300">Add annual study costs to calculate the gap; zero is not treated as a verified cost.</p>
            ) : data.funding.estimated ? (
              <p className="basis-full text-xs text-slate-600 dark:text-slate-300">Some cost lines are estimated. Review the assumptions and official university costs before relying on this figure.</p>
            ) : null}
            <Button variant="outline" onClick={() => onNavigateTab("funding")}>
              Open financial plan
            </Button>
          </div>
        </JourneyCard>
      )}

      {/* ---- The ten study-plan phases (spec §12) ------------------------- */}
      <JourneyCard title="My study plan" subtitle="Ten phases from today to departure. They update themselves.">
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
                <p className="mt-1 text-xs font-bold text-slate-800 dark:text-slate-100">{p.title}</p>
                <div className="mt-1.5">
                  <ProgressBar pct={p.pct} size="sm" tone={p.status === "done" ? "good" : "brand"} />
                </div>
                <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                  {p.status === "done" ? "Done" : (p.missing[0] ?? `${p.pct}%`)}
                </p>
              </button>
            </li>
          ))}
        </ol>
      </JourneyCard>
    </div>
  );
}
