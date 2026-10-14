/**
 * AI cost accounting — pure core (no DB, no network). Unit-tested in
 * scripts/check-ai-cost.ts.
 *
 * Principles
 *  - A cost is NEVER reported as a verified zero. Every AI request ends with
 *    exactly one of these statuses (stored in ai_usage.cost_status):
 *      provider_reported  the provider returned the billed USD amount itself
 *                         (OpenRouter `usage.cost` with `usage.include`)
 *      estimated          tokens × the admin-configured price for that model
 *      unknown_pricing    tokens are known but no price is configured
 *      usage_unreported   the provider returned no usage metadata (or the
 *                         request failed before it could): tokens and cost are
 *                         unknown — they are stored as 0 but flagged, never
 *                         presented as a measured zero
 *  - Prices are NOT in the code. The admin enters them in app_config
 *    (`ai_model_pricing`, USD per 1,000,000 tokens) so they can be updated
 *    without a deploy. No default price is shipped, so until an administrator
 *    enters one, cost stays `unknown_pricing` instead of an invented number.
 */

export const AI_PRICING_CONFIG_KEY = "ai_model_pricing";

/** USD per 1,000,000 tokens. */
export interface ModelPrice {
  inputPerMTok: number;
  outputPerMTok: number;
  /** Price of prompt tokens served from the provider's prompt cache. Defaults to inputPerMTok. */
  cachedInputPerMTok?: number;
}

/** provider id → model id → price. */
export type PricingTable = Record<string, Record<string, ModelPrice>>;

export type AICostStatus = "provider_reported" | "estimated" | "unknown_pricing" | "usage_unreported";

/** Statuses whose cost_estimate is a number the admin may sum into spend. */
export const KNOWN_COST_STATUSES: AICostStatus[] = ["provider_reported", "estimated"];

export interface UsageFigures {
  /** Total prompt tokens, including cached ones. */
  promptTokens: number;
  completionTokens: number;
  /** Subset of promptTokens served from cache (billed at the cached price). */
  cachedPromptTokens: number;
  /** False when the provider returned no usage metadata at all. */
  reported: boolean;
  /** USD billed as reported by the provider, when it reports one. */
  providerCostUsd?: number | null;
}

export const MAX_PRICE_PER_MTOK = 1000; // USD — far above any real list price; catches typos
const MAX_PRICING_ENTRIES = 200;
const MODEL_ID_RE = /^[A-Za-z0-9._:/@+-]{1,200}$/;

/** Empty / missing config = no prices (every cost is unknown_pricing). */
export function emptyPricing(): PricingTable {
  return {};
}

/**
 * Parse and validate the admin-entered pricing JSON. Returns the table, or
 * an error string for the admin UI. `providerIds` is injected so this module
 * stays free of the provider registry.
 */
export function parsePricingJson(
  raw: string | null | undefined,
  isKnownProvider: (id: string) => boolean
): { ok: true; table: PricingTable } | { ok: false; error: string } {
  const text = String(raw ?? "").trim();
  if (!text) return { ok: true, table: emptyPricing() };
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "must be valid JSON: {\"provider\": {\"model\": {\"inputPerMTok\": 0.1, \"outputPerMTok\": 0.4}}}" };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "must be a JSON object keyed by provider id" };
  }
  const table: PricingTable = {};
  let entries = 0;
  for (const [provider, models] of Object.entries(parsed as Record<string, unknown>)) {
    if (!isKnownProvider(provider)) return { ok: false, error: `unknown or non-chat provider "${provider}"` };
    if (!models || typeof models !== "object" || Array.isArray(models)) {
      return { ok: false, error: `provider "${provider}" must map model ids to prices` };
    }
    table[provider] = {};
    for (const [model, price] of Object.entries(models as Record<string, unknown>)) {
      if (!MODEL_ID_RE.test(model)) return { ok: false, error: `model id "${model.slice(0, 40)}" has unsupported characters` };
      const p = price as Record<string, unknown> | null;
      if (!p || typeof p !== "object") return { ok: false, error: `price for ${provider}/${model} must be an object` };
      const input = p.inputPerMTok;
      const output = p.outputPerMTok;
      const cached = p.cachedInputPerMTok;
      if (!validPrice(input) || !validPrice(output)) {
        return { ok: false, error: `${provider}/${model}: inputPerMTok and outputPerMTok must be numbers from 0 to ${MAX_PRICE_PER_MTOK}` };
      }
      if (cached !== undefined && !validPrice(cached)) {
        return { ok: false, error: `${provider}/${model}: cachedInputPerMTok must be a number from 0 to ${MAX_PRICE_PER_MTOK}` };
      }
      const unknownKeys = Object.keys(p).filter((k) => !["inputPerMTok", "outputPerMTok", "cachedInputPerMTok"].includes(k));
      if (unknownKeys.length) return { ok: false, error: `${provider}/${model}: unknown field "${unknownKeys[0]}"` };
      table[provider][model] = {
        inputPerMTok: input as number,
        outputPerMTok: output as number,
        ...(cached !== undefined ? { cachedInputPerMTok: cached as number } : {}),
      };
      entries += 1;
      if (entries > MAX_PRICING_ENTRIES) return { ok: false, error: `at most ${MAX_PRICING_ENTRIES} model prices` };
    }
  }
  return { ok: true, table };
}

function validPrice(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= MAX_PRICE_PER_MTOK;
}

/** Exact provider + model match. No fuzzy matching: a wrong price is worse than none. */
export function lookupPrice(table: PricingTable, provider: string, model: string): ModelPrice | null {
  return table[provider]?.[model] ?? null;
}

/** USD for one request at a given price. */
export function computeCost(usage: UsageFigures, price: ModelPrice): number {
  const cached = Math.min(Math.max(0, usage.cachedPromptTokens), Math.max(0, usage.promptTokens));
  const uncached = Math.max(0, usage.promptTokens) - cached;
  const cachedRate = price.cachedInputPerMTok ?? price.inputPerMTok;
  const usd =
    (uncached * price.inputPerMTok + cached * cachedRate + Math.max(0, usage.completionTokens) * price.outputPerMTok) /
    1_000_000;
  // Round to 1e-9 USD (a nanodollar): removes float noise, keeps tiny costs visible.
  return Math.round(usd * 1e9) / 1e9;
}

export interface CostResult {
  costUsd: number | null;
  costStatus: AICostStatus;
}

/**
 * The single decision point for a response's cost. Precedence:
 * provider-reported USD > estimate from configured price > unknown.
 */
export function costForUsage(
  provider: string,
  model: string,
  usage: UsageFigures,
  table: PricingTable
): CostResult {
  if (typeof usage.providerCostUsd === "number" && Number.isFinite(usage.providerCostUsd) && usage.providerCostUsd >= 0) {
    return { costUsd: usage.providerCostUsd, costStatus: "provider_reported" };
  }
  if (!usage.reported) return { costUsd: null, costStatus: "usage_unreported" };
  const price = lookupPrice(table, provider, model);
  if (!price) return { costUsd: null, costStatus: "unknown_pricing" };
  return { costUsd: computeCost(usage, price), costStatus: "estimated" };
}

/** Human label for admin screens (English; the admin panel is operator-facing). */
export const COST_STATUS_LABEL: Record<AICostStatus, string> = {
  provider_reported: "Provider-reported",
  estimated: "Estimated",
  unknown_pricing: "No price configured",
  usage_unreported: "Usage not reported",
};
