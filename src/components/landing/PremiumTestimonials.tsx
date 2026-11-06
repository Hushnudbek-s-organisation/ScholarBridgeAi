"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { m as Motion, AnimatePresence } from "framer-motion";
import { Quote, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Landing examples. The prior copy named specific universities, funding
 * amounts, savings and a dated admission result without proof, and claimed
 * every story was verified. These are now explicitly labelled product-demo
 * examples in uz/ru/en.
 */
export function PremiumTestimonials() {
  const t = useTranslations("landing");
  const items = [
    { quote: t("testimonial1Quote"), by: t("testimonial1By"), badge: t("testimonial1Badge") },
    { quote: t("testimonial2Quote"), by: t("testimonial2By"), badge: t("testimonial2Badge") },
    { quote: t("testimonial3Quote"), by: t("testimonial3By"), badge: t("testimonial3Badge") },
  ];
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setI((v) => (v + 1) % items.length), 4600);
    return () => clearInterval(id);
  }, [paused, items.length]);

  const cur = items[i];
  return (
    <section className="border-b border-slate-200 bg-white py-8 dark:border-slate-800 dark:bg-surface sm:py-10">
      <div className="mx-auto w-[min(1180px,94%)] md:pr-14 xl:pr-40 2xl:pr-28">
        <div className="mb-6 text-center">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-300">{t("testimonialsEyebrow")}</div>
          <h2 className="mt-2 text-[28px] font-black tracking-[-0.03em] text-slate-900 dark:text-white sm:text-[32px]">{t("testimonialsTitle")}</h2>
          <p className="mx-auto mt-2 max-w-[560px] text-sm leading-relaxed text-slate-600 dark:text-slate-300">{t("testimonialsSubtitle")}</p>
        </div>
        <div
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
          className="relative mx-auto max-w-[900px] overflow-hidden rounded-overlay border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-surface sm:p-8"
        >
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-50 blur-2xl dark:bg-indigo-500/10" aria-hidden />
          <div className="pointer-events-none absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-violet-50 blur-2xl dark:bg-violet-500/10" aria-hidden />
          <Quote className="h-7 w-7 text-indigo-200 dark:text-indigo-400/40" aria-hidden />
          <p data-testid="testimonial-demo-label" className="mt-3 inline-flex rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-sm font-black uppercase tracking-wide text-amber-900 dark:border-amber-600/50 dark:bg-amber-500/10 dark:text-amber-200">
            {t("testimonialsDemoLabel")}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{t("testimonialsDemoNote")}</p>
          <div className="relative mt-3 min-h-[120px] sm:min-h-[96px]">
            <AnimatePresence mode="wait">
              <Motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                <p className="text-lg font-medium leading-relaxed text-slate-900 dark:text-white sm:text-xl">“{cur.quote}”</p>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full border border-slate-200 bg-canvas px-3 py-1.5 font-bold text-slate-700 dark:border-slate-700 dark:bg-canvas dark:text-slate-200">{cur.by}</span>
                  <span className="rounded-full bg-indigo-600 px-3 py-1.5 font-black text-white dark:bg-indigo-500">{cur.badge}</span>
                </div>
              </Motion.div>
            </AnimatePresence>
          </div>
          <div className="mt-6 flex items-center justify-between">
            <div className="flex gap-1.5">
              {items.map((_, idx) => (
                <Button
                  variant="unstyled"
                  key={idx}
                  aria-label={`${t("testimonialSlide")} ${idx + 1}`}
                  onClick={() => setI(idx)}
                  aria-current={idx === i ? "true" : undefined}
                  className={`h-2.5 min-h-0 rounded-full transition-all ${idx === i ? "w-6 bg-indigo-600 dark:bg-indigo-400" : "w-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300"}`}
                />
              ))}
            </div>
            <div className="flex gap-1">
              <Button variant="unstyled" aria-label={t("testimonialPrevious")} onClick={() => setI((v) => (v - 1 + items.length) % items.length)} className="grid h-9 w-9 place-items-center rounded-control border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-surface dark:hover:bg-white/10">
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </Button>
              <Button variant="unstyled" aria-label={t("testimonialNext")} onClick={() => setI((v) => (v + 1) % items.length)} className="grid h-9 w-9 place-items-center rounded-control border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-surface dark:hover:bg-white/10">
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
