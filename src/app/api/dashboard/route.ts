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
import { chancingProfileWithActivities, toMatchProfile, toUniversityData } from "@/lib/profileMapping";
import { calculateScholarshipMatch, calculateUniversityMatch } from "@/lib/matching";
import { localeFromRequest, translateReasons } from "@/lib/engineText";
import { supportsDegreeLevel } from "@/lib/degreeLevels";
import { countriesMatch } from "@/lib/countries";
import type { Locale } from "@/i18n/config";
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
    // Built from this profile's own facts — see recommendedFor() for the rules.
    const locale = localeFromRequest(req);
    const recommended = profile
      ? await recommendedFor(profileId, profile, locale, todayIso)
      : {
          personalised: false,
          basis: [] as string[],
          missing: ["degreeLevel", "major", "countries", "gpa", "budget"],
          universities: [],
          scholarships: [],
          opportunities: [],
        };

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
/**
 * "Recommended for you" — every row here must be justified by THIS profile.
 *
 * The old version took the six highest-ranked universities in the student's
 * preferred countries and called them recommendations: a student with an empty
 * profile still saw MIT, and the badge ("In your preferred country") was
 * computed from fields the student had never filled in. That is exactly the
 * behaviour this platform must not have, so the rules are now:
 *
 *   • NOTHING is recommended until the profile supplies a basis — no countries,
 *     no target major and no GPA means an empty list plus the `missing` fields
 *     the student can add to unlock it (`personalised: false`);
 *   • the degree level is a hard filter (a Master's applicant is never shown a
 *     Bachelor's-only institution);
 *   • preferred countries are a hard filter when the student stated them;
 *   • target major is a hard filter when the student stated one and no country
 *     preference exists (the country list is the stronger signal);
 *   • the ORDER is the real fit score from `calculateUniversityMatch` — the
 *     same engine the Explorer and the Chancing pane use, so the control
 *     centre can never disagree with them;
 *   • the reason under each card is the engine's own top evidence, translated
 *     (`translateReasons`), never a hand-written praise line.
 *
 * Scholarships keep the eligibility rules (degree level + citizenship) and gain
 * the engine's fit score + reasons. A scholarship open to all countries no
 * longer disappears just because the student has not entered their citizenship.
 *
 * Opportunities are filtered by the student's level and field and sorted by the
 * nearest deadline — the previous query sorted by the FURTHEST deadline.
 */
async function recommendedFor(
  profileId: number,
  profile: typeof studentProfiles.$inferSelect,
  locale: Locale,
  todayIso: string
) {
  const countries = parseList(profile.preferredCountries);
  const major = (profile.targetMajor ?? "").trim();
  const gpa = profile.gpa ?? null;
  const degreeLevel = profile.degreeLevel ?? null;
  const applicantCountry = profile.country ?? null;

  const matchProfile = toMatchProfile(profile);

  // Which profile facts exist, and which would unlock a better list.
  const basis: string[] = [];
  if (countries.length) basis.push("countries");
  if (major) basis.push("major");
  if (gpa != null) basis.push("gpa");
  if (degreeLevel) basis.push("degreeLevel");
  if (profile.budgetAnnualUsd != null) basis.push("budget");
  if (profile.ieltsScore != null) basis.push("ielts");
  const missing: string[] = [];
  if (!degreeLevel) missing.push("degreeLevel");
  if (!major) missing.push("major");
  if (!countries.length) missing.push("countries");
  if (gpa == null) missing.push("gpa");
  if (profile.budgetAnnualUsd == null) missing.push("budget");

  // Personalisation needs an academic OR geographic signal. A name and an
  // email are not a basis for a recommendation.
  const hasBasis = countries.length > 0 || !!major || gpa != null;
  const uniLimit = 6;

  const savedIds = new Set(
    (await db
      .select({ universityId: savedUniversities.universityId })
      .from(savedUniversities)
      .where(eq(savedUniversities.profileId, profileId))
    ).map((s) => s.universityId)
  );

  let scored: { uni: typeof universities.$inferSelect; match: ReturnType<typeof calculateUniversityMatch> }[] = [];
  if (hasBasis) {
    const pool = await db
      .select()
      .from(universities)
      .where(eq(universities.isActive, true));

    scored = pool
      .filter((u) => supportsDegreeLevel(u.degreeLevel, degreeLevel))
      .filter((u) => {
        if (countries.length) {
          return countries.some((c) => countriesMatch(u.country, c));
        }
        // No country preference: fall back to the stated field, so a major-only
        // profile still gets a list that has something to do with their field.
        if (major && u.programMajor) return similar(u.programMajor, major);
        return true;
      })
      .map((u) => ({ uni: u, match: calculateUniversityMatch(matchProfile, toUniversityData(u)) }))
      .sort((a, b) => b.match.matchScore - a.match.matchScore)
      .slice(0, uniLimit);
  }

  const universitiesOut = scored.map(({ uni: u, match }) => ({
      id: u.id,
      name: u.name,
      country: u.country,
      city: u.city,
      flagEmoji: u.flagEmoji,
      worldRanking: u.worldRanking,
      programMajor: u.programMajor,
      minGpa: u.minGpa,
      minIelts: u.minIelts,
      annualTuition: u.annualTuition,
      annualTuitionUsd: u.annualTuitionUsd,
      verificationStatus: u.verificationStatus,
      lastVerifiedAt: u.lastVerifiedAt,
      sourceUrl: u.sourceUrl,
      saved: savedIds.has(u.id),
      matchScore: match.matchScore,
      matchCategory: match.matchCategory,
      matchReasons: translateReasons(locale, "university", match.reasonDetails, match.reasons),
      matchIssues: translateReasons(locale, "university", match.issueDetails, match.potentialIssues),
  }));

  const schRows = await db
    .select()
    .from(scholarships)
    .where(and(eq(scholarships.isActive, true), gte(scholarships.deadlineDate, todayIso)))
    .orderBy(
      desc(sql`CASE WHEN ${scholarships.verificationStatus} = 'verified' THEN 1 ELSE 0 END`),
      desc(scholarships.lastVerifiedAt),
      scholarships.deadlineDate
    )
    .limit(100);

  const seenScholarships = new Set<string>();
  const relevantScholarships = schRows
    .filter((s) => {
      if (!degreeMatches(s.degreeLevels, degreeLevel)) return false;
      // Citizenship: "open to all" is a fact we can state; a LIST of eligible
      // countries needs the student's citizenship to compare; an EMPTY list is
      // unknown, and unknown is not a refusal — those awards stay visible with
      // an explicit "eligibility not in our data" note (the catalogue has no
      // country rules for several well-known awards, and dropping every one of
      // them emptied this section for every student).
      if (scholarshipCountryVerdict(s.eligibleCountries, applicantCountry) === "out") return false;
      const title = normalizeScholarshipTitle(s.title);
      const key = `${normalizeScholarshipTitle(s.provider)}:${title}`;
      if (!title || seenScholarships.has(key)) return false;
      seenScholarships.add(key);
      return true;
    })
    .map((s) => ({ row: s, match: calculateScholarshipMatch(matchProfile, s) }))
    .sort((a, b) => b.match.matchScore - a.match.matchScore)
    .slice(0, 6)
    .map(({ row: s, match }) => ({
      id: s.id,
      title: s.title,
      provider: s.provider,
      country: s.country,
      amountUsdValue: s.amountUsdValue,
      awardAmount: s.awardAmount,
      awardCurrency: s.awardCurrency,
      awardPeriod: s.awardPeriod,
      awardBasis: s.awardBasis,
      degreeLevels: s.degreeLevels,
      deadlineDate: s.deadlineDate,
      minGpa: s.minGpa,
      eligibleCountries: s.eligibleCountries,
      verificationStatus: s.verificationStatus,
      tuitionCoverage: s.tuitionCoverage,
      sourceUrl: s.sourceUrl,
      lastVerifiedAt: s.lastVerifiedAt,
      matchScore: match.matchScore,
      matchReasons: translateReasons(locale, "scholarship", match.reasonDetails, match.reasons),
      matchIssues: translateReasons(locale, "scholarship", match.issueDetails, match.potentialIssues),
      gpaOk: s.minGpa == null || gpa == null || gpa >= s.minGpa,
      gpaProvided: gpa != null,
      /** "open-to-all" | "citizenship-match" | "unknown" — never a claim. */
      countryEligibility: scholarshipCountryVerdict(s.eligibleCountries, applicantCountry),
    }));

  // Opportunities: level + field are profile facts, so use them. A row whose
  // field list is ["All"] or whose level is "any" is open to this student.
  const oppRows = await db.select().from(opportunities).limit(200);
  const opportunitiesOut = oppRows
    .filter((o) => opportunityLevelMatches(o.level, degreeLevel))
    .filter((o) => opportunityFieldMatches(o.fields, major))
    .sort((a, b) => {
      const aIn = countries.some((c) => countriesMatch(a.country, c)) ? 0 : 1;
      const bIn = countries.some((c) => countriesMatch(b.country, c)) ? 0 : 1;
      if (aIn !== bIn) return aIn - bIn;
      const aD = a.deadlineDate ? String(a.deadlineDate).slice(0, 10) : null;
      const bD = b.deadlineDate ? String(b.deadlineDate).slice(0, 10) : null;
      if (aD && bD) return aD < bD ? -1 : aD > bD ? 1 : 0;
      if (aD) return -1; // a known deadline beats an unknown one
      if (bD) return 1;
      return 0;
    })
    .slice(0, 4)
    .map((o) => ({
      id: o.id,
      title: o.title,
      provider: o.provider,
      country: o.country,
      type: o.type,
      deadlineDate: o.deadlineDate ? String(o.deadlineDate).slice(0, 10) : null,
      url: o.url,
      inPreferredCountry: countries.some((c) => countriesMatch(o.country, c)),
    }));

  return {
    /** False = nothing here is personalised yet (empty profile). */
    personalised: hasBasis,
    basis,
    missing,
    universities: universitiesOut,
    scholarships: relevantScholarships,
    opportunities: opportunitiesOut,
  };
}

/**
 * What we can honestly say about an award's citizenship rule:
 *   • "open-to-all"        — the award states it takes any nationality;
 *   • "citizenship-match"  — it lists countries and the student's is among them;
 *   • "unknown"            — no country rule in our data (or no citizenship
 *                            stored): the student must confirm on the official
 *                            page, and we never imply eligibility;
 *   • "out"                — it lists countries and the student's is not one.
 */
function scholarshipCountryVerdict(
  raw: string | null | undefined,
  applicantCountry: string | null
): "open-to-all" | "citizenship-match" | "unknown" | "out" {
  const eligible = parseList(raw).map((v) => v.toLowerCase().replace(/[^a-z]/g, ""));
  if (!eligible.length) return "unknown";
  if (eligible.some((value) => /^(all|allcountries|international|worldwide|anycountry)$/.test(value))) {
    return "open-to-all";
  }
  if (!applicantCountry) return "unknown";
  return countryMatches(raw, applicantCountry) ? "citizenship-match" : "out";
}

/** profile.degreeLevel → the `opportunities.level` values that apply. */
function opportunityLevelMatches(raw: string | null | undefined, degreeLevel: string | null): boolean {
  const level = (raw ?? "any").toLowerCase().replace(/[^a-z_]/g, "");
  if (!level || level === "any" || level === "all") return true;
  if (!degreeLevel) return true; // unknown on either side is never a mismatch
  const requested = degreeLevel.toLowerCase();
  const undergraduate = /bachelor|undergraduate/.test(requested);
  const graduate = /master|graduate/.test(requested) && !undergraduate;
  const doctoral = /phd|doctor/.test(requested);
  if (undergraduate) return level === "undergrad" || level === "high_school" || level === "undergraduate";
  if (doctoral) return level === "phd" || level === "grad" || level === "graduate";
  if (graduate) return level === "grad" || level === "graduate" || level === "phd";
  return true;
}

/** `opportunities.fields` (JSON list) vs the student's target major. */
function opportunityFieldMatches(raw: string | null | undefined, major: string): boolean {
  const fields = parseList(raw);
  if (!fields.length || fields.some((f) => /^(all|any)$/i.test(f.trim()))) return true;
  if (!major) return true; // no stated field → no claim to the contrary
  return fields.some((f) => similar(f, major)) || subjectOverlap(fields, major);
}

/** Token-overlap fallback for "Data Science" vs "Computer Science". */
function subjectOverlap(fields: string[], major: string): boolean {
  const majorTokens = new Set(
    major.toLowerCase().replace(/[^a-z ]/g, " ").split(/\s+/).filter((w) => w.length > 2)
  );
  if (!majorTokens.size) return false;
  return fields.some((f) => {
    const tokens = f.toLowerCase().replace(/[^a-z ]/g, " ").split(/\s+/);
    return tokens.some((token) => token.length > 2 && majorTokens.has(token));
  });
}

function similar(a: string, b: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z ]/g, "");
  const A = norm(a);
  const B = norm(b);
  return A.includes(B) || B.includes(A);
}

function degreeMatches(raw: string | null | undefined, target: string | null): boolean {
  // No stated level = eligibility cannot be verified, so nothing is claimed.
  if (!target) return false;
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

function countryMatches(raw: string | null | undefined, country: string | null): boolean {
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z]/g, "");
  const applicant = normalize(country ?? "");
  const eligible = parseList(raw).map(normalize);
  if (!eligible.length) return false;
  if (eligible.some((value) => /^(all|allcountries|international|worldwide|anycountry)$/.test(value))) return true;
  if (!applicant) return false; // country-limited award, citizenship unknown
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
