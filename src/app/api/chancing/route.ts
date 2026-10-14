import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { applications, savedUniversities, studentProfiles, universities } from "@/db/schema";
import { requireProfileAccess } from "@/lib/auth";
import { calculateUniversityMatch } from "@/lib/matching";
import { localeFromRequest, translateReasons } from "@/lib/engineText";
import { toMatchProfileWithActivities, toUniversityData } from "@/lib/profileMapping";
import { ADMISSION_PROBABILITY } from "@/lib/chancing";

export const dynamic = "force-dynamic";

/**
 * GET /api/chancing?profileId=N&universityId=M → one university
 * GET /api/chancing?profileId=N&all=1             → saved + tracked universities
 *
 * Returns a live profile-to-catalogue comparison only. This route deliberately
 * does not call the unvalidated admission-estimate engine or use other
 * applicants' outcomes. University-level catalogue fields may not describe the
 * student's exact degree or programme; the UI directs students to official
 * programme requirements before acting on a signal.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const access = await requireProfileAccess(req, searchParams.get("profileId"));
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      );
    }
    const profileId = access.targetId!;

    const [profile] = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.id, profileId));
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const locale = localeFromRequest(req);
    const matchProfile = await toMatchProfileWithActivities(profile);
    const singleId = Number(searchParams.get("universityId"));
    let universityIds: number[] = [];

    if (Number.isFinite(singleId) && singleId > 0) {
      universityIds = [singleId];
    } else {
      const [saved, tracked] = await Promise.all([
        db
          .select({ universityId: savedUniversities.universityId })
          .from(savedUniversities)
          .where(eq(savedUniversities.profileId, profileId)),
        db
          .select({ universityId: applications.universityId })
          .from(applications)
          .where(eq(applications.profileId, profileId)),
      ]);
      universityIds = [
        ...new Set(
          [...saved.map((row) => row.universityId), ...tracked.map((row) => row.universityId)].filter(
            (id): id is number => typeof id === "number" && id > 0
          )
        ),
      ];
    }

    if (!universityIds.length) {
      return NextResponse.json({ results: [], probability: ADMISSION_PROBABILITY });
    }

    const unis = await db
      .select()
      .from(universities)
      .where(inArray(universities.id, universityIds));

    const results = unis.map((uni) => {
      const fit = calculateUniversityMatch(matchProfile, toUniversityData(uni));
      return {
        universityId: uni.id,
        universityName: uni.name,
        fitScore: fit.matchScore,
        fitReasons: translateReasons(locale, "university", fit.reasonDetails, fit.reasons),
        fitIssues: translateReasons(locale, "university", fit.issueDetails, fit.potentialIssues),
        comparedDimensions: fit.breakdown.comparedDimensions,
        totalDimensions: fit.breakdown.totalDimensions,
        probability: ADMISSION_PROBABILITY,
      };
    });

    return NextResponse.json({ results, probability: ADMISSION_PROBABILITY });
  } catch (error) {
    console.error("GET /api/chancing error:", error);
    return NextResponse.json({ error: "Failed to calculate profile fit" }, { status: 500 });
  }
}
