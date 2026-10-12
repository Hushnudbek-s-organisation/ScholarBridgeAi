/**
 * Career Discovery — "I don't know yet" guided flow (product journey §4).
 *
 * PURE, DETERMINISTIC ENGINE — no DB, no network, no AI. The quiz turns a set
 * of short interest answers into 3–5 EXPLORABLE career hypotheses, never a
 * single "correct" career and never an IQ / psychological diagnosis.
 *
 * Honesty rules enforced here (asserted by `npm run test:career-discovery`):
 *   • A skipped question contributes NOTHING — unknown is never a negative.
 *   • Missing answers never lower a score; they are reported as `unknowns`,
 *     i.e. "this is what we still don't know about you".
 *   • Every recommendation lists the exact answers that produced it
 *     (`reasons`) — the UI must not invent better reasons than the engine.
 *   • Trial feedback (liked / disliked / explore more) adjusts future runs
 *     modestly; skipping a trial has NO effect on anything.
 *   • No admission probability, no guaranteed outcome, no ranking claim —
 *     results are labelled hypotheses to explore.
 *
 * The career catalogue itself lives in `src/lib/journey/careers.ts` (extended,
 * never duplicated); human text lives in the `careerDiscovery` / `careers` /
 * `journey` i18n namespaces so en/uz/ru all render the same flow.
 */

import { CAREER_PATHS, type CareerPath } from "@/lib/journey/careers";
import {
  selectionsFromLegacyTargetMajor,
  type StudyInterestSelection,
} from "@/lib/studyInterests";

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

export type DiscoveryQuestionKind = "multi" | "single";

export interface DiscoveryOption {
  id: string;
  /** Affinity tags this option contributes (matched against career affinity). */
  tags: string[];
}

export interface DiscoveryQuestion {
  id: string;
  kind: DiscoveryQuestionKind;
  /** Every question is skippable — "I don't know" is a first-class answer. */
  skippable: true;
  options: DiscoveryOption[];
}

/**
 * The question set (product journey §4.2): subjects liked / disliked,
 * activities, strengths, skills to learn, people-vs-tech, data-vs-creative,
 * nature, research-vs-practice, work environment and values.
 */
export const DISCOVERY_QUESTIONS: DiscoveryQuestion[] = [
  {
    id: "likedSubjects",
    kind: "multi",
    skippable: true,
    options: [
      { id: "math", tags: ["s:math"] },
      { id: "physics", tags: ["s:physics"] },
      { id: "chemistry", tags: ["s:chemistry"] },
      { id: "biology", tags: ["s:biology"] },
      { id: "geography", tags: ["s:geography", "n:nature"] },
      { id: "history", tags: ["s:history"] },
      { id: "literature", tags: ["s:writing"] },
      { id: "languages", tags: ["s:languages", "p:people"] },
      { id: "economics", tags: ["s:economics"] },
      { id: "art", tags: ["s:art"] },
      { id: "computing", tags: ["s:computing"] },
      { id: "psychology", tags: ["s:psychology", "p:people"] },
    ],
  },
  {
    id: "dislikedSubjects",
    kind: "multi",
    skippable: true,
    options: [
      { id: "math", tags: ["-s:math"] },
      { id: "physics", tags: ["-s:physics"] },
      { id: "chemistry", tags: ["-s:chemistry"] },
      { id: "biology", tags: ["-s:biology"] },
      { id: "history", tags: ["-s:history"] },
      { id: "literature", tags: ["-s:writing"] },
      { id: "languages", tags: ["-s:languages"] },
      { id: "economics", tags: ["-s:economics"] },
      { id: "art", tags: ["-s:art"] },
      { id: "computing", tags: ["-s:computing"] },
    ],
  },
  {
    id: "enjoyedActivities",
    kind: "multi",
    skippable: true,
    options: [
      { id: "building", tags: ["a:build"] },
      { id: "helping", tags: ["a:help", "p:people"] },
      { id: "organizing", tags: ["a:organize"] },
      { id: "creating", tags: ["a:create"] },
      { id: "analyzing", tags: ["a:analyze", "c:data"] },
      { id: "writing", tags: ["a:write"] },
      { id: "persuading", tags: ["a:persuade"] },
      { id: "teaching", tags: ["a:teach", "p:people"] },
      { id: "outdoors", tags: ["a:outdoors", "n:nature"] },
      { id: "experiments", tags: ["a:experiment", "r:research"] },
    ],
  },
  {
    id: "goodAtTasks",
    kind: "multi",
    skippable: true,
    options: [
      { id: "problemSolving", tags: ["g:problems"] },
      { id: "explaining", tags: ["g:explain", "p:people"] },
      { id: "handsOn", tags: ["g:hands"] },
      { id: "planning", tags: ["g:plan"] },
      { id: "ideas", tags: ["g:ideas"] },
      { id: "listening", tags: ["g:listen", "p:people"] },
      { id: "leading", tags: ["g:lead"] },
      { id: "detail", tags: ["g:detail"] },
    ],
  },
  {
    id: "skillsToLearn",
    kind: "multi",
    skippable: true,
    options: [
      { id: "programming", tags: ["l:code"] },
      { id: "design", tags: ["l:design"] },
      { id: "research", tags: ["l:research", "r:research"] },
      { id: "speaking", tags: ["l:speak"] },
      { id: "business", tags: ["l:business"] },
      { id: "health", tags: ["l:health"] },
      { id: "languages", tags: ["l:languages"] },
      { id: "engineeringTools", tags: ["l:eng"] },
      { id: "dataAnalysis", tags: ["l:data", "c:data"] },
    ],
  },
  {
    id: "peopleVsTech",
    kind: "single",
    skippable: true,
    options: [
      { id: "people", tags: ["p:people"] },
      { id: "tech", tags: ["t:tech"] },
      { id: "both", tags: ["p:people", "t:tech"] },
      { id: "notSure", tags: [] },
    ],
  },
  {
    id: "dataVsCreative",
    kind: "single",
    skippable: true,
    options: [
      { id: "data", tags: ["c:data"] },
      { id: "creative", tags: ["c:creative"] },
      { id: "both", tags: ["c:data", "c:creative"] },
      { id: "notSure", tags: [] },
    ],
  },
  {
    id: "natureInterest",
    kind: "single",
    skippable: true,
    options: [
      { id: "yes", tags: ["n:nature"] },
      { id: "somewhat", tags: ["n:nature"] },
      { id: "no", tags: [] },
      { id: "notSure", tags: [] },
    ],
  },
  {
    id: "researchVsPractice",
    kind: "single",
    skippable: true,
    options: [
      { id: "research", tags: ["r:research"] },
      { id: "practice", tags: ["r:practice"] },
      { id: "both", tags: ["r:research", "r:practice"] },
      { id: "notSure", tags: [] },
    ],
  },
  {
    id: "workEnvironment",
    kind: "multi",
    skippable: true,
    options: [
      { id: "office", tags: ["w:office"] },
      { id: "lab", tags: ["w:lab", "r:research"] },
      { id: "outdoors", tags: ["w:outdoors", "n:nature"] },
      { id: "clinic", tags: ["w:clinic", "p:people"] },
      { id: "classroom", tags: ["w:classroom", "p:people"] },
      { id: "studio", tags: ["w:studio", "c:creative"] },
      { id: "field", tags: ["w:field", "n:nature"] },
      { id: "flexible", tags: ["w:flexible"] },
    ],
  },
  {
    id: "values",
    kind: "multi",
    skippable: true,
    options: [
      { id: "stability", tags: ["v:stability"] },
      { id: "income", tags: ["v:income"] },
      { id: "impact", tags: ["v:impact", "p:people"] },
      { id: "independence", tags: ["v:independence"] },
      { id: "creativity", tags: ["v:creativity", "c:creative"] },
      { id: "recognition", tags: ["v:recognition"] },
      { id: "balance", tags: ["v:balance"] },
    ],
  },
];

export const DISCOVERY_QUESTION_IDS: string[] = DISCOVERY_QUESTIONS.map((q) => q.id);

// ---------------------------------------------------------------------------
// Answers & trial feedback
// ---------------------------------------------------------------------------

/** questionId → selected option ids. A skipped question is absent or empty. */
export type DiscoveryAnswers = Record<string, string[]>;

/** careerId → the student's reaction after trying the mini project. */
export type TrialFeedback = Record<string, "liked" | "disliked" | "explore_more">;

export const TRIAL_FEEDBACK_VALUES = ["liked", "disliked", "explore_more"] as const;

// ---------------------------------------------------------------------------
// Result shape
// ---------------------------------------------------------------------------

export interface RecommendationReason {
  questionId: string;
  optionId: string;
  /** The affinity tags this answer contributed to the match. */
  tags: string[];
}

export interface CareerRecommendation {
  careerId: string;
  /** 0–100 relative match score — labelled a match score, never a probability. */
  score: number;
  /** Which answers produced this suggestion (empty = weak / exploratory pick). */
  reasons: RecommendationReason[];
  matchedInterests: string[];
  matchedSkills: string[];
  /** Questions this student skipped that would refine the suggestion. */
  unknowns: string[];
  relatedMajors: string[];
  /** Next-best career ids from OTHER clusters — alternatives, not losers. */
  alternatives: string[];
  /** Where a trial result pushed this career up/down (transparency). */
  trialAdjustment: number;
  /** Multi / single label so the UI can say "weak match — explore broadly". */
  matchStrength: "strong" | "moderate" | "weak";
}

export interface DiscoveryResult {
  /** true when too little was answered to honestly rank anything. */
  insufficientData: boolean;
  recommendations: CareerRecommendation[];
  /** Question ids the student actually answered. */
  answeredQuestions: string[];
  /** Question ids the student skipped — reported, never punished. */
  skippedQuestions: string[];
  /** Constant contract label — the UI must surface it. */
  disclaimer: "not-a-diagnosis";
}

// ---------------------------------------------------------------------------
// Career affinity (which tags each career rewards)
// ---------------------------------------------------------------------------

export interface CareerAffinity {
  /** tag → weight (1 = mild, 2 = solid, 3 = strong). Unknown tags = 0. */
  [tag: string]: number;
}

/**
 * Affinity per career id. The catalogue in `journey/careers.ts` owns identity,
 * majors and countries; this map owns "which answers point here".
 * Kept here (not in the catalog) so the catalog stays free of quiz logic and
 * admin catalog edits can never silently change recommendation scoring.
 */
export const CAREER_AFFINITY: Record<string, CareerAffinity> = {
  software: {
    "s:math": 2, "s:computing": 3, "s:physics": 1, "-s:computing": -3, "-s:math": -1,
    "a:build": 2, "a:analyze": 1, "g:problems": 2, "g:detail": 1,
    "l:code": 3, "l:data": 1, "t:tech": 2, "c:data": 1,
    "r:practice": 1, "w:office": 1, "w:flexible": 1, "v:income": 1, "v:independence": 1,
  },
  data: {
    "s:math": 2, "s:economics": 1, "s:computing": 2, "-s:math": -2,
    "a:analyze": 3, "g:problems": 2, "g:detail": 2,
    "l:data": 3, "l:code": 1, "c:data": 3, "t:tech": 1,
    "r:research": 1, "r:practice": 1, "w:office": 1, "v:income": 1,
  },
  business: {
    "s:economics": 2, "s:math": 1, "-s:economics": -2,
    "a:organize": 2, "a:persuade": 2, "a:help": 1,
    "g:plan": 2, "g:lead": 2, "g:problems": 1,
    "l:business": 3, "l:speak": 1, "p:people": 1,
    "r:practice": 2, "w:office": 1, "v:income": 2, "v:recognition": 1, "v:independence": 1,
  },
  engineering: {
    "s:math": 2, "s:physics": 3, "-s:physics": -3, "-s:math": -2,
    "a:build": 3, "g:problems": 2, "g:hands": 2, "g:detail": 1,
    "l:eng": 3, "t:tech": 2, "c:data": 1,
    "r:practice": 2, "w:lab": 1, "w:field": 1, "v:income": 1, "v:stability": 1,
  },
  health: {
    "s:biology": 3, "s:chemistry": 2, "-s:biology": -3,
    "a:help": 3, "g:detail": 2, "g:listen": 1,
    "l:health": 3, "p:people": 2, "w:clinic": 3,
    "v:impact": 2, "v:stability": 1, "r:practice": 1,
  },
  law: {
    "s:history": 1, "s:languages": 1, "s:economics": 1, "-s:literature": -1,
    "a:write": 2, "a:persuade": 2, "g:explain": 2, "g:detail": 2, "g:problems": 1,
    "l:speak": 2, "p:people": 1,
    "r:practice": 1, "w:office": 1, "v:impact": 1, "v:recognition": 1, "v:income": 1,
  },
  design: {
    "s:art": 3, "-s:art": -3,
    "a:create": 3, "g:ideas": 2, "g:detail": 1,
    "l:design": 3, "c:creative": 3, "w:studio": 2,
    "v:creativity": 3, "v:independence": 1,
  },
  humanities: {
    "s:history": 2, "s:literature": 2, "s:languages": 2, "-s:history": -1,
    "a:write": 2, "a:teach": 2, "a:help": 1,
    "g:explain": 2, "g:listen": 1, "l:languages": 1,
    "p:people": 2, "w:classroom": 2, "v:impact": 1, "v:balance": 1,
  },
  environment: {
    "s:biology": 2, "s:geography": 2, "s:chemistry": 1,
    "a:outdoors": 2, "a:experiment": 1, "a:help": 1,
    "n:nature": 3, "w:outdoors": 2, "w:field": 2, "w:lab": 1,
    "r:research": 1, "r:practice": 1, "v:impact": 2, "g:problems": 1,
  },
  agriculture: {
    "s:biology": 2, "s:chemistry": 1, "s:geography": 1,
    "a:outdoors": 2, "a:experiment": 1, "g:hands": 2,
    "n:nature": 3, "w:outdoors": 2, "w:field": 3, "w:lab": 1,
    "r:practice": 2, "v:impact": 1, "v:stability": 1,
  },
  media: {
    "s:literature": 2, "s:languages": 1, "s:history": 1, "-s:literature": -1,
    "a:write": 3, "a:create": 2, "a:persuade": 1,
    "g:ideas": 2, "l:speak": 1, "c:creative": 2, "p:people": 1,
    "w:flexible": 1, "w:studio": 1, "v:creativity": 2, "v:independence": 1,
  },
  psychology: {
    "s:psychology": 3, "s:biology": 1, "-s:psychology": -2,
    "a:help": 2, "a:experiment": 1,
    "g:listen": 3, "g:explain": 1, "l:research": 1,
    "p:people": 3, "w:clinic": 2, "w:lab": 1,
    "r:research": 1, "r:practice": 1, "v:impact": 2,
  },
  math: {
    "s:math": 3, "s:physics": 1, "-s:math": -3,
    "g:problems": 3, "g:detail": 1, "a:analyze": 2,
    "c:data": 2, "l:data": 1, "r:research": 2, "w:office": 1, "w:lab": 1,
    "v:stability": 1, "v:income": 1,
  },
  science: {
    "s:physics": 2, "s:chemistry": 2, "s:biology": 2, "s:math": 1,
    "a:experiment": 3, "g:problems": 2, "g:detail": 2,
    "r:research": 3, "w:lab": 3, "c:data": 1, "l:research": 2,
    "v:impact": 1, "v:balance": 1,
  },
  logistics: {
    "s:economics": 1, "s:math": 1,
    "a:organize": 3, "g:plan": 3, "g:lead": 1, "g:detail": 1,
    "l:business": 2, "r:practice": 2, "w:office": 1, "w:field": 1,
    "v:stability": 2, "v:income": 1,
  },
  energy: {
    "s:physics": 2, "s:math": 1, "s:chemistry": 1,
    "a:build": 2, "g:problems": 2, "g:hands": 1,
    "l:eng": 2, "t:tech": 2, "n:nature": 1,
    "w:field": 2, "w:lab": 1, "r:practice": 2,
    "v:impact": 1, "v:stability": 1, "v:income": 1,
  },
  tourism: {
    "s:languages": 2, "-s:languages": -1,
    "a:organize": 2, "a:help": 2, "a:persuade": 1,
    "g:plan": 2, "g:listen": 1, "l:languages": 2, "l:speak": 1,
    "p:people": 3, "w:flexible": 1,
    "v:independence": 1, "v:balance": 1,
  },
};

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

const MIN_ANSWERED_FOR_RANKING = 3;

function collectTags(answers: DiscoveryAnswers): Map<string, string[]> {
  // tag → list of "questionId/optionId" that produced it (for `reasons`).
  const map = new Map<string, string[]>();
  for (const q of DISCOVERY_QUESTIONS) {
    const selected = answers[q.id];
    if (!Array.isArray(selected)) continue;
    const known = new Set(q.options.map((o) => o.id));
    for (const optId of selected) {
      if (typeof optId !== "string" || !known.has(optId)) continue;
      const opt = q.options.find((o) => o.id === optId)!;
      for (const tag of opt.tags) {
        const list = map.get(tag) ?? [];
        list.push(`${q.id}/${optId}`);
        map.set(tag, list);
      }
    }
  }
  return map;
}

function sanitizeAnswers(raw: unknown): DiscoveryAnswers {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: DiscoveryAnswers = {};
  for (const q of DISCOVERY_QUESTIONS) {
    const value = (raw as Record<string, unknown>)[q.id];
    if (!Array.isArray(value)) continue;
    const known = new Set(q.options.map((o) => o.id));
    const picked = value.filter((v): v is string => typeof v === "string" && known.has(v));
    if (picked.length === 0) continue;
    out[q.id] = q.kind === "single" ? picked.slice(0, 1) : picked.slice(0, q.options.length);
  }
  return out;
}

function sanitizeFeedback(raw: unknown, careerIds: Set<string>): TrialFeedback {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: TrialFeedback = {};
  for (const [careerId, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!careerIds.has(careerId)) continue;
    if (value === "liked" || value === "disliked" || value === "explore_more") {
      out[careerId] = value;
    }
  }
  return out;
}

/** How strongly a cluster should be nudged by feedback on one of its careers. */
function clusterOf(career: CareerPath): string {
  return career.cluster ?? career.id;
}

export function runCareerDiscovery(rawAnswers: unknown, rawFeedback?: unknown): DiscoveryResult {
  const answers = sanitizeAnswers(rawAnswers);
  const careerIds = new Set(CAREER_PATHS.map((c) => c.id));
  const feedback = sanitizeFeedback(rawFeedback, careerIds);

  const answeredQuestions = DISCOVERY_QUESTIONS.filter(
    (q) => Array.isArray(answers[q.id]) && answers[q.id].length > 0
  ).map((q) => q.id);
  const skippedQuestions = DISCOVERY_QUESTIONS.filter((q) => !answeredQuestions.includes(q.id)).map((q) => q.id);

  const tagSources = collectTags(answers);

  // Trial feedback roll-up: a liked trial lifts its own career and, mildly,
  // its cluster; a disliked one DEMOTES (it stays a visible hypothesis — one
  // mini project is a signal, not a verdict); "explore more" is a gentle lift.
  // Feedback NEVER creates a recommendation by itself.
  const clusterNudge = new Map<string, number>();
  for (const [careerId, value] of Object.entries(feedback)) {
    const career = CAREER_PATHS.find((c) => c.id === careerId);
    if (!career) continue;
    const cluster = clusterOf(career);
    const delta = value === "liked" ? 6 : value === "disliked" ? -3 : 2;
    clusterNudge.set(cluster, (clusterNudge.get(cluster) ?? 0) + delta);
  }

  const scored = CAREER_PATHS.map((career) => {
    const affinity = CAREER_AFFINITY[career.id] ?? {};
    let score = 0;
    const reasons: RecommendationReason[] = [];
    const matchedInterests = new Set<string>();
    const matchedSkills = new Set<string>();

    for (const [tag, sources] of tagSources) {
      const weight = affinity[tag] ?? 0;
      if (weight === 0) continue;
      // Negative tags (disliked subjects) carry negative weights in
      // CAREER_AFFINITY and subtract — one signal among many, never a veto.
      score += weight;
      if (tag.startsWith("-")) continue;
      const [kind] = tag.split(":");
      if (kind === "s" || kind === "a" || kind === "n") matchedInterests.add(tag);
      else matchedSkills.add(tag);
      for (const src of sources) {
        const [questionId, optionId] = src.split("/");
        // Keep the reason list tight: only answers that actually moved score.
        if (!reasons.some((r) => r.questionId === questionId && r.optionId === optionId)) {
          reasons.push({ questionId, optionId, tags: [tag] });
        } else {
          const r = reasons.find((r) => r.questionId === questionId && r.optionId === optionId)!;
          if (!r.tags.includes(tag)) r.tags.push(tag);
        }
      }
    }

    // Trial adjustment — transparent, reported separately. A disliked trial
    // demotes its career but can never erase a strong answer-based match.
    let trialAdjustment = clusterNudge.get(clusterOf(career)) ?? 0;
    const own = feedback[career.id];
    if (own === "liked") trialAdjustment += 10;
    else if (own === "disliked") trialAdjustment -= 12;
    else if (own === "explore_more") trialAdjustment += 4;
    const rawScore = score + trialAdjustment;

    const unknowns = skippedQuestions.filter((qid) => {
      // A skipped question matters if at least one of its options touches
      // this career's affinity — otherwise it genuinely cannot change the pick.
      const q = DISCOVERY_QUESTIONS.find((x) => x.id === qid);
      if (!q) return false;
      return q.options.some((o) => o.tags.some((t) => (affinity[t] ?? 0) !== 0));
    });

    return {
      career,
      score: rawScore,
      reasons,
      matchedInterests: [...matchedInterests],
      matchedSkills: [...matchedSkills],
      unknowns,
      trialAdjustment,
    };
  });

  scored.sort((a, b) => b.score - a.score || a.career.id.localeCompare(b.career.id));

  const insufficientData = answeredQuestions.length < MIN_ANSWERED_FOR_RANKING;

  // Honest empty state: too little data → NO invented ranking.
  if (insufficientData) {
    return {
      insufficientData: true,
      recommendations: [],
      answeredQuestions,
      skippedQuestions,
      disclaimer: "not-a-diagnosis",
    };
  }

  // Show the top 3–5 careers that at least one answer pointed to. If fewer
  // than three matched at all we show just those — never pad the list with
  // unrelated careers to hit a number, and never invent a ranking.
  const positive = scored.filter((s) => s.score > 0);
  const chosen = positive.slice(0, 5);

  const maxScore = chosen[0]?.score ?? 1;
  const recommendations: CareerRecommendation[] = chosen.map((s) => {
    const alternatives = scored
      .filter((x) => x.career.id !== s.career.id && clusterOf(x.career) !== clusterOf(s.career) && x.score > 0)
      .slice(0, 2)
      .map((x) => x.career.id);
    const ratio = maxScore > 0 ? s.score / maxScore : 0;
    const matchStrength: CareerRecommendation["matchStrength"] =
      ratio >= 0.75 && s.reasons.length >= 3 ? "strong" : ratio >= 0.45 ? "moderate" : "weak";
    return {
      careerId: s.career.id,
      score: Math.round(Math.max(0, s.score)),
      reasons: s.reasons,
      matchedInterests: s.matchedInterests,
      matchedSkills: s.matchedSkills,
      unknowns: s.unknowns,
      relatedMajors: s.career.majors.slice(0, 5),
      alternatives,
      trialAdjustment: s.trialAdjustment,
      matchStrength,
    };
  });

  return {
    insufficientData: false,
    recommendations,
    answeredQuestions,
    skippedQuestions,
    disclaimer: "not-a-diagnosis",
  };
}

// ---------------------------------------------------------------------------
// Input validation for the API layer
// ---------------------------------------------------------------------------

export type AnswersValidation = { ok: true; answers: DiscoveryAnswers } | { ok: false; error: string };

/** Strict server-side validation — unknown question/option ids are rejected. */
export function validateDiscoveryAnswers(raw: unknown): AnswersValidation {
  if (raw === null || raw === undefined) return { ok: true, answers: {} };
  if (typeof raw !== "object" || Array.isArray(raw)) return { ok: false, error: "answers must be an object" };
  const byId = new Map(DISCOVERY_QUESTIONS.map((q) => [q.id, q]));
  for (const [qid, value] of Object.entries(raw as Record<string, unknown>)) {
    const q = byId.get(qid);
    if (!q) return { ok: false, error: `unknown question: ${qid}` };
    if (!Array.isArray(value)) return { ok: false, error: `${qid} must be an array` };
    if (value.length > q.options.length) return { ok: false, error: `${qid} has too many options` };
    const known = new Set(q.options.map((o) => o.id));
    for (const v of value) {
      if (typeof v !== "string" || !known.has(v)) return { ok: false, error: `${qid} has an unknown option` };
    }
    if (q.kind === "single" && value.length > 1) return { ok: false, error: `${qid} accepts one option` };
  }
  return { ok: true, answers: sanitizeAnswers(raw) };
}

export function validateTrialFeedback(raw: unknown): { ok: true; feedback: TrialFeedback } | { ok: false; error: string } {
  if (raw === null || raw === undefined) return { ok: true, feedback: {} };
  if (typeof raw !== "object" || Array.isArray(raw)) return { ok: false, error: "trialFeedback must be an object" };
  const careerIds = new Set(CAREER_PATHS.map((c) => c.id));
  for (const [careerId, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!careerIds.has(careerId)) return { ok: false, error: `unknown career: ${careerId}` };
    if (!TRIAL_FEEDBACK_VALUES.includes(value as (typeof TRIAL_FEEDBACK_VALUES)[number])) {
      return { ok: false, error: `invalid trial feedback for ${careerId}` };
    }
  }
  return { ok: true, feedback: sanitizeFeedback(raw, careerIds) };
}

/**
 * Map a chosen career to study-interest selections for the onboarding wizard.
 * Delegates to the same legacy mapping every other import uses, so the result
 * is a valid, persisted `study_interests` value — never a free-text guess.
 */
export function selectionsForCareer(careerId: string): StudyInterestSelection[] {
  const career = CAREER_PATHS.find((c) => c.id === careerId);
  if (!career) return [];
  const major = career.majors[0] ?? career.title;
  return selectionsFromLegacyTargetMajor(major);
}
