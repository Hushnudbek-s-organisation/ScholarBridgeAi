import type { NextConfig } from "next";

/**
 * Security headers for EVERY response (including /api/*, which the middleware
 * matcher skips). The HTML responses additionally get a nonce-based CSP from
 * src/middleware.ts.
 */
async function securityHeaders() {
  return [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "X-DNS-Prefetch-Control", value: "off" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    },
    // Never let an authenticated JSON response be cached by a shared proxy.
    { key: "Cache-Control", value: "no-store", has: [{ type: "header", key: "cookie" }] },
  ];
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.e2b.app", "*.e2b.dev"],
  // Do not advertise the framework/fingerprint in response headers.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: await securityHeaders(),
      },
    ];
  },
};

export default nextConfig;
