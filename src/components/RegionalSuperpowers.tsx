"use client";

/**
 * REGIONAL SUPER POWERS (Pillar 5.3) — the three cards a Tashkent student
 * needs and a generic global product never shows them:
 *
 *  1. RegionalScholarshipsCard — scholarship blueprints that are actually open
 *     to a citizen of Uzbekistan (El-yurt umidi, GKS, Stipendium Hungaricum,
 *     DAAD/EPOS, Türkiye Bursları, Chevening, Fulbright, Erasmus Mundus) with
 *     the documents each one additionally demands.
 *  2. EmbassyChecklistCard — the document list for the embassy the student is
 *     actually going to (Tashkent: USA, Germany, South Korea, UK).
 *  3. UzbekGradeConverterCard — "4.5 on the 5-point scale" rendered honestly:
 *     the proportional reading AND the letter-grade reading most international
 *     offices use, plus the ECTS hint — never a silent conversion.
 *
 * Every fact lives in the i18n namespaces `regionalSuperpowers`,
 * `regionalScholarships` and `visaChecklist` (en/uz/ru); the structure lives in
 * `src/lib/regionalScholarships.ts`, `src/lib/visaChecklists.ts` and
 * `src/lib/gpa.ts` so the tests can prove the three stay in sync.
 */
import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { BookOpenCheck, Calculator, ExternalLink, Landmark, ShieldCheck } from "lucide-react";
import {
  REGIONAL_SCHOLARSHIP_PACKS,
  regionalScholarshipKey,
} from "@/lib/regionalScholarships";
import {
  EMBASSY_CHECKLISTS,
  embassyChecklistFor,
  visaChecklistItemKey,
  visaChecklistNameKey,
} from "@/lib/visaChecklists";
import { convertUzbekGradeToInternational, gpaTo40Scale } from "@/lib/gpa";

const CARD = "rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900";
const LINK =
  "inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:underline dark:text-indigo-400";
const H = "flex items-center gap-1.5 text-sm font-extrabold text-slate-900 dark:text-slate-100";

/** Country flag shown next to a blueprint (structure data, not a claim). */
const REGION_FLAG: Record<string, string> = {
  UZ: "🇺🇿",
  KR: "🇰🇷",
  HU: "🇭🇺",
  DE: "🇩🇪",
  TR: "🇹🇷",
  UK: "🇬🇧",
  US: "🇺🇸",
  EU: "🇪🇺",
};

export function RegionalScholarshipsCard({ className = "" }: { className?: string }) {
  const t = useTranslations("regionalSuperpowers");
  const ts = useTranslations("regionalScholarships");
  const [openId, setOpenId] = useState<string | null>(REGIONAL_SCHOLARSHIP_PACKS[0]?.id ?? null);

  return (
    <section className={`${CARD} ${className}`} aria-label={t("blueprintsTitle")}>
      <h3 className={H}>
        <Landmark className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        {t("blueprintsTitle")}
      </h3>
      <p className="mt-1 text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">{t("blueprintsSubtitle")}</p>

      <ul className="mt-3 space-y-2">
        {REGIONAL_SCHOLARSHIP_PACKS.map((pack) => {
          const open = openId === pack.id;
          return (
            <li key={pack.id} className="rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : pack.id)}
                aria-expanded={open}
                className="flex w-full items-start gap-2 p-3 text-left"
              >
                <span aria-hidden="true" className="text-lg leading-none">{REGION_FLAG[pack.region] ?? "🎓"}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-bold text-slate-900 dark:text-slate-100">
                    {ts(regionalScholarshipKey(pack.id, "name") as never)}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">
                    {ts(regionalScholarshipKey(pack.id, "provider") as never)}
                  </span>
                  <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {pack.degrees.join(" · ")}
                  </span>
                </span>
              </button>

              {open && (
                <div className="space-y-2 border-t border-slate-200 p-3 dark:border-slate-700">
                  <p className="text-[12px] leading-relaxed text-slate-700 dark:text-slate-200">
                    {ts(regionalScholarshipKey(pack.id, "note") as never)}
                  </p>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t("docsLabel")}
                    </p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[12px] text-slate-700 dark:text-slate-200">
                      {Array.from({ length: pack.docs }, (_, i) => (
                        <li key={i}>{ts(regionalScholarshipKey(pack.id, `doc${i}`) as never)}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {t("essaysLabel")}
                      </p>
                      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[12px] text-slate-700 dark:text-slate-200">
                        {Array.from({ length: pack.essays }, (_, i) => (
                          <li key={i}>{ts(regionalScholarshipKey(pack.id, `essay${i}`) as never)}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {t("stepsLabel")}
                      </p>
                      <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-[12px] text-slate-700 dark:text-slate-200">
                        {Array.from({ length: pack.milestones }, (_, i) => (
                          <li key={i}>{ts(regionalScholarshipKey(pack.id, `milestone${i}`) as never)}</li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  <a href={pack.url} target="_blank" rel="noopener noreferrer" className={LINK}>
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    {t("officialLink")}
                  </a>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-3 rounded-lg bg-amber-50 p-2 text-[11px] text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
        {t("honestyNote")}
      </p>
    </section>
  );
}

export function EmbassyChecklistCard({
  initialCountry = "",
  className = "",
}: {
  initialCountry?: string;
  className?: string;
}) {
  const t = useTranslations("regionalSuperpowers");
  const tv = useTranslations("visaChecklist");
  const [country, setCountry] = useState(initialCountry || EMBASSY_CHECKLISTS[0]?.country || "");
  const checklist = embassyChecklistFor(country);

  return (
    <section className={`${CARD} ${className}`} aria-label={t("checklistTitle")}>
      <h3 className={H}>
        <ShieldCheck className="h-4 w-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />
        {t("checklistTitle")}
      </h3>
      <p className="mt-1 text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">{t("checklistSubtitle")}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {EMBASSY_CHECKLISTS.map((c) => {
          const active = checklist?.country === c.country;
          return (
            <button
              key={c.country}
              type="button"
              onClick={() => setCountry(c.country)}
              aria-pressed={active}
              className={`min-h-11 rounded-xl border px-3 py-2 text-[12px] font-bold ${
                active
                  ? "border-sky-500 bg-sky-50 text-sky-800 dark:border-sky-400 dark:bg-sky-500/15 dark:text-sky-200"
                  : "border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              {tv(visaChecklistNameKey(c.country) as never)}
            </button>
          );
        })}
      </div>

      {checklist ? (
        <div className="mt-3">
          <p className="text-[13px] font-bold text-slate-900 dark:text-slate-100">
            {tv(visaChecklistNameKey(checklist.country) as never)}
          </p>
          <ul className="mt-1.5 space-y-1">
            {Array.from({ length: checklist.items }, (_, i) => (
              <li key={i} className="flex items-start gap-2 text-[12px] text-slate-700 dark:text-slate-200">
                <BookOpenCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                <span>{tv(visaChecklistItemKey(checklist.country, i) as never)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <a href={checklist.url} target="_blank" rel="noopener noreferrer" className={LINK}>
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
              {t("officialLink")}
            </a>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {tv(`${checklist.country}.sourceNote` as never)}
            </span>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-[12px] text-slate-500 dark:text-slate-400">{t("checklistEmpty")}</p>
      )}
    </section>
  );
}

export function UzbekGradeConverterCard({
  initialValue,
  initialScale,
  className = "",
}: {
  initialValue?: number | string;
  initialScale?: number | string;
  className?: string;
}) {
  const t = useTranslations("regionalSuperpowers");
  const [raw, setRaw] = useState<string>(initialValue == null ? "" : String(initialValue));
  const [scale, setScale] = useState<"five" | "hundred">(
    initialScale === 100 || initialScale === "100" ? "hundred" : "five"
  );
  const value = raw.trim() === "" ? null : Number(raw);
  const conversion = value == null || Number.isNaN(value) ? null : convertUzbekGradeToInternational(value, scale);
  const on4 = value == null || Number.isNaN(value) ? null : gpaTo40Scale(value, scale === "five" ? 5 : 100);

  return (
    <section className={`${CARD} ${className}`} aria-label={t("converterTitle")}>
      <h3 className={H}>
        <Calculator className="h-4 w-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
        {t("converterTitle")}
      </h3>
      <p className="mt-1 text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">{t("converterSubtitle")}</p>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400" htmlFor="uz-grade-scale">
            {t("scaleLabel")}
          </label>
          <select
            id="uz-grade-scale"
            value={scale}
            onChange={(e) => setScale(e.target.value === "hundred" ? "hundred" : "five")}
            className="min-h-11 rounded-xl border border-slate-300 bg-white px-2 py-2 text-[12px] font-semibold text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="five">{t("scaleFive")}</option>
            <option value="hundred">{t("scaleHundred")}</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400" htmlFor="uz-grade-value">
            {t("valueLabel")}
          </label>
          <input
            id="uz-grade-value"
            type="number"
            step="0.01"
            inputMode="decimal"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            className="min-h-11 w-28 rounded-xl border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            placeholder={scale === "five" ? "4.5" : "92"}
          />
        </div>
      </div>

      {conversion && (
        <dl className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800">
            <dt className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t("proportional")}
            </dt>
            <dd className="text-[15px] font-extrabold text-slate-900 dark:text-slate-100">
              {conversion.proportionalUs == null ? t("unknown") : `${conversion.proportionalUs} / 4.0`}
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800">
            <dt className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t("letter")}
            </dt>
            <dd className="text-[15px] font-extrabold text-slate-900 dark:text-slate-100">
              {conversion.letterUs == null ? t("unknown") : `${conversion.letter} = ${conversion.letterUs} / 4.0`}
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800">
            <dt className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t("ects")}
            </dt>
            <dd className="text-[15px] font-extrabold text-slate-900 dark:text-slate-100">
              {conversion.ects ?? t("unknown")}
            </dd>
          </div>
        </dl>
      )}

      <p className="mt-2 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
        {conversion ? t(conversion.noteKey) : t("converterHint")}
      </p>
      {on4 != null && (
        <p className="mt-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
          {t("platformValue", { value: String(Math.round(on4 * 100) / 100) })}
        </p>
      )}
    </section>
  );
}
