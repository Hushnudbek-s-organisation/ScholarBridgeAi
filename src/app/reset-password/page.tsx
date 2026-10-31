import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { PublicCatalogHeader } from "@/components/PublicCatalogHeader";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { clientMessagesFor, dictionaries } from "@/i18n/messages.server";
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from "@/i18n/config";
import { ResetPasswordForm } from "./ResetPasswordForm";

/**
 * `/reset-password?token=…` — step two of the reset flow (Phase AG).
 *
 * The link from the email lands here. The page itself reads only the locale
 * cookie; the token is read in the client component, which is why that component
 * sits inside a `Suspense` boundary (`useSearchParams` on a page that could be
 * statically optimised fails the build otherwise).
 *
 * The page is `noindex`: a reset URL with a live token in it must never end up
 * in a search result or a link preview cache.
 */

async function getPageLocale(): Promise<Locale> {
  const stored = (await cookies()).get(LOCALE_COOKIE)?.value;
  return stored && isLocale(stored) ? stored : defaultLocale;
}

export async function generateMetadata(): Promise<Metadata> {
  const copy = dictionaries[await getPageLocale()].passwordReset;
  return { title: copy.resetMetaTitle, description: copy.resetMetaDescription, robots: { index: false, follow: false } };
}

export default async function ResetPasswordPage() {
  const locale = await getPageLocale();
  const copy = dictionaries[locale].passwordReset;

  return (
    <LocaleProvider initialLocale={locale} initialMessages={clientMessagesFor(locale)}>
      <div className="min-h-screen bg-slate-50">
        <PublicCatalogHeader />
        <main className="mx-auto max-w-lg px-4 py-10 sm:px-6 sm:py-14">
          <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-700">{copy.resetEyebrow}</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{copy.resetTitle}</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-700">{copy.resetBody}</p>

          <div className="mt-6">
            <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white" />}>
              <ResetPasswordForm />
            </Suspense>
          </div>
        </main>
      </div>
    </LocaleProvider>
  );
}
