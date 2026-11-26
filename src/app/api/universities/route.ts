import { evaluateResolvedAcademicCriteria, originalAcademicRequirementInput } from "@/lib/academicDecision";
import { catalogueTuition } from "@/lib/catalogueTuition";
import { findCatalogueMatches } from "@/lib/catalogueSearch";
import {reportReadFailure} from "@/lib/readFailure.server";
import {resolveAcademicRequirements,academicDecisionEnvelope} from "@/lib/universityDetailRequirements";
import { presentedCatalogueFacts } from "@/lib/catalogueFacts.server";
import { privateNoStoreJson } from "@/lib/apiResponse";
import { authenticate } from "@/lib/auth";
import { calculateUniversityMatch, type MatchBreakdown, type ReasonDetail } from "@/lib/matching";
import { localeFromRequest, translateReasons } from "@/lib/engineText";
import { seedDatabase } from "@/db/seed";
import { getCachedUniversitiesBundleForAssessment, getCachedProfileForMatching } from "@/lib/catalogCache";
import { paginatedPayload } from "@/lib/pagination";
import { supportsDegreeLevel } from "@/lib/degreeLevels";
import { countriesMatch } from "@/lib/countries";
import { expandMultilingualSearchTerms, localizeUniversityRow } from "@/lib/catalogLocalizer";
import { memoizeMatch } from "@/lib/matchMemo";
import { profileMatchFingerprint } from "@/lib/profileMatchFingerprint";
import { toUniversityData } from "@/lib/profileMapping";
import { subjectAffinity } from "@/lib/subjectAffinity";
import { selectUniversityCardSummary } from "@/lib/universityCardSummary";
import { universityProgrammeDiscovery } from "@/lib/universityProgrammeDiscovery";
import { matchesUniversityType } from "@/lib/universityType";
import { withResolvedUsdCosts } from "@/lib/usdCosts";
import { rankSemanticTexts } from "@/lib/ai/semanticSearch";
import { parseUniversitySort, semanticRerankAllowed, sortUniversities, toAdmissionComparison } from "@/lib/universitySort";
import { legacyEvidence } from "@/lib/factPresentation";

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
    const search = searchParams.get("search")?.trim().slice(0, 200).toLowerCase();
    const country = searchParams.get("country")?.trim().slice(0, 100);
    const degreeLevel = (searchParams.get("degreeLevel") ?? searchParams.get("degree"))?.trim().slice(0, 50);
    const maxTuition = searchParams.get("maxTuition")?.slice(0, 24);
    const parsedSort = parseUniversitySort(searchParams.get("sort")?.slice(0, 24));
    const uniType = searchParams.get("type")?.trim().slice(0, 24); // Public | Private
    const contextText=(key:string,max:number)=>{const value=searchParams.get(key);if(value==null||value==="")return null;if(value.length>max||/[\u0000-\u001f]/.test(value))throw new Error("invalid_requirement_context");return value.trim()||null;};
    const academicContext={programName:null,degreeLevel:degreeLevel??null,admissionCycle:contextText("admissionCycle",100),applicantScope:contextText("applicantScope",200)};
    const ieltsFilter = searchParams.get("ielts")?.slice(0, 12); // e.g. "6.5" → only unis with minIelts <= 6.5
    const rank = (name: string) => {
      const raw = searchParams.get(name);
      if (!raw || raw.length > 12) return null;
      const value = Number(raw);
      return Number.isSafeInteger(value) && value > 0 && value <= 1_000_000 ? value : null;
    };
    const qsYear = rank("qsYear");
    const minRank = rank("minRank");
    const maxRank = rank("maxRank");

    // One cached read of the base catalogue (all universities + program fields
    // + source links) instead of 3 full joins per filter change. Treat the
    // cached snapshot as read-only; map into response-local rows below.
    const bundle = await getCachedUniversitiesBundleForAssessment();
    // Values on an unverified university row are not suitable for filters,
    // ordering, or chancing inputs. Preserve the database row; sanitize only
    // this response-local copy. Institution type is handled separately and
    // remains unknown unless its own evidence says otherwise.
    const idsParam = searchParams.get("ids");
    const ids = new Set((idsParam ?? "").slice(0, 120).split(",").slice(0, 3).map(Number).filter((id) => Number.isSafeInteger(id) && id > 0));
    let allUnis = bundle.unis.filter((uni) => uni.isActive !== false && (idsParam == null || ids.has(uni.id))).map((uni) => {
      const qsRanking = bundle.qsRankings.get(uni.id) ?? null;
      const ranking = {
        qsRanking,
        worldRanking: qsRanking?.rank ?? null,
        qsRankYear: qsRanking?.year ?? null,
      };
      if (uni.verificationStatus === "verified") return { ...withResolvedUsdCosts(uni), ...ranking };
      return {
        ...uni,
        ...ranking,
        description: "",
        highlights: "[]",
        annualTuitionUsd: null,
        annualLivingEstUsd: null,
        accommodationCostUsd: null,
        annualTuition: null,
        annualLivingEst: null,
        accommodationCost: null,
        applicationFee: null,
        minGpa: null,
        minIelts: null,
        minSat: null,
        acceptanceRate: null,
        postStudyWorkVisaYears: null,
      };
    });

    // Get profile for match calculation if provided. The same mapping is used
    // by Explorer, Chancing and the dashboard, including the structured
    // activity portfolio and every financial flag.
    let profileData = null;
    let matchProfile = null;
    // The academic checks use the original score units and exam records.
    let chancingProfile = null;
    if (profileIdStr) {
      const pId = Number(profileIdStr);
      // Personalised matching reads private profile data (GPA, scores,
      // degree), so only the owner — or an admin — gets it. Anyone else
      // silently receives the public, unpersonalised list.
      const auth = await authenticate(req);
      if (Number.isSafeInteger(pId) && pId > 0 && auth.ok && (auth.session.profile.id === pId || auth.session.isAdmin)) {
        // 15 s memo of the derived match inputs — the profile and its
        // activity portfolio are edited far less often than they are read.
        const cached = await getCachedProfileForMatching(pId);
        if (cached) {
          profileData = cached.profileData;
          matchProfile = cached.matchProfile;
          chancingProfile = cached.chancingProfile;
        }
      }
    }

    // One fingerprint for the whole response: it changes the moment the student
    // edits a score-relevant field, which invalidates memoized fit.
    const profileFingerprint = profileData ? profileMatchFingerprint(profileData) : "anonymous";

    // ---------- Program fields per university (from the cached bundle) ----------
    // Needed for career/major filtering and for enriching the response so the
    // client can do synonym-aware matching without a second round-trip.
    const programFieldsByUni = bundle.programFieldsByUni;

    // ---------- Filtering (NULL values excluded from numeric filters) ----------
    // Search runs on canonical English rows: uz/ru/English queries expand to
    // canonical keywords ("germaniya"→"germany", "kompyuter"→"computer science").
    const searchTerms = search ? expandMultilingualSearchTerms(search) : [];
    if (searchTerms.length > 0) {
      allUnis = findCatalogueMatches(allUnis, search ?? "", u =>
        searchTerms.some(term =>
          u.name.toLowerCase().includes(term) ||
          (u.programMajor ?? "").toLowerCase().includes(term) ||
          (u.city ?? "").toLowerCase().includes(term) ||
          u.country.toLowerCase().includes(term) ||
          countriesMatch(u.country, term) ||
          (programFieldsByUni.get(u.id)?.some((f) => f.toLowerCase().includes(term)) ?? false)
        ), u => [u.name, u.city, u.country, u.programMajor, ...(programFieldsByUni.get(u.id) ?? [])],
      );
    }

    if (country && country !== "All") {
      allUnis = allUnis.filter((u) => countriesMatch(u.country, country));
    }

    // Type is a published catalogue filter; an unpublished type stays unknown
    // and is not silently treated as either Public or Private.
    if (uniType && ["Public", "Private"].includes(uniType)) {
      allUnis = allUnis.filter((u) => matchesUniversityType(u.universityType, uniType));
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

    const tuitionFor = (row: (typeof allUnis)[number]) => catalogueTuition(
      row, bundle.cardEvidence.programmes.get(row.id) ?? [], requestedDegree, searchParams.get("major")?.slice(0, 120),
    );

    // Tuition filter: only universities with VERIFIED tuition (NULL excluded, spec §16).
    if (maxTuition != null && maxTuition !== "") {
      const requestedMax = Number(maxTuition);
      // Treat the UI's $150k ceiling as a server-side bound too. Out-of-range
      // or malformed client values must not silently disable the tuition filter.
      const maxT = Number.isFinite(requestedMax)
        ? Math.max(0, Math.min(requestedMax, 150_000))
        : 150_000;
      allUnis = allUnis.filter((university) => { const tuition = tuitionFor(university); return tuition != null && tuition.amount <= maxT; });
    }

    const compareAdmission = chancingProfile !== null && (parsedSort.sort === "chance_desc" || parsedSort.sort === "best_desc");
    const academicProfile = compareAdmission ? originalAcademicRequirementInput(chancingProfile) : null;
    const asOfDate = new Date().toISOString().slice(0, 10);
    // Resolve scoped evidence once when filtering, sorting and rendering reuse it.
    const academicById = new Map<number, ReturnType<typeof resolveAcademicRequirements>>();
    const academicFor = (id: number) => {
      const cached = academicById.get(id);
      if (cached) return cached;
      const resolved = resolveAcademicRequirements(bundle.facts?.get(id) ?? [], academicContext);
      academicById.set(id, resolved);
      return resolved;
    };

    if (ieltsFilter != null && ieltsFilter !== "") {
      const minI = Number(ieltsFilter);
      if (Number.isFinite(minI) && minI >= 0 && minI <= 9) {
        allUnis = allUnis.filter(u => {const value=academicFor(u.id).summary.ielts?.single;return value!=null&&value<=minI;});
      }
    }

    if (qsYear) allUnis = allUnis.filter((university) => university.qsRankYear === qsYear);
    if (minRank) allUnis = allUnis.filter(u => u.worldRanking != null && (u.qsRanking?.upperRank ?? u.worldRanking) >= minRank);
    if (maxRank) allUnis = allUnis.filter(u => u.worldRanking != null && u.worldRanking <= maxRank);

    // Program search: universities offering a program in the searched field (exact).
    const programFilter = searchParams.get("program")?.trim().slice(0, 120);
    if (programFilter && programFilter !== "All") {
      const uniIds = new Set<number>();
      for (const [uniId, fields] of programFieldsByUni) {
        if (fields.includes(programFilter)) uniIds.add(uniId);
      }
      allUnis = allUnis.filter(u => uniIds.has(u.id));
    }

    // Career & major explorer: filter by selected major using synonym-aware affinity.
    // Checks both the legacy `programMajor` summary and the detailed `programs` catalogue,
    // so universities added via either path are found. Uses subjectAffinity (same engine
    // as matching/recommender) so "Computer Science" also matches "Informatics", "IT", "Software Engineering", etc.
    const majorFilter = searchParams.get("major")?.trim().slice(0, 120);
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

    // ---------- Source signals (university_sources -> sources) ----------
    // Served from the cached bundle: the same "most recently accessed" pick,
    // with the university's own lastVerifiedAt only used as a date fallback.
    const sourceMap = bundle.sourceMap;

    // ---------- Map fit, scoped admission comparisons and source signals ----------
    const results = allUnis.map((uni) => {
      let matchInfo: {
        matchScore: number | null;
        reasons?: string[];
        potentialIssues?: string[];
        reasonDetails?: ReasonDetail[];
        issueDetails?: ReasonDetail[];
        rawScore?: number;
        breakdown?: MatchBreakdown;
      } = { matchScore: null, reasons: [], potentialIssues: [] };
      const academic = matchProfile && bundle.facts?.get(uni.id)?.length ? academicFor(uni.id) : null;
      if (matchProfile) {
        // Grouped tests and exemptions are evaluated by the admission comparison.
        // A legacy scalar cannot count as a verified minimum in profile fit.
        const summary = academic?.requirementGroup ? null : academic?.summary;
        const gpa = summary?.gpa;
        const uniData = {
          ...toUniversityData(uni),
          minGpa: gpa && ["4", "4.0", "GPA 4.0"].includes(gpa.unit ?? "") ? gpa.single : null,
          minIelts: summary?.ielts?.single ?? null,
          minSat: summary?.sat?.single ?? null,
        };
        // Memoized per profile and university inputs for repeated searches.
        matchInfo = memoizeMatch("fit", profileFingerprint, uni.id, uniData as unknown as Record<string, unknown>, () =>
          calculateUniversityMatch(matchProfile!, uniData)
        );
      }
      const src = sourceMap.get(uni.id) || null;
      const progFields = programFieldsByUni.get(uni.id) ?? [];
      // Only the field-level evidence shown on the card can influence the
      // order based on published academic requirements.
      const admissionComparison = academicProfile && academic
        ? toAdmissionComparison(evaluateResolvedAcademicCriteria(academic, academicProfile, asOfDate))
        : null;
      const hasFitEvidence = matchInfo.breakdown?.components.some((part) =>
        part.compared && part.key !== "base" && part.key !== "funding_requirement"
      );
      // Discovery returns an actual catalogue programme identity.
      const {programmeDiscovery}=universityProgrammeDiscovery(uni,bundle.programsByUni?.get(uni.id)??[],profileData,chancingProfile,false);
      return {
        ...uni,
        programFields: progFields,
        admissionComparison,
        programmeDiscovery,
        estimatedChance: {
          percentage: null,
          reason: profileData ? "insufficient_validated_outcomes" : "profile_required",
        },
        matchScore: hasFitEvidence ? matchInfo.matchScore : null,
        matchReasons: translateReasons(locale, "university", matchInfo.reasonDetails, matchInfo.reasons),
        matchIssues: translateReasons(locale, "university", matchInfo.issueDetails, matchInfo.potentialIssues),
        // The exact arithmetic behind the score (two-decimal points per
        // dimension) so the UI can show HOW the number was reached instead of
        // asking the student to trust it. Null when there is no profile.
        matchRawScore: hasFitEvidence ? matchInfo.rawScore ?? null : null,
        matchBreakdown: hasFitEvidence ? matchInfo.breakdown ?? null : null,
        sourceUrl: src?.sourceUrl ?? null,
        sourceTitle: src?.sourceTitle ?? null,
        sourceLastVerifiedAt: src?.lastVerifiedAt ?? null,
      };
    });

    // ---------- Sorting (explicit, deterministic, profile-independent) -------
    // The UI always sends the selected order. An explicit choice is applied as
    // requested — a profile must NEVER turn "QS ranking" into "my match score".
    // `relevance` is the legacy default for API clients that send no `sort`;
    // it is also the only mode semantic search is allowed to nudge.
    const ordering = sortUniversities(results, parsedSort, Boolean(profileData));
    const ordered = ordering.rows;

    // Best-effort multilingual semantic rerank: only in relevance mode, never
    // over an explicitly requested ordering.
    if (search && search.trim().length >= 4 && ordered.length > 1 && semanticRerankAllowed(parsedSort)) {
      try {
        const candidates = ordered.slice(0, 63).map((uni) => [
          uni.name,
          uni.country,
          uni.city,
          uni.programMajor,
          ...(programFieldsByUni.get(uni.id) ?? []),
        ].filter(Boolean).join(". "));
        const ranked = await rankSemanticTexts(search, candidates, { timeoutMs: 3_500, limit: candidates.length });
        const semanticPosition = new Map(ranked.flatMap((item, position) => {
          const university = ordered[item.index];
          return university ? [[university.id, position] as const] : [];
        }));
        const lexicalPosition = new Map(ordered.map((item, position) => [item.id, position]));
        const count = Math.max(1, ordered.length - 1);
        ordered.sort((a, b) => {
          const posA = lexicalPosition.get(a.id) ?? count;
          const posB = lexicalPosition.get(b.id) ?? count;
          const semA = semanticPosition.get(a.id) ?? count;
          const semB = semanticPosition.get(b.id) ?? count;
          return (posA / count) * 0.7 + (semA / count) * 0.3 - ((posB / count) * 0.7 + (semB / count) * 0.3);
        });
      } catch {
        // Provider unavailable: preserve deterministic results and ordering.
      }
    }

    // Paginate after filtering and sorting.
    // Rows are localized LAST — every filter/match above ran on canonical
    // English data, so canonical dropdown values never break (spec §3 STEP 3.1).
    //
    // Localize the PAGE, not the catalogue: this used to translate every row
    // and then throw all but 24 away.
    const payload = paginatedPayload("universities", ordered, searchParams);
    // Echo the order actually applied. The UI can show it and tests can prove
    // that a profile did not silently replace an explicit choice.
    payload.sortApplied = ordering.applied;
    payload.sortFellBackToRank = ordering.fellBackToRank;
    payload.admissionDataUnavailable = ordering.admissionDataUnavailable;
    const rows = payload.universities as typeof results;
    if (!profileData && searchParams.get("view") !== "expanded") {
      payload.universities = rows.map((university) => ({
        id: university.id, name: university.name, country: university.country, city: university.city,
        degreeLevel: university.degreeLevel, worldRanking: university.worldRanking, qsRankYear: university.qsRankYear,
        verificationStatus: university.verificationStatus, officialWebsiteUrl: university.officialWebsiteUrl,
        annualTuitionUsd: university.annualTuitionUsd, catalogueTuition: tuitionFor(university),
        minIelts: academicFor(university.id).summary.ielts?.single ?? null,
      }));
      return privateNoStoreJson(payload);
    }
    // §4: every catalog row carries a field-level evidence envelope. Legacy
    // numbers are KEPT but never promoted to a verified official minimum by
    // the entity-level `verified` flag. Clients/UI/Telegram consume the same
    // shape instead of re-interpreting raw columns.
    payload.universities = rows.map(({ admissionComparison: _comparison, ...university }) => {
      const raw = university as unknown as Record<string, unknown>;
      return {
        ...localizeUniversityRow(university, locale),
        catalogueTuition: tuitionFor(university),
        cardSummary: selectUniversityCardSummary(university, bundle.cardEvidence.programmes.get(university.id) ?? [], bundle.cardEvidence.deadlines.get(university.id) ?? [], {
          degreeLevel: degreeLevel && degreeLevel !== "All" ? degreeLevel : profileData?.degreeLevel,
          targetMajor: majorFilter && majorFilter !== "All" ? majorFilter : profileData?.targetMajor,
        }),
        academicRequirements: academicDecisionEnvelope(academicFor(university.id)),
        resolvedFacts: presentedCatalogueFacts(bundle.facts?.get(university.id) ?? []),
        evidence: legacyEvidence({
          entityVerified: raw.verificationStatus === "verified",
          sourceUrl: typeof raw.officialWebsiteUrl === "string" ? raw.officialWebsiteUrl : null,
          admissionCycle: null,
          fields: {
            minGpa: raw.minGpa as number | null,
            minIelts: raw.minIelts as number | null,
            minSat: raw.minSat as number | null,
            acceptanceRate: raw.acceptanceRate as number | null,
          },
        }),
      };
    });
    return privateNoStoreJson(payload);
  } catch (error) {
    if(error instanceof Error&&error.message==="invalid_requirement_context")return privateNoStoreJson({error:"Invalid requirement context"},{status:400});
    const diagnostic=reportReadFailure("universities GET",error);
    // Never substitute sample universities: during a database outage students
    // would be shown made-up data as if it were real. Clients show the error
    // (the website's explorer / detail views, and the Telegram bot's
    // \"temporarily unavailable\" message for 503).
    const response=privateNoStoreJson(
      { error: "University data is temporarily unavailable. Please try again shortly.", code: "data_unavailable" },
      { status: 503 },
    );
    // Keep the existing body/status contract. No raw exception, SQL or IDs.
    response.headers.set("X-Request-Id",diagnostic.requestId);
    response.headers.set("X-Failure-Class",diagnostic.category);
    return response;
  }
}
