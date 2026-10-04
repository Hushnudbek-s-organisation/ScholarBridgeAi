"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Globe2, Send, ShieldCheck, Trash2, Loader2, AlertTriangle } from "lucide-react";

interface SessionRow {
  id: number;
  scope: string;
  userAgent: string | null;
  ip: string | null;
  createdAt: string;
  lastSeenAt: string;
  current: boolean;
}

/**
 * My active sessions (audit A23) — server-side, revocable.
 *
 * Shown with Telegram & alert settings. Lists every device/channel the account
 * is signed in from (web cookies + Telegram channel sessions) and lets the
 * student revoke one session or all others. A stolen token stops working the
 * moment it is revoked; the current session is protected from self-lockout.
 */
export function SessionsPanel() {
  const t = useTranslations("sessions");
  const locale = useLocale();
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<number | "all" | null>(null);
  const [actionError, setActionError] = useState(false);

  const fmt = useCallback(
    (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso)),
    [locale]
  );

  const load = useCallback(() => {
    // State updates happen only in fetch callbacks (never synchronously in
    // the effect body) so re-fetches after a revoke stay effect-safe.
    fetch("/api/sessions")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(String(data?.error ?? res.status));
        setError(false);
        setSessions(data.sessions ?? []);
      })
      .catch(() => {
        setError(true);
        setSessions(null);
      });
  }, []);

  useEffect(load, [load]);

  const revoke = async (payload: Record<string, unknown>, key: number | "all") => {
    setBusy(key);
    setActionError(false);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("revoke failed");
      load();
    } catch {
      setActionError(true);
    } finally {
      setBusy(null);
    }
  };

  const describe = (s: SessionRow) => {
    const ua = s.userAgent ?? "";
    const os = /windows/i.test(ua) ? "Windows" : /mac os/i.test(ua) ? "macOS" : /android/i.test(ua) ? "Android" : /iphone|ipad/i.test(ua) ? "iOS" : /linux/i.test(ua) ? "Linux" : "";
    const browser = /edg\//i.test(ua) ? "Edge" : /chrome/i.test(ua) ? "Chrome" : /safari/i.test(ua) ? "Safari" : /firefox/i.test(ua) ? "Firefox" : "";
    const parts = [s.scope === "telegram" ? t("scopeTelegram") : t("scopeWeb"), browser, os].filter(Boolean);
    return parts.join(" · ") || t("scopeUnknown");
  };

  return (
    <section aria-labelledby="sessions-heading" className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 id="sessions-heading" className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
          <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          {t("title")}
        </h3>
        {sessions && sessions.some((s) => !s.current) && (
          <button
            type="button"
            onClick={() => revoke({ all: true }, "all")}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-rose-400 hover:text-rose-600 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:border-rose-500 dark:hover:text-rose-400"
          >
            {busy === "all" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
            {t("revokeAll")}
          </button>
        )}
      </div>

      <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">{t("description")}</p>

      {error && (
        <p role="alert" className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          {t("loadError")}
        </p>
      )}

      {!error && sessions === null && (
        <p className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {t("loading")}
        </p>
      )}

      {actionError && (
        <p role="alert" className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
          {t("actionError")}
        </p>
      )}

      {sessions && sessions.length > 0 && (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {sessions.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {s.scope === "telegram" ? <Send className="h-4 w-4 text-sky-500" aria-hidden="true" /> : <Globe2 className="h-4 w-4 text-slate-400" aria-hidden="true" />}
                  <span className="truncate">{describe(s)}</span>
                  {s.current && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                      {t("thisDevice")}
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {t("lastSeen", { when: fmt(s.lastSeenAt) })}
                  {s.ip ? ` · ${s.ip}` : ""}
                </p>
              </div>
              {!s.current && (
                <button
                  type="button"
                  onClick={() => revoke({ sessionId: s.id }, s.id)}
                  disabled={busy !== null}
                  aria-label={t("revokeAria", { device: describe(s) })}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-rose-400 hover:text-rose-600 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:border-rose-500 dark:hover:text-rose-400"
                >
                  {busy === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                  {t("revoke")}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {sessions && sessions.length === 0 && !error && (
        <p className="text-xs text-slate-500 dark:text-slate-400">{t("empty")}</p>
      )}
    </section>
  );
}
