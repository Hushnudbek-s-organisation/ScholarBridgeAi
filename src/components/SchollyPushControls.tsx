"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

const copy = {
  uz: ["Brauzer eslatmalari", "Shu qurilmada yoqish", "Barcha qurilmalarda o‘chirish", "Sozlama saqlandi.", "Brauzer eslatmasini sozlab bo‘lmadi.", "Bu brauzerda eslatmalar mavjud emas."],
  en: ["Browser reminders", "Enable on this device", "Disable on all devices", "Settings saved.", "Couldn’t change browser reminders.", "Browser reminders are unavailable on this device."],
  ru: ["Напоминания в браузере", "Включить на этом устройстве", "Выключить на всех устройствах", "Настройки сохранены.", "Не удалось изменить настройки напоминаний.", "На этом устройстве напоминания недоступны."],
} as const;
const endpoint = "/api/scholly/push";
const scope = "/scholly-notifications/";

export function SchollyPushControls({ locale, profileId }: { locale: keyof typeof copy; profileId: number }) {
  const t = copy[locale];
  const [settings, setSettings] = useState<{ publicKey: string | null; count: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<"saved" | "failed" | "unsupported" | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(endpoint, { signal: controller.signal }).then(async response => {
      if (response.ok) setSettings(await response.json());
    }).catch(() => {});
    return () => controller.abort();
  }, [profileId]);

  async function change(enable: boolean) {
    if (enable && (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window))) {
      setNotice("unsupported");
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      if (enable) {
        if (!settings?.publicKey || await Notification.requestPermission() !== "granted") throw new Error();
        const registration = await navigator.serviceWorker.register("/scholly-push-worker.js", { scope });
        const raw = atob(settings.publicKey.replace(/-/g, "+").replace(/_/g, "/"));
        const key = Uint8Array.from(raw, char => char.charCodeAt(0));
        const subscription = await registration.pushManager.getSubscription() ??
          await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
        const response = await fetch(endpoint, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(subscription.toJSON()),
        });
        if (!response.ok) throw new Error();
      } else {
        const response = await fetch(endpoint, {
          method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }),
        });
        if (!response.ok) throw new Error();
        if ("serviceWorker" in navigator) {
          const registration = await navigator.serviceWorker.getRegistration(scope);
          const subscription = await registration?.pushManager.getSubscription();
          await subscription?.unsubscribe().catch(() => {});
        }
      }
      const state = await fetch(endpoint);
      if (state.ok) setSettings(await state.json());
      setNotice("saved");
    } catch { setNotice("failed"); }
    finally { setBusy(false); }
  }

  if (!settings?.publicKey && !settings?.count) return null;
  return <div className="mt-4 grid gap-2">
    <p className="font-semibold">{t[0]}</p>
    <div className="flex flex-wrap gap-2">
      {settings.publicKey && <Button type="button" variant="outline" disabled={busy} onClick={() => void change(true)}>{t[1]}</Button>}
      {settings.count > 0 && <Button type="button" variant="outline" disabled={busy} onClick={() => void change(false)}>{t[2]}</Button>}
    </div>
    {notice && <p role={notice === "failed" ? "alert" : "status"}>{t[notice === "saved" ? 3 : notice === "failed" ? 4 : 5]}</p>}
  </div>;
}
