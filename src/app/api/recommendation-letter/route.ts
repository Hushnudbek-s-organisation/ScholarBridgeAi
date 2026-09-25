import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { studentProfiles, universities } from "@/db/schema";
import { requireProfileAccess } from "@/lib/auth";
import { buildRecLetterBrief } from "@/lib/recLetter";

export const dynamic = "force-dynamic";

/**
 * #20 Recommendation letter helper.
 *
 * GET /api/recommendation-letter?universityId=&deadline=
 *
 * Returns a data-driven brief the student hands to their recommender:
 * talking points from REAL profile data only, a suggested outline with those
 * facts already placed, the profile gaps that weaken the letter, and the
 * practical checklist. Nothing is invented — missing data is listed under
 * `dataMissing` instead of being filled in.
 */
export async function GET(req: Request) {
  try {
    const access = await requireProfileAccess(req, undefined);
    if (!access.ok) {
      return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
    }
    const profileId = access.targetId!;
    const url = new URL(req.url);

    // University: free-text title (what the UI sends) or a resolved id.
    const universityId = Number(url.searchParams.get("universityId") ?? NaN);
    let universityTitle: string | null = url.searchParams.get("universityTitle")?.trim() || null;
    if (universityTitle == null && Number.isInteger(universityId) && universityId > 0) {
      const u = await db
        .select({ name: universities.name })
        .from(universities)
        .where(eq(universities.id, universityId))
        .limit(1);
      universityTitle = u[0]?.name ?? null;
    }

    const rows = await db.select().from(studentProfiles).where(eq(studentProfiles.id, profileId)).limit(1);
    const row = rows[0];
    if (!row) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const brief = buildRecLetterBrief(
      {
        name: row.name,
        gpa: row.gpa,
        gpaScale: row.gpaScale,
        ieltsScore: row.ieltsScore,
        toeflScore: row.toeflScore,
        satScore: row.satScore,
        actScore: row.actScore,
        greScore: row.greScore,
        duolingoScore: row.duolingoScore,
        country: row.country,
        targetMajor: row.targetMajor,
        degreeLevel: row.degreeLevel,
        extracurriculars: row.extracurriculars,
        leadership: row.leadership,
        volunteering: row.volunteering,
        sports: row.sports,
        clubs: row.clubs,
        researchExperience: row.researchExperience,
        projects: row.projects,
        olympiads: row.olympiads,
        awards: row.awards,
        competitions: row.competitions,
        certificates: row.certificates,
        workExperienceYears: row.workExperienceYears,
        researchPublications: row.researchPublications,
        budgetAnnualUsd: row.budgetAnnualUsd,
        careerGoal: row.careerGoal,
        graduationYear: row.graduationYear,
        needScholarship: row.needScholarship,
        needsFinancialAid: row.needsFinancialAid,
        requiresFullScholarship: row.requiresFullScholarship,
      },
      {
        universityTitle,
        deadline: url.searchParams.get("deadline") || null,
      }
    );

    return NextResponse.json(brief);
  } catch {
    return NextResponse.json({ error: "Failed to build the recommendation brief" }, { status: 500 });
  }
}
