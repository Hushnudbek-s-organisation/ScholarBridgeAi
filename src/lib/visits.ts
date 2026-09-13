/**
 * Anonymous traffic tracking (server-side).
 *
 * Everything here is additive and defensive:
 *   - The `site_visits` table is created with `CREATE TABLE IF NOT EXISTS`
 *     (no existing table is ever altered or dropped).
 *   - If the table cannot be created (permissions, offline DB, ...) tracking
 *     silently switches itself off — no request in the app ever fails because
 *     of analytics.
 *
 * Privacy: guests are identified only by a random first-party cookie
 * (`sb_vid`). No IP address is stored, the user agent is kept only to tell
 * bots/mobile/desktop apart, and `profile_id` is filled just for signed-in
 * users (who already have an account row).
 */
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { siteVisits } from "@/db/schema";

/** Name of the anonymous visitor cookie (first-party, 1 year). */
export const VISITOR_COOKIE = "sb_vid";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Event types we accept from the client. */
export type VisitEventType = "page_view" | "screen_view" | "signup";
const ALLOWED_EVENT_TYPES: VisitEventType[] = ["page_view", "screen_view", "signup"];

/** Common crawlers / preview bots / health checks — never counted as visits. */
const BOT_PATTERN =
  /(bot|crawl|spider|slurp|bingpreview|facebookexternalhit|twitterbot|linkedinbot|telegrambot|whatsapp|discordbot|slackbot|google-inspectionagent|pagespeed|lighthouse|headless|phantomjs|selenium|curl\/|wget|python-requests|python-urllib|go-http-client|java\/|okhttp|axios\/|monitor|uptime|healthcheck|check_http|scan)/i;

export type DeviceKind = "desktop" | "mobile" | "tablet" | "bot";

/** Classify a user agent string (bot first — bots are filtered out anyway). */
export function detectDevice(userAgent: string): DeviceKind {
  const ua = userAgent || "";
  if (BOT_PATTERN.test(ua)) return "bot";
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|windows phone|blackberry|opera mini|iemobile/i.test(ua)) return "mobile";
  return "desktop";
}

/**
 * Reduce a referrer URL to a short, privacy-friendly source label:
 *   "https://www.google.com/search?q=x" → "google.com"
 *   "" | same site                        → "direct"
 */
export function normalizeReferrer(raw: string | null | undefined, host?: string | null): string {
  const value = (raw || "").trim();
  if (!value) return "direct";
  try {
    const url = new URL(value);
    if (!url.hostname) return "direct";
    if (host && url.hostname === host) return "internal";
    return url.hostname.replace(/^www\./, "").slice(0, 120);
  } catch {
    return value.replace(/^https?:\/\//, "").split("/")[0].slice(0, 120) || "direct";
  }
}

/** Tiny cookie parser (Route Handlers get the raw `cookie` header). */
export function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return null;
}

/** Build the `Set-Cookie` header value for the anonymous visitor id. */
export function visitorCookieHeader(visitorId: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${VISITOR_COOKIE}=${visitorId}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}

/** Random, URL-safe anonymous visitor id (no personal data). */
export function makeVisitorId(): string {
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------------------------------------------------------------------------
// Lazy, additive schema bootstrap
// ---------------------------------------------------------------------------

let tableReady: boolean | null = null; // null = not checked yet
let lastAttemptAt = 0;
const RETRY_AFTER_MS = 60_000; // re-try a failed CREATE at most once a minute

/**
 * Make sure `site_visits` (+ its indexes) exists. Idempotent and additive —
 * the same DDL as `supabase/add_analytics.sql`.
 */
export async function ensureAnalyticsTables(): Promise<boolean> {
  if (tableReady === true) return true;
  const now = Date.now();
  if (tableReady === false && now - lastAttemptAt < RETRY_AFTER_MS) return false;
  lastAttemptAt = now;

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS site_visits (
        id serial PRIMARY KEY,
        visitor_id text NOT NULL DEFAULT '',
        profile_id integer REFERENCES student_profiles(id) ON DELETE SET NULL,
        event_type text NOT NULL DEFAULT 'page_view',
        path text NOT NULL DEFAULT '/',
        screen text,
        referrer text,
        user_agent text,
        device text NOT NULL DEFAULT 'desktop',
        locale text,
        country text,
        is_first_visit boolean NOT NULL DEFAULT false,
        created_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS site_visits_created_at_idx ON site_visits (created_at)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS site_visits_visitor_id_idx ON site_visits (visitor_id)`);
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS site_visits_event_type_created_at_idx ON site_visits (event_type, created_at)`
    );
    tableReady = true;
    return true;
  } catch (err) {
    tableReady = false;
    console.warn("[analytics] site_visits table unavailable — tracking disabled:", (err as Error)?.message ?? err);
    return false;
  }
}

/** Is traffic tracking currently working? (used by the admin dashboard) */
export async function isTrackingAvailable(): Promise<boolean> {
  return ensureAnalyticsTables();
}

// ---------------------------------------------------------------------------
// Recording
// ---------------------------------------------------------------------------

export interface RecordVisitInput {
  eventType?: VisitEventType;
  path?: string;
  screen?: string | null;
  referrer?: string | null;
  locale?: string | null;
  profileId?: number | null;
  /** Request headers of the incoming call (user agent / cookie / referer). */
  headers?: Headers | null;
  /** Visitor id already known to the caller (skips cookie parsing). */
  visitorId?: string | null;
}

export interface RecordVisitResult {
  visitorId: string;
  firstVisit: boolean;
  recorded: boolean;
}

/**
 * In-process dedupe: React StrictMode double-mounts and rapid tab switching
 * must not inflate the numbers. Identical events within the window below are
 * counted once.
 */
const DEDUPE_WINDOW_MS = 8_000;
const DEDUPE_MAX_ENTRIES = 4_000;
const recentlySeen = new Map<string, number>();

function isDuplicate(key: string): boolean {
  const now = Date.now();
  if (recentlySeen.size > DEDUPE_MAX_ENTRIES) recentlySeen.clear();
  const seenAt = recentlySeen.get(key);
  recentlySeen.set(key, now);
  return seenAt !== undefined && now - seenAt < DEDUPE_WINDOW_MS;
}

const clip = (value: unknown, max: number): string => {
  const str = typeof value === "string" ? value.trim() : "";
  return str.length > max ? str.slice(0, max) : str;
};

/**
 * Record one visit/event. Never throws — analytics can't break a request.
 * Returns `recorded: false` when the event was skipped (bot, duplicate,
 * table unavailable, ...).
 */
export async function recordVisit(input: RecordVisitInput): Promise<RecordVisitResult | null> {
  const headers = input.headers ?? null;
  const userAgent = clip(headers?.get("user-agent") ?? "", 400);
  const device = detectDevice(userAgent);
  if (device === "bot") return null;

  const host = headers?.get("host") ?? null;
  const cookieVisitor = readCookie(headers?.get("cookie") ?? null, VISITOR_COOKIE);
  const visitorId = clip(input.visitorId ?? cookieVisitor ?? "", 64) || makeVisitorId();
  const firstVisit = !cookieVisitor && !input.visitorId;

  const eventType: VisitEventType = ALLOWED_EVENT_TYPES.includes(input.eventType as VisitEventType)
    ? (input.eventType as VisitEventType)
    : "page_view";
  const path = clip(input.path ?? "/", 300).replace(/^https?:\/\/[^/]+/, "") || "/";
  if (path.startsWith("/api/") || path.startsWith("/_next/")) return null;
  const screen = clip(input.screen ?? "", 80) || null;

  if (isDuplicate(`${visitorId}|${eventType}|${path}|${screen ?? ""}`)) {
    return { visitorId, firstVisit, recorded: false };
  }

  if (!(await ensureAnalyticsTables())) {
    return { visitorId, firstVisit, recorded: false };
  }

  const referrerRaw = clip(input.referrer ?? "", 400) || clip(headers?.get("referer") ?? "", 400);
  const profileId = Number.isFinite(Number(input.profileId)) && Number(input.profileId) > 0
    ? Number(input.profileId)
    : null;

  try {
    await db.insert(siteVisits).values({
      visitorId,
      profileId,
      eventType,
      path,
      screen,
      referrer: normalizeReferrer(referrerRaw, host),
      userAgent: userAgent || null,
      device,
      locale: clip(input.locale ?? "", 8) || null,
      country:
        clip(headers?.get("x-vercel-ip-country") ?? headers?.get("cf-ipcountry") ?? "", 2) || null,
      isFirstVisit: firstVisit,
    });
    return { visitorId, firstVisit, recorded: true };
  } catch (err) {
    tableReady = false; // e.g. table dropped/renamed — re-check on the next event
    console.warn("[analytics] failed to record visit:", (err as Error)?.message ?? err);
    return { visitorId, firstVisit, recorded: false };
  }
}
