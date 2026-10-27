import { privateNoStoreJson } from "@/lib/apiResponse";
import { authenticate } from "@/lib/auth";
import { calculateScholarshipMatch, type MatchBreakdown, type ReasonDetail } from "@/lib/matching";
import { memoizeMatch } from "@/lib/matchMemo";
import { profileMatchFingerprint } from "@/lib/profileMatchFingerprint";
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
import { rankSemanticTexts } from "@/lib/ai/semanticSearch";
import { runMercuryDecision } from "@/lib/ai/decide";
import {
  EMPTY_SCHOLARSHIP_FILTERS,
  SCHOLARSHIP_BASIS_OPTIONS,
  SCHOLARSHIP_COVERAGE_OPTIONS,
  SCHOLARSHIP_DEGREE_OPTIONS,
  SCHOLARSHIP_GROUP_OPTIONS,
  SCHOLARSHIP_SORT_OPTIONS,
  SCHOLARSHIP_STATUS_OPTIONS,
  parseFilterTokens,
  parseScholarshipDegreeLevels,
  scholarshipGroupKey,
  scholarshipMatchesFilters,
  type ScholarshipFacets,
  type ScholarshipFilterDimension,
  type ScholarshipFilters,
  type ScholarshipFilterRow,
  type ScholarshipGroupOption,
  type ScholarshipSortOption,
} from "@/lib/scholarshipFilters";

/** Multi-value query params, both `?degree=A&degree=B` and `?degree=A,B`. */
function listParam(searchParams: URLSearchParams, ...names: string[]): string[] {
  const values: string[] = [];
  for (const name of names) {
    for (const raw of searchParams.getAll(name)) {
      for (const part of raw.split(",")) {
        const value = part.trim().slice(0, 80);
        if (value) values.push(value);
      }
    }
  }
  return [...new Set(values)].slice(0, 24);
}

/** `deadlineDate` arrives as a Date (json-serialized to a string) or is absent. */
function deadlineSortValue(row: { deadlineDate?: Date | string | null; deadline?: string | null }): string {
  const raw = row.deadlineDate;
  if (raw) {
    const asDate = raw instanceof Date ? raw : new Date(raw);
    if (!Number.isNaN(asDate.getTime())) return asDate.toISOString().slice(0, 10);
  }
  return (row.deadline ?? "").trim();
}

/** Counts per value, skipping empty buckets — the client renders what exists. */
function countValues(
  rows: ScholarshipFilterRow[],
  valuesOf: (row: ScholarshipFilterRow) => string[],
  allowed?: readonly string[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    for (const value of valuesOf(row)) {
      if (!value) continue;
      if (allowed && !allowed.includes(value)) continue;
      counts[value] = (counts[value] ?? 0) + 1;
    }
  }
  return counts;
}

export async function GET(req: Request) {
  try {
    await seedDatabase();
    // Match sentences are translated for the caller's language (cookie).
    const locale = localeFromRequest(req);
    const { searchParams } = new URL(req.url);
    const profileIdStr = searchParams.get("profileId");
    const search = searchParams.get("search")?.trim().slice(0, 200).toLowerCase();
    const country = searchParams.get("country")?.trim().slice(0, 100);
    const rawFocusId = searchParams.get("focusId");
    const focusId = rawFocusId && rawFocusId.length <= 12 ? Number(rawFocusId) : Number.NaN;

    /**
     * Catalogue filters (host country, degree level, funding type, application
     * status, award basis) plus the grid's sort/group choice. Every value is
     * canonical — the same tokens the catalogue stores — so a Russian or Uzbek
     * UI never sends a translated label into a database-shaped filter.
     */
    const sortParam = (searchParams.get("sort") ?? "relevance").trim() as ScholarshipSortOption;
    const groupParam = (searchParams.get("groupBy") ?? "none").trim() as ScholarshipGroupOption;
    const filters: ScholarshipFilters = {
      country: country && country !== "All" ? country : EMPTY_SCHOLARSHIP_FILTERS.country,
      degrees: parseFilterTokens(listParam(searchParams, "degree", "degrees"), SCHOLARSHIP_DEGREE_OPTIONS),
      coverages: parseFilterTokens(
        listParam(searchParams, "coverageTypes", "coverageType"),
        SCHOLARSHIP_COVERAGE_OPTIONS,
      ),
      statuses: parseFilterTokens(listParam(searchParams, "status", "statuses"), SCHOLARSHIP_STATUS_OPTIONS),
      basis: parseFilterTokens(listParam(searchParams, "basis"), SCHOLARSHIP_BASIS_OPTIONS),
    };
    const sortBy: ScholarshipSortOption = SCHOLARSHIP_SORT_OPTIONS.includes(sortParam) ? sortParam : "relevance";
    const groupBy: ScholarshipGroupOption = SCHOLARSHIP_GROUP_OPTIONS.includes(groupParam) ? groupParam : "none";
    const wantFacets = searchParams.get("facets") === "1";

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
      const pId = Number(profileIdStr);
      // Personalised matching reads private profile data (GPA, scores,
      // degree), so only the owner — or an admin — gets it. Anyone else
      // silently receives the public, unpersonalised list.
      const auth = await authenticate(req);
      if (Number.isSafeInteger(pId) && pId > 0 && auth.ok && (auth.session.profile.id === pId || auth.session.isAdmin)) {
        const cached = await getCachedProfileForMatching(pId);
        if (cached) {
          profileData = cached.profileData;
          matchProfile = cached.matchProfile;
          personalisedProfileId = pId;
        }
      }
    }

    // One fingerprint for the whole response: any score-relevant profile edit
    // changes it, which is exactly when the memoized scores must be recomputed.
    const profileFingerprint = profileData ? profileMatchFingerprint(profileData) : "anonymous";

    // The dashboard needs one number, not the full catalogue payload. Avoid
    // generating localized reasons, coverage metadata, and serializing every
    // scholarship just to count scores >= 60. The matching calculation itself
    // remains identical to the regular personalized response.
    if (searchParams.get("summary") === "match-count") {
      const matchCount = matchProfile
        ? bundle.entries.reduce(
            (count, scholarship) =>
              count +
              Number(
                scholarship.verificationStatus === "verified" &&
                  (memoizeMatch(
                    "scholarship-fit",
                    profileFingerprint,
                    scholarship.id,
                    scholarship as unknown as Record<string, unknown>,
                    () => calculateScholarshipMatch(matchProfile!, scholarship)
                  ).matchScore ?? 0) >= 60
              ),
            0,
          )
        : 0;
      return privateNoStoreJson({ matchCount }, { headers: { "Cache-Control": "private, no-store" } });
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

    // Country facet — snapshotted BEFORE the country selection is applied, so
    // the dropdown keeps listing every destination the SEARCH matches with the
    // number of awards each one holds (a country filter must not zero its own
    // options).
    const countryFacetSource: string[] = wantFacets
      ? allScholarships.map((scholarship) => scholarship.country ?? "")
      : [];

    if (country && country !== "All") {
      allScholarships = allScholarships.filter((s) => countriesMatch(s.country, country));
    }

    // ---------- Source signals (scholarship_sources -> sources) ----------
    // Served from the cached bundle (identical "most recently accessed" pick,
    // with the scholarship's own lastVerifiedAt only as a date fallback).
    const sourceMap = bundle.sourceMap;

    const mapped = allScholarships.map((s) => {
      const isVerified = s.verificationStatus === "verified";
      // Historical seed rows contain unsupported amounts, eligibility and
      // cycles. Preserve them in storage (an admin may have edited them), but
      // never publish those claims or derive a match/status from them until a
      // source review is recorded.
      const publicRow = isVerified ? s : {
        ...s,
        coverageType: "Unspecified",
        amountUsdValue: null,
        awardAmount: null,
        awardCurrency: null,
        awardPeriod: null,
        awardBasis: null,
        deadline: null,
        openingDate: null,
        deadlineDate: null,
        deadlineType: "unknown",
        deadlineRangeStart: null,
        deadlineRangeEnd: null,
        recurrence: "none",
        expectedOpeningPeriod: null,
        expectedDeadlinePeriod: null,
        applicationStatus: "unknown",
        rounds: "[]",
        degreeLevels: "[]",
        eligibleMajors: "[]",
        eligibleCountries: "[]",
        minGpa: null,
        minIelts: null,
        financialNeedBased: null,
        meritBased: null,
        description: "Current award details are unverified.",
        requirements: "Confirm current eligibility, award coverage, required documents, and dates with the official provider.",
        fundingType: "",
        tuitionCoverage: "",
        livingAllowance: null,
        travelAllowance: null,
        accommodation: "",
        applicationFee: null,
        englishRequirements: "",
        requiredDocuments: "[]",
        applicationUrl: null,
        sourceUrl: null,
      };
      let matchInfo: {
        matchScore: number | null;
        isEligible: boolean | null;
        reasons?: string[];
        potentialIssues?: string[];
        reasonDetails?: ReasonDetail[];
        issueDetails?: ReasonDetail[];
        breakdown?: MatchBreakdown;
      } = { matchScore: null, isEligible: null, reasons: [], potentialIssues: [] };
      if (matchProfile && isVerified) {
        // Memoized per (profile fingerprint, scholarship): the catalogue is
        // re-scored for every filter change and neither side moved.
        matchInfo = memoizeMatch("scholarship-fit", profileFingerprint, s.id, s as unknown as Record<string, unknown>, () =>
          calculateScholarshipMatch(matchProfile!, s)
        );
      }
      // Computed application status from dates (spec §6) — never stale.
      const statusInfo = withStatus(publicRow, locale);
      const src = sourceMap.get(s.id) || null;
      // Saved-university coverage (Module 1) — empty refs means no private
      // saved list was available, and every flag below stays honestly false.
      const cov = isVerified && savedUniRefs.length > 0 ? evaluateScholarshipForSavedUnis(s, savedUniRefs) : null;
      return {
        ...publicRow,
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
        sourceUrl: isVerified ? (src?.sourceUrl ?? null) : null,
        sourceTitle: isVerified ? (src?.sourceTitle ?? null) : null,
        sourceLastVerifiedAt: isVerified ? (src?.lastVerifiedAt ?? null) : null,
      };
    });

    /**
     * Faceted filtering. Runs on the PUBLIC projection (an unverified row has
     * its coverage/degree/eligibility stripped above), so a filter can never
     * surface a claim the catalogue is not allowed to publish.
     */
    const results = mapped.filter((row) => scholarshipMatchesFilters(row, filters));

    let facets: ScholarshipFacets | null = null;
    if (wantFacets) {
      const without = (dimension: ScholarshipFilterDimension) =>
        mapped.filter((row) => scholarshipMatchesFilters(row, filters, [dimension]));
      const countryCounts = new Map<string, number>();
      for (const name of countryFacetSource) {
        const key = name.trim();
        if (key) countryCounts.set(key, (countryCounts.get(key) ?? 0) + 1);
      }
      facets = {
        countries: [...countryCounts.entries()]
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value)),
        degrees: countValues(without("degrees"), (row) => parseScholarshipDegreeLevels(row.degreeLevels), SCHOLARSHIP_DEGREE_OPTIONS),
        coverages: countValues(without("coverages"), (row) => [row.coverageType ?? ""], SCHOLARSHIP_COVERAGE_OPTIONS),
        statuses: countValues(without("statuses"), (row) => [row.computedStatus ?? "unknown"], SCHOLARSHIP_STATUS_OPTIONS),
        basis: countValues(
          without("basis"),
          (row) => [...(row.meritBased === true ? ["merit"] : []), ...(row.financialNeedBased === true ? ["need"] : [])],
          SCHOLARSHIP_BASIS_OPTIONS,
        ),
      };
    }

    const semanticScores = new Map<number, number>();
    if (search && search.trim().length >= 4 && results.length > 1) {
      try {
        const candidates = results.slice(0, 63).map((item) => [item.title, item.provider, item.country, item.description, item.coverageType, item.eligibleMajors, item.degreeLevels].filter(Boolean).join(". "));
        const ranked = await rankSemanticTexts(search, candidates, { profileId: personalisedProfileId, timeoutMs: 3_500, limit: candidates.length });
        for (const item of ranked) {
          const result = results[item.index];
          if (result) semanticScores.set(result.id, item.similarity);
        }
        if (!profileData) results.sort((a, b) => (semanticScores.get(b.id) ?? -1) - (semanticScores.get(a.id) ?? -1));
      } catch {
        // Embedding timeout or provider errors preserve deterministic text matches and ordering.
      }
    }

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
        const semanticDifference = (semanticScores.get(b.id) ?? -1) - (semanticScores.get(a.id) ?? -1);
        if (semanticDifference !== 0) return semanticDifference;
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

    /**
     * The student's own ordering choice. Without it the list keeps the
     * relevance order above (match score / coverage tier), which stays the
     * default: "best fit for me" is the question this catalogue answers.
     */
    if (sortBy === "deadline") {
      // Soonest published deadline first; awards with no published date last —
      // never at the top pretending to be urgent.
      results.sort((a, b) => {
        const ad = deadlineSortValue(a);
        const bd = deadlineSortValue(b);
        if (ad !== bd) {
          if (!ad) return 1;
          if (!bd) return -1;
          return ad.localeCompare(bd);
        }
        return a.id - b.id;
      });
    } else if (sortBy === "amount") {
      results.sort((a, b) => {
        if (a.amountUsdValue == null && b.amountUsdValue == null) return a.id - b.id;
        if (a.amountUsdValue == null) return 1;
        if (b.amountUsdValue == null) return -1;
        if (b.amountUsdValue !== a.amountUsdValue) return b.amountUsdValue - a.amountUsdValue;
        return a.id - b.id;
      });
    } else if (sortBy === "title") {
      results.sort((a, b) => a.title.localeCompare(b.title) || a.id - b.id);
    }

    /**
     * Grouping is a stable re-sort on the group key, so the order chosen above
     * survives INSIDE each section. The client draws a heading whenever the
     * key changes, which keeps sections contiguous across pages.
     */
    if (groupBy !== "none") {
      results.sort(
        (a, b) => scholarshipGroupKey(a, groupBy).localeCompare(scholarshipGroupKey(b, groupBy)),
      );
    }

    // A command-search result may pass its record id with an exact-title
    // catalogue search. Promote only that already-filtered active row so it is
    // visible on the first page; normal catalogue ordering is unchanged.
    if (Number.isSafeInteger(focusId) && focusId > 0) {
      results.sort((a, b) => Number(b.id === focusId) - Number(a.id === focusId));
    }

    // A Mercury signal is an auxiliary consistency check on one explicitly
    // focused award. The deterministic eligibility engine remains the product
    // result; unknown criteria stay unknown and the provider signal is never a
    // guarantee. Only owner-authorized profile fields are sent, and failures
    // leave the catalogue response intact.
    let mercuryEligibilityReview: {
      model: string;
      available: boolean;
      probabilityPercent: number | null;
      deterministicEligibility: boolean | null;
      disclaimer: string;
    } | null = null;
    const focusedScholarship = results.find((item) => item.id === focusId);
    if (focusedScholarship && profileData && personalisedProfileId != null) {
      const review = await runMercuryDecision({
        profileId: personalisedProfileId,
        timeoutMs: 3_500,
        state: JSON.stringify({
          applicant: {
            degreeLevel: profileData.degreeLevel,
            targetMajor: profileData.targetMajor,
            gpa: profileData.gpa,
            gpaScale: profileData.gpaScale,
            ieltsScore: profileData.ieltsScore ?? null,
            toeflScore: profileData.toeflScore ?? null,
            preferredCountries: profileData.preferredCountries ?? null,
            needsFinancialAid: profileData.needsFinancialAid ?? profileData.needScholarship ?? null,
            requiresFullScholarship: profileData.requiresFullScholarship ?? null,
          },
          publishedAwardCriteria: {
            title: focusedScholarship.title,
            provider: focusedScholarship.provider,
            country: focusedScholarship.country,
            eligibilityText: focusedScholarship.requirements,
            eligibleCountries: focusedScholarship.eligibleCountries,
            eligibleMajors: focusedScholarship.eligibleMajors,
            degreeLevels: focusedScholarship.degreeLevels,
            coverageType: focusedScholarship.coverageType,
          },
        }),
        questions: [{
          key: "meetsAllKnownEligibilityCriteria",
          type: "yes_no",
          question: "Based only on the applicant facts and published award criteria supplied, does the applicant meet every explicitly stated eligibility requirement? Treat any missing, ambiguous, or unpublished requirement as unknown rather than assuming it is met. This is an auxiliary review, not a final eligibility ruling or award prediction.",
        }],
      });
      const signal = review.signals.meetsAllKnownEligibilityCriteria;
      mercuryEligibilityReview = {
        model: review.model,
        available: review.available && signal?.status === "ok",
        probabilityPercent: signal?.probabilityPercent ?? null,
        deterministicEligibility: typeof focusedScholarship.isEligible === "boolean" ? focusedScholarship.isEligible : null,
        disclaimer: "Supplementary AI signal only; the deterministic catalogue match and official provider rules remain controlling.",
      };
    }

    // Opt-in `?page=` / `?perPage=` pagination (after filtering + sorting).
    // Without those params the full list is returned (admin tools, ...).
    // Rows are localized LAST — every filter above ran on canonical English
    // data, so canonical dropdown values like "Full Tuition" never break.
    // `covTier` is an internal ordering key — the payload carries the honest
    // booleans (`coversSavedUni`, `isFullForSavedUni`) instead. It is stripped
    // for every row; the translation then runs on the PAGE only (translating
    // the whole catalogue to return 24 rows was wasted work).
    const visible = results.map(({ covTier: _covTier, ...row }) => row);
    const paginated = paginatedPayload("scholarships", visible, searchParams);
    const pageRows = paginated.scholarships as typeof visible;
    paginated.scholarships = pageRows.map((row) => localizeScholarshipRow(row, locale));
    return privateNoStoreJson({
      ...paginated,
      ...(mercuryEligibilityReview ? { mercuryEligibilityReview } : {}),
      // Facet counts describe the CANONICAL catalogue, so they are sent as-is
      // (country names are localized in the browser, like every other option).
      ...(facets ? { facets } : {}),
      ...(groupBy !== "none" ? { groupBy } : {}),
    });
  } catch (error) {
    console.error("GET /api/scholarships error:", error);
    return privateNoStoreJson({ error: "Failed to fetch scholarships" }, { status: 500 });
  }
}
