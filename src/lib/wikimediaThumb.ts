import type React from "react";

const WIKIMEDIA_COMMONS_ORIGINAL_RE =
  /^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/([0-9a-f]\/[0-9a-f]{2})\/([^/?#]+)$/i;

/**
 * Convert a full-resolution Wikimedia Commons file URL into its CDN-cached
 * thumbnail URL (e.g. 640px wide, ~30–50 KB instead of 3–8 MB).
 *
 * Non-Wikimedia URLs, existing `/thumb/` URLs, and `.svg` vector URLs are
 * returned untouched. Pair with `onWikimediaThumbError(originalUrl)` on `<img>`
 * / `<Image>` so any unexpected thumbnail miss falls back to `originalUrl`.
 */
export function toWikimediaThumb(
  url: string | null | undefined,
  width = 640,
): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed.startsWith("https://upload.wikimedia.org/wikipedia/commons/")) {
    return trimmed;
  }
  if (trimmed.includes("/wikipedia/commons/thumb/")) {
    return trimmed;
  }
  const match = WIKIMEDIA_COMMONS_ORIGINAL_RE.exec(trimmed);
  if (!match) return trimmed;

  const [, hashPath, filename] = match;
  if (/\.svg$/i.test(filename)) {
    return trimmed;
  }
  const thumbSuffix = /\.tiff?$/i.test(filename) ? `${filename}.jpg` : filename;
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${hashPath}/${filename}/${width}px-${thumbSuffix}`;
}

/**
 * Fallback handler for `<img>` / `<Image>`: if a Wikimedia thumbnail URL ever
 * fails to load, transparently switch `src` back to the raw `originalUrl`.
 */
export function onWikimediaThumbError(originalUrl: string | null | undefined) {
  return (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (!originalUrl) return;
    const img = e.currentTarget;
    if (img.dataset.fallbackApplied === "1") return;
    img.dataset.fallbackApplied = "1";
    img.src = originalUrl;
  };
}

/** The exact upstream this proxy is allowed to serve — nothing else. */
export const WIKIMEDIA_HOST = "upload.wikimedia.org";
export const WIKIMEDIA_PREFIX = "/wikipedia/commons/";

/** True for any Commons URL, original or thumbnail (the two shapes we store). */
export function isWikimediaCommonsUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      u.hostname === WIKIMEDIA_HOST &&
      u.pathname.startsWith(WIKIMEDIA_PREFIX)
    );
  } catch {
    return false;
  }
}

/**
 * Rewrite a Wikimedia Commons URL to the same-origin image proxy
 * (`GET /api/image?u=…`). WHY: several of our students — Uzbekistan among
 * them — sit behind national filters that block or cripple direct browser
 * access to upload.wikimedia.org, so campus photos stayed blank even though
 * the rest of the site was fast. The server-side fetch has no such problem,
 * and the proxy responds with long immutable cache headers, so each image is
 * fetched once per client per week and served same-origin after that.
 * Non-Commons URLs (Unsplash, our own Supabase Storage, /public assets) pass
 * through untouched.
 */
export function viaImageProxy(url: string): string {
  if (!isWikimediaCommonsUrl(url)) return url;
  return `/api/image?u=${encodeURIComponent(url)}`;
}

/** `toWikimediaThumb` + `viaImageProxy` in one call — the canonical src for
 *  every campus photo the browser renders. */
export function campusPhotoSrc(originalUrl: string | null | undefined, width: number): string {
  return viaImageProxy(toWikimediaThumb(originalUrl, width));
}
