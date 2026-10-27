import { NextResponse } from "next/server";
import { guardAdmin, jsonError, readBody, serverError } from "@/lib/growth/api";
import { channelOverview, ensurePlanLinks, previewDays, updateSettingsBlock } from "@/lib/channel/admin";
import { checkChannelConnection } from "@/lib/channel/connect";
import { channelAdminSummary, runPlanForToday, runPostsNow } from "@/lib/channel/adminActions";
import { SETTINGS_KEYS, type SettingsKey } from "@/lib/channel/settings";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Admin → Kanal. One route for the whole dashboard:
 *   GET  ?live=1&days=14  → settings, runtime status, counts, today's queue,
 *                           recent posts, live connection check, plan preview
 *   PUT  { key, value }   → save one settings block (validated, audited)
 *   POST { action }       → verify | test | plan | run | links | preview |
 *                           approve | reject | edit   (see "approval" below)
 */
export async function GET(req: Request) {
  const guard = await guardAdmin(req);
  if (!guard.ok) return guard.response;
  try {
    const url = new URL(req.url);
    const live = url.searchParams.get("live") === "1";
    const days = Number(url.searchParams.get("days") ?? 0);
    const overview = await channelOverview();
    return NextResponse.json({
      ...overview,
      connection: live ? await checkChannelConnection(overview.runtime) : null,
      preview: days > 0 ? await previewDays(days) : null,
      settingsKeys: SETTINGS_KEYS,
    });
  } catch (error) {
    return serverError("channel overview", error);
  }
}

export async function PUT(req: Request) {
  const guard = await guardAdmin(req, { write: true });
  if (!guard.ok) return guard.response;
  const body = await readBody(req);
  if (!body.ok) return body.response;
  const key = String(body.value.key ?? "");
  if (!SETTINGS_KEYS.includes(key as SettingsKey)) return jsonError(400, "Unknown settings key", "bad_key");
  try {
    const result = await updateSettingsBlock(key as SettingsKey, body.value.value, guard.value.profile.id);
    if (!result.ok) return jsonError(400, "Invalid value for this block", "invalid_value");
    return NextResponse.json({ ok: true, settings: result.settings });
  } catch (error) {
    return serverError("channel settings", error);
  }
}

export async function POST(req: Request) {
  const guard = await guardAdmin(req, { write: true });
  if (!guard.ok) return guard.response;
  const body = await readBody(req);
  if (!body.ok) return body.response;
  const action = String(body.value.action ?? "");
  const actor = guard.value.profile.id;
  try {
    if (action === "verify") {
      const overview = await channelOverview();
      return NextResponse.json({ ok: true, connection: await checkChannelConnection(overview.runtime) });
    }
    if (action === "test") {
      const { sendTestMessage } = await import("@/lib/channel/send");
      return NextResponse.json({ ok: true, result: await sendTestMessage() });
    }
    if (action === "plan") {
      return NextResponse.json({ ok: true, result: await runPlanForToday(actor) });
    }
    if (action === "run") {
      return NextResponse.json({ ok: true, result: await runPostsNow(actor) });
    }
    if (action === "links") {
      return NextResponse.json({ ok: true, created: await ensurePlanLinks() });
    }
    if (action === "preview") {
      const days = Number(body.value.days ?? 14);
      return NextResponse.json({ ok: true, preview: await previewDays(days) });
    }
    /**
     * Approval actions from the panel. The same three decisions the Telegram
     * buttons offer, minus the edit-text round trip: "edit" here takes the new
     * body in the request, so an operator on a laptop does not have to type it
     * into a chat. Both paths go through the same guarded functions.
     */
    if (action === "approve" || action === "reject" || action === "edit") {
      const postId = Number(body.value.postId);
      if (!Number.isInteger(postId) || postId <= 0) return jsonError(400, "postId is required", "bad_request");
      const { approveApproval, rejectApproval, applyApprovalEdit } = await import("@/lib/channel/send");
      if (action === "approve") {
        const outcome = await approveApproval(postId, actor);
        if (!outcome.ok) return jsonError(409, outcome.reason ?? "approval_failed", "approval_failed");
        return NextResponse.json({ ok: true, outcome });
      }
      if (action === "reject") {
        const reason = String(body.value.reason ?? "").trim().slice(0, 200) || null;
        const result = await rejectApproval(postId, actor, reason);
        if (!result.ok) return jsonError(409, result.reason ?? "already_closed", "already_closed");
        return NextResponse.json({ ok: true });
      }
      const text = String(body.value.text ?? "");
      const edited = await applyApprovalEdit(postId, text, actor);
      if (!edited.ok) return jsonError(400, edited.error, edited.error);
      return NextResponse.json({ ok: true, html: edited.html });
    }
    if (action === "summary") {
      return NextResponse.json({ ok: true, summary: await channelAdminSummary() });
    }
    return jsonError(400, "Unknown action", "bad_action");
  } catch (error) {
    return serverError("channel action", error);
  }
}
