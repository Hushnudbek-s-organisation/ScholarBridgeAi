import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth";
import { calculateScholarshipMatch, type MatchBreakdown, type ReasonDetail } from "@/lib/matching";
import { localeFromRequest, translateReasons } from "@/lib/engineText";
import { withStatus } from "@/lib/scholarshipStatus";
import { seedDatabase } from "@/db/seed";
import { getCachedScholarshipsBundle, getCachedProfileForMatching } from "@/lib/catalogCache";
import { paginatedPayload } from "@/lib/pagination";
import { countriesMatch } from "@/lib/countries";

export async function GET(req: Request) {
  try {
    await seedDatabase();
    // Match sentences are translated for the caller's language (cookie).
    const locale = localeFromRequest(req);
    const { searchParams } = new URL(req.url);
    const profileIdStr = searchParams.get("profileId");
    const search = searchParams.get("search")?.toLowerCase();
    const country = searchParams.get("country");
    const coverageType = searchParams.get("coverageType");
    const focusId = Number(searchParams.get("focusId"));

    // Cached base catalogue — the same active-only visibility boundary, the
    // same resolved USD mirrors, without re-reading every scholarship (and its
    // source links) on each filter change. The array handed out is a copy.
    const bundle = await getCachedScholarshipsBundle();
    let allScholarships = [...bundle.entries];

    let profileData = null;
    let matchProfile = null;
    if (profileIdStr) {
      const pId = parseInt(profileIdStr, 10);
      // Personalised matching reads private profile data (GPA, scores,
      // degree), so only the owner — or an admin — gets it. Anyone else
      // silently receives the public, unpersonalised list.
      const auth = await authenticate(req);
      if (auth.ok && (auth.session.profile.id === pId || auth.session.isAdmin)) {
        const cached = await getCachedProfileForMatching(pId);
        if (cached) {
          profileData = cached.profileData;
          matchProfile = cached.matchProfile;
        }
      }
    }

    if (search) {
      allScholarships = allScholarships.filter(s =>
        s.title.toLowerCase().includes(search) ||
        s.provider.toLowerCase().includes(search) ||
        s.country.toLowerCase().includes(search) ||
        s.description.toLowerCase().includes(search) ||
        countriesMatch(s.country, search)
      );
    }

    if (country && country !== "All") {
      allScholarships = allScholarships.filter((s) => countriesMatch(s.country, country));
    }

    if (coverageType && coverageType !== "All") {
      allScholarships = allScholarships.filter(s => s.coverageType.includes(coverageType));
    }

    // ---------- Source signals (scholarship_sources -> sources) ----------
    // Served from the cached bundle (identical "most recently accessed" pick,
    // with the scholarship's own lastVerifiedAt only as a date fallback).
    const sourceMap = bundle.sourceMap;

    const results = allScholarships.map((s) => {
      let matchInfo: {
        matchScore: number | null;
        isEligible: boolean | null;
        reasons?: string[];
        potentialIssues?: string[];
        reasonDetails?: ReasonDetail[];
        issueDetails?: ReasonDetail[];
        breakdown?: MatchBreakdown;
      } = { matchScore: null, isEligible: null, reasons: [], potentialIssues: [] };
      if (matchProfile) {
        matchInfo = calculateScholarshipMatch(matchProfile, s);
      }
      // Computed application status from dates (spec §6) — never stale.
      const statusInfo = withStatus(s);
      const src = sourceMap.get(s.id) || null;
      return {
        ...s,
        matchScore: matchInfo.matchScore,
        isEligible: matchInfo.isEligible,
        matchReasons: translateReasons(locale, "scholarship", matchInfo.reasonDetails, matchInfo.reasons),
        matchIssues: translateReasons(locale, "scholarship", matchInfo.issueDetails, matchInfo.potentialIssues),
        matchBreakdown: matchInfo.breakdown ?? null,
        computedStatus: statusInfo.computedStatus,
        statusLabel: statusInfo.statusLabel,
        expectedLabel: statusInfo.expectedLabel,
        sourceUrl: src?.sourceUrl ?? null,
        sourceTitle: src?.sourceTitle ?? null,
        sourceLastVerifiedAt: src?.lastVerifiedAt ?? null,
      };
    });

    if (profileData) {
      // Sort: match score desc, then the nearest deadline (soonest first,
      // unknown deadlines last), then id. Without the deadline/id tie-break,
      // equal-scoring scholarships changed order between requests (Postgres
      // row order is not stable) — a student would see a shuffled list on
      // every refresh.
      results.sort((a, b) => {
        if (a.matchScore == null && b.matchScore == null) return 0;
        if (a.matchScore == null) return 1;
        if (b.matchScore == null) return -1;
        if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
        // `deadlineDate` arrives as a Date (json serialized to ISO) — turning
        // it into a string directly would compare "Wed Oct 15" lexicographically.
        const asYmd = (v: Date | string | null): string => {
          if (!v) return "";
          if (v instanceof Date) return v.toISOString().slice(0, 10);
          const t = new Date(v);
          return Number.isNaN(t.getTime()) ? String(v) : t.toISOString().slice(0, 10);
        };
        const ad = asYmd(a.deadlineDate) || a.deadline || "";
        const bd = asYmd(b.deadlineDate) || b.deadline || "";
        if (ad !== bd) {
          if (!ad) return 1;
          if (!bd) return -1;
          return ad.localeCompare(bd);
        }
        return a.id - b.id;
      });
    } else {
      // NULL amounts sort after verified amounts (never treat NULL as $0).
      results.sort((a, b) => {
        if (a.amountUsdValue == null && b.amountUsdValue == null) return a.id - b.id;
        if (a.amountUsdValue == null) return 1;
        if (b.amountUsdValue == null) return -1;
        if (b.amountUsdValue !== a.amountUsdValue) return b.amountUsdValue - a.amountUsdValue;
        return a.id - b.id;
      });
    }

    // A command-search result may pass its record id with an exact-title
    // catalogue search. Promote only that already-filtered active row so it is
    // visible on the first page; normal catalogue ordering is unchanged.
    if (Number.isSafeInteger(focusId) && focusId > 0) {
      results.sort((a, b) => Number(b.id === focusId) - Number(a.id === focusId));
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
