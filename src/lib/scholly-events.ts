import { db } from "../db";
import { schollyEvents } from "../db/schema";

export const SCHOLLY_ONBOARDING_EVENT_TYPES = [
  "onboarding_started",
  "onboarding_step",
  "onboarding_completed",
  "onboarding_skipped",
] as const;
export type SchollyOnboardingEventType = (typeof SCHOLLY_ONBOARDING_EVENT_TYPES)[number];

export const SCHOLLY_EVENT_TYPES = [
  ...SCHOLLY_ONBOARDING_EVENT_TYPES,
  "mission_shown",
  "mission_done",
  "mission_skipped",
  "mission_another",
  "mission_sprint_started",
  "quiz_done",
  "friend_mission_nudge",
  "weekly_report_reviewed",
  "sop_practiced",
  "points_awarded",
  "item_unlocked",
  "item_bought",
  "item_equipped",
  "level_up",
  "push_subscribed",
  "push_unsubscribed",
] as const;
export type SchollyEventType = (typeof SCHOLLY_EVENT_TYPES)[number];

/** Write a small, structured event tied to the already-authorized profile id. */
type SchollyEventWriter = Pick<typeof db, "insert">;

export async function logSchollyEvent(
  profileId: number,
  type: SchollyEventType,
  payload: Record<string, unknown> = {},
  writer: SchollyEventWriter = db,
) {
  const serialized = JSON.stringify(payload);
  if (serialized.length > 4_000) throw new Error("Scholly event payload is too large");
  await writer.insert(schollyEvents).values({ userId: profileId, type, payload });
}
