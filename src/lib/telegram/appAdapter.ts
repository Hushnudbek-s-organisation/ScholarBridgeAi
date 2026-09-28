/**
 * Telegram → existing app adapter.
 *
 * The bot never re-implements search, saving, applications, deadlines, next
 * actions or the AI advisor. It calls the SAME route handlers the website
 * calls, authenticated as the linked profile with a short-lived `tg1` channel
 * token (see lib/auth). That means the exact same ownership checks, input
 * validation, entitlements, AI quotas and rate limits apply — per account for
 * signed-in limits, and per Telegram user where a route limits by client IP.
 *
 * Route modules are imported lazily so this file never creates an import
 * cycle (routes → notifications → telegram service → bot → routes).
 */
import { signTelegramChannelToken } from "@/lib/auth";

export interface AppIdentity {
  profileId: number;
  telegramUserId: string;
}

export interface AppResponse<T = any> {
  status: number;
  body: T | null;
  /** The route served sample data because the database was unavailable. */
  fallback: boolean;
}

type Handler = (req: Request, ctx?: any) => Promise<Response>;

/** Bot calls live for seconds, not the Mini App's hour. */
const BOT_TOKEN_TTL_SECONDS = 120;

export async function callApp<T = any>(
  handler: Handler,
  who: AppIdentity,
  input: { method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; path: string; body?: unknown; ctx?: unknown }
): Promise<AppResponse<T>> {
  const token = signTelegramChannelToken(
    { profileId: who.profileId, telegramUserId: who.telegramUserId, channel: "bot" },
    { ttlSeconds: BOT_TOKEN_TTL_SECONDS }
  );
  const headers: Record<string, string> = {
    authorization: `Bearer ${token}`,
    // Routes that rate-limit by client address see the Telegram user instead
    // of the server's own IP (which every bot call would otherwise share).
    "x-real-ip": `tg:${who.telegramUserId}`,
  };
  let body: string | undefined;
  if (input.body !== undefined) {
    body = JSON.stringify(input.body);
    headers["content-type"] = "application/json";
  }
  const req = new Request(`http://telegram.internal${input.path}`, { method: input.method ?? "GET", headers, body });
  const res = await handler(req, input.ctx);
  let json: T | null = null;
  try {
    json = (await res.json()) as T;
  } catch {
    json = null;
  }
  return { status: res.status, body: json, fallback: res.headers.get("x-data-source") === "fallback" };
}

// ---------------------------------------------------------------------------
// Typed wrappers over the existing routes
// ---------------------------------------------------------------------------

const q = (params: Record<string, string | number | null | undefined>) => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== null && v !== undefined && v !== "") sp.set(k, String(v));
  return sp.toString();
};

export const PAGE_SIZE = 5;

export async function searchUniversities(who: AppIdentity, search: string, page: number) {
  const { GET } = await import("@/app/api/universities/route");
  return callApp(GET, who, { path: `/api/universities?${q({ profileId: who.profileId, search, page, perPage: PAGE_SIZE })}` });
}

export async function searchScholarships(who: AppIdentity, search: string, page: number) {
  const { GET } = await import("@/app/api/scholarships/route");
  return callApp(GET, who, { path: `/api/scholarships?${q({ profileId: who.profileId, search, page, perPage: PAGE_SIZE })}` });
}

export async function saveUniversity(who: AppIdentity, universityId: number) {
  const { POST } = await import("@/app/api/saved-universities/route");
  return callApp(POST, who, { method: "POST", path: "/api/saved-universities", body: { profileId: who.profileId, universityId } });
}

export async function saveScholarship(who: AppIdentity, scholarshipId: number) {
  const { POST } = await import("@/app/api/saved-scholarships/route");
  return callApp(POST, who, { method: "POST", path: "/api/saved-scholarships", body: { profileId: who.profileId, scholarshipId } });
}

export async function savedUniversities(who: AppIdentity) {
  const { GET } = await import("@/app/api/saved-universities/route");
  return callApp(GET, who, { path: `/api/saved-universities?profileId=${who.profileId}` });
}

export async function savedScholarships(who: AppIdentity) {
  const { GET } = await import("@/app/api/saved-scholarships/route");
  return callApp(GET, who, { path: `/api/saved-scholarships?profileId=${who.profileId}` });
}

export async function listApplications(who: AppIdentity) {
  const { GET } = await import("@/app/api/applications/route");
  return callApp(GET, who, { path: `/api/applications?profileId=${who.profileId}` });
}

export async function listDeadlines(who: AppIdentity) {
  const { GET } = await import("@/app/api/deadlines/route");
  return callApp(GET, who, { path: `/api/deadlines?profileId=${who.profileId}` });
}

export async function nextActions(who: AppIdentity) {
  const { GET } = await import("@/app/api/next-actions/route");
  return callApp(GET, who, { path: `/api/next-actions?profileId=${who.profileId}` });
}

export async function getProfile(who: AppIdentity) {
  const { GET } = await import("@/app/api/profiles/[id]/route");
  return callApp(GET, who, { path: `/api/profiles/${who.profileId}`, ctx: { params: Promise.resolve({ id: String(who.profileId) }) } });
}

export async function askAdvisor(who: AppIdentity, message: string) {
  const { POST } = await import("@/app/api/ai/chat/route");
  return callApp(POST, who, { method: "POST", path: "/api/ai/chat", body: { profileId: who.profileId, message, chatHistory: [] } });
}
