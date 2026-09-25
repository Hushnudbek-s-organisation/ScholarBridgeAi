import { NextResponse } from "next/server";
import { db } from "@/db";
import { studentProfiles } from "@/db/schema";
import { sql } from "drizzle-orm";
import { sanitizeProfile, verifyPassword } from "@/lib/password";

/**
 * Student sign-in: email + password (the pair created at sign up).
 * Works from ANY device/browser — the account lives in the database, not in
 * localStorage. Legacy accounts without a password (e.g. the owner's admin
 * account) get a clear hint to use the Admin sign-in instead.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const [profile] = await db
      .select()
      .from(studentProfiles)
      .where(sql`lower(${studentProfiles.email}) = ${email.toLowerCase()}`)
      .limit(1);

    if (!profile) {
      return NextResponse.json(
        { error: "No account found with this email. Create a new account first." },
        { status: 401 }
      );
    }

    if (!profile.passwordHash) {
      return NextResponse.json(
        {
          error:
            "This account has no password set yet. Open it once on this device (from “My accounts on this device”), then set a password in Edit Profile — or use Admin sign-in for the owner account.",
        },
        { status: 403 }
      );
    }

    if (!verifyPassword(password, profile.passwordHash)) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    return NextResponse.json({ profile: sanitizeProfile(profile) });
  } catch (error) {
    console.error("POST /api/auth/sign-in error:", error);
    return NextResponse.json({ error: "Sign-in failed" }, { status: 500 });
  }
}
