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
 *   • a bounded 64-entry / 512 KiB-per-image LRU shares validated bytes in
 *     process RAM for 24 hours; client responses remain `public, max-age=31536000,
 *     immutable` (the <img> tags also carry crossOrigin="anonymous" so no
 *     cookies ride along and no auth-only `no-store` header applies);
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
const MAX_IMAGE_BYTES = 512 * 1024;
const IMAGE_CACHE_TTL_MS = 24 * 60 * 60 * 1_000;
const IMAGE_CACHE_MAX_ENTRIES = 64;
type CachedImage = { bytes: Uint8Array; contentType: string; expiresAt: number };
// Per-process bounded LRU; only already-validated Wikimedia images enter it.
const imageCache = new Map<string, CachedImage>();

function cachedImage(key: string): CachedImage | undefined {
  const entry = imageCache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    imageCache.delete(key);
    return undefined;
  }
  imageCache.delete(key);
  imageCache.set(key, entry);
  return entry;
}

function storeImage(key: string, entry: CachedImage) {
  imageCache.delete(key);
  imageCache.set(key, entry);
  while (imageCache.size > IMAGE_CACHE_MAX_ENTRIES) {
    const oldest = imageCache.keys().next().value;
    if (oldest === undefined) break;
    imageCache.delete(oldest);
  }
}

function imageResponse(bytes: Uint8Array, contentType: string): NextResponse {
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": contentType,
      // A Campus photo URL is content-addressed on Wikimedia: the bytes behind
      // it never change, so the browser (and any CDN) may keep it for a year.
      "Cache-Control": "public, max-age=31536000, immutable",
      "Access-Control-Allow-Origin": "*",
      "Cross-Origin-Resource-Policy": "cross-origin",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      Vary: "Accept",
    },
  });
}

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

  const cacheKey = target.toString();
  const hit = cachedImage(cacheKey);
  if (hit) return imageResponse(hit.bytes, hit.contentType);

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
  const contentLength = upstream.headers.get("content-length");
  if (contentLength && /^\d+$/.test(contentLength) && Number(contentLength) > MAX_IMAGE_BYTES) {
    await upstream.body.cancel().catch(() => undefined);
    return rejected("image_too_large", 404);
  }

  const reader = upstream.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_IMAGE_BYTES) {
        await reader.cancel();
        return rejected("image_too_large", 404);
      }
      chunks.push(value);
    }
  } catch {
    await reader.cancel().catch(() => undefined);
    return rejected("image_unavailable", 404);
  }
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  storeImage(cacheKey, {
    bytes,
    contentType,
    expiresAt: Date.now() + IMAGE_CACHE_TTL_MS,
  });
  return imageResponse(bytes, contentType);
}
