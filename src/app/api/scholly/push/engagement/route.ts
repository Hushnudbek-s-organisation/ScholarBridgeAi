import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { schollyNotificationLog } from "@/db/schema";
import { authenticate } from "@/lib/auth";
import { privateNoStoreJson } from "@/lib/apiResponse";
import { readJsonBody } from "@/lib/request";

export async function POST(req: Request) {
  try {
    const auth = await authenticate(req);
    if (!auth.ok) return privateNoStoreJson({ error: auth.error, code: auth.code }, { status: auth.status });
    const parsed = await readJsonBody<Record<string, unknown>>(req, 512);
    if (!parsed.ok) return privateNoStoreJson({ error: parsed.error, code: parsed.code }, { status: parsed.status });
    const { deliveryId, action } = parsed.body;
    if (typeof deliveryId !== "string" || !/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/.test(deliveryId) ||
      (action !== "open" && action !== "settings")) {
      return privateNoStoreJson({ error: "Invalid browser notification action" }, { status: 400 });
    }
    const openedAt = sql`coalesce(${schollyNotificationLog.openedAt}, now())`;
    await db.update(schollyNotificationLog).set({
      openedAt,
      actedAt: action === "settings" ? sql`coalesce(${schollyNotificationLog.actedAt}, now())` : undefined,
    }).where(and(
      eq(schollyNotificationLog.id, deliveryId),
      eq(schollyNotificationLog.userId, auth.session.profile.id),
      eq(schollyNotificationLog.channel, "push"),
    ));
    return new Response(null, { status: 204, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Scholly push engagement could not be saved:", (error as Error)?.name);
    return privateNoStoreJson({ error: "Notification action is unavailable" }, { status: 500 });
  }
}
