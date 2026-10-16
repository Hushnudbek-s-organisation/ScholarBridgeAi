/**
 * Priority 4.3 — Inline Sentence Heatmap & 5-Block SOP Structure Radar.
 *
 * Two deterministic readers over an essay the student has already written:
 *
 *  1. `annotateEssay()` classifies every SENTENCE and returns its character
 *     offsets, so EssayRubricStudio can paint the student's own text — red for
 *     AI/generic clichés, amber for weak constructions with no number attached,
 *     emerald for a strong verb plus a quantified result — instead of listing
 *     issues the student has to hunt for.
 *  2. `evaluateSopStructure()` reports which of the five blocks a working SOP
 *     needs are actually present in the draft, with the sentence that satisfied
 *     each one.
 *
 * HONESTY RULES
 * -------------
 *  • Both readers use the SAME pattern vocabulary as the scoring rubric in
 *    `src/lib/essay.ts` (exported from there), so a highlighted sentence and a
 *    rubric deduction never disagree about what counts as a cliché.
 *  • A block is `satisfied` only when the text contains the evidence; a
 *    partially-written draft simply shows fewer green blocks. Nothing is
 *    inferred from the essay's length or from what other students wrote.
 *  • `evidence` is a verbatim excerpt of the student's own sentence, capped,
 *    never a paraphrase that could be mistaken for advice we invented.
 *  • Pure, synchronous, no network, no AI: identical text → identical output.
 */

import {
  ACTIVE_VERBS,
  CLICHE_PATTERNS,
  CONCRETE_MARKERS,
  VAGUE_CLAIMS,
  countWords,
  paragraphs,
} from "./essay";

/* -------------------------------------------------------------------------- */
/* Vocabulary                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Phrases that mark machine-generated or template copy. Kept beside the
 * rubric's own cliché list; the two are merged at read time so a sentence is
 * flagged the same way in both views.
 */
export const AI_CLICHE_PATTERNS: { phrase: string; re: RegExp }[] = [
  { phrase: "delve", re: /\bdelv(?:e|es|ed|ing)\b/gi },
  { phrase: "tapestry", re: /\btapestr(?:y|ies)\b/gi },
  { phrase: "testament", re: /\b(?:a |is a |stands as a )?testament\b/gi },
  { phrase: "ever since I was a child", re: /\bever since (?:i was|my) (?:a )?(?:child|kid|young)\b/gi },
  { phrase: "as an ai", re: /\bas an ai\b|\bai-generated\b/gi },
  { phrase: "in conclusion", re: /\bin conclusion\b/gi },
  { phrase: "embark on a journey", re: /\bembark(?:ed|ing)? (?:on|upon) (?:a|this|my) journey\b/gi },
  { phrase: "unwavering", re: /\bunwavering\b/gi },
  { phrase: "multifaceted", re: /\bmultifaceted\b/gi },
  { phrase: "seamlessly", re: /\bseamless(?:ly)?\b/gi },
  { phrase: "leverage", re: /\bleverag(?:e|es|ed|ing)\b/gi },
  { phrase: "navigating the complexities", re: /\bnavigat(?:e|ing) the complexit(?:y|ies)\b/gi },
];

/** Weak constructions that hide what the student actually did. */
export const WEAK_CONSTRUCTION_PATTERNS: { phrase: string; re: RegExp }[] = [
  { phrase: "was involved in", re: /\b(?:was|were|am|is|are|been|being) involved (?:in|with)\b/gi },
  { phrase: "helped with", re: /\bhelp(?:ed|s|ing)? (?:with|out)\b/gi },
  { phrase: "participated in", re: /\bparticipat(?:ed|es|ing) (?:in|at)\b/gi },
  { phrase: "was responsible for", re: /\b(?:was|were|am|is|are) responsible for\b/gi },
  { phrase: "assisted with", re: /\bassist(?:ed|s|ing) (?:with|in)\b/gi },
  { phrase: "worked on", re: /\bwork(?:ed|s|ing) on\b/gi },
  { phrase: "tried to", re: /\btr(?:ied|y|ies|ying) to\b/gi },
  { phrase: "gained experience in", re: /\bgain(?:ed|s|ing) (?:some |valuable )?experience (?:in|with)\b/gi },
];

/** Quantified evidence: a number with a unit, a percentage, or a named result. */
export const METRIC_PATTERNS: RegExp[] = [
  /\b\d+(?:[.,]\d+)?\s?(?:%|percent)\b/gi,
  /\b(?:usd|\$|€|£|so'm|uzs)\s?\d[\d\s.,]*/gi,
  /\b\d[\d\s.,]*\s?(?:students?|users?|patients?|participants?|samples?|records?|people|teachers?|schools?|households?|farmers?|clients?)\b/gi,
  /\b(?:accuracy|f1|auc|rmse|mae|precision|recall|r2|latency|throughput|error)\s*(?:of|=|:|by)?\s*\d+(?:[.,]\d+)?/gi,
  /\b\d+(?:[.,]\d+)?\s?(?:x|times|fold)[- ]?(?:faster|better|improvement|reduction|increase)?\b/gi,
  /\b(?:first|second|third|1st|2nd|3rd)[ -]place\b/gi,
  /\b(?:published|accepted|indexed|cited|patented|deployed|launched)\b/gi,
];

const ALL_CLICHE_PATTERNS = [...CLICHE_PATTERNS, ...AI_CLICHE_PATTERNS];

function hits(patterns: { phrase: string; re: RegExp }[], sentence: string): string[] {
  const found: string[] = [];
  for (const pattern of patterns) {
    // Fresh regex per sentence: a /g pattern keeps lastIndex between tests.
    const re = new RegExp(pattern.re.source, pattern.re.flags.includes("g") ? "i" : pattern.re.flags);
    const match = sentence.match(re);
    if (match && match[0]) found.push(pattern.phrase);
  }
  return [...new Set(found)];
}

function regexHits(patterns: RegExp[], sentence: string): string[] {
  const found: string[] = [];
  for (const pattern of patterns) {
    const re = new RegExp(pattern.source, "i");
    const match = sentence.match(re);
    if (match && match[0]) found.push(match[0].trim().slice(0, 60));
  }
  return [...new Set(found)].slice(0, 3);
}

function verbHits(sentence: string): string[] {
  const found: string[] = [];
  for (const entry of ACTIVE_VERBS) {
    const re = new RegExp(entry.re.source, "i");
    if (re.test(sentence)) found.push(entry.verb);
  }
  return [...new Set(found)].slice(0, 4);
}

/* -------------------------------------------------------------------------- */
/* 1 — Sentence heatmap                                                        */
/* -------------------------------------------------------------------------- */

export type SentenceTone = "cliche" | "weak" | "strong" | "neutral";

export interface AnnotatedSentence {
  index: number;
  /** Verbatim sentence text. */
  text: string;
  /** Character offsets in the ORIGINAL essay, for exact highlighting. */
  start: number;
  end: number;
  tone: SentenceTone;
  /** Which cliché phrases were found (red). */
  cliches: string[];
  /** Which weak constructions were found (amber). */
  weak: string[];
  /** Strong action verbs found (emerald, together with a metric). */
  verbs: string[];
  /** Quantified evidence found (emerald, together with a strong verb). */
  metrics: string[];
  hasMetric: boolean;
  wordCount: number;
}

export interface EssayAnnotation {
  sentences: AnnotatedSentence[];
  counts: Record<SentenceTone, number> & { total: number };
  /** Share of sentences carrying a strong verb + a metric (0–100, null if none). */
  strongPct: number | null;
  wordCount: number;
}

/**
 * Offset-aware sentence split. `essay.ts` already splits sentences for scoring;
 * this one keeps the character range so the UI can highlight the student's own
 * text rather than a re-typed copy (which would drift as soon as they edit).
 */
export function splitSentencesWithOffsets(text: string): { text: string; start: number; end: number }[] {
  const source = text ?? "";
  const out: { text: string; start: number; end: number }[] = [];
  // A sentence ends at . ! or ? followed by whitespace/newline, or at a newline.
  const re = /[^.!?\n]+[.!?]*(?:\s+|$)|\n+/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    const raw = match[0];
    const trimmed = raw.trim();
    if (!trimmed || /^\n+$/.test(raw)) continue;
    if (trimmed.length < 2) continue;
    const start = match.index + (raw.length - raw.trimStart().length);
    out.push({ text: trimmed, start, end: start + trimmed.length });
    if (re.lastIndex <= match.index) re.lastIndex = match.index + 1; // never stall
  }
  return out;
}

/** Classify one sentence: red beats amber, amber beats emerald. */
export function classifySentence(sentence: string): Omit<AnnotatedSentence, "index" | "text" | "start" | "end"> {
  const cliches = [
    ...hits(ALL_CLICHE_PATTERNS, sentence),
    ...regexHits(VAGUE_CLAIMS, sentence).map((m) => m.toLowerCase()),
  ];
  const weak = hits(WEAK_CONSTRUCTION_PATTERNS, sentence);
  const verbs = verbHits(sentence);
  const metrics = regexHits(METRIC_PATTERNS, sentence);
  const hasMetric = metrics.length > 0;

  let tone: SentenceTone = "neutral";
  if ([...new Set(cliches)].length > 0) tone = "cliche";
  else if (weak.length > 0 && !hasMetric) tone = "weak";
  else if (verbs.length > 0 && hasMetric) tone = "strong";
  else if (weak.length > 0 && verbs.length > 0) tone = "weak";

  return {
    tone,
    cliches: [...new Set(cliches)],
    weak,
    verbs,
    metrics,
    hasMetric,
    wordCount: countWords(sentence),
  };
}

/** Annotate a whole essay for the inline heatmap view. */
export function annotateEssay(text: string): EssayAnnotation {
  const source = text ?? "";
  const sentences = splitSentencesWithOffsets(source).map((piece, index) => ({
    index,
    text: piece.text,
    start: piece.start,
    end: piece.end,
    ...classifySentence(piece.text),
  }));

  const counts = { cliche: 0, weak: 0, strong: 0, neutral: 0, total: sentences.length };
  for (const sentence of sentences) counts[sentence.tone] += 1;

  return {
    sentences,
    counts,
    strongPct: counts.total > 0 ? Math.round((counts.strong / counts.total) * 100) : null,
    wordCount: countWords(source),
  };
}

/* -------------------------------------------------------------------------- */
/* 2 — Five-block SOP structure                                                */
/* -------------------------------------------------------------------------- */

export type SopBlockId =
  | "problem_hook"
  | "academic_rigor"
  | "quantified_evidence"
  | "specific_fit"
  | "return_plan";

/** The five blocks, in the order a reader meets them. */
export const SOP_BLOCKS: { id: SopBlockId; order: number }[] = [
  { id: "problem_hook", order: 1 },
  { id: "academic_rigor", order: 2 },
  { id: "quantified_evidence", order: 3 },
  { id: "specific_fit", order: 4 },
  { id: "return_plan", order: 5 },
];

const BLOCK_DETECTORS: Record<SopBlockId, RegExp[]> = {
  // A specific problem, question or observation — not a generic opening.
  problem_hook: [
    /\b(?:the problem|the question|what struck me|i noticed|i wondered|when i saw|the day|in \d{4})\b/i,
    /[?]\s*$/m,
    /\b\d[\d.,]*\s?(?:%|people|students|cases|families|hectares|km|hours)\b/i,
    /\b(?:my village|my city|my hometown|my region|my family|my school|my university|our clinic|our factory)\b/i,
  ],
  academic_rigor: [
    /\b(?:coursework|curriculum|module|modules|ects|credit hours?|thesis|dissertation|degree|bachelor|master|gpa|laboratory technique|methodology|statistical|calculus|algorithms?|lectures?)\b/i,
    /\b(?:studied|completed|passed|enrolled|specialis|specializ|trained)\b/i,
  ],
  quantified_evidence: [
    /\b(?:research|project|prototype|dataset|experiment|pipeline|model|survey|analysis)\b/i,
  ],
  specific_fit: [
    /\b(?:professor|prof\.|dr\.|faculty|research group|lab(?:oratory)?|chair|supervisor|module|course|seminar|centre|center|institute)\b/i,
    /\b(?:your (?:work|research|group|lab|programme|program|department)|at (?:your|the) university)\b/i,
  ],
  return_plan: [
    /\b(?:return to|back to|in uzbekistan|in my country|my country|home country|after graduation|after completing|career|work as|contribute to|give back)\b/i,
  ],
};

export interface SopBlockStatus {
  id: SopBlockId;
  order: number;
  satisfied: boolean;
  /** Verbatim excerpt of the sentence that satisfied the block (capped). */
  evidence: string | null;
  /** Index of that sentence, so the heatmap can point at it. */
  sentenceIndex: number | null;
  /** Which detector matched — machine-readable, translated by the UI. */
  matchedOn: string | null;
}

export interface SopStructure {
  blocks: SopBlockStatus[];
  satisfiedCount: number;
  total: number;
  /** 0–100 completeness across the five blocks. */
  pct: number;
  wordCount: number;
  /** Blocks still missing, in reading order. */
  missing: SopBlockId[];
}

function excerpt(sentence: string, max = 180): string {
  const flat = sentence.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max).trimEnd()}…` : flat;
}

/**
 * Read the five-block structure of a draft.
 *
 * `universityName` tightens block 4: when the student named a target, the fit
 * block only counts if that name (or a specific faculty/lab/course) appears —
 * a generic "your prestigious university" never satisfies it.
 */
export function evaluateSopStructure(
  text: string,
  options: { universityName?: string | null; programName?: string | null } = {}
): SopStructure {
  const annotation = annotateEssay(text);
  const sentences = annotation.sentences;
  const fullText = text ?? "";
  const university = (options.universityName ?? "").trim();
  const program = (options.programName ?? "").trim();

  const blocks: SopBlockStatus[] = SOP_BLOCKS.map((block) => ({
    id: block.id,
    order: block.order,
    satisfied: false,
    evidence: null,
    sentenceIndex: null,
    matchedOn: null,
  }));

  const setStatus = (id: SopBlockId, sentence: AnnotatedSentence | null, matchedOn: string) => {
    const block = blocks.find((b) => b.id === id);
    if (!block || block.satisfied) return;
    block.satisfied = true;
    block.matchedOn = matchedOn;
    if (sentence) {
      block.evidence = excerpt(sentence.text);
      block.sentenceIndex = sentence.index;
    }
  };

  // --- Block 1 · Problem hook ------------------------------------------------
  // Looked for in the opening third: a hook that arrives in the last paragraph
  // is not a hook. A cliché opening cannot satisfy it either — that is exactly
  // what the heatmap already painted red.
  const openingCount = Math.max(1, Math.min(3, Math.ceil(sentences.length / 4)));
  for (const sentence of sentences.slice(0, openingCount)) {
    if (sentence.tone === "cliche") continue;
    const detectors = BLOCK_DETECTORS.problem_hook;
    for (let i = 0; i < detectors.length; i++) {
      if (detectors[i].test(sentence.text)) {
        setStatus("problem_hook", sentence, `detector_${i}`);
        break;
      }
    }
    if (blocks[0].satisfied) break;
  }

  // --- Block 2 · Academic rigour --------------------------------------------
  for (const sentence of sentences) {
    const detectors = BLOCK_DETECTORS.academic_rigor;
    const matched = detectors.findIndex((re) => re.test(sentence.text));
    if (matched >= 0) {
      setStatus("academic_rigor", sentence, `detector_${matched}`);
      break;
    }
  }

  // --- Block 3 · Quantified research / project ------------------------------
  // Needs BOTH a research/project noun AND a number or a strong verb — that is
  // the difference between "I did research" and "I analysed 1,200 samples".
  for (const sentence of sentences) {
    const hasEvidenceNoun = BLOCK_DETECTORS.quantified_evidence.some((re) => re.test(sentence.text));
    if (!hasEvidenceNoun) continue;
    if (sentence.hasMetric || sentence.verbs.length > 0) {
      setStatus("quantified_evidence", sentence, sentence.hasMetric ? "metric" : "action_verb");
      break;
    }
  }

  // --- Block 4 · Specific faculty / course fit ------------------------------
  const namesTarget = !!university || !!program;
  const targetAppears =
    (!!university && fullText.toLowerCase().includes(university.toLowerCase())) ||
    (!!program && fullText.toLowerCase().includes(program.toLowerCase()));
  for (const sentence of sentences) {
    const detectors = BLOCK_DETECTORS.specific_fit;
    const matched = detectors.findIndex((re) => re.test(sentence.text));
    if (matched < 0) continue;
    // With a named target the sentence must actually mention it (or a named
    // professor / course); without one, a specific faculty reference is enough.
    if (namesTarget && !targetAppears) {
      const namesSomething = /\b(?:professor|prof\.|dr\.)\s+[A-ZÀ-Ý\u0400-\u04FF]/.test(sentence.text);
      if (!namesSomething) continue;
    }
    setStatus("specific_fit", sentence, `detector_${matched}`);
    break;
  }

  // --- Block 5 · Return / career plan ---------------------------------------
  // Read from the last third: a plan stated only at the top is a claim, not a
  // closing intention.
  const closingStart = Math.max(0, sentences.length - Math.max(2, Math.ceil(sentences.length / 3)));
  for (const sentence of sentences.slice(closingStart)) {
    const detectors = BLOCK_DETECTORS.return_plan;
    const matched = detectors.findIndex((re) => re.test(sentence.text));
    if (matched >= 0) {
      setStatus("return_plan", sentence, `detector_${matched}`);
      break;
    }
  }

  const satisfiedCount = blocks.filter((b) => b.satisfied).length;
  return {
    blocks,
    satisfiedCount,
    total: blocks.length,
    pct: Math.round((satisfiedCount / blocks.length) * 100),
    wordCount: countWords(fullText),
    missing: blocks.filter((b) => !b.satisfied).map((b) => b.id),
  };
}

/** Paragraph count, reused by the studio's structure summary. */
export function paragraphCount(text: string): number {
  return paragraphs(text ?? "").length;
}
