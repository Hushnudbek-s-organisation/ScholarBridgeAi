import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { savedUniversities, studentProfiles, universities } from "@/db/schema";
import { guardStudent, jsonError, readBody, serverError } from "@/lib/journey/api";
import type { RequirementUniversity } from "@/lib/journey/requirements";
import { simulateScoreChange, type WhatIfChange } from "@/lib/whatIf";

export const dynamic = "force-dynamic";

/**
 * POST /api/what-if — Phase 2.3 "what-if" simulator.
 *
 * Body: { profileId, change: { gpa?, gpaScale?, ieltsScore?, toeflScore?, satScore?, duolingoScore? } }
 *
 * Re-runs the DETERMINISTIC requirement engine for the saved universities with
 * the hypothetical numbers and returns only the requirement items whose
 * verdict flips. It never returns a probability, a rank or a reach/match/safety
 * label, and it writes nothing.
 */

/** Bounds mirror the profile columns: an out-of-range value is dropped, not clamped. */
const BOUNDS: Record<keyof WhatIfChange, [number, number]> = {
  gpa: [0, 100],
  gpaScale: [0, 100],
  ieltsScore: [4, 9],
  toeflScore: [0, 120],
  satScore: [400, 1600],
  duolingoScore: [10, 160],
};

function sanitizeChange(raw: unknown): WhatIfChange {
  const out: WhatIfChange = {};
  if (!raw || typeof raw !== "object") return out;
  for (const key of Object.keys(BOUNDS) as (keyof WhatIfChange)[]) {
    const value = (raw as Record<string, unknown>)[key];
    if (value === null || value === undefined || value === "") continue;
    const n = Number(value);
    if (!Number.isFinite(n)) continue;
    const [min, max] = BOUNDS[key];
    if (n < min || n > max) continue;
    out[key] = n;
  }
  return out;
}

export async function POST(req: Request) {
  const b = await readBody(req);
  if (!b.ok) return b.response;
  const g = await guardStudent(req, b.value.profileId);
  if (!g.ok) return g.response;
  const { profileId } = g.value;

  const change = sanitizeChange(b.value.change);
  if (Object.keys(change).length === 0) {
    return jsonError(400, "change must set at least one score within its range", "bad_request");
  }

  try {
    const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, profileId)).limit(1);
    if (!profile) return jsonError(404, "Profile not found", "not_found");

    const rows = await db
      .select({
        id: universities.id,
        name: universities.name,
        minGpa: universities.minGpa,
        minIelts: universities.minIelts,
        minSat: universities.minSat,
        officialWebsiteUrl: universities.officialWebsiteUrl,
        admissionsUrl: universities.admissionsUrl,
        applicationUrl: universities.applicationUrl,
        sourceUrl: universities.sourceUrl,
        lastVerifiedAt: universities.lastVerifiedAt,
        verificationStatus: universities.verificationStatus,
      })
      .from(savedUniversities)
      .innerJoin(universities, eq(universities.id, savedUniversities.universityId))
      .where(eq(savedUniversities.profileId, profileId))
      .limit(60);

    const list: RequirementUniversity[] = rows.map((row) => ({
      id: row.id,
      name: row.name,
      minGpa: row.minGpa ?? null,
      minIelts: row.minIelts ?? null,
      minSat: row.minSat ?? null,
      officialWebsiteUrl: row.officialWebsiteUrl ?? null,
      admissionsUrl: row.admissionsUrl ?? null,
      applicationUrl: row.applicationUrl ?? null,
      sourceUrl: row.sourceUrl ?? null,
      lastVerifiedAt: row.lastVerifiedAt ?? null,
      verificationStatus: row.verificationStatus ?? null,
    }));

    const result = simulateScoreChange({
      universities: list,
      profile: {
        gpa: profile.gpa ?? null,
        gpaScale: profile.gpaScale ?? null,
        ieltsScore: profile.ieltsScore ?? null,
        toeflScore: profile.toeflScore ?? null,
        satScore: profile.satScore ?? null,
        duolingoScore: profile.duolingoScore ?? null,
      },
      change,
    });

    return NextResponse.json({
      ...result,
      /** Standing reminder the UI shows next to the diff. */
      honesty:
        "This compares published requirement numbers with your own. It is not a prediction: the university decides.",
    });
  } catch (err) {
    return serverError("what-if POST", err);
  }
}
