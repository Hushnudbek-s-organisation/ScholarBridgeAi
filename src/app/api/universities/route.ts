import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth";
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
import { paginatedPayload } from "@/lib/pagination";
import { supportsDegreeLevel } from "@/lib/degreeLevels";
import { countriesMatch } from "@/lib/countries";
import { pickBestSource } from "@/lib/sourcePick";

/**
 * Resilient university select: tries the full schema first. If the database
 * is missing an unexpected column (the DB is the source of truth and may
 * differ), falls back to a core subset so the list still works.
 */
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
    const minRank = searchParams.get("minRank") ? Number(searchParams.get("minRank")) : null;
    const maxRank = searchParams.get("maxRank") ? Number(searchParams.get("maxRank")) : null;

    let allUnis = await selectUniversities();

    // Get profile for match calculation if provided
    let profileData = null;
    if (profileIdStr) {
      const pId = parseInt(profileIdStr, 10);
      // Personalised matching reads private profile data (GPA, scores,
      // degree), so only the owner — or an admin — gets it. Anyone else
      // silently receives the public, unpersonalised list.
      const auth = await authenticate(req);
      if (auth.ok && (auth.session.profile.id === pId || auth.session.isAdmin)) {
        const [p] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, pId));
        if (p) profileData = p;
      }
    }

    // ---------- Filtering (NULL values excluded from numeric filters) ----------
    if (search) {
      allUnis = allUnis.filter(u =>
        u.name.toLowerCase().includes(search) ||
        (u.programMajor ?? "").toLowerCase().includes(search) ||
        (u.city ?? "").toLowerCase().includes(search) ||
        u.country.toLowerCase().includes(search) ||
        countriesMatch(u.country, search)
      );
    }

    if (country && country !== "All") {
      allUnis = allUnis.filter((u) => countriesMatch(u.country, country));
    }

    // Keep the owner's target degree authoritative and recognise equivalent
    // labels (e.g. Undergraduate/Bachelor, Graduate/Master, Doctoral/PhD).
    // Only explicit conflicting levels are excluded; unspecified levels stay
    // visible without claiming verified compatibility or rewriting NULL.
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

    if (minRank) allUnis = allUnis.filter(u => u.worldRanking != null && u.worldRanking >= minRank);
    if (maxRank) allUnis = allUnis.filter(u => u.worldRanking != null && u.worldRanking <= maxRank);

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
        let srcById = new Map<number, { id: number; url: string; title: string; accessedAt: Date | null }>();
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
          const best = pickBestSource(uniLinks, srcById);
          if (best?.url) {
            sourceMap.set(uniId, {
              sourceUrl: best.url,
              lastVerifiedAt: best.accessedAt ? best.accessedAt.toISOString() : null,
              sourceTitle: best.title,
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
      results.sort((a, b) => {
        if (a.worldRanking == null && b.worldRanking == null) return a.name.localeCompare(b.name);
        if (a.worldRanking == null) return 1;
        if (b.worldRanking == null) return -1;
        return a.worldRanking - b.worldRanking;
      });
    }

    // Opt-in `?page=` / `?perPage=` pagination (after filtering + sorting).
    // Without those params the full list is returned (admin tools, ...).
    return NextResponse.json(
      paginatedPayload("universities", results, searchParams),
    );
  } catch (error) {
    console.error("GET /api/universities error:", error);
    // Never substitute sample universities: during a database outage students
    // would be shown made-up data as if it were real. Clients show the error
    // (the website's explorer / detail views, and the Telegram bot's
    // "temporarily unavailable" message for 503).
    return NextResponse.json(
      { error: "University data is temporarily unavailable. Please try again shortly.", code: "data_unavailable" },
      { status: 503 },
    );
  }
}
