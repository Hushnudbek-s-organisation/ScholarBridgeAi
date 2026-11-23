"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";
import { SCHOLLY_POINTS_CHANGED, type SchollyPointsChange, type SchollyPointsSnapshot } from "@/lib/scholly-points-client";
import { SCHOLLY_LEVEL_THRESHOLDS } from "@/lib/scholly-levels";

const copy = {
  uz: {
    today: "Bugun", points: "ball", small: "Mayda amallar", level: "Daraja",
    next: "Keyingi darajagacha", highest: "Eng yuqori daraja",
    cap: "Mayda amallar uchun bugungi limit tugadi. Missiya ball berishda davom etadi.",
    breakdown: "Bugungi ballar taqsimoti",
    reasons: {
      mission_complete: "Kunlik missiya", daily_quiz: "Mini-o‘yin", profile_field_filled: "Profil maydoni",
      university_saved: "Universitet saqlash", forum_helpful: "Foydali forum javobi", document_uploaded: "Hujjat yuklash",
      sop_paragraph: "SOP paragrafi", application_submitted: "Ariza topshirish", referral_completed: "Do‘st taklifi",
      streak: "Streak bonusi", weekly_activity: "Haftalik faollik bonusi", comeback: "Qaytish bonusi",
      friend_streak: "Do‘st bilan streak bonusi", other: "Boshqa amallar",
    },
  },
  en: {
    today: "Today", points: "points", small: "Small actions", level: "Level",
    next: "To the next level", highest: "Highest level",
    cap: "You’ve reached today’s small-action limit. Missions still earn points.",
    breakdown: "Today’s points breakdown",
    reasons: {
      mission_complete: "Daily mission", daily_quiz: "Mini-game", profile_field_filled: "Profile field",
      university_saved: "University saved", forum_helpful: "Helpful forum reply", document_uploaded: "Document uploaded",
      sop_paragraph: "SOP paragraph", application_submitted: "Application submitted", referral_completed: "Friend referral",
      streak: "Streak bonus", weekly_activity: "Weekly activity bonus", comeback: "Welcome-back bonus",
      friend_streak: "Friend streak bonus", other: "Other actions",
    },
  },
  ru: {
    today: "Сегодня", points: "баллов", small: "Небольшие действия", level: "Уровень",
    next: "До следующего уровня", highest: "Высший уровень",
    cap: "Сегодняшний лимит за небольшие действия исчерпан. За задания по-прежнему начисляются баллы.",
    breakdown: "За что начислены баллы сегодня",
    reasons: {
      mission_complete: "Задание дня", daily_quiz: "Мини-игра", profile_field_filled: "Поле профиля",
      university_saved: "Сохранение университета", forum_helpful: "Полезный ответ на форуме", document_uploaded: "Загрузка документа",
      sop_paragraph: "Абзац мотивационного письма", application_submitted: "Подача заявки", referral_completed: "Приглашение друга",
      streak: "Бонус за серию", weekly_activity: "Бонус за активность за неделю", comeback: "Бонус за возвращение",
      friend_streak: "Бонус за серию с другом", other: "Другие действия",
    },
  },
} as const;

type RewardLabel = keyof typeof copy.en.reasons;
const previousReasonLabels: Readonly<Record<string, RewardLabel>> = {
  daily_mission: "mission_complete",
  application_submission: "application_submitted",
  reply_created: "forum_helpful",
  referral_referrer: "referral_completed",
};

function rewardLabel(reason: string): RewardLabel {
  const key = reason.replace(/^scholly_/, "");
  if (/^streak_\d+$/.test(key)) return "streak";
  if (Object.hasOwn(copy.en.reasons, key)) return key as RewardLabel;
  return Object.hasOwn(previousReasonLabels, key) ? previousReasonLabels[key] : "other";
}

export function useSchollyPoints(profileId: number) {
  const [loaded, setLoaded] = useState<{ profileId: number; value: SchollyPointsSnapshot } | null>(null);

  useEffect(() => {
    let request: AbortController | null = null;
    function refresh() {
      request?.abort();
      const controller = new AbortController();
      request = controller;
      void fetch(`/api/scholly/points?profileId=${profileId}`, { cache: "no-store", signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) return;
          const value = await response.json() as SchollyPointsSnapshot;
          if (!controller.signal.aborted) setLoaded({ profileId, value });
        })
        .catch(() => {});
    }
    function handlePoints(event: Event) {
      if ((event as CustomEvent<SchollyPointsChange>).detail?.profileId === profileId) refresh();
    }
    function handleVisibility() {
      if (document.visibilityState === "visible") refresh();
    }
    refresh();
    window.addEventListener(SCHOLLY_POINTS_CHANGED, handlePoints);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      request?.abort();
      window.removeEventListener(SCHOLLY_POINTS_CHANGED, handlePoints);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [profileId]);

  return loaded?.profileId === profileId ? loaded.value : null;
}

export function SchollyPointsSummary({ snapshot, locale }: { snapshot: SchollyPointsSnapshot; locale: Locale }) {
  const t = copy[locale];
  const numbers = new Intl.NumberFormat(locale);
  const limitReached = snapshot.smallPoints >= snapshot.smallLimit;
  const levelFrom = SCHOLLY_LEVEL_THRESHOLDS[snapshot.level - 1] ?? 0;
  const levelSpan = snapshot.nextLevelAt === null ? 1 : Math.max(1, snapshot.nextLevelAt - levelFrom);
  const levelProgress = Math.max(0, Math.min(levelSpan, snapshot.lifetimePoints - levelFrom));
  return (
    <div className="sbOverviewPointsSummary">
      <div className="sbOverviewPointsMeter">
        <p>{t.small} <strong>{numbers.format(snapshot.smallPoints)}/{numbers.format(snapshot.smallLimit)}</strong></p>
        <progress
          aria-label={t.small}
          value={Math.min(snapshot.smallPoints, snapshot.smallLimit)}
          max={snapshot.smallLimit}
        />
        {limitReached && <small role="status">{t.cap}</small>}
      </div>
      <div className="sbOverviewPointsMeter">
        <p>{t.level} <strong>{numbers.format(snapshot.level)}</strong></p>
        {snapshot.nextLevelAt === null ? <small>{t.highest}</small> : (
          <>
            <progress aria-label={t.next} value={levelProgress} max={levelSpan} />
            <small>{t.next} {numbers.format(Math.max(0, snapshot.nextLevelAt - snapshot.lifetimePoints))} {t.points}</small>
          </>
        )}
      </div>
      <p className="sbOverviewPointsToday">{t.today} <strong>{numbers.format(snapshot.todayPoints)} {t.points}</strong></p>
    </div>
  );
}

export function SchollyPointsBreakdown({ snapshot, locale }: { snapshot: SchollyPointsSnapshot; locale: Locale }) {
  const t = copy[locale];
  const numbers = new Intl.NumberFormat(locale);
  const totals = new Map<RewardLabel, number>();
  for (const [reason, points] of Object.entries(snapshot.todayByReason)) {
    if (points <= 0) continue;
    const label = rewardLabel(reason);
    totals.set(label, (totals.get(label) ?? 0) + points);
  }
  if (!totals.size) return null;
  return (
    <div className="sbOverviewPointsBreakdown">
      <p><strong>{t.breakdown}</strong></p>
      <dl>
        {[...totals].map(([label, points]) => (
          <div key={label}><dt>{t.reasons[label]}</dt><dd>+{numbers.format(points)}</dd></div>
        ))}
      </dl>
    </div>
  );
}
