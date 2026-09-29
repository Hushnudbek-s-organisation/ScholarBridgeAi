/**
 * Live anonymous-access audit of the whole API surface.
 *
 *   npm run test:api-security            # against http://127.0.0.1:3000
 *   API_BASE_URL=https://… npm run test:api-security
 *
 * WHAT IT DOES
 * ------------
 * It walks every `src/app/api/**\/route.ts`, extracts the HTTP methods the file
 * exports, and calls each one **with no session cookie, no Telegram bearer and
 * no admin flag**. Any route that answers a non-public read/write with 2xx is a
 * finding: it means an anonymous caller either read or wrote data it has no
 * business touching.
 *
 * This is the test that caught `/api/admin/opportunities` being fully open
 * (the `if (!requireAdminResult)` bug) — the deterministic suite in
 * `check-security.ts` now guards that bug class structurally, and this script
 * keeps watching the real, running server.
 *
 * PUBLIC writes are listed below and are reviewed: each carries its own
 * protection (rate limit, provider signature, signed Telegram payload, or
 * password check). Everything else must be 401/403 for an anonymous caller.
 *
 * Requires a running server (npm run dev) and the database.
 */
process.env.DATABASE_URL ||= "postgresql://x:x@localhost:5432/x";

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.API_BASE_URL || "http://127.0.0.1:3000";
const ROOT = join(import.meta.dirname, "..");
const API_DIR = join(ROOT, "src/app/api");

/** Routes an anonymous caller may legitimately reach, with the reason. */
const PUBLIC = new Map<string, string>([
  // --- shared catalogues / configuration (no personal data) ----------------
  ["config/branding GET", "branding assets"],
  ["config/guide GET", "help copy"],
  ["config/nav GET", "which sidebar sections are hidden"],
  ["config/telegram GET", "bot username + feature flags, never the token"],
  ["countries/compare GET", "published country statistics"],
  ["courses GET", "course catalogue"],
  ["gamification/leaderboard GET", "public leaderboard (display name + points)"],
  ["health GET", "liveness probe"],
  ["opportunities GET", "admin-curated opportunity list"],
  ["premium/status GET", "reports the caller's own plan (free when anonymous)"],
  ["scholarships GET", "scholarship catalogue"],
  ["stories GET", "moderated admission stories"],
  ["universities GET", "university catalogue"],
  ["universities/[id] GET", "university detail"],
  ["visa/requirements GET", "admin-published, source-backed visa facts; no student data"],
  ["certificates/verify GET", "verifies a public certificate code"],
  ["parent-share GET", "constant-time share-token lookup, opt-in and revocable"],
  ["stories POST", "premium-gated story submission (401 for anonymous)"],
  ["auth/session GET", "tells the browser whether a session exists"],
  // --- authentication ------------------------------------------------------
  ["auth/sign-in POST", "password check + IP/account rate limit"],
  ["auth/sign-out POST", "clears the caller's own cookie"],
  ["auth/telegram/start POST", "IP rate limited, bot-issued code"],
  ["auth/telegram/status POST", "polls a sign-in attempt by opaque id"],
  ["auth/telegram/verify POST", "IP rate limited, wrong-code lockout"],
  ["telegram/miniapp/auth POST", "HMAC-verified Telegram initData"],
  ["telegram/webhook POST", "secret-token header"],
  ["profiles POST", "sign-up: rate limited, hashed password, unique email"],
  // --- provider webhooks ---------------------------------------------------
  ["payments/payme/webhook POST", "Payme Basic auth signature"],
  ["payments/click/prepare POST", "Click MD5 signature"],
  ["payments/click/complete POST", "Click MD5 signature"],
  // --- deliberately public AI / analytics ----------------------------------
  ["visa/chat POST", "anonymous visa-officer practice, IP rate limited"],
  ["visa/analyze POST", "anonymous visa page analysis, IP rate limited"],
  ["track POST", "anonymous traffic beacon (insert-only), IP rate limited"],
  ["cron/refresh GET", "CRON_SECRET header"],
  ["cron/notifications GET", "CRON_SECRET header"],
]);

interface Finding {
  route: string;
  method: string;
  status: number | string;
  detail: string;
}

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return routeFiles(full);
    return name === "route.ts" ? [full] : [];
  });
}

function urlFor(file: string): string {
  // Keep the /api prefix: API_DIR already contains it.
  return (
    "/api" +
    file
      .slice(API_DIR.length)
      .replace(/\/route\.ts$/, "")
      .replace(/\[[^\]]+\]/g, "1")
  );
}

async function probe(route: string, method: string): Promise<{ status: number | string; detail: string }> {
  const init: RequestInit = { method, redirect: "manual" };
  if (method !== "GET") {
    init.headers = { "content-type": "application/json" };
    // An empty JSON object: a correctly guarded route rejects it before doing
    // anything, a broken one may insert a blank row — which is exactly the
    // finding we want to see.
    init.body = "{}";
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(`${BASE}${route}`, { ...init, signal: controller.signal });
    const text = await res.text();
    return { status: res.status, detail: text.replace(/\s+/g, " ").slice(0, 110) };
  } catch (err) {
    return { status: "unreachable", detail: String(err).slice(0, 110) };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  // A slow CI box (or a memory-limited dev container) can run the surface in
  // slices: PROBE_START=0 PROBE_END=40 npm run test:api-security
  const all = routeFiles(API_DIR).sort();
  const start = Number(process.env.PROBE_START ?? 0);
  const end = Number(process.env.PROBE_END ?? all.length);
  const files = all.slice(start, end);
  const findings: Finding[] = [];
  const review: Finding[] = [];
  let probed = 0;

  console.log(`\nAnonymous-access audit of ${files.length} API routes against ${BASE}\n`);

  for (const file of files) {
    const route = urlFor(file);
    const src = readFileSync(file, "utf8");
    const methods = [...src.matchAll(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)/g)].map((m) => m[1]);
    // The allowlist is keyed by the *route pattern* (`universities/[id]`), not
    // by the probed URL (`universities/1`).
    const keyRoute = file.slice(API_DIR.length).replace(/^\//, "").replace(/\/route\.ts$/, "");
    for (const method of methods) {
      const key = `${keyRoute} ${method}`;
      const isPublic = PUBLIC.has(key);
      const { status, detail } = await probe(route, method);
      probed += 1;

      if (status === "unreachable") {
        findings.push({ route, method, status, detail });
        continue;
      }
      if (isPublic) continue;
      if (typeof status === "number" && status >= 200 && status < 300) {
        findings.push({ route, method, status, detail });
      } else if (status !== 401 && status !== 403) {
        // Not a data leak — the route validated its input before checking the
        // session. Worth tidying so errors never leak the payload shape.
        review.push({ route, method, status, detail });
      }
    }
  }

  if (findings.length) {
    console.log("FAIL — routes reachable anonymously that must not be:\n");
    for (const f of findings) console.log(`  • ${f.method} ${f.route} → ${f.status} ${f.detail}`);
  } else {
    console.log("OK — every non-public route refused an anonymous caller (401/403).");
  }

  if (review.length) {
    console.log(`\nNote — ${review.length} protected route(s) answered a validation error before the auth check:`);
    for (const f of review) console.log(`  · ${f.method} ${f.route} → ${f.status} ${f.detail}`);
  }

  console.log(`\nprobed ${probed} handler(s) across ${files.length} route files`);

  if (findings.some((f) => f.status === "unreachable")) {
    console.log("\nThe server did not answer every request — is `npm run dev` running and healthy?");
  }
  process.exit(findings.length ? 1 : 0);
}

main().catch((err) => {
  console.error("anonymous-access audit crashed:", err);
  process.exit(1);
});
