"use client";

import { BrandingImage } from "./BrandingImage";
import React, { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { m as Motion } from "framer-motion";
import { Reveal, RevealGroup, RevealItem } from "./motion";
import { staggerParent } from "./motion/variants";
import { ThemeSwitch } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { SVG_COLORS } from "@/components/ui/tokens";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
// main (PR #132) moved the testimonials/FAQ and the QS marquee into
// idle-deferred chunks. The two direct imports below are intentionally NOT
// restored: DeferredBelowFold renders both of them dynamically, so keeping
// the eager imports would defeat the first-load budget and leave unused
// imports (lint error). Our next/image fix is kept for the two photos that
// still render inline in this file.
const DeferredBelowFold = dynamic(
  () => import("./landing/DeferredBelowFold").then((m) => m.DeferredBelowFold),
  { ssr: false, loading: () => null },
);
const DeferredMarquee = dynamic(
  () => import("./landing/DeferredMarquee").then((m) => m.DeferredMarquee),
  { ssr: false, loading: () => null },
);
import { isLiteMotionSync, subscribeLiteMotion } from "@/lib/liteMotion";
import { PUBLIC_TELEGRAM_CHANNEL_URL, PUBLIC_TELEGRAM_HANDLE } from "@/lib/publicLinks";
import { useTranslations, useLocale } from "next-intl";

/** Hero children: each one rises a beat after the previous. */
const heroGroup = staggerParent(0.1, 0.08);
const heroItem = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  },
};
/** Static hero copy keeps LCP text visible on first paint (no SSR opacity:0). */
const heroStaticItem = {
  hidden: { opacity: 1, y: 0 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  },
};
import {
  ArrowRight,
  Award,
  Bot,
  CheckCircle2,
  CheckSquare,
  Compass,
  Crown,
  ExternalLink,
  FileText,
  FolderOpen,
  Gift,
  GraduationCap,
  HandCoins,
  LayoutDashboard,
  ListChecks,
  MessagesSquare,
  PiggyBank,
  Plane,
  Route,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Wallet,
} from "lucide-react";
import {
  NAV_GROUPS,
  NAV_GROUP_I18N,
  NAV_SECTIONS,
  NAV_SECTION_LABEL_KEYS,
  NAV_UTILITY_SECTIONS,
} from "@/lib/navSections";
import { AppNote } from "./AppNote";
import { toWikimediaThumb, onWikimediaThumbError, viaImageProxy, campusPhotoSrc } from "@/lib/wikimediaThumb";
import { Button } from "@/components/ui/Button";
import { MotionButton } from "@/components/ui/MotionButton";

export interface MarqueeUniversityItem {
  qsRank: number;
  qsName: string;
  name: string;
  country: string;
  landmark: string;
  url: string;
}
// Marquee data lives in ./landing/marqueeRows.ts (idle-deferred) to keep first-load <1200KB.
// Badge must stay numeric: {`QS #${university.qsRank}`}

export const LANDING_PHOTOS = {
  heroStudentsMain:
    "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=85",
  heroCampusGraduation:
    "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=800&q=80",
  // Campus photos are raw Wikimedia originals (multi-MB camera scans) at the
  // source; convert each to a CDN-cached 640px thumbnail (~40 KB) HERE so
  // every consumer — current or future — gets the fast URL by construction.
  // The onError fallback in consumers can still reach the original via the
  // marquee pattern if a thumb ever misses.
  campusUsa: viaImageProxy(toWikimediaThumb(
    "https://upload.wikimedia.org/wikipedia/commons/9/9e/Great_Dome%2C_MIT_-_IMG_8390.JPG",
    640
  )),
  campusUk: viaImageProxy(toWikimediaThumb(
    "https://upload.wikimedia.org/wikipedia/commons/3/3d/Radcliffe_Camera%2C_Oxford.jpg",
    640
  )),
  campusGermany: viaImageProxy(toWikimediaThumb(
    "https://upload.wikimedia.org/wikipedia/commons/b/bb/Technische_Universit%C3%A4t_M%C3%BCnchen.jpg",
    640
  )),
  campusSwiss: viaImageProxy(toWikimediaThumb(
    "https://upload.wikimedia.org/wikipedia/commons/7/7c/ETH_Z%C3%BCrich_2015.jpg",
    640
  )),
  campusCanada: viaImageProxy(toWikimediaThumb(
    "https://upload.wikimedia.org/wikipedia/commons/c/c8/University_College%2C_University_of_Toronto%2C_Canada.jpg",
    640
  )),
  campusAsia: viaImageProxy(toWikimediaThumb(
    "https://upload.wikimedia.org/wikipedia/commons/0/02/KAIST_from_across_Gapcheon.jpg",
    640
  )),
  step1Profile:
    "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=700&q=80",
  step2UniversityMatch:
    "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=700&q=80",
  step3SopWriting:
    "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=700&q=80",
  step4VisaDeparture:
    "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=700&q=80",
  ctaAirplaneSunset:
    "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1400&q=80",
} as const;

interface LandingPageProps {
  onStart: () => void;
  onEnterApp?: () => void;
  onSignIn?: () => void;
}

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth" });
}

/**
 * THE single shared scroll engine for every animated overlay (kinetic HUD,
 * ruler tape, flight). One passive scroll listener, ONE damped rAF loop
 * (`smooth += (target - smooth) * 0.15`), zero React state: subscribers are
 * plain callbacks that write DOM styles directly. The loop parks itself the
 * instant every subscriber is settled, so idle scrolling costs nothing.
 * `velocity()` feeds the afterburner/contrail reactions to fast scrolls.
 */
type ScrollSubscriber = () => void;
const scrollEngine = (() => {
  let smooth = 0;
  let target = 0;
  let velocity = 0;
  let raf = 0;
  let bound = false;
  let vw = 0;
  let vh = 0;
  let maxScroll = 1;
  let resizeObserver: ResizeObserver | null = null;
  const subs = new Set<ScrollSubscriber>();
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
  const refreshDimensions = () => {
    vw = window.innerWidth || 1;
    vh = window.innerHeight || 1;
    maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
  };
  const onScroll = () => {
    target = clamp01(window.scrollY / maxScroll);
    if (!raf) raf = requestAnimationFrame(step);
  };
  const onResize = () => {
    refreshDimensions();
    target = clamp01(window.scrollY / maxScroll);
    subs.forEach((fn) => fn());
    if (!raf) raf = requestAnimationFrame(step);
  };
  const step = () => {
    raf = 0;
    const delta = target - smooth;
    if (Math.abs(delta) > 0.0004) {
      const moved = delta * 0.15;
      smooth += moved;
      velocity = Math.abs(moved) * 0.8 + velocity * 0.2;
      subs.forEach((fn) => fn());
      raf = requestAnimationFrame(step);
    } else if (smooth !== target) {
      smooth = target;
      velocity = 0;
      subs.forEach((fn) => fn());
    } else if (velocity !== 0) {
      velocity = 0;
      subs.forEach((fn) => fn());
    }
  };
  const initialize = () => {
    if (bound) return;
    bound = true;
    // Initial dimensions are captured once when animation subscribers mount;
    // subsequent updates come only from ResizeObserver / window resize.
    refreshDimensions();
    target = clamp01(window.scrollY / maxScroll);
    smooth = target;
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(onResize);
      resizeObserver.observe(document.documentElement);
    }
  };
  const subscribe = (fn: ScrollSubscriber) => {
    initialize();
    subs.add(fn);
    fn();
    if (!raf) raf = requestAnimationFrame(step);
    return () => {
      subs.delete(fn);
      if (subs.size === 0) {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onResize);
        resizeObserver?.disconnect();
        resizeObserver = null;
        bound = false;
      }
    };
  };
  return {
    initialize,
    subscribe,
    progress: () => smooth,
    velocity: () => velocity,
    viewport: () => ({ vw, vh }),
    /** Re-align after cached geometry changes without doing a layout read. */
    settle() {
      target = clamp01(window.scrollY / maxScroll);
      smooth = target;
      if (!raf) raf = requestAnimationFrame(step);
    },
  };
})();

/** Reduced-motion overlay: paint once, never subscribe to scrolling. */
function paintOnceUnderReducedMotion(paint: () => void, reduce: boolean) {
  if (typeof window === "undefined") return () => {};
  if (reduce) {
    paint();
    return () => {};
  }
  return scrollEngine.subscribe(paint);
}

/**
 * PhotoCraft-style editorial index marker (`02 / CAMPUSES`): a monospace
 * station number between two architectural hairlines, above each section's
 * localized eyebrow. Decoration with a real reading order — it says where the
 * student is on the page, nothing more.
 */
function SectionIndex({
  n,
  label,
  onDark = false,
}: {
  n: string;
  label: string;
  onDark?: boolean;
}) {
  return (
    <div
      className={`mb-3 inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.18em] ${
        onDark ? "text-indigo-300" : "text-indigo-600 dark:text-indigo-400"
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-px w-6 ${onDark ? "bg-white/20" : "bg-slate-200 dark:bg-slate-800"}`}
      />
      <span>
        {n} / {label}
      </span>
      <span
        aria-hidden="true"
        className={`h-px w-6 ${onDark ? "bg-white/20" : "bg-slate-200 dark:bg-slate-800"}`}
      />
    </div>
  );
}

/**
 * The six kinetic section words. Labels are resolved per-locale HERE (never
 * raw i18n keys — the landing must not leak `landing.*` into the DOM) and the
 * whole HUD is aria-hidden: it mirrors navigation that already exists as real
 * accessible controls (header nav, section index markers), so the animation
 * duplicates nothing for assistive tech or the SSR text checks.
 */
const HUD_SECTIONS = [
  { id: "top", word: { en: "SCHOLARBRIDGE", uz: "BOSH SAHIFA", ru: "ГЛАВНАЯ" } },
  { id: "campuses", word: { en: "TOP CAMPUSES", uz: "TOP KAMPUSLAR", ru: "ТОП КАМПУСЫ" } },
  { id: "how", word: { en: "HOW IT WORKS", uz: "QANDAY ISHLAYDI", ru: "КАК РАБОТАЕТ" } },
  { id: "features", word: { en: "HIGHLIGHTS", uz: "IMKONIYATLAR", ru: "ВОЗМОЖНОСТИ" } },
  { id: "chancing", word: { en: "PROGRAMME FIT", uz: "DASTUR MOSLIGI", ru: "СООТВЕТСТВИЕ" } },
  { id: "roadmap", word: { en: "GET STARTED", uz: "YO'L XARITASI", ru: "ДОРОЖНАЯ КАРТА" } },
] as const;

/**
 * PhotoCraft-style kinetic HUD, driven entirely by direct DOM writes from
 * the shared scroll engine (zero useState per frame):
 *
 *  • KINETIC WORDS — every upcoming section title sits stacked in the
 *    bottom-right; as its section reaches the viewport the word PEELS off the
 *    stack, glides up the right margin while swelling to ~3.15x with a white/
 *    sky glow, then shrinks back into the top-right "already read" stack.
 *    Position is continuous (cubic-eased travel + sine-bell scale), never a
 *    toggled class, so the animation is scrubbable in both directions.
 *  • ZOOMED ALTIMETER TAPE — a 0–100 ruler (major labels every 5, four minor
 *    ticks between) translates against a fixed glowing laser cursor; the
 *    cursor rides `0.22 + 0.52 · progress` of the viewport with a
 *    zero-padded `033 %` readout, exactly like a HUD altitude tape.
 */
function useLiteMotionTier(): boolean {
  const [lite, setLite] = React.useState(false);
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync with device tier on mount
    setLite(isLiteMotionSync());
    return subscribeLiteMotion(setLite);
  }, []);
  return lite;
}

function PhotoCraftKineticHud({ lite: liteProp }: { lite?: boolean } = {}) {
  const locale = useLocale();
  const wordRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const tapeRef = React.useRef<HTMLDivElement | null>(null);
  const laserRef = React.useRef<HTMLDivElement | null>(null);
  const readoutRef = React.useRef<HTMLSpanElement | null>(null);
  const liteDetected = useLiteMotionTier();
  const lite = liteProp ?? liteDetected;

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    scrollEngine.initialize();
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || lite;

    const N = HUD_SECTIONS.length;
    const ROW_GAP = 22;
    const TOP_STACK_START_Y = 82;
    const WINDOW = 0.58;
    const prevStates: Array<string | undefined> = Array(N);
    const prevTransforms: Array<string | undefined> = Array(N);
    const prevOpacities: Array<string | undefined> = Array(N);
    let prevVh = -1;
    let prevReadout = -1;

    const paint = () => {
      const smooth = scrollEngine.progress();
      const { vh } = scrollEngine.viewport();
      const height = vh || 900;
      const viewportChanged = height !== prevVh;
      const BOTTOM_STACK_END_Y = height - 36;
      const s = smooth * (N - 1);

      for (let i = 0; i < N; i++) {
        const el = wordRefs.current[i];
        if (!el) continue;
        const topSlotY = TOP_STACK_START_Y + i * ROW_GAP;
        const bottomSlotY = BOTTOM_STACK_END_Y - (N - 1 - i) * ROW_GAP;
        const delta = i - s;
        const state = delta <= -WINDOW ? "passed" : delta >= WINDOW ? "upcoming" : (() => {
          const t = Math.max(0, Math.min(1, (WINDOW - delta) / (2 * WINDOW)));
          return Math.pow(Math.sin(t * Math.PI), 0.72) > 0.35 ? "active" : "transition";
        })();
        if (!viewportChanged && prevStates[i] === state && (state === "passed" || state === "upcoming")) continue;

        let transform: string;
        let opacity: string;
        // Hero hududida - yirik SCHOLARBRIDGE hero mock ustiga chiqmasin (p<0.04)
        const inHero = smooth < 0.04;
        if (state === "passed") {
          transform = `translate3d(0px, ${topSlotY.toFixed(1)}px, 0px) scale(1)`;
          opacity = inHero ? "0.0" : "0.48";
        } else if (state === "upcoming") {
          transform = `translate3d(0px, ${bottomSlotY.toFixed(1)}px, 0px) scale(1)`;
          opacity = inHero ? "0.0" : "0.48";
        } else {
          if (inHero) {
            transform = `translate3d(0px, ${bottomSlotY.toFixed(1)}px, 0px) scale(1)`;
            opacity = "0.0";
          } else {
            const rawT = (WINDOW - delta) / (2 * WINDOW);
            const t = Math.max(0, Math.min(1, rawT));
            const easeT = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            const currentY = bottomSlotY + (topSlotY - bottomSlotY) * easeT;
            const bell = Math.pow(Math.sin(t * Math.PI), 0.72);
            const scale = 1 + bell * (lite ? 0.8 : 1.4);
            const shiftX = -bell * (lite ? 2 : 4);
            transform = `translate3d(${shiftX.toFixed(1)}px, ${currentY.toFixed(1)}px, 0px) scale(${scale.toFixed(3)})`;
            opacity = (0.48 + bell * (lite ? 0.2 : 0.35)).toFixed(3);
          }
        }
        if (prevTransforms[i] !== transform) {
          el.style.transform = transform;
          prevTransforms[i] = transform;
        }
        if (prevOpacities[i] !== opacity) {
          el.style.opacity = opacity;
          prevOpacities[i] = opacity;
        }
        if (prevStates[i] !== state) {
          el.dataset.state = state;
          prevStates[i] = state;
        }
      }
      prevVh = height;

      const exactVal = smooth * 100;
      const laserY = height * (0.22 + 0.52 * smooth);
      if (tapeRef.current) {
        const transform = `translate3d(0px, ${(laserY - exactVal * 24).toFixed(1)}px, 0px)`;
        if (tapeRef.current.style.transform !== transform) tapeRef.current.style.transform = transform;
      }
      if (laserRef.current) {
        const transform = `translate3d(0px, ${laserY.toFixed(1)}px, 0px)`;
        if (laserRef.current.style.transform !== transform) laserRef.current.style.transform = transform;
      }
      const rounded = Math.round(exactVal);
      if (readoutRef.current && rounded !== prevReadout) {
        readoutRef.current.textContent = `${String(rounded).padStart(3, "0")} %`;
        prevReadout = rounded;
      }
    };

    const unsub = paintOnceUnderReducedMotion(paint, !!reducedMotion);
    return unsub;
  }, [locale, lite]);

  const ticks = [];
  for (let val = 0; val <= 100; val += 5) {
    const major = val % 5 === 0;
    ticks.push(
      <div
        key={val}
        className="absolute left-0 flex w-full items-center gap-1.5 pl-1"
        style={{ top: `${val * 24}px` }}
      >
        {major ? (
          <span className="font-mono text-xs font-semibold leading-none text-slate-500 dark:text-zinc-400">
            {val}
          </span>
        ) : null}
        <span
          aria-hidden="true"
          className={
            major
              ? "h-px w-3.5 bg-slate-400 dark:bg-zinc-300"
              : "h-px w-2 bg-slate-400 dark:bg-zinc-500"
          }
        />
      </div>
    );
  }

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-20 hidden select-none md:block print:hidden">
      {/* Zoomed altimeter tape + glowing laser cursor (far right edge) — indigo/violet tuned. */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-14 overflow-hidden">
        <div
          ref={tapeRef}
          className="sb-gpu-transform sb-kinetic-track absolute left-0 top-0 w-full"
        >
          {ticks}
        </div>
        <div
          ref={laserRef}
          className="sb-gpu-transform absolute right-0 top-0 w-full"
        >
          <span className="sb-hud-laser block h-[2px] w-full" />
          <span
            ref={readoutRef}
            className="sb-hud-readout mt-1 block pr-1.5 text-right font-mono text-xs font-bold tracking-wider text-indigo-600 dark:text-indigo-300"
          >
            000 %
          </span>
        </div>
      </div>
      {/* Kinetic section words — visible only on wide viewports to avoid overlap at 820px. */}
      <div className="hidden xl:block">
        {HUD_SECTIONS.map((sec, idx) => (
          <Button variant="unstyled"
            key={sec.id}
            ref={(el) => {
              wordRefs.current[idx] = el;
            }}
            type="button"
            tabIndex={-1}
            onClick={() => scrollToId(sec.id)}
            className="sb-kinetic-word pointer-events-auto fixed right-12 top-0 cursor-pointer select-none whitespace-nowrap font-sans text-xs font-black uppercase tracking-[0.12em] text-slate-700 transition-colors hover:text-indigo-600 data-[state=active]:text-indigo-700 dark:text-zinc-300 dark:hover:text-white dark:data-[state=active]:text-white"
          >
            {sec.word[locale as "en" | "uz" | "ru"] ?? sec.word.en}
          </Button>
        ))}
      </div>
    </div>
  );
}

/** Count-up for real numbers only; respects prefers-reduced-motion and only runs once in view. */
function CountUp({ value, suffix = "", className }: { value: number; suffix?: string; className?: string }) {
  const ref = React.useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = React.useState(value);
  const hasAnimated = React.useRef(false);
  // Reduced-motion is already handled by initializing display to final value;
  // only animate when the user has not asked for reduced motion.
  React.useEffect(() => {
    if (typeof window === "undefined" || !ref.current) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || isLiteMotionSync();
    if (reduce) return;
    const el = ref.current;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !hasAnimated.current) {
            hasAnimated.current = true;
            let start: number | null = null;
            const duration = 900;
            const step = (ts: number) => {
              if (start === null) start = ts;
              const p = Math.min(1, (ts - start) / duration);
              const eased = 1 - Math.pow(1 - p, 3);
              setDisplay(Math.round(value * eased));
              if (p < 1) requestAnimationFrame(step);
              else setDisplay(value);
            };
            requestAnimationFrame(step);
          }
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);
  return (
    <span ref={ref} className={className}>
      {display}
      {suffix}
    </span>
  );
}

/* --------------------- How-it-works mini-UIs (CSS/SVG, zero Unsplash) --------------------- */

function ProfileMini({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="rounded-surface border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-2.5">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-indigo-600 text-sm font-black text-white dark:bg-indigo-500">AS</div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-slate-900 dark:text-white">Aziza S.</div>
          <div className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{t("mini1Major")}</div>
        </div>
        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-black text-emerald-700 dark:text-emerald-300">✓ {t("mini1Coverage")}</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-control border border-slate-200 bg-canvas px-2 py-1.5 text-center dark:border-slate-800 dark:bg-canvas">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">GPA</div>
          <div className="text-sm font-black text-slate-900 dark:text-white">{t("mini1Gpa")}</div>
        </div>
        <div className="rounded-control border border-slate-200 bg-canvas px-2 py-1.5 text-center dark:border-slate-800 dark:bg-canvas">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Test</div>
          <div className="text-sm font-black text-slate-900 dark:text-white">{t("mini1Test")}</div>
        </div>
        <div className="rounded-control border border-slate-200 bg-canvas px-2 py-1.5 text-center dark:border-slate-800 dark:bg-canvas">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Budget</div>
          <div className="text-sm font-black text-slate-900 dark:text-white">{t("mini1Budget")}</div>
        </div>
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="h-full w-[73%] rounded-full bg-indigo-600 dark:bg-indigo-400" />
      </div>
    </div>
  );
}
function MatchMini({ t }: { t: ReturnType<typeof useTranslations> }) {
  const rows = [
    { title: t("mini2Row1"), tag: t("mini2Row1Tag"), tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
    { title: t("mini2Row2"), tag: t("mini2Row2Tag"), tone: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300" },
    { title: t("mini2Row3"), tag: t("mini2Row3Tag"), tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  ];
  return (
    <div className="rounded-surface border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Matches</span>
        <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-black text-white dark:bg-indigo-500">3 new</span>
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.title} className="flex items-center justify-between rounded-control border border-slate-200 bg-canvas px-2.5 py-2 dark:border-slate-800 dark:bg-canvas">
            <span className="truncate pr-2 text-sm font-semibold text-slate-700 dark:text-slate-200">{r.title}</span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-black ${r.tone}`}>{r.tag}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
function RoadmapMini({ t }: { t: ReturnType<typeof useTranslations> }) {
  const tasks = [
    { title: t("mini3Task1"), state: t("mini3Task1State"), tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
    { title: t("mini3Task2"), state: t("mini3Task2State"), tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300", dot: "bg-amber-500" },
    { title: t("mini3Task3"), state: t("mini3Task3State"), tone: "bg-sky-500/15 text-sky-700 dark:text-sky-300", dot: "bg-sky-500" },
  ];
  return (
    <div className="rounded-surface border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Roadmap · This month</div>
      <div className="relative pl-4">
        <span aria-hidden className="absolute left-1.5 top-1 bottom-1 w-px bg-slate-200 dark:bg-slate-700" />
        <div className="space-y-2.5">
          {tasks.map((task) => (
            <div key={task.title} className="relative flex items-center justify-between gap-2">
              <span className={`absolute -left-4 grid h-2.5 w-2.5 place-items-center rounded-full ${task.dot}`} aria-hidden />
              <span className="truncate pr-2 text-sm font-medium text-slate-700 dark:text-slate-200">{task.title}</span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${task.tone}`}>{task.state}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
function TrackerMini({ t }: { t: ReturnType<typeof useTranslations> }) {
  const cols = [
    { label: t("mini4Col1"), pct: 100, color: "bg-emerald-500" },
    { label: t("mini4Col2"), pct: 65, color: "bg-indigo-600 dark:bg-indigo-400" },
    { label: t("mini4Col3"), pct: 30, color: "bg-amber-500" },
  ];
  return (
    <div className="rounded-surface border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Tracker</div>
      <div className="grid grid-cols-3 gap-2">
        {cols.map((c) => (
          <div key={c.label} className="rounded-control border border-slate-200 bg-canvas p-2 text-center dark:border-slate-800 dark:bg-canvas">
            <div className="text-xs font-semibold leading-tight text-slate-600 dark:text-slate-300">{c.label}</div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className={`h-full rounded-full ${c.color}`} style={{ width: `${c.pct}%` }} />
            </div>
            <div className="mt-1 text-xs font-black text-slate-900 dark:text-white">{c.pct}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Localized marketing landing page (en / uz / ru).
 *
 * Design adapted from the reference layout: header with anchor nav, hero with
 * a dashboard mock, "how it works", dark feature grid, an honest chancing
 * section (the admission estimate is intentionally left as "—" — the platform
 * never invents a probability), roadmap, testimonial and CTA.
 *
 * Buttons are wired to the app: "Sign in" opens the profile picker,
 * "Get started" launches the onboarding wizard.
 */
export function LandingPage({
  onStart,
  onEnterApp,
  onSignIn,
}: LandingPageProps) {
  const t = useTranslations("landing");
  const nav = useTranslations("nav");
  const tm = useTranslations("meta");
  // The preview mirrors the real dashboard, so it reads the dashboard's own
  // strings instead of keeping a second, drifting copy of them.
  const td = useTranslations("dashboard");

  /**
   * Phone/tablet menu. The four section links used to live in an
   * `overflow-x-auto` strip, so on a 320-390px screen the last one ("Planning"
   * / "Rejalashtirish" / "Планирование") sat outside the viewport behind a
   * visible scrollbar. A disclosure menu shows every link at once and is
   * reachable with Tab, Escape and the keyboard like any other control.
   */
  const [menuOpen, setMenuOpen] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const heroMockRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        menuTriggerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  // Gentle desktop-only parallax for the hero mockup (disabled in lite / reduced-motion).
  useEffect(() => {
    if (typeof window === "undefined" || !heroMockRef.current) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || isLiteMotionSync();
    const isDesktop = window.matchMedia?.("(min-width: 1024px)").matches;
    if (reduce || !isDesktop) return;
    const el = heroMockRef.current;
    const paint = () => {
      const p = scrollEngine.progress();
      const y = Math.max(-10, Math.min(10, (p - 0.02) * -28));
      el.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
    };
    const unsub = scrollEngine.subscribe(paint);
    return unsub;
  }, []);

  const goToSection = (id: string) => {
    setMenuOpen(false);
    scrollToId(id);
  };

  const steps = [
    {
      num: "01",
      label: t("step1Label"),
      title: t("step1Title"),
      text: t("step1Text"),
      image: LANDING_PHOTOS.step1Profile,
      mini: <ProfileMini t={t} />,
    },
    {
      num: "02",
      label: t("step2Label"),
      title: t("step2Title"),
      text: t("step2Text"),
      image: LANDING_PHOTOS.step2UniversityMatch,
      mini: <MatchMini t={t} />,
    },
    {
      num: "03",
      label: t("step3Label"),
      title: t("step3Title"),
      text: t("step3Text"),
      image: LANDING_PHOTOS.step3SopWriting,
      mini: <RoadmapMini t={t} />,
    },
    {
      num: "04",
      label: t("step4Label"),
      title: t("step4Title"),
      text: t("step4Text"),
      image: LANDING_PHOTOS.step4VisaDeparture,
      mini: <TrackerMini t={t} />,
    },
  ];

  const features = [
    { icon: "⌕", title: t("f1Title"), text: t("f1Text") },
    { icon: "%", title: t("f2Title"), text: t("f2Text") },
    { icon: "✦", title: t("f3Title"), text: t("f3Text") },
    { icon: "AI", title: t("f4Title"), text: t("f4Text") },
    { icon: "✓", title: t("f5Title"), text: t("f5Text") },
    { icon: "↗", title: t("f6Title"), text: t("f6Text") },
  ];

  const roadItems = [
    { num: "1", title: t("r1Title"), text: t("r1Text"), tag: t("roadTag1") },
    { num: "2", title: t("r2Title"), text: t("r2Text"), tag: t("roadTag2") },
    { num: "3", title: t("r3Title"), text: t("r3Text"), tag: t("roadTag3") },
  ];

  /**
   * The dashboard preview is built from the SAME navigation source of truth
   * the app itself uses (`NAV_SECTIONS` groups + the `nav` translations) and
   * from the dashboard's own copy (`dashboard` namespace). The preview used to
   * be a hand-written list of flat, pre-reorganization links, which is exactly
   * how it ended up advertising an old dashboard for months. Deriving it here
   * means it cannot drift again.
   */
  const mockIcon: Record<
    string,
    React.ComponentType<{ className?: string }>
  > = {
    dashboard: LayoutDashboard,
    universities: Search,
    scholarships: Award,
    "study-plan": Route,
    tasks: ListChecks,
    profile: Target,
    funding: PiggyBank,
    applications: CheckSquare,
    materials: FolderOpen,
    offers: Trophy,
    "post-admission-funding": HandCoins,
    visa: Plane,
    guidance: Bot,
    community: MessagesSquare,
  };
  const mockSidebarGroups = NAV_GROUPS.map((group) => ({
    id: group,
    label: nav(NAV_GROUP_I18N[group] as never),
    items: NAV_SECTIONS.filter((section) => section.group === group)
      .map((section) => ({
        id: section.id,
        label: nav(NAV_SECTION_LABEL_KEYS[section.id] as never),
        icon: mockIcon[section.id] ?? Sparkles,
        pro: Boolean(section.premium),
      })),
  })).filter((group) => group.items.length > 0);
  const mockAccountItems = NAV_UTILITY_SECTIONS.filter((u) => !u.adminOnly).map(
    (u) => ({
      id: u.id,
      label: nav(NAV_SECTION_LABEL_KEYS[u.id] as never),
      icon:
        u.id === "payments" ? Crown : u.id === "notifications" ? Send : Gift,
      pro: Boolean(u.premium),
    }),
  );

  // Sample numbers on purpose — the title bar labels the whole panel as
  // "Demo · sample data". Every label is the string the real dashboard uses.
  const mockStats = [
    {
      label: td("statShortlisted"),
      value: "12",
      sub: td("statShortlistedSub"),
      icon: GraduationCap,
      tone: "bg-indigo-50 text-indigo-600",
    },
    {
      label: td("statScholarships"),
      value: "5",
      sub: td("statScholarshipsSub"),
      icon: Award,
      tone: "bg-emerald-50 text-emerald-600",
    },
    {
      label: td("statMilestones"),
      value: "7",
      sub: td("statMilestonesSub"),
      icon: CheckCircle2,
      tone: "bg-amber-50 text-amber-600",
    },
    {
      label: td("statSop"),
      value: td("statSopReady"),
      sub: td("statSopSub"),
      icon: FileText,
      tone: "bg-violet-50 text-violet-600",
    },
  ];

  return (
    <div className="min-h-screen bg-canvas font-sans text-slate-900 antialiased selection:bg-indigo-600 selection:text-white dark:bg-canvas dark:text-white dark:selection:bg-indigo-300 dark:selection:text-slate-950">
      {/* Flight path lives underneath content so it never covers text/CTAs. */}
      <ScrollFlightPath />
      <PhotoCraftKineticHud />

      {/* All foreground must sit above the jet. Gutters keep ruler/words clear. */}
      <div className="relative z-10">
      {/* ===== Header ===== */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-canvas/80 backdrop-blur-xl supports-[backdrop-filter]:bg-canvas/65 dark:border-slate-800 dark:bg-canvas/80">
        <div className="mx-auto flex h-16 w-[min(1180px,94%)] items-center justify-between gap-2 md:pr-14 xl:pr-40 2xl:pr-28">
          <a
            href="#top"
            className="flex min-h-11 min-w-0 items-center gap-2 rounded-surface text-base font-black tracking-[-0.02em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-400 sm:gap-2.5 sm:text-lg"
            onClick={(event) => {
              event.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <span className="sb-logo-well grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-surface border border-slate-200 bg-white p-0.5 dark:border-slate-800 dark:bg-surface">
              <BrandingImage
                alt={t("logoAlt")}
                className="h-full w-full rounded-control object-cover"
              />
            </span>
            <span className="min-w-0 break-words whitespace-normal text-sm leading-tight sm:text-lg">
              {tm("appName")}
            </span>
          </a>

          <nav
            aria-label={t("navAria")}
            className="hidden items-center gap-5 text-sm font-semibold text-slate-600 dark:text-slate-300 lg:flex xl:gap-7"
          >
            {[
              { id: "how", label: t("navHow") },
              { id: "features", label: t("navFeatures") },
              { id: "chancing", label: t("navChancing") },
              { id: "roadmap", label: t("navPlanning") },
            ].map((item) => (
              <Button variant="unstyled"
                key={item.id}
                onClick={() => scrollToId(item.id)}
                className="inline-flex min-h-11 items-center rounded-control px-1 transition hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:text-indigo-300 dark:focus-visible:ring-indigo-400"
              >
                {item.label}
              </Button>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <LanguageSwitcher compact />
            <ThemeSwitch />
            {onSignIn && (
              <Button variant="unstyled"
                onClick={onSignIn}
                className="hidden min-h-11 rounded-surface border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-800 transition hover:-translate-y-px hover:border-indigo-300 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-indigo-400 dark:hover:text-indigo-300 dark:focus-visible:ring-indigo-400 sm:block"
              >
                {t("signIn")}
              </Button>
            )}
            <Button variant="unstyled"
              onClick={onStart}
              className="sb-btn-primary hidden min-h-11 rounded-surface bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:-translate-y-px hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus-visible:ring-indigo-400 dark:focus-visible:ring-offset-canvas sm:block"
            >
              {t("getStarted")}
            </Button>
            <Button variant="unstyled"
              ref={menuTriggerRef}
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              aria-expanded={menuOpen}
              aria-controls="landing-mobile-nav"
              aria-label={t("navAria")}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-surface border border-slate-200 bg-white text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-indigo-400 dark:hover:text-indigo-300 dark:focus-visible:ring-indigo-400 lg:hidden"
            >
              {menuOpen ? (
                <X className="h-5 w-5" aria-hidden />
              ) : (
                <Menu className="h-5 w-5" aria-hidden />
              )}
            </Button>
          </div>
        </div>

        {menuOpen && (
          <nav
            id="landing-mobile-nav"
            aria-label={t("navAria")}
            className="border-t border-slate-200 bg-canvas px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-2 dark:border-slate-800 dark:bg-canvas lg:hidden"
          >
            <ul className="mx-auto flex w-[min(1180px,100%)] flex-col gap-0.5 py-1">
              {[
                { id: "how", label: t("navHow") },
                { id: "features", label: t("navFeatures") },
                { id: "chancing", label: t("navChancing") },
                { id: "roadmap", label: t("navPlanning") },
              ].map((item) => (
                <li key={item.id}>
                  <Button variant="unstyled"
                    onClick={() => goToSection(item.id)}
                    className="flex min-h-11 w-full items-center rounded-control px-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-200 dark:hover:bg-indigo-500/10 dark:focus-visible:ring-indigo-400"
                  >
                    {item.label}
                  </Button>
                </li>
              ))}
              <li className="mt-1 border-t border-slate-200 pt-2 dark:border-slate-800 sm:hidden">
                <Button variant="unstyled"
                  onClick={() => {
                    menuTriggerRef.current?.focus();
                    setMenuOpen(false);
                    onStart();
                  }}
                  className="flex min-h-11 w-full items-center justify-center rounded-surface bg-indigo-600 px-3 text-center text-sm font-black text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus-visible:ring-indigo-400"
                >
                  {t("getStarted")}
                </Button>
              </li>
              {onSignIn && (
                <li>
                  <Button variant="unstyled"
                    onClick={() => {
                      menuTriggerRef.current?.focus();
                      setMenuOpen(false);
                      onSignIn();
                    }}
                    className="flex min-h-11 w-full items-center rounded-control px-3 text-left text-sm font-semibold text-slate-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-200 dark:hover:bg-indigo-500/10 dark:focus-visible:ring-indigo-400"
                  >
                    {t("signIn")}
                  </Button>
                </li>
              )}
              <li className="flex items-center justify-between gap-2 border-t border-slate-200 px-3 py-2 dark:border-slate-800">
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{t("mobileLanguageLabel")}</span>
                <LanguageSwitcher compact />
              </li>
              <li className="px-3 pb-1">
                <a
                  href={PUBLIC_TELEGRAM_CHANNEL_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-surface border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-400 dark:hover:text-indigo-300 dark:focus-visible:ring-indigo-400"
                >
                  <Send className="h-3.5 w-3.5" aria-hidden /> {t("tgCta")} · {PUBLIC_TELEGRAM_HANDLE}
                </a>
              </li>
            </ul>
          </nav>
        )}
      </header>

      <main id="top">
        {/* ===== Hero ===== */}
        <section className="relative overflow-hidden border-b border-slate-200 bg-canvas py-8 dark:border-slate-800 sm:py-10">
          <div
            aria-hidden="true"
            className="sb-premium-aurora"
          />
          <div className="relative mx-auto grid w-[min(1180px,94%)] items-center gap-8 md:pr-14 xl:pr-40 2xl:pr-28 md:gap-10 lg:grid-cols-[0.96fr_1.04fr] lg:gap-8">
            {/* Above-the-fold copy must paint in SSR, not wait for JS + stagger. */}
            <Motion.div initial={false} animate="visible" variants={heroGroup}>
              <div className="min-w-0">
              <div>
                <SectionIndex n="01" label={t("secOverview")} />
              </div>
              <Motion.span
                variants={heroStaticItem}
                className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 dark:bg-indigo-300" />
                {t("heroBadge")}
              </Motion.span>
              <h1
                className="mt-4 max-w-[720px] text-[clamp(38px,5.2vw,64px)] font-black leading-[0.98] tracking-[-0.045em] text-slate-950 dark:text-white"
              >
                {t("heroTitle")}{" "}
                <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 bg-clip-text font-extrabold text-transparent dark:from-indigo-300 dark:via-violet-300 dark:to-indigo-300">
                  {t("heroTitleAccent")}
                </span>
              </h1>
              <Motion.p
                variants={heroStaticItem}
                className="mt-5 max-w-[620px] text-base leading-relaxed text-slate-600 dark:text-slate-300 sm:text-lg"
              >
                {t("heroBody")}
              </Motion.p>
              <Motion.p
                variants={heroStaticItem}
                className="mt-3 max-w-[620px] text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400"
              >
                {t("heroAudienceNote")}
              </Motion.p>
              <Motion.div
                variants={heroStaticItem}
                className="mt-6 flex flex-wrap items-center gap-3"
              >
                <Button variant="unstyled"
                  onClick={onStart}
                  className="sb-btn-primary inline-flex min-h-12 items-center gap-2 rounded-surface bg-indigo-600 px-7 py-3 text-sm font-black text-white shadow-xl shadow-indigo-600/25 transition hover:-translate-y-px hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus-visible:ring-indigo-400 dark:focus-visible:ring-offset-canvas"
                >
                  {t("getStarted")} <ArrowRight className="h-4 w-4" aria-hidden />
                </Button>
                <Button variant="unstyled"
                  onClick={() => scrollToId("how")}
                  className="inline-flex min-h-12 items-center gap-1.5 rounded-surface border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:-translate-y-px hover:border-indigo-300 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-400 dark:hover:text-indigo-300 dark:focus-visible:ring-indigo-400"
                >
                  {t("ctaHow")}
                </Button>
              </Motion.div>
              <Motion.div
                variants={heroStaticItem}
                className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-slate-600 dark:text-slate-300"
              >
                {[t("trust1"), t("trust2"), t("trust3")].map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5">
                    <CheckCircle2
                      className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-300"
                      aria-hidden
                    />
                    {item}
                  </span>
                ))}
              </Motion.div>
              <Motion.div
                variants={heroStaticItem}
                className="mt-4 flex flex-wrap items-center gap-3"
              >
                <Link
                  href="/universities"
                  className="inline-flex min-h-11 items-center gap-1 rounded-control border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-400 dark:hover:text-indigo-300 dark:focus-visible:ring-indigo-400"
                >
                  {t("browsePublicCatalog")} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </Link>
                <Link
                  href="/scholarships"
                  className="inline-flex min-h-11 items-center gap-1 rounded-control border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-400 dark:hover:text-indigo-300 dark:focus-visible:ring-indigo-400"
                >
                  {t("browsePublicGrants")} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </Motion.div>
              {onEnterApp && (
                <MotionButton variant="unstyled"
                  variants={heroStaticItem}
                  onClick={onEnterApp}
                  className="mt-3 inline-flex min-h-11 items-center rounded-control px-1 text-xs font-semibold text-indigo-700 underline-offset-4 hover:text-indigo-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300 dark:hover:text-indigo-200 dark:focus-visible:ring-indigo-400"
                >
                  {t("enterApp")}
                </MotionButton>
              )}
              </div>
            </Motion.div>

            {/* Layered product shot — compact landscape, quiet luxury
                (main PR #132 sizing) + the lighter `m` component from this
                branch. Both sides are kept: no visual regression, no full
                framer-motion bundle pulled back into the first load. */}
            <Motion.div
              className="relative mx-auto w-full max-w-[760px] md:max-w-[720px] lg:max-w-[820px]"
              initial={false}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.7,
                delay: 0.12,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <div aria-hidden className="sb-hero-mockup-glow pointer-events-none absolute -inset-6 -z-10 rounded-overlay opacity-70 blur-2xl" />
              <div className="relative rounded-overlay border border-indigo-100 bg-white p-2 shadow-2xl shadow-indigo-900/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40">
                <div className="overflow-hidden rounded-overlay border border-slate-200 bg-white dark:border-slate-800 dark:bg-surface">
                  <div className="flex h-9 items-center gap-1.5 border-b border-slate-200 px-4 dark:border-slate-800">
                    <span className="h-2 w-2 rounded-full bg-rose-400 dark:bg-rose-300" />
                    <span className="h-2 w-2 rounded-full bg-amber-400 dark:bg-amber-300" />
                    <span className="h-2 w-2 rounded-full bg-emerald-400 dark:bg-emerald-300" />
                    <span className="ml-auto rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-black uppercase tracking-wider text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                      {t("demoBadge")}
                    </span>
                  </div>
                  <div className="grid min-h-[300px] grid-cols-1 sm:grid-cols-[188px_1fr]">
                    <aside className="hidden border-r border-slate-200 bg-canvas p-2 py-1.5 dark:border-slate-800 dark:bg-canvas sm:block">
                      <div className="mb-2 flex items-center gap-1.5 px-1">
                        <span className="sb-logo-well grid h-6 w-6 shrink-0 place-items-center overflow-hidden rounded-control border border-slate-200 dark:border-slate-800">
                          <BrandingImage
                            alt={t("logoAlt")}
                            className="h-full w-full object-cover"
                          />
                        </span>
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          ScholarBridge
                        </span>
                        <span className="rounded-control bg-indigo-50 px-1 text-xs font-black text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                          AI
                        </span>
                      </div>
                      {mockSidebarGroups.map((group) => (
                        <div key={group.id} className="mb-0.5">
                          <div className="px-2 pb-0 pt-0.5 text-xs font-black uppercase tracking-[0.11em] text-slate-500 dark:text-slate-400">
                            {group.label}
                          </div>
                          {group.items.map(({ id, label, icon: Icon, pro }) => (
                            <div
                              key={id}
                              className={`mb-px flex items-center gap-1 rounded-control px-2 py-0.5 text-xs font-semibold leading-tight ${
                                id === "dashboard"
                                  ? "bg-indigo-600 text-white dark:bg-indigo-500 dark:text-white"
                                  : pro
                                    ? "border border-amber-200 text-amber-700 dark:border-amber-500/30 dark:text-amber-300"
                                    : "text-slate-600 dark:text-slate-300"
                              }`}
                            >
                              <Icon
                                className="h-2.5 w-2.5 shrink-0"
                                aria-hidden
                              />
                              <span className="min-w-0 flex-1 break-words">{label}</span>
                              {pro && (
                                <span className="ml-auto shrink-0 rounded-control bg-amber-100 px-1 text-xs font-black text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
                                  PRO
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ))}
                      <div className="mt-0.5 border-t border-slate-200 pt-0.5 dark:border-slate-800">
                        <div className="px-2 pb-0 text-xs font-black uppercase tracking-[0.11em] text-slate-500 dark:text-slate-400">
                          {nav("accountCluster")}
                        </div>
                        {mockAccountItems.map(
                          ({ id, label, icon: Icon, pro }) => (
                            <div
                              key={id}
                              className={`mb-px flex items-center gap-1 rounded-control px-2 py-0.5 text-xs font-semibold leading-tight ${pro ? "border border-amber-200 text-amber-700 dark:border-amber-500/30 dark:text-amber-300" : "text-slate-600 dark:text-slate-300"}`}
                            >
                              <Icon
                                className="h-2.5 w-2.5 shrink-0"
                                aria-hidden
                              />
                              <span className="min-w-0 flex-1 break-words">{label}</span>
                              {pro && (
                                <span className="ml-auto shrink-0 rounded-control bg-amber-100 px-1 text-xs font-black text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
                                  PRO
                                </span>
                              )}
                            </div>
                          ),
                        )}
                      </div>
                    </aside>

                    <div className="bg-slate-50 p-2.5 dark:bg-canvas sm:p-3">
                      <div className="flex gap-3 rounded-overlay bg-gradient-to-br from-hero-from via-hero-via to-hero-to p-3 text-white dark:border dark:border-indigo-500/20 dark:from-hero-from dark:via-hero-via dark:to-hero-to">
                        <div className="min-w-0 flex-1">
                          <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-xs font-semibold">
                            <Sparkles
                              className="h-2.5 w-2.5 text-amber-300"
                              aria-hidden
                            />{" "}
                            {t("mockActiveApplicant")}
                          </span>
                          <div className="mt-2 text-sm font-black leading-tight sm:text-sm">
                            {td("heroTitle")}
                          </div>
                          <p className="mt-1.5 text-sm leading-snug text-slate-300">
                            {t("mockHubSub")}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1 text-xs font-semibold">
                            <span className="inline-flex items-center gap-0.5 rounded-control bg-white/10 px-1.5 py-0.5">
                              <GraduationCap
                                className="h-2.5 w-2.5"
                                aria-hidden
                              />{" "}
                              {t("mockChipBachelor")}
                            </span>
                            <span className="inline-flex items-center gap-0.5 rounded-control bg-white/10 px-1.5 py-0.5">
                              <Wallet
                                className="h-2.5 w-2.5 text-emerald-300"
                                aria-hidden
                              />{" "}
                              $25 000/yr
                            </span>
                            <span className="inline-flex items-center gap-0.5 rounded-control bg-white/10 px-1.5 py-0.5">
                              <Trophy
                                className="h-2.5 w-2.5 text-amber-300"
                                aria-hidden
                              />{" "}
                              {t("mockChipPubs")}
                            </span>
                          </div>
                        </div>
                        <div className="hidden w-[108px] shrink-0 flex-col items-center rounded-surface border border-white/20 p-2 sm:flex">
                          <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                            {td("readinessLabel")}
                          </div>
                          <div className="my-1.5 grid h-12 w-12 place-items-center rounded-full border-[3px] border-indigo-400/70">
                            <span className="text-base font-black text-amber-300">
                              47<small className="text-xs">%</small>
                            </span>
                          </div>
                          <div className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-control bg-gradient-to-r from-amber-400 to-orange-500 py-1 text-xs font-black text-slate-950 sb-ink-on-warm">
                            <Bot className="h-2.5 w-2.5" aria-hidden />{" "}
                            {td("runAudit")}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {mockStats.map(
                          ({ label, value, sub, icon: Icon, tone }) => (
                            <div
                              key={label}
                              className="rounded-surface border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-surface"
                            >
                              <div className="flex items-start justify-between gap-1">
                                <small className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                  {label}
                                </small>
                                <span
                                  className={`grid h-4 w-4 place-items-center rounded-control ${tone}`}
                                >
                                  <Icon className="h-2.5 w-2.5" aria-hidden />
                                </span>
                              </div>
                              <strong className="mt-1 block text-base font-black text-slate-950 dark:text-white">
                                {value}
                              </strong>
                              <span className="text-xs text-slate-600 dark:text-slate-300">
                                {sub}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                      <div className="mt-3 rounded-surface border border-indigo-200 bg-white p-3 dark:border-indigo-500/30 dark:bg-surface">
                        <div className="flex items-center gap-1 text-xs font-black text-indigo-700 dark:text-indigo-300">
                          <Compass className="h-3 w-3" aria-hidden />{" "}
                          {td("portfolioTitle")}
                        </div>
                        <p className="mt-1.5 text-sm leading-snug text-slate-500 dark:text-slate-400">
                          {t("mockPortfolioNote")}
                        </p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="inline-flex max-w-[200px] flex-col rounded-surface border border-slate-200 bg-white px-2.5 py-1.5 text-left shadow-sm dark:border-slate-700 dark:bg-surface">
                          <span className="text-xs font-bold leading-none text-slate-500 dark:text-slate-400">{t("mockFloatGrantLabel")}</span>
                          <span className="mt-0.5 line-clamp-2 text-xs font-black leading-tight text-slate-900 dark:text-white">{t("mockFloatGrantTitle")}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-surface border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                          {t("mockFloatFitLabel")} · {t("mockFloatFitValue")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Floating badges removed — content now inline inside mock (no overflow) */}
              <div className="sr-only" aria-hidden="true" hidden />
            </Motion.div>
          </div>
        </section>

        <DeferredMarquee onStart={onStart} />

        {/* ===== How it works ===== */}
        <section
          id="how"
          className="sb-cv-section scroll-mt-20 border-b border-slate-200 bg-canvas py-8 dark:border-slate-800 sm:py-10"
        >
          <div className="mx-auto w-[min(1180px,94%)] md:pr-14 xl:pr-40 2xl:pr-28">
            <div className="mx-auto mb-6 max-w-[720px] text-center">
              <SectionIndex n="03" label={t("secHow")} />
              <div className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-300">
                {t("howEyebrow")}
              </div>
              <h2 className="mt-2 text-3xl font-black leading-tight tracking-[-0.035em] text-slate-950 dark:text-white sm:text-[40px]">
                {t("howTitle")}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
                {t("howText")}
              </p>
            </div>
            <RevealGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(steps as Array<{ num: string; label: string; title: string; text: string; image: string; mini: React.ReactNode }>).map((step) => (
                <RevealItem
                  key={step.num}
                  className="group flex flex-col overflow-hidden rounded-overlay border border-slate-200 bg-white p-0 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5 dark:border-slate-800 dark:bg-surface dark:hover:shadow-black/30"
                >
                  <Image
                    src={step.image}
                    alt=""
                    width={700}
                    height={438}
                    sizes="(max-width: 640px) 94vw, (max-width: 1024px) 47vw, 25vw"
                    loading="lazy"
                    unoptimized
                    className="aspect-[16/10] w-full object-cover"
                  />
                  <div className="p-2">{step.mini}</div>
                  <div className="flex flex-1 flex-col px-3 pb-3 pt-3">
                    <div className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-300">
                      {step.num} — {step.label}
                    </div>
                    <h3 className="mb-1.5 mt-2 text-base font-black text-slate-950 dark:text-white">
                      {step.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      {step.text}
                    </p>
                  </div>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* ===== Features — hero + supporting grid ===== */}
        <section
          id="features"
          className="sb-cv-section scroll-mt-16 border-b border-slate-200 bg-canvas py-8 dark:border-slate-800 sm:py-10"
        >
          <div className="mx-auto w-[min(1180px,94%)] md:pr-14 xl:pr-40 2xl:pr-28">
            <div className="mx-auto mb-6 max-w-[720px] text-center">
              <SectionIndex n="04" label={t("secCapabilities")} />
              <div className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-300">
                {t("featEyebrow")}
              </div>
              <h2 className="mt-2 text-3xl font-black leading-tight tracking-[-0.035em] text-slate-950 dark:text-white sm:text-[40px]">
                {t("featTitle")}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
                {t("featText")}
              </p>
            </div>

            {/* Hero feature */}
            <Reveal className="overflow-hidden rounded-overlay border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-surface">
              <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="p-6 sm:p-8">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-black uppercase tracking-[0.12em] text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
                    <Sparkles className="h-3 w-3" aria-hidden /> {t("featHeroBadge")}
                  </span>
                  <h3 className="mt-3 text-2xl font-black tracking-[-0.02em] text-slate-950 dark:text-white sm:text-3xl">
                    {t("f1Title")}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {t("f1Text")}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-6 border-t border-slate-100 pt-4 dark:border-slate-800">
                    <div>
                      <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                        <CountUp value={24} />
                      </div>
                      <div className="text-xs font-semibold leading-tight text-slate-500 dark:text-slate-400">{t("featStat1Label")}</div>
                    </div>
                    <div>
                      <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                        <CountUp value={8} />
                      </div>
                      <div className="text-xs font-semibold leading-tight text-slate-500 dark:text-slate-400">{t("featStat2Label")}</div>
                    </div>
                    <div>
                      <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                        <CountUp value={3} />
                      </div>
                      <div className="text-xs font-semibold leading-tight text-slate-500 dark:text-slate-400">{t("featStat3Label")}</div>
                    </div>
                  </div>
                  {/* Pipeline */}
                  <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-1">
                    {[t("featPipeline1"), t("featPipeline2"), t("featPipeline3"), t("featPipeline4")].map((label, i) => (
                      <React.Fragment key={label}>
                        <span className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${i === 0 ? "border-indigo-600 bg-indigo-600 text-white dark:border-indigo-500 dark:bg-indigo-500" : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"}`}>
                          {label}
                        </span>
                        {i < 3 && <span className="h-px w-6 shrink-0 bg-slate-200 dark:bg-slate-700" aria-hidden />}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
                {/* Advisor mock */}
                <div className="border-t border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-canvas sm:p-6 lg:border-l lg:border-t-0">
                  <div className="rounded-overlay border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-indigo-600 text-white dark:bg-indigo-500"><Bot className="h-3.5 w-3.5" aria-hidden /></span>
                      ScholarBridge AI
                    </div>
                    <div className="mt-3 rounded-surface bg-indigo-50 px-3 py-2 text-sm font-medium text-slate-700 dark:bg-indigo-500/10 dark:text-slate-200">
                      “{t("featAdvisorPrompt")}”
                    </div>
                    <div className="mt-2 rounded-surface border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm leading-snug text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                      {t("featAdvisorReply")}
                    </div>
                  </div>
                  <div className="mt-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
                    {t("f4Text")}
                  </div>
                </div>
              </div>
            </Reveal>

            <RevealGroup className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {features.slice(1).map((feature) => (
                <RevealItem
                  key={feature.title}
                  className="min-h-[170px] rounded-overlay border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/5 dark:border-slate-800 dark:bg-surface dark:hover:shadow-black/20"
                >
                  <div className="mb-3 grid h-9 w-9 place-items-center rounded-control bg-indigo-50 text-xs font-black text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                    {feature.icon}
                  </div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {feature.text}
                  </p>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* ===== Chancing (honest) — prominent Fit ≠ Probability ===== */}
        <section
          id="chancing"
          className="sb-cv-section scroll-mt-16 border-b border-slate-200 bg-canvas py-8 dark:border-slate-800 sm:py-10"
        >
          <div className="mx-auto grid w-[min(1180px,94%)] items-start gap-7 md:pr-14 lg:grid-cols-[1.05fr_0.95fr] xl:pr-40 2xl:pr-28">
            <Reveal>
              <SectionIndex n="05" label={t("secChancing")} />
              <div className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-300">
                {t("chanceEyebrow")}
              </div>
              <h2 className="mt-2 text-3xl font-black leading-tight tracking-[-0.035em] text-slate-950 dark:text-white sm:text-[40px]">
                {t("chanceTitle")}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-slate-600 dark:text-slate-300">
                {t("chanceText")}
              </p>
              <div className="mt-5 rounded-overlay border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface">
                <div className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">How fit is calculated</div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: t("chanceDim1"), pct: 82 },
                    { label: t("chanceDim2"), pct: 100 },
                    { label: t("chanceDim3"), pct: 65 },
                    { label: t("chanceDim4"), pct: 72 },
                  ].map((dim) => (
                    <div key={dim.label} className="rounded-control border border-slate-100 bg-canvas px-2.5 py-2 dark:border-slate-800 dark:bg-canvas">
                      <div className="truncate text-xs font-semibold text-slate-600 dark:text-slate-300">{dim.label}</div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className="h-full rounded-full bg-indigo-600 dark:bg-indigo-400" style={{ width: `${dim.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 rounded-surface border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
                <div className="text-sm font-black text-amber-800 dark:text-amber-200">{t("chanceWhyTitle")}</div>
                <p className="mt-1 text-sm leading-relaxed text-amber-900 dark:text-amber-200">{t("chanceWhyText")}</p>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                {[t("chanceLi1"), t("chanceLi2"), t("chanceLi3")].map(
                  (item) => (
                    <li key={item} className="flex gap-2">
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-300"
                        aria-hidden
                      />
                      <span>{item}</span>
                    </li>
                  ),
                )}
              </ul>
            </Reveal>
            <Reveal
              delay={0.08}
              className="rounded-overlay border border-slate-200 bg-white p-2 shadow-lg shadow-black/5 dark:border-slate-800 dark:bg-surface dark:shadow-black/30"
            >
              <div className="rounded-surface border border-slate-200 p-5 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-sm font-black text-slate-950 dark:text-white">
                    {t("chanceCardLabel")}
                  </strong>
                  <span className="flex items-center gap-1.5">
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-black uppercase tracking-wider text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                      {t("demoBadge")}
                    </span>
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-black text-emerald-700 dark:text-emerald-300">
                      {t("chanceBadge")}
                    </span>
                  </span>
                </div>
                {/* Fit vs Probability comparison */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-surface border border-emerald-200 bg-emerald-50 p-3 text-center dark:border-emerald-500/30 dark:bg-emerald-500/10">
                    <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">{t("chanceMatch")}</div>
                    <div className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-300">
                      <CountUp value={92} suffix="%" />
                    </div>
                    <div className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">Example profile fit</div>
                  </div>
                  <div className="rounded-surface border border-slate-200 bg-canvas p-3 text-center dark:border-slate-700 dark:bg-canvas">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t("chanceAdmission")}</div>
                    <div className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                      —
                    </div>
                    <div className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">Not estimated</div>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between border-y border-slate-200 py-3 dark:border-slate-800">
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    {t("chanceDataBasis")}
                  </span>
                  <strong className="text-sm font-black text-slate-950 dark:text-white">
                    {t("chanceDataPublished")}
                  </strong>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  {t("chanceNote")}
                </p>
                <div className="mt-3 rounded-control bg-slate-50 px-3 py-2 text-center text-xs font-semibold text-slate-500 dark:bg-canvas dark:text-slate-400">
                  Fit — not a probability · Scholarship fit uses published catalogue fields only.
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ===== Roadmap — connected spine ===== */}
        <section
          id="roadmap"
          className="sb-cv-section scroll-mt-16 border-b border-slate-200 bg-canvas py-8 dark:border-slate-800 sm:py-10"
        >
          <div className="mx-auto w-[min(1180px,94%)] md:pr-14 xl:pr-40 2xl:pr-28">
            <div className="mx-auto mb-6 max-w-[720px] text-center">
              <SectionIndex n="06" label={t("secRoadmap")} />
              <div className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-300">
                {t("roadEyebrow")}
              </div>
              <h2 className="mt-2 text-3xl font-black leading-tight tracking-[-0.035em] text-slate-950 dark:text-white sm:text-[40px]">
                {t("roadTitle")}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
                {t("roadText")}
              </p>
            </div>
            <div className="relative mx-auto max-w-[760px]">
              {/* Spine line — desktop only */}
              <span aria-hidden className="pointer-events-none absolute left-1/2 top-2 hidden h-[calc(100%-16px)] w-px -translate-x-1/2 bg-slate-200 dark:bg-slate-700 sm:block" />
              <RevealGroup className="space-y-3 sm:space-y-4">
                {roadItems.map((item, idx) => (
                  <RevealItem
                    key={item.num}
                    className={`relative rounded-overlay border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-surface sm:w-[calc(50%-20px)] ${idx % 2 === 0 ? "sm:mr-auto" : "sm:ml-auto"}`}
                  >
                    {/* Dot on spine */}
                    <span aria-hidden className="absolute top-6 hidden h-3 w-3 rounded-full border-2 border-indigo-600 bg-white dark:border-indigo-400 dark:bg-surface sm:block" style={idx % 2 === 0 ? { right: "-26px" } : { left: "-26px" }} />
                    <div className="flex items-start justify-between gap-3">
                      <div className="grid h-8 w-8 place-items-center rounded-control bg-indigo-600 text-sm font-black text-white dark:bg-indigo-500">
                        {item.num}
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-canvas dark:text-slate-300">{item.tag}</span>
                    </div>
                    <h3 className="mb-1.5 mt-3 text-base font-black text-slate-950 dark:text-white">
                      {item.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      {item.text}
                    </p>
                  </RevealItem>
                ))}
              </RevealGroup>
            </div>
          </div>
        </section>

        {/* ===== Telegram strip ===== */}
        <section className="border-b border-slate-200 bg-canvas py-7 dark:border-slate-800 sm:py-8">
          <div className="mx-auto w-[min(1180px,94%)] md:pr-14 xl:pr-40 2xl:pr-28">
            <div className="overflow-hidden rounded-overlay border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-5 shadow-sm dark:border-indigo-500/20 dark:from-indigo-500/10 dark:via-surface dark:to-violet-500/10 dark:bg-surface sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-300">
                    {t("secTelegram")} · <span className="font-mono text-xs font-bold normal-case tracking-normal text-slate-500 dark:text-slate-400">{PUBLIC_TELEGRAM_HANDLE}</span>
                  </div>
                  <div className="mt-1 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">{t("tgEyebrow")}</div>
                  <h3 className="mt-1 text-lg font-black leading-tight text-slate-950 dark:text-white sm:text-xl">
                    {t("tgTitle")}
                  </h3>
                  <p className="mt-1.5 max-w-[640px] text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {t("tgBody")}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[t("tgPill1"), t("tgPill2"), t("tgPill3")].map((pill) => (
                      <span key={pill} className="rounded-full border border-indigo-200 bg-white px-2.5 py-1 text-xs font-bold text-indigo-700 dark:border-indigo-500/30 dark:bg-slate-900 dark:text-indigo-300">
                        {pill}
                      </span>
                    ))}
                  </div>
                </div>
                <a
                  href={PUBLIC_TELEGRAM_CHANNEL_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-surface bg-indigo-600 px-6 py-3 text-sm font-black text-white shadow-md shadow-indigo-600/20 transition hover:-translate-y-px hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus-visible:ring-indigo-400 dark:focus-visible:ring-offset-surface"
                >
                  <Send className="h-4 w-4" aria-hidden /> {t("tgCta")}
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ===== Premium Testimonials + FAQ — deferred after idle to keep first-load JS <1300KB (shared shell <1200KB) ===== */}
        <DeferredBelowFold />

        {/* ===== CTA ===== */}
        <section id="cta" className="sb-cv-section scroll-mt-20 bg-canvas py-8 sm:py-10">
          <div className="mx-auto w-[min(1180px,94%)] md:pr-14 xl:pr-40 2xl:pr-28">
            <Reveal>
              <div className="sb-cta-banner relative overflow-hidden rounded-overlay border border-indigo-900/20 px-6 py-10 text-center shadow-xl shadow-indigo-900/15 dark:border-indigo-500/20 sm:px-14 sm:py-12">
                <Image
                  src={LANDING_PHOTOS.ctaAirplaneSunset}
                  alt=""
                  aria-hidden="true"
                  fill
                  sizes="100vw"
                  unoptimized
                  className="pointer-events-none object-cover opacity-[0.22]"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_0%,rgba(148,92,255,0.32),transparent_42%),radial-gradient(circle_at_12%_90%,rgba(99,102,241,0.22),transparent_40%)]"
                />
                <div className="relative">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-white">
                    <ShieldCheck
                      className="h-3.5 w-3.5 text-emerald-300"
                      aria-hidden
                    />{" "}
                    {t("ctaBadge")}
                  </div>
                  <h2 className="mt-4 text-3xl font-black tracking-[-0.035em] text-white sm:text-[43px]">
                    {t("ctaTitle")}
                  </h2>
                  <p className="mx-auto mt-2 max-w-[620px] text-sm leading-relaxed text-indigo-100 sm:text-base">
                    {t("ctaText")}
                  </p>
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <Button variant="unstyled"
                      onClick={onStart}
                      className="sb-btn-primary inline-flex min-h-12 items-center gap-2 rounded-surface bg-white px-7 py-3 text-sm font-black text-indigo-700 shadow-xl transition hover:-translate-y-px hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-900 dark:bg-white dark:text-indigo-700 dark:hover:bg-indigo-50 dark:ring-offset-surface"
                    >
                      {t("ctaBtn")} <ArrowRight className="h-4 w-4" aria-hidden />
                    </Button>
                    <a
                      href={PUBLIC_TELEGRAM_CHANNEL_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-12 items-center gap-2 rounded-surface border border-white/25 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      <Send className="h-4 w-4" aria-hidden /> {t("tgCta")}
                    </a>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      {/* ===== Footer ===== */}
      <footer className="border-t border-slate-200 bg-canvas py-7 text-sm text-slate-600 dark:border-slate-800 dark:bg-canvas dark:text-slate-300">
        <div className="mx-auto grid w-[min(1180px,94%)] gap-6 md:pr-14 xl:pr-40 2xl:pr-28 md:grid-cols-[1.2fr_0.7fr_0.9fr] md:gap-8">
          <div>
            <div className="flex items-center gap-2 font-black tracking-tight text-slate-900 dark:text-white">
              <span className="sb-logo-well grid h-7 w-7 place-items-center overflow-hidden rounded-control border border-slate-200 bg-white p-0.5 dark:border-slate-800 dark:bg-surface">
                <BrandingImage alt={t("logoAlt")} className="h-full w-full rounded-control object-cover" />
              </span>
              {tm("appName")} · ScholarBridge AI
            </div>
            <p className="mt-2 max-w-[420px] text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              {t("heroBody")}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/universities" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200">{t("browsePublicCatalog")}</Link>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <Link href="/scholarships" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200">{t("browsePublicGrants")}</Link>
            </div>
            <div className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
              © {new Date().getFullYear()} {t("footerLeft")}
            </div>
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-900 dark:text-white">{t("footerExplore")}</div>
            <ul className="mt-3 space-y-1">
              <li><a href="#how" onClick={(e)=>{e.preventDefault();scrollToId("how");}} className="inline-flex min-h-8 items-center text-sm font-medium text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-300">{t("navHow")}</a></li>
              <li><a href="#features" onClick={(e)=>{e.preventDefault();scrollToId("features");}} className="inline-flex min-h-8 items-center text-sm font-medium text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-300">{t("navFeatures")}</a></li>
              <li><a href="#chancing" onClick={(e)=>{e.preventDefault();scrollToId("chancing");}} className="inline-flex min-h-8 items-center text-sm font-medium text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-300">{t("navChancing")}</a></li>
              <li><a href="#roadmap" onClick={(e)=>{e.preventDefault();scrollToId("roadmap");}} className="inline-flex min-h-8 items-center text-sm font-medium text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-300">{t("navPlanning")}</a></li>
              <li><a href="/features" className="inline-flex min-h-8 items-center text-sm font-medium text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-300">{t("footerFeatures")}</a></li>
            </ul>
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-900 dark:text-white">{t("footerLegal")}</div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <a href="/privacy" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control px-2 text-sm font-medium text-slate-600 transition hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-300 dark:hover:text-indigo-300 dark:focus-visible:ring-indigo-400">
                {t("footerPrivacy")}
              </a>
              <a href="/terms" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control px-2 text-sm font-medium text-slate-600 transition hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-300 dark:hover:text-indigo-300 dark:focus-visible:ring-indigo-400">
                {t("footerTerms")}
              </a>
            </div>
            <a
              href={PUBLIC_TELEGRAM_CHANNEL_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-control border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-400 dark:hover:text-indigo-300 dark:focus-visible:ring-indigo-400"
            >
              <Send className="h-3.5 w-3.5" aria-hidden /> {PUBLIC_TELEGRAM_HANDLE}
            </a>
            <div className="mt-3 flex items-center gap-1.5">
              <LanguageSwitcher compact />
              <ThemeSwitch />
            </div>
          </div>
        </div>
        <div className="mx-auto mt-6 w-[min(1180px,94%)] border-t border-slate-200 pt-4 dark:border-slate-800 md:pr-14 xl:pr-40 2xl:pr-28">
          <AppNote kind="general" className="mx-auto max-w-[900px]" />
        </div>
      </footer>
      </div>{/* end relative z-10 foreground */}
    </div>
  );
}
/**
 * The jet's route for the whole scroll story. Unlike a flat "slide along a
 * polyline" mascot, this 3320-unit path is an aerobatic sequence: a long
 * descending S-cruise, a VICTORY LOOP (34–48 % of scroll — the tangent turns
 * through a full ~360°), a BARREL ROLL segment (63–75 %) and a final low pass
 * / approach (82–100 %). It is only ever consumed through a pre-sampled
 * lookup table, so the geometry cost is paid once per resize, not per frame.
 */
const FLIGHT_PATH_D =
  "M 580 90 " +
  "C 980 220, 1060 440, 740 620 " +
  "C 420 800, 140 860, 220 1100 " +
  "C 300 1340, 920 1420, 940 1220 " +
  "C 960 1040, 660 1040, 680 1240 " +
  "C 700 1440, 980 1560, 860 1820 " +
  "C 740 2080, 160 2040, 220 2340 " +
  "C 280 2640, 1020 2580, 920 2880 " +
  "C 820 3140, 420 3160, 600 3320";

/**
 * The airframe stays greyscale like the rest of the overlay; only the
 * afterburner gets a blue-white core, per the reference HUD treatment.
 * Every extra node (vortex sheets, plume/burner groups, dorsal/ventral
 * shade overlays) starts invisible and is driven by ScrollFlightPath's
 * per-frame DOM writes — the component itself never re-renders on scroll.
 */
function ExecutiveMonochromeJet({
  bankDeg = 0,
  shadowGroupRef,
  plumeGroupRef,
  burnerGroupRef,
  vortexGroupRef,
  vortexTopRef,
  vortexBottomRef,
  dorsalShadeRef,
  bellyShadeRef,
}: {
  bankDeg?: number;
  shadowGroupRef?: React.RefObject<SVGGElement | null>;
  plumeGroupRef?: React.RefObject<SVGGElement | null>;
  burnerGroupRef?: React.RefObject<SVGGElement | null>;
  vortexGroupRef?: React.RefObject<SVGGElement | null>;
  vortexTopRef?: React.RefObject<SVGPathElement | null>;
  vortexBottomRef?: React.RefObject<SVGPathElement | null>;
  dorsalShadeRef?: React.RefObject<SVGPathElement | null>;
  bellyShadeRef?: React.RefObject<SVGPathElement | null>;
}) {
  return (
    <g>
      {/* Wingtip vortex sheets — invisible until a hard bank / roll / fast
          scroll (see ScrollFlightPath paint). Drawn from the wingtips
          backwards in the jet's own rotated frame, so they always curl off
          the correct tip and squash realistically during the barrel roll. */}
      <g
        ref={vortexGroupRef}
        opacity="0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      >
        <path ref={vortexTopRef} d="M -16 -38 Q -65 -46 -150 -30" opacity="0.8" />
        <path
          ref={vortexBottomRef}
          d="M -16 38 Q -65 46 -150 30"
          opacity="0.55"
        />
      </g>
      <g
        ref={shadowGroupRef}
        transform={`translate(-6, ${8 + bankDeg * 0.18}) scale(0.95)`}
        opacity="0.18"
      >
        <path
          d="M 38 0 L 10 -5 L -8 -36 L -17 -36 L -10 -5 L -28 -4 L -36 -17 L -42 -17 L -36 0 L -42 17 L -36 17 L -28 4 L -10 5 L -17 36 L -8 36 L 10 5 Z"
          fill={SVG_COLORS.black}
        />
      </g>
      {/* Fading exhaust behind each nacelle, with a soft monochrome pulse.
          The per-frame velocity boost multiplies this group's scaleX. */}
      <g ref={plumeGroupRef} className="sb-jet-plumes" fill="url(#jetPlumeGrad)">
        <path d="M -8 -14 L -68 -18 L -68 -10 Z" />
        <path d="M -8 14 L -68 10 L -68 18 Z" />
        <path d="M -34 0 L -85 -4 L -72 0 L -85 4 Z" />
      </g>
      {/* Afterburner ring — opacity + stretch are scroll-velocity driven. */}
      <g ref={burnerGroupRef} opacity="0" fill="url(#jetAfterburnGrad)">
        <path d="M -8 -14 L -120 -15 L -96 -9 Z" />
        <path d="M -8 14 L -120 15 L -96 9 Z" />
        <path d="M -34 0 L -170 -5 L -140 0 L -170 5 Z" />
      </g>
      <rect
        x="-8"
        y="-19"
        width="14"
        height="6.5"
        rx="3"
        fill={SVG_COLORS.zinc800}
        stroke={SVG_COLORS.zinc950}
        strokeWidth="1.2"
      />
      <rect
        x="-8"
        y="12.5"
        width="14"
        height="6.5"
        rx="3"
        fill={SVG_COLORS.zinc800}
        stroke={SVG_COLORS.zinc950}
        strokeWidth="1.2"
      />
      <path
        d="M 6 -18 V -13.5 M 6 13.5 V 18"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* Swept wings and raised dark winglets. */}
      <path
        d="M 12 -4.5 L -9 -37 L -16 -39 L -18 -34 L -8 -5.5 Z M 12 4.5 L -9 37 L -16 39 L -18 34 L -8 5.5 Z"
        fill="url(#jetWingGrad)"
        stroke={SVG_COLORS.zinc950}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M -9 -37 L -16 -39 L -17 -35 L -11 -34 Z M -9 37 L -16 39 L -17 35 L -11 34 Z"
        fill={SVG_COLORS.zinc900}
      />
      <path
        d="M -2 -10 L -12 -31 M -2 10 L -12 31"
        fill="none"
        stroke={SVG_COLORS.zinc600}
        strokeWidth="1"
        strokeDasharray="3 2"
      />
      {/* Swept horizontal stabilizers and sculpted metallic fuselage. */}
      <path
        d="M -24 -3.2 L -36 -18 L -42 -18 L -34 -2.5 Z M -24 3.2 L -36 18 L -42 18 L -34 2.5 Z"
        fill="url(#jetWingGrad)"
        stroke={SVG_COLORS.zinc950}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M 40 0 C 31 -4.6, 18 -5.8, 4 -5.8 L -26 -4.2 L -39 -1.5 L -39 1.5 L -26 4.2 L 4 5.8 C 18 5.8, 31 4.6, 40 0 Z"
        fill="url(#jetFuselageGrad)"
        stroke={SVG_COLORS.zinc950}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M 29 0 C 25 -3.1, 20 -3.6, 17 -3.2 C 19 -1.2, 19 1.2, 17 3.2 C 20 3.6, 25 3.1, 29 0 Z"
        fill={SVG_COLORS.zinc950}
      />
      <path
        d="M 26 -1.4 C 23 -2.2, 20 -2.2, 19 -1.6"
        fill="none"
        stroke="white"
        strokeWidth="0.9"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M -26 0 H 14"
        stroke={SVG_COLORS.zinc500}
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <path
        d="M -14 -3.3 L 10 -3.6 M -14 3.3 L 10 3.6"
        stroke={SVG_COLORS.zinc900}
        strokeWidth="1.2"
        strokeDasharray="1.5 3"
        strokeLinecap="round"
      />
      <path
        d="M -25 0 L -41 -2.2 L -43 0 L -41 2.2 Z"
        fill={SVG_COLORS.zinc900}
        stroke={SVG_COLORS.zinc950}
        strokeWidth="1.2"
      />
      {/* Dorsal / ventral shade overlays — during the barrel roll the side
          facing away from the sky darkens, selling the inversion. The belly
          copy is the same silhouette mirrored with scale(1 -1). */}
      <path
        ref={dorsalShadeRef}
        d="M 40 0 C 31 -4.6, 18 -5.8, 4 -5.8 L -9 -37 L -16 -39 L -18 -34 L -10 -6 L -24 -3.2 L -36 -18 L -42 -18 L -39 -1.5 L -39 0 Z"
        fill={SVG_COLORS.zinc950}
        opacity="0"
      />
      <path
        ref={bellyShadeRef}
        transform="scale(1 -1)"
        d="M 40 0 C 31 -4.6, 18 -5.8, 4 -5.8 L -9 -37 L -16 -39 L -18 -34 L -10 -6 L -24 -3.2 L -36 -18 L -42 -18 L -39 -1.5 L -39 0 Z"
        fill={SVG_COLORS.zinc950}
        opacity="0"
      />
    </g>
  );
}

function ScrollFlightPath({ lite: liteProp }: { lite?: boolean } = {}) {
  const liteDetected = useLiteMotionTier();
  const lite = liteProp ?? liteDetected;
  /**
   * Scroll-locked aerobatic flight on the SHARED damped scroll engine
   * (`paintOnceUnderReducedMotion` → `scrollEngine.subscribe`): zero React
   * state per frame, one passive listener for the whole page.
   *  • CAMERA: the 3320-unit route cannot fit in a viewport, so a decoupled
   *    camera translates the world instead: `cameraY = 470 − (0.78·(90 +
   *    p·3230) + 0.22·y)`. The 0.78 monotonic blend guarantees the NET screen
   *    motion stays forward even while the loop's geometry flies "backwards"
   *    through the sky (retreat during loops is bounded, forward travel is
   *    0.78·3230 per full scroll); the 0.22 real-position term is what makes
   *    climbs, the loop and the dive *feel* like altitude changes.
   *  • TRAIL: revealed forward-only via `stroke-dashoffset = totalLen·(1−p)`
   *    over the measured path length — structurally cannot extrude backwards.
   *  • GEOMETRY: 360-point Float64 LUT [x, y, unwrapped screen heading,
   *    turn over 8 samples], resampled on resize because the screen heading
   *    bakes in the current viewport aspect; headings are UNWRAPPED at
   *    sample time so the ±180° seam never snaps the nose mid-loop.
   *  • MANEUVERS (fraction of scroll p): 0.10–0.28 S-banks (|bank| ≤ 38°),
   *    0.34–0.48 victory loop, 0.63–0.75 barrel roll (wingScaleY = cos φ
   *    with a 0.18 silhouette floor, dorsal/ventral shading swap), 0.82–1.00
   *    approach (28 % scale-in). Wingtip vortices fade in with |bank|,
   *    roll-phase and damped scroll velocity; the afterburner stretches the
   *    exhaust plumes by `1 + min(1.8, vel·28)` with a blue-white flash.
   */
  const pathRef = React.useRef<SVGPathElement | null>(null);
  const cameraRef = React.useRef<SVGGElement | null>(null);
  const jetGroupRef = React.useRef<SVGGElement | null>(null);
  const shadowGroupRef = React.useRef<SVGGElement | null>(null);
  const plumeRef = React.useRef<SVGGElement | null>(null);
  const burnerRef = React.useRef<SVGGElement | null>(null);
  const vortexGroupRef = React.useRef<SVGGElement | null>(null);
  const vortexTopRef = React.useRef<SVGPathElement | null>(null);
  const vortexBottomRef = React.useRef<SVGPathElement | null>(null);
  const dorsalRef = React.useRef<SVGPathElement | null>(null);
  const bellyRef = React.useRef<SVGPathElement | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const path = pathRef.current;
    if (!path) return;
    const reducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches || lite;

    const STEPS = lite ? 120 : 360;
    // [x, y, unwrapped screen-heading°, bank-turn°] per sample.
    let lut = new Float64Array((STEPS + 1) * 4);
    let totalLen = 4200;
    let lastDashOffset = "";
    let lastDorsalOp = "";
    let lastBellyOp = "";
    let lastBurnerOp = "";
    let lastVortOp = -1;
    let lastCameraTransform = "";
    let lastJetTransform = "";
    let lastShadowTransform = "";
    let lastVortexTransform = "";
    let lastPlumeTransform = "";
    let lastBurnerTransform = "";
    let sampledWidth = 0;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;

    const sampleLut = () => {
      totalLen = path.getTotalLength() || 4200;
      path.setAttribute("stroke-dasharray", `${totalLen} ${totalLen}`);
      // Screen heading bakes in the cached viewport aspect ratio.
      const { vw, vh } = scrollEngine.viewport();
      const sx = Math.max(0.01, (vw || 1200) / 1200);
      const sy = Math.max(0.01, (vh || 1000) / 1000);
      const step = totalLen / STEPS;
      let here = path.getPointAtLength(0);
      let ahead = path.getPointAtLength(step);
      let prev = here;
      let prevAngle = NaN;
      for (let i = 0; i <= STEPS; i++) {
        const dx = (i === STEPS ? here.x - prev.x : ahead.x - here.x) || 0.0001;
        const dy = i === STEPS ? here.y - prev.y : ahead.y - here.y;
        let a = (Math.atan2(dy * sy, dx * sx) * 180) / Math.PI;
        if (i > 0) {
          while (a - prevAngle > 180) a -= 360;
          while (a - prevAngle < -180) a += 360;
        }
        lut[i * 4] = here.x;
        lut[i * 4 + 1] = here.y;
        lut[i * 4 + 2] = a;
        prevAngle = a;
        if (i < STEPS) {
          prev = here;
          here = ahead;
          if (i < STEPS - 1) ahead = path.getPointAtLength((i + 2) * step);
        }
      }
      for (let i = 0; i <= STEPS; i++) {
        const back = Math.max(0, i - 8);
        const span = i - back || 1;
        lut[i * 4 + 3] = ((lut[i * 4 + 2] - lut[back * 4 + 2]) * 8) / span;
      }
    };

    const clamp = (v: number, lo: number, hi: number) =>
      Math.max(lo, Math.min(hi, v));

    const paint = () => {
      const p = scrollEngine.progress();
      const vel = scrollEngine.velocity();
      const f = p * STEPS;
      const i0 = Math.min(STEPS, Math.floor(f));
      const i1 = Math.min(STEPS, i0 + 1);
      const w = f - i0;
      const lerp = (a: number, b: number) => a + (b - a) * w;
      const x = lerp(lut[i0 * 4], lut[i1 * 4]);
      const y = lerp(lut[i0 * 4 + 1], lut[i1 * 4 + 1]);
      const angle = lerp(lut[i0 * 4 + 2], lut[i1 * 4 + 2]);
      const turn = lerp(lut[i0 * 4 + 3], lut[i1 * 4 + 3]);
      const bankDeg = clamp(turn * 1.8, -38, 38);

      const inRoll = p > 0.63 && p < 0.75;
      const rollPhase = inRoll ? (p - 0.63) / 0.12 : 0;
      const cosR = inRoll ? Math.cos(rollPhase * Math.PI * 2) : 1;
      let wingScaleY = cosR * (1 - Math.abs(bankDeg) * 0.008);
      if (Math.abs(wingScaleY) < 0.18) {
        wingScaleY = (wingScaleY < 0 ? -1 : 1) * 0.18;
      }
      const dorsalOp = inRoll ? Math.max(0, -cosR) * 0.5 : 0;
      const bellyOp = inRoll ? Math.max(0, cosR) * 0.5 : 0;

      const ap = clamp((p - 0.82) / 0.18, 0, 1);
      const approach = 1 + ap * ap * (3 - 2 * ap) * 0.28;

      const cameraY = 470 - (0.78 * (90 + p * 3230) + 0.22 * y);

      // Forward-only rendering: rounded attributes are only touched on change.
      const dashOffset = (totalLen * (1 - p)).toFixed(2);
      if (dashOffset !== lastDashOffset) {
        path.setAttribute("stroke-dashoffset", dashOffset);
        lastDashOffset = dashOffset;
      }
      const cameraTransform = `translate(0 ${cameraY.toFixed(2)})`;
      if (cameraTransform !== lastCameraTransform) {
        cameraRef.current?.setAttribute("transform", cameraTransform);
        lastCameraTransform = cameraTransform;
      }
      const { vw, vh } = scrollEngine.viewport();
      const scaleX = Math.max(0.01, (vw || 1200) / 1200);
      const scaleY = Math.max(0.01, (vh || 1000) / 1000);
      const jetTransform = `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${(approach / scaleX).toFixed(4)} ${(approach / scaleY).toFixed(4)}) rotate(${angle.toFixed(2)}) scale(1 ${wingScaleY.toFixed(3)})`;
      if (jetTransform !== lastJetTransform) {
        jetGroupRef.current?.setAttribute("transform", jetTransform);
        lastJetTransform = jetTransform;
      }
      const shadowTransform = `translate(-6, ${(8 + bankDeg * 0.18).toFixed(2)}) scale(0.95)`;
      if (shadowTransform !== lastShadowTransform) {
        shadowGroupRef.current?.setAttribute("transform", shadowTransform);
        lastShadowTransform = shadowTransform;
      }
      const dorsalValue = dorsalOp.toFixed(3);
      if (dorsalValue !== lastDorsalOp) {
        dorsalRef.current?.setAttribute("opacity", dorsalValue);
        lastDorsalOp = dorsalValue;
      }
      const bellyValue = bellyOp.toFixed(3);
      if (bellyValue !== lastBellyOp) {
        bellyRef.current?.setAttribute("opacity", bellyValue);
        lastBellyOp = bellyValue;
      }

      // In lite mode: no vortices, no afterburner pulsing — keep plane visible but reduce rAF work.
      if (lite) {
        if (vortexGroupRef.current && lastVortOp !== 0) {
          vortexGroupRef.current.setAttribute("opacity", "0");
          lastVortOp = 0;
        }
      } else {
        const vortOp = Math.min(
          0.85,
          Math.abs(bankDeg) / 22 +
            (inRoll ? Math.sin(rollPhase * Math.PI) * 0.8 : 0) +
            vel * 12,
        );
        const vL = 1 + Math.min(1.6, Math.abs(bankDeg) / 26 + vel * 20);
        const curl = inRoll ? Math.sin(rollPhase * Math.PI * 2) * 10 : 0;
        const vortValue = vortOp.toFixed(3);
        if (Math.abs(vortOp - lastVortOp) > 0.01) {
          vortexGroupRef.current?.setAttribute("opacity", vortValue);
          lastVortOp = Number(vortValue);
        }
        const vortexTransform = `scale(${vL.toFixed(3)} ${(1 + curl * 0.015).toFixed(3)})`;
        if (vortexTransform !== lastVortexTransform) {
          vortexGroupRef.current?.setAttribute("transform", vortexTransform);
          lastVortexTransform = vortexTransform;
        }
      }

      const plumeTransform = lite ? "scale(1 1)" : `scale(${(1 + Math.min(1.8, vel * 28)).toFixed(3)} 1)`;
      if (plumeTransform !== lastPlumeTransform) {
        plumeRef.current?.setAttribute("transform", plumeTransform);
        lastPlumeTransform = plumeTransform;
      }
      const burnerTransform = lite ? "scale(1 1)" : `scale(${(1 + Math.min(2.2, vel * 34)).toFixed(3)} 1)`;
      if (burnerTransform !== lastBurnerTransform) {
        burnerRef.current?.setAttribute("transform", burnerTransform);
        lastBurnerTransform = burnerTransform;
      }
      const burnerValue = lite ? "0" : Math.min(0.9, vel * 40).toFixed(3);
      if (burnerValue !== lastBurnerOp) {
        burnerRef.current?.setAttribute("opacity", burnerValue);
        lastBurnerOp = burnerValue;
      }
    };

    scrollEngine.initialize();
    sampledWidth = window.innerWidth;
    sampleLut();
    const unsub = paintOnceUnderReducedMotion(paint, !!reducedMotion);
    const handleResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resizeTimer = undefined;
        const width = window.innerWidth;
        // Mobile browser chrome changes height while scrolling; it does not
        // change the SVG's horizontal scale, so do not resample the LUT.
        if (Math.abs(width - sampledWidth) < 2) return;
        sampledWidth = width;
        sampleLut();
        if (!reducedMotion) scrollEngine.settle();
        paint();
      }, 120);
    };
    window.addEventListener("resize", handleResize, { passive: true });
    return () => {
      unsub();
      window.removeEventListener("resize", handleResize);
      if (resizeTimer) clearTimeout(resizeTimer);
    };
  }, [lite]);

  return (
    <div
      aria-hidden="true"
      className="sb-flight pointer-events-none fixed inset-0 z-30 overflow-hidden"
    >
      <svg
        viewBox="0 0 1200 1000"
        preserveAspectRatio="none"
        className="h-full w-full"
      >
        <defs>
          <linearGradient
            id="jetFuselageGrad"
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <stop offset="0%" stopColor={SVG_COLORS.white} />
            <stop offset="50%" stopColor={SVG_COLORS.zinc100} />
            <stop offset="100%" stopColor={SVG_COLORS.zinc300} />
          </linearGradient>
          <linearGradient id="jetWingGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={SVG_COLORS.white} />
            <stop offset="65%" stopColor={SVG_COLORS.zinc200} />
            <stop offset="100%" stopColor={SVG_COLORS.zinc400} />
          </linearGradient>
          <linearGradient id="jetPlumeGrad" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={SVG_COLORS.indigo100} stopOpacity="0.55" />
            <stop offset="50%" stopColor={SVG_COLORS.indigo400} stopOpacity="0.22" />
            <stop offset="100%" stopColor={SVG_COLORS.violet400} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="jetAfterburnGrad" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={SVG_COLORS.white} stopOpacity="0.95" />
            <stop offset="40%" stopColor={SVG_COLORS.indigo400} stopOpacity="0.85" />
            <stop offset="100%" stopColor={SVG_COLORS.violet400} stopOpacity="0" />
          </linearGradient>
        </defs>
        <g ref={cameraRef} transform="translate(0 380)" className="sb-will-transform">
          <path
            d={FLIGHT_PATH_D}
            fill="none"
            stroke="currentColor"
            opacity="0.18"
            strokeWidth="2.2"
            strokeDasharray="8 12"
            strokeLinecap="round"
          />
          <path
            ref={pathRef}
            d={FLIGHT_PATH_D}
            fill="none"
            stroke="currentColor"
            opacity="0.62"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="4200 4200"
            strokeDashoffset={4200}
          />
          <g
            ref={jetGroupRef}
            transform="translate(580 90) scale(1 1) rotate(7)"
            className="sb-will-transform"
          >
            <ExecutiveMonochromeJet
              bankDeg={0}
              shadowGroupRef={shadowGroupRef}
              plumeGroupRef={plumeRef}
              burnerGroupRef={burnerRef}
              vortexGroupRef={vortexGroupRef}
              vortexTopRef={vortexTopRef}
              vortexBottomRef={vortexBottomRef}
              dorsalShadeRef={dorsalRef}
              bellyShadeRef={bellyRef}
            />
          </g>
        </g>
      </svg>
    </div>
  );
}


