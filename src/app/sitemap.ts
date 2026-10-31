import type { MetadataRoute } from "next";

import { siteUrlForRequest } from "@/lib/requestAppUrl";
import { getCachedScholarshipsBundle, getCachedUniversitiesBundle } from "@/lib/catalogCache";

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

  // Every public scholarship detail page is real, server-rendered content, so
  // it is crawlable. A catalogue outage must not take the sitemap down with it:
  // the static entries still ship, the detail URLs are simply omitted.
  let scholarshipUrls: MetadataRoute.Sitemap = [];
  try {
    const bundle = await getCachedScholarshipsBundle();
    scholarshipUrls = bundle.entries.map((scholarship) => ({
      url: `${SITE_URL}/scholarships/${scholarship.id}`,
      lastModified: scholarship.lastVerifiedAt instanceof Date ? scholarship.lastVerifiedAt : now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  } catch {
    scholarshipUrls = [];
  }

  // Every active institution has its own server-rendered profile page — the
  // largest body of real content the site owns, so it belongs here too.
  let universityUrls: MetadataRoute.Sitemap = [];
  try {
    const bundle = await getCachedUniversitiesBundle();
    universityUrls = bundle.unis
      .filter((university) => university.isActive !== false)
      .map((university) => ({
        url: `${SITE_URL}/universities/${university.id}`,
        lastModified:
          university.lastVerifiedAt instanceof Date
            ? university.lastVerifiedAt
            : typeof university.lastVerifiedAt === "string"
              ? new Date(university.lastVerifiedAt)
              : now,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      }));
  } catch {
    universityUrls = [];
  }

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
      // The public product tour: the one page that explains what the site does
      // beyond a single award, and the target of every catalogue promo strip.
      url: `${SITE_URL}/features`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    ...universityUrls,
    ...scholarshipUrls,
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
