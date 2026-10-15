import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ExternalLink, GraduationCap, MapPin, Trophy } from "lucide-react";
import { Pagination } from "@/components/Pagination";
import { PublicCatalogFooter, PublicCatalogHeader } from "@/components/PublicCatalogHeader";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { dictionaries } from "@/i18n/messages";
import { defaultLocale, isLocale, LOCALE_COOKIE } from "@/i18n/config";
import { formatMessage } from "@/i18n/formatMessage";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { universities as universitiesTable } from "@/db/schema";
import { ITEMS_PER_PAGE, getRange, parsePage } from "@/lib/pagination";

async function getPageLocale() {
  const stored = (await cookies()).get(LOCALE_COOKIE)?.value;
  return stored && isLocale(stored) ? stored : defaultLocale;
}

export async function generateMetadata(): Promise<Metadata> {
  const copy = dictionaries[await getPageLocale()].publicCatalog;
  return {
    title: copy.universitiesMetaTitle,
    description: copy.universitiesMetaDescription,
  };
}

interface UniversityRow {
  id: number;
  name: string;
  country: string;
  city: string | null;
  flag_emoji: string | null;
  world_ranking: number | null;
  program_major: string | null;
  official_website_url: string | null;
}

// Next.js 15+: searchParams is a Promise.
interface UniversitiesPageProps {
  searchParams: Promise<{ page?: string | string[] }>;
}

export default async function UniversitiesPage({
  searchParams,
}: UniversitiesPageProps) {
  const locale = await getPageLocale();
  const copy = dictionaries[locale].publicCatalog;

  // Page from URL: /universities?page=2.
  const requestedPage = parsePage((await searchParams).page);
  const { from } = getRange(requestedPage);

  // Read from the same PostgreSQL/Drizzle catalogue used by the API. Count
  // only active rows, matching the page query, so pagination cannot point to
  // pages containing only inactive universities.
  let rows: UniversityRow[];
  let totalItems: number;
  try {
    const [countRow] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(universitiesTable)
      .where(eq(universitiesTable.isActive, true));
    totalItems = Number(countRow?.n ?? 0);
    const lastPage = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
    if (requestedPage > lastPage) {
      redirect(lastPage > 1 ? `/universities?page=${lastPage}` : "/universities");
    }
    const data = await db
      .select({
        id: universitiesTable.id,
        name: universitiesTable.name,
        country: universitiesTable.country,
        city: universitiesTable.city,
        flagEmoji: universitiesTable.flagEmoji,
        worldRanking: universitiesTable.worldRanking,
        programMajor: universitiesTable.programMajor,
        officialWebsiteUrl: universitiesTable.officialWebsiteUrl,
        websiteUrl: universitiesTable.websiteUrl,
      })
      .from(universitiesTable)
      .where(eq(universitiesTable.isActive, true))
      .orderBy(asc(universitiesTable.worldRanking), asc(universitiesTable.id))
      .limit(ITEMS_PER_PAGE)
      .offset(from);
    // Nullable columns stay null (never "" or 0) — the card renders nothing
    // rather than pretending a ranking/focus exists.
    rows = data.map((university) => ({
      id: university.id,
      name: university.name,
      country: university.country,
      city: university.city,
      flag_emoji: university.flagEmoji,
      world_ranking: university.worldRanking,
      program_major: university.programMajor,
      official_website_url: university.officialWebsiteUrl || university.websiteUrl,
    }));
  } catch (error) {
    // Keep database/provider details out of the public response and logs.
    console.error("University catalogue query failed", error instanceof Error ? error.name : "unknown error");
    return (
      <LocaleProvider initialLocale={locale}>
        <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-700">
            {copy.universitiesLoadError}
          </p>
        </main>
      </LocaleProvider>
    );
  }

  const universities = rows;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const currentPage = Math.min(requestedPage, totalPages);
  const number = new Intl.NumberFormat(locale);
  const summary = formatMessage(copy.universitiesSummary, {
    from: number.format(totalItems === 0 ? 0 : from + 1),
    to: number.format(from + universities.length),
    total: number.format(totalItems),
    page: number.format(currentPage),
    pages: number.format(totalPages),
  });

  return (
    <LocaleProvider initialLocale={locale}>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Shared public header: logo + back-to-app link, language and theme
            switchers, breadcrumb — identical on /scholarships. */}
        <PublicCatalogHeader locale={locale} heading={copy.universityHeading} intro={summary} Icon={GraduationCap} />

        {universities.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-600">
            {copy.noUniversities}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-6">
            {universities.map((university) => (
              <article
                key={university.id}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-shadow hover:shadow-md sm:p-5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-2xl" aria-hidden>{university.flag_emoji}</span>
                  {university.world_ranking != null && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-200 ring-inset">
                      <Trophy className="h-3 w-3" aria-hidden />#{university.world_ranking}
                    </span>
                  )}
                </div>
                <h2 className="mt-2 break-words text-sm font-bold text-slate-900 sm:text-base">
                  {university.name}
                </h2>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                  <span className="break-words">{[university.city, university.country].filter(Boolean).join(", ")}</span>
                </p>
                {university.program_major && (
                  <p className="mt-1 break-words text-xs text-slate-500">{university.program_major}</p>
                )}
                {university.official_website_url && (
                  <Link
                    href={university.official_website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-auto inline-flex min-h-11 items-center gap-1 pt-4 text-xs font-semibold text-blue-700 hover:text-blue-900 sm:text-sm"
                  >
                    {copy.website} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                )}
              </article>
            ))}
          </div>
        )}

        <Pagination currentPage={currentPage} totalPages={totalPages} />

        <PublicCatalogFooter locale={locale} />
      </main>
    </LocaleProvider>
  );
}
