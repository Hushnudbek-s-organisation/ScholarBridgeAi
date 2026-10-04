"use client";

import React, { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { Award, BadgeCheck, BadgeX, GraduationCap, Loader2 } from "lucide-react";
import { AppNote } from "@/components/AppNote";

interface VerifyRow {
  id: number;
  certificateCode: string;
  issuedAt: string;
  courseTitle: string | null;
  profileName: string | null;
}

/**
 * Client side of the public verification page (audit A22).
 *
 * Fetches the EXISTING `/api/certificates/verify` endpoint — the same one the
 * machine-readable API uses — and renders a human answer: valid (with who
 * earned it and when) or not found. No new backend, no new table.
 */
export function CertificateVerifyView({ code }: { code: string }) {
  const t = useTranslations("certificateVerify");
  const locale = useLocale();
  const [status, setStatus] = useState<"loading" | "valid" | "invalid">("loading");
  const [row, setRow] = useState<VerifyRow | null>(null);
  const [displayCode, setDisplayCode] = useState(code);

  // State updates happen only in fetch callbacks (the effect body itself
  // performs no synchronous setState).
  useEffect(() => {
    let cancelled = false;
    const clean = decodeURIComponent(code).trim();
    fetch(`/api/certificates/verify?code=${encodeURIComponent(clean)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        setDisplayCode(clean);
        if (res.ok && data.valid === true) {
          setRow(data.certificate ?? null);
          setStatus("valid");
        } else {
          setRow(null);
          setStatus("invalid");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRow(null);
          setStatus("invalid");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  const fmt = (iso: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(iso));

  return (
    <main aria-busy={status === "loading"}>
      <header className="mb-6 flex flex-col items-center text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg">
          <Award className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">{t("title")}</h1>
        <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">{t("description")}</p>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          {t("codeLabel")}
          <code className="ml-2 break-all rounded bg-slate-100 px-2 py-1 font-mono text-xs text-slate-800 dark:bg-slate-800 dark:text-slate-200">{displayCode || "—"}</code>
        </p>

        {status === "loading" && (
          <p role="status" className="flex items-center gap-2 py-4 text-sm text-slate-500 dark:text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            {t("checking")}
          </p>
        )}

        {status === "valid" && (
          <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-800 dark:bg-emerald-950">
            <p className="flex items-center gap-2 text-base font-bold text-emerald-800 dark:text-emerald-300">
              <BadgeCheck className="h-6 w-6" aria-hidden="true" />
              {t("valid")}
            </p>
            {row ? (
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-slate-500 dark:text-slate-400">{t("student")}</dt>
                  <dd className="font-semibold text-slate-900 dark:text-slate-100">{row.profileName || "—"}</dd>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-slate-500 dark:text-slate-400">{t("course")}</dt>
                  <dd className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                    <GraduationCap className="h-4 w-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                    {row.courseTitle || "—"}
                  </dd>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-slate-500 dark:text-slate-400">{t("issued")}</dt>
                  <dd className="font-semibold text-slate-900 dark:text-slate-100">{fmt(row.issuedAt)}</dd>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-slate-500 dark:text-slate-400">{t("codeLabel")}</dt>
                  <dd><code className="font-mono text-xs text-slate-900 dark:text-slate-100">{row.certificateCode}</code></dd>
                </div>
              </dl>
            ) : (
              <p className="mt-3 text-xs text-emerald-700 dark:text-emerald-400">{t("validGeneric")}</p>
            )}
          </div>
        )}

        {status === "invalid" && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 dark:border-rose-800 dark:bg-rose-950">
            <p className="flex items-center gap-2 text-base font-bold text-rose-800 dark:text-rose-300">
              <BadgeX className="h-6 w-6" aria-hidden="true" />
              {t("invalid")}
            </p>
            <p className="mt-3 text-sm text-rose-700 dark:text-rose-400">{t("invalidHelp")}</p>
          </div>
        )}
      </div>

      {/* What "valid" means — the check confirms this platform issued the
          certificate, not that any university or employer recognises it. */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
        <AppNote kind="certificate" />
      </div>

      <footer className="mt-6 text-center">
        <Link href="/" className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
          {t("backHome")}
        </Link>
      </footer>
    </main>
  );
}
