/**
 * Client-side analytics beacon (anonymous, first-party, no cookies set by us
 * in JS — the server owns the `sb_vid` cookie).
 *
 * Rules:
 *   - never blocks rendering (fire-and-forget, `keepalive`);
 *   - never throws (analytics must not break the app);
 *   - de-duplicates identical events fired within a few seconds (React
 *     StrictMode mounts effects twice in dev, tabs can be toggled rapidly);
 *   - skips automated browsers so bots don't inflate the admin numbers.
 */

export type TrackEventType = "page_view" | "screen_view" | "signup";

export interface TrackPayload {
  type?: TrackEventType;
  /** URL path, e.g. "/" or "/privacy". Defaults to the current location. */
  path?: string;
  /** In-app section for `screen_view` events (dashboard, universities, ...). */
  screen?: string;
  profileId?: number | null;
  locale?: string;
}

const STORAGE_KEY = "scholarbridge_vid";
const DEDUPE_WINDOW_MS = 6_000;
const sent = new Map<string, number>();

let cachedVisitorId: string | null = null;

function readStoredVisitorId(): string | null {
  if (cachedVisitorId) return cachedVisitorId;
  try {
    cachedVisitorId = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    cachedVisitorId = null;
  }
  return cachedVisitorId;
}

function storeVisitorId(id: string) {
  cachedVisitorId = id;
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // private mode / storage disabled — tracking still works via the cookie
  }
}

function isAutomatedBrowser(): boolean {
  try {
    return !!navigator.webdriver;
  } catch {
    return false;
  }
}

function currentReferrer(): string {
  try {
    return document.referrer || "";
  } catch {
    return "";
  }
}

function currentLocale(): string {
  try {
    const match = document.cookie.match(/(?:^|;\s*)scholarbridge_locale=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  } catch {
    return "";
  }
}

/**
 * Send one analytics event. Safe to call from any component/effect — it never
 * rejects and never throws.
 */
export function trackEvent(payload: TrackPayload = {}): void {
  if (typeof window === "undefined") return;
  if (isAutomatedBrowser()) return;

  const type: TrackEventType = payload.type ?? "page_view";
  const path = payload.path ?? window.location.pathname;
  const screen = payload.screen ?? "";
  const visitorId = readStoredVisitorId() ?? "";

  const key = `${type}|${path}|${screen}|${payload.profileId ?? ""}`;
  const now = Date.now();
  const last = sent.get(key);
  if (last && now - last < DEDUPE_WINDOW_MS) return;
  sent.set(key, now);
  if (sent.size > 300) {
    // Keep the map small on very long sessions.
    for (const [k, t] of sent) if (now - t > DEDUPE_WINDOW_MS * 10) sent.delete(k);
  }

  const body = JSON.stringify({
    type,
    path,
    screen: screen || undefined,
    referrer: currentReferrer(),
    locale: payload.locale || currentLocale() || undefined,
    profileId: payload.profileId ?? undefined,
    visitorId: visitorId || undefined,
  });

  const url = "/api/track";
  try {
    if (document.visibilityState === "hidden" && navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
      return;
    }
  } catch {
    // fall through to fetch
  }

  try {
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
      credentials: "same-origin",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json && typeof json.visitorId === "string" && json.visitorId) {
          storeVisitorId(json.visitorId);
        }
      })
      .catch(() => {
        /* analytics must never surface an error to the user */
      });
  } catch {
    // ignore
  }
}

/** Record a normal page load (used by `<SiteTracker />` in the root layout). */
export function trackPageView(path?: string): void {
  trackEvent({ type: "page_view", path });
}

/** Record an in-app section view (the SPA switches tabs, not URLs). */
export function trackScreen(screen: string, profileId?: number | null): void {
  if (!screen) return;
  trackEvent({ type: "screen_view", screen, profileId });
}
