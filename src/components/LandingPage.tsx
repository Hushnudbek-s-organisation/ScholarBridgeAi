"use client";

import { BrandingImage } from "./BrandingImage";
import React from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

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
export function LandingPage({ onStart, onEnterApp, onSignIn }: LandingPageProps) {
  const t = useTranslations("landing");
  const nav = useTranslations("nav");
  const tm = useTranslations("meta");

  const steps = [
    { num: "01", label: t("step1Label"), title: t("step1Title"), text: t("step1Text") },
    { num: "02", label: t("step2Label"), title: t("step2Title"), text: t("step2Text") },
    { num: "03", label: t("step3Label"), title: t("step3Title"), text: t("step3Text") },
    { num: "04", label: t("step4Label"), title: t("step4Title"), text: t("step4Text") },
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

  const mockSidebar = [
    { label: nav("dashboard"), active: true },
    { label: nav("universities") },
    { label: nav("scholarships") },
    { label: nav("chances") },
    { label: nav("myApplications") },
    { label: nav("deadlines") },
    { label: nav("advisor") },
  ];

  return (
    <div className="min-h-screen bg-[#f7f9fc] font-sans text-[#101828]">
      {/* ===== Header ===== */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-[72px] w-[min(1160px,92%)] items-center justify-between">
          <a href="#top" className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
            <span className="grid h-[34px] w-[34px] place-items-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
              <BrandingImage alt={t("logoAlt")} className="h-[34px] w-[34px] object-cover" />
            </span>
            {tm("appName")}
          </a>
          <nav className="hidden items-center gap-7 text-sm text-slate-600 md:flex">
            <button onClick={() => scrollToId("how")} className="hover:text-slate-900">{t("navHow")}</button>
            <button onClick={() => scrollToId("features")} className="hover:text-slate-900">{t("navFeatures")}</button>
            <button onClick={() => scrollToId("chancing")} className="hover:text-slate-900">{t("navChancing")}</button>
            <button onClick={() => scrollToId("roadmap")} className="hover:text-slate-900">{t("navPlanning")}</button>
          </nav>
          <div className="flex items-center gap-2.5">
            {onSignIn && (
              <button
                onClick={onSignIn}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold hover:-translate-y-px hover:border-slate-300 transition"
              >
                {t("signIn")}
              </button>
            )}
            <button
              onClick={onStart}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 hover:-translate-y-px hover:bg-indigo-500 transition"
            >
              {t("getStarted")}
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        {/* ===== Hero ===== */}
        <section className="relative overflow-hidden py-[72px] sm:py-20">
          <div className="pointer-events-none absolute -right-56 -top-56 h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle,rgba(124,92,255,0.16),transparent_68%)]" />
          <div className="relative mx-auto grid w-[min(1160px,92%)] items-center gap-12 lg:grid-cols-[1.02fr_0.98fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-extrabold text-indigo-700">
                <span className="h-[7px] w-[7px] rounded-full bg-indigo-600" />
                {t("heroBadge")}
              </span>
              <h1 className="mt-5 max-w-[700px] text-[clamp(40px,5.5vw,64px)] font-extrabold leading-[1.03] tracking-[-0.03em]">
                {t("heroTitle")}{" "}
                <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">
                  {t("heroTitleAccent")}
                </span>
              </h1>
              <p className="mt-6 max-w-[620px] text-base text-slate-500 sm:text-lg">{t("heroBody")}</p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <button
                  onClick={onStart}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-extrabold text-white shadow-xl shadow-indigo-600/25 hover:-translate-y-px hover:bg-indigo-500 transition"
                >
                  {t("ctaStart")} <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => scrollToId("how")}
                  className="rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 hover:-translate-y-px hover:border-slate-300 transition"
                >
                  {t("ctaHow")}
                </button>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-slate-400">
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />{t("trust1")}</span>
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />{t("trust2")}</span>
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />{t("trust3")}</span>
              </div>
              {onEnterApp && (
                <button onClick={onEnterApp} className="mt-5 text-xs font-semibold text-slate-400 underline-offset-4 hover:text-slate-600 hover:underline">
                  {t("enterApp")}
                </button>
              )}
            </div>

            {/* Dashboard mock (decorative product preview) */}
            <div className="relative mx-auto w-full max-w-[650px]">
              <div className="overflow-hidden rounded-[25px] border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 lg:rotate-[1.2deg]">
                <div className="flex h-[46px] items-center gap-1.5 border-b border-slate-200 px-4">
                  <span className="h-2 w-2 rounded-full bg-slate-300" />
                  <span className="h-2 w-2 rounded-full bg-slate-300" />
                  <span className="h-2 w-2 rounded-full bg-slate-300" />
                </div>
                <div className="grid grid-cols-[145px_1fr] min-h-[420px]">
                  <aside className="hidden border-r border-slate-200 bg-slate-50/80 p-3 sm:block">
                    <div className="px-2 pb-4 pt-1 text-[11px] font-extrabold tracking-wide text-slate-700">{tm("appName").toUpperCase()}</div>
                    {mockSidebar.map((s) => (
                      <div
                        key={s.label}
                        className={`mb-0.5 rounded-lg px-2.5 py-2 text-[11px] ${s.active ? "bg-indigo-100 font-extrabold text-indigo-700" : "text-slate-500"}`}
                      >
                        {s.label}
                      </div>
                    ))}
                  </aside>
                  <div className="p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="text-base font-extrabold sm:text-lg">{t("mockTitle")}</div>
                      <div className="h-7 w-7 rounded-full bg-indigo-100" />
                    </div>
                    <div className="mb-3 grid grid-cols-3 gap-2">
                      <div className="rounded-xl border border-slate-200 p-3">
                        <small className="text-[9px] font-bold text-slate-400">{t("mockStrength")}</small>
                        <strong className="mt-0.5 block text-lg font-black">84%</strong>
                      </div>
                      <div className="rounded-xl border border-slate-200 p-3">
                        <small className="text-[9px] font-bold text-slate-400">{t("mockMatched")}</small>
                        <strong className="mt-0.5 block text-lg font-black">42</strong>
                      </div>
                      <div className="rounded-xl border border-slate-200 p-3">
                        <small className="text-[9px] font-bold text-slate-400">{t("mockScholarships")}</small>
                        <strong className="mt-0.5 block text-lg font-black text-emerald-600">18</strong>
                      </div>
                    </div>
                    <div className="mb-2.5 rounded-2xl border border-slate-200 p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-extrabold">{t("mockSchool1")}</div>
                          <div className="text-[9px] text-slate-400">{t("mockSchool1Sub")}</div>
                        </div>
                        <div className="text-base font-black text-indigo-600">92%</div>
                      </div>
                      <div className="my-2.5 h-[5px] rounded-full bg-slate-100">
                        <span className="block h-full w-[92%] rounded-full bg-gradient-to-r from-indigo-600 to-violet-500" />
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <span className="rounded-md bg-slate-50 px-1.5 py-1 text-[8px] font-semibold text-slate-500">{t("mockTag1")}</span>
                        <span className="rounded-md bg-slate-50 px-1.5 py-1 text-[8px] font-semibold text-slate-500">{t("mockTag2")}</span>
                        <span className="rounded-md bg-slate-50 px-1.5 py-1 text-[8px] font-semibold text-slate-500">{t("mockTag3")}</span>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-extrabold">{t("mockActions")}</div>
                          <div className="text-[9px] text-slate-400">{t("mockActionsSub")}</div>
                        </div>
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-700">{t("mockPriority")}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1">
                        <span className="rounded-md bg-slate-50 px-1.5 py-1 text-[8px] font-semibold text-slate-500">{t("mockTag4")}</span>
                        <span className="rounded-md bg-slate-50 px-1.5 py-1 text-[8px] font-semibold text-slate-500">{t("mockTag5")}</span>
                        <span className="rounded-md bg-slate-50 px-1.5 py-1 text-[8px] font-semibold text-slate-500">{t("mockTag6")}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== How it works ===== */}
        <section id="how" className="py-20 sm:py-24">
          <div className="mx-auto w-[min(1160px,92%)]">
            <div className="mx-auto mb-11 max-w-[700px] text-center">
              <div className="text-[11px] font-black uppercase tracking-[1.5px] text-indigo-600">{t("howEyebrow")}</div>
              <h2 className="mt-2.5 text-3xl font-extrabold leading-tight tracking-[-0.02em] sm:text-[42px]">{t("howTitle")}</h2>
              <p className="mt-3 text-base text-slate-500">{t("howText")}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((s) => (
                <div key={s.num} className="rounded-2xl border border-slate-200 bg-white p-6">
                  <div className="text-xs font-black text-indigo-600">{s.num} — {s.label}</div>
                  <h3 className="mb-1.5 mt-3 text-base font-extrabold">{s.title}</h3>
                  <p className="text-[13px] text-slate-500">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== Features (dark) ===== */}
        <section id="features" className="bg-[#0b1020] py-20 text-white sm:py-24">
          <div className="mx-auto w-[min(1160px,92%)]">
            <div className="mx-auto mb-11 max-w-[700px] text-center">
              <div className="text-[11px] font-black uppercase tracking-[1.5px] text-indigo-400">{t("featEyebrow")}</div>
              <h2 className="mt-2.5 text-3xl font-extrabold leading-tight tracking-[-0.02em] sm:text-[42px]">{t("featTitle")}</h2>
              <p className="mt-3 text-base text-slate-400">{t("featText")}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <div key={f.title} className="min-h-[205px] rounded-2xl border border-[#252d42] bg-[#11182b] p-6">
                  <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-[#20264c] text-sm font-black text-indigo-300">{f.icon}</div>
                  <h3 className="text-base font-extrabold">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-slate-400">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== Chancing (honest) ===== */}
        <section id="chancing" className="py-20 sm:py-24">
          <div className="mx-auto grid w-[min(1160px,92%)] items-center gap-10 lg:grid-cols-2">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[1.5px] text-indigo-600">{t("chanceEyebrow")}</div>
              <h2 className="mt-2.5 text-3xl font-extrabold leading-tight tracking-[-0.02em] sm:text-[42px]">{t("chanceTitle")}</h2>
              <p className="mt-4 text-base text-slate-500 sm:text-lg">{t("chanceText")}</p>
              <ul className="mt-5 list-disc space-y-2 pl-5 text-slate-600">
                <li>{t("chanceLi1")}</li>
                <li>{t("chanceLi2")}</li>
                <li>{t("chanceLi3")}</li>
              </ul>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <strong className="text-sm font-extrabold">{t("chanceCardLabel")}</strong>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700">{t("chanceHybrid")}</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-b border-slate-100 py-3.5">
                <span className="text-sm text-slate-600">{t("chanceMatch")}</span>
                <strong className="text-base font-black">92%</strong>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 py-3.5">
                <span className="text-sm text-slate-600">{t("chanceAdmission")}</span>
                <span className="text-4xl font-black tracking-tight text-indigo-600">—</span>
              </div>
              <div className="flex items-center justify-between py-3.5">
                <span className="text-sm text-slate-600">{t("chanceEvidence")}</span>
                <strong className="text-base font-black">{t("chanceBuilding")}</strong>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-slate-400">{t("chanceNote")}</p>
            </div>
          </div>
        </section>

        {/* ===== Roadmap ===== */}
        <section id="roadmap" className="pb-20 sm:pb-24">
          <div className="mx-auto w-[min(1160px,92%)]">
            <div className="mx-auto mb-11 max-w-[700px] text-center">
              <div className="text-[11px] font-black uppercase tracking-[1.5px] text-indigo-600">{t("roadEyebrow")}</div>
              <h2 className="mt-2.5 text-3xl font-extrabold leading-tight tracking-[-0.02em] sm:text-[42px]">{t("roadTitle")}</h2>
              <p className="mt-3 text-base text-slate-500">{t("roadText")}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {roadItems.map((r) => (
                <div key={r.num} className="rounded-2xl border border-slate-200 bg-white p-6">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-base font-black text-indigo-600">{r.num}</div>
                  <h3 className="mb-1.5 mt-4 text-base font-extrabold">{r.title}</h3>
                  <p className="text-sm text-slate-500">{r.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== Testimonial ===== */}
        <section className="pb-20 sm:pb-24">
          <div className="mx-auto w-[min(1160px,92%)]">
            <div className="mx-auto max-w-[900px] rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-9 text-center sm:p-10">
              <div className="flex justify-center"><Sparkles className="h-5 w-5 text-indigo-500" /></div>
              <p className="mt-4 text-xl font-bold leading-relaxed tracking-[-0.01em] sm:text-2xl">“{t("quote")}”</p>
              <p className="mt-4 text-[13px] text-slate-500">{t("quoteBy")}</p>
            </div>
          </div>
        </section>

        {/* ===== CTA ===== */}
        <section className="pb-22">
          <div className="mx-auto w-[min(1160px,92%)]">
            <div className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-[#161b38] to-[#29235b] px-6 py-14 text-center text-white sm:px-16 sm:py-16">
              <div className="pointer-events-none absolute -right-24 -top-40 h-[350px] w-[350px] rounded-full bg-[radial-gradient(circle,rgba(148,92,255,0.35),transparent_70%)]" />
              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-[11px] font-bold">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" /> {t("ctaBadge")}
                </div>
                <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.02em] sm:text-[45px]">{t("ctaTitle")}</h2>
                <p className="mx-auto mt-3 max-w-[620px] text-sm text-slate-300 sm:text-base">{t("ctaText")}</p>
                <button
                  onClick={onStart}
                  className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-extrabold text-indigo-700 shadow-xl hover:-translate-y-px transition"
                >
                  {t("ctaBtn")} <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ===== Footer ===== */}
      <footer className="border-t border-slate-200 py-9 text-xs text-slate-400">
        <div className="mx-auto flex w-[min(1160px,92%)] flex-col items-center justify-between gap-4 sm:flex-row">
          <div>© {new Date().getFullYear()} {t("footerLeft")}</div>
          <div className="flex items-center gap-4">
            <a href="/privacy" className="hover:text-slate-600">{t("footerPrivacy")}</a>
            <a href="/terms" className="hover:text-slate-600">{t("footerTerms")}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
