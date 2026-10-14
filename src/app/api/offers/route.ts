import { NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { admissionOffers, applications, fundingItems, journeyDeadlines, universities } from "@/db/schema";
import { dateOnly, guardStudent, idParam, isoDate, jsonError, oneOf, readBody, serverError, text } from "@/lib/journey/api";
import { postAdmissionFunding } from "@/lib/journey/funding";
import { resolvedUsdUniversityCosts } from "@/lib/usdCosts";

export const dynamic = "force-dynamic";

const OFFER_STATUSES = ["pending", "accepted", "rejected", "waitlisted", "deferred"] as const;

function parseOptionalUsdInteger(value: unknown): { valid: true; value: number | null } | { valid: false } {
  if (value == null || (typeof value === "string" && value.trim() === "")) {
    return { valid: true, value: null };
  }
  if (typeof value !== "number" && typeof value !== "string") return { valid: false };
  const amount = Number(value);
  // Database columns are integer USD values. Keep explicit zero, preserve
  // blank as unknown, and reject malformed/out-of-range numbers.
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > 2_147_483_647) return { valid: false };
  return { valid: true, value: amount };
}

/**
 * GET /api/offers?profileId= — Offers & Decisions (spec §23) and the
 * post-admission funding view (spec §24).
 *
 * Accepting an offer automatically activates the POST-ADMISSION JOURNEY: the
 * response deadline becomes a tracked deadline and the funding/deposit view
 * for that application appears here.
 */
export async function GET(req: Request) {
  const g = await guardStudent(req, new URL(req.url).searchParams.get("profileId"));
  if (!g.ok) return g.response;
  const { profileId } = g.value;
  try {
    const offers = await db
      .select()
      .from(admissionOffers)
      .where(eq(admissionOffers.profileId, profileId))
      .orderBy(desc(admissionOffers.updatedAt));

    const appIds = offers.map((o) => o.applicationId);
    const apps = appIds.length
      ? await db
          .select({
            id: applications.id,
            universityId: applications.universityId,
            universityName: applications.universityName,
            programName: applications.programName,
            intakeTerm: applications.intakeTerm,
            deadline: applications.deadline,
            submittedAt: applications.submittedAt,
          })
          .from(applications)
          .where(and(eq(applications.profileId, profileId)))
      : [];
    const appById = new Map(apps.map((a) => [a.id, a]));

    const uniIds = [...new Set(apps.map((a) => a.universityId).filter((x): x is number => x != null))];
    const unis = uniIds.length ? await db.select().from(universities).where(inArray(universities.id, uniIds)) : [];
    const uniById = new Map(unis.map((u) => [u.id, u]));

    const funding = await db.select().from(fundingItems).where(eq(fundingItems.profileId, profileId));

    return NextResponse.json({
      offers: offers.map((o) => {
        const app = appById.get(o.applicationId);
        const uni = app?.universityId ? uniById.get(app.universityId) : null;
        const items = funding
          .filter((f) => f.applicationId === o.applicationId)
          .map((f) => ({
            kind: f.kind as "scholarship" | "aid" | "family" | "savings" | "loan" | "other",
            name: f.name,
            amountUsd: f.amountUsd,
            status: f.status as "planned" | "applied" | "awarded" | "confirmed" | "declined",
            covers: f.covers,
          }));
        const publishedTuitionUsd = uni ? resolvedUsdUniversityCosts(uni).annualTuitionUsd : null;
        const recordedOfferTuition = o.tuitionCommitment != null && Number.isFinite(o.tuitionCommitment) && o.tuitionCommitment >= 0
          ? o.tuitionCommitment
          : null;
        const tuition = recordedOfferTuition ?? publishedTuitionUsd;
        return {
          ...o,
          decidedAt: o.decidedAt ? String(o.decidedAt).slice(0, 10) : null,
          responseDeadline: o.responseDeadline ? String(o.responseDeadline).slice(0, 10) : null,
          depositDueDate: o.depositDueDate ? String(o.depositDueDate).slice(0, 10) : null,
          application: app
            ? {
                ...app,
                deadline: app.deadline ? String(app.deadline).slice(0, 10) : null,
                submittedAt: app.submittedAt,
                postStudyWorkVisaYears: uni?.postStudyWorkVisaYears ?? null,
              }
            : null,
          funding: postAdmissionFunding({
            tuition,
            items,
            depositAmount: o.depositAmount,
            depositDueDate: o.depositDueDate ? String(o.depositDueDate).slice(0, 10) : null,
            universityName: app?.universityName ?? uni?.name ?? "the university",
          }),
        };
      }),
      summary: {
        total: offers.length,
        pending: offers.filter((o) => o.status === "pending").length,
        accepted: offers.filter((o) => o.status === "accepted").length,
        rejected: offers.filter((o) => o.status === "rejected").length,
      },
    });
  } catch (err) {
    return serverError("offers GET", err);
  }
}

/** POST — record an offer. */
export async function POST(req: Request) {
  const b = await readBody(req);
  if (!b.ok) return b.response;
  const g = await guardStudent(req, b.value.profileId, { write: true });
  if (!g.ok) return g.response;
  const { profileId } = g.value;
  const applicationId = Number(b.value.applicationId);
  if (!Number.isInteger(applicationId) || applicationId <= 0) {
    return jsonError(400, "applicationId is required", "bad_request");
  }
  const deposit = parseOptionalUsdInteger(b.value.depositAmount);
  const tuition = parseOptionalUsdInteger(b.value.tuitionCommitment);
  if (!deposit.valid || !tuition.valid) {
    return jsonError(400, "Amounts must be non-negative whole USD values", "bad_request");
  }
  try {
    const [app] = await db
      .select()
      .from(applications)
      .where(and(eq(applications.id, applicationId), eq(applications.profileId, profileId)))
      .limit(1);
    if (!app) return jsonError(404, "Application not found", "not_found");

    const [offer] = await db
      .insert(admissionOffers)
      .values({
        applicationId,
        profileId,
        status: oneOf(b.value.status, OFFER_STATUSES, "pending"),
        decidedAt: isoDate(dateOnly(b.value.decidedAt)),
        responseDeadline: isoDate(dateOnly(b.value.responseDeadline)),
        offerLetterUrl: text(b.value.offerLetterUrl, 800),
        offerLetterName: text(b.value.offerLetterName, 240),
        conditions: text(b.value.conditions, 2000),
        depositAmount: deposit.value,
        depositDueDate: isoDate(dateOnly(b.value.depositDueDate)),
        tuitionCommitment: tuition.value,
        notes: text(b.value.notes, 2000),
      })
      .onConflictDoUpdate({
        target: admissionOffers.applicationId,
        set: {
          status: oneOf(b.value.status, OFFER_STATUSES, "pending"),
          decidedAt: isoDate(dateOnly(b.value.decidedAt)),
          responseDeadline: isoDate(dateOnly(b.value.responseDeadline)),
          conditions: text(b.value.conditions, 2000),
          depositAmount: deposit.value,
          depositDueDate: isoDate(dateOnly(b.value.depositDueDate)),
          tuitionCommitment: tuition.value,
          updatedAt: new Date(),
        },
      })
      .returning();

    await syncApplicationStatus(offer.status, applicationId, profileId);
    return NextResponse.json({ ok: true, offer });
  } catch (err) {
    return serverError("offers POST", err);
  }
}

/** PATCH — update / decide. Accepting activates the post-admission journey. */
export async function PATCH(req: Request) {
  const b = await readBody(req);
  if (!b.ok) return b.response;
  const g = await guardStudent(req, b.value.profileId, { write: true });
  if (!g.ok) return g.response;
  const { profileId } = g.value;
  const id = Number(b.value.id);
  if (!Number.isInteger(id) || id <= 0) return jsonError(400, "id is required", "bad_request");
  try {
    const [offer] = await db
      .select()
      .from(admissionOffers)
      .where(and(eq(admissionOffers.id, id), eq(admissionOffers.profileId, profileId)))
      .limit(1);
    if (!offer) return jsonError(404, "Offer not found", "not_found");

    const deposit = b.value.depositAmount === undefined
      ? { valid: true as const, value: offer.depositAmount }
      : parseOptionalUsdInteger(b.value.depositAmount);
    const tuition = b.value.tuitionCommitment === undefined
      ? { valid: true as const, value: offer.tuitionCommitment }
      : parseOptionalUsdInteger(b.value.tuitionCommitment);
    if (!deposit.valid || !tuition.valid) {
      return jsonError(400, "Amounts must be non-negative whole USD values", "bad_request");
    }

    const status = b.value.status == null ? offer.status : oneOf(b.value.status, OFFER_STATUSES, offer.status);
    const responseDeadline =
      b.value.responseDeadline === undefined
        ? offer.responseDeadline
        : isoDate(dateOnly(b.value.responseDeadline));

    await db
      .update(admissionOffers)
      .set({
        status,
        decidedAt: b.value.decidedAt === undefined ? offer.decidedAt : isoDate(dateOnly(b.value.decidedAt)),
        responseDeadline,
        offerLetterUrl: b.value.offerLetterUrl === undefined ? offer.offerLetterUrl : text(b.value.offerLetterUrl, 800),
        offerLetterName: b.value.offerLetterName === undefined ? offer.offerLetterName : text(b.value.offerLetterName, 240),
        conditions: b.value.conditions === undefined ? offer.conditions : text(b.value.conditions, 2000),
        depositAmount: deposit.value,
        depositDueDate: b.value.depositDueDate === undefined ? offer.depositDueDate : isoDate(dateOnly(b.value.depositDueDate)),
        tuitionCommitment: tuition.value,
        notes: b.value.notes === undefined ? offer.notes : text(b.value.notes, 2000),
        updatedAt: new Date(),
      })
      .where(eq(admissionOffers.id, id));

    await syncApplicationStatus(status, offer.applicationId, profileId);

    // An accepted offer with a response deadline becomes a tracked deadline so
    // it shows on the dashboard and in Telegram alerts like any other date.
    if (status === "accepted" && responseDeadline) {
      const existing = await db
        .select({ id: journeyDeadlines.id })
        .from(journeyDeadlines)
        .where(
          and(
            eq(journeyDeadlines.profileId, profileId),
            eq(journeyDeadlines.kind, "university"),
            eq(journeyDeadlines.entityType, "application"),
            eq(journeyDeadlines.entityId, offer.applicationId)
          )
        )
        .limit(1);
      const [app] = await db.select({ universityName: applications.universityName }).from(applications).where(eq(applications.id, offer.applicationId)).limit(1);
      if (existing.length === 0) {
        await db.insert(journeyDeadlines).values({
          profileId,
          kind: "university",
          title: `${app?.universityName ?? "Offer"} — respond to your offer`,
          dueDate: responseDeadline,
          entityType: "application",
          entityId: offer.applicationId,
          isAutoGenerated: true,
        });
      }
    }

    return NextResponse.json({ ok: true, id, status, postAdmissionActive: status === "accepted" });
  } catch (err) {
    return serverError("offers PATCH", err);
  }
}

/** DELETE — remove an offer record. */
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const g = await guardStudent(req, searchParams.get("profileId"), { write: true });
  if (!g.ok) return g.response;
  const id = idParam(req);
  if (!id) return jsonError(400, "id is required", "bad_request");
  try {
    const deleted = await db
      .delete(admissionOffers)
      .where(and(eq(admissionOffers.id, id), eq(admissionOffers.profileId, g.value.profileId)))
      .returning({ id: admissionOffers.id });
    if (!deleted.length) return jsonError(404, "Offer not found", "not_found");
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return serverError("offers DELETE", err);
  }
}

// ---------------------------------------------------------------------------

/** Keep the shared `applications.status` in step with the decision. */
async function syncApplicationStatus(status: string, applicationId: number, profileId: number) {
  const mapped =
    status === "accepted"
      ? "accepted"
      : status === "rejected"
        ? "rejected"
        : status === "waitlisted"
          ? "waitlisted"
          : status === "deferred"
            ? "deferred"
            : null;
  if (!mapped) return;
  await db
    .update(applications)
    .set({ status: mapped, updatedAt: new Date() })
    .where(and(eq(applications.id, applicationId), eq(applications.profileId, profileId)));
}
