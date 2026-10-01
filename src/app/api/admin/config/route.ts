import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAllConfig, getStoredConfig, setConfig } from "@/lib/config";
import { validateConfigValue } from "@/lib/configPortability";
import { writeAudit } from "@/lib/audit";
import { LIMITS, rateLimitedResponse } from "@/lib/rate-limit";
import { checkSharedRateLimit } from "@/lib/rate-limit-shared";
import { readJsonBody } from "@/lib/request";

/**
 * GET: list the editable settings (admin). PUT: update one value.
 * Only allowlisted, validated keys can be written (lib/configPortability) —
 * internal state such as the encrypted Telegram token is not reachable here.
 */
export async function GET(req: Request) {
  try {
    const access = await requireAdmin(req);
    if (!access.ok) {
      return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
    }
    const config = await getAllConfig();
    return NextResponse.json({ config });
  } catch (error) {
    console.error("GET /api/admin/config error:", (error as Error)?.message);
    return NextResponse.json({ error: "Failed to load config" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const access = await requireAdmin(req);
    if (!access.ok) {
      return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
    }
    const limit = await checkSharedRateLimit(`admin-config:${access.session.profile.id}`, LIMITS.adminWrite);
    if (!limit.ok) return rateLimitedResponse(limit.retryAfterSec);
    const parsed = await readJsonBody<Record<string, unknown>>(req, 64 * 1024);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error, code: parsed.code }, { status: parsed.status });
    const { key, value, description } = parsed.body;
    if (typeof key !== "string" || !key || value === undefined || value === null) {
      return NextResponse.json({ error: "key and value are required" }, { status: 400 });
    }
    const str = String(value);
    const reason = validateConfigValue(key, str);
    if (reason) {
      return NextResponse.json({ error: `${key}: ${reason}`, code: "invalid_config" }, { status: 400 });
    }
    const before = await getStoredConfig(key).catch(() => null);
    await setConfig(key, str, typeof description === "string" ? description.slice(0, 300) : undefined);
    if (before !== str) {
      await writeAudit({
        entityType: "config",
        entityId: 0,
        fieldChanged: key,
        oldValue: before,
        newValue: str,
        source: `admin:${access.session.profile.id}`,
        actor: "ADMIN",
      }).catch(() => {});
    }
    return NextResponse.json({ success: true, key, value: str });
  } catch (error) {
    console.error("PUT /api/admin/config error:", (error as Error)?.message);
    return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
  }
}
