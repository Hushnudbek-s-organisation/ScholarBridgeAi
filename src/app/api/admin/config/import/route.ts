/**
 * POST /api/admin/config/import  { payload, dryRun?: boolean }
 * Validates an export (lib/configPortability) and, unless dryRun, applies
 * the valid changes. Unknown/secret/invalid keys are rejected and reported,
 * never written. Every applied change is audited.
 */
import { NextResponse } from "next/server";
import { db } from "@/db";
import { aiProviderCredentials, appConfig } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { setConfig } from "@/lib/config";
import { planConfigImport } from "@/lib/configPortability";
import { upsertCredential } from "@/lib/ai/credentials";
import { LIMITS, rateLimitedResponse } from "@/lib/rate-limit";
import { checkSharedRateLimit } from "@/lib/rate-limit-shared";
import { readJsonBody } from "@/lib/request";
import type { AIProviderId } from "@/lib/ai/settings";

export async function POST(req: Request) {
  const access = await requireAdmin(req);
  if (!access.ok) return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
  const actorId = access.session.profile.id;
  const limit = await checkSharedRateLimit(`admin-config:${actorId}`, LIMITS.adminWrite);
  if (!limit.ok) return rateLimitedResponse(limit.retryAfterSec);
  const parsed = await readJsonBody<Record<string, unknown>>(req, 512 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error, code: parsed.code }, { status: parsed.status });

  try {
    const rows = await db.select({ key: appConfig.key, value: appConfig.value }).from(appConfig);
    const current = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    const modelRows = await db
      .select({ provider: aiProviderCredentials.provider, model: aiProviderCredentials.model })
      .from(aiProviderCredentials)
      .catch(() => []);
    const currentModels = Object.fromEntries(modelRows.map((m) => [m.provider, m.model])) as Partial<Record<AIProviderId, string | null>>;
    const plan = planConfigImport(parsed.body.payload, current, currentModels);
    if (!plan.ok) return NextResponse.json({ error: plan.error, code: "invalid_export", plan }, { status: 400 });
    if (parsed.body.dryRun !== false) return NextResponse.json({ dryRun: true, plan });

    for (const c of plan.changes) {
      await setConfig(c.key, c.to, "Imported from a config export");
      await writeAudit({ entityType: "config", entityId: 0, fieldChanged: c.key, oldValue: c.from, newValue: c.to, source: `import:admin:${actorId}`, actor: "ADMIN" }).catch(() => {});
    }
    for (const m of plan.modelChanges) {
      await upsertCredential(m.provider, { model: m.to });
      await writeAudit({ entityType: "ai_provider", entityId: 0, fieldChanged: "ai_provider_model", oldValue: { provider: m.provider, model: m.from }, newValue: { provider: m.provider, model: m.to }, source: `import:admin:${actorId}`, actor: "ADMIN" }).catch(() => {});
    }
    return NextResponse.json({ dryRun: false, applied: plan.changes.length + plan.modelChanges.length, plan });
  } catch (err) {
    console.error("POST /api/admin/config/import error:", (err as Error)?.message);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
