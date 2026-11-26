"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { getJson, useResource } from "@/components/journey/useResource";
import { Button } from "@/components/ui/Button";
import { ErrorNote, JourneyCard, Loading, Pill, ProgressBar } from "@/components/ui/journey";

interface StrengthSection {
  key: string;
  unknown?: boolean;
  missing?: string[];
}

interface StrengthData {
  strength: {
    sections: StrengthSection[];
    scoredSections?: number;
    totalSections?: number;
  };
  extracurriculars: { activities: number; leadership: number; research: number; awards: number };
}

export function ProfileStrengthPanel({ activeProfile, onEditProfile }: {
  activeProfile: { id: number; gpa?: number | null; gpaScale?: number | null; ieltsScore?: number | null; toeflScore?: number | null; satScore?: number | null } | null;
  onEditProfile?: () => void;
}) {
  const t = useTranslations("strength");
  const th = useTranslations("hubs");
  const profileId = activeProfile?.id;
  const { data, loading, error, reload } = useResource<StrengthData | null>(
    useCallback(() => getJson<StrengthData>(`/api/profile-strength?profileId=${profileId}`, t("loadFailed"), { noCache: true }), [profileId, t]),
    [activeProfile],
    { initial: null, enabled: !!profileId, errorFallback: t("loadFailed") },
  );

  if (!profileId) return null;
  if (loading && !data) return <Loading label={t("loading")} />;
  if (!data) return <JourneyCard title={t("title")}><ErrorNote message={t("loadFailed")} /><Button type="button" variant="outline" className="mt-3 min-h-11" onClick={() => void reload()}>{t("retry")}</Button></JourneyCard>;

  const { strength, extracurriculars } = data;
  const measured = strength.scoredSections ?? strength.sections.filter((section) => !section.unknown).length;
  const total = strength.totalSections ?? strength.sections.length;
  const sectionLabel = (key: string) => t.has(`section.${key}`) ? t(`section.${key}`) : key;
  function firstHint(section: StrengthSection) {
    const key = section.missing?.find((value) => t.has(`missingDetails.${value}`));
    return key ? t(`missingDetails.${key}`) : section.key === "essays" ? t("essaysHint") : null;
  }
  const next = strength.sections.find((section) => (section.key === "academics" || section.key === "tests") && firstHint(section));
  const academicValues = activeProfile.gpa != null && activeProfile.gpaScale != null ? `GPA ${activeProfile.gpa} / ${activeProfile.gpaScale}` : null;
  const testValues = [
    ["IELTS", activeProfile.ieltsScore],
    ["TOEFL", activeProfile.toeflScore],
    ["SAT", activeProfile.satScore],
  ].flatMap(([label, value]) => value != null ? [`${label} ${value}`] : []);

  return (
    <div className="space-y-3">
      {error && <ErrorNote message={t("loadFailed")} />}
      <div className="grid gap-3 lg:grid-cols-2">
        <JourneyCard title={t("title")} tone="accent">
          <p className="mb-2 text-3xl font-extrabold tabular-nums">{measured} <span className="text-lg text-slate-600 dark:text-slate-300">/ {total}</span></p>
          {!!total && <ProgressBar pct={measured / total * 100} size="sm" tone="brand" label={t("recordedSections")} />}
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t("basisLine", { measured, total })}</p>
        </JourneyCard>
        <JourneyCard title={t("nextStep")}>
          <p className="text-base font-bold">{next ? sectionLabel(next.key) : t("reviewTitle")}</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{next ? firstHint(next) : t("reviewHint")}</p>
          {onEditProfile && <Button className="mt-3 min-h-11" type="button" onClick={onEditProfile}>{th("primaryProfile")}</Button>}
        </JourneyCard>
      </div>
      <JourneyCard title={t("breakdownTitle")}>
        <details open>
          <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">{t("breakdownToggle", { total })}</summary>
          <ul className="divide-y divide-slate-200 dark:divide-slate-700">
            {strength.sections.map((section) => (
              <li key={section.key} className="py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="min-w-0 break-words text-sm font-semibold">{sectionLabel(section.key)}</h3>
                  <Pill tone={section.unknown ? "slate" : "good"}>{section.unknown ? t("notProvided") : t("recorded")}</Pill>
                </div>
                {section.key === "academics" && academicValues && <p className="mt-1 text-sm font-semibold">{academicValues}</p>}
                {section.key === "tests" && testValues.length > 0 && <p className="mt-1 text-sm font-semibold">{testValues.join(" · ")}</p>}
                {firstHint(section) && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{firstHint(section)}</p>}
              </li>
            ))}
          </ul>
        </details>
      </JourneyCard>
      <details className="rounded-overlay border border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-900">
        <summary className="min-h-11 cursor-pointer py-2.5 font-semibold">{t("extraTitle")}</summary>
        <dl className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            [t("extraActivities"), extracurriculars.activities],
            [t("extraLeadership"), extracurriculars.leadership],
            [t("extraResearch"), extracurriculars.research],
            [t("extraAwards"), extracurriculars.awards],
          ].map(([label, count]) => <div key={label} className="min-w-0 rounded-surface bg-slate-50 p-2 dark:bg-slate-800"><dt className="break-words text-xs text-slate-600 dark:text-slate-300">{label}</dt><dd className="text-lg font-bold tabular-nums">{count}</dd></div>)}
        </dl>
      </details>
    </div>
  );
}
