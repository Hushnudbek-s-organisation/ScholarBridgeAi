import type { NextConfig } from "next";
import { xFrameOptions } from "./src/lib/security";

/**
 * Security headers for EVERY response, including API responses. The request
 * Proxy also applies API gates, while HTML responses get a nonce-based CSP
 * from src/proxy.ts.
 */
const frameOptions = () => xFrameOptions();

async function securityHeaders() {
  // In development X-Frame-Options is dropped so the sandboxed preview host
  // can embed the app; the CSP's `frame-ancestors` (see src/proxy.ts)
  // still limits who may do so. Production stays DENY.
  return [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "X-DNS-Prefetch-Control", value: "off" },
    {
      key: "Permissions-Policy",
      // `microphone=(self)` — the visa interview is a VOICE feature (the
      // student speaks their answers), so an empty allowlist here silently
      // killed it: the browser refuses getUserMedia/SpeechRecognition for the
      // page itself and the only option left was typing. The other four are
      // genuinely unused, so they stay off for every origin.
      value: "camera=(), microphone=(self), geolocation=(), payment=(), usb=()",
    },
    // NOTE: the "cache nothing for a visitor with cookies" rule lives in
    // `src/proxy.ts` (`withPrivateNoStore`), not here. A `headers()` entry with
    // `has: [{ header: "cookie" }]` was applied by every response regardless of
    // the condition, which silently overrode `Cache-Control` on the public
    // config endpoints and made the whole site uncacheable.
  ];
}

const nextConfig: NextConfig = {
  // The desktop app (desktop/) ships the compiled server *inside* the
  // installer, so it needs Next's self-contained "standalone" output. The
  // hosted deployment (Render) keeps `npm start` → `next start`, which the
  // standalone mode does not support, so the flag is opt-in per build
  // (`NEXT_OUTPUT_STANDALONE=1 npm run build`, see scripts/build-desktop.mjs).
  ...(process.env.NEXT_OUTPUT_STANDALONE === "1"
    ? { output: "standalone" as const, outputFileTracingRoot: process.cwd() }
    : {}),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "upload.wikimedia.org", pathname: "/wikipedia/commons/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "next-intl"],
  },
  modularizeImports: {
    "lucide-react": {
      transform: "lucide-react/dist/esm/icons/{{kebabCase member}}",
    },
  },
  compiler: { removeConsole: true },
  allowedDevOrigins: ["*.e2b.app", "*.e2b.dev"],
  // Type-checking runs BEFORE the build on every real build path:
  // `package.json` `prebuild` = `npm run typecheck`, and `npm run build` also
  // runs as an explicit CI step / Render buildCommand / desktop build. Running
  // the TypeScript pass a SECOND time inside `next build` is what pushed the
  // production build past the 512 MB of the small hosting instance: every
  // deploy died with an out-of-memory kill, the previous release kept serving,
  // and new code looked "not deployed". Next 16 no longer lints during a build,
  // so only that duplicate TypeScript pass has to be switched off here.
  //
  // `ignoreBuildErrors` is therefore CONDITIONAL, never a deploy bypass:
  //  - `npm run build` (npm sets npm_lifecycle_event="build") → the prebuild
  //    typecheck already passed, so we skip the duplicate OOM-causing pass;
  //  - a DIRECT `npx next build` / any non-npm invocation → lifecycle event is
  //    absent, so `ignoreBuildErrors` stays FALSE and Next runs its own
  //    typecheck. There is NO path that ships a build without a blocking
  //    typecheck. Asserted in scripts/check-build-gates.ts and check-deploy.ts.
  typescript: { ignoreBuildErrors: process.env.npm_lifecycle_event === "build" },
  // Do not advertise the framework/fingerprint in response headers.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: await securityHeaders(),
      },
      // Content-hashed build assets are immutable. A deploy swaps the HTML and
      // the asset filenames together; an old tab keeps the OLD filenames and
      // must not be served a 200 for a stale/rewritten path from a shared cache.
      // Only in production: `next dev` needs its own no-store dev assets.
      ...(process.env.NODE_ENV === "production"
        ? [{
            source: "/_next/static/:path*",
            headers: [
              { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
            ],
          }]
        : []),
      // DENY framing everywhere except the Telegram Mini App page (/tg),
      // whose CSP frame-ancestors (src/proxy.ts) allows Telegram Web.
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
