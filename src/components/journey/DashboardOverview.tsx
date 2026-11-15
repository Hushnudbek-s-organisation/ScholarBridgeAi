"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowRight, Bookmark, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight,
  Circle, Compass, FileCheck2, ListChecks, Sparkles, Target,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { ProgressRing } from "@/components/ui/journey";
import type { SchollyMissionTheme, SchollyMissionType } from "@/lib/scholly-missions";
import type { JourneyDashboard } from "./JourneyControlCenter";

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

type MissionView = {
  id: number;
  type: SchollyMissionType;
  theme: SchollyMissionTheme;
  status: "pending" | "done" | "skipped";
  sizeMin: number;
  points: number;
  progress: number;
  target: number;
  complete: boolean;
  anotherUsed: boolean;
};

type MissionResponse = { mission?: MissionView; justCompleted?: boolean };

function completionKey(profileId: number) {
  return `scholly:mission-dismissed:${profileId}`;
}

function isCompletionDismissed(profileId: number, missionId: number) {
  try {
    return localStorage.getItem(completionKey(profileId)) === String(missionId);
  } catch {
    return false;
  }
}

const missionCopy = {
  uz: {
    title: "Bugungi missiya", readiness: "Ariza tayyorligi", chosen: "Scholly tanladi",
    theme: { plan: "Reja", writing: "Yozuv", language: "Til", search: "Qidiruv", speaking: "Speaking va viza", light: "Yengil kun", review: "Hafta yakuni" },
    finished: "Bugunga bo‘ldi!", dismiss: "Bugunni yakunlash", tomorrow: "Ertaga yangi missiya kutadi.", loading: "Missiya yuklanmoqda…", error: "Bugungi missiya hozir ochilmadi.",
    tasks: { fill_profile_fields: "Profil ma’lumotlarini to‘ldiring", save_universities: "Universitetlarni saqlang", upload_document: "Hujjat yuklang" },
    sopTask: (words: number) => `SOP uchun ${words} ta so‘z yozing`,
    open: "Vazifani ochish", check: "Progressni tekshirish", another: "Boshqa missiya", skip: "Bugun o‘tkazib yuborish", retry: "Qayta urinish",
    done: "Bajarildi — ball hisoblandi", skipped: "Bugungi missiya o‘tkazib yuborildi", points: "ball", minutes: "daq", progress: "Bajarilish",
  },
  en: {
    title: "Today’s mission", readiness: "Application readiness", chosen: "Chosen by Scholly",
    theme: { plan: "Planning", writing: "Writing", language: "Language", search: "Discovery", speaking: "Speaking and visas", light: "Light day", review: "Weekly review" },
    finished: "You’re done for today!", dismiss: "Done for today", tomorrow: "A new mission will be ready tomorrow.", loading: "Loading mission…", error: "Today's mission is unavailable right now.",
    tasks: { fill_profile_fields: "Complete profile details", save_universities: "Save universities", upload_document: "Upload a document" },
    sopTask: (words: number) => `Write ${words} words for your SOP`,
    open: "Open task", check: "Check progress", another: "Another mission", skip: "Skip for today", retry: "Retry",
    done: "Completed — points awarded", skipped: "Today's mission was skipped", points: "points", minutes: "min", progress: "Progress",
  },
  ru: {
    title: "Задание на сегодня", readiness: "Готовность заявки", chosen: "Выбор Scholly",
    theme: { plan: "Планирование", writing: "Письмо", language: "Язык", search: "Поиск", speaking: "Разговорная практика и визы", light: "Лёгкий день", review: "Итоги недели" },
    finished: "На сегодня всё!", dismiss: "Завершить день", tomorrow: "Завтра вас ждёт новое задание.", loading: "Загрузка задания…", error: "Сегодняшнее задание сейчас недоступно.",
    tasks: { fill_profile_fields: "Заполните профиль", save_universities: "Сохраните университеты", upload_document: "Загрузите документ" },
    sopTask: (words: number) => `Добавьте слова в SOP (${words})`,
    open: "Открыть задачу", check: "Проверить прогресс", another: "Другое задание", skip: "Пропустить сегодня", retry: "Повторить",
    done: "Выполнено — баллы начислены", skipped: "Задание на сегодня пропущено", points: "баллов", minutes: "мин", progress: "Прогресс",
  },
} as const;

/** Compact production dashboard. Every task, date, application count and recommendation comes from /api/dashboard. */
export function DashboardOverview({ data, primaryTitle, primaryDetail, primaryLabel, primaryTab, currentStage, onNavigate, getStepTitle, getStepDetail }: {
  data: JourneyDashboard;
  primaryTitle: string;
  primaryDetail: string;
  primaryLabel: string;
  primaryTab: string;
  currentStage: string;
  onNavigate: (tab: string) => void;
  getStepTitle: (step: JourneyDashboard["nextSteps"][number]) => string;
  getStepDetail: (step: JourneyDashboard["nextSteps"][number]) => string;
}) {
  const t = useTranslations("journey");
  const locale = useLocale();
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const [recommendationTab, setRecommendationTab] = useState<"universities" | "scholarships" | "opportunities">("universities");
  const [mission, setMission] = useState<MissionView | null>(null);
  const [missionError, setMissionError] = useState(false);
  const [missionBusy, setMissionBusy] = useState(false);
  const [dismissedMission, setDismissedMission] = useState<number | null>(null);
  const missionHeading = useRef<HTMLHeadingElement>(null);
  const profileId = data.profile.id;
  const copy = missionCopy[locale.startsWith("ru") ? "ru" : locale.startsWith("en") ? "en" : "uz"];
  const [greetingBefore, greetingAfter] = t("overviewGreeting", { name: "\uFFF0" }).split("\uFFF0");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/scholly/mission?profileId=${profileId}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("mission_unavailable");
        return response.json() as Promise<MissionResponse>;
      })
      .then(({ mission: next, justCompleted }) => {
        if (controller.signal.aborted) return;
        if (!next) throw new Error("mission_unavailable");
        if (justCompleted) window.dispatchEvent(new Event("scholly:mission-done"));
        setDismissedMission(isCompletionDismissed(profileId, next.id) ? next.id : null);
        setMission(next);
        setMissionError(false);
      })
      .catch((error: unknown) => { if (!(error instanceof DOMException && error.name === "AbortError")) setMissionError(true); });
    return () => controller.abort();
  }, [profileId]);

  async function updateMission(action: "skip" | "another" | "refresh") {
    setMissionBusy(true);
    setMissionError(false);
    try {
      const response = await fetch("/api/scholly/mission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, action }),
      });
      const result = await response.json() as MissionResponse;
      if (!response.ok || !result.mission) throw new Error("mission_update_failed");
      if (result.justCompleted) window.dispatchEvent(new Event("scholly:mission-done"));
      setDismissedMission(isCompletionDismissed(profileId, result.mission.id) ? result.mission.id : null);
      setMission(result.mission);
      setMissionError(false);
    } catch {
      setMissionError(true);
    } finally {
      setMissionBusy(false);
    }
  }

  function dismissCompletion(missionId: number) {
    try {
      localStorage.setItem(completionKey(profileId), String(missionId));
    } catch {
      // The summary can still be dismissed when storage is disabled.
    }
    setDismissedMission(missionId);
    missionHeading.current?.focus();
  }

  const monthDays = useMemo(() => {
    const offset = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array(offset).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
  }, [month]);
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(month);
  const weekdays = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(2026, 0, 4 + i)));
  const deadlinesByDate = useMemo(() => {
    const grouped = new Map<string, JourneyDashboard["deadlines"]>();
    for (const item of data.deadlines) grouped.set(item.dueDate.slice(0, 10), [...(grouped.get(item.dueDate.slice(0, 10)) ?? []), item]);
    return grouped;
  }, [data.deadlines]);
  const selectedDeadlines = deadlinesByDate.get(selectedDate) ?? [];
  const recommendations = recommendationTab === "universities"
    ? data.recommended.universities.slice(0, 3).map((item) => ({ title: item.name, detail: [item.city, item.country].filter(Boolean).join(", "), tab: "universities" }))
    : recommendationTab === "scholarships"
      ? data.recommended.scholarships.slice(0, 3).map((item) => ({ title: item.title, detail: item.provider, tab: "scholarships" }))
      : data.recommended.opportunities.slice(0, 3).map((item) => ({ title: item.title, detail: [item.provider, item.country].filter(Boolean).join(" · "), tab: "opportunities" }));
  const tasks = data.nextSteps.slice(0, 3);
  const appCounts = data.applications;
  const statusTotal = Math.max(1, appCounts.preparing + appCounts.submitted + appCounts.decision);
  const moveMonth = (delta: number) => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  const readiness = Math.max(0, Math.min(100, Math.round(data.readiness.overall)));
  const dayLabel = (remaining: number | null) => remaining == null ? t("overviewDateSet") : t("overviewDaysLeft", { count: remaining });

  return <>
    <header className="sb-overview-heading">
      <h1>{greetingBefore}<span>{data.profile.name}</span>{greetingAfter}</h1>
      <p>{t("overviewTitle")}</p>
    </header>
    <div className="sbOverviewTopGrid">
      <section className="sb-overview-panel sb-overview-hero sbOverviewNextStep" data-testid="dashboard-next-action">
        <div className="sb-overview-hero-copy">
          <h2>{t("overviewNextAction")}</h2>
          <p className="sb-overview-action-title">{primaryTitle}</p>
          <p className="sbOverviewDetail">{primaryDetail}</p>
          <div className="sb-overview-actions">
            <Button data-action="primary" onClick={() => onNavigate(primaryTab)}>{primaryLabel}<ArrowRight aria-hidden className="h-4 w-4" /></Button>
            <button type="button" className="sbOverviewStudyPlan" onClick={() => onNavigate("study-plan")}><CalendarDays aria-hidden />{t("overviewStudyPlan")}</button>
          </div>
          <p className="sb-overview-stage">{t("overviewCurrentStage", { stage: currentStage })}</p>
        </div>
        <div className="sbOverviewReadiness">
          <ProgressRing pct={readiness} size={72} strokeWidth={6} label={copy.readiness} />
        </div>
      </section>
      <section className="sb-overview-panel sbOverviewPlan">
        <h2><FileCheck2 aria-hidden />{t("overviewPlan")}</h2>
        <ol>
          {data.journey.stages.slice(0, 4).map((stage) => <li key={stage.id}>
            <span className={stage.done ? "sbOverviewDone" : "sbOverviewStageCircle"}>{stage.done ? <CheckCircle2 aria-hidden /> : <Circle aria-hidden />}</span>
            <button type="button" onClick={() => onNavigate(stage.tab)}>{stage.label}</button>
            <ChevronRight aria-hidden className="sbOverviewChevron" />
          </li>)}
        </ol>
      </section>
    </div>

    <section className="sb-overview-panel sbOverviewMission" aria-labelledby="sb-daily-mission-title">
      <div className="sbOverviewMissionHeading">
        <h2 id="sb-daily-mission-title" ref={missionHeading} tabIndex={-1}><Target aria-hidden />{copy.title}</h2>
        {mission && <span className="sbOverviewMissionPoints">{mission.sizeMin} {copy.minutes} · {mission.points} {copy.points}</span>}
      </div>
      {!mission && !missionError && <p className="sbOverviewMissionMessage" role="status">{copy.loading}</p>}
      {missionError && <div><p className="sbOverviewMissionMessage" role="status">{copy.error}</p><button className="sbOverviewMissionRetry" type="button" disabled={missionBusy} onClick={() => updateMission("refresh")}>{copy.retry}</button></div>}
      {mission && <>
        <div className="sbOverviewMissionSource">
          <Image src="/scholly.webp" alt="" width={28} height={28} />
          <span>{copy.chosen}</span>
          <span className="sbOverviewMissionTheme">{copy.theme[mission.theme]}</span>
        </div>
        <p className="sbOverviewMissionTask">{mission.type === "sop_paragraph" ? copy.sopTask(mission.target) : copy.tasks[mission.type]}</p>
        <p className="sbOverviewMissionStatus" role="status">
          {mission.status === "done" ? copy.done : mission.status === "skipped" ? copy.skipped : `${copy.progress}: ${mission.progress} / ${mission.target}`}
        </p>
        <progress className="sbOverviewMissionProgress" value={mission.status === "done" ? mission.target : mission.progress} max={Math.max(1, mission.target)} aria-label={copy.progress} />
        {mission.status === "done" && dismissedMission !== mission.id && (
          <div className="sbOverviewMissionFinish">
            <div role="status">
              <h3>{copy.finished}</h3>
              <p>+{mission.points} {copy.points} · {copy.readiness} {new Intl.NumberFormat(locale, { style: "percent" }).format(readiness / 100)}</p>
              <p>{copy.tomorrow}</p>
            </div>
            <Button variant="outline" onClick={() => dismissCompletion(mission.id)}>{copy.dismiss}</Button>
          </div>
        )}
        {mission.status === "pending" && <div className="sbOverviewMissionActions">
            <button type="button" className="sbOverviewMissionPrimary" onClick={() => onNavigate(({ fill_profile_fields: "profile", save_universities: "universities", upload_document: "documents", sop_paragraph: "essays" })[mission.type])}>{copy.open}<ArrowRight aria-hidden /></button>
            <button type="button" disabled={missionBusy} onClick={() => updateMission("refresh")}>{copy.check}</button>
            {!mission.anotherUsed && <button type="button" disabled={missionBusy} onClick={() => updateMission("another")}>{copy.another}</button>}
            <button type="button" disabled={missionBusy} onClick={() => updateMission("skip")}>{copy.skip}</button>
        </div>}
      </>}
    </section>

    <div className="sbOverviewMiddleGrid">
      <section className="sb-overview-panel sbOverviewTasks">
        <h2><ListChecks aria-hidden />{t("overviewTasks")}</h2>
        {tasks.length ? <ul>{tasks.map((task) => <li key={task.id}>
          <span className="sbOverviewTaskDot"><CheckCircle2 aria-hidden /></span>
          <button type="button" onClick={() => onNavigate(task.tab)}><strong>{getStepTitle(task)}</strong><small>{getStepDetail(task)}</small></button>
          <ArrowRight aria-hidden className="sbOverviewChevron" />
        </li>)}</ul> : <p className="sbOverviewEmpty">{t("overviewNoTasks")}</p>}
        <button type="button" className="sbOverviewMoreLink" onClick={() => onNavigate("tasks")}>{t("overviewAllTasks")} <ArrowRight aria-hidden /></button>
      </section>
      <section className="sb-overview-panel sbOverviewCalendar">
        <h2><CalendarDays aria-hidden />{t("overviewDeadlines")}</h2>
        <div className="sbOverviewCalendarBody">
          <div className="sbOverviewMonthPanel">
            <div className="sbOverviewMonthTitle">
              <button type="button" onClick={() => moveMonth(-1)} aria-label={t("overviewPreviousMonth")}><ChevronLeft aria-hidden /></button>
              <strong>{monthLabel}</strong>
              <button type="button" onClick={() => moveMonth(1)} aria-label={t("overviewNextMonth")}><ChevronRight aria-hidden /></button>
            </div>
            <div className="sbOverviewCalendarDays">{weekdays.map((day, i) => <span key={`${day}-${i}`} className="sbOverviewWeekday">{day}</span>)}
              {monthDays.map((day, i) => {
                if (day == null) return <span key={`blank-${i}`} />;
                const key = dateKey(new Date(month.getFullYear(), month.getMonth(), day));
                const hasDeadline = (deadlinesByDate.get(key)?.length ?? 0) > 0;
                return <button key={key} type="button" data-selected={selectedDate === key || undefined} data-deadline={hasDeadline || undefined} onClick={() => setSelectedDate(key)} aria-pressed={selectedDate === key}>{day}</button>;
              })}
            </div>
          </div>
          <div className="sbOverviewDeadlineDetail">
            {selectedDeadlines.length ? selectedDeadlines.map((deadline) => <button type="button" key={deadline.id} onClick={() => onNavigate(deadline.tab)}>
              <strong>{deadline.title}</strong>
              <span className="sbOverviewDeadlineChip" data-urgent={deadline.daysRemaining != null && deadline.daysRemaining >= 0 && deadline.daysRemaining <= 3 || undefined}>{dayLabel(deadline.daysRemaining)}</span>
            </button>) : <p>{t("overviewNoDeadlines")}</p>}
            <button className="sbOverviewOpenCalendar" type="button" onClick={() => onNavigate("tasks")}><CalendarDays aria-hidden />{t("overviewOpenCalendar")}</button>
          </div>
        </div>
      </section>
    </div>

    <section className="sb-overview-panel sbOverviewApplications">
      <h2><FileCheck2 aria-hidden />{t("ccApplications")}</h2>
      <div className="sbOverviewAppStats">
        <span><strong>{appCounts.total}</strong><small>{t("overviewTotal")}</small></span>
        <span><strong>{appCounts.preparing}</strong><small>{t("overviewPreparing")}</small></span>
        <span><strong>{appCounts.submitted}</strong><small>{t("overviewSubmitted")}</small></span>
        <span><strong>{appCounts.decision}</strong><small>{t("overviewDecisions")}</small></span>
      </div>
      <div className="sbOverviewProgress" aria-label={t("overviewApplicationProgress")}>
        <span className="sbOverviewPreparing" style={{ width: `${(appCounts.preparing / statusTotal) * 100}%` }} />
        <span className="sbOverviewSubmitted" style={{ width: `${(appCounts.submitted / statusTotal) * 100}%` }} />
        <span className="sbOverviewDecision" style={{ width: `${(appCounts.decision / statusTotal) * 100}%` }} />
      </div>
      <Button variant="outline" onClick={() => onNavigate("applications")}>{t("overviewApplicationsWorkspace")}<ArrowRight aria-hidden className="h-4 w-4" /></Button>
    </section>

    <section className="sb-overview-panel sbOverviewRecommendations">
      <div className="sbOverviewRecommendationHeading"><h2><Sparkles aria-hidden />{t("overviewRecommended")}</h2><button type="button" onClick={() => onNavigate(recommendationTab)}>{t("overviewViewAll")} <ArrowRight aria-hidden /></button></div>
      <div className="sbOverviewTabs" role="tablist" aria-label={t("overviewRecommended")}>
        {(["universities", "scholarships", "opportunities"] as const).map((tab) => <button key={tab} type="button" role="tab" aria-selected={recommendationTab === tab} onClick={() => setRecommendationTab(tab)}>{t(`overviewTab.${tab}` as never)}</button>)}
      </div>
      {recommendations.length ? <div className="sbOverviewRecommendationGrid">{recommendations.map((item, i) => <button type="button" key={`${item.title}-${i}`} onClick={() => onNavigate(item.tab)}>
        <span className="sbOverviewRecommendationFallback">{recommendationTab === "universities" ? <Compass aria-hidden /> : recommendationTab === "scholarships" ? <Bookmark aria-hidden /> : <Sparkles aria-hidden />}</span>
        <strong>{item.title}</strong><small>{item.detail}</small>
      </button>)}</div> : <p className="sbOverviewEmpty">{t("overviewNoRecommendations")}</p>}
    </section>
  </>;
}
