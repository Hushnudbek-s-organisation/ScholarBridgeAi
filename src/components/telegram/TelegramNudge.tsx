"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { Send, X } from "lucide-react";

const DISMISS_KEY = "scholarbridge_tg_nudge_dismissed";

/**
 * Small dashboard card: "Connect Telegram so deadlines reach your phone".
 * Shown only when the bot is configured, notifications are on and this
 * account is not connected yet. Dismissal is remembered per browser.
 */
export function TelegramNudge({ profileId, onNavigate }: { profileId: number | null; onNavigate: (tab: string) => void }) {
  const t = useTranslations("telegram");
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      // storage blocked — still fine to show
    }
    let alive = true;
    fetch("/api/telegram/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d?.bot?.configured && d.bot.notificationsEnabled && !d.link) setShow(true);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [profileId]);

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0 }}
          className="flex flex-col gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 sm:flex-row sm:items-center"
        >
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white sb-ink-on-bright">
              <Send className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-slate-900">{t("nudgeTitle")}</p>
              <p className="text-[12px] text-slate-600">{t("nudgeBody")}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
            <button onClick={() => onNavigate("notifications")} className="rounded-xl bg-sky-500 px-3.5 py-2 text-xs font-bold text-white sb-ink-on-bright hover:bg-sky-600">
              {t("nudgeCta")}
            </button>
            <button onClick={dismiss} aria-label={t("dismiss")} className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
