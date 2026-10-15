"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { HelpCircle, ChevronDown } from "lucide-react";
import { useLocaleContext } from "@/i18n/LocaleProvider";

export function FaqSection() {
  const t = useTranslations("faq");
  const { locale } = useLocaleContext();
  const faq = {
    title: t("title"),
    intro: t("intro"),
    items: [
      { question: t("items.product.question"), answer: t("items.product.answer") },
      { question: t("items.scores.question"), answer: t("items.scores.answer") },
      { question: t("items.scholarship.question"), answer: t("items.scholarship.answer") },
      { question: t("items.costs.question"), answer: t("items.costs.answer") },
      { question: t("items.gpaConversion.question"), answer: t("items.gpaConversion.answer") },
      { question: t("items.multiCurrency.question"), answer: t("items.multiCurrency.answer") },
      { question: t("items.elYurtUmidi.question"), answer: t("items.elYurtUmidi.answer") },
      { question: t("items.gksKorea.question"), answer: t("items.gksKorea.answer") },
      { question: t("items.sperrkontoGermany.question"), answer: t("items.sperrkontoGermany.answer") },
      { question: t("items.sponsorAffidavit.question"), answer: t("items.sponsorAffidavit.answer") },
      { question: t("items.englishWaivers.question"), answer: t("items.englishWaivers.answer") },
      { question: t("items.visaMockInterview.question"), answer: t("items.visaMockInterview.answer") },
      { question: t("items.documentApostille.question"), answer: t("items.documentApostille.answer") },
      { question: t("items.proPlanValue.question"), answer: t("items.proPlanValue.answer") },
    ],
  };
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: locale,
    mainEntity: faq.items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <section className="mt-10" aria-label={faq.title}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c") }}
      />
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-700 dark:bg-slate-900 sm:p-7">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/50">
            <HelpCircle className="h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white sm:text-xl">{faq.title}</h2>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{faq.intro}</p>
          </div>
        </div>
        <div className="space-y-2.5">
          {faq.items.map((item, idx) => (
            <details key={item.question} className="group rounded-xl border border-slate-200 bg-slate-50/50 transition-colors open:border-indigo-200 open:bg-white dark:border-slate-700 dark:bg-slate-800/50 dark:open:border-indigo-700 dark:open:bg-slate-900">
              <summary className="flex min-h-11 cursor-pointer list-none select-none items-center gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                <span className="w-6 shrink-0 text-xs font-extrabold text-indigo-700 dark:text-indigo-300">{String(idx + 1).padStart(2, "0")}</span>
                <h3 className="flex-1 text-sm font-bold text-slate-900 dark:text-white">{item.question}</h3>
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 group-open:rotate-180 dark:text-slate-300" aria-hidden="true" />
              </summary>
              <p className="px-4 pb-4 pl-[52px] text-sm leading-relaxed text-slate-700 dark:text-slate-200">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
