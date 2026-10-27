import { publicCacheJson } from "@/lib/apiResponse";
import { parseSectionHelp } from "@/lib/growth/defaults";

export const dynamic = "force-dynamic";

/**
 * GET /api/config/guide — public: admin overrides for the "What is this
 * page?" intro banners. Contains only UI copy, no user data.
 */
export async function GET() {
  try {
    const { getConfig } = await import("@/lib/config");
    return publicCacheJson({ help: parseSectionHelp(await getConfig("section_help")) });
  } catch {
    // A failure is an empty guide, not an uncacheable one.
    return publicCacheJson({ help: {} }, { sMaxAge: 30, swr: 60 });
  }
}
