import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { isLocale } from "@/i18n/config";
import { db } from "@/db";
import {
  applicationOutcomes,
  applicationTasks,
  applications,
  recommendationRequests,
  savedScholarships,
  savedUniversities,
  studentProfiles,
  universities,
} from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { callAI } from "@/lib/ai";
import { guardAiRequest, safePromptFields } from "@/lib/ai/guard";
import {
  ADVISOR_SYSTEM_PROMPT,
  buildAdvisorBrief,
  isTrustworthyReply,
  rulesAdvice,
  type AdvisorFitComparison,
  type AdvisorInput,
  type AdvisorRuleKey,
} from "@/lib/advisor";
import { ADMISSION_PROBABILITY } from "@/lib/chancing";
import { buildNextActions, daysUntil, type NextActionsContext } from "@/lib/nextActions";
import { calculateUniversityMatch } from "@/lib/matching";
import { chancingProfileWithActivities, toMatchProfileWithActivities, toUniversityData } from "@/lib/profileMapping";

/**
 * AI Admissions Advisor (#3).
 *
 * The model can only explain profile-to-catalogue comparisons. No admission
 * probability estimator is run. A reply that quotes a percentage absent from
 * the brief is rejected and the rules-based advice is returned instead.
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

    // --- Facts: saved programmes, application work and outcomes -----------
    const [savedUnis, apps, savedSch, recRows, tasks, outcomes] = await Promise.all([
      db.select().from(savedUniversities).where(eq(savedUniversities.profileId, profileId)),
      db.select().from(applications).where(eq(applications.profileId, profileId)),
      db.select().from(savedScholarships).where(eq(savedScholarships.profileId, profileId)),
      db.select().from(recommendationRequests).where(eq(recommendationRequests.profileId, profileId)),
      db.select().from(applicationTasks).where(eq(applicationTasks.profileId, profileId)),
      db
        .select({ applicationId: applicationOutcomes.applicationId })
        .from(applicationOutcomes)
        .where(eq(applicationOutcomes.profileId, profileId)),
    ]);
    const openTasks = tasks.filter((task) => !task.isCompleted);
    const outcomeIds = new Set(outcomes.map((outcome) => outcome.applicationId));
    const appUniIds = apps.map((a) => a.universityId).filter((id): id is number => id !== null);
    const uniIds = [...new Set([...savedUnis.map((s) => s.universityId), ...appUniIds])];

    const chancingProfile = await chancingProfileWithActivities(profile);
    const matchProfile = await toMatchProfileWithActivities(profile);

    const comparisons: AdvisorFitComparison[] = [];
    if (uniIds.length > 0) {
      const uniRows = await db.select().from(universities).where(inArray(universities.id, uniIds));
      for (const uni of uniRows) {
        const fit = calculateUniversityMatch(matchProfile, toUniversityData(uni));
        comparisons.push({
          universityId: uni.id,
          universityName: uni.name,
          fitScore: fit.matchScore,
          positives: fit.reasons,
          negatives: fit.potentialIssues,
        });
      }
    }

    // --- The three roadmap actions, so the advisor agrees with them -------
    const today = new Date();
    const context: NextActionsContext = {
      deadlines: [
        ...apps
          .filter((application) => application.status !== "withdrawn" && application.deadline)
          .map((application) => ({
            id: `app-${application.id}`,
            title: application.programName
              ? `${application.universityName} — ${application.programName}`
              : application.universityName,
            type: "application",
            daysRemaining: daysUntil(today, application.deadline),
          })),
        ...openTasks
          .filter((task) => task.dueDate)
          .map((task) => ({
            id: `task-${task.id}`,
            title: task.title,
            type: "milestone",
            daysRemaining: daysUntil(today, task.dueDate),
          })),
      ].filter((deadline) => deadline.daysRemaining !== null) as {
        id: string;
        title: string;
        type: string;
        daysRemaining: number;
      }[],
      applications: apps.map((application) => ({
        id: application.id,
        universityName: application.universityName,
        status: application.status,
        deadlineDaysRemaining: daysUntil(today, application.deadline),
      })),
      recommendationApplicationIds: [...new Set(recRows.map((row) => row.applicationId))],
      savedUniversityCount: savedUnis.length,
      savedScholarshipCount: savedSch.length,
      openTaskCount: openTasks.length,
      requiresFullScholarship: Boolean(profile.requiresFullScholarship),
      submittedWithoutOutcome: apps.filter(
        (application) =>
          ["submitted", "interview", "decision"].includes(application.status) && !outcomeIds.has(application.id)
      ).length,
    };
    const roadmap = buildNextActions(context, 3);

    const input: AdvisorInput = {
      studentName: profile.name,
      profile: chancingProfile,
      comparisons,
      nextActions: roadmap.actions,
      question: question || undefined,
      locale: isLocale(profile.preferredLocale || "") ? profile.preferredLocale! : "en",
    };

    // Rules-based prose comes from the shared message catalog so its fallback
    // is readable in English, Uzbek, and Russian as well as the AI response.
    const locale = input.locale ?? "en";
    const t = await getTranslations({ locale, namespace: "ai" });
    const translateRule = (key: AdvisorRuleKey, values?: Record<string, string | number>) =>
      t(`advisorRules.${key}` as never, values as never) as string;

    // Always compute the honest baseline first — it is the fallback AND the
    // structure the UI renders around the model's prose.
    const advice = rulesAdvice(input, translateRule);
    const brief = buildAdvisorBrief(input);

    let aiReply = "";
    let aiUsed = false;
    let aiRejectedFor = "";

    if (question) {
      const raw = await callAI(brief, ADVISOR_SYSTEM_PROMPT, { taskType: "admissions", profileId: guarded.usageProfileId });
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
      // Fit comparisons only; the probability state is explicitly unavailable
      // because no admission-probability methodology has been validated.
      comparisons: comparisons.map(({ universityName, fitScore }) => ({
        universityName,
        fitScore,
      })),
      probability: ADMISSION_PROBABILITY,
    });
  } catch (error) {
    console.error("POST /api/ai/admissions-advisor error:", error);
    return NextResponse.json({ error: "Failed to generate admissions advice" }, { status: 500 });
  }
}
