import type { MetadataRoute } from "next";

import { siteUrlForRequest } from "@/lib/requestAppUrl";

/**
 * Public, crawlable pages. The catalogue pages serve real server-rendered
 * content (universities, scholarships), so they belong in the sitemap: a
 * one-URL sitemap told search engines nothing about the two pages a student
 * searching for either thing would want to land on. The legal pages are
 * public too. Nothing behind sign-in is listed.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const SITE_URL = await siteUrlForRequest();
  const now = new Date();
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/universities`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/scholarships`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
