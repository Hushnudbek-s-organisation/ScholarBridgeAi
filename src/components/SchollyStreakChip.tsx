"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Flame, RotateCcw, Snowflake, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { scheduleWhenIdle } from "@/lib/idle";

type StreakDay = { date: string; active: boolean; frozen?: boolean; restored?: boolean };
type Streak = { current: number; longest: number; freezes: number; recentDays: StreakDay[] };

const labels = {
  uz: { title: "Kunlik streak", current: "Hozirgi", best: "Eng uzun", freezes: "Qolgan freeze", active: "Faol kun", frozen: "Freeze ishlatildi", restored: "Tiklangan kun", inactive: "Faollik bo‘lmadi", retry: "Qayta urinish" },
  ru: { title: "Серия активности", current: "Текущая", best: "Лучшая", freezes: "Заморозок осталось", active: "Активный день", frozen: "Использована заморозка", restored: "День восстановлен", inactive: "Нет активности", retry: "Повторить" },
  en: { title: "Daily streak", current: "Current", best: "Longest", freezes: "Freezes left", active: "Active day", frozen: "Freeze used", restored: "Day restored", inactive: "No activity", retry: "Retry" },
} as const;

export function SchollyStreakChip({ profileId }: { profileId: number }) {
  const locale = useLocale();
  const common = useTranslations("common");
  const rewards = useTranslations("rewards");
  const copy = locale.startsWith("uz") ? labels.uz : locale.startsWith("ru") ? labels.ru : labels.en;
  const titleId = useId();
  const sheetId = useId();
  const sheet = useRef<HTMLDialogElement>(null);
  const request = useRef<AbortController | null>(null);
  const refreshedAt = useRef(0);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [loadError, setLoadError] = useState(false);

  const refresh = useCallback(async (force = false) => {
    if (!force && (request.current || Date.now() - refreshedAt.current < 60_000)) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoadError(false);
    try {
      const response = await fetch(`/api/scholly/streak?profileId=${profileId}`, {
        cache: "no-store", signal: controller.signal,
      });
      if (!response.ok) throw new Error("Streak request failed");
      const data: { streak: Streak } = await response.json();
      if (controller.signal.aborted) return;
      setStreak(data.streak);
      refreshedAt.current = Date.now();
    } catch {
      if (!controller.signal.aborted) setLoadError(true);
    } finally {
      if (request.current === controller) request.current = null;
    }
  }, [profileId]);

  useEffect(() => {
    const cancelInitial = scheduleWhenIdle(() => void refresh(), 1800, 300);
    const missionDone = () => void refresh(true);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("scholly:mission-done", missionDone);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      cancelInitial();
      window.removeEventListener("scholly:mission-done", missionDone);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      request.current?.abort();
      request.current = null;
    };
  }, [refresh]);

  const number = new Intl.NumberFormat(locale);
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" });
  const dateNumber = new Intl.DateTimeFormat(locale, { day: "numeric", timeZone: "UTC" });
  const dateLabel = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" });

  return (
    <>
      <Button
        variant="unstyled"
        type="button"
        className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-control px-2 text-sm font-semibold text-orange-800 tabular-nums hover:bg-orange-50 focus-visible:outline-2 focus-visible:outline-orange-500 dark:text-orange-300 dark:hover:bg-orange-500/10"
        aria-label={streak ? `${copy.title} · ${rewards("streakDays", { count: streak.current })}` : copy.title}
        aria-haspopup="dialog"
        aria-controls={sheetId}
        onClick={event => {
          event.currentTarget.focus();
          sheet.current?.showModal();
          void refresh();
        }}
      >
        <Flame aria-hidden className="h-4 w-4 shrink-0" />
        {streak && <span aria-hidden>{number.format(streak.current)}</span>}
      </Button>
      <dialog
        ref={sheet}
        id={sheetId}
        aria-labelledby={titleId}
        className="fixed inset-x-0 top-auto bottom-0 m-0 max-h-[85dvh] w-full max-w-none overscroll-contain rounded-t-overlay border border-slate-200 bg-white px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-slate-900 shadow-2xl backdrop:bg-slate-950/60 sm:inset-0 sm:m-auto sm:max-w-md sm:rounded-overlay sm:p-5 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        onClick={event => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX >= bounds.right
            || event.clientY < bounds.top || event.clientY >= bounds.bottom) event.currentTarget.close();
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <h2 id={titleId} className="flex items-center gap-2 text-lg font-bold">
            <Flame aria-hidden className="h-5 w-5 text-orange-600 dark:text-orange-300" />
            {copy.title}
          </h2>
          <Button variant="unstyled" type="button" onClick={() => sheet.current?.close()}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-control text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-orange-500 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label={common("close")}>
            <X aria-hidden className="h-5 w-5" />
          </Button>
        </div>
        {loadError && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p role="status" className="text-sm">{common("error")}</p>
            <Button type="button" variant="outline" onClick={() => void refresh(true)}>{copy.retry}</Button>
          </div>
        )}
        {!streak && !loadError && <p role="status" className="mt-3 text-sm">{common("loading")}</p>}
        {streak && (
          <>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
              {([[copy.current, streak.current], [copy.best, streak.longest], [copy.freezes, streak.freezes]] as const).map(([label, value]) => (
                <div key={label} className="flex flex-col justify-between gap-1 rounded-control bg-slate-100 px-1 py-2 dark:bg-slate-800">
                  <dt className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</dt>
                  <dd className="text-lg font-bold tabular-nums">{number.format(value)}</dd>
                </div>
              ))}
            </dl>
            <ol aria-label={rewards("streakLastSeven")} className="mt-4 grid grid-cols-7 gap-1">
              {streak.recentDays.map((day, index) => {
                const date = new Date(`${day.date}T00:00:00Z`);
                const today = index === streak.recentDays.length - 1;
                const status = day.active ? copy.active : day.frozen ? copy.frozen : day.restored ? copy.restored : copy.inactive;
                const Icon = day.active ? Check : day.frozen ? Snowflake : day.restored ? RotateCcw : null;
                return (
                  <li key={day.date} title={status} aria-current={today ? "date" : undefined}
                    className={`flex min-w-0 flex-col items-center gap-0.5 rounded-control p-1 text-sm ${today ? "ring-1 ring-orange-500" : ""}`}>
                    <span className="sr-only">{dateLabel.format(date)} · {status}</span>
                    <span aria-hidden className="text-slate-600 dark:text-slate-300">{weekday.format(date)}</span>
                    <span aria-hidden className="font-semibold">{dateNumber.format(date)}</span>
                    {Icon ? <Icon aria-hidden className={`h-4 w-4 ${day.active ? "text-orange-700 dark:text-orange-300" : "text-sky-700 dark:text-sky-300"}`} /> : <span aria-hidden className="h-4 text-slate-500">·</span>}
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </dialog>
    </>
  );
}
