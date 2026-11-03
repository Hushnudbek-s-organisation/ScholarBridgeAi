"use client";

import { useTranslations } from "next-intl";
import type { AdmissionsStatistics } from "@/lib/admissionsStatistics";

/** Primary observations never borrow a value from the estimated fit model. */
export function AdmissionsStatisticsCard({ statistics }: { statistics?: AdmissionsStatistics }) {
  const t = useTranslations("chancing");
  if (!statistics) return null;
  return (
    <details className="rounded-control border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      <summary className="cursor-pointer text-sm font-semibold">{t("observedStatsTitle")} · {statistics.verifiedMetricCount}/{Object.keys(statistics.metrics).length}</summary>
      <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{t("observedStatsNotice")}</p>
      {statistics.level === "undergraduate_first_year" && <p className="mt-2 text-xs font-semibold text-amber-800 dark:text-amber-200">{t("statUndergraduateScope")}</p>}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <caption className="sr-only">{t("observedStatsTitle")} — {statistics.institution}</caption>
          <thead><tr><th className="p-2">{t("statMetric")}</th><th className="p-2">{t("statValue")}</th><th className="p-2">{t("statEvidence")}</th></tr></thead>
          <tbody>{Object.entries(statistics.metrics).map(([key, metric]) => (
            <tr key={key} className="border-t border-slate-100 dark:border-slate-700">
              <th scope="row" className="p-2 font-medium">{t(`metric_${key}`)}</th>
              <td className="p-2">{metric.value === null ? "—" : `${metric.value}${key.endsWith("Rate") ? "%" : ""}`}<span className="ml-2 text-slate-500">{t(`stat_${metric.status}`)}</span></td>
              <td className="max-w-md p-2">
                {metric.sourceUrl && <a className="font-semibold text-indigo-600 underline dark:text-indigo-300" href={metric.sourceUrl} target="_blank" rel="noopener noreferrer">{t("statSource")} · {metric.accessedOn}</a>}
                {metric.cohort && <p className="mt-1">{metric.cohort} · {t(`population_${metric.population ?? "unknown"}`)}</p>}
                {metric.calculation && <p>{metric.calculation.admitted.toLocaleString("en-US")} / {metric.calculation.considered.toLocaleString("en-US")} × 100</p>}
                <details className="mt-1"><summary className="cursor-pointer text-slate-500">{t("statMethod")}</summary><p className="mt-1">{metric.basis}</p></details>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </details>
  );
}
