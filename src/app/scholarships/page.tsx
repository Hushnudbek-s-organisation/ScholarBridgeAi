import { PublicCatalogCompare, PublicCompareButton } from "@/components/PublicCatalogCompare";
import { catalogueParam, PublicCatalogFilters, type CatalogueQuery } from "@/components/PublicCatalogFilters";
import { findCatalogueMatches } from "@/lib/catalogueSearch";
import { countriesMatch } from "@/lib/countries";
import { supportsDegreeLevel } from "@/lib/degreeLevels";
import { parseScholarshipDegreeLevels } from "@/lib/scholarshipFilters";
import { ITEMS_PER_PAGE, paginateArray, parsePage } from "@/lib/pagination";
import { safeAcademicLink } from "@/lib/universityCardSummary";
import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowRight, Award, CalendarDays, ExternalLink, MapPin } from "lucide-react";
import { Pagination } from "@/components/Pagination";
import { PublicCatalogHeader } from "@/components/PublicCatalogHeader";
import { PublicFeaturePromo } from "@/components/PublicFeaturePromo";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { publicMessagesFor, dictionaries } from "@/i18n/messages.server";
import { defaultLocale, isLocale, LOCALE_COOKIE } from "@/i18n/config";
import { formatMessage } from "@/i18n/formatMessage";
import { resolvedUsdScholarshipAmount } from "@/lib/usdCosts";
import { getCachedScholarshipsBundle } from "@/lib/catalogCache";
import { deadlineStateOf, orderForBrowsing, todayYmd, type DeadlineState } from "@/lib/catalogueOrder";
import { expandMultilingualSearchTerms, localizeCountry, localizeCoverageType, localizeScholarshipProvider, localizeScholarshipTitle } from "@/lib/catalogLocalizer";

async function getPageLocale() {
  const stored = (await cookies()).get(LOCALE_COOKIE)?.value;
  return stored && isLocale(stored) ? stored : defaultLocale;
}

export async function generateMetadata(): Promise<Metadata> {
  const copy = dictionaries[await getPageLocale()].publicCatalog;
  return {
    title: copy.scholarshipsMetaTitle,
    description: copy.scholarshipsMetaDescription,
  };
}

/** Display projection used by the existing scholarship card view. */
interface ScholarshipRow {
  id: number;
  title: string;
  provider: string;
  country: string;
  coverage_type: string;
  amount_usd_value: number | null;
  award_period: string | null;
  deadline: string | null;
  website_url: string | null;
  /** The date the award closes, when the catalogue knows one. */
  deadline_date?: string | null;
  /** Verdict for today — a passed date is never shown as "open". */
  state: DeadlineState;
}

// Next.js 15+: `searchParams` is async and must be awaited.
interface ScholarshipsPageProps {
  searchParams: Promise<CatalogueQuery>;
}

function formatDate(value: string, locale: string): string {
  const parsed = new Date(`${value}T12:00:00Z`);
  if (!Number.isFinite(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(parsed);
}

function awardPeriodLabel(period: string | null, copy: typeof dictionaries.en.publicCatalog): string | null {
  switch (period) {
    case "year": return copy.scholarshipPeriodYear;
    case "month": return copy.scholarshipPeriodMonth;
    case "one_time": return copy.scholarshipPeriodOneTime;
    case "total": return copy.scholarshipPeriodTotal;
    case "variable": return copy.scholarshipPeriodVariable;
    default: return null;
  }
}

export default async function ScholarshipsPage({
  searchParams,
}: ScholarshipsPageProps) {
  const locale = await getPageLocale();
  const copy = dictionaries[locale].publicCatalog;
  const params = await searchParams;
  const requestedPage = parsePage(params.page);
  const today = todayYmd();
  let rows: ScholarshipRow[];
  let currentPage: number;
  let totalPages: number;
  let totalItems: number;
  let countries: string[];
  try {
    const bundle = await getCachedScholarshipsBundle();
    const search = catalogueParam(params, "search");
    const degree = catalogueParam(params, "degree", 30);
    const country = catalogueParam(params, "country");
    const coverage = catalogueParam(params, "coverage", 20);
    const status = catalogueParam(params, "status", 20);
    countries = [...new Set(bundle.entries.map((scholarship) => scholarship.country))].sort();
    const candidates = bundle.entries.filter((row) => {
      const state = deadlineStateOf(row, today);
      const matchesStatus = !status || (status === "closed" ? state === "passed" : state === status);
      const category = row.coverageType.trim().toLowerCase();
      const matchesCoverage = !coverage || (
        coverage === "full" ? category === "full funding"
          : coverage === "tuition" ? category.startsWith("full tuition") || category === "full funding"
          : coverage === "partial" ? category.startsWith("partial")
          : false
      );
      return matchesStatus && matchesCoverage &&
        (!country || countriesMatch(row.country, country)) &&
        (!degree || parseScholarshipDegreeLevels(row.degreeLevels).some((level) => supportsDegreeLevel(level, degree)));
    });
    const terms = search ? expandMultilingualSearchTerms(search) : [];
    const found = search ? findCatalogueMatches(candidates, search, (row) => terms.some((term) =>
      [row.title, row.provider, row.country, row.eligibleMajors].some((field) => field?.toLowerCase().includes(term)),
    ), (row) => [row.title, row.provider, row.country, row.eligibleMajors]) : candidates;
    const page = paginateArray(orderForBrowsing(found, today), requestedPage, ITEMS_PER_PAGE);
    ({ page: currentPage, totalPages, total: totalItems } = page);
    rows = page.items.map((scholarship) => ({
      id: scholarship.id,
      title: scholarship.title,
      provider: scholarship.provider,
      country: scholarship.country,
      coverage_type: scholarship.coverageType,
      amount_usd_value: resolvedUsdScholarshipAmount(scholarship),
      award_period: scholarship.awardPeriod,
      deadline: scholarship.deadline,
      website_url: safeAcademicLink(scholarship.sourceUrl ?? scholarship.websiteUrl),
      deadline_date: scholarship.deadlineDate ? String(scholarship.deadlineDate).slice(0, 10) : null,
      state: deadlineStateOf(scholarship, today),
    }));
  } catch (error) {
    // Keep database/provider details out of the public response and logs.
    console.error("Scholarship catalogue query failed", error instanceof Error ? error.name : "unknown error");
    return (
      <LocaleProvider initialLocale={locale} initialMessages={publicMessagesFor(locale)}>
        <PublicCatalogHeader />
        <main className="mx-auto max-w-7xl px-4 py-16 text-slate-900 dark:text-slate-100 sm:px-6 lg:px-8">
          <div role="alert" className="mx-auto max-w-xl rounded-overlay border border-rose-200 bg-rose-50 p-8 text-center">
            <h1 className="text-lg font-bold text-rose-900">{copy.scholarshipHeading}</h1>
            <p className="mt-2 text-sm text-rose-700">{copy.scholarshipsLoadError}</p>
          </div>
        </main>
      </LocaleProvider>
    );
  }

  const scholarships = rows;
  const from = (currentPage - 1) * ITEMS_PER_PAGE;
  const showingFrom = totalItems === 0 ? 0 : from + 1;
  const showingTo = from + scholarships.length;
  const number = new Intl.NumberFormat(locale);
  const summary = formatMessage(copy.scholarshipsSummary, {
    from: number.format(showingFrom),
    to: number.format(showingTo),
    total: number.format(totalItems),
    page: number.format(currentPage),
    pages: number.format(totalPages),
  });
  const amount = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

  return (
    <LocaleProvider initialLocale={locale} initialMessages={publicMessagesFor(locale)}>
      <PublicCatalogHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 text-slate-900 dark:text-slate-100 sm:px-6 lg:px-8">
        <header className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            <Award className="h-6 w-6 shrink-0 text-amber-500" aria-hidden />
            {copy.scholarshipHeading}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{summary}</p>
        </header>

        <PublicCatalogFilters kind="scholarships" locale={locale} countries={countries} params={params} />
        <PublicCatalogCompare locale={locale} fields={[locale === "ru" ? "Покрытие" : locale === "uz" ? "Qamrov" : "Coverage", locale === "ru" ? "Срок подачи" : locale === "uz" ? "Ariza muddati" : "Application deadline"]}>
        {scholarships.length === 0 ? (
          <div className="rounded-overlay border border-slate-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm font-medium text-slate-600">{copy.noScholarships}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-6">
            {scholarships.map((scholarship) => (
              <article
                key={scholarship.id}
                className="flex flex-col rounded-overlay border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-700 dark:bg-slate-900 transition-shadow hover:shadow-md sm:p-5"
              >
                <span className="inline-flex min-h-7 w-fit max-w-full items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200 ring-inset">
                  <span className="break-words">{localizeCoverageType(scholarship.coverage_type, locale) || copy.coverageNotSpecified}</span>
                </span>
                {/* A passed date is stated, not hidden: the award stays in the
                    catalogue (its next round is usually the same page) but the
                    card must not look like something to apply to today. */}
                {scholarship.state === "passed" && (
                  <span className="mt-2 inline-flex w-fit items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 ring-inset">
                    {copy.deadlinePassed}
                  </span>
                )}

                <h2 className="mt-2 break-words text-sm font-bold text-slate-900 dark:text-slate-100 sm:text-base">
                  <Link href={`/scholarships/${scholarship.id}`} className="inline-flex min-h-11 items-center hover:text-blue-800">{localizeScholarshipTitle(scholarship.title, locale)}</Link>
                </h2>
                <p className="mt-0.5 break-words text-sm text-slate-600 dark:text-slate-300 sm:text-sm">
                  {localizeScholarshipProvider(scholarship.provider, locale)}
                </p>

                <div className="mt-3 space-y-1.5 text-xs text-slate-700">
                  <p className="flex items-start gap-1.5">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
                    <span className="break-words">{localizeCountry(scholarship.country, locale)}</span>
                  </p>
                  {(scholarship.deadline_date || scholarship.deadline) && (
                    <p className="flex items-start gap-1.5">
                      <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
                      <span className="break-words">
                        {formatMessage(copy.deadline, { date: formatDate((scholarship.deadline_date ?? scholarship.deadline) as string, locale) })}
                      </span>
                    </p>
                  )}
                  {scholarship.state === "passed" && (
                    <p className="text-sm leading-relaxed text-slate-500">{copy.deadlinePassedHint}</p>
                  )}
                  {/* A stored 0 means "the provider publishes no cash value" —
                      rendering "$0" would read as a real, zero-dollar award. */}
                  {typeof scholarship.amount_usd_value === "number" && scholarship.amount_usd_value > 0 && (
                    <p className="break-words font-semibold text-emerald-800">
                      {amount.format(scholarship.amount_usd_value)}
                      {awardPeriodLabel(scholarship.award_period, copy) && (
                        <span className="font-normal text-emerald-700">
                          {" · "}{awardPeriodLabel(scholarship.award_period, copy)}
                        </span>
                      )}
                    </p>
                  )}
                </div>

                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
                  <Link
                    href={`/scholarships/${scholarship.id}`}
                    className="inline-flex min-h-11 items-center gap-1 rounded-surface bg-blue-700 px-3 text-xs font-semibold text-white hover:bg-blue-800 sm:text-sm"
                  >
                    {copy.viewDetails}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                  {scholarship.website_url && (
                    <Link
                      href={scholarship.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 sm:text-sm"
                    >
                      {copy.website}
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  )}
                  <PublicCompareButton item={{
                    id: scholarship.id, title: scholarship.title, href: scholarship.website_url,
                    values: [localizeCoverageType(scholarship.coverage_type, locale) || "", scholarship.deadline_date ?? ""],
                  }} />
                </div>
              </article>
            ))}
          </div>
        )}

        <Pagination currentPage={currentPage} totalPages={totalPages} />
        </PublicCatalogCompare>

        <PublicFeaturePromo className="mt-6" />

        <p className="mt-6 border-t border-slate-200 pt-4 text-sm leading-relaxed text-slate-600">
          {copy.independentGuide}
        </p>
      </main>
    </LocaleProvider>
  );
}
