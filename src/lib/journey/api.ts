/**
 * Shared plumbing for the Journey Core routes.
 *
 * Same contract as `src/lib/growth/api.ts` so every new route enforces the
 * same three rules: tables ready, caller may act on this profile, writes are
 * throttled. A route file then only contains its own logic.
 */
import { NextResponse } from "next/server";
import { requireAdmin, requireProfileAccess, type AuthResult, type Session } from "@/lib/auth";
import { checkRateLimit, LIMITS, rateLimitedResponse } from "@/lib/rate-limit";
import { readJsonBody } from "@/lib/request";
import { ensureJourneyTables, JOURNEY_UNAVAILABLE } from "./db";

export type Guard<T> = { ok: true; value: T } | { ok: false; response: NextResponse };

export function jsonError(status: number, error: string, code = "error") {
  return NextResponse.json({ error, code }, { status });
}

/** Tables ready? (lazy DDL on first use). */
export async function guardTables(): Promise<NextResponse | null> {
  const ok = await ensureJourneyTables();
  return ok ? null : NextResponse.json(JOURNEY_UNAVAILABLE, { status: 503 });
}

/**
 * Student guard: tables ready + the caller may act on `claimedId`.
 *
 * `claimedId` is the id the request is TRYING to act on. It is compared with
 * the session — never trusted on its own — so a student can only ever read or
 * write their own rows. Omitting the id means "my own profile", exactly like
 * `requireProfileAccess`.
 */
export async function guardStudent(
  req: Request,
  claimedId: unknown,
  opts: { write?: boolean } = {}
): Promise<Guard<{ profileId: number; session: Session }>> {
  const tables = await guardTables();
  if (tables) return { ok: false, response: tables };
  const access: AuthResult & { targetId: number | null } = await requireProfileAccess(req, claimedId);
  if (!access.ok || access.targetId == null) {
    return {
      ok: false,
      response: jsonError(
        access.ok ? 400 : access.status,
        access.ok ? "profileId is required" : access.error,
        access.ok ? "bad_request" : access.code
      ),
    };
  }
  if (opts.write) {
    const rl = checkRateLimit(`journey:${access.session.profile.id}`, LIMITS.userWrite);
    if (!rl.ok) return { ok: false, response: rateLimitedResponse(rl.retryAfterSec) };
  }
  return { ok: true, value: { profileId: access.targetId, session: access.session } };
}

/** Admin guard: tables ready + live admin flag (+ write throttle). */
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

/** Size-capped JSON body (256 KB — the activity portfolio accepts a lot of text). */
export async function readBody(req: Request): Promise<Guard<Record<string, unknown>>> {
  const r = await readJsonBody<Record<string, unknown>>(req, 256 * 1024);
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

/** Trim a free-text field to a sane length; `null`/blank becomes `null`. */
export function text(v: unknown, max = 4000): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  return t.length ? t : null;
}

export function requiredText(v: unknown, max = 200): string | null {
  return text(v, max);
}

/** Parse a date string (YYYY-MM-DD) → Date at UTC midnight, or null. */
export function dateOnly(v: unknown): Date | null {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(v)) return null;
  const d = new Date(`${v.slice(0, 10)}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isoDate(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

/** Internal error → log + generic 500 (never leak SQL/stack to the client). */
export function serverError(where: string, err: unknown) {
  console.error(`[journey] ${where}:`, err);
  return jsonError(500, "Something went wrong. Please try again.", "server_error");
}
