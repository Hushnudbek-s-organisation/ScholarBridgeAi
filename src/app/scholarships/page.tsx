import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Award, CalendarDays, ExternalLink, MapPin } from "lucide-react";
import { Pagination } from "@/components/Pagination";
import { PublicCatalogFooter, PublicCatalogHeader } from "@/components/PublicCatalogHeader";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { dictionaries } from "@/i18n/messages";
import { defaultLocale, isLocale, LOCALE_COOKIE } from "@/i18n/config";
import { formatMessage } from "@/i18n/formatMessage";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { scholarships as scholarshipsTable } from "@/db/schema";

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
  deadline: string | null;
  website_url: string | null;
  /** Canonical award columns — shown when the legacy USD mirror is empty. */
  award_amount: number | null;
  award_currency: string | null;
  award_period: string | null;
  award_basis: string | null;
  deadline_date: string | null;
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

/**
 * An award in its PUBLISHED currency. No conversion ever happens here: a
 * €10,000 award is displayed as €10,000, because inventing an exchange rate
 * would state a number the provider never published.
 */
function formatAward(value: unknown, currency: string | null, locale: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  const code = (currency ?? "").trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(code)) {
    try {
      return new Intl.NumberFormat(locale, { style: "currency", currency: code, maximumFractionDigits: 0 }).format(n);
    } catch {
      return `${n.toLocaleString(locale)} ${code}`;
    }
  }
  return n.toLocaleString(locale);
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
    const [countRow] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(scholarshipsTable)
      .where(eq(scholarshipsTable.isActive, true));
    totalItems = Number(countRow?.n ?? 0);
    const totalPagesForQuery = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
    if (requestedPage > totalPagesForQuery) {
      redirect(totalPagesForQuery > 1 ? `/scholarships?page=${totalPagesForQuery}` : "/scholarships");
    }
    const from = (requestedPage - 1) * ITEMS_PER_PAGE;
    const data = await db
      .select({
        id: scholarshipsTable.id,
        title: scholarshipsTable.title,
        provider: scholarshipsTable.provider,
        country: scholarshipsTable.country,
        coverageType: scholarshipsTable.coverageType,
        amountUsdValue: scholarshipsTable.amountUsdValue,
        deadline: scholarshipsTable.deadline,
        websiteUrl: scholarshipsTable.websiteUrl,
        // Canonical award fields. The legacy USD mirror is empty for a large
        // part of the catalogue, and the public page only ever read it — so
        // awards whose amount IS published showed no figure at all.
        awardAmount: scholarshipsTable.awardAmount,
        awardCurrency: scholarshipsTable.awardCurrency,
        awardPeriod: scholarshipsTable.awardPeriod,
        awardBasis: scholarshipsTable.awardBasis,
        deadlineDate: scholarshipsTable.deadlineDate,
      })
      .from(scholarshipsTable)
      .where(eq(scholarshipsTable.isActive, true))
      .orderBy(asc(scholarshipsTable.id))
      .limit(ITEMS_PER_PAGE)
      .offset(from);
    rows = data.map((scholarship) => ({
      id: scholarship.id,
      title: scholarship.title,
      provider: scholarship.provider,
      country: scholarship.country,
      coverage_type: scholarship.coverageType,
      amount_usd_value: scholarship.amountUsdValue,
      deadline: scholarship.deadline,
      website_url: scholarship.websiteUrl,
      award_amount: scholarship.awardAmount,
      award_currency: scholarship.awardCurrency,
      award_period: scholarship.awardPeriod,
      award_basis: scholarship.awardBasis,
      deadline_date: scholarship.deadlineDate ? String(scholarship.deadlineDate).slice(0, 10) : null,
    }));
  } catch (error) {
    // Keep database/provider details out of the public response and logs.
    console.error("Scholarship catalogue query failed", error instanceof Error ? error.name : "unknown error");
    return (
      <LocaleProvider initialLocale={locale}>
        <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
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
  /** "per year" / "one-off" / "total" — localised, never guessed from context. */
  const awardPeriodLabel = (period: string): string => {
    const key = period.trim().toLowerCase();
    if (key === "year" || key === "annual" || key === "yearly" || key === "per year") return `· ${copy.awardPeriodYear}`;
    if (key === "month" || key === "monthly" || key === "per month") return `· ${copy.awardPeriodMonthly}`;
    if (key === "one-off" || key === "one_off" || key === "oneoff" || key === "once") return `· ${copy.awardPeriodOneOff}`;
    if (key === "total") return `· ${copy.awardPeriodTotal}`;
    return `· ${period}`;
  };

  return (
    <LocaleProvider initialLocale={locale}>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <PublicCatalogHeader locale={locale} heading={copy.scholarshipHeading} intro={summary} Icon={Award} />

        {scholarships.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <p className="text-sm font-medium text-slate-600">{copy.noScholarships}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-6">
            {scholarships.map((scholarship) => {
              const publishedDeadline = scholarship.deadline_date ?? scholarship.deadline;
              return (
              <article
                key={scholarship.id}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-shadow hover:shadow-md sm:p-5"
              >
                <span className="inline-flex min-h-7 w-fit max-w-full items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200 ring-inset">
                  <span className="break-words">{scholarship.coverage_type || copy.coverageNotSpecified}</span>
                </span>

                <h2 className="mt-2 break-words text-sm font-bold text-slate-900 sm:text-base">
                  {scholarship.title}
                </h2>
                <p className="mt-0.5 break-words text-xs text-slate-600 sm:text-sm">
                  {scholarship.provider}
                </p>

                <div className="mt-3 space-y-1.5 text-xs text-slate-700">
                  <p className="flex items-start gap-1.5">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
                    <span className="break-words">{scholarship.country}</span>
                  </p>
                  {/* Deadline: the canonical date column wins, the legacy
                      `deadline` text is the fallback. An unpublished deadline
                      says so instead of silently disappearing. */}
                  {publishedDeadline ? (
                    <p className="flex items-start gap-1.5">
                      <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
                      <span className="break-words">
                        {formatMessage(copy.deadline, { date: formatDate(publishedDeadline, locale) })}
                      </span>
                    </p>
                  ) : (
                    <p className="flex items-start gap-1.5 text-slate-500">
                      <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span className="break-words">{copy.deadlineNotPublished}</span>
                    </p>
                  )}

                  {/* Award: a verified USD figure when there is one, otherwise
                      the canonical amount WITH its published currency and
                      period — never silently converted, never dropped. */}
                  {typeof scholarship.amount_usd_value === "number" ? (
                    <p className="break-words font-semibold text-emerald-800">
                      {amount.format(scholarship.amount_usd_value)}
                      {scholarship.award_period && (
                        <span className="ml-1 font-normal text-emerald-700">
                          {awardPeriodLabel(scholarship.award_period)}
                        </span>
                      )}
                    </p>
                  ) : scholarship.award_amount != null && Number.isFinite(Number(scholarship.award_amount)) ? (
                    <p className="break-words font-semibold text-emerald-800">
                      {formatAward(scholarship.award_amount, scholarship.award_currency, locale)}
                      {scholarship.award_period && (
                        <span className="ml-1 font-normal text-emerald-700">
                          {awardPeriodLabel(scholarship.award_period)}
                        </span>
                      )}
                    </p>
                  ) : (
                    <p className="break-words text-slate-500">{copy.amountNotPublished}</p>
                  )}

                  {scholarship.award_basis && (
                    <p className="break-words text-slate-500">
                      {copy.awardBasisLabel}: {scholarship.award_basis}
                    </p>
                  )}
                </div>

                {scholarship.website_url && (
                  <Link
                    href={scholarship.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-auto inline-flex min-h-11 items-center gap-1 pt-4 text-xs font-semibold text-blue-700 hover:text-blue-900 sm:text-sm"
                  >
                    {copy.viewDetails}
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                )}
              </article>
              );
            })}
          </div>
        )}

        <Pagination currentPage={currentPage} totalPages={totalPages} />

        <PublicCatalogFooter locale={locale} />
      </main>
    </LocaleProvider>
  );
}
