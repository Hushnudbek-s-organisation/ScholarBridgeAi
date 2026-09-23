/**
 * Visa Speaking Assistant — shared config & prompt builders.
 *
 * Pure data + string functions with NO server dependencies, so it is safe
 * to import from both Route Handlers and Client Components.
 */

export type VisaOfficerGender = "male" | "female";

export interface VisaCountry {
  code: string;
  name: string;
  flag: string;
  /** Official visa-interview language (human-readable). */
  language: string;
  /** BCP-47 locale for SpeechRecognition + speechSynthesis. */
  locale: string;
  /** Typical consular questions, written IN the interview language. */
  questions: string[];
}

export const VISA_COUNTRIES: VisaCountry[] = [
  {
    code: "US",
    name: "United States",
    flag: "🇺🇸",
    language: "English",
    locale: "en-US",
    questions: [
      "Why do you want to go to the United States?",
      "Why did you choose this university and program?",
      "Who will cover your tuition and living expenses?",
      "What will you do after you finish your studies?",
      "What ties do you have to your home country?",
    ],
  },
  {
    code: "UK",
    name: "United Kingdom",
    flag: "🇬🇧",
    language: "English",
    locale: "en-GB",
    questions: [
      "Why did you choose the UK for your studies?",
      "Why this university and this course?",
      "How will you fund your studies and living costs?",
      "What are your plans after graduation?",
    ],
  },
  {
    code: "CA",
    name: "Canada",
    flag: "🇨🇦",
    language: "English",
    locale: "en-CA",
    questions: [
      "Why do you want to study in Canada?",
      "Why this college and program?",
      "Who is sponsoring your education?",
      "What ties do you have to your home country?",
    ],
  },
  {
    code: "DE",
    name: "Germany",
    flag: "🇩🇪",
    language: "Deutsch",
    locale: "de-DE",
    questions: [
      "Warum möchten Sie in Deutschland studieren?",
      "Warum haben Sie diese Universität gewählt?",
      "Wie finanzieren Sie Ihren Aufenthalt in Deutschland?",
      "Was planen Sie nach dem Studium?",
    ],
  },
  {
    code: "AU",
    name: "Australia",
    flag: "🇦🇺",
    language: "English",
    locale: "en-AU",
    questions: [
      "Why do you want to study in Australia?",
      "Why did you choose this course and provider?",
      "How will you support yourself financially?",
      "Are you a genuine student? Convince me.",
    ],
  },
  {
    code: "SG",
    name: "Singapore",
    flag: "🇸🇬",
    language: "English",
    locale: "en-SG",
    questions: [
      "Why did you choose Singapore?",
      "Why this institution and course?",
      "Who is funding your studies?",
      "What are your plans after graduation?",
    ],
  },
  {
    code: "NL",
    name: "Netherlands",
    flag: "🇳🇱",
    language: "Nederlands",
    locale: "nl-NL",
    questions: [
      "Waarom wilt u in Nederland studeren?",
      "Waarom heeft u voor deze opleiding gekozen?",
      "Hoe gaat u uw studie en verblijf financieren?",
      "Wat zijn uw plannen na uw studie?",
    ],
  },
  {
    code: "CH",
    name: "Switzerland",
    flag: "🇨🇭",
    language: "Deutsch",
    locale: "de-CH",
    questions: [
      "Warum möchten Sie in der Schweiz studieren?",
      "Wie finanzieren Sie Ihren Aufenthalt?",
      "Werden Sie nach dem Studium in Ihr Heimatland zurückkehren?",
    ],
  },
  {
    code: "JP",
    name: "Japan",
    flag: "🇯🇵",
    language: "日本語",
    locale: "ja-JP",
    questions: [
      "なぜ日本で勉強したいのですか。",
      "留学費用は誰が負担しますか。",
      "卒業後の計画を教えてください。",
    ],
  },
  {
    code: "FR",
    name: "France",
    flag: "🇫🇷",
    language: "Français",
    locale: "fr-FR",
    questions: [
      "Pourquoi voulez-vous étudier en France ?",
      "Pourquoi cette université et cette formation ?",
      "Qui financera vos études et votre séjour ?",
      "Que ferez-vous après vos études ?",
    ],
  },
  {
    code: "SE",
    name: "Sweden",
    flag: "🇸🇪",
    language: "Svenska",
    locale: "sv-SE",
    questions: [
      "Varför vill du studera i Sverige?",
      "Varför valde du det här programmet?",
      "Hur ska du finansiera dina studier?",
      "Vad planerar du efter studierna?",
    ],
  },
];

const byCode = new Map(VISA_COUNTRIES.map((c) => [c.code, c]));

export function getVisaCountry(
  code: string | null | undefined,
): VisaCountry | undefined {
  if (!code) return undefined;
  return byCode.get(code.toUpperCase());
}

export interface VisaMessage {
  role: "officer" | "user";
  text: string;
}

export interface VisaApplicantProfile {
  name?: string | null;
  degreeLevel?: string | null;
  targetMajor?: string | null;
}

/**
 * System instruction: the model roleplays a REAL consular officer and
 * speaks strictly in the country's official visa-interview language.
 */
export function buildOfficerSystemPrompt(
  country: VisaCountry,
  gender: VisaOfficerGender,
  profile?: VisaApplicantProfile | null,
): string {
  const officerWord = gender === "female" ? "female" : "male";
  const profileLine =
    profile && (profile.name || profile.degreeLevel || profile.targetMajor)
      ? `APPLICANT FILE (use naturally, do not read aloud): name ${profile.name || "unknown"}, applying for ${profile.degreeLevel || "unknown"} in ${profile.targetMajor || "unknown"}.`
      : "";

  return `You are a REAL consular visa officer at the ${country.name} embassy conducting a student-visa interview. This is a serious roleplay exercise: stay fully in character as a professional, calm, slightly strict officer. Never mention that you are an AI, a language model, or that this is practice.

ABSOLUTE LANGUAGE RULE: conduct the ENTIRE interview ONLY in ${country.language}. Never switch to another language, never translate, never explain in another language. If the applicant answers in a different language, politely insist (in ${country.language}) that they answer in ${country.language}.

You are a ${officerWord} officer — use grammatically correct ${officerWord} forms when referring to yourself if ${country.language} has grammatical gender.

INTERVIEW STYLE:
- Ask ONE short question at a time (1-2 sentences, under 60 words) so it can be read aloud by text-to-speech.
- Begin with a brief formal greeting, then your first question.
- Ask realistic follow-up questions based on the applicant's answers. Probe the classic refusal grounds: unclear study purpose, weak funding proof, weak ties to the home country, immigration intent after studies, inconsistent answers.
- Typical questions asked at this post (use as inspiration, never read as a list):
${country.questions.map((q) => `  - ${q}`).join("\n")}
- Be realistic, not cruel: a neutral tone with short reactions ("I see.", "Understood.") before the next question is fine.
- NEVER coach the applicant, never give sample answers, never reveal any scoring, never end the interview yourself.
- If an answer is vague or suspicious, press once with a sharper follow-up, then move on.
${profileLine}`.trim();
}

export function buildInterviewUserPrompt(
  country: VisaCountry,
  history: VisaMessage[],
): string {
  if (history.length === 0) {
    return `The applicant has just sat down in front of you. Begin the interview now: greet them briefly and ask your first question. Remember: speak ONLY in ${country.language}.`;
  }
  const lines = history.map((m) =>
    m.role === "officer" ? `Officer: ${m.text}` : `Applicant: ${m.text}`,
  );
  return `CONVERSATION SO FAR (oldest to newest):\n${lines.join("\n")}\n\nThe applicant has just answered. React briefly if needed and ask ONE logical follow-up question. Speak ONLY in ${country.language}.`;
}

/** Keep prompts bounded: last N turns, each truncated. */
export function sanitizeHistory(
  messages: unknown,
  maxTurns = 20,
  maxChars = 2000,
): VisaMessage[] {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter(
      (m): m is VisaMessage =>
        !!m &&
        typeof m === "object" &&
        ((m as VisaMessage).role === "officer" ||
          (m as VisaMessage).role === "user") &&
        typeof (m as VisaMessage).text === "string",
    )
    .slice(-maxTurns)
    .map((m) => ({ role: m.role, text: m.text.slice(0, maxChars) }));
}

export function buildAnalysisPrompt(
  country: VisaCountry,
  history: VisaMessage[],
  uiLanguage: string,
): string {
  const transcript =
    history.length === 0
      ? "(The interview ended with no answers.)"
      : history
          .map((m) =>
            m.role === "officer" ? `Officer: ${m.text}` : `Applicant: ${m.text}`,
          )
          .join("\n");

  return `You are an expert visa-interview coach. Analyze the FULL student-visa interview transcript below for a ${country.name} student visa (interview language: ${country.language}).

Score the APPLICANT only, based on their own turns:
- confidence: how clear, direct and self-assured the answers sound (0-100)
- persuasiveness: credible study purpose, convincing funding story, strong ties to home country, clear post-study plans (0-100)
- language_level: grammar, vocabulary and fluency in ${country.language} (0-100)
- estimated_visa_chance: realistic overall approval likelihood combining all signals (0-100)

Fairness rules: the applicant's turns may contain speech-recognition errors — ignore minor transcription artifacts. DO penalize vague, evasive, contradictory or off-topic answers. If there are almost no applicant answers, score near 0 and say the interview was too short.

Respond with JSON ONLY (no markdown, no commentary) in exactly this shape:
{
  "confidence": 0,
  "persuasiveness": 0,
  "language_level": 0,
  "estimated_visa_chance": 0,
  "recommendations": "4-6 short actionable bullet lines written in ${uiLanguage}, each line starting with \\u2022 "
}

TRANSCRIPT:
${transcript}`.trim();
}

export interface VisaAnalysis {
  confidence: number;
  persuasiveness: number;
  language_level: number;
  estimated_visa_chance: number;
  recommendations: string;
}

function clampScore(v: unknown): number {
  const n = typeof v === "number" ? v : Number.parseInt(String(v), 10);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Tolerant JSON extractor for model output (strips fences, finds {...}). */
export function parseAnalysisJson(raw: string): VisaAnalysis | null {
  try {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    const obj = JSON.parse(cleaned.slice(start, end + 1)) as Record<
      string,
      unknown
    >;
    const rec = typeof obj.recommendations === "string" ? obj.recommendations : "";
    if (!rec.trim()) return null;
    return {
      confidence: clampScore(obj.confidence),
      persuasiveness: clampScore(obj.persuasiveness),
      language_level: clampScore(obj.language_level),
      estimated_visa_chance: clampScore(obj.estimated_visa_chance),
      recommendations: rec.slice(0, 2000),
    };
  } catch {
    return null;
  }
}
