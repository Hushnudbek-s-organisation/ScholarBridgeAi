import { NextResponse } from "next/server";

/** JSON for responses that contain account-, profile-, or session-scoped data. */
export function privateNoStoreJson(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "private, no-store");
  return NextResponse.json(body, { ...init, headers });
}

/**
 * JSON for **public, session-independent** payloads (branding, nav flags, help
 * copy, shared catalogues). The app shell asks for these on every boot, so they
 * are the best candidates for a shared cache.
 *
 * `max-age=0` keeps the browser honest — an admin's own edit shows on the next
 * reload — while `s-maxage` lets a CDN/proxy serve the same bytes to every
 * visitor without touching the database. `stale-while-revalidate` means a
 * visitor never waits for the refresh.
 */
export function publicCacheJson(
  body: unknown,
  init?: ResponseInit & { sMaxAge?: number; swr?: number }
) {
  const headers = new Headers(init?.headers);
  const sMaxAge = init?.sMaxAge ?? 300;
  const swr = init?.swr ?? 600;
  headers.set("Cache-Control", `public, max-age=0, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`);
  return NextResponse.json(body, { ...init, headers });
}
