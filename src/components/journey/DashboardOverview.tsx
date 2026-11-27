"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowRight, Bookmark, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight,
  Circle, Compass, FileCheck2, ListChecks, Sparkles, Target,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ProgressRing, SourceTag } from "@/components/ui/journey";
import { SCHOLLY_DASHBOARD_MESSAGES, SCHOLLY_DEADLINE_NEAR, type SchollyDashboardMessages, type SchollyDeadlineCue } from "@/lib/scholly-client-events";
import type { SchollyQueuedMessage } from "@/lib/scholly-messages";
import { selectSchollyDailyGrant } from "@/lib/scholly-daily-grant";
import type { SchollyIeltsExercise } from "@/lib/scholly-ielts.server";
import { SchollyIeltsMission } from "./SchollyIeltsMission";
import type { SchollyMissionTheme, SchollyMissionType } from "@/lib/scholly-missions";
import type { JourneyDashboard } from "./JourneyControlCenter";
import SchollyDailyQuiz from "./SchollyDailyQuiz";
import { SchollyWeeklyReport } from "./SchollyWeeklyReport";
import { announceSchollyPointsChanged } from "@/lib/scholly-points-client";
import { SchollyPointsBreakdown, SchollyPointsSummary, useSchollyPoints } from "./SchollyPointsSummary";
import { SchollySprint, schollySprintStartLabel, type SchollySprintTiming } from "./SchollySprint";
import { SchollyFriends } from "./SchollyFriends";
import { SchollyRanking } from "./SchollyRanking";
import "./scholly-points.css";

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

type MissionView = {
  id: number;
  day: string;
  type: SchollyMissionType;
  theme: SchollyMissionTheme;
  status: "pending" | "done" | "skipped";
  sizeMin: number;
  points: number;
  progress: number;
  target: number;
  complete: boolean;
  anotherUsed: boolean;
  exercise?: SchollyIeltsExercise;
  sprint?: SchollySprintTiming | null;
};

type MissionResponse = { mission?: MissionView; justCompleted?: boolean; ieltsCorrect?: number };
type SchollyWeekendMission = "daily_quiz" | "weekly_review";

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
    title: "Bugungi missiya", dailyGrant: "Bugungi grant", readiness: "Ariza tayyorligi", chosen: "Scholly tanladi",
    theme: { plan: "Reja", writing: "Yozuv", language: "Til", search: "Qidiruv", speaking: "Speaking va viza", light: "Yengil kun", review: "Hafta yakuni" },
    finished: "Bugunga bo‘ldi!", dismiss: "Bugunni yakunlash", tomorrow: "Ertaga yangi missiya kutadi.", loading: "Missiya yuklanmoqda…", error: "Bugungi missiya hozir ochilmadi.",
    tasks: { fill_profile_fields: "Profil ma’lumotlarini to‘ldiring", save_universities: "Universitetlarni saqlang", upload_document: "Hujjat yuklang", visa_practice: "Viza suhbatini mashq qiling", daily_quiz: "Kunlik mini-o‘yinni bajaring", weekly_review: "Haftalik hisobotni ko‘rib chiqing" },
    ieltsTask: (words: number) => `${words} ta IELTS so‘zini o‘rganing va mini-testni bajaring`,
    sopTask: (words: number) => `SOP uchun ${words} ta so‘z yozing`,
    open: "Vazifani ochish", check: "Progressni tekshirish", another: "Boshqa missiya", skip: "Bugun o‘tkazib yuborish", retry: "Qayta urinish",
    done: "Bajarildi — ball hisoblandi", skipped: "Bugungi missiya o‘tkazib yuborildi", points: "ball", minutes: "daq", progress: "Bajarilish",
  },
  en: {
    title: "Today’s mission", dailyGrant: "Today’s scholarship", readiness: "Application readiness", chosen: "Chosen by Scholly",
    theme: { plan: "Planning", writing: "Writing", language: "Language", search: "Discovery", speaking: "Speaking and visas", light: "Light day", review: "Weekly review" },
    finished: "You’re done for today!", dismiss: "Done for today", tomorrow: "A new mission will be ready tomorrow.", loading: "Loading mission…", error: "Today's mission is unavailable right now.",
    tasks: { fill_profile_fields: "Complete profile details", save_universities: "Save universities", upload_document: "Upload a document", visa_practice: "Practise a visa interview", daily_quiz: "Complete the daily mini-game", weekly_review: "Review your weekly report" },
    ieltsTask: (words: number) => `Learn ${words} IELTS vocabulary words and take a short quiz`,
    sopTask: (words: number) => `Write ${words} words for your SOP`,
    open: "Open task", check: "Check progress", another: "Another mission", skip: "Skip for today", retry: "Retry",
    done: "Completed — points awarded", skipped: "Today's mission was skipped", points: "points", minutes: "min", progress: "Progress",
  },
  ru: {
    title: "Задание на сегодня", dailyGrant: "Стипендия дня", readiness: "Готовность заявки", chosen: "Выбор Scholly",
    theme: { plan: "Планирование", writing: "Письмо", language: "Язык", search: "Поиск", speaking: "Разговорная практика и визы", light: "Лёгкий день", review: "Итоги недели" },
    finished: "На сегодня всё!", dismiss: "Завершить день", tomorrow: "Завтра вас ждёт новое задание.", loading: "Загрузка задания…", error: "Сегодняшнее задание сейчас недоступно.",
    tasks: { fill_profile_fields: "Заполните профиль", save_universities: "Сохраните университеты", upload_document: "Загрузите документ", visa_practice: "Потренируйтесь проходить собеседование на визу", daily_quiz: "Пройдите ежедневную мини-игру", weekly_review: "Просмотрите отчёт за неделю" },
    ieltsTask: (words: number) => `Изучите слова для IELTS (${words}) и пройдите мини-тест`,
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
  const tDeparture = useTranslations("departure");
  const locale = useLocale();
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const [recommendationTab, setRecommendationTab] = useState<"universities" | "scholarships" | "opportunities">("universities");
  const [mission, setMission] = useState<MissionView | null>(null);
  const [missionError, setMissionError] = useState(false);
  const [missionBusy, setMissionBusy] = useState(false);
  const [ieltsScore, setIeltsScore] = useState<number | null>(null);
  const [dismissedMission, setDismissedMission] = useState<number | null>(null);
  const missionHeading = useRef<HTMLHeadingElement>(null);
  const quizPanel = useRef<HTMLDivElement>(null);
  const weeklyPanel = useRef<HTMLDivElement>(null);
  const [practiceRevision, setPracticeRevision] = useState(0);
  const profileId = data.profile.id;
  const points = useSchollyPoints(profileId);
  const missionLocale = locale.startsWith("ru") ? "ru" : locale.startsWith("en") ? "en" : "uz";
  const copy = missionCopy[missionLocale];
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
        if (justCompleted) {
          window.dispatchEvent(new Event("scholly:mission-done"));
          announceSchollyPointsChanged(profileId, next.points);
        }
        setDismissedMission(isCompletionDismissed(profileId, next.id) ? next.id : null);
        setMission(next);
        setMissionError(false);
      })
      .catch((error: unknown) => { if (!(error instanceof DOMException && error.name === "AbortError")) setMissionError(true); });
    return () => controller.abort();
  }, [profileId, practiceRevision]);

  useEffect(() => {
    if (mission?.status !== "pending") return;
    function handlePractice(event: Event) {
      const detail = (event as CustomEvent<{ profileId: number; type: SchollyWeekendMission }>).detail;
      if (detail?.profileId === profileId && detail.type === mission?.type) setPracticeRevision((value) => value + 1);
    }
    window.addEventListener("scholly:mission-practice", handlePractice);
    return () => window.removeEventListener("scholly:mission-practice", handlePractice);
  }, [mission?.status, mission?.type, profileId]);

  function openWeekendMission(type: SchollyWeekendMission) {
    const details = (type === "daily_quiz" ? quizPanel : weeklyPanel).current?.querySelector("details");
    if (!details) return;
    details.open = true;
    details.scrollIntoView({ block: "nearest" });
    details.querySelector("summary")?.focus({ preventScroll: true });
  }

  async function updateMission(action: "skip" | "another" | "refresh" | "submit_ielts" | "start_sprint", answers?: number[]) {
    setMissionBusy(true);
    setMissionError(false);
    try {
      const response = await fetch("/api/scholly/mission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, action, missionId: mission?.id, answers }),
      });
      const result = await response.json() as MissionResponse;
      if (!response.ok || !result.mission) throw new Error("mission_update_failed");
      if (result.justCompleted) {
        window.dispatchEvent(new Event("scholly:mission-done"));
        announceSchollyPointsChanged(profileId, result.mission.points);
      }
      setDismissedMission(isCompletionDismissed(profileId, result.mission.id) ? result.mission.id : null);
      setMission(result.mission);
      setIeltsScore(result.ieltsCorrect ?? null);
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
  const nextDeadline = data.schollyDeadline === undefined
    ? data.deadlines.find((deadline) =>
        deadline.daysRemaining != null && deadline.daysRemaining >= 0 && deadline.daysRemaining <= 3
      )
    : data.schollyDeadline;
  const deadlineId = nextDeadline?.id;
  const deadlineDate = nextDeadline?.dueDate;
  const deadlineDays = nextDeadline?.daysRemaining;
  useEffect(() => {
    if (!deadlineId || !deadlineDate || deadlineDays == null) return;
    window.dispatchEvent(new CustomEvent<SchollyDeadlineCue>(SCHOLLY_DEADLINE_NEAR, {
      detail: { id: deadlineId, dueDate: deadlineDate, daysRemaining: deadlineDays, profileId },
    }));
  }, [deadlineDate, deadlineDays, deadlineId, profileId]);

  const missionTab = {
    fill_profile_fields: "profile", save_universities: "universities", upload_document: "documents",
    sop_paragraph: "essays", visa_practice: "speaking", ielts_vocabulary: null, daily_quiz: null, weekly_review: null,
  };
  const missionTitle = mission && (mission.type === "sop_paragraph" ? copy.sopTask(mission.target)
    : mission.type === "ielts_vocabulary" ? copy.ieltsTask(mission.target) : copy.tasks[mission.type]);
  const dailyGrant = mission && selectSchollyDailyGrant(data.recommended.scholarships, mission.day);
  useEffect(() => {
    const signals = data.schollySignals;
    if ((!mission && !missionError) || !signals) return;
    const messages: SchollyQueuedMessage[] = signals.achievements.badges.map((badge) => ({
      kind: "badge", key: `badge:${badge.id}`, name: badge.name,
    }));
    const { level } = signals.achievements;
    if (level) messages.push({ kind: "level", key: `level:${level.id}`, name: level.name });
    if (mission?.status === "pending") {
      messages.push({ kind: "mission", key: `mission:${mission.id}`, sizeMin: mission.sizeMin });
    }
    if (mission?.status === "done") {
      messages.push({ kind: "mission-done", key: `mission-done:${mission.id}`, points: mission.points });
    }
    const matchingGrants = data.recommended.personalised
      ? data.recommended.scholarships.filter((grant) => grant.matchScore >= 75)
      : [];
    const grantDay = mission?.day ?? dateKey(new Date());
    const match = selectSchollyDailyGrant(matchingGrants, grantDay);
    if (match) messages.push({ kind: "grant", key: `grant:${match.id}`, match: Math.round(match.matchScore) });
    const tip = signals.audience.includes("returned") ? "welcome-back"
      : signals.audience.includes("incomplete-profile") ? "profile-tip" : "tip";
    messages.push({ kind: tip, key: tip });
    window.dispatchEvent(new CustomEvent<SchollyDashboardMessages>(SCHOLLY_DASHBOARD_MESSAGES, {
      detail: { profileId, audience: signals.audience, messages },
    }));
  }, [data.recommended, data.schollySignals, mission, missionError, profileId]);
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
            <Button variant="unstyled" type="button" className="sbOverviewStudyPlan" onClick={() => onNavigate("study-plan")}><CalendarDays aria-hidden />{t("overviewStudyPlan")}</Button>
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
            <Button variant="unstyled" type="button" onClick={() => onNavigate(stage.tab)}>{stage.label}</Button>
            <ChevronRight aria-hidden className="sbOverviewChevron" />
          </li>)}
        </ol>
      </section>
    </div>

    <div className="sbOverviewMiddleGrid">
      <section className="sb-overview-panel sbOverviewTasks">
        <h2><ListChecks aria-hidden />{t("overviewTasks")}</h2>
        {tasks.length ? <ul>{tasks.map((task) => <li key={task.id}>
          <span className="sbOverviewTaskDot"><CheckCircle2 aria-hidden /></span>
          <Button variant="unstyled" type="button" onClick={() => onNavigate(task.tab)}><strong>{getStepTitle(task)}</strong><small>{getStepDetail(task)}</small></Button>
          <ArrowRight aria-hidden className="sbOverviewChevron" />
        </li>)}</ul> : <p className="sbOverviewEmpty">{t("overviewNoTasks")}</p>}
        <Button variant="unstyled" type="button" className="sbOverviewMoreLink" onClick={() => onNavigate("tasks")}>{t("overviewAllTasks")} <ArrowRight aria-hidden /></Button>
      </section>
      <section className="sb-overview-panel sbOverviewCalendar">
        <h2><CalendarDays aria-hidden />{t("overviewDeadlines")}</h2>
        <div className="sbOverviewCalendarBody">
          <div className="sbOverviewMonthPanel">
            <div className="sbOverviewMonthTitle">
              <Button variant="unstyled" type="button" onClick={() => moveMonth(-1)} aria-label={t("overviewPreviousMonth")}><ChevronLeft aria-hidden /></Button>
              <strong>{monthLabel}</strong>
              <Button variant="unstyled" type="button" onClick={() => moveMonth(1)} aria-label={t("overviewNextMonth")}><ChevronRight aria-hidden /></Button>
            </div>
            <div className="sbOverviewCalendarDays">{weekdays.map((day, i) => <span key={`${day}-${i}`} className="sbOverviewWeekday">{day}</span>)}
              {monthDays.map((day, i) => {
                if (day == null) return <span key={`blank-${i}`} />;
                const key = dateKey(new Date(month.getFullYear(), month.getMonth(), day));
                const hasDeadline = (deadlinesByDate.get(key)?.length ?? 0) > 0;
                return <Button variant="unstyled" key={key} type="button" data-selected={selectedDate === key || undefined} data-deadline={hasDeadline || undefined} onClick={() => setSelectedDate(key)} aria-pressed={selectedDate === key}>{day}</Button>;
              })}
            </div>
          </div>
          <div className="sbOverviewDeadlineDetail">
            {selectedDeadlines.length ? selectedDeadlines.map((deadline) => <Button variant="unstyled" type="button" key={deadline.id} onClick={() => onNavigate(deadline.tab)}>
              <strong>{deadline.kind === "departure" ? tDeparture("dateLabel") : deadline.title}</strong>
              <span className="sbOverviewDeadlineChip" data-urgent={deadline.daysRemaining != null && deadline.daysRemaining >= 0 && deadline.daysRemaining <= 3 || undefined}>{dayLabel(deadline.daysRemaining)}</span>
            </Button>) : <p>{t("overviewNoDeadlines")}</p>}
            <Button variant="unstyled" className="sbOverviewOpenCalendar" type="button" onClick={() => onNavigate("tasks")}><CalendarDays aria-hidden />{t("overviewOpenCalendar")}</Button>
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
      <div className="sbOverviewRecommendationHeading"><h2><Sparkles aria-hidden />{t("overviewRecommended")}</h2><Button variant="unstyled" type="button" onClick={() => onNavigate(recommendationTab)}>{t("overviewViewAll")} <ArrowRight aria-hidden /></Button></div>
      <div className="sbOverviewTabs" role="tablist" aria-label={t("overviewRecommended")}>
        {(["universities", "scholarships", "opportunities"] as const).map((tab) => <Button variant="unstyled" key={tab} type="button" role="tab" aria-selected={recommendationTab === tab} onClick={() => setRecommendationTab(tab)}>{t(`overviewTab.${tab}` as never)}</Button>)}
      </div>
      {recommendations.length ? <div className="sbOverviewRecommendationGrid">{recommendations.map((item, i) => <Button variant="unstyled" type="button" key={`${item.title}-${i}`} onClick={() => onNavigate(item.tab)}>
        <span className="sbOverviewRecommendationFallback">{recommendationTab === "universities" ? <Compass aria-hidden /> : recommendationTab === "scholarships" ? <Bookmark aria-hidden /> : <Sparkles aria-hidden />}</span>
        <strong>{item.title}</strong><small>{item.detail}</small>
      </Button>)}</div> : <p className="sbOverviewEmpty">{t("overviewNoRecommendations")}</p>}
    </section>

    <section className="sb-overview-panel sbOverviewMission" aria-labelledby="sb-daily-mission-title">
      <div className="sbOverviewMissionHeading">
        <h2 id="sb-daily-mission-title" ref={missionHeading} tabIndex={-1}><Target aria-hidden />{copy.title}</h2>
        {mission && <span className="sbOverviewMissionPoints">{mission.sizeMin} {copy.minutes} · {mission.points} {copy.points}</span>}
      </div>
      {points && <SchollyPointsSummary snapshot={points} locale={missionLocale} />}
      {!mission && !missionError && <p className="sbOverviewMissionMessage" role="status">{copy.loading}</p>}
      {missionError && <div><p className="sbOverviewMissionMessage" role="status">{copy.error}</p><Button variant="unstyled" className="sbOverviewMissionRetry" type="button" disabled={missionBusy} onClick={() => updateMission("refresh")}>{copy.retry}</Button></div>}
      {mission && <>
        <div className="sbOverviewMissionSource">
          <Image src="/scholly-front.webp" alt="" width={28} height={28} />
          <span>{copy.chosen}</span>
          <span className="sbOverviewMissionTheme">{copy.theme[mission.theme]}</span>
        </div>
        <p className="sbOverviewMissionTask">{missionTitle}</p>
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
              {points && <SchollyPointsBreakdown snapshot={points} locale={missionLocale} />}
            </div>
            <Button variant="outline" onClick={() => dismissCompletion(mission.id)}>{copy.dismiss}</Button>
          </div>
        )}
        {mission.status === "pending" && mission.exercise && (
          <SchollyIeltsMission key={`${profileId}-${mission.id}`} locale={missionLocale} exercise={mission.exercise}
            busy={missionBusy} score={ieltsScore} onSubmit={(answers) => void updateMission("submit_ielts", answers)} />
        )}
        {mission.status === "pending" && mission.sprint && (
          <SchollySprint sprint={mission.sprint} points={mission.points} locale={missionLocale} />
        )}
        {mission.status === "pending" && <div className="sbOverviewMissionActions">
            {(mission.type === "daily_quiz" || mission.type === "weekly_review") && (
              <Button variant="unstyled" type="button" className="sbOverviewMissionPrimary" onClick={() => openWeekendMission(mission.type as SchollyWeekendMission)}>{copy.open}<ArrowRight aria-hidden /></Button>
            )}
            {missionTab[mission.type] && <>
              <Button variant="unstyled" type="button" className="sbOverviewMissionPrimary" onClick={() => onNavigate(missionTab[mission.type]!)}>{copy.open}<ArrowRight aria-hidden /></Button>
              <Button variant="unstyled" type="button" disabled={missionBusy} onClick={() => updateMission("refresh")}>{copy.check}</Button>
            </>}
            {mission.sprint === null && <Button variant="unstyled" type="button" disabled={missionBusy}
              onClick={() => void updateMission("start_sprint")}>{schollySprintStartLabel(missionLocale)}</Button>}
            {!mission.anotherUsed && <Button variant="unstyled" type="button" disabled={missionBusy} onClick={() => updateMission("another")}>{copy.another}</Button>}
            <Button variant="unstyled" type="button" disabled={missionBusy} onClick={() => updateMission("skip")}>{copy.skip}</Button>
        </div>}
      </>}
    </section>

    {dailyGrant && <section className="sb-overview-panel" aria-labelledby="sb-daily-grant-title">
      <h2 id="sb-daily-grant-title" className="flex items-center gap-2">
        <Bookmark aria-hidden className="h-5 w-5 shrink-0 text-indigo-500" />{copy.dailyGrant}
      </h2>
      <Link href={`/scholarships/${dailyGrant.id}?from=app`} className="mt-2 inline-block font-semibold underline-offset-4 hover:underline">
        {dailyGrant.title}
      </Link>
      <p className="text-sm text-[var(--sb-ink-muted)]">{dailyGrant.provider}</p>
      <SourceTag url={dailyGrant.sourceUrl} lastVerified={dailyGrant.lastVerifiedAt} verificationStatus={dailyGrant.verificationStatus} />
    </section>}

    <SchollyFriends key={profileId} profileId={profileId} locale={missionLocale} />
    <SchollyRanking key={profileId} locale={missionLocale} />
    <div ref={quizPanel}><SchollyDailyQuiz profileId={profileId} /></div>
    <div ref={weeklyPanel}><SchollyWeeklyReport profileId={profileId} onNavigate={onNavigate} /></div>
  </>;
}
