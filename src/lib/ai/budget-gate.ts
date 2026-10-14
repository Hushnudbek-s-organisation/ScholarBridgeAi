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

/** Tests only: re-arm the once-a-minute log throttle. */
export function resetBudgetGateLogThrottleForTests(): void {
  lastWarnAt = 0;
  lastBlockAt = 0;
}

/** Verdict for one paid call to `provider`. Never throws. */
export async function evaluateAiBudget(provider: string, now: Date = new Date()): Promise<BudgetVerdict> {
  let limits: BudgetLimits;
  let spend: SpendSnapshot;
  try {
    [limits, spend] = await Promise.all([loadBudgetLimits(), aiSpendSnapshot(now)]);
  } catch (err) {
    if (now.getTime() - lastWarnAt > LOG_EVERY_MS) {
      lastWarnAt = now.getTime();
      console.warn(JSON.stringify({ evt: "ai_budget_unavailable", action: "allowed", reason: (err as Error)?.message?.slice(0, 120) }));
    }
    return { allowed: true, warning: null };
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
