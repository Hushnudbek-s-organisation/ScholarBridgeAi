import { NextResponse } from "next/server";
import { db } from "@/db";
import { studentProfiles } from "@/db/schema";
import { callAI } from "@/lib/ai";
import { normalizeAiReply } from "@/lib/ai/format-reply";
import { guardAiRequest, safePromptFields } from "@/lib/ai/guard";
import { eq } from "drizzle-orm";
import { localeToLanguageName } from "@/i18n/config";

export async function POST(req: Request) {
  try {
    // Size cap + rate limit + ownership of `profileId` (see lib/ai/guard).
    const guarded = await guardAiRequest(req);
    if (!guarded.ok) return guarded.response;

    const profileId = guarded.profileId;
    const { universityName, programName, personalHook, careerGoals } = safePromptFields(guarded.body);

    if (!profileId) {
      return NextResponse.json({ error: "profileId is required" }, { status: 400 });
    }

    const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, profileId));

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const targetUni = universityName || "Target University";
    const targetProg = programName || profile.targetMajor;
    const langName = localeToLanguageName(profile.preferredLocale || "en");

    const prompt = `Write a compelling, academic Statement of Purpose (SOP) draft for an applicant applying to ${targetUni} for the ${targetProg} program.

ABSOLUTE LANGUAGE REQUIREMENT:
- Write the ENTIRE SOP in ${langName}.
- Every single sentence must be in ${langName}. Do NOT mix other languages, do NOT insert random foreign words, do NOT switch to another script, and do NOT produce gibberish or placeholder text.
- If a detail is unknown, write a natural, generic ${langName} sentence instead of random words.
- Use clean, professional academic prose in ${langName} from the first word to the last.

APPLICANT INFO:
- Name: ${profile.name}
- Target Program: ${targetProg} at ${targetUni}
- GPA: ${profile.gpa} / ${profile.gpaScale}
- Test Scores: IELTS (${profile.ieltsScore ?? "7.5"}), GRE (${profile.greScore ?? "315"})
- Key Background & Projects: ${profile.extracurriculars || "Academic research and hands-on coursework"}
- Work Experience: ${profile.workExperienceYears || 0} years
- Research Publications: ${profile.researchPublications || 0}
- Personal Hook/Inspiration: ${personalHook || "Driven by real-world technology challenges and a desire to build high-impact scalable systems."}
- Long-term Career Goals: ${careerGoals || "To become an R&D engineer / research leader advancing state-of-the-art technological solutions."}

FORMAT RULES (follow exactly) — the draft is an ESSAY, not a report:
- Write exactly 5 flowing academic paragraphs in continuous prose, separated by a single blank line.
- Cover these themes in order: (1) executive hook and intellectual awakening, (2) academic foundations and technical mastery, (3) practical projects, research and professional impact, (4) why ${targetUni} — specific faculty, labs and curriculum fit, (5) long-term vision and post-graduation impact.
- NO markdown headings (no #), NO bold, NO bullets or numbered lists, NO markdown tables, NO HTML, NO emoji, NO horizontal rules.
- If a short paragraph title is truly needed, write it as a plain text line without any special characters (a title may stay in English; every other word MUST be in ${langName}).`;

    let sopContent = await callAI(
      prompt,
      `You are an expert SOP editor and academic writing mentor. You ALWAYS write in the language requested by the user (${langName}), with perfect grammar, natural academic style, and zero code-switching or gibberish.`,
      { taskType: "essay", profileId }
    );

    if (!sopContent) {
      // Fallback essay — plain 5 paragraphs (no markdown headings/bold/bullets),
      // normalized so it matches the style of a live AI draft.
      sopContent = normalizeAiReply(`Statement of Purpose

Candidate: ${profile.name} — ${targetProg}, ${targetUni}

${personalHook || "My fascination with technology began when I realized how computational models can transform abstract data into solutions for complex human challenges."} Having pursued rigorous academic training in ${profile.targetMajor}, I have developed a steadfast ambition to solve pressing engineering challenges at the intersection of scale, performance, and real-world applicability. Applying to the ${targetProg} at ${targetUni} represents the natural and necessary next step in my journey toward technical leadership and academic excellence.

Throughout my undergraduate study, I maintained a GPA of ${profile.gpa}/${profile.gpaScale}, taking advanced coursework in algorithms, machine learning, systems architecture, and mathematical modeling. ${profile.ieltsScore ? `My language proficiency (IELTS ${profile.ieltsScore})` : "My technical communications skills"} allowed me to collaborate effectively in team projects, dissect research literature, and present original code implementations. My coursework provided me with a firm theoretical foundation and the discipline needed to tackle complex problem sets.

Complementing my academic record is hands-on exposure to practical engineering. ${profile.extracurriculars ? `I actively contributed to key initiatives including ${profile.extracurriculars}.` : "I led team software development projects focusing on cloud architecture and predictive modeling."} ${profile.workExperienceYears ? `Furthermore, my ${profile.workExperienceYears} year(s) of professional experience taught me industry best practices, continuous integration, and production-grade deployment.` : ""} ${profile.researchPublications ? `Additionally, authoring ${profile.researchPublications} research paper(s) honed my empirical experimentation skills and thesis writing.` : ""} These experiences solidified my ability to translate abstract algorithms into impactful solutions.

${targetUni} stands out as my premier choice due to its world-class faculty, collaborative culture, and cutting-edge research facilities in ${targetProg}. I am particularly eager to engage with ongoing research in department laboratories, leverage the state-of-the-art computing infrastructure, and learn directly from pioneering professors. The program's flexible yet rigorous curriculum directly matches my goal of deepening my research acumen while developing practical leadership skills.

Upon completing my degree at ${targetUni}, ${careerGoals || "I intend to work as a Senior Solutions Specialist and Lead Researcher, spearheading innovation in next-generation technological infrastructure."} In the long run, I aim to bridge international academic research with industry applications, creating sustainable, open-access technological solutions. The education and global perspective I will gain at ${targetUni} will be foundational to achieving this vision.`);
    }

    return NextResponse.json({ sopDraft: sopContent });
  } catch (error) {
    console.error("POST /api/ai/draft-sop error:", error);
    return NextResponse.json({ error: "Failed to generate SOP draft" }, { status: 500 });
  }
}
