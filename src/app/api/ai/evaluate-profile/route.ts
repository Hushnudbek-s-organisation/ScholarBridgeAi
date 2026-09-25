import { NextResponse } from "next/server";
import { db } from "@/db";
import { studentProfiles, aiEvaluations } from "@/db/schema";
import { callAI } from "@/lib/ai";
import { normalizeAiReply } from "@/lib/ai/format-reply";
import { formatMoney } from "@/lib/format";
import { guardAiRequest } from "@/lib/ai/guard";
import { eq } from "drizzle-orm";
import { localeToLanguageName } from "@/i18n/config";

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

    const prompt = `You are ScholarBridgeAI, an elite international admissions counselor and scholarship evaluator. Analyze the following student profile and produce a detailed, highly strategic evaluation.
IMPORTANT: Write the ENTIRE evaluation in ${localeToLanguageName(profile.preferredLocale || "en")}. Translate section headings, bullet points, and recommendations into this language.

STUDENT PROFILE DATA:
- Name: ${profile.name}
- Degree Level Target: ${profile.degreeLevel}
- Target Major: ${profile.targetMajor}
- GPA: ${profile.gpa} / ${profile.gpaScale}
- Standardized Test Scores: IELTS (${profile.ieltsScore ?? "N/A"}), TOEFL (${profile.toeflScore ?? "N/A"}), SAT (${profile.satScore ?? "N/A"}), GRE (${profile.greScore ?? "N/A"})
- Annual Budget (USD): ${formatMoney(profile.budgetAnnualUsd, "USD", { placeholder: "Not specified" })}
- Preferred Study Countries: ${profile.preferredCountries}
- Scholarship Requirement: ${profile.needScholarship ? "Yes, urgently needed" : "No, self-funded/partial"}
- Work Experience: ${profile.workExperienceYears ?? 0} years
- Research Publications: ${profile.researchPublications ?? 0}
- Extracurricular Highlights: ${profile.extracurriculars || "None stated"}

Generate a structured assessment covering exactly these sections (use one short markdown heading per section, no emoji in headings):
1. Overall Profile Score & Readiness Assessment
   - Score out of 100 with percentile ranking
   - Profile competitive category (e.g. Tier 1 Ivy/Oxbridge, Top 30 World, Top 100 World)
2. Key Competitive Strengths
   - Bullet points highlighting academic or practical highlights
3. Critical Admissions Gaps & Mitigation Plan
   - Weak points (e.g., test score cutoffs, budget gap, publication needs) and actionable ways to fix them before applying
4. Tailored University Strategy (Reach, Match, Safety)
   - Country-by-country recommendations based on preferences
5. Financial Aid & Scholarship Playbook
   - Specific global scholarships to target given this profile
6. Actionable 6-Month Timeline
   - Step-by-step milestones to maximize acceptance rate

FORMAT RULES (follow exactly):
- Plain markdown only: one short heading (## or ###) per section + short bullet points; bold for key terms.
- NO HTML tags, NO HTML entities (write a plain & and plain quotes), NO markdown tables, NO literal backslash-n sequences, at most 1-2 emojis in the whole reply.

Make the tone encouraging, professional, precise, and practical.`;

    const systemInstruction = "You are ScholarBridge's senior AI Admissions Strategist. Provide structured, practical markdown evaluation with clear actionable insights.";

    let evaluationResult = await callAI(prompt, systemInstruction, { taskType: "admissions", profileId });
    // aiUsed=true only when the AI provider actually returned an evaluation.
    // When AI is unavailable the route returns a built-in estimate flagged
    // as fallback so the UI never presents fixed info as "AI analysis".
    const aiUsed = Boolean(evaluationResult);

    if (!evaluationResult) {
      // Fallback realistic AI evaluation (honest scoring: missing IELTS = 0,
      // no experience/pubs = 0, same rule as the dashboard Admissions Index).
      const normGpa = Math.min(4.0, profile.gpaScale > 0 ? (profile.gpa / profile.gpaScale) * 4.0 : profile.gpa);
      const gpaPercent = Math.round((normGpa / 4.0) * 100);
      const hasIelts = typeof profile.ieltsScore === "number" && profile.ieltsScore > 0;
      const ieltsPoints = hasIelts ? (profile.ieltsScore! / 9) * 25 : 0;
      const compositeScore = Math.min(96, Math.max(30, Math.round(gpaPercent * 0.5 + ieltsPoints + ((profile.workExperienceYears || 0) > 0 ? 10 : 0) + ((profile.researchPublications || 0) > 0 ? 10 : 0))));

      evaluationResult = normalizeAiReply(`### Overall Profile Score & Readiness Assessment
**Profile Readiness Score: ${compositeScore} / 100** *(Competitive Global Candidate)*
- **Target Tier:** Top 30 to Top 100 Global Universities for ${profile.degreeLevel} in ${profile.targetMajor}.
- **Academic Index:** GPA of **${profile.gpa}/${profile.gpaScale}** places you in the upper bracket of applicants. ${profile.ieltsScore ? `IELTS score of **${profile.ieltsScore}** meets or exceeds cutoffs for 92% of world universities.` : "Consider submitting an official IELTS or TOEFL score to unlock tier-1 university waivers."}

### Key Competitive Strengths
- **Solid Academic Foundation:** strong GPA in core prerequisite subjects aligned with **${profile.targetMajor}**.
- **Practical Exposure:** ${profile.workExperienceYears ? `${profile.workExperienceYears} year(s) of relevant experience provides practical context for SOP essays.` : "Active participation in extracurricular and technical project initiatives."}
- ${profile.researchPublications ? `**Research Distinction:** ${profile.researchPublications} peer-reviewed publication/conference presentation demonstrates academic research maturity.` : "**Extracurricular Momentum:** " + (profile.extracurriculars || "Demonstrated initiative in projects and leadership.")}
- **Target Alignment:** high compatibility with universities in preferred destination countries.

### Critical Admissions Gaps & Mitigation Plan
1. **Budget-Tuition Differential:** annual tuition budget of ${formatMoney(profile.budgetAnnualUsd, "USD", { placeholder: "Not specified" })} is ${profile.budgetAnnualUsd == null ? "not yet specified — confirm the budget before finalizing the university shortlist." : profile.budgetAnnualUsd < 35000 ? "below private US university rates (~$55k+). Prioritize public European universities (Germany, Netherlands, Switzerland) or fully-funded scholarships." : "well-positioned for public and state university tuition worldwide."}
2. **LOR Selection Strategy:** secure 2 academic recommendations from senior faculty and 1 professional reference highlighting leadership and analytical problem solving.
3. **GRE / Test Waiver Strategy:** ${profile.greScore ? `GRE score of ${profile.greScore} is a strong asset for US engineering/business schools.` : "Target universities with official GRE waivers or focus on UK/Germany where GRE is optional."}

### Tailored University Strategy (Reach, Match, Safety)
- **Reach Universities (acceptance ~5-15%):** University of Oxford (UK), MIT (USA), ETH Zurich (Switzerland). Highlight a unique research methodology and publish an updated preprint or technical portfolio.
- **Match Universities (acceptance ~20-40%):** Technical University of Munich (Germany), University of Toronto (Canada), TU Delft (Netherlands). Focus the SOP on alignment with specific faculty research labs and course modules.
- **Safety Universities (acceptance ~50%+):** University of Melbourne (Australia), UBC (Canada), Arizona State University (USA). Submit during priority early rounds for maximum merit scholarship eligibility.

### Financial Aid & Scholarship Playbook
${profile.needScholarship ? `- **Fulbright Foreign Student Program:** full tuition + monthly stipend for graduate study in the USA.
- **DAAD EPOS / TUM Merit Scholarships:** exceptional fit for low/no-tuition German universities.
- **Chevening Scholarship (UK):** fully funded 1-year master's degree in the United Kingdom.
- **Erasmus Mundus Joint Master Degrees:** zero tuition + about 1,400 EUR monthly stipend across multiple EU countries.` : "- **University Departmental Assistantships (RA/TA):** inquire directly with program directors for 50-100% tuition waivers in exchange for 10-20 hours per week of teaching or lab research."}

### Actionable 6-Month Timeline
- **Months 1-2:** finalize the SOP outline, request 3 LORs, and start transcript WES evaluation.
- **Months 3-4:** submit priority university applications and Fulbright/Chevening scholarship files.
- **Months 5-6:** prepare financial proof documents (blocked account / bank balance certificate) and schedule the visa embassy appointment.`);
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
