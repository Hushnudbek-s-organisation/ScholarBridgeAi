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

/**
 * Does the file content really start like the declared image type? The
 * browser-supplied MIME type is just a label — without this an admin session
 * (or a stolen one) could store HTML/SVG under an image content type.
 */
export function matchesImageSignature(extension: string, head: Uint8Array): boolean {
  const starts = (...bytes: number[]) => bytes.every((b, i) => head[i] === b);
  switch (extension) {
    case "png":
      return starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    case "jpg":
      return starts(0xff, 0xd8, 0xff);
    case "webp":
      return starts(0x52, 0x49, 0x46, 0x46) && head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50;
    case "ico":
      return starts(0x00, 0x00, 0x01, 0x00);
    default:
      return false;
  }
}
