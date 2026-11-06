"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { fetchJsonWithTimeout } from "@/lib/clientFetch";
import { trackUnsavedWork, confirmSafeReload } from "@/lib/unsavedGuard";
import { CHUNK_ERROR_EVENT } from "./ChunkErrorBoundary";

/**
 * An old tab is not a "cache bug" and it must not be fixed with a blind reload.
 *
 * Each HTML response carries the build id of the process that rendered it.
 * When the tab becomes visible again, when the network comes back, or when a
 * dynamic import fails, we ask `/api/config/build` (no-store) which build is
 * live now. A difference means the deploy swapped under this tab, so the old
 * `/_next/static/...` names may no longer exist. We show a quiet, dismissible
 * banner and let the STUDENT decide when to refresh. No automatic reload, no
 * polling loop, no data loss for an unsaved essay.
 */

const COPY = {
  en: { title: "A newer version is available", body: "This tab was opened before the latest update. Refresh when you are ready; saved work is kept.", refresh: "Refresh", later: "Later" },
  uz: { title: "Yangi versiya mavjud", body: "Bu tab oxirgi yangilanishdan oldin ochilgan. Tayyor bo‘lganingizda yangilang; saqlangan ishlaringiz saqlanadi.", refresh: "Yangilash", later: "Keyin" },
  ru: { title: "Доступна новая версия", body: "Эта вкладка была открыта до последнего обновления. Обновите, когда будете готовы; сохранённые данные останутся.", refresh: "Обновить", later: "Позже" },
} as const;

type Lang = keyof typeof COPY;

function lang(): Lang {
  if (typeof document === "undefined") return "en";
  const value = document.documentElement.lang?.slice(0, 2).toLowerCase();
  return value === "uz" || value === "ru" ? value : "en";
}

function initialBuildId(): string | null {
  if (typeof document === "undefined") return null;
  return document.querySelector<HTMLMetaElement>('meta[name="sb-build-id"]')?.content || null;
}

export function BuildVersionMonitor() {
  const [outdated, setOutdated] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const stopTracking = trackUnsavedWork();
    const initial = initialBuildId();
    let cancelled = false;
    let lastCheck = 0;

    const check = async (force = false) => {
      if (cancelled || dismissed || !initial) return;
      const now = Date.now();
      // Even a tab that is constantly refocused cannot generate a request
      // storm; a failed chunk bypasses the throttle once.
      if (!force && now - lastCheck < 30_000) return;
      lastCheck = now;
      try {
        const data = await fetchJsonWithTimeout<{ buildId?: unknown }>("/api/config/build", {
          timeoutMs: 5_000,
          fallbackMessage: "Build version check failed.",
        });
        if (!cancelled && typeof data.buildId === "string" && data.buildId !== "dev" && data.buildId !== initial) {
          setOutdated(true);
        }
      } catch {
        // Offline / timeout / 500: keep the current tab usable. The section
        // boundary handles a genuine chunk failure with its own retry path.
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    const onOnline = () => void check();
    const onChunkError = () => void check(true);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    window.addEventListener(CHUNK_ERROR_EVENT, onChunkError);
    // One check shortly after hydration: catches a tab restored from bfcache.
    const timer = window.setTimeout(() => void check(true), 3_000);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      window.removeEventListener(CHUNK_ERROR_EVENT, onChunkError);
      stopTracking();
    };
  }, [dismissed]);

  if (!outdated || dismissed) return null;
  const t = COPY[lang()];
  return (
    <div
      role="status"
      data-testid="build-version-banner"
      className="pointer-events-none fixed inset-x-0 bottom-3 z-[70] flex justify-center px-3"
    >
      <div className="pointer-events-auto flex w-full max-w-xl flex-wrap items-start gap-3 rounded-surface border border-indigo-300 bg-white p-4 shadow-lg dark:border-indigo-500/40 dark:bg-slate-900">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900 dark:text-white">{t.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{t.body}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="primary" size="sm" onClick={() => confirmSafeReload()}>{t.refresh}</Button>
          <Button variant="outline" size="sm" onClick={() => setDismissed(true)}>{t.later}</Button>
        </div>
      </div>
    </div>
  );
}

export default BuildVersionMonitor;
