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
  const behaviors = Array.isArray(params.behaviors) ? params.behaviors.slice(0, 12) : [];
  const fallback = Object.fromEntries(behaviors.filter((item) => item && typeof item.key === "string").map(({ key }) => [key.slice(0, 100), { probabilityPercent: null, status: "fallback" as const }]));
  const transcript = typeof params.transcriptOrText === "string" ? params.transcriptOrText.trim().slice(0, 48_000) : "";
  if (!transcript || behaviors.length === 0 || params.behaviors.length > 12 || behaviors.some((item) =>
    !item || typeof item.key !== "string" || !item.key.trim() || item.key.length > 100 ||
    typeof item.description !== "string" || !item.description.trim() || item.description.length > 1_000
  )) {
    return { model, available: false, signals: fallback };
  }
  try {
    const response = await callOpenRouterDecision<{ answers?: Record<string, unknown> }>({
      model,
      state: transcript,
      questions: Object.fromEntries(behaviors.map(({ key, description }) => [key.trim(), { type: "noul" as const, instructions: description.trim().slice(0, 1_000) }])),
      timeoutMs: Math.max(250, Math.min(params.timeoutMs ?? 3_500, 3_500)),
      taskType: "behavior_evaluation",
    });
    if (!response.answers || typeof response.answers !== "object" || Array.isArray(response.answers)) {
      return { model, available: false, signals: fallback };
    }
    const signals: Record<string, BehaviorSignal> = {};
    for (const behavior of behaviors) {
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
