import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { schollyProfiles } from "@/db/schema";
import { privateNoStoreJson } from "@/lib/apiResponse";
import { authenticate } from "@/lib/auth";
import { checkRateLimit, LIMITS, rateLimitedResponse } from "@/lib/rate-limit";
import { readJsonBody } from "@/lib/request";
import { isSchollyTopic, readSchollyLearning } from "@/lib/scholly-learning";

export async function POST(req: Request) {
  const auth = await authenticate(req);
  if (!auth.ok) return privateNoStoreJson({ error: auth.error, code: auth.code }, { status: auth.status });
  const profileId = auth.session.profile.id;
  const rate = checkRateLimit(`scholly:learning:${profileId}`, LIMITS.userWrite);
  if (!rate.ok) return rateLimitedResponse(rate.retryAfterSec);
  const parsed = await readJsonBody<Record<string, unknown>>(req, 512);
  if (!parsed.ok) return privateNoStoreJson({ error: parsed.error, code: parsed.code }, { status: parsed.status });
  const { action, topic, enabled } = parsed.body;
  const preference = action === "preference" && typeof enabled === "boolean";
  const signal = (action === "visits" || action === "helpful" || action === "needsWork") && isSchollyTopic(topic);
  if (!preference && !signal) return privateNoStoreJson({ error: "Invalid companion preference or feedback" }, { status: 400 });

  try {
    const learning = await db.transaction(async tx => {
      // Consent changes and updates to the bounded counters are serialized.
      await tx.insert(schollyProfiles).values({ userId: profileId }).onConflictDoNothing({ target: schollyProfiles.userId });
      const [row] = await tx.select({ prefs: schollyProfiles.notifPrefs }).from(schollyProfiles)
        .where(eq(schollyProfiles.userId, profileId)).for("update");
      const current = readSchollyLearning(row.prefs);
      if (!preference && !current.enabled) return current;
      if (preference) {
        if (current.enabled === enabled) return current;
        current.enabled = enabled === true;
        current.topics = {};
      } else if (signal) {
        const stats = current.topics[topic] ?? { visits: 0, helpful: 0, needsWork: 0 };
        stats[action] = Math.min(30, stats[action] + 1);
        current.topics[topic] = stats;
      }
      await tx.update(schollyProfiles).set({
        notifPrefs: sql`(case when jsonb_typeof(${schollyProfiles.notifPrefs}) = 'object'
          then ${schollyProfiles.notifPrefs} else '{}'::jsonb end)
          || ${JSON.stringify({ companionLearning: current })}::jsonb`,
        updatedAt: new Date(),
      }).where(eq(schollyProfiles.userId, profileId));
      return current;
    });
    return privateNoStoreJson({ learning });
  } catch (error) {
    console.error("Scholly learning update failed:", (error as Error)?.name);
    return privateNoStoreJson({ error: "Could not save companion preferences" }, { status: 503 });
  }
}
