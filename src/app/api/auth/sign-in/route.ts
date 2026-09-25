import { NextResponse } from "next/server";
import { db } from "@/db";
import { studentProfiles } from "@/db/schema";
import { sql } from "drizzle-orm";
import { sanitizeProfile, verifyPassword } from "@/lib/password";

/**
 * Account sign-in: email + password (the pair created at sign up).
 * Works from ANY device/browser — the account lives in the database, not in
 * localStorage. This endpoint also authenticates admin profiles; admin status
 * changes the access they receive after sign-in, not the authentication flow.
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
            "This account has no password set yet. Set one in Edit Profile on a device where the account is available, or configure ADMIN_PASSWORD for the seeded admin account.",
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
