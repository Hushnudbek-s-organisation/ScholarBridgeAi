import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth";
import { calculateScholarshipMatch, type MatchBreakdown, type ReasonDetail } from "@/lib/matching";
import { localeFromRequest, translateReasons } from "@/lib/engineText";
import { withStatus } from "@/lib/scholarshipStatus";
import { seedDatabase } from "@/db/seed";
import { db } from "@/db";
import { savedUniversities, universities } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getCachedScholarshipsBundle, getCachedProfileForMatching } from "@/lib/catalogCache";
import { paginatedPayload } from "@/lib/pagination";
import { countriesMatch } from "@/lib/countries";
import { resolvedUsdUniversityCosts } from "@/lib/usdCosts";
import {
  coverageTier,
  evaluateScholarshipForSavedUnis,
  type SavedUniRef,
} from "@/lib/savedUniCoverage";
import { expandMultilingualSearchTerms, localizeScholarshipRow } from "@/lib/catalogLocalizer";

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
    /** Owner/admin-verified profile whose PRIVATE saved-university list may steer ordering. */
    let personalisedProfileId: number | null = null;
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
          personalisedProfileId = pId;
        }
      }
    }

    // The dashboard needs one number, not the full catalogue payload. Avoid
    // generating localized reasons, coverage metadata, and serializing every
    // scholarship just to count scores >= 60. The matching calculation itself
    // remains identical to the regular personalized response.
    if (searchParams.get("summary") === "match-count") {
      const matchCount = matchProfile
        ? bundle.entries.reduce(
            (count, scholarship) =>
              count + Number((calculateScholarshipMatch(matchProfile, scholarship).matchScore ?? 0) >= 60),
            0,
          )
        : 0;
      return NextResponse.json({ matchCount }, { headers: { "Cache-Control": "private, no-store" } });
    }

    // Module 1 — awards that 100% cover a university the student SAVED lead
    // the personalised list. The saved rows are private data, so the refs
    // exist only on the owner/admin branch above; everything else keeps the
    // plain catalogue ordering.
    let savedUniRefs: SavedUniRef[] = [];
    if (personalisedProfileId != null) {
      const savedUniRows = await db
        .select({ universityId: savedUniversities.universityId })
        .from(savedUniversities)
        .where(eq(savedUniversities.profileId, personalisedProfileId));
      const savedUniIds = [...new Set(savedUniRows.map((r) => r.universityId))];
      if (savedUniIds.length > 0) {
        const uniRows = await db.select().from(universities).where(inArray(universities.id, savedUniIds));
        savedUniRefs = uniRows.map((u) => ({
          id: u.id,
          name: u.name,
          country: u.country,
          annualTuitionUsd: resolvedUsdUniversityCosts(u).annualTuitionUsd,
        }));
      }
    }

    // Search runs on canonical English rows: uz/ru/English queries expand to
    // canonical keywords ("to'liq"→"full", "stipendiya"→"scholarship", …).
    const searchTerms = search ? expandMultilingualSearchTerms(search) : [];
    if (searchTerms.length > 0) {
      allScholarships = allScholarships.filter(s =>
        searchTerms.some(term =>
          s.title.toLowerCase().includes(term) ||
          s.provider.toLowerCase().includes(term) ||
          s.country.toLowerCase().includes(term) ||
          s.description.toLowerCase().includes(term) ||
          s.coverageType.toLowerCase().includes(term) ||
          (s.degreeLevels ?? "").toLowerCase().includes(term) ||
          (s.eligibleMajors ?? "").toLowerCase().includes(term) ||
          countriesMatch(s.country, term)
        )
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
      // Labels are localized for the caller's locale (default "en" callers,
      // like the deadlines feed, keep the canonical English words).
      const statusInfo = withStatus(s, locale);
      const src = sourceMap.get(s.id) || null;
      // Saved-university coverage (Module 1) — empty refs means no private
      // saved list was available, and every flag below stays honestly false.
      const cov = savedUniRefs.length > 0 ? evaluateScholarshipForSavedUnis(s, savedUniRefs) : null;
      return {
        ...s,
        coveredUniversities: cov?.coveredUniNames ?? [],
        coversSavedUni: cov?.coversSavedUni ?? false,
        isFullForSavedUni: cov?.isFullForSavedUni ?? false,
        isFullCoverage: cov ? cov.isFullCoverage : false,
        covTier: cov ? coverageTier(cov) : 0,
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
      // Sort: the four coverage tiers first (full-coverage AT a saved
      // university → other saved-university awards → general full-coverage →
      // rest), then match score desc, then the nearest deadline (soonest
      // first, unknown deadlines last), then id. Without the deadline/id
      // tie-break, equal-scoring scholarships changed order between requests
      // (Postgres row order is not stable) — a student would see a shuffled
      // list on every refresh. `covTier` is 0 for every row when no private
      // saved list exists, so the anonymous ordering is unchanged.
      results.sort((a, b) => {
        if (a.covTier !== b.covTier) return b.covTier - a.covTier;
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
    // Rows are localized LAST — every filter above ran on canonical English
    // data, so canonical dropdown values like "Full Tuition" never break.
    return NextResponse.json(
      paginatedPayload(
        "scholarships",
        // `covTier` is an internal ordering key — the payload carries the
        // honest booleans (`coversSavedUni`, `isFullForSavedUni`) instead.
        results.map(({ covTier: _covTier, ...row }) => localizeScholarshipRow(row, locale)),
        searchParams
      ),
    );
  } catch (error) {
    console.error("GET /api/scholarships error:", error);
    return NextResponse.json({ error: "Failed to fetch scholarships" }, { status: 500 });
  }
}
