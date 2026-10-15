import { NextResponse } from "next/server";
import { callAI } from "@/lib/ai";
import { guardAiRequest } from "@/lib/ai/guard";
import {
  EMPTY_EXTRACTED_FACTS,
  MAX_EXTRACT_CHARS,
  detectedFieldKeys,
  extractDeterministicProfileFacts,
  verifyExtractedNumbersInSource,
  type ExtractedFacts,
} from "@/lib/profileExtractor";

/**
 * POST /api/ai/extract-profile — Pillar 5.2 ("10-second smart onboarding").
 *
 * Input: `{ text, profileId? }` — a pasted CV / transcript / IELTS score report
 * (extraction happens in the browser for PDFs; this endpoint receives text).
 * Output: candidate profile fields the student reviews and confirms.
 *
 * HONESTY RULE: every number in the answer must appear verbatim in the pasted
 * text (`verifyExtractedNumbersInSource`). A model that hallucinates a GPA
 * loses that field and the response reports which fields were stripped.
 *
 * The endpoint never writes to the profile: only the normal profile PATCH does,
 * after the student ticks the fields they accept.
 */

const STRING_FIELDS = [
  "fullName",
  "email",
  "phone",
  "country",
  "degreeLevel",
  "targetMajor",
] as const;

const ARRAY_FIELDS = ["leadership", "awards", "extracurriculars"] as const;

const RANGES: Record<string, [number, number]> = {
  gpa: [0, 100],
  gpaScale: [0, 100],
  ieltsScore: [4, 9],
  toeflScore: [0, 120],
  satScore: [400, 1600],
  greScore: [260, 340],
  gmatScore: [200, 800],
  duolingoScore: [10, 160],
  researchPublications: [0, 99],
  budgetAnnualUsd: [0, 1_000_000],
};

const scrub = (value: unknown, max = 120): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/\s+/g, " ").trim().slice(0, max);
  return trimmed.length >= 2 ? trimmed : null;
};

/**
 * Validate a model answer. Unknown keys are dropped, numbers must be finite
 * and inside their real-world range, and the object is rebuilt from scratch so
 * nothing can ride along into the response.
 */
function normalizeAiFacts(raw: unknown): Partial<ExtractedFacts> {
  if (!raw || typeof raw !== "object") return {};
  const input = raw as Record<string, unknown>;
  const out: Partial<ExtractedFacts> = {};
  for (const key of STRING_FIELDS) {
    const value = scrub(input[key], key === "fullName" ? 80 : 120);
    if (value) out[key] = value;
  }
  for (const [key, [min, max]] of Object.entries(RANGES)) {
    const n = Number(input[key]);
    if (Number.isFinite(n) && n >= min && n <= max) {
      (out as Record<string, number>)[key] = key === "gpa" || key === "gpaScale" ? Math.round(n * 100) / 100 : n;
    }
  }
  for (const key of ARRAY_FIELDS) {
    const value = input[key];
    if (Array.isArray(value)) {
      out[key] = value.map((v) => scrub(v, 200)).filter((v): v is string => Boolean(v)).slice(0, 8);
    }
  }
  return out;
}

export async function POST(req: Request) {
  try {
    const guarded = await guardAiRequest(req, { bodyLimit: 256 * 1024, feature: "ai_general" });
    if (!guarded.ok) return guarded.response;

    const text = typeof guarded.body.text === "string" ? guarded.body.text.slice(0, MAX_EXTRACT_CHARS) : "";
    if (text.trim().length < 20) {
      return NextResponse.json({ error: "Paste at least a few lines of your CV, transcript or score report." }, { status: 400 });
    }

    // Stage 1 — deterministic regexes (always run; also the offline fallback).
    const deterministic = extractDeterministicProfileFacts(text);

    // Stage 2 — optional AI pass for the fields regexes cannot see.
    let aiUsed = false;
    let merged: ExtractedFacts = deterministic;
    const prompt = `Extract structured profile facts from the text below. Return ONLY a JSON object with these keys (omit any key you cannot support with text from the source): fullName, country, degreeLevel (Bachelor|Master|PhD), targetMajor, gpa, gpaScale, ieltsScore, toeflScore, satScore, greScore, gmatScore, duolingoScore, researchPublications, leadership (array of short strings), awards (array), extracurriculars (array).

ABSOLUTE RULES:
1. Every number you return MUST appear verbatim in the source text. Never convert, round, estimate or infer a score, GPA or scale.
2. Never invent a name, an award, a publication count or a country.
3. Keep leadership/awards/extracurriculars to lines the source actually contains (max 8 items, each under 200 characters).
4. No commentary, no markdown, JSON only.

SOURCE TEXT:
"""
${text.slice(0, 12_000)}
"""`;

    try {
      const raw = await callAI(prompt, "You extract facts from documents and never invent data.", {
        taskType: "general",
        profileId: guarded.usageProfileId,
      });
      if (raw) {
        const jsonText = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
        if (jsonText.startsWith("{") && jsonText.endsWith("}")) {
          const parsed = JSON.parse(jsonText) as unknown;
          const aiFacts = normalizeAiFacts(parsed);
          if (Object.keys(aiFacts).length > 0) {
            aiUsed = true;
            merged = { ...deterministic };
            for (const [key, value] of Object.entries(aiFacts)) {
              const k = key as keyof ExtractedFacts;
              const current = merged[k];
              const empty = current == null || (Array.isArray(current) && current.length === 0);
              if (empty) (merged as unknown as Record<string, unknown>)[k] = value;
            }
          }
        }
      }
    } catch (error) {
      // AI unavailable or returned unusable JSON → the deterministic pass stands.
      console.warn("extract-profile: AI pass skipped:", error instanceof Error ? error.message : error);
    }

    // Stage 3 — strict honesty filter on every numeric field.
    const { facts, stripped } = verifyExtractedNumbersInSource(text, merged);

    return NextResponse.json({
      facts: facts ?? { ...EMPTY_EXTRACTED_FACTS },
      detected: detectedFieldKeys(facts),
      stripped,
      aiUsed,
    });
  } catch (error) {
    console.error("POST /api/ai/extract-profile error:", error);
    return NextResponse.json({ error: "Failed to extract profile facts" }, { status: 500 });
  }
}
