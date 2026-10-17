"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Plus,
  Target,
  Trash2,
  Trophy,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { StudentProfile } from "./Navbar";
import { RecLetterPanel } from "./RecLetterPanel";

/**
 * Universal application tracker (#12) and private outcome history.
 *
 * Each row walks the real lifecycle (not started → preparing → essay →
 * documents → submitted → decision) and, once a decision arrives, the student
 * may record the result. Sharing is unchecked by default and requires an
 * explicit choice for each result; shared examples do not change fit scores or
 * estimate admission chances.
 */

const STATUSES: { value: string; chip: string }[] = [
  { value: "not_started", chip: "bg-slate-100 text-slate-600" },
  { value: "preparing", chip: "bg-slate-100 text-slate-700" },
  { value: "essay", chip: "bg-amber-100 text-amber-800" },
  { value: "documents", chip: "bg-amber-100 text-amber-800" },
  { value: "recommendations", chip: "bg-amber-100 text-amber-800" },
  { value: "fee_paid", chip: "bg-sky-100 text-sky-800" },
  { value: "submitted", chip: "bg-sky-100 text-sky-800" },
  { value: "interview", chip: "bg-violet-100 text-violet-800" },
  { value: "decision", chip: "bg-emerald-100 text-emerald-800" },
  { value: "withdrawn", chip: "bg-slate-200 text-slate-600" },
];

/** Result options offered when a decision arrives. */
const RESULTS = ["accepted", "rejected", "waitlisted", "deferred", "withdrawn"] as const;

/** Small helper: a visually hidden <label> keeps the compact form accessible. */
const srLabel = "sr-only";

const RESULT_STYLE: Record<string, string> = {
  accepted: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
  waitlisted: "bg-amber-100 text-amber-800",
  deferred: "bg-sky-100 text-sky-800",
  withdrawn: "bg-slate-200 text-slate-600",
};

interface Outcome {
  id: number;
  result: string;
  scholarshipAmountUsd: number | null;
  shareConsent: boolean;
}

interface ApplicationRow {
  id: number;
  universityId: number | null;
  universityName: string;
  programName: string | null;
  applicationRound: string | null;
  intakeTerm: string | null;
  deadline: string | null;
  status: string;
  outcome: Outcome | null;
}

/** One saved-university row from /api/saved-universities. */
interface SavedUniRow {
  id: number;
  universityId: number;
  university?: { name?: string; country?: string } | null;
}

interface ApplicationCenterProps {
  activeProfile: StudentProfile | null;
  /**
   * Opens the selected application in its workspace. The tracker row stays the
   * single source of truth for status; the workspace is a view of the same
   * record, so the two can never disagree.
   */
  onOpenWorkspace?: (id: number) => void;
}

export function ApplicationCenter({ activeProfile, onOpenWorkspace }: ApplicationCenterProps) {
  const t = useTranslations("applications");
  const [rows, setRows] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ universityName: "", programName: "", deadline: "", applicationRound: "RD" });
  const [reporting, setReporting] = useState<number | null>(null);
  const [result, setResult] = useState("accepted");
  const [scholarship, setScholarship] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  // Analytics extras (spec §33): upcoming deadlines + scholarship matches.
  // Fetched, never hardcoded — null until the response arrives.
  const [deadlineCount, setDeadlineCount] = useState<number | null>(null);
  const [scholarshipMatchCount, setScholarshipMatchCount] = useState<number | null>(null);
  // 2.5 — the shortlist feeds the tracker: saved universities that do not
  // have an application row yet are offered as one-click starters.
  const [savedRows, setSavedRows] = useState<SavedUniRow[]>([]);
  const [startingAppId, setStartingAppId] = useState<number | null>(null);

  useEffect(() => {
    if (!activeProfile?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const [dlRes, schRes] = await Promise.all([
          fetch(`/api/deadlines?profileId=${activeProfile.id}`),
          fetch(`/api/scholarships?profileId=${activeProfile.id}&limit=200`),
        ]);
        if (cancelled) return;
        if (dlRes.ok) {
          const dl = await dlRes.json();
          const s = dl.summary;
          setDeadlineCount(s ? (s.critical ?? 0) + (s.soon ?? 0) : null);
        }
        if (schRes.ok) {
          const sch = await schRes.json();
          if (Array.isArray(sch.scholarships)) {
            setScholarshipMatchCount(
              sch.scholarships.filter((x: { matchScore?: number | null }) => (x.matchScore ?? 0) >= 60).length
            );
          }
        }
      } catch {
        // Leave the stats as "—" rather than showing a wrong number.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeProfile?.id]);

  const activeProfileId = activeProfile?.id;
  const load = useCallback(async () => {
    if (!activeProfileId) return;
    setLoading(true);
    try {
      const [res, savedRes] = await Promise.all([
        fetch(`/api/applications?profileId=${activeProfileId}`),
        fetch(`/api/saved-universities?profileId=${activeProfileId}`),
      ]);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("loadError"));
      setRows(data.applications ?? []);
      // The shortlist read is auxiliary — a failure here must not fail the
      // tracker itself, it just leaves the start strip empty.
      if (savedRes.ok) {
        const savedData = await savedRes.json().catch(() => null);
        setSavedRows(Array.isArray(savedData?.savedUniversities) ? savedData.savedUniversities : []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [activeProfileId, t]);

  // Saved universities still missing an application row.
  const startableSaved = savedRows.filter(
    (s) => !rows.some((r) => r.universityId != null && r.universityId === s.universityId)
  );

  // One click: create the application (the API enriches it with the
  // university's real fee / portal / nearest deadline), then open its
  // workspace — the same flow the explorer card uses.
  const startFromSaved = async (saved: SavedUniRow) => {
    if (!activeProfileId || startingAppId !== null) return;
    setStartingAppId(saved.universityId);
    setError("");
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: activeProfileId, universityId: saved.universityId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("addError"));
      await load();
      if (data.application?.id && onOpenWorkspace) onOpenWorkspace(data.application.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("addError"));
    } finally {
      setStartingAppId(null);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const addApplication = async () => {
    if (!activeProfile?.id || !draft.universityName.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: activeProfile.id, ...draft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("addError"));
      setDraft({ universityName: "", programName: "", deadline: "", applicationRound: "RD" });
      setAdding(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("addError"));
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (id: number, status: string) => {
    try {
      const res = await fetch("/api/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error(t("statusError"));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("statusError"));
    }
  };

  const remove = async (id: number) => {
    try {
      await fetch(`/api/applications?id=${id}`, { method: "DELETE" });
      await load();
    } catch {
      setError(t("deleteError"));
    }
  };

  const reportResult = async () => {
    if (!reporting) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/applications/outcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: reporting,
          result,
          scholarshipAmountUsd: scholarship ? Number(scholarship) : null,
          shareConsent: consent,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("resultError"));
      setReporting(null);
      setScholarship("");
      setConsent(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("resultError"));
    } finally {
      setBusy(false);
    }
  };

  const submitted = rows.filter((r) => r.status === "submitted" || r.status === "decision").length;
  const decided = rows.filter((r) => r.outcome).length;
  const accepted = rows.filter((r) => r.outcome?.result === "accepted").length;

  if (!activeProfile) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Sign in to track your applications.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 2.5 — one-click "start application" from the shortlist, so the
          explorer's ⭐ and the tracker never live on different planets. */}
      {!loading && startableSaved.length > 0 && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-500/40 dark:bg-indigo-950/30">
          <p className="min-w-0 break-words text-xs font-extrabold text-indigo-800 dark:text-indigo-200">
            {t("savedStripTitle")}
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {startableSaved.slice(0, 6).map((saved) => (
              <li
                key={saved.id}
                className="flex max-w-full flex-wrap items-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-2.5 py-1.5 dark:border-indigo-500/40 dark:bg-slate-900"
              >
                <span className="min-w-0 break-words text-[11px] font-bold text-slate-800 dark:text-slate-100">
                  {saved.university?.name ?? ""}
                  {saved.university?.country ? (
                    <span className="font-medium text-slate-500"> · {saved.university.country}</span>
                  ) : null}
                </span>
                <button
                  type="button"
                  disabled={startingAppId !== null}
                  onClick={() => void startFromSaved(saved)}
                  className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg bg-indigo-600 px-2.5 text-[11px] font-bold text-white transition-colors hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:opacity-50"
                >
                  {startingAppId === saved.universityId ? (
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                  ) : null}
                  {t("startApplicationShort")}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 2 columns on phones: seven full-width metric tiles stacked ~560px
          of scrolling before the first application card. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: t("statApplied"), value: rows.length },
          { label: t("statSubmitted"), value: submitted },
          { label: t("statInProgress"), value: Math.max(0, rows.length - submitted) },
          { label: t("statDecisions"), value: decided },
          { label: t("statAccepted"), value: accepted },
          { label: t("statScholarships"), value: scholarshipMatchCount },
          { label: t("statDeadlines"), value: deadlineCount },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
            <div className="text-2xl font-extrabold text-slate-900">
              {stat.value === null || stat.value === undefined ? "—" : stat.value}
            </div>
            <div className="break-words text-[10px] font-bold uppercase leading-tight tracking-wide text-slate-400">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Target className="h-5 w-5 text-indigo-600" />
          {t("title")}
        </h2>
        <button
          onClick={() => setAdding((v) => !v)}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> {t("add")}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
      )}

      {adding && (
        <div className="grid gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 sm:grid-cols-4">
          <div>
            <label htmlFor="app-university" className={srLabel}>
              {t("formUniversity")}
            </label>
            <input
              id="app-university"
              required
              aria-required="true"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder={t("formUniversity")}
              value={draft.universityName}
              onChange={(e) => setDraft({ ...draft, universityName: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="app-program" className={srLabel}>
              {t("formProgram")}
            </label>
            <input
              id="app-program"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder={t("formProgram")}
              value={draft.programName}
              onChange={(e) => setDraft({ ...draft, programName: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="app-deadline" className={srLabel}>
              {t("formDeadline")}
            </label>
            <input
              id="app-deadline"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              type="date"
              value={draft.deadline}
              onChange={(e) => setDraft({ ...draft, deadline: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <label htmlFor="app-round" className={srLabel}>
              {t("formRound")}
            </label>
            <select
              id="app-round"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={draft.applicationRound}
              onChange={(e) => setDraft({ ...draft, applicationRound: e.target.value })}
            >
              {["RD", "ED", "EA", "Rolling", "Winter", "Summer", "Spring"].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button
              onClick={() => void addApplication()}
              disabled={busy}
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("addSubmit")}
            </button>
          </div>
        </div>
      )}

      {loading && !rows.length && (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}
        </div>
      )}

      {!loading && !rows.length && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
          {t("empty")}
        </div>
      )}

      <div className="space-y-2">
        {rows.map((row) => {
          const status = STATUSES.find((s) => s.value === row.status) ?? STATUSES[0];
          return (
            <div key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900">{row.universityName}</h3>
                  <p className="text-xs text-slate-500">
                    {[row.programName, row.applicationRound, row.intakeTerm].filter(Boolean).join(" · ") ||
                      t("noProgram")}
                    {row.deadline ? ` · ${t("deadlineOn", { date: row.deadline })}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${status.chip}`}>
                    {t(`status.${status.value}`)}
                  </span>
                  {row.outcome && (
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        RESULT_STYLE[row.outcome.result] ?? "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {t(`result.${row.outcome.result}`)}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {onOpenWorkspace && (
                  <button
                    onClick={() => onOpenWorkspace(row.id)}
                    className="flex min-h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700"
                  >
                    <Target className="h-3.5 w-3.5" /> {t("openWorkspace")}
                  </button>
                )}

                <select
                  aria-label={t("statusLabelFor", { name: row.universityName })}
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                  value={row.status}
                  onChange={(e) => void setStatus(row.id, e.target.value)}
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {t(`status.${s.value}`)}
                    </option>
                  ))}
                </select>

                {!row.outcome && (row.status === "submitted" || row.status === "decision") && (
                  <button
                    onClick={() => {
                      setReporting(row.id);
                      setResult("accepted");
                      setConsent(false);
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    <Trophy className="h-3.5 w-3.5" /> {t("reportResult")}
                  </button>
                )}

                <button
                  aria-label={t("deleteLabel")}
                  onClick={() => void remove(row.id)}
                  className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {reporting && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
          <h3 className="font-bold text-slate-900">{t("resultsQuestion")}</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {RESULTS.map((r) => (
              <button
                key={r}
                aria-pressed={result === r}
                onClick={() => setResult(r)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                  result === r ? "bg-emerald-600 text-white" : "bg-white text-slate-700 border border-slate-200"
                }`}
              >
                {t(`result.${r}`)}
              </button>
            ))}
          </div>

          <label htmlFor="app-scholarship" className={srLabel}>
            {t("formScholarship")}
          </label>
          <input
            id="app-scholarship"
            className="mt-3 w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder={t("formScholarship")}
            type="number"
            value={scholarship}
            onChange={(e) => setScholarship(e.target.value)}
          />

          <label className="mt-3 flex min-h-11 cursor-pointer items-start gap-2 text-xs leading-relaxed text-slate-700">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-6 w-6 shrink-0 accent-indigo-600"
            />
            <span>{t("consent")}</span>
          </label>

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => void reportResult()}
              disabled={busy}
              className="flex min-h-11 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {t("saveResult")}
            </button>
            <button
              onClick={() => setReporting(null)}
              className="min-h-11 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      )}

      {/* #20 Recommendation letter helper — brief built from real profile data */}
      <RecLetterPanel />
    </div>
  );
}
