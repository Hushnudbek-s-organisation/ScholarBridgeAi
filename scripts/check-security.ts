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
 *   src/middleware.ts      Content-Security-Policy
 * plus structural checks that no API route trusts a client-supplied id again.
 *
 * Run:  npm run test:security
 * Exit 0 + "security test passed (N assertions)" on success.
 */
process.env.DATABASE_URL = "postgresql://x:x@localhost:5432/x"; // dummy — no queries are executed
process.env.SESSION_SECRET = "test-session-secret-that-is-long-enough-1234567890";

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
  const { contentSecurityPolicy, middleware } = await import("../src/middleware");
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

  check("clientIp reads x-forwarded-for first", () => {
    const mk = (h: Record<string, string>) =>
      ({ headers: new Headers(h) }) as unknown as Request;
    assert.equal(rateLimit.clientIp(mk({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" })), "1.2.3.4");
    assert.equal(rateLimit.clientIp(mk({ "x-real-ip": "5.6.7.8" })), "5.6.7.8");
    assert.equal(rateLimit.clientIp(mk({})), "unknown");
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
    const src = readFileSync(join(ROOT, "src/middleware.ts"), "utf8");
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
    for (const file of routeFiles.filter((f) => f.includes(`${apiDir}/admin`))) {
      const src = readFileSync(file, "utf8");
      if (!/requireAdmin\(/.test(src)) missing.push(file);
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
    assert.match(route, /sessionCookieHeader/);
    assert.match(route, /checkRateLimit/);
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
