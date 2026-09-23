import { NextResponse } from "next/server";
import { db } from "@/db";
import { studentProfiles } from "@/db/schema";
import { callAI } from "@/lib/ai";
import { normalizeAiReply } from "@/lib/ai/format-reply";
import { eq } from "drizzle-orm";
import { localeToLanguageName } from "@/i18n/config";

export async function POST(req: Request) {
  try {
    const { message, profileId, chatHistory } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    let profileContext = "";
    let languageInstruction = "";
    if (profileId) {
      const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, profileId));
      if (profile) {
        languageInstruction = `IMPORTANT: Respond to the student entirely in ${localeToLanguageName(profile.preferredLocale || "en")}. Keep the technical terms where they are clearer, but write your explanation in the student's language.\n`;
        profileContext = `STUDENT CONTEXT:
- Name: ${profile.name}
- Target Level: ${profile.degreeLevel}
- Target Major: ${profile.targetMajor}
- GPA: ${profile.gpa}/${profile.gpaScale}
- IELTS/TOEFL: ${profile.ieltsScore || profile.toeflScore || "Not set"}
- Budget: $${profile.budgetAnnualUsd}/year
- Countries: ${profile.preferredCountries}
- Scholarship needed: ${profile.needScholarship ? "Yes" : "No"}`;
      }
    }

    const systemInstruction = `${languageInstruction}You are ScholarBridgeAI, an expert, encouraging, and knowledgeable study-abroad counselor.
You guide students on international university selection, scholarships (Fulbright, Chevening, DAAD, Erasmus, etc.), SOP writing, LOR requests, IELTS/GRE strategy, post-study work visas (OPT, PGWP, UK Graduate Visa, Germany Job Seeker), and financial proof.
Be concise and practical.
FORMAT RULES (follow exactly):
- Plain markdown only: one short heading (## or ###), bold for key terms, short bullet points.
- NO HTML tags, NO HTML entities (write a plain & and plain quotes), NO markdown tables, NO literal backslash-n sequences.
- At most 1-2 emojis in the whole reply.
${profileContext}`;

    let historyText = "";
    if (Array.isArray(chatHistory) && chatHistory.length > 0) {
      historyText = chatHistory
        .slice(-6)
        .map((h: { sender: string; text: string }) => `${h.sender === "user" ? "User" : "ScholarBridgeAI"}: ${h.text}`)
        .join("\n");
    }

    const fullPrompt = `${historyText ? "CONVERSATION HISTORY:\n" + historyText + "\n\n" : ""}User Question: ${message}`;

    let reply = await callAI(fullPrompt, systemInstruction, { taskType: "general", profileId: profileId ?? null });

    if (!reply) {
      // Intelligent fallback responses based on query topic.
      // Same style as the FORMAT RULES: short heading + bullets, at most
      // 1-2 emojis, no tables / HTML / entities. Each fallback is passed
      // through normalizeAiReply so it is byte-identical to a live reply.
      const queryLower = message.toLowerCase();

      let fallback: string;
      if (queryLower.includes("visa") || queryLower.includes("work permit") || queryLower.includes("opt") || queryLower.includes("pgwp")) {
        fallback = `### Post-Study Work Visas: Top Destinations

How the main study destinations compare on post-graduation work:

- **Canada (PGWP):** up to 3 years of work permit after a 2-year degree, with direct points toward permanent residency.
- **United States (OPT / STEM OPT):** 1 year of standard OPT plus a 2-year STEM extension (3 years total for STEM majors).
- **United Kingdom (Graduate Route):** 2 years post-study work for bachelor's and master's graduates, 3 years for PhD.
- **Germany (Job Seeker Visa):** 18 months to find a job in your field, with fast-track permanent residency.
- **Australia (Subclass 485):** 2 to 4 years depending on degree level and location.

**Pro tip:** if applying to the US, make sure your major is officially classified as STEM (science, tech, engineering, math).`;
      } else if (queryLower.includes("scholarship") || queryLower.includes("funding") || queryLower.includes("tuition")) {
        fallback = `### High-Value Scholarships for International Students

Top fully-funded options for an international profile like yours:

- **Fulbright Foreign Student Program (US):** full tuition, monthly stipend, health insurance, and round-trip airfare.
- **Chevening Scholarship (UK):** fully funded 1-year master's, including fees, living stipend, and travel.
- **DAAD EPOS / TUM Merit Grants (Germany):** full tuition plus a 934–1,200 EUR monthly allowance.
- **Erasmus Mundus Joint Master (EU):** zero tuition plus about 1,400 EUR per month across multiple countries.
- **MEXT (Japan):** 100% tuition coverage, 144,000 JPY monthly stipend, and flight allowance.

**Key deadline:** most government scholarship portals close 6–9 months before the intake starts.`;
      } else if (queryLower.includes("sop") || queryLower.includes("essay") || queryLower.includes("statement")) {
        fallback = `### Winning SOP Structure (5-Step Framework)

A Statement of Purpose that stands out to admissions committees:

1. **Hook (10%):** open with a specific problem or real challenge that sparked your interest in the field.
2. **Academics (25%):** core courses, strong grades, and the key concepts you mastered.
3. **Projects & Impact (30%):** hands-on work with concrete metrics and clear problem-solving.
4. **Why This University (20%):** name specific faculty, labs, and 2 exact elective modules.
5. **Future Vision (15%):** your 3-year and 10-year career goals.

Need a draft? Use the **AI SOP Assistant** in the main menu.`;
      } else {
        fallback = `### ScholarBridgeAI Guidance

Thank you for your question regarding **"${message}"**.

Action items to keep in mind:

1. **Profile calibration:** make sure your GPA, test scores, and budget match your target university cutoffs.
2. **Documents:** official transcripts, 2–3 recommendation letters (LORs), and an updated CV.
3. **Deadlines:** fall intake applications usually open in September and close between December and March.

You can compare tuition and acceptance rates in the **University Explorer**, or run the **AI Profile Evaluator** for a full readiness breakdown.`;
      }
      reply = normalizeAiReply(fallback);
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("POST /api/ai/chat error:", error);
    return NextResponse.json({ error: "Failed to process chat message" }, { status: 500 });
  }
}
