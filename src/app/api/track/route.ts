import { NextResponse } from "next/server";
import { recordVisit, visitorCookieHeader, VISITOR_COOKIE, readCookie, type VisitEventType } from "@/lib/visits";
import { LIMITS, checkRateLimit, clientIp, rateLimitedResponse } from "@/lib/rate-limit";

/**
 * POST /api/track — anonymous traffic beacon.
 *
 * Public on purpose (it counts guests), but it only ever INSERTs into
 * `site_visits` and never reads or returns any user data. Bots, API paths and
 * duplicate events are dropped, and every failure is swallowed so analytics
 * can never break a visitor's session.
 */
export const dynamic = "force-dynamic";

const str = (v: unknown, max = 400): string | null =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

export async function POST(req: Request) {
  try {
    // Cheap insert, but still throttled so the beacon cannot be used to flood
    // the analytics table.
    const limit = checkRateLimit(`beacon:${clientIp(req)}`, LIMITS.beacon);
    if (!limit.ok) return rateLimitedResponse(limit.retryAfterSec);

    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }

    const headers = req.headers;
    const result = await recordVisit({
      eventType: (str(body.type, 20) ?? "page_view") as VisitEventType,
      path: str(body.path, 300) ?? "/",
      screen: str(body.screen, 80),
      referrer: str(body.referrer, 400),
      locale: str(body.locale, 8),
      profileId: typeof body.profileId === "number" ? body.profileId : null,
      headers,
      visitorId: str(body.visitorId, 64),
    });

    // Bot / API path / duplicate — acknowledge without storing anything.
    if (!result) {
      return NextResponse.json({ ok: true, recorded: false });
    }

    const res = NextResponse.json({
      ok: true,
      recorded: result.recorded,
      visitorId: result.visitorId,
      firstVisit: result.firstVisit,
    });

    // Hand the browser its anonymous id so later beacons are attributed to the
    // same visitor (only needed while the cookie is missing).
    if (!readCookie(headers.get("cookie") ?? null, VISITOR_COOKIE)) {
      res.headers.set("Set-Cookie", visitorCookieHeader(result.visitorId));
    }
    return res;
  } catch (err) {
    console.warn("POST /api/track ignored:", (err as Error)?.message ?? err);
    return NextResponse.json({ ok: true, recorded: false });
  }
}
