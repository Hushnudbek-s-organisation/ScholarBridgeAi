import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { essayVersions, scholarships, studentProfiles } from "@/db/schema";
import { guardAiRequest } from "@/lib/ai/guard";
import { callAI } from "@/lib/ai";
import { normalizeAiReply } from "@/lib/ai/format-reply";
import { clampPrompt } from "@/lib/request";
import {
  adaptationPlan,
  scoreEssayFit,
  type AdapterProfile,
  type EssayInput,
  type ScholarshipInput,
} from "@/lib/essayAdapter";

/**
 * #18 — AI half of the scholarship essay adapter.
 *
 * POST { essayText? | essayVersionId?, scholarshipId }
 *
 * The deterministic fit + plan are ALWAYS computed and returned. The AI
 * rewrite is a bonus layered on top: when the model is unavailable the
 * response carries `adapted: null` with `source: "fallback"` — the client
 * then shows the plan instead of pretending nothing happened.
 */
export async function POST(req: Request) {
  try {
    const guarded = await guardAiRequest(req, { bodyLimit: 256 * 1024 });
    if (!guarded.ok) return guarded.response;

    const profileId = guarded.profileId;
    if (!profileId) return NextResponse.json({ error: "Sign in to adapt your essay" }, { status: 401 });

    const rows = await db.select().from(studentProfiles).where(eq(studentProfiles.id, profileId)).limit(1);
    const row = rows[0];
    if (!row) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const body = guarded.body;
    const scholarshipId = Number(body?.scholarshipId ?? NaN);
    if (!Number.isInteger(scholarshipId) || scholarshipId <= 0) {
      return NextResponse.json({ error: "scholarshipId is required" }, { status: 400 });
    }
    const shRows = await db.select().from(scholarships).where(eq(scholarships.id, scholarshipId)).limit(1);
    const shRow = shRows[0];
    if (!shRow) return NextResponse.json({ error: "Scholarship not found" }, { status: 404 });

    // Resolve the essay — explicit only (no "latest" guess on a paid call).
    let essay: EssayInput;
    const versionId = Number(body?.essayVersionId ?? NaN);
    if (Number.isInteger(versionId) && versionId > 0) {
      const v = await db
        .select()
        .from(essayVersions)
        .where(and(eq(essayVersions.id, versionId), eq(essayVersions.profileId, profileId)))
        .limit(1);
      if (!v.length) return NextResponse.json({ error: "Essay version not found" }, { status: 404 });
      essay = { text: v[0].content, wordCount: v[0].wordCount };
    } else if (typeof body?.essayText === "string" && body.essayText.trim().length >= 50) {
      essay = { text: clampPrompt(body.essayText, 20_000) };
    } else {
      return NextResponse.json(
        { error: "Provide essayText (at least 50 characters) or essayVersionId" },
        { status: 400 }
      );
    }

    const sh: ScholarshipInput = {
      id: shRow.id,
      title: shRow.title,
      description: shRow.description,
      requirements: shRow.requirements,
      eligibleMajors: shRow.eligibleMajors,
      financialNeedBased: shRow.financialNeedBased,
      minGpa: shRow.minGpa,
      minIelts: shRow.minIelts,
      eligibleCountries: shRow.eligibleCountries,
    };
    const ap: AdapterProfile = {
      major: row.targetMajor,
      country: row.country,
      gpa: row.gpa,
      gpaScale: row.gpaScale,
      ieltsScore: row.ieltsScore,
      toeflScore: row.toeflScore,
    };
    const fit = scoreEssayFit(essay, sh, ap);
    const plan = adaptationPlan(fit, sh, essay);

    const prompt = `You are an expert scholarship application editor. Adapt the student's essay for this specific scholarship so it answers what the scholarship asks for, while keeping the student's real facts and voice. NEVER invent facts, awards, numbers or experiences that are not already in the text.

SCHOLARSHIP: ${shRow.title}
SCHOLARSHIP FOCUS: ${shRow.description?.slice(0, 600) || "—"}
REQUIREMENTS: ${shRow.requirements?.slice(0, 600) || "—"}
FIT ANALYSIS — keep the strengths, close the gaps:
STRENGTHS: ${fit.matched.join("; ") || "—"}
GAPS TO CLOSE: ${fit.gaps.join("; ") || "—"}

STUDENT'S ESSAY:
"""
${essay.text.slice(0, 12_000)}
"""

Rewrite the essay: same language, same length ±15%, first person. Output the adapted essay as plain text only — no headings, no commentary, no markdown.`;

    const adapted = await callAI(prompt, "You are an elite admissions essay editor.", { taskType: "essay" });
    if (!adapted) {
      // Honest fallback: the deterministic plan is still returned.
      return NextResponse.json({ fit, plan, adapted: null, source: "fallback" });
    }
    return NextResponse.json({ fit, plan, adapted: normalizeAiReply(adapted), source: "ai" });
  } catch {
    return NextResponse.json({ error: "Failed to adapt the essay" }, { status: 500 });
  }
}
