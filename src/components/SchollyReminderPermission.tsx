"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function SchollyReminderPermission({ disabled }: { disabled: boolean }) {
  const t = useTranslations("scholly");
  const [status, setStatus] = useState<"ready" | "requesting" | "finished" | "failed">("ready");
  const supported = typeof window !== "undefined" && window.isSecureContext &&
    typeof Notification !== "undefined" && typeof Notification.requestPermission === "function";

  if (!supported || status === "finished") return null;
  if (status === "failed") return <p role="status">{t("reminderPermissionFailed")}</p>;
  if (status === "ready" && Notification.permission !== "default") return null;

  async function allowReminders() {
    setStatus("requesting");
    try {
      await Notification.requestPermission();
      setStatus("finished");
    } catch {
      setStatus("failed");
    }
  }

  return (
    <>
      <p>{t("reminderPermissionHint")}</p>
      <div className="sb-scholly-onboarding-actions">
        <button type="button" disabled={disabled || status === "requesting"} onClick={() => void allowReminders()}>
          {t("reminderPermissionAllow")}
        </button>
      </div>
    </>
  );
}
