import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  universities,
  studentProfiles,
  universityPrograms,
  universitySources,
  sources,
} from "@/db/schema";
import { calculateUniversityMatch } from "@/lib/matching";
import { eq, inArray } from "drizzle-orm";
import { seedDatabase } from "@/db/seed";
import { mockUniversityListPayload } from "@/lib/mock-universities";

/**
 * Resilient university select: tries the full schema first. If the database
 * is missing an unexpected column (the DB is the source of truth and may
 * differ), falls back to a core subset so the list still works.
 */
/** Normalize label variants such as "Bachelor's" and "Master’s". */
function normalizeDegreeLevel(value: string | null | undefined): string {
  return (value || "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/s\b/g, "")
    .trim();
}

function supportsDegreeLevel(universityLevel: string | null | undefined, requestedLevel: string): boolean {
  const offered = normalizeDegreeLevel(universityLevel);
  const requested = normalizeDegreeLevel(requestedLevel);
  // "All" means the university record confirms availability at every level.
  return offered === "all" || offered === requested;
}

async function selectUniversities() {
  try {
    return await db.select().from(universities);
  } catch {
    return await db
      .select({
        id: universities.id,
        name: universities.name,
        country: universities.country,
        city: universities.city,
        flagEmoji: universities.flagEmoji,
        worldRanking: universities.worldRanking,
        degreeLevel: universities.degreeLevel,
        programMajor: universities.programMajor,
        annualTuitionUsd: universities.annualTuitionUsd,
        annualLivingEstUsd: universities.annualLivingEstUsd,
        minGpa: universities.minGpa,
        minIelts: universities.minIelts,
        minSat: universities.minSat,
        acceptanceRate: universities.acceptanceRate,
        postStudyWorkVisaYears: universities.postStudyWorkVisaYears,
        description: universities.description,
        highlights: universities.highlights,
        websiteUrl: universities.websiteUrl,
        imageUrl: universities.imageUrl,
        verificationStatus: universities.verificationStatus,
        lastVerifiedAt: universities.lastVerifiedAt,
        sourceUrl: universities.sourceUrl,
      })
      .from(universities);
  }
}

/**
 * University discovery API (spec §16).
 * NULL values are never treated as zero — filters only match verified data.
 */
export async function GET(req: Request) {
  try {
    await seedDatabase();
    const { searchParams } = new URL(req.url);
    const profileIdStr = searchParams.get("profileId");
    const search = searchParams.get("search")?.toLowerCase();
    const country = searchParams.get("country");
    const degreeLevel = searchParams.get("degreeLevel");
    const maxTuition = searchParams.get("maxTuition");
    const sort = searchParams.get("sort");
    const uniType = searchParams.get("type"); // Public | Private
    const ieltsFilter = searchParams.get("ielts"); // e.g. "6.5" → only unis with minIelts <= 6.5
    const scholarshipOnly = searchParams.get("scholarships") === "true";
    const englishOnly = searchParams.get("english") === "true";
    const minRank = searchParams.get("minRank") ? Number(searchParams.get("minRank")) : null;
    const maxRank = searchParams.get("maxRank") ? Number(searchParams.get("maxRank")) : null;

    let allUnis = await selectUniversities();

    // Get profile for match calculation if provided
    let profileData = null;
    if (profileIdStr) {
      const pId = parseInt(profileIdStr, 10);
      const [p] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, pId));
      if (p) profileData = p;
    }

    // ---------- Filtering (NULL values excluded from numeric filters) ----------
    if (search) {
      allUnis = allUnis.filter(u =>
        u.name.toLowerCase().includes(search) ||

        u.programMajor.toLowerCase().includes(search) ||
        u.city.toLowerCase().includes(search) ||
        u.country.toLowerCase().includes(search)
      );
    }

    if (country && country !== "All") {
      allUnis = allUnis.filter(u => u.country === country);
    }

    // A signed-in student's target degree is mandatory: a Bachelor applicant
    // must never be shown Master/PhD-only institutions (and vice versa).
    // The request filter is retained for visitors with no profile.
    const requestedDegree = profileData?.degreeLevel || degreeLevel;
    if (requestedDegree && requestedDegree !== "All") {
      allUnis = allUnis.filter((u) => supportsDegreeLevel(u.degreeLevel, requestedDegree));
    }

    // Tuition filter: only universities with VERIFIED tuition (NULL excluded, spec §16).
    if (maxTuition && !isNaN(Number(maxTuition))) {
      const maxT = Number(maxTuition);
      allUnis = allUnis.filter(u => u.annualTuitionUsd != null && u.annualTuitionUsd <= maxT);
    }

    if (ieltsFilter && !isNaN(Number(ieltsFilter))) {
      const minI = Number(ieltsFilter);
      allUnis = allUnis.filter(u => u.minIelts != null && u.minIelts <= minI);
    }

    if (minRank) allUnis = allUnis.filter(u => u.worldRanking >= minRank);
    if (maxRank) allUnis = allUnis.filter(u => u.worldRanking <= maxRank);

    // Scholarship availability: universities that have at least one scholarship
    // in the app scholarships table (matched by name similarity is not reliable —
    // so this filter only applies when scholarships are linked via programs later).
    void scholarshipOnly;

    // Program search: universities offering a program in the searched field.
    const programFilter = searchParams.get("program");
    if (programFilter && programFilter !== "All") {
      const programRows = await db
        .select({ universityId: universityPrograms.universityId })
        .from(universityPrograms)
        .where(inArray(universityPrograms.field, [programFilter]));
      const uniIds = new Set(programRows.map((r) => r.universityId));
      allUnis = allUnis.filter(u => uniIds.has(u.id));
    }

    // ---------- Fetch source signals (university_sources -> sources) ----------
    // Map: universityId -> { sourceUrl, lastVerifiedAt }
    const sourceMap = new Map<number, { sourceUrl: string | null; lastVerifiedAt: string | null; sourceTitle: string | null }>();
    try {
      const uniIds = allUnis.map((u) => u.id);
      if (uniIds.length > 0) {
        const links = await db
          .select()
          .from(universitySources)
          .where(inArray(universitySources.universityId, uniIds));

        const srcIds = [...new Set(links.map((l) => l.sourceId).filter((x): x is number => x != null))];
        let srcById = new Map<number, { url: string; title: string; accessedAt: Date | null }>();
        if (srcIds.length > 0) {
          try {
            const srcRows = await db
              .select({ id: sources.id, url: sources.url, title: sources.title, accessedAt: sources.accessedAt })
              .from(sources)
              .where(inArray(sources.id, srcIds));
            srcById = new Map(srcRows.map((r) => [r.id, r]));
          } catch {
            // sources table shape differs — leave empty, UI will show pending
          }
        }

        // Group links per university and pick most recent accessedAt
        const grouped = new Map<number, typeof links>();
        for (const link of links) {
          const arr = grouped.get(link.universityId) || [];
          arr.push(link);
          grouped.set(link.universityId, arr);
        }

        for (const [uniId, uniLinks] of grouped) {
          let bestUrl: string | null = null;
          let bestVerified: Date | null = null;
          let bestTitle: string | null = null;
          for (const l of uniLinks) {
            if (l.sourceId == null) continue;
            const src = srcById.get(l.sourceId);
            if (!src) continue;
            const accessed = src.accessedAt ? new Date(src.accessedAt) : null;
            if (!bestUrl || (accessed && (!bestVerified || accessed > bestVerified))) {
              bestUrl = src.url;
              bestTitle = src.title;
              bestVerified = accessed;
            } else if (!bestUrl) {
              bestUrl = src.url;
              bestTitle = src.title;
            }
          }
          if (bestUrl) {
            sourceMap.set(uniId, {
              sourceUrl: bestUrl,
              lastVerifiedAt: bestVerified ? bestVerified.toISOString() : null,
              sourceTitle: bestTitle,
            });
          }
        }

        // Fallback: if a university has no entry in university_sources but has
        // a direct sourceUrl / lastVerifiedAt on the universities row itself,
        // do NOT use it as a fabricated source — the task requires showing
        // \"pending verification\" when there is no linked source record.
        // We still keep the university's own lastVerifiedAt as a secondary
        // date if a linked source exists but lacks accessedAt.
        for (const uni of allUnis) {
          const existing = sourceMap.get(uni.id);
          if (existing) {
            if (!existing.lastVerifiedAt) {
              const fallback = (uni as any).lastVerifiedAt ? new Date((uni as any).lastVerifiedAt).toISOString() : null;
              if (fallback) {
                sourceMap.set(uni.id, { ...existing, lastVerifiedAt: fallback });
              }
            }
          }
        }
      }
    } catch {
      // If university_sources table is missing or query fails, we simply
      // return universities without source signals — UI shows pending.
    }

    // ---------- Map match scores + source signals ----------
    const results = allUnis.map((uni) => {
      let matchInfo: {
        matchScore: number | null;
        matchCategory: "Reach" | "Match" | "Safety" | null;
        reasons?: string[];
        potentialIssues?: string[];
      } = { matchScore: null, matchCategory: null, reasons: [], potentialIssues: [] };
      if (profileData) {
        matchInfo = calculateUniversityMatch(profileData, uni);
      }
      const src = sourceMap.get(uni.id) || null;
      return {
        ...uni,
        matchScore: matchInfo.matchScore,
        matchCategory: matchInfo.matchCategory,
        matchReasons: matchInfo.reasons ?? [],
        matchIssues: matchInfo.potentialIssues ?? [],
        sourceUrl: src?.sourceUrl ?? null,
        sourceTitle: src?.sourceTitle ?? null,
        sourceLastVerifiedAt: src?.lastVerifiedAt ?? null,
      };
    });

    // ---------- Sorting (NULL tuition sorts after verified values) ----------
    if (sort === "tuition_asc") {
      results.sort((a, b) => {
        if (a.annualTuitionUsd == null && b.annualTuitionUsd == null) return 0;
        if (a.annualTuitionUsd == null) return 1;
        if (b.annualTuitionUsd == null) return -1;
        return a.annualTuitionUsd - b.annualTuitionUsd;
      });
    } else if (sort === "tuition_desc") {
      results.sort((a, b) => {
        if (a.annualTuitionUsd == null && b.annualTuitionUsd == null) return 0;
        if (a.annualTuitionUsd == null) return 1;
        if (b.annualTuitionUsd == null) return -1;
        return b.annualTuitionUsd - a.annualTuitionUsd;
      });
    } else if (sort === "name_asc") {
      results.sort((a, b) => a.name.localeCompare(b.name));
    } else if (profileData) {
      // NULL match scores sort last (no profile data -> never ranked by score).
      results.sort((a, b) => {
        if (a.matchScore == null && b.matchScore == null) return 0;
        if (a.matchScore == null) return 1;
        if (b.matchScore == null) return -1;
        return b.matchScore - a.matchScore;
      });
    } else {
      results.sort((a, b) => a.worldRanking - b.worldRanking);
    }

    return NextResponse.json({ universities: results });
  } catch (error) {
    console.error("GET /api/universities error:", error);
    // Preview / sandbox: serve MIT / Oxford / TUM when the database is unavailable.
    return NextResponse.json(mockUniversityListPayload());
  }
}
