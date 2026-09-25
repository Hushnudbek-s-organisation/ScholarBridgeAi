import { NextResponse } from "next/server";
import { randomBytes, timingSafeEqual } from "crypto";
import { db } from "@/db";
import { applications, studentProfiles } from "@/db/schema";
import { and, eq, isNotNull } from "drizzle-orm";
import { requireProfileAccess } from "@/lib/auth";
import { readJsonBody, clampString } from "@/lib/request";
import { buildParentSummary, parentShareLink, type ParentSource } from "@/lib/parentSummary";
import { computeProfileCompleteness } from "@/lib/gamification";

/**
 * Parent Dashboard access (Phase 4).
 *
 * The token is generated with a CSPRNG and compared with a constant-time check.
 * It grants a READ-ONLY summary built by `buildParentSummary` — never the
 * student record itself, so a leaked link cannot expose essays, scores or
 * rejections.
 */

/** POST — create or rotate the parent share link. */
export async function POST(req: Request) {
  try {
    const parsed = await readJsonBody<Record<string, any>>(req, 32 * 1024);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error, code: parsed.code }, { status: parsed.status });
    }
    const body = parsed.body;
    const profileId = Number(body.profileId);
    if (!profileId) {
      return NextResponse.json({ error: "profileId is required" }, { status: 400 });
    }
    const access = await requireProfileAccess(req, profileId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
    }

    const enabled = body.enabled === true;
    if (!enabled) {
      await db
        .update(studentProfiles)
        .set({ parentShareEnabled: false, parentShareToken: null })
        .where(eq(studentProfiles.id, profileId));
      return NextResponse.json({ enabled: false, link: null });
    }

    // 32 bytes of entropy; a link that cannot be guessed or brute-forced.
    const token = randomBytes(32).toString("base64url");
    const email = clampString(body.email, 254) || null;

    await db
      .update(studentProfiles)
      .set({
        parentShareEnabled: true,
        parentShareEmail: email,
        parentShareToken: token,
        parentShareCreatedAt: new Date(),
      })
      .where(eq(studentProfiles.id, profileId));

    const host = new URL(req.url).origin;
    return NextResponse.json({ enabled: true, link: parentShareLink(host, token) });
  } catch (error) {
    console.error("POST /api/parent-share error:", error);
    return NextResponse.json({ error: "Failed to update parent sharing" }, { status: 500 });
  }
}

/** GET ?token=... — the read-only summary a parent sees. */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token") ?? "";
    if (token.length < 20) {
      return NextResponse.json({ error: "This link is not valid." }, { status: 400 });
    }

    const rows = await db
      .select()
      .from(studentProfiles)
      .where(and(eq(studentProfiles.parentShareEnabled, true), isNotNull(studentProfiles.parentShareToken)));

    // Constant-time comparison: never let response timing narrow the search.
    const wanted = Buffer.from(token, "utf8");
    let profile: (typeof rows)[number] | undefined;
    for (const row of rows) {
      const candidate = Buffer.from(String(row.parentShareToken), "utf8");
      if (candidate.length === wanted.length && timingSafeEqual(candidate, wanted)) {
        profile = row;
        break;
      }
    }
    if (!profile) {
      return NextResponse.json({ error: "This link is not valid or has been revoked." }, { status: 404 });
    }

    const apps = await db.select().from(applications).where(eq(applications.profileId, profile.id));
    const submitted = apps.filter((a) => (a.status ?? "").toLowerCase() !== "not_started").length;
    const withDecision = apps.filter((a) => ["accepted", "rejected", "waitlisted"].includes((a.status ?? "").toLowerCase()));
    const accepted = apps.filter((a) => (a.status ?? "").toLowerCase() === "accepted").length;

    // Deliberately narrow: only what the parent view needs.
    const source: ParentSource = {
      // The schema stores one `name` column; the parent view only needs a
      // first name, so take the first word rather than the full legal name.
      studentFirstName: String(profile.name ?? "").trim().split(/\s+/)[0] || "Your child",
      degreeLevel: profile.degreeLevel,
      targetMajor: profile.targetMajor,
      targetCountries: profile.country,
      profileCompletenessPct: computeProfileCompleteness(profile),
      applicationCount: apps.length,
      submittedCount: submitted,
      decisionsCount: withDecision.length,
      acceptedCount: accepted,
      criticalDeadlineCount: 0,
      openTaskCount: apps.filter((a) => (a.status ?? "").toLowerCase() === "not_started").length,
      scholarshipCount: 0,
      needsFinancialDocuments: false,
    };

    return NextResponse.json({ summary: buildParentSummary(source) });
  } catch (error) {
    console.error("GET /api/parent-share error:", error);
    return NextResponse.json({ error: "Failed to load the parent view" }, { status: 500 });
  }
}
