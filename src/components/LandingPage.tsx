"use client";

import { BrandingImage } from "./BrandingImage";
import React, { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { motion } from "framer-motion";
import { Reveal, RevealGroup, RevealItem } from "./motion";
import { staggerParent } from "./motion/variants";
import { ThemeSwitch } from "./ThemeToggle";

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
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Award,
  Bot,
  CheckCircle2,
  CheckSquare,
  Compass,
  Crown,
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

export interface MarqueeUniversityItem {
  rank: string;
  name: string;
  country: string;
  landmark: string;
  url: string;
}

/** Row 1: QS #1–#8, continuously scrolling right. */
export const MARQUEE_ROW_1: MarqueeUniversityItem[] = [
  {
    rank: "QS #1",
    name: "MIT (Massachusetts Institute of Technology)",
    country: "🇺🇸 USA",
    landmark: "Great Dome, Cambridge MA",
    url: "https://upload.wikimedia.org/wikipedia/commons/9/9e/Great_Dome%2C_MIT_-_IMG_8390.JPG",
  },
  {
    rank: "QS #2",
    name: "Imperial College London",
    country: "🇬🇧 UK",
    landmark: "Queen's Tower, South Kensington",
    url: "https://upload.wikimedia.org/wikipedia/commons/2/2e/Queen%27s_Tower%2C_Imperial_College_London.jpg",
  },
  {
    rank: "QS #3",
    name: "Stanford University",
    country: "🇺🇸 USA",
    landmark: "Main Quad, Palo Alto",
    url: "https://upload.wikimedia.org/wikipedia/commons/c/cb/Stanford_University_-_Main_Quad_12.JPG",
  },
  {
    rank: "QS #4",
    name: "University of Oxford",
    country: "🇬🇧 UK",
    landmark: "Radcliffe Camera & Bodleian",
    url: "https://upload.wikimedia.org/wikipedia/commons/3/3d/Radcliffe_Camera%2C_Oxford.jpg",
  },
  {
    rank: "QS #5",
    name: "Harvard University",
    country: "🇺🇸 USA",
    landmark: "Harvard Yard, Cambridge MA",
    url: "https://upload.wikimedia.org/wikipedia/commons/0/0e/HarvardYard.jpg",
  },
  {
    rank: "QS #6",
    name: "University of Cambridge",
    country: "🇬🇧 UK",
    landmark: "King's College Front Court",
    url: "https://upload.wikimedia.org/wikipedia/commons/5/58/Cambridge_-_King%27s_College_-_Front_court.jpg",
  },
  {
    rank: "QS #7",
    name: "ETH Zurich",
    country: "🇨🇭 Switzerland",
    landmark: "ETH Hauptgebäude & Polyterrasse",
    url: "https://upload.wikimedia.org/wikipedia/commons/7/7c/ETH_Z%C3%BCrich_2015.jpg",
  },
  {
    rank: "QS #8",
    name: "National University of Singapore (NUS)",
    country: "🇸🇬 Singapore",
    landmark: "University Hall, Kent Ridge",
    url: "https://upload.wikimedia.org/wikipedia/commons/1/1f/University_Hall%2C_National_University_of_Singapore_-_20070125.jpg",
  },
];

/** Row 2: QS #9–#21, continuously scrolling left. */
export const MARQUEE_ROW_2: MarqueeUniversityItem[] = [
  {
    rank: "QS #9",
    name: "UCL (University College London)",
    country: "🇬🇧 UK",
    landmark: "Wilkins Portico Building, London",
    url: "https://upload.wikimedia.org/wikipedia/commons/1/14/UCL_Portico_Building.jpg",
  },
  {
    rank: "QS #12",
    name: "NTU Singapore",
    country: "🇸🇬 Singapore",
    landmark: "The Hive Learning Hub",
    url: "https://upload.wikimedia.org/wikipedia/commons/9/90/The_Hive%2C_NTU_%28I%29.jpg",
  },
  {
    rank: "QS #13",
    name: "University of Chicago",
    country: "🇺🇸 USA",
    landmark: "Harper Memorial Library",
    url: "https://upload.wikimedia.org/wikipedia/commons/6/6b/University_of_Chicago%2C_Harper_Library.jpg",
  },
  {
    rank: "QS #16",
    name: "Cornell University",
    country: "🇺🇸 USA",
    landmark: "McGraw Tower & Uris Library",
    url: "https://upload.wikimedia.org/wikipedia/commons/0/0c/Cornell_University_-_McGraw_Tower_%28Uris_Library%29.jpg",
  },
  {
    rank: "QS #17",
    name: "Tsinghua University",
    country: "🇨🇳 China",
    landmark: "Old Gate of Tsinghua, Beijing",
    url: "https://upload.wikimedia.org/wikipedia/commons/d/d5/TsinghuaUniversityGate.JPG",
  },
  {
    rank: "QS #18",
    name: "UC Berkeley",
    country: "🇺🇸 USA",
    landmark: "Sather Gate & Campanile",
    url: "https://upload.wikimedia.org/wikipedia/commons/6/6f/Sather_Gate_at_University_of_California%2C_Berkeley%2C_California_LCCN2013633500_%28edited%29.jpg",
  },
  {
    rank: "QS #19",
    name: "The University of Melbourne",
    country: "🇦🇺 Australia",
    landmark: "Old Quad Colonnade",
    url: "https://upload.wikimedia.org/wikipedia/commons/5/53/Old_Quad_colonnade_University_of_Melbourne_2018.jpg",
  },
  {
    rank: "QS #21",
    name: "Yale University",
    country: "🇺🇸 USA",
    landmark: "Sterling Memorial Library Walk",
    url: "https://upload.wikimedia.org/wikipedia/commons/1/1b/Yale_University_Library_Walk.jpg",
  },
];

/** Row 3: QS #22–#53, continuously scrolling right. */
export const MARQUEE_ROW_3: MarqueeUniversityItem[] = [
  {
    rank: "QS #22",
    name: "EPFL Lausanne",
    country: "🇨🇭 Switzerland",
    landmark: "Rolex Learning Center",
    url: "https://upload.wikimedia.org/wikipedia/commons/e/ec/EPFL_Rolex_Learning_Center.jpg",
  },
  {
    rank: "QS #23",
    name: "Technical University of Munich (TUM)",
    country: "🇩🇪 Germany",
    landmark: "TUM Main Campus Munich",
    url: "https://upload.wikimedia.org/wikipedia/commons/b/bb/Technische_Universit%C3%A4t_M%C3%BCnchen.jpg",
  },
  {
    rank: "QS #25",
    name: "Princeton University",
    country: "🇺🇸 USA",
    landmark: "Historic Nassau Hall",
    url: "https://upload.wikimedia.org/wikipedia/commons/0/04/Nassau_Hall_Princeton.JPG",
  },
  {
    rank: "QS #26",
    name: "The University of Sydney",
    country: "🇦🇺 Australia",
    landmark: "Main Sandstone Quadrangle",
    url: "https://upload.wikimedia.org/wikipedia/commons/e/ee/University_of_Sydney%27s_Main_Quadrangle.jpg",
  },
  {
    rank: "QS #29",
    name: "University of Toronto",
    country: "🇨🇦 Canada",
    landmark: "University College Quad",
    url: "https://upload.wikimedia.org/wikipedia/commons/c/c8/University_College%2C_University_of_Toronto%2C_Canada.jpg",
  },
  {
    rank: "QS #37",
    name: "The University of Tokyo (UTokyo)",
    country: "🇯🇵 Japan",
    landmark: "Yasuda Auditorium, Hongo",
    url: "https://upload.wikimedia.org/wikipedia/commons/d/de/Yasuda_Auditorium.jpg",
  },
  {
    rank: "QS #38",
    name: "Columbia University",
    country: "🇺🇸 USA",
    landmark: "Low Memorial Library, NYC",
    url: "https://upload.wikimedia.org/wikipedia/commons/a/af/Low_Memorial_Library_Columbia_University_NYC.jpg",
  },
  {
    rank: "QS #39–53",
    name: "KAIST & Seoul National University",
    country: "🇰🇷 South Korea",
    landmark: "KAIST Daejeon & SNU Gwanak",
    url: "https://upload.wikimedia.org/wikipedia/commons/0/02/KAIST_from_across_Gapcheon.jpg",
  },
];

export const LANDING_PHOTOS = {
  heroStudentsMain:
    "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=85",
  heroCampusGraduation:
    "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=800&q=80",
  campusUsa:
    "https://upload.wikimedia.org/wikipedia/commons/9/9e/Great_Dome%2C_MIT_-_IMG_8390.JPG",
  campusUk:
    "https://upload.wikimedia.org/wikipedia/commons/3/3d/Radcliffe_Camera%2C_Oxford.jpg",
  campusGermany:
    "https://upload.wikimedia.org/wikipedia/commons/b/bb/Technische_Universit%C3%A4t_M%C3%BCnchen.jpg",
  campusSwiss:
    "https://upload.wikimedia.org/wikipedia/commons/7/7c/ETH_Z%C3%BCrich_2015.jpg",
  campusCanada:
    "https://upload.wikimedia.org/wikipedia/commons/c/c8/University_College%2C_University_of_Toronto%2C_Canada.jpg",
  campusAsia:
    "https://upload.wikimedia.org/wikipedia/commons/0/02/KAIST_from_across_Gapcheon.jpg",
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
      photo: LANDING_PHOTOS.step1Profile,
    },
    {
      num: "02",
      label: t("step2Label"),
      title: t("step2Title"),
      text: t("step2Text"),
      photo: LANDING_PHOTOS.step2UniversityMatch,
    },
    {
      num: "03",
      label: t("step3Label"),
      title: t("step3Title"),
      text: t("step3Text"),
      photo: LANDING_PHOTOS.step3SopWriting,
    },
    {
      num: "04",
      label: t("step4Label"),
      title: t("step4Title"),
      text: t("step4Text"),
      photo: LANDING_PHOTOS.step4VisaDeparture,
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
    { num: "1", title: t("r1Title"), text: t("r1Text") },
    { num: "2", title: t("r2Title"), text: t("r2Text") },
    { num: "3", title: t("r3Title"), text: t("r3Text") },
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
    items: NAV_SECTIONS.filter((section) => section.group === group).map(
      (section) => ({
        id: section.id,
        label: nav(NAV_SECTION_LABEL_KEYS[section.id] as never),
        icon: mockIcon[section.id] ?? Sparkles,
        pro: Boolean(section.premium),
      }),
    ),
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
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900 antialiased selection:bg-indigo-600 selection:text-white dark:bg-[#090e1a] dark:text-white dark:selection:bg-indigo-300 dark:selection:text-slate-950">
      <ScrollFlightPath />

      {/* ===== Header ===== */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-[#f8fafc]/90 backdrop-blur-xl dark:border-slate-800 dark:bg-[#090e1a]/90">
        <div className="mx-auto flex h-16 w-[min(1180px,94%)] items-center justify-between gap-2">
          <a
            href="#top"
            className="flex min-h-11 min-w-0 items-center gap-2 rounded-xl text-base font-black tracking-[-0.02em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-400 sm:gap-2.5 sm:text-lg"
            onClick={(event) => {
              event.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <span className="sb-logo-well grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-white p-0.5 dark:border-slate-800 dark:bg-[#111a2e]">
              <BrandingImage
                alt={t("logoAlt")}
                className="h-full w-full rounded-[9px] object-cover"
              />
            </span>
            <span className="min-w-0 break-words whitespace-normal text-[15px] leading-tight sm:text-lg">
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
              <button
                key={item.id}
                onClick={() => scrollToId(item.id)}
                className="inline-flex min-h-11 items-center rounded-lg px-1 transition hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:text-indigo-300 dark:focus-visible:ring-indigo-400"
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <ThemeSwitch />
            {onSignIn && (
              <button
                onClick={onSignIn}
                className="hidden min-h-11 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-800 transition hover:-translate-y-px hover:border-indigo-300 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:text-slate-100 dark:hover:border-indigo-400 dark:hover:text-indigo-300 dark:focus-visible:ring-indigo-400 sm:block"
              >
                {t("signIn")}
              </button>
            )}
            <button
              onClick={onStart}
              className="hidden min-h-11 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:-translate-y-px hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus-visible:ring-indigo-400 dark:focus-visible:ring-offset-[#090e1a] sm:block"
            >
              {t("getStarted")}
            </button>
            <button
              ref={menuTriggerRef}
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              aria-expanded={menuOpen}
              aria-controls="landing-mobile-nav"
              aria-label={t("navAria")}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:text-slate-100 dark:hover:border-indigo-400 dark:hover:text-indigo-300 dark:focus-visible:ring-indigo-400 lg:hidden"
            >
              {menuOpen ? (
                <X className="h-5 w-5" aria-hidden />
              ) : (
                <Menu className="h-5 w-5" aria-hidden />
              )}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav
            id="landing-mobile-nav"
            aria-label={t("navAria")}
            className="border-t border-slate-200 bg-[#f8fafc] px-4 pb-3 pt-2 dark:border-slate-800 dark:bg-[#090e1a] lg:hidden"
          >
            <ul className="mx-auto flex w-[min(1180px,100%)] flex-col">
              {[
                { id: "how", label: t("navHow") },
                { id: "features", label: t("navFeatures") },
                { id: "chancing", label: t("navChancing") },
                { id: "roadmap", label: t("navPlanning") },
              ].map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => goToSection(item.id)}
                    className="flex min-h-11 w-full items-center rounded-lg px-2 text-left text-sm font-semibold text-slate-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-200 dark:hover:bg-indigo-500/10 dark:focus-visible:ring-indigo-400"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
              <li className="mt-1 border-t border-slate-200 pt-1 dark:border-slate-800 sm:hidden">
                <button
                  onClick={() => {
                    menuTriggerRef.current?.focus();
                    setMenuOpen(false);
                    onStart();
                  }}
                  className="flex min-h-11 w-full items-center rounded-lg px-2 text-left text-sm font-black text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300 dark:hover:bg-indigo-500/10 dark:focus-visible:ring-indigo-400"
                >
                  {t("getStarted")}
                </button>
              </li>
              {onSignIn && (
                <li className="sm:mt-1 sm:border-t sm:border-slate-200 sm:pt-1">
                  <button
                    onClick={() => {
                      menuTriggerRef.current?.focus();
                      setMenuOpen(false);
                      onSignIn();
                    }}
                    className="flex min-h-11 w-full items-center rounded-lg px-2 text-left text-sm font-semibold text-slate-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-200 dark:hover:bg-indigo-500/10 dark:focus-visible:ring-indigo-400"
                  >
                    {t("signIn")}
                  </button>
                </li>
              )}
            </ul>
          </nav>
        )}
      </header>

      <main id="top">
        {/* ===== Hero ===== */}
        <section className="relative overflow-hidden border-b border-slate-200 py-8 dark:border-slate-800 sm:py-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(99,102,241,0.16),transparent_36%),radial-gradient(circle_at_12%_78%,rgba(14,165,233,0.10),transparent_32%)] dark:bg-[radial-gradient(circle_at_82%_18%,rgba(99,102,241,0.18),transparent_36%),radial-gradient(circle_at_12%_78%,rgba(14,165,233,0.10),transparent_32%)]"
          />
          <div className="relative mx-auto grid w-[min(1180px,94%)] items-center gap-8 lg:grid-cols-[0.92fr_1.08fr]">
            <motion.div initial="hidden" animate="visible" variants={heroGroup}>
              <motion.span
                variants={heroItem}
                className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 dark:bg-indigo-300" />
                {t("heroBadge")}
              </motion.span>
              <motion.h1
                variants={heroItem}
                className="mt-4 max-w-[720px] text-[clamp(38px,5.2vw,64px)] font-black leading-[0.98] tracking-[-0.045em] text-slate-950 dark:text-white"
              >
                {t("heroTitle")}{" "}
                <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text font-serif font-medium italic text-transparent underline decoration-indigo-200 decoration-2 underline-offset-[0.12em] dark:from-indigo-300 dark:to-violet-300 dark:decoration-indigo-700">
                  {t("heroTitleAccent")}
                </span>
              </motion.h1>
              <motion.p
                variants={heroItem}
                className="mt-5 max-w-[620px] text-base leading-relaxed text-slate-600 dark:text-slate-300 sm:text-lg"
              >
                {t("heroBody")}
              </motion.p>
              <motion.div
                variants={heroItem}
                className="mt-6 flex flex-wrap items-center gap-3"
              >
                <button
                  onClick={onStart}
                  className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-black text-white shadow-xl shadow-indigo-600/25 transition hover:-translate-y-px hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus-visible:ring-indigo-400 dark:focus-visible:ring-offset-[#090e1a]"
                >
                  {t("ctaStart")} <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
                <button
                  onClick={() => scrollToId("how")}
                  className="min-h-12 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:-translate-y-px hover:border-indigo-300 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:text-slate-200 dark:hover:border-indigo-400 dark:hover:text-indigo-300 dark:focus-visible:ring-indigo-400"
                >
                  {t("ctaHow")}
                </button>
              </motion.div>
              <motion.div
                variants={heroItem}
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
              </motion.div>
              {onEnterApp && (
                <motion.button
                  variants={heroItem}
                  onClick={onEnterApp}
                  className="mt-3 inline-flex min-h-11 items-center rounded px-1 text-xs font-semibold text-indigo-700 underline-offset-4 hover:text-indigo-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300 dark:hover:text-indigo-200 dark:focus-visible:ring-indigo-400"
                >
                  {t("enterApp")}
                </motion.button>
              )}
            </motion.div>

            {/* A compact colorful preview built from the app's real navigation source. */}
            <motion.div
              className="relative mx-auto w-full max-w-[700px]"
              initial={{ opacity: 0, y: 28, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.7,
                delay: 0.15,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <div className="rounded-[26px] border border-indigo-100 bg-white p-2 shadow-2xl shadow-indigo-900/10 dark:border-slate-700 dark:bg-[#111a2e] dark:shadow-black/40">
                <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#111a2e]">
                  <div className="flex h-9 items-center gap-1.5 border-b border-slate-200 px-4 dark:border-slate-800">
                    <span className="h-2 w-2 rounded-full bg-rose-400 dark:bg-rose-300" />
                    <span className="h-2 w-2 rounded-full bg-amber-400 dark:bg-amber-300" />
                    <span className="h-2 w-2 rounded-full bg-emerald-400 dark:bg-emerald-300" />
                    <span className="ml-auto rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                      {t("demoBadge")}
                    </span>
                  </div>
                  <div className="grid min-h-[392px] grid-cols-1 sm:grid-cols-[146px_1fr]">
                    <aside className="hidden border-r border-slate-200 bg-[#f8fafc] p-2.5 dark:border-slate-800 dark:bg-[#0b1222] sm:block">
                      <div className="mb-2 flex items-center gap-1.5 px-1">
                        <span className="sb-logo-well grid h-6 w-6 shrink-0 place-items-center overflow-hidden rounded-md border border-slate-200 dark:border-slate-800">
                          <BrandingImage
                            alt={t("logoAlt")}
                            className="h-full w-full object-cover"
                          />
                        </span>
                        <span className="text-[10px] font-black text-slate-900 dark:text-white">
                          ScholarBridge
                        </span>
                        <span className="rounded bg-indigo-50 px-1 text-[6px] font-black text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                          AI
                        </span>
                      </div>
                      {mockSidebarGroups.map((group) => (
                        <div key={group.id} className="mb-1">
                          <div className="px-2 pb-0.5 pt-1 text-[7px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                            {group.label}
                          </div>
                          {group.items.map(({ id, label, icon: Icon, pro }) => (
                            <div
                              key={id}
                              className={`mb-0.5 flex items-center gap-1.5 rounded-md px-2 py-1 text-[8px] font-semibold ${
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
                              <span className="truncate">{label}</span>
                              {pro && (
                                <span className="ml-auto rounded bg-amber-100 px-1 text-[5px] font-black text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
                                  PRO
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ))}
                      <div className="mt-1 border-t border-slate-200 pt-1 dark:border-slate-800">
                        <div className="px-2 pb-0.5 text-[7px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                          {nav("accountCluster")}
                        </div>
                        {mockAccountItems.map(
                          ({ id, label, icon: Icon, pro }) => (
                            <div
                              key={id}
                              className={`mb-0.5 flex items-center gap-1.5 rounded-md px-2 py-1 text-[8px] font-semibold ${pro ? "border border-amber-200 text-amber-700 dark:border-amber-500/30 dark:text-amber-300" : "text-slate-600 dark:text-slate-300"}`}
                            >
                              <Icon
                                className="h-2.5 w-2.5 shrink-0"
                                aria-hidden
                              />
                              <span className="truncate">{label}</span>
                              {pro && (
                                <span className="ml-auto rounded bg-amber-100 px-1 text-[5px] font-black text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
                                  PRO
                                </span>
                              )}
                            </div>
                          ),
                        )}
                      </div>
                    </aside>

                    <div className="bg-slate-50 p-3 dark:bg-[#090e1a] sm:p-4">
                      <div className="flex gap-3 rounded-2xl bg-gradient-to-br from-[#12143a] via-[#1b1f5e] to-[#2a3ba8] p-4 text-white dark:border dark:border-indigo-500/20 dark:from-[#0c1324] dark:via-[#151d4b] dark:to-[#243486]">
                        <div className="min-w-0 flex-1">
                          <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[8px] font-semibold">
                            <Sparkles
                              className="h-2.5 w-2.5 text-amber-300"
                              aria-hidden
                            />{" "}
                            {t("mockActiveApplicant")}
                          </span>
                          <div className="mt-2 text-[13px] font-black leading-tight sm:text-[15px]">
                            {td("heroTitle")}
                          </div>
                          <p className="mt-1.5 text-[8px] leading-snug text-slate-300">
                            {t("mockHubSub")}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1 text-[7px] font-semibold">
                            <span className="inline-flex items-center gap-0.5 rounded bg-white/10 px-1.5 py-0.5">
                              <GraduationCap
                                className="h-2.5 w-2.5"
                                aria-hidden
                              />{" "}
                              {t("mockChipBachelor")}
                            </span>
                            <span className="inline-flex items-center gap-0.5 rounded bg-white/10 px-1.5 py-0.5">
                              <Wallet
                                className="h-2.5 w-2.5 text-emerald-300"
                                aria-hidden
                              />{" "}
                              $25 000/yr
                            </span>
                            <span className="inline-flex items-center gap-0.5 rounded bg-white/10 px-1.5 py-0.5">
                              <Trophy
                                className="h-2.5 w-2.5 text-amber-300"
                                aria-hidden
                              />{" "}
                              {t("mockChipPubs")}
                            </span>
                          </div>
                        </div>
                        <div className="hidden w-[108px] shrink-0 flex-col items-center rounded-xl border border-white/20 p-2 sm:flex">
                          <div className="text-[7px] font-bold uppercase tracking-wider text-slate-300">
                            {td("readinessLabel")}
                          </div>
                          <div className="my-1.5 grid h-12 w-12 place-items-center rounded-full border-[3px] border-indigo-400/70">
                            <span className="text-base font-black text-amber-300">
                              47<small className="text-[7px]">%</small>
                            </span>
                          </div>
                          <div className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-md bg-gradient-to-r from-amber-400 to-orange-500 py-1 text-[7px] font-black text-slate-950 sb-ink-on-warm">
                            <Bot className="h-2.5 w-2.5" aria-hidden />{" "}
                            {td("runAudit")}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {mockStats.map(
                          ({ label, value, sub, icon: Icon, tone }) => (
                            <div
                              key={label}
                              className="rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-[#111a2e]"
                            >
                              <div className="flex items-start justify-between gap-1">
                                <small className="text-[7px] font-semibold text-slate-500 dark:text-slate-400">
                                  {label}
                                </small>
                                <span
                                  className={`grid h-4 w-4 place-items-center rounded ${tone}`}
                                >
                                  <Icon className="h-2.5 w-2.5" aria-hidden />
                                </span>
                              </div>
                              <strong className="mt-1 block text-base font-black text-slate-950 dark:text-white">
                                {value}
                              </strong>
                              <span className="text-[8px] text-slate-600 dark:text-slate-300">
                                {sub}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                      <div className="mt-3 rounded-xl border border-indigo-200 bg-white p-3 dark:border-indigo-500/30 dark:bg-[#111a2e]">
                        <div className="flex items-center gap-1 text-[10px] font-black text-indigo-700 dark:text-indigo-300">
                          <Compass className="h-3 w-3" aria-hidden />{" "}
                          {td("portfolioTitle")}
                        </div>
                        <p className="mt-1.5 text-[8px] leading-snug text-slate-500 dark:text-slate-400">
                          {t("mockPortfolioNote")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <UniversityCampusMarquee onStart={onStart} />

        {/* ===== How it works ===== */}
        <section
          id="how"
          className="scroll-mt-20 border-b border-slate-200 py-8 dark:border-slate-800 sm:py-10"
        >
          <div className="mx-auto w-[min(1180px,94%)]">
            <div className="mx-auto mb-6 max-w-[720px] text-center">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-300">
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
              {steps.map((step) => (
                <RevealItem
                  key={step.num}
                  className="rounded-2xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-[#111a2e]"
                >
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={step.photo}
                      alt={step.title}
                      loading="lazy"
                      decoding="async"
                      className="h-28 w-full object-cover transition-transform duration-500 hover:scale-[1.03]"
                    />
                  </div>
                  <div className="px-3 pb-3 pt-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-300">
                      {step.num} — {step.label}
                    </div>
                    <h3 className="mb-1.5 mt-2 text-base font-black text-slate-950 dark:text-white">
                      {step.title}
                    </h3>
                    <p className="text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
                      {step.text}
                    </p>
                  </div>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* ===== Features ===== */}
        <section
          id="features"
          className="scroll-mt-16 border-b border-slate-800 bg-slate-900 py-8 text-white sm:py-10"
        >
          <div className="mx-auto w-[min(1180px,94%)]">
            <div className="mx-auto mb-6 max-w-[720px] text-center">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">
                {t("featEyebrow")}
              </div>
              <h2 className="mt-2 text-3xl font-black leading-tight tracking-[-0.035em] sm:text-[40px]">
                {t("featTitle")}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-300 sm:text-base">
                {t("featText")}
              </p>
            </div>
            <RevealGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <RevealItem
                  key={feature.title}
                  className="min-h-[170px] rounded-2xl border border-white/10 bg-slate-800 p-5 dark:border-slate-700/70 dark:bg-[#111a2e]"
                >
                  <div className="mb-3 grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-xs font-black text-indigo-300">
                    {feature.icon}
                  </div>
                  <h3 className="text-base font-black text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
                    {feature.text}
                  </p>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* ===== Chancing (honest) ===== */}
        <section
          id="chancing"
          className="scroll-mt-16 border-b border-slate-200 py-8 dark:border-slate-800 sm:py-10"
        >
          <div className="mx-auto grid w-[min(1180px,94%)] items-center gap-7 lg:grid-cols-2">
            <Reveal>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-300">
                {t("chanceEyebrow")}
              </div>
              <h2 className="mt-2 text-3xl font-black leading-tight tracking-[-0.035em] text-slate-950 dark:text-white sm:text-[40px]">
                {t("chanceTitle")}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-slate-600 dark:text-slate-300">
                {t("chanceText")}
              </p>
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
              delay={0.12}
              className="rounded-2xl border border-slate-200 bg-white p-2 shadow-lg shadow-black/5 dark:border-slate-800 dark:bg-[#111a2e] dark:shadow-black/30"
            >
              <div className="rounded-xl border border-slate-200 p-5 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-sm font-black text-slate-950 dark:text-white">
                    {t("chanceCardLabel")}
                  </strong>
                  <span className="flex items-center gap-1.5">
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                      {t("demoBadge")}
                    </span>
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-black text-emerald-700 dark:text-emerald-300">
                      {t("chanceBadge")}
                    </span>
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between border-b border-slate-200 py-3 dark:border-slate-800">
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    {t("chanceMatch")}
                  </span>
                  <strong className="text-base font-black text-emerald-600 dark:text-emerald-300">
                    92%
                  </strong>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 py-3 dark:border-slate-800">
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    {t("chanceAdmission")}
                  </span>
                  <span className="text-4xl font-black tracking-tight text-indigo-600 dark:text-indigo-300">
                    —
                  </span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    {t("chanceDataBasis")}
                  </span>
                  <strong className="text-base font-black text-slate-950 dark:text-white">
                    {t("chanceDataPublished")}
                  </strong>
                </div>
                <p className="mt-2 border-t border-slate-200 pt-3 text-[11px] leading-relaxed text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  {t("chanceNote")}
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ===== Roadmap ===== */}
        <section
          id="roadmap"
          className="scroll-mt-16 border-b border-slate-200 py-8 dark:border-slate-800 sm:py-10"
        >
          <div className="mx-auto w-[min(1180px,94%)]">
            <div className="mx-auto mb-6 max-w-[720px] text-center">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-300">
                {t("roadEyebrow")}
              </div>
              <h2 className="mt-2 text-3xl font-black leading-tight tracking-[-0.035em] text-slate-950 dark:text-white sm:text-[40px]">
                {t("roadTitle")}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
                {t("roadText")}
              </p>
            </div>
            <RevealGroup className="grid gap-3 sm:grid-cols-3">
              {roadItems.map((item) => (
                <RevealItem
                  key={item.num}
                  className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111a2e]"
                >
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-50 text-sm font-black text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                    {item.num}
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
        </section>

        {/* ===== Testimonial ===== */}
        <section className="border-b border-slate-200 py-8 dark:border-slate-800 sm:py-10">
          <div className="mx-auto w-[min(1180px,94%)]">
            <Reveal>
              <div className="mx-auto max-w-[900px] rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-7 text-center dark:border-indigo-500/20 dark:from-indigo-500/10 dark:to-[#111a2e] dark:bg-[#111a2e] sm:p-8">
                <div className="mx-auto grid h-9 w-9 place-items-center rounded-full border border-indigo-200 bg-white/70 dark:border-indigo-500/30 dark:bg-indigo-500/10">
                  <Sparkles
                    className="h-4 w-4 text-indigo-500 dark:text-indigo-300"
                    aria-hidden
                  />
                </div>
                <p className="mx-auto mt-3 max-w-[760px] font-serif text-xl font-semibold italic leading-relaxed tracking-[-0.01em] text-slate-950 dark:text-white sm:text-2xl">
                  “{t("quote")}”
                </p>
                <p className="mt-3 text-[12px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  {t("quoteBy")}
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ===== CTA ===== */}
        <section className="py-8 sm:py-10">
          <div className="mx-auto w-[min(1180px,94%)]">
            <Reveal>
              <div className="relative overflow-hidden rounded-[26px] border border-indigo-900/20 bg-gradient-to-br from-[#161b38] via-[#20205a] to-[#29235b] px-6 py-10 text-center text-white dark:border-indigo-500/20 dark:from-[#0c1324] dark:via-[#171b47] dark:to-[#241d50] sm:px-14 sm:py-12">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_0%,rgba(148,92,255,0.35),transparent_42%)]"
                />
                <div className="relative">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em]">
                    <ShieldCheck
                      className="h-3.5 w-3.5 text-emerald-300"
                      aria-hidden
                    />{" "}
                    {t("ctaBadge")}
                  </div>
                  <h2 className="mt-4 text-3xl font-black tracking-[-0.035em] sm:text-[43px]">
                    {t("ctaTitle")}
                  </h2>
                  <p className="mx-auto mt-2 max-w-[620px] text-sm leading-relaxed text-slate-300 sm:text-base">
                    {t("ctaText")}
                  </p>
                  <button
                    onClick={onStart}
                    className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-7 py-3 text-sm font-black text-indigo-700 shadow-xl transition hover:-translate-y-px hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-900 dark:ring-offset-[#111a2e]"
                  >
                    {t("ctaBtn")} <ArrowRight className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      {/* ===== Footer ===== */}
      <footer className="border-t border-slate-200 py-7 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300">
        <div className="mx-auto flex w-[min(1180px,94%)] flex-col items-center justify-between gap-2 sm:flex-row">
          <div>
            © {new Date().getFullYear()} {t("footerLeft")}
          </div>
          <div className="flex items-center gap-4">
            <a href="/privacy" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded px-1 transition hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:text-indigo-300 dark:focus-visible:ring-indigo-400">
              {t("footerPrivacy")}
            </a>
            <a href="/terms" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded px-1 transition hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:text-indigo-300 dark:focus-visible:ring-indigo-400">
              {t("footerTerms")}
            </a>
          </div>
        </div>
        <div className="mx-auto mt-3 w-[min(1180px,94%)] border-t border-slate-200 pt-3 dark:border-slate-800">
          <AppNote kind="general" className="mx-auto max-w-[900px]" />
        </div>
      </footer>
    </div>
  );
}
const FLIGHT_PATH_D =
  "M 600 120 C 980 240, 1040 420, 760 560 C 480 700, 180 680, 220 880 C 260 1080, 920 1040, 950 1240 C 975 1380, 720 1410, 720 1280 C 720 1150, 980 1180, 880 1420 C 760 1680, 200 1660, 240 1940 C 280 2220, 980 2180, 920 2460 C 870 2660, 340 2620, 320 2820 C 305 2950, 550 2970, 540 2840 C 530 2710, 290 2750, 380 2990 C 460 3180, 880 3200, 600 3320";

/** The jet is intentionally all greyscale; site accents never bleed into the flight overlay. */
function ExecutiveMonochromeJet({ bankDeg }: { bankDeg: number }) {
  return (
    <g>
      <g
        transform={`translate(-6, ${8 + bankDeg * 0.18}) scale(0.95)`}
        opacity="0.18"
      >
        <path
          d="M 38 0 L 10 -5 L -8 -36 L -17 -36 L -10 -5 L -28 -4 L -36 -17 L -42 -17 L -36 0 L -42 17 L -36 17 L -28 4 L -10 5 L -17 36 L -8 36 L 10 5 Z"
          fill="#000"
        />
      </g>
      {/* Fading exhaust behind each nacelle, with a soft monochrome pulse. */}
      <g className="sb-jet-plumes" fill="url(#jetPlumeGrad)">
        <path d="M -8 -14 L -68 -18 L -68 -10 Z" />
        <path d="M -8 14 L -68 10 L -68 18 Z" />
        <path d="M -34 0 L -85 -4 L -72 0 L -85 4 Z" />
      </g>
      <rect
        x="-8"
        y="-19"
        width="14"
        height="6.5"
        rx="3"
        fill="#27272a"
        stroke="#09090b"
        strokeWidth="1.2"
      />
      <rect
        x="-8"
        y="12.5"
        width="14"
        height="6.5"
        rx="3"
        fill="#27272a"
        stroke="#09090b"
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
        stroke="#09090b"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M -9 -37 L -16 -39 L -17 -35 L -11 -34 Z M -9 37 L -16 39 L -17 35 L -11 34 Z"
        fill="#18181b"
      />
      <path
        d="M -2 -10 L -12 -31 M -2 10 L -12 31"
        fill="none"
        stroke="#52525b"
        strokeWidth="1"
        strokeDasharray="3 2"
      />
      {/* Swept horizontal stabilizers and sculpted metallic fuselage. */}
      <path
        d="M -24 -3.2 L -36 -18 L -42 -18 L -34 -2.5 Z M -24 3.2 L -36 18 L -42 18 L -34 2.5 Z"
        fill="url(#jetWingGrad)"
        stroke="#09090b"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M 40 0 C 31 -4.6, 18 -5.8, 4 -5.8 L -26 -4.2 L -39 -1.5 L -39 1.5 L -26 4.2 L 4 5.8 C 18 5.8, 31 4.6, 40 0 Z"
        fill="url(#jetFuselageGrad)"
        stroke="#09090b"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M 29 0 C 25 -3.1, 20 -3.6, 17 -3.2 C 19 -1.2, 19 1.2, 17 3.2 C 20 3.6, 25 3.1, 29 0 Z"
        fill="#09090b"
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
        stroke="#71717a"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <path
        d="M -14 -3.3 L 10 -3.6 M -14 3.3 L 10 3.6"
        stroke="#18181b"
        strokeWidth="1.2"
        strokeDasharray="1.5 3"
        strokeLinecap="round"
      />
      <path
        d="M -25 0 L -41 -2.2 L -43 0 L -41 2.2 Z"
        fill="#18181b"
        stroke="#09090b"
        strokeWidth="1.2"
      />
    </g>
  );
}

function ScrollFlightPath() {
  const pathRef = React.useRef<SVGPathElement | null>(null);
  const [flight, setFlight] = React.useState({
    x: 600,
    y: 120,
    angle: 22,
    bankDeg: 0,
    progress: 0,
    totalLen: 4200,
    cameraY: 360,
    screenAngle: 22,
    scaleX: 1,
    scaleY: 1,
  });

  React.useEffect(() => {
    let raf = 0;
    const updateFlight = () => {
      const path = pathRef.current;
      if (!path) return;
      const totalLen = path.getTotalLength() || 4200;
      const maxScroll = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      const progress = Math.max(0, Math.min(1, window.scrollY / maxScroll));
      const dist = progress * totalLen;
      const delta = Math.min(12, totalLen * 0.003);
      const pt = path.getPointAtLength(dist);
      const prev = path.getPointAtLength(Math.max(0, dist - delta));
      const next = path.getPointAtLength(Math.min(totalLen, dist + delta));
      const angle =
        (Math.atan2(next.y - prev.y, next.x - prev.x) * 180) / Math.PI;
      const prev2 = path.getPointAtLength(Math.max(0, dist - delta * 2.5));
      const anglePrev =
        (Math.atan2(pt.y - prev2.y, pt.x - prev2.x) * 180) / Math.PI;
      // Normalize angular difference at the -180/180 seam to prevent a bank spike.
      const turn = ((angle - anglePrev + 540) % 360) - 180;
      const bankDeg = Math.max(-24, Math.min(24, turn * 1.8));
      const linearY = 120 + progress * 3200;
      // SVG uses a 1000-unit viewport: the camera keeps the aircraft in its
      // 46–50% vertical band, even when the path loops backwards in world Y.
      const loopOffset = Math.max(-20, Math.min(20, (pt.y - linearY) * 0.35));
      const cameraY = 480 + loopOffset - pt.y;
      // Counter the non-uniform viewport projection so the jet keeps its
      // proportions on narrow phones while its route spans the full width.
      const scaleX = window.innerWidth / 1200;
      const scaleY = window.innerHeight / 1000;
      const screenAngle =
        (Math.atan2((next.y - prev.y) * scaleY, (next.x - prev.x) * scaleX) *
          180) /
        Math.PI;
      setFlight({
        x: pt.x,
        y: pt.y,
        angle,
        bankDeg,
        progress,
        totalLen,
        cameraY,
        screenAngle,
        scaleX,
        scaleY,
      });
    };
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateFlight);
    };
    updateFlight();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="sb-flight pointer-events-none fixed inset-0 z-20 overflow-hidden text-zinc-900/75 dark:text-white/80"
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
            <stop offset="0%" stopColor="#fff" />
            <stop offset="50%" stopColor="#f4f4f5" />
            <stop offset="100%" stopColor="#d4d4d8" />
          </linearGradient>
          <linearGradient id="jetWingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fff" />
            <stop offset="65%" stopColor="#e4e4e7" />
            <stop offset="100%" stopColor="#a1a1aa" />
          </linearGradient>
          <linearGradient id="jetPlumeGrad" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.55" />
            <stop offset="50%" stopColor="currentColor" stopOpacity="0.2" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g transform={`translate(0 ${flight.cameraY})`}>
          <path
            d={FLIGHT_PATH_D}
            fill="none"
            stroke="currentColor"
            opacity="0.25"
            strokeWidth="2.2"
            strokeDasharray="8 12"
            strokeLinecap="round"
          />
          <path
            ref={pathRef}
            d={FLIGHT_PATH_D}
            fill="none"
            stroke="currentColor"
            opacity="0.8"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeDasharray={`${flight.totalLen} ${flight.totalLen}`}
            strokeDashoffset={flight.totalLen * (1 - flight.progress)}
          />
          <g
            transform={`translate(${flight.x} ${flight.y}) scale(${1 / flight.scaleX} ${1 / flight.scaleY}) rotate(${flight.screenAngle})`}
          >
            <ExecutiveMonochromeJet bankDeg={flight.bankDeg} />
          </g>
        </g>
      </svg>
    </div>
  );
}

function UniversityCampusMarquee({ onStart }: { onStart: () => void }) {
  const renderRow = (items: MarqueeUniversityItem[], animClass: string) => (
    <div className="relative overflow-hidden">
      <div className={`sb-marquee-track ${animClass}`}>
        {[0, 1].map((copy) => (
          <div
            key={copy}
            className="flex shrink-0 gap-3 px-1.5"
            aria-hidden={copy === 1 ? true : undefined}
          >
            {items.map((university) => (
              <button
                key={university.name}
                type="button"
                tabIndex={copy === 1 ? -1 : undefined}
                onClick={onStart}
                className="group relative w-64 shrink-0 rounded-2xl border border-slate-200/90 bg-white p-2 text-left shadow-xs transition-all hover:border-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 sm:w-72 dark:border-slate-700/80 dark:bg-[#111a2e] dark:hover:border-indigo-400 dark:focus-visible:ring-indigo-400"
              >
                <span className="relative block h-32 w-full overflow-hidden rounded-xl border border-slate-200/70 bg-slate-100 dark:border-slate-700/70 dark:bg-slate-900">
                  {/* Native images avoid forcing a 48-image optimizer queue on first load. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={university.url}
                    alt={university.landmark}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />
                  <span className="absolute left-2 top-2 rounded-md bg-indigo-600/95 px-2 py-0.5 text-[10px] font-black text-white shadow-xs">
                    {university.rank}
                  </span>
                  <span className="absolute right-2 top-2 rounded-md bg-white/95 px-2 py-0.5 text-[10px] font-bold text-slate-950">
                    {university.country}
                  </span>
                  <span className="absolute bottom-2 left-2.5 right-2.5 text-white">
                    <span className="block truncate text-xs font-black leading-tight">
                      {university.name}
                    </span>
                    <span className="block truncate text-[10px] text-slate-300">
                      {university.landmark}
                    </span>
                  </span>
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <section
      id="university-marquee"
      aria-labelledby="university-marquee-title"
      className="relative z-10 border-b border-slate-200/80 bg-slate-100/60 py-8 dark:border-slate-800 dark:bg-[#0b1222] sm:py-10"
    >
      <div className="mx-auto mb-5 w-[min(1180px,94%)]">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-indigo-700 dark:text-indigo-300">
          QS Top 200 · 24 ta Top Universitet Kampusi · 3 Qator
        </span>
        <h2
          id="university-marquee-title"
          className="mt-2 text-2xl font-black tracking-[-0.03em] text-slate-950 dark:text-white sm:text-3xl"
        >
          Jahonning Yetakchi Universitetlari Kampuslari
        </h2>
      </div>
      <div className="space-y-3 overflow-hidden">
        {renderRow(MARQUEE_ROW_1, "sb-marquee-right")}
        {renderRow(MARQUEE_ROW_2, "sb-marquee-left")}
        {renderRow(MARQUEE_ROW_3, "sb-marquee-right-slow")}
      </div>
    </section>
  );
}
