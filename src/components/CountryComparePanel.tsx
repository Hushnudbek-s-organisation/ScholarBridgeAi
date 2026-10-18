"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Globe2, Loader2, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { countriesMatch, countryTranslationKey, resolveCountryCode, withQsTop200Countries } from "@/lib/countries";
import { collapsePicks, countrySearchMatch, rankCountryPicks } from "@/lib/countryPicker";
import { CountryFlag } from "@/components/CountryFlag";
import { ScrollRegion } from "@/components/hubs/ui";
import { AppNote } from "@/components/AppNote";

interface Comparison {
  country: string;
  universities: number;
  tuition: { avgUsd: number | null; published: number };
  living: { avgUsd: number | null; published: number };
  minIelts: { avg: number | null; published: number };
  scholarships: {
    count: number;
    amountsPublished: number;
    awardPeriod: "year" | "month" | "one_time" | "total" | null;
    avgUsd: number | null;
    totalUsd: number | null;
  };
  workRights: { avgYears: number; published: number } | null;
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
  const tCountry = useTranslations("countryNames");
  const tc = useTranslations("common");
  const [data, setData] = useState<CompareData | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  // The pill row used to sprawl across every catalog country; it now shows a
  // ranked 10-pill window (selected pills NEVER fall out of the window) with
  // a search field and a Show-more footer.
  const [countrySearch, setCountrySearch] = useState("");
  const [showAllCountries, setShowAllCountries] = useState(false);
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
    setSelected((prev) =>
      prev.some((value) => countriesMatch(value, c))
        ? prev.filter((value) => !countriesMatch(value, c))
        : prev.length >= 6
          ? prev
          : [...prev, c]
    );
  const availableRows = data?.available ?? [];
  const countryOptions = withQsTop200Countries(
    availableRows.slice(0, 14).map((country) => country.country)
  );
  const compareSearching = countrySearch.trim() !== "";
  const isSelectedCountry = (c: string) => selected.some((value) => countriesMatch(value, c));
  const visibleOptions = (() => {
    const labelOf = (c: string) => {
      const k = countryTranslationKey(c);
      return k ? tCountry(k) : c;
    };
    const filtered = countryOptions.filter((c) =>
      countrySearchMatch(countrySearch, [c, labelOf(c), resolveCountryCode(c)])
    );
    const ranked = rankCountryPicks(filtered, {
      isSelected: isSelectedCountry,
      priorityCodes: ["us", "gb", "de", "ca", "kr", "au", "sg", "jp"],
      codeOf: (c) => resolveCountryCode(c),
    });
    return collapsePicks(ranked, 10, showAllCountries || compareSearching, isSelectedCountry);
  })();

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 dark:border-slate-700">
      <div>
        <h3 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-slate-500">
          <Globe2 className="h-3.5 w-3.5" /> {t("title")}
        </h3>
        <p className="mt-1 max-w-2xl text-[11px] text-slate-500">{t("subtitle")}</p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={countrySearch}
          onChange={(e) => setCountrySearch(e.target.value)}
          placeholder={tc("searchCountry")}
          aria-label={tc("searchCountry")}
          className="min-h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:w-56 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
        {visibleOptions.map((country) => {
          const countryKey = countryTranslationKey(country);
          const count = availableRows
            .filter((row) => countriesMatch(row.country, country))
            .reduce((total, row) => total + row.universities, 0);
          const isSelected = isSelectedCountry(country);
          return (
            <button
              key={country}
              type="button"
              onClick={() => toggle(country)}
              aria-pressed={isSelected}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors ${
                isSelected
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50"
              }`}
            >
              <CountryFlag country={country} size="xs" />
              {countryKey ? tCountry(countryKey) : country} <span className="text-[9px] opacity-60">({count})</span>
            </button>
          );
        })}
        {!compareSearching && visibleOptions.length < countryOptions.length && (
          <button
            type="button"
            onClick={() => setShowAllCountries((v) => !v)}
            aria-expanded={showAllCountries}
            className="rounded-full px-2 py-1 text-[11px] font-bold text-indigo-700 hover:underline dark:text-indigo-300"
          >
            {showAllCountries ? tc("showLess") : tc("showMoreCount", { count: countryOptions.length - visibleOptions.length })}
          </button>
        )}
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
        <ScrollRegion label={t("compare")} className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-[10px] uppercase tracking-wide text-slate-400">
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
              {data.countries.map((c) => {
                const countryKey = countryTranslationKey(c.country);
                return (
                  <tr key={c.country} className="border-b border-slate-100">
                    <td className="py-2 pr-3 font-bold text-slate-800">
                      <span className="inline-flex items-center gap-1.5">
                        <CountryFlag country={c.country} size="xs" />
                        {countryKey ? tCountry(countryKey) : c.country}
                      </span>
                    </td>
                      <td className="py-2 pr-3">{c.universities}</td>
                    <td className="py-2 pr-3">
                      {money(c.tuition.avgUsd)} <span className="text-[9px] text-slate-400">({c.tuition.published}/{c.universities})</span>
                    </td>
                    <td className="py-2 pr-3">
                      {money(c.living.avgUsd)} <span className="text-[9px] text-slate-400">({c.living.published}/{c.universities})</span>
                    </td>
                    <td className="py-2 pr-3">
                      {c.minIelts.avg ?? "—"} <span className="text-[9px] text-slate-400">({c.minIelts.published}/{c.universities})</span>
                    </td>
                    <td className="py-2 pr-3">{c.scholarships.count}</td>
                    <td className="py-2 pr-3 font-semibold text-indigo-700">
                      {money(c.scholarships.totalUsd)}
                      {c.scholarships.awardPeriod && (
                        <span className="ml-1 text-[9px] font-normal text-slate-500">
                          / {t(`awardPeriod.${c.scholarships.awardPeriod}`)}
                        </span>
                      )}
                      {c.scholarships.count > 0 && (
                        <span className="ml-1 text-[9px] font-normal text-slate-400">
                          ({t("usableAmounts", { known: c.scholarships.amountsPublished, total: c.scholarships.count })})
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-slate-600">
                      {c.workRights
                        ? t("workRightsAverage", { years: c.workRights.avgYears, count: c.workRights.published })
                        : t("notPublished")}
                    </td>
                  </tr>
                );
              })}
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
        </ScrollRegion>
      )}
      {/* Standing small print: this panel can be wrong — say so where it is read. */}
      <AppNote kind="catalogue" className="mt-2" />
    </div>
  );
}
