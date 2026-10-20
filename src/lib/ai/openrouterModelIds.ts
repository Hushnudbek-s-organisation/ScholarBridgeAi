/** Central OpenRouter model IDs used by server routes, AI routing, and Admin UI. */
export const OPENROUTER_MODEL_IDS = {
  chat: "minimax/minimax-m3.1-flash:free",
  speech: "fish-audio/s2.1-pro-free:free",
  textEmbedding: "nvidia/nemotron-3-embed-1b:free",
  multimodalEmbedding: "nvidia/llama-nemotron-embed-vl-1b-v2:free",
  decisions: "inception/mercury-decide:free",
  evaluation: "respan/span-01-lite:free",
} as const;
