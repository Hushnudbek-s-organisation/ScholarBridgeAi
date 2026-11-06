"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Globe2, Loader2, RefreshCw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { countriesMatch, countryTranslationKey, resolveCountryCode, withQsTop200Countries } from "@/lib/countries";
import { collapsePicks, countrySearchMatch, rankCountryPicks } from "@/lib/countryPicker";
import { CountryFlag } from "@/components/CountryFlag";
import { ScrollRegion } from "@/components/ui/hubs";
import { AppNote } from "@/components/AppNote";
import { Button } from "@/components/ui/Button";
import { EvidenceNote } from "@/components/EvidenceNote";
import type { PresentedFact } from "@/lib/factPresentation";

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
  /** §4 computed averages are not an official IELTS/cost requirement. */
  evidence?: { minIeltsAvg?: PresentedFact; tuitionAvgUsd?: PresentedFact; livingAvgUsd?: PresentedFact };
}

/**
 * Student-visa facts for one destination, already collapsed to the visitor's
 * language by the API. `null` fields are genuinely unpublished — the UI says so
 * rather than showing a zero or a guess.
 */
interface CountryFactRow {
  country: string;
  iso2: string;
  proofOfFunds: { usd: number | null; localText: string; period: string; note: string | null };
  partTimeWorkHours: number | null;
  partTimeWorkNote: string | null;
  postStudyWorkMonths: number | null;
  postStudyWorkNote: string | null;
  elevenYearDiploma: "direct" | "foundation" | "varies" | null;
  elevenYearNote: string | null;
  recognitionUrl: string | null;
  embassy: { kind: "embassy" | "consulate" | "honorary-consulate" | null; name: string | null; address: string | null; website: string | null };
  sourceName: string;
  sourceUrl: string;
  lastVerifiedAt: string;
  asOf: string | null;
}

interface CompareData {
  countries: Comparison[];
  facts?: Record<string, CountryFactRow>;
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
  const te = useTranslations("evidence");
  const locale = useLocale();
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
      const params = new URLSearchParams({ locale });
      if (countries.length) params.set("countries", countries.join(","));
      const qs = `?${params.toString()}`;
      const res = await fetch(`/api/countries/compare${qs}`, { cache: "no-store" });
      const b = await res.json();
      if (!res.ok) throw new Error(b?.error ?? `HTTP ${res.status}`);
      setData(b);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [locale]);

  // First load — setState only inside promise callbacks, never synchronously
  // in the effect body.
  useEffect(() => {
    let live = true;
    fetch(`/api/countries/compare?locale=${encodeURIComponent(locale)}`, { cache: "no-store" })
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
  }, [locale]);

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
    <div className="rounded-overlay border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 dark:border-slate-700">
      <div>
        <h3 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-slate-500">
          <Globe2 className="h-3.5 w-3.5" /> {t("title")}
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">{t("subtitle")}</p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={countrySearch}
          onChange={(e) => setCountrySearch(e.target.value)}
          placeholder={tc("searchCountry")}
          aria-label={tc("searchCountry")}
          className="min-h-11 w-full rounded-surface border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:w-56 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
        {visibleOptions.map((country) => {
          const countryKey = countryTranslationKey(country);
          const count = availableRows
            .filter((row) => countriesMatch(row.country, country))
            .reduce((total, row) => total + row.universities, 0);
          const isSelected = isSelectedCountry(country);
          return (
            <Button variant="unstyled"
              key={country}
              type="button"
              onClick={() => toggle(country)}
              aria-pressed={isSelected}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-full sm:min-h-9 border px-2.5 py-1 text-xs font-bold transition-colors ${
                isSelected
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50"
              }`}
            >
              <CountryFlag country={country} size="xs" />
              {countryKey ? tCountry(countryKey) : country} <span className="text-xs opacity-60">({count})</span>
            </Button>
          );
        })}
        {!compareSearching && visibleOptions.length < countryOptions.length && (
          <Button variant="unstyled"
            type="button"
            onClick={() => setShowAllCountries((v) => !v)}
            aria-expanded={showAllCountries}
            className="min-h-11 rounded-full px-2 py-1 text-xs font-bold text-indigo-700 sm:min-h-9 hover:underline dark:text-indigo-300"
          >
            {showAllCountries ? tc("showLess") : tc("showMoreCount", { count: countryOptions.length - visibleOptions.length })}
          </Button>
        )}
        <Button variant="unstyled"
          onClick={() => void load(selected)}
          disabled={loading || selected.length < 1}
          className="ml-auto flex min-h-11 items-center gap-1.5 rounded-control sm:min-h-9 bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {t("compare")}
        </Button>
      </div>
      {error && <p className="mt-3 text-sm font-semibold text-rose-600">{error}</p>}

      {data && (
        <>
          {/* Phones read one destination at a time; the detailed comparison
              table remains available on larger screens. Both use the exact
              same API values and unpublished-data labels. */}
          <div className="mt-4 space-y-3 md:hidden">
            {data.countries.map((c) => {
              const countryKey = countryTranslationKey(c.country);
              return (
                <section key={`mobile-${c.country}`} className="rounded-surface border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-800/40">
                  <h4 className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    <CountryFlag country={c.country} size="sm" />
                    {countryKey ? tCountry(countryKey) : c.country}
                  </h4>
                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-4 text-sm">
                    <div>
                      <dt className="text-xs font-bold text-slate-500">{t("universities")}</dt>
                      <dd className="mt-0.5 font-semibold text-slate-800 dark:text-slate-100">{c.universities}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold text-slate-500">{t("scholarships")}</dt>
                      <dd className="mt-0.5 font-semibold text-slate-800 dark:text-slate-100">{c.scholarships.count}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold text-slate-500">{t("avgTuition")}</dt>
                      <dd className="mt-0.5 font-semibold text-slate-800 dark:text-slate-100">
                        {money(c.tuition.avgUsd)} <span className="text-xs font-normal text-slate-500">({c.tuition.published}/{c.universities})</span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold text-slate-500">{t("avgLiving")}</dt>
                      <dd className="mt-0.5 font-semibold text-slate-800 dark:text-slate-100">
                        {money(c.living.avgUsd)} <span className="text-xs font-normal text-slate-500">({c.living.published}/{c.universities})</span>
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs font-bold text-slate-500">{t("avgIelts")}</dt>
                      <dd className="mt-0.5 font-semibold text-slate-800 dark:text-slate-100">
                        {c.minIelts.avg ?? "—"} <span className="text-xs font-normal text-slate-500">({c.minIelts.published}/{c.universities})</span>
                      </dd>
                      <EvidenceNote fact={c.evidence?.minIeltsAvg} compact />
                      <span className="mt-0.5 block text-[10px] leading-tight text-slate-500">{te("observedAverage")}</span>
                    </div>
                    <div className="col-span-2 border-t border-slate-200 pt-3 dark:border-slate-700">
                      <dt className="text-xs font-bold text-slate-500">{t("potentialFunding")}</dt>
                      <dd className="mt-0.5 font-semibold text-indigo-700 dark:text-indigo-300">
                        {money(c.scholarships.totalUsd)}
                        {c.scholarships.awardPeriod && (
                          <span className="ml-1 text-xs font-normal text-slate-500">
                            / {t(`awardPeriod.${c.scholarships.awardPeriod}`)}
                          </span>
                        )}
                        {c.scholarships.count > 0 && (
                          <span className="ml-1 text-xs font-normal text-slate-500">
                            ({t("usableAmounts", { known: c.scholarships.amountsPublished, total: c.scholarships.count })})
                          </span>
                        )}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs font-bold text-slate-500">{t("workRights")}</dt>
                      <dd className="mt-0.5 leading-relaxed text-slate-700 dark:text-slate-200">
                        {c.workRights
                          ? t("workRightsAverage", { years: c.workRights.avgYears, count: c.workRights.published })
                          : t("notPublished")}
                      </dd>
                    </div>
                  </dl>
                </section>
              );
            })}
            {data.countries.length === 0 && (
              <p className="rounded-surface border border-slate-200 py-6 text-center text-sm text-slate-500 dark:border-slate-700">{t("noResults")}</p>
            )}
          </div>

          <ScrollRegion label={t("compare")} className="mt-4 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700">
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
                    <tr key={c.country} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-2 pr-3 font-bold text-slate-800 dark:text-slate-100">
                        <span className="inline-flex items-center gap-1.5">
                          <CountryFlag country={c.country} size="xs" />
                          {countryKey ? tCountry(countryKey) : c.country}
                        </span>
                      </td>
                      <td className="py-2 pr-3">{c.universities}</td>
                      <td className="py-2 pr-3">
                        {money(c.tuition.avgUsd)} <span className="text-xs text-slate-500">({c.tuition.published}/{c.universities})</span>
                      </td>
                      <td className="py-2 pr-3">
                        {money(c.living.avgUsd)} <span className="text-xs text-slate-500">({c.living.published}/{c.universities})</span>
                      </td>
                      <td className="py-2 pr-3">
                        {c.minIelts.avg ?? "—"} <span className="text-xs text-slate-500">({c.minIelts.published}/{c.universities})</span>
                      </td>
                      <td className="py-2 pr-3">{c.scholarships.count}</td>
                      <td className="py-2 pr-3 font-semibold text-indigo-700 dark:text-indigo-300">
                        {money(c.scholarships.totalUsd)}
                        {c.scholarships.awardPeriod && (
                          <span className="ml-1 text-xs font-normal text-slate-500">
                            / {t(`awardPeriod.${c.scholarships.awardPeriod}`)}
                          </span>
                        )}
                        {c.scholarships.count > 0 && (
                          <span className="ml-1 text-xs font-normal text-slate-500">
                            ({t("usableAmounts", { known: c.scholarships.amountsPublished, total: c.scholarships.count })})
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-slate-600 dark:text-slate-300">
                        {c.workRights
                          ? t("workRightsAverage", { years: c.workRights.avgYears, count: c.workRights.published })
                          : t("notPublished")}
                      </td>
                    </tr>
                  );
                })}
                {data.countries.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-500">{t("noResults")}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </ScrollRegion>
          <p className="mt-2 text-sm text-slate-500">{t("publishedNote")}</p>
        </>
      )}
      {/* Student-visa facts — sourced and dated, never estimated. A country
          without verified facts simply shows "not published" cells. */}
      {data && data.countries.length > 0 && (
        <div className="mt-5">
          <h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">{t("factsTitle")}</h4>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">{t("factsSubtitle")}</p>
          <div className="mt-3 space-y-2">
            {data.countries.map((c) => {
              const facts = data.facts?.[c.country] ?? null;
              const countryKey = countryTranslationKey(c.country);
              return (
                <div key={`facts-${c.country}`} className="rounded-surface border border-slate-200 p-3 dark:border-slate-700">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs font-extrabold text-slate-800 dark:text-slate-100">
                    <CountryFlag country={c.country} size="xs" />
                    {countryKey ? tCountry(countryKey) : c.country}
                  </div>
                  {!facts && <p className="mt-1 text-sm text-slate-500">{t("factsMissing")}</p>}
                  {facts && (
                    <>
                      <dl className="mt-2 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <dt className="font-bold text-slate-500">{t("proofOfFunds")}</dt>
                          <dd className="text-slate-700 dark:text-slate-200">
                            {facts.proofOfFunds.usd != null && (
                              <span className="font-semibold">${facts.proofOfFunds.usd.toLocaleString("en-US")} </span>
                            )}
                            <span className="text-slate-500">{facts.proofOfFunds.localText}</span>
                          </dd>
                        </div>
                        <div>
                          <dt className="font-bold text-slate-500">{t("partTimeWork")}</dt>
                          <dd className="text-slate-700 dark:text-slate-200">
                            {facts.partTimeWorkHours != null
                              ? t("hoursPerWeek", { hours: facts.partTimeWorkHours })
                              : t("notPublishedCountry")}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-bold text-slate-500">{t("postStudyWork")}</dt>
                          <dd className="text-slate-700 dark:text-slate-200">
                            {facts.postStudyWorkMonths != null
                              ? t("months", { months: facts.postStudyWorkMonths })
                              : t("notPublishedCountry")}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-bold text-slate-500">{t("elevenYearLabel")}</dt>
                          <dd className="text-slate-700 dark:text-slate-200">
                            {facts.elevenYearDiploma ? t(`elevenYear.${facts.elevenYearDiploma}`) : t("notPublishedCountry")}
                          </dd>
                        </div>
                      </dl>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span>
                          <span className="font-bold">{t("embassy")}:</span>{" "}
                          {facts.embassy.kind ? t(`embassyKinds.${facts.embassy.kind}`) : t("embassyKinds.none")}
                          {facts.embassy.name ? ` — ${facts.embassy.name}` : ""}
                        </span>
                        <a
                          href={facts.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="font-semibold text-indigo-700 hover:underline dark:text-indigo-300"
                        >
                          {facts.sourceName}
                        </a>
                        <span>{t("verifiedOn", { date: facts.lastVerifiedAt })}</span>
                      </div>
                      {(facts.proofOfFunds.note || facts.partTimeWorkNote || facts.postStudyWorkNote || facts.elevenYearNote) && (
                        <details className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                          <summary className="cursor-pointer font-semibold text-slate-500">{t("factsDetail")}</summary>
                          <ul className="mt-1 space-y-1 pl-4">
                            {facts.proofOfFunds.note && <li className="list-disc">{facts.proofOfFunds.note}</li>}
                            {facts.partTimeWorkNote && <li className="list-disc">{facts.partTimeWorkNote}</li>}
                            {facts.postStudyWorkNote && <li className="list-disc">{facts.postStudyWorkNote}</li>}
                            {facts.elevenYearNote && <li className="list-disc">{facts.elevenYearNote}</li>}
                          </ul>
                          {facts.recognitionUrl && (
                            <a
                              href={facts.recognitionUrl}
                              target="_blank"
                              rel="noopener noreferrer nofollow"
                              className="mt-1 inline-block font-semibold text-indigo-700 hover:underline dark:text-indigo-300"
                            >
                              {t("recognitionDatabase")}
                            </a>
                          )}
                        </details>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-sm text-slate-500">{t("factsNote")}</p>
        </div>
      )}

      {/* Standing small print: this panel can be wrong — say so where it is read. */}
      <AppNote kind="catalogue" className="mt-2" />
    </div>
  );
}
