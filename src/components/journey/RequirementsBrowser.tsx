"use client";

/**
 * RequirementsBrowser — the standalone "Application Requirements" section
 * (spec §5).
 *
 * Lists every application the student has, and for the selected one shows the
 * personalized checklist with source + last-verified date on every row. The
 * same component backs the workspace's Requirements tab; this is the entry
 * point a student reaches from the PREPARE group before they have a
 * workspace open.
 */
import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import { useLocaleContext } from "@/i18n/LocaleProvider";
import { Button, Empty, JourneyCard, Loading, Pill, ProgressBar, SourceTag, StatusIcon, daysLabel, toneForDays } from "./ui";
import { AppNote } from "@/components/AppNote";
import {
  DEFAULT_REQUIREMENT_TEMPLATES,
  REQUIREMENT_SECTIONS,
  type RequirementSection,
} from "@/lib/journey/requirements";

interface AppRow {
  id: number;
  universityId: number | null;
  universityName: string;
  programName: string | null;
  deadline: string | null;
  status: string;
  submittedAt: string | null;
}

interface ReqData {
  application: AppRow & { portalUrl: string | null };
  university: { id: number; name: string; admissionsUrl: string | null; applicationUrl: string | null; verificationStatus: string } | null;
  requirements: {
    id: number;
    section: string;
    itemKey: string;
    title: string;
    instructions: string | null;
    isRequired: boolean;
    status: string;
    dueDate: string | null;
    sourceUrl: string | null;
    sourceName: string | null;
    lastVerifiedAt: string | null;
    verificationStatus: string;
  }[];
  progress: { pct: number; done: number; total: number; sections: { key: string; label: string; done: number; total: number; pct: number }[] };
}

const SECTION_ORDER = ["academic", "english", "testing", "documents", "essays", "recommendations", "finance", "application"];

/**
 * Standard requirements preview (Bachelor / Master / PhD).
 *
 * With no application workspace yet the page was a single empty state, so a
 * student could not see what an application actually involves until they had
 * already started one.
 *
 * The backbone is `DEFAULT_REQUIREMENT_TEMPLATES` — the same published
 * `requirement_templates` rows `/api/requirements` falls back to when it
 * generates a real checklist. Reusing them means this preview cannot drift from
 * what the student will actually be asked to do. The generated checklist still
 * replaces this the moment a workspace exists, because only the programme knows
 * its own rules.
 */
const TEMPLATE_BY_SECTION = new Map<string, typeof DEFAULT_REQUIREMENT_TEMPLATES>();
for (const tpl of DEFAULT_REQUIREMENT_TEMPLATES) {
  const list = TEMPLATE_BY_SECTION.get(tpl.section) ?? [];
  list.push(tpl);
  TEMPLATE_BY_SECTION.set(tpl.section, list);
}

const BLUEPRINT: {
  degree: "bachelor" | "master" | "phd";
  sections: { section: string; items: string[] }[];
}[] = [
  {
    degree: "bachelor",
    sections: [
      { section: "academic", items: ["Secondary-school diploma / graduation certificate", "Transcript of grades (all years)", "Certified translation + apostille where required"] },
      { section: "english", items: ["IELTS Academic / TOEFL iBT / Duolingo — one accepted test", "Some programmes waive the test with an English-medium diploma"] },
      { section: "testing", items: ["SAT / ACT for US undergraduate admission", "Subject or entrance exam where the programme lists one"] },
      { section: "documents", items: ["Passport valid for the full study period", "CV or activity list", "Portfolio for art, design or architecture"] },
      { section: "essays", items: ["Personal statement or motivation letter", "Programme-specific supplementary essays"] },
      { section: "recommendations", items: ["1–3 academic reference letters", "School counsellor report (US-style applications)"] },
      { section: "finance", items: ["Proof of funds or sponsorship declaration", "Scholarship applications submitted separately"] },
      { section: "application", items: ["Online application form + fee", "Interview if the programme requires one"] },
    ],
  },
  {
    degree: "master",
    sections: [
      { section: "academic", items: ["Bachelor's degree certificate", "Full academic transcript", "Certified translation + apostille where required"] },
      { section: "english", items: ["IELTS Academic / TOEFL iBT / Duolingo", "Medium-of-instruction certificate if the test is waived"] },
      { section: "testing", items: ["GRE / GMAT where the programme requires it", "Subject test for some quantitative programmes"] },
      { section: "documents", items: ["CV focused on academic and professional work", "Passport", "Research proposal (research-based programmes)"] },
      { section: "essays", items: ["Statement of purpose", "Writing sample for humanities and social sciences"] },
      { section: "recommendations", items: ["2–3 reference letters, at least one academic", "Referee emails confirmed before the deadline"] },
      { section: "finance", items: ["Proof of funds or scholarship award letter", "Assistantship or funding application"] },
      { section: "application", items: ["Online application form + fee", "Interview or admissions test where required"] },
    ],
  },
  {
    degree: "phd",
    sections: [
      { section: "academic", items: ["Master's degree certificate and transcript", "Certified translation + apostille where required"] },
      { section: "english", items: ["IELTS Academic / TOEFL iBT", "Institution-specific minimum band often higher than taught programmes"] },
      { section: "testing", items: ["GRE where the department requires it", "Departmental entrance examination in some countries"] },
      { section: "documents", items: ["Academic CV with publications and conference talks", "Research proposal with a defined question and method"] },
      { section: "essays", items: ["Statement of research interests", "Sample of academic writing"] },
      { section: "recommendations", items: ["2–3 academic references, ideally one from a potential supervisor", "Confirm a supervisor's interest before applying where the system expects it"] },
      { section: "finance", items: ["Funding plan, studentship or scholarship application", "Proof of funds if self-funded"] },
      { section: "application", items: ["Online application form + fee", "Panel or supervisor interview"] },
    ],
  },
];

export function RequirementsBrowser({ profileId, onOpenWorkspace }: { profileId: number; onOpenWorkspace: (id: number) => void }) {
  const t = useTranslations("journey");
  const { locale } = useLocaleContext();
  const [apps, setApps] = useState<AppRow[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [loaded, setLoaded] = useState<ReqData | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blueprintDegree, setBlueprintDegree] = useState<"bachelor" | "master" | "phd">("master");
  /**
   * Highest-fit university from the dashboard ranking. The blueprint's "start
   * from here" button opens that workspace instead of dropping the student back
   * into a blank search. Null while loading or when nothing scored.
   */
  const [topMatch, setTopMatch] = useState<{ id: number; name: string } | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    // Ranked by the same hybrid fit + positioning score the explorer uses —
    // ONE row from /api/universities instead of the dashboard's 25+ queries.
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/universities?profileId=${profileId}&perPage=1`, { credentials: "same-origin" });
        if (!res.ok) return;
        const json = (await res.json()) as {
          universities?: { id: number; name: string }[];
        };
        const first = json.universities?.[0];
        if (!cancelled && first) setTopMatch({ id: first.id, name: first.name });
      } catch {
        // The blueprint still works without a top match; the button says why.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/applications?profileId=${profileId}`, { credentials: "same-origin", cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (res.ok) {
          setApps(json.applications ?? []);
          if (json.applications?.length) setSelected(json.applications[0].id);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [profileId]);

  useEffect(() => {
    if (!selected) return;
    (async () => {
      setDetailLoading(true);
      try {
        const res = await fetch(`/api/requirements?profileId=${profileId}&applicationId=${selected}`, { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (res.ok) setLoaded(json as ReqData);
        else setError(json.error ?? t("rbLoadError"));
      } finally {
        setDetailLoading(false);
      }
    })();
  }, [selected, profileId, t]);

  // Nothing selected → no checklist, without a state write.
  const data = selected ? loaded : null;

  if (loading) return <Loading label={t("rbLoadingApps")} />;

  if (apps.length === 0) {
    const degree = blueprintDegree;
    const plan = BLUEPRINT.find((b) => b.degree === degree) ?? BLUEPRINT[1];
    return (
      <div className="space-y-4">
        <JourneyCard title={t("rbTitle")} subtitle={t("rbSubtitle1")}>
          <Empty title={t("rbEmptyTitle")} hint={t("rbEmptyHint")} />
          {onOpenWorkspace && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  // The workspace is keyed by APPLICATION id — passing the
                  // university id straight through 404s the panel. Reuse the
                  // student's application for this university, or create one,
                  // and open its real id.
                  const best = topMatch;
                  if (!best || starting) return;
                  setStarting(true);
                  void (async () => {
                    try {
                      const existing = apps.find((a) => a.universityId === best.id);
                      if (existing) {
                        onOpenWorkspace(existing.id);
                        return;
                      }
                      const res = await fetch("/api/applications", {
                        method: "POST",
                        credentials: "same-origin",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ profileId, universityId: best.id, universityName: best.name }),
                      });
                      const json = (await res.json().catch(() => ({}))) as { application?: { id?: number }; error?: string };
                      const appId = json.application?.id;
                      if (res.ok && typeof appId === "number") onOpenWorkspace(appId);
                      else setError(typeof json.error === "string" ? json.error : t("rbStartFromFailed"));
                    } catch {
                      setError(t("rbStartFromFailed"));
                    } finally {
                      setStarting(false);
                    }
                  })();
                }}
                disabled={!topMatch || starting}
              >
                {topMatch
                  ? t("rbStartFromMatch", { university: topMatch.name })
                  : t("rbStartNoMatch")}
              </Button>
            </div>
          )}
        </JourneyCard>

        {/*
          The standard blueprint. Students arrive here not knowing what an
          application contains; the programme-specific checklist replaces this
          the moment a workspace exists.
        */}
        <JourneyCard title={t("rbBlueprintTitle")} subtitle={t("rbBlueprintSubtitle")}>
          <div className="mb-3 flex flex-wrap gap-1.5" role="tablist" aria-label={t("rbBlueprintDegreeLabel")}>
            {BLUEPRINT.map((b) => (
              <button
                key={b.degree}
                type="button"
                role="tab"
                aria-selected={b.degree === degree}
                onClick={() => setBlueprintDegree(b.degree)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                  b.degree === degree
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {t(`rbDegree.${b.degree}`)}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[...plan.sections]
              // Canonical published order — a section added to the catalogue
              // lands in the right place here without touching this file.
              .sort(
                (a, b) =>
                  REQUIREMENT_SECTIONS.indexOf(a.section as RequirementSection) -
                  REQUIREMENT_SECTIONS.indexOf(b.section as RequirementSection)
              )
              .map((sec) => {
              // Published template rows are what the app will really ask for;
              // the degree-specific extras only fill the gaps they leave
              // (academic records, English tests, admissions tests).
              const published = TEMPLATE_BY_SECTION.get(sec.section) ?? [];
              const publishedTitles = new Set(published.map((p) => p.title));
              const extras = sec.items.filter((i) => !publishedTitles.has(i));
              if (published.length === 0 && extras.length === 0) return null;
              return (
                <div key={sec.section} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {t(`rbSection.${sec.section}`)}
                  </p>
                  <ul className="mt-1.5 space-y-1.5">
                    {published.map((item) => (
                      <li key={item.itemKey} className="text-xs text-slate-600 dark:text-slate-300">
                        <span className="flex items-start gap-1.5">
                          <span aria-hidden className="text-slate-400">•</span>
                          <span className="font-semibold">{item.title}</span>
                          {/* Same uppercase micro-label the generated
                              checklist rows use, so the preview reads as a
                              preview of those rows. */}
                          <span
                            className={`ml-auto shrink-0 text-[10px] uppercase ${
                              item.isRequired ? "font-semibold text-indigo-600 dark:text-indigo-300" : "text-slate-400"
                            }`}
                          >
                            {item.isRequired ? t("rbRequired") : t("rbOptional")}
                          </span>
                        </span>
                        {item.instructions && (
                          <span className="mt-0.5 block pl-3.5 text-[11px] text-slate-500 dark:text-slate-400">
                            {item.instructions}
                          </span>
                        )}
                      </li>
                    ))}
                    {extras.map((item, i) => (
                      <li key={`x${i}`} className="flex gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                        <span aria-hidden className="text-slate-400">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500 dark:bg-slate-900/40 dark:text-slate-400">
            {t("rbBlueprintNote")}
          </p>
          <AppNote kind="catalogue" className="mt-2" />
        </JourneyCard>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <JourneyCard
        title={t("rbTitle")}
        subtitle={t("rbSubtitle2")}
      >
        <div className="flex flex-wrap gap-1.5">
          {apps.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setSelected(a.id)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                selected === a.id
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {a.universityName}
            </button>
          ))}
        </div>
      </JourneyCard>

      {detailLoading && <Loading label={t("rbLoadingChecklist")} />}
      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}

      {data && !detailLoading && (
        <JourneyCard
          title={data.application.universityName}
          subtitle={data.application.programName ?? undefined}
          action={
            <div className="text-right">
              <p className="text-xl font-extrabold text-slate-900 dark:text-white">{data.progress.pct}%</p>
              <p className="text-[10px] font-bold uppercase text-slate-500">
                {t("rbDone", { done: data.progress.done, total: data.progress.total })}
              </p>
            </div>
          }
        >
          <ProgressBar pct={data.progress.pct} tone={data.progress.pct >= 100 ? "good" : "brand"} />

          <div className="mt-4 space-y-4">
            {SECTION_ORDER.filter((s) => data.requirements.some((r) => r.section === s)).map((section) => {
              const items = data.requirements.filter((r) => r.section === section);
              const s = data.progress.sections.find((x) => x.key === section);
              return (
                <div key={section}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">{t(`sec${section[0].toUpperCase()}${section.slice(1)}`)}</h3>
                    {s && (
                      <span className="text-[11px] text-slate-500">
                        {s.done}/{s.total}
                      </span>
                    )}
                  </div>
                  <ul className="space-y-1.5">
                    {items.map((r) => (
                      <li
                        key={r.id}
                        className="flex flex-wrap items-start gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700"
                      >
                        <StatusIcon state={r.status} className="mt-0.5 h-4 w-4" />
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-medium ${
                              r.status === "done" ? "text-slate-400 line-through" : "text-slate-800 dark:text-slate-100"
                            }`}
                          >
                            {r.title}
                            {!r.isRequired && <span className="ml-1 text-[10px] uppercase text-slate-400">{t("rbOptional")}</span>}
                          </p>
                          {r.instructions && <p className="text-xs text-slate-500 dark:text-slate-400">{r.instructions}</p>}
                          <div className="mt-0.5 flex flex-wrap items-center gap-2">
                            <SourceTag
                              url={r.sourceUrl}
                              name={r.sourceName}
                              lastVerified={r.lastVerifiedAt}
                              verificationStatus={r.verificationStatus}
                            />
                            {r.dueDate && <Pill tone={toneForDays(daysTo(r.dueDate))}>{daysLabel(daysTo(r.dueDate), locale)}</Pill>}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => onOpenWorkspace(data.application.id)}>{t("rbOpenWorkspace")}</Button>
            {data.university?.applicationUrl && (
              <a
                href={data.university.applicationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <ExternalLink className="h-3.5 w-3.5" /> {t("rbOfficialLink")}
              </a>
            )}
          </div>
        </JourneyCard>
      )}
      {/* Standing small print: this panel can be wrong — say so where it is read. */}
      <AppNote kind="catalogue" className="mt-2" />
    </div>
  );
}

function daysTo(iso: string | null): number | null {
  if (!iso) return null;
  const now = new Date();
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((new Date(`${iso.slice(0, 10)}T00:00:00Z`).getTime() - start) / 86400000);
}
