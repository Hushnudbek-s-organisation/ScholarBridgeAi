"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { RefreshCw, Loader2, History, ShieldCheck, CalendarClock, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface RefreshCenterProps {
  adminProfileId: number;
}

type RefreshMode = "status_from_existing_dates" | "official_source_reverification";
type Scope = "all" | "scholarships" | "universities";

/** Raw-SQL rows are snake_case; the pre-migration fallback is camelCase. */
interface JobRow {
  id: number;
  job_type?: string; jobType?: string;
  status: string;
  trigger: string;
  items_processed?: number; itemsProcessed?: number;
  items_changed?: number; itemsChanged?: number;
  error: string | null;
  started_at?: string | null; startedAt?: string | null;
  created_at?: string; createdAt?: string;
  mode?: string;
  source_pages_read?: number;
  verified_dates_updated?: number;
  failed_verification?: boolean;
}

interface SourceCheck {
  entityType: string;
  entityId: number;
  fieldKey: string;
  sourceUrl: string;
  verifiedFact: string | null;
  evidenceExcerpt: string | null;
  httpStatus: number | null;
  officialPageReRead: boolean;
  verificationSucceeded: boolean;
  evidencePresent: boolean;
  reason: string | null;
  checkedAt: string;
  admissionCycle?: string | null;
}

interface RefreshOutcome {
  mode: RefreshMode;
  processed: number;
  changed: number;
  discovered: number;
  errors: string[];
  sourcePagesRead: number;
  verifiedDatesUpdated: number;
  failedVerification: boolean;
  sourceChecks: SourceCheck[];
}

const jobType = (j: JobRow) => j.job_type ?? j.jobType ?? "—";
const jobProcessed = (j: JobRow) => j.items_processed ?? j.itemsProcessed ?? 0;
const jobChanged = (j: JobRow) => j.items_changed ?? j.itemsChanged ?? 0;
const jobStarted = (j: JobRow) => j.started_at ?? j.startedAt ?? j.created_at ?? j.createdAt ?? "";

export function RefreshCenter({ adminProfileId }: RefreshCenterProps) {
  const t = useTranslations("adminRefresh");
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState<RefreshMode>("status_from_existing_dates");
  const [scope, setScope] = useState<Scope>("all");
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<RefreshOutcome | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/refresh?adminProfileId=${adminProfileId}`);
      const data = await res.json();
      if (res.ok && data.jobs) setJobs(data.jobs);
    } catch (err) {
      console.error("Failed to load jobs:", err);
    } finally {
      setLoading(false);
    }
  }, [adminProfileId]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const run = async () => {
    setRunning(true);
    setError(null);
    setOutcome(null);
    try {
      const res = await fetch("/api/admin/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminProfileId, scope, mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("failed"));
      setOutcome({
        mode: data.mode,
        processed: data.processed ?? 0,
        changed: data.changed ?? 0,
        discovered: data.discovered ?? 0,
        errors: Array.isArray(data.errors) ? data.errors : [],
        sourcePagesRead: data.sourcePagesRead ?? 0,
        verifiedDatesUpdated: data.verifiedDatesUpdated ?? 0,
        failedVerification: Boolean(data.failedVerification),
        sourceChecks: Array.isArray(data.sourceChecks) ? data.sourceChecks : [],
      });
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failed"));
    } finally {
      setRunning(false);
    }
  };

  const modeLabel = (value: string | undefined) =>
    value === "official_source_reverification" ? t("modeOfficial") : t("modeStatus");

  return (
    <div className="space-y-4">
      <div className="rounded-overlay border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-surface bg-slate-900 flex items-center justify-center">
            <RefreshCw className="h-5 w-5 text-amber-300" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-800">{t("title")}</h2>
            <p className="text-sm text-slate-500">{t("subtitle")}</p>
          </div>
        </div>

        {/* Two explicitly different modes — never silently conflated. */}
        <div className="mt-4">
          <p className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">{t("modeLabel")}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="unstyled"
              type="button"
              onClick={() => setMode("status_from_existing_dates")}
              aria-pressed={mode === "status_from_existing_dates"}
              className={`rounded-surface border p-3 text-left transition ${
                mode === "status_from_existing_dates"
                  ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800">
                <CalendarClock className="h-3.5 w-3.5" /> {t("statusMode")}
              </span>
              <span className="mt-1 block text-xs text-slate-500">{t("statusModeHint")}</span>
            </Button>
            <Button variant="unstyled"
              type="button"
              onClick={() => setMode("official_source_reverification")}
              aria-pressed={mode === "official_source_reverification"}
              className={`rounded-surface border p-3 text-left transition ${
                mode === "official_source_reverification"
                  ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800">
                <ShieldCheck className="h-3.5 w-3.5" /> {t("officialMode")}
              </span>
              <span className="mt-1 block text-xs text-slate-500">{t("officialModeHint")}</span>
            </Button>
          </div>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">{t("scopeLabel")}</p>
          <div className="flex flex-wrap gap-2">
            {(["all", "scholarships", "universities"] as Scope[]).map((s) => (
              <Button variant="unstyled"
                key={s}
                type="button"
                onClick={() => setScope(s)}
                aria-pressed={scope === s}
                className={`rounded-surface border px-3 py-1.5 text-xs font-bold transition ${
                  scope === s ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {s === "all" ? t("scopeAll") : s === "scholarships" ? t("scopeScholarships") : t("scopeUniversities")}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <Button
            variant="unstyled"
            onClick={() => void run()}
            disabled={running}
            className="flex items-center gap-1.5 rounded-surface bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {running ? t("running") : t("run")}
          </Button>
        </div>
        {error && <p className="mt-3 text-sm font-semibold text-rose-700">{error}</p>}

        {/* Result: mode, evidence counts and per-fact checks. */}
        {outcome && (
          <div className="mt-4 rounded-surface border border-slate-200 bg-slate-50 p-3" data-testid="refresh-outcome">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${
                outcome.mode === "official_source_reverification" ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700"
              }`}>{modeLabel(outcome.mode)}</span>
              {outcome.failedVerification && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">
                  <XCircle className="h-3 w-3" /> {t("failedVerification")}
                </span>
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 lg:grid-cols-5">
              <Stat label={t("processed")} value={outcome.processed} />
              <Stat label={t("changed")} value={outcome.changed} />
              <Stat label={t("sourcePagesRead")} value={outcome.sourcePagesRead} />
              <Stat label={t("verifiedDatesUpdated")} value={outcome.verifiedDatesUpdated} />
              <Stat label={t("discovered")} value={outcome.discovered} />
            </div>
            {outcome.mode === "official_source_reverification" && outcome.verifiedDatesUpdated === 0 && (
              <p className="mt-2 text-sm font-semibold text-amber-700">{t("noDatesMoved")}</p>
            )}
            {outcome.errors.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-rose-700">
                {outcome.errors.slice(0, 6).map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
            {outcome.mode === "official_source_reverification" && (
              <div className="mt-3">
                <p className="mb-1 text-sm font-bold uppercase tracking-wide text-slate-500">{t("checksTitle")}</p>
                {outcome.sourceChecks.length === 0 ? (
                  <p className="text-sm text-slate-500">{t("noChecks")}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="px-2 py-1.5 font-bold">{t("checkEntity")}</th>
                          <th className="px-2 py-1.5 font-bold">{t("checkField")}</th>
                          <th className="px-2 py-1.5 font-bold">{t("checkFact")}</th>
                          <th className="px-2 py-1.5 font-bold">{t("checkStatus")}</th>
                          <th className="px-2 py-1.5 font-bold">{t("checkSource")}</th>
                          <th className="px-2 py-1.5 font-bold">{t("checkReason")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {outcome.sourceChecks.map((c, i) => {
                          const ok = c.verificationSucceeded && c.evidencePresent && c.officialPageReRead;
                          return (
                            <tr key={`${c.entityType}-${c.entityId}-${c.fieldKey}-${i}`} className="border-b border-slate-100 last:border-0">
                              <td className="px-2 py-1.5 font-bold text-slate-700">{c.entityType} #{c.entityId}</td>
                              <td className="px-2 py-1.5 text-slate-600">{c.fieldKey}{c.admissionCycle ? ` · ${c.admissionCycle}` : ""}</td>
                              <td className="px-2 py-1.5 text-slate-600">{c.verifiedFact ?? "—"}</td>
                              <td className="px-2 py-1.5">
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold ${ok ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                                  {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                  {ok ? t("verified") : t("failed")}{c.httpStatus != null ? ` · HTTP ${c.httpStatus}` : ""}
                                </span>
                              </td>
                              <td className="px-2 py-1.5 text-slate-500 max-w-[180px] truncate" title={c.sourceUrl}>{c.sourceUrl || "—"}</td>
                              <td className="px-2 py-1.5 text-slate-500 max-w-[220px] truncate" title={c.reason ?? undefined}>{c.reason ?? "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-overlay border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
          <History className="h-3.5 w-3.5" /> {t("jobsTitle")}
        </div>
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-xs font-semibold text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}
          </div>
        ) : jobs.length === 0 ? (
          <p className="p-8 text-center text-sm font-semibold text-slate-500">{t("empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-3 font-bold">{t("colStarted")}</th>
                  <th className="px-3 py-3 font-bold">{t("colType")}</th>
                  <th className="px-3 py-3 font-bold">{t("colMode")}</th>
                  <th className="px-3 py-3 font-bold">{t("colStatus")}</th>
                  <th className="px-3 py-3 font-bold">{t("colProcessed")}</th>
                  <th className="px-3 py-3 font-bold">{t("colChanged")}</th>
                  <th className="px-3 py-3 font-bold">{t("colPages")}</th>
                  <th className="px-3 py-3 font-bold">{t("colDates")}</th>
                  <th className="px-3 py-3 font-bold">{t("colError")}</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                      {jobStarted(j) ? new Date(jobStarted(j)).toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-2.5 font-bold text-slate-700">{jobType(j)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex rounded-full px-2 py-0.5 font-bold ${
                        j.mode === "official_source_reverification" ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700"
                      }`}>{modeLabel(j.mode)}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex rounded-full px-2 py-0.5 font-bold ${
                        j.status === "success" ? "bg-emerald-100 text-emerald-700"
                          : j.status === "failed" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                      }`}>{j.status}{j.failed_verification ? ` · ${t("failedVerification")}` : ""}</span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{jobProcessed(j)}</td>
                    <td className="px-3 py-2.5 text-slate-600">{jobChanged(j)}</td>
                    <td className="px-3 py-2.5 text-slate-600">{j.source_pages_read ?? 0}</td>
                    <td className="px-3 py-2.5 text-slate-600">{j.verified_dates_updated ?? 0}</td>
                    <td className="px-3 py-2.5 text-rose-600 max-w-[200px] truncate">{j.error || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-surface border border-slate-200 bg-white px-2 py-1.5">
      <span className="block text-xs font-semibold text-slate-500">{label}</span>
      <span className="block text-sm font-extrabold text-slate-800">{value}</span>
    </div>
  );
}
