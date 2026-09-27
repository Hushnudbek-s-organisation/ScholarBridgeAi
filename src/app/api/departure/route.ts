import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { checklistItems, studentChecklist } from "@/db/schema";
import { CHECKLIST_PHASES } from "@/lib/growth/defaults";
import { bool, guardStudent, jsonError, readBody, serverError } from "@/lib/growth/api";

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
    const [items, done] = await Promise.all([
      db.select().from(checklistItems).where(eq(checklistItems.isActive, true)).orderBy(asc(checklistItems.sortOrder), asc(checklistItems.id)),
      db.select().from(studentChecklist).where(eq(studentChecklist.profileId, g.value.profileId)),
    ]);
    const doneAt = new Map(done.map((d) => [d.itemId, d.doneAt]));
    const phases = CHECKLIST_PHASES.map((phase) => {
      const list = items
        .filter((i) => i.phase === phase)
        .map((i) => ({ id: i.id, title: i.title, description: i.description, linkTab: i.linkTab, done: doneAt.has(i.id), doneAt: doneAt.get(i.id) ?? null }));
      return { phase, items: list, done: list.filter((i) => i.done).length, total: list.length };
    }).filter((p) => p.total > 0);
    const total = phases.reduce((s, p) => s + p.total, 0);
    const doneCount = phases.reduce((s, p) => s + p.done, 0);
    return NextResponse.json({ phases, done: doneCount, total, percent: total ? Math.round((doneCount / total) * 100) : 0 });
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
