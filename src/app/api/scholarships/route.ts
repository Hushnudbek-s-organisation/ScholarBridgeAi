import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  scholarships,
  studentProfiles,
  scholarshipSources,
  sources,
} from "@/db/schema";
import { calculateScholarshipMatch } from "@/lib/matching";
import { withStatus } from "@/lib/scholarshipStatus";
import { eq, inArray } from "drizzle-orm";
import { seedDatabase } from "@/db/seed";
import { paginatedPayload } from "@/lib/pagination";

export async function GET(req: Request) {
  try {
    await seedDatabase();
    const { searchParams } = new URL(req.url);
    const profileIdStr = searchParams.get("profileId");
    const search = searchParams.get("search")?.toLowerCase();
    const country = searchParams.get("country");
    const coverageType = searchParams.get("coverageType");

    let allScholarships = await db.select().from(scholarships);

    let profileData = null;
    if (profileIdStr) {
      const pId = parseInt(profileIdStr, 10);
      const [p] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, pId));
      if (p) profileData = p;
    }

    if (search) {
      allScholarships = allScholarships.filter(s =>
        s.title.toLowerCase().includes(search) ||
        s.provider.toLowerCase().includes(search) ||
        s.country.toLowerCase().includes(search) ||
        s.description.toLowerCase().includes(search)
      );
    }

    if (country && country !== "All") {
      allScholarships = allScholarships.filter(s => s.country === country);
    }

    if (coverageType && coverageType !== "All") {
      allScholarships = allScholarships.filter(s => s.coverageType.includes(coverageType));
    }

    // ---------- Fetch source signals (scholarship_sources -> sources) ----------
    const sourceMap = new Map<number, { sourceUrl: string | null; lastVerifiedAt: string | null; sourceTitle: string | null }>();
    try {
      const schIds = allScholarships.map((s) => s.id);
      if (schIds.length > 0) {
        const links = await db
          .select()
          .from(scholarshipSources)
          .where(inArray(scholarshipSources.scholarshipId, schIds));

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
            // sources shape differs
          }
        }

        const grouped = new Map<number, typeof links>();
        for (const link of links) {
          const arr = grouped.get(link.scholarshipId) || [];
          arr.push(link);
          grouped.set(link.scholarshipId, arr);
        }

        for (const [schId, schLinks] of grouped) {
          let bestUrl: string | null = null;
          let bestVerified: Date | null = null;
          let bestTitle: string | null = null;
          for (const l of schLinks) {
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
            sourceMap.set(schId, {
              sourceUrl: bestUrl,
              lastVerifiedAt: bestVerified ? bestVerified.toISOString() : null,
              sourceTitle: bestTitle,
            });
          }
        }

        // If linked source exists but lacks accessedAt, fallback to scholarship's own lastVerifiedAt
        for (const sch of allScholarships) {
          const existing = sourceMap.get(sch.id);
          if (existing && !existing.lastVerifiedAt) {
            const fallback = (sch as any).lastVerifiedAt ? new Date((sch as any).lastVerifiedAt).toISOString() : null;
            if (fallback) {
              sourceMap.set(sch.id, { ...existing, lastVerifiedAt: fallback });
            }
          }
        }
      }
    } catch {
      // tables missing — UI will show pending verification
    }

    const results = allScholarships.map((s) => {
      let matchInfo: {
        matchScore: number | null;
        isEligible: boolean | null;
        reasons?: string[];
        potentialIssues?: string[];
      } = { matchScore: null, isEligible: null, reasons: [], potentialIssues: [] };
      if (profileData) {
        matchInfo = calculateScholarshipMatch(profileData, s);
      }
      // Computed application status from dates (spec §6) — never stale.
      const statusInfo = withStatus(s);
      const src = sourceMap.get(s.id) || null;
      return {
        ...s,
        matchScore: matchInfo.matchScore,
        isEligible: matchInfo.isEligible,
        matchReasons: matchInfo.reasons ?? [],
        matchIssues: matchInfo.potentialIssues ?? [],
        computedStatus: statusInfo.computedStatus,
        statusLabel: statusInfo.statusLabel,
        expectedLabel: statusInfo.expectedLabel,
        sourceUrl: src?.sourceUrl ?? null,
        sourceTitle: src?.sourceTitle ?? null,
        sourceLastVerifiedAt: src?.lastVerifiedAt ?? null,
      };
    });

    if (profileData) {
      // NULL match scores sort last (no profile data -> never ranked by score).
      results.sort((a, b) => {
        if (a.matchScore == null && b.matchScore == null) return 0;
        if (a.matchScore == null) return 1;
        if (b.matchScore == null) return -1;
        return b.matchScore - a.matchScore;
      });
    } else {
      // NULL amounts sort after verified amounts (never treat NULL as $0).
      results.sort((a, b) => {
        if (a.amountUsdValue == null && b.amountUsdValue == null) return 0;
        if (a.amountUsdValue == null) return 1;
        if (b.amountUsdValue == null) return -1;
        return b.amountUsdValue - a.amountUsdValue;
      });
    }

    // Opt-in `?page=` / `?perPage=` pagination (after filtering + sorting).
    // Without those params the full list is returned (admin tools, ...).
    return NextResponse.json(
      paginatedPayload("scholarships", results, searchParams),
    );
  } catch (error) {
    console.error("GET /api/scholarships error:", error);
    return NextResponse.json({ error: "Failed to fetch scholarships" }, { status: 500 });
  }
}
