/**
 * Platform-wide AI spend budgets — pure decision logic (unit-tested in
 * scripts/check-ai-cost.ts). The DB-backed gate that feeds it lives in
 * ./budget-gate.ts and runs on the server before EVERY paid provider call.
 *
 * Config (app_config, editable in Admin → AI → Cost & budgets):
 *   ai_budget_daily_usd            USD per UTC day, all providers
 *   ai_budget_monthly_usd          USD per UTC calendar month, all providers
 *   ai_budget_provider_daily_usd   JSON {"groq": 3, "openrouter": 5} per provider per day
 *   ai_budget_warn_percent         warn once spend reaches this % of a limit
 *
 * Value semantics (deliberately different from the request quotas):
 *   ""   → no limit for that scope
 *   "0"  → block every paid call in that scope (an emergency stop)
 *   "n"  → block once counted spend reaches n USD
 * An unreadable or invalid value falls back to the default in CONFIG_DEFAULTS.
 */

export const AI_BUDGET_KEYS = {
  daily: "ai_budget_daily_usd",
  monthly: "ai_budget_monthly_usd",
  providerDaily: "ai_budget_provider_daily_usd",
  warnPercent: "ai_budget_warn_percent",
} as const;

export const MAX_BUDGET_USD = 1_000_000;

export interface BudgetLimits {
  dailyUsd: number | null;
  monthlyUsd: number | null;
  providerDailyUsd: Record<string, number>;
  warnPercent: number;
}

export interface SpendSnapshot {
  dayUsd: number;
  monthUsd: number;
  dayByProviderUsd: Record<string, number>;
}

export type BudgetScope = "daily" | "monthly" | "provider";

export type BudgetVerdict =
  | {
      allowed: true;
      warning: { scope: BudgetScope; provider?: string; spendUsd: number; limitUsd: number; percent: number } | null;
    }
  | { allowed: false; scope: BudgetScope; provider?: string; spendUsd: number; limitUsd: number };

/** Parse a USD budget. "" → null (no limit); invalid → the fallback's value. */
export function parseBudgetUsd(raw: string | null | undefined, fallback: string): number | null {
  const pick = (v: string | null | undefined): number | undefined | null => {
    if (v === null || v === undefined) return undefined;
    const t = String(v).trim();
    if (t === "") return null;
    if (!/^\d{1,7}(\.\d{1,4})?$/.test(t)) return undefined;
    const n = Number(t);
    return Number.isFinite(n) && n >= 0 && n <= MAX_BUDGET_USD ? n : undefined;
  };
  const primary = pick(raw);
  if (primary !== undefined) return primary;
  const fb = pick(fallback);
  return fb === undefined ? null : fb;
}

export function parseWarnPercent(raw: string | null | undefined, fallback = "80"): number {
  const pick = (v: string | null | undefined) => {
    const n = Number(String(v ?? "").trim());
    return /^\d{1,3}$/.test(String(v ?? "").trim()) && n >= 1 && n <= 100 ? n : null;
  };
  return pick(raw) ?? pick(fallback) ?? 80;
}

/**
 * Per-provider daily caps. Unknown provider ids and invalid amounts are
 * dropped (never an error at runtime — validation happens on save).
 */
export function parseProviderBudgets(raw: string | null | undefined, isKnownProvider: (id: string) => boolean): Record<string, number> {
  const text = String(raw ?? "").trim();
  if (!text) return {};
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, number> = {};
    for (const [provider, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!isKnownProvider(provider)) continue;
      if (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= MAX_BUDGET_USD) out[provider] = value;
    }
    return out;
  } catch {
    return {};
  }
}

/** Save-time validation for the per-provider JSON. Null when valid. */
export function validateProviderBudgetJson(raw: string, isKnownProvider: (id: string) => boolean): string | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return 'must be a JSON object such as {"groq": 3}';
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return "must be a JSON object keyed by provider id";
  for (const [provider, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (!isKnownProvider(provider)) return `unknown or non-chat provider "${provider}"`;
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > MAX_BUDGET_USD) {
      return `budget for "${provider}" must be a number from 0 to ${MAX_BUDGET_USD}`;
    }
  }
  return null;
}

/**
 * Decide whether a paid call may proceed. A scope blocks when spend has
 * already reached its limit (the call that crosses the line is the one that
 * is refused next). Warnings report the scope closest to its limit.
 */
export function budgetVerdict(provider: string, spend: SpendSnapshot, limits: BudgetLimits): BudgetVerdict {
  const scopes: { scope: BudgetScope; provider?: string; spendUsd: number; limitUsd: number | null }[] = [];
  if (provider in limits.providerDailyUsd) {
    scopes.push({
      scope: "provider",
      provider,
      spendUsd: spend.dayByProviderUsd[provider] ?? 0,
      limitUsd: limits.providerDailyUsd[provider],
    });
  }
  scopes.push({ scope: "daily", spendUsd: spend.dayUsd, limitUsd: limits.dailyUsd });
  scopes.push({ scope: "monthly", spendUsd: spend.monthUsd, limitUsd: limits.monthlyUsd });

  for (const s of scopes) {
    if (s.limitUsd !== null && s.spendUsd >= s.limitUsd) {
      return { allowed: false, scope: s.scope, provider: s.provider, spendUsd: s.spendUsd, limitUsd: s.limitUsd };
    }
  }

  let warning: Extract<BudgetVerdict, { allowed: true }>["warning"] = null;
  for (const s of scopes) {
    if (s.limitUsd === null || s.limitUsd <= 0) continue;
    const percent = (s.spendUsd / s.limitUsd) * 100;
    if (percent >= limits.warnPercent && (!warning || percent > warning.percent)) {
      warning = { scope: s.scope, provider: s.provider, spendUsd: s.spendUsd, limitUsd: s.limitUsd, percent: Math.round(percent) };
    }
  }
  return { allowed: true, warning };
}

/** Share of each limit used — for the admin panel (never shown to students). */
export function budgetUsage(spend: SpendSnapshot, limits: BudgetLimits): {
  daily: { spendUsd: number; limitUsd: number | null; percent: number | null };
  monthly: { spendUsd: number; limitUsd: number | null; percent: number | null };
} {
  const pct = (s: number, l: number | null) => (l === null ? null : l > 0 ? Math.round((s / l) * 1000) / 10 : s > 0 ? 100 : 0);
  return {
    daily: { spendUsd: round4(spend.dayUsd), limitUsd: limits.dailyUsd, percent: pct(spend.dayUsd, limits.dailyUsd) },
    monthly: { spendUsd: round4(spend.monthUsd), limitUsd: limits.monthlyUsd, percent: pct(spend.monthUsd, limits.monthlyUsd) },
  };
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/** Start of the UTC day / UTC month containing `now` (budget windows are calendar-based). */
export function utcWindowStarts(now: Date): { dayStart: Date; monthStart: Date } {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  return { dayStart: new Date(Date.UTC(y, m, d)), monthStart: new Date(Date.UTC(y, m, 1)) };
}
