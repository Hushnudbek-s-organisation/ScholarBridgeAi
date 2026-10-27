import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { PublicCatalogHeader } from "@/components/PublicCatalogHeader";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { dictionaries } from "@/i18n/messages.server";
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from "@/i18n/config";

/**
 * 404 for the public university profile.
 *
 * `notFound()` in the page is what makes the response a real 404 instead of a
 * 200 with "not found" text — crawlers and `curl -I` see the truth. The body
 * still speaks the student's language, which the default Next 404 cannot.
 */
async function getPageLocale(): Promise<Locale> {
  const stored = (await cookies()).get(LOCALE_COOKIE)?.value;
  return stored && isLocale(stored) ? stored : defaultLocale;
}

export default async function UniversityNotFound() {
  const locale = await getPageLocale();
  const t = dictionaries[locale].universityDetail;

  return (
    <LocaleProvider initialLocale={locale}>
      <PublicCatalogHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 text-slate-900 sm:px-6 lg:px-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <GraduationCap className="h-6 w-6 shrink-0 text-blue-600" aria-hidden />
          {t.notFoundTitle}
        </h1>
        <p className="mt-2 text-sm text-slate-600">{t.notFoundBody}</p>
        <Link
          href="/universities"
          className="mt-6 inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t.backToCatalog}
        </Link>
      </main>
    </LocaleProvider>
  );
}
