/**
 * Branding defaults are portable: the bundled app icon, or the logo in the
 * CONFIGURED Supabase project's branding bucket. No project URL is baked into
 * the code, so a new owner's deployment never points at someone else's
 * storage. Admins override both from Admin → Settings (app_config).
 */
export const BUNDLED_LOGO_URL = "/icon-512.png";

/** Public bucket used for admin-uploaded branding images. */
export function brandingBucket(env: Record<string, string | undefined> = process.env): string {
  const raw = (env.SUPABASE_BRANDING_BUCKET || "LOGO").trim();
  return /^[A-Za-z0-9._-]{1,63}$/.test(raw) ? raw : "LOGO";
}

/** The configured Supabase project URL ("" when not configured). */
export function supabaseBaseUrl(env: Record<string, string | undefined> = process.env): string {
  const raw = (env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
  return /^https:\/\/[^/\s]+$/.test(raw) ? raw : "";
}

function defaultLogoUrl(): string {
  const base = supabaseBaseUrl();
  return base ? `${base}/storage/v1/object/public/${brandingBucket()}/logo.png` : BUNDLED_LOGO_URL;
}

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
      logo: logo || defaultLogoUrl(),
      favicon: favicon || defaultLogoUrl(),
    };
  } catch {
    return { logo: defaultLogoUrl(), favicon: defaultLogoUrl() };
  }
}

/** Public URL of an object in the branding bucket, or null when Supabase is not configured. */
export function supabaseStorageUrl(path: string): string | null {
  const base = supabaseBaseUrl();
  return base ? `${base}/storage/v1/object/public/${brandingBucket()}/${path}` : null;
}
