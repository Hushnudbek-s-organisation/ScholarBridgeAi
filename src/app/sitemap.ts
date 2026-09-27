import type { MetadataRoute } from "next";

import { siteUrlForRequest } from "@/lib/requestAppUrl";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const SITE_URL = await siteUrlForRequest();
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
