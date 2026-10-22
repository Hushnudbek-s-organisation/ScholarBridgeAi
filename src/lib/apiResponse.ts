import { NextResponse } from "next/server";

/** JSON for responses that contain account-, profile-, or session-scoped data. */
export function privateNoStoreJson(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "private, no-store");
  return NextResponse.json(body, { ...init, headers });
}
