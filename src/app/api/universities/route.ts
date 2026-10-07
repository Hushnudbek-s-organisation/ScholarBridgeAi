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
import { calculateUniversityMatch, type ReasonDetail } from "@/lib/matching";
import { localeFromRequest, translateReasons } from "@/lib/engineText";
import { eq, inArray } from "drizzle-orm";
import { seedDatabase } from "@/db/seed";
import { paginatedPayload } from "@/lib/pagination";
import { supportsDegreeLevel } from "@/lib/degreeLevels";
import { countriesMatch } from "@/lib/countries";
import { pickBestSource } from "@/lib/sourcePick";
import { selectUniversities } from "@/lib/universities";
import { toMatchProfileWithActivities, toUniversityData } from "@/lib/profileMapping";
import { subjectAffinity } from "@/lib/subjectAffinity";

/**
 * University discovery API (spec §16).
 * NULL values are never treated as zero — filters only match verified data.
 */
export async function GET(req: Request) {
  try {
    await seedDatabase();
    // Match sentences are translated for the caller's language (cookie).
    const locale = localeFromRequest(req);
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

    // Get profile for match calculation if provided. The same mapping is used
    // by Explorer, Chancing and the dashboard, including the structured
    // activity portfolio and every financial flag.
    let profileData = null;
    let matchProfile = null;
    if (profileIdStr) {
      const pId = parseInt(profileIdStr, 10);
      // Personalised matching reads private profile data (GPA, scores,
      // degree), so only the owner — or an admin — gets it. Anyone else
      // silently receives the public, unpersonalised list.
      const auth = await authenticate(req);
      if (auth.ok && (auth.session.profile.id === pId || auth.session.isAdmin)) {
        const [p] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, pId));
        if (p) {
          profileData = p;
          matchProfile = await toMatchProfileWithActivities(p);
        }
      }
    }

    // ---------- Pre-fetch program fields per university ----------
    // Needed for career/major filtering and for enriching the response so the
    // client can do synonym-aware matching without a second round-trip.
    const programFieldsByUni = new Map<number, string[]>();
    try {
      const uniIdsForProg = allUnis.map((u) => u.id);
      if (uniIdsForProg.length > 0) {
        const progRows = await db
          .select({ universityId: universityPrograms.universityId, field: universityPrograms.field })
          .from(universityPrograms)
          .where(inArray(universityPrograms.universityId, uniIdsForProg));
        for (const r of progRows) {
          if (!r.field) continue;
          const arr = programFieldsByUni.get(r.universityId) ?? [];
          arr.push(r.field);
          programFieldsByUni.set(r.universityId, arr);
        }
      }
    } catch {
      // programs table missing or query failed — major filter will fall back to programMajor only
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

    // Program search: universities offering a program in the searched field (exact).
    const programFilter = searchParams.get("program");
    if (programFilter && programFilter !== "All") {
      const programRows = await db
        .select({ universityId: universityPrograms.universityId })
        .from(universityPrograms)
        .where(inArray(universityPrograms.field, [programFilter]));
      const uniIds = new Set(programRows.map((r) => r.universityId));
      allUnis = allUnis.filter(u => uniIds.has(u.id));
    }

    // Career & major explorer: filter by selected major using synonym-aware affinity.
    // Checks both the legacy `programMajor` summary and the detailed `programs` catalogue,
    // so universities added via either path are found. Uses subjectAffinity (same engine
    // as matching/recommender) so "Computer Science" also matches "Informatics", "IT", "Software Engineering", etc.
    const majorFilter = searchParams.get("major");
    if (majorFilter && majorFilter !== "All" && majorFilter.trim()) {
      const major = majorFilter.trim();
      allUnis = allUnis.filter((u) => {
        const candidates: string[] = [];
        if (u.programMajor) candidates.push(u.programMajor);
        const fields = programFieldsByUni.get(u.id);
        if (fields) candidates.push(...fields);
        // Also consider name contains major as very weak fallback via affinity on name
        if (candidates.length === 0) {
          // No programme info at all — can't claim it offers this major.
          // We still check name with affinity, but only exact/synonym counts.
          const fit = subjectAffinity([major], u.name);
          return fit.level === "exact" || fit.level === "synonym";
        }
        return candidates.some((field) => {
          const fit = subjectAffinity([major], field);
          return fit.level === "exact" || fit.level === "synonym" || fit.level === "partial";
        });
      });
      // Rank by major affinity so the best subject match appears first (exact > synonym > partial),
      // then by world ranking as a tie-breaker. This ensures the 12 shown for a major are the most relevant.
      allUnis.sort((a, b) => {
        const fieldsA = [...(a.programMajor ? [a.programMajor] : []), ...(programFieldsByUni.get(a.id) ?? [])];
        const fieldsB = [...(b.programMajor ? [b.programMajor] : []), ...(programFieldsByUni.get(b.id) ?? [])];
        const scoreA = fieldsA.length ? Math.max(...fieldsA.map((f) => subjectAffinity([major], f).score)) : 0;
        const scoreB = fieldsB.length ? Math.max(...fieldsB.map((f) => subjectAffinity([major], f).score)) : 0;
        if (scoreB !== scoreA) return scoreB - scoreA;
        if (a.worldRanking == null && b.worldRanking == null) return a.name.localeCompare(b.name);
        if (a.worldRanking == null) return 1;
        if (b.worldRanking == null) return -1;
        return a.worldRanking - b.worldRanking;
      });
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
        reasonDetails?: ReasonDetail[];
        issueDetails?: ReasonDetail[];
      } = { matchScore: null, matchCategory: null, reasons: [], potentialIssues: [] };
      if (matchProfile) {
        matchInfo = calculateUniversityMatch(matchProfile, toUniversityData(uni));
      }
      const src = sourceMap.get(uni.id) || null;
      const progFields = programFieldsByUni.get(uni.id) ?? [];
      return {
        ...uni,
        programFields: progFields,
        matchScore: matchInfo.matchScore,
        matchCategory: matchInfo.matchCategory,
        matchReasons: translateReasons(locale, "university", matchInfo.reasonDetails, matchInfo.reasons),
        matchIssues: translateReasons(locale, "university", matchInfo.issueDetails, matchInfo.potentialIssues),
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
    // \"temporarily unavailable\" message for 503).
    return NextResponse.json(
      { error: "University data is temporarily unavailable. Please try again shortly.", code: "data_unavailable" },
      { status: 503 },
    );
  }
}
