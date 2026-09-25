import { NextResponse } from "next/server";
import { db } from "@/db";
import { opportunities } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { auditRowChanges, writeAudit } from "@/lib/audit";
import { eq } from "drizzle-orm";

/**
 * #26/#27/#28 — Admin CRUD for the curated opportunities catalog.
 * The platform never scrapes third-party lists: admins add real, verifiable
 * programs one by one, and every change is audit-logged.
 */

const TYPES = ["competition", "research", "internship", "summer_school"];
const LEVELS = ["high_school", "undergrad", "grad", "phd", "any"];

function toValues(o: any) {
  return {
    type: TYPES.includes(o.type) ? o.type : "competition",
    title: (o.title || "").trim() || "Untitled opportunity",
    provider: (o.provider || "").trim(),
    country: o.country?.trim() ? o.country.trim() : null,
    fields: typeof o.fields === "string" ? o.fields : JSON.stringify(Array.isArray(o.fields) ? o.fields : ["All"]),
    level: LEVELS.includes(o.level) ? o.level : "any",
    deadlineDate: o.deadlineDate || null,
    url: (o.url || "").trim(),
    description: (o.description || "").trim(),
    isVerified: o.isVerified === true || o.isVerified === "true",
  };
}

export async function GET(req: Request) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ error: "Admin required" }, { status: 403 });
    const rows = await db.select().from(opportunities).orderBy(opportunities.type, opportunities.title);
    return NextResponse.json({
      items: rows.map((r) => ({ ...r, deadlineDate: r.deadlineDate || null })),
    });
  } catch {
    return NextResponse.json({ error: "Failed to load opportunities" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ error: "Admin required" }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const values = toValues(body);
    const [row] = await db.insert(opportunities).values(values).returning();
    await writeAudit({
      entityType: "opportunity",
      entityId: row.id,
      fieldChanged: "created",
      newValue: values.title,
      source: "admin",
      actor: "ADMIN",
    });
    return NextResponse.json({ id: row.id });
  } catch {
    return NextResponse.json({ error: "Failed to create opportunity" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ error: "Admin required" }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const existing = await db.select().from(opportunities).where(eq(opportunities.id, id)).limit(1);
    if (!existing.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const values = toValues(body);
    const [updated] = await db.update(opportunities).set(values).where(eq(opportunities.id, id)).returning();
    await auditRowChanges("opportunity", id, existing[0] as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>, {
      actor: "ADMIN",
    });
    return NextResponse.json({ id });
  } catch {
    return NextResponse.json({ error: "Failed to update opportunity" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ error: "Admin required" }, { status: 403 });
    const url = new URL(req.url);
    const id = Number(url.searchParams.get("id"));
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const existing = await db.select().from(opportunities).where(eq(opportunities.id, id)).limit(1);
    if (!existing.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await db.delete(opportunities).where(eq(opportunities.id, id));
    await writeAudit({
      entityType: "opportunity",
      entityId: id,
      fieldChanged: "deleted",
      oldValue: existing[0].title,
      source: "admin",
      actor: "ADMIN",
    });
    return NextResponse.json({ deleted: id });
  } catch {
    return NextResponse.json({ error: "Failed to delete opportunity" }, { status: 500 });
  }
}
