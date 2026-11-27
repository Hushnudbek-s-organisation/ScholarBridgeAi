"use client";

import { useCallback, useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { ArrowRight, CalendarDays, Plus, Search, Trash2, Trophy } from "lucide-react";
import type { StudentProfile } from "./Navbar";
import { RecLetterPanel } from "./RecLetterPanel";
import { Button } from "@/components/ui/Button";
import { PanelDialog } from "@/components/ui/PanelDialog";
import { Empty, ErrorNote, Field, JourneyCard, Loading, Pill, ProgressBar, daysLabel, inputClass, toneForDays } from "@/components/ui/journey";
import { getJson, sendJson, useResource } from "@/components/journey/useResource";
import { notifyApplicationsChanged } from "@/lib/applicationEvents";
import { announceSchollySubmission } from "@/lib/scholly-client-events";
import { announceSchollyPointsChanged } from "@/lib/scholly-points-client";
import { APPLICATION_DECISIONS, applicationDaysTo, applicationDeadlineOrder, applicationDecision, applicationPhase, type ApplicationDecision, type WorkspaceSummary } from "@/lib/journey/workspace";

const STATUSES = ["not_started", "preparing", "essay", "documents", "recommendations", "fee_paid", "submitted", "interview", "decision", "withdrawn"] as const;
const ROUNDS = ["RD", "ED", "EA", "Rolling", "Winter", "Summer", "Spring"];

const PHASES = [
  { key: "preparing", bar: "bg-indigo-500 dark:bg-indigo-400", tone: "brand" },
  { key: "awaiting", bar: "bg-sky-600 dark:bg-sky-400", tone: "info" },
  { key: "closed", bar: "bg-emerald-600 dark:bg-emerald-400", tone: "good" },
] as const;
const RESULT_TONES = { accepted: "good", rejected: "bad", waitlisted: "warn", deferred: "info", withdrawn: "slate" } as const;
const EMPTY_DATA: TrackerData = { applications: [], workspaces: [], savedUniversities: [] };

interface ApplicationRow {
  id: number;
  universityId: number | null;
  universityName: string;
  programName: string | null;
  applicationRound: string | null;
  intakeTerm: string | null;
  deadline: string | null;
  status: string;
  submittedAt: string | null;
  outcome: { result: ApplicationDecision } | null;
}

interface SavedUniRow {
  id: number;
  universityId: number;
  university?: { name?: string; country?: string } | null;
}

interface TrackerData {
  applications: ApplicationRow[];
  workspaces: WorkspaceSummary[];
  savedUniversities: SavedUniRow[];
}

type Dialog = { type: "add" } | { type: "remove" | "outcome"; row: ApplicationRow };

export function ApplicationCenter({ activeProfile, onOpenWorkspace }: {
  activeProfile: StudentProfile | null;
  onOpenWorkspace?: (id: number) => void;
}) {
  const t = useTranslations("applications");
  const tj = useTranslations("journey");
  const format = useFormatter();
  const locale = useLocale();
  const profileId = activeProfile?.id;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("deadline");
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [result, setResult] = useState<ApplicationDecision>("accepted");

  const load = useCallback(async () => {
    const [tracker, progress, saved] = await Promise.all([
      getJson<Pick<TrackerData, "applications">>(`/api/applications?profileId=${profileId}`, t("loadError"), { noCache: true }),
      getJson<Pick<TrackerData, "workspaces">>(`/api/workspace?profileId=${profileId}`, t("loadError"), { noCache: true }).catch(() => null),
      getJson<Pick<TrackerData, "savedUniversities">>(`/api/saved-universities?profileId=${profileId}`, t("loadError"), { noCache: true }).catch(() => null),
    ]);
    if (!Array.isArray(tracker.applications)) throw new Error(t("loadError"));
    return { applications: tracker.applications, workspaces: progress?.workspaces ?? [], savedUniversities: saved?.savedUniversities ?? [] };
  }, [profileId, t]);

  const { data, loading, error, reload } = useResource(load, [profileId], { initial: EMPTY_DATA, enabled: profileId != null });
  const phase = (row: ApplicationRow) => applicationPhase(row, row.outcome?.result);
  const statusLabel = (status: string) => {
    const decision = applicationDecision(status);
    return decision ? t(`result.${decision}`) : t.has(`status.${status}` as never) ? t(`status.${status}` as never) : t("statusLabel");
  };
  const { applications, workspaces, savedUniversities } = data;
  const byId = new Map(workspaces.map((workspace) => [workspace.id, workspace]));
  const linked = new Set(applications.map((row) => row.universityId));
  const available = savedUniversities.filter((entry) => !linked.has(entry.universityId) && entry.university?.name);
  const counts = { preparing: 0, awaiting: 0, closed: 0 };
  let nearest: ApplicationRow | undefined;
  for (const row of applications) {
    const group = phase(row);
    counts[group]++;
    if (group === "preparing" && row.deadline && (applicationDaysTo(row.deadline) ?? -1) >= 0 &&
      (!nearest?.deadline || row.deadline < nearest.deadline)) nearest = row;
  }
  const search = query.trim().toLocaleLowerCase(locale);
  const matching = applications.filter((row) =>
    (filter === "all" || phase(row) === filter) &&
    `${row.universityName} ${row.programName ?? ""}`.toLocaleLowerCase(locale).includes(search)
  ).sort((a, b) => {
    if (sort === "newest") return b.id - a.id;
    if (sort === "name") return a.universityName.localeCompare(b.universityName, locale) || b.id - a.id;
    return applicationDeadlineOrder(a, phase(a) === "preparing") - applicationDeadlineOrder(b, phase(b) === "preparing") ||
      (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999") || b.id - a.id;
  });

  const nearestSummary = nearest ? byId.get(nearest.id) : undefined;
  const formatDeadline = (date: string) => format.dateTime(new Date(`${date.slice(0, 10)}T00:00:00Z`), { dateStyle: "medium", timeZone: "UTC" });

  const mutate = async (action: () => Promise<void>, fallback: string) => {
    if (busy || profileId == null) return;
    setBusy(true);
    setActionError("");
    setFeedback("");
    try {
      await action();
      await reload();
      notifyApplicationsChanged(profileId);
      setFeedback(t("trackerUpdated"));
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : fallback);
    } finally {
      setBusy(false);
    }
  };

  const create = async (payload: Record<string, unknown>, open: boolean) => {
    await mutate(async () => {
      const saved = await sendJson<{ application?: { id: number }; schollyPointsAwarded?: number }>("/api/applications", {
        method: "POST", body: JSON.stringify({ profileId, ...payload }),
      }, t("addError"));
      if (profileId != null && typeof saved.schollyPointsAwarded === "number") announceSchollyPointsChanged(profileId, saved.schollyPointsAwarded);
      setDialog(null);
      if (open && saved.application?.id) onOpenWorkspace?.(saved.application.id);
      else {
        setQuery("");
        setFilter("all");
        setSort("newest");
      }
    }, t("addError"));
  };

  const setStatus = async (row: ApplicationRow, status: string) => {
    await mutate(async () => {
      const saved = await sendJson<{ application?: ApplicationRow; schollyPointsAwarded?: number }>("/api/applications", {
        method: "PATCH", body: JSON.stringify({ id: row.id, status }),
      }, t("statusError"));
      if (profileId != null && typeof saved.schollyPointsAwarded === "number") announceSchollyPointsChanged(profileId, saved.schollyPointsAwarded);
      if (profileId != null && !row.submittedAt && row.status !== "submitted" && saved.application?.status === "submitted" && saved.application.submittedAt) {
        announceSchollySubmission(profileId, row.id);
      }
    }, t("statusError"));
  };

  const openDialog = (next: Dialog) => {
    setActionError("");
    setResult("accepted");
    setDialog(next);
  };

  if (profileId == null) return <Empty title={t("trackerSignIn")} />;

  return (
    <div className="space-y-4">
      {feedback && <p role="status" className="rounded-control bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">{feedback}</p>}
      {actionError && !dialog && <div role="alert"><ErrorNote message={actionError} /></div>}
      {error && <div className="space-y-2" role="alert"><ErrorNote message={error} /><Button variant="outline" onClick={() => void reload()}>{tj("awTryAgain")}</Button></div>}

      {!error && (!loading || applications.length > 0) && (
        <JourneyCard tone="hero" title={t("trackerOverview")}>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <div className="min-w-0 space-y-3">
              <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[{ label: t("trackerTotal"), value: applications.length }, ...PHASES.map(({ key }) => ({ label: t(`trackerPhases.${key}`), value: counts[key] }))].map(({ label, value }) => (
                  <div key={label} className="min-w-0 rounded-surface border border-slate-200 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-900">
                    <dt className="break-words text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</dt>
                    <dd className="text-xl font-extrabold tabular-nums text-slate-900 dark:text-white">{value}</dd>
                  </div>
                ))}
              </dl>
              {applications.length > 0 && <div className="flex h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700" aria-hidden>
                {PHASES.map(({ key, bar }) => <span key={key} className={bar} style={{ width: `${counts[key] / applications.length * 100}%` }} />)}
              </div>}
            </div>
            <section className="min-w-0 space-y-2 rounded-surface border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
              <h3 className="flex items-center gap-2 text-sm font-bold"><CalendarDays aria-hidden className="size-4 shrink-0 text-indigo-600 dark:text-indigo-300" />{t("trackerNearest")}</h3>
              {nearest?.deadline ? (
                <>
                  <p className="break-words font-semibold text-slate-900 dark:text-white">{nearest.universityName}</p>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <time dateTime={nearest.deadline}>{formatDeadline(nearest.deadline)}</time>
                    <Pill tone={toneForDays(applicationDaysTo(nearest.deadline))}>{daysLabel(applicationDaysTo(nearest.deadline), locale)}</Pill>
                  </div>
                  {nearestSummary && nearestSummary.blockers > 0 && <p className="text-sm text-slate-600 dark:text-slate-300">{t("trackerOpenItems", { count: nearestSummary.blockers })}</p>}
                  {onOpenWorkspace && <Button size="sm" variant="secondary" onClick={() => onOpenWorkspace(nearest.id)}>{t("openWorkspace")}<ArrowRight aria-hidden className="size-4" /></Button>}
                </>
              ) : <p className="text-sm text-slate-600 dark:text-slate-300">{t("trackerNoNearest")}</p>}
            </section>
          </div>
        </JourneyCard>
      )}

      <JourneyCard title={t("title")} action={<Button onClick={() => openDialog({ type: "add" })} disabled={busy}><Plus aria-hidden className="size-4" />{t("add")}</Button>}>
        {loading && applications.length === 0 ? <Loading label={t("loading")} /> : !error && applications.length === 0 ? <Empty title={t("empty")} /> : applications.length > 0 && (
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]">
              <Field label={t("trackerSearch")}><span className="relative block"><Search aria-hidden className="pointer-events-none absolute left-3 top-3.5 size-4 text-slate-500" /><input type="search" className={`${inputClass} min-h-11 pl-9`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("trackerSearchHint")} /></span></Field>
              <Field label={t("trackerFilter")}><select value={filter} className={`${inputClass} min-h-11`} onChange={(e) => setFilter(e.target.value)}><option value="all">{t("trackerAll")}</option>{PHASES.map(({ key }) => <option key={key} value={key}>{t(`trackerPhases.${key}`)}</option>)}</select></Field>
              <Field label={t("trackerSort")}><select value={sort} className={`${inputClass} min-h-11`} onChange={(e) => setSort(e.target.value)}><option value="deadline">{t("trackerSortDeadline")}</option><option value="newest">{t("trackerSortNewest")}</option><option value="name">{t("trackerSortName")}</option></select></Field>
            </div>
            <p role="status" className="text-sm text-slate-600 dark:text-slate-300">{t("trackerCount", { count: matching.length })}</p>
            {matching.length ? (
              <ul className="space-y-2">
                {matching.map((row) => {
                  const workspace = byId.get(row.id);
                  const currentPhase = PHASES.find(({ key }) => key === phase(row))!;
                  const knownDecision = applicationDecision(row.status);
                  const days = applicationDaysTo(row.deadline);
                  const canReport = !row.outcome && !knownDecision && Boolean(row.submittedAt || ["submitted", "interview", "decision"].includes(row.status));
                  return (
                    <li key={row.id} className="min-w-0 rounded-surface border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                      <div className="grid min-w-0 grid-cols-2 items-start gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,.8fr)_minmax(0,1fr)_auto] lg:items-center">
                        <div className="col-span-2 min-w-0 lg:col-span-1">
                          <h3 className="break-words font-bold text-slate-900 dark:text-white">{row.universityName}</h3>
                          <p className="mt-0.5 break-words text-sm text-slate-600 dark:text-slate-300">{[row.programName, row.applicationRound, row.intakeTerm].filter(Boolean).join(" · ") || t("noProgram")}</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <Pill tone={knownDecision ? RESULT_TONES[knownDecision] : currentPhase.tone}>{statusLabel(row.status)}</Pill>
                            {row.outcome && !knownDecision && <Pill tone={RESULT_TONES[row.outcome.result]}>{t(`result.${row.outcome.result}`)}</Pill>}
                          </div>
                        </div>
                        <div className="space-y-1 text-sm">
                          <p className="text-slate-600 dark:text-slate-300">{t("formDeadline")}</p>
                          <p className="break-words font-semibold">{row.deadline ? <time dateTime={row.deadline}>{formatDeadline(row.deadline)}</time> : t("trackerNoDate")}</p>
                          {row.deadline && currentPhase.key === "preparing" && <Pill tone={toneForDays(days)}>{daysLabel(days, locale)}</Pill>}
                        </div>
                        <div className="min-w-0 space-y-1.5 text-sm">
                          {row.submittedAt ? <Pill tone="info">{tj("recStatusSubmitted")}</Pill> : workspace?.total ? <>
                            <p className="flex flex-wrap justify-between gap-x-2 text-slate-600 dark:text-slate-300"><span>{tj("awReqsDone", { done: workspace.done, total: workspace.total })}</span><strong className="tabular-nums">{workspace.progressPct}%</strong></p>
                            <ProgressBar pct={workspace.progressPct} size="sm" tone={workspace.progressPct === 100 ? "good" : "brand"} animate={false} />
                          </> : <p className="text-slate-600 dark:text-slate-300">{t("trackerNoProgress")}</p>}
                        </div>
                        {onOpenWorkspace && <Button size="sm" variant="secondary" className="col-span-2 justify-self-start lg:col-span-1 lg:justify-self-end" onClick={() => onOpenWorkspace(row.id)}>{t("openWorkspace")}<ArrowRight aria-hidden className="size-4" /></Button>}
                      </div>
                      <details className="mt-1">
                        <summary className="min-h-11 cursor-pointer py-2.5 text-sm font-semibold text-indigo-700 dark:text-indigo-300">{t("trackerActions")}</summary>
                        <div className="flex flex-wrap items-end gap-2">
                          <div className="min-w-0 max-w-full"><Field label={t("trackerFilter")}><select aria-label={t("statusLabelFor", { name: row.universityName })} className={`${inputClass} min-h-11`} value={row.status} disabled={busy} onChange={(e) => void setStatus(row, e.target.value)}>
                            {!STATUSES.some((status) => status === row.status) && <option value={row.status}>{statusLabel(row.status)}</option>}
                            {STATUSES.filter((status) => status !== "submitted" || row.status === status || !onOpenWorkspace).map((status) => <option key={status} value={status}>{t(`status.${status}`)}</option>)}
                          </select></Field></div>
                          {canReport && <Button size="sm" variant="outline" className="min-h-11" disabled={busy} onClick={() => openDialog({ type: "outcome", row })}><Trophy aria-hidden className="size-4" />{t("reportResult")}</Button>}
                          <Button size="sm" variant="ghost" className="min-h-11 text-rose-700 dark:text-rose-300" disabled={busy} onClick={() => openDialog({ type: "remove", row })}><Trash2 aria-hidden className="size-4" />{t("deleteLabel")}</Button>
                        </div>
                      </details>
                    </li>
                  );
                })}
              </ul>
            ) : <Empty title={t("trackerNoMatches")} hint={t("trackerNoMatchesHint")} />}
          </div>
        )}
      </JourneyCard>

      {available.length > 0 && <JourneyCard>
        <details>
          <summary className="min-h-11 cursor-pointer py-2.5 font-bold text-indigo-700 dark:text-indigo-300">{t("savedStripTitle")}</summary>
          <ul className="divide-y divide-slate-200 dark:divide-slate-700">
            {available.map((saved) => <li key={saved.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <div className="min-w-0 break-words"><p className="font-semibold">{saved.university?.name}</p>{saved.university?.country && <p className="text-sm text-slate-600 dark:text-slate-300">{saved.university.country}</p>}</div>
              <Button size="sm" variant="outline" className="min-h-11" disabled={busy} onClick={() => void create({ universityId: saved.universityId }, true)}>{t("startApplicationShort")}</Button>
            </li>)}
          </ul>
        </details>
      </JourneyCard>}

      <JourneyCard>
        <details><summary className="min-h-11 cursor-pointer py-2.5 font-semibold text-indigo-700 dark:text-indigo-300">{t("trackerLetter")}</summary><RecLetterPanel /></details>
      </JourneyCard>

      {dialog?.type === "add" && <PanelDialog title={t("add")} busy={busy} error={actionError} onClose={() => setDialog(null)}>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={(event) => {
          event.preventDefault();
          const values = Object.fromEntries(new FormData(event.currentTarget));
          if (!String(values.universityName ?? "").trim()) { setActionError(t("trackerNeedUniversity")); return; }
          void create(values, false);
        }}>
          <Field label={t("formUniversity")}><input name="universityName" className={inputClass} required maxLength={200} /></Field>
          <Field label={t("formProgram")}><input name="programName" className={inputClass} maxLength={200} /></Field>
          <Field label={t("formDeadline")}><input name="deadline" type="date" className={inputClass} /></Field>
          <Field label={t("formRound")}><select name="applicationRound" className={inputClass}>{ROUNDS.map((round) => <option key={round}>{round}</option>)}</select></Field>
          <Button className="sm:col-span-2 sm:justify-self-end" type="submit" disabled={busy}>{t("addSubmit")}</Button>
        </form>
      </PanelDialog>}

      {dialog?.type === "outcome" && <PanelDialog title={t("resultsQuestion")} busy={busy} error={actionError} onClose={() => setDialog(null)}>
        <form className="space-y-3" onSubmit={(event) => {
          event.preventDefault();
          const values = new FormData(event.currentTarget);
          void mutate(async () => {
            await sendJson("/api/applications/outcome", { method: "POST", body: JSON.stringify({
              applicationId: dialog.row.id, result, scholarshipAmountUsd: values.get("scholarship") ? Number(values.get("scholarship")) : null, shareConsent: values.has("consent"),
            }) }, t("resultError"));
            setDialog(null);
          }, t("resultError"));
        }}>
          <div className="flex flex-wrap gap-2">
            {APPLICATION_DECISIONS.map((value) => <Button key={value} size="sm" variant={result === value ? "secondary" : "outline"} aria-pressed={result === value} onClick={() => setResult(value)}>{t(`result.${value}`)}</Button>)}
          </div>
          <Field label={t("formScholarship")}><input name="scholarship" type="number" min="0" step="1" className={inputClass} /></Field>
          <label className="flex min-h-11 items-start gap-2 text-sm"><input name="consent" type="checkbox" className="mt-0.5 size-5 shrink-0 accent-indigo-600" />{t("consent")}</label>
          <Button type="submit" disabled={busy}>{t("saveResult")}</Button>
        </form>
      </PanelDialog>}

      {dialog?.type === "remove" && <PanelDialog title={t("deleteLabel")} busy={busy} error={actionError} onClose={() => setDialog(null)}>
        <p className="mb-4 break-words text-sm">{t("trackerConfirmRemove", { name: dialog.row.universityName })}</p>
        <Button variant="danger" disabled={busy} onClick={() => void mutate(async () => {
          await sendJson(`/api/applications?id=${dialog.row.id}`, { method: "DELETE" }, t("deleteError"));
          setDialog(null);
        }, t("deleteError"))}>{t("deleteLabel")}</Button>
      </PanelDialog>}
    </div>
  );
}
