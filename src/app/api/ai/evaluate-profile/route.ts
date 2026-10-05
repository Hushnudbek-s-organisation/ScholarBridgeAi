import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { aiEvaluations, essayVersions, scholarships, studentProfiles, universities } from "@/db/schema";
import { callAI } from "@/lib/ai";
import { normalizeAiReply } from "@/lib/ai/format-reply";
import { guardAiRequest } from "@/lib/ai/guard";
import { localeToLanguageName } from "@/i18n/config";
import { profileStrength } from "@/lib/chancing";
import { calculateScholarshipMatch, calculateUniversityMatch } from "@/lib/matching";
import { chancingProfileWithActivities, toMatchProfile } from "@/lib/profileMapping";
import {
  buildProfileReport,
  type ReportFacts,
  type ReportMatchFact,
  type ReportScholarshipFact,
} from "@/lib/profileReportFallback";

/**
 * Profile evaluation ("Run AI Audit").
 *
 * HONESTY RULES (same policy as the Chancing pane):
 *   • the readiness number comes from the shared `profileStrength` engine —
 *     this route must never invent a second score;
 *   • universities and scholarships come from the live engines and the
 *     catalogue — never from a hardcoded list in the prompt;
 *   • the model is explicitly forbidden from producing percentiles,
 *     acceptance rates or "chance of admission" figures, because the platform
 *     has no validated methodology for them;
 *   • when the AI provider is unavailable, the built-in report is built from
 *     the very same facts (`buildProfileReport`), so the fallback can never
 *     contradict the rest of the app either.
 */

async function loadFacts(profile: typeof studentProfiles.$inferSelect): Promise<ReportFacts> {
  const [uniRows, scholarshipRows, latestEssay] = await Promise.all([
    db.select().from(universities).where(eq(universities.isActive, true)),
    db.select().from(scholarships),
    db
      .select({ rubricTotal: essayVersions.rubricTotal })
      .from(essayVersions)
      .where(eq(essayVersions.profileId, profile.id))
      .orderBy(desc(essayVersions.versionNumber), desc(essayVersions.id))
      .limit(1),
  ]);

  const essayScore = latestEssay.length ? (latestEssay[0].rubricTotal ?? null) : null;
  const strength = profileStrength(await chancingProfileWithActivities(profile), { essayScore });
  const matchProfile = toMatchProfile(profile);

  const scored = uniRows
    .map((uni) => ({ uni, match: calculateUniversityMatch(matchProfile, uni) }))
    .sort((a, b) => b.match.matchScore - a.match.matchScore);

  // The fit engine already ranks and trims these (top 2 evidence, top 2
  // issues) — take the first of each, never re-rank them here.
  const toFact = (row: (typeof scored)[number]): ReportMatchFact => ({
    name: row.uni.name,
    country: row.uni.country,
    score: row.match.matchScore,
    category: row.match.matchCategory,
    reason: row.match.reasons?.[0] ?? null,
    issue: row.match.potentialIssues?.[0] ?? null,
  });
  const byCategory = (category: string) =>
    scored.filter((row) => row.match.matchCategory === category).slice(0, 3).map(toFact);

  const scholarshipFacts: ReportScholarshipFact[] = scholarshipRows
    .map((row) => ({ row, match: calculateScholarshipMatch(matchProfile, row) }))
    .sort((a, b) => b.match.matchScore - a.match.matchScore)
    .filter(({ match }) => match.matchScore >= 60)
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
    needScholarship: Boolean(profile.needScholarship),
    workExperienceYears: profile.workExperienceYears ?? 0,
    researchPublications: profile.researchPublications ?? 0,
    extracurriculars: profile.extracurriculars ?? null,
    readiness: {
      overall: strength.overall,
      completeness: strength.completeness,
      sections: strength.sections.map((s) => ({ key: s.key, score: s.score })),
    },
    reached: byCategory("Reach"),
    matched: byCategory("Match"),
    safety: byCategory("Safety"),
    scholarships: scholarshipFacts,
  };
}

function factsForPrompt(facts: ReportFacts): string {
  const uni = (rows: ReportMatchFact[]) =>
    rows.length
      ? rows.map((r) => `${r.name} (${r.country}) — fit ${r.score}%${r.issue ? `; main gap: ${r.issue}` : r.reason ? `; strength: ${r.reason}` : ""}`).join("\n  ")
      : "none";
  return [
    `- Readiness score: ${facts.readiness.overall}/100 (ScholarBridge readiness engine — NOT a probability of admission)`,
    `- Profile completeness: ${facts.readiness.completeness}%`,
    `- Readiness by section: ${facts.readiness.sections.map((s) => `${s.key} ${s.score}`).join(", ")}`,
    "- Universities whose fit the platform actually computed (use these names ONLY):",
    `  Reach:\n  ${uni(facts.reached)}`,
    `  Match:\n  ${uni(facts.matched)}`,
    `  Safety:\n  ${uni(facts.safety)}`,
    "- Scholarships from the catalogue (use these ONLY):",
    facts.scholarships.length
      ? facts.scholarships.map((s) => `  ${s.title} — ${s.provider} (${s.coverageType}); deadline: ${s.deadlineDate ?? "not published"}`).join("\n")
      : "  none matched this profile",
  ].join("\n");
}

export async function POST(req: Request) {
  try {
    // Size cap + rate limit + ownership of `profileId` (see lib/ai/guard).
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

    const locale = profile.preferredLocale || "en";
    const facts = await loadFacts(profile);

    const prompt = `You are ScholarBridgeAI, an international admissions counselor. Evaluate the student below using ONLY the verified platform data provided. Write the ENTIRE evaluation in ${localeToLanguageName(locale)}.

STUDENT PROFILE (as saved by the student):
- Name: ${profile.name}
- Degree level target: ${profile.degreeLevel}
- Target major: ${profile.targetMajor}
- GPA: ${profile.gpa} / ${profile.gpaScale}
- IELTS: ${profile.ieltsScore ?? "not provided"} · TOEFL: ${profile.toeflScore ?? "not provided"} · SAT: ${profile.satScore ?? "not provided"} · GRE: ${profile.greScore ?? "not provided"}
- Annual budget: ${facts.budgetAnnualUsd == null ? "not specified" : `$${facts.budgetAnnualUsd.toLocaleString("en-US")}`}
- Scholarship needed: ${facts.needScholarship ? "yes" : "no"}
- Work experience: ${facts.workExperienceYears} years · Publications: ${facts.researchPublications}
- Extracurriculars: ${facts.extracurriculars || "none stated"}

VERIFIED PLATFORM DATA — the only numbers, names and claims you may use:
${factsForPrompt(facts)}

ABSOLUTE RULES (a violation makes the whole answer wrong):
1. NEVER invent or estimate an acceptance rate, percentile, ranking, probability, scholarship amount or deadline. If a number is not in the verified data above, write that it is not published.
2. NEVER state or imply a chance of admission. Readiness/fit scores measure the profile against published requirements — say so explicitly once.
3. Do not name universities or scholarships that are not listed above.
4. Do not promise admission, funding or visa outcomes.

FORMAT RULES (follow exactly):
- Plain markdown only: one short heading (##) per section, bold for key terms, short bullet points.
- NO HTML tags, NO HTML entities (write a plain & and plain quotes), NO markdown tables, NO literal backslash-n sequences.
- At most 1-2 emojis in the whole reply.
Sections: 1) Overall Profile Score & Readiness Assessment (use the readiness score above and explain what it measures), 2) Key Competitive Strengths, 3) Critical Gaps & How to Fix Them, 4) Tailored University Strategy (the Reach/Match/Safety lists above, with the stated gap/strength for each), 5) Funding (the catalogue entries above, noting deadlines that are not published), 6) Suggested Next Steps.`;

    const systemInstruction =
      "You are ScholarBridge's senior AI Admissions Strategist. You are strictly factual: you only use the verified platform data given to you, you never invent statistics, and you never promise admission.";

    let evaluationResult = await callAI(prompt, systemInstruction, {
      taskType: "admissions",
      profileId: guarded.usageProfileId,
    });
    // aiUsed=true only when the AI provider actually returned an evaluation.
    // When AI is unavailable the route returns a built-in report flagged as
    // fallback so the UI never presents fixed info as "AI analysis".
    const aiUsed = Boolean(evaluationResult);

    if (!evaluationResult) {
      evaluationResult = normalizeAiReply(buildProfileReport(locale, facts));
    }

    // Save to AI evaluations table
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
