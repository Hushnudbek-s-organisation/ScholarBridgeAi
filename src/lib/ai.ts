/**
 * Backward-compatible wrapper around the AI service layer.
 * Existing routes call `callAI(prompt, systemInstruction)` — this delegates
 * to the provider router and logs usage (spec §16).
 */
import { aiGenerate } from "@/lib/ai/index";
import { normalizeAiReply } from "@/lib/ai/format-reply";
import { logAIUsage } from "@/lib/ai/usage";

export { isAiConfigured } from "@/lib/ai/index";

export async function callAI(
  prompt: string,
  systemInstruction?: string,
  opts: { taskType?: string; profileId?: number | null } = {}
): Promise<string> {
  const taskType = opts.taskType || "general";
  const response = await aiGenerate({
    prompt,
    systemInstruction,
    taskType,
  });

  if (!response) return "";

  // Normalize before the text is returned (and persisted): the model can emit
  // HTML entities, literal \n, tables and stray tags — the UI renders the
  // cleaned text, and DB rows (e.g. ai_evaluations) stay clean too.
  // Empty replies stay empty so caller fallbacks keep working.
  const reply = normalizeAiReply(response.text);

  try {
    await logAIUsage({
      profileId: opts.profileId ?? null,
      taskType,
      provider: response.provider,
      model: response.model,
      promptTokens: response.promptTokens,
      completionTokens: response.completionTokens,
      costEstimate: response.costEstimate,
      status: "success",
    });
  } catch (err) {
    console.error("Failed to log AI usage:", err);
  }

  return reply;
}
