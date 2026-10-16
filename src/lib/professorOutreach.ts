/**
 * Feature 5.2 — Cold-Email & Research Professor Outreach Studio.
 *
 * WHY
 * ---
 * For a Master's, PhD or research internship (KAIST, TUM, ETH, NUS, MIT, a
 * Canadian MSc, SINGA, MEXT), writing to a professor is still the single most
 * effective way to reach admission with lab funding. Most students never do it,
 * and the ones who do usually send a 400-word wall of text that a busy group
 * leader deletes. This module builds the email and then grades any email —
 * drafted here or pasted from somewhere else — against the properties that
 * actually get replies.
 *
 * HONESTY RULES
 * -------------
 *  1. The grader is deterministic and transparent: every point is earned by a
 *     named check, and the breakdown is returned so the UI can show WHY the
 *     score is what it is. It is an editorial tool, not a prediction of a
 *     professor's reply — `band` says so in words, and nothing here claims a
 *     reply rate.
 *  2. The builder only writes what the student supplied. An empty field stays
 *     out of the email rather than being padded with an invented achievement.
 *  3. No network, no AI, no per-run randomness: the same input produces the
 *     same subject, body and score (see scripts/check-differentiators.ts).
 */

import { gpaTo40Scale } from "./gpa";

/* -------------------------------------------------------------------------- */
/* Inputs                                                                      */
/* -------------------------------------------------------------------------- */

export interface OutreachInput {
  /** The student's own name. */
  studentName?: string | null;
  /** Current or most recent institution. */
  studentUniversity?: string | null;
  /** e.g. "MSc", "PhD", "Summer research internship". */
  targetLevel?: string | null;
  /** e.g. "Fall 2027", "Summer 2027". */
  targetIntake?: string | null;
  /** Field the student wants to work in. */
  fieldOfStudy?: string | null;

  professorName?: string | null;
  universityName?: string | null;
  labName?: string | null;
  /** The professor's recent paper title or the exact research topic read. */
  paperTitle?: string | null;
  /** One specific thing the student took from that paper. */
  paperInsight?: string | null;

  /** The student's relevant project / thesis, with its outcome. */
  projectTitle?: string | null;
  /** A quantified metric: "94.2% accuracy on 1,200 samples", "$3,100 saved". */
  projectMetric?: string | null;
  /** Technical methods used (Python, PyTorch, PCR, CFD, …). */
  methods?: string | null;

  gpa?: number | null;
  gpaScale?: number | null;
  ielts?: number | null;
  publications?: number | null;
  /** What is attached: CV, transcript, portfolio, code link. */
  attachments?: string[] | null;
}

export interface OutreachSentence {
  /** The job this sentence does — the UI shows it as a numbered checklist. */
  role: "who" | "why_you" | "evidence" | "fit" | "ask" | "close";
  text: string;
}

export interface BuiltColdEmail {
  subject: string;
  body: string;
  greeting: string;
  sentences: OutreachSentence[];
  signOff: string;
  wordCount: number;
  /** Fields the student left empty, so the UI can point at them. */
  missing: string[];
}

/* -------------------------------------------------------------------------- */
/* Builder — six sentences, in order                                           */
/* -------------------------------------------------------------------------- */

const MISSING_LABELS: Record<string, string> = {
  professorName: "professorName",
  universityName: "universityName",
  labName: "labName",
  paperTitle: "paperTitle",
  projectTitle: "projectTitle",
  projectMetric: "projectMetric",
  targetIntake: "targetIntake",
  targetLevel: "targetLevel",
  studentName: "studentName",
  studentUniversity: "studentUniversity",
  fieldOfStudy: "fieldOfStudy",
  methods: "methods",
};

const clean = (value: string | null | undefined): string => (value ?? "").toString().trim();

/** "Prof. Dr. Anna Weber" → "Prof. Weber"; a bare surname keeps its title. */
export function professorSalutation(name: string | null | undefined): string {
  const full = clean(name);
  if (!full) return "Professor";
  const titles = ["prof. dr.", "prof. dr", "professor dr.", "prof.", "professor", "dr.", "dr", "assoc. prof."];
  let rest = full;
  let title = "";
  let changed = true;
  while (changed) {
    changed = false;
    const lower = rest.toLowerCase();
    for (const candidate of titles) {
      if (lower.startsWith(candidate)) {
        title = candidate.endsWith(".") ? candidate : `${candidate}.`;
        rest = rest.slice(candidate.length).trim();
        changed = true;
        break;
      }
    }
  }
  const parts = rest.split(/\s+/).filter(Boolean);
  const surname = parts.length > 0 ? parts[parts.length - 1] : "";
  const normalised = title.startsWith("prof") ? "Prof." : title.startsWith("dr") ? "Dr." : title ? "Prof." : "";
  if (!surname) return normalised || "Professor";
  return normalised ? `${normalised} ${surname}` : `Prof. ${surname}`;
}

/** A subject line a group leader can triage in one glance. */
export function buildSubjectLine(input: OutreachInput): string {
  const level = clean(input.targetLevel) || "Graduate";
  const intake = clean(input.targetIntake);
  const field = clean(input.fieldOfStudy);
  const parts = [`Prospective ${level} Applicant`];
  if (intake) parts.push(intake);
  if (field) parts.push(field);
  const subject = parts.join(" — ");
  // Subject lines over ~78 characters are truncated in most mail clients.
  return subject.length > 78 ? subject.slice(0, 75).trimEnd() + "…" : subject;
}

/** "MSc" → "an MSc", "Master" → "a Master": the article follows the sound. */
function articleFor(noun: string): string {
  const word = noun.trim();
  const first = word.charAt(0).toUpperCase();
  // An acronym read letter-by-letter ("M" = "em", "S" = "es", "P" = "pee").
  // Mixed-case short forms count too — MSc, PhD, MBA — because nobody says
  // "misk" or "phud".
  const uppercaseLetters = (word.match(/[A-Z]/g) ?? []).length;
  const isAcronym = word.length <= 5 && uppercaseLetters >= 2 && /^[A-Z]/.test(word);
  const vowelSoundLetters = new Set(["A", "E", "F", "H", "I", "L", "M", "N", "O", "R", "S", "X"]);
  if (isAcronym) return vowelSoundLetters.has(first) ? "an" : "a";
  return /^[AEIOUaeiou]/.test(word) ? "an" : "a";
}

/**
 * Build the six-sentence email. Only supplied facts are written; a missing
 * field drops its clause instead of being filled with a guess.
 */
export function buildColdEmail(input: OutreachInput): BuiltColdEmail {
  const fields = input as unknown as Record<string, string | null | undefined>;
  const missing = Object.entries(MISSING_LABELS)
    .filter(([key]) => !clean(fields[key]))
    .map(([, label]) => label);

  const salutation = professorSalutation(input.professorName);
  const greeting = `Dear ${salutation},`;

  const level = clean(input.targetLevel) || "graduate";
  const intake = clean(input.targetIntake);
  const field = clean(input.fieldOfStudy);
  const sentences: OutreachSentence[] = [];

  // 1 — who I am, and what I am asking about (never buried at the end).
  const whoBits = [
    clean(input.studentName) ? `my name is ${clean(input.studentName)}` : "I am writing to you",
    clean(input.studentUniversity) ? `a final-year student at ${clean(input.studentUniversity)}` : "",
    field ? `working in ${field}` : "",
  ].filter(Boolean);
  sentences.push({
    role: "who",
    text: `First, ${whoBits.join(", ")}${intake ? `: I am applying for ${articleFor(level)} ${level} position starting ${intake}` : `: I am applying for ${articleFor(level)} ${level} position`}.`,
  });

  // 2 — why this professor: the paper or lab, named specifically.
  const paper = clean(input.paperTitle);
  const lab = clean(input.labName);
  const insight = clean(input.paperInsight);
  if (paper || lab) {
    const what = paper ? `your paper "${paper}"` : lab ? `the work of the ${lab}` : "";
    sentences.push({
      role: "why_you",
      text: `I read ${what}${insight ? `, and ${insight}` : lab && paper ? `, which is the direction I want to work in` : ""}${
        !insight && paper ? ", which is the direction I want to work in" : ""
      }.`,
    });
  }

  // 3 — evidence: what I have actually done, with its number.
  const project = clean(input.projectTitle);
  const metric = clean(input.projectMetric);
  if (project || metric) {
    const methods = clean(input.methods);
    sentences.push({
      role: "evidence",
      text: `My own work: ${project || "a research project"}${methods ? `, built with ${methods}` : ""}${
        metric ? ` — ${metric}` : ""
      }.`,
    });
  }

  // 4 — fit: the measurable academic record, only what exists.
  const gpa4 = gpaTo40Scale(input.gpa, input.gpaScale);
  const fitBits: string[] = [];
  if (gpa4 != null) {
    fitBits.push(
      input.gpaScale != null && Number(input.gpaScale) !== 4
        ? `a GPA of ${Number(input.gpa).toFixed(2)}/${Number(input.gpaScale)} (${gpa4.toFixed(2)}/4.00)`
        : `a GPA of ${gpa4.toFixed(2)}/4.00`
    );
  }
  if (input.ielts != null) fitBits.push(`IELTS ${Number(input.ielts).toFixed(1)}`);
  if (input.publications != null && Number(input.publications) > 0) {
    fitBits.push(`${Number(input.publications)} publication${Number(input.publications) === 1 ? "" : "s"}`);
  }
  if (fitBits.length) {
    sentences.push({
      role: "fit",
      text: `On the academic side I bring ${fitBits.join(", ")}, and I would like to apply that preparation inside ${
        lab ? `the ${lab}` : clean(input.universityName) ? `your group at ${clean(input.universityName)}` : "your group"
      }.`,
    });
  }

  // 5 — the ask: one concrete question, one small commitment.
  sentences.push({
    role: "ask",
    text: `Are you taking ${level} students${intake ? ` for ${intake}` : ""}? If so, I would be grateful for fifteen minutes of your time, or for a pointer to the right person or portal to apply through.`,
  });

  // 6 — close: what is attached, and thanks.
  const attachments = (input.attachments ?? []).map(clean).filter(Boolean);
  sentences.push({
    role: "close",
    text: `I have attached ${attachments.length ? attachments.join(", ") : "my CV and transcript"}, and I am happy to send anything else that would help.`,
  });

  const signOff = clean(input.studentName)
    ? `Thank you for your time.\n\nKind regards,\n${clean(input.studentName)}`
    : `Thank you for your time.\n\nKind regards,\n[Your name]`;

  const body = [greeting, "", sentences.map((sentence) => sentence.text).join("\n\n"), "", signOff].join("\n");

  return {
    subject: buildSubjectLine(input),
    body,
    greeting,
    sentences,
    signOff,
    wordCount: countWords(body),
    missing,
  };
}

/* -------------------------------------------------------------------------- */
/* Grader — 0 to 100                                                           */
/* -------------------------------------------------------------------------- */

export function countWords(text: string): number {
  return (text ?? "").trim().split(/\s+/).filter((w) => w.replace(/[^\p{L}\p{N}]/gu, "").length > 0).length;
}

/** Words per paragraph that still read as "short" to a busy academic. */
export const COLD_EMAIL_WORD_TARGET = { min: 130, ideal: 210, long: 260 } as const;

export type ColdEmailCheckId =
  | "length"
  | "subject_specific"
  | "paper_or_lab_cited"
  | "quantified_metric"
  | "attachment_mentioned"
  | "clear_ask"
  | "salutation_and_signoff";

export interface ColdEmailCheck {
  id: ColdEmailCheckId;
  /** Points available for this check. */
  weight: number;
  /** Points earned. */
  earned: number;
  passed: boolean;
  /** Machine-readable detail so the UI can translate it. */
  detail: { wordCount?: number; matched?: string[]; longestParagraph?: number };
}

export interface ColdEmailPenalty {
  id: string;
  points: number;
  matched: string;
}

export interface ColdEmailGrade {
  score: number;
  /** `strong` ≥ 80 · `solid` ≥ 60 · `needs_work` ≥ 40 · `weak` < 40 */
  band: "strong" | "solid" | "needs_work" | "weak";
  rawScore: number;
  wordCount: number;
  checks: ColdEmailCheck[];
  penalties: ColdEmailPenalty[];
  /** Check ids that failed, in the order the UI should list them. */
  toFix: ColdEmailCheckId[];
}

/** Deterministic metric detector: numbers with a unit or a quantifier. */
const METRIC_PATTERNS: RegExp[] = [
  /\b\d+(?:[.,]\d+)?\s?%/,
  /\b\d+(?:[.,]\d+)?\s?(?:usd|eur|gbp|\$|€|£)\b/i,
  /\b(?:gpa|ielts|toefl|sat|gre|act)\s*(?:of|:)?\s*\d+(?:[.,]\d+)?/i,
  /\b\d+(?:[.,]\d+)?\s*(?:samples?|participants?|users?|patients?|records?|rows?|students?|patients|images?|documents?)\b/i,
  /\b(?:accuracy|f1|auc|rmse|mae|precision|recall|r2)\s*(?:of|=|:)?\s*\d+(?:[.,]\d+)?/i,
  /\b\d+\s*(?:ieee|acm|arxiv|springer|elsevier)\b/i,
  /\b(?:ieee|acm|arxiv|github|doi)\b/i,
  /\b\d+(?:st|nd|rd|th)\s*(?:author|place|rank)/i,
  /\b(?:published|accepted|cited)\b/i,
];

const ATTACHMENT_PATTERNS: RegExp[] = [
  /\b(?:attached|attachment|enclosed|enclose|attaching)\b/i,
  /\b(?:cv|curriculum vitae|resume|résumé|transcript|transcripts|portfolio)\b/i,
];

const ASK_PATTERNS: RegExp[] = [
  /\?\s*$/,
  /\bare you (?:taking|accepting|admitting|recruiting|hiring)\b/i,
  /\b(?:would you be|could you|may i|might i)\b/i,
  /\b(?:fifteen|15|twenty|20|30|thirty)\s*(?:minutes|mins?|min)\b/i,
  /\b(?:brief (?:call|meeting|chat)|short (?:call|meeting|chat))\b/i,
];

const SUBJECT_SPECIFIC_PATTERNS: RegExp[] = [
  /\bprospective\b/i,
  /\b(?:msc|m\.?sc\.?|ph\.?d|doctoral|master|undergraduate|bachelor|research(?:er)?|intern(?:ship)?)\b/i,
  /\b(?:fall|spring|summer|winter|autumn)\s*\d{4}\b/i,
  /\b\d{4}\b/,
];

/** Phrases that cost points: they read as mass-mailing or as filler. */
const PENALTY_PATTERNS: { id: string; points: number; re: RegExp }[] = [
  { id: "dear_sir_madam", points: 8, re: /\bdear\s+(?:sir|madam|sir\/madam|to whom it may concern)\b/i },
  { id: "no_name_professor", points: 6, re: /\bdear\s+professor\s*[,.!]/i },
  { id: "passionate_filler", points: 5, re: /\b(?:i am (?:very |deeply |extremely )?passionate about|my passion for)\b/i },
  { id: "cliche_delve", points: 5, re: /\b(?:delve|tapestry|testament|realm of|in today's (?:fast-paced|ever-evolving) world)\b/i },
  { id: "do_the_needful", points: 5, re: /\b(?:do the needful|kindly revert|revert back|looking forward to your kind response)\b/i },
  { id: "funding_first", points: 6, re: /\b(?:full(?:y)? funded|funding|stipend|scholarship|assistantship)\b[^\n]{0,60}\b(?:available|offer|provide|give)\b/i },
  { id: "shouting", points: 4, re: /(?:!{2,}|\b[A-Z]{6,}\b)/ },
  { id: "mass_mail", points: 10, re: /\b(?:any university|whichever|your esteemed|esteemed institution|your prestigious)\b/i },
];

/** A single paragraph longer than this reads as a wall of text. */
export const MAX_PARAGRAPH_WORDS = 90;

function paragraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function sentencesOf(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'“])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}

function scoreBand(score: number): ColdEmailGrade["band"] {
  if (score >= 80) return "strong";
  if (score >= 60) return "solid";
  if (score >= 40) return "needs_work";
  return "weak";
}

/**
 * Grade a cold email 0–100. Seven weighted checks minus explicit penalties.
 * The subject line and the body are graded together, because a professor reads
 * the subject first and decides there whether to open the rest.
 */
export function gradeColdEmail(subject: string, body: string): ColdEmailGrade {
  const subjectText = clean(subject);
  const bodyText = clean(body);
  const combined = `${subjectText}\n${bodyText}`;
  const wordCount = countWords(bodyText);
  const checks: ColdEmailCheck[] = [];

  // 1 — length (20 points): 130–210 words is the target band; under 90 reads
  // as a note with no evidence, over 260 reads as a wall of text.
  const lengthEarned = (() => {
    if (wordCount >= COLD_EMAIL_WORD_TARGET.min && wordCount <= COLD_EMAIL_WORD_TARGET.ideal) return 20;
    if (wordCount > COLD_EMAIL_WORD_TARGET.ideal && wordCount <= COLD_EMAIL_WORD_TARGET.long) {
      // Still readable: lose points linearly up to the hard ceiling.
      const over = wordCount - COLD_EMAIL_WORD_TARGET.ideal;
      return Math.max(6, Math.round(20 - (over / (COLD_EMAIL_WORD_TARGET.long - COLD_EMAIL_WORD_TARGET.ideal)) * 14));
    }
    if (wordCount > COLD_EMAIL_WORD_TARGET.long) return 0;
    if (wordCount >= 90) return 12; // short but has some substance
    if (wordCount >= 40) return 6;
    return 0;
  })();
  checks.push({
    id: "length",
    weight: 20,
    earned: lengthEarned,
    passed: lengthEarned >= 16,
    detail: { wordCount },
  });

  // 2 — specific subject line (15 points): names the applicant type and an
  // intake or year, and stays short enough not to be truncated.
  const subjectHits = SUBJECT_SPECIFIC_PATTERNS.filter((re) => re.test(subjectText)).length;
  const subjectWords = countWords(subjectText);
  const subjectEarned = (() => {
    if (!subjectText) return 0;
    let pts = 0;
    if (subjectHits >= 1) pts += 7;
    if (subjectHits >= 2) pts += 5;
    if (subjectWords >= 3 && subjectWords <= 12) pts += 3;
    return Math.min(15, pts);
  })();
  checks.push({
    id: "subject_specific",
    weight: 15,
    earned: subjectEarned,
    passed: subjectEarned >= 12,
    detail: { wordCount: subjectWords },
  });

  // 3 — the paper or lab is actually cited (20 points). This is the check that
  // separates a targeted email from a copy-paste campaign.
  const citesPaper = /\b(?:paper|article|publication|preprint|study|journal|proceedings|ieee|arxiv|doi)\b/i.test(bodyText);
  const citesLab = /\b(?:lab|laboratory|group|team|centre|center|institute|chair|department)\b/i.test(bodyText);
  const citesReading = /\b(?:i read|i recently read|after reading|your work on|your research on|your recent)\b/i.test(bodyText);
  const matched: string[] = [];
  if (citesReading) matched.push("explicit_reading");
  if (citesPaper) matched.push("paper");
  if (citesLab) matched.push("lab");
  const citationEarned = Math.min(20, (citesReading ? 8 : 0) + (citesPaper ? 7 : 0) + (citesLab ? 5 : 0));
  checks.push({
    id: "paper_or_lab_cited",
    weight: 20,
    earned: citationEarned,
    passed: citationEarned >= 12,
    detail: { matched },
  });

  // 4 — a quantified metric about the student (15 points).
  const metricHits = METRIC_PATTERNS.filter((re) => re.test(combined));
  const metricEarned = metricHits.length >= 3 ? 15 : metricHits.length === 2 ? 11 : metricHits.length === 1 ? 6 : 0;
  checks.push({
    id: "quantified_metric",
    weight: 15,
    earned: metricEarned,
    passed: metricEarned >= 11,
    detail: { matched: metricHits.slice(0, 3).map((re) => (combined.match(re)?.[0] ?? "").trim()).filter(Boolean) },
  });

  // 5 — CV / transcript attachment mentioned (10 points).
  const attachmentHits = ATTACHMENT_PATTERNS.filter((re) => re.test(bodyText));
  const attachmentEarned = attachmentHits.length >= 2 ? 10 : attachmentHits.length === 1 ? 6 : 0;
  checks.push({
    id: "attachment_mentioned",
    weight: 10,
    earned: attachmentEarned,
    passed: attachmentEarned >= 10,
    detail: { matched: attachmentHits.slice(0, 2).map((re) => (bodyText.match(re)?.[0] ?? "").trim().toLowerCase()).filter(Boolean) },
  });

  // 6 — one clear ask (10 points): a question or a small, concrete request.
  const askHits = ASK_PATTERNS.filter((re) => re.test(bodyText) || (re.source === "\\?\\s*$" && sentencesOf(bodyText).some((s) => re.test(s))));
  const askEarned = askHits.length >= 2 ? 10 : askHits.length === 1 ? 7 : 0;
  checks.push({
    id: "clear_ask",
    weight: 10,
    earned: askEarned,
    passed: askEarned >= 7,
    detail: { matched: [] },
  });

  // 7 — proper salutation and sign-off (10 points): a named professor and a
  // closing line, which is what makes it read as a letter and not a form.
  const hasSalutation = /^(?:dear|hello|good (?:morning|afternoon|evening))\b/im.test(bodyText);
  const hasNamedSalutation = /^(?:dear|hello)\s+(?:prof(?:essor)?\.?|dr\.?|assoc\.?\s*prof\.?)\s+[A-ZÀ-Ý\u0400-\u04FF]/im.test(bodyText);
  const hasSignOff = /\b(?:kind regards|best regards|sincerely|respectfully|with gratitude|thank you for your time)\b/i.test(bodyText);
  const courtesyEarned = (hasSalutation ? 3 : 0) + (hasNamedSalutation ? 4 : 0) + (hasSignOff ? 3 : 0);
  checks.push({
    id: "salutation_and_signoff",
    weight: 10,
    earned: Math.min(10, courtesyEarned),
    passed: courtesyEarned >= 10,
    detail: { matched: [] },
  });

  // Penalties: the structural one first (a single paragraph that runs longer
  // than MAX_PARAGRAPH_WORDS), then the phrase list. Each penalty is reported
  // with the text it matched so the student can find and fix it.
  const penalties: ColdEmailPenalty[] = [];
  const longestParagraph = Math.max(0, ...paragraphs(bodyText).map(countWords));
  if (longestParagraph > MAX_PARAGRAPH_WORDS) {
    penalties.push({ id: "wall_paragraph", points: 6, matched: `${longestParagraph} words in one paragraph` });
  }
  for (const pattern of PENALTY_PATTERNS) {
    const hit = bodyText.match(pattern.re) ?? subjectText.match(pattern.re);
    if (hit) penalties.push({ id: pattern.id, points: pattern.points, matched: hit[0].slice(0, 60) });
  }

  const rawScore = checks.reduce((sum, c) => sum + c.earned, 0) - penalties.reduce((sum, p) => sum + p.points, 0);
  const score = Math.max(0, Math.min(100, rawScore));

  return {
    score,
    band: scoreBand(score),
    rawScore,
    wordCount,
    checks,
    penalties,
    toFix: checks.filter((c) => !c.passed).map((c) => c.id),
  };
}

/** The word band the student should aim for, for display in the studio. */
export const COLD_EMAIL_LENGTH_HINT = {
  targetMin: COLD_EMAIL_WORD_TARGET.min,
  targetMax: COLD_EMAIL_WORD_TARGET.ideal,
  hardMax: COLD_EMAIL_WORD_TARGET.long,
} as const;
