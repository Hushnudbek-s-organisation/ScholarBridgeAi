/**
 * AI Visa Interview scoring (#9) — the deterministic half.
 *
 * The model roleplays the officer and writes feedback prose. It must NOT invent
 * a visa probability: `estimated_visa_chance` from the model is treated as an
 * opinion and is labelled as one, while the rubric below is computed from what
 * the applicant actually said.
 *
 * Consular refusals cluster around a handful of grounds — unclear purpose of
 * study, weak funding, weak home-country ties, immigrant intent. Those are
 * checkable in the transcript.
 *
 * Pure module — asserted in `scripts/check-visa.ts`.
 */

import { compareDegreeLevels } from "./degreeLevels";
import { subjectAffinity } from "./subjectAffinity";

export interface VisaTurn {
  role: "officer" | "user";
  text: string;
}

export interface VisaRubric {
  /** 0–100 per ground, plus an overall readiness score. */
  scores: {
    purposeOfStudy: number;
    funding: number;
    homeTies: number;
    nonImmigrantIntent: number;
    specificity: number;
    languageClarity: number;
    total: number;
  };
  /** Refusal grounds and profile consistency checks the transcript leaves exposed. */
  risks: { code: string; message: string; severity: "high" | "medium" | "low"; params?: Record<string, string | number> }[];
  /** Questions asked but never substantively answered. */
  unanswered: string[];
  /** Deterministic, per-answer evidence and coaching cues from the transcript. */
  turnFeedback: {
    turnNumber: number;
    question: string | null;
    answerExcerpt: string;
    answerWordCount: number;
    evidence: ("purpose" | "funding" | "home_ties" | "specific_detail")[];
    concerns: string[];
  }[];
  answerCount: number;
  averageAnswerWords: number;
}

export interface VisaProfileContext {
  targetMajor?: string | null;
  degreeLevel?: string | null;
  budgetAnnualUsd?: number | null;
  fundingSources?: { name: string; kind: string; amountUsd: number; status?: string }[];
}

export interface VisaScoringOptions {
  /** Where the applicant is from — used for the "ties" ground. */
  homeCountry?: string | null;
  /** Where they plan to study. */
  destination?: string | null;
  /** Signed-in user's saved, self-reported context; never an admission verdict. */
  profile?: VisaProfileContext | null;
}

// --- Signal patterns -------------------------------------------------------

const FUNDING_RE =
  /\b(?:scholarship|grant|sponsor|parents? (?:will|are) (?:pay|fund|cover)|tuition (?:is )?(?:covered|paid)|blocked account|education loan|bank (?:statement|balance)|self[- ]funded|stipend|assistantship|fellowship)\b/i;

const HOME_TIES_RE =
  /\b(?:return (?:to|home)|come back|my family (?:is|lives)|my parents (?:live|are)|job offer|employer|my (?:business|company|position)|property|my country|serve my (?:country|community)|obligation)\b/i;

const IMMIGRANT_INTENT_RE =
  /\b(?:settle (?:down )?(?:there|permanently|in)|stay (?:there )?(?:permanently|forever)|never (?:come|go) back|get (?:a )?(?:green card|permanent residency|citizenship)|move (?:there )?permanently|no plans? to return)\b/i;

const PURPOSE_RE =
  /\b(?:because|specifically|research|professor|course|curriculum|career|goal|specializ|focus(?:ing)? on|prepare(?:s)? me|equip)\b/i;

const VAGUE_RE =
  /\b(?:i don'?t know|maybe|something like that|i guess|whatever|not sure|hard to say|i think so)\b/i;

const CONCRETE_RE = /\b\d+(?:\.\d+)?\s?(?:%|usd|\$|eur|years?|months?|thousand)?\b|\b(?:first|second|third)\b/gi;

const MIN_ANSWER_WORDS = 12;

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

function words(text: string): string[] {
  return text.trim().split(/\s+/).filter((w) => /[a-z\u0400-\u04ff]/i.test(w));
}

/**
 * Officer questions with no substantive applicant reply are the ones that sink
 * an interview — the applicant moves on and the gap shows up in the file.
 */
function findUnanswered(turns: VisaTurn[]): string[] {
  const unanswered: string[] = [];
  turns.forEach((turn, i) => {
    if (turn.role !== "officer") return;
    const reply = turns[i + 1];
    const question = turn.text.trim().replace(/\s+/g, " ");
    if (!reply || reply.role !== "user") {
      if (question.length > 12) unanswered.push(question);
      return;
    }
    if (words(reply.text).length < MIN_ANSWER_WORDS) unanswered.push(question);
  });
  return unanswered.slice(0, 5);
}

function explicitMajorStatement(answer: string): string | null {
  const match = /\b(?:i\s+(?:plan|intend|want|will)\s+to\s+study|my\s+(?:intended\s+)?(?:major|field)(?:\s+of\s+study)?\s+is)\s+(?:a|an|the\s+)?([^.!?;\n]+)/i.exec(answer);
  if (!match) return null;
  return match[1].split(/\b(?:at|because|so that|where)\b/i)[0].trim().slice(0, 100) || null;
}

function explicitDegreeStatement(answer: string): string | null {
  const match = /\b(?:apply(?:ing)?\s+for|plan\s+to\s+pursue|intend\s+to\s+pursue|will\s+pursue|study\s+for|enrol(?:l)?\s+in)\s+(?:an?\s+)?(bachelor(?:'s)?|undergraduate|master(?:'s)?|postgraduate|graduate|doctoral?|doctorate|ph\.?d\.?)\b/i.exec(answer);
  return match?.[1] ?? null;
}

function explicitBudget(answer: string): number | null {
  const match = /\b(?:my\s+(?:annual\s+)?budget|annual\s+budget|i\s+can\s+afford|i\s+have\s+budgeted)\b[^\d$]{0,24}(?:usd\s*)?\$?\s*([\d][\d,]*(?:\.\d+)?)/i.exec(answer);
  if (!match) return null;
  const value = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function primaryFundingSource(profile?: VisaProfileContext | null) {
  return (profile?.fundingSources ?? [])
    .filter((source) => (!source.status || ["confirmed", "awarded"].includes(source.status)) && Number.isFinite(source.amountUsd) && source.amountUsd >= 0)
    .sort((a, b) => b.amountUsd - a.amountUsd || a.name.localeCompare(b.name))[0] ?? null;
}

function fundingSourceMentioned(source: NonNullable<ReturnType<typeof primaryFundingSource>>, text: string): boolean {
  const lower = text.toLocaleLowerCase();
  const nameTokens = source.name.toLocaleLowerCase().match(/[a-z\u0400-\u04ff0-9]+/gi)?.filter((token) => token.length > 3) ?? [];
  if (nameTokens.some((token) => lower.includes(token))) return true;
  const kind = source.kind.toLowerCase();
  if (kind === "scholarship") return /\b(?:scholarship|grant|fellowship|award)\b/i.test(text);
  if (kind === "aid") return /\b(?:financial aid|grant|assistantship|fellowship)\b/i.test(text);
  if (kind === "family") return /\b(?:family|parents?|mother|father|relative|guardian)\b/i.test(text);
  if (kind === "savings") return /\b(?:savings?|bank account|deposit)\b/i.test(text);
  if (kind === "loan") return /\b(?:loan|lender|borrow)\b/i.test(text);
  if (kind === "sponsor") return /\b(?:sponsor|employer|company)\b/i.test(text);
  return false;
}

function buildTurnFeedback(turns: VisaTurn[], profile?: VisaProfileContext | null) {
  const feedback: VisaRubric["turnFeedback"] = [];
  const flags: {
    major?: { profile: string; spoken: string };
    degree?: { profile: string; spoken: string };
    budget?: { profile: number; spoken: number };
    fundingSource?: string;
  } = {};
  const mainSource = primaryFundingSource(profile);
  let sourceMentioned = false;

  turns.forEach((turn, index) => {
    if (turn.role !== "user") return;
    const answer = turn.text.trim();
    const wordCount = words(answer).length;
    const question = [...turns.slice(0, index)].reverse().find((previous) => previous.role === "officer")?.text.trim() ?? null;
    const evidence: VisaRubric["turnFeedback"][number]["evidence"] = [];
    const concerns: string[] = [];
    if (PURPOSE_RE.test(answer)) evidence.push("purpose");
    if (FUNDING_RE.test(answer)) evidence.push("funding");
    if (HOME_TIES_RE.test(answer)) evidence.push("home_ties");
    if (new RegExp(CONCRETE_RE.source, "i").test(answer)) evidence.push("specific_detail");
    if (wordCount < MIN_ANSWER_WORDS) concerns.push("short_answer");
    if (VAGUE_RE.test(answer)) concerns.push("vague_answer");
    if (question && /\b(?:why|programme|program|study|major|course|degree)\b/i.test(question) && !PURPOSE_RE.test(answer)) {
      concerns.push("purpose_not_addressed");
    }
    if (question && /\b(?:fund|pay|cost|tuition|expense|sponsor|money)\b/i.test(question) && !FUNDING_RE.test(answer)) {
      concerns.push("funding_not_addressed");
    }
    if (question && /\b(?:return|home|family|after graduation|ties)\b/i.test(question) && !HOME_TIES_RE.test(answer)) {
      concerns.push("home_ties_not_addressed");
    }

    const spokenMajor = profile?.targetMajor?.trim() ? explicitMajorStatement(answer) : null;
    if (spokenMajor && profile?.targetMajor) {
      const relation = subjectAffinity([profile.targetMajor], spokenMajor);
      if (relation.level === "none") {
        flags.major ??= { profile: profile.targetMajor, spoken: spokenMajor };
        concerns.push("profile_major_conflict");
      }
    }

    const spokenDegree = profile?.degreeLevel?.trim() ? explicitDegreeStatement(answer) : null;
    if (spokenDegree && profile?.degreeLevel && compareDegreeLevels(profile.degreeLevel, spokenDegree) === "mismatch") {
      flags.degree ??= { profile: profile.degreeLevel, spoken: spokenDegree };
      concerns.push("profile_degree_conflict");
    }

    const spokenBudget = profile?.budgetAnnualUsd != null && profile.budgetAnnualUsd > 0 ? explicitBudget(answer) : null;
    if (spokenBudget != null && profile?.budgetAnnualUsd != null && Math.abs(spokenBudget - profile.budgetAnnualUsd) / profile.budgetAnnualUsd >= 0.25) {
      flags.budget ??= { profile: profile.budgetAnnualUsd, spoken: spokenBudget };
      concerns.push("profile_budget_conflict");
    }

    if (mainSource && fundingSourceMentioned(mainSource, answer)) sourceMentioned = true;
    if (mainSource && question && /\b(?:fund|pay|cost|tuition|expense|sponsor|money)\b/i.test(question) && !fundingSourceMentioned(mainSource, answer)) {
      concerns.push("primary_funding_omitted");
    }

    feedback.push({
      turnNumber: feedback.length + 1,
      question: question?.slice(0, 500) ?? null,
      answerExcerpt: answer.slice(0, 260),
      answerWordCount: wordCount,
      evidence,
      concerns: [...new Set(concerns)],
    });
  });

  if (mainSource && !sourceMentioned) flags.fundingSource = mainSource.name;
  return { feedback, flags };
}

export function scoreVisaInterview(turns: VisaTurn[], opts: VisaScoringOptions = {}): VisaRubric {
  const answers = turns.filter((t) => t.role === "user").map((t) => t.text);
  const transcript = answers.join("\n");
  const answerWords = answers.map((a) => words(a).length);
  const answerCount = answers.length;
  const averageAnswerWords = answerCount
    ? Math.round(answerWords.reduce((a, b) => a + b, 0) / answerCount)
    : 0;
  const risks: VisaRubric["risks"] = [];
  const { feedback: turnFeedback, flags: profileFlags } = buildTurnFeedback(turns, opts.profile);

  if (answerCount === 0) {
    return {
      scores: {
        purposeOfStudy: 0,
        funding: 0,
        homeTies: 0,
        nonImmigrantIntent: 0,
        specificity: 0,
        languageClarity: 0,
        total: 0,
      },
      risks: [{ code: "no_answers", message: "No answers were recorded.", severity: "high" }],
      unanswered: findUnanswered(turns),
      turnFeedback,
      answerCount: 0,
      averageAnswerWords: 0,
    };
  }

  // --- Purpose of study ----------------------------------------------------
  const purposeHits = (transcript.match(new RegExp(PURPOSE_RE.source, "gi"))?.length ?? 0);
  const purposeOfStudy = clamp(45 + purposeHits * 7);
  if (purposeOfStudy < 60) {
    risks.push({
      code: "weak_purpose",
      message: "You never explained WHY this programme. Officers refuse on unclear study purpose more than on anything else — name the specialisation and what it leads to.",
      severity: "high",
    });
  }

  // --- Funding -------------------------------------------------------------
  const fundingMentioned = FUNDING_RE.test(transcript);
  const concreteFunding = new RegExp(CONCRETE_RE.source, "i").test(transcript);
  const funding = fundingMentioned ? clamp(60 + (concreteFunding ? 20 : 0)) : 20;
  if (!fundingMentioned) {
    risks.push({
      code: "funding_not_stated",
      message: "Funding was never explained. Say who pays, how much, and what the document is called — a one-sentence answer is enough, silence is not.",
      severity: "high",
    });
  }

  // --- Home-country ties ---------------------------------------------------
  const tiesMentioned = HOME_TIES_RE.test(transcript);
  const homeTies = tiesMentioned ? 72 : 25;
  if (!tiesMentioned) {
    risks.push({
      code: "no_home_ties",
      message: `Nothing in your answers ties you back to ${opts.homeCountry || "your home country"}. A concrete tie — a job offer, family, a business, property — is the single most persuasive thing you can say.`,
      severity: "high",
    });
  }

  // --- Non-immigrant intent ------------------------------------------------
  const intentFlag = IMMIGRANT_INTENT_RE.test(transcript);
  const nonImmigrantIntent = intentFlag ? 15 : 78;
  if (intentFlag) {
    risks.push({
      code: "immigrant_intent",
      message: "You said something that reads as intending to stay permanently. On a student visa that is grounds for refusal — answer about returning, even if your long-term plans are open.",
      severity: "high",
    });
  }

  // --- Specificity ---------------------------------------------------------
  const concrete = transcript.match(new RegExp(CONCRETE_RE.source, "gi"))?.length ?? 0;
  const specificity = clamp(30 + concrete * 8);
  if (concrete === 0) {
    risks.push({
      code: "no_concrete_detail",
      message: "Not one number, date or named thing in your answers. Officers test whether the plan is real — give amounts, dates and names.",
      severity: "medium",
    });
  }

  // --- Language clarity ----------------------------------------------------
  const vague = transcript.match(new RegExp(VAGUE_RE.source, "gi"))?.length ?? 0;
  const tooShort = answerWords.filter((w) => w < MIN_ANSWER_WORDS).length;
  const languageClarity = clamp(85 - vague * 10 - (tooShort / Math.max(1, answerCount)) * 30);
  if (vague > 0) {
    risks.push({
      code: "hedging",
      message: `${vague} hedging phrase${vague === 1 ? "" : "s"} ("maybe", "I don't know"). Hesitation reads as inconsistency to an officer.`,
      severity: "medium",
    });
  }
  if (averageAnswerWords < MIN_ANSWER_WORDS) {
    risks.push({
      code: "answers_too_short",
      message: `Average answer is ${averageAnswerWords} words. One-word answers invite follow-ups you cannot control — aim for 20–60 words.`,
      severity: "medium",
    });
  }

  const unanswered = findUnanswered(turns);
  if (unanswered.length > 0) {
    risks.push({
      code: "unanswered_questions",
      message: `${unanswered.length} question${unanswered.length === 1 ? " was" : "s were"} not substantively answered. Prepare these specifically: "${unanswered[0].slice(0, 80)}"`,
      severity: "medium",
    });
  }

  if (profileFlags.major) {
    risks.push({
      code: "profile_major_conflict",
      message: `Your answer names ${profileFlags.major.spoken}, while your saved profile lists ${profileFlags.major.profile}. Confirm which is current; this tool cannot decide which record is correct.`,
      severity: "medium",
      params: profileFlags.major,
    });
  }
  if (profileFlags.degree) {
    risks.push({
      code: "profile_degree_conflict",
      message: `Your answer describes ${profileFlags.degree.spoken}, while your saved profile lists ${profileFlags.degree.profile}. Confirm the intended degree level.`,
      severity: "medium",
      params: profileFlags.degree,
    });
  }
  if (profileFlags.budget) {
    risks.push({
      code: "profile_budget_conflict",
      message: `Your answer gives an annual budget of ${profileFlags.budget.spoken}, while your profile records ${profileFlags.budget.profile}. Confirm which figure is current.`,
      severity: "medium",
      params: profileFlags.budget,
    });
  }
  if (profileFlags.fundingSource) {
    risks.push({
      code: "primary_funding_omitted",
      message: `Your profile has ${profileFlags.fundingSource} as a confirmed funding source, but it was not identified in your answers. If it is still your main source, explain it and the supporting documents.`,
      severity: "medium",
      params: { source: profileFlags.fundingSource },
    });
  }

  // Weighted: funding, ties and intent are the actual refusal grounds.
  const total = clamp(
    purposeOfStudy * 0.2 +
      funding * 0.2 +
      homeTies * 0.2 +
      nonImmigrantIntent * 0.15 +
      specificity * 0.15 +
      languageClarity * 0.1
  );

  return {
    scores: { purposeOfStudy, funding, homeTies, nonImmigrantIntent, specificity, languageClarity, total },
    risks,
    unanswered,
    turnFeedback,
    answerCount,
    averageAnswerWords,
  };
}

/**
 * The model returns an `estimated_visa_chance`. A consular decision depends on
 * the officer, the post's refusal rate and documents we never see — so this is
 * an opinion, and it must be presented as one rather than as a prediction.
 */
export function visaChanceDisclaimer(modelChance: number | null): string {
  if (typeof modelChance !== "number" || !Number.isFinite(modelChance)) {
    return "No probability is shown: visa decisions depend on the officer, the post and documents this tool cannot see.";
  }
  return `The ${modelChance}% figure is the AI's opinion after reading your answers, not a prediction. Refusal rates vary by post and by officer, and nothing here reflects your actual documents.`;
}
