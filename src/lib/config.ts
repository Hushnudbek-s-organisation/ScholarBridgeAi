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
  payment_premium_price_uzs: "59000",
  payment_premium_days: "30",
  payment_premium_season_price_uzs: "149000",
  payment_premium_season_days: "90",
  payment_premium_yearly_price_uzs: "499000",
  payment_premium_yearly_days: "365",
  payment_currency: "UZS",
  // AI limits (spec §16) — free keeps 3–5/day so the helper is useful, not endless
  ai_free_requests_per_day: "5",
  ai_premium_requests_per_day: "200",
  ai_free_tokens_per_day: "20000",
  ai_premium_tokens_per_day: "500000",
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
  // Referral (spec — existing)
  referral_premium_multiple: "5",
  referral_premium_days: "30",
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

const cache = new Map<string, string | null>();
/** Values an admin actually saved (no defaults) — null = never saved. */
const storedCache = new Map<string, string | null>();

/**
 * The value saved in app_config, or null when the key was never saved.
 * Use this when "not set" must fall through to env/auto (e.g. AI provider
 * selection) instead of being masked by CONFIG_DEFAULTS.
 */
export async function getStoredConfig(key: string): Promise<string | null> {
  if (storedCache.has(key)) return storedCache.get(key) ?? null;
  const [row] = await db.select().from(appConfig).where(eq(appConfig.key, key));
  const value = row?.value ?? null;
  storedCache.set(key, value);
  return value;
}

/** Remove a saved value (falls back to defaults/env again). */
export async function deleteConfig(key: string): Promise<void> {
  await db.delete(appConfig).where(eq(appConfig.key, key));
  cache.delete(key);
  storedCache.delete(key);
}

/** Get a config value (cached per process). */
export async function getConfig(key: string): Promise<string> {
  if (cache.has(key)) return cache.get(key) as string;
  try {
    const [row] = await db.select().from(appConfig).where(eq(appConfig.key, key));
    const value = row?.value ?? CONFIG_DEFAULTS[key] ?? "";
    cache.set(key, value);
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
  cache.set(key, value);
  storedCache.set(key, value);
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
