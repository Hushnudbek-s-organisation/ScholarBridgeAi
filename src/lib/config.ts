import { db } from "@/db";
import { appConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DEFAULT_HIDDEN_NAV_ITEMS } from "@/lib/navSections";

/**
 * Centralized app configuration (spec §3 — NO hardcoded data).
 * Values live in the `app_config` table and are editable by admins.
 * Falls back to defaults defined here (single source of truth for defaults).
 */

export interface ConfigDefaults {
  [key: string]: string;
}

export const CONFIG_DEFAULTS: ConfigDefaults = {
  // Payment (spec §18 — no hardcoded amounts)
  // Monthly default; season (3 mo) and yearly are discounted packages.
  // Regional pricing, calibrated for Uzbekistan (1 USD ≈ 12,000 UZS):
  //   monthly     59,000 UZS ≈ $4.92
  //   season      139,000 UZS ≈ $11.58 (90-day admissions pass — best value)
  //   yearly      399,000 UZS ≈ $33.25
  // The unit-economics rule behind these numbers: the WORST-CASE AI cost of a
  // Premium account must stay below its price. See the audit in
  // docs/AI_COST_AUDIT_2026-10-14.md and `src/lib/ai/quota.ts`.
  payment_premium_price_uzs: "59000",
  payment_premium_days: "30",
  payment_premium_season_price_uzs: "139000",
  payment_premium_season_days: "90",
  payment_premium_yearly_price_uzs: "399000",
  payment_premium_yearly_days: "365",
  payment_currency: "UZS",
  // AI limits (spec §16).
  //
  // PROFITABILITY (2026-10 fix). The old defaults allowed 500,000 premium
  // tokens/day (15M/month) plus 2 live sessions/day at 10 minutes — a
  // worst-case cost of ≈$12.53/month against a $4.92 monthly price, i.e. a
  // −$7.61 loss on a heavy user. The numbers below cap a heavy Premium user at
  // roughly $1.60/month of AI cost: 80k text tokens/day ≈ $0.85/month worst
  // case, plus 8 native-audio sessions/month ≈ $0.74.
  ai_free_requests_per_day: "5",
  ai_free_tokens_per_day: "12000",
  ai_premium_requests_per_day: "40",
  ai_premium_tokens_per_day: "80000",
  // AI cost control (Admin → AI → Cost & budgets). See lib/ai/pricing + budget.
  // Prices are NOT shipped: "{}" means every cost is "no price configured".
  ai_model_pricing: "{}",
  // Platform spend budgets (USD). "" = no limit, "0" = block paid AI in that
  // scope. These defaults are conservative placeholders — set real values in
  // the admin panel before launch.
  ai_budget_daily_usd: "10",
  ai_budget_monthly_usd: "150",
  ai_budget_provider_daily_usd: "{}",
  ai_budget_warn_percent: "80",
  // Gemini Live voice for visa practice: kill switch and per-day session
  // allowances (a session = one live connection). Browser speech stays available.
  ai_live_voice_enabled: "true",
  // Live voice is a Premium entitlement: at the published Live audio price a
  // 10-minute session costs roughly $0.1, so a free allowance would cost more
  // than the Premium price per active account (docs/AI_COST_AUDIT_2026-10-14.md).
  // Placeholders — the administrator sets the final values.
  ai_free_live_sessions_per_day: "0",
  ai_premium_live_sessions_per_day: "1",
  // Monthly ceiling on NATIVE-AUDIO live sessions. Standard browser-voice and
  // text mock interviews stay unlimited for Pro (< $0.002/session), so hitting
  // the native-audio ceiling never blocks interview practice.
  ai_premium_live_sessions_per_month: "8",
  ai_live_session_max_minutes: "8",
  // Platform-wide cap on Live sessions per day (all accounts). Live audio cost
  // is not visible to the token budget, so this is the control that bounds it.
  ai_live_global_sessions_per_day: "30",
  ai_default_provider: "openrouter",
  ai_provider_admissions: "openrouter",
  ai_provider_essay: "openrouter",
  ai_provider_general: "openrouter",
  ai_provider_search: "openrouter",
  ai_provider_document: "openrouter",
  ai_provider_visa: "groq",
  // Free quantitative caps (Pro = unlimited via feature flags)
  free_saved_universities: "10",
  free_saved_scholarships: "10",
  free_application_workspaces: "1",
  free_visa_practice_per_day: "2",
  // Data refresh (spec §9)
  refresh_interval_hours: "24",
  refresh_default_scope: "all",
  // Referral rewards — EVERY rule is admin-editable (Admin → Settings →
  // Referral rewards). Nothing about the reward may be hardcoded: the engine,
  // the student card and the admin screen all read these keys.
  //   premium_multiple        how many activated referrals give one premium grant
  //   premium_days            how many premium days one grant adds (stacking)
  //   points_referrer         gamification points the referrer earns per activation
  //   points_referred         gamification points the new student earns
  //   activation_completeness profile completeness (%) a referred account must
  //                           reach before the reward counts — so a bare signup
  //                           cannot be farmed for premium
  referral_premium_multiple: "5",
  referral_premium_days: "30",
  referral_points_referrer: "100",
  referral_points_referred: "50",
  referral_activation_completeness: "50",
  // Branding (editable from Admin → Settings)
  branding_logo_url: "",
  branding_favicon_url: "",
  // Sidebar navigation (editable from Admin → Navigation) — JSON array of
  // hidden section ids. Default comes from navSections.ts so the client and
  // the server always agree.
  nav_hidden_items: JSON.stringify(DEFAULT_HIDDEN_NAV_ITEMS),
  // Explicit Free/Pro feature map defaults (same as entitlements.ts) so
  // admins see them in Settings and export/import stays consistent.
  feature_roadmap: "free",
  feature_deadline_center: "free",
  feature_documents: "free",
  feature_forum: "free",
  feature_forum_write: "premium",
  feature_courses: "free",
  feature_courses_full: "premium",
  feature_documents_upload: "premium",
  feature_parent_dashboard: "premium",
  feature_visa_unlimited: "premium",
  feature_workspace_unlimited: "premium",
  feature_saves_unlimited: "premium",
  feature_ai_essay: "premium",
  feature_ai_advanced: "premium",
  feature_notifications_advanced: "premium",
};

/**
 * Per-process caches with a short TTL. A change saved on one instance reaches
 * the others within CONFIG_CACHE_TTL_MS (budgets and quotas must not stay stale
 * for the lifetime of a process). The saving instance updates its own cache
 * immediately (setConfig).
 */
export const CONFIG_CACHE_TTL_MS = 30_000;
const cache = new Map<string, { value: string | null; at: number }>();
/** Values an admin actually saved (no defaults) — null = never saved. */
const storedCache = new Map<string, { value: string | null; at: number }>();

function fresh<T extends { at: number }>(entry: T | undefined): entry is T {
  return entry !== undefined && Date.now() - entry.at < CONFIG_CACHE_TTL_MS;
}

/**
 * The value saved in app_config, or null when the key was never saved.
 * Use this when "not set" must fall through to env/auto (e.g. AI provider
 * selection) instead of being masked by CONFIG_DEFAULTS.
 */
export async function getStoredConfig(key: string): Promise<string | null> {
  const hit = storedCache.get(key);
  if (fresh(hit)) return hit.value;
  const [row] = await db.select().from(appConfig).where(eq(appConfig.key, key));
  const value = row?.value ?? null;
  storedCache.set(key, { value, at: Date.now() });
  return value;
}

/** Remove a saved value (falls back to defaults/env again). */
export async function deleteConfig(key: string): Promise<void> {
  await db.delete(appConfig).where(eq(appConfig.key, key));
  cache.delete(key);
  storedCache.delete(key);
}

/** Get a config value (cached per process for CONFIG_CACHE_TTL_MS). */
export async function getConfig(key: string): Promise<string> {
  const hit = cache.get(key);
  if (fresh(hit)) return hit.value ?? "";
  try {
    const [row] = await db.select().from(appConfig).where(eq(appConfig.key, key));
    const value = row?.value ?? CONFIG_DEFAULTS[key] ?? "";
    cache.set(key, { value, at: Date.now() });
    return value;
  } catch {
    // DB unavailable — fall back to defaults so the app still works.
    return CONFIG_DEFAULTS[key] ?? "";
  }
}

export async function getConfigNumber(key: string, fallback: number): Promise<number> {
  const raw = await getConfig(key);
  const n = Number(raw);
  return Number.isFinite(n) && raw !== "" ? n : fallback;
}

/** Set a config value (admin only — caller must verify isAdmin). */
export async function setConfig(key: string, value: string, description?: string) {
  const [existing] = await db.select().from(appConfig).where(eq(appConfig.key, key));
  if (existing) {
    await db
      .update(appConfig)
      .set({ value, description: description ?? existing.description, updatedAt: new Date() })
      .where(eq(appConfig.key, key));
  } else {
    await db.insert(appConfig).values({
      key,
      value,
      // NOTE: the old expression here had broken operator precedence
      // (`a ?? b ? c : d`), so a provided description was silently dropped.
      description: description ?? undefined,
    });
  }
  cache.set(key, { value, at: Date.now() });
  storedCache.set(key, { value, at: Date.now() });
  return getConfig(key);
}

/** List all config (defaults merged with DB values). */
export async function getAllConfig(): Promise<{ key: string; value: string; description: string | null }[]> {
  const rows = await db.select().from(appConfig);
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return Object.keys(CONFIG_DEFAULTS).map((key) => ({
    key,
    value: map.get(key) ?? CONFIG_DEFAULTS[key],
    description: rows.find((r) => r.key === key)?.description ?? null,
  }));
}

/** Invalidate the cache after a direct DB change. */
export function invalidateConfigCache(key?: string) {
  if (key) {
    cache.delete(key);
    storedCache.delete(key);
  } else {
    cache.clear();
    storedCache.clear();
  }
}
