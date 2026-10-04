/**
 * Security regression test — deterministic, no DB connection, no network.
 *
 * Exercises the REAL modules that implement the security baseline:
 *   src/lib/auth.ts        signed session cookies (issue / verify / tamper)
 *   src/lib/password.ts    scrypt hashing + password policy
 *   src/lib/rate-limit.ts  sliding-window throttling
 *   src/lib/ssrf.ts        outbound-fetch guard
 *   src/lib/request.ts     body-size cap
 *   src/lib/payments.ts    Payme / Click callback authentication
 *   src/proxy.ts         Content-Security-Policy (proxy = the renamed middleware)
 * plus structural checks that no API route trusts a client-supplied id again.
 *
 * Run:  npm run test:security
 * Exit 0 + "security test passed (N assertions)" on success.
 */
process.env.DATABASE_URL = "postgresql://x:x@localhost:5432/x"; // dummy — no queries are executed
process.env.SESSION_SECRET = "test-session-secret-that-is-long-enough-1234567890";

import * as sec from "../src/lib/security";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

let passed = 0;
const failures: string[] = [];

function check(name: string, fn: () => void | Promise<void>) {
  try {
    const result = fn();
    if (result instanceof Promise) {
      throw new Error("async check not awaited — use main()");
    }
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failures.push(`${name} — ${(err as Error).message}`);
    console.log(`  ✗ ${name} — ${(err as Error).message}`);
  }
}

const ROOT = join(import.meta.dirname, "..");

async function main() {
  const auth = await import("../src/lib/auth");
  const { hashPassword, verifyPassword, passwordPolicyError, MIN_PASSWORD_LENGTH } =
    await import("../src/lib/password");
  const rateLimit = await import("../src/lib/rate-limit");
  const ssrf = await import("../src/lib/ssrf");
  const request = await import("../src/lib/request");
  const payments = await import("../src/lib/payments");
  const { contentSecurityPolicy, proxy: middleware } = await import("../src/proxy");
  const { NextRequest } = await import("next/server");
  // The exact function the App Router uses to pull the nonce out of the request
  // CSP header — used below to prove our policy format is compatible.
  const { getScriptNonceFromHeader } = await import(
    "next/dist/server/app-render/get-script-nonce-from-header.js"
  );

  console.log("\n— session tokens —");

  const profile = { id: 42, passwordHash: hashPassword("correct horse battery") };

  check("signSessionToken produces a v1.<payload>.<sig> token", () => {
    const token = auth.signSessionToken(profile);
    const parts = token.split(".");
    assert.equal(parts.length, 3);
    assert.equal(parts[0], "v1");
    assert.ok(parts[1].length > 10 && parts[2].length > 10);
  });

  check("verifySessionToken accepts a freshly signed token", () => {
    const token = auth.signSessionToken(profile);
    const payload = auth.verifySessionToken(token);
    assert.ok(payload);
    assert.equal(payload.pid, 42);
  });

  check("verifySessionToken rejects a tampered payload", () => {
    const token = auth.signSessionToken(profile);
    const [, body, sig] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({ pid: 1, iat: 0, exp: 9999999999, fp: "x", sid: "y" }),
      "utf8"
    ).toString("base64url");
    assert.equal(auth.verifySessionToken(`v1.${forged}.${sig}`), null);
    assert.equal(auth.verifySessionToken(`v1.${body}.${sig}AA`), null);
  });

  check("verifySessionToken rejects an expired token", () => {
    const token = auth.signSessionToken(profile, { ttlSeconds: 60, now: Date.now() - 120_000 });
    assert.equal(auth.verifySessionToken(token), null);
  });

  check("verifySessionToken rejects a token signed with another secret", () => {
    const token = auth.signSessionToken(profile);
    assert.equal(auth.verifySessionToken(token, { secret: "another-secret-value" }), null);
  });

  check("verifySessionToken rejects junk input", () => {
    for (const junk of [null, undefined, "", "abc", "v1.x", "v2.a.b", "v1.!!.??"]) {
      assert.equal(auth.verifySessionToken(junk as string), null);
    }
  });

  check("passwordFingerprint changes when the password hash changes", () => {
    const a = auth.passwordFingerprint(profile.passwordHash);
    const b = auth.passwordFingerprint(hashPassword("another password"));
    assert.notEqual(a, b);
    assert.equal(auth.passwordFingerprint(null), "nopw");
  });

  check("session cookie is HttpOnly, SameSite and Path=/", () => {
    const header = auth.sessionCookieHeader(profile, undefined);
    assert.match(header, /^sb_session=v1\./);
    assert.match(header, /HttpOnly/);
    assert.match(header, /SameSite=Lax/);
    assert.match(header, /Path=\//);
    assert.match(header, /Max-Age=/);
  });

  check("session cookie gets Secure over HTTPS / in production", () => {
    const headers = new Headers({ "x-forwarded-proto": "https" });
    const header = auth.sessionCookieHeader(profile, { headers } as unknown as Request);
    assert.match(header, /Secure/);
  });

  check("clearSessionCookieHeader expires the cookie", () => {
    assert.match(auth.clearSessionCookieHeader(), /sb_session=;/);
    assert.match(auth.clearSessionCookieHeader(), /Max-Age=0/);
  });

  check("readSessionToken parses the cookie header", () => {
    const token = auth.signSessionToken(profile);
    assert.equal(auth.readSessionToken(`a=1; sb_session=${token}; b=2`), token);
    assert.equal(auth.readSessionToken("a=1"), null);
    assert.equal(auth.readSessionToken(null), null);
  });

  check("hasExplicitSessionSecret requires >= 32 chars", () => {
    assert.equal(auth.hasExplicitSessionSecret({ SESSION_SECRET: "short" }), false);
    assert.equal(auth.hasExplicitSessionSecret({ SESSION_SECRET: "x".repeat(32) }), true);
  });

  console.log("\n— passwords —");

  check("hashPassword stores a salted scrypt hash, never the plaintext", () => {
    const hash = hashPassword("s3cret-passphrase");
    assert.match(hash, /^scrypt:[0-9a-f]{32}:[0-9a-f]{128}$/);
    assert.ok(!hash.includes("s3cret-passphrase"));
  });

  check("verifyPassword accepts the right password and rejects others", () => {
    const hash = hashPassword("s3cret-passphrase");
    assert.equal(verifyPassword("s3cret-passphrase", hash), true);
    assert.equal(verifyPassword("S3cret-passphrase", hash), false);
    assert.equal(verifyPassword("", hash), false);
    assert.equal(verifyPassword("anything", null), false);
    assert.equal(verifyPassword("anything", "plaintext"), false);
  });

  check("two hashes of the same password differ (unique salts)", () => {
    assert.notEqual(hashPassword("same"), hashPassword("same"));
  });

  check(`password policy enforces >= ${MIN_PASSWORD_LENGTH} chars`, () => {
    assert.equal(MIN_PASSWORD_LENGTH >= 8, true);
    assert.ok(passwordPolicyError("short"));
    assert.equal(passwordPolicyError("a-strong-passphrase"), null);
  });

  check("password policy rejects common passwords and absurd lengths", () => {
    assert.ok(passwordPolicyError("password123"));
    assert.ok(passwordPolicyError("scholarbridgeai"));
    assert.ok(passwordPolicyError("x".repeat(201)));
  });

  console.log("\n— rate limiting —");

  check("checkRateLimit allows N requests then blocks", () => {
    rateLimit.resetRateLimits();
    let t = 1_000;
    const now = () => t;
    for (let i = 0; i < 5; i++) {
      assert.equal(rateLimit.checkRateLimit("k", { limit: 5, windowMs: 60_000, now }).ok, true);
    }
    assert.equal(rateLimit.checkRateLimit("k", { limit: 5, windowMs: 60_000, now }).ok, false);
  });

  check("the window slides: old hits stop counting", () => {
    rateLimit.resetRateLimits();
    let t = 0;
    const now = () => t;
    for (let i = 0; i < 3; i++) rateLimit.checkRateLimit("w", { limit: 3, windowMs: 1000, now });
    assert.equal(rateLimit.checkRateLimit("w", { limit: 3, windowMs: 1000, now }).ok, false);
    t = 1001; // window elapsed
    assert.equal(rateLimit.checkRateLimit("w", { limit: 3, windowMs: 1000, now }).ok, true);
  });

  check("rateLimitedResponse returns 429 + Retry-After", () => {
    const res = rateLimit.rateLimitedResponse(7);
    assert.equal(res.status, 429);
    assert.equal(res.headers.get("Retry-After"), "7");
  });

  check("clientIp uses the proxy-appended (rightmost) X-Forwarded-For entry", () => {
    const mk = (h: Record<string, string>) =>
      ({ headers: new Headers(h) }) as unknown as Request;
    // One trusted proxy (default): the rightmost entry is the real client.
    assert.equal(rateLimit.clientIp(mk({ "x-forwarded-for": "1.2.3.4" }), {}), "1.2.3.4");
    assert.equal(
      rateLimit.clientIp(mk({ "x-forwarded-for": "6.6.6.6, 203.0.113.9" }), {}),
      "203.0.113.9"
    );
    // Two trusted proxies: second from the right.
    assert.equal(
      rateLimit.clientIp(
        mk({ "x-forwarded-for": "6.6.6.6, 203.0.113.9, 10.0.0.1" }),
        { TRUSTED_PROXY_HOPS: "2" }
      ),
      "203.0.113.9"
    );
    // An edge-set header wins when configured.
    assert.equal(
      rateLimit.clientIp(
        mk({ "x-forwarded-for": "6.6.6.6", "cf-connecting-ip": "198.51.100.7" }),
        { CLIENT_IP_HEADER: "cf-connecting-ip" }
      ),
      "198.51.100.7"
    );
    assert.equal(rateLimit.clientIp(mk({ "x-real-ip": "5.6.7.8" }), {}), "5.6.7.8");
    assert.equal(rateLimit.clientIp(mk({}), {}), "unknown");
  });

  check("a spoofed X-Forwarded-For prefix cannot mint a fresh rate-limit bucket", () => {
    const mk = (xff: string) =>
      ({ headers: new Headers({ "x-forwarded-for": xff }) }) as unknown as Request;
    const real = "203.0.113.50";
    const keys = new Set(
      ["1.1.1.1", "2.2.2.2", "3.3.3.3", "9.9.9.9"].map((fake) =>
        rateLimit.clientIp(mk(`${fake}, ${real}`), {})
      )
    );
    assert.deepEqual([...keys], [real]);
  });

  check("framing is only relaxed under `next dev`, never in production", () => {
    assert.deepEqual(sec.frameAncestors({ NODE_ENV: "production" }), ["'none'"]);
    assert.deepEqual(sec.frameAncestors({ NODE_ENV: "test" }), ["'none'"]);
    assert.deepEqual(sec.frameAncestors({}), ["'none'"]);
    assert.equal(sec.xFrameOptions({ NODE_ENV: "production" }), "DENY");
    assert.equal(sec.xFrameOptions({}), "DENY");
    assert.ok(!sec.frameAncestors({ NODE_ENV: "development" }).includes("*"));
    assert.equal(sec.xFrameOptions({ NODE_ENV: "development" }), null);
  });

  console.log("\n— SSRF guard —");

  check("blocks loopback / private / link-local / metadata addresses", () => {
    for (const url of [
      "http://localhost/admin",
      "http://127.0.0.1:5432/",
      "http://[::1]/",
      "http://169.254.169.254/latest/meta-data/",
      "http://10.1.2.3/internal",
      "http://192.168.1.1/router",
      "http://172.16.5.5/",
      "http://2130706433/", // 127.0.0.1 in decimal
      "http://0x7f000001/",
      "http://db.local/",
      "http://metadata.google.internal/",
      "file:///etc/passwd",
      "gopher://127.0.0.1:6379/",
    ]) {
      assert.equal(ssrf.isSafeOutboundUrl(url), false, `should block ${url}`);
    }
  });

  check("allows ordinary public HTTPS hosts", () => {
    for (const url of [
      "https://www.tum.de/en/",
      "https://admissions.mit.edu/apply",
      "http://www.ox.ac.uk/admissions",
    ]) {
      assert.equal(ssrf.isSafeOutboundUrl(url), true, `should allow ${url}`);
    }
  });

  check("unsafeOutboundReason explains why a URL was rejected", () => {
    assert.match(String(ssrf.unsafeOutboundReason("http://127.0.0.1/")), /internal/);
    assert.match(String(ssrf.unsafeOutboundReason("file:///etc/passwd")), /protocol/);
    assert.equal(ssrf.unsafeOutboundReason("https://example.com/"), null);
  });

  check("assertSafeOutboundUrl throws for internal targets", () => {
    assert.throws(() => ssrf.assertSafeOutboundUrl("http://localhost:3000/"));
    assert.doesNotThrow(() => ssrf.assertSafeOutboundUrl("https://example.com/"));
  });

  console.log("\n— request body limits —");

  await (async () => {
    const body = "x".repeat(2000);
    const req = new Request("http://localhost/api/x", {
      method: "POST",
      body,
      headers: { "content-type": "application/json" },
    });
    const res = await request.readJsonBody(req, 100);
    check("readJsonBody rejects an oversized payload with 413", () => {
      assert.equal(res.ok, false);
      if (!res.ok) assert.equal(res.status, 413);
    });
  })();

  await (async () => {
    const req = new Request("http://localhost/api/x", {
      method: "POST",
      body: '{"a":1}',
      headers: { "content-type": "application/json" },
    });
    const res = await request.readJsonBody<{ a: number }>(req, 1024);
    check("readJsonBody parses a valid payload", () => {
      assert.equal(res.ok, true);
      if (res.ok) assert.equal(res.body.a, 1);
    });
  })();

  await (async () => {
    const req = new Request("http://localhost/api/x", {
      method: "POST",
      body: "{not json",
      headers: { "content-type": "application/json" },
    });
    const res = await request.readJsonBody(req, 1024);
    check("readJsonBody rejects malformed JSON with 400", () => {
      assert.equal(res.ok, false);
      if (!res.ok) assert.equal(res.status, 400);
    });
  })();

  check("clampString / clampPrompt cap user input", () => {
    assert.equal(request.clampString("  hi  "), "hi");
    assert.equal(request.clampString("abcdef", 3), "abc");
    assert.equal(request.clampString(123, 10, "fallback"), "fallback");
    assert.equal(request.clampPrompt("y".repeat(20000)).length, 8000);
    assert.equal(request.clampArray([1, 2, 3, 4, 5], 2).length, 2);
    assert.equal(request.positiveInt("-3"), null);
    assert.equal(request.positiveInt("7"), 7);
  });

  console.log("\n— payment callbacks —");

  check("Click secret has no demo fallback (fail closed)", () => {
    const saved = process.env.CLICK_SECRET_KEY;
    delete process.env.CLICK_SECRET_KEY;
    assert.equal(payments.clickConfig().secretKey, "");
    assert.equal(payments.isClickConfigured(), false);
    if (saved !== undefined) process.env.CLICK_SECRET_KEY = saved;
  });

  check("verifyClickSignature only accepts an exact, non-empty match", () => {
    const secret = "click-secret";
    const sign = payments.clickSignString({
      clickTransId: "t1",
      clickPaydocId: "p1",
      serviceId: "s1",
      secretKey: secret,
      merchantTransId: "12",
      amount: 59000,
      action: 0,
    });
    const expected = payments.md5Hex(sign);
    assert.equal(payments.verifyClickSignature(expected, expected), true);
    assert.equal(payments.verifyClickSignature(expected.toUpperCase(), expected), true);
    assert.equal(payments.verifyClickSignature("", expected), false);
    assert.equal(payments.verifyClickSignature("0".repeat(32), expected), false);
    // A different secret must not validate.
    const other = payments.md5Hex(
      payments.clickSignString({
        clickTransId: "t1",
        clickPaydocId: "p1",
        serviceId: "s1",
        secretKey: "wrong-secret",
        merchantTransId: "12",
        amount: 59000,
        action: 0,
      })
    );
    assert.equal(payments.verifyClickSignature(other, expected), false);
  });

  check("Payme credentials have no demo fallback (fail closed)", () => {
    const saved = { ...process.env };
    delete process.env.PAYME_MERCHANT_ID;
    delete process.env.PAYME_KEY;
    delete process.env.PAYME_PASSWORD;
    assert.equal(payments.isPaymeConfigured(), false);
    // An unconfigured merchant must reject even a "correct looking" header.
    assert.equal(payments.verifyPaymeAuth("Basic " + Buffer.from("demo:demo").toString("base64")), false);
    process.env = saved;
  });

  check("verifyPaymeAuth accepts the merchant Basic auth and rejects others", () => {
    process.env.PAYME_MERCHANT_ID = "m-123";
    process.env.PAYME_KEY = "key-abc";
    assert.equal(payments.isPaymeConfigured(), true);
    const good = "Basic " + Buffer.from("m-123:key-abc").toString("base64");
    assert.equal(payments.verifyPaymeAuth(good), true);
    assert.equal(payments.verifyPaymeAuth(null), false);
    assert.equal(payments.verifyPaymeAuth("Bearer abc"), false);
    assert.equal(payments.verifyPaymeAuth("Basic " + Buffer.from("m-123:wrong").toString("base64")), false);
    assert.equal(payments.verifyPaymeAuth("Basic " + Buffer.from("other:key-abc").toString("base64")), false);
    delete process.env.PAYME_MERCHANT_ID;
    delete process.env.PAYME_KEY;
  });

  check("safeEqual is length-safe and exact", () => {
    assert.equal(payments.safeEqual("abc", "abc"), true);
    assert.equal(payments.safeEqual("abc", "abd"), false);
    assert.equal(payments.safeEqual("abc", "abcd"), false);
  });

  console.log("\n— Content-Security-Policy —");

  check("CSP is nonce-based and blocks framing/plugins", () => {
    const csp = contentSecurityPolicy("abc123");
    assert.match(csp, /script-src 'self' 'nonce-abc123' 'strict-dynamic'/);
    assert.match(csp, /object-src 'none'/);
    assert.match(csp, /frame-ancestors 'none'/);
    assert.match(csp, /base-uri 'self'/);
    assert.match(csp, /form-action 'self'/);
    assert.match(csp, /default-src 'self'/);
    assert.match(csp, /upgrade-insecure-requests/);
  });

  check("every request gets its own nonce", () => {
    assert.notEqual(contentSecurityPolicy("aaa"), contentSecurityPolicy("bbb"));
  });

  check("Next.js can extract our nonce from the policy (real Next function)", () => {
    // If our policy format did not match what Next parses, inline flight
    // scripts on dynamic pages would be blocked by our own policy.
    const nonce = "2EokH/pzG99H6j9C7NIDLw==";
    assert.equal(getScriptNonceFromHeader(contentSecurityPolicy(nonce)), nonce);
  });

  check("middleware forwards the CSP on the request headers Next reads", () => {
    const src = readFileSync(join(ROOT, "src/proxy.ts"), "utf8");
    assert.match(
      src,
      /requestHeaders\.set\([\s\S]{0,120}"Content-Security-Policy(-Report-Only)?"/
    );
    assert.match(src, /requestHeaders\.set\("x-nonce", nonce\)/);
  });

  check("middleware sets the CSP + hardening headers and forwards the nonce", () => {
    const res = middleware(new NextRequest("https://example.com/uz"));
    const csp = res.headers.get("content-security-policy");
    assert.ok(csp, "CSP header must be present");
    const nonce = /'nonce-([^']+)'/.exec(csp!)?.[1];
    assert.ok(nonce && nonce.length >= 16, "CSP must carry a random nonce");
    assert.match(csp!, /script-src 'self' 'nonce-/);
    assert.match(csp!, /frame-ancestors 'none'/);
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
    assert.equal(res.headers.get("x-frame-options"), "DENY");
    assert.equal(res.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
    assert.equal(res.headers.get("cross-origin-opener-policy"), "same-origin");
    assert.match(String(res.headers.get("set-cookie")), /SameSite=lax/);
  });

  console.log("\n— structural checks (no client-asserted identity) —");

  const apiDir = join(ROOT, "src/app/api");
  const routeFiles: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry === "route.ts") routeFiles.push(full);
    }
  };
  walk(apiDir);

  check(`scanned ${routeFiles.length} API routes`, () => {
    assert.ok(routeFiles.length > 40, "expected the full API surface to be scanned");
  });

  check("no route trusts a client-supplied adminProfileId / requesterId", () => {
    const offenders: string[] = [];
    for (const file of routeFiles) {
      const src = readFileSync(file, "utf8");
      if (/await isAdmin\(/.test(src)) offenders.push(`${file}: isAdmin()`);
      if (/getRequester\((?!req)/.test(src)) offenders.push(`${file}: getRequester(id)`);
    }
    assert.deepEqual(offenders, []);
  });

  check("every /api/admin route verifies the session with requireAdmin", () => {
    const missing: string[] = [];
    // Growth routes go through guardAdmin()/makeAdminCrud(), which must
    // themselves call requireAdmin — verified here so the shortcut stays safe.
    const growthApi = readFileSync(join(process.cwd(), "src/lib/growth/api.ts"), "utf8");
    const guardBody = growthApi.slice(growthApi.indexOf("export async function guardAdmin"));
    assert.match(guardBody.slice(0, guardBody.indexOf("\n}\n")), /requireAdmin\(req\)/);
    const crud = readFileSync(join(process.cwd(), "src/lib/growth/adminCrud.ts"), "utf8");
    assert.equal((crud.match(/await guardAdmin\(req/g) ?? []).length, 4);
    for (const file of routeFiles.filter((f) => f.includes(`${apiDir}/admin`))) {
      const src = readFileSync(file, "utf8");
      if (!/requireAdmin\(|guardAdmin\(req|makeAdminCrud\(/.test(src)) missing.push(file);
    }
    assert.deepEqual(missing, []);
  });

  check("profile routes authorize from the session, not the body", () => {
    const route = readFileSync(join(apiDir, "profiles/[id]/route.ts"), "utf8");
    assert.match(route, /requireProfileAccess\(req/);
    assert.match(route, /requireAdmin\(req\)/);
    assert.doesNotMatch(route, /body\.requesterId/);
  });

  check("the profile list is no longer public", () => {
    const route = readFileSync(join(apiDir, "profiles/route.ts"), "utf8");
    assert.match(route, /await authenticate\(req\)/);
  });

  check("sign-in issues a session cookie and is rate limited", () => {
    const route = readFileSync(join(apiDir, "auth/sign-in/route.ts"), "utf8");
    // sessionCookieHeader = direct helper; sessionCookieFromToken = A23, where
    // the token is signed explicitly so a server-side session row can record
    // exactly this token. Both satisfy "a real session cookie is set".
    assert.match(route, /sessionCookieHeader|sessionCookieFromToken/);
    // checkRateLimit = in-process limiter; checkSharedRateLimit = A20, the
    // Postgres-backed limiter that survives process restarts (stronger).
    assert.match(route, /checkRateLimit|checkSharedRateLimit/);
    assert.match(route, /Incorrect email or password/); // no account enumeration
  });

  check("sign-out and session endpoints exist", () => {
    assert.ok(existsSync(join(apiDir, "auth/sign-out/route.ts")));
    assert.ok(existsSync(join(apiDir, "auth/session/route.ts")));
  });

  check("AI endpoints are guarded (rate limit + prompt caps)", () => {
    for (const name of ["chat", "draft-sop", "evaluate-profile", "review-sop"]) {
      const src = readFileSync(join(apiDir, `ai/${name}/route.ts`), "utf8");
      assert.match(src, /guardAiRequest/, `ai/${name} must use guardAiRequest`);
    }
  });

  check("payment webhooks authenticate the provider", () => {
    const payme = readFileSync(join(apiDir, "payments/payme/webhook/route.ts"), "utf8");
    assert.match(payme, /verifyPaymeAuth/);
    assert.match(payme, /isPaymeConfigured/);
    for (const step of ["prepare", "complete"]) {
      const src = readFileSync(join(apiDir, `payments/click/${step}/route.ts`), "utf8");
      assert.match(src, /isClickConfigured/);
      assert.match(src, /verifyClickSignature/);
    }
  });

  check("the research agent refuses internal URLs", () => {
    const src = readFileSync(join(ROOT, "src/lib/research-agent/fetch.ts"), "utf8");
    assert.match(src, /unsafeOutboundReason/);
  });

  check("security headers are configured in next.config.ts", () => {
    const cfg = readFileSync(join(ROOT, "next.config.ts"), "utf8");
    assert.match(cfg, /X-Content-Type-Options/);
    assert.match(cfg, /X-Frame-Options/);
    assert.match(cfg, /poweredByHeader: false/);
  });

  check(".env.example documents SESSION_SECRET", () => {
    const env = readFileSync(join(ROOT, ".env.example"), "utf8");
    assert.match(env, /SESSION_SECRET/);
  });

  check("password hashes are never returned by the profile API", () => {
    for (const rel of ["profiles/route.ts", "profiles/[id]/route.ts", "auth/session/route.ts"]) {
      const src = readFileSync(join(apiDir, rel), "utf8");
      assert.match(src, /sanitizeProfile/, `${rel} must sanitize the profile`);
    }
  });

  // ---------------------------------------------------------------------
  // 2026-09 full-system audit — regressions for the fixed findings
  // ---------------------------------------------------------------------
  const routeSrc = (rel: string) => readFileSync(join(apiDir, rel), "utf8");
  const handlerBodies = (src: string) =>
    src.split(/(?=export (?:async )?function (?:GET|POST|PUT|PATCH|DELETE)\b)/).slice(1).map((part) => ({
      method: /function (\w+)/.exec(part)![1],
      body: part,
    }));

  check("every API write (POST/PUT/PATCH/DELETE) authenticates, except a reviewed public allowlist", () => {
    const GUARD = /require(?:Admin|Session|ProfileAccess|RowAccess|FeatureSession)\(|optionalProfileAccess\(|authenticate\(|guard(?:Admin|Student|AiRequest)?\(|getRequester\(|cronAuthorized|verifyPaymeAuth|verifyClickSignature|verifyInitData|webhookSecret\(|makeAdminCrud/;
    // Intentionally public writes — each has its own protection (rate limit,
    // provider signature, signed Telegram data) and is reviewed in SECURITY.md.
    const PUBLIC = new Set([
      "auth/sign-in POST", "auth/sign-out POST", "auth/telegram/status POST", "auth/telegram/verify POST",
      "profiles POST", "track POST", "visa/chat POST",
    ]);
    const unguarded: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (name === "route.ts") {
          const rel = p.slice(apiDir.length + 1).replace(/\/route\.ts$/, "");
          for (const h of handlerBodies(readFileSync(p, "utf8"))) {
            if (h.method === "GET") continue;
            if (!GUARD.test(h.body) && !PUBLIC.has(`${rel} ${h.method}`)) unguarded.push(`${rel} ${h.method}`);
          }
        }
      }
    };
    walk(apiDir);
    assert.deepEqual(unguarded, [], `unauthenticated writes: ${unguarded.join(", ")}`);
  });

  check("Premium features are enforced by their APIs, not only by the website's PremiumGate", () => {
    const gated: Record<string, string> = {
      "essays/route.ts": "ai_essay",
      "essays/reviews/route.ts": "ai_essay",
      "essay-adapter/route.ts": "ai_essay",
      "essay-adapter/adapt/route.ts": "ai_essay",
      "ai/draft-sop/route.ts": "ai_essay",
      "ai/review-sop/route.ts": "ai_essay",
      "forum/categories/route.ts": "forum",
      "forum/threads/route.ts": "forum_write",
      "forum/threads/[id]/route.ts": "forum",
      "forum/replies/route.ts": "forum_write",
      "forum/likes/route.ts": "forum_write",
      "forum/reports/route.ts": "forum_write",
      "courses/[id]/route.ts": "courses_full",
      "courses/progress/route.ts": "courses_full",
      "quizzes/attempt/route.ts": "courses_full",
      "certificates/route.ts": "courses_full",
    };
    for (const [rel, feature] of Object.entries(gated)) {
      const src = routeSrc(rel);
      const enforced =
        (src.includes(`premiumGate(`) && src.includes(`"${feature}"`)) ||
        src.includes(`requireFeatureSession(req, "${feature}")`) ||
        src.includes(`hasFeature(`) && src.includes(`"${feature}"`) ||
        src.includes(`feature: "${feature}"`);
      assert.ok(enforced, `${rel} must enforce the "${feature}" feature server-side`);
    }
    // Basic roadmap (tasks) is FREE — ownership still required on every write.
    const tasks = routeSrc("tasks/route.ts");
    assert.doesNotMatch(tasks, /premiumGate\(/, "basic roadmap must stay free (no premiumGate on tasks)");
    for (const h of handlerBodies(tasks).filter((x) => x.method === "PATCH" || x.method === "DELETE")) {
      assert.match(h.body, /requireRowAccess\(/, `tasks ${h.method} must check the row owner`);
    }
    // Free quantitative caps are enforced server-side on write paths.
    assert.match(routeSrc("saved-universities/route.ts"), /enforceFreeCap\(/);
    assert.match(routeSrc("saved-scholarships/route.ts"), /enforceFreeCap\(/);
    assert.match(routeSrc("applications/route.ts"), /enforceFreeCap\(/);
  });

  check("the website's PremiumGate asks for a specific feature and does not mount locked content", () => {
    const gate = readFileSync(join(ROOT, "src/components/PremiumGate.tsx"), "utf8");
    assert.match(gate, /feature: FeatureKey/);
    assert.match(gate, /data\?\.features\?\.\[feature\]/);
    const lockedBranch = gate.slice(gate.indexOf("if (isPremium) {"));
    assert.equal((lockedBranch.match(/\{children\}/g) || []).length, 1, "children may only render in the unlocked branch");
    // Every mount, wherever it lives — the app shell renders PremiumGate
    // directly and the hub wrapper (`Gated`) renders it for the Pro panes —
    // must name the feature it unlocks: a gate without a feature cannot check
    // the right entitlement. This used to read only `app/page.tsx`, which the
    // hub refactor emptied of all but one mount, so the assertion rotted.
    const openingTag = (src: string, start: number) => {
      let depth = 0;
      for (let i = start; i < src.length; i += 1) {
        const ch = src[i];
        if (ch === "{") depth += 1;
        else if (ch === "}") depth -= 1;
        // Brace-aware: `onUpgrade={() => …}` must not cut the tag short.
        else if (ch === ">" && depth === 0) return src.slice(start, i + 1);
      }
      return src.slice(start);
    };
    const mounts: { file: string; tag: string }[] = [];
    (function walk(dir: string) {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith(".tsx")) {
          const src = readFileSync(full, "utf8");
          let i = src.indexOf("<PremiumGate");
          while (i !== -1) {
            mounts.push({ file: full.replace(ROOT, ""), tag: openingTag(src, i) });
            i = src.indexOf("<PremiumGate", i + 1);
          }
        }
      }
    })(join(ROOT, "src"));
    assert.ok(mounts.length >= 2, `PremiumGate is mounted (found ${mounts.length})`);
    assert.ok(
      mounts.every((m) => /feature=("[a-z_]+"|\{[A-Za-z_$][\w$]*\})/.test(m.tag)),
      `every PremiumGate names its feature — missing in ${mounts.filter((m) => !/feature=/.test(m.tag)).map((m) => m.file).join(", ")}`
    );
    // `Gated` forwards its `feature` prop, so every call site must pass a
    // concrete feature (never undefined, never a computed empty string).
    const hubs = readFileSync(join(ROOT, "src/components/hubs/index.tsx"), "utf8");
    const gated: string[] = [];
    let gi = hubs.indexOf("<Gated");
    while (gi !== -1) {
      gated.push(openingTag(hubs, gi));
      gi = hubs.indexOf("<Gated", gi + 1);
    }
    assert.ok(
      gated.length >= 1 && gated.every((c) => /feature="[a-z_]+"/.test(c)),
      "every Gated call names its feature"
    );
  });

  check("public / cross-account data exposure fixes stay in place", () => {
    const gam = readFileSync(join(ROOT, "src/lib/gamification.ts"), "utf8");
    const lb = gam.slice(gam.indexOf("export async function getLeaderboard"));
    assert.doesNotMatch(lb.slice(0, lb.indexOf("return rows")), /studentProfiles\.email/, "leaderboard must not select e-mails");
    assert.doesNotMatch(routeSrc("courses/[id]/route.ts"), /correctOptionIndex/, "quiz answers must not be sent before an attempt");
    assert.match(routeSrc("quizzes/attempt/route.ts"), /correctOptionIndexes/);
    assert.match(routeSrc("gamification/award/route.ts"), /requireAdmin\(/);
    assert.match(routeSrc("forum/categories/route.ts"), /requireAdmin\(/);
    assert.match(routeSrc("visa/live-token/route.ts"), /requireSession\(/);
    assert.match(routeSrc("visa/live-token/route.ts"), /LIMITS\.visaLiveToken/);
    for (const rel of ["consulting/route.ts", "referrals/route.ts"]) {
      const post = handlerBodies(routeSrc(rel)).find((h) => h.method === "POST")!;
      assert.match(post.body, /requireProfileAccess\(/, `${rel} POST must act on the caller's own profile`);
    }
    for (const rel of ["universities/route.ts", "universities/[id]/route.ts"]) {
      assert.doesNotMatch(routeSrc(rel), /mock/i, `${rel} must not serve sample data on a DB error`);
    }
    const upload = routeSrc("admin/branding/upload/route.ts");
    assert.ok(upload.indexOf("requireAdmin(") < upload.indexOf("formData()"), "authorize before reading the upload");
    assert.match(upload, /matchesImageSignature\(/);
  });

  check("CSRF: cross-site API writes are refused, same-site / non-browser writes pass", () => {
    const base: { host: string | null; forwardedHost: string | null; env: Record<string, string> } = { host: "app.example.org", forwardedHost: null, env: {} };
    const t = (method: string, pathname: string, origin: string | null, extra: Partial<typeof base> = {}) =>
      sec.isCrossSiteApiWrite({ method, pathname, origin, ...base, ...extra });
    assert.equal(t("POST", "/api/tasks", "https://evil.example"), true);
    assert.equal(t("DELETE", "/api/tasks", "null"), true);
    assert.equal(t("POST", "/api/tasks", "https://app.example.org"), false);
    assert.equal(t("POST", "/api/tasks", null), false, "no Origin = not a browser cross-site request");
    assert.equal(t("GET", "/api/tasks", "https://evil.example"), false, "reads are not writes");
    assert.equal(t("POST", "/api/payments/payme/webhook", "https://evil.example"), false, "provider webhooks are exempt");
    assert.equal(t("POST", "/api/tasks", "https://public.example", { host: "10.0.0.5:3000", forwardedHost: "public.example" }), false);
    assert.equal(t("POST", "/api/tasks", "https://www.example.org", { host: "internal:3000", env: { APP_URL: "https://www.example.org" } }), false);
    assert.equal(t("POST", "/api/tasks", "https://app.example.org.evil.example"), true, "suffix tricks do not match");
    const mw = readFileSync(join(ROOT, "src/proxy.ts"), "utf8");
    assert.match(mw, /isCrossSiteApiWrite\(/);
    assert.match(mw, /"\/api\/:path\*"/);
  });

  const branding = await import("../src/lib/branding");
  check("upload signatures (bytes)", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50]);
    const html = new TextEncoder().encode("<html><script>alert(1)</script>");
    assert.equal(branding.matchesImageSignature("png", png), true);
    assert.equal(branding.matchesImageSignature("webp", webp), true);
    assert.equal(branding.matchesImageSignature("png", html), false);
    assert.equal(branding.matchesImageSignature("jpg", png), false);
    assert.equal(branding.matchesImageSignature("svg", html), false);
  });

  const quota = await import("../src/lib/ai/quota");
  check("AI quota: limit parsing and decision", () => {
    assert.equal(quota.parseQuotaLimit("7", "5"), 7);
    assert.equal(quota.parseQuotaLimit("0", "5"), 0, "0 = no AI on this plan");
    assert.equal(quota.parseQuotaLimit("", "5"), 5);
    assert.equal(quota.parseQuotaLimit("abc", "5"), 5);
    assert.equal(quota.parseQuotaLimit("-3", "5"), 5);
    assert.equal(quota.parseQuotaLimit("2.5", "5"), 5);
    assert.deepEqual(quota.quotaDecision({ requests: 4, tokens: 10 }, { requests: 5, tokens: 100 }), { ok: true });
    assert.deepEqual(quota.quotaDecision({ requests: 5, tokens: 10 }, { requests: 5, tokens: 100 }), { ok: false, reason: "requests" });
    assert.deepEqual(quota.quotaDecision({ requests: 1, tokens: 100 }, { requests: 5, tokens: 100 }), { ok: false, reason: "tokens" });
    assert.deepEqual(quota.quotaDecision({ requests: 0, tokens: 0 }, { requests: 0, tokens: 100 }), { ok: false, reason: "requests" });
  });

  check("AI usage is charged to the caller on every guarded route", () => {
    for (const rel of ["ai/admissions-advisor", "ai/chat", "ai/draft-sop", "ai/evaluate-profile", "ai/review-sop", "essay-adapter/adapt"]) {
      assert.match(routeSrc(`${rel}/route.ts`), /profileId: guarded\.usageProfileId/, `${rel} must log usage against the caller`);
    }
    const guard = readFileSync(join(ROOT, "src/lib/ai/guard.ts"), "utf8");
    assert.match(guard, /checkAiQuota\(/);
    assert.match(guard, /authenticate\(req\)/, "the caller is resolved even without a profileId");
  });

  // ---------------------------------------------------------------------
  // 2026-09-29 full-surface audit — the findings of the anonymous probe
  // ---------------------------------------------------------------------
  check("no route treats a guard RESULT OBJECT as a boolean", () => {
    // The bug this catches: `const access = await requireAdmin(req);
    // if (!access) {…}`. requireAdmin resolves to an object, which is truthy
    // even for an anonymous caller — so the 403 branch was dead code and
    // /api/admin/opportunities was open to the internet. Only `.ok` may be
    // negated.
    const GUARD_FNS = [
      "requireAdmin",
      "requireSession",
      "requireProfileAccess",
      "optionalProfileAccess",
      "requireRowAccess",
      "authenticate",
    ];
    const offenders: string[] = [];
    const scan = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) {
          scan(full);
          continue;
        }
        if (!name.endsWith(".ts")) continue;
        // Strip comments first: this test's own explanation of the bug would
        // otherwise match itself.
        const lines = readFileSync(full, "utf8")
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/(^|[^:])\/\/.*$/gm, "$1")
          .split("\n");
        const assigned = new Map<string, string>();
        lines.forEach((line) => {
          const m = /(?:const|let)\s+(\w+)\s*=\s*await\s+(\w+)\s*\(/.exec(line);
          if (m && GUARD_FNS.includes(m[2])) assigned.set(m[1], m[2]);
        });
        for (const [varName, fn] of assigned) {
          const re = new RegExp(`if\\s*\\(\\s*!\\s*${varName}\\s*\\)`);
          lines.forEach((line, i) => {
            if (re.test(line)) offenders.push(`${full.slice(ROOT.length + 1)}:${i + 1} ${fn} → ${line.trim()}`);
          });
        }
      }
    };
    scan(join(ROOT, "src/app"));
    scan(join(ROOT, "src/lib"));
    assert.deepEqual(offenders, [], `guard result used as a boolean: ${offenders.join(" | ")}`);
  });

  check("every API read is either session-guarded or a reviewed public read", () => {
    const GUARD =
      /require(?:Admin|Session|ProfileAccess|RowAccess|FeatureSession)\(|optionalProfileAccess\(|authenticate\(|guard(?:Admin|Student|AiRequest)?\(|getRequester\(|cronAuthorized|verifyPaymeAuth|verifyClickSignature|verifyInitData|webhookSecret\(|makeAdminCrud/;
    // Public reads: shared catalogues and configuration only. None of these may
    // ever return another student's data — each is reviewed in SECURITY.md.
    const PUBLIC_READS = new Set([
      "config/branding GET",
      "config/guide GET",
      "config/nav GET",
      "config/telegram GET",
      "countries/compare GET",
      "courses GET",
      "gamification/leaderboard GET",
      "health GET",
      "opportunities GET",
      "scholarships GET",
      "stories GET",
      "universities GET",
      "universities/[id] GET",
      "certificates/verify GET",
      // Token-authenticated read-only parent summary: 20+ char unguessable
      // token compared in constant time, sharing is opt-in and revocable.
      "parent-share GET",
      "visa/requirements GET",
      "cron/refresh GET",
      "cron/notifications GET",
    ]);
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) {
          walk(p);
          continue;
        }
        if (name !== "route.ts") continue;
        const rel = p.slice(apiDir.length + 1).replace(/\/route\.ts$/, "");
        for (const h of handlerBodies(readFileSync(p, "utf8"))) {
          if (h.method !== "GET") continue;
          if (!GUARD.test(h.body) && !PUBLIC_READS.has(`${rel} ${h.method}`)) offenders.push(`${rel} ${h.method}`);
        }
      }
    };
    walk(apiDir);
    assert.deepEqual(offenders, [], `unguarded reads: ${offenders.join(", ")}`);
  });


  check("sign-up requires a real email and cannot claim a shared default address", () => {
    const src = routeSrc("profiles/route.ts");
    // A blank email used to fall back to one shared default address, which made
    // the first anonymous caller its owner and every later sign-up a 500.
    assert.doesNotMatch(src, /student@scholarbridge\.edu/, "no shared default sign-up address");
    assert.match(src, /invalid_email/, "a missing/invalid email is a 400");
    assert.match(src, /isUniqueViolation\(err\)/, "a racing duplicate resolves to 409, not 500");
    assert.match(src, /passwordPolicyError\(plainPassword\)/, "the password policy is enforced server-side");
  });

  check("community and beacon writes parse a size-capped body", () => {
    for (const rel of [
      "track",
      "forum/likes",
      "forum/replies",
      "forum/reports",
      "forum/threads",
      "forum/threads/[id]",
      "forum/reports/[id]",
    ]) {
      const src = routeSrc(`${rel}/route.ts`);
      assert.doesNotMatch(src, /await req\.json\(\)/, `${rel} must not parse an unbounded body`);
      assert.match(src, /readJsonBody</, `${rel} must use the capped reader`);
    }
  });

  check("the middleware caps API JSON bodies before any route runs", () => {
    const base = { method: "POST", pathname: "/api/track", contentType: "application/json", contentLength: "2048" };
    assert.equal(sec.isOversizedApiJsonBody(base), false);
    assert.equal(sec.isOversizedApiJsonBody({ ...base, contentLength: String(sec.MAX_API_JSON_BODY_BYTES + 1) }), true);
    assert.equal(
      sec.isOversizedApiJsonBody({ ...base, contentLength: "9999999", limit: 64 * 1024 }),
      true,
      "the limit is injectable for per-route comparison"
    );
    assert.equal(
      sec.isOversizedApiJsonBody({ ...base, contentType: "multipart/form-data; boundary=x", contentLength: "9999999" }),
      false,
      "file uploads are exempt — they validate their own size and type"
    );
    assert.equal(sec.isOversizedApiJsonBody({ ...base, pathname: "/dashboard" }), false, "pages are not API routes");
    assert.equal(sec.isOversizedApiJsonBody({ ...base, method: "GET" }), false, "a GET has no body to buffer");

    const req = new NextRequest("https://app.example.org/api/track", {
      method: "POST",
      headers: { "content-type": "application/json", "content-length": String(sec.MAX_API_JSON_BODY_BYTES + 1) },
      body: "{}",
    });
    const res = middleware(req);
    assert.equal(res.status, 413);
  });

  check("API responses are marked no-store (student data is never cached)", () => {
    const req = new NextRequest("https://app.example.org/api/workspace?profileId=3");
    const res = middleware(req);
    assert.match(String(res.headers.get("cache-control")), /no-store/);
    const health = middleware(new NextRequest("https://app.example.org/api/health"));
    assert.match(String(health.headers.get("cache-control")), /no-store/);
  });
}

main()
  .then(() => {
    if (failures.length) {
      console.log(`\nsecurity test FAILED — ${failures.length} assertion(s) failed:`);
      for (const f of failures) console.log(`  • ${f}`);
      process.exit(1);
    }
    console.log(`\nsecurity test passed (${passed} assertions)`);
    process.exit(0);
  })
  .catch((err) => {
    console.error("security test crashed:", err);
    process.exit(1);
  });
