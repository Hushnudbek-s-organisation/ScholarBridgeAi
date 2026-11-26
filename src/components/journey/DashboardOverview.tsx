"use client";

import { useLocale, useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { JourneyDashboard } from "./JourneyControlCenter";

export function DashboardOverview({ data, primaryTitle, primaryDetail, primaryLabel, primaryTab, onNavigate }: {
  data: JourneyDashboard;
  primaryTitle: string;
  primaryDetail: string;
  primaryLabel: string;
  primaryTab: string;
  onNavigate: (tab: string) => void;
}) {
  const t = useTranslations("journey");
  const tn = useTranslations("nav");
  const locale = useLocale();
  const sop = locale === "uz" ? "SOP’ni davom ettirish" : locale === "ru" ? "Продолжить работу над SOP" : "Continue your SOP";
  const [firstDeadline] = data.deadlines.filter((deadline) => (deadline.daysRemaining ?? -1) >= 0)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const saved = [
    ...data.recommended.universities.filter((item) => item.saved).map((item) => ({ id: item.id, title: item.name, tab: "universities" })),
    ...data.recommended.scholarships.filter((item) => item.saved).map((item) => ({ id: item.id, title: item.title, tab: "scholarships" })),
  ].slice(0, 3);
  const panel = "min-w-0 rounded-overlay border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900";
  const savedTitle = locale === "uz" ? "Saqlangan variantlar" : locale === "ru" ? "Сохранённые варианты" : "Saved options";
  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">{t("overviewGreeting", { name: data.profile.name })}</h1>
      <div className="grid gap-4 xl:grid-cols-3">
        <section className={panel} data-testid="dashboard-next-action">
          <h2 className="mb-2 text-lg font-bold">{t("overviewNextAction")}</h2>
          <p className="font-semibold">{primaryTitle}</p>
          <p className="my-2 text-sm text-slate-600 dark:text-slate-300">{primaryDetail}</p>
          <div className="flex flex-wrap gap-2">
            <Button data-action="primary" onClick={() => onNavigate(primaryTab)}>{primaryLabel}<ArrowRight className="h-4 w-4" aria-hidden /></Button>
            <Button variant="outline" onClick={() => onNavigate("materials/essays")}>{sop}</Button>
          </div>
        </section>
        <section className={panel}>
          <h2 className="mb-2 text-lg font-bold">{savedTitle}</h2>
          {saved.length > 0 && <ul>
            {saved.map((item) => <li key={`${item.tab}/${item.id}`}>
              <Button variant="unstyled" className="min-h-11 text-left underline" onClick={() => onNavigate(item.tab)}>{item.title}</Button>
            </li>)}
          </ul>}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => onNavigate("universities")}>{tn("universities")}</Button>
            <Button variant="outline" onClick={() => onNavigate("scholarships")}>{tn("scholarships")}</Button>
          </div>
        </section>
        <section className={panel}>
          <h2 className="mb-2 text-lg font-bold">{t("ccApplications")}</h2>
          <p className="text-sm">{t("overviewTotal")} <strong>{data.applications.total}</strong></p>
          <h3 className="mt-3 font-semibold">{t("overviewDeadlines")}</h3>
          {firstDeadline ? <Button variant="unstyled" className="min-h-11 text-left underline" onClick={() => onNavigate(firstDeadline.tab)}>
            {firstDeadline.title} · {firstDeadline.dueDate.slice(0, 10)}
          </Button> : <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">{t("overviewNoDeadlines")}</p>}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => onNavigate("applications")}>{t("overviewApplicationsWorkspace")}</Button>
            <Button variant="outline" onClick={() => onNavigate("tasks")}>{t("overviewOpenCalendar")}</Button>
          </div>
        </section>
      </div>
    </>
  );
}
