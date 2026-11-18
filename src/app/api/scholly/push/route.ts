import { and, count, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { schollyPushSubscriptions } from "@/db/schema";
import { authenticate } from "@/lib/auth";
import { privateNoStoreJson } from "@/lib/apiResponse";
import { checkRateLimit, LIMITS, rateLimitedResponse } from "@/lib/rate-limit";
import { readJsonBody } from "@/lib/request";
import { logSchollyEvent } from "@/lib/scholly-events";
import { ensureSchollyProfile } from "@/lib/scholly-mission-store.server";
import { getSchollyVapidConfig, hashSchollyPushEndpoint, parseSchollyPushSubscription } from "@/lib/scholly-push.server";

const isDeviceId = (id: unknown): id is string => typeof id === "string" && /^[a-f0-9]{64}$/.test(id);

export async function GET(req: Request) {
  try {
    const auth = await authenticate(req);
    if (!auth.ok) return privateNoStoreJson({ error: auth.error, code: auth.code }, { status: auth.status });
    const profileId = auth.session.profile.id;
    const device = new URL(req.url).searchParams.get("device");
    if (device !== null && !isDeviceId(device)) return privateNoStoreJson({ error: "Invalid push device" }, { status: 400 });
    const [state] = await db.select({
      count: count(),
      deviceEnabled: device
        ? sql<boolean>`coalesce(bool_or(${schollyPushSubscriptions.endpointHash} = ${device}), false)`
        : sql<boolean>`false`,
    }).from(schollyPushSubscriptions).where(eq(schollyPushSubscriptions.userId, profileId));
    return privateNoStoreJson({ publicKey: getSchollyVapidConfig()?.publicKey ?? null, ...state });
  } catch (error) {
    console.error("GET /api/scholly/push failed:", (error as Error)?.name);
    return privateNoStoreJson({ error: "Browser notification settings are unavailable" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await authenticate(req);
    if (!auth.ok) return privateNoStoreJson({ error: auth.error, code: auth.code }, { status: auth.status });
    const profileId = auth.session.profile.id;
    const rate = checkRateLimit(`scholly:push:${profileId}`, LIMITS.userWrite);
    if (!rate.ok) return rateLimitedResponse(rate.retryAfterSec);
    if (!getSchollyVapidConfig()) return privateNoStoreJson({ error: "Browser notifications are not configured" }, { status: 503 });
    const parsed = await readJsonBody(req, 4096);
    if (!parsed.ok) return privateNoStoreJson({ error: parsed.error, code: parsed.code }, { status: parsed.status });
    const subscription = parseSchollyPushSubscription(parsed.body);
    if (!subscription) return privateNoStoreJson({ error: "Unsupported browser notification subscription" }, { status: 400 });
    if (!(await ensureSchollyProfile(profileId))) return privateNoStoreJson({ error: "Profile not found" }, { status: 404 });
    const endpointHash = hashSchollyPushEndpoint(subscription.endpoint);
    const accepted = await db.transaction(async tx => {
      // Serialize enrollment for the same capability across accounts and requests.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${endpointHash}, 5223))`);
      const [existing] = await tx.select().from(schollyPushSubscriptions)
        .where(eq(schollyPushSubscriptions.endpointHash, endpointHash)).for("update").limit(1);
      if (existing && existing.userId !== profileId &&
        (existing.auth !== subscription.keys.auth || existing.p256dh !== subscription.keys.p256dh)) return false;
      await tx.insert(schollyPushSubscriptions).values({
        userId: profileId, endpointHash, endpoint: subscription.endpoint, ...subscription.keys,
      }).onConflictDoUpdate({
        target: schollyPushSubscriptions.endpointHash,
        set: { userId: profileId, ...subscription.keys, updatedAt: new Date() },
      });
      if (existing && existing.userId !== profileId) {
        await logSchollyEvent(existing.userId, "push_unsubscribed", { reason: "device_changed_account" }, tx);
      }
      if (existing?.userId !== profileId) await logSchollyEvent(profileId, "push_subscribed", {}, tx);
      return true;
    });
    return accepted ? privateNoStoreJson({ enabled: true })
      : privateNoStoreJson({ error: "Browser subscription could not be claimed" }, { status: 409 });
  } catch (error) {
    console.error("POST /api/scholly/push failed:", (error as Error)?.name);
    return privateNoStoreJson({ error: "Browser notifications could not be enabled" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await authenticate(req);
    if (!auth.ok) return privateNoStoreJson({ error: auth.error, code: auth.code }, { status: auth.status });
    const profileId = auth.session.profile.id;
    const rate = checkRateLimit(`scholly:push:${profileId}`, LIMITS.userWrite);
    if (!rate.ok) return rateLimitedResponse(rate.retryAfterSec);
    const parsed = await readJsonBody<Record<string, unknown>>(req, 512);
    if (!parsed.ok) return privateNoStoreJson({ error: parsed.error, code: parsed.code }, { status: parsed.status });
    const { device, all } = parsed.body;
    if (all !== true && !isDeviceId(device)) return privateNoStoreJson({ error: "Invalid push device" }, { status: 400 });
    await db.transaction(async tx => {
      const removed = await tx.delete(schollyPushSubscriptions).where(and(
        eq(schollyPushSubscriptions.userId, profileId),
        all === true ? undefined : eq(schollyPushSubscriptions.endpointHash, device as string),
      )).returning({ endpointHash: schollyPushSubscriptions.endpointHash });
      if (removed.length) await logSchollyEvent(profileId, "push_unsubscribed", { reason: "user", all: all === true }, tx);
    });
    return privateNoStoreJson({ enabled: false });
  } catch (error) {
    console.error("DELETE /api/scholly/push failed:", (error as Error)?.name);
    return privateNoStoreJson({ error: "Browser notifications could not be disabled" }, { status: 500 });
  }
}
