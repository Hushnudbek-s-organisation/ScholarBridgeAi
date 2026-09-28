import { NextResponse } from "next/server";
import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  aiEvaluations,
  answerVault,
  applications,
  checklistItems,
  essayVersions,
  savedScholarships,
  savedUniversities,
  scholarshipDecisions,
  studentChecklist,
  studentProfiles,
} from "@/db/schema";
import { getConfig } from "@/lib/config";
import { parseJourneyOverrides, resolveJourneySteps } from "@/lib/growth/defaults";
import { buildJourney, profileCompleteness, type JourneyCounts } from "@/lib/growth/logic";
import { guardStudent, serverError } from "@/lib/growth/api";

export const dynamic = "force-dynamic";

/**
 * GET /api/journey?profileId= — "Your path" on the dashboard.
 *
 * Eight plain-language steps from "fill your profile" to "ready to fly".
 * Every step is ticked automatically from the student's real data, so a
 * newcomer always sees exactly one "do this next" step. The admin controls
 * order, visibility and wording (Admin → Growth tools → Guide & help).
 */
export async function GET(req: Request) {
  const g = await guardStudent(req, new URL(req.url).searchParams.get("profileId"));
  if (!g.ok) return g.response;
  const { profileId } = g.value;
  try {
    const n = async (q: Promise<{ n: number }[]>) => {
      try {
        return Number((await q)[0]?.n ?? 0);
      } catch {
        return 0; // an optional table missing must never break the dashboard
      }
    };
    const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, profileId)).limit(1);
    const [savedUnis, savedSch, applied, answers, essays, apps, visa, checkDone, checkTotal] = await Promise.all([
      n(db.select({ n: count() }).from(savedUniversities).where(eq(savedUniversities.profileId, profileId))),
      n(db.select({ n: count() }).from(savedScholarships).where(eq(savedScholarships.profileId, profileId))),
      n(
        db
          .select({ n: count() })
          .from(scholarshipDecisions)
          .where(and(eq(scholarshipDecisions.profileId, profileId), eq(scholarshipDecisions.status, "applied")))
      ),
      n(db.select({ n: count() }).from(answerVault).where(eq(answerVault.profileId, profileId))),
      n(db.select({ n: count() }).from(essayVersions).where(eq(essayVersions.profileId, profileId))),
      n(db.select({ n: count() }).from(applications).where(eq(applications.profileId, profileId))),
      n(
        db
          .select({ n: count() })
          .from(aiEvaluations)
          .where(and(eq(aiEvaluations.profileId, profileId), eq(aiEvaluations.evaluationType, "Visa Practice")))
      ),
      n(
        db
          .select({ n: count() })
          .from(studentChecklist)
          .innerJoin(checklistItems, eq(checklistItems.id, studentChecklist.itemId))
          .where(and(eq(studentChecklist.profileId, profileId), eq(checklistItems.isActive, true)))
      ),
      n(db.select({ n: count() }).from(checklistItems).where(eq(checklistItems.isActive, true))),
    ]);

    const counts: JourneyCounts = {
      completeness: profileCompleteness(profile ?? null),
      savedUniversities: savedUnis,
      savedScholarships: savedSch,
      appliedScholarships: applied,
      answers,
      essays,
      applications: apps,
      visaSessions: visa,
      checklistDone: checkDone,
      checklistTotal: checkTotal,
    };
    const steps = resolveJourneySteps(parseJourneyOverrides(await getConfig("journey_steps")));
    return NextResponse.json({ ...buildJourney(steps, counts), counts }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return serverError("journey", err);
  }
}
