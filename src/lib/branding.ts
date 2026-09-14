export const DEFAULT_LOGO_URL = "https://llwrzitajdsnqzpvflnj.supabase.co/storage/v1/object/public/LOGO/logo.png";
export const DEFAULT_FAVICON_URL = DEFAULT_LOGO_URL;

export async function getBranding() {
  // Keep the client-safe branding constants importable during builds where a
  // database connection is intentionally not configured.
  try {
    const { getConfig } = await import("@/lib/config");
    const [logo, favicon] = await Promise.all([
      getConfig("branding_logo_url"),
      getConfig("branding_favicon_url"),
    ]);
    return {
      logo: logo || DEFAULT_LOGO_URL,
      favicon: favicon || DEFAULT_FAVICON_URL,
    };
  } catch {
    return { logo: DEFAULT_LOGO_URL, favicon: DEFAULT_FAVICON_URL };
  }
}

export function supabaseStorageUrl(path: string) {
  const base = (process.env.SUPABASE_URL || "https://llwrzitajdsnqzpvflnj.supabase.co").replace(/\/$/, "");
  return `${base}/storage/v1/object/public/LOGO/${path}`;
}
