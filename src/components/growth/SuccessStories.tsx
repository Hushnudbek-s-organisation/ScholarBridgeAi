"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { countryTranslationKey, withQsTop200Countries } from "@/lib/countries";
import { AnimatePresence, motion } from "framer-motion";
import {
  Award,
  BadgeCheck,
  BookOpen,
  Clock,
  Eye,
  GraduationCap,
  MessageSquareQuote,
  PenLine,
  Search,
  Send,
  Star,
  Trash2,
  Users,
  X,
} from "lucide-react";
import type { StudentProfile } from "../Navbar";
import { api, EmptyState, ErrorNote, Field, inputCls, LoadingBlock, PageHeader, Segmented, Toast, useToast } from "./ui";

interface Story {
  id: number;
  displayName: string;
  homeCountry: string | null;
  admittedUniversity: string;
  admittedCountry: string | null;
  otherAdmits: string[];
  degreeLevel: string | null;
  major: string | null;
  intakeYear: number | null;
  gpa: number | null;
  gpaScale: number | null;
  ielts: number | null;
  toefl: number | null;
  sat: number | null;
  activities: string[];
  awards: string[];
  essayTitle: string | null;
  essayExcerpt: string | null;
  advice: string | null;
  scholarshipName: string | null;
  scholarshipAmountUsd: number | null;
  isVerified: boolean;
  isFeatured: boolean;
  views: number;
  twin: number | null;
  reasons: string[];
  status?: "pending" | "approved" | "rejected";
}

const DEGREES = ["Bachelor", "Master", "PhD", "Foundation", "Other"];
const REASONS = ["same_field", "same_degree", "similar_gpa", "similar_english", "similar_sat", "target_country", "same_home_country"];

const emptyForm = {
  displayName: "",
  homeCountry: "",
  admittedUniversity: "",
  admittedCountry: "",
  otherAdmits: "",
  degreeLevel: "Bachelor",
  major: "",
  intakeYear: "",
  gpa: "",
  gpaScale: "4",
  ielts: "",
  toefl: "",
  sat: "",
  activities: "",
  awards: "",
  essayTitle: "",
  essayExcerpt: "",
  advice: "",
  scholarshipName: "",
  scholarshipAmountUsd: "",
  consent: false,
};

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

/**
 * Success stories — AdmitSee/AdmitYogi's "see how students like you got in",
 * adapted: stories are free, written by our own admitted students, moderated
 * by the admin before publishing, and sorted by a "profile twin" score so
 * the most relevant ones come first.
 */
export function SuccessStories({ activeProfile }: { activeProfile: StudentProfile | null }) {
  const t = useTranslations("stories");
  const tCountry = useTranslations("countryNames");
  const [view, setView] = useState<"browse" | "share" | "mine">("browse");
  const [items, setItems] = useState<Story[] | null>(null);
  const [countries, setCountries] = useState<string[]>([]);
  const [mine, setMine] = useState<Story[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [degree, setDegree] = useState("");
  const [sort, setSort] = useState<"twin" | "featured" | "recent">(activeProfile ? "twin" : "featured");
  const [openStory, setOpenStory] = useState<Story | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [sending, setSending] = useState(false);
  const [toast, showToast] = useToast();
  const [reloadMine, setReloadMine] = useState(0);
  const profileId = activeProfile?.id ?? null;

  // Debounced browse query.
  useEffect(() => {
    let live = true;
    const params = new URLSearchParams({ sort });
    if (profileId) params.set("profileId", String(profileId));
    if (q.trim()) params.set("q", q.trim());
    if (country) params.set("country", country);
    if (degree) params.set("degree", degree);
    const timer = window.setTimeout(() => {
      api<{ items: Story[]; countries: string[] }>(`/api/stories?${params}`)
        .then((d) => {
          if (!live) return;
          setItems(d.items);
          setCountries(d.countries);
          setError(null);
        })
        .catch((e: Error) => live && setError(e.message));
    }, 250);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [profileId, q, country, degree, sort]);

  useEffect(() => {
    if (!profileId || view !== "mine") return;
    let live = true;
    api<{ items: Story[] }>(`/api/stories?mine=1&profileId=${profileId}`)
      .then((d) => live && setMine(d.items))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [profileId, view, reloadMine]);

  const openFull = async (s: Story) => {
    setOpenStory(s);
    try {
      const d = await api<{ story: Story }>(`/api/stories?id=${s.id}`);
      setOpenStory((cur) => (cur?.id === s.id ? { ...d.story, twin: s.twin, reasons: s.reasons } : cur));
    } catch {
      // keep the list copy
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.consent) {
      showToast(t("needConsent"));
      return;
    }
    setSending(true);
    try {
      await api("/api/stories", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          otherAdmits: lines(form.otherAdmits),
          activities: lines(form.activities),
          awards: lines(form.awards),
        }),
      });
      setForm(emptyForm);
      showToast(t("submitted"));
      setView("mine");
      setReloadMine((r) => r + 1);
    } catch (err) {
      showToast((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  const withdraw = async (s: Story) => {
    if (!window.confirm(t("confirmWithdraw"))) return;
    try {
      await api(`/api/stories?id=${s.id}`, { method: "DELETE" });
      setMine((m) => m?.filter((x) => x.id !== s.id) ?? m);
    } catch (err) {
      showToast((err as Error).message);
    }
  };

  const reasonLabel = (r: string) => (REASONS.includes(r) ? t(`reason.${r}`) : r);
  const gpaText = (s: Story) => (s.gpa != null ? `${s.gpa}${s.gpaScale ? `/${s.gpaScale}` : ""}` : null);

  const stats = (s: Story) =>
    [
      gpaText(s) && { k: "GPA", v: gpaText(s) },
      s.ielts != null && { k: "IELTS", v: String(s.ielts) },
      s.toefl != null && { k: "TOEFL", v: String(s.toefl) },
      s.sat != null && { k: "SAT", v: String(s.sat) },
    ].filter(Boolean) as { k: string; v: string }[];

  const set = (k: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const storyCard = (s: Story, i: number) => (
    <motion.li
      key={s.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(i, 8) * 0.03 }}
      className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-sm font-bold leading-snug text-slate-900">
            {s.admittedUniversity}
            {s.isVerified && <BadgeCheck className="h-4 w-4 shrink-0 text-sky-500" aria-label={t("verified")} />}
          </p>
          <p className="text-[11px] text-slate-500">
            {[s.admittedCountry, s.degreeLevel, s.major, s.intakeYear].filter(Boolean).join(" · ")}
          </p>
        </div>
        {s.twin != null && s.twin > 0 ? (
          <span className="flex shrink-0 flex-col items-center rounded-xl bg-violet-50 px-2 py-1 text-violet-700" title={t("twinHint")}>
            <span className="text-sm font-black leading-none">{s.twin}%</span>
            <span className="text-[9px] font-bold uppercase">{t("twin")}</span>
          </span>
        ) : s.isFeatured ? (
          <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" aria-label={t("featured")} />
        ) : null}
      </div>
      {stats(s).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {stats(s).map((x) => (
            <span key={x.k} className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
              {x.k} {x.v}
            </span>
          ))}
        </div>
      )}
      {s.reasons.length > 0 && (
        <p className="mt-2 text-[11px] text-violet-700">
          {t("likeYou")}: {s.reasons.slice(0, 3).map(reasonLabel).join(", ")}
        </p>
      )}
      {s.advice && <p className="mt-2 line-clamp-3 text-xs italic leading-relaxed text-slate-600">“{s.advice}”</p>}
      {s.scholarshipName && (
        <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
          <Award className="h-3.5 w-3.5" /> {s.scholarshipName}
          {s.scholarshipAmountUsd ? ` · $${s.scholarshipAmountUsd.toLocaleString("en-US")}` : ""}
        </p>
      )}
      <div className="mt-auto flex items-center justify-between pt-3">
        <span className="text-[11px] text-slate-400">— {s.displayName}</span>
        <button onClick={() => void openFull(s)} className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-slate-800">
          <BookOpen className="h-3.5 w-3.5" /> {t("read")}
        </button>
      </div>
    </motion.li>
  );

  return (
    <div className="space-y-4">
      <PageHeader icon={GraduationCap} title={t("title")} subtitle={t("subtitle")} accent="violet" />

      <Segmented
        value={view}
        onChange={setView}
        options={[
          { id: "browse", label: t("viewBrowse") },
          ...(profileId
            ? [
                { id: "share" as const, label: t("viewShare") },
                { id: "mine" as const, label: t("viewMine") },
              ]
            : []),
        ]}
      />

      {error && <ErrorNote message={error} />}

      {view === "browse" && (
        <>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchPh")} className={`${inputCls} pl-9`} aria-label={t("searchPh")} />
            </div>
            <select value={country} onChange={(e) => setCountry(e.target.value)} className={inputCls} aria-label={t("country")}>
              <option value="">{t("allCountries")}</option>
              {withQsTop200Countries(countries).map((c) => {
                const countryKey = countryTranslationKey(c);
                return (
                  <option key={c} value={c}>
                    {countryKey ? tCountry(countryKey) : c}
                  </option>
                );
              })}
            </select>
            <select value={degree} onChange={(e) => setDegree(e.target.value)} className={inputCls} aria-label={t("degree")}>
              <option value="">{t("allDegrees")}</option>
              {DEGREES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className={inputCls} aria-label={t("sort")}>
              {profileId && <option value="twin">{t("sortTwin")}</option>}
              <option value="featured">{t("sortFeatured")}</option>
              <option value="recent">{t("sortRecent")}</option>
            </select>
          </div>

          {profileId && sort === "twin" && (
            <p className="flex items-start gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-800">
              <Users className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {t("twinExplain")}
            </p>
          )}

          {!items && !error && <LoadingBlock label={t("loading")} />}
          {items && items.length === 0 && (
            <EmptyState
              icon={MessageSquareQuote}
              title={t("empty")}
              body={profileId ? t("emptyBody") : undefined}
              action={
                profileId ? (
                  <button onClick={() => setView("share")} className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700">
                    {t("shareCta")}
                  </button>
                ) : undefined
              }
            />
          )}
          {items && items.length > 0 && <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">{items.map(storyCard)}</ul>}
        </>
      )}

      {view === "share" && profileId && (
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <p className="rounded-xl bg-violet-50 px-3 py-2 text-xs leading-relaxed text-violet-800">{t("shareIntro")}</p>

          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="mb-2 text-sm font-extrabold text-slate-900">1. {t("secAdmission")}</legend>
            <Field label={`${t("fUniversity")} *`}>
              <input required maxLength={140} value={form.admittedUniversity} onChange={set("admittedUniversity")} className={inputCls} />
            </Field>
            <Field label={t("fCountry")}>
              <input maxLength={60} value={form.admittedCountry} onChange={set("admittedCountry")} className={inputCls} />
            </Field>
            <Field label={t("degree")}>
              <select value={form.degreeLevel} onChange={set("degreeLevel")} className={inputCls}>
                {DEGREES.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </Field>
            <Field label={t("fMajor")}>
              <input maxLength={100} value={form.major} onChange={set("major")} className={inputCls} />
            </Field>
            <Field label={t("fYear")}>
              <input inputMode="numeric" maxLength={4} value={form.intakeYear} onChange={set("intakeYear")} className={inputCls} placeholder="2026" />
            </Field>
            <Field label={t("fOtherAdmits")} hint={t("onePerLine")}>
              <textarea rows={2} value={form.otherAdmits} onChange={set("otherAdmits")} className={inputCls} />
            </Field>
          </fieldset>

          <fieldset className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <legend className="mb-2 text-sm font-extrabold text-slate-900">2. {t("secScores")}</legend>
            <Field label="GPA">
              <input inputMode="decimal" value={form.gpa} onChange={set("gpa")} className={inputCls} />
            </Field>
            <Field label={t("fScale")}>
              <input inputMode="decimal" value={form.gpaScale} onChange={set("gpaScale")} className={inputCls} />
            </Field>
            <Field label="IELTS">
              <input inputMode="decimal" value={form.ielts} onChange={set("ielts")} className={inputCls} />
            </Field>
            <Field label="TOEFL">
              <input inputMode="numeric" value={form.toefl} onChange={set("toefl")} className={inputCls} />
            </Field>
            <Field label="SAT">
              <input inputMode="numeric" value={form.sat} onChange={set("sat")} className={inputCls} />
            </Field>
          </fieldset>

          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="mb-2 text-sm font-extrabold text-slate-900">3. {t("secStory")}</legend>
            <Field label={t("fActivities")} hint={t("onePerLine")}>
              <textarea rows={3} value={form.activities} onChange={set("activities")} className={inputCls} />
            </Field>
            <Field label={t("fAwards")} hint={t("onePerLine")}>
              <textarea rows={3} value={form.awards} onChange={set("awards")} className={inputCls} />
            </Field>
            <div className="sm:col-span-2">
              <Field label={`${t("fAdvice")} *`} hint={t("adviceHint")}>
                <textarea rows={3} maxLength={2000} value={form.advice} onChange={set("advice")} className={inputCls} />
              </Field>
            </div>
            <Field label={t("fEssayTitle")}>
              <input maxLength={160} value={form.essayTitle} onChange={set("essayTitle")} className={inputCls} />
            </Field>
            <Field label={t("fScholarship")}>
              <input maxLength={140} value={form.scholarshipName} onChange={set("scholarshipName")} className={inputCls} />
            </Field>
            <div className="sm:col-span-2">
              <Field label={t("fEssay")} hint={t("essayHint")}>
                <textarea rows={5} maxLength={4000} value={form.essayExcerpt} onChange={set("essayExcerpt")} className={inputCls} />
              </Field>
            </div>
          </fieldset>

          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="mb-2 text-sm font-extrabold text-slate-900">4. {t("secPrivacy")}</legend>
            <Field label={t("fName")} hint={t("nameHint")}>
              <input maxLength={60} value={form.displayName} onChange={set("displayName")} className={inputCls} placeholder={t("anonymous")} />
            </Field>
            <Field label={t("fHome")}>
              <input maxLength={60} value={form.homeCountry} onChange={set("homeCountry")} className={inputCls} placeholder="Uzbekistan" />
            </Field>
            <label className="flex items-start gap-2 text-xs leading-relaxed text-slate-600 sm:col-span-2">
              <input
                type="checkbox"
                checked={form.consent}
                onChange={(e) => setForm((f) => ({ ...f, consent: e.target.checked }))}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-violet-600"
              />
              {t("consent")}
            </label>
          </fieldset>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Clock className="h-3.5 w-3.5" /> {t("reviewNote")}
            </p>
            <button disabled={sending} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50">
              <Send className="h-4 w-4" /> {t("submit")}
            </button>
          </div>
        </form>
      )}

      {view === "mine" && profileId && (
        <>
          {!mine && <LoadingBlock label={t("loading")} />}
          {mine && mine.length === 0 && (
            <EmptyState
              icon={PenLine}
              title={t("mineEmpty")}
              action={
                <button onClick={() => setView("share")} className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700">
                  {t("shareCta")}
                </button>
              }
            />
          )}
          {mine && mine.length > 0 && (
            <ul className="space-y-2">
              {mine.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900">{s.admittedUniversity}</p>
                    <p className="text-[11px] text-slate-500">{[s.degreeLevel, s.major].filter(Boolean).join(" · ")}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      s.status === "approved" ? "bg-emerald-100 text-emerald-700" : s.status === "rejected" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {t(`status.${s.status ?? "pending"}`)}
                  </span>
                  {s.status === "approved" && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                      <Eye className="h-3.5 w-3.5" /> {s.views}
                    </span>
                  )}
                  <button onClick={() => void withdraw(s)} className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={t("withdraw")}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* Full story */}
      <AnimatePresence>
        {openStory && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpenStory(null)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={openStory.admittedUniversity}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-1.5 text-lg font-extrabold text-slate-900">
                    {openStory.admittedUniversity}
                    {openStory.isVerified && <BadgeCheck className="h-5 w-5 text-sky-500" />}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {[openStory.admittedCountry, openStory.degreeLevel, openStory.major, openStory.intakeYear].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <button onClick={() => setOpenStory(null)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100" aria-label={t("close")}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              {stats(openStory).length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {stats(openStory).map((x) => (
                    <div key={x.k} className="rounded-xl bg-slate-50 p-2 text-center">
                      <p className="text-[10px] font-bold uppercase text-slate-400">{x.k}</p>
                      <p className="text-base font-black text-slate-900">{x.v}</p>
                    </div>
                  ))}
                </div>
              )}
              {openStory.advice && (
                <div className="mt-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{t("fAdvice")}</p>
                  <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-700">“{openStory.advice}”</p>
                </div>
              )}
              {openStory.activities.length > 0 && (
                <div className="mt-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{t("fActivities")}</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-700">
                    {openStory.activities.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
              {openStory.awards.length > 0 && (
                <div className="mt-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{t("fAwards")}</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-700">
                    {openStory.awards.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
              {openStory.essayExcerpt && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{openStory.essayTitle || t("fEssay")}</p>
                  <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-700">{openStory.essayExcerpt}</p>
                  <p className="mt-2 text-[11px] text-rose-600">{t("noCopy")}</p>
                </div>
              )}
              {openStory.otherAdmits.length > 0 && (
                <p className="mt-4 text-xs text-slate-600">
                  <b>{t("fOtherAdmits")}:</b> {openStory.otherAdmits.join(", ")}
                </p>
              )}
              {openStory.scholarshipName && (
                <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-emerald-700">
                  <Award className="h-3.5 w-3.5" /> {openStory.scholarshipName}
                  {openStory.scholarshipAmountUsd ? ` · $${openStory.scholarshipAmountUsd.toLocaleString("en-US")}` : ""}
                </p>
              )}
              <p className="mt-4 text-right text-xs text-slate-400">— {openStory.displayName}{openStory.homeCountry ? `, ${openStory.homeCountry}` : ""}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <Toast message={toast} />
    </div>
  );
}
