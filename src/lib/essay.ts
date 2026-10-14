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
  /** Numeric and other detectable evidence cues vs. generic claims (not full semantic review). */
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
  issues: { code: string; message: string; severity: "blocker" | "warning" | "info"; excerpt?: string }[];
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

/** A short passage copied from the submitted draft for grounded feedback. */
function issueExcerpt(text: string, max = 180): string {
  const trimmed = text.trim();
  const excerpt = trimmed.slice(0, max).replace(/\s+/g, " ");
  return trimmed.length > max ? `${excerpt}…` : excerpt;
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
      message: "The opening uses application boilerplate. Consider replacing it with a concise, truthful moment or question that is relevant to this prompt.",
      severity: "blocker",
      excerpt: issueExcerpt(firstSentence),
    });
  }
  if (firstSentence.length > 45) {
    score -= 10;
    issues.push({
      code: "long_first_sentence",
      message: `Your first sentence is ${firstSentence.split(/\s+/).length} words. Consider splitting or shortening it while preserving the original meaning.`,
      severity: "warning",
      excerpt: issueExcerpt(firstSentence),
    });
  }
  if (/\?/.test(first)) score += 8;
  if (/\b\d+\b/.test(first)) score += 12; // a number in the opening is concrete
  if (first.length < 400) score += 10; // a tight opening paragraph
  if (CLICHE_PATTERNS.some((c) => new RegExp(c.re.source, "i").test(first))) {
    score -= 15;
    issues.push({
      code: "cliche_opening",
      message: "The opening contains a common phrase. Replace it only with a specific experience that actually happened to you.",
      severity: "warning",
      excerpt: issueExcerpt(firstSentence),
    });
  }

  return { score: clamp(score, 0, 100), issues };
}

function structureScore(text: string, wordCount: number): { score: number; issues: EssayFeedback["issues"] } {
  const issues: EssayFeedback["issues"] = [];
  const paras = paragraphs(text);
  const ss = sentences(text);
  const shortResponse = wordCount < 300;
  let score = 40;

  // Short supplements may be one or two paragraphs; a longer statement needs
  // clearer paragraph breaks. Do not penalize a concise response by default.
  if ((shortResponse && paras.length >= 1 && paras.length <= 5) || (paras.length >= 3 && paras.length <= 9)) {
    score += 25;
  } else if (paras.length >= 2 && paras.length <= 10) {
    score += 15;
  } else if (paras.length === 0) {
    score = 0;
  } else {
    issues.push({
      code: "too_few_paragraphs",
      message: `The draft has ${paras.length} paragraph${paras.length === 1 ? "" : "s"}. Separate distinct ideas where the prompt and response length call for it.`,
      severity: "blocker",
    });
  }

  // A long block can make a change in subject or main point harder to follow.
  const lengths = paras.map((p) => countWords(p));
  const longest = Math.max(...lengths, 1);
  if (longest > 250) {
    score -= 12;
    issues.push({
      code: "paragraph_too_long",
      message: `One paragraph runs ${longest} words. Consider splitting it where the subject or main idea changes.`,
      severity: "warning",
      excerpt: issueExcerpt(paras[lengths.indexOf(longest)] ?? ""),
    });
  }

  // A closing line is not required for every short response.
  const last = paras[paras.length - 1] || "";
  const hasClosingCue = /\b(?:in conclusion|to sum up|overall|looking ahead|ultimately)\b/i.test(last);
  if (hasClosingCue || paras.length >= 4 || wordCount < 250) {
    score += 12;
  } else {
    issues.push({
      code: "no_conclusion",
      message: "The ending may need a clearer close. Respond to the prompt without adding a new, unsupported claim.",
      severity: "warning",
      excerpt: issueExcerpt(sentences(last).slice(-1)[0] ?? last),
    });
  }

  if (ss.length > 0 && wordCount / ss.length > 32) {
    score -= 8;
    issues.push({
      code: "run_on_sentences",
      message: `Average sentence length is ${Math.round(wordCount / ss.length)} words. Review sentence boundaries and vary length where it improves clarity.`,
      severity: "info",
      excerpt: issueExcerpt(ss[0] ?? ""),
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
    score = Math.min(score, 45);
    issues.push({
      code: "no_evidence",
      message: "This simple check did not detect a numeric detail. It may miss named evidence; if relevant, clarify a real example and your role without inventing numbers.",
      severity: "warning",
    });
  } else if (density < 1.5) {
    issues.push({
      code: "thin_evidence",
      message: `The check detected ${concrete} numeric detail${concrete === 1 ? "" : "s"}. Named examples may not be detected; review whether your role and evidence are clear, and add numbers only when you can verify them.`,
      severity: "warning",
    });
  }

  const vagueMatches = VAGUE_CLAIMS.flatMap((re) => text.match(re) ?? []);
  const vague = vagueMatches.length;
  if (vague > 0) {
    score = clamp(score - vague * 8, 0, 100);
    issues.push({
      code: "unsupported_adjective",
      message: `${vague} self-description phrase${vague === 1 ? "" : "s"} detected. Consider showing the quality through an action you actually took rather than relying on the label alone.`,
      severity: "warning",
      excerpt: issueExcerpt(vagueMatches[0]),
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
      message: `${clicheCount} common application phrase${clicheCount === 1 ? "" : "s"} detected: ${clicheHits.map((c) => `"${c.phrase}"`).join(", ")}. Replace only those that do not express your specific experience.`,
      severity: clicheCount >= 3 ? "blocker" : "warning",
      excerpt: issueExcerpt(CLICHE_PATTERNS.map((c) => text.match(c.re)?.[0]).find(Boolean) ?? ""),
    });
  }

  const passive = text.match(PASSIVE_RE)?.length ?? 0;
  if (passive / words > 0.02) {
    score -= 8;
    issues.push({
      code: "passive_voice",
      message: `${passive} passive construction${passive === 1 ? "" : "s"} detected. Where accurate, state who performed the action; keep passive voice when the actor is unknown or less relevant.`,
      severity: "info",
      excerpt: issueExcerpt(ss.find((sentence) => new RegExp(PASSIVE_RE.source, "i").test(sentence)) ?? ""),
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
        message: "Sentence lengths are similar. Consider varying them where doing so would make the passage easier to follow.",
        severity: "info",
        excerpt: issueExcerpt(ss.slice(0, 2).join(" ")),
      });
    }
  }

  // Double spaces / repeated words are cheap to catch and look careless.
  const doubled = text.match(/\b(\w+)\s+\1\b/gi)?.length ?? 0;
  if (doubled > 0) {
    score -= Math.min(12, doubled * 4);
    issues.push({
      code: "repeated_word",
      message: `${doubled} repeated word${doubled === 1 ? "" : "s"} detected. Review the quoted passage for an accidental duplicate.`,
      severity: "warning",
      excerpt: issueExcerpt(text.match(/\b(\w+)\s+\1\b/gi)?.[0] ?? ""),
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
    const genericNameWords = new Set(["the", "and", "for", "university", "college", "institute", "school", "of"]);
    const targetWords = target.toLowerCase().match(/[a-z\u0400-\u04ff0-9]+/gi) ?? [];
    const essayWords = new Set(text.toLowerCase().match(/[a-z\u0400-\u04ff0-9]+/gi) ?? []);
    const nameWords = targetWords.filter((word) => !genericNameWords.has(word));
    const mentioned = nameWords.some((word) => essayWords.has(word));
    if (mentioned) score += 20;
    else {
      score -= 25;
      issues.push({
        code: "target_not_named",
        message: `The supplied target name "${target}" was not detected as a whole word. Check whether this prompt asks you to name the university or programme.`,
        severity: "blocker",
      });
    }
  }

  if (opts.type === "why_us") {
    if (!/\b(?:professor|faculty|lab|laboratory|course|module|curriculum|research group)\b/i.test(text)) {
      score -= 15;
      issues.push({
        code: "why_us_generic",
        message: "The check did not detect a specific programme feature. Add one only if it answers the prompt and you have verified it on an official source.",
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
        message: `${words} words against the ${opts.wordLimit}-word limit you entered. Trim the draft to meet the prompt's stated limit.`,
        severity: "blocker",
      });
    } else if (words < opts.wordLimit * 0.6) {
      score -= 12;
      issues.push({
        code: "under_limit",
        message: `${words} of ${opts.wordLimit} allowed words used (${Math.round((words / opts.wordLimit) * 100)}%). Check whether the prompt calls for more development before adding text.`,
        severity: "warning",
      });
    } else {
      score += 8;
    }
  }

  if (["sop", "personal_statement"].includes(opts.type ?? "sop") && !/\b(?:goal|career|after gradua|professionally|aim to|plan to)\b/i.test(text)) {
    score -= 10;
    issues.push({
      code: "no_forward_look",
      message: "A future goal was not detected. Include one only if it is relevant to the prompt, and describe it in your own terms.",
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

  const longFormType = ["sop", "personal_statement"].includes(opts.type ?? "sop");
  if (longFormType && wordCount < 150 && (!opts.wordLimit || opts.wordLimit >= 250)) {
    issues.push({
      code: "too_short",
      message: `This draft has ${wordCount} words. Check the prompt's required length and develop the response with relevant, verified detail if needed.`,
      severity: "blocker",
    });
  }

  // Weighted writing rubric — prompt fit and evidence carry more weight than style.
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
