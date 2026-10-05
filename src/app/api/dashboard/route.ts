import { NextResponse } from "next/server";
import { and, desc, eq, gte, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  admissionOffers,
  aiEvaluations,
  applications,
  checklistItems,
  essayVersions,
  fundingItems,
  journeyDeadlines,
  learningProviderLinks,
  learningProviders,
  opportunities,
  recommendationRequests,
  savedUniversities,
  scholarships,
  studentChecklist,
  studentProfiles,
  testPlans,
  universities,
  userDocuments,
} from "@/db/schema";
import { guardStudent, serverError } from "@/lib/journey/api";
import { EMPTY_JOURNEY_COUNTS, resolveJourney, type JourneyCounts } from "@/lib/journey/stages";
import { profileReadiness, testGap, type ReadinessInput } from "@/lib/journey/readiness";
import { profileStrength } from "@/lib/chancing";
import { chancingProfileWithActivities } from "@/lib/profileMapping";
import { buildPhaseProgress } from "@/lib/journey/planning";
import { buildFundingPlan } from "@/lib/journey/funding";
import { profileCompleteness } from "@/lib/growth/logic";
import { calculateCosts } from "@/lib/costs";
import { profilePlan } from "@/lib/entitlements";
import { computeNextActions } from "@/lib/journey/nextSteps";

export const dynamic = "force-dynamic";

/**
 * GET /api/dashboard?profileId= — the control center (spec §3).
 *
 * One request returns everything the dashboard renders:
 *   • the journey bar (stage + progress)                 — §3
 *   • the 3–5 highest-priority next steps with a Continue button — §3
 *   • the nearest deadlines                              — §3
 *   • application progress (preparing / submitted / decision) — §3
 *   • profile readiness by category + the weakest areas   — §3, §13
 *   • recommended universities / scholarships / opportunities — §3
 *   • the ten study-plan phases                          — §12
 *   • the funding summary                                — §9
 *
 * Everything is derived from the student's OWN rows. Nothing here is a stored
 * "progress" column, so the dashboard can never disagree with reality.
 */
export async function GET(req: Request) {
  const g = await guardStudent(req, new URL(req.url).searchParams.get("profileId"));
  if (!g.ok) return g.response;
  const { profileId } = g.value;

  try {
    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);

    // ---- A single query for the counters the rest of the page needs --------
    const [row] = await db
      .select({
        profileComplete: sql<boolean>`(COALESCE(${studentProfiles.name},'') <> '' AND ${studentProfiles.targetMajor} IS NOT NULL AND ${studentProfiles.gpa} > 0)`,
        savedUniversities: sql<number>`(SELECT COUNT(*)::int FROM saved_universities su WHERE su.profile_id = ${profileId})`,
        shortlistMatches: sql<number>`(SELECT COUNT(*)::int FROM saved_universities su WHERE su.profile_id = ${profileId} AND su.match_category = 'Match')`,
        applications: sql<number>`(SELECT COUNT(*)::int FROM applications a WHERE a.profile_id = ${profileId})`,
        submittedApplications: sql<number>`(SELECT COUNT(*)::int FROM applications a WHERE a.profile_id = ${profileId} AND a.submitted_at IS NOT NULL)`,
        offersRecorded: sql<number>`(SELECT COUNT(*)::int FROM admission_offers ao WHERE ao.profile_id = ${profileId})`,
        acceptedOffers: sql<number>`(SELECT COUNT(*)::int FROM admission_offers ao WHERE ao.profile_id = ${profileId} AND ao.status = 'accepted')`,
        fundingItems: sql<number>`(SELECT COUNT(*)::int FROM funding_items f WHERE f.profile_id = ${profileId})`,
        activitiesCount: sql<number>`(SELECT COUNT(*)::int FROM student_activities sa WHERE sa.profile_id = ${profileId})`,
        documentsTotal: sql<number>`(SELECT COUNT(*)::int FROM user_documents ud WHERE ud.profile_id = ${profileId} AND ud.status <> 'rejected')`,
        documentsReady: sql<number>`(SELECT COUNT(*)::int FROM user_documents ud WHERE ud.profile_id = ${profileId} AND ud.status IN ('uploaded','verified') AND (ud.expires_at IS NULL OR ud.expires_at >= ${todayIso}))`,
        testPlanCount: sql<number>`(SELECT COUNT(*)::int FROM test_plans tp WHERE tp.profile_id = ${profileId})`,
        essayCount: sql<number>`(SELECT COUNT(*)::int FROM essay_versions ev WHERE ev.profile_id = ${profileId})`,
        openRequirements: sql<number>`(SELECT COUNT(*)::int FROM application_requirements r WHERE r.profile_id = ${profileId} AND r.is_required AND r.status NOT IN ('done','not_required'))`,
        savedScholarships: sql<number>`(SELECT COUNT(*)::int FROM saved_scholarships ss WHERE ss.profile_id = ${profileId})`,
        interviewSessions: sql<number>`(SELECT COUNT(*)::int FROM ai_evaluations ae WHERE ae.profile_id = ${profileId} AND ae.evaluation_type = 'Visa Practice')`,
        departureDone: sql<number>`(SELECT COUNT(*)::int FROM student_checklist sc JOIN checklist_items ci ON ci.id = sc.item_id WHERE sc.profile_id = ${profileId} AND ci.is_active)`,
        departureTotal: sql<number>`(SELECT COUNT(*)::int FROM checklist_items ci WHERE ci.is_active)`,
        profileTotal: sql<number>`(SELECT COUNT(*)::int FROM saved_scholarships ss WHERE ss.profile_id = ${profileId})`,
      })
      .from(studentProfiles)
      .where(eq(studentProfiles.id, profileId))
      .limit(1);

    const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, profileId)).limit(1);
    const profileCompletionPct = profileCompleteness(profile ?? null);
    const profileIsComplete = profileCompletionPct >= 100;

    // ---- Applications for the progress summary + the next deadline ---------
    const appRows = await db
      .select({
        id: applications.id,
        universityId: applications.universityId,
        universityName: applications.universityName,
        programName: applications.programName,
        deadline: applications.deadline,
        status: applications.status,
        submittedAt: applications.submittedAt,
      })
      .from(applications)
      .where(eq(applications.profileId, profileId))
      .orderBy(desc(applications.updatedAt))
      .limit(50);

    const appIds = appRows.map((a) => a.id);
    const offerRows = appIds.length
      ? await db
          .select({ applicationId: admissionOffers.applicationId, status: admissionOffers.status })
          .from(admissionOffers)
          .where(and(eq(admissionOffers.profileId, profileId), inArray(admissionOffers.applicationId, appIds)))
      : [];

    const appProgress = {
      total: appRows.length,
      preparing: appRows.filter((a) => !a.submittedAt).length,
      submitted: appRows.filter((a) => !!a.submittedAt).length,
      decision: appRows.filter((a) => offerRows.some((o) => o.applicationId === a.id && o.status !== "pending")).length,
    };

    // ---- Study plan phases (spec §12) ------------------------------------
    const departureReady =
      Number(row?.departureTotal ?? 0) > 0 && Number(row?.departureDone ?? 0) >= Number(row?.departureTotal ?? 0);

    const phases = buildPhaseProgress({
      profileComplete: profileIsComplete,
      profileCompletenessPct: profileCompletionPct,
      openApplicationRequirements: Number(row?.openRequirements ?? 0),
      ieltsScore: profile?.ieltsScore ?? null,
      testPlanCount: Number(row?.testPlanCount ?? 0),
      savedUniversities: Number(row?.savedUniversities ?? 0),
      savedScholarships: Number(row?.savedScholarships ?? 0),
      documentsReady: Number(row?.documentsReady ?? 0),
      documentsTotal: Number(row?.documentsTotal ?? 0),
      applications: appRows.length,
      submittedApplications: appProgress.submitted,
      interviewSessions: Number(row?.interviewSessions ?? 0),
      offersRecorded: Number(row?.offersRecorded ?? 0),
      visaCaseStarted: Number(row?.interviewSessions ?? 0) > 0 || departureReady,
      visaApproved: departureReady,
      departureReady,
    });

    // ---- Journey stage (spec §1, §3) --------------------------------------
    const acceptedOffer = offerRows.find((o) => o.status === "accepted") ?? null;
    const acceptedApp = acceptedOffer ? appRows.find((a) => a.id === acceptedOffer.applicationId) : null;

    const fundingRows = await db
      .select()
      .from(fundingItems)
      .where(eq(fundingItems.profileId, profileId))
      .orderBy(desc(fundingItems.updatedAt))
      .limit(50);

    let fundingGapClosed = false;
    let annualCost = 0;
    let fundingEstimated = false;
    let fundingSummary: ReturnType<typeof buildFundingPlan> | null = null;
    if (acceptedApp?.universityId) {
      const [uni] = await db.select().from(universities).where(eq(universities.id, acceptedApp.universityId)).limit(1);
      if (uni) {
        const costs = calculateCosts({
          annualTuitionUsd: num(uni.annualTuition ?? uni.annualTuitionUsd),
          annualLivingEstUsd: num(uni.annualLivingEst ?? uni.annualLivingEstUsd),
          accommodationCostUsd: num(uni.accommodationCost ?? uni.accommodationCostUsd),
          applicationFeeUsd: num(uni.applicationFee),
          country: uni.country,
          city: uni.city,
          years: 1,
          flightsPerYearUsd: 1400,
          insurancePerYearUsd: 1200,
          booksPerYearUsd: 900,
          visaFeeUsd: 500,
          scholarships: fundingRows
            .filter((f) => f.kind === "scholarship" || f.kind === "aid")
            .map((f) => ({
              name: f.name,
              amountUsd: f.amountUsd,
              covers: "both" as const,
              probability: f.status === "confirmed" || f.status === "awarded" ? 1 : 0.3,
            })),
        });
        annualCost = costs.annualTotalUsd;
        fundingEstimated = costs.lines.some((line) => line.estimated);
        fundingSummary = buildFundingPlan({ annualCost, items: normalizeFunding(fundingRows) });
        fundingGapClosed = fundingSummary.fundingGap === 0;
      }
    }

    const journeyCounts: JourneyCounts = {
      ...EMPTY_JOURNEY_COUNTS,
      profileComplete: profileIsComplete,
      savedUniversities: Number(row?.savedUniversities ?? 0),
      shortlistMatches: Number(row?.shortlistMatches ?? 0),
      applications: appRows.length,
      submittedApplications: appProgress.submitted,
      offersRecorded: Number(row?.offersRecorded ?? 0),
      acceptedOffers: Number(row?.acceptedOffers ?? 0),
      fundingPlanTotal: fundingRows.length,
      fundingGapClosed,
      visaCaseStarted: phases.find((p) => p.key === "visa")!.pct > 0,
      visaApproved: phases.find((p) => p.key === "visa")!.status === "done",
      departureReady,
    };
    const journey = resolveJourney(journeyCounts);

    // ---- Deadlines (spec §3, §21) -----------------------------------------
    const deadlineRows = await db
      .select()
      .from(journeyDeadlines)
      .where(and(eq(journeyDeadlines.profileId, profileId), eq(journeyDeadlines.isCompleted, false)))
      .orderBy(journeyDeadlines.dueDate)
      .limit(12);

    const applicationDeadlines = appRows
      .filter((a) => a.deadline && !a.submittedAt)
      .map((a) => ({
        id: `app-${a.id}`,
        kind: "university" as const,
        title: `${a.universityName || "Application"} — application deadline`,
        dueDate: String(a.deadline).slice(0, 10),
        daysRemaining: daysUntil(today, String(a.deadline).slice(0, 10)),
        tab: "workspace",
      }));

    const deadlines = [
      ...applicationDeadlines,
      ...deadlineRows.map((d) => ({
        id: `jd-${d.id}`,
        kind: d.kind,
        title: d.title,
        dueDate: String(d.dueDate).slice(0, 10),
        daysRemaining: daysUntil(today, String(d.dueDate).slice(0, 10)),
        tab: tabForKind(d.kind),
      })),
    ]
      .sort((a, b) => (a.daysRemaining ?? 9999) - (b.daysRemaining ?? 9999))
      .slice(0, 8);

    // ---- Profile readiness (spec §3, §13) --------------------------------
    const readinessInput: ReadinessInput = {
      gpa: profile?.gpa ?? null,
      gpaScale: profile?.gpaScale ?? null,
      degreeLevel: profile?.degreeLevel ?? null,
      ieltsScore: profile?.ieltsScore ?? null,
      toeflScore: profile?.toeflScore ?? null,
      duolingoScore: profile?.duolingoScore ?? null,
      satScore: profile?.satScore ?? null,
      actScore: profile?.actScore ?? null,
      researchPublications: profile?.researchPublications ?? null,
      workExperienceYears: profile?.workExperienceYears ?? null,
      activitiesCount: Number(row?.activitiesCount ?? 0),
      documentsReady: Number(row?.documentsReady ?? 0),
      documentsTotal: Number(row?.documentsTotal ?? 0),
      applicationsStarted: appRows.length,
      applicationsSubmitted: appProgress.submitted,
      fundingItems: fundingRows.length,
      familyBudget: profile?.familyIncomeUsd ?? null,
    };
    const checklist = profileReadiness(readinessInput);

    // The PROFILE readiness score — the same engine, and therefore the same
    // number, as Profile & Goals → Readiness and the dashboard ring. The
    // `checklist` above answers a different question (what is filled in and
    // linked across documents/applications/funding), so the two are exposed
    // separately and the UI labels them as different things. Previously both
    // were called "readiness" and showed different numbers for one student.
    const [latestEssay] = profile
      ? await db
          .select({ rubricTotal: essayVersions.rubricTotal })
          .from(essayVersions)
          .where(eq(essayVersions.profileId, profile.id))
          .orderBy(desc(essayVersions.versionNumber), desc(essayVersions.id))
          .limit(1)
      : [];
    const strength = profile
      ? profileStrength(await chancingProfileWithActivities(profile), {
          essayScore: latestEssay?.rubricTotal ?? null,
        })
      : null;
    const readiness = {
      ...checklist,
      /** Shared profile readiness (the Readiness pane's number). */
      profile: strength ? { overall: strength.overall, completeness: strength.completeness } : null,
    };

    // ---- Test gaps against the student's own target universities -----------
    const gaps = await testGapsFor(profileId, profile);

    // ---- Recommendations in flight (spec §19) -----------------------------
    const recRows = appIds.length
      ? await db
          .select({ status: recommendationRequests.status, applicationId: recommendationRequests.applicationId })
          .from(recommendationRequests)
          .where(and(eq(recommendationRequests.profileId, profileId), inArray(recommendationRequests.applicationId, appIds)))
      : [];

    // ---- Open documents that are expiring (spec §7) ------------------------
    const expiring = await db
      .select({ id: userDocuments.id, title: userDocuments.title, docType: userDocuments.docType, expiresAt: userDocuments.expiresAt })
      .from(userDocuments)
      .where(
        and(
          eq(userDocuments.profileId, profileId),
          isNotNull(userDocuments.expiresAt),
          lte(userDocuments.expiresAt, addDaysIso(todayIso, 120))
        )
      )
      .orderBy(userDocuments.expiresAt)
      .limit(5);

    // ---- Next steps (spec §3) ---------------------------------------------
    const nextSteps = computeNextActions({
      journey,
      readiness,
      appRows: appRows.map((a) => ({
        id: a.id,
        universityName: a.universityName,
        status: a.status,
        deadline: a.deadline ? String(a.deadline).slice(0, 10) : null,
        submitted: !!a.submittedAt,
      })),
      openRequirements: Number(row?.openRequirements ?? 0),
      deadlines,
      gaps,
      recommendations: {
        submitted: recRows.filter((r) => r.status === "submitted").length,
        outstanding: recRows.filter((r) => r.status !== "submitted").length,
      },
      documents: {
        ready: Number(row?.documentsReady ?? 0),
        total: Number(row?.documentsTotal ?? 0),
        expiring: expiring.length,
      },
      tests: {
        ielts: profile?.ieltsScore ?? null,
        target: (await highestTestTarget(profileId, "ielts")) ?? null,
        belowTarget: gaps.some((x) => x.state === "below"),
      },
      funding: fundingSummary ? { gap: fundingSummary.fundingGap, covered: fundingSummary.isCovered } : null,
      profileComplete: profileIsComplete,
      savedUniversities: Number(row?.savedUniversities ?? 0),
      visaStage: journeyCounts.visaCaseStarted,
    });

    // ---- Recommendations for you (spec §3) --------------------------------
    const recommended = await recommendedFor(
      profileId,
      profile?.preferredCountries ?? "[]",
      profile?.targetMajor ?? "",
      profile?.gpa ?? null,
      todayIso,
      profile?.degreeLevel ?? null,
      profile?.country ?? null
    );

    // ---- External learning providers (spec §32) ---------------------------
    const providerRows = await db.select().from(learningProviders).where(eq(learningProviders.isEnabled, true));
    const linkRows = await db
      .select({ providerKey: learningProviders.providerKey, externalUserRef: learningProviderLinks.externalUserRef })
      .from(learningProviderLinks)
      .innerJoin(learningProviders, eq(learningProviders.id, learningProviderLinks.providerId))
      .where(eq(learningProviderLinks.profileId, profileId));

    return NextResponse.json({
      profile: {
        id: profileId,
        name: profile?.name ?? "",
        plan: profilePlan({ isAdmin: !!profile?.isAdmin, isPremium: !!profile?.isPremium, premiumUntil: profile?.premiumUntil ?? null }),
        // Same completeness number the Readiness pane shows (shared engine).
        // The old growth-logic percentage was a second, slightly different
        // count and could appear next to the shared one on one screen.
        completeness: strength?.completeness ?? Math.round(profileCompleteness(profile ?? null)),
      },
      journey,
      nextSteps,
      deadlines,
      applications: appProgress,
      readiness,
      phases,
      testGaps: gaps,
      funding: fundingSummary && annualCost > 0
        ? { ...fundingSummary, items: fundingRows.length, calculated: true, estimated: fundingEstimated }
        : { annualCost: 0, isCovered: false, fundingGap: 0, securedGap: 0, items: fundingRows.length, calculated: false, estimated: false },
      expiringDocuments: expiring.map((e) => ({
        ...e,
        expiresAt: e.expiresAt ? String(e.expiresAt).slice(0, 10) : null,
        daysRemaining: e.expiresAt ? daysUntil(today, String(e.expiresAt).slice(0, 10)) : null,
      })),
      recommended,
      learning: {
        connected: providerRows.length > 0,
        // No partner is named or hardcoded — only what an admin has enabled.
        providers: providerRows.map((p) => ({
          providerKey: p.providerKey,
          name: p.name,
          kind: p.kind,
          linked: linkRows.some((l) => l.providerKey === p.providerKey),
        })),
      },
    });
  } catch (err) {
    return serverError("dashboard GET", err);
  }
}

// ---------------------------------------------------------------------------

/** Funding rows come out of the DB as plain strings — narrow them to the plan's vocabulary. */
function normalizeFunding(rows: { kind: string; name: string; amountUsd: number; status: string; covers: string }[]) {
  const kinds = new Set(["scholarship", "aid", "family", "savings", "loan", "other"]);
  const statuses = new Set(["planned", "applied", "awarded", "confirmed", "declined"]);
  return rows.map((r) => ({
    kind: (kinds.has(r.kind) ? r.kind : "other") as "scholarship" | "aid" | "family" | "savings" | "loan" | "other",
    name: r.name,
    amountUsd: r.amountUsd,
    status: (statuses.has(r.status) ? r.status : "planned") as "planned" | "applied" | "awarded" | "confirmed" | "declined",
    covers: r.covers,
  }));
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function daysUntil(from: Date, iso: string): number | null {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  const start = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  return Math.round((d.getTime() - start) / 86400000);
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function tabForKind(kind: string): string {
  switch (kind) {
    case "university":
      return "workspace";
    case "scholarship":
      return "scholarships";
    case "test":
      return "tests";
    case "document":
      return "documents";
    case "visa":
      return "visa";
    default:
      return "tasks";
  }
}

/**
 * Compare the student's own recorded scores against the published minimums of
 * the universities they actually applied to. This reports the gap and does NOT
 * touch the chancing model (spec §8).
 */
async function testGapsFor(profileId: number, profile: typeof studentProfiles.$inferSelect | undefined) {
  const apps = await db
    .select({ universityId: applications.universityId, universityName: applications.universityName })
    .from(applications)
    .where(and(eq(applications.profileId, profileId), isNotNull(applications.universityId)))
    .limit(8);
  const ids = [...new Set(apps.map((a) => a.universityId).filter((x): x is number => x != null))];
  if (!ids.length) return [];
  const unis = await db.select().from(universities).where(inArray(universities.id, ids));

  const plans = await db.select().from(testPlans).where(eq(testPlans.profileId, profileId));
  const planned = (type: string) => plans.find((p) => p.testType === type)?.currentScore ?? null;

  const out: ReturnType<typeof testGap>[] = [];
  for (const u of unis) {
    if (u.minIelts != null) out.push(testGap("ielts", u.minIelts, profile?.ieltsScore ?? planned("ielts"), "IELTS"));
    if (u.minSat != null) out.push(testGap("sat", u.minSat, profile?.satScore ?? planned("sat"), "SAT"));
  }
  // Deduplicate: one entry per test type, keeping the strictest requirement.
  const best = new Map<string, ReturnType<typeof testGap>>();
  for (const t of out) {
    const prev = best.get(t.testType);
    if (!prev || t.required > prev.required) best.set(t.testType, t);
  }
  return [...best.values()];
}

async function highestTestTarget(profileId: number, testType: string): Promise<number | null> {
  const rows = await db
    .select({ targetScore: testPlans.targetScore })
    .from(testPlans)
    .where(and(eq(testPlans.profileId, profileId), eq(testPlans.testType, testType)));
  const values = rows.map((r) => r.targetScore).filter((v): v is number => typeof v === "number");
  return values.length ? Math.max(...values) : null;
}

/**
 * "Recommended for you" (spec §3) — universities, scholarships and
 * opportunities the profile actually points at. Filtered server-side by the
 * student's own country/major/GPA preferences; no client-side guesswork.
 */
async function recommendedFor(
  profileId: number,
  countriesJson: string,
  major: string,
  gpa: number | null,
  todayIso: string,
  degreeLevel: string | null,
  applicantCountry: string | null
) {
  const countries = parseList(countriesJson);
  const countryFilter = countries.length ? inArray(universities.country, countries) : undefined;

  const uniRows = await db
    .select({
      id: universities.id,
      name: universities.name,
      country: universities.country,
      city: universities.city,
      flagEmoji: universities.flagEmoji,
      worldRanking: universities.worldRanking,
      programMajor: universities.programMajor,
      minGpa: universities.minGpa,
      minIelts: universities.minIelts,
      annualTuition: universities.annualTuition,
      annualTuitionUsd: universities.annualTuitionUsd,
      verificationStatus: universities.verificationStatus,
      lastVerifiedAt: universities.lastVerifiedAt,
      sourceUrl: universities.sourceUrl,
    })
    .from(universities)
    .where(and(eq(universities.isActive, true), countryFilter))
    .orderBy(universities.worldRanking)
    .limit(6);

  const savedIds = new Set(
    (await db.select({ universityId: savedUniversities.universityId }).from(savedUniversities).where(eq(savedUniversities.profileId, profileId)))
      .map((s) => s.universityId)
  );

  const scoredUnis = uniRows
    .map((u) => {
      const gpaOk = u.minGpa == null || gpa == null || gpa >= u.minGpa;
      const majorOk = !major || !u.programMajor || similar(u.programMajor, major);
      const saved = savedIds.has(u.id);
      return { ...u, saved, reason: reasonFor(gpaOk, majorOk, saved, gpa == null) };
    })
    .sort((a, b) => Number(b.saved) - Number(a.saved));

  const schRows = await db
    .select({
      id: scholarships.id,
      title: scholarships.title,
      provider: scholarships.provider,
      country: scholarships.country,
      amountUsdValue: scholarships.amountUsdValue,
      awardAmount: scholarships.awardAmount,
      awardCurrency: scholarships.awardCurrency,
      awardPeriod: scholarships.awardPeriod,
      awardBasis: scholarships.awardBasis,
      degreeLevels: scholarships.degreeLevels,
      deadlineDate: scholarships.deadlineDate,
      minGpa: scholarships.minGpa,
      eligibleCountries: scholarships.eligibleCountries,
      verificationStatus: scholarships.verificationStatus,
      tuitionCoverage: scholarships.tuitionCoverage,
      sourceUrl: scholarships.sourceUrl,
      lastVerifiedAt: scholarships.lastVerifiedAt,
    })
    .from(scholarships)
    .where(and(eq(scholarships.isActive, true), gte(scholarships.deadlineDate, todayIso)))
    .orderBy(
      desc(sql`CASE WHEN ${scholarships.verificationStatus} = 'verified' THEN 1 ELSE 0 END`),
      desc(scholarships.lastVerifiedAt),
      scholarships.deadlineDate
    )
    .limit(100);

  const oppRows = await db
    .select({
      id: opportunities.id,
      title: opportunities.title,
      provider: opportunities.provider,
      country: opportunities.country,
      type: opportunities.type,
      deadlineDate: opportunities.deadlineDate,
      url: opportunities.url,
      isVerified: opportunities.isVerified,
    })
    .from(opportunities)
    .orderBy(desc(opportunities.deadlineDate))
    .limit(4);

  const seenScholarships = new Set<string>();
  const relevantScholarships = schRows.filter((s) => {
    if (!degreeLevel || !degreeMatches(s.degreeLevels, degreeLevel)) return false;
    if (!applicantCountry || !countryMatches(s.eligibleCountries, applicantCountry)) return false;
    const title = normalizeScholarshipTitle(s.title);
    const key = `${normalizeScholarshipTitle(s.provider)}:${title}`;
    if (!title || seenScholarships.has(key)) return false;
    seenScholarships.add(key);
    return true;
  }).slice(0, 6);

  return {
    universities: scoredUnis,
    scholarships: relevantScholarships.map((s) => ({
      ...s,
      gpaOk: s.minGpa == null || gpa == null || gpa >= s.minGpa,
      gpaProvided: gpa != null,
    })),
    opportunities: oppRows,
  };
}

function reasonFor(gpaOk: boolean, majorOk: boolean, saved: boolean, gpaUnknown: boolean): string {
  if (saved) return "Already on your list";
  if (gpaUnknown) return "In your preferred country; GPA fit not assessed";
  if (gpaOk && majorOk) return "Matches your major and GPA";
  if (gpaOk) return "Matches your GPA";
  return "In your preferred country";
}

function similar(a: string, b: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z ]/g, "");
  const A = norm(a);
  const B = norm(b);
  return A.includes(B) || B.includes(A);
}

function degreeMatches(raw: string | null | undefined, target: string): boolean {
  const eligible = parseList(raw).map((v) => v.toLowerCase().replace(/[^a-z]/g, ""));
  if (eligible.includes("all")) return true;
  if (!eligible.length) return false;
  const level = target.toLowerCase().replace(/[^a-z]/g, "");
  const undergraduate = /bachelor|undergraduate|undergrad/.test(level);
  const graduate = /master|graduate/.test(level);
  const doctoral = /phd|doctor/.test(level);
  return eligible.some((value) => {
    if (undergraduate) return /bachelor|undergraduate|undergrad/.test(value);
    if (doctoral) return /phd|doctor/.test(value);
    if (graduate) return /master|graduate/.test(value);
    return value === level;
  });
}

function countryMatches(raw: string | null | undefined, country: string): boolean {
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z]/g, "");
  const applicant = normalize(country);
  const eligible = parseList(raw).map(normalize);
  if (!eligible.length) return false;
  if (eligible.some((value) => /^(all|allcountries|international|worldwide|anycountry)$/.test(value))) return true;
  return eligible.some((value) => value === applicant || value.includes(applicant) || applicant.includes(value));
}

function normalizeScholarshipTitle(value: string): string {
  return value.toLowerCase()
    .replace(/\b(program|scholarship)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string" && !!x);
  } catch {
    // plain comma list
  }
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
