"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useLocaleContext } from "@/i18n/LocaleProvider";
import type { ParentSummary } from "@/lib/parentSummary";

function isParentSummary(value: unknown): value is ParentSummary {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<ParentSummary>;
  const context = data.profileContext;
  const records = data.applicationRecords;
  return (
    (typeof data.studentFirstName === "string" || data.studentFirstName === null) &&
    !!context && typeof context === "object" &&
    (typeof context.degreeLevel === "string" || context.degreeLevel === null) &&
    (typeof context.targetMajor === "string" || context.targetMajor === null) &&
    (typeof context.targetCountries === "string" || context.targetCountries === null) &&
    !!records && typeof records === "object" &&
    Number.isFinite(records.total) && Number.isFinite(records.submittedOrLater) &&
    Number.isFinite(records.studentReportedAcceptedOutcomes)
  );
}

async function readSharedSummary(token: string, signal: AbortSignal): Promise<ParentSummary> {
  if (!token || token.length < 20 || token.length > 128) throw new Error("invalid link");
  const response = await fetch(`/api/parent-share?token=${encodeURIComponent(token)}`, {
    method: "GET",
    cache: "no-store",
    credentials: "omit",
    referrerPolicy: "no-referrer",
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) throw new Error("shared page unavailable");
  const json: unknown = await response.json();
  const result = json && typeof json === "object" ? (json as { summary?: unknown }).summary : null;
  if (!isParentSummary(result)) throw new Error("invalid summary");
  return result;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <dt className="text-sm leading-5 text-slate-600 dark:text-slate-300">{label}</dt>
      <dd className="mt-2 break-words text-2xl font-semibold tabular-nums text-slate-950 dark:text-white">{value}</dd>
    </div>
  );
}

/** Public bearer-link view; the API returns only ParentSummary's allowlisted fields. */
export function ParentShareView({ token }: { token: string }) {
  const t = useTranslations("parentDashboard.share");
  const { locale } = useLocaleContext();
  const [summary, setSummary] = useState<ParentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  const numberFormat = new Intl.NumberFormat(locale);

  const load = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setUnavailable(false);
    setSummary(null);

    try {
      const result = await readSharedSummary(token, controller.signal);
      if (!controller.signal.aborted) setSummary(result);
    } catch {
      if (!controller.signal.aborted) setUnavailable(true);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const controller = new AbortController();
    requestRef.current = controller;
    void readSharedSummary(token, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setSummary(result);
      })
      .catch(() => {
        if (!controller.signal.aborted) setUnavailable(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => {
      controller.abort();
      if (requestRef.current === controller) requestRef.current = null;
    };
  }, [token]);

  const profile = summary?.profileContext;
  const records = summary?.applicationRecords;
  const hasProfileContext = Boolean(profile?.degreeLevel || profile?.targetMajor || profile?.targetCountries);

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto w-full max-w-3xl space-y-5">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <ShieldCheck aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">ScholarBridgeAI</p>
              <h1 className="mt-1 break-words text-2xl font-bold tracking-tight sm:text-3xl">{t("pageTitle")}</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{t("pageIntro")}</p>
              {summary && <p className="mt-2 break-words text-sm font-medium text-slate-800 dark:text-slate-200">{t("sharedFor", { name: summary.studentFirstName ?? t("studentNameFallback") })}</p>}
            </div>
          </div>
        </header>

        {loading && (
          <section role="status" aria-live="polite" aria-busy="true" className="flex min-h-24 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <Loader2 aria-hidden="true" className="h-5 w-5 shrink-0 animate-spin text-indigo-600 dark:text-indigo-400" />
            <span>{t("loading")}</span>
          </section>
        )}

        {unavailable && !loading && (
          <section role="alert" className="rounded-2xl border border-rose-200 bg-white p-5 sm:p-7 dark:border-rose-900 dark:bg-slate-900">
            <div className="flex items-start gap-3">
              <AlertCircle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-rose-700 dark:text-rose-300" />
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{t("loadErrorTitle")}</h2>
                <p className="mt-2 break-words text-sm leading-6 text-slate-700 dark:text-slate-300">{t("invalidLink")}</p>
                <button
                  type="button"
                  onClick={() => void load()}
                  className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-indigo-700 px-4 text-sm font-semibold text-white hover:bg-indigo-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700"
                >
                  {t("retry")}
                </button>
              </div>
            </div>
          </section>
        )}

        {summary && records && (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 dark:border-slate-700 dark:bg-slate-900">
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{t("profileHeading")}</h2>
              {hasProfileContext ? (
                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  {profile?.targetMajor && <Metric label={t("majorLabel")} value={profile.targetMajor} />}
                  {profile?.degreeLevel && <Metric label={t("degreeLabel")} value={profile.degreeLevel} />}
                  {profile?.targetCountries && <Metric label={t("countriesLabel")} value={profile.targetCountries} />}
                </dl>
              ) : (
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{t("notRecorded")}</p>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 dark:border-slate-700 dark:bg-slate-900">
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{t("applicationsHeading")}</h2>
              <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                <Metric label={t("totalRecordsLabel")} value={numberFormat.format(records.total)} />
                <Metric label={t("submittedRecordsLabel")} value={numberFormat.format(records.submittedOrLater)} />
                <Metric label={t("acceptedOutcomesLabel")} value={numberFormat.format(records.studentReportedAcceptedOutcomes)} />
              </dl>
              {records.total === 0 && <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">{t("noApplicationRecords")}</p>}
              <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">{t("countNote")}</p>
              {records.studentReportedAcceptedOutcomes > 0 && <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{t("outcomeNote")}</p>}
            </section>

            <section className="rounded-2xl border border-sky-200 bg-sky-50/70 p-5 sm:p-6 dark:border-sky-900 dark:bg-sky-950/30">
              <h2 className="text-sm font-semibold text-sky-950 dark:text-sky-100">{t("privacyHeading")}</h2>
              <p className="mt-2 text-sm leading-6 text-sky-950/90 dark:text-sky-100">{t("privacyBody")}</p>
              <p className="mt-3 text-sm font-medium leading-6 text-sky-950 dark:text-sky-100">{t("notAssessment")}</p>
            </section>

            <p className="px-1 text-center text-xs leading-5 text-slate-600 dark:text-slate-400">{t("footer")}</p>
          </>
        )}
      </div>
    </main>
  );
}
