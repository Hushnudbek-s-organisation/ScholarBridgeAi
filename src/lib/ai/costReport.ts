/**
 * Admin AI cost report — aggregates ai_usage for the admin panel and
 * exports nothing to students. Every money figure is labelled with how it
 * was obtained: requests whose cost is unknown are counted separately and
 * never added as $0.
 */
import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { aiUsage } from "@/db/schema";
import { KNOWN_COST_STATUSES } from "@/lib/ai/pricing";
import { getBudgetStatus } from "@/lib/ai/budget-gate";

const DAY_MS = 24 * 60 * 60 * 1000;

export function clampReportDays(raw: string | null | undefined): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 90 ? n : 30;
}

const KNOWN = sql.raw(`('${KNOWN_COST_STATUSES.join("','")}')`);

export async function buildAiCostReport(days: number, now: Date = new Date()) {
  const since = new Date(now.getTime() - days * DAY_MS);
  const inWindow = gte(aiUsage.createdAt, since);

  const [totals] = await db
    .select({
      requests: count(),
      failed: sql<number>`count(*) filter (where ${aiUsage.status} <> 'success')::int`,
      fallbacks: sql<number>`count(*) filter (where ${aiUsage.fallbackUsed})::int`,
      retried: sql<number>`count(*) filter (where ${aiUsage.attempts} > 1)::int`,
      promptTokens: sql<number>`coalesce(sum(${aiUsage.promptTokens}), 0)::float8`,
      cachedPromptTokens: sql<number>`coalesce(sum(${aiUsage.cachedPromptTokens}), 0)::float8`,
      completionTokens: sql<number>`coalesce(sum(${aiUsage.completionTokens}), 0)::float8`,
      knownCostUsd: sql<number>`coalesce(sum(case when ${aiUsage.costStatus} in ${KNOWN} then ${aiUsage.costEstimate} else 0 end), 0)::float8`,
      unknownCostRequests: sql<number>`count(*) filter (where ${aiUsage.status} = 'success' and ${aiUsage.costStatus} not in ${KNOWN})::int`,
    })
    .from(aiUsage)
    .where(inWindow);

  const byProvider = await db
    .select({
      provider: aiUsage.provider,
      requests: count(),
      failed: sql<number>`count(*) filter (where ${aiUsage.status} <> 'success')::int`,
      knownCostUsd: sql<number>`coalesce(sum(case when ${aiUsage.costStatus} in ${KNOWN} then ${aiUsage.costEstimate} else 0 end), 0)::float8`,
      unknownCostRequests: sql<number>`count(*) filter (where ${aiUsage.status} = 'success' and ${aiUsage.costStatus} not in ${KNOWN})::int`,
    })
    .from(aiUsage)
    .where(inWindow)
    .groupBy(aiUsage.provider)
    .orderBy(desc(count()))
    .limit(20);

  const byTask = await db
    .select({
      task: aiUsage.taskType,
      requests: count(),
      failed: sql<number>`count(*) filter (where ${aiUsage.status} <> 'success')::int`,
      knownCostUsd: sql<number>`coalesce(sum(case when ${aiUsage.costStatus} in ${KNOWN} then ${aiUsage.costEstimate} else 0 end), 0)::float8`,
    })
    .from(aiUsage)
    .where(inWindow)
    .groupBy(aiUsage.taskType)
    .orderBy(desc(count()))
    .limit(20);

  // Models that served real requests but have no price: the admin's to-do list.
  const unpriced = await db
    .select({
      provider: aiUsage.provider,
      model: aiUsage.model,
      requests: count(),
    })
    .from(aiUsage)
    .where(and(inWindow, eq(aiUsage.status, "success"), sql`${aiUsage.costStatus} not in ${KNOWN}`))
    .groupBy(aiUsage.provider, aiUsage.model)
    .orderBy(desc(count()))
    .limit(20);

  const errors = await db
    .select({ category: sql<string>`coalesce(${aiUsage.errorCategory}, 'unknown')`, requests: count() })
    .from(aiUsage)
    .where(and(inWindow, eq(aiUsage.status, "error")))
    .groupBy(sql`coalesce(${aiUsage.errorCategory}, 'unknown')`)
    .orderBy(desc(count()))
    .limit(20);

  const costStatus = await db
    .select({ status: aiUsage.costStatus, requests: count() })
    .from(aiUsage)
    .where(inWindow)
    .groupBy(aiUsage.costStatus);

  const requests = Number(totals?.requests ?? 0);
  const known = Number(totals?.knownCostUsd ?? 0);
  return {
    windowDays: days,
    generatedAt: now.toISOString(),
    totals: {
      requests,
      failed: Number(totals?.failed ?? 0),
      fallbacks: Number(totals?.fallbacks ?? 0),
      retried: Number(totals?.retried ?? 0),
      promptTokens: Number(totals?.promptTokens ?? 0),
      cachedPromptTokens: Number(totals?.cachedPromptTokens ?? 0),
      completionTokens: Number(totals?.completionTokens ?? 0),
      /** USD over requests with a known cost. Compare with unknownCostRequests before trusting it. */
      knownCostUsd: round4(known),
      unknownCostRequests: Number(totals?.unknownCostRequests ?? 0),
      /** Share of successful requests whose cost is known (0–100). */
      knownCostCoveragePct: requests > 0 ? Math.round(((requests - Number(totals?.unknownCostRequests ?? 0)) / requests) * 1000) / 10 : null,
    },
    byProvider: byProvider.map((r) => ({
      provider: r.provider,
      requests: Number(r.requests),
      failed: Number(r.failed),
      knownCostUsd: round4(Number(r.knownCostUsd)),
      unknownCostRequests: Number(r.unknownCostRequests),
    })),
    byTask: byTask.map((r) => ({
      task: r.task,
      requests: Number(r.requests),
      failed: Number(r.failed),
      knownCostUsd: round4(Number(r.knownCostUsd)),
    })),
    unpricedModels: unpriced.map((r) => ({ provider: r.provider, model: r.model, requests: Number(r.requests) })),
    errors: errors.map((r) => ({ category: r.category, requests: Number(r.requests) })),
    costStatus: costStatus.map((r) => ({ status: r.status, requests: Number(r.requests) })),
    budget: await getBudgetStatus(now),
  };
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
