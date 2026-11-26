import { evaluateResolvedAcademicCriteria, originalAcademicRequirementInput } from "@/lib/academicDecision";
import { todayYmd } from "@/lib/catalogueOrder";
import { compareDegreeLevels } from "@/lib/degreeLevels";
import { parseEligibilityScope } from "@/lib/eligibilityScope";
import type { RequirementEvaluation } from "@/lib/requirementGroups";
import { compareScholarshipDeadlines, compareScholarshipStatus, publishedYearlyScholarshipUsd, scholarshipWindow } from "@/lib/scholarshipBrowsing";
import { safeAcademicLink } from "@/lib/universityCardSummary";
import { resolveAcademicRequirements } from "@/lib/universityDetailRequirements";
import { findCatalogueMatches } from "@/lib/catalogueSearch";
import {prepareAwardCoverage} from "@/lib/awardCoverageContext.server";
import { presentedCatalogueFacts } from "@/lib/catalogueFacts.server";
import { privateNoStoreJson } from "@/lib/apiResponse";
import { authenticate } from "@/lib/auth";
import {
  calculateScholarshipMatch,
  calculateUniversityMatch,
  type UniversityData,
} from "@/lib/matching";
import { fitBucket, type ChanceBucket } from "@/lib/scholarshipGates";
import { combinedRelevance } from "@/lib/scholarshipRanking";
import { memoizeMatch } from "@/lib/matchMemo";
import { profileMatchFingerprint } from "@/lib/profileMatchFingerprint";
import { localeFromRequest, translateReasons } from "@/lib/engineText";
import { withStatus } from "@/lib/scholarshipStatus";
import { seedDatabase } from "@/db/seed";
import { db } from "@/db";
import { savedScholarships, savedUniversities, universities } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getCachedScholarshipsBundle, getCachedProfileForMatching, getCachedUniversitiesBundle } from "@/lib/catalogCache";
import { legacyEvidence } from "@/lib/factPresentation";
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
import {
  EMPTY_SCHOLARSHIP_FILTERS,
  SCHOLARSHIP_BASIS_OPTIONS,
  SCHOLARSHIP_CHANCE_OPTIONS,
  SCHOLARSHIP_FIT_OPTIONS,
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

const requirementRank: Record<ChanceBucket, number> = { meets: 0, unknown: 1, below: 2 };

function countedChecks(result: RequirementEvaluation, fields: Set<string>): number {
  if (result.field) fields.add(result.field);
  if (result.children.length) return result.children.reduce((total, child) => total + countedChecks(child, fields), 0);
  return Number(result.state === "met" || result.state === "unmet");
}

function compareScore(a: number | null, b: number | null): number {
  if (a == null) return b == null ? 0 : 1;
  return b == null ? -1 : b - a;
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
      // Personal dimensions: only a loaded profile can answer them, and the
      // server drops them for an anonymous caller further down.
      chance: parseFilterTokens(listParam(searchParams, "chance", "chances"), SCHOLARSHIP_CHANCE_OPTIONS),
      fit: parseFilterTokens(listParam(searchParams, "fit", "fits"), SCHOLARSHIP_FIT_OPTIONS),
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
    let originalProfile = null;
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
          originalProfile = cached.chancingProfile;
          personalisedProfileId = pId;
        }
      }
    }

    if (searchParams.get("saved") === "1") {
      if (personalisedProfileId == null) {
        return privateNoStoreJson(paginatedPayload("scholarships", [], searchParams));
      }
      const saved = await db.select({ id: savedScholarships.scholarshipId })
        .from(savedScholarships).where(eq(savedScholarships.profileId, personalisedProfileId));
      const savedIds = new Set(saved.map(({ id }) => id));
      allScholarships = allScholarships.filter(({ id }) => savedIds.has(id));
    }

    // The two personal filters are unanswerable without a profile. Rather than
    // return a silently empty catalogue (a stale deep link, an expired
    // session), an anonymous caller simply gets the unfiltered list.
    if (!matchProfile) {
      filters.chance = [];
      filters.fit = [];
    }

    const profileFingerprint = profileData ? profileMatchFingerprint(profileData) : "anonymous";
    const academicProfile = originalProfile ? originalAcademicRequirementInput(originalProfile) : null;
    const now = new Date();
    const today = todayYmd(now);
    const fitInputs = (row: (typeof allScholarships)[number]) => {
      const facts = bundle.facts.get(row.id) ?? [];
      const academics = facts.length ? resolveAcademicRequirements(facts, { degreeLevel: profileData?.degreeLevel }) : null;
      const summary = academics?.requirementGroup ? null : academics?.summary;
      const gpa = summary?.gpa;
      return {
        academics,
        scholarship: {
          ...row,
          minGpa: gpa && ["4", "4.0", "GPA 4.0"].includes(gpa.unit ?? "") ? gpa.single : null,
          minIelts: summary?.ielts?.single ?? null,
        },
      };
    };
    const matchFor = (row: ReturnType<typeof fitInputs>["scholarship"]) => {
      if (!matchProfile || row.verificationStatus !== "verified") return null;
      const result = memoizeMatch("scholarship-fit", profileFingerprint, row.id, row as unknown as Record<string, unknown>, () =>
        calculateScholarshipMatch(matchProfile, row)
      );
      return result.breakdown.comparedDimensions > 0 ? result : null;
    };

    if (searchParams.get("summary") === "match-count") {
      const matchCount = matchProfile ? bundle.entries.reduce((count, row) =>
        count + Number((matchFor(fitInputs(row).scholarship)?.matchScore ?? 0) >= 60), 0) : 0;
      return privateNoStoreJson({ matchCount });
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
      allScholarships = findCatalogueMatches(allScholarships, search ?? "", s =>
        searchTerms.some(term =>
          s.title.toLowerCase().includes(term) ||
          s.provider.toLowerCase().includes(term) ||
          s.country.toLowerCase().includes(term) ||
          s.description.toLowerCase().includes(term) ||
          s.coverageType.toLowerCase().includes(term) ||
          (s.degreeLevels ?? "").toLowerCase().includes(term) ||
          (s.eligibleMajors ?? "").toLowerCase().includes(term) ||
          countriesMatch(s.country, term)
        ), s => [s.title, s.provider, s.country, s.eligibleMajors],
      );
    }

    // Country facet — snapshotted BEFORE the country selection is applied, so
    // the dropdown keeps listing every destination the SEARCH matches with the
    // number of awards each one holds (a country filter must not zero its own
    // options).
    const awardCoverage=await prepareAwardCoverage(req,profileData,savedUniRefs,allScholarships.map(s=>s.id),bundle.facts);
    savedUniRefs=awardCoverage.references;

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

    /**
     * The universities these awards sit at, for the combined ordering.
     *
     * Only loaded when a profile is present (nothing personal to compute
     * otherwise) and at least one award actually links a university. The
     * university match is memoised per university id inside the request: many
     * awards share one university, and the score depends only on the profile
     * and the university.
     */
    let unisById: Map<number, UniversityData> | null = null;
    if (matchProfile && allScholarships.some((s) => s.universityId != null)) {
      const uniBundle = await getCachedUniversitiesBundle();
      unisById = new Map(uniBundle.unis.map((uni) => [uni.id, uni as unknown as UniversityData]));
    }
    const uniMatchMemo = new Map<number, number | null>();
    const universityMatchFor = (universityId: number | null): number | null => {
      if (!matchProfile || universityId == null) return null;
      if (uniMatchMemo.has(universityId)) return uniMatchMemo.get(universityId) ?? null;
      const uni = unisById?.get(universityId);
      // An award linked to a university that is not in the catalogue has no
      // university part — it is not scored as a zero.
      const score = uni ? calculateUniversityMatch(matchProfile, uni).matchScore ?? null : null;
      uniMatchMemo.set(universityId, score);
      return score;
    };

    const mapped = allScholarships.map((s) => {
      const isVerified = s.verificationStatus === "verified";
      // The cached catalogue already suppresses unverified money, dates and links.
      const { academics, scholarship } = matchProfile && isVerified ? fitInputs(s) : { academics: null, scholarship: s };
      const matchInfo = matchFor(scholarship);
      const matchScore = matchInfo?.matchScore ?? null;
      const statusInfo = withStatus(s, locale, now);
      const window = scholarshipWindow(s, statusInfo.computedStatus, today);

      const academicCheck = academicProfile && academics ? evaluateResolvedAcademicCriteria(academics, academicProfile, today) : null;
      const degreeRestricted = parseEligibilityScope(s.degreeLevels).scope === "restricted";
      const degree = degreeRestricted ? compareDegreeLevels(matchProfile?.degreeLevel, s.degreeLevels) : "unknown";
      const academicFields = new Set<string>();
      const checked = (academicCheck ? countedChecks(academicCheck, academicFields) : 0) + Number(degree !== "unknown");
      const unreviewedMinimum =
        (s.minGpa != null && s.minGpa > 0 && !academicFields.has("gpa")) ||
        (s.minIelts != null && s.minIelts > 0 && !academicFields.has("ielts"));
      const hasAcademicCheck = Boolean(academics?.requirementGroup || Object.values(academics?.summary ?? {}).some(Boolean));
      const incomplete = unreviewedMinimum || (hasAcademicCheck && academicCheck?.state === "unknown") ||
        (degreeRestricted && degree === "unknown");
      const chanceBucket: ChanceBucket | null = !matchProfile ? null
        : !isVerified ? "unknown"
        : degree === "mismatch" || academicCheck?.state === "unmet" ? "below"
        : incomplete || checked === 0 ? "unknown" : "meets";
      const universityFit = isVerified ? universityMatchFor(s.universityId) : null;
      const relevance = combinedRelevance({
        fit: matchScore, university: universityFit, chance: chanceBucket === "unknown" ? null : chanceBucket,
      });
      const src = sourceMap.get(s.id) || null;
      // Saved-university coverage (Module 1) — empty refs means no private
      // saved list was available, and every flag below stays honestly false.
      const cov = savedUniRefs.length > 0 ? evaluateScholarshipForSavedUnis({...s,catalogueFacts:bundle.facts?.get(s.id)??[]}, savedUniRefs) : null;
      return {
        ...s,
        ...window,
        checkedRequirements: checked,
        requirementFacts: Object.entries(academics?.evidence ?? {}).flatMap(([fieldKey, fact]) =>
          fact.isOfficialMinimum ? [{ ...fact, fieldKey }] : []
        ),
        coverageAssessment:cov,
        coverageState:cov?.coverageState??"unknown",
        coveredUniversities: cov?.coveredUniNames ?? [],
        coversSavedUni: cov?.coversSavedUni ?? false,
        isFullForSavedUni: cov?.isFullForSavedUni ?? false,
        isFullCoverage: cov ? cov.isFullCoverage : false,
        covTier: cov ? coverageTier(cov) : 0,
        matchScore,
        isEligible: chanceBucket === "meets" ? true : chanceBucket === "below" ? false : null,
        matchReasons: translateReasons(locale, "scholarship", matchInfo?.reasonDetails, matchInfo?.reasons),
        matchIssues: translateReasons(locale, "scholarship", matchInfo?.issueDetails, matchInfo?.potentialIssues),
        matchBreakdown: matchInfo?.breakdown ?? null,
        // Personal filters read these two; the browser also shows them.
        chanceBucket,
        fitBucket: fitBucket(matchScore),
        universityMatchScore: universityFit,
        relevanceScore: relevance.score,
        computedStatus: statusInfo.computedStatus,
        statusLabel: statusInfo.statusLabel,
        expectedLabel: statusInfo.expectedLabel,
        sourceUrl: isVerified ? (safeAcademicLink(src?.sourceUrl) ?? safeAcademicLink(s.sourceUrl)) : null,
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
        // Personal dimensions. Empty for an anonymous caller (no buckets were
        // computed), which is exactly how the panel knows to hide them.
        chance: countValues(without("chance"), (row) => [row.chanceBucket ?? ""], SCHOLARSHIP_CHANCE_OPTIONS),
        fit: countValues(without("fit"), (row) => [row.fitBucket ?? ""], SCHOLARSHIP_FIT_OPTIONS),
      };
    }

    const semanticScores = new Map<number, number>();
    if (sortBy === "relevance" && search && search.length >= 4 && results.length > 1) {
      try {
        const candidates = results.slice(0, 63).map((row) => [row.title, row.provider, row.country, row.description].filter(Boolean).join(". "));
        for (const item of await rankSemanticTexts(search, candidates, { profileId: personalisedProfileId, timeoutMs: 3_500, limit: candidates.length })) {
          const row = results[item.index];
          if (row) semanticScores.set(row.id, item.similarity);
        }
      } catch {
        // Lexical matches are sufficient to serve the catalogue.
      }
    }

    const effectiveSort = !profileData && (sortBy === "fit" || sortBy === "requirements") ? "deadline" : sortBy;
    const byRequirements = (a: (typeof results)[number], b: (typeof results)[number]) =>
      requirementRank[a.chanceBucket ?? "unknown"] - requirementRank[b.chanceBucket ?? "unknown"];
    results.sort((a, b) => {
      switch (effectiveSort) {
        case "deadline":
          return compareScholarshipDeadlines(a, b);
        case "fit":
          return compareScore(a.matchScore, b.matchScore) || compareScholarshipDeadlines(a, b);
        case "requirements":
          return byRequirements(a, b) || b.checkedRequirements - a.checkedRequirements ||
            compareScholarshipDeadlines(a, b);
        case "amount":
          return compareScore(publishedYearlyScholarshipUsd(a), publishedYearlyScholarshipUsd(b)) ||
            compareScholarshipDeadlines(a, b);
        case "title":
          return a.title.localeCompare(b.title) || a.id - b.id;
        default:
          return compareScholarshipStatus(a, b) || byRequirements(a, b) ||
            compareScore(a.matchScore, b.matchScore) || b.covTier - a.covTier ||
            compareScore(a.relevanceScore, b.relevanceScore) ||
            (semanticScores.get(b.id) ?? -1) - (semanticScores.get(a.id) ?? -1) ||
            compareScholarshipDeadlines(a, b);
      }
    });

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

    // Paginate after filtering and sorting.
    // Rows are localized LAST — every filter above ran on canonical English
    // data, so canonical dropdown values like "Full Tuition" never break.
    // `covTier` is an internal ordering key — the payload carries the honest
    // booleans (`coversSavedUni`, `isFullForSavedUni`) instead. It is stripped
    // for every row; the translation then runs on the PAGE only (translating
    // the whole catalogue to return 24 rows was wasted work).
    const visible = results.map(({ covTier: _covTier, ...row }) => row);
    const paginated = paginatedPayload("scholarships", visible, searchParams);
    const pageRows = paginated.scholarships as typeof visible;
    // §4: funding facts carry the same field-level evidence envelope. An
    // amount without a verified official source stays `legacy_unknown`; it is
    // never presented as a guaranteed stipend or an official minimum.
    paginated.scholarships = !profileData && searchParams.get("view") !== "expanded" ? pageRows.map((row) => ({
      id: row.id, title: row.title, country: row.country, provider: row.provider, degreeLevels: row.degreeLevels,
      coverageType: row.coverageType, amountUsdValue: row.amountUsdValue, verificationStatus: row.verificationStatus,
      computedStatus: row.computedStatus, deadlineDate: row.deadlineDate, deadline: row.deadline,
      opensOn: row.opensOn, closesOn: row.closesOn,
      sourceUrl: row.sourceUrl, applicationUrl: row.applicationUrl,
    })) : pageRows.map((row) => {
      const r = row as unknown as Record<string, unknown>;
      return {
        ...localizeScholarshipRow(row, locale),
        resolvedFacts: presentedCatalogueFacts(bundle.facts?.get(row.id) ?? []),
        evidence: legacyEvidence({
          entityVerified: r.verificationStatus === "verified",
          sourceUrl: typeof r.officialSourceUrl === "string" ? r.officialSourceUrl
            : typeof r.sourceUrl === "string" ? r.sourceUrl : null,
          fields: {
            amountUsdValue: r.amountUsdValue as number | null,
            awardAmount: r.awardAmount as number | null,
            livingAllowance: r.livingAllowance as number | null,
            minIelts: r.minIelts as number | null,
          },
        }),
      };
    });
    return privateNoStoreJson({
      ...paginated,
      sortApplied: effectiveSort,
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
