import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, applicationOutcomes, universities } from "@/db/schema";
import { requireProfileAccess, requireRowAccess } from "@/lib/auth";
import { clampString, positiveInt, readJsonBody } from "@/lib/request";

export const dynamic = "force-dynamic";

/** Valid lifecycle states of an application. */
export const APPLICATION_STATUSES = [
  "not_started",
  "preparing",
  "essay",
  "documents",
  "recommendations",
  "fee_paid",
  "submitted",
  "interview",
  "decision",
  "withdrawn",
] as const;

const ROUNDS = ["ED", "EA", "RD", "Rolling", "Winter", "Summer", "Spring"];

/**
 * GET /api/applications?profileId=N — the student's whole application list,
 * each row carrying its latest outcome so the tracker can show
 * "Submitted → Accepted" in one place.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const access = await requireProfileAccess(req, searchParams.get("profileId"));
    if (!access.ok) {
      return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
    }

    const rows = await db
      .select()
      .from(applications)
      .where(eq(applications.profileId, access.targetId!))
      .orderBy(desc(applications.deadline));

    const outcomes = await db
      .select()
      .from(applicationOutcomes)
      .where(eq(applicationOutcomes.profileId, access.targetId!))
      .orderBy(desc(applicationOutcomes.createdAt));

    const latestByApplication = new Map<number, (typeof outcomes)[number]>();
    for (const o of outcomes) {
      if (!latestByApplication.has(o.applicationId)) latestByApplication.set(o.applicationId, o);
    }

    return NextResponse.json({
      applications: rows.map((row) => ({
        ...row,
        outcome: latestByApplication.get(row.id) ?? null,
      })),
    });
  } catch (error) {
    console.error("GET /api/applications error:", error);
    return NextResponse.json({ error: "Failed to load applications" }, { status: 500 });
  }
}

/** POST /api/applications — add an application (university + round + deadline). */
export async function POST(req: Request) {
  try {
    const parsed = await readJsonBody<Record<string, any>>(req);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error, code: parsed.code }, { status: parsed.status });
    }
    const body = parsed.body;

    const access = await requireProfileAccess(req, body.profileId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
    }
    const profileId = access.targetId!;

    const universityId = positiveInt(body.universityId);
    let universityName = clampString(body.universityName, 200);

    if (!universityId && !universityName) {
      return NextResponse.json(
        { error: "universityId or universityName is required" },
        { status: 400 }
      );
    }
    if (universityId) {
      const [uni] = await db
        .select({ name: universities.name })
        .from(universities)
        .where(eq(universities.id, universityId));
      if (!uni) {
        return NextResponse.json({ error: "University not found" }, { status: 404 });
      }
      universityName = uni.name;
    }

    const round = ROUNDS.includes(String(body.applicationRound)) ? String(body.applicationRound) : null;
    const status = APPLICATION_STATUSES.includes(body.status) ? String(body.status) : "not_started";

    const [row] = await db
      .insert(applications)
      .values({
        profileId,
        universityId,
        universityName,
        programName: clampString(body.programName, 200) || null,
        applicationRound: round,
        intakeTerm: clampString(body.intakeTerm, 60) || null,
        deadline: /^\d{4}-\d{2}-\d{2}$/.test(String(body.deadline ?? "")) ? String(body.deadline) : null,
        status,
        applicationFeePaid: Boolean(body.applicationFeePaid),
        feeAmount: positiveInt(body.feeAmount),
        portalUrl: clampString(body.portalUrl, 500) || null,
        notes: clampString(body.notes, 2000) || null,
      })
      .returning();

    return NextResponse.json({ application: row, outcome: null });
  } catch (error) {
    console.error("POST /api/applications error:", error);
    return NextResponse.json({ error: "Failed to add application" }, { status: 500 });
  }
}

/** PATCH /api/applications — move an application through its lifecycle. */
export async function PATCH(req: Request) {
  try {
    const parsed = await readJsonBody<Record<string, any>>(req);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error, code: parsed.code }, { status: parsed.status });
    }
    const body = parsed.body;
    const id = positiveInt(body.id);
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const [existing] = await db.select().from(applications).where(eq(applications.id, id));
    const access = await requireRowAccess(req, existing);
    if (!access.ok) {
      return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
    }

    const status = APPLICATION_STATUSES.includes(body.status) ? String(body.status) : undefined;

    const [row] = await db
      .update(applications)
      .set({
        status,
        programName: body.programName !== undefined ? clampString(body.programName, 200) || null : undefined,
        applicationRound:
          body.applicationRound !== undefined && ROUNDS.includes(String(body.applicationRound))
            ? String(body.applicationRound)
            : undefined,
        intakeTerm: body.intakeTerm !== undefined ? clampString(body.intakeTerm, 60) || null : undefined,
        deadline:
          body.deadline !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(String(body.deadline ?? ""))
            ? String(body.deadline)
            : undefined,
        applicationFeePaid:
          body.applicationFeePaid !== undefined ? Boolean(body.applicationFeePaid) : undefined,
        feeAmount: body.feeAmount !== undefined ? positiveInt(body.feeAmount) : undefined,
        portalUrl: body.portalUrl !== undefined ? clampString(body.portalUrl, 500) || null : undefined,
        notes: body.notes !== undefined ? clampString(body.notes, 2000) || null : undefined,
        // Entering "submitted" stamps the time once.
        submittedAt:
          status === "submitted" && !existing.submittedAt ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(applications.id, id))
      .returning();

    return NextResponse.json({ application: row });
  } catch (error) {
    console.error("PATCH /api/applications error:", error);
    return NextResponse.json({ error: "Failed to update application" }, { status: 500 });
  }
}

/** DELETE /api/applications?id=N */
export async function DELETE(req: Request) {
  try {
    const id = positiveInt(new URL(req.url).searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const [existing] = await db.select().from(applications).where(eq(applications.id, id));
    const access = await requireRowAccess(req, existing);
    if (!access.ok) {
      return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
    }

    await db.delete(applications).where(and(eq(applications.id, id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/applications error:", error);
    return NextResponse.json({ error: "Failed to delete application" }, { status: 500 });
  }
}
