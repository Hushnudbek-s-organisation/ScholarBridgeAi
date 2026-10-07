import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  applicationCycles,
  programRequirements,
  programSources,
  scholarships,
  sources,
  studentProfiles,
  universities,
  universityPrograms,
} from "@/db/schema";
import { requireProfileAccess } from "@/lib/auth";
import { readJsonBody } from "@/lib/request";
import {
  ADMISSION_PROBABILITY,
} from "@/lib/chancing";
import {
  recommend,
  parseCatalogJsonArray,
  type FundingNeed,
  type RecommendationCatalog,
  type RecommendationInput,
  type RecommendProgram,
  type RecommendRequirement,
  type RecommendCycle,
  type RecommendScholarship,
  type RecommendUniversity,
} from "@/lib/recommend";
import {
  parseStudyInterestSelections,
  studyInterestDisplayTerms,
  studyInterestRecommendationTerms,
} from "@/lib/studyInterests";

export const dynamic = "force-dynamic";

/**
 * POST /api/programs/recommend — the subject-to-program recommender.
 *
 * SECURITY
 *  - Requires a session; `profileId` in the body is checked against the
 *    session (requireProfileAccess) — a client-supplied id is never trusted.
 *  - Read-only on catalog data; results are deterministic (no AI, no mocks).
 *
 * HONESTY RULES (2026-10 task)
 *  - Every input is skippable; absent inputs stay unknown and are never
 *    substituted with sample values. When a value comes from the saved
 *    profile (not the request) the response says so (`inputs.*.source`).
 *  - No admission probability is ever returned — the dimension is
 *    `probability: { available: false }` (no validated methodology yet).
 *  - A database failure returns 503 — the catalog is NEVER replaced with
 *    mock/sample data.
 *
 * BODY (all other fields optional; interest input has two compatible forms):
 *  {
 *    profileId?: number,            // own profile id (checked vs session)
 *    interests?: string[],          // legacy callers: required, 1–12 subjects/interests
 *    studyInterests?: StudyInterestSelection[], // structured stable IDs, max 5; {kind:"exploring"} sends no subject
 *    degreeLevel?: string | null,  // null = "don't know yet"
 *    gpa?: number | null,
 *    gpaScale?: number | null,      // 4 / 5 / 100 / ...
 *    ielts?: number | null,
 *    toefl?: number | null,
 *    duolingo?: number | null,
 *    sat?: number | null,
 *    act?: number | null,
 *    countries?: string[],          // [] = no preference
 *    budgetUsd?: number | null,
 *    fundingNeed?: "none" | "partial" | "full" | null,
 *    languagePref?: string | null,
 *    startYear?: number | null,
 *    limit?: number                 // 1–48, default 24
 *  }
 */

const MAX_INTERESTS = 12;
const MAX_LIST = 24;

function clampInterestList(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const s = item.trim().slice(0, 60);
    if (s && !out.includes(s)) out.push(s);
    if (out.length >= MAX_INTERESTS) break;
  }
  return out;
}

function clampStringList(raw: unknown, max = MAX_LIST): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const s = item.trim().slice(0, 60);
    if (s && !out.includes(s)) out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

function clampNumber(raw: unknown, min: number, max: number): number | null | undefined {
  // undefined = field not present (→ fall back to profile); null = explicit
  // "don't know"; a number outside range is clamped.
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, n));
}

type InputSource = "request" | "profile" | "unknown";

interface ResolvedInput {
  value: number | string | null;
  source: InputSource;
}

function resolveStringInput(requestValue: string | null | undefined, profileValue: string | null): ResolvedInput {
  if (requestValue !== undefined) return { value: requestValue ?? null, source: "request" };
  if (profileValue) return { value: profileValue, source: "profile" };
  return { value: null, source: "unknown" };
}

function resolveNumberInput(requestValue: number | null | undefined, profileValue: number | null): ResolvedInput {
  if (requestValue !== undefined) return { value: requestValue ?? null, source: "request" };
  if (profileValue != null && Number.isFinite(profileValue)) return { value: profileValue, source: "profile" };
  return { value: null, source: "unknown" };
}

export async function POST(req: Request) {
  const parsed = await readJsonBody<Record<string, any>>(req);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error, code: parsed.code }, { status: parsed.status });
  }
  const body = parsed.body;

  // Authorization: session owner or admin; the claimed id is never trusted.
  const access = await requireProfileAccess(req, body.profileId);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error, code: access.code },
      { status: access.status }
    );
  }
  const profileId = access.targetId!;

  // ---- Validate inputs (everything skippable, nothing invented) ----------
  const hasStructuredInterests = body.studyInterests !== undefined;
  const structuredInterests = hasStructuredInterests
    ? parseStudyInterestSelections(body.studyInterests)
    : null;
  if (hasStructuredInterests && !structuredInterests) {
    return NextResponse.json(
      { error: "Choose at least one valid study interest", code: "study_interests_invalid" },
      { status: 400 }
    );
  }
  const isExploring =
    structuredInterests?.length === 1 && structuredInterests[0]?.kind === "exploring";
  const interests = hasStructuredInterests
    ? studyInterestRecommendationTerms(structuredInterests!)
    : clampInterestList(body.interests);
  const displayedInterests = hasStructuredInterests
    ? studyInterestDisplayTerms(structuredInterests!)
    : interests ?? [];

  // Legacy callers retain the original required 1–12 strings contract.
  // The new explicit exploration choice is valid, but expands to [] so
  // subjectAffinity returns “unknown” rather than matching a literal phrase.
  if (!interests || (!isExploring && interests.length === 0)) {
    return NextResponse.json(
      {
        error: "At least one subject or interest is required — the recommender matches programs to what you want to study.",
        code: "interests_required",
      },
      { status: 400 }
    );
  }

  const limitRaw = clampNumber(body.limit, 1, 48);
  const limit = limitRaw ?? 24;

  const [profile] = await db
    .select()
    .from(studentProfiles)
    .where(eq(studentProfiles.id, profileId));
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const degreeLevel = resolveStringInput(body.degreeLevel === undefined ? undefined : (body.degreeLevel ?? null), profile.degreeLevel);
  const gpa = resolveNumberInput(clampNumber(body.gpa, 0, 100), profile.gpa);
  const gpaScale = resolveNumberInput(clampNumber(body.gpaScale, 0.1, 100), profile.gpaScale);
  const ielts = resolveNumberInput(clampNumber(body.ielts, 0, 9), profile.ieltsScore);
  const toefl = resolveNumberInput(clampNumber(body.toefl, 0, 120), profile.toeflScore);
  const duolingo = resolveNumberInput(clampNumber(body.duolingo, 0, 160), profile.duolingoScore);
  const sat = resolveNumberInput(clampNumber(body.sat, 0, 1600), profile.satScore);
  const act = resolveNumberInput(clampNumber(body.act, 0, 36), profile.actScore);
  const budgetUsd = resolveNumberInput(clampNumber(body.budgetUsd, 0, 1_000_000), profile.budgetAnnualUsd);
  const startYearRaw = clampNumber(body.startYear, 2024, 2032);
  const startYear = { value: startYearRaw ?? null, source: (startYearRaw === undefined ? "unknown" : "request") as InputSource };
  const languagePref = { value: body.languagePref === undefined ? null : (body.languagePref ?? null), source: (body.languagePref === undefined ? "unknown" : "request") as InputSource };

  const countries =
    body.countries === undefined
      ? { value: parseCatalogJsonArray(profile.preferredCountries) as string[], source: "profile" as InputSource }
      : { value: clampStringList(body.countries), source: "request" as InputSource };

  // Funding need: use every explicit financial flag from the profile. A
  // scholarship requirement is a partial need unless the student explicitly
  // requires full funding; an absent flag remains unknown.
  let fundingNeed: { value: FundingNeed | null; source: InputSource };
  if (body.fundingNeed !== undefined) {
    const v = body.fundingNeed;
    fundingNeed = {
      value: v === "none" || v === "partial" || v === "full" ? v : null,
      source: "request",
    };
  } else if (profile.requiresFullScholarship === true) {
    fundingNeed = { value: "full", source: "profile" };
  } else if (profile.needsFinancialAid === true || profile.needScholarship === true) {
    fundingNeed = { value: "partial", source: "profile" };
  } else if (profile.needsFinancialAid === false && profile.needScholarship === false) {
    fundingNeed = { value: "none", source: "profile" };
  } else {
    fundingNeed = { value: null, source: "unknown" };
  }

  const input: RecommendationInput = {
    interests,
    degreeLevel: degreeLevel.value as string | null,
    gpa: gpa.value as number | null,
    gpaScale: gpaScale.value as number | null,
    ielts: ielts.value as number | null,
    toefl: toefl.value as number | null,
    duolingo: duolingo.value as number | null,
    sat: sat.value as number | null,
    act: act.value as number | null,
    countries: countries.value as string[],
    budgetUsd: budgetUsd.value as number | null,
    familyIncomeUsd: profile.familyIncomeUsd,
    fundingNeed: fundingNeed.value,
    languagePref: languagePref.value as string | null,
    startYear: startYear.value as number | null,
  };

  // ---- Load the catalog (any failure = 503, never mock data) -------------
  let catalog: RecommendationCatalog;
  let totalPrograms = 0;
  try {
    const [programRows, uniRows, reqRows, cycleRows, scholarshipRows] = await Promise.all([
      db
        .select()
        .from(universityPrograms)
        .where(eq(universityPrograms.isActive, true)),
      db.select().from(universities),
      db.select().from(programRequirements),
      db.select().from(applicationCycles),
      db
        .select()
        .from(scholarships)
        .where(eq(scholarships.isActive, true)),
    ]);

    const unis = new Map<number, RecommendUniversity>();
    for (const u of uniRows) {
      unis.set(u.id, {
        id: u.id,
        name: u.name,
        country: u.country,
        city: u.city,
        websiteUrl: u.officialWebsiteUrl || u.websiteUrl,
        annualLivingEst: u.annualLivingEst != null ? Number(u.annualLivingEst) : null,
        livingCostCurrency: u.livingCostCurrency || "USD",
      });
    }

    // Program → source links (provenance), batched.
    const programIds = programRows.map((p) => p.id);
    const programSourcesMap = new Map<number, RecommendProgram["sources"]>(programRows.map((p) => [p.id, []]));
    if (programIds.length) {
      const linkRows = await db
        .select({ programId: programSources.programId, sourceId: programSources.sourceId })
        .from(programSources)
        .where(inArray(programSources.programId, programIds));
      const srcIds = [...new Set(linkRows.map((r) => r.sourceId).filter((x): x is number => x != null))];
      if (srcIds.length) {
        const srcRows = await db
          .select({ id: sources.id, url: sources.url, title: sources.title, accessedAt: sources.accessedAt, isOfficial: sources.isOfficial })
          .from(sources)
          .where(inArray(sources.id, srcIds));
        const byId = new Map(srcRows.map((r) => [r.id, r]));
        for (const link of linkRows) {
          if (link.sourceId == null) continue;
          const s = byId.get(link.sourceId);
          if (!s) continue;
          programSourcesMap.get(link.programId)?.push({
            url: s.url,
            title: s.title,
            sourceType: "program_evidence",
            accessedAt: s.accessedAt ? new Date(s.accessedAt).toISOString() : null,
            isOfficial: s.isOfficial,
          });
        }
      }
    }

    const programs: RecommendProgram[] = programRows.map((p) => ({
      id: p.id,
      universityId: p.universityId,
      name: p.name,
      field: p.field,
      degreeLevel: p.degree,
      durationYears: p.durationYears != null ? Number(p.durationYears) : null,
      durationUnit: p.durationUnit || "years",
      studyMode: p.studyMode,
      language: p.language,
      annualTuition: p.tuitionAmount != null ? Number(p.tuitionAmount) : null,
      tuitionCurrency: p.tuitionCurrency || "USD",
      tuitionPeriod: p.tuitionPeriod || "year",
      programUrl: p.programUrl,
      applicationUrl: p.applicationUrl,
      isVerified: p.isVerified,
      sourceUrl: p.sourceUrl ?? null,
      lastVerifiedAt: p.lastVerifiedAt ? new Date(p.lastVerifiedAt).toISOString() : null,
      verificationStatus: p.verificationStatus,
      sources: programSourcesMap.get(p.id) ?? [],
    }));
    totalPrograms = programs.length;

    const requirements = new Map<number, RecommendRequirement[]>();
    for (const r of reqRows) {
      const arr = requirements.get(r.programId) ?? [];
      arr.push({
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
        otherRequirements: r.otherRequirements,
      });
      requirements.set(r.programId, arr);
    }

    const cycles = new Map<number, RecommendCycle[]>();
    for (const c of cycleRows) {
      if (c.programId == null) continue;
      const arr = cycles.get(c.programId) ?? [];
      arr.push({
        programId: c.programId,
        intake: c.intake,
        academicYear: c.academicYear,
        openingDate: c.openingDate ? String(c.openingDate).slice(0, 10) : null,
        deadline: c.deadline ? String(c.deadline).slice(0, 10) : null,
        applicationUrl: c.applicationUrl,
        sourceUrl: c.sourceUrl ?? null,
        lastVerifiedAt: c.lastVerifiedAt ? new Date(c.lastVerifiedAt).toISOString() : null,
        verificationStatus: c.verificationStatus,
      });
      cycles.set(c.programId, arr);
    }
    for (const arr of cycles.values()) arr.sort((a, b) => (b.deadline || b.academicYear || "").localeCompare(a.deadline || a.academicYear || ""));

    const scholarshipList: RecommendScholarship[] = scholarshipRows.map((s) => ({
      id: s.id,
      title: s.title,
      country: s.country,
      degreeLevels: parseCatalogJsonArray(s.degreeLevels),
      coverageType: s.coverageType,
      minGpa: s.minGpa != null ? Number(s.minGpa) : null,
      minIelts: s.minIelts != null ? Number(s.minIelts) : null,
      financialNeedBased: Boolean(s.financialNeedBased),
      meritBased: Boolean(s.meritBased),
      eligibleMajors: parseCatalogJsonArray(s.eligibleMajors),
    }));

    catalog = {
      programs,
      universities: unis,
      requirements,
      cycles,
      scholarships: scholarshipList,
    };
  } catch (error) {
    console.error("POST /api/programs/recommend catalog error:", error);
    // Never substitute sample universities/programs: during a database outage
    // students would be shown made-up data as if it were real.
    return NextResponse.json(
      { error: "Recommendation data is temporarily unavailable. Please try again shortly.", code: "data_unavailable" },
      { status: 503 }
    );
  }

  // ---- Match (pure, deterministic) ----------------------------------------
  const results = recommend(input, catalog, limit);

  return NextResponse.json({
    results,
    totalProgramsScanned: totalPrograms,
    // Probability policy (2026-10): the dimension is surfaced as unavailable —
    // no fit score below is an admission probability.
    probability: ADMISSION_PROBABILITY,
    // Transparency: where each input value came from.
    inputs: {
      interests: { value: displayedInterests, source: "request" as InputSource },
      interestMode: { value: isExploring ? "exploring" : "selected", source: "request" as InputSource },
      degreeLevel: { value: degreeLevel.value, source: degreeLevel.source },
      gpa: { value: gpa.value, source: gpa.source },
      gpaScale: { value: gpaScale.value, source: gpaScale.source },
      ielts: { value: ielts.value, source: ielts.source },
      toefl: { value: toefl.value, source: toefl.source },
      duolingo: { value: duolingo.value, source: duolingo.source },
      sat: { value: sat.value, source: sat.source },
      act: { value: act.value, source: act.source },
      countries: { value: countries.value, source: countries.source },
      budgetUsd: { value: budgetUsd.value, source: budgetUsd.source },
      fundingNeed: { value: fundingNeed.value, source: fundingNeed.source },
      languagePref: { value: languagePref.value, source: languagePref.source },
      startYear: { value: startYear.value, source: startYear.source },
    },
  });
}
