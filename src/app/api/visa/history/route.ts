import { NextResponse } from "next/server";
import { db } from "@/db";
import { aiEvaluations } from "@/db/schema";
import { requireProfileAccess } from "@/lib/auth";
import { eq, and, desc } from "drizzle-orm";

interface VisaSession {
  id: number;
  total: number;
  purposeOfStudy: number;
  funding: number;
  homeTies: number;
  nonImmigrantIntent: number;
  specificity: number;
  languageClarity: number;
  country: string | null;
  homeCountry: string | null;
  answerCount: number;
  createdAt: string;
}

/**
 * GET /api/visa/history?profileId=
 *
 * Practice history (spec §13): the student's saved visa practice sessions,
 * oldest first, so the UI can show "Session 1 → Session 2 → Session 3"
 * and the trend between them. Sessions are the deterministic rubric saved
 * by POST /api/visa/analyze — no model opinion is stored here.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const profileId = Number(searchParams.get("profileId"));
    if (!profileId) {
      return NextResponse.json({ error: "profileId is required" }, { status: 400 });
    }
    const access = await requireProfileAccess(req, profileId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
    }

    const rows = await db
      .select()
      .from(aiEvaluations)
      .where(
        and(
          eq(aiEvaluations.profileId, profileId),
          eq(aiEvaluations.evaluationType, "Visa Practice")
        )
      )
      .orderBy(desc(aiEvaluations.id))
      .limit(20);

    const sessions: VisaSession[] = [];
    for (const row of rows) {
      try {
        const parsed = JSON.parse(row.content) as Record<string, unknown>;
        if (typeof parsed.total !== "number") continue;
        sessions.push({
          id: row.id,
          total: parsed.total,
          purposeOfStudy: num(parsed.purposeOfStudy),
          funding: num(parsed.funding),
          homeTies: num(parsed.homeTies),
          nonImmigrantIntent: num(parsed.nonImmigrantIntent),
          specificity: num(parsed.specificity),
          languageClarity: num(parsed.languageClarity),
          country: typeof parsed.country === "string" ? parsed.country : null,
          homeCountry: typeof parsed.homeCountry === "string" ? parsed.homeCountry : null,
          answerCount: num(parsed.answerCount),
          createdAt: row.createdAt.toISOString(),
        });
      } catch {
        // Skip a corrupted row — never break history for one bad entry.
      }
    }

    return NextResponse.json({
      sessions: sessions.reverse(), // oldest first for the trend view
      count: sessions.length,
    });
  } catch (error) {
    console.error("GET /api/visa/history error:", error);
    return NextResponse.json({ error: "Failed to load practice history" }, { status: 500 });
  }
}

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}
