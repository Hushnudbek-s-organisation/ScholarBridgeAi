/**
 * Backward-compatible wrapper around the AI service layer.
 * Existing routes call `callAI(prompt, systemInstruction)` — this delegates
 * to the provider router and logs usage (spec §16).
 */
import { aiGenerate } from "@/lib/ai/index";
import { normalizeAiReply } from "@/lib/ai/format-reply";
export { isAiConfigured } from "@/lib/ai/index";

/**
 * Text reply for a prompt, or "" when AI is unavailable. Usage (tokens, cost,
 * failures) is recorded by the router against `opts.profileId` — this wrapper
 * no longer writes its own row, so a call is never counted twice.
 */
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
    profileId: opts.profileId ?? null,
  });

  if (!response) return "";

  // Normalize before the text is returned (and persisted): the model can emit
  // HTML entities, literal \n, tables and stray tags — the UI renders the
  // cleaned text, and DB rows (e.g. ai_evaluations) stay clean too.
  // Empty replies stay empty so caller fallbacks keep working.
  return normalizeAiReply(response.text);
}
