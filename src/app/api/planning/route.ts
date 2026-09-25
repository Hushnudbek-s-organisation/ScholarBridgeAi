import { NextResponse } from "next/server";
import { db } from "@/db";
import { savedScholarships, savedUniversities, scholarships, studentProfiles, universities } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { requireProfileAccess } from "@/lib/auth";
import { calculateCosts, assessPortfolio, type ScholarshipInput } from "@/lib/costs";
import { buildCv, renderCvText } from "@/lib/cv";
import { compareUniversities, type CompareUniversity } from "@/lib/compare";
import { gpaTo4 } from "@/lib/similarProfiles";

/**
 * Planning studio (Phase 3): cost calculator, scholarship portfolio, CV
 * builder and comparison table — all derived from the student's own profile
 * and saved universities.
 *
 * Nothing here is invented: an unpublished tuition stays flagged as an
 * estimate, an empty CV field is reported as missing rather than filled with
 * plausible text, and a tie in the comparison declares no winner.
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

    const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, profileId));
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const universityId = Number(searchParams.get("universityId")) || null;

    const [savedUnis, savedSch] = await Promise.all([
      db.select().from(savedUniversities).where(eq(savedUniversities.profileId, profileId)),
      db.select().from(savedScholarships).where(eq(savedScholarships.profileId, profileId)),
    ]);

    const uniIds = savedUnis.map((s) => s.universityId);
    const uniRows =
      uniIds.length > 0
        ? await db.select().from(universities).where(inArray(universities.id, uniIds))
        : [];

    const schRows =
      savedSch.length > 0
        ? await db.select().from(scholarships).where(inArray(scholarships.id, savedSch.map((s) => s.scholarshipId)))
        : [];

    // --- Scholarships the student has actually saved ------------------------
    const scholarshipInputs: ScholarshipInput[] = schRows.map((s) => ({
      name: s.title,
      amountUsd: Number(s.amountUsdValue) || 0,
      covers: /full/i.test(s.coverageType || "")
        ? "both"
        : /tuition/i.test(s.coverageType || "")
          ? "tuition"
          : /stipend|living/i.test(s.coverageType || "")
            ? "living"
            : "other",
      // We do not know the student's odds, and inventing them would be worse
      // than useless — 0.2 is a neutral prior and the UI says so.
      probability: 0.2,
      deadlineDays: s.deadlineDate
        ? Math.round((new Date(s.deadlineDate).getTime() - Date.now()) / 86400000)
        : null,
    }));

    // --- Cost calculator ----------------------------------------------------
    const target = universityId
      ? uniRows.find((u) => u.id === universityId) ?? uniRows[0]
      : uniRows[0];

    const costs = calculateCosts({
      annualTuitionUsd: target?.annualTuitionUsd,
      annualLivingEstUsd: target?.annualLivingEstUsd,
      accommodationCostUsd: target?.accommodationCostUsd,
      applicationFeeUsd: target?.applicationFee,
      country: target?.country,
      city: target?.city,
      years: profile.degreeLevel === "Master" ? 2 : profile.degreeLevel === "PhD" ? 4 : 4,
      scholarships: scholarshipInputs,
      familyContributionUsd: profile.familyIncomeUsd ? Math.round(profile.familyIncomeUsd * 0.25) : null,
    });

    const portfolio = assessPortfolio({
      scholarships: scholarshipInputs,
      annualCostUsd: costs.annualTotalUsd,
      familyContributionUsd: costs.net.familyContributionUsd,
    });

    // --- CV ------------------------------------------------------------------
    const cv = buildCv({
      name: profile.name,
      email: profile.email,
      country: profile.country,
      targetMajor: profile.targetMajor,
      degreeLevel: profile.degreeLevel,
      graduationYear: profile.graduationYear,
      gpa: profile.gpa,
      gpaScale: profile.gpaScale,
      ieltsScore: profile.ieltsScore,
      toeflScore: profile.toeflScore,
      satScore: profile.satScore,
      actScore: profile.actScore,
      apCourses: profile.apCourses,
      ibCourses: profile.ibCourses,
      aLevelSubjects: profile.aLevelSubjects,
      leadership: profile.leadership,
      volunteering: profile.volunteering,
      sports: profile.sports,
      clubs: profile.clubs,
      researchExperience: profile.researchExperience,
      projects: profile.projects,
      workExperienceYears: profile.workExperienceYears,
      olympiads: profile.olympiads,
      awards: profile.awards,
      competitions: profile.competitions,
      certificates: profile.certificates,
      careerGoal: profile.careerGoal,
    });

    // --- Comparison ----------------------------------------------------------
    const compareList: CompareUniversity[] = uniRows.map((u) => ({
      id: u.id,
      name: u.name,
      country: u.country,
      city: u.city,
      worldRanking: u.worldRanking,
      acceptanceRate: u.acceptanceRate,
      annualTuitionUsd: u.annualTuitionUsd,
      annualLivingEstUsd: u.annualLivingEstUsd,
      minGpa: u.minGpa,
      minIelts: u.minIelts,
      minSat: u.minSat,
      postStudyWorkVisaYears: u.postStudyWorkVisaYears,
      internationalStudentsPercentage: u.internationalStudentsPercentage,
      programMajor: u.programMajor,
    }));

    const comparison = compareUniversities(compareList, {
      gpa4: gpaTo4(profile.gpa, profile.gpaScale),
      ielts: profile.ieltsScore,
      sat: profile.satScore,
      budgetAnnualUsd: profile.budgetAnnualUsd,
    });

    return NextResponse.json({
      costs,
      portfolio,
      costTarget: target ? { id: target.id, name: target.name, country: target.country } : null,
      universities: uniRows.map((u) => ({ id: u.id, name: u.name, country: u.country })),
      cv,
      cvText: renderCvText(cv),
      comparison,
    });
  } catch (error) {
    console.error("GET /api/planning error:", error);
    return NextResponse.json({ error: "Failed to build your plan" }, { status: 500 });
  }
}
