"use client";

/**
 * ApplicationWorkspacePanel — spec §6 + §22.
 *
 * One workspace per university with ten tabs, a progress bar that every
 * requirement feeds automatically, and a final submission checklist that
 * refuses to mark an application t("recStatusSubmitted") while required items are open.
 */
import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, Check, ExternalLink, Lock, RefreshCw } from "lucide-react";
import { Empty, Field, JourneyCard, Loading, Pill, ProgressBar, ProgressRing, SourceTag, daysLabel, inputClass, toneForDays } from "@/components/ui/journey";
import { Button } from "@/components/ui/Button";
import { PanelDialog } from "@/components/ui/PanelDialog";
import { applicationDaysTo, applicationDeadlineOrder, applicationDecision, applicationPhase, type WorkspaceSection, type WorkspaceSummary } from "@/lib/journey/workspace";
import { notifyApplicationsChanged } from "@/lib/applicationEvents";
import { announceSchollySubmission } from "@/lib/scholly-client-events";
import { announceSchollyPointsChanged } from "@/lib/scholly-points-client";

interface WorkspaceData {
  tabs: { id: WorkspaceSection; label: string; icon: string }[];
  application: {
    id: number;
    universityName: string;
    programName: string | null;
    applicationRound: string | null;
    intakeTerm: string | null;
    deadline: string | null;
    status: string;
    submittedAt: string | null;
    portalUrl: string | null;
    applicationFeePaid: boolean;
    feeAmount: number | null;
  } | null;
  workspaces: WorkspaceSummary[];
  progress: {
    pct: number;
    done: number;
    total: number;
    sections: { key: string; label: string; done: number; total: number; pct: number }[];
    missing: { key: string; section: string; title: string; isRequired: boolean; status: string }[];
    readyToSubmit: boolean;
    blockers: string[];
  };
  requirements: {
    id: number;
    section: string;
    itemKey: string;
    title: string;
    instructions: string | null;
    isRequired: boolean;
    status: string;
    dueDate: string | null;
    sourceUrl: string | null;
    sourceName: string | null;
    sourceType: string | null;
    lastVerifiedAt: string | null;
    verificationStatus: string;
    linkedType: string | null;
  }[];
  documents: { id: number; title: string; docType: string; status: string; expiresAt: string | null; fileUrl: string | null; usage: string }[];
  essays: { id: number; essayType: string; title: string; wordCount: number; versionNumber: number }[];
  recommendations: { id: number; recommenderName: string; relationship: string | null; status: string; dueDate: string | null }[];
  tests: { id: number; testType: string; currentScore: number | null; targetScore: number | null; targetDate: string | null }[];
  finance: { id: number; kind: string; name: string; amountUsd: number; status: string }[];
  deadlines: { id: number; title: string; dueDate: string; kind: string }[];
  offer: { status: string; decidedAt: string | null; responseDeadline?: string | null; depositAmount?: number | null; depositDueDate?: string | null; tuitionCommitment?: number | null } | null;
  submissionChecklist: { key: string; label: string; ok: boolean }[];
  readyToSubmit: boolean;
  reversePlan: { key: string; title: string; date: null; daysBefore: null; tab: string }[];
}

const SECTION_ORDER = ["academic", "english", "testing", "documents", "essays", "recommendations", "finance", "application"];

const PREP_TABS = ["requirements", "documents", "essays", "recommendations", "tests", "finance"] as const;
const FINAL_TABS = ["deadlines", "submission", "decision"] as const;

type PrepTab = typeof PREP_TABS[number];
const SECTION_KEYS: Record<PrepTab, string[]> = {
  requirements: ["academic", "application"],
  documents: ["documents"],
  essays: ["essays"],
  recommendations: ["recommendations"],
  tests: ["english", "testing"],
  finance: ["finance"],
};

function tabForSection(section: string): PrepTab {
  return PREP_TABS.find((tab) => SECTION_KEYS[tab].includes(section)) ?? "requirements";
}

export function ApplicationWorkspacePanel({
  profileId,
  applicationId,
  onSelect,
  onNavigateTab,
}: {
  profileId: number;
  applicationId?: number | null;
  onSelect: (id: number) => void;
  onNavigateTab: (tab: string) => void;
}) {
  const t = useTranslations("journey");
  const [data, setData] = useState<WorkspaceData | null>(null);
  const ta = useTranslations("applications");
  const format = useFormatter();
  const locale = useLocale();
  const panelId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [tab, setTab] = useState<WorkspaceSection>("overview");
  const [focusItem, setFocusItem] = useState<number | null>(null);
  const [confirmSubmission, setConfirmSubmission] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Keep the current workspace visible while a saved change reloads its data.
  const load = useCallback(async () => {
    const qs = new URLSearchParams({ profileId: String(profileId) });
    if (applicationId) qs.set("applicationId", String(applicationId));
    const res = await fetch(`/api/workspace?${qs}`, { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || t("awLoadError"));
    return json as WorkspaceData;
  }, [profileId, applicationId, t]);

  const reload = useCallback(async () => {
    try {
      setData(await load());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("awLoadError"));
    } finally {
      setLoading(false);
    }
  }, [load, t]);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await load();
        if (!live) return;
        setData(res);
        setError(null);
      } catch (err) {
        if (!live) return;
        setError(err instanceof Error ? err.message : t("awLoadError"));
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [load, t]);

  useEffect(() => {
    if (data?.application?.id) titleRef.current?.focus({ preventScroll: true });
  }, [data?.application?.id]);

  useEffect(() => {
    if (focusItem == null) return;
    document.getElementById(`${panelId}-req-${focusItem}`)?.focus();
  }, [focusItem, panelId, tab]);

  const selectTab = (next: WorkspaceSection) => {
    setFocusItem(null);
    setTab(next);
  };
  const openRequirement = (section: string, key: string) => {
    const requirement = data?.requirements.find((item) => item.section === section && item.itemKey === key);
    setTab(tabForSection(section));
    setFocusItem(requirement?.id ?? null);
  };
  const formatDate = (date: string) => format.dateTime(new Date(`${date.slice(0, 10)}T00:00:00Z`), { dateStyle: "medium", timeZone: "UTC" });
  const statusLabel = (status: string) => {
    const decision = applicationDecision(status);
    return decision ? ta(`result.${decision}`) : ta.has(`status.${status}` as never) ? ta(`status.${status}` as never) : ta("statusLabel");
  };
  const dayText = (date: string) => daysLabel(applicationDaysTo(date), locale);
  const tabLabel = (value: WorkspaceSection) => t(`awSections.${value}`);

  const patchRequirement = async (id: number, status: string) => {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/requirements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, applicationId: data?.application?.id ?? applicationId, id, status }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || t("dvUpdateError"));
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("dvUpdateError"));
    } finally {
      setBusy(false);
    }
  };

  const saveOffer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!data?.application) return;
    const values = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/offers", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, applicationId: data.application.id, status: values.get("status"), decidedAt: values.get("decidedAt") || null, responseDeadline: values.get("responseDeadline") || null, depositAmount: values.get("depositAmount") || null, depositDueDate: values.get("depositDueDate") || null, tuitionCommitment: values.get("tuitionCommitment") || null }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || t("opCreateError"));
      setMessage(t("awOfferSaved"));
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("opCreateError"));
    } finally {
      setBusy(false);
    }
  };

  const markSubmitted = async () => {
    if (!data?.application || busy || !data.readyToSubmit || data.application.submittedAt || data.application.status === "withdrawn") return;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, id: data.application.id, markSubmitted: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          json.code === "not_ready"
            ? `${json.error} ${(json.outstanding ?? []).map((o: { title: string }) => o.title).join(", ")}`
            : json.error || t("awSubmitError")
        );
        return;
      }
      setConfirmSubmission(false);
      setMessage(t("awMarkedSubmitted"));
      notifyApplicationsChanged(profileId);
      announceSchollyPointsChanged(profileId, json.schollyPointsAwarded);
      if (!data.application.submittedAt && json.status === "submitted" && json.id === data.application.id) {
        announceSchollySubmission(profileId, data.application.id);
      }
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("awSubmitError"));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loading label={t("awLoading")} />;
  if (error && !data)
    return (
      <Empty
        title={t("awUnavailable")}
        hint={error}
        action={
          <Button onClick={() => void reload()}>{t("awTryAgain")}</Button>
        }
      />
    );
  if (!data) return null;

  if (!applicationId) {
    const isActive = (row: WorkspaceSummary) => applicationPhase(row) === "preparing";
    const workspaces = [...data.workspaces].sort((a, b) =>
      applicationDeadlineOrder(a, isActive(a)) - applicationDeadlineOrder(b, isActive(b)) ||
      (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999")
    );
    return (
      <JourneyCard title={t("awListTitle")} subtitle={t("awListSubtitle")}>
        {workspaces.length === 0 ? (
          <Empty title={t("awEmptyTitle")} hint={t("awEmptyHint")}
            action={<Button onClick={() => onNavigateTab("applications")}>{t("ceStartApplication")}</Button>} />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {workspaces.map((workspace) => (
              <li key={workspace.id} className="min-w-0 space-y-2 rounded-surface border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/60">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="min-w-0 break-words font-bold text-slate-900 dark:text-white">{workspace.universityName || t("awUniversityFallback")}</h3>
                  <Pill tone={workspace.submittedAt ? "info" : "brand"}>{statusLabel(workspace.status)}</Pill>
                </div>
                <p className="break-words text-sm text-slate-600 dark:text-slate-300">{workspace.programName || ta("noProgram")}</p>
                <div className="flex flex-wrap gap-2 text-sm text-slate-600 dark:text-slate-300">
                  {workspace.deadline ? <time dateTime={workspace.deadline}>{formatDate(workspace.deadline)}</time> : ta("trackerNoDate")}
                  {workspace.deadline && isActive(workspace) && <Pill tone={toneForDays(applicationDaysTo(workspace.deadline))}>{dayText(workspace.deadline)}</Pill>}
                </div>
                {workspace.submittedAt ? <p className="text-sm">{t("recStatusSubmitted")}</p> : workspace.total > 0 ? (
                  <div className="space-y-1">
                    <p className="flex flex-wrap justify-between gap-x-2 text-sm text-slate-600 dark:text-slate-300"><span>{t("awReqsDone", { done: workspace.done, total: workspace.total })}</span><strong>{workspace.progressPct}%</strong></p>
                    <ProgressBar pct={workspace.progressPct} size="sm" animate={false} tone={workspace.progressPct >= 100 ? "good" : "brand"} />
                  </div>
                ) : <p className="text-sm text-slate-600 dark:text-slate-300">{ta("trackerNoProgress")}</p>}
                <Button size="sm" variant="secondary" onClick={() => onSelect(workspace.id)}>
                  {ta("openWorkspace")}<ArrowRight className="size-4" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </JourneyCard>
    );
  }

  // ---- Single workspace --------------------------------------------------
  const app = data.application;
  if (!app) return <Empty title={t("awNotFound")} />;

  const sections = [...new Set([...SECTION_ORDER, ...data.requirements.map((item) => item.section)])].map((key) => ({
    key,
    label: t.has(`awRequirementGroups.${key}` as never) ? t(`awRequirementGroups.${key}` as never) : key,
    items: data.requirements.filter((r) => r.section === key),
  })).filter((s) => s.items.length > 0);
  const visibleSections = sections.filter((section) => tab === "requirements" || tabForSection(section.key) === tab);
  const stillPreparing = applicationPhase(app) === "preparing";
  const firstRequired = data.progress.missing.find((item) => item.isRequired);
  const pendingRequests = data.recommendations.some((request) => request.status !== "submitted");
  const checklistUrl = app.portalUrl && /^https?:\/\//i.test(app.portalUrl) ? app.portalUrl : null;
  const deadlines = [
    ...(app.deadline ? [{ key: "application", title: t("awAppDeadline"), date: app.deadline, completed: Boolean(app.submittedAt) }] : []),
    ...data.deadlines.map((item) => ({ key: String(item.id), title: item.title, date: item.dueDate, completed: false })),
    ...(data.offer?.responseDeadline ? [{ key: "response", title: t("opRespondBy"), date: data.offer.responseDeadline, completed: false }] : []),
    ...(data.offer?.depositDueDate ? [{ key: "deposit", title: t("opDepositDue"), date: data.offer.depositDueDate, completed: false }] : []),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const tabTotals = (value: PrepTab) => data.progress.sections
    .filter((section) => tabForSection(section.key) === value)
    .reduce((counts, section) => ({ done: counts.done + section.done, total: counts.total + section.total }), { done: 0, total: 0 });

  const workspaceLinks = (items: readonly WorkspaceSection[]) => items.map((key) => (
    <Button
      key={key}
      variant={tab === key ? "secondary" : "ghost"}
      aria-current={tab === key ? "page" : undefined}
      className="min-h-11 w-full justify-start whitespace-normal text-left"
      onClick={() => selectTab(key)}
    >
      <span className="min-w-0 flex-1 break-words">{tabLabel(key)}</span>
      {key in SECTION_KEYS && (() => {
        const counts = tabTotals(key as PrepTab);
        return counts.total > 0 ? <span className="text-xs tabular-nums">{counts.done}/{counts.total}</span> : null;
      })()}
    </Button>
  ));

  return (
    <div className="space-y-4">
      <JourneyCard tone="hero">
        <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <Button size="sm" variant="ghost" onClick={() => onSelect(0)} className="mb-1 min-h-11 px-0 text-indigo-700 dark:text-indigo-300">
              <ArrowLeft className="size-4" aria-hidden />{t("awAllWorkspaces")}
            </Button>
            <h2 ref={titleRef} tabIndex={-1} className="break-words text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">{app.universityName}</h2>
            <p className="mt-1 break-words text-sm text-slate-600 dark:text-slate-300">
              {[app.programName, app.applicationRound, app.intakeTerm].filter(Boolean).join(" · ") || ta("noProgram")}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <Pill tone={app.submittedAt ? "info" : "brand"}>{statusLabel(app.status)}</Pill>
              {app.deadline ? <time dateTime={app.deadline}>{t("awDeadlineLabel")} {formatDate(app.deadline)}</time> : <span>{ta("trackerNoDate")}</span>}
              {app.deadline && stillPreparing && <Pill tone={toneForDays(applicationDaysTo(app.deadline))}>{dayText(app.deadline)}</Pill>}
            </div>
          </div>
          <div className="w-fit max-w-full rounded-surface border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            {app.submittedAt ? <Pill tone="info">{t("recStatusSubmitted")}</Pill> : data.progress.total ? (
              <ProgressRing pct={data.progress.pct} size={65} strokeWidth={6} tone={data.progress.pct === 100 ? "good" : "brand"}
                label={t("awProgressLabel")} caption={t("awReqsComplete", { done: data.progress.done, total: data.progress.total })} />
            ) : <p className="text-sm text-slate-600 dark:text-slate-300">{ta("trackerNoProgress")}</p>}
          </div>
        </div>
      </JourneyCard>

      {message && <p role="status" className="rounded-control bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{message}</p>}
      {error && !confirmSubmission && <p role="alert" className="rounded-control bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}
      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(10rem,12rem)_minmax(0,1fr)]">
        <nav className="hidden min-w-0 space-y-1 rounded-surface border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900 xl:block" aria-label={t("awTabsAria")}>
          {workspaceLinks(["overview"])}
          <p className="px-3 pt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">{t("awPrepareGroup")}</p>
          {workspaceLinks(PREP_TABS)}
          <p className="px-3 pt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">{t("awFinishGroup")}</p>
          {workspaceLinks(FINAL_TABS)}
        </nav>
        <div className="rounded-surface border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 xl:hidden">
          <Field label={t("awTabsAria")}>
            <select className={`${inputClass} min-h-11`} value={tab} onChange={(event) => selectTab(event.target.value as WorkspaceSection)}>
              <option value="overview">{tabLabel("overview")}</option>
              <optgroup label={t("awPrepareGroup")}>{PREP_TABS.map((key) => <option key={key} value={key}>{tabLabel(key)}</option>)}</optgroup>
              <optgroup label={t("awFinishGroup")}>{FINAL_TABS.map((key) => <option key={key} value={key}>{tabLabel(key)}</option>)}</optgroup>
            </select>
          </Field>
        </div>
        <div className="min-w-0">
          {tab === "overview" && (
            <div className="space-y-4">
              <JourneyCard title={t("awNextStep")}>
                <div className="grid gap-3 lg:grid-cols-2">
                  <section className="min-w-0 space-y-2 rounded-surface bg-slate-50 p-3 dark:bg-slate-800/60">
                    {app.status === "withdrawn" ? <p className="text-sm">{ta("result.withdrawn")}</p> : !stillPreparing ? (
                      <>
                        <h3 className="font-semibold">{t("awFollowDecision")}</h3>
                        <Button size="sm" variant="secondary" onClick={() => selectTab("decision")}>{tabLabel("decision")}<ArrowRight className="size-4" aria-hidden /></Button>
                      </>
                    ) : firstRequired ? (
                      <>
                        <h3 className="break-words font-semibold">{firstRequired.title}</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-300">{tabLabel(tabForSection(firstRequired.section))}</p>
                        <Button size="sm" variant="secondary" onClick={() => openRequirement(firstRequired.section, firstRequired.key)}>{t("awOpenItem")}<ArrowRight className="size-4" aria-hidden /></Button>
                      </>
                    ) : (
                      <>
                        <h3 className="font-semibold">{t(data.readyToSubmit ? "awReviewSubmission" : pendingRequests ? "awOutstandingRequests" : "awReviewRequirements")}</h3>
                        <Button size="sm" variant="secondary" onClick={() => selectTab(data.readyToSubmit ? "submission" : pendingRequests ? "recommendations" : "requirements")}>{tabLabel(data.readyToSubmit ? "submission" : pendingRequests ? "recommendations" : "requirements")}<ArrowRight className="size-4" aria-hidden /></Button>
                      </>
                    )}
                  </section>
                  <section className="min-w-0 space-y-2 rounded-surface bg-slate-50 p-3 dark:bg-slate-800/60">
                    <h3 className="font-semibold">{t("awReadiness")}</h3>
                    {app.submittedAt ? <Pill tone="info">{t("recStatusSubmitted")}</Pill> : data.readyToSubmit ? <Pill tone="good">{t("awReady")}</Pill> : (
                      <>
                        <Pill tone="warn">{t("awNotReady")}</Pill>
                        {data.progress.blockers.length > 0 && <p className="text-sm text-slate-600 dark:text-slate-300">{t("awOpenBlockers", { count: data.progress.blockers.length })}</p>}
                      </>
                    )}
                    <div><Button size="sm" variant="outline" onClick={() => selectTab("submission")}>{t("awSubmitTitle")}</Button></div>
                  </section>
                </div>
              </JourneyCard>
              <JourneyCard title={t("awStandTitle")}>
                <div className="grid gap-2 sm:grid-cols-2">
                  {PREP_TABS.map((key) => {
                    const counts = tabTotals(key);
                    const percent = counts.total ? Math.round(counts.done / counts.total * 100) : null;
                    return (
                      <Button key={key} variant="outline" className="items-stretch flex-col !gap-2 p-3 text-left" onClick={() => selectTab(key)}>
                        <span className="flex items-center justify-between gap-2"><span className="min-w-0 break-words">{tabLabel(key)}</span><ArrowRight className="size-4 shrink-0 text-indigo-600 dark:text-indigo-300" aria-hidden /></span>
                        <span className="text-xs font-normal text-slate-600 dark:text-slate-300">{percent == null ? ta("trackerNoProgress") : t("awReqsDone", counts)}</span>
                        {percent != null && <span aria-hidden className="block h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                          <span className={`block h-full rounded-full ${percent === 100 ? "bg-emerald-500" : "bg-indigo-500"}`} style={{ width: `${percent}%` }} />
                        </span>}
                      </Button>
                    );
                  })}
                </div>
              </JourneyCard>
              <JourneyCard title={tabLabel("deadlines")} action={<Button size="sm" variant="outline" onClick={() => selectTab("deadlines")}>{t("awViewDates")}</Button>}>
                <p className="text-sm text-slate-600 dark:text-slate-300">{app.deadline ? <time dateTime={app.deadline}>{formatDate(app.deadline)}</time> : ta("trackerNoDate")}</p>
              </JourneyCard>
            </div>
          )}
      {/* ---- Requirements / grouped sections ------------------------------ */}
      {tab in SECTION_KEYS && (
        <JourneyCard
          title={tabLabel(tab)}
          subtitle={t("awReqsTabSubtitle")}
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                setBusy(true);
                try {
                  const response=await fetch("/api/requirements", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ profileId, applicationId: app.id }),
                  });
                  const result=await response.json().catch(()=>({}));
                  if(!response.ok)throw new Error(result.error||t("awLoadError"));
                  await reload();
                } catch(error) {
                  setError(error instanceof Error?error.message:t("awLoadError"));
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
            >
              <RefreshCw className="h-3.5 w-3.5" />{t("awRefresh")}</Button>
          }
        >
          <div className="space-y-4">
            {visibleSections.map((s) => (
              <div key={s.key}>
                <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {s.label}
                </h3>
                <ul className="space-y-1.5">
                  {s.items.map((r) => (
                    <li
                      key={r.id}
                      id={`${panelId}-req-${r.id}`}
                      tabIndex={-1}
                      className="flex flex-wrap items-start gap-3 rounded-control border border-slate-200 bg-slate-50/70 px-3 py-2 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:border-slate-700 dark:bg-slate-800/40"
                    >
                      <Button variant="unstyled"
                        type="button"
                        disabled={busy||r.itemKey==="published.requirement_group"}
                        onClick={() => patchRequirement(r.id, r.status === "done" ? "todo" : "done")}
                        aria-label={r.itemKey==="published.requirement_group"?t("awDerivedPolicy"):t(r.status === "done" ? "awMarkNotDoneAria" : "awMarkDoneAria", { title: r.title })}
                        title={r.itemKey==="published.requirement_group"?t("awDerivedPolicy"):undefined}
                        className={`mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-control border ${
                          r.status === "done"
                            ? "border-emerald-500 bg-emerald-700 text-white sb-ink-on-bright"
                            : r.status === "not_required"
                              ? "border-slate-300 bg-slate-100 dark:bg-slate-700"
                              : "border-slate-300 dark:border-slate-600"
                        }`}
                      >
                        {r.status === "done" && <Check className="size-4" aria-hidden />}
                        {r.status === "not_required" && <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />}
                      </Button>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-medium ${
                            r.status === "done" ? "text-slate-500 line-through" : "text-slate-800 dark:text-slate-100"
                          }`}
                        >
                          {r.title}
                          {!r.isRequired && <span className="ml-1 text-xs font-normal uppercase text-slate-500">{t("awOptional")}</span>}
                        </p>
                        {r.instructions && <p className="whitespace-pre-line text-sm text-slate-500 dark:text-slate-400">{r.instructions}</p>}
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <SourceTag
                            url={r.sourceUrl}
                            name={r.sourceName}
                            lastVerified={r.lastVerifiedAt}
                            verificationStatus={r.verificationStatus}
                          />
                          {r.dueDate && (
                            <Pill tone={toneForDays(applicationDaysTo(r.dueDate))}>{dayText(r.dueDate)}</Pill>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 sm:shrink-0">
                        {r.itemKey !== "published.requirement_group" && r.status !== "done" && r.itemKey !== "published.requirement_group" && r.status !== "not_required" && (
                          <Button size="sm" variant="ghost" disabled={busy} onClick={() => patchRequirement(r.id, "in_progress")}>{t("start")}</Button>
                        )}
                        {r.status !== "not_required" && (
                          <Button size="sm" variant="ghost" disabled={busy} onClick={() => patchRequirement(r.id, "not_required")}>{t("awNA")}</Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {visibleSections.length === 0 && <Empty title={t("awNoReqs")} hint={t("awNoReqsHint")} />}
            {tab === "documents" && <WorkspaceList title={t("awDocumentsSaved")} empty={t("awNoDocuments")} rows={data.documents.map((d) => `${d.title} · ${d.docType} · ${d.status}${d.expiresAt ? ` · ${t("awExpires", { date: d.expiresAt })}` : ""}`)} onOpen={() => onNavigateTab("materials/documents")} action={t("awManageDocuments")} />}
            {tab === "essays" && <WorkspaceList title={t("awEssaysSaved")} empty={t("awNoEssays")} rows={data.essays.map((e) => `${e.title} · ${e.essayType} · ${e.wordCount} words · v${e.versionNumber}`)} onOpen={() => onNavigateTab("materials/essays")} action={t("awOpenEssayStudio")} />}
            {tab === "recommendations" && <WorkspaceList title={t("awRecommendationsSaved")} empty={t("awNoRecommendations")} rows={data.recommendations.map((r) => `${r.recommenderName} · ${r.relationship ?? "—"} · ${r.status}${r.dueDate ? ` · ${r.dueDate}` : ""}`)} onOpen={() => onNavigateTab("materials/essays")} action={t("awManageRecommendations")} />}
            {tab === "tests" && <WorkspaceList title={t("awTestsSaved")} empty={t("awNoTests")} rows={data.tests.map((test) => `${test.testType.toUpperCase()} · ${test.currentScore ?? "—"} → ${test.targetScore ?? "—"}${test.targetDate ? ` · ${test.targetDate}` : ""}`)} onOpen={() => onNavigateTab("study-plan/tests")} action={t("awOpenTestPlanner")} />}
            {tab === "finance" && <WorkspaceList title={t("awFinanceSaved")} empty={t("awNoFinance")} rows={data.finance.map((f) => `${f.name} · ${f.kind} · $${f.amountUsd.toLocaleString()} · ${f.status}`)} onOpen={() => onNavigateTab("funding")} action={t("awOpenFinancialPlan")} />}
          </div>
        </JourneyCard>
      )}

      {/* ---- Deadlines + reverse planning -------------------------------- */}
      {tab === "deadlines" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <JourneyCard title={t("tabDeadlines")} subtitle={t("awDeadlinesSubtitle")}>
            {deadlines.length === 0 ? (
              <Empty title={t("awNoDates")} hint={t("awNoDatesHint")} />
            ) : (
              <ol className="ml-1 border-l-2 border-slate-200 pl-4 dark:border-slate-700">
                {deadlines.map((deadline) => (
                  <li key={deadline.key} className="relative flex min-w-0 flex-wrap items-start justify-between gap-2 py-2 text-sm before:absolute before:-left-[21px] before:top-4 before:size-2 before:rounded-full before:bg-indigo-500">
                    <div className="min-w-0">
                      <p className="break-words font-semibold text-slate-900 dark:text-white">{deadline.title}</p>
                      <time className="text-slate-600 dark:text-slate-300" dateTime={deadline.date}>{formatDate(deadline.date)}</time>
                    </div>
                    {deadline.completed ? <Pill tone="info">{t("recStatusSubmitted")}</Pill> : <Pill tone={toneForDays(applicationDaysTo(deadline.date))}>{dayText(deadline.date)}</Pill>}
                  </li>
                ))}
              </ol>
            )}
          </JourneyCard>
          <JourneyCard title={t("awReverseTitle")} subtitle={t("awReverseSubtitle")}>
            {data.reversePlan.length === 0 ? (
              <Empty title={t("awAddDeadlineFirst")} hint={t("awAddDeadlineHint")} />
            ) : (
              <ul className="space-y-2">
                {data.reversePlan.map((step) => (
                  <li key={step.key} className="flex min-w-0 flex-col gap-2 rounded-control border border-slate-200 p-3 text-sm dark:border-slate-700 sm:flex-row sm:items-start">
                    <span className="min-w-0 flex-1 break-words text-slate-700 dark:text-slate-200">
                      {t(`awReverseStep.${step.key}` as never)}
                    </span>
                    <Pill tone="slate" className="max-w-full whitespace-normal">{t("awReverseUnscheduled")}</Pill>
                  </li>
                ))}
              </ul>
            )}
          </JourneyCard>
        </div>
      )}

      {/* ---- Submission (spec §22) --------------------------------------- */}
      {tab === "submission" && (
        <JourneyCard
          title={t("awSubmitTitle")}
          subtitle={t("awSubmitSubtitle")}
        >
          <ul className="mb-4 divide-y divide-slate-200 dark:divide-slate-700">
            {data.submissionChecklist.map((item) => {
              const section = item.key === "fee" ? "requirements" : item.key as PrepTab;
              return (
                <li key={item.key} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span className="min-w-0 break-words font-medium text-slate-800 dark:text-slate-100">{t(`awChecklist.${item.key}` as never)}</span>
                  {item.ok ? <Pill tone="good"><Check className="size-3" aria-hidden />{t("awChecked")}</Pill> : <Button
                    size="sm" variant="outline" onClick={() => item.key === "fee" ? openRequirement("application", "application.fee") : selectTab(section)}
                  >{t("awOpenItem")}<ArrowRight className="size-3.5" aria-hidden /></Button>}
                </li>
              );
            })}
          </ul>

          {app.submittedAt ? (
            <div className="rounded-surface border border-emerald-300 bg-emerald-50 px-3 py-3 text-sm dark:border-emerald-800 dark:bg-emerald-950/40">
              <p className="font-bold text-emerald-700 dark:text-emerald-300">{t("awSubmittedOn", { date: formatDate(app.submittedAt) })}</p>
              <p className="mt-0.5 text-sm text-emerald-800 dark:text-emerald-300">{t("awConfirmationNote")}</p>
              <p className="mt-2 text-sm leading-relaxed text-emerald-900 dark:text-emerald-100">{t("awPostSubmitPortal")}</p>
            </div>
          ) : (
            <>
              <Button variant="success" disabled={busy || !data.readyToSubmit || !stillPreparing}
                onClick={() => setConfirmSubmission(true)}
                title={data.readyToSubmit ? t("awMarkSubmittedTitle") : t("awMarkSubmittedTitleBlocked")}>
                <Lock className="size-4" aria-hidden />{t("awMarkSubmittedBtn")}
              </Button>
              {!data.readyToSubmit && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t("awReviewRequirements")}</p>}
            </>
          )}

          {checklistUrl && (
            <a href={checklistUrl} target="_blank" rel="noopener noreferrer"
              className="mt-2 flex min-h-11 w-fit items-center gap-1.5 text-sm font-semibold text-indigo-700 underline dark:text-indigo-300">
              <ExternalLink className="size-4" aria-hidden />{t("awPortalLink")}
            </a>
          )}
        </JourneyCard>
      )}

      {/* ---- Decision (spec §23) ----------------------------------------- */}
      {tab === "decision" && (
        <JourneyCard title={t("tabDecision")} subtitle={t("awDecisionSubtitle")}>
          {data.offer ? (
            <div className="mb-4 space-y-3">
              <Pill tone={data.offer.status === "accepted" ? "good" : data.offer.status === "pending" ? "warn" : "slate"}>
                {t(`opStatus_${data.offer.status}` as never)}
              </Pill>
              <dl className="grid gap-2 sm:grid-cols-2">
                {[
                  [t("opDecidedOn"), data.offer.decidedAt ? formatDate(data.offer.decidedAt) : null],
                  [t("opRespondBy"), data.offer.responseDeadline ? formatDate(data.offer.responseDeadline) : null],
                  [t("opDepositAmount"), data.offer.depositAmount == null ? null : format.number(data.offer.depositAmount, { style: "currency", currency: "USD" })],
                  [t("opDepositDue"), data.offer.depositDueDate ? formatDate(data.offer.depositDueDate) : null],
                  [t("opTuitionCommitment"), data.offer.tuitionCommitment == null ? null : format.number(data.offer.tuitionCommitment, { style: "currency", currency: "USD" })],
                ].filter(([, value]) => value != null).map(([label, value]) => (
                  <div key={label} className="min-w-0 rounded-control bg-slate-50 p-3 dark:bg-slate-800/60">
                    <dt className="text-sm text-slate-600 dark:text-slate-300">{label}</dt>
                    <dd className="break-words font-semibold tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
              {data.offer.status === "accepted" && <p className="text-sm text-slate-600 dark:text-slate-300">{t("awAcceptedNote")}</p>}
              <Button variant="outline" onClick={() => onNavigateTab("offers")}>{t("awOpenOffers")}</Button>
            </div>
          ) : <Empty title={t("awNoDecision")} hint={t("awNoDecisionHint")} />}
          <details open={!data.offer} className="rounded-surface border border-slate-200 p-3 dark:border-slate-700">
            <summary className="cursor-pointer text-sm font-bold text-indigo-700 dark:text-indigo-300">{data.offer ? t("awEditDecision") : t("awRecordDecision")}</summary>
            <form onSubmit={saveOffer} className="mt-3 grid gap-2 sm:grid-cols-2">
              <label className="text-sm font-semibold">{t("opStatus")}<select name="status" defaultValue={data.offer?.status ?? "pending"} className="mt-1 min-h-11 w-full rounded-surface border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">{["pending", "accepted", "waitlisted", "deferred", "rejected"].map((s) => <option key={s} value={s}>{t(`opStatus_${s}` as never)}</option>)}</select></label>
              <label className="text-sm font-semibold">{t("opRespondBy")}<input name="responseDeadline" type="date" defaultValue={data.offer?.responseDeadline ?? ""} className="mt-1 min-h-11 w-full rounded-surface border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" /></label>
              <label className="text-sm font-semibold">{t("opDecidedOn")}<input name="decidedAt" type="date" defaultValue={data.offer?.decidedAt ?? ""} className="mt-1 min-h-11 w-full rounded-surface border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" /></label>
              <label className="text-sm font-semibold">{t("opDepositAmount")}<input name="depositAmount" type="number" min="0" step="1" defaultValue={data.offer?.depositAmount ?? ""} className="mt-1 min-h-11 w-full rounded-surface border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" /></label>
              <label className="text-sm font-semibold">{t("opDepositDue")}<input name="depositDueDate" type="date" defaultValue={data.offer?.depositDueDate ?? ""} className="mt-1 min-h-11 w-full rounded-surface border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" /></label>
              <label className="text-sm font-semibold">{t("opTuitionCommitment")}<input name="tuitionCommitment" type="number" min="0" step="1" defaultValue={data.offer?.tuitionCommitment ?? ""} className="mt-1 min-h-11 w-full rounded-surface border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" /></label>
              <Button type="submit" disabled={busy} className="sm:col-span-2">{t("opSaveOffer")}</Button>
            </form>
          </details>
        </JourneyCard>
      )}
        </div>
      </div>
      {confirmSubmission && <PanelDialog title={t("awMarkSubmittedBtn")} busy={busy} error={error ?? undefined} onClose={() => setConfirmSubmission(false)}>
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void markSubmitted(); }}>
          <label className="flex min-h-11 items-start gap-2 text-sm">
            <input type="checkbox" required className="mt-0.5 size-5 shrink-0 accent-indigo-600" />
            {t("awConfirmPortalSubmit")}
          </label>
          <Button type="submit" variant="success" disabled={busy}>{t("awMarkSubmittedBtn")}</Button>
        </form>
      </PanelDialog>}
    </div>
  );
}

function WorkspaceList({ title, empty, rows, onOpen, action }: { title: string; empty: string; rows: string[]; onOpen: () => void; action: string }) {
  return (
    <div className="mt-4 rounded-surface border border-slate-200 p-3 dark:border-slate-700 dark:bg-slate-900">
      <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">{title}</h3>
      {rows.length ? <ul className="mt-2 space-y-1">{rows.map((row, i) => <li key={`${row}-${i}`} className="rounded-control bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">{row}</li>)}</ul> : <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{empty}</p>}
      <Button size="sm" variant="outline" className="mt-3" onClick={onOpen}>{action}</Button>
    </div>
  );
}
