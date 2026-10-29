import { NextResponse } from "next/server";
import { guardAdmin, jsonError, readBody, serverError } from "@/lib/growth/api";
import { channelOverview, ensurePlanLinks, previewDays, updateSettingsBlock } from "@/lib/channel/admin";
import { checkChannelConnection, saveResolvedChannel } from "@/lib/channel/connect";
import { channelAdminSummary, runPlanForToday, runPostsNow } from "@/lib/channel/adminActions";
import { normalizeChannelIdentifier, resolveChannelRuntime } from "@/lib/channel/config";
import { kickChannelAutopilot } from "@/lib/channel/boot";
import { channelWhy, unpublishedCatalogue } from "@/lib/channel/whyStore";
import { loadChannelSettings, writeChannelAudit } from "@/lib/channel/repo";
import { shouldKickAfterConnect } from "@/lib/channel/autopilot";
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
    /**
     * `?why=1` folds the diagnosis into the first load, so the panel opens with
     * the verdict instead of an extra round-trip. It costs two Telegram calls,
     * which is why it is opt-in rather than part of every refresh.
     */
    const wantWhy = url.searchParams.get("why") === "1";
    return NextResponse.json({
      ...overview,
      connection: live ? await checkChannelConnection(overview.runtime) : null,
      preview: days > 0 ? await previewDays(days) : null,
      why: wantWhy ? await whyPayload() : null,
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
    /**
     * The channel reference is normalised before anything is validated, so the
     * operator can paste exactly what Telegram shows them: `https://t.me/name`,
     * `t.me/name`, `name`, `@name`, `-100…`. An invite link (`t.me/+AbCd`) is
     * the one form that cannot be fixed locally — it carries no chat id — so it
     * gets the actionable hint instead of a generic "invalid value".
     */
    let value = body.value.value as Record<string, unknown>;
    if (key === "connection" && value && typeof value === "object") {
      const normalized = normalizeChannelIdentifier(String(value.channelId ?? ""));
      if (!normalized.ok && normalized.reason !== "empty") {
        return jsonError(400, normalized.hint, normalized.reason);
      }
      value = { ...value, channelId: normalized.ok ? normalized.value : "" };
    }

    // The connection block is the one save that must have a visible result:
    // reading the before/after runtimes is what tells us "this just became
    // connected" rather than "an unrelated value was edited".
    const before = key === "connection" ? resolveChannelRuntime(await loadChannelSettings()) : null;
    const result = await updateSettingsBlock(key as SettingsKey, value, guard.value.profile.id);
    if (!result.ok) return jsonError(400, "Invalid value for this block", "invalid_value");
    /**
     * Connecting the channel starts the publisher — once, right now, so the
     * admin chat gets exactly one message and the first post instead of a
     * silent save. Everything after that is the in-process loop
     * (`src/lib/channel/boot.ts`). A failed kick never fails the save: the
     * settings are already written and the loop will retry.
     */
    let kick = null;
    if (before && shouldKickAfterConnect(before, resolveChannelRuntime(result.settings))) {
      kick = await kickChannelAutopilot(guard.value.profile.id).catch((error) => {
        console.warn("[channel] autopilot kick failed:", error instanceof Error ? error.message : error);
        return null;
      });
    }
    return NextResponse.json({ ok: true, settings: result.settings, kick });
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
      const connection = await checkChannelConnection(overview.runtime);
      /**
       * "Verify" is also the moment to pin the resolved id: an @username can be
       * renamed away, a `-100…` id cannot. Only on success, only here — a GET
       * never writes, and the panel fields must not change on their own.
       */
      const saved =
        connection.channel.reachable && connection.channel.id
          ? await saveResolvedChannel(connection.channel.id, actor).catch(() => ({ ok: false, channelId: null }))
          : null;
      return NextResponse.json({ ok: true, connection, savedChannelId: saved?.channelId ?? null });
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
    /**
     * "Nega post ketmayapti?" — the whole chain, checked and named.
     *
     * Read-only: it runs a live connection check (two Telegram calls) and counts
     * the catalogue the way the planner does, but changes nothing.
     */
    if (action === "why") {
      return NextResponse.json({ ok: true, ...(await whyPayload()) });
    }

    if (action === "summary") {
      return NextResponse.json({ ok: true, summary: await channelAdminSummary() });
    }
    /**
     * "Put the dictionary in the database now" — the operator's explicit import.
     *
     * The bootstrap already does this on its first tick, so this is the
     * recovery path: a table emptied by hand, a bundled version that changed, an
     * environment where the first tick failed. Admin rows (`source = 'admin'`)
     * are never touched — only the PDF-imported rows are replaced.
     */
    /**
     * "Ulanishni tiklash" — re-register the publisher bot's webhook now.
     *
     * The tick repairs a broken webhook by itself, but the operator should not
     * have to wait for the next tick (or trust one) after pressing a button
     * that did nothing. `force` also re-registers a webhook that *looks* fine:
     * Telegram can lose it without reporting an error, and this is the only
     * way back except a redeploy.
     */
    if (action === "webhook") {
      const { ensurePublisherWebhook } = await import("@/lib/channel/webhookStore");
      const result = await ensurePublisherWebhook({ force: true });
      await writeChannelAudit({
        actorProfileId: actor,
        action: "webhook_repaired",
        entity: "settings",
        entityId: "webhook",
        after: { repaired: result.repaired, reason: result.reason, state: result.status.state },
      });
      return NextResponse.json({ ok: result.reason !== "failed", result, webhook: result.status });
    }
    if (action === "dictionary") {
      const { installLexicon } = await import("@/lib/channel/lexicon/store");
      const { dictionaryStatus } = await import("@/lib/channel/selfcheckStore");
      const result = await installLexicon();
      const dictionary = await dictionaryStatus();
      if (result.error) {
        // The reason is a sanitised sentence, never a DSN.
        return NextResponse.json({ ok: false, result, dictionary }, { status: 409 });
      }
      return NextResponse.json({ ok: true, result, dictionary });
    }
    return jsonError(400, "Unknown action", "bad_action");
  } catch (error) {
    return serverError("channel action", error);
  }
}

/**
 * The diagnosis, plus the two things the panel needs next to it: the rows that
 * cannot be published and the exact monitor URL to paste into UptimeRobot.
 * The secret itself is never sent — the operator appends it.
 */
async function whyPayload() {
  const why = await channelWhy();
  const unpublished = why.catalogue.publishable === 0 ? await unpublishedCatalogue(new Date(), 10) : [];
  const origin = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, "");
  return {
    why,
    unpublished,
    cron: {
      secretConfigured: Boolean(process.env.CRON_SECRET),
      url: origin ? `${origin}/api/cron/channel?secret=<CRON_SECRET>` : "/api/cron/channel?secret=<CRON_SECRET>",
    },
  };
}
