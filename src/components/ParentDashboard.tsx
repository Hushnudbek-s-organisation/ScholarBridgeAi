"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Copy, Eye, EyeOff, Info, Loader2, Lock, ShieldCheck, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { StudentProfile } from "./Navbar";

interface ParentShareSettings {
  enabled: boolean;
  email: string;
  link: string | null;
  linkUnavailable: boolean;
}

async function readParentSettings(profileId: number, signal: AbortSignal): Promise<ParentShareSettings> {
  const response = await fetch(`/api/parent-share?profileId=${profileId}`, {
    credentials: "include",
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error("settings unavailable");
  const value: unknown = await response.json();
  if (!value || typeof value !== "object") throw new Error("invalid settings response");
  const json = value as Partial<ParentShareSettings>;
  return {
    enabled: json.enabled === true,
    email: typeof json.email === "string" ? json.email : "",
    link: typeof json.link === "string" ? json.link : null,
    linkUnavailable: json.linkUnavailable === true,
  };
}

/**
 * Parent-share settings for one selected profile. The API owns authorization,
 * Premium entitlement, and the narrow public response allowlist.
 */
export function ParentDashboard({ activeProfile }: { activeProfile: StudentProfile | null }) {
  const t = useTranslations("parentDashboard");
  const profileId = activeProfile?.id ?? null;
  const [enabled, setEnabled] = useState(false);
  const [email, setEmail] = useState("");
  const [savedEmail, setSavedEmail] = useState("");
  const [emailSaved, setEmailSaved] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [linkUnavailable, setLinkUnavailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(Boolean(activeProfile?.id));
  const [loadError, setLoadError] = useState(false);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reveal, setReveal] = useState(false);
  const loadAbortRef = useRef<AbortController | null>(null);

  const applySettings = useCallback((settings: ParentShareSettings) => {
    setEnabled(settings.enabled);
    setEmail(settings.email);
    setSavedEmail(settings.email);
    setEmailSaved(false);
    setLink(settings.link);
    setLinkUnavailable(settings.linkUnavailable);
    setReveal(false);
  }, []);

  const loadSettings = useCallback(async () => {
    if (profileId === null) return;
    loadAbortRef.current?.abort();
    const controller = new AbortController();
    loadAbortRef.current = controller;
    setLoading(true);
    setLoadError(false);
    setError(false);
    try {
      const settings = await readParentSettings(profileId, controller.signal);
      if (!controller.signal.aborted) applySettings(settings);
    } catch {
      if (!controller.signal.aborted) setLoadError(true);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [profileId, applySettings]);

  useEffect(() => {
    if (profileId === null) return;
    const controller = new AbortController();
    loadAbortRef.current = controller;
    void readParentSettings(profileId, controller.signal)
      .then((settings) => {
        if (!controller.signal.aborted) applySettings(settings);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => {
      controller.abort();
      if (loadAbortRef.current === controller) loadAbortRef.current = null;
    };
  }, [profileId, applySettings]);

  const update = useCallback(
    async (next: boolean) => {
      if (profileId === null) return;
      setBusy(true);
      setError(false);
      try {
        const res = await fetch("/api/parent-share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          cache: "no-store",
          body: JSON.stringify({ profileId, enabled: next, email }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (json.code === "canonical_url_missing") setLinkUnavailable(true);
          throw new Error("update failed");
        }
        setEnabled(json.enabled === true);
        const storedEmail = typeof json.email === "string" ? json.email : "";
        setEmail(storedEmail);
        setSavedEmail(storedEmail);
        setEmailSaved(false);
        setLink(typeof json.link === "string" ? json.link : null);
        setLinkUnavailable(json.linkUnavailable === true);
        setCopied(false);
        setReveal(false);
      } catch {
        setError(true);
      } finally {
        setBusy(false);
      }
    },
    [profileId, email]
  );

  const saveEmail = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (profileId === null || email === savedEmail || savingEmail) return;
    setSavingEmail(true);
    setEmailSaved(false);
    setError(false);
    try {
      const res = await fetch("/api/parent-share", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ profileId, email }),
      });
      if (!res.ok) throw new Error("contact note update failed");
      const json = await res.json();
      const storedEmail = typeof json.email === "string" ? json.email : "";
      setEmail(storedEmail);
      setSavedEmail(storedEmail);
      setEmailSaved(true);
    } catch {
      setError(true);
    } finally {
      setSavingEmail(false);
    }
  }, [profileId, email, savedEmail, savingEmail]);

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked — the link is still visible and selectable.
      setReveal(true);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start gap-3">
          <Users aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t("title")}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">{t("intro")}</p>
          </div>
        </div>

        {!activeProfile ? (
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{t("profileRequired")}</p>
        ) : (
          <>
            {loading && (
              <p role="status" aria-live="polite" className="mt-4 flex min-h-11 items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> {t("loadSettings")}
              </p>
            )}
            {loadError && (
              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-200" role="alert">
                <span>{t("loadError")}</span>
                <button
                  type="button"
                  onClick={() => void loadSettings()}
                  className="min-h-11 rounded-lg px-3 font-semibold underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  {t("share.retry")}
                </button>
              </div>
            )}

            {linkUnavailable && (
              <p role="status" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                {t("linkUnavailable")}
              </p>
            )}

            <div className="mt-4 rounded-xl border border-slate-200 p-3 sm:p-4 dark:border-slate-700">
              <label className="flex min-h-11 items-start gap-3 py-2">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(event) => void update(event.target.checked)}
                  disabled={busy || loading || loadError}
                  className="mt-1 h-5 w-5 shrink-0 accent-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">{t("shareLabel")}</span>
                  <span className="mt-0.5 block text-sm leading-5 text-slate-600 dark:text-slate-300">{t("revocationHelp")}</span>
                </span>
              </label>

              {enabled && (
                <div className="mt-3 space-y-3 border-t border-slate-100 pt-3 dark:border-slate-700">
                  <form onSubmit={(event) => void saveEmail(event)} className="flex flex-wrap items-end gap-2">
                    <label className="block w-full max-w-sm text-sm">
                      <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">{t("emailLabel")}</span>
                      <input
                        type="email"
                        value={email}
                        onChange={(event) => {
                          setEmail(event.target.value);
                          setEmailSaved(false);
                          setError(false);
                        }}
                        placeholder={t("emailPlaceholder")}
                        autoComplete="email"
                        className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={savingEmail || busy || email === savedEmail}
                      className="min-h-11 rounded-lg bg-indigo-700 px-4 text-sm font-semibold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700"
                    >
                      {savingEmail ? t("savingEmail") : t("saveEmail")}
                    </button>
                    {emailSaved && <span role="status" aria-live="polite" className="text-sm font-medium text-emerald-800 dark:text-emerald-300">{t("emailSaved")}</span>}
                  </form>

                  {link && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 sm:p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
                      <p className="flex items-start gap-2 text-sm font-medium leading-5 text-emerald-950 dark:text-emerald-100">
                        <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{t("shareLinkIntro")}</span>
                      </p>
                      <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
                        <code className="min-w-0 max-w-full break-all rounded bg-white px-2 py-1.5 text-xs text-slate-800 dark:bg-slate-900 dark:text-slate-100">
                          {reveal ? link : `${link.slice(0, 34)}${"•".repeat(18)}`}
                        </code>
                        <button
                          type="button"
                          onClick={() => setReveal((current) => !current)}
                          aria-label={reveal ? t("hideLink") : t("showLink")}
                          className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                        >
                          {reveal ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
                          <span>{reveal ? t("hideLink") : t("showLink")}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void copy()}
                          className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-3 text-sm font-medium text-white hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                        >
                          <Copy aria-hidden="true" className="h-4 w-4" /> {copied ? t("copied") : t("copyLink")}
                        </button>
                      </div>
                      <p className="mt-3 text-sm leading-5 text-emerald-950/90 dark:text-emerald-100">{t("linkPrivacyNotice")}</p>
                    </div>
                  )}
                </div>
              )}

              {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">{t("updateError")}</p>}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                  <ShieldCheck aria-hidden="true" className="h-4 w-4" /> {t("whatTheySee")}
                </h3>
                <ul className="mt-2 space-y-2 text-sm leading-5 text-slate-700 dark:text-slate-300">
                  <li>{t("visibleProfileContext")}</li>
                  <li>{t("visibleApplicationCounts")}</li>
                  <li>{t("visibleReportedOutcomes")}</li>
                </ul>
              </div>
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-rose-800 dark:text-rose-300">
                  <Lock aria-hidden="true" className="h-4 w-4" /> {t("whatTheyDoNotSee")}
                </h3>
                <ul className="mt-2 space-y-2 text-sm leading-5 text-slate-700 dark:text-slate-300">
                  <li>{t("hiddenCredentials")}</li>
                  <li>{t("hiddenEssays")}</li>
                  <li>{t("hiddenScores")}</li>
                  <li>{t("hiddenDecisionDetails")}</li>
                  <li>{t("hiddenPrivateMessages")}</li>
                </ul>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50/70 p-4 text-sm leading-5 text-sky-950 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
              <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-sky-700 dark:text-sky-300" />
              <p>{t("scopeNote")}</p>
            </div>
            {busy && (
              <p role="status" aria-live="polite" className="mt-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> {t("loadSettings")}
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
