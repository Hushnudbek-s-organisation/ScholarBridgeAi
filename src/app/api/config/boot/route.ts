import { getBranding } from "@/lib/branding";
import { publicCacheJson } from "@/lib/apiResponse";
import { DEFAULT_HIDDEN_NAV_ITEMS, parseHiddenNav } from "@/lib/navSections";
import { parseSectionHelp } from "@/lib/growth/defaults";

export const dynamic = "force-dynamic";

/**
 * GET /api/config/boot — the three session-independent configuration payloads
 * the app shell needs, in ONE request.
 *
 * Before this route the shell asked three times (`/api/config/branding`,
 * `/api/config/nav`, `/api/config/guide`) — three round trips on a mobile
 * connection before the navbar knew which sections to hide, and three database
 * reads of the same `app_config` table. The individual routes stay (they are
 * public, reviewed reads, and the admin screens use them to refresh one thing
 * at a time), but the boot path uses this one.
 *
 * No user data is involved: branding assets, hidden sidebar ids and intro copy.
 */
export async function GET() {
  const [branding, navRaw, guideRaw] = await Promise.all([
    getBranding().catch(() => ({ logo: null, favicon: null })),
    import("@/lib/config")
      .then(({ getConfig }) => getConfig("nav_hidden_items"))
      .catch(() => null),
    import("@/lib/config")
      .then(({ getConfig }) => getConfig("section_help"))
      .catch(() => null),
  ]);

  return publicCacheJson({
    branding,
    nav: { hidden: navRaw === null ? DEFAULT_HIDDEN_NAV_ITEMS : parseHiddenNav(navRaw) },
    guide: { help: parseSectionHelp(guideRaw) },
  });
}
