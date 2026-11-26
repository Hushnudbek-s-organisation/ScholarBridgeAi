"use client";

/**
 * PREPARE phase panels: Document Vault (spec §7), Test Planner (spec §8),
 * My Study Plan (spec §12) and the Activity Portfolio (spec §14).
 *
 * They live together because they share the same interaction model and the
 * same visual language, and because together they cover the whole PREPARE
 * group of the sidebar.
 */
import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarPlus, Check, ExternalLink, Link2, Plus, Trash2 } from "lucide-react";
import { getJson, sendJson, useResource } from "./useResource";
import { ApostilleReadinessCard } from "@/components/ApostilleReadinessCard";
import { SmartTimelineCalendar } from "@/components/SmartTimelineCalendar";
import { Empty, ErrorNote, Field, InlineAlert, JourneyCard, Loading, Pill, ProgressBar, StatusIcon, daysLabel, inputClass, toneForDays } from "@/components/ui/journey";
import { useLocaleContext } from "@/i18n/LocaleProvider";
import { announceSchollyPointsChanged } from "@/lib/scholly-points-client";
import { SampleExemplarBar } from "@/components/samples/SampleExemplarBar";
import { DocumentTemplatesCard } from "@/components/samples/DocumentTemplatesCard";
import type { ActivitySample } from "@/lib/samples/exemplars";
import { isUnmodifiedSample } from "@/lib/samples/text";
import { Button } from "@/components/ui/Button";

// ===========================================================================
// DOCUMENT VAULT (spec §7)
// ===========================================================================

interface VaultDoc {
  reviewIdentity?:string;
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
  const [actionError, setActionError] = useState("");

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
      setActionError(e instanceof Error ? e.message : t("dvAddError"));
    } finally {
      setBusy(false);
    }
  };

  const patchDoc = async (body: Record<string, unknown>) => {
    const result = await sendJson<{ schollyPointsAwarded?: number }>("/api/vault/documents",
      { method: "PATCH", body: JSON.stringify(body) }, t("dvUpdateError"));
    if (result.schollyPointsAwarded) announceSchollyPointsChanged(profileId, result.schollyPointsAwarded);
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
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            <Pill tone="slate">{t("dvDocumentsPill", { n: data.summary.total })}</Pill>
            {data.summary.expiring > 0 && <Pill tone="warn">{t("dvExpiringPill", { n: data.summary.expiring })}</Pill>}
            {data.summary.expired > 0 && <Pill tone="bad">{t("dvExpiredPill", { n: data.summary.expired })}</Pill>}
          </div>
        }
      >
        {error && <ErrorNote message={error} />}
        <InlineAlert message={actionError} onDismiss={() => setActionError("")} className="mb-3" />

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
          <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">{t("dvNewDocLinksToApplication")}</p>
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
              <li key={d.id} className="sb-card-hover rounded-surface border border-slate-200 p-3 dark:border-slate-700">
                <div className="flex flex-wrap items-start gap-2">
                  <StatusIcon state={d.status} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{d.title}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
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
                      <p className="mt-1 text-sm text-slate-500">{d.usedBy.map((u) => u.universityName).filter(Boolean).join(", ")}</p>
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
                      <Button size="sm" variant="outline" onClick={() => void patchDoc({ profileId, id: d.id, status: "verified",expectedIdentity:d.reviewIdentity })}>
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
          <p className="mt-3 text-sm text-slate-500">
            {t("dvPrivacyNote")}
          </p>
        </JourneyCard>
      )}

      {/* Priority 5.4 — the documents in this vault are only usable if the
          diploma and transcript carry an e-Apostille and a certified
          translation, and the bank statement is dated inside its window. This
          turns a planned visa date into the exact dates those must be ready. */}
      <ApostilleReadinessCard profileId={profileId} />
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
  /** One-click starter roadmaps served by the API (see STARTER_ROADMAPS). */
  roadmaps: {
    id: string;
    testType: string;
    targetScore: number;
    targetInDays: number;
    milestones: string[];
    booking: { label: string; url: string }[];
  }[];
  plans: TestPlanRow[];
  /** University-level catalogue figures that should be verified by programme. */
  catalogueSignals: { testType: string; catalogueFigure: number; universities: string[] }[];
}

type TestEditor = "add" | "settings" | "attempt";
type TestForm = { testType: string; roadmap: string; currentScore: string; targetScore: string; targetDate: string; nextTestDate: string; attemptDate: string; score: string };

const emptyTestForm: TestForm = {
  testType: "", roadmap: "", currentScore: "", targetScore: "", targetDate: "", nextTestDate: "", attemptDate: "", score: "",
};

function PlanEditor({ title, busy, error, onClose, children }: {
  title: string;
  busy: boolean;
  error: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const tc = useTranslations("common");
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => { if (dialog.open) dialog.close(); };
  }, []);
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={id}
      className="m-auto max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-lg overflow-y-auto rounded-overlay border border-slate-200 bg-white p-4 text-slate-900 shadow-xl backdrop:bg-slate-950/70 dark:border-slate-700 dark:bg-surface dark:text-slate-100 sm:p-6"
      onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <h2 id={id} className="break-words text-lg font-bold">{title}</h2>
        <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={onClose}>{tc("close")}</Button>
      </header>
      {error && <div className="mb-3"><ErrorNote message={error} /></div>}
      {children}
    </dialog>
  );
}

function planDate(value: string | null | undefined, locale: string): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const day = new Date(value + "T12:00:00Z");
  if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== value) return null;
  if (locale === "uz") return value.split("-").reverse().join(".");
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(day);
}

export function TestPlannerPanel({ profileId }: { profileId: number }) {
  const t = useTranslations("journey");
  const tc = useTranslations("common");
  const { locale } = useLocaleContext();
  const { data, loading, error, reload } = useResource<TestData>(
    useCallback(() => getJson<TestData>(`/api/test-planner?profileId=${profileId}`, t("tpLoadError")), [profileId, t]),
    [profileId],
    { initial: { testTypes: [], roadmaps: [], plans: [], catalogueSignals: [] }, errorFallback: t("tpLoadError") }
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [editor, setEditor] = useState<TestEditor | null>(null);
  const [form, setForm] = useState<TestForm>(emptyTestForm);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");

  const plan = data.plans.find((record) => record.id === selected) ?? data.plans[0];
  const unusedTypes = data.testTypes.filter((test) => !data.plans.some((record) => record.testType === test.key));
  const untrackedSignals = data.catalogueSignals.filter((signal) => !data.plans.some((record) => record.testType === signal.testType));
  const roadmaps = data.roadmaps.filter((item) => unusedTypes.some((test) => test.key === item.testType));
  const maxScore = data.testTypes.find((test) => test.key === plan?.testType)?.max;
  const step = plan?.testType === "ielts" ? "0.5" : plan?.testType === "other" ? "0.1" : "1";
  const noValue = t("mpNotSet");

  const testLabel = (key: string) => t.has(`tpTestType.${key}`) ? t(`tpTestType.${key}`) : data.testTypes.find((type) => type.key === key)?.label ?? key;
  const currentRoadmap = data.roadmaps.find((roadmap) => roadmap.testType === plan?.testType);

  const openEditor = (mode: TestEditor, testType?: string, roadmap = "") => {
    setActionError("");
    setNotice("");
    setForm(mode === "settings" && plan ? {
      ...emptyTestForm,
      currentScore: plan.currentScore?.toString() ?? "",
      targetScore: plan.targetScore?.toString() ?? "",
      targetDate: plan.targetDate ?? "",
      nextTestDate: plan.nextTestDate ?? "",
    } : {
      ...emptyTestForm,
      testType: testType ?? unusedTypes[0]?.key ?? "",
      roadmap,
      attemptDate: new Date().toISOString().slice(0, 10),
    });
    setEditor(mode);
  };

  const write = async (method: "POST" | "PATCH", payload: Record<string, unknown>, closeEditor = false) => {
    if (busy) return;
    setBusy(true);
    setActionError("");
    setNotice("");
    try {
      const result = await sendJson<{ plan?: { id: number } }>("/api/test-planner", {
        method, body: JSON.stringify({ profileId, ...payload }),
      }, t("tpSaveError"));
      if (result.plan?.id) setSelected(result.plan.id);
      await reload();
      if (closeEditor) setEditor(null);
      setNotice(t("mpSaved"));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : t("tpSaveError"));
    } finally {
      setBusy(false);
    }
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (editor === "add" && form.testType) {
      void write("POST", { testType: form.testType, ...(form.roadmap ? { roadmap: form.roadmap } : {}) }, true);
    } else if (editor === "settings" && plan) {
      void write("PATCH", {
        testPlanId: plan.id,
        currentScore: form.currentScore === "" ? null : Number(form.currentScore),
        targetScore: form.targetScore === "" ? null : Number(form.targetScore),
        targetDate: form.targetDate,
        nextTestDate: form.nextTestDate,
      }, true);
    } else if (editor === "attempt" && plan && form.attemptDate && form.score !== "") {
      void write("PATCH", { testPlanId: plan.id, attemptDate: form.attemptDate, score: Number(form.score) }, true);
    }
  };

  if (loading && !data.testTypes.length) return <Loading label={t("tpLoading")} />;
  if (error && !data.testTypes.length) return <JourneyCard title={t("tpLoadError")}><ErrorNote message={error} /><Button type="button" variant="outline" onClick={() => void reload()}>{t("mpRetry")}</Button></JourneyCard>;

  const dateInput = (key: "targetDate" | "nextTestDate" | "attemptDate", label: string) => (
    <Field label={label}>
      <input type="date" className={inputClass} value={form[key]} required={key === "attemptDate"} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
    </Field>
  );
  const scoreInput = (key: "currentScore" | "targetScore" | "score", label: string) => (
    <Field label={label}>
      <input type="number" min={0} max={maxScore} step={key === "score" ? step : "any"} className={inputClass} value={form[key]} required={key === "score"} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
    </Field>
  );
  const completed = plan?.tasks.filter((task) => task.isCompleted).length ?? 0;

  return (
    <div className="space-y-3">
      {error && <ErrorNote message={error} />}
      {!editor && <InlineAlert message={actionError} onDismiss={() => setActionError("")} />}
      {notice && <p role="status" className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{notice}</p>}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(12rem,1fr)_minmax(0,3fr)]">
        <JourneyCard title={t("mpMyTests")}>
          {!!data.plans.length && (
            <div className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-1" aria-label={t("mpMyTests")}>
              {data.plans.map((item) => (
                <Button key={item.id} type="button" aria-pressed={item.id === plan?.id} variant={item.id === plan?.id ? "primary" : "outline"} className="min-h-11 min-w-0 justify-between gap-2 whitespace-normal" onClick={() => { setSelected(item.id); setNotice(""); }}>
                  <span className="min-w-0 text-left break-words">{testLabel(item.testType)}</span>
                  <span className="hidden text-right text-xs sm:inline">{planDate(item.nextTestDate, locale) ?? ""}</span>
                </Button>
              ))}
            </div>
          )}
          {unusedTypes.length > 0 && <Button type="button" className="min-h-11" onClick={() => openEditor("add")}><Plus className="h-4 w-4" aria-hidden /> {t("mpAddTest")}</Button>}
          {roadmaps.length > 0 && (
            <details className="mt-3 border-t border-slate-200 dark:border-slate-700">
              <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">{t("mpTemplates")}</summary>
              <ul className="space-y-2">
                {roadmaps.map((roadmap) => (
                  <li key={roadmap.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span className="min-w-0 text-sm">{testLabel(roadmap.testType)} · {t("tpRoadmapTarget", { score: roadmap.targetScore })}</span>
                    <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={() => openEditor("add", roadmap.testType, roadmap.id)}>{t("tpRoadmapStart")}</Button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </JourneyCard>

        {plan ? (
          <div className="min-w-0 space-y-4">
            <JourneyCard title={testLabel(plan.testType)} action={<Button type="button" variant="outline" className="min-h-11 whitespace-normal" onClick={() => openEditor("settings")}>{t("mpEditTest")}</Button>}>
              <dl className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                {[
                  [t("tpCurrentScore"), plan.currentScore ?? noValue],
                  [t("tpTargetScore"), plan.targetScore ?? noValue],
                  [t("tpNextTestDate"), planDate(plan.nextTestDate, locale) ?? noValue],
                  [t("tpTargetDate"), planDate(plan.targetDate, locale) ?? noValue],
                ].map(([label, value]) => (
                  <div key={label} className="min-w-0 rounded-surface bg-slate-50 p-2.5 dark:bg-slate-800/80">
                    <dt className="break-words text-xs text-slate-600 dark:text-slate-300">{label}</dt>
                    <dd className="break-words text-sm font-bold">{value}</dd>
                  </div>
                ))}
              </dl>
            </JourneyCard>
            <div className="grid items-start gap-4 xl:grid-cols-2">
              <JourneyCard title={t("tpPracticeTasks")} action={<Pill tone="slate">{t("mpTasksProgress", { count: completed, total: plan.tasks.length })}</Pill>}>
                {plan.tasks.length > 0 ? (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {plan.tasks.map((task) => (
                      <li key={task.id}>
                        <label className="flex min-h-11 cursor-pointer items-center gap-2 py-2 text-sm">
                          <input type="checkbox" className="h-4 w-4 shrink-0 accent-indigo-600" checked={task.isCompleted} disabled={busy} onChange={() => void write("PATCH", { taskId: task.id, isCompleted: !task.isCompleted })} />
                          <span className="min-w-0 break-words">{task.title}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-slate-600 dark:text-slate-300">{t("tpNoTasks")}</p>}
              </JourneyCard>
              <JourneyCard title={t("tpPreviousAttempts")} action={<Button type="button" size="sm" variant="outline" className="min-h-11" onClick={() => openEditor("attempt")}><CalendarPlus className="h-4 w-4" aria-hidden /> {t("tpRecordAttempt")}</Button>}>
                {plan.attempts.length ? (
                  <>
                    <p className="text-sm font-semibold">{planDate(plan.attempts[0].testDate, locale) ?? noValue} · {plan.attempts[0].score ?? noValue}</p>
                    <details className="mt-2 border-t border-slate-200 dark:border-slate-700">
                      <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">{t("mpAttemptHistory")}</summary>
                      <ul className="space-y-1">
                        {plan.attempts.map((attempt) => <li key={attempt.id} className="flex flex-wrap justify-between gap-2 text-sm"><time dateTime={attempt.testDate}>{planDate(attempt.testDate, locale) ?? noValue}</time><strong>{attempt.score ?? noValue}</strong>{attempt.resultLabel && <Pill tone="slate">{attempt.resultLabel}</Pill>}</li>)}
                      </ul>
                    </details>
                  </>
                ) : <p className="text-sm text-slate-600 dark:text-slate-300">{t("tpNoAttempts")}</p>}
              </JourneyCard>
            </div>
          </div>
        ) : <Empty title={t("tpEmptyTitle")} hint={t("tpEmptyHint")} />}
      </div>
      {!!(currentRoadmap?.booking.length || plan?.catalogueFigures.length || untrackedSignals.length) && (
        <details className="rounded-overlay border border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-surface">
          <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">{t("mpTestReferences")}</summary>
          <div className="space-y-3 pb-4 text-sm">
            {currentRoadmap?.booking.map((booking) => <a key={booking.url} className="mr-2 inline-flex min-h-11 items-center gap-1 font-semibold text-indigo-700 dark:text-indigo-300" href={booking.url} target="_blank" rel="noopener noreferrer">{booking.label}<ExternalLink className="h-4 w-4" aria-hidden /></a>)}
            {!!plan?.catalogueFigures.length && <ul className="space-y-1">{plan.catalogueFigures.map((figure) => <li key={figure.university} className="break-words">{t("tpUniversityFigure", { university: figure.university, figure: figure.catalogueFigure })}</li>)}</ul>}
            {untrackedSignals.map((signal) => (
              <div key={signal.testType} className="flex flex-wrap items-center gap-2">
                <strong>{testLabel(signal.testType)}</strong> <span>{t("tpCatalogueReference", { figure: signal.catalogueFigure })}</span>
                <span className="min-w-0 break-words text-xs text-slate-600 dark:text-slate-300">{signal.universities.join(", ")}</span>
                {unusedTypes.some((test) => test.key === signal.testType) && <Button type="button" size="sm" variant="outline" className="min-h-11" onClick={() => openEditor("add", signal.testType)}>{t("tpTrackIt")}</Button>}
              </div>
            ))}
            <p className="text-slate-600 dark:text-slate-300">{t("tpHonesty")}</p>
          </div>
        </details>
      )}
      {editor && (
        <PlanEditor title={editor === "add" ? t("mpAddTest") : editor === "attempt" ? t("tpRecordAttempt") : t("mpEditTest")} busy={busy} error={actionError} onClose={() => setEditor(null)}>
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
            {editor === "add" ? (
              <>
                <Field label={t("mpTestType")}>
                  <select required value={form.testType} className={inputClass} onChange={(event) => setForm({ ...form, testType: event.target.value, roadmap: "" })}>
                    {unusedTypes.map((test) => <option key={test.key} value={test.key}>{testLabel(test.key)}</option>)}
                  </select>
                </Field>
                <Field label={t("mpTemplates")}>
                  <select value={form.roadmap} className={inputClass} onChange={(event) => setForm({ ...form, roadmap: event.target.value })}>
                    <option value="">{t("mpBasicPlan")}</option>
                    {roadmaps.filter((roadmap) => roadmap.testType === form.testType).map((roadmap) => <option key={roadmap.id} value={roadmap.id}>{t("tpRoadmapTarget", { score: roadmap.targetScore })}</option>)}
                  </select>
                </Field>
              </>
            ) : editor === "settings" ? (
              <>
                {scoreInput("currentScore", t("tpCurrentScore"))}
                {scoreInput("targetScore", t("tpTargetScore"))}
                {dateInput("nextTestDate", t("tpNextTestDate"))}
                {dateInput("targetDate", t("tpTargetDate"))}
              </>
            ) : (
              <>
                {dateInput("attemptDate", t("tpAttemptDate"))}
                {scoreInput("score", t("tpScorePlaceholder"))}
              </>
            )}
            <div className="sm:col-span-2"><Button type="submit" className="min-h-11" disabled={busy}>{editor === "add" ? t("mpAddTest") : tc("save")}</Button></div>
          </form>
        </PlanEditor>
      )}
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
  nextTests: { id: number; testType: string; date: string | null }[];
}

const planGroups = [
  { title: "mpGroupPreparation", keys: ["profile", "tests", "university_research", "scholarship_research"] },
  { title: "mpGroupApplications", keys: ["documents", "applications", "interviews"] },
  { title: "mpGroupAfter", keys: ["admission", "visa", "departure"] },
] as const;

const fundingOptions = [
  ["Not decided", "spFundUndecided"],
  ["Full scholarship", "spFundFull"],
  ["Partial scholarship", "spFundPartial"],
  ["Self-funded", "spFundSelf"],
] as const;

export function StudyPlanPanel({
  profileId,
  onNavigateTab,
  profile,
}: {
  profileId: number;
  onNavigateTab: (t: string) => void;
  profile?: { targetMajor?: string | null; preferredCountries?: string | null } | null;
}) {
  const t = useTranslations("journey");
  const tc = useTranslations("common");
  const { locale } = useLocaleContext();
  const { data, loading, error, reload } = useResource<StudyPlanData>(
    useCallback(() => getJson<StudyPlanData>(`/api/study-plan?profileId=${profileId}`, t("spLoadError")), [profileId, t]),
    [profileId],
    { initial: { plan: null, phases: [], nextTests: [] }, errorFallback: t("spLoadError") }
  );
  const [editing, setEditing] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({ title: "", targetMajor: "", targetCountry: "", goalYear: "", fundingGoal: "Not decided" });

  const phaseTitle = (phase: Phase) => t(`spPhase.${phase.key}.title` as never);
  const phaseDescription = (phase: Phase) => t(`spPhase.${phase.key}.description` as never);
  const phaseHint = (phase: Phase) => phase.missing[0] ? t(`spPhaseMissing.${phase.missing[0]}` as never) : phaseDescription(phase);
  const focusPhase = (phase: Phase) => onNavigateTab(phase.key === "tests" ? "study-plan/tests" : phase.tab);
  const plan = data.plan;

  const openForm = () => {
    setActionError("");
    setNotice("");
    setForm(plan ? {
      title: plan.title,
      targetMajor: plan.targetMajor ?? "",
      targetCountry: plan.targetCountry ?? "",
      goalYear: plan.goalYear?.toString() ?? "",
      fundingGoal: plan.fundingGoal ?? "Not decided",
    } : { title: "", targetMajor: "", targetCountry: "", goalYear: "", fundingGoal: "Not decided" });
    setEditing(true);
  };

  const prefill = () => {
    const stored = profile?.preferredCountries ?? "";
    let countries = stored.split(",");
    try {
      const parsed: unknown = JSON.parse(stored);
      if (Array.isArray(parsed)) countries = parsed.filter((item): item is string => typeof item === "string");
    } catch {
      // Older profile rows store a comma-separated list.
    }
    setForm((previous) => ({
      ...previous,
      title: previous.title || t("spTitle"),
      targetMajor: previous.targetMajor || profile?.targetMajor?.trim() || "",
      targetCountry: previous.targetCountry || countries.map((name) => name.trim()).filter(Boolean).slice(0, 3).join(" / "),
    }));
  };

  const write = async (method: "POST" | "PATCH", body: Record<string, unknown>, closeEditor = false) => {
    if (busy) return;
    setBusy(true);
    setActionError("");
    setNotice("");
    try {
      await sendJson("/api/study-plan", { method, body: JSON.stringify({ profileId, ...body }) }, t("spSaveError"));
      await reload();
      if (closeEditor) setEditing(false);
      setNotice(t("mpSaved"));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : t("spSaveError"));
    } finally {
      setBusy(false);
    }
  };

  if (loading && !plan && !editing) return <Loading label={t("spLoading")} />;
  if (error && !plan && !editing) return <JourneyCard title={t("spLoadError")}><ErrorNote message={error} /><Button type="button" variant="outline" onClick={() => void reload()}>{t("mpRetry")}</Button></JourneyCard>;

  const done = data.phases.filter((phase) => phase.status === "done").length;
  const next = data.phases.find((phase) => phase.status !== "done");
  const today = new Date().toISOString().slice(0, 10);
  const nextTests = (data.nextTests ?? []).filter((test) => test.date && test.date >= today).slice(0, 3);
  const fundingLabel = fundingOptions.find(([value]) => value === plan?.fundingGoal)?.[1];
  const goalFields = [
    [t("spFieldMajor"), plan?.targetMajor],
    [t("spFieldCountry"), plan?.targetCountry],
    [t("spFieldYear"), plan?.goalYear],
    [t("spFieldFunding"), fundingLabel ? t(fundingLabel) : plan?.fundingGoal],
  ] as const;

  return (
    <div className="space-y-3">
      {error && <ErrorNote message={error} />}
      {!editing && <InlineAlert message={actionError} onDismiss={() => setActionError("")} />}
      {notice && <p role="status" className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{notice}</p>}
      {plan ? (
        <>
          <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <JourneyCard title={plan.title} action={<Button type="button" variant="outline" className="min-h-11 whitespace-normal" onClick={openForm}>{t("mpEditGoal")}</Button>}>
              <dl className="grid grid-cols-2 gap-2">
                {goalFields.map(([label, value]) => <div key={label} className="min-w-0 rounded-surface bg-slate-50 p-2.5 dark:bg-slate-800/80"><dt className="break-words text-xs text-slate-600 dark:text-slate-300">{label}</dt><dd className="break-words text-sm font-bold">{value ?? t("mpNotSet")}</dd></div>)}
              </dl>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>{t("spPhasesDone")}</span><strong>{done} / {data.phases.length}</strong>
              </div>
              <div className="mt-2"><ProgressBar pct={data.phases.length ? (done / data.phases.length) * 100 : 0} size="sm" tone="brand" /></div>
            </JourneyCard>
            <article className="min-w-0 space-y-2 rounded-overlay border border-indigo-200 bg-gradient-to-br from-indigo-50 to-slate-50 p-4 dark:border-indigo-800 dark:from-indigo-950/80 dark:to-slate-900 sm:p-5">
              <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300">{t("mpNext")}</p>
              <h2 className="break-words text-lg font-extrabold text-slate-900 dark:text-slate-100">{next ? phaseTitle(next) : t("mpAllDone")}</h2>
              {next && <p className="break-words text-sm leading-relaxed text-slate-600 dark:text-slate-300">{phaseHint(next)}</p>}
              <Button type="button" className="min-h-11" onClick={() => next ? focusPhase(next) : setCalendarOpen(true)}>
                {next ? next.key === "tests" ? t("mpOpenTests") : t("spOpenPhase") : t("mpCalendar")}
              </Button>
            </article>
          </div>
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <JourneyCard title={t("mpPhases")}>
              {planGroups.map(({ title, keys }) => {
                const phases = data.phases.filter((phase) => (keys as readonly string[]).includes(phase.key));
                if (!phases.length) return null;
                return (
                  <details key={title} open={phases.some((phase) => phase.key === next?.key)} className="border-t border-slate-200 dark:border-slate-700">
                    <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">
                      {t(title)} <span className="ml-2 text-xs text-slate-600 dark:text-slate-400">{phases.filter((phase) => phase.status === "done").length} / {phases.length}</span>
                    </summary>
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                      {phases.map((phase) => (
                        <li key={phase.key} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                          <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm">
                            <input type="checkbox" checked={phase.status === "done"} disabled={busy} className="h-4 w-4 shrink-0 accent-indigo-600" onChange={() => void write("PATCH", { phaseKey: phase.key, done: phase.status !== "done" })} />
                            <span className="min-w-0 break-words">{phaseTitle(phase)}</span>
                          </label>
                          <Button type="button" variant="ghost" size="sm" className="min-h-11" onClick={() => focusPhase(phase)}>{t("spOpenPhase")}</Button>
                        </li>
                      ))}
                    </ul>
                  </details>
                );
              })}
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{t("spProgressFromData")}</p>
            </JourneyCard>
            <JourneyCard title={t("mpUpcoming")} action={<Button type="button" variant="outline" className="min-h-11" aria-expanded={calendarOpen} aria-controls="study-plan-calendar" onClick={() => setCalendarOpen((value) => !value)}>{t("mpCalendar")}</Button>}>
              {nextTests.length ? (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {nextTests.map((test) => <li key={test.id} className="flex flex-wrap justify-between gap-2 py-2 text-sm"><span>{t.has(`tpTestType.${test.testType}`) ? t(`tpTestType.${test.testType}`) : test.testType}</span><time className="font-semibold text-indigo-700 dark:text-indigo-300" dateTime={test.date ?? undefined}>{planDate(test.date, locale)}</time></li>)}
                </ul>
              ) : <p className="text-sm text-slate-600 dark:text-slate-300">{t("mpNoUpcoming")}</p>}
            </JourneyCard>
          </div>
          <div id="study-plan-calendar" hidden={!calendarOpen}>
            {calendarOpen && <SmartTimelineCalendar profileId={profileId} onNavigateTab={onNavigateTab} />}
          </div>
        </>
      ) : (
        <JourneyCard title={t("spTitle")} subtitle={t("spSubtitle")}>
          <Button type="button" className="min-h-11" onClick={openForm}>{t("spCreate")}</Button>
        </JourneyCard>
      )}
      {editing && (
        <PlanEditor title={plan ? t("mpEditGoal") : t("spCreate")} busy={busy} error={actionError} onClose={() => setEditing(false)}>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={(event) => {
            event.preventDefault();
            if (!form.title.trim()) return;
            void write(plan ? "PATCH" : "POST", { ...form, ...(plan ? { id: plan.id } : {}), title: form.title.trim(), goalYear: form.goalYear ? Number(form.goalYear) : null }, true);
          }}>
            <div className="sm:col-span-2"><Field label={t("spFieldGoal")}><input required maxLength={160} className={inputClass} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field></div>
            <Field label={t("spFieldMajor")}><input maxLength={120} className={inputClass} value={form.targetMajor} onChange={(event) => setForm({ ...form, targetMajor: event.target.value })} /></Field>
            <Field label={t("spFieldCountry")}><input maxLength={120} className={inputClass} value={form.targetCountry} onChange={(event) => setForm({ ...form, targetCountry: event.target.value })} /></Field>
            <Field label={t("spFieldYear")}><input type="number" min={1991} max={2100} className={inputClass} value={form.goalYear} onChange={(event) => setForm({ ...form, goalYear: event.target.value })} /></Field>
            <Field label={t("spFieldFunding")}><select className={inputClass} value={form.fundingGoal} onChange={(event) => setForm({ ...form, fundingGoal: event.target.value })}>
              {fundingOptions.map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
              {form.fundingGoal && !fundingOptions.some(([value]) => value === form.fundingGoal) && <option value={form.fundingGoal}>{form.fundingGoal}</option>}
            </select></Field>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Button type="submit" className="min-h-11" disabled={busy || !form.title.trim()}>{plan ? tc("save") : t("spCreate")}</Button>
              {!plan && <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={prefill}>{t("mpPrefill")}</Button>}
            </div>
          </form>
        </PlanEditor>
      )}
    </div>
  );
}

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
  const t = useTranslations("journey");
  const ts = useTranslations("samples");
  const { data, loading, error, reload } = useResource<ActivityData>(
    useCallback(() => getJson<ActivityData>(`/api/activities?profileId=${profileId}`, t("actLoadError")), [profileId, t]),
    [profileId],
    { initial: { categories: [], activities: [], summary: { total: 0, totalHours: 0, withEvidence: 0 } }, errorFallback: t("actLoadError") }
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
        t("actSaveError")
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

  if (loading && data.activities.length === 0) return <Loading label={t("actLoading")} />;

  return (
    <div className="space-y-4">
      <JourneyCard
        title={t("actTitle")}
        subtitle={t("actSubtitle")}
        action={
          <div className="flex flex-wrap gap-2">
            <Pill tone="slate">{data.summary.total}</Pill>
            <Pill tone="brand">{data.summary.totalHours}h</Pill>
            <Pill tone="good">{t("actWithEvidence", { count: data.summary.withEvidence })}</Pill>
          </div>
        }
      >
        {error && <ErrorNote message={error} />}
        <SampleExemplarBar group="activity" className="mb-3" loadLabel={ts("activityLoad")} onLoad={loadActivitySample} />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={t("actCategory")}>
            <select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {(data.categories.length ? data.categories : ["volunteering", "leadership", "project"]).map((c) => (
                <option key={c} value={c}>
                  {t(`actCat_${c}` as never)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("actFieldTitle")}>
            <input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t("actTitlePlaceholder")} />
          </Field>
          <Field label={t("actRole")}>
            <input className={inputClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder={t("actRolePlaceholder")} />
          </Field>
          <Field label={t("actOrganization")}>
            <input className={inputClass} value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} />
          </Field>
          <Field label={t("actHours")}>
            <input className={inputClass} type="number" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
          </Field>
          <div className="sm:col-span-1 lg:col-span-3">
            <Field label={t("actDescription")}>
              <input className={inputClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <Field label={t("actAchievements")} hint={t("actAchievementsHint")}>
              <input className={inputClass} value={form.achievements} onChange={(e) => setForm({ ...form, achievements: e.target.value })} />
            </Field>
          </div>
        </div>
        {loadedActivity && (
          <p role="status" className={`mt-3 text-sm leading-relaxed ${formHoldsSample ? "font-semibold text-violet-800 dark:text-violet-200" : "text-slate-600"}`}>
            {formHoldsSample ? ts("activityLoaded") : ts("loadedNotice")}
          </p>
        )}
        <Button className="mt-3" onClick={add} disabled={busy || !form.title.trim() || formHoldsSample}>
          <Plus className="h-3.5 w-3.5" />{t("actAdd")}
        </Button>
      </JourneyCard>

      {data.activities.length === 0 ? (
        <Empty
          title={t("actEmptyTitle")}
          hint={t("actEmptyHint")}
        />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {data.activities.map((a) => (
            <div key={a.id} className="sb-card-hover rounded-surface border border-slate-200 p-3 dark:border-slate-700">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{a.title}</p>
                  <p className="text-sm text-slate-500">
                    {a.category}
                    {a.role && ` · ${a.role}`}
                    {a.organization && ` · ${a.organization}`}
                    {a.hours ? ` · ${a.hours}h` : ""}
                  </p>
                </div>
                <Button size="sm" variant="danger" onClick={() => void remove(a.id)} aria-label={t("actDelete", { title: a.title })}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              {a.description && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{a.description}</p>}
              {a.achievements && <p className="mt-1 text-sm font-medium text-emerald-700 dark:text-emerald-400">{a.achievements}</p>}
              {a.evidence.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {a.evidence.map((e) => (
                    <a
                      key={e.id}
                      href={e.url ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200"
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
