import { PublicCatalogCompare, PublicCompareButton } from "@/components/PublicCatalogCompare";
import { catalogueParam, PublicCatalogFilters, type CatalogueQuery } from "@/components/PublicCatalogFilters";
import { findCatalogueMatches } from "@/lib/catalogueSearch";
import { countriesMatch } from "@/lib/countries";
import { supportsDegreeLevel } from "@/lib/degreeLevels";
import { subjectAffinity } from "@/lib/subjectAffinity";
import { catalogueTuition } from "@/lib/catalogueTuition";
import { safeAcademicLink, selectUniversityCardSummary } from "@/lib/universityCardSummary";
import {resolveAcademicRequirements} from "@/lib/universityDetailRequirements";
import {EvidenceNote} from "@/components/EvidenceNote";
import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import type { ReactElement } from "react";
import { Building2, ExternalLink, GraduationCap, MapPin, Trophy } from "lucide-react";
import { Pagination } from "@/components/Pagination";
import { PublicCatalogHeader } from "@/components/PublicCatalogHeader";
import { PublicFeaturePromo } from "@/components/PublicFeaturePromo";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { publicMessagesFor, dictionaries } from "@/i18n/messages.server";
import { defaultLocale, isLocale, LOCALE_COOKIE } from "@/i18n/config";
import { formatMessage } from "@/i18n/formatMessage";
import { ITEMS_PER_PAGE, paginateArray, parsePage } from "@/lib/pagination";
import { resolvedUsdUniversityCosts } from "@/lib/usdCosts";
import type { SourcedQsRanking } from "@/lib/universityRank";
import { getCachedUniversitiesBundleForAssessment } from "@/lib/catalogCache";
import { expandMultilingualSearchTerms, localizeCity, localizeCountry, localizeMajorOrField, localizeUniversityType } from "@/lib/catalogLocalizer";

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
  verification_status: string;
  country: string;
  city: string | null;
  flag_emoji: string | null;
  qs_ranking: SourcedQsRanking | null;
  program_major: string | null;
  university_type: string | null;
  annual_tuition_usd: number | null;
  annual_living_est_usd: number | null;
  min_ielts: number | null;
  post_study_work_visa_years: number | null;
  official_website_url: string | null;
  tuition_source_url: string | null;
  tuition_estimated: boolean;
  deadline: string | null;
  ieltsEvidence: ReturnType<typeof resolveAcademicRequirements>["evidence"]["ielts"];
  recorded_min_ielts: number | null;
}

// Next.js 15+: searchParams is a Promise.
interface UniversitiesPageProps {
  searchParams: Promise<CatalogueQuery>;
}

export default async function UniversitiesPage({
  searchParams,
}: UniversitiesPageProps) {
  const locale = await getPageLocale();
  const copy = dictionaries[locale].publicCatalog;

  const params = await searchParams;
  const requestedPage = parsePage(params.page);
  let rows: UniversityRow[];
  let currentPage: number;
  let totalPages: number;
  let totalItems: number;
  let countries: string[];
  let years: number[];
  try {
    const bundle = await getCachedUniversitiesBundleForAssessment();
    const active = bundle.unis.filter((university) => university.isActive !== false);
    countries = [...new Set(active.map((university) => university.country))].sort();
    years = [...new Set([...bundle.qsRankings.values()].map((ranking) => ranking.year))].sort((a, b) => b - a);
    const country = catalogueParam(params, "country");
    const degree = catalogueParam(params, "degree", 30);
    const major = catalogueParam(params, "major");
    const search = catalogueParam(params, "search");
    const qsYear = Number(catalogueParam(params, "qsYear", 4)) || null;
    const maxTuitionValue = catalogueParam(params, "maxTuition", 12);
    const ieltsValue = catalogueParam(params, "ielts", 12);
    const maxTuition = maxTuitionValue === "" ? null : Number(maxTuitionValue);
    const maxIelts = ieltsValue === "" ? null : Number(ieltsValue);
    const fields = (id: number) => bundle.programFieldsByUni.get(id) ?? [];
    const candidates = active.filter((row) => (
      (!country || countriesMatch(row.country, country)) &&
      (!degree || supportsDegreeLevel(row.degreeLevel, degree)) &&
      (!major || [row.programMajor, ...fields(row.id)].some((field) => field && subjectAffinity([major], field).score > 0)) &&
      (!qsYear || bundle.qsRankings.get(row.id)?.year === qsYear)
    ));
    const terms = search ? expandMultilingualSearchTerms(search) : [];
    const found = search ? findCatalogueMatches(candidates, search, (row) => terms.some((term) =>
      [row.name, row.country, row.city, row.programMajor, ...fields(row.id)].some((field) => field?.toLowerCase().includes(term)),
    ), (row) => [row.name, row.country, row.city, row.programMajor, ...fields(row.id)]) : candidates;
    const projected = found.map((university) => {
      const rank = bundle.qsRankings.get(university.id) ?? null;
      const card = selectUniversityCardSummary(
        university, bundle.cardEvidence.programmes.get(university.id) ?? [],
        bundle.cardEvidence.deadlines.get(university.id) ?? [],
        { degreeLevel: degree, targetMajor: major },
      );
      const verified = university.verificationStatus === "verified";
      const costs = resolvedUsdUniversityCosts(university);
      const tuition = catalogueTuition(university, bundle.cardEvidence.programmes.get(university.id) ?? [], degree, major);
      const academic = resolveAcademicRequirements(bundle.facts.get(university.id) ?? [], { degreeLevel: degree || null });
      return {
        id: university.id,
        name: university.name,
        country: university.country,
        verification_status: university.verificationStatus,
        city: university.city,
        flag_emoji: university.flagEmoji,
        qs_ranking: rank,
        program_major: university.programMajor,
        university_type: university.universityType,
        annual_tuition_usd: tuition?.amount ?? null,
        tuition_estimated: tuition?.estimated ?? false,
        annual_living_est_usd: verified ? costs.annualLivingEstUsd : null,
        min_ielts: academic.summary.ielts?.single ?? null,
        post_study_work_visa_years: verified ? university.postStudyWorkVisaYears : null,
        official_website_url: card.admissionsUrl,
        tuition_source_url: tuition?.source ?? safeAcademicLink(university.sourceUrl),
        deadline: card.deadline && (!degree || supportsDegreeLevel(card.deadline.degreeLevel, degree)) ? card.deadline.date : null,
        ieltsEvidence: academic.evidence.ielts,
        recorded_min_ielts: verified ? university.minIelts : null,
      };
    }).filter((row) => (
      (maxTuition == null || (row.annual_tuition_usd != null && row.annual_tuition_usd <= maxTuition)) &&
      (maxIelts == null || (row.min_ielts != null && row.min_ielts <= maxIelts))
    )).sort((a, b) =>
      (b.qs_ranking?.year ?? 0) - (a.qs_ranking?.year ?? 0) ||
      (a.qs_ranking?.rank ?? Infinity) - (b.qs_ranking?.rank ?? Infinity) || a.id - b.id,
    );
    const page = paginateArray(projected, requestedPage, ITEMS_PER_PAGE);
    ({ items: rows, page: currentPage, totalPages, total: totalItems } = page);
  } catch (error) {
    // Keep database/provider details out of the public response and logs.
    console.error("University catalogue query failed", error instanceof Error ? error.name : "unknown error");
    return (
      <LocaleProvider initialLocale={locale} initialMessages={publicMessagesFor(locale)}>
        <PublicCatalogHeader />
        <main className="mx-auto max-w-7xl px-4 py-16 text-slate-900 dark:text-slate-100 sm:px-6 lg:px-8">
          <p role="alert" className="rounded-overlay border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-700">
            {copy.universitiesLoadError}
          </p>
        </main>
      </LocaleProvider>
    );
  }

  const universities = rows;
  const from = (currentPage - 1) * ITEMS_PER_PAGE;
  const number = new Intl.NumberFormat(locale);
  const usd = new Intl.NumberFormat(locale, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const summary = formatMessage(copy.universitiesSummary, {
    from: number.format(totalItems === 0 ? 0 : from + 1),
    to: number.format(from + universities.length),
    total: number.format(totalItems),
    page: number.format(currentPage),
    pages: number.format(totalPages),
  });

  return (
    <LocaleProvider initialLocale={locale} initialMessages={publicMessagesFor(locale)}>
      <PublicCatalogHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 text-slate-900 dark:text-slate-100 sm:px-6 lg:px-8">
        <header className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            <GraduationCap className="h-6 w-6 shrink-0 text-blue-600" aria-hidden />
            {copy.universityHeading}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{summary}</p>
        </header>

        <PublicCatalogFilters kind="universities" locale={locale} countries={countries} params={params} years={years} />
        <PublicCatalogCompare locale={locale} fields={[copy.annualTuition, "IELTS", "QS", dictionaries[locale].universityDetail.postStudyLabel, (locale === "ru" ? "Срок подачи" : locale === "uz" ? "Ariza muddati" : "Application deadline")]}>
        {universities.length === 0 ? (
          <p className="rounded-overlay border border-slate-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900 text-sm text-slate-600 dark:text-slate-300">
            {copy.noUniversities}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-6">
            {universities.map((university) => {
              const majors = (university.program_major ?? "")
                .split(",")
                .map((field) => field.trim())
                .filter(Boolean)
                .map((field) => localizeMajorOrField(field, locale));
              // Card discipline: at most three badges, then "+N". A card that
              // tries to say everything says nothing — the profile page is one
              // click away and holds the rest.
              const badges: CatalogBadge[] = ([
                university.qs_ranking != null
                  ? { key: "rank", icon: <Trophy className="h-3 w-3" aria-hidden />, label: `QS ${university.qs_ranking.year} ${university.qs_ranking.label}`, strong: true }
                  : null,
                university.university_type
                  ? { key: "type", icon: <Building2 className="h-3 w-3" aria-hidden />, label: localizeUniversityType(university.university_type, locale), strong: false }
                  : null,
                ...majors.map((major, index) => ({
                  key: `major-${index}`,
                  icon: <GraduationCap className="h-3 w-3" aria-hidden />,
                  label: major,
                  strong: false,
                })),
              ] as (CatalogBadge | null)[]).filter((badge): badge is CatalogBadge => badge != null);
              const visibleBadges = badges.slice(0, 3);
              const hiddenBadges = badges.length - visibleBadges.length;

              return (
                <article
                  key={university.id}
                  className="flex h-full flex-col rounded-overlay border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-700 dark:bg-slate-900 transition-shadow hover:shadow-md sm:p-5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-2xl" aria-hidden>{university.flag_emoji}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                      <MapPin className="h-3 w-3 shrink-0 text-slate-500" aria-hidden />
                      <span className="break-words">{localizeCountry(university.country, locale)}</span>
                    </span>
                  </div>

                  {/* Equal-height cards start with a fixed-length title: the
                      clamp keeps a long institution name from pushing its own
                      numbers below its neighbours'. */}
                  <h2 className="mt-2 line-clamp-2 break-words text-sm font-bold leading-snug text-slate-900 dark:text-slate-100 sm:text-base">
                    <Link href={`/universities/${university.id}`} className="inline-flex min-h-11 items-center hover:text-blue-800">
                      {university.name}
                    </Link>
                  </h2>
                  <p className="mt-1 break-words text-sm text-slate-600 dark:text-slate-300">
                    {localizeCity(university.city, locale) || localizeCountry(university.country, locale)}
                  </p>

                  {visibleBadges.length > 0 && (
                    <ul className="mt-2 flex flex-wrap items-center gap-1.5">
                      {visibleBadges.map((badge) => (
                        <li
                          key={badge.key}
                          className={`inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-sm font-semibold ${
                            badge.strong
                              ? "bg-blue-50 text-blue-800 ring-1 ring-inset ring-blue-200"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {badge.icon}
                          <span className="line-clamp-1 break-words">{badge.label}</span>
                        </li>
                      ))}
                      {hiddenBadges > 0 && (
                        <li className="rounded-full bg-slate-100 px-2 py-0.5 text-sm font-bold text-slate-600">
                          +{number.format(hiddenBadges)}
                        </li>
                      )}
                    </ul>
                  )}

                  <dl className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-xs">
                    {university.tuition_source_url && university.annual_tuition_usd != null && (
                      <a className="inline-flex min-h-11 items-center text-blue-700 underline dark:text-blue-300" href={university.tuition_source_url} target="_blank" rel="noopener noreferrer">{copy.website}</a>
                    )}
                    <CatalogFact label={copy.annualTuition} value={university.annual_tuition_usd == null ? copy.notPublished : `${university.tuition_estimated ? "≈ " : ""}${usd.format(university.annual_tuition_usd)} · ${copy.perYear}`} numeric />
                    <CatalogFact label={copy.annualLiving} value={university.annual_living_est_usd == null ? copy.notPublished : `${usd.format(university.annual_living_est_usd)} · ${copy.perYear}`} numeric />
                    <CatalogFact label={copy.minIelts} value={university.min_ielts == null ? dictionaries[locale].university.notSpecified : number.format(university.min_ielts)} numeric />
                    <EvidenceNote compact label="IELTS" fact={university.ieltsEvidence}/>
                    {university.recorded_min_ielts!=null&&<p className="text-sm text-slate-500">{dictionaries[locale].university.recordedCatalogueValue}: IELTS {university.recorded_min_ielts}</p>}
                  </dl>

                  <div className="mt-auto flex items-center gap-1.5 pt-4">
                    <Link
                      href={`/universities/${university.id}`}
                      className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-surface bg-blue-700 px-3 text-xs font-bold text-white hover:bg-blue-800"
                    >
                      {copy.viewDetails}
                    </Link>
                    {university.official_website_url && (
                      <a
                        href={university.official_website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={copy.website}
                        aria-label={copy.website}
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-surface border border-slate-200 text-slate-600 hover:text-blue-700"
                      >
                        <ExternalLink className="h-4 w-4" aria-hidden />
                      </a>
                    )}
                    <PublicCompareButton item={{
                      id: university.id, title: university.name, href: university.official_website_url,
                      values: [
                        university.annual_tuition_usd == null ? "" : (university.tuition_estimated ? "≈ " : "") + usd.format(university.annual_tuition_usd),
                        university.min_ielts == null ? "" : number.format(university.min_ielts),
                        university.qs_ranking ? `${university.qs_ranking.year} ${university.qs_ranking.label}` : "",
                        "", university.deadline ?? "",
                      ],
                    }} />
                  </div>
                </article>
              );
            })}
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

/** One badge on a catalogue card — at most three render, the rest fold into "+N". */
type CatalogBadge = { key: string; icon: ReactElement; label: string; strong: boolean };

function CatalogFact({ label, value, numeric = false }: { label: string; value: string; numeric?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className={`text-right font-semibold text-slate-800 dark:text-slate-200 ${numeric ? "tabular-nums" : ""}`}>{value}</dd>
    </div>
  );
}
