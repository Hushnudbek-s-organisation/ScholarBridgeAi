/**
 * Shared plumbing for the growth-feature routes: table bootstrap, auth,
 * throttling and consistent JSON errors — so each route file stays short and
 * every one of them applies the same security rules.
 */
import { NextResponse } from "next/server";
import { requireAdmin, requireProfileAccess, type Session } from "@/lib/auth";
import { checkRateLimit, LIMITS, rateLimitedResponse } from "@/lib/rate-limit";
import { readJsonBody } from "@/lib/request";
import { ensureGrowthTables, GROWTH_UNAVAILABLE } from "./db";

export type Guard<T> = { ok: true; value: T } | { ok: false; response: NextResponse };

export function jsonError(status: number, error: string, code = "error") {
  return NextResponse.json({ error, code }, { status });
}

/** Tables ready? (lazy DDL + seed on first use). */
export async function guardTables(): Promise<NextResponse | null> {
  const ok = await ensureGrowthTables();
  return ok ? null : NextResponse.json(GROWTH_UNAVAILABLE, { status: 503 });
}

/**
 * Student route guard: tables ready + caller may act on `claimedId` (their
 * own profile, or any profile for an admin). Missing id = the caller's own.
 */
export async function guardStudent(
  req: Request,
  claimedId: unknown,
  opts: { write?: boolean } = {}
): Promise<Guard<{ profileId: number; session: Session }>> {
  const tables = await guardTables();
  if (tables) return { ok: false, response: tables };
  const access = await requireProfileAccess(req, claimedId);
  if (!access.ok || access.targetId == null) {
    return {
      ok: false,
      response: jsonError(access.ok ? 400 : access.status, access.ok ? "profileId is required" : access.error, access.ok ? "bad_request" : access.code),
    };
  }
  if (opts.write) {
    const rl = checkRateLimit(`growth:${access.session.profile.id}`, LIMITS.userWrite);
    if (!rl.ok) return { ok: false, response: rateLimitedResponse(rl.retryAfterSec) };
  }
  return { ok: true, value: { profileId: access.targetId, session: access.session } };
}

/** Admin route guard: tables ready + live admin flag (+ write throttle). */
export async function guardAdmin(req: Request, opts: { write?: boolean } = {}): Promise<Guard<Session>> {
  const tables = await guardTables();
  if (tables) return { ok: false, response: tables };
  const auth = await requireAdmin(req);
  if (!auth.ok) return { ok: false, response: jsonError(auth.status, auth.error, auth.code) };
  if (opts.write) {
    const rl = checkRateLimit(`admin:${auth.session.profile.id}`, LIMITS.adminWrite);
    if (!rl.ok) return { ok: false, response: rateLimitedResponse(rl.retryAfterSec) };
  }
  return { ok: true, value: auth.session };
}

/** Size-capped JSON body (64 KB is plenty for every growth form). */
export async function readBody(req: Request): Promise<Guard<Record<string, unknown>>> {
  const r = await readJsonBody<Record<string, unknown>>(req, 64 * 1024);
  if (!r.ok) return { ok: false, response: jsonError(r.status, r.error, r.code) };
  if (!r.body || typeof r.body !== "object" || Array.isArray(r.body)) {
    return { ok: false, response: jsonError(400, "Invalid JSON body", "bad_json") };
  }
  return { ok: true, value: r.body };
}

export function idParam(req: Request, name = "id"): number | null {
  const n = Number(new URL(req.url).searchParams.get(name));
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function bool(v: unknown, fallback = false): boolean {
  if (v === true || v === "true") return true;
  if (v === false || v === "false") return false;
  return fallback;
}

export function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

/** Internal error → log + generic 500 (never leak SQL/stack to the client). */
export function serverError(where: string, err: unknown) {
  console.error(`[growth] ${where}:`, err);
  return jsonError(500, "Something went wrong. Please try again.", "server_error");
}
