import type { NextConfig } from "next";
import { xFrameOptions } from "./src/lib/security";

/**
 * Security headers for EVERY response (including /api/*, which the middleware
 * matcher skips). The HTML responses additionally get a nonce-based CSP from
 * src/middleware.ts.
 */
const frameOptions = () => xFrameOptions();

async function securityHeaders() {
  // In development X-Frame-Options is dropped so the sandboxed preview host
  // can embed the app; the CSP's `frame-ancestors` (see src/middleware.ts)
  // still limits who may do so. Production stays DENY.
  return [
    { key: "X-Content-Type-Options", value: "nosniff" },
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
      // DENY framing everywhere except the Telegram Mini App page (/tg),
      // whose CSP frame-ancestors (src/middleware.ts) allows Telegram Web.
      ...(frameOptions()
        ? [
            {
              source: "/((?!tg$|tg/|uz/tg$|uz/tg/|ru/tg$|ru/tg/|en/tg$|en/tg/).*)",
              headers: [{ key: "X-Frame-Options", value: frameOptions() as string }],
            },
          ]
        : []),
    ];
  },
};

export default nextConfig;
