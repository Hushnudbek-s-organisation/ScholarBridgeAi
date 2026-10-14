import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { aiEvaluations, scholarships, studentProfiles, universities } from "@/db/schema";
import { callAI } from "@/lib/ai";
import { normalizeAiReply } from "@/lib/ai/format-reply";
import { guardAiRequest } from "@/lib/ai/guard";
import { localeToLanguageName, type Locale } from "@/i18n/config";
import { asLocale, translateReasons } from "@/lib/engineText";
import { calculateScholarshipMatch, calculateUniversityMatch } from "@/lib/matching";
import { toMatchProfileWithActivities } from "@/lib/profileMapping";
import {
  buildProfileReport,
  type ReportFacts,
  type ReportMatchFact,
  type ReportScholarshipFact,
  type ReportTranslator,
} from "@/lib/profileReportFallback";

/**
 * Profile review. It summarizes recorded facts and catalogue comparisons only;
 * no readiness score, admission probability, or programme requirement is
 * inferred. The fallback and AI report use the same verified inputs.
 */
async function loadFacts(profile: typeof studentProfiles.$inferSelect, locale: Locale): Promise<ReportFacts> {
  const [uniRows, scholarshipRows] = await Promise.all([
    db.select().from(universities).where(eq(universities.isActive, true)),
    db.select().from(scholarships),
  ]);
  const matchProfile = await toMatchProfileWithActivities(profile);

  const scored = uniRows
    .map((uni) => ({ uni, match: calculateUniversityMatch(matchProfile, uni) }))
    .sort((a, b) => b.match.matchScore - a.match.matchScore);

  const toFact = (row: (typeof scored)[number]): ReportMatchFact => ({
    name: row.uni.name,
    country: row.uni.country,
    score: row.match.matchScore,
    reason: translateReasons(locale, "university", row.match.reasonDetails, row.match.reasons)[0] ?? null,
    issue: translateReasons(locale, "university", row.match.issueDetails, row.match.potentialIssues)[0] ?? null,
  });
  const scholarshipFacts: ReportScholarshipFact[] = scholarshipRows
    .map((row) => ({ row, match: calculateScholarshipMatch(matchProfile, row) }))
    .sort((a, b) => b.match.matchScore - a.match.matchScore)
    .slice(0, 4)
    .map(({ row }) => ({
      title: row.title,
      provider: row.provider,
      coverageType: row.coverageType,
      deadlineDate: row.deadlineDate ? String(row.deadlineDate).slice(0, 10) : null,
    }));

  return {
    name: profile.name,
    degreeLevel: profile.degreeLevel,
    targetMajor: profile.targetMajor,
    gpa: profile.gpa,
    gpaScale: profile.gpaScale,
    ieltsScore: profile.ieltsScore ?? null,
    budgetAnnualUsd: profile.budgetAnnualUsd ?? null,
    // Positive only when explicitly recorded; false remains "not confirmed".
    needScholarship: profile.needsFinancialAid === true || profile.needScholarship === true,
    workExperienceYears: profile.workExperienceYears ?? 0,
    researchPublications: profile.researchPublications ?? 0,
    extracurriculars: profile.extracurriculars ?? null,
    programmeMatches: scored.slice(0, 6).map(toFact),
    scholarships: scholarshipFacts,
  };
}

function factsForPrompt(facts: ReportFacts): string {
  const programmeRows = facts.programmeMatches.length
    ? facts.programmeMatches
        .map((row) => `${row.name} (${row.country}) — profile-to-catalogue fit ${row.score}%${row.issue ? `; signal to verify: ${row.issue}` : row.reason ? `; recorded comparison signal: ${row.reason}` : ""}`)
        .join("\n")
    : "no programme comparisons are available in the current catalogue";
  const scholarshipRows = facts.scholarships.length
    ? facts.scholarships
        .map((row) => `${row.title} — ${row.provider}; coverage type: ${row.coverageType}; catalogue deadline: ${row.deadlineDate ?? "not published"}`)
        .join("\n")
    : "no scholarship entry is included in this catalogue result; do not infer that no funding exists";

  return [
    `- Student: ${facts.name}`,
    `- Study context: degree ${facts.degreeLevel ?? "not recorded"}; intended field ${facts.targetMajor ?? "not recorded"}`,
    `- GPA recorded: ${facts.gpa == null ? "not recorded" : `${facts.gpa}${facts.gpaScale == null ? "" : `/${facts.gpaScale}`}`}`,
    `- IELTS recorded: ${facts.ieltsScore ?? "not recorded"}`,
    `- Annual budget recorded: ${facts.budgetAnnualUsd == null ? "not recorded" : `$${facts.budgetAnnualUsd.toLocaleString("en-US")}`}`,
    `- Scholarship need recorded: ${facts.needScholarship ? "yes" : "not confirmed"}`,
    `- Work experience entries: ${facts.workExperienceYears > 0 ? facts.workExperienceYears : "not recorded"}`,
    `- Publication entries: ${facts.researchPublications > 0 ? facts.researchPublications : "not recorded"}`,
    `- Extracurricular details: ${facts.extracurriculars || "not recorded"}`,
    "- Catalogue comparisons, sorted by current profile-to-catalogue fit; they are not admission probabilities or eligibility decisions:",
    programmeRows,
    "- Current catalogue scholarship entries for review; do not present them as confirmed awards or eligibility decisions:",
    scholarshipRows,
  ].join("\n");
}

export async function POST(req: Request) {
  try {
    const guarded = await guardAiRequest(req);
    if (!guarded.ok) return guarded.response;

    const profileId = guarded.profileId;
    if (!profileId) {
      return NextResponse.json({ error: "profileId is required" }, { status: 400 });
    }

    const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, profileId));
    if (!profile) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
    }

    const locale = asLocale(profile.preferredLocale || "en");
    const facts = await loadFacts(profile, locale);
    const reportMessages = await getTranslations({ locale, namespace: "profileReport" });
    const translateReport: ReportTranslator = (key, values = {}) =>
      reportMessages(key as never, values as never) as string;

    const prompt = `You are ScholarBridgeAI, an international study-planning assistant. Write a concise report draft in ${localeToLanguageName(locale)} using ONLY the verified platform data below. The report must say it is a draft and tell the student to verify all programme details on current official pages.

VERIFIED PROFILE AND CATALOGUE DATA:
${factsForPrompt(facts)}

ABSOLUTE RULES:
1. Use only names, facts and numbers above. Never invent or estimate test requirements, acceptance rates, percentiles, rankings, admission chances, scholarship amounts or deadlines.
2. A fit score compares the saved profile with available catalogue fields. It is not admission probability, eligibility, or a guarantee. Some catalogue entries may be university-level or incomplete.
3. Do not imply an English or standardized test is required because a score is absent. Programme policies vary; alternatives and waivers may apply. Mention a test rule only if an exact verified programme rule is supplied above (none are supplied here).
4. Do not invent applicant achievements, projects, skills, career goals, recommenders, faculty/labs, essay content, or programme details. Do not recommend universal GPA, award, leadership, activity, or application-count targets.
5. Do not assign reach/match/safety tiers, claim outcomes improve estimates, or present visa documents as universal. Direct visa questions to current official country and university guidance.
6. Clearly distinguish recorded facts from unknown fields. An unrecorded field is not a weakness or proof of a missing requirement.
7. Any suggested writing is a draft for the student's review; do not state unverifiable claims as fact. Keep the report concise and actionable without adding filler.

FORMAT RULES (follow exactly):
- Use plain text with short headings and simple bullets.
- NO HTML, NO markdown tables, and no fenced code blocks.
- Keep the report concise and suitable for editing in the student's dashboard. Suggested sections: recorded profile details, current catalogue comparisons, funding catalogue entries, and verification steps. Do not add generic essays, document, recommendation, or test recommendations unless the verified data says they apply.`;

    const systemInstruction =
      "You are ScholarBridge's factual study-planning assistant. Use only the verified facts supplied, distinguish unknown information, and never estimate admission outcomes.";

    let evaluationResult = await callAI(prompt, systemInstruction, {
      taskType: "admissions",
      profileId: guarded.usageProfileId,
    });
    const aiUsed = Boolean(evaluationResult);

    if (!evaluationResult) {
      evaluationResult = normalizeAiReply(buildProfileReport(facts, translateReport));
    }

    await db.insert(aiEvaluations).values({
      profileId,
      evaluationType: "Profile Analysis",
      content: evaluationResult,
    });

    return NextResponse.json({ evaluation: evaluationResult, aiUsed });
  } catch (error) {
    console.error("POST /api/ai/evaluate-profile error:", error);
    return NextResponse.json({ error: "Failed to evaluate profile" }, { status: 500 });
  }
}
