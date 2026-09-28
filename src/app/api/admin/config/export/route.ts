/**
 * GET /api/admin/config/export — download the NON-SECRET settings as JSON
 * (saved app_config values + AI model choices). No API keys, tokens,
 * passwords or encrypted values are ever included.
 */
import { NextResponse } from "next/server";
import { db } from "@/db";
import { aiProviderCredentials, appConfig } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { buildConfigExport } from "@/lib/configPortability";

export async function GET(req: Request) {
  const access = await requireAdmin(req);
  if (!access.ok) return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
  try {
    const rows = await db.select({ key: appConfig.key, value: appConfig.value }).from(appConfig);
    const models = await db
      .select({ provider: aiProviderCredentials.provider, model: aiProviderCredentials.model })
      .from(aiProviderCredentials)
      .catch(() => []);
    const payload = buildConfigExport(rows, models);
    await writeAudit({
      entityType: "config",
      entityId: 0,
      fieldChanged: "config_exported",
      oldValue: null,
      newValue: { keys: Object.keys(payload.config).length, models: Object.keys(payload.aiModels).length },
      source: `admin:${access.session.profile.id}`,
      actor: "ADMIN",
    }).catch(() => {});
    const date = payload.exportedAt.slice(0, 10);
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="scholarbridge-config-${date}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("GET /api/admin/config/export error:", (err as Error)?.message);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
