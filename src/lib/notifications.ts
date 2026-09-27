import { db } from "@/db";
import { notifications, notificationPreferences, studentProfiles } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { deliverTelegramNotification } from "@/lib/telegram/service";
import { toNotifyLang, type NotifyLang, type NotifyText } from "@/lib/notificationTexts";

/** Types that bypass the in-app type/inApp preferences (security notices). */
const MANDATORY_IN_APP_TYPES = new Set(["security"]);

/**
 * Notification helper (spec §20). Creates an in-app notification if the user
 * has not disabled the type, and mirrors it to the user's Telegram chat when
 * they connected the bot (Admin → Telegram bot controls which types go out;
 * the student can pause Telegram or mute single types). Email/push are stubs.
 */
export async function createNotification(input: {
  profileId: number;
  type: string;
  title: string;
  body: string;
  link?: string;
}) {
  try {
    // Respect preferences.
    const [prefs] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.profileId, input.profileId));

    // Security notices (ownership transfer, admin access changes) are always
    // recorded in-app: they must not be silently dropped by type preferences.
    let enabled = true;
    if (prefs && !MANDATORY_IN_APP_TYPES.has(input.type)) {
      try {
        const types = JSON.parse(prefs.types || "[]") as string[];
        enabled = prefs.inApp && (types.includes(input.type) || types.length === 0);
      } catch {
        enabled = prefs.inApp;
      }
    }

    // Record first, deliver second: the in-app row (the sweep's de-dup key)
    // exists before anything leaves the server.
    const [row] = enabled
      ? await db
          .insert(notifications)
          .values({
            profileId: input.profileId,
            type: input.type,
            title: input.title,
            body: input.body,
            link: input.link ?? null,
          })
          .returning()
      : [null];

    // Telegram is its own channel with its own switches (see telegram/core
    // `shouldDeliver`); a failure there never blocks the in-app notification.
    await deliverTelegramNotification(input);
    return row;
  } catch (err) {
    console.error("Failed to create notification:", err);
    return null;
  }
}

/** Batch-create notifications for multiple profiles. */
export async function notifyMany(
  profileIds: number[],
  input: Omit<Parameters<typeof createNotification>[0], "profileId">
) {
  for (const id of profileIds) {
    await createNotification({ ...input, profileId: id });
  }
}

/**
 * Notify ALL admin profiles (is_admin = true). Used for site-wide events:
 * new forum reports, new threads/replies, etc. Returns the admin ids that
 * were notified (empty array when no admins exist).
 */
export async function notifyAdmins(
  input: Omit<Parameters<typeof createNotification>[0], "profileId">
): Promise<number[]> {
  try {
    const rows = await db
      .select({ id: studentProfiles.id })
      .from(studentProfiles)
      .where(eq(studentProfiles.isAdmin, true));
    const adminIds = rows.map((r) => r.id);
    if (adminIds.length > 0) {
      await notifyMany(adminIds, input);
    }
    return adminIds;
  } catch (err) {
    console.error("Failed to notify admins:", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Localised helpers — the text is rendered in each recipient's language
// (profile locale → Telegram app language → English).
// ---------------------------------------------------------------------------

export async function profileLang(profileId: number): Promise<NotifyLang> {
  let locale: string | null = null;
  let tgLang: string | null = null;
  try {
    const [p] = await db
      .select({ locale: studentProfiles.preferredLocale })
      .from(studentProfiles)
      .where(eq(studentProfiles.id, profileId));
    locale = p?.locale ?? null;
  } catch {
    // ignore
  }
  if (!locale) {
    try {
      // telegram_links may not exist yet (created lazily) — raw SQL + catch.
      const res = await db.execute(sql`SELECT language_code FROM telegram_links WHERE profile_id = ${profileId} LIMIT 1`);
      const rows = (res as unknown as { rows?: { language_code: string | null }[] }).rows ?? [];
      tgLang = rows[0]?.language_code ?? null;
    } catch {
      // ignore
    }
  }
  return toNotifyLang(locale, tgLang);
}

type LocalizedInput = {
  type: string;
  link?: string;
  text: (lang: NotifyLang) => NotifyText;
};

export async function createLocalizedNotification(profileId: number, input: LocalizedInput) {
  const lang = await profileLang(profileId);
  const { title, body } = input.text(lang);
  return createNotification({ profileId, type: input.type, link: input.link, title, body });
}

export async function notifyManyLocalized(profileIds: number[], input: LocalizedInput) {
  let sent = 0;
  for (const id of profileIds) {
    if (await createLocalizedNotification(id, input)) sent += 1;
  }
  return sent;
}

export async function notifyAdminsLocalized(input: LocalizedInput): Promise<number[]> {
  try {
    const rows = await db
      .select({ id: studentProfiles.id })
      .from(studentProfiles)
      .where(eq(studentProfiles.isAdmin, true));
    const ids = rows.map((r) => r.id);
    await notifyManyLocalized(ids, input);
    return ids;
  } catch (err) {
    console.error("Failed to notify admins:", err);
    return [];
  }
}
