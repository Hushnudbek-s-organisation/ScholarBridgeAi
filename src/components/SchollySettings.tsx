"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/Button";
import { api } from "@/components/ui/growth";
import {
  SCHOLLY_MODES,
  SCHOLLY_REMINDER_WINDOWS,
  SCHOLLY_TONES,
  type SchollyReminderPreferences,
} from "@/lib/scholly-reminders";

const labels = {
  uz: {
    title: "Scholly sozlamalari", mode: "Rejim", tone: "Ohang",
    full: "To‘liq", important: "Faqat muhim", muted: "Jim",
    friendly: "Do‘stona", short: "Qisqa", serious: "Jiddiy",
    window: "Eslatma vaqti", before_school: "07:00–08:00", after_school: "15:30–16:30",
    evening: "19:00–20:00", not_needed: "Eslatma kerak emas",
    hint: "Mahalliy vaqting bo‘yicha. Kunlik missiya xabari faqat To‘liq rejimda va Telegram bot ulanganida keladi.",
    quietStart: "Jim vaqt boshlanishi", quietEnd: "Jim vaqt tugashi",
    mission: "Telegramda kunlik missiyani eslatish", save: "Saqlash", saved: "Saqlandi",
    loading: "Scholly sozlamalari yuklanmoqda…", failed: "Scholly sozlamalarini yuklab bo‘lmadi.",
    saveFailed: "Sozlamalar saqlanmadi. Qayta urinib ko‘r.", retry: "Qayta urinish",
  },
  en: {
    title: "Scholly settings", mode: "Mode", tone: "Tone",
    full: "Full", important: "Important only", muted: "Muted",
    friendly: "Friendly", short: "Short", serious: "Serious",
    window: "Reminder window", before_school: "07:00–08:00", after_school: "15:30–16:30",
    evening: "19:00–20:00", not_needed: "No reminders",
    hint: "Times are local. Daily mission reminders require Full mode and a connected Telegram bot.",
    quietStart: "Quiet hours start", quietEnd: "Quiet hours end",
    mission: "Daily mission reminder on Telegram", save: "Save", saved: "Saved",
    loading: "Loading Scholly settings…", failed: "Unable to load Scholly settings.",
    saveFailed: "Settings couldn’t be saved. Try again.", retry: "Try again",
  },
  ru: {
    title: "Настройки Scholly", mode: "Режим", tone: "Тон",
    full: "Полный", important: "Только важное", muted: "Без уведомлений",
    friendly: "Дружелюбный", short: "Краткий", serious: "Серьёзный",
    window: "Время напоминания", before_school: "07:00–08:00", after_school: "15:30–16:30",
    evening: "19:00–20:00", not_needed: "Без напоминаний",
    hint: "Указано местное время. Для ежедневных напоминаний нужен полный режим и подключённый бот Telegram.",
    quietStart: "Начало тихих часов", quietEnd: "Конец тихих часов",
    mission: "Напоминание о задании дня в Telegram", save: "Сохранить", saved: "Сохранено",
    loading: "Загрузка настроек Scholly…", failed: "Не удалось загрузить настройки Scholly.",
    saveFailed: "Настройки не сохранились. Попробуйте ещё раз.", retry: "Повторить",
  },
};

const control = "mt-1 w-full rounded-surface border border-[var(--sb-border)] bg-transparent px-3 py-2";

export function SchollySettings({ profileId }: { profileId: number }) {
  const locale = useLocale();
  const t = labels[locale === "ru" || locale === "en" ? locale : "uz"];
  const [settings, setSettings] = useState<SchollyReminderPreferences | null>(null);
  const [state, setState] = useState<"loading" | "load-failed" | "ready" | "saving" | "saved" | "save-failed">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    api<{ settings: SchollyReminderPreferences }>("/api/scholly/settings", { signal: controller.signal })
      .then(({ settings }) => {
        if (controller.signal.aborted) return;
        setSettings(settings);
        setState("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setState("load-failed");
      });
    return () => controller.abort();
  }, [attempt]);

  function change(patch: Partial<SchollyReminderPreferences>) {
    setSettings((current) => current ? { ...current, ...patch } : current);
    setState("ready");
  }

  async function save() {
    if (!settings || state === "saving") return;
    setState("saving");
    try {
      const result = await api<{ settings: SchollyReminderPreferences }>("/api/scholly/settings", {
        method: "PUT", body: JSON.stringify(settings),
      });
      setSettings(result.settings);
      setState("saved");
      window.dispatchEvent(new CustomEvent("scholly:settings-updated", {
        detail: { profileId, mode: result.settings.mode, tone: result.settings.tone },
      }));
    } catch {
      setState("save-failed");
    }
  }

  return (
    <section id="scholly-settings" className="rounded-overlay border border-slate-200 bg-white p-4 sm:p-5" aria-labelledby="scholly-settings-title">
      <h2 id="scholly-settings-title" className="text-lg font-semibold">{t.title}</h2>
      {state === "loading" && <p role="status">{t.loading}</p>}
      {state === "load-failed" && (
        <div className="mt-3 space-y-3">
          <p role="alert">{t.failed}</p>
          <Button type="button" onClick={() => { setState("loading"); setAttempt(attempt + 1); }}>{t.retry}</Button>
        </div>
      )}
      {settings && (
        <form className="mt-4 space-y-4" onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <fieldset disabled={state === "saving"} className="grid gap-4 sm:grid-cols-2">
            <label>
              {t.mode}
              <select className={control} value={settings.mode} onChange={(event) => change({ mode: event.target.value as SchollyReminderPreferences["mode"] })}>
                {SCHOLLY_MODES.map((mode) => <option key={mode} value={mode}>{t[mode]}</option>)}
              </select>
            </label>
            <label>
              {t.tone}
              <select className={control} value={settings.tone} onChange={(event) => change({ tone: event.target.value as SchollyReminderPreferences["tone"] })}>
                {SCHOLLY_TONES.map((tone) => <option key={tone} value={tone}>{t[tone]}</option>)}
              </select>
            </label>
            <label className="sm:col-span-2">
              {t.window}
              <select className={control} value={settings.reminderWindow} onChange={(event) => change({ reminderWindow: event.target.value as SchollyReminderPreferences["reminderWindow"] })}>
                {SCHOLLY_REMINDER_WINDOWS.map((window) => <option key={window} value={window}>{t[window]}</option>)}
              </select>
            </label>
            <label>
              {t.quietStart}
              <input type="time" required className={control} value={settings.quietStart} onChange={(event) => change({ quietStart: event.target.value })} />
            </label>
            <label>
              {t.quietEnd}
              <input type="time" required className={control} value={settings.quietEnd} onChange={(event) => change({ quietEnd: event.target.value })} />
            </label>
            <label className="flex items-center gap-2 sm:col-span-2">
              <input type="checkbox" checked={settings.missionTelegram} onChange={(event) => change({ missionTelegram: event.target.checked })} />
              {t.mission}
            </label>
          </fieldset>
          <p className="text-sm">{t.hint}</p>
          <Button type="submit" disabled={state === "saving"}>{t.save}</Button>
          {state === "saved" && <p role="status">{t.saved}</p>}
          {state === "save-failed" && <p role="alert">{t.saveFailed}</p>}
        </form>
      )}
    </section>
  );
}
