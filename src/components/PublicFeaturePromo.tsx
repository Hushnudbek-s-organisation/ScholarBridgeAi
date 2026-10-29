"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * The promo strip on every public catalogue page.
 *
 * A reader who arrived from a channel post lands on one scholarship, then maybe
 * the catalogue — and the app's actual product (fit score, admission chance,
 * deadline plan, documents, assistant) is invisible from there. This strip is
 * the one link back to `/features`, placed at the end of the content where the
 * reader has finished what they came for.
 *
 * It never blocks anything and it never demands an account: browsing stays
 * free, and the strip says so.
 */
export function PublicFeaturePromo({ className = "" }: { className?: string }) {
  const t = useTranslations("publicFeatures");

  return (
    <section
      aria-labelledby="public-feature-promo-heading"
      className={`rounded-2xl border border-indigo-200 bg-indigo-50 p-5 ${className}`}
    >
      <h2
        id="public-feature-promo-heading"
        className="flex items-center gap-2 text-sm font-bold text-indigo-950 sm:text-base"
      >
        <Sparkles className="h-4 w-4 text-indigo-700" aria-hidden />
        {t("promoTitle")}
      </h2>
      <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-indigo-900 sm:text-sm">{t("promoBody")}</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Link
          href="/features"
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          {t("promoCta")}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
        <Link
          href="/?start=1"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-indigo-300 bg-white px-4 text-sm font-semibold text-indigo-800 hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          {t("promoStart")}
        </Link>
      </div>
    </section>
  );
}
