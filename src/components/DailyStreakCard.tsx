"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Flame } from "lucide-react";

export interface StreakView {
  current: number;
  longest: number;
  activeToday: boolean;
  lastActiveDate: string | null;
  nextMilestone: number | null;
  daysToMilestone: number;
  recentDays: { date: string; active: boolean }[];
}

export function DailyStreakCard({ profileId, streak: supplied, compact = false }: {
  profileId?: number | null;
  streak?: StreakView | null;
  compact?: boolean;
}) {
  const t = useTranslations("rewards");
  const [loaded, setLoaded] = useState<StreakView | null>(supplied ?? null);

  useEffect(() => {
    if (supplied !== undefined || !profileId) return;
    let alive = true;
    fetch(`/api/gamification?profileId=${profileId}`, { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => { if (alive && data?.streak) setLoaded(data.streak); })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [profileId, supplied]);

  const streak = supplied ?? loaded;
  if (!streak) return null;

  return (
    <section className={`rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 ${compact ? "p-3" : "p-4"}`} aria-label={t("streakTitle")}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-700 text-white" aria-hidden>
            <Flame className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">{t("streakTitle")}</h2>
            <p className="text-xs text-slate-600">
              <strong>{t("streakDays", { count: streak.current })}</strong> · {t("streakBest", { count: streak.longest })}
            </p>
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${streak.activeToday ? "bg-emerald-100 text-emerald-700" : "bg-white text-orange-700"}`}>
          {streak.activeToday ? t("streakDoneToday") : t("streakContinueToday")}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1" aria-label={t("streakLastSeven")}>
        {streak.recentDays.map((day) => (
          <div key={day.date} className="text-center">
            <div className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full ${day.active ? "bg-orange-700 text-white" : "border border-slate-200 bg-white text-slate-400"}`} title={day.date}>
              {day.active ? <Check className="h-3.5 w-3.5" aria-label={t("streakActiveDay", { date: day.date })} /> : <span aria-hidden>·</span>}
            </div>
            <span className="mt-0.5 block text-[9px] text-slate-500">{day.date.slice(8)}</span>
          </div>
        ))}
      </div>

      {streak.nextMilestone && (
        <p className="mt-3 rounded-lg bg-white/80 px-3 py-2 text-xs font-medium text-slate-700">
          {t("streakMilestone", { days: streak.daysToMilestone, milestone: streak.nextMilestone })}
        </p>
      )}
      <p className="mt-2 text-[10px] leading-relaxed text-slate-500">{t("streakHonestNote")}</p>
    </section>
  );
}
