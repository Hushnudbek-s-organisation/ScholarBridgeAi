/**
 * Platform ownership service — the ONLY code that changes the owner or the
 * admin role (besides the env bootstrap in db/seed.ts).
 *
 * Security properties:
 *  - every actor id comes from the verified session (never from the client);
 *  - start / accept / confirm re-verify the actor's password (route layer);
 *  - transitions use conditional UPDATEs (`WHERE status IN (...)`) so a
 *    replayed or concurrent request cannot apply twice;
 *  - confirm runs in one transaction that locks the ownership row
 *    (`FOR UPDATE`) — two confirmations cannot interleave;
 *  - at most one open transfer (partial unique index);
 *  - every change is audited and both parties are notified.
 */
import { and, asc, desc, eq, inArray, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { ownershipTransfers, platformOwnership, studentProfiles } from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import { isUniqueViolation } from "@/lib/db-errors";
import { createLocalizedNotification } from "@/lib/notifications";
import type { NotifyLang } from "@/lib/notificationTexts";
import { ensureOwnershipTables } from "./db";
import {
  HANDOVER_CHECKLIST,
  OPEN_STATUSES,
  statusesAllowing,
  transferExpiresAt,
  type OwnershipAction,
  type OwnershipStatus,
} from "./state";

export class OwnershipError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "OwnershipError";
  }
}

type Transfer = typeof ownershipTransfers.$inferSelect;

async function audit(entityId: number, fieldChanged: string, oldValue: unknown, newValue: unknown, actorId: number | null) {
  await writeAudit({
    entityType: "ownership",
    entityId,
    fieldChanged,
    oldValue,
    newValue,
    source: actorId ? `admin:${actorId}` : "system",
    actor: actorId ? "ADMIN" : "AUTOMATED_SYSTEM",
  }).catch((err) => console.error("[ownership] audit failed:", (err as Error)?.message));
}

const TEXT: Record<string, (lang: NotifyLang) => { title: string; body: string }> = {
  offered: (l) =>
    l === "uz"
      ? { title: "Platforma egaligi taklif qilindi", body: "Sizga ScholarBridge platformasi egaligi taklif qilindi. Admin → Egalik bo'limida qabul qiling yoki rad eting." }
      : l === "ru"
      ? { title: "Вам предложено владение платформой", body: "Вам предложено владение платформой ScholarBridge. Примите или отклоните в Админ → Владение." }
      : { title: "Platform ownership offered", body: "You were offered ownership of this ScholarBridge platform. Accept or reject it in Admin → Ownership." },
  accepted: (l) =>
    l === "uz"
      ? { title: "Egalik taklifi qabul qilindi", body: "Yangi ega taklifni qabul qildi. O'tkazishni yakunlash uchun Admin → Egalik bo'limida tasdiqlang." }
      : l === "ru"
      ? { title: "Передача принята", body: "Получатель принял передачу. Подтвердите её в Админ → Владение, чтобы завершить." }
      : { title: "Transfer accepted", body: "The recipient accepted the transfer. Confirm it in Admin → Ownership to complete it." },
  completed: (l) =>
    l === "uz"
      ? { title: "Platforma egaligi o'tkazildi", body: "Platforma egaligi o'tkazish yakunlandi. Tashqi hisoblar (hosting, bot, AI) ro'yxati Admin → Egalik bo'limida." }
      : l === "ru"
      ? { title: "Владение платформой передано", body: "Передача владения завершена. Список внешних аккаунтов (хостинг, бот, ИИ) — в Админ → Владение." }
      : { title: "Platform ownership transferred", body: "The ownership transfer is complete. The external-accounts checklist (hosting, bot, AI) is in Admin → Ownership." },
  rejected: (l) =>
    l === "uz"
      ? { title: "Egalik taklifi rad etildi", body: "Platforma egaligini o'tkazish taklifi rad etildi." }
      : l === "ru"
      ? { title: "Передача отклонена", body: "Предложение о передаче владения отклонено." }
      : { title: "Transfer rejected", body: "The platform ownership transfer was rejected." },
  cancelled: (l) =>
    l === "uz"
      ? { title: "Egalik taklifi bekor qilindi", body: "Joriy ega platforma egaligini o'tkazishni bekor qildi." }
      : l === "ru"
      ? { title: "Передача отменена", body: "Владелец отменил передачу владения платформой." }
      : { title: "Transfer cancelled", body: "The owner cancelled the platform ownership transfer." },
  expired: (l) =>
    l === "uz"
      ? { title: "Egalik taklifi muddati tugadi", body: "Platforma egaligini o'tkazish taklifi muddati tugadi." }
      : l === "ru"
      ? { title: "Срок передачи истёк", body: "Срок предложения о передаче владения истёк." }
      : { title: "Transfer expired", body: "The platform ownership transfer expired." },
  adminGranted: (l) =>
    l === "uz"
      ? { title: "Sizga admin huquqi berildi", body: "Platforma egasi sizga admin huquqini berdi." }
      : l === "ru"
      ? { title: "Вам выданы права администратора", body: "Владелец платформы выдал вам права администратора." }
      : { title: "You are now an administrator", body: "The platform owner granted you admin access." },
  adminRevoked: (l) =>
    l === "uz"
      ? { title: "Admin huquqi olib tashlandi", body: "Platforma egasi sizning admin huquqingizni olib tashladi." }
      : l === "ru"
      ? { title: "Права администратора отозваны", body: "Владелец платформы отозвал ваши права администратора." }
      : { title: "Admin access removed", body: "The platform owner removed your admin access." },
};

async function notify(profileId: number, key: keyof typeof TEXT) {
  await createLocalizedNotification(profileId, { type: "security", link: "/#admin", text: TEXT[key] }).catch((err) =>
    console.error("[ownership] notify failed:", (err as Error)?.message)
  );
}

async function requireTables() {
  if (!(await ensureOwnershipTables())) {
    throw new OwnershipError("unavailable", 503, "Ownership management is temporarily unavailable. Please try again in a minute.");
  }
}

// ---------------------------------------------------------------------------
// Owner (bootstrap + read)
// ---------------------------------------------------------------------------

/**
 * The current owner row, creating it once from PLATFORM_OWNER_EMAIL, then
 * ADMIN_EMAIL (must be an admin), else the oldest admin. Null when the
 * platform has no admin at all.
 */
export async function getPlatformOwner(): Promise<{ ownerProfileId: number; source: string; updatedAt: Date } | null> {
  await requireTables();
  const [row] = await db.select().from(platformOwnership).where(eq(platformOwnership.id, 1));
  if (row) return row;

  let candidate: number | null = null;
  for (const envKey of ["PLATFORM_OWNER_EMAIL", "ADMIN_EMAIL"]) {
    const email = (process.env[envKey] || "").trim().toLowerCase();
    if (!email) continue;
    const [p] = await db
      .select({ id: studentProfiles.id })
      .from(studentProfiles)
      .where(and(sql`lower(${studentProfiles.email}) = ${email}`, eq(studentProfiles.isAdmin, true)))
      .limit(1);
    if (p) {
      candidate = p.id;
      break;
    }
  }
  if (candidate === null) {
    const [oldest] = await db
      .select({ id: studentProfiles.id })
      .from(studentProfiles)
      .where(eq(studentProfiles.isAdmin, true))
      .orderBy(asc(studentProfiles.id))
      .limit(1);
    candidate = oldest?.id ?? null;
  }
  if (candidate === null) return null;

  const inserted = await db
    .insert(platformOwnership)
    .values({ id: 1, ownerProfileId: candidate, source: "bootstrap" })
    .onConflictDoNothing()
    .returning();
  if (inserted[0]) await audit(0, "owner_bootstrap", null, { ownerProfileId: candidate }, null);
  const [final] = await db.select().from(platformOwnership).where(eq(platformOwnership.id, 1));
  return final ?? null;
}

export async function isPlatformOwner(profileId: number): Promise<boolean> {
  const owner = await getPlatformOwner();
  return owner?.ownerProfileId === profileId;
}

/** Owner id without bootstrapping (for guards that must not create state). */
export async function currentOwnerId(): Promise<number | null> {
  try {
    if (!(await ensureOwnershipTables())) return null;
    const [row] = await db.select({ id: platformOwnership.ownerProfileId }).from(platformOwnership).where(eq(platformOwnership.id, 1));
    return row?.id ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Expiry (lazy — runs on every ownership request; no cron needed)
// ---------------------------------------------------------------------------

export async function expireStaleTransfers(now: Date = new Date()): Promise<number> {
  await requireTables();
  const expired = await db
    .update(ownershipTransfers)
    .set({ status: "expired", decidedAt: now })
    .where(and(inArray(ownershipTransfers.status, [...OPEN_STATUSES]), lte(ownershipTransfers.expiresAt, now)))
    .returning();
  for (const t of expired) {
    await audit(t.id, "transfer_status", "open", "expired", null);
    await notify(t.fromProfileId, "expired");
    await notify(t.toProfileId, "expired");
  }
  return expired.length;
}

// ---------------------------------------------------------------------------
// Transitions
// ---------------------------------------------------------------------------

async function findAdminByEmail(email: string) {
  const [p] = await db
    .select({ id: studentProfiles.id, name: studentProfiles.name, email: studentProfiles.email, isAdmin: studentProfiles.isAdmin })
    .from(studentProfiles)
    .where(sql`lower(${studentProfiles.email}) = ${email.trim().toLowerCase()}`)
    .limit(1);
  return p ?? null;
}

export async function startTransfer(input: { ownerId: number; targetEmail: string; retainAdmin: boolean; note?: string | null }): Promise<Transfer> {
  await expireStaleTransfers();
  const owner = await getPlatformOwner();
  if (!owner || owner.ownerProfileId !== input.ownerId) {
    throw new OwnershipError("not_owner", 403, "Only the current platform owner can start a transfer.");
  }
  const target = await findAdminByEmail(input.targetEmail);
  // Same message for "no such account" and "not an admin": no account probing.
  if (!target || !target.isAdmin) {
    throw new OwnershipError("invalid_target", 400, "The new owner must be an existing administrator account. Grant admin access first.");
  }
  if (target.id === input.ownerId) {
    throw new OwnershipError("invalid_target", 400, "You already own the platform.");
  }
  try {
    const [row] = await db
      .insert(ownershipTransfers)
      .values({
        fromProfileId: input.ownerId,
        toProfileId: target.id,
        status: "pending",
        retainPreviousAdmin: input.retainAdmin,
        note: input.note ? input.note.slice(0, 500) : null,
        expiresAt: transferExpiresAt(),
      })
      .returning();
    await audit(row.id, "transfer_started", null, { from: input.ownerId, to: target.id, retainAdmin: input.retainAdmin, expiresAt: row.expiresAt }, input.ownerId);
    await notify(target.id, "offered");
    return row;
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new OwnershipError("transfer_open", 409, "A transfer is already in progress. Cancel it before starting a new one.");
    }
    throw err;
  }
}

/** Apply a non-final transition with a conditional UPDATE (replay-safe). */
async function transition(transferId: number, actorId: number, action: Exclude<OwnershipAction, "confirm" | "expire">): Promise<Transfer> {
  await expireStaleTransfers();
  const [t] = await db.select().from(ownershipTransfers).where(eq(ownershipTransfers.id, transferId));
  if (!t) throw new OwnershipError("not_found", 404, "Transfer not found.");
  const role = t.fromProfileId === actorId ? "owner" : t.toProfileId === actorId ? "target" : null;
  // Owner-side actions also require still being the owner.
  if (role === "owner" && !(await isPlatformOwner(actorId))) {
    throw new OwnershipError("not_owner", 403, "Only the current platform owner can do this.");
  }
  const allowedFrom = statusesAllowing(action);
  const expectedRole = action === "cancel" ? "owner" : "target";
  if (role !== expectedRole) {
    throw new OwnershipError("forbidden", 403, "You are not allowed to perform this action on this transfer.");
  }
  const to: OwnershipStatus = action === "accept" ? "accepted" : action === "reject" ? "rejected" : "cancelled";
  const now = new Date();
  const [updated] = await db
    .update(ownershipTransfers)
    .set({
      status: to,
      ...(action === "accept" ? { acceptedAt: now } : { decidedAt: now, decidedBy: actorId }),
    })
    .where(
      and(
        eq(ownershipTransfers.id, transferId),
        inArray(ownershipTransfers.status, allowedFrom),
        sql`${ownershipTransfers.expiresAt} > ${now}`
      )
    )
    .returning();
  if (!updated) {
    throw new OwnershipError("invalid_state", 409, `This transfer is ${t.status} and can no longer be ${action === "accept" ? "accepted" : action === "reject" ? "rejected" : "cancelled"}.`);
  }
  await audit(t.id, "transfer_status", t.status, to, actorId);
  if (action === "accept") await notify(t.fromProfileId, "accepted");
  if (action === "reject") await notify(t.fromProfileId, "rejected");
  if (action === "cancel") await notify(t.toProfileId, "cancelled");
  return updated;
}

export const acceptTransfer = (transferId: number, actorId: number) => transition(transferId, actorId, "accept");
export const rejectTransfer = (transferId: number, actorId: number) => transition(transferId, actorId, "reject");
export const cancelTransfer = (transferId: number, actorId: number) => transition(transferId, actorId, "cancel");

/**
 * Final step, by the CURRENT owner, after the target accepted. One
 * transaction: lock ownership row → conditional status update → move owner
 * → adjust admin flags. Any failure rolls everything back.
 */
export async function confirmTransfer(transferId: number, actorId: number): Promise<Transfer> {
  await expireStaleTransfers();
  const now = new Date();
  const result = await db.transaction(async (tx) => {
    const [own] = await tx.select().from(platformOwnership).where(eq(platformOwnership.id, 1)).for("update");
    if (!own || own.ownerProfileId !== actorId) {
      throw new OwnershipError("not_owner", 403, "Only the current platform owner can confirm a transfer.");
    }
    const [done] = await tx
      .update(ownershipTransfers)
      .set({ status: "completed", decidedAt: now, decidedBy: actorId })
      .where(
        and(
          eq(ownershipTransfers.id, transferId),
          eq(ownershipTransfers.fromProfileId, actorId),
          inArray(ownershipTransfers.status, statusesAllowing("confirm")),
          sql`${ownershipTransfers.expiresAt} > ${now}`
        )
      )
      .returning();
    if (!done) {
      throw new OwnershipError("invalid_state", 409, "This transfer is not waiting for your confirmation (it may have been rejected, cancelled, expired or already completed).");
    }
    const [target] = await tx
      .select({ id: studentProfiles.id, isAdmin: studentProfiles.isAdmin })
      .from(studentProfiles)
      .where(eq(studentProfiles.id, done.toProfileId))
      .for("update");
    if (!target?.isAdmin) {
      throw new OwnershipError("invalid_target", 409, "The recipient is no longer an administrator. Cancel this transfer and start a new one.");
    }
    await tx
      .update(platformOwnership)
      .set({ ownerProfileId: done.toProfileId, source: "transfer", updatedAt: now })
      .where(eq(platformOwnership.id, 1));
    if (!done.retainPreviousAdmin) {
      await tx.update(studentProfiles).set({ isAdmin: false }).where(eq(studentProfiles.id, actorId));
    }
    return done;
  });
  await audit(result.id, "transfer_status", "accepted", "completed", actorId);
  await audit(0, "owner_profile_id", actorId, result.toProfileId, actorId);
  if (!result.retainPreviousAdmin) {
    await writeAudit({
      entityType: "admin_role",
      entityId: actorId,
      fieldChanged: "is_admin",
      oldValue: true,
      newValue: false,
      source: `ownership_transfer:${result.id}`,
      actor: "ADMIN",
    }).catch(() => {});
  }
  await notify(result.fromProfileId, "completed");
  await notify(result.toProfileId, "completed");
  return result;
}

// ---------------------------------------------------------------------------
// Admin role (owner only)
// ---------------------------------------------------------------------------

export async function setAdminRole(input: { ownerId: number; targetEmail: string; isAdmin: boolean }) {
  if (!(await isPlatformOwner(input.ownerId))) {
    throw new OwnershipError("not_owner", 403, "Only the platform owner can change admin access.");
  }
  const target = await findAdminByEmail(input.targetEmail);
  if (!target) throw new OwnershipError("not_found", 404, "No account with that email.");
  if (target.id === input.ownerId) {
    throw new OwnershipError("invalid_target", 400, "The owner's admin access cannot be changed. Transfer ownership instead.");
  }
  if (target.isAdmin === input.isAdmin) return { profileId: target.id, isAdmin: target.isAdmin, changed: false };
  // Revoking the recipient of an open transfer would make the transfer
  // unconfirmable — cancel it first.
  if (!input.isAdmin) {
    const [open] = await db
      .select({ id: ownershipTransfers.id })
      .from(ownershipTransfers)
      .where(and(eq(ownershipTransfers.toProfileId, target.id), inArray(ownershipTransfers.status, [...OPEN_STATUSES])))
      .limit(1);
    if (open) throw new OwnershipError("transfer_open", 409, "This admin is the recipient of an open transfer. Cancel it first.");
  }
  await db.update(studentProfiles).set({ isAdmin: input.isAdmin }).where(eq(studentProfiles.id, target.id));
  await writeAudit({
    entityType: "admin_role",
    entityId: target.id,
    fieldChanged: "is_admin",
    oldValue: target.isAdmin,
    newValue: input.isAdmin,
    source: `admin:${input.ownerId}`,
    actor: "ADMIN",
  }).catch((err) => console.error("[ownership] audit failed:", (err as Error)?.message));
  await notify(target.id, input.isAdmin ? "adminGranted" : "adminRevoked");
  return { profileId: target.id, isAdmin: input.isAdmin, changed: true };
}

// ---------------------------------------------------------------------------
// Overview for the admin panel
// ---------------------------------------------------------------------------

export async function ownershipOverview(actorId: number) {
  await expireStaleTransfers();
  const owner = await getPlatformOwner();
  const people = new Map<number, { id: number; name: string; email: string }>();
  const admins = await db
    .select({ id: studentProfiles.id, name: studentProfiles.name, email: studentProfiles.email })
    .from(studentProfiles)
    .where(eq(studentProfiles.isAdmin, true))
    .orderBy(asc(studentProfiles.id));
  for (const a of admins) people.set(a.id, a);

  const isOwner = owner?.ownerProfileId === actorId;
  // Owners see the full history; other admins only transfers they are part of.
  const history = await db
    .select()
    .from(ownershipTransfers)
    .where(isOwner ? undefined : or(eq(ownershipTransfers.fromProfileId, actorId), eq(ownershipTransfers.toProfileId, actorId)))
    .orderBy(desc(ownershipTransfers.createdAt))
    .limit(20);

  const ids = new Set<number>([...(owner ? [owner.ownerProfileId] : []), ...history.flatMap((t) => [t.fromProfileId, t.toProfileId])]);
  const missing = [...ids].filter((id) => !people.has(id));
  if (missing.length) {
    const rows = await db
      .select({ id: studentProfiles.id, name: studentProfiles.name, email: studentProfiles.email })
      .from(studentProfiles)
      .where(inArray(studentProfiles.id, missing));
    for (const r of rows) people.set(r.id, r);
  }
  const who = (id: number) => people.get(id) ?? { id, name: "—", email: "" };
  const view = (t: Transfer) => ({
    id: t.id,
    status: t.status,
    from: who(t.fromProfileId),
    to: who(t.toProfileId),
    retainPreviousAdmin: t.retainPreviousAdmin,
    note: t.note,
    createdAt: t.createdAt,
    expiresAt: t.expiresAt,
    acceptedAt: t.acceptedAt,
    decidedAt: t.decidedAt,
    // What THIS admin can do now (the server re-checks on every action).
    canAccept: t.status === "pending" && t.toProfileId === actorId,
    canReject: (t.status === "pending" || t.status === "accepted") && t.toProfileId === actorId,
    canCancel: (t.status === "pending" || t.status === "accepted") && t.fromProfileId === actorId && isOwner,
    canConfirm: t.status === "accepted" && t.fromProfileId === actorId && isOwner,
  });
  const open = history.find((t) => (OPEN_STATUSES as readonly string[]).includes(t.status));
  return {
    owner: owner ? { ...who(owner.ownerProfileId), since: owner.updatedAt, source: owner.source } : null,
    isOwner,
    openTransfer: open ? view(open) : null,
    history: history.map(view),
    admins: isOwner ? admins.map((a) => ({ ...a, isOwner: a.id === owner?.ownerProfileId })) : [],
    checklist: HANDOVER_CHECKLIST,
  };
}
