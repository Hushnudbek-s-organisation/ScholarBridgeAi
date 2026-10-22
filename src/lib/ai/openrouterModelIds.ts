/**
 * OpenRouter models used by repository AI paths. Exact model cards and endpoint
 * docs were checked on 2026-10-21. `official_docs` confirms the documented
 * model/endpoint/modality pairing only; it is not a live credential test or an
 * availability guarantee. Catalog pages and free-tier terms can change.
 */
export type OpenRouterModelKey =
  | "chat"
  | "speech"
  | "textEmbedding"
  | "multimodalEmbedding"
  | "decisions"
  | "evaluation";

export type OpenRouterModelCapability = {
  modelId: string;
  task: string;
  endpoint: string;
  modality: string;
  timeoutMs: number;
  maxInput: string;
  output: string;
  fallback: string;
  optional: boolean;
  modelEnvVar: string;
  verification: "official_docs";
  sourceUrl: string;
  operationalNote: string;
  sensitiveDataWarning?: string;
};

/**
 * Stable named IDs for integrations/tests that need a particular OpenRouter path.
 * These are identifiers, not a promise that the provider keeps them available.
 */
export const OPENROUTER_DEFAULT_CHAT_MODEL = "minimax/minimax-m3.1-flash:free";
export const OPENROUTER_DEFAULT_SPEECH_MODEL = "fish-audio/s2.1-pro-free:free";
export const OPENROUTER_DEFAULT_TEXT_EMBEDDING_MODEL = "nvidia/nemotron-3-embed-1b:free";
export const OPENROUTER_DEFAULT_MULTIMODAL_EMBEDDING_MODEL = "nvidia/llama-nemotron-embed-vl-1b-v2:free";
export const OPENROUTER_DEFAULT_DECISIONS_MODEL = "inception/mercury-decide:free";
export const OPENROUTER_DEFAULT_EVALUATION_MODEL = "respan/span-01-lite:free";

/** Ordered free chat candidates. These OpenRouter cards listed $0 pricing when checked 2026-10-22. */
export const OPENROUTER_FREE_CHAT_FALLBACK_MODELS = [
  OPENROUTER_DEFAULT_CHAT_MODEL,
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-3-27b-it:free",
  "qwen/qwen3-32b:free",
  "deepseek/deepseek-chat-v3-0324:free",
] as const;

/** One typed source of truth for requested IDs and their distinct endpoint intent. */
export const OPENROUTER_MODEL_REGISTRY = {
  chat: {
    modelId: OPENROUTER_DEFAULT_CHAT_MODEL,
    task: "general reasoning, adviser and essay chat",
    endpoint: "/api/v1/chat/completions",
    modality: "text and multimodal model; this application sends text → text",
    timeoutMs: 60_000,
    maxInput: "Route-specific; AI guard clamps text fields (SOP up to 40,000 characters)",
    output: "OpenAI-compatible choices[0].message.content + optional usage metadata",
    fallback: "Configured central-router fallback; otherwise each caller's deterministic/local fallback",
    optional: false,
    modelEnvVar: "OPENROUTER_MODEL",
    verification: "official_docs",
    sourceUrl: "https://openrouter.ai/minimax/minimax-m3.1-flash:free",
    operationalNote: "Official card says this free launch variant retires 2026-10-22 12:00 UTC; do not silently switch to the paid base model.",
  },
  speech: {
    modelId: OPENROUTER_DEFAULT_SPEECH_MODEL,
    task: "visa officer neural speech",
    endpoint: "/api/v1/audio/speech",
    modality: "text input → raw audio stream (MP3 requested)",
    timeoutMs: 4_500,
    maxInput: "4,096 characters per request; response capped at 8 MiB",
    output: "Non-empty audio/mpeg (or application/octet-stream) bytes",
    fallback: "Browser speech synthesis; no automatic second-provider/model attempt",
    optional: true,
    modelEnvVar: "OPENROUTER_TTS_MODEL",
    verification: "official_docs",
    sourceUrl: "https://openrouter.ai/fish-audio/s2.1-pro-free:free",
    operationalNote: "OpenRouter describes the free model as for testing/prototyping/low-volume only, with no production latency or availability guarantees.",
  },
  textEmbedding: {
    modelId: OPENROUTER_DEFAULT_TEXT_EMBEDDING_MODEL,
    task: "semantic text ranking for university, scholarship and opportunity search",
    endpoint: "/api/v1/embeddings",
    modality: "text input → numeric vectors",
    timeoutMs: 3_500,
    maxInput: "64 items, at most 12,000 characters each; ranking sends at most 63 candidates + query",
    output: "data[].embedding numeric vectors; local cosine similarity ordering",
    fallback: "Existing deterministic lexical/profile ranking; embedding failure is best-effort",
    optional: true,
    modelEnvVar: "OPENROUTER_EMBEDDING_MODEL",
    verification: "official_docs",
    sourceUrl: "https://openrouter.ai/nvidia/nemotron-3-embed-1b:free",
    operationalNote: "The repository blocks this free trial model by default; remote use requires a reviewed non-free model plus OPENROUTER_ALLOW_REMOTE_EMBEDDINGS=true.",
    sensitiveDataWarning: "NVIDIA's OpenRouter card warns free-endpoint inputs are logged for service improvement and says not to upload personal or confidential data.",
  },
  multimodalEmbedding: {
    modelId: OPENROUTER_DEFAULT_MULTIMODAL_EMBEDDING_MODEL,
    task: "optional document-readiness similarity using metadata/text and optional image input",
    endpoint: "/api/v1/embeddings",
    modality: "text, image, or combined document input → numeric vectors",
    timeoutMs: 3_500,
    maxInput: "12,000 text characters; HTTPS image URL or PNG/JPEG/WebP data URI up to 5,500,000 characters",
    output: "data[].embedding numeric vectors compared with seven text-only reference vectors",
    fallback: "Metadata-only readiness label or unavailable advisory; never document verification",
    optional: true,
    modelEnvVar: "OPENROUTER_VL_EMBEDDING_MODEL",
    verification: "official_docs",
    sourceUrl: "https://openrouter.ai/nvidia/llama-nemotron-embed-vl-1b-v2:free",
    operationalNote: "This free trial endpoint is blocked by the repository; reviewed non-free model plus OPENROUTER_ALLOW_REMOTE_EMBEDDINGS=true is required for remote use. The card says the free trial is not for production/business-critical systems.",
    sensitiveDataWarning: "The card warns free-endpoint prompts/outputs are logged and says not to upload personal or confidential data; remote use requires explicit operator opt-in.",
  },
  decisions: {
    modelId: OPENROUTER_DEFAULT_DECISIONS_MODEL,
    task: "optional small eligibility/alignment signals",
    endpoint: "/api/alpha/decisions",
    modality: "text state + typed questions → structured choice/score/yes-no probabilities",
    timeoutMs: 3_500,
    maxInput: "Up to 12 questions; caller bounds state payload",
    output: "answers keyed by question, parsed to nullable advisory signals",
    fallback: "Deterministic eligibility/ranking remains authoritative; null signal on failure",
    optional: true,
    modelEnvVar: "OPENROUTER_DECISION_MODEL",
    verification: "official_docs",
    sourceUrl: "https://openrouter.ai/inception/mercury-decide:free",
    operationalNote: "Official card uses the Decisions API, not chat completions. Keep outputs advisory and human-reviewable.",
  },
  evaluation: {
    modelId: OPENROUTER_DEFAULT_EVALUATION_MODEL,
    task: "optional writing/forum/visa behavior signals (advisory only)",
    endpoint: "/api/alpha/decisions",
    modality: "text transcript + typed questions → structured behavior probabilities",
    timeoutMs: 3_500,
    maxInput: "48,000 characters; at most 12 signals",
    output: "nullable probability signals; no generated prose",
    fallback: "Null advisory signals; never proof of misconduct or an automatic punishment",
    optional: true,
    modelEnvVar: "OPENROUTER_EVAL_MODEL",
    verification: "official_docs",
    sourceUrl: "https://openrouter.ai/respan/span-01-lite:free",
    operationalNote: "Official card uses the Decisions API, not chat completions. Behavioral probabilities are not findings of wrongdoing.",
  },
} as const satisfies Record<OpenRouterModelKey, OpenRouterModelCapability>;

/** Compatibility aliases; keep all literal IDs in the typed registry above. */
export const OPENROUTER_MODEL_IDS = {
  chat: OPENROUTER_MODEL_REGISTRY.chat.modelId,
  speech: OPENROUTER_MODEL_REGISTRY.speech.modelId,
  textEmbedding: OPENROUTER_MODEL_REGISTRY.textEmbedding.modelId,
  multimodalEmbedding: OPENROUTER_MODEL_REGISTRY.multimodalEmbedding.modelId,
  decisions: OPENROUTER_MODEL_REGISTRY.decisions.modelId,
  evaluation: OPENROUTER_MODEL_REGISTRY.evaluation.modelId,
} as const;
