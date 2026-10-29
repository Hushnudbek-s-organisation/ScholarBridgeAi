import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowRight, Award, CalendarDays, ExternalLink, MapPin } from "lucide-react";
import { Pagination } from "@/components/Pagination";
import { PublicCatalogHeader } from "@/components/PublicCatalogHeader";
import { PublicFeaturePromo } from "@/components/PublicFeaturePromo";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { clientMessagesFor, dictionaries } from "@/i18n/messages.server";
import { defaultLocale, isLocale, LOCALE_COOKIE } from "@/i18n/config";
import { formatMessage } from "@/i18n/formatMessage";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { scholarships as scholarshipsTable } from "@/db/schema";
import { resolvedUsdScholarshipAmount } from "@/lib/usdCosts";
import { getCachedScholarshipsBundle } from "@/lib/catalogCache";
import { localizeCountry, localizeCoverageType, localizeScholarshipProvider, localizeScholarshipTitle } from "@/lib/catalogLocalizer";

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

// Page size: 8 rows × 3 columns on desktop, reflowed for smaller screens.
const ROWS_PER_PAGE = 8;
const COLUMNS_PER_ROW = 3;
const ITEMS_PER_PAGE = ROWS_PER_PAGE * COLUMNS_PER_ROW;

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
}

// Next.js 15+: `searchParams` is async and must be awaited.
interface ScholarshipsPageProps {
  searchParams: Promise<{ page?: string | string[] }>;
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
  const { page: rawPage } = await searchParams;
  const parsed = Number.parseInt(Array.isArray(rawPage) ? rawPage[0] ?? "1" : rawPage ?? "1", 10);
  const requestedPage = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;

  // Use the same active Drizzle/PostgreSQL catalogue as the API. Count and
  // listing share the active predicate, so pagination totals match visible rows.
  let rows: ScholarshipRow[];
  let totalItems: number;
  try {
    const bundle = await getCachedScholarshipsBundle().catch(() => null);
    if (bundle && bundle.entries.length > 0) {
      const sorted = [...bundle.entries].sort((a, b) => a.id - b.id);
      totalItems = sorted.length;
      const totalPagesForQuery = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
      if (requestedPage > totalPagesForQuery) {
        redirect(totalPagesForQuery > 1 ? `/scholarships?page=${totalPagesForQuery}` : "/scholarships");
      }
      const from = (requestedPage - 1) * ITEMS_PER_PAGE;
      rows = sorted.slice(from, from + ITEMS_PER_PAGE).map((scholarship) => ({
        id: scholarship.id,
        title: scholarship.title,
        provider: scholarship.provider,
        country: scholarship.country,
        coverage_type: scholarship.coverageType,
        amount_usd_value: resolvedUsdScholarshipAmount(scholarship),
        award_period: scholarship.awardPeriod,
        deadline: scholarship.deadline,
        website_url: scholarship.websiteUrl,
      }));
    } else {
      const from = (requestedPage - 1) * ITEMS_PER_PAGE;
      // Count and page in ONE round trip: the two statements are independent,
      // so running them in parallel halves the time this fallback path waits
      // for PostgreSQL. The active predicate is identical in both, so the
      // pagination total still matches the visible rows.
      const [countRows, data] = await Promise.all([
        db
          .select({ n: sql<number>`count(*)::int` })
          .from(scholarshipsTable)
          .where(eq(scholarshipsTable.isActive, true)),
        db
          .select({
            id: scholarshipsTable.id,
            title: scholarshipsTable.title,
            provider: scholarshipsTable.provider,
            country: scholarshipsTable.country,
            coverageType: scholarshipsTable.coverageType,
            amountUsdValue: scholarshipsTable.amountUsdValue,
            awardAmount: scholarshipsTable.awardAmount,
            awardCurrency: scholarshipsTable.awardCurrency,
            awardPeriod: scholarshipsTable.awardPeriod,
            deadline: scholarshipsTable.deadline,
            websiteUrl: scholarshipsTable.websiteUrl,
          })
          .from(scholarshipsTable)
          .where(eq(scholarshipsTable.isActive, true))
          .orderBy(asc(scholarshipsTable.id))
          .limit(ITEMS_PER_PAGE)
          .offset(from),
      ]);
      const [countRow] = countRows;
      totalItems = Number(countRow?.n ?? 0);
      const totalPagesForQuery = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
      if (requestedPage > totalPagesForQuery) {
        redirect(totalPagesForQuery > 1 ? `/scholarships?page=${totalPagesForQuery}` : "/scholarships");
      }
      rows = data.map((scholarship) => ({
        id: scholarship.id,
        title: scholarship.title,
        provider: scholarship.provider,
        country: scholarship.country,
        coverage_type: scholarship.coverageType,
        amount_usd_value: resolvedUsdScholarshipAmount(scholarship),
        award_period: scholarship.awardPeriod,
        deadline: scholarship.deadline,
        website_url: scholarship.websiteUrl,
      }));
    }
  } catch (error) {
    // Keep database/provider details out of the public response and logs.
    console.error("Scholarship catalogue query failed", error instanceof Error ? error.name : "unknown error");
    return (
      <LocaleProvider initialLocale={locale} initialMessages={clientMessagesFor(locale)}>
        <PublicCatalogHeader />
        <main className="mx-auto max-w-7xl px-4 py-16 text-slate-900 sm:px-6 lg:px-8">
          <div role="alert" className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <h1 className="text-lg font-bold text-red-900">{copy.scholarshipHeading}</h1>
            <p className="mt-2 text-sm text-red-700">{copy.scholarshipsLoadError}</p>
          </div>
        </main>
      </LocaleProvider>
    );
  }

  const scholarships = rows;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const currentPage = Math.min(requestedPage, totalPages);
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
    <LocaleProvider initialLocale={locale} initialMessages={clientMessagesFor(locale)}>
      <PublicCatalogHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
        <header className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Award className="h-6 w-6 shrink-0 text-amber-500" aria-hidden />
            {copy.scholarshipHeading}
          </h1>
          <p className="mt-1 text-sm text-slate-600">{summary}</p>
        </header>

        {scholarships.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <p className="text-sm font-medium text-slate-600">{copy.noScholarships}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-6">
            {scholarships.map((scholarship) => (
              <article
                key={scholarship.id}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-shadow hover:shadow-md sm:p-5"
              >
                <span className="inline-flex min-h-7 w-fit max-w-full items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200 ring-inset">
                  <span className="break-words">{localizeCoverageType(scholarship.coverage_type, locale) || copy.coverageNotSpecified}</span>
                </span>

                <h2 className="mt-2 break-words text-sm font-bold text-slate-900 sm:text-base">
                  {localizeScholarshipTitle(scholarship.title, locale)}
                </h2>
                <p className="mt-0.5 break-words text-xs text-slate-600 sm:text-sm">
                  {localizeScholarshipProvider(scholarship.provider, locale)}
                </p>

                <div className="mt-3 space-y-1.5 text-xs text-slate-700">
                  <p className="flex items-start gap-1.5">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
                    <span className="break-words">{localizeCountry(scholarship.country, locale)}</span>
                  </p>
                  {scholarship.deadline && (
                    <p className="flex items-start gap-1.5">
                      <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
                      <span className="break-words">
                        {formatMessage(copy.deadline, { date: formatDate(scholarship.deadline, locale) })}
                      </span>
                    </p>
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
                    className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-blue-700 px-3 text-xs font-semibold text-white hover:bg-blue-800 sm:text-sm"
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
                </div>
              </article>
            ))}
          </div>
        )}

        <Pagination currentPage={currentPage} totalPages={totalPages} />

        <PublicFeaturePromo className="mt-6" />

        <p className="mt-6 border-t border-slate-200 pt-4 text-[11px] leading-relaxed text-slate-600">
          {copy.independentGuide}
        </p>
      </main>
    </LocaleProvider>
  );
}
