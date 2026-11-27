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
import React, { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, CircleCheck, ClipboardList, ExternalLink, ScanSearch } from "lucide-react";
import { useLocaleContext } from "@/i18n/LocaleProvider";
import { Empty, JourneyCard, Loading, Pill, ProgressBar, SourceTag, StatusIcon, daysLabel, toneForDays } from "@/components/ui/journey";
import { AppNote } from "@/components/AppNote";
import { notifyApplicationsChanged } from "@/lib/applicationEvents";
import {
  DEFAULT_REQUIREMENT_TEMPLATES,
  REQUIREMENT_SECTIONS,
  type RequirementSection,
} from "@/lib/journey/requirements";
import { Button } from "@/components/ui/Button";
import { fetchJsonWithTimeout } from "@/lib/clientFetch";
import type { ApplicationSummary } from "@/lib/applicationsResponse";
import { useResource } from "./useResource";

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
}

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

type MaterialShortcut = "vault" | "sop" | "recommendations";

export function RequirementsBrowser({ profileId, applications, applicationId, onOpenWorkspace, onOpenMaterial, canOpenMaterial }: {
  profileId: number;
  applications: ApplicationSummary[];
  applicationId: number | null;
  onOpenWorkspace: (id: number) => void;
  onOpenMaterial: (tool: MaterialShortcut) => void;
  canOpenMaterial: (tool: MaterialShortcut) => boolean;
}) {
  const t = useTranslations("journey");
  const { locale } = useLocaleContext();
  const tm = useTranslations("materials");
  const [filter, setFilter] = useState<"all" | "required" | "review">("all");
  const [focusRequest, setFocusRequest] = useState<{ id: number } | null>(null);
  const [startError, setStartError] = useState("");
  const loadError = t("rbLoadError");
  const { data, loading, error, reload } = useResource<ReqData | null>(
    useCallback(() => fetchJsonWithTimeout<ReqData>(
      `/api/requirements?profileId=${profileId}&applicationId=${applicationId}`,
      { timeoutMs: 12_000, fallbackMessage: loadError },
    ), [profileId, applicationId, loadError]),
    [profileId, applicationId],
    { initial: null, enabled: applicationId != null, errorFallback: loadError },
  );
  const [blueprintDegree, setBlueprintDegree] = useState<"bachelor" | "master" | "phd">("master");
  /**
   * Highest-fit university from the dashboard ranking. The blueprint's "start
   * from here" button opens that workspace instead of dropping the student back
   * into a blank search. Null while loading or when nothing scored.
   */
  const [topMatch, setTopMatch] = useState<{ id: number; name: string } | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (applicationId != null || applications.length > 0) return;
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
  }, [profileId, applicationId, applications.length]);

  useEffect(() => {
    if (!focusRequest) return;
    const details = document.getElementById(`material-requirement-${focusRequest.id}`);
    if (details instanceof HTMLDetailsElement) {
      details.open = true;
      details.querySelector("summary")?.focus();
    }
  }, [focusRequest]);

  if (applicationId == null) {
    const degree = blueprintDegree;
    const plan = BLUEPRINT.find((b) => b.degree === degree) ?? BLUEPRINT[1];
    return (
      <div className="space-y-4">
        {applications.length === 0 && <JourneyCard title={t("rbTitle")} subtitle={t("rbSubtitle1")}>
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
                  setStartError("");
                  void (async () => {
                    try {
                      const res = await fetch("/api/applications", {
                        method: "POST",
                        credentials: "same-origin",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ profileId, universityId: best.id, universityName: best.name }),
                      });
                      const json = (await res.json().catch(() => ({}))) as { application?: { id?: number }; error?: string };
                      const appId = json.application?.id;
                      if (res.ok && typeof appId === "number") {
                        notifyApplicationsChanged(profileId);
                        onOpenWorkspace(appId);
                      }
                      else setStartError(typeof json.error === "string" ? json.error : t("rbStartFromFailed"));
                    } catch {
                      setStartError(t("rbStartFromFailed"));
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
          {startError && <p role="alert" className="mt-2 text-sm text-rose-700 dark:text-rose-300">{startError}</p>}
        </JourneyCard>}

        {/*
          The standard blueprint. Students arrive here not knowing what an
          application contains; the programme-specific checklist replaces this
          the moment a workspace exists.
        */}
        <JourneyCard title={t("rbBlueprintTitle")} subtitle={t("rbBlueprintSubtitle")}>
          <div className="mb-3 flex flex-wrap gap-1.5" role="tablist" aria-label={t("rbBlueprintDegreeLabel")}>
            {BLUEPRINT.map((b) => (
              <Button variant="unstyled"
                key={b.degree}
                type="button"
                role="tab"
                aria-selected={b.degree === degree}
                onClick={() => setBlueprintDegree(b.degree)}
                className={`rounded-control border px-3 py-1.5 text-xs font-semibold transition ${
                  b.degree === degree
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {t(`rbDegree.${b.degree}`)}
              </Button>
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
                <div key={sec.section} className="rounded-surface border border-slate-200 p-3 dark:border-slate-700">
                  <p className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {t(`rbSection.${sec.section}`)}
                  </p>
                  <ul className="mt-1.5 space-y-1.5">
                    {published.map((item) => (
                      <li key={item.itemKey} className="text-sm text-slate-600 dark:text-slate-300">
                        <span className="flex items-start gap-1.5">
                          <span aria-hidden className="text-slate-500">•</span>
                          <span className="font-semibold">{item.title}</span>
                          {/* Same uppercase micro-label the generated
                              checklist rows use, so the preview reads as a
                              preview of those rows. */}
                          <span
                            className={`ml-auto shrink-0 text-xs uppercase ${
                              item.isRequired ? "font-semibold text-indigo-600 dark:text-indigo-300" : "text-slate-500"
                            }`}
                          >
                            {item.isRequired ? t("rbRequired") : t("rbOptional")}
                          </span>
                        </span>
                        {item.instructions && (
                          <span className="mt-0.5 block pl-3.5 text-xs text-slate-500 dark:text-slate-400">
                            {item.instructions}
                          </span>
                        )}
                      </li>
                    ))}
                    {extras.map((item, i) => (
                      <li key={`x${i}`} className="flex gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                        <span aria-hidden className="text-slate-500">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <p className="mt-3 rounded-control bg-slate-50 px-3 py-2 text-sm text-slate-500 dark:bg-slate-900/40 dark:text-slate-400">
            {t("rbBlueprintNote")}
          </p>
          <AppNote kind="catalogue" className="mt-2" />
        </JourneyCard>
      </div>
    );
  }

  if (loading) return <Loading label={t("rbLoadingChecklist")} />;
  if (error || !data) {
    return (
      <JourneyCard title={t("rbTitle")}>
        <p role="alert" className="mb-3 text-sm text-rose-700 dark:text-rose-300">{error || loadError}</p>
        <Button variant="outline" onClick={() => void reload()}>{tm("retry")}</Button>
      </JourneyCard>
    );
  }

  const mandatory = data.requirements.filter((item) => item.isRequired && item.status !== "not_required");
  const unfinished = mandatory.filter((item) => item.status !== "done");
  const needsReview = data.requirements.filter((item) => item.status !== "not_required" && item.verificationStatus !== "verified");
  const done = mandatory.length - unfinished.length;
  const pct = mandatory.length ? Math.round((done / mandatory.length) * 100) : 0;
  const next = unfinished.find((item) => item.status === "todo") ?? unfinished[0] ?? needsReview[0];
  const visible = filter === "required" ? unfinished : filter === "review" ? needsReview : data.requirements;
  const stats = [
    { label: tm("mandatory"), value: mandatory.length, icon: ClipboardList, color: "text-indigo-700 dark:text-indigo-300" },
    { label: tm("completed"), value: done, icon: CircleCheck, color: "text-emerald-700 dark:text-emerald-300" },
    { label: tm("review"), value: needsReview.length, icon: ScanSearch, color: "text-amber-700 dark:text-amber-300" },
  ];
  return (
    <div className="space-y-4">
      <JourneyCard title={t("rbTitle")} subtitle={data.application.universityName}>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
          <div className="min-w-0">
            <dl className="mb-3 grid gap-2 min-[400px]:grid-cols-3">
              {stats.map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="min-w-0 rounded-surface border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-950/40">
                  <dt className="flex gap-1.5 break-words text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <Icon className={`size-4 shrink-0 ${color}`} aria-hidden />{label}
                  </dt>
                  <dd className={`mt-1 text-xl font-bold tabular-nums ${color}`}>{value}</dd>
                </div>
              ))}
            </dl>
            {mandatory.length > 0 && <ProgressBar pct={pct} tone={pct === 100 ? "good" : "brand"} />}
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {mandatory.length ? tm("progress", { done, total: mandatory.length }) : tm("noMandatory")}
            </p>
          </div>
          <section className="min-w-0 rounded-surface border border-indigo-200 bg-indigo-50 p-3 dark:border-indigo-400/30 dark:bg-indigo-400/10">
            <h3 className="text-xs font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">{tm("nextStep")}</h3>
            <p className="mt-1 break-words font-semibold text-slate-900 dark:text-indigo-50">
              {next?.title ?? (mandatory.length ? tm("completedMandatory") : tm("openWorkspaceHint"))}
            </p>
            {next?.instructions && <p className="mt-1 break-words text-sm text-slate-600 dark:text-slate-300">{next.instructions}</p>}
            <Button size="sm" variant="outline" className="mt-3" onClick={() => {
              if (!next) return onOpenWorkspace(data.application.id);
              setFilter("all");
              setFocusRequest({ id: next.id });
            }}>
              {next ? tm("viewRequirement") : t("rbOpenWorkspace")} <ArrowRight className="size-4" aria-hidden />
            </Button>
          </section>
        </div>
      </JourneyCard>
      <JourneyCard title={tm("checklist")}>
        <div role="group" aria-label={tm("filterRequirements")} className="mb-4 flex flex-wrap gap-2">
          {([
            ["required", tm("remaining")],
            ["review", tm("review")],
            ["all", tm("all")],
          ] as const).map(([id, label]) => (
            <Button key={id} size="sm" variant={filter === id ? "primary" : "outline"} aria-pressed={filter === id} onClick={() => setFilter(id)}>
              {label}
            </Button>
          ))}
        </div>
        {visible.length === 0 ? <Empty title={tm("noRequirements")} /> : (
          <div className="space-y-4">
            {REQUIREMENT_SECTIONS.map((section) => {
              const items = visible.filter((item) => item.section === section);
              if (!items.length) return null;
              return (
                <section key={section}>
                  <h3 className="mb-1.5 text-sm font-bold text-slate-700 dark:text-slate-200">{t(`rbSection.${section}`)}</h3>
                  <ul className="space-y-2">
                    {items.map((item) => {
                      const tool = item.section === "documents" ? "vault"
                        : item.section === "essays" ? "sop"
                        : item.section === "recommendations" ? "recommendations" : null;
                      return (
                        <li key={item.id}>
                          <details id={`material-requirement-${item.id}`} className="rounded-surface border border-slate-200 dark:border-slate-700">
                            <summary className="min-h-11 cursor-pointer rounded-surface p-3 text-sm text-indigo-700 hover:bg-indigo-50/70 focus-visible:outline-2 focus-visible:outline-indigo-600 dark:text-indigo-300 dark:hover:bg-indigo-400/10">
                              <span className="ml-1 inline-flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-2 align-middle">
                                <StatusIcon state={item.status} />
                                <span className="min-w-0 break-words font-semibold text-slate-800 dark:text-slate-100">{item.title}</span>
                                <Pill tone={item.isRequired && item.status !== "not_required" ? "brand" : "slate"}>
                                  {t(item.isRequired && item.status !== "not_required" ? "rbRequired" : "rbOptional")}
                                </Pill>
                                {item.status === "done" && <Pill tone="good">{tm("completed")}</Pill>}
                                {item.verificationStatus !== "verified" && item.status !== "not_required" && <Pill tone="warn">{tm("review")}</Pill>}
                              </span>
                            </summary>
                            <div className="space-y-2 border-t border-slate-200 px-3 py-3 dark:border-slate-700">
                              {item.instructions && <p className="whitespace-pre-line break-words text-sm text-slate-600 dark:text-slate-300">{item.instructions}</p>}
                              <div className="flex flex-wrap items-center gap-2">
                                <SourceTag url={item.sourceUrl} name={item.sourceName} lastVerified={item.lastVerifiedAt} verificationStatus={item.verificationStatus} />
                                {item.dueDate && <Pill tone={toneForDays(daysTo(item.dueDate))}>{daysLabel(daysTo(item.dueDate), locale)}</Pill>}
                              </div>
                              {tool && canOpenMaterial(tool) && (
                                <Button size="sm" variant="outline" onClick={() => onOpenMaterial(tool)}>
                                  {tm(tool)} <ArrowRight className="size-4" aria-hidden />
                                </Button>
                              )}
                            </div>
                          </details>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => onOpenWorkspace(data.application.id)}>{t("rbOpenWorkspace")}</Button>
          {data.university?.applicationUrl && (
            <a href={data.university.applicationUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-control px-3 text-sm font-semibold text-indigo-700 hover:underline dark:text-indigo-300">
              <ExternalLink className="size-4 shrink-0" aria-hidden /> {t("rbOfficialLink")}
            </a>
          )}
        </div>
      </JourneyCard>
      <AppNote kind="catalogue" />
    </div>
  );
}

function daysTo(iso: string | null): number | null {
  if (!iso) return null;
  const now = new Date();
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((new Date(`${iso.slice(0, 10)}T00:00:00Z`).getTime() - start) / 86400000);
}
