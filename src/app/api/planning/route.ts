import { NextResponse } from "next/server";
import { db } from "@/db";
import { savedScholarships, savedUniversities, scholarships, studentProfiles, universities } from "@/db/schema";
import { asc, eq, inArray, sql } from "drizzle-orm";
import { requireProfileAccess } from "@/lib/auth";
import { assessPortfolio, type ScholarshipInput } from "@/lib/costs";
import { buildCv, renderCvText } from "@/lib/cv";
import { localizeCv } from "@/lib/cvI18n";
import { localeFromRequest } from "@/lib/engineText";
import { compareUniversities, type CompareUniversity, type CompareRow } from "@/lib/compare";
import { gpaTo40Scale } from "@/lib/gpa";
import { resolvedUsdUniversityCosts } from "@/lib/usdCosts";
import {
  COUNTRY_COST_BENCHMARKS,
  CURRENCY_RATES_TO_USD,
  calculateCompleteCosts,
  resolveMultiCurrencyScholarshipAmount,
} from "@/lib/countryCostBenchmarks";
import { calculateUniversityMatch } from "@/lib/matching";
import { toMatchProfileWithActivities, toUniversityData } from "@/lib/profileMapping";
import { ADMISSION_PROBABILITY } from "@/lib/chancing";

function parseOptionalNumber(raw: string | null): number | null {
  if (raw == null || !raw.trim()) return null;
  const num = Number(raw);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

/**
 * Planning studio (Phase 3): cost calculator, scholarship portfolio, CV
 * builder and comparison table — all derived from the student's own profile,
 * saved universities, and verified country cost benchmarks.
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

    const rawUniversityId = searchParams.get("universityId");
    const countryParam = (searchParams.get("country") || "").trim() || null;
    const displayCurrency = ((searchParams.get("currency") || "USD").trim().toUpperCase()) || "USD";
    const degreeLevelParam = (searchParams.get("degreeLevel") || "").trim() || null;
    const yearsOverride = parseOptionalNumber(searchParams.get("years"));
    const familyContributionOverride = parseOptionalNumber(searchParams.get("familyContributionUsd"));

    const customOverrides = {
      annualTuitionUsd: parseOptionalNumber(searchParams.get("tuitionUsd")),
      annualLivingEstUsd: parseOptionalNumber(searchParams.get("livingUsd")),
      insurancePerYearUsd: parseOptionalNumber(searchParams.get("insuranceUsd")),
      booksPerYearUsd: parseOptionalNumber(searchParams.get("booksUsd")),
      flightsPerYearUsd: parseOptionalNumber(searchParams.get("flightsUsd")),
      visaFeeUsd: parseOptionalNumber(searchParams.get("visaUsd")),
      applicationFeeUsd: parseOptionalNumber(searchParams.get("appFeeUsd")),
    };

    const [savedUnis, savedSch, catalogRows] = await Promise.all([
      db.select().from(savedUniversities).where(eq(savedUniversities.profileId, profileId)),
      db.select().from(savedScholarships).where(eq(savedScholarships.profileId, profileId)),
      db
        .select()
        .from(universities)
        .where(eq(universities.isActive, true))
        .orderBy(asc(universities.worldRanking), asc(universities.id))
        .limit(20),
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
    const scholarshipInputs: ScholarshipInput[] = schRows.map((s) => {
      const resolvedAward = resolveMultiCurrencyScholarshipAmount(s);
      return {
        name: s.title,
        amountUsd: resolvedAward.amountUsd,
        awardPeriod: s.awardPeriod || "year",
        covers: /full/i.test(s.coverageType || "")
          ? "both"
          : /tuition/i.test(s.coverageType || "")
            ? "tuition"
            : /stipend|living/i.test(s.coverageType || "")
              ? "living"
              : "other",
        deadlineDays: s.deadlineDate
          ? Math.round((new Date(s.deadlineDate).getTime() - Date.now()) / 86400000)
          : null,
      };
    });

    // --- Cost calculator ----------------------------------------------------
    const allKnownUnis = [...uniRows];
    for (const c of catalogRows) {
      if (!allKnownUnis.some((u) => u.id === c.id)) {
        allKnownUnis.push(c);
      }
    }

    const universityId = rawUniversityId === "0" ? null : Number(rawUniversityId) || null;
    const countryOnlyMode = rawUniversityId === "0" || (countryParam != null && !universityId);
    const target = countryOnlyMode
      ? null
      : universityId
        ? allKnownUnis.find((u) => u.id === universityId) ?? uniRows[0] ?? catalogRows[0] ?? null
        : uniRows[0] ?? catalogRows[0] ?? null;

    // Raw un-enriched baseline keeps years: null and familyContributionUsd: null
    // unless resolved through country benchmarks or explicit query parameters.
    const baseUnset = { years: null, familyContributionUsd: null };

    const { costs, resolved } = calculateCompleteCosts({
      university: target,
      countryOverride: countryParam ?? target?.country ?? null,
      degreeLevel: degreeLevelParam ?? target?.degreeLevel ?? profile.degreeLevel ?? null,
      yearsOverride: yearsOverride ?? baseUnset.years,
      familyContributionUsd: familyContributionOverride ?? baseUnset.familyContributionUsd,
      scholarships: scholarshipInputs,
      overrides: customOverrides,
    });

    const matchProfile = await toMatchProfileWithActivities(profile);
    const portfolio = assessPortfolio({ scholarships: scholarshipInputs });

    // --- CV ------------------------------------------------------------------
    const cvDraft = buildCv({
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
    const cv = localizeCv(localeFromRequest(req), cvDraft);

    // --- Comparison ----------------------------------------------------------
    const countryCounts = await db
      .select({ country: scholarships.country, n: sql<number>`count(*)::int` })
      .from(scholarships)
      .groupBy(scholarships.country);
    const schCountByCountry = new Map(countryCounts.map((r) => [r.country, r.n]));

    const compareList: CompareUniversity[] = uniRows.map((u) => {
      const costsUsd = resolvedUsdUniversityCosts(u);
      return {
        id: u.id,
        name: u.name,
        country: u.country,
        city: u.city,
        worldRanking: u.worldRanking,
        acceptanceRate: u.acceptanceRate,
        annualTuitionUsd: costsUsd.annualTuitionUsd,
        annualLivingEstUsd: costsUsd.annualLivingEstUsd,
        minGpa: u.minGpa,
        minIelts: u.minIelts,
        minSat: u.minSat,
        postStudyWorkVisaYears: u.postStudyWorkVisaYears,
        internationalStudentsPercentage: u.internationalStudentsPercentage,
        programMajor: u.programMajor,
        scholarshipCount: schCountByCountry.get(u.country) ?? 0,
      };
    });

    const pickWinner = (items: { id: number; score: number }[]): number | null => {
      if (items.length < 2) return null;
      const best = Math.max(...items.map((i) => i.score));
      const tied = items.filter((i) => i.score === best);
      return tied.length === 1 ? tied[0].id : null;
    };

    const chanced = compareList.map((u) => {
      const uni = uniRows.find((r) => r.id === u.id)!;
      const match = calculateUniversityMatch(matchProfile, toUniversityData(uni)).matchScore;
      return { id: u.id, match };
    });

    const matchRow: CompareRow = {
      key: "profileMatch",
      label: "Your profile match",
      values: Object.fromEntries(chanced.map((c) => [c.id, `${Math.round(c.match)}%`])),
      winner: pickWinner(chanced.map((c) => ({ id: c.id, score: c.match }))),
      winnerReason: "Highest fit with your profile.",
      allUnknown: chanced.length === 0,
    };

    const comparison = compareUniversities(
      compareList,
      {
        gpa4: gpaTo40Scale(profile.gpa, profile.gpaScale),
        ielts: profile.ieltsScore,
        sat: profile.satScore,
        budgetAnnualUsd: profile.budgetAnnualUsd,
      },
      [matchRow]
    );

    return NextResponse.json({
      costs,
      portfolio,
      costTarget: target
        ? { id: target.id, name: target.name, country: target.country }
        : { id: 0, name: `${resolved.benchmarkSource.country} Official Benchmark`, country: resolved.benchmarkSource.country },
      universities: uniRows.map((u) => ({ id: u.id, name: u.name, country: u.country })),
      catalogUniversities: catalogRows.map((u) => ({ id: u.id, name: u.name, country: u.country })),
      countries: Object.keys(COUNTRY_COST_BENCHMARKS),
      currencyRates: CURRENCY_RATES_TO_USD,
      displayCurrency,
      benchmarkSource: resolved.benchmarkSource,
      conversionNotes: resolved.conversionNotes,
      resolvedInputs: {
        years: resolved.inputs.years ?? 4,
        degreeLevel: degreeLevelParam ?? target?.degreeLevel ?? profile.degreeLevel ?? "Bachelor",
        annualTuitionUsd: resolved.inputs.annualTuitionUsd ?? 0,
        annualLivingEstUsd: resolved.inputs.annualLivingEstUsd ?? 0,
        insurancePerYearUsd: resolved.inputs.insurancePerYearUsd ?? 0,
        booksPerYearUsd: resolved.inputs.booksPerYearUsd ?? 0,
        flightsPerYearUsd: resolved.inputs.flightsPerYearUsd ?? 0,
        visaFeeUsd: resolved.inputs.visaFeeUsd ?? 0,
        applicationFeeUsd: resolved.inputs.applicationFeeUsd ?? 0,
        familyContributionUsd: resolved.inputs.familyContributionUsd ?? null,
      },
      cv,
      cvText: renderCvText(cvDraft),
      comparison,
      probability: ADMISSION_PROBABILITY,
    });
  } catch (error) {
    console.error("GET /api/planning error:", error);
    return NextResponse.json({ error: "Failed to build your plan" }, { status: 500 });
  }
}
