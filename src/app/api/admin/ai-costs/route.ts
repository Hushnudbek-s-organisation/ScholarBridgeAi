import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { buildAiCostReport, clampReportDays } from "@/lib/ai/costReport";

/**
 * GET /api/admin/ai-costs?days=30 — AI spend, budget state and unpriced
 * models for the admin panel (admins only). Contains no keys and no prompts.
 * Prices and budgets are edited through /api/admin/config (validated there).
 */
export async function GET(req: Request) {
  try {
    const access = await requireAdmin(req);
    if (!access.ok) {
      return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
    }
    const days = clampReportDays(new URL(req.url).searchParams.get("days"));
    const report = await buildAiCostReport(days);
    return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/admin/ai-costs error:", (error as Error)?.message);
    return NextResponse.json({ error: "Failed to load AI cost report" }, { status: 500 });
  }
}
