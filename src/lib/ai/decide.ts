import { callOpenRouterDecision, OPENROUTER_MODELS } from "@/lib/ai/openrouterModels";

export interface MercuryQuestion {
  key: string;
  question: string;
  type: "yes_no" | "score";
}

export interface MercurySignal {
  probabilityPercent: number | null;
  score: number | null;
  status: "ok" | "fallback";
}

/**
 * Typed Mercury decisions. On provider failure the helper returns null signals
 * rather than invented confidence; callers can keep their deterministic rule
 * or rubric in the response and render the model signal as unavailable.
 */
export async function runMercuryDecision(params: {
  state: string;
  questions: MercuryQuestion[];
  profileId?: number | null;
  timeoutMs?: number;
}): Promise<{ model: string; available: boolean; signals: Record<string, MercurySignal> }> {
  const model = process.env.OPENROUTER_DECISION_MODEL?.trim() || OPENROUTER_MODELS.decisions;
  const timeoutMs = Math.max(250, Math.min(params.timeoutMs ?? 3_500, 3_500));
  const fallback = Object.fromEntries(params.questions.map(({ key }) => [key, { probabilityPercent: null, score: null, status: "fallback" as const }]));
  const state = typeof params.state === "string" ? params.state.trim().slice(0, 48_000) : "";
  if (!state || params.questions.length === 0 || params.questions.length > 12 || params.questions.some((q) =>
    !q || typeof q.key !== "string" || !q.key.trim() || q.key.length > 100 ||
    typeof q.question !== "string" || !q.question.trim() || q.question.length > 1_000 ||
    (q.type !== "yes_no" && q.type !== "score")
  )) {
    return { model, available: false, signals: fallback };
  }
  const questions = Object.fromEntries(params.questions.map((question) => [
    question.key.trim(),
    question.type === "yes_no"
      ? { type: "noul" as const, instructions: question.question.trim().slice(0, 1_000) }
      : { type: "score" as const, instructions: question.question.trim().slice(0, 1_000), criteria: ["0", "25", "50", "75", "100"] },
  ]));
  try {
    const response = await callOpenRouterDecision<{ answers?: Record<string, unknown> }>({
      model,
      state,
      questions,
      timeoutMs,
      taskType: "mercury_decision",
    });
    if (!response.answers || typeof response.answers !== "object" || Array.isArray(response.answers)) {
      return { model, available: false, signals: fallback };
    }
    const signals: Record<string, MercurySignal> = {};
    for (const question of params.questions) {
      const raw = response.answers[question.key];
      const answer = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
      const rawProbability = typeof answer.noul === "number" ? answer.noul : typeof answer.confidence === "number" ? answer.confidence : null;
      const rawScore = typeof answer.score === "number" ? answer.score : typeof answer.choice === "string" ? Number(answer.choice) : null;
      const validProbability = rawProbability !== null && Number.isFinite(rawProbability);
      const validScore = rawScore !== null && Number.isFinite(rawScore);
      signals[question.key] = {
        probabilityPercent: question.type === "yes_no" && validProbability
          ? Math.round(Math.max(0, Math.min(1, rawProbability)) * 100)
          : null,
        score: question.type === "score" && validScore
          ? Math.round(Math.max(0, Math.min(100, rawScore)))
          : null,
        status: (question.type === "yes_no" ? validProbability : validScore) ? "ok" : "fallback",
      };
    }
    void params.profileId;
    return { model, available: Object.values(signals).some((signal) => signal.status === "ok"), signals };
  } catch {
    return { model, available: false, signals: fallback };
  }
}
