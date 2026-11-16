"use client";

import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/Button";
import type { SchollyWeeklyReportResponse } from "@/lib/scholly-weekly-report";

const copy = {
  uz: {
    title: "Scholly bilan hafta yakuni",
    loading: "Haftalik hisobot yuklanmoqda…",
    empty: "Birinchi hisobotingiz yakshanba kuni mahalliy vaqt bilan 18:30 da chiqadi.",
    error: "Hisobotni hozir ochib bo‘lmadi.",
    retry: "Qayta urinish",
    ending: "Hafta yakuni",
    missions: "Bajarilgan missiyalar",
    points: "Yig‘ilgan ballar",
    sopWords: "SOPga qo‘shilgan so‘zlar",
    previous: "Oldingi hafta",
    goals: "Keyingi hafta uchun maqsad tanlang",
    universities: "Universitetlarni saralash",
    essays: "SOPni tahrirlash",
    documents: "Hujjatlarni tayyorlash",
  },
  ru: {
    title: "Итоги недели со Scholly",
    loading: "Загружаем отчёт за неделю…",
    empty: "Первый отчёт появится в воскресенье в 18:30 по местному времени.",
    error: "Сейчас не удалось открыть отчёт.",
    retry: "Попробовать снова",
    ending: "Неделя до",
    missions: "Выполненные задания",
    points: "Заработанные баллы",
    sopWords: "Слова, добавленные в SOP",
    previous: "Предыдущая неделя",
    goals: "Выберите цель на следующую неделю",
    universities: "Подобрать университеты",
    essays: "Доработать SOP",
    documents: "Подготовить документы",
  },
  en: {
    title: "Your week with Scholly",
    loading: "Loading your weekly report…",
    empty: "Your first report will be ready on Sunday at 6:30 pm local time.",
    error: "Your weekly report couldn’t be loaded.",
    retry: "Try again",
    ending: "Week ending",
    missions: "Missions completed",
    points: "Points earned",
    sopWords: "Words added to SOP drafts",
    previous: "Previous week",
    goals: "Choose a goal for next week",
    universities: "Shortlist universities",
    essays: "Revise my SOP",
    documents: "Prepare documents",
  },
} as const;

type ReportState =
  | { profileId: number; status: "ready"; payload: SchollyWeeklyReportResponse }
  | { profileId: number; status: "error" };

export function SchollyWeeklyReport({ profileId, onNavigate }: { profileId: number; onNavigate: (tab: string) => void }) {
  const locale = useLocale();
  const labels = copy[locale.startsWith("ru") ? "ru" : locale.startsWith("en") ? "en" : "uz"];
  const [open, setOpen] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [state, setState] = useState<ReportState | null>(null);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;

    async function loadReport() {
      try {
        const response = await fetch(`/api/scholly/weekly-report?profileId=${profileId}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("weekly_report_unavailable");
        const payload = await response.json() as SchollyWeeklyReportResponse;
        if (controller.signal.aborted) return;
        setState({ profileId, status: "ready", payload });
        const nextReport = Date.parse(payload.nextReportAt);
        if (Number.isFinite(nextReport)) {
          refreshTimer = setTimeout(loadReport, Math.max(60_000, nextReport - Date.now() + 1_000));
        }
      } catch {
        if (!controller.signal.aborted) setState({ profileId, status: "error" });
      }
    }

    void loadReport();
    return () => {
      controller.abort();
      clearTimeout(refreshTimer);
    };
  }, [open, profileId, loadAttempt]);

  const visibleState = state?.profileId === profileId ? state : null;
  const report = visibleState?.status === "ready" ? visibleState.payload.report : null;
  const number = new Intl.NumberFormat(locale);
  const date = report && new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" })
    .format(new Date(`${report.endedOn}T00:00:00.000Z`));

  return <details className="sb-overview-panel" onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-base font-semibold text-[var(--sb-ink-heading)]">
      <BarChart3 className="h-5 w-5" aria-hidden="true" />{labels.title}
    </summary>
    {open && <div className="mt-3 space-y-4">
      {!visibleState && <p role="status" className="text-sm">{labels.loading}</p>}
      {visibleState?.status === "error" && <div className="flex flex-wrap items-center gap-3">
        <p role="status" className="text-sm">{labels.error}</p>
        <Button variant="outline" onClick={() => {
          setState(null);
          setLoadAttempt((attempt) => attempt + 1);
        }}>{labels.retry}</Button>
      </div>}
      {visibleState?.status === "ready" && !report && <p className="text-sm">{labels.empty}</p>}
      {report && <>
        <p className="text-sm text-[var(--sb-ink-muted)]">{labels.ending} <time dateTime={report.endedOn}>{date}</time></p>
        <dl className="grid gap-2 sm:grid-cols-3">
          {(["missions", "points", "sopWords"] as const).map((key) => <div key={key} className="rounded-xl bg-[var(--sb-well)] p-3">
            <dt className="text-sm">{labels[key]}</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums text-[var(--sb-ink-heading)]">{number.format(report.current[key])}</dd>
            <dd className="mt-1 text-xs text-[var(--sb-ink-muted)]">{labels.previous} · {number.format(report.previous[key])}</dd>
          </div>)}
        </dl>
        <div className="space-y-2">
          <p className="font-semibold text-[var(--sb-ink-heading)]">{labels.goals}</p>
          <div className="flex flex-wrap gap-2">
            {(["universities", "essays", "documents"] as const).map((tab) => <Button key={tab} variant="outline" onClick={() => onNavigate(tab)}>{labels[tab]}</Button>)}
          </div>
        </div>
      </>}
    </div>}
  </details>;
}
