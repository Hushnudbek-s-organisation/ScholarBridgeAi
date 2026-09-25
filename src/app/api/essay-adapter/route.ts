import { NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { essayVersions, savedScholarships, scholarships, studentProfiles } from "@/db/schema";
import { requireProfileAccess } from "@/lib/auth";
import {
  adaptationPlan,
  scoreEssayFit,
  wordCountOf,
  type AdapterProfile,
  type EssayInput,
  type ScholarshipInput,
} from "@/lib/essayAdapter";

export const dynamic = "force-dynamic";

function toAdapterProfile(row: typeof studentProfiles.$inferSelect): AdapterProfile {
  return {
    major: row.targetMajor,
    country: row.country,
    gpa: row.gpa,
    gpaScale: row.gpaScale,
    ieltsScore: row.ieltsScore,
    toeflScore: row.toeflScore,
  };
}

function toScholarshipInput(row: typeof scholarships.$inferSelect): ScholarshipInput {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    requirements: row.requirements,
    eligibleMajors: row.eligibleMajors,
    financialNeedBased: row.financialNeedBased,
    minGpa: row.minGpa,
    minIelts: row.minIelts,
    eligibleCountries: row.eligibleCountries,
  };
}

/**
 * #18 Scholarship essay adapter — score ONE essay against MANY scholarships.
 *
 * POST { essayText?, essayVersionId?, scholarshipIds? }
 *  - essay: explicit text (≥50 chars) or one of the profile's own saved
 *    versions (never another student's — the ownership check is in the WHERE)
 *  - scholarships: explicit ids (1–10), otherwise the profile's saved list
 */
export async function POST(req: Request) {
  try {
    const access = await requireProfileAccess(req, undefined);
    if (!access.ok) {
      return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
    }
    const profileId = access.targetId!;
    let body: Record<string, any>;
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const rows = await db.select().from(studentProfiles).where(eq(studentProfiles.id, profileId)).limit(1);
    const row = rows[0];
    if (!row) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    const ap = toAdapterProfile(row);

    // ---- resolve the essay -------------------------------------------------
    let essay: EssayInput;
    let source: "version" | "text" | "latest";
    let versionNumber: number | null = null;

    const versionId = Number(body.essayVersionId ?? NaN);
    if (Number.isInteger(versionId) && versionId > 0) {
      const v = await db
        .select()
        .from(essayVersions)
        .where(and(eq(essayVersions.id, versionId), eq(essayVersions.profileId, profileId)))
        .limit(1);
      if (!v.length) return NextResponse.json({ error: "Essay version not found" }, { status: 404 });
      essay = { text: v[0].content, wordCount: v[0].wordCount };
      source = "version";
      versionNumber = v[0].versionNumber;
    } else if (typeof body.essayText === "string" && body.essayText.trim().length >= 50) {
      essay = { text: body.essayText };
      source = "text";
    } else {
      const latest = await db
        .select()
        .from(essayVersions)
        .where(eq(essayVersions.profileId, profileId))
        .orderBy(desc(essayVersions.versionNumber), desc(essayVersions.id))
        .limit(1);
      if (!latest.length) {
        return NextResponse.json({ error: "No essay found — write one in AI SOP & Essays first" }, { status: 400 });
      }
      essay = { text: latest[0].content, wordCount: latest[0].wordCount };
      source = "latest";
      versionNumber = latest[0].versionNumber;
    }

    // ---- resolve the scholarships ------------------------------------------
    let shRows: typeof scholarships.$inferSelect[];
    const ids = Array.isArray(body.scholarshipIds)
      ? body.scholarshipIds.map(Number).filter((n: number) => Number.isInteger(n) && n > 0).slice(0, 10)
      : [];
    if (ids.length) {
      shRows = await db.select().from(scholarships).where(inArray(scholarships.id, ids));
    } else {
      const saved = await db
        .select({ scholarshipId: savedScholarships.scholarshipId })
        .from(savedScholarships)
        .where(eq(savedScholarships.profileId, profileId));
      if (!saved.length) {
        return NextResponse.json({ error: "Save scholarships first, or pass scholarshipIds" }, { status: 400 });
      }
      shRows = await db
        .select()
        .from(scholarships)
        .where(inArray(scholarships.id, saved.map((s) => s.scholarshipId)));
    }
    if (!shRows.length) return NextResponse.json({ error: "Scholarships not found" }, { status: 404 });

    // ---- score --------------------------------------------------------------
    const matches = shRows
      .map((sh) => {
        const input = toScholarshipInput(sh);
        const fit = scoreEssayFit(essay, input, ap);
        return { ...fit, plan: adaptationPlan(fit, input, essay) };
      })
      .sort((a, b) => b.fit - a.fit || a.scholarshipId - b.scholarshipId);

    return NextResponse.json({
      essay: { source, versionNumber, wordCount: wordCountOf(essay) },
      matches,
    });
  } catch {
    return NextResponse.json({ error: "Failed to score essay fit" }, { status: 500 });
  }
}
