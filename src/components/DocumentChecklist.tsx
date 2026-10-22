"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
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
  fileName?: string | null;
  expiresAt?: string | null;
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

const SEVERITY_STYLE: Record<DocIssue["severity"], string> = {
  blocker: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-800",
  warning: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800",
  info: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700",
};

export function DocumentChecklist({ profileId }: DocumentChecklistProps) {
  const t = useTranslations("documentChecklist");
  const locale = useLocale();
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [check, setCheck] = useState<DocCheck | null>(null);
  const [suggested, setSuggested] = useState<Suggested[]>([]);

  const load = useCallback(async () => {
    if (!profileId) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/documents?profileId=${profileId}`);
      const data = await res.json();
      if (res.ok && data.documents) {
        setDocs(data.documents);
        setCheck(data.check ?? null);
        setSuggested(data.suggested ?? []);
        setMessage(null);
      } else {
        setMessage(t("loadFailed"));
      }
    } catch (err) {
      console.error("Failed to load documents:", err);
      setMessage(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [profileId, t]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

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
        setMessage(t("successUpdated"));
      } else setMessage(t("updateFailed"));
    } catch (err) {
      console.error(err);
      setMessage(t("updateFailed"));
    }
  };

  const addCustom = async () => {
    if (!profileId) return;
    if (!newLabel.trim()) { setMessage(t("addValidation")); return; }
    setAdding(true);
    setMessage(null);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, label: newLabel.trim(), documentType: "custom" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "failed");
      setNewLabel("");
      await load();
      setMessage(t("successAdded"));
    } catch (err: any) {
      console.error(err);
      setMessage(t("addFailed"));
    } finally {
      setAdding(false);
    }
  };

  const remove = async (id: number) => {
    try {
      const res = await fetch(`/api/documents?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("remove failed");
      setDocs((prev) => prev.filter((d) => d.id !== id));
      setMessage(t("successRemoved"));
    } catch (err) {
      console.error(err);
      setMessage(t("removeFailed"));
    }
  };

  const missing = docs.filter((d) => d.status === "missing").length;
  const done = docs.filter((d) => d.status === "uploaded").length;
  const issueMessage = (issue: DocIssue, doc?: DocItem) => {
    if (locale === "en") return issue.message;
    const document = doc ? documentDisplayLabel(doc) : t("general");
    const days = issue.message.match(/(?:in|expires in) (\d+) days?/i)?.[1] ?? "";
    const date = issue.message.match(/\((\d{4}-\d{2}-\d{2})\)/)?.[1] ?? "";
    switch (issue.code) {
      case "missing_required": return t("issues.missing_required", { document });
      case "expired": return t("issues.expired", { document });
      case "passport_buffer": return t("issues.passport_buffer");
      case "expiring_soon": return t("issues.expiring_soon", { document, days });
      case "expires_before_deadline": return t("issues.expires_before_deadline", { document, date: date || doc?.deadlineDate || "" });
      case "expiry_unknown": return t("issues.expiry_unknown", { document });
      case "bad_format": return t("issues.bad_format", { file: doc?.fileName || issue.message.split(" is a ")[0] || document });
      case "too_large": return t("issues.too_large", { document });
      case "suspiciously_small": return t("issues.suspiciously_small", { document });
      case "stale_upload": return t("issues.stale_upload", { document });
      default: return t("issues.other");
    }
  };
  const suggestionLabels: Record<string, string> = {
    passport: t("suggestions.passport"),
    transcript: t("suggestions.transcript"),
    diploma: t("suggestions.diploma"),
    englishTest: t("suggestions.englishTest"),
    standardizedTest: t("suggestions.standardizedTest"),
    recommendation: t("suggestions.recommendation"),
    statement: t("suggestions.statement"),
    cv: t("suggestions.cv"),
    aps: t("suggestions.aps"),
    funds: t("suggestions.funds"),
    medical: t("suggestions.medical"),
    awardTranscript: t("suggestions.awardTranscript"),
    awardEssay: t("suggestions.awardEssay"),
    awardRecommendation: t("suggestions.awardRecommendation"),
    awardLanguage: t("suggestions.awardLanguage"),
    awardFinancial: t("suggestions.awardFinancial"),
  };
  const documentDisplayLabel = (item: DocItem) => {
    if (locale === "en" || item.documentType === "custom") return item.label;
    const key = item.documentType === "test_score" ? "standardizedTest" : ({ passport: "passport", transcript: "transcript", diploma: "diploma", recommendation: "recommendation", statement: "statement", cv: "cv", aps_certificate: "aps", financial: "funds", medical: "medical" } as Record<string, string>)[item.documentType];
    return key ? suggestionLabels[key] ?? item.label : item.label;
  };
  const suggestionKey = (item: Suggested): string | null => {
    if (item.documentType === "test_score") return /\\b(GRE|GMAT|SAT|ACT)\\b/i.test(item.label) ? "standardizedTest" : "englishTest";
    if (item.documentType.startsWith("suggested_scholarship_")) {
      const suffix = item.documentType.slice("suggested_scholarship_".length);
      return ({ transcript: "awardTranscript", essay: "awardEssay", recommendation: "awardRecommendation", language_evidence: "awardLanguage", financial_evidence: "awardFinancial" } as Record<string, string>)[suffix] ?? null;
    }
    return ({ passport: "passport", transcript: "transcript", diploma: "diploma", recommendation: "recommendation", statement: "statement", cv: "cv", aps_certificate: "aps", financial: "funds", medical: "medical" } as Record<string, string>)[item.documentType] ?? null;
  };

  // Group by entity.
  const groups = new Map<string, DocItem[]>();
  for (const d of docs) {
    const key = d.entityName ? `${d.entityType}:${d.entityName}` : t("general");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(d);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex items-center gap-3 dark:border-slate-700 dark:bg-slate-900">
        <div className="h-9 w-9 rounded-xl bg-violet-50 flex items-center justify-center dark:bg-violet-950/50">
          <FileCheck2 className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-slate-800 dark:text-white">{t("title")}</h2>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            {t("summary", { ready: done, missing })}
            {check && check.blockers > 0 ? ` · ${t("blockingCount", { count: check.blockers })}` : ""}
          </p>
        </div>
        {check && (
          <div className="ml-auto text-center">
            <div
              role="progressbar"
              aria-label={t("readiness")}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={check.readiness}
              className={`text-xl font-extrabold ${
                check.readiness >= 80 ? "text-emerald-600" : check.readiness >= 40 ? "text-amber-600" : "text-red-600"
              }`}
            >
              {check.readiness}%
            </div>
            <div className="text-[9px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("readiness")}</div>
          </div>
        )}
        <button
          onClick={load}
          aria-label={t("refresh")}
          className="ml-auto flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <RefreshCw className="h-3.5 w-3.5" /> {t("refresh")}
        </button>
      </div>

      {message && (() => {
        const isSuccess = [t("successAdded"), t("successRemoved"), t("successUpdated")].includes(message);
        return (
          <div
            role={isSuccess ? "status" : "alert"}
            aria-live={isSuccess ? "polite" : "assertive"}
            className={`rounded-xl border px-4 py-3 text-xs font-semibold ${isSuccess ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200" : "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"}`}
          >
            {message}
          </div>
        );
      })()}

      {/* The checker: what is WRONG, not just what is missing */}
      {check && check.issues.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-700 dark:bg-slate-900">
          <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            {t("issuesHeading", { blockers: check.blockers, warnings: check.warnings })}
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
                    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${style}`}>
                      {t(issue.severity === "blocker" ? "severityBlocker" : issue.severity === "warning" ? "severityWarning" : "severityInfo")}
                    </span>
                    <span className="min-w-0 flex-1 text-xs text-slate-700 dark:text-slate-200">
                      {doc ? <b className="font-bold text-slate-900 dark:text-white">{doc.label}: </b> : null}
                      {issueMessage(issue, doc)}
                    </span>
                  </li>
                );
              })}
          </ul>
        </div>
      )}

      {/* Universal requirements the student has not added yet */}
      {suggested.length > 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            {t("suggestedHeading")}
          </h3>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {suggested.map((s) => {
              const key = suggestionKey(s);
              const label = locale !== "en" && key ? suggestionLabels[key] : s.label;
              const why = locale !== "en" && key ? t("suggestions.why") : s.why;
              return (
                <li key={`${s.documentType}-${s.label}`} className="text-xs text-slate-700 dark:text-slate-300">
                  <b className="font-bold text-slate-900 dark:text-white">{label}</b> — {why}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden dark:border-slate-700 dark:bg-slate-900">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> {t("loading")}
          </div>
        ) : docs.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {t("loadingEmpty")}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {Array.from(groups.entries()).map(([group, items]) => (
              <div key={group} className="px-4 py-3">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2 dark:text-slate-400">
                  {group}
                </p>
                <div className="space-y-1.5">
                  {items.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60"
                    >
                      <button
                        onClick={() => toggleStatus(d)}
                        className="min-h-11 min-w-11 shrink-0 flex items-center justify-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                        title={d.status === "uploaded" ? t("markMissing") : t("markReady")}
                        aria-label={d.status === "uploaded" ? t("markMissing") : t("markReady")}
                      >
                        {d.status === "uploaded" ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-slate-300 hover:text-slate-400" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-bold ${d.status === "uploaded" ? "text-slate-500 line-through dark:text-slate-400" : "text-slate-900 dark:text-white"}`}>
                          {documentDisplayLabel(d)}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          {t(d.isRequired ? "required" : "optional")}
                          {d.deadlineDate ? ` · ${t("due", { date: new Date(d.deadlineDate).toLocaleDateString() })}` : ""}
                        </p>
                      </div>
                      {d.documentType === "custom" && (
                        <button onClick={() => remove(d.id)} aria-label={t("remove")} className="min-h-11 min-w-11 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 dark:text-slate-300" title={t("remove")}>
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
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-violet-600" />
          <h3 className="text-xs font-extrabold text-slate-900 dark:text-white">{t("addCustom")}</h3>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label htmlFor="custom-document-label" className="sr-only">{t("label")}</label>
          <input
            id="custom-document-label"
            required
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustom()}
            placeholder={t("placeholder")}
            className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
          />
          <button
            onClick={addCustom}
            disabled={adding || !newLabel.trim()}
            className="flex min-h-11 items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-violet-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Plus className="h-3.5 w-3.5" />}
            {adding ? t("adding") : t("add")}
          </button>
        </div>
      </div>
    </div>
  );
}
