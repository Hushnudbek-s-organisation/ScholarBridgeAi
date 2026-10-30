import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  ExternalLink,
  Globe2,
  GraduationCap,
  Languages,
  MapPin,
  ShieldQuestion,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import { PublicCatalogHeader } from "@/components/PublicCatalogHeader";
import { PublicFeaturePromo } from "@/components/PublicFeaturePromo";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { clientMessagesFor, dictionaries } from "@/i18n/messages.server";
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from "@/i18n/config";
import { formatMessage } from "@/i18n/formatMessage";
import { getCachedUniversitiesBundle } from "@/lib/catalogCache";
import {
  localizeCity,
  localizeCountry,
  localizeDegreeLevel,
  localizeHighlights,
  localizeMajorOrField,
  localizeUniversityType,
  universityDescriptionState,
} from "@/lib/catalogLocalizer";
import { formatMoney, formatNumber } from "@/lib/format";
import { SourceLanguageProse } from "@/components/SourceLanguageProse";
import { reconcileEmbeddedRank } from "@/lib/universityProse";
import { verifiedQsRank } from "@/lib/universityRank";

/**
 * Public university profile — /universities/[id].
 *
 * The catalogue card could tell a student the tuition and the ranking, and
 * then had nowhere to send them: `/universities` was the only public page, so
 * the 364 institutions in the database had no crawlable page of their own.
 * This page is that destination.
 *
 * Every number here is a stored column or nothing. A field the catalogue has
 * not verified renders as "not published" instead of a plausible guess, and an
 * unverified institution hides its cost/requirement figures entirely — the same
 * rule the catalogue list already applies.
 */

async function getPageLocale(): Promise<Locale> {
  const stored = (await cookies()).get(LOCALE_COOKIE)?.value;
  return stored && isLocale(stored) ? stored : defaultLocale;
}

interface DetailPageProps {
  // Next.js 15+: route params are async.
  params: Promise<{ id: string }>;
}

/** `highlights` is a JSON array column (or legacy comma text) — both feed one list. */
function listValues(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v)).filter(Boolean);
    } catch {
      // not JSON after all — fall through to the comma split
    }
  }
  return trimmed.split(",").map((v) => v.trim()).filter(Boolean);
}

export async function generateMetadata({ params }: DetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const locale = await getPageLocale();
  const t = dictionaries[locale].universityDetail;
  const bundle = await getCachedUniversitiesBundle().catch(() => null);
  const university = bundle?.unis.find((u) => u.id === Number(id) && u.isActive !== false);
  if (!university) return { title: t.notFoundTitle };

  const country = localizeCountry(university.country, locale);
  const verified = university.verificationStatus === "verified";
  // Phase AD: a rank with no recorded edition is not a QS position, so the
  // <meta> description states "unknown" rather than an unsupported number.
  const qsPosition = verifiedQsRank(university);
  return {
    title: formatMessage(t.metaTitle, { name: university.name, country }),
    description: formatMessage(t.metaDescription, {
      name: university.name,
      country,
      tuition: verified && university.annualTuitionUsd != null
        ? formatMoney(university.annualTuitionUsd, "USD")
        : t.metaUnknown,
      ielts: verified && university.minIelts != null
        ? formatNumber(university.minIelts, { decimals: 1 })
        : t.metaUnknown,
      rank: verified && qsPosition
        ? `#${formatNumber(qsPosition.rank)}`
        : t.metaUnknown,
    }),
  };
}

export default async function UniversityDetailPage({ params }: DetailPageProps) {
  const { id } = await params;
  const locale = await getPageLocale();
  const copy = dictionaries[locale];
  const t = copy.universityDetail;
  const catalog = copy.publicCatalog;

  const numericId = Number.parseInt(id, 10);
  const bundle = Number.isFinite(numericId)
    ? await getCachedUniversitiesBundle().catch(() => null)
    : null;
  const university = bundle?.unis.find((u) => u.id === numericId && u.isActive !== false) ?? null;

  // A real 404 (not a 200 with "not found" text): unknown ids and unpublished
  // rows both land on `not-found.tsx`, which speaks the student's language.
  if (!university) notFound();

  const u = university;
  // Any figure on this page depends on a verified row. Unverified institutions
  // keep their identity (name, city, links) and lose their numbers.
  const verified = u.verificationStatus === "verified";
  // Phase AD — the one QS position this page may state: `null` when the row
  // records no edition (`qs_rank_year`), when the number is broken, or when the
  // row is unverified. Every rank below, and the prose reconciliation, reads it.
  const qsPosition = verified ? verifiedQsRank(u) : null;
  const number = (value: number | null, decimals = 0) =>
    value == null ? null : formatNumber(value, { decimals });
  const verifiedValue = (value: number | null, decimals = 0) =>
    verified ? number(value, decimals) : null;

  const country = localizeCountry(u.country, locale);
  const place = [localizeCity(u.city, locale), country].filter(Boolean).join(", ");
  const type = u.universityType ? localizeUniversityType(u.universityType, locale) : null;
  const degree = u.degreeLevel ? localizeDegreeLevel(u.degreeLevel, locale) : null;
  // 348 of the 356 stored descriptions are machine-generated sentences that the
  // dictionary layer cannot render faithfully. Those keep their English text and
  // get the "source language: English" label rather than a half-translated
  // sentence; readable copy renders as ordinary localized prose.
  // `u.worldRanking` is the corrected QS 2026 figure (docs/QS2026_RANK_VERIFICATION_2026-10-23.md);
  // the stored prose and the ranking chip were generated before that correction
  // and still state the old sequence — 178 of 194 disagree. Passing the rank in
  // makes the page state one QS number, not two.
  const description = u.description ? universityDescriptionState(u.description, locale, qsPosition?.rank ?? null) : null;
  // `highlights` is a JSON-array column; localize the array, then flatten it to
  // the labels the page lists.
  // Compared against the same corrected numbers the localized chips carry, so a
  // rank fix alone never counts as "translated" when the chip is still English.
  const storedHighlights = u.highlights
    ? listValues(u.highlights).map((item) => reconcileEmbeddedRank(item, qsPosition?.rank ?? null))
    : [];
  const highlights = u.highlights
    ? listValues(localizeHighlights(u.highlights, locale, qsPosition?.rank ?? null))
    : [];
  // Badges fall under the same rule: a badge that could not be rendered cleanly
  // stays in English, and the list says so once instead of labelling each chip.
  const highlightsInSource =
    locale !== "en" && highlights.some((item, index) => item === storedHighlights[index]);
  const fields = (bundle?.programFieldsByUni.get(u.id) ?? [])
    .slice(0, 16)
    .map((field) => localizeMajorOrField(field, locale));
  const source = bundle?.sourceMap.get(u.id) ?? null;

  // Costs show the stored currency first and the USD comparison second; when
  // only the USD mirror exists, it is labelled as such.
  const tuitionLocal =
    u.annualTuition != null && u.tuitionCurrency
      ? formatMoney(u.annualTuition, u.tuitionCurrency, {
          suffix: u.tuitionPeriod === "month" ? ` ${t.monthly}` : ` ${t.yearly}`,
        })
      : null;
  const tuitionUsd = verified && u.annualTuitionUsd != null ? formatMoney(u.annualTuitionUsd, "USD") : null;
  const livingLocal =
    u.annualLivingEst != null && u.livingCostCurrency
      ? formatMoney(u.annualLivingEst, u.livingCostCurrency, {
          suffix: u.livingCostPeriod === "month" ? ` ${t.monthly}` : ` ${t.yearly}`,
        })
      : null;
  const livingUsd = verified && u.annualLivingEstUsd != null ? formatMoney(u.annualLivingEstUsd, "USD") : null;
  const accommodation = verified && u.accommodationCostUsd != null
    ? formatMoney(u.accommodationCostUsd, "USD")
    : null;
  const applicationFee = verified && u.applicationFeeUsd != null
    ? formatMoney(u.applicationFeeUsd, "USD")
    : null;
  const lastVerified = u.lastVerifiedAt
    ? new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(u.lastVerifiedAt)
    : null;
  const internationalLine = verified
    ? u.internationalStudentsCount != null
      ? u.internationalStudentsPercentage != null
        ? `${formatNumber(u.internationalStudentsCount)} (${formatNumber(u.internationalStudentsPercentage, { decimals: 1, suffix: "%" })})`
        : formatNumber(u.internationalStudentsCount)
      : u.internationalStudentsPercentage != null
        ? formatNumber(u.internationalStudentsPercentage, { decimals: 1, suffix: "%" })
        : null
    : null;

  const officialLinks = [
    { href: u.officialWebsiteUrl, label: t.website },
    { href: u.admissionsUrl, label: t.admissions },
    { href: u.internationalAdmissionsUrl, label: t.admissions },
    { href: u.applicationUrl, label: t.application },
  ].filter((link, index, all) => Boolean(link.href) && all.findIndex((other) => other.href === link.href) === index);

  // Siblings from the same country, ranked first — a real next step, never a
  // random sample from the other 363 rows.
  const similar = (bundle?.unis ?? [])
    .filter((other) => other.id !== u.id && other.isActive !== false && other.country === u.country)
    .sort((a, b) => (a.worldRanking ?? Number.MAX_SAFE_INTEGER) - (b.worldRanking ?? Number.MAX_SAFE_INTEGER) || a.id - b.id)
    .slice(0, 5);

  const facts: { icon: React.ReactNode; label: string; value: string | null }[] = [
    { icon: <Building2 className="h-3.5 w-3.5" aria-hidden />, label: t.typeLabel, value: type ?? degree },
    { icon: <Trophy className="h-3.5 w-3.5" aria-hidden />, label: t.rankLabel, value: verifiedValue(qsPosition?.rank ?? null) },
    { icon: <Wallet className="h-3.5 w-3.5" aria-hidden />, label: t.tuitionLabel, value: tuitionLocal ?? tuitionUsd },
    { icon: <Banknote className="h-3.5 w-3.5" aria-hidden />, label: t.livingLabel, value: livingLocal ?? livingUsd },
    { icon: <CalendarDays className="h-3.5 w-3.5" aria-hidden />, label: t.foundedLabel, value: verifiedValue(u.foundedYear) },
    { icon: <Users className="h-3.5 w-3.5" aria-hidden />, label: t.internationalLabel, value: internationalLine },
  ];

  const admissionFacts: { icon: React.ReactNode; label: string; value: string | null }[] = [
    { icon: <GraduationCap className="h-3.5 w-3.5" aria-hidden />, label: t.minGpaLabel, value: verifiedValue(u.minGpa, 2) },
    { icon: <Languages className="h-3.5 w-3.5" aria-hidden />, label: t.minIeltsLabel, value: verifiedValue(u.minIelts, 1) },
    { icon: <BookOpen className="h-3.5 w-3.5" aria-hidden />, label: t.minSatLabel, value: verifiedValue(u.minSat) },
    {
      icon: <BadgeCheck className="h-3.5 w-3.5" aria-hidden />,
      label: t.acceptanceLabel,
      value: verifiedValue(u.acceptanceRate, 1),
    },
    {
      icon: <Briefcase className="h-3.5 w-3.5" aria-hidden />,
      label: t.postStudyLabel,
      value: verifiedValue(u.postStudyWorkVisaYears),
    },
    { icon: <Wallet className="h-3.5 w-3.5" aria-hidden />, label: t.applicationFeeLabel, value: applicationFee },
    { icon: <Banknote className="h-3.5 w-3.5" aria-hidden />, label: t.accommodationLabel, value: accommodation },
    {
      icon: <CalendarDays className="h-3.5 w-3.5" aria-hidden />,
      label: t.qsYearLabel,
      value: verifiedValue(u.qsRankYear),
    },
  ];

  return (
    <LocaleProvider initialLocale={locale} initialMessages={clientMessagesFor(locale)}>
      <PublicCatalogHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
        <Link
          href="/universities"
          className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          {t.backToCatalog}
        </Link>

        <header className="mt-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-600">
                <span className="text-base leading-none" aria-hidden>{u.flagEmoji}</span>
                <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                <span className="break-words">{place || country}</span>
              </p>
              <h1 className="mt-1.5 line-clamp-3 break-words text-xl font-extrabold leading-snug text-slate-900 sm:text-2xl">
                {u.name}
              </h1>
              {(type || degree) && (
                <p className="mt-1 break-words text-xs text-slate-600">
                  {[type, degree].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${
                verified
                  ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                  : "bg-amber-50 text-amber-800 ring-amber-200"
              }`}
            >
              {verified ? <BadgeCheck className="h-3 w-3" aria-hidden /> : <ShieldQuestion className="h-3 w-3" aria-hidden />}
              {verified ? t.verified : t.unverified}
            </span>
          </div>

          {/* The three numbers a student decides with, as badges — three, not
              the eight the card used to stack. */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {verifiedValue(qsPosition?.rank ?? null) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-800 ring-1 ring-inset ring-blue-200">
                <Trophy className="h-3 w-3" aria-hidden />
                {t.rankLabel}: #{verifiedValue(qsPosition?.rank ?? null)}
              </span>
            )}
            {(tuitionLocal ?? tuitionUsd) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-800 ring-1 ring-inset ring-slate-200">
                <Wallet className="h-3 w-3" aria-hidden />
                {tuitionLocal ?? tuitionUsd}
              </span>
            )}
            {verifiedValue(u.minIelts, 1) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-800 ring-1 ring-inset ring-slate-200">
                <Languages className="h-3 w-3" aria-hidden />
                IELTS {verifiedValue(u.minIelts, 1)}+
              </span>
            )}
          </div>

          {!verified && (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900">
              {t.unverifiedNote}
            </p>
          )}
        </header>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* ------------------------------------------------------- main */} 
          <div className="space-y-4">
            <Section id="overview" title={t.overview} icon={<Globe2 className="h-4 w-4" aria-hidden />}>
              {description && description.text ? (
                <SourceLanguageProse
                  text={description.text}
                  showLabel={description.verbatim}
                  label={t.sourceLanguageLabel}
                />
              ) : (
                <p className="text-sm text-slate-600">{t.overviewNotPublished}</p>
              )}
              {highlights.length > 0 && (
                <>
                  <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">{t.highlights}</h3>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {highlights.slice(0, 8).map((highlight) => (
                      <li
                        key={highlight}
                        className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700"
                      >
                        {highlight}
                      </li>
                    ))}
                    {highlights.length > 8 && (
                      <li className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">
                        +{highlights.length - 8}
                      </li>
                    )}
                  </ul>
                  {highlightsInSource && (
                    <p className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200 ring-inset">
                      <Languages className="h-3 w-3 shrink-0" aria-hidden />
                      <span>{t.sourceLanguageLabel}</span>
                    </p>
                  )}
                </>
              )}
            </Section>

            <Section id="costs" title={t.costs} icon={<Wallet className="h-4 w-4" aria-hidden />}>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
                {facts.map((fact) => (
                  <Fact key={fact.label} icon={fact.icon} label={fact.label} value={fact.value ?? catalog.notPublished} />
                ))}
              </dl>
              {tuitionLocal && tuitionUsd && (
                <p className="mt-3 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                  {formatMessage(t.usdComparison, { amount: tuitionUsd })}
                </p>
              )}
            </Section>

            <Section id="admission" title={t.admission} icon={<GraduationCap className="h-4 w-4" aria-hidden />}>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
                {admissionFacts.map((fact) => (
                  <Fact key={fact.label} icon={fact.icon} label={fact.label} value={fact.value ?? catalog.notPublished} />
                ))}
              </dl>
            </Section>

            <Section id="fields" title={t.fields} icon={<BookOpen className="h-4 w-4" aria-hidden />}>
              {fields.length > 0 ? (
                <ul className="flex flex-wrap gap-1.5">
                  {fields.map((field) => (
                    <li key={field} className="rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-bold text-indigo-800">
                      {field}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-600">{t.fieldsNotPublished}</p>
              )}
            </Section>
          </div>

          {/* ------------------------------------------------------ aside */}
          <aside className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{t.officialPages}</p>
              <div className="mt-2 space-y-2">
                {officialLinks.length > 0 ? (
                  officialLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <span className="min-w-0 break-words">{link.label}</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    </a>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">{t.sourcePending}</p>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{t.source}</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                {source?.sourceUrl ? (
                  <a
                    href={source.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-900"
                  >
                    {source.sourceTitle ?? t.source}
                    <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                ) : (
                  t.sourcePending
                )}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                {t.lastVerified}: {lastVerified ?? catalog.notPublished}
              </p>
            </section>

            {similar.length > 0 && (
              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  {formatMessage(t.similarTitle, { country })}
                </p>
                <ul className="mt-2 space-y-1 text-xs">
                  {similar.map((other) => (
                    <li key={other.id}>
                      <Link
                        href={`/universities/${other.id}`}
                        className="flex min-h-11 items-center justify-between gap-2 rounded px-1 text-slate-700 hover:text-blue-700"
                      >
                        <span className="min-w-0 break-words">{other.name}</span>
                        {other.verificationStatus === "verified" && other.worldRanking != null && (
                          <span className="shrink-0 text-[11px] font-semibold text-slate-500">
                            #{formatNumber(other.worldRanking)}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/universities"
                  className="mt-2 inline-flex min-h-11 items-center text-[11px] font-semibold text-blue-700 hover:text-blue-900"
                >
                  {t.seeAll}
                </Link>
              </section>
            )}
          </aside>
        </div>


        <PublicFeaturePromo className="mt-6" />
        <p className="mt-6 border-t border-slate-200 pt-4 text-[11px] leading-relaxed text-slate-600">
          {catalog.independentGuide}
        </p>
      </main>
    </LocaleProvider>
  );
}

function Section({
  id,
  title,
  icon,
  children,
}: {
  id: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 sm:text-base">
        <span className="text-slate-500">{icon}</span>
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <div className="min-w-0 flex-1">
        <dt className="text-[10px] uppercase tracking-wide text-slate-500">{label}</dt>
        <dd className="break-words font-semibold text-slate-800">{value}</dd>
      </div>
    </div>
  );
}
