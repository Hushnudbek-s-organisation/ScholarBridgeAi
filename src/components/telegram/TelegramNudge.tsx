"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { Send, X } from "lucide-react";
import {
  localDayKey,
  nudgeDismissKey,
  staleDismissKeys,
} from "@/lib/telegram/nudge";

/**
 * "Connect the Telegram bot so you can use the site fully" — the reminder a new
 * account sees for its first ten days.
 *
 * Two things changed here, both from the operator's instruction:
 *
 *  1. **The window is the server's.** This component no longer decides whether
 *     to appear from `bot.configured && !link`; it asks `/api/telegram/me`,
 *     which answers with `nudge.show` computed from the account's real age
 *     (`NUDGE_WINDOW_DAYS = 10`, `src/lib/telegram/nudge.ts`). So the prompt
 *     covers exactly the first ten days and then stops — it cannot follow an
 *     old account around, and a brand-new one always gets it.
 *  2. **Dismissal is per day, not forever.** The old single flag
 *     (`…_dismissed = "1"`) meant one tap on day one silenced the prompt for the
 *     life of the account. Now the key carries the *profile id and the local
 *     day*, so "Hide" means "not now, today" and the reminder returns tomorrow
 *     while the account is still new. Old keys are pruned on write.
 *
 * It is rendered in the app shell, not inside one tab: a student who lands on
 * any screen in their first days sees it. The permanent connect card in
 * Telegram settings is untouched, so nothing is lost after day ten.
 */
export function TelegramNudge({
  profileId,
  onConnect,
}: {
  profileId: number | null;
  /** Opens the Telegram settings tab, where the actual connect flow lives. */
  onConnect: () => void;
}) {
  const t = useTranslations("telegram");
  const [show, setShow] = useState(false);
  const [daysLeft, setDaysLeft] = useState(0);

  const dismiss = useCallback(() => {
    setShow(false);
    if (!profileId) return;
    try {
      const today = localDayKey();
      const key = nudgeDismissKey(profileId, today);
      localStorage.setItem(key, "1");
      // Prune previous days' keys for this profile — one entry, not one per day.
      const stale = staleDismissKeys(Object.keys(localStorage), profileId, today);
      for (const old of stale) localStorage.removeItem(old);
    } catch {
      // storage blocked — the prompt simply reappears next page load
    }
  }, [profileId]);

  useEffect(() => {
    if (!profileId) return;
    let dismissedToday = false;
    try {
      dismissedToday = localStorage.getItem(nudgeDismissKey(profileId, localDayKey())) === "1";
    } catch {
      dismissedToday = false;
    }
    if (dismissedToday) return;

    let alive = true;
    fetch("/api/telegram/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return;
        if (d?.nudge?.show === true) {
          setDaysLeft(typeof d.nudge.daysLeft === "number" ? d.nudge.daysLeft : 0);
          setShow(true);
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [profileId]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-3 flex flex-col gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 sm:flex-row sm:items-center"
          role="status"
        >
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white sb-ink-on-bright">
              <Send className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-slate-900">{t("nudgeTitle")}</p>
              <p className="text-[12px] leading-relaxed text-slate-600">{t("nudgeBody")}</p>
              {daysLeft > 0 && (
                <p className="mt-0.5 text-[11px] font-semibold text-sky-800">
                  {t("nudgeDaysLeft", { days: daysLeft })}
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
            <button
              onClick={onConnect}
              className="min-h-11 rounded-xl bg-sky-500 px-3.5 py-2 text-xs font-bold text-white sb-ink-on-bright hover:bg-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
            >
              {t("nudgeCta")}
            </button>
            <button
              onClick={dismiss}
              aria-label={t("dismiss")}
              title={t("dismiss")}
              className="min-h-11 min-w-11 rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
