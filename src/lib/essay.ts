/**
 * Advanced Essay AI (#8) — the scoring half.
 *
 * The rubric is computed here, deterministically, from the text itself. The
 * model writes feedback prose; it does not decide the numbers. A student who
 * improves their draft must see the score move for a reason they can verify,
 * and two readers must get the same score from the same text.
 *
 * Pure module — asserted in `scripts/check-essays.ts`.
 */

export type EssayType = "sop" | "personal_statement" | "why_us" | "supplemental" | "scholarship";

export interface RubricScores {
  /** Does the first paragraph earn the reader's attention? */
  hook: number;
  /** Paragraphs, progression, a clear ending. */
  structure: number;
  /** Concrete nouns, numbers and names vs. generic claims. */
  specificity: number;
  /** Sentence variety, passive voice, cliché density, typos. */
  language: number;
  /** Does it answer the prompt and name the programme? */
  fit: number;
  total: number;
}

export interface EssayFeedback {
  scores: RubricScores;
  wordCount: number;
  /** Each item is something the student can act on. */
  issues: { code: string; message: string; severity: "blocker" | "warning" | "info" }[];
  /** Words that weaken the essay — with where they appear. */
  cliches: { phrase: string; count: number }[];
  readingTimeSec: number;
}

export interface EssayOptions {
  type?: EssayType;
  /** Word limit published by the programme, when there is one. */
  wordLimit?: number | null;
  /** The university or programme the essay is addressed to. */
  targetName?: string | null;
}

// --- Text helpers ----------------------------------------------------------

export function countWords(text: string): number {
  const words = text.trim().split(/\s+/).filter((w) => /[a-z\u0400-\u04ff]/i.test(w));
  return words.length;
}

export function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}

export function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/** Words that make an essay sound like everyone else's. */
const CLICHE_PATTERNS: { phrase: string; re: RegExp }[] = [
  { phrase: "since I was a child", re: /\bsince (?:i was|my) (?:a )?child\b|\bsince childhood\b/gi },
  { phrase: "passionate about", re: /\bpassionate about\b/gi },
  { phrase: "broaden my horizons", re: /\bbroaden(?:ing)? (?:my |our )?horizons?\b/gi },
  { phrase: "dream university", re: /\bdream (?:university|school|college)\b/gi },
  { phrase: "it has always been my dream", re: /\b(?:it has )?always been my dream\b/gi },
  { phrase: "prestigious university", re: /\bprestigious (?:university|institution|school)\b/gi },
  { phrase: "in today's world", re: /\bin today'?s (?:world|society|modern world)\b/gi },
  { phrase: "hard-working and dedicated", re: /\bhard[- ]working and dedicated\b/gi },
  { phrase: "step out of my comfort zone", re: /\bstep(?:ping)? out of my comfort zone\b/gi },
  { phrase: "make a difference", re: /\bmake a (?:real )?difference\b/gi },
  { phrase: "world-class", re: /\bworld[- ]class\b/gi },
  { phrase: "from a young age", re: /\bfrom a (?:very )?young age\b/gi },
];

/** Claims with no evidence attached. */
const VAGUE_CLAIMS = [
  /\bi am (?:very )?(?:hardworking|hard-working|dedicated|motivated|ambitious)\b/gi,
  /\bi have (?:a )?(?:strong|great) (?:passion|interest) for\b/gi,
  /\bi (?:really )?love (?:to )?(?:learn|study|help)\b/gi,
];

/** Concrete evidence markers — numbers, proper nouns, named things. */
const CONCRETE_MARKERS = [
  /\b\d+(?:\.\d+)?\s?(?:%|percent|hours?|weeks?|months?|years?|students?|projects?|people|users?|kg|km|usd|\$)\b/gi,
  /\b(?:first|second|third|1st|2nd|3rd)[ -]place\b/gi,
];

const PASSIVE_RE = /\b(?:is|are|was|were|be|been|being)\s+\w+(?:ed|en)\b/gi;

// --- Sub-scores ------------------------------------------------------------

function hookScore(text: string): { score: number; issues: EssayFeedback["issues"] } {
  const issues: EssayFeedback["issues"] = [];
  const paras = paragraphs(text);
  if (paras.length === 0) return { score: 0, issues };

  const first = paras[0];
  const firstSentence = sentences(first)[0] || "";
  let score = 50;

  if (/^(?:my name is|i am writing to|dear sir|to whom it may concern)/i.test(first.trim())) {
    score -= 30;
    issues.push({
      code: "opening_boilerplate",
      message: "Do not open with your name or \"I am writing to apply\" — the reader already knows. Open with a moment only you can describe.",
      severity: "blocker",
    });
  }
  if (firstSentence.length > 45) {
    score -= 10;
    issues.push({
      code: "long_first_sentence",
      message: `Your first sentence is ${firstSentence.split(/\s+/).length} words. Cut it under 25 — the first line decides whether the rest gets read.`,
      severity: "warning",
    });
  }
  if (/\?/.test(first)) score += 8;
  if (/\b\d+\b/.test(first)) score += 12; // a number in the opening is concrete
  if (first.length < 400) score += 10; // a tight opening paragraph
  if (CLICHE_PATTERNS.some((c) => c.re.test(first))) {
    score -= 15;
    issues.push({
      code: "cliche_opening",
      message: "Your opening uses a phrase admissions officers read hundreds of times. Replace it with the specific thing that happened to you.",
      severity: "warning",
    });
  }

  return { score: clamp(score, 0, 100), issues };
}

function structureScore(text: string, wordCount: number): { score: number; issues: EssayFeedback["issues"] } {
  const issues: EssayFeedback["issues"] = [];
  const paras = paragraphs(text);
  const ss = sentences(text);
  let score = 40;

  if (paras.length >= 4 && paras.length <= 9) score += 25;
  else if (paras.length >= 3) score += 15;
  else {
    issues.push({
      code: "too_few_paragraphs",
      message: `Only ${paras.length} paragraph${paras.length === 1 ? "" : "s"}. Split the essay so each paragraph makes one point.`,
      severity: "blocker",
    });
  }

  // Paragraphs should be roughly even — one 600-word block is a red flag.
  const lengths = paras.map((p) => countWords(p));
  const longest = Math.max(...lengths, 1);
  if (longest > 250) {
    score -= 12;
    issues.push({
      code: "paragraph_too_long",
      message: `One paragraph runs ${longest} words. Break it in two at the point where the idea shifts.`,
      severity: "warning",
    });
  }

  // A conclusion should exist and should not introduce a new claim.
  const last = paras[paras.length - 1] || "";
  if (/\b(?:in conclusion|to sum up|overall|looking ahead|ultimately)\b/i.test(last) || paras.length >= 4) {
    score += 12;
  } else {
    issues.push({
      code: "no_conclusion",
      message: "The essay stops rather than ends. Close by connecting your goal back to what this programme makes possible.",
      severity: "warning",
    });
  }

  if (ss.length > 0 && wordCount / ss.length > 32) {
    score -= 8;
    issues.push({
      code: "run_on_sentences",
      message: `Average sentence length is ${Math.round(wordCount / ss.length)} words. Vary the rhythm — a short sentence after a long one keeps the reader awake.`,
      severity: "info",
    });
  }

  return { score: clamp(score, 0, 100), issues };
}

function specificityScore(text: string): { score: number; issues: EssayFeedback["issues"] } {
  const issues: EssayFeedback["issues"] = [];
  const words = countWords(text) || 1;

  const concrete = CONCRETE_MARKERS.reduce((n, re) => n + (text.match(re)?.length ?? 0), 0);
  const density = (concrete / words) * 1000; // per 1000 words

  let score = clamp(25 + density * 9, 0, 100);

  if (concrete === 0) {
    score = Math.min(score, 35);
    issues.push({
      code: "no_evidence",
      message: "Not one number, award, project name or measurable result in the whole essay. Committees believe evidence, not adjectives.",
      severity: "blocker",
    });
  } else if (density < 1.5) {
    issues.push({
      code: "thin_evidence",
      message: `Only ${concrete} concrete detail${concrete === 1 ? "" : "s"} per essay. Turn two of your claims into numbers — how many people, how long, what result?`,
      severity: "warning",
    });
  }

  const vague = VAGUE_CLAIMS.reduce((n, re) => n + (text.match(re)?.length ?? 0), 0);
  if (vague > 0) {
    score = clamp(score - vague * 8, 0, 100);
    issues.push({
      code: "unsupported_adjective",
      message: `${vague} unsupported self-description${vague === 1 ? "" : "s"} ("I am hardworking…"). Show it through what you did instead of stating it.`,
      severity: "warning",
    });
  }

  return { score, issues };
}

function languageScore(text: string): { score: number; issues: EssayFeedback["issues"]; cliches: EssayFeedback["cliches"] } {
  const issues: EssayFeedback["issues"] = [];
  const words = countWords(text) || 1;
  const ss = sentences(text);

  const clicheHits = CLICHE_PATTERNS.map((c) => ({
    phrase: c.phrase,
    count: text.match(c.re)?.length ?? 0,
  })).filter((c) => c.count > 0);
  const clicheCount = clicheHits.reduce((n, c) => n + c.count, 0);

  let score = 78;

  if (clicheCount > 0) {
    score -= Math.min(30, clicheCount * 7);
    issues.push({
      code: "cliches",
      message: `${clicheCount} cliché${clicheCount === 1 ? "" : "s"}: ${clicheHits.map((c) => `"${c.phrase}"`).join(", ")}. These are the phrases readers skim past.`,
      severity: clicheCount >= 3 ? "blocker" : "warning",
    });
  }

  const passive = text.match(PASSIVE_RE)?.length ?? 0;
  if (passive / words > 0.02) {
    score -= 8;
    issues.push({
      code: "passive_voice",
      message: `${passive} passive constructions. "The project was led by me" hides the subject — write "I led the project".`,
      severity: "info",
    });
  }

  // Sentence-length variety
  const lens = ss.map((s) => s.split(/\s+/).length);
  if (lens.length > 3) {
    const unique = new Set(lens).size / lens.length;
    if (unique < 0.45) {
      score -= 8;
      issues.push({
        code: "monotone_rhythm",
        message: "Most sentences are the same length. Vary it — mix a 6-word sentence into a 25-word one.",
        severity: "info",
      });
    }
  }

  // Double spaces / repeated words are cheap to catch and look careless.
  const doubled = text.match(/\b(\w+)\s+\1\b/gi)?.length ?? 0;
  if (doubled > 0) {
    score -= Math.min(12, doubled * 4);
    issues.push({
      code: "repeated_word",
      message: `${doubled} repeated word${doubled === 1 ? "" : "s"} ("the the"). A five-minute proofread catches these.`,
      severity: "warning",
    });
  }

  return { score: clamp(score, 0, 100), issues, cliches: clicheHits };
}

function fitScore(text: string, opts: EssayOptions): { score: number; issues: EssayFeedback["issues"] } {
  const issues: EssayFeedback["issues"] = [];
  const words = countWords(text);
  let score = 60;

  const target = (opts.targetName || "").trim();
  if (target) {
    const nameWords = target.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const mentioned = nameWords.some((w) => text.toLowerCase().includes(w));
    if (mentioned) score += 20;
    else {
      score -= 25;
      issues.push({
        code: "target_not_named",
        message: `"${target}" never appears in the essay. Committees can tell a recycled draft — name the programme and one thing specific about it.`,
        severity: "blocker",
      });
    }
  }

  if (opts.type === "why_us") {
    if (!/\b(?:professor|faculty|lab|laboratory|course|module|curriculum|research group)\b/i.test(text)) {
      score -= 15;
      issues.push({
        code: "why_us_generic",
        message: "A \"why us\" essay needs specifics: a professor, a lab, a course. Nothing in the text points to this university in particular.",
        severity: "warning",
      });
    } else {
      score += 10;
    }
  }

  if (opts.wordLimit && opts.wordLimit > 0) {
    if (words > opts.wordLimit) {
      score -= 20;
      issues.push({
        code: "over_limit",
        message: `${words} words against a ${opts.wordLimit}-word limit. Many portals cut the text off mid-sentence — get under the limit.`,
        severity: "blocker",
      });
    } else if (words < opts.wordLimit * 0.6) {
      score -= 12;
      issues.push({
        code: "under_limit",
        message: `${words} of ${opts.wordLimit} allowed words used. You are leaving a third of your argument unwritten.`,
        severity: "warning",
      });
    } else {
      score += 8;
    }
  }

  if (!/\b(?:goal|career|after gradua|professionally|aim to|plan to)\b/i.test(text)) {
    score -= 10;
    issues.push({
      code: "no_forward_look",
      message: "The essay never says what comes next. Committees fund a trajectory, not a hobby.",
      severity: "info",
    });
  }

  return { score: clamp(score, 0, 100), issues };
}

// --- Entry point -----------------------------------------------------------

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(v)));

export function analyzeEssay(text: string, opts: EssayOptions = {}): EssayFeedback {
  const wordCount = countWords(text);
  const hook = hookScore(text);
  const structure = structureScore(text, wordCount);
  const specificity = specificityScore(text);
  const language = languageScore(text);
  const fit = fitScore(text, opts);

  const issues = [...hook.issues, ...structure.issues, ...specificity.issues, ...language.issues, ...fit.issues];

  if (wordCount === 0) {
    return {
      scores: { hook: 0, structure: 0, specificity: 0, language: 0, fit: 0, total: 0 },
      wordCount: 0,
      issues: [{ code: "empty", message: "There is no text to review yet.", severity: "blocker" }],
      cliches: [],
      readingTimeSec: 0,
    };
  }

  if (wordCount < 150) {
    issues.push({
      code: "too_short",
      message: `${wordCount} words is a sketch, not an essay. Most programmes expect 500–1000.`,
      severity: "blocker",
    });
  }

  // Weighted total — specificity and fit decide admissions more than style.
  const total = clamp(
    hook.score * 0.15 + structure.score * 0.2 + specificity.score * 0.3 + language.score * 0.15 + fit.score * 0.2,
    0,
    100
  );

  return {
    scores: {
      hook: hook.score,
      structure: structure.score,
      specificity: specificity.score,
      language: language.score,
      fit: fit.score,
      total,
    },
    wordCount,
    issues,
    cliches: language.cliches,
    readingTimeSec: Math.round((wordCount / 200) * 60),
  };
}

/** What changed between two drafts — the version-history view. */
export function compareVersions(previous: string, current: string) {
  const before = analyzeEssay(previous);
  const after = analyzeEssay(current);
  const delta = {
    total: after.scores.total - before.scores.total,
    hook: after.scores.hook - before.scores.hook,
    structure: after.scores.structure - before.scores.structure,
    specificity: after.scores.specificity - before.scores.specificity,
    language: after.scores.language - before.scores.language,
    fit: after.scores.fit - before.scores.fit,
  };
  const fixedCodes = before.issues
    .map((i) => i.code)
    .filter((code) => !after.issues.some((i) => i.code === code));
  const newCodes = after.issues
    .map((i) => i.code)
    .filter((code) => !before.issues.some((i) => i.code === code));

  return {
    before: before.scores,
    after: after.scores,
    delta,
    improved: delta.total > 0,
    wordDelta: after.wordCount - before.wordCount,
    fixedIssues: fixedCodes,
    newIssues: newCodes,
  };
}
