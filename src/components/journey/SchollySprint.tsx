"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";

export type SchollySprintTiming = { startedAt: string; endsAt: string; cancelled?: true };

const copy = {
  uz: {
    start: "Bars Sprintini boshlash",
    active: "Bars Sprinti",
    reward: (points: number) => `Vaqtida tugatsangiz, jami ${points} ball olasiz.`,
    expired: "Sprint vaqti tugadi. Missiyani odatdagidek yakunlashingiz mumkin.",
    cancelled: "Sprint yakunlandi. Bu missiya odatdagi ballni beradi.",
  },
  en: {
    start: "Start Bars Sprint",
    active: "Bars Sprint",
    reward: (points: number) => `Finish in time to earn ${points} points in total.`,
    expired: "Sprint time is up. You can still finish the mission.",
    cancelled: "The sprint ended. This mission earns its usual points.",
  },
  ru: {
    start: "Начать спринт Барса",
    active: "Спринт Барса",
    reward: (points: number) => `Выполните вовремя и получите всего ${points} баллов.`,
    expired: "Время спринта истекло. Задание ещё можно закончить.",
    cancelled: "Спринт завершён. За задание начислят обычное количество баллов.",
  },
} as const;

export function schollySprintStartLabel(locale: Locale) {
  return copy[locale].start;
}

export function SchollySprint({ sprint, points, locale }: {
  sprint: SchollySprintTiming;
  points: number;
  locale: Locale;
}) {
  const [now, setNow] = useState(() => Date.now());
  const t = copy[locale];
  const endsAt = Date.parse(sprint.endsAt);
  const remaining = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const active = !sprint.cancelled && Number.isFinite(endsAt) && remaining > 0;
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active]);

  if (!active) return <p className="sbOverviewMissionStatus">{sprint.cancelled ? t.cancelled : t.expired}</p>;
  const minutes = Math.floor(remaining / 60);
  const seconds = String(remaining % 60).padStart(2, "0");
  return (
    <p className="sbOverviewMissionStatus sbOverviewSprint">
      <strong>{t.active}</strong>
      <time dateTime={sprint.endsAt} role="timer">{minutes}:{seconds}</time>
      <span>{t.reward(Math.min(30, Math.floor(points * 1.5)))}</span>
    </p>
  );
}
