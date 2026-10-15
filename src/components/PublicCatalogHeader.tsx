import Link from "next/link";
import { BrandingImage } from "@/components/BrandingImage";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { formatMessage } from "@/i18n/formatMessage";
import { dictionaries } from "@/i18n/messages";
import type { Locale } from "@/i18n/config";

/**
 * Header for the public, indexable catalogue pages (/universities,
 * /scholarships, …).
 *
 * These pages are what a search engine (and a parent) sees first, and they
 * used to open with a bare <h1> and no way back into the app, no language
 * switch and no theme switch — on a product whose whole UI is trilingual and
 * has a dark mode. One component, used by both pages, so they cannot drift.
 */
export async function PublicCatalogHeader({
  locale,
  heading,
  Icon,
  intro,
}: {
  locale: Locale;
  heading: string;
  Icon: React.ComponentType<{ className?: string }>;
  intro?: string;
}) {
  const copy = dictionaries[locale].publicCatalog;

  return (
    <header className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg text-slate-900 transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none dark:text-white"
        >
          <BrandingImage alt="" className="h-7 w-7 shrink-0 rounded-md object-contain" />
          <span className="text-sm font-black tracking-tight">ScholarBridgeAI</span>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher compact />
          <ThemeToggle />
        </div>
      </div>

      <nav aria-label={copy.breadcrumbLabel} className="mt-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        <Link href="/" className="hover:text-blue-700 dark:hover:text-blue-300">
          {copy.home}
        </Link>
        <span aria-hidden className="mx-1.5">
          /
        </span>
        <span className="text-slate-700 dark:text-slate-200">{heading}</span>
      </nav>

      <h1 className="mt-2 flex items-center gap-2 text-xl font-black tracking-tight text-slate-900 sm:text-2xl dark:text-white">
        <Icon className="h-6 w-6 shrink-0 text-amber-500" />
        {heading}
      </h1>
      {intro && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{intro}</p>}
    </header>
  );
}

/** Footer note shared by the public catalogue pages. */
export function PublicCatalogFooter({ locale }: { locale: Locale }) {
  const copy = dictionaries[locale].publicCatalog;
  return (
    <p className="mt-6 border-t border-slate-200 pt-4 text-[11px] leading-relaxed text-slate-600 dark:border-slate-800 dark:text-slate-400">
      {copy.independentGuide}
    </p>
  );
}

/** "Showing 1–24 of 120 · Page 1 of 5", localised. */
export function catalogueSummary(locale: Locale, key: "universitiesSummary" | "scholarshipsSummary", vars: Record<string, string>) {
  return formatMessage(dictionaries[locale].publicCatalog[key], vars);
}
