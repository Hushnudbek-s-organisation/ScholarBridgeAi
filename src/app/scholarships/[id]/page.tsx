import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import {
  ArrowLeft,
  Award,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileText,
  Globe2,
  GraduationCap,
  Languages,
  MapPin,
  Wallet,
} from "lucide-react";
import { PublicCatalogHeader } from "@/components/PublicCatalogHeader";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { dictionaries } from "@/i18n/messages";
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from "@/i18n/config";
import { formatMessage } from "@/i18n/formatMessage";
import { getCachedScholarshipsBundle, getCachedUniversitiesBundle } from "@/lib/catalogCache";
import {
  localizeCountry,
  localizeCoverageType,
  localizeDegreeLevel,
  localizeMajorOrField,
  localizeScholarshipDescription,
  localizeScholarshipProvider,
  localizeScholarshipRequirements,
  localizeScholarshipTitle,
} from "@/lib/catalogLocalizer";
import { formatMoney } from "@/lib/format";

async function getPageLocale(): Promise<Locale> {
  const stored = (await cookies()).get(LOCALE_COOKIE)?.value;
  return stored && isLocale(stored) ? stored : defaultLocale;
}

interface DetailPageProps {
  // Next.js 15+: route params are async.
  params: Promise<{ id: string }>;
  /** `?from=app` — the student opened this award from the dashboard catalogue. */
  searchParams: Promise<{ from?: string | string[] }>;
}

/** JSON-array columns and comma-separated legacy text both feed the same list. */
function listValues(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v)).filter(Boolean);
    } catch {
      // fall through — the value is not JSON after all
    }
  }
  return trimmed.split(",").map((v) => v.trim()).filter(Boolean);
}

function formatDate(value: string | Date | null | undefined, locale: Locale): string | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(`${value}T12:00:00Z`);
  if (!Number.isFinite(parsed.getTime())) return typeof value === "string" ? value : null;
  return new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(parsed);
}

export async function generateMetadata({ params }: DetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const locale = await getPageLocale();
  const t = dictionaries[locale].scholarshipDetail;
  const bundle = await getCachedScholarshipsBundle().catch(() => null);
  const scholarship = bundle?.entries.find((entry) => entry.id === Number(id));
  if (!scholarship) return { title: t.notFoundTitle };
  const title = localizeScholarshipTitle(scholarship.title, locale);
  const provider = localizeScholarshipProvider(scholarship.provider, locale);
  return {
    title: formatMessage(t.metaTitle, { title }),
    description: formatMessage(t.metaDescription, { title, provider }),
  };
}

export default async function ScholarshipDetailPage({ params, searchParams }: DetailPageProps) {
  const { id } = await params;
  const { from } = await searchParams;
  const rawFrom = Array.isArray(from) ? from[0] : from;
  /**
   * Where "back" goes.
   *
   * The dashboard catalogue (`#scholarships`) and this public page are two
   * different screens: sending a signed-in student to `/scholarships` dropped
   * them into a catalogue without their sidebar, filters or profile. When the
   * link says it came from the app, "back" returns to the app's scholarship
   * hub — which restores the filters the student had chosen.
   */
  const fromApp = rawFrom === "app";
  const backHref = fromApp ? "/#scholarships" : "/scholarships";
  const numericId = Number.parseInt(id, 10);
  const locale = await getPageLocale();
  const copy = dictionaries[locale];
  const t = copy.scholarshipDetail;

  const bundle = await getCachedScholarshipsBundle().catch(() => null);
  const scholarship = Number.isFinite(numericId)
    ? bundle?.entries.find((entry) => entry.id === numericId) ?? null
    : null;

  if (!scholarship) {
    return (
      <LocaleProvider initialLocale={locale}>
        <PublicCatalogHeader />
        <main className="mx-auto max-w-3xl px-4 py-16 text-slate-900 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold">{t.notFoundTitle}</h1>
          <p className="mt-2 text-sm text-slate-600">{t.notFoundBody}</p>
          <Link
            href={backHref}
            className="mt-6 inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {fromApp ? t.backToApp : t.back}
          </Link>
        </main>
      </LocaleProvider>
    );
  }

  const s = scholarship;

  // Locate the owning university name for the sidebar note (if any).
  let universityName: string | null = null;
  if (s.universityId != null) {
    const unis = await getCachedUniversitiesBundle().catch(() => null);
    universityName = unis?.unis.find((u) => u.id === s.universityId)?.name ?? null;
  }

  const title = localizeScholarshipTitle(s.title, locale);
  const provider = localizeScholarshipProvider(s.provider, locale);
  const country = localizeCountry(s.country, locale);
  const coverage = localizeCoverageType(s.coverageType, locale);
  const description = localizeScholarshipDescription(s.description, locale);
  const requirements = localizeScholarshipRequirements(s.requirements, locale);

  const degrees = listValues(s.degreeLevels).map((v) => localizeDegreeLevel(v, locale));
  const majors = listValues(s.eligibleMajors).map((v) =>
    /^all( majors| fields)?$/i.test(v.trim()) ? t.allMajors : localizeMajorOrField(v, locale)
  );
  const countries = listValues(s.eligibleCountries).map((v) =>
    /^(all|any)$/i.test(v.trim()) ? t.allCountries : localizeCountry(v, locale)
  );
  const documents = listValues(s.requiredDocuments);
  const rounds = listValues(s.rounds);

  const deadlineLabel =
    formatDate(s.deadlineDate, locale) ?? (s.deadline && s.deadline.trim() ? s.deadline : null);

  const languageLine =
    (s.englishRequirements && s.englishRequirements.trim()) ||
    (s.minIelts != null ? `IELTS ${s.minIelts}+` : null);

  const awardValue =
    s.awardAmount != null
      ? formatMoney(s.awardAmount, s.awardCurrency, {
          suffix: s.awardPeriod === "month" ? ` ${copy.publicCatalog.scholarshipPeriodMonth}` : s.awardPeriod === "year" ? ` ${copy.publicCatalog.scholarshipPeriodYear}` : "",
        })
      : s.amountUsdValue != null && s.amountUsdValue > 0
        ? formatMoney(s.amountUsdValue, "USD")
        : null;

  const statusLabel =
    s.applicationStatus === "open"
      ? t.statusOpen
      : s.applicationStatus === "upcoming"
        ? t.statusUpcoming
        : s.applicationStatus === "rolling"
          ? t.statusRolling
          : t.statusUnknown;

  const verifiedOn = formatDate(s.lastVerifiedAt, locale);
  // The apply button must exist on every award. When the provider publishes a
  // dedicated application URL we use it; otherwise we send the student to the
  // official page (source first), and the label says exactly that - we never
  // invent an /apply deep link.
  const applyHref = s.applicationUrl ?? s.sourceUrl ?? s.websiteUrl ?? null;
  const applyLabel = s.applicationUrl ? t.applyNow : t.applyOnOfficialPage;
  // A stored 0 means "no fee"; a NULL means the source did not say.
  const feeLabel =
    s.applicationFee == null ? t.noFee : s.applicationFee === 0 ? t.applicationFeeFree : formatMoney(s.applicationFee, "USD");

  // Benefit bullets — every line is a stored field, never an inference.
  const benefitLines: string[] = [];
  if (coverage) benefitLines.push(coverage);
  if (s.tuitionCoverage && s.tuitionCoverage !== "None") {
    benefitLines.push(`${t.tuitionCoverage}: ${s.tuitionCoverage}`);
  }
  if (awardValue) benefitLines.push(`${t.awardValue}: ${awardValue}`);
  if (s.livingAllowance != null && s.livingAllowance > 0) {
    benefitLines.push(`${t.livingAllowance}: ${formatMoney(s.livingAllowance, "USD")}`);
  }
  if (s.travelAllowance != null && s.travelAllowance > 0) {
    benefitLines.push(`${t.travelAllowance}: ${formatMoney(s.travelAllowance, "USD")}`);
  }
  if (s.accommodation && s.accommodation.trim()) {
    benefitLines.push(`${t.accommodation}: ${s.accommodation}`);
  }

  const sections = [
    { id: "about", label: t.about, show: Boolean(description) },
    { id: "who", label: t.whoCanApply, show: Boolean(requirements) || countries.length > 0 || degrees.length > 0 },
    { id: "benefits", label: t.benefits, show: benefitLines.length > 0 },
    { id: "apply", label: t.howToApply, show: true },
    { id: "extra", label: t.extraInfo, show: true },
  ].filter((section) => section.show);

  return (
    <LocaleProvider initialLocale={locale}>
      <PublicCatalogHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
        <Link
          href={backHref}
          className="inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          {fromApp ? t.backToApp : t.back}
        </Link>

        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* ---------------------------------------------------------- main */}
          <div className="min-w-0 space-y-4">
            <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-amber-800 ring-1 ring-amber-200 ring-inset">
                  <Award className="h-3 w-3" aria-hidden />
                  {coverage}
                </span>
                {degrees.map((degree) => (
                  <span
                    key={degree}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-700 ring-1 ring-slate-200 ring-inset"
                  >
                    {degree}
                  </span>
                ))}
                {deadlineLabel && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-rose-700 ring-1 ring-rose-200 ring-inset">
                    <CalendarDays className="h-3 w-3" aria-hidden />
                    {deadlineLabel}
                  </span>
                )}
              </div>

              <h1 className="mt-3 break-words text-xl font-bold leading-snug text-slate-900 sm:text-2xl">
                {title}
              </h1>
              <p className="mt-1.5 break-words text-sm text-slate-600">{provider}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="break-words">{country}</span>
              </p>
            </header>

            {description && (
              <Section id="about" title={t.about} icon={<FileText className="h-4 w-4" aria-hidden />}>
                <p className="whitespace-pre-line break-words text-sm leading-relaxed text-slate-700">
                  {description}
                </p>
              </Section>
            )}

            <Section id="who" title={t.whoCanApply} icon={<GraduationCap className="h-4 w-4" aria-hidden />}>
              <p className="whitespace-pre-line break-words text-sm leading-relaxed text-slate-700">
                {requirements}
              </p>
              <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 border-t border-slate-100 pt-3 text-xs sm:grid-cols-2">
                <Fact label={t.level} value={degrees.length ? degrees.join(", ") : t.notPublished} />
                <Fact label={t.eligibleMajors} value={majors.length ? majors.join(", ") : t.notPublished} />
                <Fact label={t.eligibleCountries} value={countries.length ? countries.join(", ") : t.notPublished} />
                <Fact label={t.minGpa} value={s.minGpa != null ? String(s.minGpa) : t.notPublished} />
                <Fact label={t.minIelts} value={s.minIelts != null ? String(s.minIelts) : t.notPublished} />
              </dl>
            </Section>

            {benefitLines.length > 0 && (
              <Section id="benefits" title={t.benefits} icon={<Wallet className="h-4 w-4" aria-hidden />}>
                <ul className="space-y-1.5 text-sm text-slate-700">
                  {benefitLines.map((line) => (
                    <li key={line} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                      <span className="break-words">{line}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            <Section id="apply" title={t.howToApply} icon={<BadgeCheck className="h-4 w-4" aria-hidden />}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.documents}</h3>
              {documents.length > 0 ? (
                <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                  {documents.map((doc) => (
                    <li key={doc} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" aria-hidden />
                      <span className="break-words">{doc}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-slate-500">{t.documentsNotPublished}</p>
              )}

              {rounds.length > 0 && (
                <>
                  <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t.recurrence}
                  </h3>
                  <p className="mt-1 text-sm text-slate-700">{rounds.join(" · ")}</p>
                </>
              )}

              <p className="mt-4 text-xs text-slate-500">{t.applyNote}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                {applyHref && (
                  <a
                    href={applyHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800"
                  >
                    {applyLabel}
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </a>
                )}
                {s.sourceUrl && (
                  <a
                    href={s.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {t.officialLink}
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </a>
                )}
              </div>
            </Section>

            <Section id="extra" title={t.extraInfo} icon={<Globe2 className="h-4 w-4" aria-hidden />}>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
                <Fact label={t.recurrence} value={s.recurrence === "annual" ? t.recurrenceAnnual : t.recurrenceNone} />
                <Fact label={t.status} value={statusLabel} />
                <Fact label={t.applicationFee} value={feeLabel} />
                <Fact label={t.lastVerified} value={verifiedOn ?? t.notPublished} />
              </dl>
              {verifiedOn && (
                <p className="mt-3 border-t border-slate-100 pt-3 text-[11px] leading-relaxed text-slate-500">
                  {formatMessage(t.verifiedNote, { date: verifiedOn })}
                </p>
              )}
            </Section>
          </div>

          {/* --------------------------------------------------------- aside */}
          <aside className="space-y-4">
            <nav className="rounded-2xl border border-slate-200 bg-white p-4" aria-label={t.contents}>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{t.contents}</p>
              <ul className="mt-2 space-y-1 text-xs">
                {sections.map((section) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`} className="block rounded px-1 py-1 text-slate-700 hover:text-blue-700">
                      · {section.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{t.keyDetails}</p>
              <dl className="mt-3 space-y-2.5 text-xs">
                <SideFact icon={<Languages className="h-3.5 w-3.5" aria-hidden />} label={t.language} value={languageLine ?? t.notPublished} />
                <SideFact icon={<Award className="h-3.5 w-3.5" aria-hidden />} label={t.opportunityType} value={coverage} />
                <SideFact icon={<GraduationCap className="h-3.5 w-3.5" aria-hidden />} label={t.level} value={degrees.length ? degrees.join(", ") : t.notPublished} />
                <SideFact icon={<Wallet className="h-3.5 w-3.5" aria-hidden />} label={t.funding} value={s.fundingType || coverage} />
                <SideFact icon={<Globe2 className="h-3.5 w-3.5" aria-hidden />} label={t.hostCountry} value={country} />
                <SideFact icon={<CalendarDays className="h-3.5 w-3.5" aria-hidden />} label={t.deadline} value={deadlineLabel ?? t.notPublished} />
                <SideFact icon={<FileText className="h-3.5 w-3.5" aria-hidden />} label={t.applicationFee} value={feeLabel} />
              </dl>

              {universityName && (
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <p className="text-[11px] leading-relaxed text-slate-600">
                    {formatMessage(t.linkedUniversity, { university: universityName })}
                  </p>
                  <Link
                    href="/universities"
                    className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900"
                  >
                    {t.openUniversity}
                  </Link>
                </div>
              )}
            </section>

            <div className="space-y-2">
              {s.sourceUrl && (
                <a
                  href={s.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {t.officialLink}
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              )}
              {applyHref && (
                <a
                  href={applyHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-rose-700 px-3 text-sm font-bold text-white hover:bg-rose-800"
                >
                  {applyLabel}
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              )}
            </div>
          </aside>
        </div>

        <p className="mt-6 border-t border-slate-200 pt-4 text-[11px] leading-relaxed text-slate-600">
          {copy.publicCatalog.independentGuide}
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

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-semibold text-slate-800">{value}</dd>
    </div>
  );
}

function SideFact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <div className="min-w-0 flex-1">
        <dt className="text-[10px] uppercase tracking-wide text-slate-400">{label}</dt>
        <dd className="break-words font-semibold text-slate-800">{value}</dd>
      </div>
    </div>
  );
}
