import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { channelPlan } from "@/db/schema";
import { guardAdmin, jsonError, readBody, serverError } from "@/lib/growth/api";
import { todayQueue } from "@/lib/channel/admin";
import { postNow } from "@/lib/channel/adminActions";
import { writeChannelAudit } from "@/lib/channel/repo";
import { renderPlanRow } from "@/lib/channel/send";
import { sanitizeTelegramHtml, validateTelegramHtml } from "@/lib/channel/sanitize";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Admin → Kanal → Navbat (today's queue).
 *   GET  ?day=YYYY-MM-DD        → the day's items with their rendered preview
 *   POST { action, id, … }      → post_now | test | skip | postpone | pin | override
 */
export async function GET(req: Request) {
  const guard = await guardAdmin(req);
  if (!guard.ok) return guard.response;
  const day = new URL(req.url).searchParams.get("day") ?? undefined;
  if (day && !DAY_RE.test(day)) return jsonError(400, "Invalid day", "bad_request");
  try {
    return NextResponse.json({ ok: true, rows: await todayQueue(day) });
  } catch (error) {
    return serverError("channel queue", error);
  }
}

export async function POST(req: Request) {
  const guard = await guardAdmin(req, { write: true });
  if (!guard.ok) return guard.response;
  const body = await readBody(req);
  if (!body.ok) return body.response;
  const action = String(body.value.action ?? "");
  const id = Number(body.value.id);
  if (!Number.isInteger(id) || id <= 0) return jsonError(400, "id is required", "bad_request");
  const actor = guard.value.profile.id;

  try {
    const [row] = await db.select().from(channelPlan).where(eq(channelPlan.id, id)).limit(1);
    if (!row) return jsonError(404, "Plan item not found", "not_found");

    if (action === "post_now" || action === "test") {
      const result = await postNow(id, actor, { toAdminChat: action === "test" });
      if (!result.ok || !result.outcome) return jsonError(400, result.outcome?.reason ?? "send_failed", "send_failed");
      return NextResponse.json({ ok: true, outcome: result.outcome, rows: await todayQueue(row.planDate) });
    }

    if (action === "skip") {
      const reason = String(body.value.reason ?? "").trim().slice(0, 200) || null;
      await db
        .update(channelPlan)
        .set({ status: "skipped", skipReason: reason })
        .where(eq(channelPlan.id, id));
      await writeChannelAudit({ actorProfileId: actor, action: "plan_skip", entity: "plan", entityId: String(id), after: { reason } });
      return NextResponse.json({ ok: true, rows: await todayQueue(row.planDate) });
    }

    if (action === "postpone") {
      const sendAt = String(body.value.sendAt ?? "").trim();
      if (!TIME_RE.test(sendAt)) return jsonError(400, "sendAt must be HH:MM", "bad_request");
      await db.update(channelPlan).set({ sendAt, status: "planned" }).where(eq(channelPlan.id, id));
      await writeChannelAudit({ actorProfileId: actor, action: "plan_postpone", entity: "plan", entityId: String(id), after: { sendAt } });
      return NextResponse.json({ ok: true, rows: await todayQueue(row.planDate) });
    }

    if (action === "pin") {
      const pinned = body.value.pinned === true;
      await db.update(channelPlan).set({ pinned }).where(eq(channelPlan.id, id));
      await writeChannelAudit({ actorProfileId: actor, action: "plan_pin", entity: "plan", entityId: String(id), after: { pinned } });
      return NextResponse.json({ ok: true, rows: await todayQueue(row.planDate) });
    }

    if (action === "override") {
      const raw = String(body.value.text ?? "").trim();
      if (!raw) {
        await db.update(channelPlan).set({ textOverride: null }).where(eq(channelPlan.id, id));
        return NextResponse.json({ ok: true, rows: await todayQueue(row.planDate) });
      }
      if (raw.length > 4096) return jsonError(400, "Text is too long", "too_long");
      const issues = validateTelegramHtml(raw);
      if (issues.length) return jsonError(400, issues[0], "invalid_html");
      const clean = sanitizeTelegramHtml(raw);
      await db.update(channelPlan).set({ textOverride: clean.html }).where(eq(channelPlan.id, id));
      await writeChannelAudit({ actorProfileId: actor, action: "plan_override", entity: "plan", entityId: String(id), after: { chars: clean.html.length } });
      return NextResponse.json({ ok: true, rows: await todayQueue(row.planDate) });
    }

    if (action === "rerender") {
      const rendered = await renderPlanRow(row);
      return NextResponse.json({ ok: true, parts: rendered.parts, reason: rendered.reason });
    }

    return jsonError(400, "Unknown action", "bad_action");
  } catch (error) {
    return serverError("channel queue action", error);
  }
}
