"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Award, CheckCircle2, Copy, Loader2, Lock, Printer } from "lucide-react";
import { CertificateView, type CertificateData } from "./CertificateView";
import { StudentProfile } from "./Navbar";

/**
 * My certificates (audit A22) — the student-facing place to FIND, VIEW and
 * VERIFY earned course certificates. The backend already existed
 * (`/api/certificates`, `/api/certificates/verify`); this is the missing UI:
 *
 *  - lists every certificate the account has earned (course + date + code)
 *  - opens the printable certificate (CertificateView)
 *  - copies a public verification link anyone can open to confirm it is real
 *
 * The list API is Premium-gated (`courses_full`) exactly like the course
 * content — a free account sees an honest upgrade hint, never fake data.
 */
export function MyCertificatesPanel({ activeProfile }: { activeProfile: StudentProfile | null }) {
  const t = useTranslations("certificates");
  const locale = useLocale();
  const [certs, setCerts] = useState<CertificateData[] | null>(null);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState(false);
  const [openCert, setOpenCert] = useState<CertificateData | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  // Stale rows are hidden via `loadedFor` until the answer for THIS profile
  // has arrived (all state updates live in fetch callbacks, never
  // synchronously in the effect body).
  const [loadedFor, setLoadedFor] = useState<number | null>(null);

  const ready = loadedFor === activeProfile?.id;

  const fmt = useCallback(
    (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(iso)),
    [locale]
  );

  useEffect(() => {
    if (!activeProfile) return;
    const profileId = activeProfile.id;
    let cancelled = false;
    fetch(`/api/certificates?profileId=${profileId}`)
      .then(async (res) => {
        if (cancelled) return;
        const data = await res.json().catch(() => ({}));
        if (res.status === 403 && data?.code === "premium_required") {
          setError(false);
          setLocked(true);
          setCerts(null);
          setLoadedFor(profileId);
          return;
        }
        if (!res.ok) throw new Error(String(data?.error ?? res.status));
        setError(false);
        setLocked(false);
        setCerts(data.certificates ?? []);
        setLoadedFor(profileId);
      })
      .catch(() => {
        if (!cancelled) {
          setLocked(false);
          setError(true);
          setLoadedFor(profileId);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeProfile]);

  const verifyLink = (code: string) =>
    `${typeof window !== "undefined" ? window.location.origin : ""}/certificates/${encodeURIComponent(code)}`;

  const copyLink = async (code: string) => {
    try {
      await navigator.clipboard.writeText(verifyLink(code));
      setCopied(code);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* clipboard blocked — the button state simply stays "copy" */
    }
  };

  if (!activeProfile) return null;

  return (
    <section aria-labelledby="my-certs-heading" className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <h3 id="my-certs-heading" className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
        <Award className="h-4 w-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
        {t("title")}
      </h3>
      <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">{t("description")}</p>

      {ready && locked && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          <p className="text-xs text-amber-800 dark:text-amber-200">{t("premiumOnly")}</p>
        </div>
      )}

      {ready && error && (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
          {t("loadError")}
        </p>
      )}

      {!ready && !locked && !error && (
        <p role="status" className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {t("loading")}
        </p>
      )}

      {ready && !locked && !error && certs !== null && certs.length === 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400">{t("empty")}</p>
      )}

      {ready && !locked && !error && certs !== null && certs.length > 0 && (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {certs.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  <span className="truncate">{c.courseTitle || t("unknownCourse")}</span>
                </p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {t("issued", { when: fmt(c.issuedAt) })} · {t("codeLabel")}: <code className="font-mono">{c.certificateCode}</code>
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => setOpenCert(openCert?.id === c.id ? null : c)}
                  aria-expanded={openCert?.id === c.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-600 dark:text-slate-200 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
                >
                  <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("view")}
                </button>
                <button
                  type="button"
                  onClick={() => void copyLink(c.certificateCode)}
                  aria-label={t("copyVerifyAria", { course: c.courseTitle || t("unknownCourse") })}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-emerald-400 hover:text-emerald-600 dark:border-slate-600 dark:text-slate-200 dark:hover:border-emerald-500 dark:hover:text-emerald-400"
                >
                  {copied === c.certificateCode ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                  {copied === c.certificateCode ? t("copied") : t("copyVerify")}
                </button>
              </div>
              {openCert?.id === c.id && (
                <div className="w-full pt-2">
                  <CertificateView
                    certificate={{ ...c, profileName: activeProfile.name }}
                    profileName={activeProfile.name}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {ready && !locked && !error && (
        <p className="mt-4 text-[11px] text-slate-400 dark:text-slate-500">{t("verifyHint")}</p>
      )}
    </section>
  );
}
