import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { schollyProfiles } from "@/db/schema";
import { privateNoStoreJson } from "@/lib/apiResponse";
import { authenticate } from "@/lib/auth";
import { checkRateLimit, LIMITS, rateLimitedResponse } from "@/lib/rate-limit";
import { readJsonBody } from "@/lib/request";
import { ensureSchollyProfile } from "@/lib/scholly-mission-store.server";
import { parseSchollyReminderPreferences, validateSchollyReminderPreferences } from "@/lib/scholly-reminders";

export async function GET(req: Request) {
  try {
    const auth = await authenticate(req);
    if (!auth.ok) return privateNoStoreJson({ error: auth.error, code: auth.code }, { status: auth.status });
    const [row] = await db.select().from(schollyProfiles)
      .where(eq(schollyProfiles.userId, auth.session.profile.id)).limit(1);
    return privateNoStoreJson({ settings: parseSchollyReminderPreferences(row ?? {}) });
  } catch (error) {
    console.error("GET /api/scholly/settings failed:", error);
    return privateNoStoreJson({ error: "Scholly settings are unavailable" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await authenticate(req);
    if (!auth.ok) return privateNoStoreJson({ error: auth.error, code: auth.code }, { status: auth.status });
    const profileId = auth.session.profile.id;
    const rate = checkRateLimit(`scholly:settings:${profileId}`, LIMITS.userWrite);
    if (!rate.ok) return rateLimitedResponse(rate.retryAfterSec);
    const parsed = await readJsonBody(req, 2048);
    if (!parsed.ok) return privateNoStoreJson({ error: parsed.error, code: parsed.code }, { status: parsed.status });
    const settings = validateSchollyReminderPreferences(parsed.body);
    if (!settings) return privateNoStoreJson({ error: "Invalid Scholly preferences" }, { status: 400 });
    if (!(await ensureSchollyProfile(profileId))) {
      return privateNoStoreJson({ error: "Profile not found" }, { status: 404 });
    }
    const { mode, missionTelegram, ...columns } = settings;
    const [row] = await db.update(schollyProfiles)
      .set({
        ...columns,
        notifPrefs: sql`CASE WHEN jsonb_typeof(${schollyProfiles.notifPrefs}) = 'object'
          THEN ${schollyProfiles.notifPrefs} ELSE '{}'::jsonb END || ${JSON.stringify({ mode, missionTelegram })}::jsonb`,
        updatedAt: new Date(),
      })
      .where(eq(schollyProfiles.userId, profileId)).returning();
    if (!row) return privateNoStoreJson({ error: "Profile not found" }, { status: 404 });
    return privateNoStoreJson({ settings: parseSchollyReminderPreferences(row) });
  } catch (error) {
    console.error("PUT /api/scholly/settings failed:", error);
    return privateNoStoreJson({ error: "Scholly settings could not be saved" }, { status: 500 });
  }
}
