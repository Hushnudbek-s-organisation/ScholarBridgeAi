"use client";

/**
 * ApplicationWorkspacePanel — spec §6 + §22.
 *
 * One workspace per university with ten tabs, a progress bar that every
 * requirement feeds automatically, and a final submission checklist that
 * refuses to mark an application t("recStatusSubmitted") while required items are open.
 */
import React, { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Check, ExternalLink, Lock, RefreshCw } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { SectionTransition } from "@/components/motion";
import { Button, Empty, JourneyCard, Loading, Pill, ProgressBar, SourceTag, daysLabel, toneForDays } from "./ui";

interface WorkspaceData {
  tabs: { id: string; label: string; icon: string }[];
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
  workspaces: {
    id: number;
    universityName: string;
    programName: string | null;
    deadline: string | null;
    status: string;
    submittedAt: string | null;
    progressPct: number;
    done: number;
    total: number;
  }[];
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
  const reduceMotion = useReducedMotion();
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // `load` never touches `loading` itself: the mount effect calls it with no
  // state write (react-hooks/set-state-in-effect), and the explicit refresh
  // paths go through `reload` below.
  // Loader without state writes, so the mount effect stays lint-clean while
  // `reload` can still drive an explicit refresh.
  const load = useCallback(async () => {
    const qs = new URLSearchParams({ profileId: String(profileId) });
    if (applicationId) qs.set("applicationId", String(applicationId));
    const res = await fetch(`/api/workspace?${qs}`, { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || t("awLoadError"));
    return json as WorkspaceData;
  }, [profileId, applicationId, t]);

  const reload = useCallback(async () => {
    setLoading(true);
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

  const patchRequirement = async (id: number, status: string) => {
    setBusy(true);
    setMessage(null);
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
    if (!data?.application) return;
    setBusy(true);
    setMessage(null);
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
      setMessage(t("awMarkedSubmitted"));
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

  // ---- List mode ---------------------------------------------------------
  if (!applicationId) {
    return (
      <JourneyCard
        title={t("awListTitle")}
        subtitle={t("awListSubtitle")}
      >
        {data.workspaces.length === 0 ? (
          <Empty
            title={t("awEmptyTitle")}
            hint={t("awEmptyHint")}
            action={<Button onClick={() => onNavigateTab("applications")}>{t("ceStartApplication")}</Button>}
          />
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {data.workspaces.map((w) => (
              <li key={w.id}>
                <button
                  type="button"
                  onClick={() => onSelect(w.id)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-left transition hover:border-indigo-300 hover:bg-indigo-50/40 dark:border-slate-700 dark:hover:border-indigo-700"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 break-words text-sm font-semibold text-slate-900 dark:text-white">
                      {w.universityName || t("awUniversityFallback")}
                    </span>
                    {w.submittedAt ? (
                      <Pill tone="good">{t("recStatusSubmitted")}</Pill>
                    ) : w.deadline ? (
                      <Pill tone={toneForDays(daysTo(w.deadline))}>{daysTo(w.deadline)}d</Pill>
                    ) : null}
                  </div>
                  {w.programName && <p className="break-words text-[11px] text-slate-500">{w.programName}</p>}
                  <div className="mt-2">
                    <ProgressBar pct={w.progressPct} size="sm" tone={w.progressPct >= 100 ? "good" : "brand"} />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {w.submittedAt ? t("recStatusSubmitted") : t("awReqsDone", { done: w.done, total: w.total })}
                  </p>
                </button>
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

  const sections = SECTION_ORDER.map((key) => ({
    key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
    items: data.requirements.filter((r) => r.section === key),
  })).filter((s) => s.items.length > 0);
  const sectionKeys: Record<string, string[]> = {
    requirements: SECTION_ORDER,
    documents: ["documents"], essays: ["essays"], recommendations: ["recommendations"],
    tests: ["english", "testing"], finance: ["finance"],
  };
  const visibleSections = sections.filter((s) => sectionKeys[tab]?.includes(s.key));

  return (
    <div className="space-y-4">
      <JourneyCard>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => onSelect(0)}
              className="mb-1 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <ArrowLeft className="h-3 w-3" />{t("awAllWorkspaces")}</button>
            <h2 className="break-words text-lg font-extrabold text-slate-900 dark:text-white sm:text-xl">{app.universityName}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {[app.programName, app.applicationRound, app.intakeTerm].filter(Boolean).join(" · ")}
            </p>
            {app.deadline && (
              <p className="mt-1 break-words text-xs font-semibold text-slate-600 dark:text-slate-300">
                {t("awDeadlineLabel")} {app.deadline} · {daysLabel(daysTo(app.deadline))}
              </p>
            )}
          </div>
          <div className="min-w-0 flex-1 sm:min-w-[180px] sm:max-w-xs">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{t("awProgressLabel")}</span>
              <span className="text-lg font-extrabold text-slate-900 dark:text-white">{data.progress.pct}%</span>
            </div>
            <ProgressBar pct={data.progress.pct} size="lg" tone={data.progress.pct >= 100 ? "good" : "brand"} />
            <p className="mt-1 text-[11px] text-slate-500">
              {t("awReqsComplete", { done: data.progress.done, total: data.progress.total })}
            </p>
          </div>
        </div>

        <nav className="mt-4 flex flex-wrap gap-1.5" aria-label={t("awTabsAria")}>
          {data.tabs.map((t) => {
            const sectionProgress = data.progress.sections.find((s) => s.key === t.id);
            const isActive = tab === t.id;
            return (
              <motion.button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-current={isActive ? "true" : undefined}
                whileHover={reduceMotion ? undefined : { y: -1 }}
                whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                className={`relative rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="workspace-tab-pill"
                    className="absolute inset-0 rounded-lg bg-indigo-600"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative">
                  <span aria-hidden>{t.icon}</span> {t.label}
                  {sectionProgress && sectionProgress.total > 0 && (
                    <span className="ml-1 opacity-70">
                      {sectionProgress.done}/{sectionProgress.total}
                    </span>
                  )}
                </span>
              </motion.button>
            );
          })}
        </nav>
      </JourneyCard>

      {message && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{message}</p>}
      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}

      {/* Every tab body fades in place (no vertical travel) so the header and
          the tab strip never jump while switching. */}
      <SectionTransition transitionKey={tab}>
      {/* ---- Overview ---------------------------------------------------- */}
      {tab === "overview" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <JourneyCard title={t("awStandTitle")} subtitle={t("awStandSubtitle")}>
            <ul className="space-y-2">
              {data.progress.sections.map((s) => (
                <li key={s.key}>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200">
                    <span>{s.label}</span>
                    <span>
                      {s.done}/{s.total}
                    </span>
                  </div>
                  <ProgressBar pct={s.pct} size="sm" tone={s.pct >= 100 ? "good" : "brand"} />
                </li>
              ))}
            </ul>
          </JourneyCard>
          <JourneyCard title={t("awMissingTitle")} subtitle={t("awMissingSubtitle")}>
            {data.progress.missing.length === 0 ? (
              <Empty title={t("awNothingMissing")} hint={t("awNothingMissingHint")} />
            ) : (
              <ul className="space-y-1.5">
                {data.progress.missing.slice(0, 10).map((m) => (
                  <li key={`${m.section}-${m.key}`} className="flex items-center gap-2 text-sm">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${m.isRequired ? "bg-rose-400" : "bg-slate-300"}`} aria-hidden />
                    <span className="min-w-0 flex-1 break-words text-slate-700 dark:text-slate-200">{m.title}</span>
                    <Pill tone="slate">{m.section}</Pill>
                  </li>
                ))}
              </ul>
            )}
          </JourneyCard>
        </div>
      )}

      {/* ---- Requirements / grouped sections ------------------------------ */}
      {["requirements", "documents", "essays", "recommendations", "tests", "finance"].includes(tab) && (
        <JourneyCard
          title={t("awReqsTabTitle")}
          subtitle={t("awReqsTabSubtitle")}
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                setBusy(true);
                try {
                  await fetch("/api/requirements", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ profileId, applicationId: app.id }),
                  });
                  await reload();
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
                      className="flex flex-wrap items-start gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700"
                    >
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => patchRequirement(r.id, r.status === "done" ? "todo" : "done")}
                        aria-label={r.status === "done" ? `Mark ${r.title} as not done` : `Mark ${r.title} as done`}
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                          r.status === "done"
                            ? "border-emerald-500 bg-emerald-500 text-white sb-ink-on-bright"
                            : r.status === "not_required"
                              ? "border-slate-300 bg-slate-100 dark:bg-slate-700"
                              : "border-slate-300 dark:border-slate-600"
                        }`}
                      >
                        {r.status === "done" && <Check className="h-3 w-3" />}
                        {r.status === "not_required" && <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-medium ${
                            r.status === "done" ? "text-slate-400 line-through" : "text-slate-800 dark:text-slate-100"
                          }`}
                        >
                          {r.title}
                          {!r.isRequired && <span className="ml-1 text-[10px] font-normal uppercase text-slate-400">{t("awOptional")}</span>}
                        </p>
                        {r.instructions && <p className="text-xs text-slate-500 dark:text-slate-400">{r.instructions}</p>}
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <SourceTag
                            url={r.sourceUrl}
                            name={r.sourceName}
                            lastVerified={r.lastVerifiedAt}
                            verificationStatus={r.verificationStatus}
                          />
                          {r.dueDate && (
                            <Pill tone={toneForDays(daysTo(r.dueDate))}>{daysLabel(daysTo(r.dueDate))}</Pill>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        {r.status !== "done" && r.status !== "not_required" && (
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
            {data.deadlines.length === 0 && !app.deadline ? (
              <Empty title={t("awNoDates")} hint={t("awNoDatesHint")} />
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {app.deadline && (
                  <li className="flex items-center gap-2 py-2 text-sm">
                    <Pill tone={toneForDays(daysTo(app.deadline))}>{daysLabel(daysTo(app.deadline))}</Pill>
                    <span className="flex-1 text-slate-700 dark:text-slate-200">{t("awAppDeadline")}</span>
                    <span className="text-xs text-slate-400">{app.deadline}</span>
                  </li>
                )}
                {data.deadlines.map((d) => (
                  <li key={d.id} className="flex items-center gap-2 py-2 text-sm">
                    <Pill tone={toneForDays(daysTo(d.dueDate))}>{daysLabel(daysTo(d.dueDate))}</Pill>
                    <span className="flex-1 text-slate-700 dark:text-slate-200">{d.title}</span>
                    <span className="text-xs text-slate-400">{d.dueDate}</span>
                  </li>
                ))}
              </ul>
            )}
          </JourneyCard>
          <JourneyCard title={t("awReverseTitle")} subtitle={t("awReverseSubtitle")}>
            {data.reversePlan.length === 0 ? (
              <Empty title={t("awAddDeadlineFirst")} hint={t("awAddDeadlineHint")} />
            ) : (
              <ul className="space-y-2">
                {data.reversePlan.map((step) => (
                  <li key={step.key} className="flex min-w-0 flex-col gap-2 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700 sm:flex-row sm:items-start">
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
          <ul className="mb-4 space-y-2">
            {data.submissionChecklist.map((c) => (
              <li key={c.key} className="flex items-center gap-2 text-sm">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    c.ok ? "bg-emerald-500 text-white sb-ink-on-bright" : "bg-slate-200 text-slate-500 dark:bg-slate-700"
                  }`}
                >
                  {c.ok ? "✓" : ""}
                </span>
                <span className={c.ok ? "text-slate-500 line-through" : "font-medium text-slate-800 dark:text-slate-100"}>
                  {c.label}
                </span>
              </li>
            ))}
          </ul>

          {app.submittedAt ? (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-3 text-sm dark:border-emerald-800 dark:bg-emerald-950/40">
              <p className="font-bold text-emerald-700 dark:text-emerald-300">
                Submitted {new Date(app.submittedAt).toLocaleDateString()}
              </p>
              <p className="mt-0.5 text-xs text-emerald-700/80 dark:text-emerald-300/80">{t("awConfirmationNote")}</p>
            </div>
          ) : (
            <>
              <Button
                variant="success"
                disabled={busy || !data.readyToSubmit}
                onClick={markSubmitted}
                title={data.readyToSubmit ? t("awMarkSubmittedTitle") : t("awMarkSubmittedTitleBlocked")}
              >
                <Lock className="h-3.5 w-3.5" />{t("awMarkSubmittedBtn")}</Button>
              {!data.readyToSubmit && (
                <p className="mt-2 text-xs text-slate-500">
                  Still open: {data.progress.blockers.slice(0, 4).join(", ")}
                  {data.progress.blockers.length > 4 && ` and ${data.progress.blockers.length - 4} more`}
                </p>
              )}
            </>
          )}

          {app.portalUrl && (
            <a
              href={app.portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
            >
              <ExternalLink className="h-3 w-3" />{t("awPortalLink")}</a>
          )}
        </JourneyCard>
      )}

      {/* ---- Decision (spec §23) ----------------------------------------- */}
      {tab === "decision" && (
        <JourneyCard title={t("tabDecision")} subtitle={t("awDecisionSubtitle")}>
          {data.offer ? <div className="mb-3 space-y-2"><Pill tone={data.offer.status === "accepted" ? "good" : data.offer.status === "pending" ? "warn" : "slate"}>{t(`opStatus_${data.offer.status}` as never)}</Pill>{data.offer.status === "accepted" && <p className="text-sm text-slate-600 dark:text-slate-300">{t("awAcceptedNote")}</p>}<Button variant="outline" onClick={() => onNavigateTab("offers")}>{t("awOpenOffers")}</Button></div> : <Empty title={t("awNoDecision")} hint={t("awNoDecisionHint")} />}
          <details open={!data.offer} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <summary className="cursor-pointer text-sm font-bold text-indigo-700 dark:text-indigo-300">{data.offer ? t("awEditDecision") : t("awRecordDecision")}</summary>
            <form onSubmit={saveOffer} className="mt-3 grid gap-2 sm:grid-cols-2">
              <label className="text-xs font-semibold">{t("opStatus")}<select name="status" defaultValue={data.offer?.status ?? "pending"} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">{["pending", "accepted", "waitlisted", "deferred", "rejected"].map((s) => <option key={s} value={s}>{t(`opStatus_${s}` as never)}</option>)}</select></label>
              <label className="text-xs font-semibold">{t("opRespondBy")}<input name="responseDeadline" type="date" defaultValue={data.offer?.responseDeadline ?? ""} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" /></label>
              <label className="text-xs font-semibold">{t("opDecidedOn")}<input name="decidedAt" type="date" defaultValue={data.offer?.decidedAt ?? ""} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" /></label>
              <label className="text-xs font-semibold">{t("opDepositAmount")}<input name="depositAmount" type="number" min="0" step="1" defaultValue={data.offer?.depositAmount ?? ""} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" /></label>
              <label className="text-xs font-semibold">{t("opDepositDue")}<input name="depositDueDate" type="date" defaultValue={data.offer?.depositDueDate ?? ""} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" /></label>
              <label className="text-xs font-semibold">{t("opTuitionCommitment")}<input name="tuitionCommitment" type="number" min="0" step="1" defaultValue={data.offer?.tuitionCommitment ?? ""} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" /></label>
              <Button type="submit" disabled={busy} className="sm:col-span-2">{t("opSaveOffer")}</Button>
            </form>
          </details>
        </JourneyCard>
      )}
      </SectionTransition>
    </div>
  );
}

function WorkspaceList({ title, empty, rows, onOpen, action }: { title: string; empty: string; rows: string[]; onOpen: () => void; action: string }) {
  return (
    <div className="mt-4 rounded-xl border border-slate-200 p-3 dark:border-slate-700 dark:bg-slate-900">
      <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">{title}</h3>
      {rows.length ? <ul className="mt-2 space-y-1">{rows.map((row, i) => <li key={`${row}-${i}`} className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">{row}</li>)}</ul> : <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{empty}</p>}
      <Button size="sm" variant="outline" className="mt-3" onClick={onOpen}>{action}</Button>
    </div>
  );
}

function daysTo(iso: string | null): number | null {
  if (!iso) return null;
  const now = new Date();
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((new Date(`${iso.slice(0, 10)}T00:00:00Z`).getTime() - start) / 86400000);
}
