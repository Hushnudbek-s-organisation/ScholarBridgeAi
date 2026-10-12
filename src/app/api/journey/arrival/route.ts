import { NextResponse } from "next/server";
import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { admissionOffers, arrivalChecklistItems, studentProfiles } from "@/db/schema";
import { guardStudent, jsonError, readBody, serverError } from "@/lib/journey/api";
import {
  buildArrivalPlan,
  isArrivalItemStatus,
  isKnownArrivalItem,
  type ArrivalItemStatus,
} from "@/lib/journey/arrival";
import { summarizeStatuses } from "@/lib/calculations";

export const dynamic = "force-dynamic";

/**
 * After-arrival plan (product journey §14.3–14.4) — first 7 / 30 / 90 days
 * and the first study year.
 *
 * GET  /api/journey/arrival?profileId=  → the generic plan (locked until an
 *        offer is accepted) merged with this student's saved item statuses.
 * POST /api/journey/arrival             → tick / untick ONE item
 *        { profileId, itemKey, status } — only known keys are accepted.
 *
 * The plan itself is generic guidance (src/lib/journey/arrival.ts): it never
 * claims a country-specific or university-specific rule, and every item is
 * labelled as guidance in the UI. Auth: `guardStudent` — own rows only.
 */
export async function GET(req: Request) {
  const g = await guardStudent(req, new URL(req.url).searchParams.get("profileId"));
  if (!g.ok) return g.response;
  const { profileId } = g.value;
  try {
    const [profile] = await db
      .select({ needScholarship: studentProfiles.needScholarship })
      .from(studentProfiles)
      .where(eq(studentProfiles.id, profileId))
      .limit(1);

    const [accepted] = await db
      .select({ n: count() })
      .from(admissionOffers)
      .where(and(eq(admissionOffers.profileId, profileId), eq(admissionOffers.status, "accepted")));

    // The plan unlocks at the `accepted` stage (see journey/stages.ts). Before
    // that it stays locked with an honest empty state — no fake checklist.
    const stage = Number(accepted?.n ?? 0) > 0 ? "accepted" : "apply";
    const plan = buildArrivalPlan({
      stage,
      needScholarship: profile?.needScholarship ?? null,
    });

    const rows = await db
      .select()
      .from(arrivalChecklistItems)
      .where(eq(arrivalChecklistItems.profileId, profileId));
    const byKey = new Map(rows.map((r) => [r.itemKey, r]));

    const windows = plan.windows.map((w) => {
      const items = w.items.map((item) => {
        const row = byKey.get(item.key);
        return {
          key: item.key,
          tab: item.tab ?? null,
          requires: item.requires ?? null,
          guidanceOnly: item.guidanceOnly,
          status: (row?.status as ArrivalItemStatus | undefined) ?? "pending",
          completedAt: row?.completedAt ?? null,
        };
      });
      return {
        window: w.window,
        items,
        progress: summarizeStatuses(items, (item) => item.status === "done"),
      };
    });
    const allItems = windows.flatMap((window) => window.items);

    return NextResponse.json({
      unlocked: plan.unlocked,
      progress: summarizeStatuses(allItems, (item) => item.status === "done"),
      windows,
    });
  } catch (err) {
    return serverError("journey/arrival GET", err);
  }
}

export async function POST(req: Request) {
  const b = await readBody(req);
  if (!b.ok) return b.response;
  const g = await guardStudent(req, b.value.profileId, { write: true });
  if (!g.ok) return g.response;
  const { profileId } = g.value;

  const itemKey = b.value.itemKey;
  const status = b.value.status;
  if (typeof itemKey !== "string" || !isKnownArrivalItem(itemKey)) {
    return jsonError(400, "unknown itemKey", "bad_request");
  }
  if (!isArrivalItemStatus(status)) {
    return jsonError(400, "status must be 'pending' or 'done'", "bad_request");
  }

  try {
    const now = new Date();
    const existing = await db
      .select({ id: arrivalChecklistItems.id })
      .from(arrivalChecklistItems)
      .where(and(eq(arrivalChecklistItems.profileId, profileId), eq(arrivalChecklistItems.itemKey, itemKey)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(arrivalChecklistItems)
        .set({
          status,
          completedAt: status === "done" ? now : null,
          updatedAt: now,
        })
        .where(eq(arrivalChecklistItems.id, existing[0].id));
    } else {
      await db.insert(arrivalChecklistItems).values({
        profileId,
        itemKey,
        itemWindow: windowOf(itemKey),
        status,
        completedAt: status === "done" ? now : null,
      });
    }
    return NextResponse.json({ ok: true, itemKey, status });
  } catch (err) {
    return serverError("journey/arrival POST", err);
  }
}

/** Bulk reset — used by "start over" in the panel. */
export async function DELETE(req: Request) {
  const g = await guardStudent(req, new URL(req.url).searchParams.get("profileId"), { write: true });
  if (!g.ok) return g.response;
  const { profileId } = g.value;
  try {
    await db.delete(arrivalChecklistItems).where(eq(arrivalChecklistItems.profileId, profileId));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError("journey/arrival DELETE", err);
  }
}

function windowOf(itemKey: string): string {
  if (itemKey.startsWith("d7_")) return "d7";
  if (itemKey.startsWith("d30_")) return "d30";
  if (itemKey.startsWith("d90_")) return "d90";
  return "year1";
}
