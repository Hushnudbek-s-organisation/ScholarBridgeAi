export const SCHOLLY_MODES = ["full", "important", "muted"] as const;
export const SCHOLLY_TONES = ["friendly", "short", "serious"] as const;
export const SCHOLLY_REMINDER_WINDOWS = ["before_school", "after_school", "evening", "not_needed"] as const;

export type SchollyReminderPreferences = {
  mode: typeof SCHOLLY_MODES[number];
  tone: typeof SCHOLLY_TONES[number];
  reminderWindow: typeof SCHOLLY_REMINDER_WINDOWS[number];
  quietStart: string;
  quietEnd: string;
  missionTelegram: boolean;
};

type PreferenceRow = {
  notifPrefs?: unknown;
  reminderWindow?: string | null;
  tone?: string;
  quietStart?: string;
  quietEnd?: string;
};

export function isLocalTime(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function oneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (values as readonly string[]).includes(value);
}

export function parseSchollyReminderPreferences(row: PreferenceRow): SchollyReminderPreferences {
  const stored = row.notifPrefs && typeof row.notifPrefs === "object" ? row.notifPrefs as Record<string, unknown> : {};
  return {
    mode: oneOf(SCHOLLY_MODES, stored.mode) ? stored.mode : "full",
    tone: oneOf(SCHOLLY_TONES, row.tone) ? row.tone : "friendly",
    reminderWindow: oneOf(SCHOLLY_REMINDER_WINDOWS, row.reminderWindow) ? row.reminderWindow : "not_needed",
    quietStart: isLocalTime(row.quietStart) ? row.quietStart : "22:00",
    quietEnd: isLocalTime(row.quietEnd) ? row.quietEnd : "07:00",
    missionTelegram: stored.missionTelegram === true,
  };
}

export function validateSchollyReminderPreferences(body: unknown): SchollyReminderPreferences | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const { mode, tone, reminderWindow, quietStart, quietEnd, missionTelegram } = body as Record<string, unknown>;
  if (!oneOf(SCHOLLY_MODES, mode) || !oneOf(SCHOLLY_TONES, tone)
    || !oneOf(SCHOLLY_REMINDER_WINDOWS, reminderWindow) || !isLocalTime(quietStart)
    || !isLocalTime(quietEnd) || typeof missionTelegram !== "boolean") return null;
  return { mode, tone, reminderWindow, quietStart, quietEnd, missionTelegram };
}

const WINDOWS = {
  before_school: ["07:00", "08:00"],
  after_school: ["15:30", "16:30"],
  evening: ["19:00", "20:00"],
} as const;

export function shouldRemindAboutMission(
  prefs: SchollyReminderPreferences,
  localTime: string,
  channel: "telegram" | "push" = "telegram",
): boolean {
  if (prefs.mode !== "full" || (channel === "telegram" && !prefs.missionTelegram) || prefs.reminderWindow === "not_needed") return false;
  const [start, end] = WINDOWS[prefs.reminderWindow];
  if (localTime < start || localTime >= end) return false;
  const { quietStart, quietEnd } = prefs;
  if (quietStart === quietEnd) return true;
  const inQuietHours = quietStart < quietEnd
    ? localTime >= quietStart && localTime < quietEnd
    : localTime >= quietStart || localTime < quietEnd;
  return !inQuietHours;
}

/** Keep delayed Web Push delivery inside today's selected window and quiet hours. */
export function schollyMissionPushTtl(prefs: SchollyReminderPreferences, now: Date, localTime: string): number {
  if (!shouldRemindAboutMission(prefs, localTime, "push") || prefs.reminderWindow === "not_needed") return 0;
  const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
  const windowEnd = WINDOWS[prefs.reminderWindow][1];
  const end = prefs.quietStart !== prefs.quietEnd && prefs.quietStart > localTime && prefs.quietStart < windowEnd
    ? prefs.quietStart : windowEnd;
  return Math.min(900, (minutes(end) - minutes(localTime)) * 60 - now.getUTCSeconds() - 1);
}

export function schollyReminderLocalTime(now: Date, timeZone: string): { day: string; time: string } | null {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(now);
    const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
    return {
      day: `${value("year")}-${value("month")}-${value("day")}`,
      time: `${value("hour")}:${value("minute")}`,
    };
  } catch {
    // An obsolete timezone must never fall back to sending at the wrong local time.
    return null;
  }
}
