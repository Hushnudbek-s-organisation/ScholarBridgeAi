"use client";

import { useEffect, useState } from "react";
const DEFAULT_LOGO_URL = "https://llwrzitajdsnqzpvflnj.supabase.co/storage/v1/object/public/LOGO/logo.png";

/** Client image wrapper so an admin branding change is reflected without a redeploy. */
export function BrandingImage({ className, alt }: { className?: string; alt: string }) {
  const [src, setSrc] = useState(DEFAULT_LOGO_URL);
  useEffect(() => {
    fetch("/api/config/branding")
      .then((response) => response.ok ? response.json() : null)
      .then((data) => data?.logo && setSrc(data.logo))
      .catch(() => undefined);
  }, []);
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} />;
}
