import { NextResponse } from "next/server";
import { db } from "@/db";
import { applications, savedUniversities, studentProfiles, universities } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { callAI } from "@/lib/ai";
import { guardAiRequest, safePromptFields } from "@/lib/ai/guard";
import { ADVISOR_SYSTEM_PROMPT, buildAdvisorBrief, isTrustworthyReply, rulesAdvice, type AdvisorInput } from "@/lib/advisor";
import { estimateAdmissionChance, profileCompletenessRatio, type ChancingProfile, type ChancingResult } from "@/lib/chancing";
import { buildNextActions, daysUntil, type NextActionsContext } from "@/lib/nextActions";
import { calculateUniversityMatch, type StudentProfileData } from "@/lib/matching";

/**
 * AI Admissions Advisor (#3).
 *
 * The numbers come from the deterministic chancing engine; the model only
 * explains them. A reply that quotes a percentage absent from the brief is
 * rejected and the rules-based advice is returned instead — better a plainer
 * true answer than a confident invented one.
 */
export async function POST(req: Request) {
  try {
    const guarded = await guardAiRequest(req);
    if (!guarded.ok) return guarded.response;

    const profileId = guarded.profileId;
    if (!profileId) {
      return NextResponse.json({ error: "profileId is required" }, { status: 400 });
    }

    const question = safePromptFields(guarded.body).message;
    const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, profileId));
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // --- Facts: shortlist + applications → chancing estimates -------------
    const savedUnis = await db.select().from(savedUniversities).where(eq(savedUniversities.profileId, profileId));
    const apps = await db.select().from(applications).where(eq(applications.profileId, profileId));
    const appUniIds = apps.map((a) => a.universityId).filter((id): id is number => id !== null);
    const uniIds = [...new Set([...savedUnis.map((s) => s.universityId), ...appUniIds])];

    const chancingProfile: ChancingProfile = {
      gpa: profile.gpa,
      gpaScale: profile.gpaScale,
      ieltsScore: profile.ieltsScore,
      toeflScore: profile.toeflScore,
      satScore: profile.satScore,
      actScore: profile.actScore,
      duolingoScore: profile.duolingoScore,
      country: profile.country,
      targetMajor: profile.targetMajor,
      degreeLevel: profile.degreeLevel,
      leadership: profile.leadership,
      volunteering: profile.volunteering,
      clubs: profile.clubs,
      researchExperience: profile.researchExperience,
      awards: profile.awards,
      olympiads: profile.olympiads,
      budgetAnnualUsd: profile.budgetAnnualUsd,
      careerGoal: profile.careerGoal,
      graduationYear: profile.graduationYear,
      requiresFullScholarship: profile.requiresFullScholarship,
    };

    const matchProfile: StudentProfileData = {
      id: profile.id,
      name: profile.name,
      degreeLevel: profile.degreeLevel,
      targetMajor: profile.targetMajor,
      gpa: profile.gpa,
      gpaScale: profile.gpaScale,
      ieltsScore: profile.ieltsScore,
      toeflScore: profile.toeflScore,
      satScore: profile.satScore,
      greScore: profile.greScore,
      budgetAnnualUsd: profile.budgetAnnualUsd,
      preferredCountries: profile.preferredCountries,
      needScholarship: profile.needScholarship,
      extracurriculars: profile.extracurriculars,
      workExperienceYears: profile.workExperienceYears,
      researchPublications: profile.researchPublications,
    };

    const chances: ChancingResult[] = [];
    if (uniIds.length > 0) {
      const uniRows = await db.select().from(universities).where(inArray(universities.id, uniIds));
      for (const uni of uniRows) {
        const fit = calculateUniversityMatch(matchProfile, uni as never);
        chances.push(
          estimateAdmissionChance(chancingProfile, uni as never, { fitScore: fit.matchScore })
        );
      }
    }

    // --- The three roadmap actions, so the advisor agrees with them -------
    const today = new Date();
    const context: NextActionsContext = {
      today,
      completeness: profileCompletenessRatio(chancingProfile),
      deadlines: apps
        .filter((a) => a.status !== "withdrawn" && a.deadline)
        .map((a) => ({
          id: `app-${a.id}`,
          title: a.universityName,
          type: "application",
          daysRemaining: daysUntil(today, a.deadline),
        }))
        .filter((d) => d.daysRemaining !== null) as { id: string; title: string; type: string; daysRemaining: number }[],
      applications: apps.map((a) => ({
        id: a.id,
        universityName: a.universityName,
        status: a.status,
        deadlineDaysRemaining: daysUntil(today, a.deadline),
      })),
      hasEnglishTest:
        Number(profile.ieltsScore) > 0 || Number(profile.toeflScore) > 0 || Number(profile.duolingoScore) > 0,
      needsEnglishTest: true,
      hasStandardizedTest: Number(profile.satScore) > 0 || Number(profile.actScore) > 0,
      requiresStandardizedTest: /united states|usa|canada/i.test(profile.preferredCountries || ""),
      hasEssay: false,
      recommendationsRequested: false,
      savedUniversityCount: savedUnis.length,
      savedScholarshipCount: 0,
      openTaskCount: 0,
      requiresFullScholarship: Boolean(profile.requiresFullScholarship),
      submittedWithoutOutcome: 0,
      graduationYear: profile.graduationYear,
    };
    const roadmap = buildNextActions(context, 3);

    const input: AdvisorInput = {
      studentName: profile.name,
      profile: chancingProfile,
      completenessPct: Math.round(profileCompletenessRatio(chancingProfile) * 100),
      chances,
      nextActions: roadmap.actions,
      question: question || undefined,
    };

    // Always compute the honest baseline first — it is the fallback AND the
    // structure the UI renders around the model's prose.
    const advice = rulesAdvice(input);
    const brief = buildAdvisorBrief(input);

    let aiReply = "";
    let aiUsed = false;
    let aiRejectedFor = "";

    if (question) {
      const raw = await callAI(brief, ADVISOR_SYSTEM_PROMPT, { taskType: "admissions", profileId });
      if (raw) {
        const trust = isTrustworthyReply(raw, input);
        if (trust.ok) {
          aiReply = raw;
          aiUsed = true;
        } else {
          // A hallucinated number must never reach a student.
          aiRejectedFor = trust.reason || "failed validation";
          console.warn(`advisor: rejected model reply (${aiRejectedFor})`);
        }
      }
    }

    return NextResponse.json({
      advice,
      aiReply: aiReply || null,
      aiUsed,
      aiRejectedFor: aiRejectedFor || null,
      headline: roadmap.headline,
      nextActions: roadmap.actions,
      chances: chances.map((c) => ({
        universityName: c.universityName,
        fitScore: c.fitScore,
        low: c.admission.low,
        high: c.admission.high,
        band: c.admission.band,
        label: c.admission.label,
      })),
    });
  } catch (error) {
    console.error("POST /api/ai/admissions-advisor error:", error);
    return NextResponse.json({ error: "Failed to generate admissions advice" }, { status: 500 });
  }
}
