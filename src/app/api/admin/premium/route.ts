import { NextResponse } from "next/server";
import { db } from "@/db";
import { studentProfiles, payments, subscriptions } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq, and, ilike } from "drizzle-orm";
import { sanitizeProfile } from "@/lib/password";
import { syncProfilePremium } from "@/lib/payments";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const access = await requireAdmin(req);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      );
    }

    // Locate the recipient profile by explicit profileId (exact, most
    // reliable) or by email — case-insensitively, because PostgreSQL text
    // equality is case-sensitive and stored emails may have mixed case.
    let profile = null;
    if (body.profileId) {
      const [row] = await db
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.id, Number(body.profileId)));
      profile = row ?? null;
    }
    if (!profile && body.email) {
      // Escape wildcards so an email containing % or _ is matched literally.
      const email = String(body.email)
        .toLowerCase()
        .trim()
        .replace(/[%_]/g, (c) => `\\${c}`);
      const rows = await db
        .select()
        .from(studentProfiles)
        .where(ilike(studentProfiles.email, email));
      profile = rows[0] ?? null;
    }
    if (!profile) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
    }

    const days = Math.max(1, Number(body.days) || 30);
    const now = new Date();
    const periodEnd = new Date(now.getTime() + days * 86400000);

    // An ADMIN-GIFTED grant also lands on the profile columns, which is what
    // the dashboard, the readiness entitlements and /api/premium/status read.
    // Writing only the subscription row meant a gifted student stayed "free"
    // on their own screens until they reloaded some other way.
    await db
      .update(studentProfiles)
      .set({ isPremium: true, premiumUntil: periodEnd, updatedAt: now })
      .where(eq(studentProfiles.id, profile.id));

    // Ledger row for the gift (zero amount, marked paid).
    const [payment] = await db
      .insert(payments)
      .values({
        profileId: profile.id,
        provider: "gift",
        providerTransactionId: "",
        amount: 0,
        currency: "UZS",
        status: "paid",
        purpose: "premium_gift",
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Activate the gifted premium subscription.
    const [subscription] = await db
      .insert(subscriptions)
      .values({
        profileId: profile.id,
        plan: "premium",
        status: "active",
        currentPeriodEnd: periodEnd,
        paymentId: payment.id,
      })
      .returning();

    // Re-read: the update above changed `is_premium`/`premium_until`, and this
    // payload is what the admin table refreshes from — the pre-update row made
    // the student look free right after a successful grant.
    const [granted] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, profile.id));
    return NextResponse.json({
      subscription,
      profile: sanitizeProfile(granted ?? profile),
    });
  } catch (error) {
    console.error("POST /api/admin/premium error:", error);
    return NextResponse.json({ error: "Failed to grant premium" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const adminProfileId = searchParams.get("adminProfileId");
    const access = await requireAdmin(req);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      );
    }
    const profileId = Number(searchParams.get("profileId"));
    if (!profileId) {
      return NextResponse.json({ error: "Profile id is required" }, { status: 400 });
    }

    // "Revoke premium" takes away BOTH sources: the paid subscription and the
    // referral-earned window. (A referral-earned premium used to survive this
    // call, so a student could stay premium after an admin revoked.)
    await db
      .update(subscriptions)
      .set({ status: "canceled" })
      .where(
        and(
          eq(subscriptions.profileId, profileId),
          eq(subscriptions.status, "active")
        )
      );

    // Recompute the profile flag from what is left instead of blindly nulling
    // it: with the subscription canceled nothing remains, so this clears it.
    await syncProfilePremium(profileId, null);

    const [updated] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, profileId));
    return NextResponse.json({
      success: true,
      profile: updated ? sanitizeProfile(updated) : null,
    });
  } catch (error) {
    console.error("DELETE /api/admin/premium error:", error);
    return NextResponse.json({ error: "Failed to revoke premium" }, { status: 500 });
  }
}
