import { NextResponse } from "next/server";
import { db } from "@/db";
import { studentProfiles } from "@/db/schema";
import { callAI } from "@/lib/ai";
import { normalizeAiReply } from "@/lib/ai/format-reply";
import { guardAiRequest, safePromptFields } from "@/lib/ai/guard";
import { clampArray, clampString } from "@/lib/request";
import { eq } from "drizzle-orm";
import { localeToLanguageName } from "@/i18n/config";

export async function POST(req: Request) {
  try {
    // Size cap + rate limit + ownership of `profileId` (see lib/ai/guard).
    const guarded = await guardAiRequest(req);
    if (!guarded.ok) return guarded.response;

    const profileId = guarded.profileId;
    const message = safePromptFields(guarded.body).message;
    // Only the last 6 turns are used — cap the array and every entry too.
    const chatHistory = clampArray<{ sender?: unknown; text?: unknown }>(
      guarded.body.chatHistory,
      12
    )
      .slice(-6)
      .map((h) => ({
        sender: h?.sender === "user" ? "user" : "assistant",
        text: clampString(h?.text, 4000),
      }));

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
- Budget: ${profile.budgetAnnualUsd == null ? "Not set" : "$" + profile.budgetAnnualUsd.toLocaleString("en-US") + "/year"}
- Financial aid needed: ${profile.needsFinancialAid === true || profile.needScholarship === true ? "Yes" : profile.needsFinancialAid === false ? "No (explicitly stated)" : "Not recorded"}
- Full scholarship required: ${profile.requiresFullScholarship === true ? "Yes" : profile.requiresFullScholarship === false ? "No (explicitly stated)" : "Not recorded"}
- Countries: ${profile.preferredCountries}
- Activities: ${[profile.extracurriculars, profile.leadership, profile.volunteering, profile.sports, profile.clubs, profile.researchExperience, profile.projects, profile.olympiads, profile.awards, profile.competitions, profile.certificates].filter(Boolean).join("; ") || "Not provided"}`;
      }
    }

    const systemInstruction = `${languageInstruction}You are ScholarBridgeAI, an expert, encouraging, and knowledgeable study-abroad counselor.
You guide students on international university selection, scholarships (Fulbright, Chevening, DAAD, Erasmus, etc.), SOP writing, LOR requests, IELTS/GRE strategy, post-study work visas (OPT, PGWP, UK Graduate Visa, Germany Job Seeker), and financial proof.
Be concise and practical. For affordability, use only an explicitly recorded annual budget or confirmed funding items; never treat household/family income as an available contribution or a substitute budget. Missing costs, unsupported currencies, eligibility facts, and deadlines must remain unknown rather than being guessed.
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

    let reply = await callAI(fullPrompt, systemInstruction, { taskType: "general", profileId: guarded.usageProfileId });
    // `offline` tells the client this is canned guidance, not a live model
    // answer, so it can be labelled honestly (the product promise is "no
    // invented facts" — an unlabelled template would quietly break that).
    const offline = !reply;

    if (!reply) {
      // Intelligent fallback responses based on query topic.
      // Same style as the FORMAT RULES: short heading + bullets, at most
      // 1-2 emojis, no tables / HTML / entities. Each fallback is passed
      // through normalizeAiReply so it is byte-identical to a live reply.
      const queryLower = message.toLowerCase();

      let fallback: string;
      if (queryLower.includes("visa") || queryLower.includes("work permit") || queryLower.includes("opt") || queryLower.includes("pgwp")) {
        fallback = `### Visa information needs an official source

The AI provider is offline, so ScholarBridge will not guess a visa duration, work right, eligibility rule, or route name. These rules change and depend on country, programme, nationality, and date.

- Open **Visa & Departure** and select your destination.
- Follow the linked government or embassy source.
- Check the source's last-verified date before acting.
- Add confirmed requirements to your plan; leave anything unpublished as unknown.

For a personal legal or immigration decision, contact the relevant authority or a qualified adviser.`;
      } else if (queryLower.includes("scholarship") || queryLower.includes("funding") || queryLower.includes("tuition")) {
        fallback = `### Funding information needs verified catalogue data

The AI provider is offline, so ScholarBridge will not invent scholarship names, award values, coverage, eligibility, or deadlines.

- Open **Scholarships → Browse scholarships** for catalogue entries with source links.
- Check **Recommended for you** for requirement-based matches, not award probabilities.
- Verify every amount and deadline on the official provider page.
- Add saved awards to **My Plan → Financial Plan**; unknown award chances remain unknown.

A saved or submitted scholarship is not secured funding until you record a confirmed award.`;
      } else if (queryLower.includes("sop") || queryLower.includes("essay") || queryLower.includes("statement")) {
        fallback = `### Continue with your verified application prompt

The AI provider is offline, so ScholarBridge will not invent a university prompt, word limit, faculty member, module, achievement, or personal story.

1. Copy the exact official prompt and word limit into **Application Materials → Essays**.
2. Build the draft only from facts already in your profile, activities, and projects.
3. Explain your preparation, relevant evidence, programme fit, and next goal in the order the prompt requires.
4. Mark missing programme details for verification instead of filling them with plausible text.
5. Use the deterministic rubric for structure and specificity; it is feedback, not an admission score.`;
      } else {
        fallback = `### ScholarBridge guidance is temporarily offline

No personalised answer was generated, so ScholarBridge will not replace it with invented requirements, dates, scores, or recommendations.

- Check your next verified task on **Dashboard**.
- Use **Explore** for sourced university and scholarship records.
- Use **My Plan** for tasks and confirmed deadlines.
- Use **Applications** for requirements tied to a real application.

Where a source or profile fact is missing, the platform should show it as unknown.`;
      }
      reply = normalizeAiReply(fallback);
    }

    return NextResponse.json({ reply, offline });
  } catch (error) {
    console.error("POST /api/ai/chat error:", error);
    return NextResponse.json({ error: "Failed to process chat message" }, { status: 500 });
  }
}
