"use client";

import { useTranslations } from "next-intl";
import { ArrowRight, Bookmark, CheckCircle2, Circle, Compass, FileCheck2, GraduationCap, Languages } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { JourneyDashboard } from "./JourneyControlCenter";

/** Actual dashboard overview: record coverage is not an application eligibility verdict. */
export function DashboardOverview({ data, primaryTitle, primaryDetail, primaryLabel, primaryTab, currentStage, onNavigate }: {
  data: JourneyDashboard;
  primaryTitle: string;
  primaryDetail: string;
  primaryLabel: string;
  primaryTab: string;
  currentStage: string;
  onNavigate: (tab:string)=>void;
}) {
  const t=useTranslations("journey");
  // Keep the visible account identity separate from the localized salutation,
  // without duplicating it in hidden text or changing the greeting's wording.
  const [greetingBefore,greetingAfter]=t("overviewGreeting",{name:"\uFFF0"}).split("\uFFF0");
  const records=["academic","english","documents"].flatMap(key=>{
    const category=data.readiness.categories.find(item=>item.key===key);
    return category ? [category] : [];
  });
  const cards=[
    {title:t("overviewUniversities"),hint:t("overviewExploreHint"),tab:"universities",icon:Compass},
    {title:t("overviewSavedUniversities"),hint:t("overviewShortlistHint",{count:data.activity?.savedUniversities??0}),tab:"universities/saved",icon:Bookmark},
    {title:t("overviewDocuments"),hint:t("overviewDocumentsHint"),tab:"materials/documents",icon:FileCheck2},
  ];
  return <>
    <header className="sb-overview-heading">
      <h1>{greetingBefore}<span>{data.profile.name}</span>{greetingAfter}</h1>
      <p>{t("overviewTitle")}</p>
    </header>
    <div className="sb-overview-grid">
      <section className="sb-overview-panel sb-overview-hero" data-testid="dashboard-next-action">
        <div className="sb-overview-hero-copy">
          <h2>{t("overviewNextAction")}</h2>
          <p className="sb-overview-action-title">{primaryTitle}</p>
          <div className="sb-overview-actions">
            <Button data-action="primary" onClick={()=>onNavigate(primaryTab)}>{primaryLabel}<ArrowRight aria-hidden className="h-4 w-4"/></Button>
            <details className="sb-overview-source"><summary>{t("overviewDetails")}</summary><p>{primaryDetail}</p></details>
          </div>
          <p className="sb-overview-stage">{currentStage}</p>
        </div>
        <GraduationCap aria-hidden className="sb-overview-cap" strokeWidth={1.2}/>
      </section>
      <section className="sb-overview-panel" data-testid="dashboard-records">
        <h2>{t("overviewProfileRecords")}</h2>
        <ul className="sb-overview-records">{records.map(record=>{
          const recorded=!record.unknown&&record.pct>0;
          const Icon=record.key==="academic"?GraduationCap:record.key==="english"?Languages:FileCheck2;
          return <li key={record.key}><Button variant="unstyled" className="sb-overview-row" onClick={()=>onNavigate(record.tab)}>
            <Icon aria-hidden className="h-4 w-4"/>
            <span>{t(`ccReadinessCategory.${record.key}` as never)}</span>
            <span className="sb-overview-record-status">{recorded?<CheckCircle2 aria-hidden className="h-3.5 w-3.5"/>:<Circle aria-hidden className="h-3.5 w-3.5"/>}{recorded?t("overviewRecorded"):t("overviewNotRecorded")}</span>
          </Button></li>;
        })}</ul>
        <p className="sb-overview-record-note">{t("overviewRecordsHint")}</p>
      </section>
    </div>
    <div className="sb-overview-quick-grid">{cards.map(card=><Button variant="unstyled" className="sb-overview-quick" key={card.tab} onClick={()=>onNavigate(card.tab)}>
      <span className="sb-overview-icon"><card.icon aria-hidden className="h-6 w-6"/></span>
      <span className="sb-overview-quick-copy"><strong>{card.title}</strong><span>{card.hint}</span></span>
      <ArrowRight aria-hidden className="h-4 w-4"/>
    </Button>)}</div>
  </>;
}
