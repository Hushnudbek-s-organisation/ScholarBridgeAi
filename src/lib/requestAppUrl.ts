import { headers } from "next/headers";
import { configuredAppUrl, originFromHeaders } from "@/lib/appUrl";

/**
 * Site URL for per-request metadata (OpenGraph base, sitemap, robots):
 * the configured canonical URL, otherwise the current request's origin, so
 * a fresh deployment on a new domain renders correct URLs before APP_URL is
 * set. Never use this for links sent outside the request (see appUrl.ts).
 */
export async function siteUrlForRequest(): Promise<string> {
  const configured = configuredAppUrl();
  if (configured) return configured;
  try {
    const h = await headers();
    return originFromHeaders(h.get("x-forwarded-host") ?? h.get("host"), h.get("x-forwarded-proto")) || "http://localhost:3000";
  } catch {
    return "http://localhost:3000";
  }
}
