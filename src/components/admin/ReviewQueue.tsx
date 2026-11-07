"use client";

import { CatalogueFactsEditor } from "./CatalogueFactsEditor";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, ClipboardList, AlertTriangle, CheckCircle2, ShieldAlert, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";

type Status = "open" | "in_review" | "resolved" | "dismissed";
type Priority = "low" | "medium" | "high" | "critical";

interface QueueItem {
  itemKey: string;
  category: string;
  entityType: string | null;
  entityId: number | null;
  fieldKey: string | null;
  reason: string;
  sourceUrl: string | null;
  priority: Priority;
  nextAction: string;
  status: Status;
  decisionReason: string | null;
}

interface QueueResponse {
  items: QueueItem[];
  summary: { total: number; needsAttention: number; byStatus: Record<Status, number>; byPriority: Record<Priority, number> };
  migrationPending: boolean;
  /** Named queue sources that failed. Shown honestly, never hidden as "all clear". */
  partialFailures: string[];
  note: string | null;
}

export function ReviewQueue() {
  const t = useTranslations("adminReviewQueue");
  const [data, setData] = useState<QueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [reasonDraft, setReasonDraft] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"all" | "open" | "critical">("open");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/review-queue");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t("failed"));
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("failed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  const decide = async (item: QueueItem, decision: "resolve" | "dismiss" | "start_review") => {
    const reason = (reasonDraft[item.itemKey] ?? "").trim();
    if (!reason) { setError(t("reasonRequired")); return; }
    setBusyKey(item.itemKey);
    setError(null);
    try {
      const res = await fetch("/api/admin/review-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemKey: item.itemKey, decision, reason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t("failed"));
      // A decision is NEVER presented as a verified fact.
      if (json.verifiedWritten !== false) throw new Error(t("failed"));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("failed"));
    } finally {
      setBusyKey(null);
    }
  };

  const priorityClass: Record<Priority, string> = {
    critical: "bg-rose-100 text-rose-700", high: "bg-amber-100 text-amber-700",
    medium: "bg-indigo-100 text-indigo-700", low: "bg-slate-100 text-slate-600",
  };
  const statusClass: Record<Status, string> = {
    open: "bg-amber-100 text-amber-700", in_review: "bg-indigo-100 text-indigo-700",
    resolved: "bg-emerald-100 text-emerald-700", dismissed: "bg-slate-100 text-slate-600",
  };

  const visible = (data?.items ?? []).filter((i) =>
    filter === "all" ? true : filter === "critical" ? i.priority === "critical" : i.status === "open" || i.status === "in_review");

  return (
    <div className="space-y-4">
      <CatalogueFactsEditor/>
      <div className="rounded-overlay border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-surface bg-slate-900 flex items-center justify-center">
            <ClipboardList className="h-5 w-5 text-amber-300" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-800">{t("title")}</h2>
            <p className="text-sm text-slate-500">{t("subtitle")}</p>
          </div>
        </div>
        {data && !data.migrationPending && (
          <div className="mt-4 flex flex-wrap gap-2" data-testid="review-queue-summary">
            <Stat label={t("needsAttention")} value={data.summary.needsAttention} />
            <Stat label={t("critical")} value={data.summary.byPriority.critical} />
            <Stat label={t("total")} value={data.summary.total} />
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {(["open", "critical", "all"] as const).map((f) => (
            <Button variant="unstyled" key={f} type="button" onClick={() => setFilter(f)} aria-pressed={filter === f}
              className={`rounded-surface border px-3 py-1.5 text-xs font-bold transition ${filter === f ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
              {f === "open" ? t("open") : f === "critical" ? t("critical") : t("all")}
            </Button>
          ))}
          <Button variant="unstyled" onClick={() => void load()} disabled={loading}
            className="rounded-surface border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("reload")}
          </Button>
        </div>
        {error && <p className="mt-3 text-sm font-semibold text-rose-700">{error}</p>}
      </div>

      {data?.migrationPending && (
        <div className="rounded-overlay border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800" data-testid="review-queue-migration">
          <ShieldAlert className="mr-1.5 inline h-4 w-4" /> {data.note || t("migrationPending")}
        </div>
      )}

      {/* A PARTIAL queue is never shown as a complete "all clear": the failed
          sources are named and decisions are disabled until they recover. */}
      {data && !data.migrationPending && (data.partialFailures?.length ?? 0) > 0 && (
        <div className="rounded-overlay border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800" data-testid="review-queue-partial">
          <AlertTriangle className="mr-1.5 inline h-4 w-4" />
          {data.note || `${data.partialFailures.join(", ")} — queue is partial.`}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-overlay border border-slate-200 bg-white p-8 text-xs font-semibold text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}
        </div>
      ) : visible.length === 0 && !data?.migrationPending ? (
        <div className="rounded-overlay border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500" data-testid="review-queue-empty">
          <CheckCircle2 className="mx-auto mb-2 h-5 w-5 text-emerald-500" /> {t("empty")}
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((item) => (
            <div key={item.itemKey} className="rounded-overlay border border-slate-200 bg-white p-4 shadow-xs" data-testid="review-queue-item">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${priorityClass[item.priority]}`}>{item.priority}</span>
                  <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">{item.category}</span>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${statusClass[item.status]}`}>{item.status}</span>
                </div>
                <span className="text-xs text-slate-500">
                  {item.entityType ? `${item.entityType} #${item.entityId ?? "—"}` : t("system")}{item.fieldKey ? ` · ${item.fieldKey}` : ""}
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-800"><AlertTriangle className="mr-1 inline h-3.5 w-3.5 text-amber-500" />{item.reason}</p>
              <p className="mt-1 text-sm text-slate-600">{t("nextAction")}: {item.nextAction}</p>
              {item.sourceUrl && (
                <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:underline">
                  <ExternalLink className="h-3 w-3" /> {t("source")}
                </a>
              )}
              {item.decisionReason && <p className="mt-1 text-sm text-slate-500">{t("decisionReason")}: {item.decisionReason}</p>}
              {(item.status === "open" || item.status === "in_review") && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input type="text" value={reasonDraft[item.itemKey] ?? ""} onChange={(e) => setReasonDraft((d) => ({ ...d, [item.itemKey]: e.target.value }))}
                    placeholder={t("reasonPlaceholder")} maxLength={500}
                    className="min-w-[220px] flex-1 rounded-surface border border-slate-200 px-2 py-1.5 text-sm" />
                  <Button variant="unstyled" type="button" disabled={busyKey === item.itemKey} onClick={() => void decide(item, "start_review")}
                    className="rounded-surface border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60">{t("startReview")}</Button>
                  <Button variant="unstyled" type="button" disabled={busyKey === item.itemKey} onClick={() => void decide(item, "resolve")}
                    className="rounded-surface bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60">{t("resolve")}</Button>
                  <Button variant="unstyled" type="button" disabled={busyKey === item.itemKey} onClick={() => void decide(item, "dismiss")}
                    className="rounded-surface border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60">{t("dismiss")}</Button>
                </div>
              )}
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{t("neverAutoVerified")}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-surface border border-slate-200 bg-slate-50 px-3 py-1.5">
      <span className="block text-xs font-semibold text-slate-500">{label}</span>
      <span className="block text-sm font-extrabold text-slate-800">{value}</span>
    </div>
  );
}
