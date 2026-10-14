import { db } from "@/db";
import { aiUsage } from "@/db/schema";
import { desc, gte, eq, and, sql, inArray } from "drizzle-orm";
import { KNOWN_COST_STATUSES, type AICostStatus } from "@/lib/ai/pricing";
import { utcWindowStarts, type SpendSnapshot } from "@/lib/ai/budget";

export interface UsageEntry {
  profileId: number | null;
  taskType: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  cachedPromptTokens?: number;
  costEstimate: number;
  costStatus: AICostStatus;
  attempts?: number;
  fallbackUsed?: boolean;
  /** "success" | "error" */
  status: string;
  errorCategory?: string | null;
}

/**
 * Record one logical AI request (one row per call, however many retries it
 * took). Written by the router (lib/ai/index.ts) — routes never write their
 * own usage rows, so nothing is counted twice.
 */
export async function logAIUsage(entry: UsageEntry) {
  await db.insert(aiUsage).values({
    profileId: entry.profileId,
    taskType: entry.taskType,
    provider: entry.provider,
    model: entry.model,
    promptTokens: entry.promptTokens,
    completionTokens: entry.completionTokens,
    cachedPromptTokens: entry.cachedPromptTokens ?? 0,
    costEstimate: entry.costEstimate,
    costStatus: entry.costStatus,
    attempts: entry.attempts ?? 1,
    fallbackUsed: entry.fallbackUsed ?? false,
    errorCategory: entry.errorCategory ?? null,
    status: entry.status,
  });
}

export interface AiUsageTotals {
  requests: number;
  tokens: number;
  /** Timestamp of the oldest counted request (null when there are none). */
  oldest: Date | null;
}

/** Tokens a profile used since `since` — one aggregate query (daily token quota). */
export async function aiUsageSince(profileId: number, since: Date): Promise<AiUsageTotals> {
  const [row] = await db
    .select({
      requests: sql<number>`count(*)::int`,
      tokens: sql<number>`coalesce(sum(${aiUsage.promptTokens} + ${aiUsage.completionTokens}), 0)::int`,
      oldest: sql<string | null>`min(${aiUsage.createdAt})`,
    })
    .from(aiUsage)
    .where(and(eq(aiUsage.profileId, profileId), gte(aiUsage.createdAt, since)));
  return {
    requests: Number(row?.requests ?? 0),
    tokens: Number(row?.tokens ?? 0),
    oldest: row?.oldest ? new Date(row.oldest) : null,
  };
}

/**
 * Spend the budget gate compares against: known cost only (provider-reported
 * or estimated), split by UTC day and UTC month, plus the day split per
 * provider. One grouped query covers all three.
 */
export async function aiSpendSnapshot(now: Date = new Date()): Promise<SpendSnapshot> {
  const { dayStart, monthStart } = utcWindowStarts(now);
  const rows = await db
    .select({
      provider: aiUsage.provider,
      dayCost: sql<number>`coalesce(sum(case when ${aiUsage.createdAt} >= ${dayStart} then ${aiUsage.costEstimate} else 0 end), 0)::float8`,
      monthCost: sql<number>`coalesce(sum(${aiUsage.costEstimate}), 0)::float8`,
    })
    .from(aiUsage)
    .where(and(gte(aiUsage.createdAt, monthStart), inArray(aiUsage.costStatus, KNOWN_COST_STATUSES)))
    .groupBy(aiUsage.provider);
  const snapshot: SpendSnapshot = { dayUsd: 0, monthUsd: 0, dayByProviderUsd: {} };
  for (const r of rows) {
    const day = Number(r.dayCost) || 0;
    snapshot.dayUsd += day;
    snapshot.monthUsd += Number(r.monthCost) || 0;
    snapshot.dayByProviderUsd[r.provider] = (snapshot.dayByProviderUsd[r.provider] ?? 0) + day;
  }
  return snapshot;
}

/** Recent usage for admin (spec §16). */
export async function getRecentUsage(limit = 50) {
  return db.select().from(aiUsage).orderBy(desc(aiUsage.createdAt)).limit(limit);
}
