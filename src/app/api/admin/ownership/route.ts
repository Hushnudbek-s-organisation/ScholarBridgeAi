/**
 * Platform ownership API (website admins only — requireAdmin rejects
 * Telegram sessions and non-admins).
 *
 *   GET  /api/admin/ownership → owner, open transfer, history, admins (owner
 *        only), external handover checklist
 *   POST /api/admin/ownership  { action, ... }
 *        start   { targetEmail, password, confirm: "TRANSFER", retainAdmin?, note? }  owner
 *        accept  { transferId, password }                                        recipient
 *        reject  { transferId }                                                  recipient
 *        cancel  { transferId }                                                  owner
 *        confirm { transferId, password }                                        owner (final)
 *        grantAdmin / revokeAdmin { email, password }                            owner
 *
 * The acting profile always comes from the verified session; ids in the body
 * only select a transfer and are re-checked against the session.
 */
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { studentProfiles } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { LIMITS, rateLimitedResponse } from "@/lib/rate-limit";
import { checkSharedRateLimit } from "@/lib/rate-limit-shared";
import { readJsonBody } from "@/lib/request";
import {
  OwnershipError,
  acceptTransfer,
  cancelTransfer,
  confirmTransfer,
  ownershipOverview,
  rejectTransfer,
  setAdminRole,
  startTransfer,
} from "@/lib/ownership/service";
import { TRANSFER_CONFIRM_PHRASE, transferTtlHours } from "@/lib/ownership/state";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fail(error: string, code: string, status: number) {
  return NextResponse.json({ error, code }, { status });
}

/** Re-authenticate the acting admin (rate limited like sign-in). */
async function checkPassword(profileId: number, password: unknown): Promise<NextResponse | null> {
  const limit = await checkSharedRateLimit(`owner-pw:${profileId}`, LIMITS.signIn);
  if (!limit.ok) return rateLimitedResponse(limit.retryAfterSec, "Too many password attempts. Try again later.");
  if (typeof password !== "string" || !password) return fail("Enter your account password to confirm.", "password_required", 400);
  const [row] = await db
    .select({ hash: studentProfiles.passwordHash })
    .from(studentProfiles)
    .where(eq(studentProfiles.id, profileId));
  if (!row?.hash) {
    return fail("Set an account password (Edit Profile) before managing ownership.", "password_not_set", 400);
  }
  if (!verifyPassword(password, row.hash)) return fail("Incorrect password.", "invalid_password", 403);
  return null;
}

function transferIdFrom(body: Record<string, unknown>): number | null {
  const n = Number(body.transferId);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function GET(req: Request) {
  const access = await requireAdmin(req);
  if (!access.ok) return fail(access.error, access.code, access.status);
  try {
    const overview = await ownershipOverview(access.session.profile.id);
    return NextResponse.json({ ...overview, ttlHours: transferTtlHours() }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof OwnershipError) return fail(err.message, err.code, err.status);
    console.error("GET /api/admin/ownership error:", (err as Error)?.message);
    return fail("Failed to load ownership information.", "server_error", 500);
  }
}

export async function POST(req: Request) {
  const access = await requireAdmin(req);
  if (!access.ok) return fail(access.error, access.code, access.status);
  const actorId = access.session.profile.id;

  const limit = await checkSharedRateLimit(`owner:${actorId}`, LIMITS.adminWrite);
  if (!limit.ok) return rateLimitedResponse(limit.retryAfterSec);

  const parsed = await readJsonBody<Record<string, unknown>>(req, 8 * 1024);
  if (!parsed.ok) return fail(parsed.error, parsed.code, parsed.status);
  const body = parsed.body;
  const action = String(body.action ?? "");

  try {
    switch (action) {
      case "start": {
        const targetEmail = String(body.targetEmail ?? "").trim();
        if (!EMAIL_RE.test(targetEmail) || targetEmail.length > 254) return fail("Enter the new owner's account email.", "invalid_email", 400);
        if (body.confirm !== TRANSFER_CONFIRM_PHRASE) {
          return fail(`Type ${TRANSFER_CONFIRM_PHRASE} to confirm.`, "confirmation_required", 400);
        }
        const pw = await checkPassword(actorId, body.password);
        if (pw) return pw;
        const transfer = await startTransfer({
          ownerId: actorId,
          targetEmail,
          retainAdmin: body.retainAdmin !== false,
          note: typeof body.note === "string" ? body.note.trim() : null,
        });
        return NextResponse.json({ success: true, transferId: transfer.id, status: transfer.status, expiresAt: transfer.expiresAt });
      }
      case "accept":
      case "confirm": {
        const id = transferIdFrom(body);
        if (!id) return fail("transferId is required.", "bad_request", 400);
        const pw = await checkPassword(actorId, body.password);
        if (pw) return pw;
        const t = action === "accept" ? await acceptTransfer(id, actorId) : await confirmTransfer(id, actorId);
        return NextResponse.json({ success: true, transferId: t.id, status: t.status });
      }
      case "reject":
      case "cancel": {
        const id = transferIdFrom(body);
        if (!id) return fail("transferId is required.", "bad_request", 400);
        const t = action === "reject" ? await rejectTransfer(id, actorId) : await cancelTransfer(id, actorId);
        return NextResponse.json({ success: true, transferId: t.id, status: t.status });
      }
      case "grantAdmin":
      case "revokeAdmin": {
        const email = String(body.email ?? "").trim();
        if (!EMAIL_RE.test(email) || email.length > 254) return fail("Enter the account email.", "invalid_email", 400);
        const pw = await checkPassword(actorId, body.password);
        if (pw) return pw;
        const r = await setAdminRole({ ownerId: actorId, targetEmail: email, isAdmin: action === "grantAdmin" });
        return NextResponse.json({ success: true, ...r });
      }
      default:
        return fail("Unknown action.", "bad_request", 400);
    }
  } catch (err) {
    if (err instanceof OwnershipError) return fail(err.message, err.code, err.status);
    console.error("POST /api/admin/ownership error:", (err as Error)?.message);
    return fail("Ownership action failed.", "server_error", 500);
  }
}
