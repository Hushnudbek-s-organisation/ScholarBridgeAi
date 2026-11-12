import { hasVerifiedProgramEvidence } from "@/lib/catalogEvidence";
import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  savedUniversities,
  studentProfiles,
  universityPrograms,
} from "@/db/schema";
import { requireProfileAccess } from "@/lib/auth";
import { applyMatchScenario, calculateUniversityMatch, type MatchScenario } from "@/lib/matching";
import { localeFromRequest, translateReasons } from "@/lib/engineText";
import { toMatchProfileWithActivities, toUniversityData } from "@/lib/profileMapping";
import { memoizeMatch } from "@/lib/matchMemo";
import { profileMatchFingerprint } from "@/lib/profileMatchFingerprint";
import { ADMISSION_PROBABILITY } from "@/lib/chancing";
import { matchQsUniversityBenchmark } from "@/lib/qsTop200Benchmarks";
import { verifiedQsRank } from "@/lib/universityRank";
import { countriesMatch } from "@/lib/countries";
import { getCachedUniversitiesBundleForAssessment } from "@/lib/catalogCache";
import { assessedUniversitiesCacheKey } from "@/lib/assessment/version";
import { assessCatalogueProgramme } from "@/lib/assessment/adapters";
import { loadCatalogueFacts } from "@/lib/catalogueFacts.server";
import type { ProgrammeAssessment } from "@/lib/assessment";
import { compareDegreeLevels } from "@/lib/degreeLevels";

export const dynamic = "force-dynamic";

/**
 * GET /api/chancing?profileId=N&universityId=M&programId=P → one university / program
 * GET /api/chancing?profileId=N&all=1                      → saved + tracked universities
 *
 * ASSESSMENT SCREEN, NOT A CHANCE CALCULATOR (spec §8)
 * ---------------------------------------------------
 * Every programme row is scored by the ONE canonical service
 * (`src/lib/assessment`): preference fit (with an explicit interval), documented
 * eligibility, finance, academic comparison against published statistics, and
 * `admissionProbability: null` with an explicit reason.
 *
 * The retired composite "planning" index (`compositeProgramFitScore`), the
 * Safety/Likely/Target/Reach labels and the cohort-percentile tiers are NOT
 * returned any more. `probability: ADMISSION_PROBABILITY` stays, so a client
 * that still looks for the honest "unavailable" state keeps working.
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
    let matchProfile = await toMatchProfileWithActivities(profile);

    // Optional What-If overrides. They change the CANONICAL assessment inputs
    // only — nothing is written back to the profile row.
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

    // Memo key for every university-fit score below. Taken from the FINAL match
    // profile, so a scenario override gets its own cache entry.
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
      const saved = await db
        .select({ universityId: savedUniversities.universityId })
        .from(savedUniversities)
        .where(eq(savedUniversities.profileId, profileId));
      universityIds = [
        ...new Set(
          saved
            .map((row) => row.universityId)
            .filter((id): id is number => typeof id === "number" && id > 0)
        ),
      ];
    }

    const allCatalogUnis = (await getCachedUniversitiesBundleForAssessment()).unis;

    let unis = universityIds.length
      ? allCatalogUnis.filter((u) => universityIds.includes(u.id))
      : [];

    if ((!unis.length && allCatalogUnis.length > 0) || includeCatalog || filterCountry || searchQuery) {
      let pool = allCatalogUnis;
      if (filterCountry) pool = pool.filter((u) => countriesMatch(u.country, filterCountry));
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
        scoringVersion: assessedUniversitiesCacheKey(),
      });
    }

    const activeUniIds = unis.map((u) => u.id);
    const rawPrograms = await db
      .select()
      .from(universityPrograms)
      .where(and(inArray(universityPrograms.universityId, activeUniIds), eq(universityPrograms.isActive, true)));

    const programIds = rawPrograms.map((p) => p.id);
    const programmeFacts = await loadCatalogueFacts("program", programIds);
    const cycle = searchParams.get("admissionCycle")?.trim() || null;
    const applicantScope = searchParams.get("applicantScope")?.trim() || null;
    if ((cycle?.length ?? 0) > 100 || (applicantScope?.length ?? 0) > 200) {
      return NextResponse.json({ error: "Invalid assessment scope" }, { status: 400 });
    }

    const programsByUniId = new Map<number, (typeof rawPrograms)[number][]>();
    for (const program of rawPrograms) {
      const list = programsByUniId.get(program.universityId) ?? [];
      list.push(program);
      programsByUniId.set(program.universityId, list);
    }

    /** One canonical assessment for a programme row (verified-evidence gated). */
    const assessRow = (
      uni: (typeof allCatalogUnis)[number],
      program: (typeof rawPrograms)[number]
    ): ProgrammeAssessment => {
      const verified = hasVerifiedProgramEvidence(program);
      return assessCatalogueProgramme({
        programme: {
          id: program.id,
          universityId: program.universityId,
          name: program.name,
          field: program.field,
          degree: program.degree,
          language: program.language,
          studyMode: program.studyMode,
          programUrl: program.programUrl ?? program.applicationUrl ?? null,
          sourceUrl: program.sourceUrl ?? null,
        },
        university: {
          id: uni.id,
          name: uni.name,
          country: uni.country,
          officialWebsiteUrl: uni.officialWebsiteUrl ?? null,
          websiteUrl: uni.websiteUrl ?? null,
        },
        profile: {
          ...profile,
          degreeLevel: overrideDegreeLevel ?? profile.degreeLevel ?? null,
          satScore: overrideSat !== undefined ? overrideSat : profile.satScore,
          toeflScore: overrideToefl !== undefined ? overrideToefl : profile.toeflScore,
        },
        requirementFacts: programmeFacts.get(program.id) ?? [],
        // A quarantined price is not published as a cost: it stays null, so the
        // finance total is unknown rather than silently free.
        tuitionUsd: verified && program.tuitionCurrency === "USD" && program.tuitionAmount != null
          ? Number(program.tuitionAmount)
          : null,
        applicationFeeUsd: null,
        cycle,
        applicantCategory: applicantScope,
        degreeLevel: overrideDegreeLevel ?? profile.degreeLevel ?? null,
        assessedAt: new Date().toISOString(),
        asOfDate: new Date().toISOString().slice(0, 10),
      });
    };

    const results = unis.map((uni) => {
      const fit = memoizeMatch("fit", fingerprint, uni.id, toUniversityData(uni) as unknown as Record<string, unknown>, () =>
        calculateUniversityMatch(matchProfile, toUniversityData(uni))
      );
      const qsBenchmark = matchQsUniversityBenchmark(uni);
      const uniPrograms = programsByUniId.get(uni.id) ?? [];

      const assessments = uniPrograms.map((program) => assessRow(uni, program));

      // Selected programme: explicit ?programId=, else the programme whose
      // SUBJECT RELATION is strongest, then the assessment's own sort policy.
      let selected =
        Number.isFinite(requestedProgramId) && requestedProgramId !== 0
          ? assessments.find((item) => item.programme.id === requestedProgramId)
          : undefined;
      if (!selected && assessments.length) selected = assessments[0];
      if (!selected) {
        // No recorded programme: assess the university as an institution-level
        // scope. Requirements stay empty → eligibility `unknown`, never `met`.
        selected = assessCatalogueProgramme({
          programme: {
            id: -uni.id,
            universityId: uni.id,
            name: uni.name,
            field: uni.programMajor ?? null,
            degree: profile.degreeLevel ?? null,
            language: null,
            studyMode: null,
            programUrl: uni.officialWebsiteUrl ?? null,
            sourceUrl: uni.sourceUrl ?? null,
          },
          university: {
            id: uni.id,
            name: uni.name,
            country: uni.country,
            officialWebsiteUrl: uni.officialWebsiteUrl ?? null,
            websiteUrl: uni.websiteUrl ?? null,
          },
          profile,
          requirementRow: null,
          tuitionUsd: null,
          degreeLevel: overrideDegreeLevel ?? profile.degreeLevel ?? null,
          assessedAt: new Date().toISOString(),
          asOfDate: new Date().toISOString().slice(0, 10),
        });
      }

      return {
        universityId: uni.id,
        universityName: uni.name,
        country: uni.country,
        city: uni.city,
        flagEmoji: uni.flagEmoji,
        // QS 2026 verified value from the catalogue first; the benchmark table
        // is a gated fallback (Phase AC) and is null for unranked institutions.
        worldRanking: verifiedQsRank(uni)?.rank ?? qsBenchmark.qsRank,
        officialWebsiteUrl: uni.officialWebsiteUrl || uni.websiteUrl || qsBenchmark.officialUrl,
        /** University-level profile fit — a comparison, never an admission chance. */
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
        programmes: assessments.map((item) => ({
          id: item.programme.id,
          name: item.programme.name,
          degreeLevel: item.programme.degreeLevel,
          field: item.programme.field,
          group: item.group,
          groupKey: item.groupKey,
          fit: item.preferenceFit,
          displayFit: item.preferenceFit,
          eligibilityStatus: item.eligibility.status,
        })),
        /** The ONE canonical assessment the screen renders. */
        assessment: selected,
        // Deprecated aliases kept for older clients during the migration; both
        // now point at the same canonical assessment, never at a chance score.
        selectedProgramAssessment: selected,
        programAssessment: selected,
        degreeLevelRelation: compareDegreeLevels(profile.degreeLevel ?? null, selected.programme.degreeLevel),
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
          worldRanking: verifiedQsRank(u)?.rank ?? b.qsRank,
        };
      })
      .sort((a, b) => (a.worldRanking ?? 999) - (b.worldRanking ?? 999));

    return NextResponse.json({
      results,
      probability: ADMISSION_PROBABILITY,
      scenario: scenarioEnabled,
      isCatalogSample,
      catalogUniversities,
      scoringVersion: assessedUniversitiesCacheKey(),
    });
  } catch (error) {
    console.error("GET /api/chancing error:", error);
    return NextResponse.json({ error: "Failed to calculate profile fit" }, { status: 500 });
  }
}
