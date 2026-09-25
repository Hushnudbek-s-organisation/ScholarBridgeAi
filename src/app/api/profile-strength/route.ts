import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { essayVersions, studentProfiles } from "@/db/schema";
import { requireProfileAccess } from "@/lib/auth";
import {
  analyzeExtracurriculars,
  profileStrength,
  type ChancingProfile,
} from "@/lib/chancing";

export const dynamic = "force-dynamic";

/** Map a student_profiles row onto the chancing input shape (same fields as /api/chancing). */
function toChancingProfile(row: typeof studentProfiles.$inferSelect): ChancingProfile {
  return {
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
  };
}

/**
 * #22 Profile strength dashboard + #21 extracurricular analysis.
 *
 * The scoring lives in src/lib/chancing.ts (pure, unit-tested); this route
 * only assembles the profile row and the student's latest essay rubric score.
 * GET-only, read access, no side effects.
 */
export async function GET(req: Request) {
  try {
    const access = await requireProfileAccess(req, undefined);
    if (!access.ok) {
      return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
    }
    const profileId = access.targetId!;
    const [rows, latestEssay] = await Promise.all([
      db.select().from(studentProfiles).where(eq(studentProfiles.id, profileId)).limit(1),
      db
        .select({ rubricTotal: essayVersions.rubricTotal })
        .from(essayVersions)
        .where(eq(essayVersions.profileId, profileId))
        .orderBy(desc(essayVersions.versionNumber), desc(essayVersions.id))
        .limit(1),
    ]);
    const row = rows[0];
    if (!row) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const p = toChancingProfile(row);
    const essayScore = latestEssay.length ? (latestEssay[0].rubricTotal ?? null) : null;

    return NextResponse.json({
      strength: profileStrength(p, { essayScore }),
      extracurriculars: analyzeExtracurriculars(p),
    });
  } catch {
    return NextResponse.json({ error: "Failed to load profile strength" }, { status: 500 });
  }
}
