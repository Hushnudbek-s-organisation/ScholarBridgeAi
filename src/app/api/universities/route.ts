import { privateNoStoreJson } from "@/lib/apiResponse";
import { authenticate } from "@/lib/auth";
import { calculateUniversityMatch, type MatchBreakdown, type ReasonDetail } from "@/lib/matching";
import { localeFromRequest, translateReasons } from "@/lib/engineText";
import { seedDatabase } from "@/db/seed";
import { getCachedUniversitiesBundle, getCachedProfileForMatching } from "@/lib/catalogCache";
import { paginatedPayload } from "@/lib/pagination";
import { supportsDegreeLevel } from "@/lib/degreeLevels";
import { countriesMatch } from "@/lib/countries";
import { expandMultilingualSearchTerms, localizeUniversityRow } from "@/lib/catalogLocalizer";
import { memoizeMatch } from "@/lib/matchMemo";
import { profileMatchFingerprint } from "@/lib/profileMatchFingerprint";
import { toUniversityData } from "@/lib/profileMapping";
import { subjectAffinity } from "@/lib/subjectAffinity";
import { matchesUniversityType } from "@/lib/universityType";
import { evaluateUniversityAndProgramChance } from "@/lib/programChancing";
import { matchQsUniversityBenchmark } from "@/lib/qsTop200Benchmarks";
import { rankSemanticTexts } from "@/lib/ai/semanticSearch";

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
    const degreeLevel = searchParams.get("degreeLevel")?.trim().slice(0, 50);
    const maxTuition = searchParams.get("maxTuition")?.slice(0, 24);
    const sort = searchParams.get("sort")?.slice(0, 24);
    const uniType = searchParams.get("type")?.trim().slice(0, 24); // Public | Private
    const ieltsFilter = searchParams.get("ielts")?.slice(0, 12); // e.g. "6.5" → only unis with minIelts <= 6.5
    const rank = (name: string) => {
      const raw = searchParams.get(name);
      if (!raw || raw.length > 12) return null;
      const value = Number(raw);
      return Number.isSafeInteger(value) && value > 0 && value <= 1_000_000 ? value : null;
    };
    const minRank = rank("minRank");
    const maxRank = rank("maxRank");

    // One cached read of the base catalogue (all universities + program fields
    // + source links) instead of 3 full joins per filter change; the returned
    // array/map are copies, so filtering and sorting below are unaffected.
    const bundle = await getCachedUniversitiesBundle();
    // Values on an unverified university row are not suitable for filters,
    // ordering, or chancing inputs. Preserve the database row; sanitize only
    // this response-local copy. Institution type is handled separately and
    // remains unknown unless its own evidence says otherwise.
    let allUnis = bundle.unis.map((uni) => {
      if (uni.verificationStatus === "verified") return { ...uni };
      return {
        ...uni,
        worldRanking: null,
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
    /** Same student read through the 5-layer positioning engine (chance). */
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
    // edits a score-relevant field, which is exactly when every memoized fit and
    // chance score must be recomputed.
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
      allUnis = allUnis.filter(u =>
        searchTerms.some(term =>
          u.name.toLowerCase().includes(term) ||
          (u.programMajor ?? "").toLowerCase().includes(term) ||
          (u.city ?? "").toLowerCase().includes(term) ||
          u.country.toLowerCase().includes(term) ||
          countriesMatch(u.country, term) ||
          (programFieldsByUni.get(u.id)?.some((f) => f.toLowerCase().includes(term)) ?? false)
        )
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

    // Tuition filter: only universities with VERIFIED tuition (NULL excluded, spec §16).
    if (maxTuition != null && maxTuition !== "") {
      const maxT = Number(maxTuition);
      if (Number.isFinite(maxT) && maxT >= 0 && maxT <= 100_000_000) {
        allUnis = allUnis.filter(u => u.annualTuitionUsd != null && u.annualTuitionUsd <= maxT);
      }
    }

    if (ieltsFilter != null && ieltsFilter !== "") {
      const minI = Number(ieltsFilter);
      if (Number.isFinite(minI) && minI >= 0 && minI <= 9) {
        allUnis = allUnis.filter(u => u.minIelts != null && u.minIelts <= minI);
      }
    }

    if (minRank) allUnis = allUnis.filter(u => u.worldRanking != null && u.worldRanking >= minRank);
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

    // ---------- Source signals (university_sources -> sources) ----------
    // Served from the cached bundle: the same "most recently accessed" pick,
    // with the university's own lastVerifiedAt only used as a date fallback.
    const sourceMap = bundle.sourceMap;

    // ---------- Map match scores + source signals ----------
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
      if (matchProfile) {
        // Memoized per (profile fingerprint, university): the explorer scores the
        // whole filtered catalogue on every keystroke, and neither side changed.
        const uniData = toUniversityData(uni);
        matchInfo = memoizeMatch("fit", profileFingerprint, uni.id, uniData as unknown as Record<string, unknown>, () =>
          calculateUniversityMatch(matchProfile!, uniData)
        );
      }
      const src = sourceMap.get(uni.id) || null;
      const progFields = programFieldsByUni.get(uni.id) ?? [];
      // Module 4 — dual scoring. `matchScore` answers "does this fit my
      // profile?" (shared match engine, unchanged); `chanceScore` answers
      // "how well does my profile sit inside this department's admitted
      // cohort?" (QS Top 200 + 5-layer program engine). Same synthetic
      // programme row the dashboard uses, so the two screens can never
      // disagree — and both stay NULL for signed-out visitors.
      let chance: ReturnType<typeof evaluateUniversityAndProgramChance> | null = null;
      if (chancingProfile) {
        const syntheticProgram = {
          id: uni.id,
          universityId: uni.id,
          name: profileData?.targetMajor || uni.programMajor || "General Studies",
          degreeLevel: profileData?.degreeLevel || uni.degreeLevel || "Bachelor",
          field: profileData?.targetMajor || uni.programMajor || null,
        };
        // The chance result depends on the same (profile, university) pair as the
        // fit score, so it lives in the same memo — keyed by the university row,
        // with the synthesized programme (derived from that same profile) folded
        // into the key by way of the profile fingerprint.
        const chanceProfile = chancingProfile;
        chance = memoizeMatch(
          "chance",
          profileFingerprint,
          uni.id,
          uni as unknown as Record<string, unknown>,
          () =>
            evaluateUniversityAndProgramChance(
              chanceProfile,
              uni,
              syntheticProgram,
              { minGpa: uni.minGpa, minIelts: uni.minIelts, minSat: uni.minSat },
              [],
              matchQsUniversityBenchmark(uni)
            )
        );
      }
      return {
        ...uni,
        programFields: progFields,
        matchScore: matchInfo.matchScore,
        chanceScore: chance ? chance.compositeProgramFitScore : null,
        effectiveAcceptRatePct: chance ? chance.effectiveProgramAcceptRatePct : null,
        selectivityCategory: chance ? chance.selectivityCategory : null,
        studentGpaPercentile: chance ? chance.studentGpaPercentile : null,
        matchReasons: translateReasons(locale, "university", matchInfo.reasonDetails, matchInfo.reasons),
        matchIssues: translateReasons(locale, "university", matchInfo.issueDetails, matchInfo.potentialIssues),
        // The exact arithmetic behind the score (two-decimal points per
        // dimension) so the UI can show HOW the number was reached instead of
        // asking the student to trust it. Null when there is no profile.
        matchRawScore: matchInfo.rawScore ?? null,
        matchBreakdown: matchInfo.breakdown ?? null,
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
    } else if (sort === "chance_desc" && profileData) {
      // Admission chance first (QS/programme positioning engine), fit score
      // as tie-break. Signed-out callers have no chance scores at all, so
      // they fall through to the default ranking instead of an empty sort.
      results.sort(
        (a, b) =>
          (b.chanceScore ?? -1) - (a.chanceScore ?? -1) ||
          (b.matchScore ?? -1) - (a.matchScore ?? -1)
      );
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

    // Best-effort multilingual semantic rerank: deterministic filters and
    // profile relevance remain in force; vector similarity only nudges order.
    if (search && search.trim().length >= 4 && results.length > 1 && !sort) {
      try {
        const candidates = results.slice(0, 63).map((uni) => [
          uni.name,
          uni.country,
          uni.city,
          uni.programMajor,
          ...(programFieldsByUni.get(uni.id) ?? []),
        ].filter(Boolean).join(". "));
        const ranked = await rankSemanticTexts(search, candidates, { timeoutMs: 3_500, limit: candidates.length });
        const semanticPosition = new Map(ranked.flatMap((item, position) => {
          const university = results[item.index];
          return university ? [[university.id, position] as const] : [];
        }));
        const lexicalPosition = new Map(results.map((item, position) => [item.id, position]));
        const count = Math.max(1, results.length - 1);
        results.sort((a, b) => {
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

    // Opt-in `?page=` / `?perPage=` pagination (after filtering + sorting).
    // Without those params the full list is returned (admin tools, ...).
    // Rows are localized LAST — every filter/match above ran on canonical
    // English data, so canonical dropdown values never break (spec §3 STEP 3.1).
    //
    // Localize the PAGE, not the catalogue: this used to translate every row
    // and then throw all but 24 away.
    const payload = paginatedPayload("universities", results, searchParams);
    const rows = payload.universities as typeof results;
    payload.universities = rows.map((u) => localizeUniversityRow(u, locale));
    return privateNoStoreJson(payload);
  } catch (error) {
    console.error("GET /api/universities error:", error);
    // Never substitute sample universities: during a database outage students
    // would be shown made-up data as if it were real. Clients show the error
    // (the website's explorer / detail views, and the Telegram bot's
    // \"temporarily unavailable\" message for 503).
    return privateNoStoreJson(
      { error: "University data is temporarily unavailable. Please try again shortly.", code: "data_unavailable" },
      { status: 503 },
    );
  }
}
