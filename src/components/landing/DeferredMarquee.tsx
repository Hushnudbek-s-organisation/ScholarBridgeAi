"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { campusPhotoSrc, onWikimediaThumbError } from "@/lib/wikimediaThumb";
import { MARQUEE_ROW_1, MARQUEE_ROW_2, MARQUEE_ROW_3, type MarqueeUniversityItem } from "./marqueeRows";
import { isLiteMotionSync } from "@/lib/liteMotion";

function SectionIndex({ n, label }: { n: string; label: string }) {
  return (
    <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-300">
      <span className="grid h-6 w-6 place-items-center rounded-full bg-indigo-600 text-xs font-black text-white dark:bg-indigo-500">{n}</span>
      {label}
    </div>
  );
}

export function DeferredMarquee({ onStart }: { onStart: () => void }) {
  const tIndex = useTranslations("landing");
  const [lite, setLite] = useState(() => isLiteMotionSync());
  useEffect(() => {
    // liteMotion subscription for marquee speed
    const { subscribeLiteMotion } = require("@/lib/liteMotion") as { subscribeLiteMotion: (cb: (v: boolean) => void) => () => void };
    return subscribeLiteMotion(setLite);
  }, []);
  const sectionRef = useRef<HTMLElement>(null);

  // PR #132 moved the marquee into an idle-deferred (ssr:false) chunk but left
  // the campus-photo lazy loader behind in LandingPage.tsx as a marker comment.
  // Result: all 48 <img data-campus-src> nodes rendered, none ever got a `src`,
  // and e2e/first-paint.spec.ts timed out. The two observers below are the real
  // behaviour from the pre-refactor UniversityCampusMarquee, restored next to
  // the images they observe. `sectionRef` is stable, so [] is correct.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const paused = !entry.isIntersecting;
          el.classList.toggle("sb-marquee-paused", paused);
          el.setAttribute("data-paused", paused ? "true" : "false");
        }
      },
      { rootMargin: "160px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const images = el.querySelectorAll<HTMLImageElement>("img[data-campus-src]");
    const load = (image: HTMLImageElement) => {
      const src = image.dataset.campusSrc;
      if (src) image.src = src;
    };
    if (typeof IntersectionObserver === "undefined") {
      images.forEach(load);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        load(entry.target as HTMLImageElement);
        observer.unobserve(entry.target);
      }
    }, { rootMargin: "160px" });
    images.forEach((image) => observer.observe(image));
    return () => observer.disconnect();
  }, []);
  const renderRow = (items: MarqueeUniversityItem[], animClass: string) => (
    <div className={`flex gap-3 ${animClass} overflow-hidden`}>
      {[0, 1].map((copy) => (
        <div key={copy} className="flex shrink-0 gap-3 px-1.5" aria-hidden={copy === 1 ? true : undefined}>
          {items.map((university) => (
            <Button
              variant="unstyled"
              key={university.name}
              type="button"
              tabIndex={copy === 1 ? -1 : undefined}
              onClick={onStart}
              className="group relative w-64 shrink-0 rounded-overlay border border-slate-200/90 bg-white p-2 text-left shadow-xs transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 sm:w-72 dark:border-slate-700/80 dark:bg-surface dark:hover:border-indigo-400"
            >
              <span className="relative block h-32 w-full overflow-hidden rounded-surface border border-slate-200/70 bg-slate-100 dark:border-slate-700/70 dark:bg-slate-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  data-campus-src={campusPhotoSrc(university.url, 320)}
                  onError={onWikimediaThumbError(university.url)}
                  crossOrigin="anonymous"
                  alt={university.landmark}
                  width={288}
                  height={128}
                  sizes="(max-width: 640px) 256px, 288px"
                  loading="lazy"
                  fetchPriority="low"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />
                <span className="absolute left-2 top-2 rounded-control bg-indigo-600/95 px-2 py-0.5 text-xs font-black text-white shadow-xs">{`QS #${university.qsRank}`}</span>
                <span className="absolute right-2 top-2 rounded-control bg-white/95 px-2 py-0.5 text-xs font-bold text-slate-950">{university.country}</span>
                <span className="absolute bottom-2 left-2.5 right-2.5 text-white">
                  <span className="block truncate text-xs font-black leading-tight">{university.name}</span>
                  <span className="block truncate text-xs text-slate-300">{university.landmark}</span>
                </span>
              </span>
            </Button>
          ))}
        </div>
      ))}
    </div>
  );
  return (
    <section ref={sectionRef} id="campuses" aria-labelledby="university-marquee-title" data-paused="false" className="sb-cv-section sb-marquee-fade relative z-10 border-y border-slate-200/80 bg-slate-100/60 py-8 dark:border-slate-800 dark:bg-canvas sm:py-10">
      <div className="mx-auto mb-5 w-[min(1180px,94%)] md:pr-14 xl:pr-40 2xl:pr-28">
        <SectionIndex n="02" label={tIndex("secCampuses")} />
        <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-indigo-700 dark:text-indigo-300">{tIndex("marqueeBadge")}</span>
        <h2 id="university-marquee-title" className="mt-2 text-2xl font-black tracking-[-0.03em] text-slate-950 dark:text-white sm:text-3xl">{tIndex("marqueeTitle")}</h2>
      </div>
      <div className="space-y-3 overflow-hidden">
        {renderRow(MARQUEE_ROW_1, "sb-marquee-right")}
        {renderRow(MARQUEE_ROW_2, "sb-marquee-left")}
        {!lite && renderRow(MARQUEE_ROW_3, "sb-marquee-right-slow")}
      </div>
    </section>
  );
}
