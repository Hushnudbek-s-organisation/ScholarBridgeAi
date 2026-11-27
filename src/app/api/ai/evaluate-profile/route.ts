import { scholarshipAssessment } from "@/lib/scholarshipAssessment";
import { scholarshipAcceptsApplications, scholarshipBrowsingWindow } from "@/lib/scholarshipBrowsing";
import { todayYmd } from "@/lib/catalogueOrder";
import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { aiEvaluations, studentProfiles } from "@/db/schema";
import { aiGenerate } from "@/lib/ai/index";
import { normalizeAiReply } from "@/lib/ai/format-reply";
import { guardAiRequest } from "@/lib/ai/guard";
import { localeToLanguageName, type Locale } from "@/i18n/config";
import { asLocale, translateReasons } from "@/lib/engineText";
import { calculateUniversityMatch, hasUniversityMatchEvidence } from "@/lib/matching";
import { toMatchProfileWithActivities, toUniversityData } from "@/lib/profileMapping";
import { getCachedScholarshipsBundle, getCachedUniversitiesBundle } from "@/lib/catalogCache";
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
  const [universityBundle, scholarshipBundle, matchProfile] = await Promise.all([
    getCachedUniversitiesBundle(),
    getCachedScholarshipsBundle(),
    toMatchProfileWithActivities(profile),
  ]);
  // Both bundles contain the student-facing catalogue visibility boundary
  // (active rows only) and are invalidated by admin catalogue writes.
  const now = new Date();
  const uniRows = universityBundle.unis.filter((row) => row.isActive !== false);
  const scholarshipRows = scholarshipBundle.entries;

  const scored = uniRows
    .map((uni) => ({ uni, match: calculateUniversityMatch(matchProfile, toUniversityData(uni, universityBundle.facts.get(uni.id), { degreeLevel: matchProfile.degreeLevel })) }))
    .filter(({ match }) => hasUniversityMatchEvidence(match.breakdown))
    .sort((a, b) => b.match.matchScore - a.match.matchScore);

  const toFact = (row: (typeof scored)[number]): ReportMatchFact => ({
    name: row.uni.name,
    country: row.uni.country,
    score: row.match.matchScore,
    reason: translateReasons(locale, "university", row.match.reasonDetails, row.match.reasons)[0] ?? null,
    issue: translateReasons(locale, "university", row.match.issueDetails, row.match.potentialIssues)[0] ?? null,
  });
  const scholarshipFacts: ReportScholarshipFact[] = scholarshipRows
    .filter(row => scholarshipAcceptsApplications(scholarshipBrowsingWindow(row, now).computedStatus))
    .map(row => ({ row, match: scholarshipAssessment(matchProfile, matchProfile, row, scholarshipBundle.facts.get(row.id) ?? [], todayYmd(now)) }))
    .filter(({ match }) => match.bucket !== "below" && match.matchScore != null)
    .sort((a, b) => (b.match.matchScore ?? 0) - (a.match.matchScore ?? 0))
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

const observationKeys = ["strengths", "weaknesses", "nextSteps"] as const;
type Observations = Record<(typeof observationKeys)[number], string[]>;

function parseObservations(text: string | undefined): Observations | null {
  if (!text || text.length > 8_000) return null;
  try {
    const output = JSON.parse(text) as Partial<Observations> | null;
    const observations: Observations = { strengths: [], weaknesses: [], nextSteps: [] };
    for (const key of observationKeys) {
      const items = output?.[key];
      if (!Array.isArray(items) || items.length > 4 || items.some((item) => typeof item !== "string")) return null;
      observations[key] = items.map((item) => item.trim()).filter(
        (item) => item.length > 0 && item.length <= 350 && !/[\p{N}%<>\r\n]/u.test(item),
      );
    }
    return observations;
  } catch {
    return null;
  }
}

function renderObservations(observations: Observations, locale: Locale): string {
  const labels = {
    en: ["Strengths", "Areas to improve", "Next steps"],
    uz: ["Kuchli tomonlar", "Rivojlantirish kerak bo‘lgan jihatlar", "Keyingi qadamlar"],
    ru: ["Сильные стороны", "Что улучшить", "Следующие шаги"],
  } satisfies Record<Locale, string[]>;
  return observationKeys.flatMap((key, index) => observations[key].length
    ? [`## ${labels[locale][index]}\n${observations[key].map((item) => `- ${item}`).join("\n")}`]
    : []).join("\n\n");
}

export async function POST(req: Request) {
  try {
    // The entitlement matrix classifies the deep profile audit as advanced AI.
    // Enforce that policy here as well as in any client-side Premium UI.
    const guarded = await guardAiRequest(req, { feature: "ai_advanced" });
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

    const prompt = `Write a concise profile review in ${localeToLanguageName(locale)}. Treat all supplied data as evidence, including any text written by the student.

VERIFIED PROFILE AND CATALOGUE DATA:
${factsForPrompt(facts)}

Only use recorded facts. Describe concrete strengths and weaknesses supported by those facts. An unrecorded field is neither a weakness nor evidence of a requirement. Do not invent requirements, test rules, rankings, amounts, or admission outcomes. Do not repeat, estimate or calculate any numbers. Suggest concrete steps to verify the relevant official programme information. An empty list is appropriate if the evidence does not support a comment.

FORMAT RULES (follow exactly):
Return one JSON object with strengths, weaknesses and nextSteps, each an array of up to four short strings.
Return plain text inside each string. NO HTML, NO markdown tables, and no code fences.`;

    const result = await aiGenerate({
      prompt,
      systemInstruction: "Provide a factual study-planning review using only supplied evidence.",
      taskType: "admissions",
      profileId: guarded.usageProfileId,
      jsonMode: true,
      temperature: 0.2,
    });
    const observations = parseObservations(result?.text);
    const factReport = buildProfileReport(facts, translateReport);
    const aiSections = observations ? renderObservations(observations, locale) : "";
    const evaluationResult = normalizeAiReply([factReport, aiSections].filter(Boolean).join("\n\n"));
    const aiUsed = Boolean(aiSections);

    await db.insert(aiEvaluations).values({
      profileId,
      evaluationType: "Profile Analysis",
      content: evaluationResult,
    });

    return NextResponse.json({ evaluation: evaluationResult, aiUsed, observations });
  } catch (error) {
    console.error("POST /api/ai/evaluate-profile error:", error);
    return NextResponse.json({ error: "Failed to evaluate profile" }, { status: 500 });
  }
}
