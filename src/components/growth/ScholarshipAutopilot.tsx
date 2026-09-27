"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  Bookmark,
  BookmarkCheck,
  CalendarClock,
  CheckCircle2,
  DollarSign,
  ExternalLink,
  EyeOff,
  FileText,
  Inbox,
  RefreshCw,
  Rocket,
  RotateCcw,
  Sparkles,
  Undo2,
} from "lucide-react";
import type { StudentProfile } from "../Navbar";
import { api, EmptyState, ErrorNote, LoadingBlock, PageHeader, Segmented, StatCard, Toast, useToast } from "./ui";

interface Tags {
  essay: boolean;
  fullFunding: boolean;
  closingSoon: boolean;
  closed: boolean;
  recurring: boolean;
  reopens: boolean;
  expectedDeadline: string | null;
  daysLeft: number | null;
}

interface Item {
  id: number;
  title: string;
  provider: string;
  country: string;
  coverageType: string;
  amountUsdValue: number | null;
  deadlineDate: string | null;
  matchScore: number | null;
  websiteUrl: string;
  reasons: string[];
  issues: string[];
  tags: Tags;
  decision: "applied" | "hidden" | null;
  saved: boolean;
}

interface Data {
  queue: Item[];
  applied: Item[];
  hidden: Item[];
  similar: { id: number; basedOn: string; similarity: number }[];
  stats: { matches: number; applied: number; hidden: number; closingSoon: number; reopening: number; potentialUsd: number };
}

type Filter = "all" | "noEssay" | "full" | "soon";
type View = "queue" | "applied" | "hidden";

const money = (n: number | null) => (n == null ? "—" : `$${n.toLocaleString("en-US")}`);

/**
 * Scholarship Autopilot — ScholarshipOwl's "match queue" idea, adapted.
 * One prioritised list; each card has three clear buttons. Nothing is
 * submitted on the student's behalf: "I applied" is their own record.
 */
export function ScholarshipAutopilot({
  activeProfile,
  onSaveScholarship,
  onNavigate,
}: {
  activeProfile: StudentProfile | null;
  onSaveScholarship?: (id: number) => Promise<void> | void;
  onNavigate?: (tab: string) => void;
}) {
  const t = useTranslations("autopilot");
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("queue");
  const [filter, setFilter] = useState<Filter>("all");
  const [busy, setBusy] = useState<number | null>(null);
  const [toast, showToast] = useToast();
  const [reload, setReload] = useState(0);
  const profileId = activeProfile?.id ?? null;

  useEffect(() => {
    if (!profileId) return;
    let live = true;
    api<Data>(`/api/autopilot?profileId=${profileId}`)
      .then((d) => {
        if (live) {
          setData(d);
          setError(null);
        }
      })
      .catch((e: Error) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [profileId, reload]);

  const decide = useCallback(
    async (item: Item, action: "applied" | "hidden" | "reset") => {
      if (!profileId) return;
      setBusy(item.id);
      try {
        await api("/api/autopilot", { method: "POST", body: JSON.stringify({ profileId, scholarshipId: item.id, action }) });
        showToast(action === "applied" ? t("toastApplied") : action === "hidden" ? t("toastHidden") : t("toastRestored"));
        setReload((r) => r + 1);
      } catch (e) {
        showToast((e as Error).message);
      } finally {
        setBusy(null);
      }
    },
    [profileId, showToast, t]
  );

  const save = async (item: Item) => {
    if (!onSaveScholarship) return;
    setBusy(item.id);
    try {
      await onSaveScholarship(item.id);
      showToast(t("toastSaved"));
      setData((d) =>
        d ? { ...d, queue: d.queue.map((q) => (q.id === item.id ? { ...q, saved: true } : q)) } : d
      );
    } finally {
      setBusy(null);
    }
  };

  const list = useMemo(() => {
    if (!data) return [];
    const base = view === "queue" ? data.queue : view === "applied" ? data.applied : data.hidden;
    if (view !== "queue") return base;
    return base.filter((s) =>
      filter === "noEssay" ? !s.tags.essay : filter === "full" ? s.tags.fullFunding : filter === "soon" ? s.tags.closingSoon : true
    );
  }, [data, view, filter]);

  const similarItems = useMemo(() => {
    if (!data) return [];
    return data.similar
      .map((s) => ({ ...s, item: data.queue.find((q) => q.id === s.id) }))
      .filter((s): s is typeof s & { item: Item } => !!s.item);
  }, [data]);

  if (!profileId) return <EmptyState icon={Rocket} title={t("signInTitle")} body={t("signInBody")} />;

  const deadlineText = (s: Item) => {
    if (s.tags.reopens && s.tags.expectedDeadline) return t("expected", { date: s.tags.expectedDeadline });
    if (s.tags.daysLeft != null) return t("daysLeft", { days: s.tags.daysLeft });
    return t("noDeadline");
  };

  const card = (s: Item, i: number) => (
    <motion.li
      key={s.id}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.22, delay: Math.min(i, 6) * 0.03 }}
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
          <span className="text-base font-black leading-none">{s.matchScore ?? "—"}</span>
          <span className="text-[9px] font-bold uppercase">{t("match")}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-snug text-slate-900">{s.title}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {s.provider} · {s.country}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
              <DollarSign className="h-3 w-3" /> {money(s.amountUsdValue)}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                s.tags.closingSoon ? "bg-rose-100 text-rose-700" : s.tags.reopens ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-700"
              }`}
            >
              <CalendarClock className="h-3 w-3" /> {deadlineText(s)}
            </span>
            {s.tags.fullFunding && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">{t("tagFull")}</span>}
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${s.tags.essay ? "bg-amber-100 text-amber-700" : "bg-teal-100 text-teal-700"}`}>
              <FileText className="h-3 w-3" /> {s.tags.essay ? t("tagEssay") : t("tagNoEssay")}
            </span>
            {s.tags.recurring && <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700"><RefreshCw className="h-3 w-3" /> {t("tagRecurring")}</span>}
          </div>
          {view === "queue" && s.reasons.length > 0 && (
            <p className="mt-2 text-[11px] leading-snug text-emerald-700">+ {s.reasons[0]}</p>
          )}
          {view === "queue" && s.issues.length > 0 && <p className="mt-0.5 text-[11px] leading-snug text-amber-700">! {s.issues[0]}</p>}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
        {view === "queue" && (
          <>
            <button
              disabled={busy === s.id}
              onClick={() => decide(s, "applied")}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> {t("applied")}
            </button>
            <button
              disabled={busy === s.id || s.saved || !onSaveScholarship}
              onClick={() => save(s)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
            >
              {s.saved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />} {s.saved ? t("saved") : t("save")}
            </button>
            <button
              disabled={busy === s.id}
              onClick={() => decide(s, "hidden")}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <EyeOff className="h-3.5 w-3.5" /> {t("notForMe")}
            </button>
          </>
        )}
        {view !== "queue" && (
          <button
            disabled={busy === s.id}
            onClick={() => decide(s, "reset")}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {view === "applied" ? <Undo2 className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />} {view === "applied" ? t("undo") : t("restore")}
          </button>
        )}
        {s.websiteUrl && (
          <a
            href={s.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            <ExternalLink className="h-3.5 w-3.5" /> {t("official")}
          </a>
        )}
      </div>
    </motion.li>
  );

  return (
    <div className="space-y-4">
      <PageHeader icon={Rocket} title={t("title")} subtitle={t("subtitle")} accent="violet">
        {onNavigate && (
          <button
            onClick={() => onNavigate("vault")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <Archive className="h-3.5 w-3.5" /> {t("openVault")}
          </button>
        )}
      </PageHeader>

      {error && <ErrorNote message={error} onRetry={() => setReload((r) => r + 1)} retryLabel={t("retry")} />}
      {!data && !error && <LoadingBlock label={t("loading")} />}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
            <StatCard label={t("statMatches")} value={data.stats.matches} icon={Sparkles} tone="indigo" />
            <StatCard label={t("statSoon")} value={data.stats.closingSoon} icon={CalendarClock} tone="rose" />
            <StatCard label={t("statApplied")} value={data.stats.applied} icon={CheckCircle2} tone="emerald" />
            <StatCard label={t("statPotential")} value={money(data.stats.potentialUsd)} icon={DollarSign} tone="violet" />
          </div>

          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <Segmented
              value={view}
              onChange={setView}
              ariaLabel={t("title")}
              options={[
                { id: "queue", label: t("viewQueue"), count: data.queue.length },
                { id: "applied", label: t("viewApplied"), count: data.applied.length },
                { id: "hidden", label: t("viewHidden"), count: data.hidden.length },
              ]}
            />
            {view === "queue" && (
              <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
                {(["all", "noEssay", "full", "soon"] as Filter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold ${
                      filter === f ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {f === "all" ? t("fAll") : f === "noEssay" ? t("fNoEssay") : f === "full" ? t("fFull") : t("fSoon")}
                  </button>
                ))}
              </div>
            )}
          </div>

          {view === "queue" && data.stats.reopening > 0 && (
            <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">{t("reopenNote", { count: data.stats.reopening })}</p>
          )}

          {view === "queue" && similarItems.length > 0 && (
            <div className="rounded-2xl border border-violet-200 bg-violet-50 p-3">
              <p className="text-xs font-bold text-violet-900">{t("similarTitle")}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {similarItems.map((s) => (
                  <span key={s.id} className="rounded-lg border border-violet-200 bg-white px-2.5 py-1.5 text-[11px] text-violet-900">
                    <b>{s.item.title}</b> <span className="text-violet-500">· {t("similarTo", { title: s.basedOn })}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {list.length === 0 ? (
            <EmptyState
              icon={view === "queue" ? Inbox : view === "applied" ? CheckCircle2 : EyeOff}
              title={view === "queue" ? t("emptyQueue") : view === "applied" ? t("emptyApplied") : t("emptyHidden")}
              body={view === "queue" ? t("emptyQueueBody") : undefined}
              action={
                view === "queue" && onNavigate ? (
                  <button onClick={() => onNavigate("profile")} className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700">
                    {t("improveProfile")}
                  </button>
                ) : undefined
              }
            />
          ) : (
            <ul className="grid gap-3 xl:grid-cols-2">
              <AnimatePresence initial={false}>{list.map(card)}</AnimatePresence>
            </ul>
          )}
          <p className="text-center text-[11px] text-slate-400">{t("disclaimer")}</p>
        </>
      )}
      <Toast message={toast} />
    </div>
  );
}
