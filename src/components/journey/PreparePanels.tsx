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
import { AppNote } from "@/components/AppNote";
import { SampleExemplarBar } from "@/components/samples/SampleExemplarBar";
import { DocumentTemplatesCard } from "@/components/samples/DocumentTemplatesCard";
import type { ActivitySample } from "@/lib/samples/exemplars";
import { isUnmodifiedSample } from "@/lib/samples/text";

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

export function DocumentVaultPanel({ profileId, applicationId, onNavigateTab }: { profileId: number; applicationId?: number | null; onNavigateTab: (t: string) => void }) {
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
      await sendJson(
        "/api/vault/documents",
        { method: "POST", body: JSON.stringify({ profileId, ...form, applicationIds: applicationId == null ? [] : [applicationId] }) },
        t("dvAddError")
      );
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

  const toggleApplicationLink = (doc: VaultDoc) => {
    if (applicationId == null) return;
    const currentIds = doc.usedBy.map((link) => link.applicationId);
    const isLinked = currentIds.includes(applicationId);
    const applicationIds = isLinked
      ? currentIds.filter((id) => id !== applicationId)
      : [...currentIds, applicationId];
    void patchDoc({ profileId, id: doc.id, applicationIds });
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
        {applicationId != null && (
          <p className="mb-2 text-[11px] text-slate-500 dark:text-slate-400">{t("dvNewDocLinksToApplication")}</p>
        )}
        <Button onClick={add} disabled={busy || !form.title.trim()}>
          <Plus className="h-3.5 w-3.5" /> {t("dvAdd")}
        </Button>
      </JourneyCard>

      <DocumentTemplatesCard />

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
                    {applicationId != null && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleApplicationLink(d)}
                        aria-pressed={d.usedBy.some((link) => link.applicationId === applicationId)}
                      >
                        <Link2 className="h-3 w-3" />
                        {d.usedBy.some((link) => link.applicationId === applicationId)
                          ? t("dvUnlinkFromApplication")
                          : t("dvLinkToApplication")}
                      </Button>
                    )}
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
  catalogueFigures: { university: string; catalogueFigure: number }[];
  gap: { state: string; catalogueFigure: number | null; current: number | null; messageKey: string };
}
interface TestData {
  testTypes: { key: string; label: string; max: number; skills: string[] }[];
  plans: TestPlanRow[];
  /** University-level catalogue figures that should be verified by programme. */
  catalogueSignals: { testType: string; catalogueFigure: number; universities: string[] }[];
}

export function TestPlannerPanel({ profileId }: { profileId: number }) {
  const t = useTranslations("journey");
  const { data, loading, error, reload } = useResource<TestData>(
    useCallback(() => getJson<TestData>(`/api/test-planner?profileId=${profileId}`, t("tpLoadError")), [profileId, t]),
    [profileId],
    { initial: { testTypes: [], plans: [], catalogueSignals: [] }, errorFallback: t("tpLoadError") }
  );
  const [busy, setBusy] = useState(false);

  const save = async (payload: Record<string, unknown>) => {
    setBusy(true);
    try {
      await sendJson("/api/test-planner", { method: "POST", body: JSON.stringify({ profileId, ...payload }) }, t("tpSaveError"));
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const patch = async (payload: Record<string, unknown>) => {
    await sendJson("/api/test-planner", { method: "PATCH", body: JSON.stringify({ profileId, ...payload }) }, t("tpSaveError"));
    await reload();
  };

  const testLabel = (key: string) => {
    const translationKey = `tpTestType.${key}`;
    try {
      return t(translationKey as never);
    } catch {
      return data.testTypes.find((item) => item.key === key)?.label ?? key;
    }
  };

  const gapMessage = (gap: TestPlanRow["gap"], label: string) => {
    switch (gap.messageKey) {
      case "scoreNotRecorded":
        return t("tpGapScoreNotRecorded", { test: label, figure: gap.catalogueFigure ?? "—" });
      case "belowCatalogueFigure":
        return t("tpGapBelowFigure", { test: label, current: gap.current ?? "—", figure: gap.catalogueFigure ?? "—" });
      case "atOrAboveCatalogueFigure":
        return t("tpGapAtOrAboveFigure", { test: label, current: gap.current ?? "—", figure: gap.catalogueFigure ?? "—" });
      default:
        return t("tpGapNoFigure", { test: label });
    }
  };

  if (loading && data.plans.length === 0) return <Loading label={t("tpLoading")} />;

  // Catalogue figures with no saved plan are shown as verification prompts,
  // not as tests the student's applications require.
  const untrackedSignals = data.catalogueSignals.filter(
    (signal) => !data.plans.some((plan) => plan.testType === signal.testType),
  );

  return (
    <div className="space-y-4">
      {error && <ErrorNote message={error} />}
      <JourneyCard title={t("tpAddTestTitle")} subtitle={t("tpAddTestSubtitle")}>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {data.testTypes.map((test) => (
            <Button
              key={test.key}
              variant="outline"
              size="sm"
              className="min-h-11 whitespace-normal text-left"
              disabled={busy}
              onClick={() => void save({ testType: test.key })}
            >
              <Plus className="h-3.5 w-3.5 shrink-0" /> <span className="break-words">{testLabel(test.key)}</span>
            </Button>
          ))}
        </div>
      </JourneyCard>

      {data.plans.length === 0 ? (
        <Empty title={t("tpEmptyTitle")} hint={t("tpEmptyHint")} />
      ) : (
        data.plans.map((plan) => {
          const label = testLabel(plan.testType);
          const maxScore = data.testTypes.find((test) => test.key === plan.testType)?.max;
          return (
            <JourneyCard
              key={plan.id}
              title={label}
              subtitle={gapMessage(plan.gap, label)}
              action={
                <Pill tone="slate" className="max-w-full whitespace-normal">
                  {t("tpScoreAndTarget", { current: plan.currentScore ?? "—", target: plan.targetScore ?? "—" })}
                </Pill>
              }
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label={t("tpCurrentScore")}>
                  <input
                    className={inputClass}
                    type="number"
                    min={0}
                    max={maxScore}
                    step="0.1"
                    defaultValue={plan.currentScore ?? ""}
                    onBlur={(event) => void patch({ testPlanId: plan.id, currentScore: event.target.value === "" ? null : Number(event.target.value) })}
                  />
                </Field>
                <Field label={t("tpTargetScore")}>
                  <input
                    className={inputClass}
                    type="number"
                    min={0}
                    max={maxScore}
                    step="0.1"
                    defaultValue={plan.targetScore ?? ""}
                    onBlur={(event) => void patch({ testPlanId: plan.id, targetScore: event.target.value === "" ? null : Number(event.target.value) })}
                  />
                </Field>
                <Field label={t("tpTargetDate")}>
                  <input className={inputClass} type="date" defaultValue={plan.targetDate ?? ""} onChange={(event) => void patch({ testPlanId: plan.id, targetDate: event.target.value })} />
                </Field>
                <Field label={t("tpNextTestDate")}>
                  <input className={inputClass} type="date" defaultValue={plan.nextTestDate ?? ""} onChange={(event) => void patch({ testPlanId: plan.id, nextTestDate: event.target.value })} />
                </Field>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="min-w-0">
                  <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">{t("tpPracticeTasks")}</h3>
                  {plan.tasks.length === 0 ? (
                    <p className="text-xs text-slate-500">{t("tpNoTasks")}</p>
                  ) : (
                    <ul className="space-y-1">
                      {plan.tasks.map((task) => (
                        <li key={task.id}>
                          <button
                            type="button"
                            aria-pressed={task.isCompleted}
                            onClick={() => void patch({ taskId: task.id, isCompleted: !task.isCompleted })}
                            className="flex min-h-11 w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1 text-left text-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-slate-800"
                          >
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[9px] ${
                                task.isCompleted ? "border-emerald-600 bg-emerald-600 text-white sb-ink-on-bright" : "border-slate-300 dark:border-slate-600"
                              }`}
                              aria-hidden="true"
                            >
                              {task.isCompleted && <Check className="h-3 w-3" />}
                            </span>
                            <span className={`min-w-0 break-words ${task.isCompleted ? "text-slate-400 line-through" : "text-slate-700 dark:text-slate-200"}`}>
                              {task.title}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">{t("tpPreviousAttempts")}</h3>
                  {plan.attempts.length === 0 ? (
                    <p className="text-xs text-slate-500">{t("tpNoAttempts")}</p>
                  ) : (
                    <ul className="space-y-1">
                      {plan.attempts.map((attempt) => (
                        <li key={attempt.id} className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
                          <time className="text-xs text-slate-500" dateTime={attempt.testDate}>{attempt.testDate}</time>
                          <span className="font-bold text-slate-800 dark:text-slate-100">{attempt.score ?? "—"}</span>
                          {attempt.resultLabel && <Pill tone="slate">{attempt.resultLabel}</Pill>}
                        </li>
                      ))}
                    </ul>
                  )}
                  <RecordAttempt planId={plan.id} onSubmit={patch} />
                </div>
              </div>

              {plan.catalogueFigures.length > 0 && (
                <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">{t("tpCatalogueFiguresTitle")}</p>
                  <ul className="mt-1 space-y-1">
                    {plan.catalogueFigures.map((figure) => (
                      <li key={figure.university} className="break-words text-xs text-slate-600 dark:text-slate-300">
                        {t("tpUniversityFigure", { university: figure.university, figure: figure.catalogueFigure })}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </JourneyCard>
          );
        })
      )}

      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{t("tpHonesty")}</p>

      {untrackedSignals.length > 0 && (
        <JourneyCard title={t("tpSignalsTitle")} subtitle={t("tpSignalsSubtitle")}>
          <ul className="space-y-2">
            {untrackedSignals.map((signal) => {
              const label = testLabel(signal.testType);
              return (
                <li key={signal.testType} className="flex min-w-0 flex-col gap-2 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700 sm:flex-row sm:items-center">
                  <span className="min-w-0 flex-1 break-words font-semibold text-slate-700 dark:text-slate-200">{label}</span>
                  <Pill tone="slate" className="max-w-full whitespace-normal">{t("tpCatalogueReference", { figure: signal.catalogueFigure })}</Pill>
                  <span className="min-w-0 break-words text-xs text-slate-500 sm:flex-1">{signal.universities.join(", ")}</span>
                  <Button size="sm" variant="outline" className="min-h-11 w-full shrink-0 sm:w-auto" disabled={busy} onClick={() => void save({ testType: signal.testType })}>
                    <Plus className="h-3.5 w-3.5" /> {t("tpTrackIt")}
                  </Button>
                </li>
              );
            })}
          </ul>
        </JourneyCard>
      )}
      <AppNote kind="planning" className="mt-2" />
    </div>
  );
}

function RecordAttempt({ planId, onSubmit }: { planId: number; onSubmit: (p: Record<string, unknown>) => Promise<void> }) {
  const t = useTranslations("journey");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [score, setScore] = useState("");
  return (
    <div className="mt-2 flex min-w-0 flex-col items-stretch gap-2 sm:flex-row sm:items-end">
      <label className="min-w-0 text-xs font-medium text-slate-600 dark:text-slate-300">
        <span className="sr-only">{t("tpAttemptDate")}</span>
        <input type="date" aria-label={t("tpAttemptDate")} className={inputClass} value={date} onChange={(event) => setDate(event.target.value)} />
      </label>
      <label className="min-w-0 text-xs font-medium text-slate-600 dark:text-slate-300 sm:w-28">
        <span className="sr-only">{t("tpScorePlaceholder")}</span>
        <input type="number" step="0.1" placeholder={t("tpScorePlaceholder")} aria-label={t("tpScorePlaceholder")} className={inputClass} value={score} onChange={(event) => setScore(event.target.value)} />
      </label>
      <Button
        size="sm"
        variant="outline"
        className="min-h-11 w-full sm:w-auto"
        disabled={!score}
        onClick={() => {
          const n = Number(score);
          if (!Number.isFinite(n)) return;
          setScore("");
          void onSubmit({ testPlanId: planId, attemptDate: date, score: n });
        }}
      >
        <CalendarPlus className="h-4 w-4" /> {t("tpRecordAttempt")}
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
  const t = useTranslations("journey");
  const phaseTitle = (key: string) => t(`spPhase.${key}.title` as never);
  const phaseDescription = (key: string) => t(`spPhase.${key}.description` as never);
  const phaseMissing = (key: string) => t(`spPhaseMissing.${key}` as never);
  const { data, loading, error, reload } = useResource<StudyPlanData>(
    useCallback(() => getJson<StudyPlanData>(`/api/study-plan?profileId=${profileId}`, t("spLoadError")), [profileId, t]),
    [profileId],
    { initial: { plan: null, phases: [], phaseDefinitions: [] }, errorFallback: t("spLoadError") }
  );
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: "", targetMajor: "", targetCountry: "", goalYear: "", fundingGoal: "Not decided" });

  const create = async () => {
    if (!form.title.trim()) return;
    setBusy(true);
    try {
      await sendJson(
        "/api/study-plan",
        { method: "POST", body: JSON.stringify({ profileId, ...form, goalYear: form.goalYear ? Number(form.goalYear) : null }) },
        t("spSaveError")
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

  if (loading) return <Loading label={t("spLoading")} />;

  if (!data.plan) {
    return (
      <div className="space-y-4">
        <JourneyCard title={t("spTitle")} subtitle={t("spSubtitle")}>
          {error && <ErrorNote message={error} />}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <Field label={t("spFieldGoal")}>
              <input className={inputClass} placeholder={t("spGoalPlaceholder")} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
            <Field label={t("spFieldMajor")}>
              <input className={inputClass} value={form.targetMajor} onChange={(e) => setForm({ ...form, targetMajor: e.target.value })} />
            </Field>
            <Field label={t("spFieldCountry")}>
              <input className={inputClass} value={form.targetCountry} onChange={(e) => setForm({ ...form, targetCountry: e.target.value })} />
            </Field>
            <Field label={t("spFieldYear")}>
              <input className={inputClass} type="number" value={form.goalYear} onChange={(e) => setForm({ ...form, goalYear: e.target.value })} />
            </Field>
            <Field label={t("spFieldFunding")}>
              <select className={inputClass} value={form.fundingGoal} onChange={(e) => setForm({ ...form, fundingGoal: e.target.value })}>
                <option value="Full scholarship">{t("spFundFull")}</option>
                <option value="Partial scholarship">{t("spFundPartial")}</option>
                <option value="Self-funded">{t("spFundSelf")}</option>
                <option value="Not decided">{t("spFundUndecided")}</option>
              </select>
            </Field>
          </div>
          <Button className="mt-3 min-h-12" onClick={create} disabled={busy || !form.title.trim()}>
            {t("spCreate")}
          </Button>
        </JourneyCard>
        <JourneyCard title={t("spWhatYouGet")}>
          <ol className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {(data.phaseDefinitions.length ? data.phaseDefinitions : DEFAULT_PHASES).map((phase, index) => (
              <li key={phase.key} className="flex min-w-0 items-start gap-2 text-sm">
                <span aria-hidden className="shrink-0">{phase.icon}</span>
                <span className="min-w-0 break-words text-slate-700 dark:text-slate-200">
                  <strong>{index + 1}.</strong> {phaseTitle(phase.key)}
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
            <p className="text-[10px] font-bold uppercase text-slate-500">{t("spPhasesDone")}</p>
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
                  aria-label={t(p.status === "done" ? "spReopenPhase" : "spCompletePhase", { title: phaseTitle(p.key) })}
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    p.status === "done" ? "bg-emerald-500 text-white sb-ink-on-bright" : "bg-slate-200 text-slate-500 dark:bg-slate-700"
                  }`}
                >
                  {p.status === "done" ? <Check className="h-3 w-3" /> : i + 1}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-semibold text-slate-800 dark:text-slate-100">
                    <span aria-hidden>{p.icon}</span> {phaseTitle(p.key)}
                  </p>
                  <p className="break-words text-xs leading-relaxed text-slate-600 dark:text-slate-400">{phaseDescription(p.key)}</p>
                  {p.missing.length > 0 && <p className="mt-1 break-words text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">{phaseMissing(p.missing[0])}</p>}
                  <div className="mt-1.5 max-w-xs">
                    <ProgressBar pct={p.pct} size="sm" tone={p.status === "done" ? "good" : "brand"} />
                  </div>
                </div>
                <Button size="sm" variant="outline" className="min-h-11 w-full sm:w-auto" onClick={() => onNavigateTab(p.tab)}>
                  {t("spOpenPhase")}
                </Button>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[11px] text-slate-400">
          The progress numbers come from your real data — they update whenever your profile, tests or applications change.
        </p>
      </JourneyCard>
      {/* Standing small print: this panel can be wrong — say so where it is read. */}
      <AppNote kind="planning" className="mt-2" />
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
  const ts = useTranslations("samples");
  const { data, loading, error, reload } = useResource<ActivityData>(
    useCallback(() => getJson<ActivityData>(`/api/activities?profileId=${profileId}`, "Could not load your activities"), [profileId]),
    [profileId],
    { initial: { categories: [], activities: [], summary: { total: 0, totalHours: 0, withEvidence: 0 } }, errorFallback: "Could not load your activities" }
  );
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ category: "volunteering", title: "", role: "", organization: "", hours: "", description: "", achievements: "" });
  // SPEC §14: never fabricate activities. An example may fill the form on an
  // explicit click, but it cannot be added until its claims are replaced.
  const [loadedActivity, setLoadedActivity] = useState<ActivitySample | null>(null);
  const formHoldsSample =
    loadedActivity != null &&
    (isUnmodifiedSample(form.title, loadedActivity.activity.title) ||
      isUnmodifiedSample(form.description, loadedActivity.activity.description) ||
      isUnmodifiedSample(form.achievements, loadedActivity.activity.achievements));

  const loadActivitySample = (sample: ActivitySample) => {
    const a = sample.activity;
    setForm({
      category: a.category,
      title: a.title,
      role: a.role,
      organization: a.organization,
      hours: String(a.hours),
      description: a.description,
      achievements: a.achievements,
    });
    setLoadedActivity(sample);
  };

  const add = async () => {
    if (!form.title.trim() || formHoldsSample) return;
    setBusy(true);
    try {
      await sendJson(
        "/api/activities",
        { method: "POST", body: JSON.stringify({ profileId, ...form, hours: form.hours ? Number(form.hours) : null }) },
        "Could not save"
      );
      setForm({ category: "volunteering", title: "", role: "", organization: "", hours: "", description: "", achievements: "" });
      setLoadedActivity(null);
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
        <SampleExemplarBar group="activity" className="mb-3" loadLabel={ts("activityLoad")} onLoad={loadActivitySample} />
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
        {loadedActivity && (
          <p role="status" className={`mt-3 text-xs leading-relaxed ${formHoldsSample ? "font-semibold text-violet-800 dark:text-violet-200" : "text-slate-600"}`}>
            {formHoldsSample ? ts("activityLoaded") : ts("loadedNotice")}
          </p>
        )}
        <Button className="mt-3" onClick={add} disabled={busy || !form.title.trim() || formHoldsSample}>
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
