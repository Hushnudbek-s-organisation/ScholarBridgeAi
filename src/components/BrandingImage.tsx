"use client";

import { useEffect, useRef, useState } from "react";
const FALLBACK_LOGO_URL = "/icon-192.png";
// Bundled icon first; the configured logo (/api/config/branding) replaces it.
const DEFAULT_LOGO_URL = "/icon-512.png";

/** Client image wrapper so an admin branding change is reflected without a redeploy. */
export function BrandingImage({ className, alt }: { className?: string; alt: string }) {
  const [src, setSrc] = useState(DEFAULT_LOGO_URL);
  const imgRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    // The server-rendered <img> may have failed before React attached
    // onError (hydration race) — detect that and swap to the fallback.
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setSrc(FALLBACK_LOGO_URL);
  }, []);
  useEffect(() => {
    // A blocked CDN can leave the request hanging without ever erroring;
    // give the remote logo a few seconds, then use the bundled icon.
    if (src === FALLBACK_LOGO_URL) return;
    const timer = window.setTimeout(() => {
      const img = imgRef.current;
      if (img && (!img.complete || img.naturalWidth === 0)) setSrc(FALLBACK_LOGO_URL);
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [src]);
  useEffect(() => {
    fetch("/api/config/branding")
      .then((response) => response.ok ? response.json() : null)
      .then((data) => data?.logo && setSrc(data.logo))
      .catch(() => undefined);
  }, []);
  // If the remote logo can't be reached (offline, blocked CDN, bad URL) fall
  // back to the bundled app icon instead of showing a broken image + alt text.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      className={className}
      onError={() => setSrc((cur) => (cur === FALLBACK_LOGO_URL ? cur : FALLBACK_LOGO_URL))}
    />
  );
}
