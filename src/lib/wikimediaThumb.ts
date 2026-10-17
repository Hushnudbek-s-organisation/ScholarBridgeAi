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
