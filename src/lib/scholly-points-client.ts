"use client";

export type SchollyPointsSnapshot = {
  balance: number;
  lifetimePoints: number;
  level: number;
  nextLevelAt: number | null;
  todayPoints: number;
  smallPoints: number;
  smallLimit: number;
  todayByReason: Record<string, number>;
};

export const SCHOLLY_POINTS_CHANGED = "scholly:points-changed";
export type SchollyPointsChange = { profileId: number; awardedPoints: number };

/** Announce only a server-confirmed action result. Zero can refresh the meter without playing a cue. */
export function announceSchollyPointsChanged(profileId: number, awardedPoints = 0) {
  if (typeof window === "undefined" || !Number.isSafeInteger(profileId) || profileId < 1) return;
  window.dispatchEvent(new CustomEvent<SchollyPointsChange>(SCHOLLY_POINTS_CHANGED, {
    detail: { profileId, awardedPoints: Number.isSafeInteger(awardedPoints) ? Math.max(0, awardedPoints) : 0 },
  }));
}
