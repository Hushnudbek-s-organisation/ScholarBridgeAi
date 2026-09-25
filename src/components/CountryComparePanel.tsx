"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Globe2, Loader2, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";

interface Comparison {
  country: string;
  universities: number;
  tuition: { avgUsd: number | null; published: number };
  living: { avgUsd: number | null; published: number };
  minIelts: { avg: number | null; published: number };
  scholarships: { count: number; avgUsd: number | null; totalUsd: number | null };
  workRights: null;
}

interface CompareData {
  countries: Comparison[];
  available: { country: string; universities: number }[];
}

function money(v: number | null): string {
  return v == null ? "—" : `$${v.toLocaleString("en-US")}`;
}

/**
 * #29 Country comparison — destination countries compared on the data the
 * database actually has. Work rights stay "not published": the platform does
 * not fill figures from memory.
 */
export function CountryComparePanel() {
  const t = useTranslations("countryCompare");
  const [data, setData] = useState<CompareData | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (countries: string[]) => {
    setLoading(true);
    setError(null);
    try {
      const qs = countries.length ? `?countries=${encodeURIComponent(countries.join(","))}` : "";
      const res = await fetch(`/api/countries/compare${qs}`, { cache: "no-store" });
      const b = await res.json();
      if (!res.ok) throw new Error(b?.error ?? `HTTP ${res.status}`);
      setData(b);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  // First load — setState only inside promise callbacks, never synchronously
  // in the effect body.
  useEffect(() => {
    let live = true;
    fetch("/api/countries/compare", { cache: "no-store" })
      .then((res) => res.json().then((b) => (res.ok ? b : Promise.reject(new Error(b?.error ?? `HTTP ${res.status}`)))))
      .then((b) => {
        if (live) setData(b);
      })
      .catch((e) => {
        if (live) setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);

  const toggle = (c: string) =>
    setSelected((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : prev.length >= 6 ? prev : [...prev, c]));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div>
        <h3 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-slate-500">
          <Globe2 className="h-3.5 w-3.5" /> {t("title")}
        </h3>
        <p className="mt-1 max-w-2xl text-[11px] text-slate-500">{t("subtitle")}</p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {(data?.available ?? []).slice(0, 14).map((c) => (
          <button
            key={c.country}
            onClick={() => toggle(c.country)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors ${
              selected.includes(c.country)
                ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            }`}
          >
            {c.country} <span className="text-[9px] opacity-60">({c.universities})</span>
          </button>
        ))}
        <button
          onClick={() => void load(selected)}
          disabled={loading || selected.length < 1}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {t("compare")}
        </button>
      </div>
      {error && <p className="mt-3 text-xs font-semibold text-rose-600">{error}</p>}

      {data && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-400">
                <th className="py-2 pr-3">{t("country")}</th>
                <th className="py-2 pr-3">{t("universities")}</th>
                <th className="py-2 pr-3">{t("avgTuition")}</th>
                <th className="py-2 pr-3">{t("avgLiving")}</th>
                <th className="py-2 pr-3">{t("avgIelts")}</th>
                <th className="py-2 pr-3">{t("scholarships")}</th>
                <th className="py-2 pr-3">{t("potentialFunding")}</th>
                <th className="py-2">{t("workRights")}</th>
              </tr>
            </thead>
            <tbody>
              {data.countries.map((c) => (
                <tr key={c.country} className="border-b border-slate-100">
                  <td className="py-2 pr-3 font-bold text-slate-800">{c.country}</td>
                  <td className="py-2 pr-3">{c.universities}</td>
                  <td className="py-2 pr-3">
                    {money(c.tuition.avgUsd)} <span className="text-[9px] text-slate-400">({c.tuition.published})</span>
                  </td>
                  <td className="py-2 pr-3">
                    {money(c.living.avgUsd)} <span className="text-[9px] text-slate-400">({c.living.published})</span>
                  </td>
                  <td className="py-2 pr-3">
                    {c.minIelts.avg ?? "—"} <span className="text-[9px] text-slate-400">({c.minIelts.published})</span>
                  </td>
                  <td className="py-2 pr-3">{c.scholarships.count}</td>
                  <td className="py-2 pr-3 font-semibold text-indigo-700">{money(c.scholarships.totalUsd)}</td>
                  <td className="py-2 text-slate-400">{t("notPublished")}</td>
                </tr>
              ))}
              {data.countries.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-400">
                    {t("noResults")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <p className="mt-2 text-[10px] text-slate-400">{t("publishedNote")}</p>
        </div>
      )}
    </div>
  );
}
