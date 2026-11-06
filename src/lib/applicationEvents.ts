/**
 * One lightweight, in-tab signal for "the application list changed".
 *
 * Every screen that starts, edits or deletes an application emits it; the
 * materials hub (and any future consumer) refreshes its list. This is a local
 * view notification, NOT a second source of truth: the API remains authority,
 * and a `profileId` filter prevents another student's event from refreshing
 * this profile's list. Cross-tab / cross-instance changes still rely on the
 * normal server read when the panel mounts or is refocused.
 */
export const APPLICATIONS_CHANGED_EVENT = "sb:applications-changed";

export interface ApplicationsChangedDetail {
  profileId: number | null;
}

export function notifyApplicationsChanged(profileId: number | null): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ApplicationsChangedDetail>(APPLICATIONS_CHANGED_EVENT, {
    detail: { profileId },
  }));
}

export function onApplicationsChanged(handler: (detail: ApplicationsChangedDetail) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<ApplicationsChangedDetail>).detail;
    handler(detail ?? { profileId: null });
  };
  window.addEventListener(APPLICATIONS_CHANGED_EVENT, listener);
  return () => window.removeEventListener(APPLICATIONS_CHANGED_EVENT, listener);
}
