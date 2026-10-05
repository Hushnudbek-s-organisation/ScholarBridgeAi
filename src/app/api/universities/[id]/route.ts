import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  universities,
  universityPrograms,
  programRequirements,
  applicationCycles,
  universitySources,
  programSources,
  sources,
} from "@/db/schema";
import { eq, asc, inArray } from "drizzle-orm";
import { hasUndergraduateAdmission, undergraduateTestApplies } from "@/lib/degreeLevels";
import { authenticate } from "@/lib/auth";
import { calculateUniversityMatch } from "@/lib/matching";
import { toMatchProfile } from "@/lib/profileMapping";
import { selectUniversities } from "@/lib/universities";
import { studentProfiles } from "@/db/schema";

/**
 * GENERIC structured parser for `other_requirements` free-text.
 *
 * Some databases store requirement values (IELTS, TOEFL, Duolingo, PTE,
 * Cambridge English, SAT/ACT required) inside a single `other_requirements`
 * text column instead of dedicated numeric columns. This parser extracts them
 * with explicit patterns ONLY when the text explicitly encodes a value.
 *
 * It is fully generic — no university names, no hardcoded rules.
 * Values are only used as FALLBACK when the dedicated column is empty.
 */
function parseOtherRequirements(texts: string[]) {
  const joined = texts.join("\n");
  const out: {
    ielts?: number;
    toefl?: number;
    duolingo?: number;
    pte?: number;
    cambridgeEnglish?: number;
    sat?: number;
    act?: number;
    satRequired?: boolean;
    actRequired?: boolean;
  } = {};

  const num = (re: RegExp) => {
    const m = joined.match(re);
    return m ? parseFloat(m[1]) : undefined;
  };

  out.ielts = num(/IELTS\s*(?:score)?\s*[:=]?\s*(\d+(?:\.\d+)?)/i);
  out.toefl = num(/TOEFL\s*(?:iBT)?\s*[:=]?\s*(\d+)/i);
  out.duolingo = num(/Duolingo(?:\s+DET)?\s*[:=]?\s*(\d+)/i);
  out.pte = num(/PTE(?:\s+Academic)?\s*[:=]?\s*(\d+(?:\.\d+)?)/i);
  out.cambridgeEnglish = num(/Cambridge(?:\s+English)?\s*[:=]?\s*(\d+)/i);
  out.sat = num(/\bSAT\s*[:=]?\s*(\d{3,4})\b/i);
  out.act = num(/\bACT\s*[:=]?\s*(\d{1,2})\b/i);

  // "SAT or ACT required" / "SAT/ACT required" → both required, no minimum published.
  if (/\bSAT\b[^\n]{0,30}\bACT\b[^\n]{0,20}required/i.test(joined) ||
      /\bACT\b[^\n]{0,30}\bSAT\b[^\n]{0,20}required/i.test(joined)) {
    out.satRequired = true;
    out.actRequired = true;
  } else {
    if (/\bSAT\b[^\n]{0,25}required/i.test(joined)) out.satRequired = true;
    if (/\bACT\b[^\n]{0,25}required/i.test(joined)) out.actRequired = true;
  }

  return out;
}

/**
 * University detail API.
 *
 * Works with the EXISTING database layout:
 *  - programs (NOT university_programs)
 *  - program_requirements with wide columns (min_ielts, min_gpa, ...)
 *  - application_cycles WITHOUT cycle_year (year derived from academic_year)
 *  - university_sources with source links; source details joined from `sources`
 *
 * Missing data stays null — the UI shows "Not available" / "Not specified".
 * No verification flags are invented: they come from the DB columns only.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const uniId = parseInt(id, 10);

    let uni;
    try {
      const [row] = await db.select().from(universities).where(eq(universities.id, uniId));
      uni = row;
    } catch {
      // Fallback: core subset if a column is unexpectedly missing.
      const [row] = await db
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
          accommodationCostUsd: universities.accommodationCostUsd,
          annualTuition: universities.annualTuition,
          tuitionCurrency: universities.tuitionCurrency,
          tuitionPeriod: universities.tuitionPeriod,
          annualLivingEst: universities.annualLivingEst,
          livingCostCurrency: universities.livingCostCurrency,
          livingCostPeriod: universities.livingCostPeriod,
          accommodationCost: universities.accommodationCost,
          accommodationCostCurrency: universities.accommodationCostCurrency,
          accommodationCostPeriod: universities.accommodationCostPeriod,
          applicationFee: universities.applicationFee,
          applicationFeeCurrency: universities.applicationFeeCurrency,
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
        })
        .from(universities)
        .where(eq(universities.id, uniId));
      uni = row;
    }
    if (!uni) {
      return NextResponse.json({ error: "University not found" }, { status: 404 });
    }

    // ---- Profile match (same engine + same row shape as the explorer) -----
    // The student's own fit score used to exist only on the list screen, so a
    // university badge could vanish the moment the student opened it. Read
    // privately: only the owner (or an admin) gets a personalised score; the
    // public payload stays unpersonalised, exactly like GET /api/universities.
    let match: {
      score: number;
      category: "Reach" | "Match" | "Safety";
      reasons: string[];
      issues: string[];
    } | null = null;
    const profileIdParam = new URL(req.url).searchParams.get("profileId");
    if (profileIdParam) {
      const pId = Number.parseInt(profileIdParam, 10);
      const auth = await authenticate(req);
      if (auth.ok && (auth.session.profile.id === pId || auth.session.isAdmin)) {
        const [p] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, pId));
        if (p) {
          const rows = await selectUniversities();
          const row = rows.find((r) => r.id === uniId);
          if (row) {
            const result = calculateUniversityMatch(toMatchProfile(p), row);
            match = {
              score: result.matchScore,
              category: result.matchCategory,
              reasons: result.reasons,
              issues: result.potentialIssues,
            };
          }
        }
      }
    }

    // ---------- Programs (existing `programs` table) ----------
    const programs = await db
      .select()
      .from(universityPrograms)
      .where(eq(universityPrograms.universityId, uniId))
      .orderBy(asc(universityPrograms.name));

    // ---------- Program → source links (provenance, spec §19) ----------
    // Batch-loaded for every program of this university; resilient like the
    // university sources block (a missing table must not 500 the page).
    const programSourcesMap = new Map<
      number,
      {
        url: string;
        title: string;
        sourceType: string;
        domain: string | null;
        accessedAt: string | null;
        isOfficial: boolean;
        isVerified: boolean;
      }[]
    >();
    try {
      const progIds = programs.map((p) => p.id);
      if (progIds.length) {
        const linkRows = await db
          .select({
            programId: programSources.programId,
            sourceId: programSources.sourceId,
            sourceType: programSources.sourceType,
          })
          .from(programSources)
          .where(inArray(programSources.programId, progIds));
        const srcIds = [...new Set(linkRows.map((r) => r.sourceId).filter((x): x is number => x != null))];
        const srcMap = new Map<
          number,
          { url: string; title: string; domain: string | null; accessedAt: Date | null; isOfficial: boolean; isVerified: boolean }
        >();
        if (srcIds.length) {
          const srows = await db
            .select({
              id: sources.id,
              url: sources.url,
              title: sources.title,
              domain: sources.domain,
              accessedAt: sources.accessedAt,
              isOfficial: sources.isOfficial,
              isVerified: sources.isVerified,
            })
            .from(sources)
            .where(inArray(sources.id, srcIds));
          srows.forEach((r) => srcMap.set(r.id, r));
        }
        for (const link of linkRows) {
          if (link.sourceId == null) continue;
          const s = srcMap.get(link.sourceId);
          if (!s) continue;
          const arr = programSourcesMap.get(link.programId) ?? [];
          arr.push({
            url: s.url,
            title: s.title,
            sourceType: link.sourceType,
            domain: s.domain,
            accessedAt: s.accessedAt ? new Date(s.accessedAt).toISOString() : null,
            isOfficial: s.isOfficial,
            isVerified: s.isVerified,
          });
          programSourcesMap.set(link.programId, arr);
        }
      }
    } catch {
      // program_sources / sources unavailable — program sources simply not shown.
    }

    // ---------- Program requirements (wide columns → normalized) ----------
    const programsWithReqs = [];
    for (const p of programs) {
      const reqRows = await db
        .select()
        .from(programRequirements)
        .where(eq(programRequirements.programId, p.id));

      const reqs: {
        requirementType: string;
        minimumValue: number | null;
        valueText: string | null;
        // Provenance (spec §19): each requirement keeps its own source +
        // verification state straight from program_requirements. NULL stays
        // NULL — never shown as a value, and an unverified requirement is
        // never presented as verified.
        sourceUrl: string | null;
        lastVerifiedAt: string | null;
        verificationStatus: string;
      }[] = [];
      const reqProvenance = (r: (typeof reqRows)[number]) => ({
        sourceUrl: r.sourceUrl ?? null,
        lastVerifiedAt: r.lastVerifiedAt ? new Date(r.lastVerifiedAt).toISOString() : null,
        verificationStatus: r.verificationStatus,
      });
      let programMinIelts: number | null = null;
      let programMinSat: number | null = null;
      let programMinToefl: number | null = null;
      let programMinDet: number | null = null;
      let programMinGpa: number | null = null;
      let programMinAct: number | null = null;
      for (const r of reqRows) {
        const prov = reqProvenance(r);
        if (r.minIelts != null) {
          reqs.push({ requirementType: "ielts", minimumValue: r.minIelts, valueText: null, ...prov });
          if (programMinIelts == null) programMinIelts = r.minIelts;
        }
        if (r.minToefl != null) {
          reqs.push({ requirementType: "toefl", minimumValue: r.minToefl, valueText: null, ...prov });
          if (programMinToefl == null) programMinToefl = r.minToefl;
        }
        if (r.minDet != null) {
          reqs.push({ requirementType: "duolingo", minimumValue: r.minDet, valueText: null, ...prov });
          if (programMinDet == null) programMinDet = r.minDet;
        }
        if (r.minSat != null) {
          reqs.push({ requirementType: "sat", minimumValue: r.minSat, valueText: null, ...prov });
          if (programMinSat == null) programMinSat = r.minSat;
        }
        if (r.minAct != null) {
          reqs.push({ requirementType: "act", minimumValue: r.minAct, valueText: null, ...prov });
          if (programMinAct == null) programMinAct = r.minAct;
        }
        if (r.minGpa != null) {
          reqs.push({ requirementType: "gpa", minimumValue: r.minGpa, valueText: null, ...prov });
          if (programMinGpa == null) programMinGpa = r.minGpa;
        }
        if (r.ibRequirement) reqs.push({ requirementType: "ib", minimumValue: null, valueText: r.ibRequirement, ...prov });
        if (r.aLevelRequirement) reqs.push({ requirementType: "alevel", minimumValue: null, valueText: r.aLevelRequirement, ...prov });
        if (r.apRequirement) reqs.push({ requirementType: "ap", minimumValue: null, valueText: r.apRequirement, ...prov });
        if (r.subjectRequirements) reqs.push({ requirementType: "subject", minimumValue: null, valueText: r.subjectRequirements, ...prov });
        if (r.otherRequirements) reqs.push({ requirementType: "other", minimumValue: null, valueText: r.otherRequirements, ...prov });
      }

      const flags = reqRows[0] ?? null;
      programsWithReqs.push({
        id: p.id,
        name: p.name,
        field: p.field,
        degree: p.degree,
        durationYears: p.durationYears != null ? Number(p.durationYears) : null,
        durationUnit: p.durationUnit ?? "years",
        studyMode: p.studyMode,
        language: p.language,
        tuitionAmount: p.tuitionAmount != null ? Number(p.tuitionAmount) : null,
        tuitionCurrency: p.tuitionCurrency,
        tuitionPeriod: p.tuitionPeriod,
        description: p.description,
        applicationDeadline: null,
        minIelts: programMinIelts,
        minToefl: programMinToefl,
        minDuolingo: programMinDet,
        minSat: programMinSat,
        minAct: programMinAct,
        minGpa: programMinGpa,
        portfolioRequired: flags?.portfolioRequired ?? false,
        interviewRequired: flags?.interviewRequired ?? false,
        recommendationRequired: flags?.recommendationRequired ?? false,
        personalStatementRequired: flags?.personalStatementRequired ?? false,
        programUrl: p.programUrl,
        applicationUrl: p.applicationUrl,
        isVerified: p.isVerified,
        // Provenance straight from the programs row (spec §19): the UI shows
        // these as "verified" / "unverified" / "not checked yet" — never
        // invents a source, never treats unknown as verified.
        sourceUrl: p.sourceUrl ?? null,
        lastVerifiedAt: p.lastVerifiedAt ? new Date(p.lastVerifiedAt).toISOString() : null,
        verificationStatus: p.verificationStatus,
        sources: programSourcesMap.get(p.id) ?? [],
        requirements: reqs,
      });
    }

    // ---------- University-level requirements (generic aggregation) ----------
    // Collects ALL distinct values per requirement type across programs.
    // If programs disagree (e.g. IELTS 6.5 vs 7.0), we expose the full list
    // and the UI shows "6.5–7.0" instead of guessing a single number.
    const uniReqs: Record<string, { values: (number | null)[]; texts: (string | null)[] }> = {};
    const flagAgg = { portfolio: false, interview: false, recommendation: false, personalStatement: false };
    for (const p of programsWithReqs) {
      for (const r of p.requirements) {
        const key = r.requirementType;
        if (!uniReqs[key]) uniReqs[key] = { values: [], texts: [] };
        if (r.minimumValue != null && !uniReqs[key].values.includes(r.minimumValue)) {
          uniReqs[key].values.push(r.minimumValue);
        }
        if (r.valueText && !uniReqs[key].texts.includes(r.valueText)) {
          uniReqs[key].texts.push(r.valueText);
        }
      }
      flagAgg.portfolio = flagAgg.portfolio || p.portfolioRequired;
      flagAgg.interview = flagAgg.interview || p.interviewRequired;
      flagAgg.recommendation = flagAgg.recommendation || p.recommendationRequired;
      flagAgg.personalStatement = flagAgg.personalStatement || p.personalStatementRequired;
    }

    // Helper: single value, range, or null.
    const summarize = (key: string, uniFallback: number | null) => {
      const vals = [...(uniReqs[key]?.values ?? [])];
      if (uniFallback != null && !vals.includes(uniFallback)) vals.push(uniFallback);
      if (vals.length === 0) return null;
      const sorted = [...vals].filter((v): v is number => v != null).sort((a, b) => a - b);
      return {
        values: sorted,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        range: sorted.length > 1 ? `${sorted[0]}–${sorted[sorted.length - 1]}` : String(sorted[0]),
        single: sorted.length === 1 ? sorted[0] : null,
      };
    };

    // Generic fallback: extract values that may be stored only inside the
    // other_requirements text (never overrides a real column value).
    const parsedOther = parseOtherRequirements((uniReqs.other?.texts ?? []).filter((t): t is string => t != null));

    const universityRequirements = {
      ielts: summarize("ielts", uni.minIelts) ?? (parsedOther.ielts != null ? { values: [parsedOther.ielts], min: parsedOther.ielts, max: parsedOther.ielts, range: String(parsedOther.ielts), single: parsedOther.ielts } : null),
      toefl: summarize("toefl", null) ?? (parsedOther.toefl != null ? { values: [parsedOther.toefl], min: parsedOther.toefl, max: parsedOther.toefl, range: String(parsedOther.toefl), single: parsedOther.toefl } : null),
      duolingo: summarize("duolingo", null) ?? (parsedOther.duolingo != null ? { values: [parsedOther.duolingo], min: parsedOther.duolingo, max: parsedOther.duolingo, range: String(parsedOther.duolingo), single: parsedOther.duolingo } : null),
      gpa: summarize("gpa", uni.minGpa),
      sat: summarize("sat", uni.minSat) ?? (parsedOther.sat != null ? { values: [parsedOther.sat], min: parsedOther.sat, max: parsedOther.sat, range: String(parsedOther.sat), single: parsedOther.sat } : null),
      act: summarize("act", null) ?? (parsedOther.act != null ? { values: [parsedOther.act], min: parsedOther.act, max: parsedOther.act, range: String(parsedOther.act), single: parsedOther.act } : null),
      pte: summarize("pte", null) ?? (parsedOther.pte != null ? { values: [parsedOther.pte], min: parsedOther.pte, max: parsedOther.pte, range: String(parsedOther.pte), single: parsedOther.pte } : null),
      cambridgeEnglish: summarize("cambridgeenglish", null) ?? (parsedOther.cambridgeEnglish != null ? { values: [parsedOther.cambridgeEnglish], min: parsedOther.cambridgeEnglish, max: parsedOther.cambridgeEnglish, range: String(parsedOther.cambridgeEnglish), single: parsedOther.cambridgeEnglish } : null),
      // Requirement row exists (even without a published minimum):
      // SAT/ACT are undergraduate tests: a graduate-only institution's
      // published undergraduate minimum is not a requirement for the
      // programmes it actually offers, so it is reported as
      // "not applicable" instead of "required". The stored value is never
      // rewritten — only its applicability is stated.
      undergraduateTestsApply: undergraduateTestApplies(uni.degreeLevel),
      hasUndergraduateAdmission: hasUndergraduateAdmission(uni.degreeLevel),
      satRequired:
        undergraduateTestApplies(uni.degreeLevel) &&
        ((uniReqs.sat?.values.length ?? 0) > 0 || uni.minSat != null || parsedOther.satRequired === true || parsedOther.sat != null),
      actRequired:
        undergraduateTestApplies(uni.degreeLevel) &&
        ((uniReqs.act?.values.length ?? 0) > 0 || parsedOther.actRequired === true || parsedOther.act != null),
      satMinimumPublished:
        undergraduateTestApplies(uni.degreeLevel) &&
        ((uniReqs.sat?.values.length ?? 0) > 0 || uni.minSat != null || parsedOther.sat != null),
      actMinimumPublished:
        undergraduateTestApplies(uni.degreeLevel) &&
        ((uniReqs.act?.values.length ?? 0) > 0 || parsedOther.act != null),
      portfolioRequired: flagAgg.portfolio,
      interviewRequired: flagAgg.interview,
      recommendationRequired: flagAgg.recommendation,
      personalStatementRequired: flagAgg.personalStatement,
      other: uniReqs.other?.texts ?? [],
      subject: uniReqs.subject?.texts ?? [],
    };

    // ---------- Application cycles (no cycle_year in DB — derive from academic_year) ----------
    const cycleRows = await db
      .select()
      .from(applicationCycles)
      .where(eq(applicationCycles.universityId, uniId))
      .orderBy(asc(applicationCycles.id));

    const cycles = cycleRows.map((c) => {
      let year: number | null = null;
      const m = /^(\d{4})/.exec(c.academicYear || "");
      if (m) year = parseInt(m[1], 10);
      return {
        id: c.id,
        cycleYear: year,
        academicYear: c.academicYear,
        intake: c.intake,
        applicationType: c.applicationType,
        openingDate: c.openingDate,
        deadline: c.deadline,
        deadlineTimezone: c.deadlineTimezone,
        applicationFee: c.applicationFee != null ? Number(c.applicationFee) : null,
        applicationFeeCurrency: c.applicationFeeCurrency,
        applicationUrl: c.applicationUrl,
        isVerified: c.verificationStatus === "verified",
        // A deadline only counts as "confirmed" when the DB row is verified.
        // Anything else is surfaced as "estimated / not confirmed" so a
        // student never mistakes an unverified date for an official one.
        isEstimated: c.verificationStatus !== "verified",
        sourceUrl: c.sourceUrl ?? null,
        lastVerifiedAt: c.lastVerifiedAt ? new Date(c.lastVerifiedAt).toISOString() : null,
      };
    });

    // ---------- Sources (resilient: unknown table shape must not crash the page) ----------
    let uniSources: {
      id: number;
      universityId: number;
      sourceId: number | null;
      sourceType: string;
      source: {
        url: string;
        title: string;
        domain: string | null;
        accessedAt: string | null;
        isOfficial: boolean;
        isVerified: boolean;
      } | null;
    }[] = [];
    try {
      const linkRows = await db
        .select({
          id: universitySources.id,
          universityId: universitySources.universityId,
          sourceId: universitySources.sourceId,
          sourceType: universitySources.sourceType,
        })
        .from(universitySources)
        .where(eq(universitySources.universityId, uniId));

      const srcIds = [...new Set(linkRows.map((r) => r.sourceId).filter((x): x is number => x != null))];
      const srcMap = new Map<
        number,
        {
          url: string;
          title: string;
          domain: string | null;
          accessedAt: string | null;
          isOfficial: boolean;
          isVerified: boolean;
        }
      >();
      if (srcIds.length) {
        try {
          const rows = await db
            .select({
              id: sources.id,
              url: sources.url,
              title: sources.title,
              domain: sources.domain,
              accessedAt: sources.accessedAt,
              isOfficial: sources.isOfficial,
              isVerified: sources.isVerified,
            })
            .from(sources)
            .where(inArray(sources.id, srcIds));
          rows.forEach((r) =>
            srcMap.set(r.id, {
              url: r.url,
              title: r.title,
              domain: r.domain,
              accessedAt: r.accessedAt ? new Date(r.accessedAt).toISOString() : null,
              isOfficial: r.isOfficial,
              isVerified: r.isVerified,
            })
          );
        } catch {
          // sources table shape differs — sources are simply not shown.
        }
      }

      uniSources = linkRows.map((r) => ({
        id: r.id,
        universityId: r.universityId,
        sourceId: r.sourceId,
        sourceType: r.sourceType,
        source: r.sourceId != null ? srcMap.get(r.sourceId) ?? null : null,
      }));
    } catch {
      // university_sources table shape differs — sources are simply not shown.
    }

    // ---------- Scholarships linked to this university ----------
    // NOTE: the existing `scholarships` table has no university_id column, so
    // there is no verified link to attach here. Return empty — the UI shows
    // "No verified scholarships linked" instead of guessing.
    const uniScholarships: unknown[] = [];

    // ---------- Generic money fields (currency-aware, USD fallback) ----------
    const money = {
      annualTuition:
        uni.annualTuition != null
          ? Number(uni.annualTuition)
          : uni.annualTuitionUsd ?? null,
      tuitionCurrency: uni.tuitionCurrency ?? "USD",
      tuitionPeriod: uni.tuitionPeriod ?? "year",
      annualLivingEstimate:
        uni.annualLivingEst != null
          ? Number(uni.annualLivingEst)
          : uni.annualLivingEstUsd ?? null,
      livingCostCurrency: uni.livingCostCurrency ?? "USD",
      livingCostPeriod: uni.livingCostPeriod ?? "year",
      accommodationCost:
        uni.accommodationCost != null
          ? Number(uni.accommodationCost)
          : uni.accommodationCostUsd ?? null,
      accommodationCostCurrency: uni.accommodationCostCurrency ?? "USD",
      accommodationCostPeriod: uni.accommodationCostPeriod ?? "year",
      applicationFee: uni.applicationFee != null ? Number(uni.applicationFee) : null,
      applicationFeeCurrency: uni.applicationFeeCurrency ?? "USD",
    };

    return NextResponse.json({
      university: uni,
      money,
      universityRequirements,
      programs: programsWithReqs,
      applicationCycles: cycles,
      sources: uniSources,
      scholarships: uniScholarships,
      match,
      campuses: [],
      images: [],
    });
  } catch (error) {
    console.error("GET /api/universities/[id] error:", error);
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
