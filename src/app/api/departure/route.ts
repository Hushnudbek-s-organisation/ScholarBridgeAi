import { NextResponse } from "next/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { checklistItems, journeyDeadlines, studentChecklist, studentProfiles } from "@/db/schema";
import { CHECKLIST_PHASES } from "@/lib/growth/defaults";
import { bool, guardStudent, jsonError, readBody, serverError } from "@/lib/growth/api";
import { dateOnly, isoDate } from "@/lib/journey/api";
import { SCHOLLY_DEPARTURE_KIND } from "@/lib/scholly-missions";
import { completionSummary } from "@/lib/calculations";

export const dynamic = "force-dynamic";

/**
 * "After the offer" checklist (idea from ApplyBoard's application-to-arrival
 * services, adapted): offer → visa → money → housing → travel → arrival.
 * Items are admin-managed; students tick them off.
 */
export async function GET(req: Request) {
  const g = await guardStudent(req, new URL(req.url).searchParams.get("profileId"));
  if (!g.ok) return g.response;
  try {
    const [items, done, departure] = await Promise.all([
      db.select().from(checklistItems).where(eq(checklistItems.isActive, true)).orderBy(asc(checklistItems.sortOrder), asc(checklistItems.id)),
      db.select().from(studentChecklist).where(eq(studentChecklist.profileId, g.value.profileId)),
      db.select({ date: journeyDeadlines.dueDate }).from(journeyDeadlines)
        .where(and(eq(journeyDeadlines.profileId, g.value.profileId), eq(journeyDeadlines.kind, SCHOLLY_DEPARTURE_KIND)))
        .orderBy(desc(journeyDeadlines.id)).limit(1),
    ]);
    const doneAt = new Map(done.map((d) => [d.itemId, d.doneAt]));
    const phases = CHECKLIST_PHASES.map((phase) => {
      const list = items
        .filter((i) => i.phase === phase)
        .map((i) => ({ id: i.id, title: i.title, description: i.description, linkTab: i.linkTab, done: doneAt.has(i.id), doneAt: doneAt.get(i.id) ?? null }));
      return { phase, items: list, done: list.filter((i) => i.done).length, total: list.length };
    }).filter((p) => p.total > 0);
    const progress = completionSummary(
      phases.reduce((sum, phase) => sum + phase.done, 0),
      phases.reduce((sum, phase) => sum + phase.total, 0)
    );
    return NextResponse.json({
      phases,
      departureDate: departure[0]?.date ?? null,
      done: progress.done,
      total: progress.total,
      percent: progress.pct,
      progress,
    });
  } catch (err) {
    return serverError("departure GET", err);
  }
}

/** POST { profileId, itemId, done } */
export async function POST(req: Request) {
  const b = await readBody(req);
  if (!b.ok) return b.response;
  const g = await guardStudent(req, b.value.profileId, { write: true });
  if (!g.ok) return g.response;
  const itemId = Number(b.value.itemId);
  if (!Number.isInteger(itemId) || itemId <= 0) return jsonError(400, "itemId is required", "bad_request");
  try {
    const [item] = await db.select({ id: checklistItems.id }).from(checklistItems).where(eq(checklistItems.id, itemId)).limit(1);
    if (!item) return jsonError(404, "Checklist item not found", "not_found");
    const { profileId } = g.value;
    if (bool(b.value.done, true)) {
      await db.insert(studentChecklist).values({ profileId, itemId }).onConflictDoNothing();
    } else {
      await db.delete(studentChecklist).where(and(eq(studentChecklist.profileId, profileId), eq(studentChecklist.itemId, itemId)));
    }
    return NextResponse.json({ ok: true, itemId, done: bool(b.value.done, true) });
  } catch (err) {
    return serverError("departure POST", err);
  }
}

/** Set or clear the student's explicit departure date. */
export async function PUT(req: Request) {
  const body = await readBody(req);
  if (!body.ok) return body.response;
  const access = await guardStudent(req, body.value.profileId, { write: true });
  if (!access.ok) return access.response;
  const { profileId } = access.value;
  const departureDate = body.value.departureDate;
  const normalized = isoDate(dateOnly(departureDate));
  if (departureDate !== null && (typeof departureDate !== "string" || departureDate !== normalized || departureDate.startsWith("0000-"))) {
    return jsonError(400, "Departure date must be a valid calendar date", "invalid_departure_date");
  }

  try {
    const saved = await db.transaction(async (tx) => {
      const [profile] = await tx.select({ id: studentProfiles.id }).from(studentProfiles)
        .where(eq(studentProfiles.id, profileId)).for("update").limit(1);
      if (!profile) return false;
      const filters = and(eq(journeyDeadlines.profileId, profileId), eq(journeyDeadlines.kind, SCHOLLY_DEPARTURE_KIND));
      if (normalized === null) {
        await tx.delete(journeyDeadlines).where(filters);
      } else {
        const updated = await tx.update(journeyDeadlines).set({ dueDate: normalized, isCompleted: false })
          .where(filters).returning({ id: journeyDeadlines.id });
        if (!updated.length) await tx.insert(journeyDeadlines).values({
          profileId, kind: SCHOLLY_DEPARTURE_KIND, title: "Planned departure", dueDate: normalized,
        });
      }
      return true;
    });
    if (!saved) return jsonError(404, "Profile not found", "not_found");
    return NextResponse.json({ departureDate: normalized });
  } catch (error) {
    return serverError("departure PUT", error);
  }
}
