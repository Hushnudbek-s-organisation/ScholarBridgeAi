import { NextResponse } from "next/server";
import { parseSectionHelp } from "@/lib/growth/defaults";

export const dynamic = "force-dynamic";

/**
 * GET /api/config/guide — public: admin overrides for the "What is this
 * page?" intro banners. Contains only UI copy, no user data.
 */
export async function GET() {
  try {
    const { getConfig } = await import("@/lib/config");
    return NextResponse.json(
      { help: parseSectionHelp(await getConfig("section_help")) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json({ help: {} }, { headers: { "Cache-Control": "no-store" } });
  }
}
