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
import React, { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
  funding: { annualCost: number; isCovered: boolean; fundingGap: number; securedGap: number; items: number };
  expiringDocuments: { id: number; title: string; docType: string; expiresAt: string | null; daysRemaining: number | null }[];
  recommended: {
    universities: {
      id: number;
      name: string;
      country: string;
      city: string;
      flagEmoji: string;
      worldRanking: number;
      programMajor: string;
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
      amountUsdValue: number;
      deadlineDate: string | null;
      minGpa: number | null;
      eligibleCountries: string | null;
      verificationStatus: string;
      tuitionCoverage: string;
      gpaOk: boolean;
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
  const reduceMotion = useReducedMotion();
  const [data, setData] = useState<JourneyDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Data loader kept OUTSIDE the effect and free of state writes, so the mount
   * effect can call it without a synchronous setState (the React compiler
   * rejects that), and `reload` can reuse it for an explicit refresh.
   */
  const load = useCallback(async () => {
    const res = await fetch(`/api/dashboard?profileId=${profileId}`, { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Could not load your dashboard");
    return json as JourneyDashboard;
  }, [profileId]);

  useEffect(() => {
    if (!profileId) return;
    let live = true;
    (async () => {
      try {
        const res = await load();
        if (!live) return;
        setData(res);
        setError(null);
      } catch (err) {
        if (!live) return;
        setError(err instanceof Error ? err.message : "Could not load your dashboard");
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [load, profileId]);

  /** Explicit "try again" — the only place the spinner is turned on by hand. */
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setData(await load());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your dashboard");
    } finally {
      setLoading(false);
    }
  }, [load]);

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

  return (
    <div className="space-y-4">
      {/* ---- 1. The journey bar ------------------------------------------ */}
      <JourneyCard tone="hero">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-500">Your Study Abroad Journey</p>
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
            hint={readiness.weakest[0] ? `Weakest: ${readiness.weakest[0].label}` : "Every area looks ready"}
            icon={<Sparkles className="h-3.5 w-3.5" aria-hidden />}
            state={readiness.overall >= 75 ? "good" : readiness.overall >= 45 ? "warn" : "bad"}
          />
        </RevealItem>
        <RevealItem>
          <StatTile
            label="Funding gap"
            value={Math.max(0, Math.round(data.funding.fundingGap))}
            prefix="$"
            hint={data.funding.isCovered ? "Your yearly cost is covered" : "Still to find for one year"}
            icon={<CalendarClock className="h-3.5 w-3.5" aria-hidden />}
            state={data.funding.isCovered ? "good" : "warn"}
          />
        </RevealItem>
        <RevealItem>
          <StatTile
            label="Next deadline"
            value={deadlines[0]?.daysRemaining ?? 0}
            suffix={deadlines.length ? " days" : ""}
            hint={deadlines[0]?.title ?? "No dated deadlines yet"}
            icon={<CalendarClock className="h-3.5 w-3.5" aria-hidden />}
            state={
              !deadlines.length
                ? "neutral"
                : (deadlines[0].daysRemaining ?? 99) < 0
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
                  Continue
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
        {readiness.weakest.length > 0 && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            <strong>Weakest areas:</strong>{" "}
            {readiness.weakest.map((w, i) => (
              <span key={w.key}>
                {i > 0 && ", "}
                {w.label} ({w.pct}%) — {w.gaps[0] ?? "keep improving"}
              </span>
            ))}
          </p>
        )}
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
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {u.city}, {u.country} · #{u.worldRanking}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">{u.reason}</p>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <SourceTag
                        url={u.verificationStatus === "verified" ? null : null}
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

          {recommended.scholarships.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Scholarships</h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {recommended.scholarships.slice(0, 6).map((s) => (
                  <div key={s.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{s.title}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{s.provider}</p>
                    <p className="mt-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      ${s.amountUsdValue.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Tuition: {s.tuitionCoverage || "Not specified"}
                    </p>
                  </div>
                ))}
              </div>
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
                        className="text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        Open
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
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
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Annual cost</p>
              <p className="text-xl font-extrabold text-slate-900 dark:text-white">
                ${data.funding.annualCost.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Remaining gap</p>
              <p
                className={`text-xl font-extrabold ${
                  data.funding.fundingGap > 0 ? "text-rose-600" : "text-emerald-600"
                }`}
              >
                ${data.funding.fundingGap.toLocaleString()}
              </p>
            </div>
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
