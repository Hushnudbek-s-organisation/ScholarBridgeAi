import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { PublicCatalogHeader } from "@/components/PublicCatalogHeader";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { clientMessagesFor, dictionaries } from "@/i18n/messages.server";
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from "@/i18n/config";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

/**
 * `/forgot-password` — step one of the reset flow (Phase AG).
 *
 * Public by design: a person who cannot sign in has no session to read copy
 * from, so the language comes from the same `scholarbridge_locale` cookie every
 * public page uses. No database read happens here — the form posts to
 * `/api/auth/password-reset/request`, which owns the anti-enumeration answer.
 */

async function getPageLocale(): Promise<Locale> {
  const stored = (await cookies()).get(LOCALE_COOKIE)?.value;
  return stored && isLocale(stored) ? stored : defaultLocale;
}

export async function generateMetadata(): Promise<Metadata> {
  const copy = dictionaries[await getPageLocale()].passwordReset;
  return { title: copy.forgotMetaTitle, description: copy.forgotMetaDescription, robots: { index: false, follow: true } };
}

export default async function ForgotPasswordPage() {
  const locale = await getPageLocale();
  const copy = dictionaries[locale].passwordReset;

  return (
    <LocaleProvider initialLocale={locale} initialMessages={clientMessagesFor(locale)}>
      <div className="min-h-screen bg-slate-50">
        <PublicCatalogHeader />
        <main className="mx-auto max-w-lg px-4 py-10 sm:px-6 sm:py-14">
          <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-700">{copy.forgotEyebrow}</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{copy.forgotTitle}</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-700">{copy.forgotBody}</p>

          <div className="mt-6">
            <ForgotPasswordForm />
          </div>

          <p className="mt-6 text-center text-xs leading-relaxed text-slate-500">
            <Link href="/privacy" className="font-semibold text-indigo-700 hover:text-indigo-900">
              {copy.privacyLink}
            </Link>
          </p>
        </main>
      </div>
    </LocaleProvider>
  );
}
