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
npm run test:ownership     # ownership state machine, races, authz (embedded Postgres)
npm run test:portability   # APP_URL, config allowlist/export/import, RLS script
npm run test:integration   # API routes against Postgres: IDOR, Premium on the API, AI quota
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


## 9. 2026-09 audit — findings and fixes

A hands-on audit ran the app against a real Postgres (`npm run db:dev`) and
attacked it over HTTP. What held up, and what was fixed:

**Verified working (no change needed)**

- Session cookies are HttpOnly/SameSite=Lax, HMAC-signed; forged or tampered
  tokens → 401. Client-asserted ids (`adminProfileId`, `profileId`) are ignored.
- Non-admin → `/api/admin/*` → 403; user A reading/editing user B's data → 403.
- Profile updates use a strict field whitelist (no mass assignment of
  `isAdmin`, `isPremium`, `referralPoints`).
- SQL is parameterised by Drizzle (no string-built queries with user input).
- SSRF guard blocks loopback, private, link-local/metadata, decimal/hex/IPv6
  encodings and non-http(s) schemes.
- 256 KB JSON body cap → 413; payment webhooks and cron fail closed without
  their secrets; `npm audit --omit=dev` reports 0 vulnerabilities.

**Fixed**

| Severity | Issue | Fix |
| --- | --- | --- |
| High | Per-IP rate limits keyed on the **leftmost** `X-Forwarded-For` entry, which the client controls. Sending a random fake IP per request bypassed sign-up, sign-in (per-IP) and anonymous AI limits (10/10 requests passed a 6/min limit). | `clientIp()` now uses the proxy-appended rightmost entry (`TRUSTED_PROXY_HOPS`, optional `CLIENT_IP_HEADER`). Regression tests added. |
| Medium | `PUT /api/profiles/[id]` stored `NaN` in `gpa` for non-numeric input, and returned 500 for decimals sent to integer columns (TOEFL, SAT, age…) or an object for `preferredCountries`. | `optionalNumber` / `optionalScore` in `lib/request.ts`: finite-only, clamped, integer columns rounded, NOT NULL columns never nulled; text fields length-capped; locale whitelisted. |
| Low | The AI chat served canned text indistinguishable from a real model answer when no provider was configured, and echoed the raw user message into rendered markdown. | Response carries `offline: true` and the UI labels it; the echo was removed. |
| Low | Failed chat requests (401/429) left the UI silently waiting. | The chat now shows a clear error message. |

**Framing policy.** `frame-ancestors 'none'` + `X-Frame-Options: DENY` in every
environment except `next dev` (`NODE_ENV=development`), where the known
preview hosts may embed the app. This is fail-closed: production, test and an
unset `NODE_ENV` all get the strict policy (see `src/lib/security.ts`, covered
by `npm run test:security`).

**Still recommended (operational)**

- Set `SESSION_SECRET` (>= 32 chars) in Render. Without it the signing key is
  derived from `DATABASE_URL`.
- The rate limiter is in-process memory: correct for one instance, but limits
  are per-instance if you scale horizontally (move to Redis/Postgres then).
- Next 16 renamed `middleware.ts` → `proxy.ts`; the old name still works but
  is deprecated (`npx @next/codemod@canary middleware-to-proxy .`).

## 11. 2026-09 portability, ownership and AI audit

| Severity | Issue | Fix |
| --- | --- | --- |
| High | Supabase's default grants let the public `anon`/`authenticated` roles read every `public` table (password hashes, Telegram chat ids) with the anon key. | `supabase/enable_rls.sql`: RLS on every app-owned table, public roles revoked, read-only catalogue policy for `universities`/`scholarships`. The app is table owner and unaffected. Run once per Supabase project (`DEPLOYMENT.md` §2). Tested against a Supabase-like role setup (`npm run test:portability`). |
| High | Any admin could delete any profile, including the only owner; the seed promoted the **first profile** to admin when no admin existed, and force-promoted `ADMIN_EMAIL` on every restart. | Platform ownership with a server-side state machine (`src/lib/ownership/*`, Admin → Ownership): owner-only admin grants/revokes, password re-entry, one-open-transfer unique index, row locks on confirm, expiry, audit + notifications. Owner profile delete → 409. Seed no longer promotes anyone once an owner exists and never promotes a random profile. `npm run test:ownership`. |
| Medium | `PUT /api/admin/config` wrote **any** key unvalidated — including the encrypted Telegram token and internal sweep state — and accepted invalid AI providers. | One allowlist + per-key validation (`src/lib/configPortability.ts`) for PUT, export and import; changes are audited and rate-limited. |
| Medium | Rotating `AI_KEYS_ENCRYPTION_SECRET` made the panel-stored Telegram token unreadable (bot stops). | Rotation-aware decryption with automatic re-encryption. |
| Medium | Security notices (ownership) were dropped for users with default notification preferences. | `security` notifications are always recorded in-app. |
| Low | Research agent hardwired to OpenRouter; env AI provider choices masked by DB defaults; AI errors could echo keys. | Universal provider layer (`src/lib/ai`): admin-selected provider/model per task, explicit fallback only, disabled list, key redaction in logs/errors. |
| Low | Deploy domain / Supabase project / personal admin email hardcoded in docs and a UI placeholder. | `APP_URL` layer (`src/lib/appUrl.ts`); links built from configuration; checked by `npm run test:portability`. |

## 12. 2026-09 full-system access audit

Every API route was inventoried (method, authentication, ownership, Premium,
rate limit) and the risky ones were attacked live with two accounts. Full
report: `docs/AUDIT_2026-09.md`.

| Severity | Finding | Fix |
| --- | --- | --- |
| Critical | `PATCH`/`DELETE /api/tasks` had no authentication: anyone (even anonymous) could edit or delete any student's tasks by id. | Row-owner check (`requireRowAccess`), validation, body cap. |
| Critical | Premium was enforced only by the website's `PremiumGate`: essays, AI SOP, tasks, forum and course APIs answered free accounts directly; the gate even mounted the locked section underneath the overlay. | `premiumGate` / `requireFeatureSession` (`src/lib/premium.ts`, reusing `hasFeature`) on every Premium API → `403 premium_required`. `/api/premium/status` returns per-feature access, `PremiumGate` takes a `feature` and never mounts locked content. |
| Critical | `GET /api/gamification/leaderboard` (public) returned the top students' e-mail addresses. | Name + major only. |
| Critical | `POST /api/forum/categories` had no authentication. | Admin only, validated, duplicate slug → 409. |
| High | `POST /api/gamification/award` let a student award themselves any number of points. | Admin only, 1–10 000 points. |
| High | `POST /api/referrals` and `POST /api/consulting` accepted any `profileId` without a session (referral farming → free Premium; spoofed requests). | Caller's own profile only (`requireProfileAccess`), rate-limited. |
| High | `POST /api/visa/live-token` minted paid Gemini Live sessions for anonymous callers, unthrottled. | Session required, `LIMITS.visaLiveToken` (10/h), 16 KB body cap. |
| High | The admin-configured daily AI limits (`ai_*_requests_per_day`, `ai_*_tokens_per_day`) were never enforced; a signed-in user could also drop `profileId` to be treated as anonymous. | `src/lib/ai/quota.ts` in `guardAiRequest`: rolling 24 h, per account from `ai_usage` (anonymous: per IP), admins exempt, `429 ai_quota_exceeded`. The caller is always resolved; usage is logged against the caller. Index `idx_ai_usage_profile_created` (`supabase/add_ai_usage_quota_index.sql`). Visa interview chat keeps its own per-IP limit (a single interview is many turns). |
| Medium | No server-side CSRF check (only `SameSite=Lax`). | Middleware refuses API writes whose `Origin` is not this site (Host / X-Forwarded-Host / `APP_URL`); provider webhooks exempt; requests without `Origin` pass to route auth. |
| Medium | Course payloads contained each quiz's correct answer before the attempt. | Answers are revealed only in the attempt response. |
| Medium | On a database error the universities APIs served sample (fake) universities as if real. | `503 data_unavailable`; sample data removed. |
| Medium | `test:integration` always exited 0 (embedded-postgres' exit hook overrode `process.exitCode`), so failures could not fail CI; it was not in CI either. | Explicit exit; added to `ci/security-ci.yml`. |
| Low | Branding upload parsed the multipart body before the admin check and trusted the browser MIME type. | Auth first, size pre-check, magic-byte check. |
| Low | FAQ JSON-LD was inlined without escaping `<`. | Escaped. |

Regression guard: `npm run test:security` fails if any API write lacks an
authentication call (outside a reviewed public allowlist) or a Premium API
stops enforcing its feature.
