"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Quote, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

const ITEMS = [
  {
    quote: "ScholarBridge made my SOP honest and strong — I got into KAIST with a full grant. No fake promises, just clear steps.",
    by: "Azizbek · KAIST, South Korea",
    uni: "QS #38 · €0 tuition + stipend",
  },
  {
    quote: "The chancing fit was brutally honest. I loved it — saved me $2k on useless applications and I landed at TUM.",
    by: "Dilnoza · TUM, Germany",
    uni: "Fit 88% · Admitted 2025",
  },
  {
    quote: "I checked everything in Uzbek, my mom in Russian. Same quality, no machine-translation bugs.",
    by: "Sardor · U Toronto, Canada",
    uni: "3 tillarda bir xil sifat",
  },
];

export function PremiumTestimonials() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setI((v) => (v + 1) % ITEMS.length), 4600);
    return () => clearInterval(id);
  }, [paused]);
  const cur = ITEMS[i];
  return (
    <section className="border-b border-slate-200 bg-white py-8 dark:border-slate-800 dark:bg-surface sm:py-10">
      <div className="mx-auto w-[min(1180px,94%)] md:pr-14 xl:pr-40 2xl:pr-28">
        <div className="mb-6 text-center">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-300">02 · Talabalar fikri</div>
          <h2 className="mt-2 text-[28px] font-black tracking-[-0.03em] text-slate-900 dark:text-white sm:text-[32px]">Ishonch qozongan natijalar</h2>
          <p className="mx-auto mt-2 max-w-[560px] text-sm leading-relaxed text-slate-600 dark:text-slate-300">Hech qanday yolg‘on va’dasiz — faqat natija. Har bir hikoya tekshirilgan.</p>
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
          <div className="relative mt-3 min-h-[120px] sm:min-h-[96px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                <p className="text-lg font-medium leading-relaxed text-slate-900 dark:text-white sm:text-xl">“{cur.quote}”</p>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full border border-slate-200 bg-canvas px-3 py-1.5 font-bold text-slate-700 dark:border-slate-700 dark:bg-canvas dark:text-slate-200">{cur.by}</span>
                  <span className="rounded-full bg-indigo-600 px-3 py-1.5 font-black text-white dark:bg-indigo-500">{cur.uni}</span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="mt-6 flex items-center justify-between">
            <div className="flex gap-1.5">
              {ITEMS.map((_, idx) => (
                <button
                  key={idx}
                  aria-label={`Go to slide ${idx + 1}`}
                  onClick={() => setI(idx)}
                  className={`h-1.5 rounded-full transition-all ${idx === i ? "w-6 bg-indigo-600 dark:bg-indigo-400" : "w-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300"}`}
                />
              ))}
            </div>
            <div className="flex gap-1">
              <Button variant="unstyled" aria-label="Previous" onClick={() => setI((v) => (v - 1 + ITEMS.length) % ITEMS.length)} className="grid h-9 w-9 place-items-center rounded-control border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-surface dark:hover:bg-white/10">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="unstyled" aria-label="Next" onClick={() => setI((v) => (v + 1) % ITEMS.length)} className="grid h-9 w-9 place-items-center rounded-control border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-surface dark:hover:bg-white/10">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
