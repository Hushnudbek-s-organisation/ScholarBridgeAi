export const SCHOLLY_DEADLINE_NEAR = "scholly:deadline-near";
export const SCHOLLY_APPLICATION_SUBMITTED = "scholly:application-submitted";

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
