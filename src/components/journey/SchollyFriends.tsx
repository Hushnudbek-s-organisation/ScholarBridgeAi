"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

const copy = {
  uz: ["Do‘st bilan streak", "Yetti kun ketma-ket faol bo‘lsangiz, har ikkingizga 15 ball.", "Taklif kodi yaratish", "Taklif kodi", "Taklifni qabul qilish", "Juftlikni tugatish", "Birgalikdagi rekord", "Amal bajarilmadi. Qayta urinib ko‘ring."],
  en: ["Streak with a friend", "Stay active for seven consecutive days to earn 15 points each.", "Create invite code", "Invite code", "Accept invite", "Leave pairing", "Best shared streak", "Couldn’t complete this action. Try again."],
  ru: ["Серия с другом", "Занимайтесь семь дней подряд, чтобы получить по 15 баллов.", "Создать код приглашения", "Код приглашения", "Принять приглашение", "Выйти из пары", "Рекорд пары", "Не удалось выполнить действие. Попробуйте снова."],
} as const;

export function SchollyFriends({ locale, profileId }: { locale: keyof typeof copy; profileId: number }) {
  const t = copy[locale];
  const [state, setState] = useState<{ paired: boolean; together: number } | null>(null);
  const [code, setCode] = useState("");
  const [incoming, setIncoming] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const endpoint = "/api/scholly/friends";
  useEffect(() => {
    const controller = new AbortController();
    void fetch(endpoint, { signal: controller.signal })
      .then(async res => { if (!res.ok) throw new Error(); setState(await res.json()); })
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [profileId]);

  async function submit(action: "invite" | "accept" | "leave") {
    setBusy(true);
    setError(false);
    try {
      const response = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, code: incoming.trim() }),
      });
      if (!response.ok) throw new Error();
      const payload = await response.json() as { paired: boolean; code?: string };
      setState({ paired: payload.paired, together: 0 });
      setCode(payload.code ?? "");
      if (action === "accept") setIncoming("");
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return <details className="sb-overview-panel">
    <summary className="cursor-pointer py-2 font-semibold">{t[0]}</summary>
    <p className="my-2 text-sm">{t[1]}</p>
    {state?.paired ? <>
      <p className="mb-3 text-sm">{t[6]}: {state.together}</p>
      <Button type="button" variant="outline" disabled={busy} onClick={() => void submit("leave")}>{t[5]}</Button>
    </> : <div className="grid gap-3">
      <Button type="button" variant="outline" disabled={busy} onClick={() => void submit("invite")}>{t[2]}</Button>
      {code && <input readOnly value={code} aria-label={t[3]} className="rounded border p-2" onFocus={event => event.currentTarget.select()} />}
      <form className="flex flex-wrap items-end gap-2" onSubmit={event => { event.preventDefault(); void submit("accept"); }}>
        <label className="grid gap-1 text-sm">{t[3]}<input value={incoming} maxLength={32} onChange={event => setIncoming(event.target.value)} className="rounded border p-2" /></label>
        <Button type="submit" disabled={busy || incoming.trim().length !== 32}>{t[4]}</Button>
      </form>
    </div>}
    {error && <p role="alert" className="mt-2 text-sm">{t[7]}</p>}
  </details>;
}
