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
import { CalendarPlus, Check, ExternalLink, Link2, Plus, Search, Trash2 } from "lucide-react";
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
import { PanelDialog } from "@/components/ui/PanelDialog";

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

export function DocumentVaultPanel({ profileId, applicationId, onOpenRequirements }: { profileId: number; applicationId?: number | null; onOpenRequirements?: () => void }) {
  const t = useTranslations("journey");
  const { locale } = useLocaleContext();
  const { data, loading, error, reload } = useResource<VaultData>(
    useCallback(() => getJson<VaultData>(`/api/vault/documents?profileId=${profileId}`, t("dvLoadError")), [profileId, t]),
    [profileId],
    { initial: { docTypes: [], documents: [], summary: { total: 0, verified: 0, expiring: 0, expired: 0 } }, errorFallback: t("dvLoadError") }
  );
  const [form, setForm] = useState({ docType: "passport", title: "", issuedAt: "", expiresAt: "" });
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const tm = useTranslations("materials");
  const [query, setQuery] = useState("");
  const [linkFilter, setLinkFilter] = useState("all");
  const searchTerm = query.trim().toLocaleLowerCase(locale);
  const matches = data.documents.filter((doc) => {
    const linked = doc.usedBy.some((link) => link.applicationId === applicationId);
    if (applicationId != null && linkFilter !== "all" && linked !== (linkFilter === "linked")) return false;
    const type = t(`doc${doc.docType[0].toUpperCase()}${doc.docType.slice(1)}`);
    return [doc.title, type, doc.fileUrl].some((value) => value?.toLocaleLowerCase(locale).includes(searchTerm));
  });

  const add = async () => {
    if (!form.title.trim() || busy) return;
    setBusy(true);
    setActionError("");
    try {
      await sendJson(
        "/api/vault/documents",
        { method: "POST", body: JSON.stringify({ profileId, ...form, applicationIds: applicationId == null ? [] : [applicationId] }) },
        t("dvAddError")
      );
      setForm({ docType: "passport", title: "", issuedAt: "", expiresAt: "" });
      setAdding(false);
      await reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : t("dvAddError"));
    } finally {
      setBusy(false);
    }
  };

  const patchDoc = async (body: Record<string, unknown>) => {
    setActionError("");
    try {
      const result = await sendJson<{ schollyPointsAwarded?: number }>("/api/vault/documents",
        { method: "PATCH", body: JSON.stringify(body) }, t("dvUpdateError"));
      if (result.schollyPointsAwarded) announceSchollyPointsChanged(profileId, result.schollyPointsAwarded);
      await reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : t("dvUpdateError"));
    }
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
    setActionError("");
    try {
      await sendJson(`/api/vault/documents?profileId=${profileId}&id=${id}`, { method: "DELETE" }, t("dvUpdateError"));
      await reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : t("dvUpdateError"));
    }
  };

  if (loading && data.documents.length === 0) return <Loading label={t("dvLoading")} />;

  return (
    <div className="space-y-4">
      <JourneyCard
        title={t("dvTitle")}
        subtitle={t("dvSubtitle")}
        action={
          <Button size="sm" onClick={() => {
            setActionError("");
            setAdding(true);
          }}>
            <Plus className="size-4 shrink-0" aria-hidden /> {t("dvAdd")}
          </Button>
        }
      >
        {error && <ErrorNote message={error} />}
        {!adding && <InlineAlert message={actionError} onDismiss={() => setActionError("")} className="mb-3" />}
        <div className="flex flex-wrap gap-2">
          <Pill tone="slate">{t("dvDocumentsPill", { n: data.summary.total })}</Pill>
          {data.summary.expiring > 0 && <Pill tone="warn">{t("dvExpiringPill", { n: data.summary.expiring })}</Pill>}
          {data.summary.expired > 0 && <Pill tone="bad">{t("dvExpiredPill", { n: data.summary.expired })}</Pill>}
        </div>
      </JourneyCard>

      {adding && (
        <PanelDialog title={t("dvAdd")} busy={busy} error={actionError} onClose={() => {
          setActionError("");
          setAdding(false);
        }}>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={(event) => {
            event.preventDefault();
            void add();
          }}>
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
            {applicationId != null && (
              <p className="text-sm text-slate-600 dark:text-slate-300 sm:col-span-2">{t("dvNewDocLinksToApplication")}</p>
            )}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={busy || !form.title.trim()}>{t("dvAdd")}</Button>
            </div>
          </form>
        </PanelDialog>
      )}

      {data.documents.length === 0 ? (
        <Empty title={t("dvEmptyTitle")} hint={t("dvEmptyHint")} />
      ) : (
        <JourneyCard
          title={t("dvYourDocs")}
          action={onOpenRequirements && (
            <Button size="sm" variant="outline" onClick={onOpenRequirements}>
              {t("dvSeeNeeds")}
            </Button>
          )}
        >
          <div className="mb-3 grid gap-3 rounded-surface border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/40 sm:grid-cols-2">
            <Field label={tm("searchDocuments")}>
              <span className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" aria-hidden />
                <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} className={`${inputClass} pl-9`} />
              </span>
            </Field>
            {applicationId != null && (
              <Field label={tm("documentLink")}>
                <select className={inputClass} value={linkFilter} onChange={(e) => setLinkFilter(e.target.value)}>
                  <option value="all">{tm("allDocuments")}</option>
                  <option value="linked">{tm("linkedDocuments")}</option>
                  <option value="unlinked">{tm("unlinkedDocuments")}</option>
                </select>
              </Field>
            )}
          </div>
          <p role="status" className="mb-2 text-sm text-slate-600 dark:text-slate-300">{tm("documentCount", { count: matches.length })}</p>
          {matches.length === 0 ? <Empty title={tm("noDocuments")} /> : <ul className="space-y-2">
            {matches.map((d) => (
              <li key={d.id} className="sb-card-hover rounded-surface border border-slate-200 p-3 dark:border-slate-700">
                <div className="flex flex-wrap items-start gap-2">
                  <StatusIcon state={d.status} />
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-semibold text-slate-800 dark:text-slate-100">{d.title}</p>
                    {applicationId != null && (
                      <span className="mt-1 inline-block">
                        {d.usedBy.some((link) => link.applicationId === applicationId)
                          ? <Pill tone="brand">{tm("linkedDocuments")}</Pill>
                          : <Pill tone="slate">{tm("unlinkedDocuments")}</Pill>}
                      </span>
                    )}
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
          </ul>}
          <p className="mt-3 text-sm text-slate-500">
            {t("dvPrivacyNote")}
          </p>
        </JourneyCard>
      )}

      {/* Priority 5.4 — the documents in this vault are only usable if the
          diploma and transcript carry an e-Apostille and a certified
          translation, and the bank statement is dated inside its window. This
          turns a planned visa date into the exact dates those must be ready. */}
      <DocumentTemplatesCard />
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
        <PanelDialog title={editor === "add" ? t("mpAddTest") : editor === "attempt" ? t("tpRecordAttempt") : t("mpEditTest")} busy={busy} error={actionError} onClose={() => setEditor(null)}>
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
        </PanelDialog>
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
        <PanelDialog title={plan ? t("mpEditGoal") : t("spCreate")} busy={busy} error={actionError} onClose={() => setEditing(false)}>
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
        </PanelDialog>
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

const EMPTY_ACTIVITY = { category: "project", title: "", role: "", organization: "", hours: "", description: "", achievements: "", evidenceLabel: "", evidenceUrl: "" };

function evidenceLink(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

export function ActivityPortfolioPanel({ profileId }: { profileId: number }) {
  const t = useTranslations("journey");
  const ts = useTranslations("samples");
  const tc = useTranslations("common");
  const { data, loading, error, reload } = useResource<ActivityData>(
    useCallback(() => getJson<ActivityData>(`/api/activities?profileId=${profileId}`, t("actLoadError")), [profileId, t]),
    [profileId],
    { initial: { categories: [], activities: [], summary: { total: 0, totalHours: 0, withEvidence: 0 } }, errorFallback: t("actLoadError") }
  );
  const [category, setCategory] = useState("all");
  const [details, setDetails] = useState<ActivityRow | null>(null);
  const [editing, setEditing] = useState<"new" | ActivityRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState(EMPTY_ACTIVITY);
  const [loadedActivity, setLoadedActivity] = useState<ActivitySample | null>(null);

  // An example may fill the form on request. Replace its sample claims before saving.
  const formHoldsSample = loadedActivity != null &&
    (isUnmodifiedSample(form.title, loadedActivity.activity.title) ||
      isUnmodifiedSample(form.description, loadedActivity.activity.description) ||
      isUnmodifiedSample(form.achievements, loadedActivity.activity.achievements));

  function openEditor(item: "new" | ActivityRow) {
    setDetails(null);
    setLoadedActivity(null);
    setActionError("");
    setNotice("");
    setForm(item === "new" ? EMPTY_ACTIVITY : {
      ...EMPTY_ACTIVITY,
      title: item.title,
      category: item.category,
      role: item.role ?? "",
      organization: item.organization ?? "",
      hours: item.hours?.toString() ?? "",
      description: item.description ?? "",
      achievements: item.achievements ?? "",
    });
    setEditing(item);
  }

  function loadActivitySample(sample: ActivitySample) {
    const activity = sample.activity;
    setForm({
      ...EMPTY_ACTIVITY,
      category: activity.category,
      title: activity.title,
      role: activity.role,
      organization: activity.organization,
      hours: String(activity.hours),
      description: activity.description,
      achievements: activity.achievements,
    });
    setLoadedActivity(sample);
  }

  function change(key: keyof typeof EMPTY_ACTIVITY, value: string) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editing || !form.title.trim() || formHoldsSample || busy) return;
    const { evidenceLabel, evidenceUrl, ...fields } = form;
    const link = evidenceLink(evidenceUrl.trim());
    if (evidenceUrl.trim() && (!link || !evidenceLabel.trim())) {
      setActionError(t("actEvidenceError"));
      return;
    }
    setBusy(true);
    setActionError("");
    try {
      const evidence = evidenceLabel.trim() ? { evidenceType: "url", label: evidenceLabel.trim(), url: link } : undefined;
      await sendJson("/api/activities", {
        method: editing === "new" ? "POST" : "PATCH",
        body: JSON.stringify({
          profileId,
          ...fields,
          title: fields.title.trim(),
          hours: fields.hours ? Number(fields.hours) : null,
          ...(editing === "new" ? { evidence: evidence ? [evidence] : undefined } : { id: editing.id, appendEvidence: evidence }),
        }),
      }, t("actSaveError"));
      await reload();
      if (category !== fields.category) setCategory("all");
      setEditing(null);
      setNotice(t("mpSaved"));
    } catch {
      setActionError(t("actSaveError"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: ActivityRow) {
    if (busy || !window.confirm(t("actConfirmDelete"))) return;
    setBusy(true);
    setActionError("");
    try {
      await sendJson(`/api/activities?profileId=${profileId}&id=${item.id}`, { method: "DELETE" }, t("actSaveError"));
      await reload();
      setDetails(null);
    } catch {
      setActionError(t("actSaveError"));
    } finally {
      setBusy(false);
    }
  }

  if (loading && !data.categories.length) return <Loading label={t("actLoading")} />;
  if (error && !data.categories.length) return <JourneyCard title={t("actTitle")}><ErrorNote message={error} /><Button type="button" className="mt-3 min-h-11" variant="outline" onClick={() => void reload()}>{t("mpRetry")}</Button></JourneyCard>;

  const categories = data.categories.length ? data.categories : ["volunteering", "leadership", "project"];
  const categoryLabel = (value: string) => t.has(`actCat_${value}`) ? t(`actCat_${value}`) : value;
  const visible = data.activities.filter((item) => category === "all" || category === item.category);
  const showEvidenceFields = editing === "new" || (editing && editing.evidence.length < 12);

  return (
    <div className="space-y-3">
      {error && <ErrorNote message={error} />}
      {notice && <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300" role="status">{notice}</p>}
      <div className="grid gap-3 lg:grid-cols-2">
        <JourneyCard title={t("actTitle")} tone="accent" action={<Button type="button" className="min-h-11" onClick={() => openEditor("new")}><Plus className="size-4" aria-hidden />{t("actAdd")}</Button>}>
          <p className="text-sm text-slate-600 dark:text-slate-300">{t("actOverviewHint")}</p>
        </JourneyCard>
        <JourneyCard title={t("actSummary")}>
          <dl className="grid grid-cols-3 gap-1.5">
            {[
              [t("actTotalLabel"), data.summary.total],
              [t("actHours"), data.summary.totalHours],
              [t("actEvidenceCount"), data.summary.withEvidence],
            ].map(([label, number]) => <div key={label} className="min-w-0 rounded-surface bg-slate-50 p-2 dark:bg-slate-800"><dt className="break-words text-xs text-slate-600 dark:text-slate-300">{label}</dt><dd className="text-lg font-bold tabular-nums">{number}</dd></div>)}
          </dl>
        </JourneyCard>
      </div>
      <JourneyCard title={t("actSavedList")}>
        <div className="mb-3 max-w-xs">
          <Field label={t("actCategory")}>
            <select value={category} className={`${inputClass} min-h-11`} onChange={(event) => setCategory(event.target.value)}>
              <option value="all">{t("actAllCategories")}</option>
              {categories.map((value) => <option key={value} value={value}>{categoryLabel(value)}</option>)}
            </select>
          </Field>
        </div>
        {visible.length === 0 ? <Empty title={category === "all" ? t("actEmptyTitle") : t("actEmptyFiltered")} hint={category === "all" ? t("actEmptyHint") : undefined} /> : (
          <ul className="grid gap-2 md:grid-cols-2">
            {visible.map((item) => (
              <li key={item.id} className="min-w-0 space-y-2 rounded-surface border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/80">
                <div className="flex flex-wrap gap-1.5"><Pill tone="brand">{categoryLabel(item.category)}</Pill>{item.evidence.length > 0 && <Pill tone="good">{t("actEvidenceCount")}</Pill>}</div>
                <h3 className="break-words text-sm font-bold">{item.title}</h3>
                {(item.role || item.organization || item.hours != null) && <p className="break-words text-sm text-slate-600 dark:text-slate-300">{[item.role, item.organization, item.hours != null ? t("actHoursValue", { hours: item.hours }) : null].filter(Boolean).join(" · ")}</p>}
                <Button type="button" className="min-h-11" variant="outline" aria-label={t("actDetailsFor", { title: item.title })} onClick={() => { setActionError(""); setDetails(item); }}>{t("actDetails")}</Button>
              </li>
            ))}
          </ul>
        )}
      </JourneyCard>
      <details className="rounded-overlay border border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-900">
        <summary className="min-h-11 cursor-pointer py-2.5 font-semibold">{t("actExample")}</summary>
        <p className="mb-1 text-sm text-slate-600 dark:text-slate-300">{t("actExampleHint")}</p>
        <Button type="button" className="mb-3 min-h-11" variant="outline" onClick={() => openEditor("new")}>{t("actAdd")}</Button>
      </details>

      {(editing || details) && (
        <PanelDialog
          title={editing === "new" ? t("actAdd") : editing ? t("actEdit") : details?.title ?? ""}
          busy={busy}
          error={actionError}
          className="max-w-2xl"
          onClose={() => { setEditing(null); setDetails(null); setActionError(""); }}
        >
          {details && !editing ? (
            <div className="space-y-3">
              <Pill tone="brand">{categoryLabel(details.category)}</Pill>
              {details.description && <p className="whitespace-pre-wrap break-words text-sm">{details.description}</p>}
              {details.achievements && <p className="whitespace-pre-wrap break-words text-sm font-semibold">{details.achievements}</p>}
              {details.evidence.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {details.evidence.map((item) => {
                    const link = evidenceLink(item.url);
                    return <li key={item.id}>{link ? (
                      <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 break-words font-semibold text-indigo-700 underline underline-offset-2 dark:text-indigo-300"><Link2 className="size-4 shrink-0" aria-hidden />{item.label}</a>
                    ) : <Pill tone="slate">{item.label}</Pill>}</li>;
                  })}
                </ul>
              ) : <p className="text-sm text-slate-600 dark:text-slate-300">{t("actNoEvidence")}</p>}
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={() => openEditor(details)}>{t("actEdit")}</Button>
                <Button type="button" variant="ghost" size="icon" disabled={busy} onClick={() => void remove(details)} aria-label={t("actDelete", { title: details.title })}><Trash2 className="size-4" aria-hidden /></Button>
              </div>
            </div>
          ) : (
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={(event) => void save(event)}>
              <Field label={t("actFieldTitle")}><input required maxLength={200} value={form.title} className={inputClass} onChange={(event) => change("title", event.target.value)} /></Field>
              <Field label={t("actCategory")}><select className={inputClass} value={form.category} onChange={(event) => change("category", event.target.value)}>{categories.map((value) => <option key={value} value={value}>{categoryLabel(value)}</option>)}{!categories.includes(form.category) && <option value={form.category}>{categoryLabel(form.category)}</option>}</select></Field>
              <Field label={t("actRole")}><input maxLength={120} className={inputClass} value={form.role} onChange={(event) => change("role", event.target.value)} /></Field>
              <Field label={t("actOrganization")}><input maxLength={160} className={inputClass} value={form.organization} onChange={(event) => change("organization", event.target.value)} /></Field>
              <Field label={t("actHours")}><input type="number" min={0} step="any" className={inputClass} value={form.hours} onChange={(event) => change("hours", event.target.value)} /></Field>
              <div className="sm:col-span-2"><Field label={t("actDescription")}><textarea className={inputClass} rows={3} value={form.description} maxLength={4000} onChange={(event) => change("description", event.target.value)} /></Field></div>
              <div className="sm:col-span-2"><Field label={t("actAchievements")} hint={t("actAchievementsHint")}><textarea className={inputClass} rows={2} value={form.achievements} maxLength={4000} onChange={(event) => change("achievements", event.target.value)} /></Field></div>
              {showEvidenceFields && <>
                <Field label={t("actEvidenceLabel")}><input className={inputClass} maxLength={160} value={form.evidenceLabel} onChange={(event) => change("evidenceLabel", event.target.value)} /></Field>
                <Field label={t("actEvidenceUrl")}><input type="url" className={inputClass} maxLength={800} value={form.evidenceUrl} onChange={(event) => change("evidenceUrl", event.target.value)} /></Field>
              </>}
              {editing === "new" && (
                <details className="sm:col-span-2">
                  <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">{t("actExample")}</summary>
                  <SampleExemplarBar group="activity" loadLabel={ts("activityLoad")} onLoad={loadActivitySample} />
                </details>
              )}
              {loadedActivity && <p role="status" className="text-sm text-slate-600 dark:text-slate-300 sm:col-span-2">{formHoldsSample ? ts("activityLoaded") : ts("loadedNotice")}</p>}
              <div className="sm:col-span-2"><Button type="submit" className="min-h-11" disabled={busy || !form.title.trim() || formHoldsSample}>{editing === "new" ? t("actAdd") : tc("save")}</Button></div>
            </form>
          )}
        </PanelDialog>
      )}
    </div>
  );
}
