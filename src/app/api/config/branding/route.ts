import { getBranding } from "@/lib/branding";
import { publicCacheJson } from "@/lib/apiResponse";

export const dynamic = "force-dynamic";

/**
 * GET /api/config/branding — public: logo/favicon/name overrides. No user data,
 * so it is safe to share between visitors; an admin edit appears within the
 * 5-minute `s-maxage` window.
 */
export async function GET() {
  const branding = await getBranding();
  return publicCacheJson(branding);
}
