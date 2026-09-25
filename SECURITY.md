# Security

This document describes how ScholarBridgeAI is hardened, what every developer
must keep in mind when touching the API, and the operational steps that must
happen once per environment.

## 1. Authentication & authorization

**Identity comes from a signed HttpOnly cookie — never from the request body.**

| Piece | Where |
| --- | --- |
| Session issue / verify | `src/lib/auth.ts` |
| Cookie name | `sb_session` (`HttpOnly`, `SameSite=Lax`, `Secure` in production) |
| Signing | HMAC-SHA256 over `v1.<payload>.<signature>`, key = `SESSION_SECRET` |
| Lifetime | 7 days, plus a password fingerprint so rotating a password kills old sessions |

Every privileged route uses one of these helpers instead of trusting an id:

```ts
const access = await requireAdmin(req);          // /api/admin/**
const access = await requireProfileAccess(req, profileId); // own data or admin
const access = await optionalProfileAccess(req, profileId); // anonymous reads allowed
const access = await requireRowAccess(req, row);  // a row fetched by its id
```

Each returns `{ ok: false, status, error, code }` which the route turns straight
into a JSON response (401 not signed in, 403 signed in as somebody else).

Rules:

- **Never** read `adminProfileId`, `requesterId` or a similar field from the
  body/query to decide who the caller is. Those parameters are still accepted by
  clients for backwards compatibility but the server ignores them.
- Admin status is re-read from the database on every request, so demoting a
  user (`is_admin = false`) takes effect immediately.
- Password hashes never leave the server: `sanitizeProfile()` strips
  `passwordHash` before any response is built.

## 2. Required environment variables

| Variable | Why |
| --- | --- |
| `SESSION_SECRET` | Signs the session cookie. **Set in production** (>= 32 chars). Generate: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `AI_KEYS_ENCRYPTION_SECRET` | AES-256-GCM key for API keys stored from the admin panel |
| `ADMIN_PASSWORD` | Bootstrap password for the seeded admin account (>= 8 chars) |
| `PAYME_MERCHANT_ID` + `PAYME_KEY`/`PAYME_PASSWORD` | Without them the Payme webhook answers `503` (fail closed) |
| `CLICK_SERVICE_ID` + `CLICK_SECRET_KEY` | Without them Click callbacks are rejected (fail closed) |

Rotating `SESSION_SECRET` signs everybody out — that is the intended emergency
lever if the secret ever leaks.

## 3. Transport & browser hardening

* `src/middleware.ts` sends a **nonce-based CSP** on every HTML response
  (`script-src 'self' 'nonce-…' 'strict-dynamic'`, `object-src 'none'`,
  `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`,
  `upgrade-insecure-requests`). The nonce is generated per request and handed to
  Next.js via the `x-nonce` request header, so the framework's own inline
  scripts keep working while injected scripts do not.
* `next.config.ts` adds `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, `Cross-Origin-Opener-Policy`, `Permissions-Policy` and
  `no-store` for authenticated responses to **every** path, `/api/**` included.
* HSTS (1 year, includeSubDomains, preload) is sent in production.
* To watch for CSP breakage before enforcing, deploy once with
  `CSP_REPORT_ONLY=1`; the same policy is then sent as
  `Content-Security-Policy-Report-Only`. Remove the variable to enforce.

## 4. Rate limiting

`src/lib/rate-limit.ts` implements a sliding-window limiter (in-process memory,
correct for a single Node instance). Presets live in `LIMITS`:

| Bucket | Budget |
| --- | --- |
| Sign-in | 8 / 15 min per IP **and** per email (brute-force protection) |
| Sign-up | 5 / hour per IP |
| AI endpoints | 20 / min per account, 6 / min per anonymous IP |
| Forum writes | 20 / 10 min per account |
| Payment initiation | 10 / 10 min per account |
| Consulting form | 5 / hour per IP |
| Analytics beacon | 60 / min per IP |

If the app is ever scaled to more than one instance, swap the store for Redis —
the call sites do not change.

## 5. Input handling

* `readJsonBody()` caps request bodies (413 above the limit) — no unbounded
  `await req.json()`.
* Prompts are clamped (`clampPrompt`, default 8 000 chars) before reaching a
  paid model; chat history is capped at the last 6 turns.
* Passwords: min 8 characters, common-password blocklist, scrypt with a random
  16-byte salt, constant-time comparison (`src/lib/password.ts`).
* Sign-in answers the same message for "no such account" and "wrong password"
  (no account enumeration), and logs failed attempts with the IP.
* Branding uploads accept PNG/JPG/WEBP/ICO only, max 5 MB.
* All SQL goes through Drizzle's query builder; the few `sql\`` fragments are
  parameterised (`lower(email) = ${value}`).

## 6. Payments

* **Payme** — the webhook requires the merchant's HTTP Basic credentials
  (`verifyPaymeAuth`, constant-time compare) and is disabled (`503`) until real
  credentials are configured.
* **Click** — `CLICK_SECRET_KEY` has **no demo fallback**; callbacks are
  rejected while it is unset, and signatures are compared in constant time.
* Amounts are validated against the stored payment row and activation is
  idempotent, so a replayed callback cannot double-credit a subscription.

## 7. SSRF

`src/lib/ssrf.ts` blocks loopback, private, link-local, CGNAT, multicast and
metadata-endpoint addresses (including decimal/hex IP encodings) and non-HTTP
schemes. `fetchPageText()` in the research agent refuses such URLs before any
request is made.

## 8. Privacy

* No IP addresses are stored; analytics uses an anonymous first-party cookie.
* `GET /api/profiles` returns only the caller's own profile (all profiles for a
  live admin). `GET /api/profiles/:id` is owner-or-admin only.
* Certificate verification by code stays public by design (employers check
  certificates without an account).

## 9. Checks

```bash
npm run test:security   # 50 assertions over auth, rate limits, SSRF, payments, CSP
npm run test:ai-settings
npm run typecheck
npm run build
npm audit --audit-level=high
```

CI: `ci/security-ci.yml` runs the audit, typecheck, all test scripts and the
build on every push and pull request. Copy it into `.github/workflows/ci.yml`
once (`cp ci/security-ci.yml .github/workflows/ci.yml`) — automation accounts
are not allowed to create workflow files.

`npm audit` currently reports 4 **moderate** advisories, all inside the
dev-only `drizzle-kit` → `@esbuild-kit/esm-loader` → `esbuild` chain (a dev
server CORS issue). It is not installed at runtime and not reachable from the
deployed app; npm's only "fix" is a breaking downgrade to `drizzle-kit@0.18.1`,
which would break schema tooling. Re-evaluate when drizzle-kit upgrades its
esbuild-kit dependency.

## 10. Reporting a vulnerability

Please do **not** open a public issue. Email the maintainers with a description,
reproduction steps and the affected endpoint. We aim to acknowledge reports
within 3 working days.
