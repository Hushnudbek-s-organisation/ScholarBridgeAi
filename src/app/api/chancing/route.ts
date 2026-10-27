import { NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  applicationOutcomes,
  applications,
  essayVersions,
  programRequirements,
  savedUniversities,
  studentProfiles,
  universities,
  universityPrograms,
} from "@/db/schema";
import { requireProfileAccess } from "@/lib/auth";
import { applyMatchScenario, calculateUniversityMatch, majorOverlap, type MatchScenario } from "@/lib/matching";
import { localeFromRequest, translateReasons } from "@/lib/engineText";
import { toMatchProfileWithActivities, toUniversityData } from "@/lib/profileMapping";
import { memoizeMatch } from "@/lib/matchMemo";
import { profileMatchFingerprint } from "@/lib/profileMatchFingerprint";
import { ADMISSION_PROBABILITY, type ChancingProfile } from "@/lib/chancing";
import { matchQsUniversityBenchmark } from "@/lib/qsTop200Benchmarks";
import {
  evaluateUniversityAndProgramChance,
  PROGRAM_DEPARTMENT_PROFILES,
  type EmpiricalOutcomeRowInput,
  type ProgramCatalogRowInput,
  type ProgramRequirementRowInput,
} from "@/lib/programChancing";
import { countriesMatch } from "@/lib/countries";
import { ensureOutcomesAndStoriesSeeded } from "@/db/seedOutcomesAndStories";
import { getCachedUniversitiesBundle } from "@/lib/catalogCache";

export const dynamic = "force-dynamic";

/**
 * GET /api/chancing?profileId=N&universityId=M&programId=P → one university / program
 * GET /api/chancing?profileId=N&all=1                      → saved + tracked universities
 *
 * Returns a live profile-to-catalogue comparison plus QS Top 200 & program-level
 * 25th/50th/75th percentile positioning. Keeps `probability: ADMISSION_PROBABILITY`
 * intact and never fabricates a numeric admission probability.
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

    await ensureOutcomesAndStoriesSeeded();

    const [profile] = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.id, profileId));
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    const [latestEssaySignal] = await db.select({ rubricTotal: essayVersions.rubricTotal })
      .from(essayVersions)
      .where(and(eq(essayVersions.profileId, profileId), inArray(essayVersions.essayType, ["private_memory", "sop", "personal_statement", "why_us", "supplemental", "scholarship"])))
      .orderBy(desc(essayVersions.createdAt), desc(essayVersions.id)).limit(1);

    const locale = localeFromRequest(req);
    let matchProfile = await toMatchProfileWithActivities(profile);

    // Optional What-If overrides for SAT, TOEFL, Degree Level, and EC score
    let overrideSat: number | null | undefined = undefined;
    let overrideToefl: number | null | undefined = undefined;
    let overrideDegreeLevel: string | null | undefined = undefined;

    const scenarioEnabled = searchParams.get("scenario") === "1";
    if (scenarioEnabled) {
      const scenario: MatchScenario = {};
      const parseScenarioNumber = (key: string, min: number, max: number): number | null | undefined => {
        const raw = searchParams.get(key);
        if (raw == null) return undefined;
        if (raw === "null") return null;
        const value = Number(raw);
        return Number.isFinite(value) && value >= min && value <= max ? value : undefined;
      };
      for (const [key, field, min, max] of [
        ["scenarioGpa4", "gpa4", 0, 4],
        ["scenarioIelts", "ieltsScore", 0, 9],
        ["scenarioBudgetUsd", "budgetAnnualUsd", 0, 100_000_000],
      ] as const) {
        if (!searchParams.has(key)) continue;
        const raw = searchParams.get(key)!;
        if (raw.trim() === "") return NextResponse.json({ error: `Invalid ${key} scenario value` }, { status: 400 });
        const value = parseScenarioNumber(key, min, max);
        if (value === undefined) {
          return NextResponse.json({ error: `Invalid ${key} scenario value` }, { status: 400 });
        }
        (scenario as Record<string, number | null>)[field] = value;
      }
      if (searchParams.has("scenarioMajor")) {
        const rawMajor = searchParams.get("scenarioMajor") ?? "";
        if (rawMajor !== "null" && rawMajor.length > 120) {
          return NextResponse.json({ error: "scenarioMajor must be at most 120 characters" }, { status: 400 });
        }
        scenario.targetMajor = rawMajor === "null" ? null : rawMajor.trim() || null;
      }
      if (searchParams.has("scenarioSat")) {
        const satVal = parseScenarioNumber("scenarioSat", 400, 1600);
        if (satVal !== undefined) overrideSat = satVal;
      }
      if (searchParams.has("scenarioToefl")) {
        const toeflVal = parseScenarioNumber("scenarioToefl", 0, 120);
        if (toeflVal !== undefined) overrideToefl = toeflVal;
      }
      if (searchParams.has("scenarioDegreeLevel")) {
        const rawDeg = (searchParams.get("scenarioDegreeLevel") ?? "").trim();
        if (rawDeg) overrideDegreeLevel = rawDeg;
      }
      // The shared scorer receives a copy. Nothing in the profile row is updated.
      matchProfile = applyMatchScenario(matchProfile, scenario);
    }

    // Memo key for every fit score below. Taken from the FINAL match profile, so
    // a scenario override ("what if my IELTS were 7.5?") gets its own cache
    // entry instead of reusing the real profile's scores.
    const fingerprint = profileMatchFingerprint(matchProfile);

    const singleId = Number(searchParams.get("universityId"));
    const requestedProgramId = Number(searchParams.get("programId"));
    const filterCountry = (searchParams.get("country") ?? "").trim();
    const searchQuery = (searchParams.get("search") ?? "").trim().toLowerCase();
    const includeCatalog = searchParams.get("includeCatalog") === "1";

    let universityIds: number[] = [];
    let isCatalogSample = false;

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

    // Load all catalog universities for switcher & fallback sample — from the
    // shared catalogue cache, so this screen scores the exact same rows (and
    // the same resolved costs) the Explorer scores.
    const allCatalogUnis = (await getCachedUniversitiesBundle()).unis;

    let unis = universityIds.length
      ? allCatalogUnis.filter((u) => universityIds.includes(u.id))
      : [];

    // If the student has no saved universities or explicitly searches/filters the catalog
    if ((!unis.length && allCatalogUnis.length > 0) || includeCatalog || filterCountry || searchQuery) {
      let pool = allCatalogUnis;
      if (filterCountry) {
        pool = pool.filter((u) => countriesMatch(u.country, filterCountry));
      }
      if (searchQuery) {
        pool = pool.filter(
          (u) =>
            u.name.toLowerCase().includes(searchQuery) ||
            (u.canonicalName && u.canonicalName.toLowerCase().includes(searchQuery)) ||
            (u.shortName && u.shortName.toLowerCase().includes(searchQuery)) ||
            u.country.toLowerCase().includes(searchQuery) ||
            (u.programMajor && u.programMajor.toLowerCase().includes(searchQuery))
        );
      }
      const scoredPool = pool
        .map((u) => ({
          uni: u,
          fit: memoizeMatch("fit", fingerprint, u.id, toUniversityData(u) as unknown as Record<string, unknown>, () =>
            calculateUniversityMatch(matchProfile, toUniversityData(u))
          ),
        }))
        .sort((a, b) => b.fit.matchScore - a.fit.matchScore)
        .slice(0, 12)
        .map((x) => x.uni);

      if (!unis.length) {
        unis = scoredPool;
        isCatalogSample = true;
      } else if (includeCatalog || filterCountry || searchQuery) {
        const existingIds = new Set(unis.map((u) => u.id));
        for (const extra of scoredPool) {
          if (!existingIds.has(extra.id)) {
            unis.push(extra);
            existingIds.add(extra.id);
          }
        }
      }
    }

    if (!unis.length) {
      return NextResponse.json({
        results: [],
        probability: ADMISSION_PROBABILITY,
        scenario: scenarioEnabled,
        isCatalogSample: false,
        catalogUniversities: [],
        departments: Object.values(PROGRAM_DEPARTMENT_PROFILES),
      });
    }

    const activeUniIds = unis.map((u) => u.id);

    // Fetch programs, program_requirements, and consented outcomes for the evaluated universities
    const rawPrograms = await db
      .select()
      .from(universityPrograms)
      .where(inArray(universityPrograms.universityId, activeUniIds));

    const programIds = rawPrograms.map((p) => p.id);
    const rawProgramReqs =
      programIds.length > 0
        ? await db
            .select()
            .from(programRequirements)
            .where(inArray(programRequirements.programId, programIds))
        : [];

    const reqByProgramId = new Map<number, ProgramRequirementRowInput>();
    for (const r of rawProgramReqs) {
      reqByProgramId.set(r.programId, {
        id: r.id,
        programId: r.programId,
        minIelts: r.minIelts,
        minToefl: r.minToefl,
        minDet: r.minDet,
        minSat: r.minSat,
        minAct: r.minAct,
        minGpa: r.minGpa,
        ibRequirement: r.ibRequirement,
        aLevelRequirement: r.aLevelRequirement,
        apRequirement: r.apRequirement,
        subjectRequirements: r.subjectRequirements,
        portfolioRequired: r.portfolioRequired,
        interviewRequired: r.interviewRequired,
        recommendationRequired: r.recommendationRequired,
        personalStatementRequired: r.personalStatementRequired,
        otherRequirements: r.otherRequirements,
        academicYear: r.academicYear,
        sourceUrl: r.sourceUrl,
      });
    }

    const programsByUniId = new Map<number, ProgramCatalogRowInput[]>();
    for (const p of rawPrograms) {
      const list = programsByUniId.get(p.universityId) ?? [];
      list.push({
        id: p.id,
        universityId: p.universityId,
        name: p.name,
        degreeLevel: p.degree || "Bachelor",
        field: p.field,
        department: p.field,
        language: p.language,
        durationYears: p.durationYears ? Number(p.durationYears) : null,
        tuitionAnnualUsd: p.tuitionAmount ? Number(p.tuitionAmount) : null,
        applicationFeeUsd: null,
        intakeTerms: p.studyMode,
        applicationType: null,
        officialProgramUrl: p.programUrl || p.applicationUrl || p.sourceUrl,
        sourceUrl: p.sourceUrl || p.programUrl,
      });
      programsByUniId.set(p.universityId, list);
    }

    // Consented empirical outcomes for active universities (never alters fitScore or probability)
    const rawOutcomes = await db
      .select({
        universityId: applicationOutcomes.universityId,
        result: applicationOutcomes.result,
        shareConsent: applicationOutcomes.shareConsent,
        snapshotGpa: applicationOutcomes.snapshotGpa,
        snapshotGpaScale: applicationOutcomes.snapshotGpaScale,
        snapshotIelts: applicationOutcomes.snapshotIelts,
        snapshotToefl: applicationOutcomes.snapshotToefl,
        snapshotSat: applicationOutcomes.snapshotSat,
        snapshotAct: applicationOutcomes.snapshotAct,
        snapshotMajor: applicationOutcomes.snapshotMajor,
        snapshotCountry: applicationOutcomes.snapshotCountry,
      })
      .from(applicationOutcomes)
      .where(
        and(
          inArray(applicationOutcomes.universityId, activeUniIds),
          eq(applicationOutcomes.shareConsent, true)
        )
      );

    const outcomesByUniId = new Map<number, EmpiricalOutcomeRowInput[]>();
    for (const o of rawOutcomes) {
      if (o.universityId == null) continue;
      const arr = outcomesByUniId.get(o.universityId) ?? [];
      arr.push(o);
      outcomesByUniId.set(o.universityId, arr);
    }

    // Construct ChancingProfile for the 5-layer program positioning engine
    const chancingProfile: ChancingProfile & { completedCourses?: string | null } = {
      gpa: matchProfile.gpa !== undefined ? matchProfile.gpa : profile.gpa,
      gpaScale: matchProfile.gpaScale !== undefined ? matchProfile.gpaScale : profile.gpaScale,
      satScore: overrideSat !== undefined ? overrideSat : profile.satScore,
      actScore: profile.actScore,
      ieltsScore: matchProfile.ieltsScore !== undefined ? matchProfile.ieltsScore : profile.ieltsScore,
      toeflScore: overrideToefl !== undefined ? overrideToefl : profile.toeflScore,
      duolingoScore: profile.duolingoScore,
      targetMajor: matchProfile.targetMajor !== undefined ? matchProfile.targetMajor : profile.targetMajor,
      degreeLevel:
        overrideDegreeLevel !== undefined
          ? overrideDegreeLevel
          : matchProfile.degreeLevel || profile.degreeLevel,
      extracurriculars: profile.extracurriculars,
      leadership: profile.leadership,
      volunteering: profile.volunteering,
      sports: profile.sports,
      clubs: profile.clubs,
      researchExperience: profile.researchExperience,
      projects: profile.projects,
      olympiads: profile.olympiads,
      awards: profile.awards,
      competitions: profile.competitions,
      certificates: profile.certificates,
      workExperienceYears: profile.workExperienceYears,
      researchPublications: profile.researchPublications,
      completedCourses: profile.courseworkNotes || profile.apCourses || profile.ibCourses || profile.aLevelSubjects,
      privateEssayScore: latestEssaySignal?.rubricTotal ?? null,
    };

    const results = unis.map((uni) => {
      const fit = memoizeMatch("fit", fingerprint, uni.id, toUniversityData(uni) as unknown as Record<string, unknown>, () =>
        calculateUniversityMatch(matchProfile, toUniversityData(uni))
      );
      const qsBenchmark = matchQsUniversityBenchmark(uni);
      const uniPrograms = programsByUniId.get(uni.id) ?? [];
      const uniOutcomes = outcomesByUniId.get(uni.id) ?? [];

      // Evaluate all catalog programs at this university (or synthesize default programs if none in DB)
      const effectivePrograms: ProgramCatalogRowInput[] =
        uniPrograms.length > 0
          ? uniPrograms
          : (uni.programMajor || "Computer Science, Business & Economics, Mechanical Engineering")
              .split(",")
              .map((m) => m.trim())
              .filter(Boolean)
              .slice(0, 6)
              .map((majorName, idx) => ({
                id: -(uni.id * 100 + idx + 1),
                universityId: uni.id,
                name: `${majorName}`,
                degreeLevel: chancingProfile.degreeLevel || "Bachelor",
                field: majorName,
                department: majorName,
                language: "English",
                durationYears: 4,
                tuitionAnnualUsd: uni.annualTuitionUsd,
                applicationFeeUsd: uni.applicationFee ? Number(uni.applicationFee) : null,
                intakeTerms: "Fall",
                applicationType: null,
                officialProgramUrl: uni.officialWebsiteUrl || uni.websiteUrl || qsBenchmark.officialUrl,
                sourceUrl: uni.sourceUrl || uni.websiteUrl || qsBenchmark.officialUrl,
              }));

      const programMatches = effectivePrograms.map((prog) =>
        evaluateUniversityAndProgramChance(
          chancingProfile,
          uni,
          prog,
          prog.id > 0 ? reqByProgramId.get(prog.id) ?? null : null,
          uniOutcomes,
          qsBenchmark
        )
      );

      // Pick selected program: explicit ?programId=, or best major/degree overlap
      let selectedProgramAssessment =
        Number.isFinite(requestedProgramId) && requestedProgramId !== 0
          ? programMatches.find((pm) => pm.programId === requestedProgramId)
          : undefined;

      if (!selectedProgramAssessment && programMatches.length > 0) {
        const targetMaj = chancingProfile.targetMajor || "";
        const targetDeg = (chancingProfile.degreeLevel || "").toLowerCase();
        selectedProgramAssessment = [...programMatches].sort((a, b) => {
          const aMaj = targetMaj ? majorOverlap(targetMaj, `${a.programName} ${a.field}`) ?? 0 : 0;
          const bMaj = targetMaj ? majorOverlap(targetMaj, `${b.programName} ${b.field}`) ?? 0 : 0;
          if (Math.abs(bMaj - aMaj) > 0.1) return bMaj - aMaj;
          const aDeg = targetDeg && a.degreeLevel.toLowerCase().includes(targetDeg) ? 1 : 0;
          const bDeg = targetDeg && b.degreeLevel.toLowerCase().includes(targetDeg) ? 1 : 0;
          if (bDeg !== aDeg) return bDeg - aDeg;
          return b.compositeProgramFitScore - a.compositeProgramFitScore;
        })[0];
      }

      if (!selectedProgramAssessment) {
        selectedProgramAssessment = evaluateUniversityAndProgramChance(
          chancingProfile,
          uni,
          null,
          null,
          uniOutcomes,
          qsBenchmark
        );
      }

      return {
        universityId: uni.id,
        universityName: uni.name,
        country: uni.country,
        city: uni.city,
        flagEmoji: uni.flagEmoji,
        worldRanking: uni.worldRanking ?? qsBenchmark.qsRank,
        officialWebsiteUrl: uni.officialWebsiteUrl || uni.websiteUrl || qsBenchmark.officialUrl,
        fitScore: fit.matchScore,
        fitReasons: translateReasons(locale, "university", fit.reasonDetails, fit.reasons),
        fitIssues: translateReasons(locale, "university", fit.issueDetails, fit.potentialIssues),
        comparedDimensions: fit.breakdown.comparedDimensions,
        totalDimensions: fit.breakdown.totalDimensions,
        evidenceCoveragePct: fit.breakdown.evidenceCoveragePct,
        evidenceLevel: fit.breakdown.evidenceLevel,
        matchBreakdown: fit.breakdown,
        probability: ADMISSION_PROBABILITY,
        qsBenchmark,
        programs: effectivePrograms,
        programMatches,
        selectedProgramAssessment,
        programAssessment: selectedProgramAssessment,
        percentilePositioning: {
          gpa25: selectedProgramAssessment.programGpa25,
          gpa50: selectedProgramAssessment.programGpa50,
          gpa75: selectedProgramAssessment.programGpa75,
          sat25: selectedProgramAssessment.programSat25,
          sat50: selectedProgramAssessment.programSat50,
          sat75: selectedProgramAssessment.programSat75,
          studentGpa4: selectedProgramAssessment.studentGpa4,
          studentGpaPercentile: selectedProgramAssessment.studentGpaPercentile,
          studentSat: selectedProgramAssessment.studentSat,
          studentSatPercentile: selectedProgramAssessment.studentSatPercentile,
          minIelts: selectedProgramAssessment.effectiveMinIelts,
          medianIelts: selectedProgramAssessment.medianIelts,
          studentEnglishLabel: selectedProgramAssessment.studentEnglishLabel,
          studentEnglishPercentile: selectedProgramAssessment.studentEnglishPercentile,
          cohortPositionTier: selectedProgramAssessment.cohortPositionTier,
          selectivityCategory: selectedProgramAssessment.selectivityCategory,
          universityAcceptRatePct: selectedProgramAssessment.universityAcceptRatePct,
          effectiveProgramAcceptRatePct: selectedProgramAssessment.effectiveProgramAcceptRatePct,
        },
        empiricalOutcomes: selectedProgramAssessment.empiricalOutcomes,
      };
    });

    const catalogUniversities = allCatalogUnis
      .map((u) => {
        const b = matchQsUniversityBenchmark(u);
        return {
          id: u.id,
          name: u.name,
          country: u.country,
          flagEmoji: u.flagEmoji,
          worldRanking: u.worldRanking ?? b.qsRank,
          acceptRatePct: b.acceptRatePct,
        };
      })
      .sort((a, b) => (a.worldRanking ?? 999) - (b.worldRanking ?? 999));

    return NextResponse.json({
      results,
      probability: ADMISSION_PROBABILITY,
      scenario: scenarioEnabled,
      isCatalogSample,
      catalogUniversities,
      departments: Object.values(PROGRAM_DEPARTMENT_PROFILES),
    });
  } catch (error) {
    console.error("GET /api/chancing error:", error);
    return NextResponse.json({ error: "Failed to calculate profile fit" }, { status: 500 });
  }
}
