"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { countryTranslationKey, withQsTop200Countries } from "@/lib/countries";
import { useLocaleContext } from "@/i18n/LocaleProvider";
import { localizeCountry, localizeMajorOrField } from "@/lib/catalogLocalizer";
import CountryFlag from "@/components/CountryFlag";
import { m as Motion } from "framer-motion";
import {
  Award,
  BadgeCheck,
  BookOpen,
  Clock,
  Eye,
  MessageSquareQuote,
  PenLine,
  Search,
  Send,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import type { StudentProfile } from "../Navbar";
import { api, EmptyState, ErrorNote, Field, inputCls, LoadingBlock, Toast, useToast } from "@/components/ui/growth";
import { AppNote } from "@/components/AppNote";
import { Button } from "@/components/ui/Button";
import { JourneyCard } from "@/components/ui/journey";
import { PanelDialog } from "@/components/ui/PanelDialog";

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
export function SuccessStories({ activeProfile, similar }: {
  activeProfile: StudentProfile | null;
  similar?: { active: boolean; setActive: (value: boolean) => void; panel: React.ReactNode };
}) {
  const t = useTranslations("stories");
  const tCountry = useTranslations("countryNames");
  const { locale } = useLocaleContext();
  const [view, setView] = useState<"browse" | "mine">("browse");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareError, setShareError] = useState("");
  const showSimilar = similar?.active ?? false;
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
    if (showSimilar || view !== "browse") return;
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
  }, [profileId, q, country, degree, sort, showSimilar, view]);

  useEffect(() => {
    if (!profileId || showSimilar || view !== "mine") return;
    let live = true;
    api<{ items: Story[] }>(`/api/stories?mine=1&profileId=${profileId}`)
      .then((d) => live && setMine(d.items))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [profileId, view, reloadMine, showSimilar]);

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
      setShareError(t("needConsent"));
      return;
    }
    if (sending) return;
    setSending(true);
    setShareError("");
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
      setShareOpen(false);
      showToast(t("submitted"));
      setView("mine");
      if (showSimilar) similar?.setActive(false);
      setReloadMine((r) => r + 1);
    } catch (err) {
      setShareError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  function openShare() {
    setShareError("");
    setShareOpen(true);
  }

  function selectView(selection: "browse" | "mine" | "similar") {
    setError(null);
    if (selection === "similar") {
      similar?.setActive(true);
      return;
    }
    setView(selection);
    if (showSimilar) similar?.setActive(false);
  }

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
    <Motion.li
      key={s.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(i, 8) * 0.03 }}
      className="flex min-w-0 flex-col rounded-overlay border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1 break-words text-sm font-bold leading-snug text-slate-900 dark:text-slate-100">
            {s.admittedUniversity}
            {s.isVerified && <BadgeCheck className="h-4 w-4 shrink-0 text-sky-500" aria-label={t("verified")} />}
          </p>
          <p className="flex flex-wrap items-center gap-1 text-sm text-slate-600 dark:text-slate-300">
            {s.admittedCountry && (
              <span className="inline-flex items-center gap-1">
                <CountryFlag country={s.admittedCountry} size="xs" />
                {localizeCountry(s.admittedCountry, locale)}
              </span>
            )}
            {[s.degreeLevel, s.major ? localizeMajorOrField(s.major, locale) : null, s.intakeYear].filter(Boolean).map((part, i) => (
              <span key={`${String(part)}-${i}`}>· {String(part)}</span>
            ))}
          </p>
        </div>
        {s.twin != null && s.twin > 0 ? (
          <span className="flex shrink-0 flex-col items-center rounded-surface bg-violet-50 px-2 py-1 text-violet-700 dark:bg-violet-950 dark:text-violet-200" title={t("twinHint")}>
            <span className="text-sm font-black leading-none">{s.twin}%</span>
            <span className="text-xs font-bold uppercase">{t("twin")}</span>
          </span>
        ) : s.isFeatured ? (
          <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" aria-label={t("featured")} />
        ) : null}
      </div>
      {stats(s).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {stats(s).map((x) => (
            <span key={x.k} className="rounded-control bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {x.k} {x.v}
            </span>
          ))}
        </div>
      )}
      {s.reasons.length > 0 && (
        <p className="mt-2 text-sm text-violet-700 dark:text-violet-300">
          {t("likeYou")}: {s.reasons.slice(0, 3).map(reasonLabel).join(", ")}
        </p>
      )}
      {s.advice && <p className="mt-2 line-clamp-2 break-words text-sm leading-relaxed text-slate-600 dark:text-slate-300">“{s.advice}”</p>}
      {s.scholarshipName && (
        <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-emerald-700">
          <Award className="h-3.5 w-3.5" /> {s.scholarshipName}
          {s.scholarshipAmountUsd ? ` · $${s.scholarshipAmountUsd.toLocaleString("en-US")}` : ""}
        </p>
      )}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
        <span className="text-xs text-slate-500">— {s.displayName}</span>
        <Button type="button" variant="outline" className="min-h-11" onClick={() => void openFull(s)}>
          <BookOpen className="h-3.5 w-3.5" /> {t("read")}
        </Button>
      </div>
    </Motion.li>
  );

  return (
    <div className="space-y-4">
      <JourneyCard
        title={t("title")}
        action={profileId ? <Button type="button" className="min-h-11" onClick={openShare}>{t("viewShare")}</Button> : undefined}
      >
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("viewLabel")}>
          {([
            ["browse", t("viewBrowse")],
            ...(similar ? [["similar", t("viewSimilar")]] as const : []),
            ...(profileId ? [["mine", t("viewMine")]] as const : []),
          ] as const).map(([value, label]) => {
            const selected = showSimilar ? value === "similar" : value === view;
            return <Button key={value} type="button" variant={selected ? "primary" : "outline"} className="min-h-11 whitespace-normal" aria-pressed={selected} onClick={() => selectView(value)}>{label}</Button>;
          })}
        </div>
      </JourneyCard>

      {showSimilar && similar?.panel}
      {!showSimilar && error && <ErrorNote message={error} />}

      {!showSimilar && view === "browse" && (
        <>
          <JourneyCard title={t("viewBrowse")}>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative sm:col-span-2 lg:col-span-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
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
              <p className="mt-2 flex items-start gap-2 rounded-surface border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-800 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-200">
                <Users className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {t("twinExplain")}
              </p>
            )}

          </JourneyCard>
          {!items && !error && <LoadingBlock label={t("loading")} />}
          {items && items.length === 0 && (
            <EmptyState
              icon={MessageSquareQuote}
              title={t("empty")}
              body={profileId ? t("emptyBody") : undefined}
              action={
                profileId ? (
                  <Button type="button" variant="outline" className="min-h-11" onClick={openShare}>
                    {t("shareCta")}
                  </Button>
                ) : undefined
              }
            />
          )}
          {items && items.length > 0 && <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">{items.map(storyCard)}</ul>}
        </>
      )}

      {shareOpen && profileId && (
        <PanelDialog title={t("viewShare")} className="max-w-2xl" busy={sending} error={shareError} onClose={() => setShareOpen(false)}>
          <form onSubmit={submit} className="space-y-4">
            <p className="rounded-surface bg-violet-50 px-3 py-2 text-sm leading-relaxed text-violet-800 dark:bg-violet-950 dark:text-violet-200">{t("shareIntro")}</p>

            <fieldset className="grid gap-3 sm:grid-cols-2">
              <legend className="mb-2 text-sm font-extrabold text-slate-900 dark:text-slate-100">{t("secAdmission")}</legend>
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
                <input inputMode="numeric" maxLength={4} value={form.intakeYear} onChange={set("intakeYear")} className={inputCls} />
              </Field>
              <Field label={t("fOtherAdmits")} hint={t("onePerLine")}>
                <textarea rows={2} value={form.otherAdmits} onChange={set("otherAdmits")} className={inputCls} />
              </Field>
            </fieldset>

            <fieldset className="grid gap-3 sm:grid-cols-2">
              <legend className="mb-2 text-sm font-extrabold text-slate-900 dark:text-slate-100">{t("secStory")}</legend>
              <div className="sm:col-span-2">
                <Field label={`${t("fAdvice")} *`} hint={t("adviceHint")}>
                  <textarea rows={3} maxLength={2000} value={form.advice} onChange={set("advice")} className={inputCls} />
                </Field>
              </div>
              <details className="rounded-surface border border-slate-200 px-3 dark:border-slate-700 sm:col-span-2">
                <summary className="min-h-11 cursor-pointer py-2.5 text-sm font-semibold">{t("optionalDetails")}</summary>
                <div className="mb-3 grid gap-3 sm:grid-cols-2">
                  <Field label={t("fActivities")} hint={t("onePerLine")}>
                    <textarea rows={3} value={form.activities} onChange={set("activities")} className={inputCls} />
                  </Field>
                  <Field label={t("fAwards")} hint={t("onePerLine")}>
                    <textarea rows={3} value={form.awards} onChange={set("awards")} className={inputCls} />
                  </Field>
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
                </div>
              </details>
            </fieldset>

            <details className="rounded-surface border border-slate-200 px-3 dark:border-slate-700">
              <summary className="min-h-11 cursor-pointer py-2.5 text-sm font-semibold">{t("secScores")}</summary>
              <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
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
              </div>
            </details>

            <fieldset className="grid gap-3 sm:grid-cols-2">
              <legend className="mb-2 text-sm font-extrabold text-slate-900 dark:text-slate-100">{t("secPrivacy")}</legend>
              <Field label={t("fName")} hint={t("nameHint")}>
                <input maxLength={60} value={form.displayName} onChange={set("displayName")} className={inputCls} placeholder={t("anonymous")} />
              </Field>
              <Field label={t("fHome")}>
                <input maxLength={60} value={form.homeCountry} onChange={set("homeCountry")} className={inputCls} placeholder="Uzbekistan" />
              </Field>
              <label className="flex min-h-11 items-center gap-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.consent}
                  onChange={(e) => setForm((f) => ({ ...f, consent: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 rounded-control border-slate-300 accent-violet-600"
                />
                {t("consent")}
              </label>
            </fieldset>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-1.5 text-sm text-slate-500">
                <Clock className="h-3.5 w-3.5" /> {t("reviewNote")}
              </p>
              <Button type="submit" disabled={sending} className="min-h-11">
                <Send className="h-4 w-4" /> {t("submit")}
              </Button>
            </div>
          </form>
        </PanelDialog>
      )}

      {!showSimilar && view === "mine" && profileId && (
        <>
          {!mine && <LoadingBlock label={t("loading")} />}
          {mine && mine.length === 0 && (
            <EmptyState
              icon={PenLine}
              title={t("mineEmpty")}
              action={
                <Button type="button" variant="outline" className="min-h-11" onClick={openShare}>
                  {t("shareCta")}
                </Button>
              }
            />
          )}
          {mine && mine.length > 0 && (
            <ul className="space-y-2">
              {mine.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3 rounded-overlay border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-bold text-slate-900 dark:text-slate-100">{s.admittedUniversity}</p>
                    <p className="text-sm text-slate-500">{[s.degreeLevel, s.major].filter(Boolean).join(" · ")}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      s.status === "approved" ? "bg-emerald-100 text-emerald-700" : s.status === "rejected" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {t(`status.${s.status ?? "pending"}`)}
                  </span>
                  {s.status === "approved" && (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <Eye className="h-3.5 w-3.5" /> {s.views}
                    </span>
                  )}
                  <Button type="button" variant="ghost" size="icon" onClick={() => void withdraw(s)} aria-label={t("withdraw")}>
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {openStory && (
        <PanelDialog title={openStory.admittedUniversity} className="max-w-2xl" onClose={() => setOpenStory(null)}>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {[openStory.admittedCountry, openStory.degreeLevel, openStory.major, openStory.intakeYear].filter(Boolean).join(" · ")}
            {openStory.isVerified && <BadgeCheck className="ml-1 inline size-4 text-sky-500" aria-label={t("verified")} />}
          </p>
          {stats(openStory).length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {stats(openStory).map((x) => (
                <div key={x.k} className="rounded-surface bg-slate-50 p-2 text-center dark:bg-slate-800">
                  <p className="text-sm font-bold uppercase text-slate-500">{x.k}</p>
                  <p className="text-base font-black text-slate-900 dark:text-slate-100">{x.v}</p>
                </div>
              ))}
            </div>
          )}
          {openStory.advice && (
            <div className="mt-4">
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">{t("fAdvice")}</p>
              <p className="mt-1 whitespace-pre-line break-words text-sm leading-relaxed text-slate-700 dark:text-slate-200">“{openStory.advice}”</p>
            </div>
          )}
          {openStory.activities.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">{t("fActivities")}</p>
              <ul className="mt-1 list-disc space-y-0.5 break-words pl-5 text-sm text-slate-700 dark:text-slate-200">
                {openStory.activities.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}
          {openStory.awards.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">{t("fAwards")}</p>
              <ul className="mt-1 list-disc space-y-0.5 break-words pl-5 text-sm text-slate-700 dark:text-slate-200">
                {openStory.awards.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}
          {openStory.essayExcerpt && (
            <div className="mt-4 rounded-overlay border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">{openStory.essayTitle || t("fEssay")}</p>
              <p className="mt-1 whitespace-pre-line break-words text-sm leading-relaxed text-slate-700 dark:text-slate-200">{openStory.essayExcerpt}</p>
              <p className="mt-2 text-sm text-rose-600 dark:text-rose-300">{t("noCopy")}</p>
            </div>
          )}
          {openStory.otherAdmits.length > 0 && (
            <p className="mt-4 text-sm text-slate-600">
              <b>{t("fOtherAdmits")}:</b> {openStory.otherAdmits.join(", ")}
            </p>
          )}
          {openStory.scholarshipName && (
            <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-emerald-700">
              <Award className="h-3.5 w-3.5" /> {openStory.scholarshipName}
              {openStory.scholarshipAmountUsd ? ` · $${openStory.scholarshipAmountUsd.toLocaleString("en-US")}` : ""}
            </p>
          )}
          <p className="mt-4 text-right text-sm text-slate-500">— {openStory.displayName}{openStory.homeCountry ? `, ${openStory.homeCountry}` : ""}</p>
        </PanelDialog>
      )}
      <Toast message={toast} />
      {/* Standing small print: this panel can be wrong — say so where it is read. */}
      <AppNote kind="community" className="mt-2" />
    </div>
  );
}
