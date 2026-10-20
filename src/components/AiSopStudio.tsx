"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { StudentProfile } from "./Navbar";
import { 
  FileText, 
  Sparkles, 
  Copy, 
  Check, 
  Bot, 
  Send, 
  Save,
  Loader2,
  Award, 
  HelpCircle,
  Zap,
  BookOpen
} from "lucide-react";
import { toPlainText } from "@/lib/ai/format-reply";
import { AiFormattedText } from "./AiFormattedText";
import { AppNote } from "@/components/AppNote";
import { SopStructureBar } from "./SopStructureBar";
import { SampleExemplarBar } from "@/components/samples/SampleExemplarBar";
import type { SopSample } from "@/lib/samples/exemplars";
import { isUnmodifiedSample } from "@/lib/samples/text";

interface AiSopStudioProps {
  activeProfile: StudentProfile | null;
  applicationId?: number | null;
  universityId?: number | null;
  universityName?: string | null;
  programName?: string | null;
}

export function AiSopStudio({ activeProfile, applicationId, universityId, universityName, programName }: AiSopStudioProps) {
  const t = useTranslations("ai");
  const ts = useTranslations("samples");
  const [activeTab, setActiveTab] = useState<"drafter" | "reviewer">("drafter");

  // Drafter State. The selected application supplies context, not an inferred
  // programme fact; the student can still edit both fields before generating.
  const [targetUni, setTargetUni] = useState(universityName || "");
  const [targetProgram, setTargetProgram] = useState(programName || activeProfile?.targetMajor || "");
  const [personalHook, setPersonalHook] = useState("");
  const [careerGoals, setCareerGoals] = useState("");
  const [programEvidence, setProgramEvidence] = useState("");
  const [experienceExample, setExperienceExample] = useState("");
  const [generatedSop, setGeneratedSop] = useState<string | null>(null);
  const [savingVersion, setSavingVersion] = useState(false);
  const [versionSaved, setVersionSaved] = useState(false);
  const [versionSaveError, setVersionSaveError] = useState("");
  const [draftUsedAi, setDraftUsedAi] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftError, setDraftError] = useState("");

  // Reviewer State
  const [existingDraft, setExistingDraft] = useState("");
  const [reviewUni, setReviewUni] = useState(universityName || "");
  const [sopReview, setSopReview] = useState<string | null>(null);
  const [reviewUsedAi, setReviewUsedAi] = useState(false);
  const [behaviorSignals, setBehaviorSignals] = useState<{ available: boolean; signals: Record<string, number | null> } | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewError, setReviewError] = useState("");

  // Copy state
  const [copied, setCopied] = useState(false);

  // Gold-standard sample loaded on an explicit click (never saved on its own).
  const [loadedSop, setLoadedSop] = useState<SopSample | null>(null);
  const [sampleNotice, setSampleNotice] = useState<"drafter" | "reviewer" | null>(null);

  const loadSopSample = (sample: SopSample) => {
    if (activeTab === "drafter") {
      setTargetUni(sample.fields.targetUni);
      setTargetProgram(sample.fields.targetProgram);
      setPersonalHook(sample.fields.personalHook);
      setExperienceExample(sample.fields.experienceExample);
      setProgramEvidence(sample.fields.programEvidence);
      setCareerGoals(sample.fields.careerGoals);
      setGeneratedSop(null);
      setVersionSaved(false);
      setDraftError("");
    } else {
      setExistingDraft(sample.text);
      setReviewUni(sample.fields.targetUni);
      setSopReview(null);
      setReviewError("");
    }
    setLoadedSop(sample);
    setSampleNotice(activeTab);
  };

  // A draft generated from untouched sample inputs is the sample's story, not
  // the student's — it can be read and copied, but not saved as their version.
  const drafterHoldsSample =
    loadedSop != null &&
    isUnmodifiedSample(targetUni, loadedSop.fields.targetUni) &&
    isUnmodifiedSample(targetProgram, loadedSop.fields.targetProgram) &&
    isUnmodifiedSample(personalHook, loadedSop.fields.personalHook) &&
    isUnmodifiedSample(experienceExample, loadedSop.fields.experienceExample) &&
    isUnmodifiedSample(programEvidence, loadedSop.fields.programEvidence) &&
    isUnmodifiedSample(careerGoals, loadedSop.fields.careerGoals);

  const handleGenerateSop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile) return;
    setIsDrafting(true);
    setDraftError("");
    setVersionSaveError("");
    setVersionSaved(false);
    setGeneratedSop(null);

    try {
      const res = await fetch("/api/ai/draft-sop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: activeProfile.id,
          universityName: targetUni,
          programName: targetProgram,
          personalHook,
          careerGoals,
          programEvidence,
          experienceExample,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("sopRequestError"));
      if (data.sopDraft) {
        setGeneratedSop(data.sopDraft);
        setDraftUsedAi(data.aiUsed === true);
      }
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : t("sopRequestError"));
    } finally {
      setIsDrafting(false);
    }
  };

  const saveGeneratedDraft = async () => {
    if (!activeProfile || !generatedSop || drafterHoldsSample) return;
    setSavingVersion(true);
    setVersionSaveError("");
    try {
      const res = await fetch("/api/essays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: activeProfile.id,
          applicationId: applicationId ?? undefined,
          universityId: universityId ?? undefined,
          essayType: "sop",
          title: universityName ? `SOP — ${universityName}` : "Statement of Purpose",
          targetName: targetUni || targetProgram || undefined,
          content: toPlainText(generatedSop),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("sopSaveVersionError"));
      setVersionSaved(true);
    } catch (err) {
      setVersionSaveError(err instanceof Error ? err.message : t("sopSaveVersionError"));
    } finally {
      setSavingVersion(false);
    }
  };

  const handleReviewSop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!existingDraft) return;
    setIsReviewing(true);
    setReviewError("");
    setSopReview(null);
    setBehaviorSignals(null);

    try {
      const res = await fetch("/api/ai/review-sop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sopText: existingDraft,
          targetUniversity: reviewUni,
          targetMajor: activeProfile?.targetMajor,
          language: activeProfile?.preferredLocale || "en",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("sopRequestError"));
      if (data.review) {
        setSopReview(typeof data.review === "string" ? data.review : "");
        setReviewUsedAi(data.aiUsed === true);
        const rawSignals = data.behaviorSignals && typeof data.behaviorSignals === "object" && !Array.isArray(data.behaviorSignals)
          ? data.behaviorSignals as Record<string, unknown>
          : null;
        const values = rawSignals?.signals && typeof rawSignals.signals === "object" && !Array.isArray(rawSignals.signals)
          ? rawSignals.signals as Record<string, unknown>
          : {};
        const signals = Object.fromEntries(Object.entries(values).flatMap(([key, item]) => {
          if (!item || typeof item !== "object" || Array.isArray(item)) return [];
          const probability = (item as Record<string, unknown>).probabilityPercent;
          return [[key, typeof probability === "number" && Number.isFinite(probability) ? Math.max(0, Math.min(100, Math.round(probability))) : null]];
        }));
        if (rawSignals) setBehaviorSignals({ available: rawSignals.available === true, signals });
      }
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : t("sopRequestError"));
    } finally {
      setIsReviewing(false);
    }
  };

  const profileContext = [
    activeProfile?.gpa != null
      ? `GPA ${activeProfile.gpa}${activeProfile.gpaScale != null ? `/${activeProfile.gpaScale}` : ""}`
      : null,
    activeProfile?.ieltsScore != null ? `IELTS ${activeProfile.ieltsScore}` : null,
    activeProfile?.toeflScore != null ? `TOEFL ${activeProfile.toeflScore}` : null,
    activeProfile?.duolingoScore != null ? `Duolingo ${activeProfile.duolingoScore}` : null,
    activeProfile?.satScore != null ? `SAT ${activeProfile.satScore}` : null,
    activeProfile?.actScore != null ? `ACT ${activeProfile.actScore}` : null,
    activeProfile?.greScore != null ? `GRE ${activeProfile.greScore}` : null,
    Number(activeProfile?.researchPublications) > 0
      ? `Publications recorded: ${activeProfile?.researchPublications}`
      : null,
    Number(activeProfile?.workExperienceYears) > 0
      ? `Work experience recorded: ${activeProfile?.workExperienceYears} years`
      : null,
  ].filter((fact): fact is string => Boolean(fact));

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Studio Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200 mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            AI SOP & Application Essay Suite
          </div>
          {/* h2 — the Materials hub owns the single <h1> for this screen. */}
          <h2 className="text-xl font-bold text-slate-900">Statement of Purpose & Essay Studio</h2>
          <p className="text-xs text-slate-500 mt-1">{t("sopStudioSubtitle")}</p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab("drafter")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "drafter" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            ✍️ AI SOP Drafter
          </button>
          <button
            onClick={() => setActiveTab("reviewer")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "reviewer" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            🔍 AI Essay Reviewer
          </button>
        </div>
      </div>

      {/* Gold-standard samples — fill the active tab on an explicit click. */}
      <div className="space-y-2">
        <SampleExemplarBar group="sop" onLoad={loadSopSample} />
        {sampleNotice && (
          <p role="status" className="rounded-xl border border-indigo-100 bg-white px-3 py-2 text-xs leading-relaxed text-slate-700 dark:border-indigo-500/20">
            {sampleNotice === "drafter" ? ts("sopLoadedDrafter") : ts("sopLoadedReviewer")}
          </p>
        )}
      </div>

      {/* DRAFTER MODE */}
      {activeTab === "drafter" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
              <BookOpen className="h-4 w-4 text-indigo-600" />
              Application SOP Inputs
            </h3>

            <form onSubmit={handleGenerateSop} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target University Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Technical University of Munich"
                  value={targetUni}
                  onChange={(e) => setTargetUni(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Degree Program</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. M.Sc. Data Engineering and Analytics"
                  value={targetProgram}
                  onChange={(e) => setTargetProgram(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Personal Inspiration / Academic Hook</label>
                <textarea
                  rows={3}
                  placeholder={t("sopPersonalHookPlaceholder")}
                  value={personalHook}
                  onChange={(e) => setPersonalHook(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Post-Graduation Career Ambitions</label>
                <textarea
                  rows={2}
                  placeholder={t("sopCareerGoalPlaceholder")}
                  value={careerGoals}
                  onChange={(e) => setCareerGoals(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t("sopExampleLabel")}</label>
                <textarea
                  rows={3}
                  placeholder={t("sopExamplePlaceholder")}
                  value={experienceExample}
                  onChange={(e) => setExperienceExample(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{t("sopExampleHelp")}</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t("sopProgramEvidenceLabel")}</label>
                <textarea
                  rows={3}
                  placeholder={t("sopProgramEvidencePlaceholder")}
                  value={programEvidence}
                  onChange={(e) => setProgramEvidence(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{t("sopProgramEvidenceHelp")}</p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <span className="font-bold text-slate-800">{t("sopProfileContextTitle")}</span>
                <p>{profileContext.length ? profileContext.join(" · ") : t("sopNoProfileFacts")}</p>
                <p className="text-slate-500">{t("sopProfileContextHelp")}</p>
              </div>

              <button
                type="submit"
                disabled={isDrafting}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
              >
                <Bot className="h-4 w-4" />
                {isDrafting ? t("sopDrafting") : t("sopGenerateWorkingDraft")}
              </button>
            </form>
          </div>

          {/* Right Draft Output */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between min-h-[500px]">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-600" />
                  {t("sopWorkingDraftTitle")}
                </h3>

                {generatedSop && (
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(toPlainText(generatedSop))}
                      className="flex min-h-9 items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? t("sopCopied") : t("sopCopyText")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveGeneratedDraft()}
                      disabled={savingVersion || versionSaved || !activeProfile || drafterHoldsSample}
                      title={drafterHoldsSample ? ts("unmodified") : undefined}
                      className="flex min-h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1 text-xs font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
                    >
                      {savingVersion ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      {versionSaved ? t("sopVersionSaved") : savingVersion ? t("sopSavingVersion") : t("sopSaveToVersions")}
                    </button>
                  </div>
                )}
              </div>

              {draftError && <p role="alert" className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{draftError}</p>}
              {versionSaveError && <p role="alert" className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{versionSaveError}</p>}
              {versionSaved && <p role="status" className="mb-3 text-xs font-semibold text-emerald-700">{t("sopVersionSaved")}</p>}
              {generatedSop && drafterHoldsSample && (
                <p className="mb-3 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs leading-relaxed text-violet-900 dark:border-violet-500/30 dark:text-violet-100">
                  {ts("unmodified")}
                </p>
              )}
              {generatedSop ? (
                <>
                  <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
                    {draftUsedAi ? t("sopDraftAiNotice") : t("sopDraftOutlineNotice")}
                  </p>
                  {/* Priority 4.4 — does the draft actually contain the five
                      blocks an admissions reader looks for? Deterministic, and
                      it quotes the sentence that proved each block. */}
                  <SopStructureBar
                    text={toPlainText(generatedSop)}
                    universityName={targetUni}
                    programName={targetProgram}
                    className="mb-3"
                  />
                  <div className="max-h-[600px] overflow-y-auto pr-2">
                    <AiFormattedText text={generatedSop} className="text-xs sm:text-sm text-slate-700" />
                  </div>
                </>
              ) : (
                <div className="h-80 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 space-y-3">
                  <Sparkles className="h-10 w-10 text-indigo-300" />
                  <p className="text-xs font-semibold text-slate-600">
                    {`Fill out the target university details on the left and click "Generate SOP Draft" to build a customized statement.`}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REVIEWER MODE */}
      {activeTab === "reviewer" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Text Area */}
          <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">
              Paste Existing Draft SOP / Personal Statement
            </h3>

            <form onSubmit={handleReviewSop} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target University (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Stanford University or Oxford"
                  value={reviewUni}
                  onChange={(e) => setReviewUni(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Paste Your Full SOP Text</label>
                <textarea
                  rows={12}
                  required
                  placeholder="Paste your paragraph text here..."
                  value={existingDraft}
                  onChange={(e) => setExistingDraft(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none leading-relaxed"
                />
                <p className="text-[11px] text-slate-400 mt-1">Word Count: {existingDraft.trim().split(/\s+/).filter(Boolean).length} words</p>
                {/* Priority 4.4 — structure feedback while the draft is still on
                    the left, before the reader spends a review on it. */}
                <SopStructureBar
                  text={existingDraft}
                  universityName={reviewUni}
                  programName={activeProfile?.targetMajor ?? null}
                  className="mt-2"
                />
              </div>

              <button
                type="submit"
                disabled={isReviewing || !existingDraft}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
              >
                <Bot className="h-4 w-4" />
                {isReviewing ? t("sopReviewing") : t("sopReviewButton")}
              </button>
            </form>
          </div>

          {/* Right Review Feedback Output */}
          <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs min-h-[500px]">
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 mb-4">
              {t("sopReviewTitle")}
            </h3>

            {reviewError && <p role="alert" className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{reviewError}</p>}
            {sopReview ? (
              <>
                <p className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs leading-relaxed text-blue-900">
                  {reviewUsedAi ? t("sopReviewAiNotice") : t("sopReviewFallbackNotice")}
                </p>
                {behaviorSignals && (
                  <section className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3" aria-label={t("essayBehaviorSignalsTitle")}>
                    <h4 className="text-xs font-bold text-indigo-900">{t("essayBehaviorSignalsTitle")}</h4>
                    {!behaviorSignals.available ? <p className="mt-1 text-[11px] text-slate-500">{t("essayBehaviorUnavailable")}</p> : (
                      <dl className="mt-2 space-y-2">
                        {Object.entries(behaviorSignals.signals).map(([key, percent]) => (
                          <div key={key} className="rounded-lg bg-white px-2.5 py-2">
                            <div className="flex justify-between gap-2 text-[11px]">
                              <dt className="font-semibold text-slate-700">{t(`essayBehavior_${key}`)}</dt>
                              <dd className="font-bold text-indigo-800">{percent === null ? t("essayBehaviorNotScored") : `${percent}%`}</dd>
                            </div>
                            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{t(`essayBehaviorTip_${key}`)}</p>
                          </div>
                        ))}
                      </dl>
                    )}
                  </section>
                )}
                <div className="max-h-[600px] overflow-y-auto pr-2">
                  <AiFormattedText text={sopReview} className="text-xs sm:text-sm text-slate-700" />
                </div>
              </>
            ) : (
              <div className="h-80 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 space-y-3">
                <Bot className="h-10 w-10 text-purple-300" />
                <p className="text-xs font-semibold text-slate-600">
                  {`Paste your essay draft on the left and click "Evaluate" to receive detailed scoring and line-by-line sentence improvements.`}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Standing small print: this panel can be wrong — say so where it is read. */}
      <AppNote kind="ai" className="mt-2" />
    </div>
  );
}
