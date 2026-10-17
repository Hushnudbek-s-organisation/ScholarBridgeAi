/**
 * Same-origin image proxy for Wikimedia Commons campus photos.
 *
 * Students behind national filters cannot reach upload.wikimedia.org from
 * their browser directly (in Uzbekistan the block made every campus photo
 * blank while the rest of the app loaded fine). The SERVER has clean egress,
 * so the browser asks US and we fetch upstream. Strictly closed:
 *
 *   • only https://upload.wikimedia.org/wikipedia/commons/** is accepted —
 *     exact host + path prefix, no credentials, image extensions only, so
 *     this can never become an open SSRF relay — and the upstream fetch runs
 *     through `fetchGuarded`, so a Wikimedia 302 aimed at a private address
 *     (or the metadata endpoint) is refused per hop, never followed blindly;
 *   • responses are `public, max-age=604800, immutable` — one fetch per URL
 *     per client per week (the <img> tags also carry crossOrigin="anonymous"
 *     so no cookies ride along and no auth-only `no-store` header applies);
 *   • upstream failures answer a plain 404/502 — no upstream error bodies,
 *     no secrets, never a 500 stack.
 *
 * `Access-Control-Allow-Origin: *` + CORP keep the <img crossorigin> path
 * happy; plain <img> (no crossorigin) works too.
 */
import { NextResponse } from "next/server";
import { WIKIMEDIA_HOST, WIKIMEDIA_PREFIX } from "@/lib/wikimediaThumb";
import { fetchGuarded } from "@/lib/research-agent/fetch";

export const dynamic = "force-dynamic";

const IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp)$/i;
/** Upstream fetch budget — Wikimedia thumbnails are usually < 100 ms TTFB. */
const UPSTREAM_TIMEOUT_MS = 8_000;

function rejected(error: string, status = 400): NextResponse {
  return NextResponse.json({ error }, { status });
}

export async function GET(req: Request): Promise<Response> {
  const raw = new URL(req.url).searchParams.get("u") ?? "";
  if (!raw || raw.length > 2_048) return rejected("invalid_url");

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return rejected("invalid_url");
  }
  if (
    target.protocol !== "https:" ||
    target.hostname !== WIKIMEDIA_HOST ||
    !target.pathname.startsWith(WIKIMEDIA_PREFIX) ||
    !IMAGE_EXT_RE.test(target.pathname) ||
    target.username !== "" ||
    target.password !== ""
  ) {
    return rejected("url_not_allowed");
  }

  let upstream: Response;
  try {
    upstream = await fetchGuarded(target.toString(), {
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      headers: {
        // Wikimedia's bot policy wants a real UA; without one thumbs can 403.
        "User-Agent": "ScholarBridgeAI/1.0 (+https://scholarbridge.ai; campus photo fetcher)",
        Accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8",
      },
      cache: "no-store", // our own Cache-Control governs clients; no double cache
    });
  } catch {
    // Upstream down, too slow, or a refused redirect hop — same honest answer.
    return rejected("image_unavailable", 404);
  }
  if (!upstream.ok || !upstream.body) {
    return rejected("image_unavailable", 404);
  }
  const contentType = upstream.headers.get("content-type") ?? "";
  if (!/^image\//i.test(contentType)) {
    return rejected("not_an_image", 404);
  }

  const resHeaders = new Headers({
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=604800, immutable",
      "Access-Control-Allow-Origin": "*",
      "Cross-Origin-Resource-Policy": "cross-origin",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      Vary: "Accept",
    });
  const len = upstream.headers.get("content-length");
  if (len && /^\d+$/.test(len)) resHeaders.set("Content-Length", len);
  return new NextResponse(upstream.body, { headers: resHeaders });
}
