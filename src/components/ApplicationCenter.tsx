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
import { StudentProfile } from "./Navbar";

/**
 * Universal application tracker (#12) + the outcomes flywheel.
 *
 * Each row walks the real lifecycle (not started → preparing → essay →
 * documents → submitted → decision) and, once a decision arrives, the student
 * reports the result. Every result is stored — rejections included — and with
 * consent it also improves the chancing engine for everyone.
 */

const STATUSES: { value: string; label: string; chip: string }[] = [
  { value: "not_started", label: "Not started", chip: "bg-slate-100 text-slate-600" },
  { value: "preparing", label: "Preparing", chip: "bg-slate-100 text-slate-700" },
  { value: "essay", label: "Essay", chip: "bg-amber-100 text-amber-800" },
  { value: "documents", label: "Documents", chip: "bg-amber-100 text-amber-800" },
  { value: "recommendations", label: "Recommendations", chip: "bg-amber-100 text-amber-800" },
  { value: "fee_paid", label: "Fee paid", chip: "bg-sky-100 text-sky-800" },
  { value: "submitted", label: "Submitted", chip: "bg-sky-100 text-sky-800" },
  { value: "interview", label: "Interview", chip: "bg-violet-100 text-violet-800" },
  { value: "decision", label: "Decision", chip: "bg-emerald-100 text-emerald-800" },
  { value: "withdrawn", label: "Withdrawn", chip: "bg-slate-200 text-slate-600" },
];

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

interface ApplicationCenterProps {
  activeProfile: StudentProfile | null;
}

export function ApplicationCenter({ activeProfile }: ApplicationCenterProps) {
  const [rows, setRows] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ universityName: "", programName: "", deadline: "", applicationRound: "RD" });
  const [reporting, setReporting] = useState<number | null>(null);
  const [result, setResult] = useState("accepted");
  const [scholarship, setScholarship] = useState("");
  const [consent, setConsent] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!activeProfile?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/applications?profileId=${activeProfile.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load applications");
      setRows(data.applications ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load applications");
    } finally {
      setLoading(false);
    }
  }, [activeProfile?.id]);

  useEffect(() => {
    void load();
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
      if (!res.ok) throw new Error(data.error || "Failed to add application");
      setDraft({ universityName: "", programName: "", deadline: "", applicationRound: "RD" });
      setAdding(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add application");
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
      if (!res.ok) throw new Error("Failed to update status");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const remove = async (id: number) => {
    try {
      await fetch(`/api/applications?id=${id}`, { method: "DELETE" });
      await load();
    } catch {
      setError("Failed to delete application");
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
      if (!res.ok) throw new Error(data.error || "Failed to record result");
      setReporting(null);
      setScholarship("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record result");
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
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Applications", value: rows.length },
          { label: "Submitted", value: submitted },
          { label: "Decisions", value: decided },
          { label: "Accepted", value: accepted },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
            <div className="text-2xl font-extrabold text-slate-900">{stat.value}</div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Target className="h-5 w-5 text-indigo-600" />
          My applications
        </h2>
        <button
          onClick={() => setAdding((v) => !v)}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> Add application
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
      )}

      {adding && (
        <div className="grid gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 sm:grid-cols-4">
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="University name *"
            value={draft.universityName}
            onChange={(e) => setDraft({ ...draft, universityName: e.target.value })}
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Program"
            value={draft.programName}
            onChange={(e) => setDraft({ ...draft, programName: e.target.value })}
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            type="date"
            value={draft.deadline}
            onChange={(e) => setDraft({ ...draft, deadline: e.target.value })}
          />
          <div className="flex gap-2">
            <select
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
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
            </button>
          </div>
        </div>
      )}

      {loading && !rows.length && (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      )}

      {!loading && !rows.length && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
          No applications yet — add your first one above.
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
                      "No program set"}
                    {row.deadline ? ` · deadline ${row.deadline}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${status.chip}`}>
                    {status.label}
                  </span>
                  {row.outcome && (
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        RESULT_STYLE[row.outcome.result] ?? "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {row.outcome.result}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <select
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                  value={row.status}
                  onChange={(e) => void setStatus(row.id, e.target.value)}
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>

                {!row.outcome && (row.status === "submitted" || row.status === "decision") && (
                  <button
                    onClick={() => {
                      setReporting(row.id);
                      setResult("accepted");
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    <Trophy className="h-3.5 w-3.5" /> Report result
                  </button>
                )}

                <button
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
          <h3 className="font-bold text-slate-900">What was the result?</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {["accepted", "rejected", "waitlisted", "deferred", "withdrawn"].map((r) => (
              <button
                key={r}
                onClick={() => setResult(r)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                  result === r ? "bg-emerald-600 text-white" : "bg-white text-slate-700 border border-slate-200"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <input
            className="mt-3 w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Scholarship amount (USD, optional)"
            type="number"
            value={scholarship}
            onChange={(e) => setScholarship(e.target.value)}
          />

          <label className="mt-3 flex items-start gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4"
            />
            <span>
              Anonymously contribute this result to improve ScholarBridge&apos;s admission
              predictions. Rejections are just as valuable as acceptances — they stop the model
              from assuming every strong profile gets in.
            </span>
          </label>

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => void reportResult()}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Save result
            </button>
            <button
              onClick={() => setReporting(null)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
