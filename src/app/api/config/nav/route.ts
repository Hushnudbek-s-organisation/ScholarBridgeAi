import { NextResponse } from "next/server";
import { DEFAULT_HIDDEN_NAV_ITEMS, parseHiddenNav } from "@/lib/navSections";

// The sidebar reads this on every app load — never cache the answer.
export const dynamic = "force-dynamic";

/**
 * GET /api/config/nav — public: which sidebar sections are currently hidden.
 *
 * Used by the Navbar so the admin can toggle sections from
 * Admin → Navigation without a deploy. Only section ids are exposed —
 * no user data, so no session is required.
 */
export async function GET() {
  try {
    // Dynamic import keeps this public route buildable without a database
    // (same pattern as /api/config/branding).
    const { getConfig } = await import("@/lib/config");
    const raw = await getConfig("nav_hidden_items");
    return NextResponse.json(
      { hidden: parseHiddenNav(raw) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { hidden: DEFAULT_HIDDEN_NAV_ITEMS },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
}
