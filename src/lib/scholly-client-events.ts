import type { SchollySegment } from "./scholly-audience";
import type { SchollyQueuedMessage } from "./scholly-messages";

export const SCHOLLY_DEADLINE_NEAR = "scholly:deadline-near";
export const SCHOLLY_APPLICATION_SUBMITTED = "scholly:application-submitted";
export const SCHOLLY_DASHBOARD_MESSAGES = "scholly:dashboard-messages";

export interface SchollyDashboardMessages {
  profileId: number;
  audience: readonly SchollySegment[];
  messages: readonly SchollyQueuedMessage[];
}

export interface SchollyDeadlineCue {
  profileId: number;
  id: string | number;
  dueDate: string;
  daysRemaining: number;
}

export interface SchollySubmissionCue {
  profileId: number;
  applicationId: number;
}

export function announceSchollySubmission(profileId: number, applicationId: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<SchollySubmissionCue>(SCHOLLY_APPLICATION_SUBMITTED, {
    detail: { profileId, applicationId },
  }));
}
