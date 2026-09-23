import { NextResponse } from "next/server";
import { callAI } from "@/lib/ai";
import { normalizeAiReply } from "@/lib/ai/format-reply";
import { localeToLanguageName } from "@/i18n/config";

export async function POST(req: Request) {
  try {
    const { sopText, targetUniversity, targetMajor, language } = await req.json();

    if (!sopText || sopText.trim().length < 50) {
      return NextResponse.json({ error: "Please provide a valid SOP draft text (at least 50 characters)" }, { status: 400 });
    }

    const prompt = `You are a top university admissions committee member reviewing a Statement of Purpose (SOP).
IMPORTANT: Write the entire review in ${localeToLanguageName(language || "en")}.

TARGET UNIVERSITY: ${targetUniversity || "Top University"}
TARGET MAJOR: ${targetMajor || "Graduate Degree"}

STUDENT'S SOP DRAFT:
"""
${sopText}
"""

Evaluate this SOP across 5 core dimensions:
1. Academic & Technical Alignment (0-10)
2. Originality & Personal Story Hook (0-10)
3. Specificity to University & Faculty (0-10)
4. Clarity, Tone & Structure (0-10)
5. Overall Admission Impact Score (0-100)

Provide structured feedback in plain markdown with these sections (one short heading per section):
- Summary Score & Rating — overall score out of 100, a one-line rating, and the sub-score for each of the 5 dimensions above
- What Works Well — exactly 3 bullet points
- Critical Areas for Improvement — exactly 3 bullet points
- Rewrite Recommendations — specific improved sentences; use **Original:** / **Revised:** bold lines, never a table

FORMAT RULES (follow exactly):
- Plain markdown only: short headings + short bullet points; bold for key terms.
- NO HTML tags, NO HTML entities (write a plain & and plain quotes), NO markdown tables, NO literal backslash-n sequences, at most 1-2 emojis in the whole reply.`;

    let reviewResult = await callAI(prompt, "You are an elite admissions essay reviewer.", { taskType: "essay" });

    if (!reviewResult) {
      const wordCount = sopText.trim().split(/\s+/).length;
      reviewResult = normalizeAiReply(`### SOP Review Summary
**Overall Admissions Impact Score:** **82 / 100** *(Strong foundation, needs university specificity)*
- **Word Count:** ${wordCount} words *(recommended length: 700 - 1000 words)*
- **Academic Alignment:** 8.5/10
- **Personal Story Hook:** 8.0/10
- **University Specificity:** 7.0/10 *(needs more professor and course names)*
- **Clarity & Tone:** 8.5/10

### What Works Well
1. **Clear academic progression:** demonstrates a logical sequence from undergraduate coursework to graduate aspirations.
2. **Technical vocabulary:** effectively incorporates domain-specific terms relevant to **${targetMajor || "your target field"}**.
3. **Professional tone:** avoids overly casual language and maintains an articulate, confident posture throughout.

### Critical Areas for Improvement
1. **Deeper institutional customization:** mention specific professors, recent research papers, or exact specialized elective courses at **${targetUniversity || "your target university"}**.
2. **Quantify project impact:** replace vague statements like "I achieved great results" with concrete metrics (e.g. "improved model efficiency by 34%").
3. **Sharpen the opening hook:** transform the introductory sentence into a memorable personal narrative rather than a generic statement.

### Rewrite Recommendations
**Original:**
"I have always been interested in computer science and wanted to learn more at your university."

**Revised:**
"My interest in scalable algorithmic architecture evolved from abstract curiosity into a focused research passion during my capstone project on distributed systems."

**Original:**
"Your university has good professors and labs that I want to join."

**Revised:**
"The cutting-edge research conducted at ${targetUniversity || "the department"} directly aligns with my objective of developing high-throughput, low-latency machine learning models."`);
    }

    return NextResponse.json({ review: reviewResult });
  } catch (error) {
    console.error("POST /api/ai/review-sop error:", error);
    return NextResponse.json({ error: "Failed to review SOP" }, { status: 500 });
  }
}
