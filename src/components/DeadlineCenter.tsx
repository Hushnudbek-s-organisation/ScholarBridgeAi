"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { SmartTimelineCalendar } from "./SmartTimelineCalendar";
import {
  CalendarClock,
  Loader2,
  RefreshCw,
  GraduationCap,
  Award,
  CheckSquare,
  Clock,
  ExternalLink,
  FileText,
  FlaskConical,
} from "lucide-react";
import { AppNote } from "@/components/AppNote";

interface DeadlineItem {
  id: string;
  type: "scholarship" | "university" | "milestone" | "application" | "test";
  title: string;
  subtitle: string;
  date: string | null;
  status: string;
  daysRemaining: number | null;
  source: string | null;
  saved: boolean;
  testType?: string;
  testLocation?: string | null;
  testRegistered?: boolean;
  /** critical (≤14d) · soon (≤45d) · planned · past · undated */
  urgency?: "critical" | "soon" | "planned" | "past" | "undated";
}

interface DeadlineCenterProps {
  profileId: number | null;
}

const TYPE_META: Record<DeadlineItem["type"], { labelKey: string; icon: React.ReactNode }> = {
  scholarship: { labelKey: "types.scholarship", icon: <Award className="h-3.5 w-3.5 text-amber-500" /> },
  university: { labelKey: "types.university", icon: <GraduationCap className="h-3.5 w-3.5 text-indigo-500" /> },
  milestone: { labelKey: "types.milestone", icon: <CheckSquare className="h-3.5 w-3.5 text-emerald-500" /> },
  application: { labelKey: "types.application", icon: <FileText className="h-3.5 w-3.5 text-rose-500" /> },
  test: { labelKey: "types.test", icon: <FlaskConical className="h-3.5 w-3.5 text-sky-500" /> },
};

const URGENCY_META: Record<NonNullable<DeadlineItem["urgency"]>, { dot: string; labelKey: string; chip: string }> = {
  critical: { dot: "🔴", labelKey: "urgency.critical", chip: "bg-red-50 text-red-700 border-red-200" },
  soon: { dot: "🟠", labelKey: "urgency.soon", chip: "bg-orange-50 text-orange-700 border-orange-200" },
  planned: { dot: "🟡", labelKey: "urgency.planned", chip: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  past: { dot: "⚪", labelKey: "urgency.passed", chip: "bg-slate-100 text-slate-500 border-slate-200" },
  undated: { dot: "⚪", labelKey: "urgency.noDate", chip: "bg-slate-100 text-slate-500 border-slate-200" },
};

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-emerald-100 text-emerald-700 border-emerald-200",
  CLOSED: "bg-slate-200 text-slate-600 border-slate-200",
  UPCOMING: "bg-amber-100 text-amber-700 border-amber-200",
  ROLLING: "bg-sky-100 text-sky-700 border-sky-200",
  "DATE NOT ANNOUNCED": "bg-slate-100 text-slate-500 border-slate-200",
  "NO DEADLINE ON FILE": "bg-slate-100 text-slate-500 border-slate-200",
  UNKNOWN: "bg-slate-100 text-slate-500 border-slate-200",
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  COMPLETED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  REGISTERED: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

function safeHttpsUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

const STATUS_TRANSLATIONS: Record<string, string> = {
  OPEN: "open",
  CLOSED: "closed",
  UPCOMING: "upcoming",
  ROLLING: "rolling",
  "DATE NOT ANNOUNCED": "dateNotAnnounced",
  "NO DEADLINE ON FILE": "noDeadlineOnFile",
  UNKNOWN: "unknown",
  PENDING: "pending",
  COMPLETED: "completed",
  REGISTERED: "registered",
  NOT_STARTED: "notStarted",
  PREPARING: "preparing",
  ESSAY: "essay",
  DOCUMENTS: "documents",
  RECOMMENDATIONS: "recommendations",
  FEE_PAID: "feePaid",
  SUBMITTED: "submitted",
  INTERVIEW: "interview",
  DECISION: "decision",
  WITHDRAWN: "withdrawn",
};

export function DeadlineCenter({ profileId }: DeadlineCenterProps) {
  const t = useTranslations("deadlineCenter");
  const locale = useLocale();
  const [items, setItems] = useState<DeadlineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const requestSequence = useRef(0);

  const text = (key: string, values?: Record<string, string | number>) => t(key as never, values as never);

  const load = useCallback(async () => {
    const sequence = ++requestSequence.current;
    if (!profileId) {
      setItems([]);
      setLoadFailed(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadFailed(false);
    try {
      const res = await fetch(`/api/deadlines?profileId=${profileId}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.items)) throw new Error("Deadline response unavailable");
      if (requestSequence.current === sequence) setItems(data.items as DeadlineItem[]);
    } catch (err) {
      console.error("Failed to load deadlines:", err);
      if (requestSequence.current === sequence) setLoadFailed(true);
    } finally {
      if (requestSequence.current === sequence) setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => {
      window.clearTimeout(timer);
      requestSequence.current += 1;
    };
  }, [load]);

  const urgentCount = items.filter((item) => item.urgency === "critical" && item.status !== "COMPLETED").length;
  const soonCount = items.filter((item) => item.urgency === "soon" && item.status !== "COMPLETED").length;
  const openCount = items.filter((item) => item.status === "OPEN").length;

  const statusText = (status: string) => {
    const statusKey = STATUS_TRANSLATIONS[status.trim().toUpperCase()] ?? "other";
    return text(`statuses.${statusKey}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
          <CalendarClock className="h-5 w-5 text-indigo-600" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-extrabold text-slate-800">{t("title")}</h2>
          <p className="text-xs text-slate-500">{t("subtitle")}</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
          {urgentCount > 0 && (
            <span className="inline-flex min-h-8 max-w-full items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-bold text-red-600">
              <Clock className="h-3 w-3 shrink-0" /> {t("criticalCount", { count: urgentCount })}
            </span>
          )}
          {soonCount > 0 && (
            <span className="inline-flex min-h-8 max-w-full items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[10px] font-bold text-orange-600">
              🟠 {t("soonCount", { count: soonCount })}
            </span>
          )}
          {openCount > 0 && (
            <span className="inline-flex min-h-8 max-w-full items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
              {t("openCount", { count: openCount })}
            </span>
          )}
          <button
            type="button"
            onClick={() => void load()}
            className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 sm:ml-auto sm:w-auto"
          >
            <RefreshCw className="h-3.5 w-3.5" /> {t("refresh")}
          </button>
        </div>
      </div>

      {/* Priority 5.3 — the deadlines above are the dates the office gave you.
          This is the backwards plan behind them: what has to be finished at
          D-90, D-60, D-45, D-14 and D-3 for each one to be reachable, and the
          contradictions (an exam booked nine days before a deadline) that make
          one of them impossible. */}
      {profileId ? (
        <SmartTimelineCalendar
          key={`timeline-${profileId}`}
          profileId={profileId}
          onTasksSynced={() => void load()}
        />
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {!profileId ? (
          <p className="p-8 text-center text-xs font-semibold text-slate-500">{t("noProfile")}</p>
        ) : loading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-xs font-semibold text-slate-500" role="status" aria-live="polite">
            <Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}
          </div>
        ) : loadFailed ? (
          <div className="p-8 text-center text-xs font-semibold text-rose-700" role="alert">
            {t("loadFailed")}
          </div>
        ) : items.length === 0 ? (
          <p className="p-8 text-center text-xs font-semibold text-slate-500">{t("empty")}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((item) => {
              const meta = TYPE_META[item.type] || TYPE_META.milestone;
              const days = item.daysRemaining;
              const completed = item.status === "COMPLETED";
              const isUrgent = days !== null && days >= 0 && days <= 14 && !completed;
              const isOverdue = days !== null && days < 0 && !completed;
              const urgency = completed ? null : URGENCY_META[item.urgency ?? (isOverdue ? "past" : "undated")];
              const title = item.type === "test" && item.testType
                ? item.testLocation
                  ? t("testAtLocation", { test: item.testType.toUpperCase(), location: item.testLocation })
                  : t("testTitle", { test: item.testType.toUpperCase() })
                : item.title;
              const externalSource = safeHttpsUrl(item.source);
              const subtitle = item.type === "test"
                ? item.testRegistered ? t("testRegistered") : t("testNotRegistered")
                : item.subtitle;
              const date = item.date ? new Date(item.date) : null;
              return (
                <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-slate-50/60 sm:flex-nowrap">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-slate-50" aria-hidden="true">
                    {meta.icon}
                  </div>
                  <span className="sr-only">{text(meta.labelKey)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="min-w-0 break-words text-xs font-bold text-slate-800">{title}</span>
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLES[item.status] || "bg-slate-100 text-slate-500 border-slate-200"}`}>
                        {statusText(item.status)}
                      </span>
                      {urgency && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${urgency.chip}`}
                          title={text(urgency.labelKey)}
                        >
                          <span aria-hidden="true">{urgency.dot}</span>
                          {text(urgency.labelKey)}
                        </span>
                      )}
                    </div>
                    {subtitle && <p className="break-words text-[11px] text-slate-600">{subtitle}</p>}
                    {externalSource && (
                      <a
                        href={externalSource}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${t("openReference")}: ${title}`}
                        className="inline-flex min-h-11 items-center gap-1 rounded-md px-1 text-xs font-semibold text-indigo-800 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700"
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> {t("openReference")}
                      </a>
                    )}
                  </div>
                  <div className="ml-auto shrink-0 text-right sm:ml-0">
                    {date ? (
                      <>
                        <p className="text-xs font-bold text-slate-700">{date.toLocaleDateString(locale)}</p>
                        {days !== null && !completed && (
                          <p className={`text-[10px] font-bold ${isOverdue ? "text-red-600" : isUrgent ? "text-amber-700" : "text-slate-600"}`}>
                            {isOverdue ? t("daysOverdue", { days: Math.abs(days) }) : t("daysLeft", { days })}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-[10px] text-slate-500">{t("dateTba")}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <AppNote kind="planning" className="mt-2" />
    </div>
  );
}
