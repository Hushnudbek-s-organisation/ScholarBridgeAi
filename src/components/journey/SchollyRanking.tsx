"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { SchollyRanking as Ranking } from "@/lib/scholly-ranking.server";

const copy = {
  uz: {
    title: "Hududiy haftalik reyting", description: "Mamlakatingiz bo‘yicha haftalik ballar. Ismlar ko‘rsatilmaydi.",
    join: "Reytingga qo‘shilish", leave: "Reytingdan chiqish", small: "Reyting kamida besh faol ishtirokchi bo‘lganda ochiladi.",
    unavailable: "Reyting Markaziy Osiyo mamlakatlari uchun mavjud.", own: "Sizning o‘rningiz", points: "ball",
    error: "Reytingni yuklab bo‘lmadi.", loading: "Yuklanmoqda…", retry: "Qayta urinish",
  },
  en: {
    title: "Weekly regional ranking", description: "Compare scores in your country. Participant names are hidden.",
    join: "Join rankings", leave: "Leave rankings", small: "Rankings open when at least five participants earn points.",
    unavailable: "Rankings are available for Central Asian countries.", own: "Your rank", points: "points",
    error: "Couldn’t load rankings.", loading: "Loading…", retry: "Retry",
  },
  ru: {
    title: "Недельный рейтинг по стране", description: "Сравните результаты в своей стране. Имена участников скрыты.",
    join: "Участвовать", leave: "Выйти из рейтинга", small: "Рейтинг появится, когда баллы получат пять участников.",
    unavailable: "Рейтинг доступен для стран Центральной Азии.", own: "Ваше место", points: "баллов",
    error: "Не удалось загрузить рейтинг.", loading: "Загрузка…", retry: "Повторить",
  },
} as const;

export function SchollyRanking({ locale }: { locale: keyof typeof copy }) {
  const t = copy[locale];
  const [ranking, setRanking] = useState<Ranking | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function fetchRanking(joined?: boolean) {
    setBusy(true);
    setError(false);
    try {
      const response = await fetch("/api/scholly/ranking", joined === undefined ? undefined : {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ joined }),
      });
      if (!response.ok) throw new Error();
      setRanking(await response.json());
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  const regionNames = new Intl.DisplayNames([locale], { type: "region" });
  return <details className="sb-overview-panel" onToggle={event => {
    if (event.currentTarget.open && !ranking && !busy) void fetchRanking();
  }}>
    <summary className="cursor-pointer py-2 font-semibold">{t.title}</summary>
    <p className="my-2 text-sm">{t.description}</p>
    {busy && <p role="status" className="text-sm">{t.loading}</p>}
    {error && <p role="alert" className="mb-2 text-sm">{t.error}</p>}
    {!ranking && error && <Button type="button" variant="outline" onClick={() => void fetchRanking()}>{t.retry}</Button>}
    {ranking && <>
      {ranking.country ? <p className="mb-2 text-sm">{regionNames.of(ranking.country)}</p> :
        <p className="mb-2 text-sm">{t.unavailable}</p>}
      {(ranking.country || ranking.joined) && <Button type="button" variant="outline" disabled={busy}
        onClick={() => void fetchRanking(!ranking.joined)}>{ranking.joined ? t.leave : t.join}</Button>}
      {ranking.joined && ranking.country && (ranking.people < 5 ? <p className="mt-2 text-sm">{t.small}</p> : <>
        {ranking.own && <p className="mt-2 text-sm">{t.own} {ranking.own.rank} · {ranking.own.score} {t.points}</p>}
        <ol className="mt-2 grid gap-1 text-sm">
          {ranking.leaders.map(({ rank, score }, index) => <li key={index}>#{rank} · {score} {t.points}</li>)}
        </ol>
      </>)}
    </>}
  </details>;
}
