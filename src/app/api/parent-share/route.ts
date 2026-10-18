import { NextResponse } from "next/server";
import { randomBytes, timingSafeEqual } from "crypto";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { admissionOffers, applicationOutcomes, applications, studentProfiles } from "@/db/schema";
import { requireProfileAccess } from "@/lib/auth";
import { readJsonBody, clampString } from "@/lib/request";
import { configuredAppUrl } from "@/lib/appUrl";
import { buildParentSummary, parentShareLink, type ParentSource } from "@/lib/parentSummary";
import { premiumGate } from "@/lib/premium";

export const dynamic = "force-dynamic";

/** No bearer-token response may be stored by a browser, proxy, or shared cache. */
function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

function noStoreResponse(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

function preferredCountries(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) {
      const countries = parsed
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().slice(0, 100))
        .filter(Boolean)
        .slice(0, 8);
      return countries.length ? countries.join(", ") : null;
    }
  } catch {
    // Older profiles may contain a comma-separated string.
  }
  const countries = value.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 8);
  return countries.length ? countries.join(", ") : null;
}

/** POST — create, rotate, or revoke the parent share link. */
export async function POST(req: Request) {
  try {
    const parsed = await readJsonBody<Record<string, any>>(req, 32 * 1024);
    if (!parsed.ok) {
      return noStoreJson({ error: parsed.error, code: parsed.code }, { status: parsed.status });
    }
    const body = parsed.body;
    const profileId = Number(body.profileId);
    if (!Number.isSafeInteger(profileId) || profileId <= 0) {
      return noStoreJson({ error: "profileId is required" }, { status: 400 });
    }
    const access = await requireProfileAccess(req, profileId);
    if (!access.ok) {
      return noStoreJson({ error: access.error, code: access.code }, { status: access.status });
    }
    // The UI gate is not authorization: every state-changing request is gated here too.
    const locked = await premiumGate(access.session.profile.id, "parent_dashboard");
    if (locked) return noStoreResponse(locked);

    const enabled = body.enabled === true;
    if (!enabled) {
      await db
        .update(studentProfiles)
        .set({ parentShareEnabled: false, parentShareToken: null, parentShareEmail: null })
        .where(eq(studentProfiles.id, access.targetId!));
      return noStoreJson({ enabled: false, email: "", link: null });
    }

    // Parent links leave the server. Never derive their domain from a request
    // Host header; require an owner-configured canonical URL instead.
    const publicBaseUrl = configuredAppUrl();
    if (!publicBaseUrl) {
      return noStoreJson(
        { error: "Parent share links require a configured canonical app URL", code: "canonical_url_missing" },
        { status: 503 }
      );
    }

    // 32 bytes of entropy; the token is a bearer credential, not a profile id.
    const token = randomBytes(32).toString("base64url");
    const email = clampString(body.email, 254) || null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return noStoreJson({ error: "Enter a valid email address" }, { status: 400 });
    }

    await db
      .update(studentProfiles)
      .set({
        parentShareEnabled: true,
        parentShareEmail: email,
        parentShareToken: token,
        parentShareCreatedAt: new Date(),
      })
      .where(eq(studentProfiles.id, access.targetId!));

    return noStoreJson({ enabled: true, email: email ?? "", link: parentShareLink(publicBaseUrl, token), linkUnavailable: false });
  } catch (error) {
    console.error("POST /api/parent-share error:", error);
    return noStoreJson({ error: "Failed to update parent sharing" }, { status: 500 });
  }
}

/** PATCH — update the optional owner-only contact note without rotating the link. */
export async function PATCH(req: Request) {
  try {
    const parsed = await readJsonBody<Record<string, any>>(req, 32 * 1024);
    if (!parsed.ok) {
      return noStoreJson({ error: parsed.error, code: parsed.code }, { status: parsed.status });
    }
    const profileId = Number(parsed.body.profileId);
    if (!Number.isSafeInteger(profileId) || profileId <= 0) {
      return noStoreJson({ error: "profileId is required" }, { status: 400 });
    }
    const access = await requireProfileAccess(req, profileId);
    if (!access.ok) {
      return noStoreJson({ error: access.error, code: access.code }, { status: access.status });
    }
    const locked = await premiumGate(access.session.profile.id, "parent_dashboard");
    if (locked) return noStoreResponse(locked);

    const email = clampString(parsed.body.email, 254);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return noStoreJson({ error: "Enter a valid email address" }, { status: 400 });
    }
    const [settings] = await db
      .select({ enabled: studentProfiles.parentShareEnabled })
      .from(studentProfiles)
      .where(eq(studentProfiles.id, access.targetId!));
    if (!settings) return noStoreJson({ error: "Profile not found" }, { status: 404 });
    if (!settings.enabled) return noStoreJson({ error: "Enable sharing before saving the contact note" }, { status: 409 });

    await db
      .update(studentProfiles)
      .set({ parentShareEmail: email || null })
      .where(eq(studentProfiles.id, access.targetId!));
    return noStoreJson({ email });
  } catch (error) {
    console.error("PATCH /api/parent-share error:", error);
    return noStoreJson({ error: "Failed to update the contact note" }, { status: 500 });
  }
}

/**
 * GET ?profileId=N — authenticated owner settings; GET ?token=... — public,
 * read-only allowlisted summary for the bearer link.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const ownerProfileId = url.searchParams.get("profileId");

    if (ownerProfileId !== null) {
      const parsedProfileId = Number(ownerProfileId);
      if (!Number.isSafeInteger(parsedProfileId) || parsedProfileId <= 0) {
        return noStoreJson({ error: "profileId must be a positive integer" }, { status: 400 });
      }
      const access = await requireProfileAccess(req, parsedProfileId);
      if (!access.ok) {
        return noStoreJson({ error: access.error, code: access.code }, { status: access.status });
      }
      const locked = await premiumGate(access.session.profile.id, "parent_dashboard");
      if (locked) return noStoreResponse(locked);

      const [settings] = await db
        .select({
          enabled: studentProfiles.parentShareEnabled,
          email: studentProfiles.parentShareEmail,
          token: studentProfiles.parentShareToken,
        })
        .from(studentProfiles)
        .where(eq(studentProfiles.id, access.targetId!));
      if (!settings) return noStoreJson({ error: "Profile not found" }, { status: 404 });

      const publicBaseUrl = configuredAppUrl();
      return noStoreJson({
        enabled: settings.enabled,
        email: settings.email ?? "",
        link: settings.enabled && settings.token && publicBaseUrl ? parentShareLink(publicBaseUrl, settings.token) : null,
        linkUnavailable: settings.enabled && Boolean(settings.token) && !publicBaseUrl,
      });
    }

    const token = url.searchParams.get("token") ?? "";
    if (token.length < 20 || token.length > 128) {
      return noStoreJson({ error: "This link is not valid." }, { status: 400 });
    }

    // Select ONLY the token and row id needed for the constant-time comparison.
    const candidates = await db
      .select({ id: studentProfiles.id, token: studentProfiles.parentShareToken })
      .from(studentProfiles)
      .where(and(eq(studentProfiles.parentShareEnabled, true), isNotNull(studentProfiles.parentShareToken)));

    const wanted = Buffer.from(token, "utf8");
    let matchedId: number | null = null;
    for (const row of candidates) {
      const candidate = Buffer.from(String(row.token), "utf8");
      if (candidate.length === wanted.length && timingSafeEqual(candidate, wanted)) {
        matchedId = row.id;
        break;
      }
    }
    if (matchedId === null) {
      return noStoreJson({ error: "This link is not valid or has been revoked." }, { status: 404 });
    }

    // Read only profile context that the share model permits; never load scores,
    // email, password hash, essays, or other private profile columns.
    const [profile] = await db
      .select({
        name: studentProfiles.name,
        degreeLevel: studentProfiles.degreeLevel,
        targetMajor: studentProfiles.targetMajor,
        preferredCountries: studentProfiles.preferredCountries,
      })
      .from(studentProfiles)
      .where(eq(studentProfiles.id, matchedId));
    if (!profile) {
      return noStoreJson({ error: "This link is not valid or has been revoked." }, { status: 404 });
    }

    // Application names, dates, notes, fees, portals and status details are not
    // needed by the parent view. Aggregate only tracker status facts.
    const appRows = await db
      .select({ status: applications.status, submittedAt: applications.submittedAt })
      .from(applications)
      .where(eq(applications.profileId, matchedId));
    const submittedStatuses = new Set(["submitted", "interview", "decision"]);
    const submittedCount = appRows.filter((row) => {
      const status = String(row.status ?? "").toLowerCase();
      return row.submittedAt != null || submittedStatuses.has(status);
    }).length;

    // Match the tracker’s “latest outcome per application” behavior. Only an
    // aggregate count of student-reported accepted outcomes is shared.
    const outcomeRows = await db
      .select({
        applicationId: applicationOutcomes.applicationId,
        result: applicationOutcomes.result,
        createdAt: applicationOutcomes.createdAt,
      })
      .from(applicationOutcomes)
      .where(eq(applicationOutcomes.profileId, matchedId))
      .orderBy(desc(applicationOutcomes.createdAt));
    const latestOutcomeByApplication = new Map<number, string>();
    for (const row of outcomeRows) {
      if (!latestOutcomeByApplication.has(row.applicationId)) {
        latestOutcomeByApplication.set(row.applicationId, String(row.result ?? "").toLowerCase());
      }
    }
    const offerRows = await db.select({ applicationId: admissionOffers.applicationId, status: admissionOffers.status })
      .from(admissionOffers).where(eq(admissionOffers.profileId, matchedId));
    // Offers are the current decision record and supersede an older outcome for the same application.
    for (const offer of offerRows) latestOutcomeByApplication.set(offer.applicationId, String(offer.status ?? "").toLowerCase());
    const acceptedCount = [...latestOutcomeByApplication.values()].filter((result) => result === "accepted").length;

    const source: ParentSource = {
      studentFirstName: String(profile.name ?? "").trim().split(/\s+/)[0] || null,
      degreeLevel: profile.degreeLevel,
      targetMajor: profile.targetMajor,
      targetCountries: preferredCountries(profile.preferredCountries),
      applicationCount: appRows.length,
      submittedCount,
      acceptedCount,
    };

    return noStoreJson({ summary: buildParentSummary(source) });
  } catch (error) {
    console.error("GET /api/parent-share error:", error);
    return noStoreJson({ error: "Failed to load the parent view" }, { status: 500 });
  }
}
