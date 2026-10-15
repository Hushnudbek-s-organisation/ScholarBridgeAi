"use client";

/**
 * DISCOVER helpers + the two post-admission practice sections.
 *
 *  • CareerExplorerPanel — spec §15: Career → Major → Countries →
 *    Universities → Scholarships → Applications.
 *  • VisaCenterPanel — spec §25: the visa case built on the EXISTING Visa
 *    Speaking assistant, plus admin-published country requirements that are
 *    never written by AI.
 *  • InterviewCenterPanel — spec §26: university and visa interview practice
 *    with feedback that never claims a visa-approval probability.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, GraduationCap, Search } from "lucide-react";
import { CAREER_PATHS } from "@/lib/journey/careers";
import { CareerDiscoveryFlow } from "@/components/journey/CareerDiscoveryFlow";
import { Button, Empty, JourneyCard, Loading, Pill, ProgressBar, inputClass } from "./ui";
import { useLocaleContext } from "@/i18n/LocaleProvider";
import { AppNote } from "@/components/AppNote";
import { VisaModelAnswers } from "@/components/samples/VisaModelAnswers";
import { subjectAffinity } from "@/lib/subjectAffinity";
import { INTERVIEW_TRACKS, interviewText } from "@/lib/journey/interviewTracks";
import { Mic } from "lucide-react";

// ===========================================================================
// CAREER & MAJOR EXPLORER (spec §15)
// ===========================================================================

/**
 * Does this university offer the selected major?
 * Checks BOTH the legacy `programMajor` summary and the detailed `programs`
 * catalogue (programFields) that admins use for the 200-university import.
 * Uses the same synonym-aware engine as the recommender/matcher, so
 * "Computer Science" matches "Informatics", "IT", "Software Engineering", etc.
 */
function majorAffinityScore(u: any, major: string): number {
  const candidates: string[] = [];
  if (u.programMajor) candidates.push(String(u.programMajor));
  if (Array.isArray(u.programFields)) candidates.push(...u.programFields.filter(Boolean).map(String));
  // legacy fallback: some older API payloads include programs array
  if (Array.isArray(u.programs)) {
    for (const p of u.programs) {
      if (p?.field) candidates.push(String(p.field));
      else if (typeof p === "string") candidates.push(p);
    }
  }
  if (candidates.length === 0) {
    const fit = subjectAffinity([major], u.name ?? "");
    return fit.level === "exact" || fit.level === "synonym" ? fit.score : 0;
  }
  let best = 0;
  for (const field of candidates) {
    const fit = subjectAffinity([major], field);
    if (fit.level === "exact" || fit.level === "synonym" || fit.level === "partial") {
      if (fit.score > best) best = fit.score;
    }
  }
  return best;
}

function universityOffersMajor(u: any, major: string): boolean {
  return majorAffinityScore(u, major) > 0;
}

export function CareerExplorerPanel({
  onNavigateTab,
  profileId,
}: {
  onNavigateTab: (t: string) => void;
  /** Session profile — powers the career-discovery quiz (optional: catalog still works signed-out). */
  profileId?: number | null;
}) {
  const t = useTranslations("journey");
  const tDisc = useTranslations("careerDiscovery");
  // ONE panel, TWO modes: the guided "find my direction" quiz and the catalog
  // explorer. A discovery pick hands over to the catalog below — never a
  // second, parallel explorer.
  const [mode, setMode] = useState<"discover" | "catalog">("discover");
  const [career, setCareer] = useState<string>(CAREER_PATHS[0].id);
  const [major, setMajor] = useState<string>(CAREER_PATHS[0].majors[0]);
  const [unis, setUnis] = useState<any[]>([]);
  // `loading` is DERIVED, not stored. Writing setLoading(true) synchronously in
  // the effect body triggered a cascading render (react-hooks/set-state-in-effect)
  // and briefly showed the PREVIOUS major's results as if they were current.
  // While `loadedFor` differs from the selected major the panel is loading, so
  // there is no second piece of state to keep in sync and nothing to reset.
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string>("");
  const loading = loadedFor !== major;

  // The catalogue is English data; titles/blurbs are a closed set the UI translates.
  const careerTitle = (id: string) => t(`careerTitle${id[0].toUpperCase()}${id.slice(1)}`);
  const careerBlurb = (id: string) => t(`careerBlurb${id[0].toUpperCase()}${id.slice(1)}`);
  const path = useMemo(() => CAREER_PATHS.find((c) => c.id === career) ?? CAREER_PATHS[0], [career]);
  // Picking a career picks its first recommended major in the same click, so no
  // effect is needed to keep them in sync.
  const pickCareer = (id: string) => {
    const next = CAREER_PATHS.find((c) => c.id === id) ?? CAREER_PATHS[0];
    setCareer(id);
    setMajor(next.majors[0]);
  };

  // Universities are fetched from the EXISTING endpoint — no second source of
  // truth, no duplicated data. The server now supports `?major=` with synonym-aware
  // filtering and also returns `programFields` per university, so the client can
  // verify with the same affinity engine. This fixes the old first-word substring
  // logic that missed "Informatics ↔ Computer Science", "IT ↔ Information Systems", etc.
  useEffect(() => {
    let cancelled = false;
    /** The single place this effect writes state — always after an await. */
    const finish = (list: any[], error = "") => {
      if (cancelled) return;
      setUnis(list);
      setFetchError(error);
      setLoadedFor(major);
    };
    (async () => {
      try {
        // Prefer server-side major filtering (uses programs table + programMajor + subjectAffinity).
        // If the server doesn't yet support `major`, it will ignore the param and return all — we detect and do client filtering.
        const params = new URLSearchParams();
        params.set("major", major);
        // No perPage/page → server returns full filtered list (important for the 200-university case).
        const res = await fetch(`/api/universities?${params.toString()}`, { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          // Server error — try client-side fallback by fetching all
          const fallbackRes = await fetch(`/api/universities`, { cache: "no-store" });
          const fallbackJson = await fallbackRes.json().catch(() => ({}));
          if (cancelled || !fallbackRes.ok) {
            return finish([], json?.error || fallbackJson?.error || t("ceEmptyHint"));
          }
          const all: any[] = fallbackJson.universities ?? [];
          const filtered = all.filter((u) => universityOffersMajor(u, major));
          filtered.sort((a: any, b: any) => majorAffinityScore(b, major) - majorAffinityScore(a, major) || (a.worldRanking ?? 9999) - (b.worldRanking ?? 9999));
          return finish(filtered.slice(0, 12));
        }
        let list: any[] = json.universities ?? [];
        // If server returned an unfiltered list (doesn't support major yet), filter client-side.
        // Heuristic: if list is large and contains universities that clearly don't offer this major via affinity, do client filter.
        // We always run client affinity verification when programFields are present to guarantee correctness.
        const hasProgramFields = list.some((u: any) => Array.isArray(u.programFields));
        if (hasProgramFields && list.length > 0) {
          const clientFiltered = list.filter((u) => universityOffersMajor(u, major));
          clientFiltered.sort((a: any, b: any) => majorAffinityScore(b, major) - majorAffinityScore(a, major) || (a.worldRanking ?? 9999) - (b.worldRanking ?? 9999));
          // If server claimed to filter but client finds no matches while server returned many, server didn't filter — use client result.
          // If server returned a small filtered set, clientFiltered should equal list; we keep the intersection to be safe.
          if (clientFiltered.length > 0 && clientFiltered.length < list.length) {
            list = clientFiltered;
          } else if (clientFiltered.length === 0 && list.length >= 12) {
            // Server returned all 200 unfiltered but client finds some matches — need full dataset to find all matches
            // Fetch all without major param and filter properly
            const allRes = await fetch(`/api/universities`, { cache: "no-store" });
            const allJson = await allRes.json().catch(() => ({}));
            if (!cancelled && allRes.ok) {
              const all: any[] = allJson.universities ?? [];
              const filtered = all.filter((u) => universityOffersMajor(u, major));
              filtered.sort((a: any, b: any) => majorAffinityScore(b, major) - majorAffinityScore(a, major) || (a.worldRanking ?? 9999) - (b.worldRanking ?? 9999));
              return finish(filtered.slice(0, 12));
            } else {
              // Keep clientFiltered (empty) — honest empty state
              list = clientFiltered;
            }
          }
        } else if (!hasProgramFields && list.length > 0) {
          // Older server without programFields — fetch full list and filter client-side for accuracy
          const allRes = await fetch(`/api/universities`, { cache: "no-store" });
          const allJson = await allRes.json().catch(() => ({}));
          if (!cancelled && allRes.ok) {
            const all: any[] = allJson.universities ?? [];
            // Need programFields for accurate matching; if still missing, use programMajor only fallback
            const filtered = all.filter((u) => universityOffersMajor(u, major));
            filtered.sort((a: any, b: any) => majorAffinityScore(b, major) - majorAffinityScore(a, major) || (a.worldRanking ?? 9999) - (b.worldRanking ?? 9999));
            if (filtered.length > 0) {
              return finish(filtered.slice(0, 12));
            }
          }
        }
        // Ensure result is ranked by affinity before showing
        list.sort((a: any, b: any) => majorAffinityScore(b, major) - majorAffinityScore(a, major) || (a.worldRanking ?? 9999) - (b.worldRanking ?? 9999));
        finish(list.slice(0, 12));
      } catch (e: any) {
        finish([], e?.message || "");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [major, t]);

  return (
    <div className="space-y-4">
      {/* Mode switch — discovery first for the undecided, catalog for everyone. */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label={tDisc("modeSwitchAria")}>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "discover"}
          onClick={() => setMode("discover")}
          className={`rounded-xl border-2 px-4 py-2 text-sm font-bold transition ${
            mode === "discover"
              ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/50 dark:text-indigo-200"
              : "border-slate-200 text-slate-600 hover:border-indigo-300 dark:border-slate-700 dark:text-slate-300"
          }`}
        >
          {tDisc("modeDiscover")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "catalog"}
          onClick={() => setMode("catalog")}
          className={`rounded-xl border-2 px-4 py-2 text-sm font-bold transition ${
            mode === "catalog"
              ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/50 dark:text-indigo-200"
              : "border-slate-200 text-slate-600 hover:border-indigo-300 dark:border-slate-700 dark:text-slate-300"
          }`}
        >
          {tDisc("modeCatalog")}
        </button>
      </div>

      {mode === "discover" && (
        <CareerDiscoveryFlow
          profileId={profileId ?? null}
          mode="panel"
          onSelected={(careerId) => {
            pickCareer(careerId);
            setMode("catalog");
          }}
        />
      )}

      {mode === "catalog" && (
      <>
      <JourneyCard
        title="Career & major explorer"
        subtitle="Start from the job you want. We show the majors that lead there, the countries that offer them, and the universities that publish them."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CAREER_PATHS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => pickCareer(c.id)}
              className={`rounded-xl border p-3 text-left transition ${
                career === c.id
                  ? "border-indigo-500 bg-indigo-50 dark:border-indigo-600 dark:bg-indigo-950/40"
                  : "border-slate-200 hover:border-indigo-300 dark:border-slate-700"
              }`}
            >
              <p className="text-sm font-bold text-slate-900 dark:text-white">{careerTitle(c.id)}</p>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{careerBlurb(c.id)}</p>
            </button>
          ))}
        </div>
      </JourneyCard>

      <JourneyCard title={t("ceMajorsTitle")} subtitle={t("ceMajorsSubtitle", { title: careerTitle(path.id) })}>
        <div className="flex flex-wrap gap-2">
          {path.majors.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMajor(m)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                major === m
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-slate-200 text-slate-600 hover:border-indigo-300 dark:border-slate-700 dark:text-slate-300"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        {path.countries.length > 0 && (
          <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
            <span className="font-semibold">{t("ceDestinations")}</span>
            {path.countries.map((c) => (
              <Pill key={c} tone="info">
                {c}
              </Pill>
            ))}
          </p>
        )}
      </JourneyCard>

      <JourneyCard
        title={t("ceUnisTitle", { major })}
        subtitle={t("ceUnisSubtitle")}
        action={<Search className="h-4 w-4 text-slate-400" aria-hidden />}
      >
        {loading ? (
          <Loading />
        ) : unis.length === 0 ? (
          <Empty title={t("ceEmptyTitle")} hint={fetchError || t("ceEmptyHint")} />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {unis.map((u) => (
              <div key={u.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {u.flagEmoji} {u.name}
                </p>
                <p className="text-[11px] text-slate-500">
                  {u.city}, {u.country} · #{u.worldRanking}
                </p>
                {/* Show matched field(s) so the student sees WHY this university appears for the chosen major */}
                {(u.programMajor || (Array.isArray(u.programFields) && u.programFields.length > 0)) && (
                  <p className="mt-1 break-words text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                    {(() => {
                      const fields: string[] = Array.isArray(u.programFields) && u.programFields.length > 0
                        ? u.programFields
                        : u.programMajor ? [String(u.programMajor)] : [];
                      // Highlight the field(s) that matched the selected major first
                      const matched = fields.filter((f) => {
                        const fit = subjectAffinity([major], f);
                        return fit.level === "exact" || fit.level === "synonym" || fit.level === "partial";
                      });
                      const rest = fields.filter((f) => !matched.includes(f));
                      const ordered = [...matched, ...rest];
                      return ordered.slice(0, 3).join(" · ") + (ordered.length > 3 ? " +" + (ordered.length - 3) : "");
                    })()}
                  </p>
                )}
                <p className="mt-1 text-[11px] text-slate-500">
                  {u.minGpa != null && `GPA ≥ ${u.minGpa} · `}
                  {u.minIelts != null && `IELTS ≥ ${u.minIelts} · `}
                  {u.minSat != null && `SAT ≥ ${u.minSat}`}
                </p>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => onNavigateTab("universities")}>
            {t("ceOpenExplorer")} <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" onClick={() => onNavigateTab("scholarships")}>
            {t("ceFindScholarships")}
          </Button>
          <Button variant="outline" onClick={() => onNavigateTab("applications")}>
            {t("ceStartApplication")}
          </Button>
        </div>
      </JourneyCard>
      {/* Standing small print: this panel can be wrong — say so where it is read. */}
      <AppNote kind="catalogue" className="mt-2" />
      </>
      )}
    </div>
  );
}

// ===========================================================================
// VISA CENTER (spec §25)
// ===========================================================================

export function VisaCenterPanel({ profileId, onNavigateTab }: { profileId: number; onNavigateTab: (t: string) => void }) {
  const t = useTranslations("journey");
  const { locale } = useLocaleContext();
  const reduceMotion = useReducedMotion();
  const [country, setCountry] = useState("");
  const [data, setData] = useState<any>(null);
  const [history, setHistory] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [reqs, hist] = await Promise.all([
          fetch("/api/visa/requirements?country=" + encodeURIComponent(country), { cache: "no-store" }),
          fetch(`/api/visa/history?profileId=${profileId}`, { cache: "no-store" }),
        ]);
        setData(reqs.ok ? await reqs.json() : { requirements: [] });
        if (hist.ok) setHistory(await hist.json());
      } finally {
        setLoading(false);
      }
    })();
  }, [country, profileId]);

  return (
    <div className="space-y-4">
      <JourneyCard
        title={t("vcTitle")}
        subtitle={t("vcSubtitle")}
      >
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-full sm:w-64">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">{t("vcCountry")}</span>
            <input
              className={inputClass}
              value={country}
              placeholder={t("vcCountryPlaceholder")}
              onChange={(e) => setCountry(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={() => onNavigateTab("visa")}>
            <GraduationCap className="h-3.5 w-3.5" /> {t("vcOpenSpeaking")}
          </Button>
        </div>
      </JourneyCard>

      {/* Embassy model answers — the typed country pre-selects its transcript. */}
      <VisaModelAnswers countryHint={country} />

      <JourneyCard title={t("vcDocsTitle")} subtitle={t("vcDocsSubtitle")}>
        {loading ? (
          <Loading />
        ) : !data?.requirements?.length ? (
          <Empty
            title={country ? t("vcEmptyTitle", { country }) : t("vcEmptyTitle2")}
            hint={t("vcEmptyHint")}
          />
        ) : (
          <ul className="space-y-2">
            {data.requirements.map((r: any, i: number) => (
              <motion.li
                key={r.id}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px 0px" }}
                transition={{ delay: reduceMotion ? 0 : Math.min(i, 6) * 0.05, duration: 0.32 }}
                className="sb-card-hover rounded-xl border border-slate-200 p-3 dark:border-slate-700"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{r.title}</p>
                    <p className="text-[11px] text-slate-500">
                      {r.visaType}
                      {r.lastVerifiedAt ? t("vcVerified", { date: String(r.lastVerifiedAt).slice(0, 10) }) : ""}
                    </p>
                  </div>
                  {r.isRequired ? <Pill tone="warn">{t("vcRequired")}</Pill> : <Pill tone="slate">{t("vcOptional")}</Pill>}
                </div>
                {r.instructions && <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{r.instructions}</p>}
                {r.sourceUrl ? (
                  <a
                    href={r.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    {r.sourceName ?? t("uiOfficialSource")} →
                  </a>
                ) : (
                  <p className="mt-1 text-[11px] text-slate-400">{t("uiNotSpecified")}</p>
                )}
              </motion.li>
            ))}
          </ul>
        )}
      </JourneyCard>

      {history?.sessions?.length > 0 && (
        <JourneyCard title={t("vcHistoryTitle")} subtitle={t("vcHistorySubtitle")}>
          <ul className="space-y-1.5">
            {history.sessions.map((s: any, i: number) => (
              <li key={s.id} className="flex items-center gap-3 text-sm">
                <Pill tone="slate">#{i + 1}</Pill>
                <span className="text-slate-600 dark:text-slate-300">{s.country ?? "—"}</span>
                <span className="flex-1">
                  <ProgressBar pct={Math.round((s.total / 5) * 100)} size="sm" />
                </span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{s.total}/5</span>
              </li>
            ))}
          </ul>
        </JourneyCard>
      )}
      {/* Standing small print: this panel can be wrong — say so where it is read. */}
      <AppNote kind="visa" className="mt-2" />
    </div>
  );
}

// ===========================================================================
// INTERVIEW CENTER (spec §26)
// ===========================================================================

export function InterviewCenterPanel({ onNavigateTab }: { onNavigateTab: (t: string) => void }) {
  const t = useTranslations("journey");
  const reduceMotion = useReducedMotion();
  const { locale } = useLocaleContext();
  const [trackId, setTrackId] = useState(INTERVIEW_TRACKS[0].id);
  const track = INTERVIEW_TRACKS.find((x) => x.id === trackId) ?? INTERVIEW_TRACKS[0];
  const tx = (v: Parameters<typeof interviewText>[0]) => interviewText(v, locale);

  /*
   * Timed-video practice. Asynchronous interviews (Kira Talent, Toronto OSP,
   * Waterloo) give you a fixed prep window then record a fixed answer window,
   * with no second take — so the only useful way to train is against a clock
   * that behaves the same way.
   */
  const [phase, setPhase] = useState<"idle" | "prep" | "record">("idle");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const prepSec = track.questions[questionIndex]?.prepSeconds ?? 60;
  const recSec = track.questions[questionIndex]?.responseSeconds ?? 120;

  useEffect(() => {
    if (phase === "idle") return;
    // The tick owns the rollover. Handling expiry inline in the effect body
    // wrote state during render, which cascades a second render per second and
    // made this the only place the timer could desync from the clock.
    const id = window.setTimeout(() => {
      if (secondsLeft > 1) {
        setSecondsLeft(secondsLeft - 1);
      } else if (phase === "prep") {
        setPhase("record");
        setSecondsLeft(recSec);
      } else {
        setPhase("idle");
        setSecondsLeft(0);
      }
    }, 1000);
    return () => window.clearTimeout(id);
  }, [phase, secondsLeft, recSec]);

  const startTimer = () => {
    setQuestionIndex(0);
    setPhase("prep");
    setSecondsLeft(prepSec);
  };

  return (
    <div className="space-y-4">
      <JourneyCard
        title={t("icTitle")}
        subtitle={t("icSubtitle")}
        action={
          // The simulator is the one place that scores a spoken answer, so it
          // stays one click away from every track.
          <Button onClick={() => onNavigateTab("visa")}>
            <Mic className="h-3.5 w-3.5" /> {t("icLaunchSim")}
          </Button>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">{t("icStudioIntro")}</p>

          {/* Track picker */}
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label={t("icTracksLabel")}>
            {INTERVIEW_TRACKS.map((tr) => {
              const active = tr.id === track.id;
              return (
                <button
                  key={tr.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setTrackId(tr.id);
                    setPhase("idle");
                    setQuestionIndex(0);
                  }}
                  className={`shrink-0 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-colors ${
                    active
                      ? "border-indigo-400 bg-indigo-50 text-indigo-900 dark:border-indigo-500 dark:bg-indigo-950/50 dark:text-indigo-100"
                      : "border-slate-200 text-slate-600 hover:border-indigo-300 dark:border-slate-700 dark:text-slate-300"
                  }`}
                >
                  <span aria-hidden className="mr-1.5">{tr.emoji}</span>
                  {tx(tr.title)}
                </button>
              );
            })}
          </div>

          {/* Selected track header */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-900/40">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                <span aria-hidden className="mr-1.5">{track.emoji}</span>
                {tx(track.title)}
              </h3>
              <Pill>{t("icQuestionsCount", { count: track.questions.length })}</Pill>
              {track.timed && <Pill>{t("icTimedBadge")}</Pill>}
            </div>
            <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300">{tx(track.audience)}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{tx(track.format)}</p>
            {track.institutions.length > 0 && (
              <p className="mt-2 flex flex-wrap gap-1.5">
                {track.institutions.map((i) => (
                  <span
                    key={i}
                    className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
                  >
                    {i}
                  </span>
                ))}
              </p>
            )}
          </div>

          {/* Built-in countdown for the timed-video track */}
          {track.timed && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-800/60 dark:bg-indigo-950/30">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wide text-indigo-900 dark:text-indigo-200">
                    {t("icTimerTitle")}
                  </h4>
                  <p className="mt-0.5 text-[11px] text-indigo-800/80 dark:text-indigo-200/70">
                    {t("icTimerHint", { prep: prepSec, record: recSec })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-xl px-3 py-2 font-mono text-lg font-black tabular-nums ${
                      phase === "record"
                        ? "bg-rose-600 text-white"
                        : phase === "prep"
                          ? "bg-indigo-600 text-white"
                          : "bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-300"
                    }`}
                    aria-live="polite"
                  >
                    {phase === "idle"
                      ? `${prepSec}s / ${recSec}s`
                      : `${phase === "prep" ? t("icPrep") : t("icRecord")} ${secondsLeft}s`}
                  </span>
                  <Button onClick={startTimer} variant={phase === "idle" ? "primary" : "outline"}>
                    {phase === "idle" ? t("icStartTimer") : t("icRestartTimer")}
                  </Button>
                </div>
              </div>
              {phase !== "idle" && !reduceMotion && (
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/70 dark:bg-slate-800">
                  <motion.div
                    className={`h-full ${phase === "record" ? "bg-rose-500" : "bg-indigo-500"}`}
                    initial={false}
                    animate={{
                      width: `${Math.max(
                        0,
                        Math.min(
                          100,
                          (secondsLeft / (phase === "prep" ? prepSec : recSec)) * 100,
                        ),
                      )}%`,
                    }}
                    transition={{ duration: reduceMotion ? 0 : 0.9, ease: "linear" }}
                  />
                </div>
              )}
              {phase === "idle" && track.rubric && (
                <div className="mt-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-900 dark:text-indigo-200">
                    {t("icSelfCheck")}
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {track.rubric.map((r, i) => (
                      <li key={i} className="text-[11px] text-indigo-900/90 dark:text-indigo-200/80">
                        ☐ {tx(r)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Questions + model answers */}
          <ol className="space-y-3">
            {track.questions.map((q, qi) => (
              <li
                key={q.id}
                className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    <span className="mr-1.5 text-slate-400">{qi + 1}.</span>
                    {tx(q.question)}
                  </p>
                  {q.responseSeconds && (
                    <Pill>{t("icSecondsChip", { seconds: q.responseSeconds })}</Pill>
                  )}
                </div>
                <p className="mt-1.5 text-[11px] italic text-slate-500 dark:text-slate-400">
                  {t("icWhy")} {tx(q.why)}
                </p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-[11px] font-semibold text-indigo-700 hover:underline dark:text-indigo-300">
                    {t("icShowModel")}
                  </summary>
                  <ul className="mt-1.5 space-y-1">
                    {q.modelAnswer.map((a, ai) => (
                      <li key={ai} className="flex gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                        <span aria-hidden className="text-emerald-600 dark:text-emerald-400">✓</span>
                        <span>{tx(a)}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
          </ol>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sb-card-hover rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <p className="text-base" aria-hidden>🎓</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{t("icUniTitle")}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("icUniText")}</p>
              <Button className="mt-3" onClick={() => onNavigateTab("visa")}>
                {t("icUniBtn")}
              </Button>
            </div>
            <div className="sb-card-hover rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <p className="text-base" aria-hidden>🛂</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{t("icVisaTitle")}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("icVisaText")}</p>
              <Button className="mt-3" variant="outline" onClick={() => onNavigateTab("visa")}>
                {t("icVisaBtn")}
              </Button>
            </div>
          </div>
        </div>
      </JourneyCard>

      <VisaModelAnswers />
      <AppNote kind="estimate" />
    </div>
  );
}
