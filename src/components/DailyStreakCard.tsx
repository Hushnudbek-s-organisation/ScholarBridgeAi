"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Flame, Info } from "lucide-react";
import { AnimatedBar } from "@/components/motion";

export interface StreakView {
  current: number;
  longest: number;
  activeToday: boolean;
  lastActiveDate: string | null;
  nextMilestone: number | null;
  daysToMilestone: number;
  recentDays: { date: string; active: boolean }[];
}

/**
 * Daily streak card.
 *
 * DESIGN RULES
 *   • `compact` (the dashboard) is ONE row: a small flame chip, the streak
 *     count with its precise companion facts, a seven-dot week strip and the
 *     next milestone. It is deliberately ~64px tall so the journey bar and the
 *     next steps stay on the first screen — the previous version was a large
 *     block with a paragraph of small print under it.
 *   • the FULL variant (Rewards page) has room for the same information with
 *     weekday letters and the honest rule spelled out; it still fits one card.
 *   • every number is exact: the milestone progress is `current / milestone`,
 *     the remaining days are `milestone − current`, and each day in the strip
 *     carries its real date in the tooltip. Nothing is rounded into vagueness.
 *
 * DATA CONTRACT: `current` counts only days the SERVER awarded points on (see
 * src/lib/streak.ts) — opening the app is not activity, and the card says so
 * rather than implying a login streak.
 */
export function DailyStreakCard({
  profileId,
  streak: supplied,
  compact = false,
}: {
  profileId?: number | null;
  streak?: StreakView | null;
  compact?: boolean;
}) {
  const t = useTranslations("rewards");
  const locale = useLocale();
  const [loaded, setLoaded] = useState<StreakView | null>(supplied ?? null);

  useEffect(() => {
    if (supplied !== undefined || !profileId) return;
    let alive = true;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    fetch(`/api/gamification?profileId=${profileId}&timeZone=${encodeURIComponent(timeZone)}`, { cache: "no-store" })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (alive && data?.streak) setLoaded(data.streak);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [profileId, supplied]);

  const streak = supplied ?? loaded;

  // Weekday letter + real date per day, in the reader's own language.
  const dayFormat = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" }),
    [locale]
  );
  const dateFormat = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" }),
    [locale]
  );
  if (!streak) return null;

  const { current, longest, activeToday, nextMilestone, daysToMilestone, recentDays } = streak;
  const toDate = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
  const milestoneProgress =
    nextMilestone && nextMilestone > 0 ? Math.min(100, (current / nextMilestone) * 100) : 0;

  const statusPill = (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
        activeToday
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200"
          : "bg-white text-orange-700 ring-1 ring-orange-200 dark:bg-slate-900 dark:text-orange-200 dark:ring-orange-500/40"
      }`}
    >
      {activeToday ? t("streakDoneToday") : t("streakContinueToday")}
    </span>
  );

  const week = (size: "sm" | "md") => (
    <ol className="flex items-center gap-1" aria-label={t("streakLastSeven")}>
      {recentDays.map((day) => {
        const isToday = day.date === recentDays[recentDays.length - 1]?.date;
        return (
          <li key={day.date} className="flex flex-col items-center">
            <span
              title={`${dateFormat.format(toDate(day.date))} — ${
                day.active ? t("streakCounted") : t("streakNotCounted")
              }`}
              className={`flex items-center justify-center rounded-full ${
                size === "sm" ? "h-3 w-3" : "h-7 w-7"
              } ${day.active
                ? "bg-gradient-to-br from-orange-600 to-amber-700 text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-300 dark:border-slate-700 dark:bg-slate-800"
              } ${isToday && !day.active ? "ring-1 ring-orange-300 dark:ring-orange-500/40" : ""}`}
            >
              {day.active ? (
                <Check className={size === "sm" ? "h-2 w-2" : "h-3.5 w-3.5"} aria-hidden />
              ) : (
                <span aria-hidden className={size === "sm" ? "text-[8px]" : "text-[10px]"}>
                  ·
                </span>
              )}
              <span className="sr-only">
                {dateFormat.format(toDate(day.date))}
                {day.active ? ` — ${t("streakCounted")}` : ` — ${t("streakNotCounted")}`}
              </span>
            </span>
            {size === "md" && (
              <span
                className={`mt-0.5 text-[9px] font-semibold ${
                  isToday ? "text-orange-700 dark:text-orange-200" : "text-slate-400"
                }`}
                aria-hidden
              >
                {isToday ? t("streakToday") : dayFormat.format(toDate(day.date))}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );

  // ---------------------------------------------------------------- compact
  if (compact) {
    return (
      <section
        aria-label={t("streakTitle")}
        title={t("streakHonestNote")}
        className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-orange-200/80 bg-gradient-to-r from-orange-50 via-amber-50 to-white px-3 py-2 dark:border-orange-500/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900"
      >
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-orange-600 to-amber-700 text-white shadow-sm"
          aria-hidden
        >
          <Flame className="h-4 w-4" />
        </span>

        <div className="flex min-w-0 items-baseline gap-2">
          <span className="text-lg font-black leading-none text-slate-900 tabular-nums dark:text-white">
            {current}
          </span>
          <span className="break-words text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            {t("streakDays", { count: current })} · {t("streakBest", { count: longest })}
          </span>
        </div>

        <div className="hidden sm:block">{week("sm")}</div>

        {nextMilestone != null && (
          <div className="flex min-w-[8.5rem] flex-1 items-center gap-2">
            <div className="min-w-0 flex-1">
              <AnimatedBar
                value={milestoneProgress}
                barClassName="bg-gradient-to-r from-orange-500 to-amber-500"
                trackClassName="h-1.5 w-full overflow-hidden rounded-full bg-white/80 ring-1 ring-orange-100 dark:bg-slate-800 dark:ring-slate-700"
                duration={0.7}
              />
            </div>
            <span className="shrink-0 text-[10px] font-semibold text-orange-800 dark:text-orange-200 tabular-nums">
              {t("streakMilestoneShort", { days: daysToMilestone, milestone: nextMilestone })}
            </span>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">{statusPill}</div>
      </section>
    );
  }

  // ------------------------------------------------------------------- full
  return (
    <section
      aria-label={t("streakTitle")}
      className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-4 dark:border-orange-500/30 dark:from-slate-900 dark:to-slate-900"
    >
      <div className="flex items-center gap-3">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-orange-600 to-amber-700 text-white shadow-sm"
          aria-hidden
        >
          <Flame className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">{t("streakTitle")}</h2>
          <p className="text-[11px] text-slate-600 dark:text-slate-300">
            {t("streakDays", { count: current })} · {t("streakBest", { count: longest })}
          </p>
        </div>
        {statusPill}
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black leading-none text-slate-900 tabular-nums dark:text-white">
              {current}
            </span>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {nextMilestone != null ? t("streakMilestoneShort", { days: daysToMilestone, milestone: nextMilestone }) : ""}
            </span>
          </div>
          <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
            {streak.lastActiveDate
              ? t("streakLastCounted", { date: dateFormat.format(toDate(streak.lastActiveDate)) })
              : t("streakStart")}
          </p>
        </div>
        {week("md")}
      </div>

      {nextMilestone != null && (
        <div className="mt-3">
          <AnimatedBar
            value={milestoneProgress}
            barClassName="bg-gradient-to-r from-orange-500 to-amber-500"
            trackClassName="h-2 w-full overflow-hidden rounded-full bg-white ring-1 ring-orange-100 dark:bg-slate-800 dark:ring-slate-700"
          />
          <p className="mt-1 text-[10px] font-semibold text-orange-800 dark:text-orange-200">
            {t("streakMilestoneProgress", { current, milestone: nextMilestone })}
          </p>
        </div>
      )}

      <p className="mt-3 flex items-start gap-1.5 border-t border-orange-200/70 pt-2 text-[10px] leading-relaxed text-slate-500 dark:border-slate-700 dark:text-slate-400">
        <Info className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" aria-hidden />
        {t("streakHonestNote")}
      </p>
    </section>
  );
}
