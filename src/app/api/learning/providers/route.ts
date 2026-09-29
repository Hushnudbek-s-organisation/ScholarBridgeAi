import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { learningProviderLinks, learningProviderScores, learningProviders } from "@/db/schema";
import { guardAdmin, guardStudent, jsonError, oneOf, readBody, serverError, text } from "@/lib/journey/api";
import { isLearningMetric, listLearningAdapters, summarizeProviders, LEARNING_METRICS } from "@/lib/journey/providers";

export const dynamic = "force-dynamic";

const PROVIDER_STATUSES = ["disabled", "sandbox", "live"] as const;

/**
 * GET /api/learning/providers?profileId=
 *
 * External Learning Providers (spec §32) — READ side, for students.
 *
 * THIS IS ARCHITECTURE, NOT AN INTEGRATION. No partner is named, no logo, no
 * navigation item, no outbound request. The table ships empty, so this route
 * simply returns `{ connected: false, providers: [] }` until an admin adds one
 * — and the app behaves identically either way.
 *
 * The `metrics` vocabulary is closed: a provider can only report
 * `current_score`, `target_score`, `practice_progress`, `mock_score`,
 * `course_completion` or `study_task_completed`, and every reading is shown
 * WITH ITS SOURCE so the student always knows it came from somewhere else.
 */
export async function GET(req: Request) {
  const g = await guardStudent(req, new URL(req.url).searchParams.get("profileId"));
  if (!g.ok) return g.response;
  const { profileId } = g.value;
  try {
    const providers = await db.select().from(learningProviders).orderBy(asc(learningProviders.sortOrder), asc(learningProviders.id));
    const links = providers.length
      ? await db
          .select({
            providerId: learningProviderLinks.providerId,
            externalUserRef: learningProviderLinks.externalUserRef,
            lastSyncedAt: learningProviderLinks.lastSyncedAt,
          })
          .from(learningProviderLinks)
          .where(and(eq(learningProviderLinks.profileId, profileId)))
      : [];

    const linkRows = links.length
      ? await db
          .select({
            linkId: learningProviderLinks.id,
            providerId: learningProviderLinks.providerId,
            metric: learningProviderScores.metric,
            value: learningProviderScores.value,
            measuredAt: learningProviderScores.measuredAt,
          })
          .from(learningProviderLinks)
          .innerJoin(learningProviderScores, eq(learningProviderScores.linkId, learningProviderLinks.id))
          .where(eq(learningProviderLinks.profileId, profileId))
      : [];

    const byProvider = new Map<number, { externalUserRef: string | null; lastSyncedAt: Date | null }>();
    for (const l of links) byProvider.set(l.providerId, { externalUserRef: l.externalUserRef, lastSyncedAt: l.lastSyncedAt });

    const readings: Record<string, { metric: (typeof LEARNING_METRICS)[number]; value: number | null; measuredAt: string | null; sourceName: string; lastVerifiedAt: string | null }[]> = {};
    const linkToProvider = new Map(links.map((l) => [l.providerId, l.providerId]));
    for (const r of linkRows) {
      if (!isLearningMetric(r.metric)) continue;
      const provider = providers.find((p) => p.id === r.providerId);
      if (!provider) continue;
      const list = (readings[provider.providerKey] ??= []);
      list.push({
        metric: r.metric,
        value: r.value,
        measuredAt: r.measuredAt ? String(r.measuredAt).slice(0, 10) : null,
        sourceName: provider.name,
        lastVerifiedAt: null,
      });
    }

    const summary = summarizeProviders(
      providers.map((p) => ({ providerKey: p.providerKey, name: p.name, kind: p.kind, status: p.status as "disabled" | "sandbox" | "live", isEnabled: p.isEnabled })),
      Object.fromEntries(
        providers.map((p) => {
          const link = byProvider.get(p.id);
          return [p.providerKey, { externalUserRef: link?.externalUserRef ?? null, lastSyncedAt: link?.lastSyncedAt?.toISOString() ?? null }];
        })
      ),
      readings as Parameters<typeof summarizeProviders>[2]
    );

    return NextResponse.json({
      ...summary,
      metrics: LEARNING_METRICS,
      /** Adapters compiled into this build. Empty in the current release. */
      adapters: listLearningAdapters().map((a) => ({ providerKey: a.providerKey, displayName: a.displayName })),
      notice:
        "No external learning provider is connected. ScholarBridge works normally without one — scores you enter yourself are always the source of truth.",
    });
  } catch (err) {
    return serverError("learning/providers GET", err);
  }
}

/** POST — admin: register a provider in the generic registry. */
export async function POST(req: Request) {
  const b = await readBody(req);
  if (!b.ok) return b.response;
  const g = await guardAdmin(req, { write: true });
  if (!g.ok) return g.response;
  const providerKey = text(b.value.providerKey, 64);
  const name = text(b.value.name, 120);
  if (!providerKey || !name) return jsonError(400, "providerKey and name are required", "bad_request");
  if (!/^[a-z0-9_]+$/.test(providerKey)) {
    return jsonError(400, "providerKey must be lowercase letters, digits or underscores", "bad_request");
  }
  try {
    const [row] = await db
      .insert(learningProviders)
      .values({
        providerKey,
        name,
        kind: text(b.value.kind, 60) ?? "test_prep",
        // A new provider always starts DISABLED — nothing goes live by accident.
        status: oneOf(b.value.status, PROVIDER_STATUSES, "disabled"),
        isEnabled: false,
        config: JSON.stringify(b.value.config ?? {}),
        sortOrder: Number(b.value.sortOrder) || 0,
      })
      .onConflictDoUpdate({
        target: learningProviders.providerKey,
        set: { name, kind: text(b.value.kind, 60) ?? "test_prep", updatedAt: new Date() },
      })
      .returning();
    return NextResponse.json({ ok: true, provider: row });
  } catch (err) {
    return serverError("learning/providers POST", err);
  }
}

/** PATCH — admin: enable / disable / reconfigure a provider. */
export async function PATCH(req: Request) {
  const b = await readBody(req);
  if (!b.ok) return b.response;
  const g = await guardAdmin(req, { write: true });
  if (!g.ok) return g.response;
  const id = Number(b.value.id);
  if (!Number.isInteger(id) || id <= 0) return jsonError(400, "id is required", "bad_request");
  try {
    const [row] = await db.select().from(learningProviders).where(eq(learningProviders.id, id)).limit(1);
    if (!row) return jsonError(404, "Provider not found", "not_found");
    const status = b.value.status == null ? row.status : oneOf(b.value.status, PROVIDER_STATUSES, row.status);
    // Enabling requires a live/sandbox status — a provider can never be
    // switched on while it is still `disabled`.
    const isEnabled = b.value.isEnabled == null ? row.isEnabled && status !== "disabled" : !!b.value.isEnabled && status !== "disabled";
    await db
      .update(learningProviders)
      .set({
        name: b.value.name === undefined ? row.name : text(b.value.name, 120) ?? row.name,
        status,
        isEnabled,
        config: b.value.config === undefined ? row.config : JSON.stringify(b.value.config ?? {}),
        updatedAt: new Date(),
      })
      .where(eq(learningProviders.id, id));
    return NextResponse.json({ ok: true, id, status, isEnabled });
  } catch (err) {
    return serverError("learning/providers PATCH", err);
  }
}

/** DELETE — admin: remove a provider from the registry. */
export async function DELETE(req: Request) {
  const b = await readBody(req);
  if (!b.ok) return b.response;
  const g = await guardAdmin(req, { write: true });
  if (!g.ok) return g.response;
  const id = Number(b.value.id);
  if (!Number.isInteger(id) || id <= 0) return jsonError(400, "id is required", "bad_request");
  try {
    const deleted = await db
      .delete(learningProviders)
      .where(eq(learningProviders.id, id))
      .returning({ id: learningProviders.id });
    if (!deleted.length) return jsonError(404, "Provider not found", "not_found");
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return serverError("learning/providers DELETE", err);
  }
}
