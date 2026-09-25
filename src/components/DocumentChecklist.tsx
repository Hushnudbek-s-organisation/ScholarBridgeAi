"use client";

import React, { useEffect, useState } from "react";
import {
  FileCheck2,
  Loader2,
  RefreshCw,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  X,
} from "lucide-react";

interface DocItem {
  id: number;
  entityType: string;
  entityId: number | null;
  documentType: string;
  label: string;
  isRequired: boolean;
  status: string;
  deadlineDate: string | null;
  entityName: string | null;
}

interface DocIssue {
  documentId: number;
  severity: "blocker" | "warning" | "info";
  code: string;
  message: string;
}

interface DocCheck {
  issues: DocIssue[];
  readiness: number;
  requiredTotal: number;
  requiredUploaded: number;
  blockers: number;
  warnings: number;
}

interface Suggested {
  documentType: string;
  label: string;
  why: string;
}

interface DocumentChecklistProps {
  profileId: number | null;
}

const SEVERITY_STYLE: Record<DocIssue["severity"], { chip: string; label: string }> = {
  blocker: { chip: "bg-red-50 text-red-700 border-red-200", label: "Blocks submission" },
  warning: { chip: "bg-amber-50 text-amber-700 border-amber-200", label: "Warning" },
  info: { chip: "bg-slate-100 text-slate-600 border-slate-200", label: "Note" },
};

export function DocumentChecklist({ profileId }: DocumentChecklistProps) {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [check, setCheck] = useState<DocCheck | null>(null);
  const [suggested, setSuggested] = useState<Suggested[]>([]);

  const load = async () => {
    if (!profileId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/documents?profileId=${profileId}`);
      const data = await res.json();
      if (res.ok && data.documents) {
        setDocs(data.documents);
        setCheck(data.check ?? null);
        setSuggested(data.suggested ?? []);
      }
    } catch (err) {
      console.error("Failed to load documents:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  const toggleStatus = async (doc: DocItem) => {
    const next = doc.status === "uploaded" ? "missing" : "uploaded";
    try {
      const res = await fetch("/api/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: doc.id, status: next }),
      });
      if (res.ok) {
        setDocs((prev) => prev.map((d) => (d.id === doc.id ? { ...d, status: next } : d)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addCustom = async () => {
    if (!profileId || !newLabel.trim()) return;
    setAdding(true);
    setMessage(null);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, label: newLabel.trim(), documentType: "custom" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add");
      setNewLabel("");
      await load();
    } catch (err: any) {
      setMessage(err.message || "Failed to add document");
    } finally {
      setAdding(false);
    }
  };

  const remove = async (id: number) => {
    try {
      await fetch(`/api/documents?id=${id}`, { method: "DELETE" });
      setDocs((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const missing = docs.filter((d) => d.status === "missing").length;
  const done = docs.filter((d) => d.status === "uploaded").length;

  // Group by entity.
  const groups = new Map<string, DocItem[]>();
  for (const d of docs) {
    const key = d.entityName ? `${d.entityType}:${d.entityName}` : "General";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(d);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-violet-50 flex items-center justify-center">
          <FileCheck2 className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-slate-800">Document Checker</h2>
          <p className="text-xs text-slate-500">
            {done} ready · {missing} missing
            {check && check.blockers > 0 ? ` · ${check.blockers} blocking problem${check.blockers === 1 ? "" : "s"}` : ""}
          </p>
        </div>
        {check && (
          <div className="ml-auto text-center">
            <div
              className={`text-xl font-extrabold ${
                check.readiness >= 80 ? "text-emerald-600" : check.readiness >= 40 ? "text-amber-600" : "text-red-600"
              }`}
            >
              {check.readiness}%
            </div>
            <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">ready</div>
          </div>
        )}
        <button
          onClick={load}
          className="ml-auto flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {message && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
          {message}
        </div>
      )}

      {/* The checker: what is WRONG, not just what is missing */}
      {check && check.issues.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
            Problems found ({check.blockers} blocking · {check.warnings} warning)
          </h3>
          <ul className="mt-2 space-y-1.5">
            {check.issues
              .slice()
              .sort((a, b) => (a.severity === "blocker" ? -1 : b.severity === "blocker" ? 1 : 0))
              .map((issue, i) => {
                const style = SEVERITY_STYLE[issue.severity];
                const doc = docs.find((d) => d.id === issue.documentId);
                return (
                  <li key={`${issue.documentId}-${issue.code}-${i}`} className="flex flex-wrap items-start gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${style.chip}`}>
                      {style.label}
                    </span>
                    <span className="min-w-0 flex-1 text-xs text-slate-700">
                      {doc ? <b className="font-bold text-slate-900">{doc.label}: </b> : null}
                      {issue.message}
                    </span>
                  </li>
                );
              })}
          </ul>
        </div>
      )}

      {/* Universal requirements the student has not added yet */}
      {suggested.length > 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4">
          <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
            Usually required, not on your list yet
          </h3>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {suggested.map((s) => (
              <li key={`${s.documentType}-${s.label}`} className="text-xs text-slate-600">
                <b className="font-bold text-slate-800">{s.label}</b> — {s.why}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-xs font-semibold text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : docs.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-xs font-semibold text-slate-500">
              No documents yet. Save scholarships with document requirements, or add your own below.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {Array.from(groups.entries()).map(([group, items]) => (
              <div key={group} className="px-4 py-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">
                  {group}
                </p>
                <div className="space-y-1.5">
                  {items.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2"
                    >
                      <button
                        onClick={() => toggleStatus(d)}
                        className="shrink-0"
                        title={d.status === "uploaded" ? "Mark as missing" : "Mark as ready"}
                      >
                        {d.status === "uploaded" ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-slate-300 hover:text-slate-400" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-bold ${d.status === "uploaded" ? "text-slate-400 line-through" : "text-slate-800"}`}>
                          {d.label}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {d.isRequired ? "Required" : "Optional"}
                          {d.deadlineDate ? ` · due ${new Date(d.deadlineDate).toLocaleDateString()}` : ""}
                        </p>
                      </div>
                      {d.documentType === "custom" && (
                        <button onClick={() => remove(d.id)} className="text-slate-300 hover:text-red-500" title="Remove">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add custom document */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-violet-600" />
          <h3 className="text-xs font-extrabold text-slate-800">Add custom document</h3>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustom()}
            placeholder="e.g. Transcript (translated), Bank statement…"
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <button
            onClick={addCustom}
            disabled={adding || !newLabel.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
