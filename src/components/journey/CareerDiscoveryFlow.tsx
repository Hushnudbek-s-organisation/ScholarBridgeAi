"use client";

/**
 * Career Discovery — the guided "I don't know yet" flow (product journey §4).
 *
 * ONE component, used in TWO places (never a parallel system):
 *   • onboarding step 3, mode="onboarding" — pick a direction before the
 *     study-interest picker;
 *   • Universities & Programs → Careers & majors, mode="panel" — re-run any
 *     time, and a chosen career hands over to the existing catalog explorer.
 *
 * The quiz is staged (one short question per screen, every question
 * skippable, back/edit at any time). Results come from the deterministic
 * server engine (`POST /api/career-discovery`) — the client never ranks
 * careers by itself, so the reasons shown can never drift from the scoring.
 *
 * Journey-panel rules (asserted by `npm run test:journey`): relative /api
 * fetches, no secrets, no premium branching, no synchronous setState at the
 * top of an effect.
 */
import React, { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Compass,
  Edit3,
  Lightbulb,
  RotateCcw,
  SkipForward,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import {
  DISCOVERY_QUESTIONS,
  type CareerRecommendation,
  type DiscoveryAnswers,
  type DiscoveryResult,
  type TrialFeedback,
} from "@/lib/careerDiscovery";
import { CAREER_PATHS, careerI18nSuffix, getCareerPath } from "@/lib/journey/careers";
import { getJson, sendJson, useResource } from "./useResource";
import { Button, Empty, JourneyCard, Loading, Pill, ProgressBar } from "./ui";

type View = "intro" | "questions" | "results";

interface DiscoveryState {
  answers: DiscoveryAnswers;
  trialFeedback: TrialFeedback;
  selectedCareerId: string | null;
  result: DiscoveryResult | null;
}

const EMPTY_STATE: DiscoveryState = {
  answers: {},
  trialFeedback: {},
  selectedCareerId: null,
  result: null,
};

export interface CareerDiscoveryFlowProps {
  profileId: number | null;
  mode: "onboarding" | "panel";
  /** A career was chosen — panel: jump to the catalog; onboarding: fill interests. */
  onSelected?: (careerId: string) => void;
  /** "Still not sure" — onboarding only: fall back to the exploring selection. */
  onUseExploring?: () => void;
  /** Compact chrome for the onboarding card. */
  compact?: boolean;
}

export function CareerDiscoveryFlow({
  profileId,
  mode,
  onSelected,
  onUseExploring,
  compact = false,
}: CareerDiscoveryFlowProps) {
  const t = useTranslations("careerDiscovery");

  const [view, setView] = useState<View>("intro");
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<DiscoveryAnswers>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Saved run (panel mode resumes it; onboarding starts clean but still saves).
  const saved = useResource<DiscoveryState>(
    async () => {
      if (!profileId) return EMPTY_STATE;
      const json = await getJson<{
        discovery: {
          answers: DiscoveryAnswers;
          trialFeedback: TrialFeedback;
          recommendations: CareerRecommendation[];
          selectedCareerId: string | null;
        } | null;
      }>(`/api/career-discovery?profileId=${profileId}`, t("loadError"));
      if (!json.discovery) return EMPTY_STATE;
      return {
        answers: json.discovery.answers ?? {},
        trialFeedback: json.discovery.trialFeedback ?? {},
        selectedCareerId: json.discovery.selectedCareerId ?? null,
        result:
          Array.isArray(json.discovery.recommendations) && json.discovery.recommendations.length > 0
            ? {
                insufficientData: false,
                recommendations: json.discovery.recommendations,
                answeredQuestions: Object.keys(json.discovery.answers ?? {}),
                skippedQuestions: [],
                disclaimer: "not-a-diagnosis",
              }
            : null,
      };
    },
    [profileId],
    { initial: EMPTY_STATE, errorFallback: "…" }
  );

  const question = DISCOVERY_QUESTIONS[step];
  const total = DISCOVERY_QUESTIONS.length;
  const answeredCount = useMemo(
    () => DISCOVERY_QUESTIONS.filter((q) => (draft[q.id] ?? []).length > 0).length,
    [draft]
  );

  const toggleOption = useCallback((questionId: string, optionId: string, kind: "multi" | "single") => {
    setDraft((prev) => {
      const current = prev[questionId] ?? [];
      if (kind === "single") {
        return { ...prev, [questionId]: current.includes(optionId) ? [] : [optionId] };
      }
      return {
        ...prev,
        [questionId]: current.includes(optionId)
          ? current.filter((x) => x !== optionId)
          : [...current, optionId],
      };
    });
  }, []);

  /** Save the draft and compute the result through the server engine. */
  const submit = useCallback(
    async (answers: DiscoveryAnswers, feedback: TrialFeedback) => {
      if (!profileId) return null;
      setSaving(true);
      setError(null);
      try {
        const result = await sendJson<DiscoveryResult & { selectedCareerId: string | null }>(
          "/api/career-discovery",
          {
            method: "POST",
            body: JSON.stringify({ profileId, answers, trialFeedback: feedback }),
          },
          t("saveError")
        );
        return result;
      } catch (e) {
        setError(e instanceof Error ? e.message : t("saveError"));
        return null;
      } finally {
        setSaving(false);
      }
    },
    [profileId, t]
  );

  const finishQuestions = useCallback(async () => {
    const result = await submit(draft, saved.data.trialFeedback);
    if (result) {
      saved.setData((prev) => ({
        ...prev,
        answers: draft,
        result,
      }));
      setView("results");
    }
  }, [draft, saved, submit]);

  const recordTrial = useCallback(
    async (careerId: string, value: "liked" | "disliked" | "explore_more") => {
      const feedback: TrialFeedback = { ...saved.data.trialFeedback, [careerId]: value };
      const result = await submit(saved.data.answers, feedback);
      if (result) {
        saved.setData((prev) => ({ ...prev, trialFeedback: feedback, result }));
      }
    },
    [saved, submit]
  );

  const chooseCareer = useCallback(
    async (careerId: string) => {
      if (profileId) {
        setSaving(true);
        try {
          await sendJson(
            "/api/career-discovery",
            {
              method: "POST",
              body: JSON.stringify({ profileId, selectedCareerId: careerId }),
            },
            t("saveError")
          );
        } catch {
          /* the choice is still applied locally — never block the user */
        } finally {
          setSaving(false);
        }
      }
      saved.setData((prev) => ({ ...prev, selectedCareerId: careerId }));
      onSelected?.(careerId);
    },
    [onSelected, profileId, saved, t]
  );

  const restart = useCallback(async () => {
    setDraft({});
    setStep(0);
    setView("intro");
    setError(null);
    if (profileId) {
      try {
        await sendJson(
          "/api/career-discovery",
          { method: "DELETE" },
          t("saveError")
        );
      } catch {
        /* ignore — restarting locally is enough */
      }
    }
    saved.setData(EMPTY_STATE);
  }, [profileId, saved, t]);

  // ------------------------------------------------------------------ intro
  if (view === "intro") {
    return (
      <JourneyCard
        title={t("introTitle")}
        subtitle={t("introSubtitle")}
        tone="hero"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-800 mb-1">{t("notDiagnosticTitle")}</p>
            <p>{t("notDiagnosticBody")}</p>
          </div>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> {t("introPointQuestions")}
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> {t("introPointSkip")}
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> {t("introPointResults")}
            </li>
          </ul>
          {saved.data.result && (
            <p className="text-xs text-slate-500">{t("savedRunHint")}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setView("questions")}>
              <Compass className="h-4 w-4" /> {t("start")}
            </Button>
            {saved.data.result && (
              <Button
                variant="outline"
                onClick={() => {
                  setDraft(saved.data.answers);
                  setView("results");
                }}
              >
                {t("viewSaved")}
              </Button>
            )}
            {mode === "onboarding" && onUseExploring && (
              <Button variant="ghost" onClick={onUseExploring}>
                {t("useExploring")}
              </Button>
            )}
          </div>
        </div>
      </JourneyCard>
    );
  }

  // -------------------------------------------------------------- questions
  if (view === "questions") {
    const selected = draft[question.id] ?? [];
    return (
      <JourneyCard title={t("quizTitle")} subtitle={t("quizSubtitle")}>
        <div className="space-y-4">
          <ProgressBar pct={Math.round((step / total) * 100)} label={t("progress", { done: step + 1, total })} />
          <div>
            <h3 className="text-base font-bold text-slate-900">{t(`q.${question.id}`)}</h3>
            <p className="text-xs text-slate-500 mt-1">{t(`qHelp.${question.id}`)}</p>
          </div>
          <div
            className={`grid gap-2 ${compact ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}
            role="group"
            aria-label={t(`q.${question.id}`)}
          >
            {question.options.map((opt) => {
              const active = selected.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleOption(question.id, opt.id, question.kind)}
                  className={`rounded-xl border-2 px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                    active
                      ? "border-indigo-600 bg-indigo-50 text-indigo-800"
                      : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300"
                  }`}
                >
                  {t(`opt.${question.id}.${opt.id}`)}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-500">
            {question.kind === "multi" ? t("multiHint") : t("singleHint")} · {t("answered", { count: answeredCount })}
          </p>
          {error && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setError(null);
                if (step === 0) setView("intro");
                else setStep((s) => s - 1);
              }}
            >
              <ArrowLeft className="h-4 w-4" /> {t("back")}
            </Button>
            {step < total - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={saving}>
                {t("next")} <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={finishQuestions} disabled={saving}>
                {saving ? t("computing") : t("seeResults")} <ArrowRight className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => {
                // Skip = leave this question unanswered. Never filled in for them.
                setDraft((prev) => {
                  const next = { ...prev };
                  delete next[question.id];
                  return next;
                });
                if (step < total - 1) setStep((s) => s + 1);
                else void finishQuestions();
              }}
            >
              <SkipForward className="h-4 w-4" /> {t("skip")}
            </Button>
          </div>
        </div>
      </JourneyCard>
    );
  }

  // ---------------------------------------------------------------- results
  return (
    <DiscoveryResults
      state={saved.data}
      loading={saving}
      error={error}
      onEditAnswers={() => {
        setDraft(saved.data.answers);
        setStep(0);
        setView("questions");
      }}
      onRestart={restart}
      onTrial={recordTrial}
      onChoose={chooseCareer}
      onUseExploring={mode === "onboarding" ? onUseExploring : undefined}
      compact={compact}
    />
  );
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

function DiscoveryResults({
  state,
  loading,
  error,
  onEditAnswers,
  onRestart,
  onTrial,
  onChoose,
  onUseExploring,
  compact,
}: {
  state: DiscoveryState;
  loading: boolean;
  error: string | null;
  onEditAnswers: () => void;
  onRestart: () => void;
  onTrial: (careerId: string, value: "liked" | "disliked" | "explore_more") => void;
  onChoose: (careerId: string) => void;
  onUseExploring?: () => void;
  compact: boolean;
}) {
  const t = useTranslations("careerDiscovery");
  const tJourney = useTranslations("journey");
  const tCareers = useTranslations("careers");
  const result = state.result;

  if (!result) {
    return (
      <JourneyCard title={t("resultsTitle")}>
        <Empty title={t("insufficientTitle")} hint={t("insufficientHint")} />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={onEditAnswers}>
            <Edit3 className="h-4 w-4" /> {t("answerMore")}
          </Button>
          {onUseExploring && (
            <Button variant="ghost" onClick={onUseExploring}>
              {t("useExploring")}
            </Button>
          )}
        </div>
      </JourneyCard>
    );
  }

  if (result.insufficientData) {
    return (
      <JourneyCard title={t("resultsTitle")}>
        <Empty title={t("insufficientTitle")} hint={t("insufficientHint")} />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={onEditAnswers}>
            <Edit3 className="h-4 w-4" /> {t("answerMore")}
          </Button>
          {onUseExploring && (
            <Button variant="ghost" onClick={onUseExploring}>
              {t("useExploring")}
            </Button>
          )}
        </div>
      </JourneyCard>
    );
  }

  return (
    <div className="space-y-4">
      <JourneyCard title={t("resultsTitle")} subtitle={t("resultsSubtitle")}>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          {t("disclaimer")}
        </div>
        {error && (
          <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
            {error}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" onClick={onEditAnswers}>
            <Edit3 className="h-4 w-4" /> {t("editAnswers")}
          </Button>
          <Button variant="ghost" onClick={onRestart}>
            <RotateCcw className="h-4 w-4" /> {t("restart")}
          </Button>
        </div>
      </JourneyCard>

      {result.recommendations.map((rec, index) => {
        const career = getCareerPath(rec.careerId);
        if (!career) return null;
        const suffix = careerI18nSuffix(career.id);
        return (
          <JourneyCard key={rec.careerId} title={`${index + 1}. ${tJourney(`careerTitle${suffix}`)}`}>
            <div className="space-y-3">
              <p className="text-sm text-slate-600">{tJourney(`careerBlurb${suffix}`)}</p>
              <div className="flex flex-wrap gap-2">
                <Pill tone={rec.matchStrength === "strong" ? "good" : rec.matchStrength === "moderate" ? "info" : "slate"}>
                  {t(`match.${rec.matchStrength}`)}
                </Pill>
                {rec.trialAdjustment !== 0 && (
                  <Pill tone="slate">{t("trialInfluence", { n: rec.trialAdjustment > 0 ? `+${rec.trialAdjustment}` : String(rec.trialAdjustment) })}</Pill>
                )}
              </div>

              {rec.reasons.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("whyLabel")}</p>
                  <ul className="mt-1 space-y-1 text-sm text-slate-700">
                    {rec.reasons.slice(0, 5).map((r, i) => (
                      <li key={`${r.questionId}/${r.optionId}/${i}`} className="flex items-start gap-2">
                        <Lightbulb className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                        <span>
                          {t("whyBecause", {
                            answer: t(`opt.${r.questionId}.${r.optionId}`),
                          })}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* What the work actually looks like — real daily tasks, not slogans. */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("dailyLabel")}</p>
                <ul className="mt-1 space-y-1 text-sm text-slate-700 list-disc list-inside">
                  <li>{tCareers(`${career.id}.task1`)}</li>
                  <li>{tCareers(`${career.id}.task2`)}</li>
                  <li>{tCareers(`${career.id}.task3`)}</li>
                </ul>
              </div>

              {(rec.matchedInterests.length > 0 || rec.matchedSkills.length > 0) && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("fitLabel")}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {[...rec.matchedInterests, ...rec.matchedSkills].slice(0, 8).map((tag) => (
                      <Pill key={tag} tone="brand">{t(`tags.${tag.replace(":", "_")}`)}</Pill>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("majorsLabel")}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {rec.relatedMajors.map((m) => (
                    <Pill key={m} tone="slate">{m}</Pill>
                  ))}
                </div>
              </div>

              {rec.unknowns.length > 0 && (
                <p className="text-xs text-slate-500">
                  <span className="font-semibold">{t("unknownsLabel")} </span>
                  {rec.unknowns.map((q) => t(`q.${q}`)).join(" · ")}
                </p>
              )}

              {rec.alternatives.length > 0 && (
                <p className="text-xs text-slate-500">
                  <span className="font-semibold">{t("alternativesLabel")} </span>
                  {rec.alternatives
                    .map((id) => {
                      const c = getCareerPath(id);
                      return c ? tJourney(`careerTitle${careerI18nSuffix(id)}`) : id;
                    })
                    .join(" · ")}
                </p>
              )}

              {/* ---- mini practice trial ---- */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">{t("trialLabel")}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{tCareers(`${career.id}.trialTitle`)}</p>
                <p className="text-xs text-slate-500">
                  {t("trialTime", { minutes: career.trialMinutes ?? 45 })} · {tCareers(`${career.id}.trialPrereq`)}
                </p>
                <p className="mt-2 text-sm text-slate-700">{tCareers(`${career.id}.trialGoal`)}</p>
                <ol className="mt-2 space-y-1 text-xs text-slate-600 list-decimal list-inside">
                  <li>{tCareers(`${career.id}.trialStep1`)}</li>
                  <li>{tCareers(`${career.id}.trialStep2`)}</li>
                  <li>{tCareers(`${career.id}.trialStep3`)}</li>
                </ol>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    variant={state.trialFeedback[career.id] === "liked" ? "primary" : "outline"}
                    onClick={() => onTrial(career.id, "liked")}
                    disabled={loading}
                  >
                    <ThumbsUp className="h-3.5 w-3.5" /> {t("trialLiked")}
                  </Button>
                  <Button
                    variant={state.trialFeedback[career.id] === "disliked" ? "primary" : "outline"}
                    onClick={() => onTrial(career.id, "disliked")}
                    disabled={loading}
                  >
                    <ThumbsDown className="h-3.5 w-3.5" /> {t("trialDisliked")}
                  </Button>
                  <Button
                    variant={state.trialFeedback[career.id] === "explore_more" ? "primary" : "outline"}
                    onClick={() => onTrial(career.id, "explore_more")}
                    disabled={loading}
                  >
                    {t("trialExploreMore")}
                  </Button>
                  <span className="text-[11px] text-slate-500">{t("trialSkipNote")}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => onChoose(career.id)} disabled={loading}>
                  <Check className="h-4 w-4" /> {t("chooseThis")}
                </Button>
              </div>
            </div>
          </JourneyCard>
        );
      })}

      {onUseExploring && (
        <JourneyCard title={t("stillUnsureTitle")}>
          <p className="text-sm text-slate-600">{t("stillUnsureBody")}</p>
          <div className="mt-3">
            <Button variant="outline" onClick={onUseExploring}>
              {t("useExploring")}
            </Button>
          </div>
        </JourneyCard>
      )}
    </div>
  );
}
