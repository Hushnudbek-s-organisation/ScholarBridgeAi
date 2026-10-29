import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  CalendarClock,
  FileText,
  Gauge,
  Plane,
  Sparkles,
  Target,
  Wallet,
} from "lucide-react";
import { PublicCatalogHeader } from "@/components/PublicCatalogHeader";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { dictionaries, clientMessagesFor } from "@/i18n/messages.server";
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from "@/i18n/config";
import { getTelegramSettings } from "@/lib/telegram/settings";

/**
 * `/features` — the public "what this site does" page.
 *
 * Why it exists: every channel post links to `/go/<code>` → `/scholarships/<id>`,
 * and that page (plus the catalogue) is all a visitor ever sees. The site's real
 * product — fit scoring, admission chance, the deadline plan, documents, the AI
 * assistant, the bot — lives behind an account, so a reader arriving from
 * Telegram had no way to learn it exists. This page is reachable from every
 * public page's header and from a promo strip on each catalogue page, and it
 * needs no session: it is a server component reading only bundled copy.
 *
 * It states the deal honestly: browsing is free and account-free; an account is
 * for saving, reminders and the assistant. No fabricated numbers, no invented
 * testimonials — the features below are the ones the app actually ships.
 */

async function getPageLocale(): Promise<Locale> {
  const stored = (await cookies()).get(LOCALE_COOKIE)?.value;
  return stored && isLocale(stored) ? stored : defaultLocale;
}

export async function generateMetadata(): Promise<Metadata> {
  const copy = dictionaries[await getPageLocale()].publicFeatures;
  return { title: copy.metaTitle, description: copy.metaDescription };
}

/** The bot's public link, when the deployment has one configured. */
async function botLink(): Promise<string | null> {
  try {
    const settings = await getTelegramSettings();
    const username = (settings.botUsername ?? "").trim().replace(/^@/, "");
    return /^[A-Za-z0-9_]{4,64}$/.test(username) ? `https://t.me/${username}` : null;
  } catch {
    return null;
  }
}

const FEATURE_ICONS = {
  match: Target,
  chancing: Gauge,
  deadlines: CalendarClock,
  documents: FileText,
  ai: Sparkles,
  visa: Plane,
  money: Wallet,
  telegram: Bot,
} as const;

const FEATURE_ORDER = ["match", "chancing", "deadlines", "documents", "ai", "visa", "money", "telegram"] as const;

export default async function FeaturesPage() {
  const locale = await getPageLocale();
  const copy = dictionaries[locale].publicFeatures;
  const bot = await botLink();

  const steps = [
    { title: copy.stepOneTitle, body: copy.stepOneBody },
    { title: copy.stepTwoTitle, body: copy.stepTwoBody },
    { title: copy.stepThreeTitle, body: copy.stepThreeBody },
  ];

  return (
    <LocaleProvider initialLocale={locale} initialMessages={clientMessagesFor(locale)}>
      <div className="min-h-screen bg-slate-50">
        <PublicCatalogHeader />

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          {/* ------------------------------------------------------------ hero */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
            <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-700">{copy.heroEyebrow}</p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              {copy.heroTitle}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-700">{copy.heroBody}</p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Link
                href="/?start=1"
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              >
                {copy.heroPrimary}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/scholarships"
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                {copy.heroSecondary}
              </Link>
              {bot && (
                <a
                  href={bot}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <Bot className="h-4 w-4" aria-hidden />
                  {copy.heroBot}
                </a>
              )}
            </div>
            <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-xs leading-relaxed text-emerald-900">
              {copy.freeNote}
            </p>
          </section>

          {/* --------------------------------------------------------- features */}
          <section className="mt-8" aria-labelledby="features-heading">
            <h2 id="features-heading" className="text-lg font-bold text-slate-900 sm:text-xl">
              {copy.featuresTitle}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{copy.featuresBody}</p>
            <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURE_ORDER.map((key) => {
                const Icon = FEATURE_ICONS[key];
                const entry = copy.features[key];
                return (
                  <li key={key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                      <Icon className="h-4.5 w-4.5" aria-hidden />
                    </span>
                    <h3 className="mt-2 text-sm font-bold text-slate-900">{entry.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{entry.body}</p>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* ------------------------------------------------------------ steps */}
          <section className="mt-8" aria-labelledby="steps-heading">
            <h2 id="steps-heading" className="text-lg font-bold text-slate-900 sm:text-xl">
              {copy.stepsTitle}
            </h2>
            <ol className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {steps.map((step, index) => (
                <li key={step.title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                  <p className="text-[11px] font-bold text-indigo-700">{index + 1}</p>
                  <h3 className="mt-1 text-sm font-bold text-slate-900">{step.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{step.body}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* -------------------------------------------------------------- cta */}
          <section className="mt-8 rounded-2xl border border-indigo-200 bg-indigo-50 p-6">
            <h2 className="text-base font-bold text-indigo-950 sm:text-lg">{copy.promoTitle}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-indigo-900">{copy.promoBody}</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Link
                href="/?start=1"
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              >
                {copy.heroPrimary}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/universities"
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-indigo-300 bg-white px-4 text-sm font-semibold text-indigo-800 hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <BriefcaseBusiness className="h-4 w-4" aria-hidden />
                {copy.backToCatalog}
              </Link>
            </div>
          </section>

          <p className="mt-6 border-t border-slate-200 pt-4 text-[11px] leading-relaxed text-slate-600">
            {dictionaries[locale].publicCatalog.independentGuide}
          </p>
        </main>
      </div>
    </LocaleProvider>
  );
}
