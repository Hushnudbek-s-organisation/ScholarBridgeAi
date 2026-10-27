/**
 * Server-side enforcement of the AI spend budgets (see ./budget.ts for the
 * rules). Called by the router before every paid provider attempt, so a
 * budget cannot be bypassed by a route, a retry or a fallback.
 *
 * FAILURE MODE — deliberate and documented: if the budget or usage tables
 * cannot be read, the gate ALLOWS the call and logs it. Usage rows cannot be
 * written in that state either, so blocking would turn a database outage into
 * a full AI outage without protecting anything that is not already at risk.
 */
import { getConfig } from "@/lib/config";
import { AI_PROVIDER_IDS, isChatProvider } from "@/lib/ai/settings";
import { aiSpendSnapshot } from "@/lib/ai/usage";
import {
  AI_BUDGET_KEYS,
  budgetUsage,
  budgetVerdict,
  parseBudgetUsd,
  parseProviderBudgets,
  parseWarnPercent,
  type BudgetLimits,
  type BudgetVerdict,
  type SpendSnapshot,
} from "@/lib/ai/budget";
import { CONFIG_DEFAULTS } from "@/lib/config";

const isKnownProvider = (id: string) => (AI_PROVIDER_IDS as string[]).includes(id) && isChatProvider(id as (typeof AI_PROVIDER_IDS)[number]);

export async function loadBudgetLimits(): Promise<BudgetLimits> {
  const [daily, monthly, providerDaily, warn] = await Promise.all([
    getConfig(AI_BUDGET_KEYS.daily),
    getConfig(AI_BUDGET_KEYS.monthly),
    getConfig(AI_BUDGET_KEYS.providerDaily),
    getConfig(AI_BUDGET_KEYS.warnPercent),
  ]);
  return {
    dailyUsd: parseBudgetUsd(daily, CONFIG_DEFAULTS[AI_BUDGET_KEYS.daily]),
    monthlyUsd: parseBudgetUsd(monthly, CONFIG_DEFAULTS[AI_BUDGET_KEYS.monthly]),
    providerDailyUsd: parseProviderBudgets(providerDaily, isKnownProvider),
    warnPercent: parseWarnPercent(warn, CONFIG_DEFAULTS[AI_BUDGET_KEYS.warnPercent]),
  };
}

let lastWarnAt = 0;
let lastBlockAt = 0;
const LOG_EVERY_MS = 60_000;
const DEGRADED_FREE_CALLS_PER_MINUTE = 20;
let degradedFreeCallTimes: number[] = [];
/**
 * Circuit breaker for the budget store itself.
 *
 * Every AI request evaluates the budget, so a database outage used to mean
 * every request paid for two failing reads (limits + spend) before it could
 * be refused — turning a database problem into a slow, self-inflicted flood on
 * the same database. After one failed read, further reads are skipped for this
 * long and requests go straight to the degraded path (which still refuses
 * every paid call and still caps free ones). AI_BUDGET_OUTAGE_BACKOFF_MS tunes
 * it; 0 disables the breaker.
 */
let outageUntilMs = 0;

function outageBackoffMs(): number {
  const raw = Number(process.env.AI_BUDGET_OUTAGE_BACKOFF_MS ?? 15_000);
  if (!Number.isFinite(raw) || raw < 0) return 15_000;
  return Math.min(5 * 60_000, Math.floor(raw));
}
type BudgetStateReader = (now: Date) => Promise<[BudgetLimits, SpendSnapshot]>;
let budgetStateReader: BudgetStateReader = (now) => Promise.all([loadBudgetLimits(), aiSpendSnapshot(now)]);

/** Test-only injection: production always reads persisted limits and spend. */
export function setBudgetStateReaderForTests(reader?: BudgetStateReader): void {
  budgetStateReader = reader ?? ((now) => Promise.all([loadBudgetLimits(), aiSpendSnapshot(now)]));
  // A new reader must be consulted immediately, even if the old one failed.
  outageUntilMs = 0;
}

/** Only explicitly free OpenRouter IDs, or a Groq key the operator identifies as Free, are zero-cost. */
export function isZeroCostModel(provider: string, model?: string | null): boolean {
  if (provider === "openrouter" && typeof model === "string" && model.endsWith(":free")) return true;
  return provider === "groq" && process.env.GROQ_API_PLAN?.trim().toLowerCase() === "free";
}

function allowDegradedFreeCall(now: Date): boolean {
  const cutoff = now.getTime() - LOG_EVERY_MS;
  degradedFreeCallTimes = degradedFreeCallTimes.filter((at) => at > cutoff);
  if (degradedFreeCallTimes.length >= DEGRADED_FREE_CALLS_PER_MINUTE) return false;
  degradedFreeCallTimes.push(now.getTime());
  return true;
}

/** Tests only: re-arm the once-a-minute log throttle and degraded free-call cap. */
export function resetBudgetGateLogThrottleForTests(): void {
  lastWarnAt = 0;
  lastBlockAt = 0;
  degradedFreeCallTimes = [];
  outageUntilMs = 0;
}

/** Tests/diagnostics: is the budget-store breaker currently open? */
export function budgetGateOutageState(now: Date = new Date()): { open: boolean; untilMs: number } {
  return { open: now.getTime() < outageUntilMs, untilMs: outageUntilMs };
}

/**
 * The verdict while the budget cannot be verified.
 *
 * Only a model we can prove is free may run, and even then under a hard local
 * cap — the paid path is refused, never guessed.
 */
function degradedVerdict(provider: string, model: string | null | undefined, now: Date, cause: "read_failed" | "breaker_open"): BudgetVerdict {
  const zeroCost = isZeroCostModel(provider, model);
  const allowed = zeroCost && allowDegradedFreeCall(now);
  if (now.getTime() - lastWarnAt > LOG_EVERY_MS) {
    lastWarnAt = now.getTime();
    console.warn(JSON.stringify({
      evt: "ai_budget_unavailable",
      cause,
      action: allowed ? "allowed" : "blocked",
      degradedMode: true,
      reason: zeroCost ? (allowed ? "verified_zero_cost_model" : "degraded_free_rate_limit") : "budget_verification_unavailable",
      ...(zeroCost ? {} : { provider }),
    }));
  }
  if (allowed) return { allowed: true, warning: null };
  return {
    allowed: false,
    reason: zeroCost ? "degraded_free_rate_limit" : "budget_verification_unavailable",
    degradedMode: true,
  };
}

/** Verdict before one provider attempt. A Date as the second argument remains supported for old callers/tests. */
export async function evaluateAiBudget(
  provider: string,
  modelOrNow?: string | null | Date,
  suppliedNow: Date = new Date(),
): Promise<BudgetVerdict> {
  const model = modelOrNow instanceof Date ? undefined : modelOrNow;
  const now = modelOrNow instanceof Date ? modelOrNow : suppliedNow;
  let limits: BudgetLimits;
  let spend: SpendSnapshot;
  if (now.getTime() < outageUntilMs) {
    // The breaker is open: do not touch the store again yet, but keep the
    // exact same refusal the failed read produced.
    return degradedVerdict(provider, model, now, "breaker_open");
  }
  try {
    [limits, spend] = await budgetStateReader(now);
  } catch {
    const backoff = outageBackoffMs();
    if (backoff > 0) outageUntilMs = now.getTime() + backoff;
    return degradedVerdict(provider, model, now, "read_failed");
  }
  const verdict = budgetVerdict(provider, spend, limits);
  if (!verdict.allowed) {
    if (now.getTime() - lastBlockAt > LOG_EVERY_MS) {
      lastBlockAt = now.getTime();
      console.warn(JSON.stringify({ evt: "ai_budget_exhausted", scope: verdict.scope, provider: verdict.provider ?? provider, spendUsd: round2(verdict.spendUsd), limitUsd: verdict.limitUsd }));
    }
  } else if (verdict.warning && now.getTime() - lastWarnAt > LOG_EVERY_MS) {
    lastWarnAt = now.getTime();
    console.warn(JSON.stringify({ evt: "ai_budget_warning", scope: verdict.warning.scope, provider: verdict.warning.provider ?? null, percent: verdict.warning.percent, spendUsd: round2(verdict.warning.spendUsd), limitUsd: verdict.warning.limitUsd }));
  }
  return verdict;
}

/** Current limits and spend for the admin panel (admin-only consumers). */
export async function getBudgetStatus(now: Date = new Date()) {
  const [limits, spend] = await Promise.all([loadBudgetLimits(), aiSpendSnapshot(now)]);
  return {
    limits,
    spend: {
      dayUsd: round2(spend.dayUsd),
      monthUsd: round2(spend.monthUsd),
      dayByProviderUsd: Object.fromEntries(Object.entries(spend.dayByProviderUsd).map(([k, v]) => [k, round2(v)])),
    },
    usage: budgetUsage(spend, limits),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
