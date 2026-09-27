import { db } from "@/db";
import { aiUsage } from "@/db/schema";
import { desc, gte, eq, and, sql } from "drizzle-orm";

interface UsageEntry {
  profileId: number | null;
  taskType: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  costEstimate: number;
  status: string;
}

/** Record one AI request (spec §16 — request logging & usage tracking). */
export async function logAIUsage(entry: UsageEntry) {
  await db.insert(aiUsage).values({
    profileId: entry.profileId,
    taskType: entry.taskType,
    provider: entry.provider,
    model: entry.model,
    promptTokens: entry.promptTokens,
    completionTokens: entry.completionTokens,
    costEstimate: entry.costEstimate,
    status: entry.status,
  });
}

export interface AiUsageTotals {
  requests: number;
  tokens: number;
  /** Timestamp of the oldest counted request (null when there are none). */
  oldest: Date | null;
}

/** Requests + tokens a profile used since `since` — one aggregate query (daily quota). */
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

/** Recent usage for admin (spec §16). */
export async function getRecentUsage(limit = 50) {
  return db.select().from(aiUsage).orderBy(desc(aiUsage.createdAt)).limit(limit);
}
