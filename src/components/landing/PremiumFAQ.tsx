"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Landing FAQ. Previously six Uzbek-only hardcoded strings, including the
 * unsupported blanket claim that every university was verified. The answers
 * now distinguish verified rows from review-needed ones and are translated.
 */
export function PremiumFAQ() {
  const t = useTranslations("landing");
  const [open, setOpen] = useState<number | null>(0);
  const faqs = [
    { q: t("faq1Q"), a: t("faq1A") },
    { q: t("faq2Q"), a: t("faq2A") },
    { q: t("faq3Q"), a: t("faq3A") },
    { q: t("faq4Q"), a: t("faq4A") },
    { q: t("faq5Q"), a: t("faq5A") },
    { q: t("faq6Q"), a: t("faq6A") },
  ];

  return (
    <section className="border-b border-slate-200 bg-canvas py-8 dark:border-slate-800 sm:py-10">
      <div className="mx-auto w-[min(1180px,94%)] md:pr-14 xl:pr-40 2xl:pr-28">
        <div className="mx-auto max-w-[720px] text-center">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-300">{t("faqEyebrow")}</div>
          <h2 className="mt-2 text-3xl font-black tracking-[-0.035em] text-slate-900 dark:text-white sm:text-[36px]">{t("faqTitle")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{t("faqSubtitle")}</p>
        </div>
        <div className="mx-auto mt-6 max-w-[780px] divide-y divide-slate-200 overflow-hidden rounded-overlay border border-slate-200 bg-white dark:divide-slate-700 dark:border-slate-700 dark:bg-surface">
          {faqs.map((item, idx) => {
            const isOpen = open === idx;
            return (
              <div key={idx} className="group">
                <Button
                  variant="unstyled"
                  onClick={() => setOpen(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  aria-controls={`landing-faq-answer-${idx}`}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50/70 dark:hover:bg-white/[0.03]"
                >
                  <span className="text-sm font-bold text-slate-900 dark:text-white sm:text-[15px]">{item.q}</span>
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border transition ${isOpen ? "rotate-180 border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-300" : "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                    <ChevronDown className="h-4 w-4" aria-hidden />
                  </span>
                </Button>
                <div id={`landing-faq-answer-${idx}`} className={`grid transition-all ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                  <div className="overflow-hidden">
                    <p className="px-5 pb-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{item.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
