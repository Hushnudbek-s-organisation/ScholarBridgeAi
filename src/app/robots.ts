import type { MetadataRoute } from "next";

import { siteUrlForRequest } from "@/lib/requestAppUrl";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const SITE_URL = await siteUrlForRequest();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
