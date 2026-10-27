import { publicCacheJson } from "@/lib/apiResponse";
import { DEFAULT_HIDDEN_NAV_ITEMS, parseHiddenNav } from "@/lib/navSections";

// The configuration changes only through explicit admin actions; cache briefly
// to avoid a DB read on every app-shell mount.
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
    return publicCacheJson({ hidden: parseHiddenNav(raw) });
  } catch {
    return publicCacheJson({ hidden: DEFAULT_HIDDEN_NAV_ITEMS }, { sMaxAge: 30, swr: 60 });
  }
}
