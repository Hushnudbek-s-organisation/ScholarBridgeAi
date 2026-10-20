import { callOpenRouterDecision, OPENROUTER_MODELS } from "@/lib/ai/openrouterModels";

export interface BehaviorSignal {
  probabilityPercent: number | null;
  status: "ok" | "fallback";
}

/** Respan signals are labels with probabilities, never generated prose. */
export async function scoreConversationBehaviors(params: {
  transcriptOrText: string;
  behaviors: { key: string; description: string }[];
  profileId?: number | null;
  timeoutMs?: number;
}): Promise<{ model: string; available: boolean; signals: Record<string, BehaviorSignal> }> {
  const model = process.env.OPENROUTER_EVAL_MODEL?.trim() || OPENROUTER_MODELS.evaluation;
  const fallback = Object.fromEntries(params.behaviors.map(({ key }) => [key, { probabilityPercent: null, status: "fallback" as const }]));
  const transcript = params.transcriptOrText.trim().slice(0, 48_000);
  if (!transcript || params.behaviors.length === 0 || params.behaviors.length > 12) {
    return { model, available: false, signals: fallback };
  }
  try {
    const response = await callOpenRouterDecision<{ answers?: Record<string, unknown> }>({
      model,
      state: transcript,
      questions: Object.fromEntries(params.behaviors.map(({ key, description }) => [key, { type: "noul" as const, instructions: description }])),
      timeoutMs: params.timeoutMs ?? 3_500,
    });
    if (!response.answers || typeof response.answers !== "object" || Array.isArray(response.answers)) {
      return { model, available: false, signals: fallback };
    }
    const signals: Record<string, BehaviorSignal> = {};
    for (const behavior of params.behaviors) {
      const raw = response.answers[behavior.key];
      const answer = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
      const probability = typeof answer.noul === "number" ? answer.noul : null;
      signals[behavior.key] = {
        probabilityPercent: probability !== null && Number.isFinite(probability)
          ? Math.round(Math.max(0, Math.min(1, probability)) * 100)
          : null,
        status: probability !== null && Number.isFinite(probability) ? "ok" : "fallback",
      };
    }
    void params.profileId;
    return { model, available: Object.values(signals).some((signal) => signal.status === "ok"), signals };
  } catch {
    return { model, available: false, signals: fallback };
  }
}
