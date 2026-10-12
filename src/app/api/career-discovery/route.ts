import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { careerDiscoveries } from "@/db/schema";
import { guardStudent, jsonError, readBody, serverError } from "@/lib/journey/api";
import {
  CAREER_AFFINITY,
  runCareerDiscovery,
  validateDiscoveryAnswers,
  validateTrialFeedback,
  type TrialFeedback,
} from "@/lib/careerDiscovery";
import { CAREER_PATHS } from "@/lib/journey/careers";

export const dynamic = "force-dynamic";

/**
 * Career Discovery (product journey §4) — the guided "I don't know yet" flow.
 *
 * GET  /api/career-discovery?profileId=  → the student's latest run (answers,
 *        trial feedback, recommendations) + the quiz definition, so the UI
 *        never hardcodes questions or career data.
 * POST /api/career-discovery             → save answers / trial feedback /
 *        selected career and recompute recommendations with the deterministic
 *        engine. Unknown ids are REJECTED (400), never silently coerced.
 *
 * Auth: `guardStudent` — a student can only ever read or write their own row.
 * No AI provider is involved: the engine is local and deterministic, and no
 * admission-probability style claim is produced anywhere in this payload.
 */
export async function GET(req: Request) {
  const g = await guardStudent(req, new URL(req.url).searchParams.get("profileId"));
  if (!g.ok) return g.response;
  const { profileId } = g.value;
  try {
    const [row] = await db
      .select()
      .from(careerDiscoveries)
      .where(eq(careerDiscoveries.profileId, profileId))
      .orderBy(desc(careerDiscoveries.updatedAt), desc(careerDiscoveries.id))
      .limit(1);

    return NextResponse.json({
      discovery: row
        ? {
            answers: row.answers ?? {},
            trialFeedback: row.trialFeedback ?? {},
            recommendations: row.recommendations ?? [],
            selectedCareerId: row.selectedCareerId ?? null,
            updatedAt: row.updatedAt,
          }
        : null,
      catalog: CAREER_PATHS.map((c) => ({
        id: c.id,
        majors: c.majors,
        countries: c.countries,
        cluster: c.cluster ?? c.id,
        trialMinutes: c.trialMinutes ?? null,
      })),
      hasAffinity: CAREER_PATHS.every((c) => Boolean(CAREER_AFFINITY[c.id])),
    });
  } catch (err) {
    return serverError("career-discovery GET", err);
  }
}

export async function POST(req: Request) {
  const b = await readBody(req);
  if (!b.ok) return b.response;
  const g = await guardStudent(req, b.value.profileId, { write: true });
  if (!g.ok) return g.response;
  const { profileId } = g.value;
  try {
    const answersCheck = validateDiscoveryAnswers(b.value.answers);
    if (!answersCheck.ok) return jsonError(400, answersCheck.error, "bad_request");
    const feedbackCheck = validateTrialFeedback(b.value.trialFeedback);
    if (!feedbackCheck.ok) return jsonError(400, feedbackCheck.error, "bad_request");

    let selectedCareerId: string | null = null;
    if (b.value.selectedCareerId !== undefined && b.value.selectedCareerId !== null) {
      if (typeof b.value.selectedCareerId !== "string") {
        return jsonError(400, "selectedCareerId must be a string", "bad_request");
      }
      const known = CAREER_PATHS.some((c) => c.id === b.value.selectedCareerId);
      if (!known) return jsonError(400, "unknown career", "bad_request");
      selectedCareerId = b.value.selectedCareerId;
    }

    const [existing] = await db
      .select()
      .from(careerDiscoveries)
      .where(eq(careerDiscoveries.profileId, profileId))
      .orderBy(desc(careerDiscoveries.updatedAt), desc(careerDiscoveries.id))
      .limit(1);

    // Partial updates: a POST that only sends trialFeedback must not wipe the
    // stored answers, and vice versa. Absent = keep; present = replace.
    const answers =
      b.value.answers !== undefined ? answersCheck.answers : ((existing?.answers as Record<string, string[]>) ?? {});
    const trialFeedback: TrialFeedback =
      b.value.trialFeedback !== undefined
        ? feedbackCheck.feedback
        : ((existing?.trialFeedback as TrialFeedback) ?? {});
    const selected =
      b.value.selectedCareerId !== undefined ? selectedCareerId : (existing?.selectedCareerId ?? null);

    const result = runCareerDiscovery(answers, trialFeedback);

    const now = new Date();
    if (existing) {
      await db
        .update(careerDiscoveries)
        .set({
          answers,
          trialFeedback,
          recommendations: result.recommendations,
          selectedCareerId: selected,
          updatedAt: now,
        })
        .where(eq(careerDiscoveries.id, existing.id));
    } else {
      await db.insert(careerDiscoveries).values({
        profileId,
        answers,
        trialFeedback,
        recommendations: result.recommendations,
        selectedCareerId: selected,
      });
    }

    return NextResponse.json({
      ...result,
      selectedCareerId: selected,
    });
  } catch (err) {
    return serverError("career-discovery POST", err);
  }
}

/** DELETE — restart the discovery (the product journey asks for re-runs). */
export async function DELETE(req: Request) {
  const g = await guardStudent(req, new URL(req.url).searchParams.get("profileId"), { write: true });
  if (!g.ok) return g.response;
  const { profileId } = g.value;
  try {
    await db
      .delete(careerDiscoveries)
      .where(and(eq(careerDiscoveries.profileId, profileId)));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError("career-discovery DELETE", err);
  }
}
