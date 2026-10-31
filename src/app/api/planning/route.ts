import { NextResponse } from "next/server";
import { db } from "@/db";
import { verifiedQsRankNumber } from "@/lib/universityRank";
import { savedScholarships, savedUniversities, scholarships, studentActivities, studentProfiles, universities } from "@/db/schema";
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
  resolveCompleteCostInputs,
  resolveMultiCurrencyScholarshipAmount,
} from "@/lib/countryCostBenchmarks";
import { countriesMatch } from "@/lib/countries";
import { calculateUniversityMatch } from "@/lib/matching";
import { toMatchProfileWithActivities, toUniversityData } from "@/lib/profileMapping";
import { ADMISSION_PROBABILITY } from "@/lib/chancing";

function parseOptionalNumber(raw: string | null): number | null {
  if (raw == null || !raw.trim()) return null;
  const num = Number(raw);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

/** Awards not tied to one destination apply everywhere their rules allow. */
const GLOBAL_AWARD_COUNTRY_RE = /^(global|international|all|worldwide|multiple countries)$/i;

/** Same vocabulary the cost engine itself uses for what an award pays. */
function coversOf(s: typeof scholarships.$inferSelect): "tuition" | "living" | "both" | "other" {
  return /full/i.test(s.coverageType || "")
    ? "both"
    : /tuition/i.test(s.coverageType || "")
      ? "tuition"
      : /stipend|living/i.test(s.coverageType || "")
        ? "living"
        : "other";
}

/** Annual figure for DISPLAY only (month→×12, semester→×2, rest as published). */
function annualizeForDisplay(amountUsd: number | null, awardPeriod: string | null | undefined): number | null {
  if (amountUsd == null) return null;
  const p = (awardPeriod ?? "").trim().toLowerCase();
  if (/month/.test(p)) return Math.round(amountUsd * 12);
  if (/semester|term/.test(p)) return Math.round(amountUsd * 2);
  return Math.round(amountUsd);
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

    // --- Cost calculator: resolve the TARGET first ---------------------------
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

    const costOptions = {
      university: target,
      countryOverride: countryParam ?? target?.country ?? null,
      degreeLevel: degreeLevelParam ?? target?.degreeLevel ?? profile.degreeLevel ?? null,
      yearsOverride: yearsOverride ?? baseUnset.years,
      familyContributionUsd: familyContributionOverride ?? baseUnset.familyContributionUsd,
      overrides: customOverrides,
    };

    // Module 5 — pass 1 resolves the country benchmark and the annual
    // tuition WITHOUT any awards: those two figures decide which scholarships
    // are meaningful for THIS university (a Korean grant cannot pay a German
    // bill, and a "full tuition" award is worth exactly the tuition line).
    const preResolved = resolveCompleteCostInputs({ ...costOptions, scholarships: [] });
    const activeTargetCountry =
      (countryParam ?? target?.country ?? preResolved.benchmarkSource.country ?? "").trim() || null;
    const targetAnnualTuitionUsd = preResolved.inputs.annualTuitionUsd ?? null;
    const targetAnnualLivingUsd = preResolved.inputs.annualLivingEstUsd ?? null;

    /**
     * Effective ANNUAL USD value of one award for this university:
     *  • "full" awards top up to the tuition line when the catalogue amount is
     *    missing or smaller (plus the living line when the award funds both);
     *  • everything else keeps its published (annualised) figure — an award
     *    with no amount contributes nothing to the deduction rather than $0 fudge.
     */
    function awardAnnualUsd(s: typeof scholarships.$inferSelect): { annual: number | null; isFullTuition: boolean } {
      const resolvedAward = resolveMultiCurrencyScholarshipAmount(s);
      const isFullTuition =
        /\bfull\b/i.test(s.coverageType ?? "") || /\bfull\b/i.test(s.tuitionCoverage ?? "");
      const base = annualizeForDisplay(resolvedAward.amountUsd, s.awardPeriod);
      if (isFullTuition && targetAnnualTuitionUsd != null && targetAnnualTuitionUsd > 0) {
        let full = Math.max(base ?? 0, targetAnnualTuitionUsd);
        const fundsLiving = /both|full[\s-]*ride|full\s+fund|living|stipend|room|board/i.test(
          `${s.coverageType ?? ""} ${s.tuitionCoverage ?? ""}`
        );
        if (coversOf(s) === "both" || (fundsLiving && targetAnnualLivingUsd != null)) {
          full += targetAnnualLivingUsd ?? 0;
        }
        return { annual: full, isFullTuition };
      }
      return { annual: base, isFullTuition };
    }

    function matchesTargetCountry(s: typeof scholarships.$inferSelect): boolean {
      if (activeTargetCountry && countriesMatch(s.country, activeTargetCountry)) return true;
      if (GLOBAL_AWARD_COUNTRY_RE.test((s.country ?? "").trim())) return true;
      const name = (target?.name ?? "").trim().toLowerCase();
      return !!name && (s.title ?? "").toLowerCase().includes(name);
    }

    // Candidate pool: everything the student saved, plus the best active
    // awards published for this destination (or global ones) they have not
    // saved yet — surfaced so "what if I won THIS grant?" is one click.
    const savedIds = new Set(schRows.map((s) => s.id));
    let suggestedRows: typeof scholarships.$inferSelect[] = [];
    try {
      const activeRows = await db.select().from(scholarships).where(eq(scholarships.isActive, true));
      suggestedRows = activeRows
        .filter((s) => !savedIds.has(s.id) && matchesTargetCountry(s))
        .map((s) => ({ s, a: awardAnnualUsd(s) }))
        .sort((x, y) => {
          // Full-coverage first, then the bigger annual value, then id.
          if (y.a.isFullTuition !== x.a.isFullTuition) return Number(y.a.isFullTuition) - Number(x.a.isFullTuition);
          return (y.a.annual ?? -1) - (x.a.annual ?? -1) || x.s.id - y.s.id;
        })
        .slice(0, 12)
        .map((x) => x.s);
    } catch {
      suggestedRows = [];
    }

    type Candidate = {
      id: number;
      title: string;
      provider: string;
      country: string;
      coverageType: string;
      covers: "tuition" | "living" | "both" | "other";
      effectiveAnnualUsd: number | null;
      awardPeriod: string | null;
      deadlineDate: string | null;
      saved: boolean;
      matchesTargetCountry: boolean;
    };
    const candidates: Candidate[] = [...schRows, ...suggestedRows].map((s) => {
      const a = awardAnnualUsd(s);
      return {
        id: s.id,
        title: s.title,
        provider: s.provider,
        country: s.country,
        coverageType: s.coverageType,
        covers: coversOf(s),
        effectiveAnnualUsd: a.annual,
        awardPeriod: s.awardPeriod ?? null,
        deadlineDate: s.deadlineDate ? String(s.deadlineDate).slice(0, 10) : null,
        saved: savedIds.has(s.id),
        matchesTargetCountry: savedIds.has(s.id) ? matchesTargetCountry(s) : true,
      };
    });

    // Which awards actually deduct from the cost:
    //  • `?scholarshipIds=` present → exactly those ids (empty = no awards),
    //    letting the student check/uncheck rows in the calculator;
    //  • absent (initial load) → every SAVED award that applies to this
    //    country, so a Korean grant no longer silently "pays" a German bill.
    const explicitSelection = searchParams.has("scholarshipIds");
    const selectedIds = new Set(
      explicitSelection
        ? (searchParams.get("scholarshipIds") ?? "")
            .split(",")
            .map((x) => Number.parseInt(x.trim(), 10))
            .filter((n) => Number.isFinite(n))
        : candidates.filter((c) => c.saved && c.matchesTargetCountry).map((c) => c.id)
    );

    const rowById = new Map([...schRows, ...suggestedRows].map((s) => [s.id, s]));
    const scholarshipInputs: ScholarshipInput[] = candidates
      .filter((c) => selectedIds.has(c.id))
      .map((c) => {
        const s = rowById.get(c.id)!;
        const resolvedAward = resolveMultiCurrencyScholarshipAmount(s);
        return {
          name: c.title,
          // `effectiveAnnualUsd` is already an ANNUAL USD figure (including the
          // full-tuition top-up); telling the engine the period is "year"
          // prevents a second annualisation. Without a computable figure the
          // published amount + period pass through untouched.
          amountUsd: c.effectiveAnnualUsd ?? resolvedAward.amountUsd,
          awardPeriod: c.effectiveAnnualUsd != null ? "year" : s.awardPeriod || "year",
          covers: c.covers,
          deadlineDays: s.deadlineDate
            ? Math.round((new Date(s.deadlineDate).getTime() - Date.now()) / 86400000)
            : null,
        };
      });

    const { costs, resolved } = calculateCompleteCosts({
      ...costOptions,
      scholarships: scholarshipInputs,
    });

    const matchProfile = await toMatchProfileWithActivities(profile);
    // The portfolio tab keeps its honest contract: it grades EVERY saved
    // award (that is the student's portfolio, not the selected subset).
    const portfolio = assessPortfolio({
      scholarships: schRows.map((s) => ({
        name: s.title,
        amountUsd: resolveMultiCurrencyScholarshipAmount(s).amountUsd,
        awardPeriod: s.awardPeriod || "year",
        covers: coversOf(s),
        deadlineDays: s.deadlineDate
          ? Math.round((new Date(s.deadlineDate).getTime() - Date.now()) / 86400000)
          : null,
      })),
    });

    // --- CV ------------------------------------------------------------------
    const activities = await db.select().from(studentActivities).where(eq(studentActivities.profileId, profileId)).orderBy(asc(studentActivities.sortOrder), asc(studentActivities.id));
    const activityText = (...categories: string[]) => activities
      .filter((a) => categories.includes(a.category.toLowerCase()))
      .map((a) => [a.title, a.role, a.organization, a.description, a.achievements].filter(Boolean).join(" — "))
      .join(" | ");
    const appendActivityText = (legacy: string | null, extra: string) => [legacy, extra].filter(Boolean).join(", ");
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
      leadership: appendActivityText(profile.leadership, activityText("leadership")),
      volunteering: appendActivityText(profile.volunteering, activityText("volunteering", "community")),
      sports: appendActivityText(profile.sports, activityText("sport", "sports")),
      clubs: appendActivityText(profile.clubs, activityText("club")),
      researchExperience: appendActivityText(profile.researchExperience, activityText("research")),
      projects: appendActivityText(profile.projects, activityText("project")),
      awards: appendActivityText(profile.awards, activityText("award")),
      competitions: appendActivityText(profile.competitions, activityText("competition")),
      certificates: appendActivityText(profile.certificates, activityText("certificate")),
      workExperienceYears: profile.workExperienceYears,
      olympiads: profile.olympiads,
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
        // Phase AD: no recorded edition, no position.
        worldRanking: verifiedQsRankNumber(u),
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
      // Module 5 — the interactive award selector: saved awards for this
      // country (checked by default), suggested awards for this country
      // (unchecked), and saved awards for OTHER countries (shown muted so
      // the student understands why they are not deducted here).
      activeTargetCountry,
      availableScholarships: candidates.map((c) => ({ ...c, selected: selectedIds.has(c.id) })),
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
