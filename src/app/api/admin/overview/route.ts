import { NextResponse } from "next/server";
import { and, count, eq, gte, ne, or, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  answerVault,
  consultingRequests,
  forumReports,
  opportunities,
  scholarshipDecisions,
  scholarships,
  studentChecklist,
  studentGoals,
  studentProfiles,
  successStories,
  universities,
} from "@/db/schema";
import { guardAdmin, serverError } from "@/lib/growth/api";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/overview — the admin home screen: what needs attention
 * right now (moderation queues) plus headline numbers. Every counter is
 * independent: one missing optional table shows "—" instead of failing.
 */
export async function GET(req: Request) {
  const g = await guardAdmin(req);
  if (!g.ok) return g.response;
  try {
    const safe = async (q: Promise<{ n: number }[]>): Promise<number | null> => {
      try {
        return Number((await q)[0]?.n ?? 0);
      } catch {
        return null;
      }
    };
    const weekAgo = new Date(Date.now() - 7 * 86_400_000);
    const now = new Date();
    const [
      users,
      newUsers,
      premium,
      pendingStories,
      approvedStories,
      openReports,
      newConsulting,
      unis,
      unverifiedUnis,
      schs,
      unverifiedSchs,
      opps,
      activeGoals,
      answers,
      appliedSch,
      checklistTicks,
    ] = await Promise.all([
      safe(db.select({ n: count() }).from(studentProfiles)),
      safe(db.select({ n: count() }).from(studentProfiles).where(gte(studentProfiles.createdAt, weekAgo))),
      safe(db.select({ n: count() }).from(studentProfiles).where(and(eq(studentProfiles.isPremium, true), or(isNull(studentProfiles.premiumUntil), gte(studentProfiles.premiumUntil, now))))),
      safe(db.select({ n: count() }).from(successStories).where(eq(successStories.status, "pending"))),
      safe(db.select({ n: count() }).from(successStories).where(eq(successStories.status, "approved"))),
      safe(db.select({ n: count() }).from(forumReports).where(eq(forumReports.status, "open"))),
      safe(db.select({ n: count() }).from(consultingRequests).where(eq(consultingRequests.status, "new"))),
      safe(db.select({ n: count() }).from(universities)),
      safe(db.select({ n: count() }).from(universities).where(ne(universities.verificationStatus, "verified"))),
      safe(db.select({ n: count() }).from(scholarships)),
      safe(db.select({ n: count() }).from(scholarships).where(ne(scholarships.verificationStatus, "verified"))),
      safe(db.select({ n: count() }).from(opportunities)),
      safe(db.select({ n: count() }).from(studentGoals).where(eq(studentGoals.status, "active"))),
      safe(db.select({ n: count() }).from(answerVault)),
      safe(db.select({ n: count() }).from(scholarshipDecisions).where(eq(scholarshipDecisions.status, "applied"))),
      safe(db.select({ n: count() }).from(studentChecklist)),
    ]);
    return NextResponse.json({
      people: { users, newUsers, premium },
      attention: { pendingStories, openReports, newConsulting, unverifiedUnis, unverifiedSchs },
      catalog: { universities: unis, scholarships: schs, opportunities: opps, stories: approvedStories },
      growth: { activeGoals, answers, appliedSch, checklistTicks },
    });
  } catch (err) {
    return serverError("admin overview", err);
  }
}
