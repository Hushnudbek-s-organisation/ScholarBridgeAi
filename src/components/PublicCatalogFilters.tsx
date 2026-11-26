import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { localizeCountry } from "@/lib/catalogLocalizer";

const labels = {
  en: ["Search", "Country", "Degree", "Field of study", "Maximum annual tuition (USD)", "Your IELTS score", "Funding", "Round", "Any", "Bachelor’s", "Master’s", "Doctorate", "Full funding", "Full tuition", "Partial funding", "Open", "Upcoming", "Closed", "Filter", "Reset", "QS edition"],
  uz: ["Qidiruv", "Davlat", "Daraja", "Yo‘nalish", "Maks. yillik kontrakt (USD)", "IELTS ballingiz", "Qamrov", "Ariza davri", "Barchasi", "Bakalavriat", "Magistratura", "Doktorantura", "To‘liq moliyalashtirish", "To‘liq kontrakt", "Qisman moliyalashtirish", "Ochiq", "Yaqinlashmoqda", "Yopilgan", "Saralash", "Tozalash", "QS nashri"],
  ru: ["Поиск", "Страна", "Уровень", "Направление", "Макс. оплата за год (USD)", "Ваш балл IELTS", "Покрытие", "Приём заявок", "Все", "Бакалавриат", "Магистратура", "Докторантура", "Полное финансирование", "Полная оплата обучения", "Частичное финансирование", "Открыт", "Скоро", "Закрыт", "Найти", "Сбросить", "Выпуск QS"],
};
const field = "min-h-11 w-full min-w-0 rounded-control border border-slate-300 bg-white px-3 py-2 text-base dark:border-slate-600 dark:bg-slate-950";
const label = "flex min-w-0 flex-col gap-1 text-sm font-medium";

export type CatalogueQuery = Record<string, string | string[] | undefined>;

export function catalogueParam(params: CatalogueQuery, key: string, maxLength = 120) {
  const raw = params[key];
  return (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, maxLength) ?? "";
}

export function PublicCatalogFilters({
  kind, locale, countries, params, years = [],
}: {
  kind: "universities" | "scholarships";
  locale: Locale;
  countries: string[];
  params: CatalogueQuery;
  years?: number[];
}) {
  const [search, country, degree, major, maxTuition, ielts, funding, round, any, bachelor, master, phd, full, tuition, partial, open, upcoming, closed, apply, reset, ranking] = labels[locale];
  const path = kind === "universities" ? "/universities" : "/scholarships";
  const value = (key: string) => catalogueParam(params, key);
  return (
    <form action={path} method="get" role="search" className="mb-6 grid gap-3 rounded-overlay border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-700 dark:bg-slate-900">
      <label className={label}>{search}<input className={field} name="search" type="search" defaultValue={value("search")} maxLength={120} /></label>
      <label className={label}>{country}<select className={field} name="country" defaultValue={value("country")}>
        <option value="">{any}</option>
        {countries.map((item) => <option key={item} value={item}>{localizeCountry(item, locale)}</option>)}
      </select></label>
      <label className={label}>{degree}<select className={field} name="degree" defaultValue={value("degree")}>
        <option value="">{any}</option><option value="Bachelor">{bachelor}</option><option value="Master">{master}</option><option value="PhD">{phd}</option>
      </select></label>
      {kind === "universities" ? <>
        <label className={label}>{major}<input className={field} name="major" defaultValue={value("major")} maxLength={120} /></label>
        <label className={label}>{maxTuition}<input className={field} name="maxTuition" type="number" min="0" max="150000" defaultValue={value("maxTuition")} /></label>
        <label className={label}>{ielts}<input className={field} name="ielts" type="number" min="0" max="9" step="0.5" defaultValue={value("ielts")} /></label>
        <label className={label}>{ranking}<select className={field} name="qsYear" defaultValue={value("qsYear")}>
          <option value="">{any}</option>
          {years.map((year) => <option key={year} value={year}>{year}</option>)}
        </select></label>
      </> : <>
        <label className={label}>{funding}<select className={field} name="coverage" defaultValue={value("coverage")}>
          <option value="">{any}</option><option value="full">{full}</option><option value="tuition">{tuition}</option><option value="partial">{partial}</option>
        </select></label>
        <label className={label}>{round}<select className={field} name="status" defaultValue={value("status")}>
          <option value="">{any}</option><option value="open">{open}</option><option value="upcoming">{upcoming}</option><option value="closed">{closed}</option>
        </select></label>
      </>}
      <div className="flex flex-wrap items-end gap-2">
        <button type="submit" className="min-h-11 rounded-control bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800">{apply}</button>
        <Link href={path} className="inline-flex min-h-11 items-center rounded-control border border-slate-300 px-3 text-sm font-semibold dark:border-slate-600">{reset}</Link>
      </div>
    </form>
  );
}
