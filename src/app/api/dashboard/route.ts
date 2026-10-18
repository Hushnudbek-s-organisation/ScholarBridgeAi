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
import { countActivities, profileStrength } from "@/lib/chancing";
import { chancingProfileWithActivities, toMatchProfileWithActivities, toUniversityData } from "@/lib/profileMapping";
import { calculateScholarshipMatch, calculateUniversityMatch } from "@/lib/matching";
import { matchQsUniversityBenchmark } from "@/lib/qsTop200Benchmarks";
import { evaluateUniversityAndProgramChance } from "@/lib/programChancing";
import { localeFromRequest, translateReasons } from "@/lib/engineText";
import {
  localizeOpportunityRow,
  localizeScholarshipRow,
  localizeUniversityRow,
} from "@/lib/catalogLocalizer";
import { hasUndergraduateAdmission, supportsDegreeLevel } from "@/lib/degreeLevels";
import { countriesMatch } from "@/lib/countries";
import type { Locale } from "@/i18n/config";
import { buildPhaseProgress } from "@/lib/journey/planning";
import { annualFundingCostLines, buildFundingPlan, knownAnnualCostTotal } from "@/lib/journey/funding";
import { resolvedUsdUniversityCosts, resolvedUsdScholarshipAmount } from "@/lib/usdCosts";
import {
  coverageTier,
  evaluateScholarshipForSavedUnis,
  type SavedUniRef,
} from "@/lib/savedUniCoverage";
import { gpaTo40Scale } from "@/lib/gpa";
import { profilePlan } from "@/lib/entitlements";
import { computeNextActions } from "@/lib/journey/nextSteps";
import { summarizeApplications } from "@/lib/journey/applicationSummary";

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
        savedUniversities: sql<number>`(SELECT COUNT(*)::int FROM saved_universities su WHERE su.profile_id = ${profileId})`,
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
      })
      .from(studentProfiles)
      .where(eq(studentProfiles.id, profileId))
      .limit(1);

    const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, profileId)).limit(1);
    const profileHasContext = Boolean(
      profile && (
        profile.degreeLevel?.trim() ||
        profile.targetMajor?.trim() ||
        profile.country?.trim() ||
        profile.preferredCountries?.trim() ||
        profile.studyInterests?.trim() ||
        Number(profile.gpa) > 0
      ),
    );

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

    const appProgress = summarizeApplications(appRows, offerRows);

    // ---- Study plan phases (spec §12) ------------------------------------
    const departureReady =
      Number(row?.departureTotal ?? 0) > 0 && Number(row?.departureDone ?? 0) >= Number(row?.departureTotal ?? 0);

    const phases = buildPhaseProgress({
      profileHasContext,
      openApplicationRequirements: Number(row?.openRequirements ?? 0),
      testPlanCount: Number(row?.testPlanCount ?? 0),
      savedUniversities: Number(row?.savedUniversities ?? 0),
      savedScholarships: Number(row?.savedScholarships ?? 0),
      documentsReady: Number(row?.documentsReady ?? 0),
      documentsTotal: Number(row?.documentsTotal ?? 0),
      applications: appRows.length,
      submittedApplications: appProgress.submitted,
      interviewSessions: Number(row?.interviewSessions ?? 0),
      offersRecorded: Number(row?.offersRecorded ?? 0),
      // The database has no verified visa-case or visa-approval record. An
      // interview-practice session and a departure checklist must not be
      // presented as visa progress or approval.
      visaCaseStarted: false,
      visaApproved: false,
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
    let annualCost: number | null = null;
    const fundingEstimated = false;
    let fundingSummary: ReturnType<typeof buildFundingPlan> | null = null;
    if (acceptedApp?.universityId) {
      const [uni] = await db.select().from(universities).where(eq(universities.id, acceptedApp.universityId)).limit(1);
      if (uni) {
        const costsUsd = resolvedUsdUniversityCosts(uni);
        // Use the same full annual cost-line set as the funding planner. Do not
        // present a tuition+living subtotal as the entire yearly cost while
        // insurance, books, or travel remain unknown.
        const lines = annualFundingCostLines(costsUsd);
        annualCost = knownAnnualCostTotal(lines);
        if (annualCost != null) {
          const appFundingRows = fundingRows.filter((row) => row.applicationId === acceptedApp.id);
          fundingSummary = buildFundingPlan({ annualCost, lines, items: normalizeFunding(appFundingRows) });
          fundingGapClosed = fundingSummary.isCovered === true;
        }
      }
    }

    const journeyCounts: JourneyCounts = {
      ...EMPTY_JOURNEY_COUNTS,
      profileHasContext: profileHasContext,
      savedUniversities: Number(row?.savedUniversities ?? 0),
      applications: appRows.length,
      submittedApplications: appProgress.submitted,
      offersRecorded: Number(row?.offersRecorded ?? 0),
      acceptedOffers: Number(row?.acceptedOffers ?? 0),
      fundingPlanTotal: fundingRows.length,
      fundingGapClosed,
      visaCaseStarted: false,
      visaApproved: false,
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
        kind: "application" as const,
        title: a.universityName || "",
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
    // ONE mapped profile row feeds every scoring engine on this page: the
    // readiness categories here and the profile strength below. Two mappings
    // would be two chances for the same student to be counted differently.
    const chancingProfile = profile ? await chancingProfileWithActivities(profile) : null;
    const activityFacts = chancingProfile ? countActivities(chancingProfile) : null;

    const readinessInput: ReadinessInput = {
      gpa: profile?.gpa ?? null,
      gpaScale: profile?.gpaScale ?? null,
      degreeLevel: profile?.degreeLevel ?? null,
      ieltsScore: profile?.ieltsScore ?? null,
      toeflScore: profile?.toeflScore ?? null,
      duolingoScore: profile?.duolingoScore ?? null,
      satScore: profile?.satScore ?? null,
      actScore: profile?.actScore ?? null,
      greScore: profile?.greScore ?? null,
      // Counts indicate only whether an entry is recorded; they are not
      // treated as quality or a required number of activities.
      leadershipCount: activityFacts?.leadership ?? 0,
      awardsCount: activityFacts?.awards ?? 0,
      researchCount: activityFacts?.research ?? 0,
      activitiesCount: activityFacts?.activities ?? Number(row?.activitiesCount ?? 0),
      documentsReady: Number(row?.documentsReady ?? 0),
      documentsTotal: Number(row?.documentsTotal ?? 0),
      applicationsStarted: appRows.length,
      applicationsSubmitted: appProgress.submitted,
      familyBudget: profile?.budgetAnnualUsd ?? null,
      fundingPreference: profile?.needsFinancialAid ?? profile?.requiresFullScholarship ?? null,
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
    const strength = chancingProfile
      ? profileStrength(chancingProfile, {
          essayScore: latestEssay?.rubricTotal ?? null,
        })
      : null;
    const readiness = {
      ...checklist,
      /** Shared profile readiness (the Readiness pane's number). */
      // `overall` is the display integer; `overallPrecise` is the unrounded
      // average so the dashboard tile can print the same precise value the
      // Readiness pane prints. `measured`/`total` say how much evidence the
      // number stands on (shown under the tile).
      profile: strength
        ? {
            overall: strength.overall,
            overallPrecise: strength.overallPrecise,
            measured: strength.scoredSections,
            total: strength.totalSections,
          }
        : null,
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
      },
      funding: fundingSummary?.fundingGap != null
        ? { gap: fundingSummary.fundingGap, covered: fundingSummary.isCovered === true }
        : null,
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
      },
      journey,
      nextSteps,
      deadlines,
      applications: appProgress,
      readiness,
      phases,
      testGaps: gaps,
      funding: fundingSummary && annualCost != null
        ? { ...fundingSummary, items: fundingRows.filter((row) => row.applicationId === acceptedApp?.id).length, calculated: true, estimated: fundingEstimated }
        : { annualCost: null, isCovered: null, fundingGap: null, securedGap: null, items: fundingRows.length, calculated: false, estimated: false },
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
 * Compare saved scores with university-level catalogue figures for context.
 * Figures are not programme-specific requirements; SAT is shown only when the
 * university catalogue explicitly identifies undergraduate admission.
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
    if (u.minSat != null && hasUndergraduateAdmission(u.degreeLevel)) {
      out.push(testGap("sat", u.minSat, profile?.satScore ?? planned("sat"), "SAT"));
    }
  }
  // Keep the highest university-level catalogue reference per test type; it
  // is a prompt to verify policy, not a strictest requirement.
  const highest = new Map<string, ReturnType<typeof testGap>>();
  for (const comparison of out) {
    const previous = highest.get(comparison.testType);
    if (!previous || comparison.catalogueFigure! > previous.catalogueFigure!) {
      highest.set(comparison.testType, comparison);
    }
  }
  return [...highest.values()];
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
  const gpa = gpaTo40Scale(profile.gpa, profile.gpaScale);
  const degreeLevel = profile.degreeLevel ?? null;
  const applicantCountry = profile.country ?? null;

  const matchProfile = await toMatchProfileWithActivities(profile);
  // The 5-layer positioning engine reads the same person, so it gets the same
  // profile (including the Activities pane) — never a second, divergent copy.
  const chancingProfile = await chancingProfileWithActivities(profile);

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

  // Module 1 — which saved universities a scholarship would actually pay for.
  // The full rows (name + country + resolved annual tuition) drive the
  // coverage rules in `savedUniCoverage`; the ranking below puts awards that
  // fully cover THIS student's saved list in front of everything else.
  const savedUniRows =
    savedIds.size > 0
      ? await db.select().from(universities).where(inArray(universities.id, [...savedIds]))
      : [];
  const savedUniRefs: SavedUniRef[] = savedUniRows.map((u) => ({
    id: u.id,
    name: u.name,
    country: u.country,
    annualTuitionUsd: resolvedUsdUniversityCosts(u).annualTuitionUsd,
  }));

  /**
   * One row per candidate university: the fit (catalogue match) AND the
   * positioning score from the QS Top 200 / program engine. Both are kept:
   * `matchScore` stays the number the Explorer shows, `chanceScore` adds the
   * department-level cohort view, and `combinedScore` is what the list is
   * ordered by (55% fit / 45% positioning — a documented, deterministic weight,
   * not a hidden ranking).
   */
  let scored: {
    uni: typeof universities.$inferSelect;
    match: ReturnType<typeof calculateUniversityMatch>;
    chance: ReturnType<typeof evaluateUniversityAndProgramChance>;
    combinedScore: number;
  }[] = [];
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
      .map((u) => {
        const match = calculateUniversityMatch(matchProfile, toUniversityData(u));
        const qsBenchmark = matchQsUniversityBenchmark(u);
        // A synthetic programme row: the dashboard never loads the program
        // catalogue, so it evaluates the stated major against this university's
        // own benchmark band instead of inventing a specific programme id.
        const chance = evaluateUniversityAndProgramChance(
          chancingProfile,
          u,
          {
            id: u.id,
            universityId: u.id,
            name: major || u.programMajor || "General Studies",
            degreeLevel: degreeLevel || u.degreeLevel || "Bachelor",
            field: major || u.programMajor || null,
          },
          null,
          [],
          qsBenchmark
        );
        return {
          uni: u,
          match,
          chance,
          combinedScore: Math.round(match.matchScore * 0.55 + chance.compositeProgramFitScore * 0.45),
        };
      })
      .sort((a, b) => b.combinedScore - a.combinedScore || b.match.matchScore - a.match.matchScore)
      .slice(0, uniLimit);
  }

  const universitiesOut = scored.map(({ uni: u, match, chance, combinedScore }) => {
    const usdCosts = resolvedUsdUniversityCosts(u);
    return {
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
      tuitionCurrency: u.tuitionCurrency,
      tuitionPeriod: u.tuitionPeriod,
      annualTuitionUsd: usdCosts.annualTuitionUsd,
      annualLivingEst: u.annualLivingEst,
      livingCostCurrency: u.livingCostCurrency,
      livingCostPeriod: u.livingCostPeriod,
      annualLivingEstUsd: usdCosts.annualLivingEstUsd,
      postStudyWorkVisaYears: u.postStudyWorkVisaYears,
      verificationStatus: u.verificationStatus,
      lastVerifiedAt: u.lastVerifiedAt,
      sourceUrl: u.sourceUrl,
      saved: savedIds.has(u.id),
      matchScore: match.matchScore,
      /**
       * Positioning from the QS Top 200 + 5-layer program engine. `matchScore`
       * alone cannot see department selectivity or the admitted-cohort GPA band,
       * so the panel shows both side by side.
       */
      chanceScore: chance.compositeProgramFitScore,
      combinedScore,
      effectiveAcceptRatePct: chance.effectiveProgramAcceptRatePct,
      studentGpaPercentile: chance.studentGpaPercentile,
      programGpa50: chance.programGpa50,
      matchReasons: translateReasons(locale, "university", match.reasonDetails, match.reasons),
      matchIssues: translateReasons(locale, "university", match.issueDetails, match.potentialIssues),
      matchBreakdown: match.breakdown,
    };
  });

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
    .map((s) => ({
      row: s,
      match: calculateScholarshipMatch(matchProfile, s),
      // Coverage of the student's SAVED universities (shared rules with the
      // Scholarship Hub and the deadlines feed — one source of truth).
      cov: evaluateScholarshipForSavedUnis(
        { ...s, amountUsdValue: resolvedUsdScholarshipAmount(s) },
        savedUniRefs
      ),
    }))
    // Four tiers, then fit score: full coverage AT a saved university always
    // leads; then other awards that apply at a saved university; then general
    // full-coverage awards; only inside a tier does the engine's fit score decide.
    .sort(
      (a, b) =>
        coverageTier(b.cov) - coverageTier(a.cov) ||
        b.match.matchScore - a.match.matchScore ||
        a.row.id - b.row.id
    )
    .slice(0, 6)
    .map(({ row: s, match, cov }) => ({
      id: s.id,
      title: s.title,
      provider: s.provider,
      country: s.country,
      amountUsdValue: resolvedUsdScholarshipAmount(s),
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
      matchBreakdown: match.breakdown,
      gpaOk: s.minGpa == null || gpa == null || gpa >= s.minGpa,
      gpaProvided: gpa != null,
      /** "open-to-all" | "citizenship-match" | "unknown" — never a claim. */
      countryEligibility: scholarshipCountryVerdict(s.eligibleCountries, applicantCountry),
      /** Saved-university coverage (Module 1): which rows this award pays for. */
      coveredUniversities: cov.coveredUniNames,
      coversSavedUni: cov.coversSavedUni,
      isFullForSavedUni: cov.isFullForSavedUni,
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
    // Rows leave the API in the student's language (en = source values).
    universities: universitiesOut.map((u) => localizeUniversityRow(u, locale)),
    scholarships: relevantScholarships.map((s) => localizeScholarshipRow(s, locale)),
    opportunities: opportunitiesOut.map((o) => localizeOpportunityRow(o, locale)),
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
