import { NextResponse } from "next/server";
import { requireProfileAccess, requireRowAccess } from "@/lib/auth";
import { db } from "@/db";
import { savedPrograms, universityPrograms, universities } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { positiveInt, readJsonBody } from "@/lib/request";

/**
 * Saved programs (spec §24 — program shortlist).
 *
 * A student shortlists universities AND specific programmes within them
 * ("8 Programs" in the shortlist). Minimal by design: profile ↔ program,
 * with the programme + university joined in for display.
 */

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const profileIdStr = searchParams.get("profileId");
    if (!profileIdStr) {
      return NextResponse.json({ error: "profileId is required" }, { status: 400 });
    }

    const profileId = positiveInt(profileIdStr);
    if (!profileId) {
      return NextResponse.json({ error: "profileId must be a positive integer" }, { status: 400 });
    }
    const access = await requireProfileAccess(req, profileId);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      );
    }

    const saved = await db
      .select({
        id: savedPrograms.id,
        profileId: savedPrograms.profileId,
        programId: savedPrograms.programId,
        createdAt: savedPrograms.createdAt,
        program: universityPrograms,
        university: universities,
      })
      .from(savedPrograms)
      .innerJoin(universityPrograms, eq(savedPrograms.programId, universityPrograms.id))
      .innerJoin(universities, eq(universityPrograms.universityId, universities.id))
      .where(eq(savedPrograms.profileId, profileId));

    return NextResponse.json({
      savedPrograms: saved,
      count: saved.length,
    });
  } catch (error) {
    console.error("GET /api/saved-programs error:", error);
    return NextResponse.json({ error: "Failed to fetch saved programs" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const parsed = await readJsonBody<Record<string, unknown>>(req, 8 * 1024);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error, code: parsed.code }, { status: parsed.status });
    }
    const profileId = positiveInt(parsed.body.profileId);
    const programId = positiveInt(parsed.body.programId);

    if (!profileId || !programId) {
      return NextResponse.json({ error: "profileId and programId must be positive integers" }, { status: 400 });
    }

    const access = await requireProfileAccess(req, profileId);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      );
    }

    // The programme must exist — never shortlist a phantom id.
    const [program] = await db
      .select()
      .from(universityPrograms)
      .where(eq(universityPrograms.id, programId));
    if (!program) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }

    const existing = await db
      .select()
      .from(savedPrograms)
      .where(
        and(
          eq(savedPrograms.profileId, profileId),
          eq(savedPrograms.programId, programId)
        )
      );

    if (existing.length > 0) {
      return NextResponse.json({ saved: existing[0], message: "Already saved" });
    }

    const [newSaved] = await db
      .insert(savedPrograms)
      .values({ profileId, programId })
      .returning();

    return NextResponse.json({ saved: newSaved });
  } catch (error) {
    console.error("POST /api/saved-programs error:", error);
    return NextResponse.json({ error: "Failed to save program" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (!idStr) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const id = positiveInt(idStr);
    if (!id) {
      return NextResponse.json({ error: "id must be a positive integer" }, { status: 400 });
    }

    // Row ids are guessable — confirm the row belongs to the caller.
    const [target] = await db.select().from(savedPrograms).where(eq(savedPrograms.id, id));
    if (!target) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const rowAccess = await requireRowAccess(req, target);
    if (!rowAccess.ok) {
      return NextResponse.json(
        { error: rowAccess.error, code: rowAccess.code },
        { status: rowAccess.status }
      );
    }

    await db.delete(savedPrograms).where(eq(savedPrograms.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/saved-programs error:", error);
    return NextResponse.json({ error: "Failed to delete saved program" }, { status: 500 });
  }
}
