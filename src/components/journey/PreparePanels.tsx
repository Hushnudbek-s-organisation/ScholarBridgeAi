"use client";

/**
 * PREPARE phase panels: Document Vault (spec §7), Test Planner (spec §8),
 * My Study Plan (spec §12) and the Activity Portfolio (spec §14).
 *
 * They live together because they share the same interaction model and the
 * same visual language, and because together they cover the whole PREPARE
 * group of the sidebar.
 */
import React, { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarPlus, Check, Link2, Plus, Trash2 } from "lucide-react";
import { getJson, sendJson, useResource } from "./useResource";
import { Button, Empty, ErrorNote, Field, JourneyCard, Loading, Pill, ProgressBar, StatusIcon, daysLabel, inputClass, toneForDays } from "./ui";
import { useLocaleContext } from "@/i18n/LocaleProvider";

// ===========================================================================
// DOCUMENT VAULT (spec §7)
// ===========================================================================

interface VaultDoc {
  id: number;
  docType: string;
  title: string;
  fileUrl: string | null;
  expiresAt: string | null;
  status: string;
  daysToExpiry: number | null;
  usedBy: { universityName: string; applicationId: number }[];
}
interface VaultData {
  docTypes: string[];
  documents: VaultDoc[];
  summary: { total: number; verified: number; expiring: number; expired: number };
}

export function DocumentVaultPanel({ profileId, onNavigateTab }: { profileId: number; onNavigateTab: (t: string) => void }) {
  const t = useTranslations("journey");
  const { locale } = useLocaleContext();
  const { data, loading, error, reload } = useResource<VaultData>(
    useCallback(() => getJson<VaultData>(`/api/vault/documents?profileId=${profileId}`, t("dvLoadError")), [profileId, t]),
    [profileId],
    { initial: { docTypes: [], documents: [], summary: { total: 0, verified: 0, expiring: 0, expired: 0 } }, errorFallback: t("dvLoadError") }
  );
  const [form, setForm] = useState({ docType: "passport", title: "", issuedAt: "", expiresAt: "" });
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!form.title.trim()) return;
    setBusy(true);
    try {
      await sendJson("/api/vault/documents", { method: "POST", body: JSON.stringify({ profileId, ...form }) }, t("dvAddError"));
      setForm({ docType: "passport", title: "", issuedAt: "", expiresAt: "" });
      await reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : t("dvAddError"));
    } finally {
      setBusy(false);
    }
  };

  const patchDoc = async (body: Record<string, unknown>) => {
    await sendJson("/api/vault/documents", { method: "PATCH", body: JSON.stringify(body) }, t("dvUpdateError"));
    await reload();
  };

  const remove = async (id: number) => {
    await fetch(`/api/vault/documents?profileId=${profileId}&id=${id}`, { method: "DELETE" });
    await reload();
  };

  if (loading && data.documents.length === 0) return <Loading label={t("dvLoading")} />;

  return (
    <div className="space-y-4">
      <JourneyCard
        title={t("dvTitle")}
        subtitle={t("dvSubtitle")}
        action={
          <div className="flex flex-wrap gap-2 text-[11px] font-bold">
            <Pill tone="slate">{t("dvDocumentsPill", { n: data.summary.total })}</Pill>
            {data.summary.expiring > 0 && <Pill tone="warn">{t("dvExpiringPill", { n: data.summary.expiring })}</Pill>}
            {data.summary.expired > 0 && <Pill tone="bad">{t("dvExpiredPill", { n: data.summary.expired })}</Pill>}
          </div>
        }
      >
        {error && <ErrorNote message={error} />}

        <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={t("dvFieldType")}>
            <select className={inputClass} value={form.docType} onChange={(e) => setForm({ ...form, docType: e.target.value })}>
              {data.docTypes.map((dt) => (
                <option key={dt} value={dt}>
                  {t(`doc${dt[0].toUpperCase()}${dt.slice(1)}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("dvFieldTitle")}>
            <input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t("dvTitlePlaceholder")} />
          </Field>
          <Field label={t("dvFieldIssued")}>
            <input type="date" className={inputClass} value={form.issuedAt} onChange={(e) => setForm({ ...form, issuedAt: e.target.value })} />
          </Field>
          <Field label={t("dvFieldExpires")} hint={t("dvExpiresHint")}>
            <input type="date" className={inputClass} value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
          </Field>
        </div>
        <Button onClick={add} disabled={busy || !form.title.trim()}>
          <Plus className="h-3.5 w-3.5" /> {t("dvAdd")}
        </Button>
      </JourneyCard>

      {data.documents.length === 0 ? (
        <Empty title={t("dvEmptyTitle")} hint={t("dvEmptyHint")} />
      ) : (
        <JourneyCard
          title={t("dvYourDocs")}
          action={
            <Button size="sm" variant="outline" onClick={() => onNavigateTab("requirements")}>
              {t("dvSeeNeeds")}
            </Button>
          }
        >
          <ul className="space-y-2">
            {data.documents.map((d) => (
              <li key={d.id} className="sb-card-hover rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="flex flex-wrap items-start gap-2">
                  <StatusIcon state={d.status} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{d.title}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {t(`doc${d.docType[0].toUpperCase()}${d.docType.slice(1)}`)}
                      {d.expiresAt && t("dvExpires", { date: d.expiresAt })}
                      {d.usedBy.length > 0 && t("dvUsedBy", { n: d.usedBy.length })}
                    </p>
                    {d.daysToExpiry != null && d.daysToExpiry < 180 && (
                      <p className="mt-1">
                        <Pill tone={toneForDays(d.daysToExpiry)}>{daysLabel(d.daysToExpiry, locale)}</Pill>
                      </p>
                    )}
                    {d.usedBy.length > 0 && (
                      <p className="mt-1 text-[11px] text-slate-400">{d.usedBy.map((u) => u.universityName).filter(Boolean).join(", ")}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1">
                    {d.status !== "verified" ? (
                      <Button size="sm" variant="outline" onClick={() => void patchDoc({ profileId, id: d.id, status: "verified" })}>
                        <Check className="h-3 w-3" /> {t("dvVerify")}
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => void patchDoc({ profileId, id: d.id, status: "needs_update" })}>
                        {t("dvNeedsUpdate")}
                      </Button>
                    )}
                    <Button size="sm" variant="danger" onClick={() => void remove(d.id)} aria-label={t("dvDeleteAria", { title: d.title })}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <input
                    className={inputClass}
                    placeholder={t("dvFilePlaceholder")}
                    defaultValue={d.fileUrl ?? ""}
                    onBlur={(e) => {
                      if (e.target.value === (d.fileUrl ?? "")) return;
                      void patchDoc({ profileId, id: d.id, fileUrl: e.target.value });
                    }}
                  />
                  <input
                    type="date"
                    className={inputClass}
                    defaultValue={d.expiresAt ?? ""}
                    onChange={(e) => void patchDoc({ profileId, id: d.id, expiresAt: e.target.value })}
                  />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-slate-400">
            {t("dvPrivacyNote")}
          </p>
        </JourneyCard>
      )}
    </div>
  );
}

// ===========================================================================
// TEST PLANNER (spec §8)
// ===========================================================================

interface TestPlanRow {
  id: number;
  testType: string;
  label: string;
  currentScore: number | null;
  targetScore: number | null;
  targetDate: string | null;
  nextTestDate: string | null;
  tasks: { id: number; title: string; isCompleted: boolean }[];
  attempts: { id: number; testDate: string; score: number | null; resultLabel: string | null }[];
  requirements: { university: string; required: number }[];
  gap: { state: string; message: string };
}
interface TestData {
  testTypes: { key: string; label: string; max: number; skills: string[] }[];
  plans: TestPlanRow[];
  /** Published minimums demanded by the universities the student applied to. */
  demanded: { testType: string; required: number; universities: string[] }[];
}

export function TestPlannerPanel({ profileId }: { profileId: number }) {
  const { data, loading, error, reload } = useResource<TestData>(
    useCallback(() => getJson<TestData>(`/api/test-planner?profileId=${profileId}`, "Could not load the test planner"), [profileId]),
    [profileId],
    { initial: { testTypes: [], plans: [], demanded: [] }, errorFallback: "Could not load the test planner" }
  );
  const [busy, setBusy] = useState(false);

  const save = async (payload: Record<string, unknown>) => {
    setBusy(true);
    try {
      await sendJson("/api/test-planner", { method: "POST", body: JSON.stringify({ profileId, ...payload }) }, "Could not save");
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const patch = async (payload: Record<string, unknown>) => {
    await sendJson("/api/test-planner", { method: "PATCH", body: JSON.stringify({ profileId, ...payload }) }, "Could not save");
    await reload();
  };

  if (loading && data.plans.length === 0) return <Loading label="Loading your test plan…" />;

  // A university can demand a test the student never added a plan for — show it
  // rather than silently omitting a real requirement.
  const unplanned = data.demanded.filter((d) => !data.plans.some((p) => p.testType === d.testType));

  return (
    <div className="space-y-4">
      {error && <ErrorNote message={error} />}
      <JourneyCard title="Add a test" subtitle="Which tests you can take is configurable — these are the defaults.">
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {data.testTypes.map((t) => (
            <Button key={t.key} variant="outline" size="sm" disabled={busy} onClick={() => void save({ testType: t.key })}>
              <Plus className="h-3 w-3" /> {t.label}
            </Button>
          ))}
        </div>
      </JourneyCard>

      {data.plans.length === 0 ? (
        <Empty title="No test plans yet" hint="Add IELTS, TOEFL, SAT or any other test to track your current score, target and date." />
      ) : (
        data.plans.map((p) => (
          <JourneyCard
            key={p.id}
            title={p.label}
            subtitle={p.gap.message}
            action={
              <Pill tone={p.gap.state === "met" ? "good" : p.gap.state === "below" ? "warn" : "slate"}>
                {p.currentScore ?? "—"} / {p.targetScore ?? "—"}
              </Pill>
            }
          >
            <div className="grid gap-2 sm:grid-cols-4">
              <Field label="Current score">
                <input
                  className={inputClass}
                  type="number"
                  step="0.1"
                  defaultValue={p.currentScore ?? ""}
                  onBlur={(e) => void patch({ testPlanId: p.id, currentScore: e.target.value === "" ? null : Number(e.target.value) })}
                />
              </Field>
              <Field label="Target score">
                <input
                  className={inputClass}
                  type="number"
                  step="0.1"
                  defaultValue={p.targetScore ?? ""}
                  onBlur={(e) => void patch({ testPlanId: p.id, targetScore: e.target.value === "" ? null : Number(e.target.value) })}
                />
              </Field>
              <Field label="Target date">
                <input className={inputClass} type="date" defaultValue={p.targetDate ?? ""} onChange={(e) => void patch({ testPlanId: p.id, targetDate: e.target.value })} />
              </Field>
              <Field label="Next test date">
                <input className={inputClass} type="date" defaultValue={p.nextTestDate ?? ""} onChange={(e) => void patch({ testPlanId: p.id, nextTestDate: e.target.value })} />
              </Field>
            </div>

            <div className="mt-3 grid gap-4 lg:grid-cols-2">
              <div>
                <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">Practice tasks</h3>
                {p.tasks.length === 0 ? (
                  <p className="text-xs text-slate-500">No practice tasks yet.</p>
                ) : (
                  <ul className="space-y-1">
                    {p.tasks.map((t) => (
                      <li key={t.id}>
                        <button
                          type="button"
                          onClick={() => void patch({ taskId: t.id, isCompleted: !t.isCompleted })}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[9px] ${
                              t.isCompleted ? "border-emerald-500 bg-emerald-500 text-white sb-ink-on-bright" : "border-slate-300 dark:border-slate-600"
                            }`}
                          >
                            {t.isCompleted && <Check className="h-2.5 w-2.5" />}
                          </span>
                          <span className={t.isCompleted ? "text-slate-400 line-through" : "text-slate-700 dark:text-slate-200"}>
                            {t.title}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">Previous attempts</h3>
                {p.attempts.length === 0 ? (
                  <p className="text-xs text-slate-500">No attempts recorded.</p>
                ) : (
                  <ul className="space-y-1">
                    {p.attempts.map((a) => (
                      <li key={a.id} className="flex items-center gap-2 text-sm">
                        <span className="w-24 text-xs text-slate-500">{a.testDate}</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100">{a.score ?? "—"}</span>
                        {a.resultLabel && <Pill tone="slate">{a.resultLabel}</Pill>}
                      </li>
                    ))}
                  </ul>
                )}
                <RecordAttempt planId={p.id} onSubmit={patch} />
              </div>
            </div>

            {p.requirements.length > 0 && (
              <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">What your applications require</p>
                <ul className="mt-1 space-y-0.5">
                  {p.requirements.map((r) => (
                    <li key={r.university} className="text-xs text-slate-600 dark:text-slate-300">
                      {r.university}: {r.required}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </JourneyCard>
        ))
      )}

      <p className="text-[11px] text-slate-400">
        We show the gap against each university&apos;s published minimum. We never claim a score change alters your admission
        chances — we do not have the data to say that.
      </p>

      {unplanned.length > 0 && (
        <JourneyCard
          title="Your applications ask for a test you have not added"
          subtitle="These are the published minimums of the universities in your application list."
        >
          <ul className="space-y-1.5">
            {unplanned.map((d) => {
              const meta = data.testTypes.find((t) => t.key === d.testType);
              return (
                <li key={d.testType} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{meta?.label ?? d.testType}</span>
                  <Pill tone="warn">minimum {d.required}</Pill>
                  <span className="text-xs text-slate-500">{d.universities.join(", ")}</span>
                  <Button size="sm" variant="outline" onClick={() => void save({ testType: d.testType })}>
                    <Plus className="h-3 w-3" /> Track it
                  </Button>
                </li>
              );
            })}
          </ul>
        </JourneyCard>
      )}
    </div>
  );
}

function RecordAttempt({ planId, onSubmit }: { planId: number; onSubmit: (p: Record<string, unknown>) => Promise<void> }) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [score, setScore] = useState("");
  return (
    <div className="mt-2 flex flex-wrap items-end gap-2">
      <input type="date" className={`${inputClass} w-auto`} value={date} onChange={(e) => setDate(e.target.value)} />
      <input type="number" step="0.1" placeholder="Score" className={`${inputClass} w-28`} value={score} onChange={(e) => setScore(e.target.value)} />
      <Button
        size="sm"
        variant="outline"
        disabled={!score}
        onClick={() => {
          const n = Number(score);
          if (!Number.isFinite(n)) return;
          setScore("");
          void onSubmit({ testPlanId: planId, attemptDate: date, score: n });
        }}
      >
        <CalendarPlus className="h-3.5 w-3.5" /> Record attempt
      </Button>
    </div>
  );
}

// ===========================================================================
// MY STUDY PLAN (spec §12)
// ===========================================================================

interface Phase {
  key: string;
  title: string;
  description: string;
  icon: string;
  tab: string;
  status: string;
  pct: number;
  missing: string[];
}
interface StudyPlanData {
  plan: { id: number; title: string; targetMajor: string | null; targetCountry: string | null; goalYear: number | null; fundingGoal: string | null } | null;
  phases: Phase[];
  phaseDefinitions: Omit<Phase, "status" | "pct" | "missing">[];
}

export function StudyPlanPanel({ profileId, onNavigateTab }: { profileId: number; onNavigateTab: (t: string) => void }) {
  const { data, loading, error, reload } = useResource<StudyPlanData>(
    useCallback(() => getJson<StudyPlanData>(`/api/study-plan?profileId=${profileId}`, "Could not load your study plan"), [profileId]),
    [profileId],
    { initial: { plan: null, phases: [], phaseDefinitions: [] }, errorFallback: "Could not load your study plan" }
  );
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: "", targetMajor: "", targetCountry: "", goalYear: "", fundingGoal: "Full scholarship" });

  const create = async () => {
    if (!form.title.trim()) return;
    setBusy(true);
    try {
      await sendJson(
        "/api/study-plan",
        { method: "POST", body: JSON.stringify({ profileId, ...form, goalYear: form.goalYear ? Number(form.goalYear) : null }) },
        "Could not save your study plan"
      );
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const togglePhase = async (phaseKey: string, done: boolean) => {
    await sendJson("/api/study-plan", { method: "PATCH", body: JSON.stringify({ profileId, phaseKey, done }) }, "Could not update");
    await reload();
  };

  if (loading) return <Loading label="Building your study plan…" />;

  if (!data.plan) {
    return (
      <div className="space-y-4">
        <JourneyCard
          title="My study plan"
          subtitle="Start with the goal. We build the ten phases and keep them updated as your profile, tests and applications change."
        >
          {error && <ErrorNote message={error} />}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="Goal">
              <input className={inputClass} placeholder="Computer Science in the USA" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
            <Field label="Major">
              <input className={inputClass} value={form.targetMajor} onChange={(e) => setForm({ ...form, targetMajor: e.target.value })} />
            </Field>
            <Field label="Country">
              <input className={inputClass} value={form.targetCountry} onChange={(e) => setForm({ ...form, targetCountry: e.target.value })} />
            </Field>
            <Field label="Year">
              <input className={inputClass} type="number" value={form.goalYear} onChange={(e) => setForm({ ...form, goalYear: e.target.value })} />
            </Field>
            <Field label="Funding">
              <select className={inputClass} value={form.fundingGoal} onChange={(e) => setForm({ ...form, fundingGoal: e.target.value })}>
                <option>Full scholarship</option>
                <option>Partial scholarship</option>
                <option>Self-funded</option>
                <option>Not decided</option>
              </select>
            </Field>
          </div>
          <Button className="mt-3" onClick={create} disabled={busy || !form.title.trim()}>
            Create my study plan
          </Button>
        </JourneyCard>
        <JourneyCard title="What you will get">
          <ol className="grid gap-1.5 sm:grid-cols-2">
            {(data.phaseDefinitions.length ? data.phaseDefinitions : DEFAULT_PHASES).map((p, i) => (
              <li key={p.key} className="flex items-center gap-2 text-sm">
                <span aria-hidden>{p.icon}</span>
                <span className="text-slate-700 dark:text-slate-200">
                  <strong>{i + 1}.</strong> {p.title}
                </span>
              </li>
            ))}
          </ol>
        </JourneyCard>
      </div>
    );
  }

  const done = data.phases.filter((p) => p.status === "done").length;

  return (
    <div className="space-y-4">
      <JourneyCard
        title={data.plan.title}
        subtitle={[data.plan.targetMajor, data.plan.targetCountry, data.plan.goalYear, data.plan.fundingGoal].filter(Boolean).join(" · ")}
        action={
          <div className="text-right">
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {done}/{data.phases.length}
            </p>
            <p className="text-[10px] font-bold uppercase text-slate-500">Phases done</p>
          </div>
        }
      >
        {error && <ErrorNote message={error} />}
        <ol className="space-y-2">
          {data.phases.map((p, i) => (
            <li
              key={p.key}
              className={`rounded-xl border p-3 ${
                p.status === "done" ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40" : "border-slate-200 dark:border-slate-700"
              }`}
            >
              <div className="flex flex-wrap items-start gap-3">
                <button
                  type="button"
                  onClick={() => void togglePhase(p.key, p.status !== "done")}
                  aria-label={p.status === "done" ? `Reopen ${p.title}` : `Complete ${p.title}`}
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    p.status === "done" ? "bg-emerald-500 text-white sb-ink-on-bright" : "bg-slate-200 text-slate-500 dark:bg-slate-700"
                  }`}
                >
                  {p.status === "done" ? <Check className="h-3 w-3" /> : i + 1}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    <span aria-hidden>{p.icon}</span> {p.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{p.description}</p>
                  {p.missing.length > 0 && <p className="mt-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400">→ {p.missing[0]}</p>}
                  <div className="mt-1.5 max-w-xs">
                    <ProgressBar pct={p.pct} size="sm" tone={p.status === "done" ? "good" : "brand"} />
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => onNavigateTab(p.tab)}>
                  Open
                </Button>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[11px] text-slate-400">
          The progress numbers come from your real data — they update whenever your profile, tests or applications change.
        </p>
      </JourneyCard>
    </div>
  );
}

const DEFAULT_PHASES: { key: string; title: string; icon: string }[] = [
  { key: "profile", title: "Build profile", icon: "🧱" },
  { key: "tests", title: "Tests", icon: "📝" },
  { key: "university_research", title: "University research", icon: "🔎" },
  { key: "scholarship_research", title: "Scholarship research", icon: "💰" },
  { key: "documents", title: "Documents", icon: "📄" },
  { key: "applications", title: "Applications", icon: "📝" },
  { key: "interviews", title: "Interviews", icon: "🎤" },
  { key: "admission", title: "Admission", icon: "🎓" },
  { key: "visa", title: "Visa", icon: "🛂" },
  { key: "departure", title: "Departure", icon: "✈️" },
];

// ===========================================================================
// ACTIVITY PORTFOLIO (spec §14)
// ===========================================================================

interface ActivityRow {
  id: number;
  category: string;
  title: string;
  role: string | null;
  organization: string | null;
  hours: number | null;
  description: string | null;
  achievements: string | null;
  evidence: { id: number; label: string; url: string | null }[];
}
interface ActivityData {
  categories: string[];
  activities: ActivityRow[];
  summary: { total: number; totalHours: number; withEvidence: number };
}

export function ActivityPortfolioPanel({ profileId }: { profileId: number }) {
  const { data, loading, error, reload } = useResource<ActivityData>(
    useCallback(() => getJson<ActivityData>(`/api/activities?profileId=${profileId}`, "Could not load your activities"), [profileId]),
    [profileId],
    { initial: { categories: [], activities: [], summary: { total: 0, totalHours: 0, withEvidence: 0 } }, errorFallback: "Could not load your activities" }
  );
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ category: "volunteering", title: "", role: "", organization: "", hours: "", description: "", achievements: "" });

  const add = async () => {
    if (!form.title.trim()) return;
    setBusy(true);
    try {
      await sendJson(
        "/api/activities",
        { method: "POST", body: JSON.stringify({ profileId, ...form, hours: form.hours ? Number(form.hours) : null }) },
        "Could not save"
      );
      setForm({ category: "volunteering", title: "", role: "", organization: "", hours: "", description: "", achievements: "" });
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    await fetch(`/api/activities?profileId=${profileId}&id=${id}`, { method: "DELETE" });
    await reload();
  };

  if (loading && data.activities.length === 0) return <Loading label="Loading your activities…" />;

  return (
    <div className="space-y-4">
      <JourneyCard
        title="My activities"
        subtitle="Everything you have done that an application can use. You are the source of truth — we never invent an activity or an achievement for you."
        action={
          <div className="flex flex-wrap gap-2">
            <Pill tone="slate">{data.summary.total}</Pill>
            <Pill tone="brand">{data.summary.totalHours}h</Pill>
            <Pill tone="good">{data.summary.withEvidence} with evidence</Pill>
          </div>
        }
      >
        {error && <ErrorNote message={error} />}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Category">
            <select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {(data.categories.length ? data.categories : ["volunteering", "leadership", "project"]).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Title">
            <input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Peer tutoring programme" />
          </Field>
          <Field label="Role">
            <input className={inputClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Lead tutor" />
          </Field>
          <Field label="Organisation">
            <input className={inputClass} value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} />
          </Field>
          <Field label="Hours">
            <input className={inputClass} type="number" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
          </Field>
          <div className="sm:col-span-1 lg:col-span-3">
            <Field label="What you did">
              <input className={inputClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <Field label="Achievements" hint="Only what really happened — this is what applications will read.">
              <input className={inputClass} value={form.achievements} onChange={(e) => setForm({ ...form, achievements: e.target.value })} />
            </Field>
          </div>
        </div>
        <Button className="mt-3" onClick={add} disabled={busy || !form.title.trim()}>
          <Plus className="h-3.5 w-3.5" /> Add activity
        </Button>
      </JourneyCard>

      {data.activities.length === 0 ? (
        <Empty
          title="No activities yet"
          hint="Competitive applications usually show four or more. Start with something you already do — small things count."
        />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {data.activities.map((a) => (
            <div key={a.id} className="sb-card-hover rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{a.title}</p>
                  <p className="text-[11px] text-slate-500">
                    {a.category}
                    {a.role && ` · ${a.role}`}
                    {a.organization && ` · ${a.organization}`}
                    {a.hours ? ` · ${a.hours}h` : ""}
                  </p>
                </div>
                <Button size="sm" variant="danger" onClick={() => void remove(a.id)} aria-label={`Delete ${a.title}`}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              {a.description && <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{a.description}</p>}
              {a.achievements && <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">{a.achievements}</p>}
              {a.evidence.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {a.evidence.map((e) => (
                    <a
                      key={e.id}
                      href={e.url ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200"
                    >
                      <Link2 className="h-2.5 w-2.5" /> {e.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
