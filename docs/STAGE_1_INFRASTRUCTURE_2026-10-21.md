# Stage 1 — Framework, Routing, Authentication, Data Integrity & CI Safety

**Date:** 2026-10-21
**Branch:** `arena/873c0621-scholarbridgeai`
**Starting application baseline:** `5a187900754a791e6451a53f8e5b0b6efdeb20ea`
**Scope:** Stage 1 only. No deployment, production modification, hosted database connection, schema application, or PR.

## Outcome

Two reproducible infrastructure issues were fixed without changing auth semantics or database architecture:

1. A returning user with the exact API error code `session_secret_required` was retrying a deterministic configuration failure up to three times. Session restore now stops immediately for that code while retaining bounded retries for transient 5xx/network failures.
2. `npm run test:portability` completed all 57 assertions but exited nonzero because an idle `pg.Pool` client emitted an unhandled PostgreSQL `57P01` while the embedded test server was stopping. The harness now tracks all pools, treats only `57P01` during explicit teardown as expected, and fails on unexpected pool/shutdown errors. The unchanged 57 assertions pass and the command exits zero.

`src/proxy.ts` was **not** migrated: the installed Next.js version supports and recognizes this convention. Stale source comments that described it as Edge middleware / referenced the removed `src/middleware.ts` path were corrected. No route was deleted or renamed, and no schema or seed logic was changed.

## Framework and routing verification

- Installed Next.js is `16.4.0` (package declaration `^16.4.0`). The installed package's bundled official file-convention guide is `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`. It states that the `middleware` convention is deprecated/renamed to `proxy`, accepts a `proxy.ts` at the same level as `app` (including `src`), and defaults Proxy to the Node.js runtime; the Proxy `runtime` segment option is not available.
- `src/proxy.ts` is at the valid `src/` location and exports the named `proxy` function plus a static matcher. A production build compiles it and reports `ƒ Proxy (Middleware)`. The security suite invokes the actual handler and checks the nonce, forwarded CSP, and response headers. No convention migration was necessary.
- The proxy performs API CSRF/body-size/no-store handling, and page locale/CSP handling. `next.config.ts` applies response security headers across routes. A repository scan found no route explicitly configured for Edge runtime; `runtime = "nodejs"` is explicit on the live-token route. Build and typecheck validate the current route-handler/layout APIs, async cookies/headers, and imports together.
- Locale rewrites, locale cookie behavior, redirects, nonce handling, and cache policy were reviewed in `src/proxy.ts`, `src/app/layout.tsx`, `next.config.ts`, and route handlers. API responses are marked no-store by proxy/route behavior; student data must not be shared-cacheable.
- Route-name review reconfirmed `/api/referral` vs `/api/referrals` and `/api/documents` vs `/api/vault/documents` are distinct workflows; `/api/vault` is the answer vault. They were kept intact for compatibility. The public HTML scan found only the likely verification file `public/googleddb3ece94dc2926a.html`, not a stale application-page shadow.
- `src/proxy.ts`, security tests, and `next.config.ts` contain no stale reference to `src/middleware.ts` after this change. Historical audit/design documents were not rewritten.

## Authentication/session review

- `authenticate(req)` verifies the signed token, loads the current profile from the database, compares the password fingerprint, and checks the hashed session record for revocation on each request. This preserves immediate password-change, admin-demotion, and session-revocation behavior.
- Session rows store a SHA-256 token hash, not the raw token. `last_seen_at` writes are throttled for 60 seconds. Sign-out revokes the token and clears the HttpOnly cookie; revocation is intentionally best-effort if the database is unavailable. Password change invalidates the old fingerprint and returns a new signed cookie. Admin endpoints use `requireAdmin`; Telegram sessions receive no admin role.
- No in-memory auth result cache was added. Skipping any of these DB checks could delay revocation/role changes, and an instance-local cache would not coordinate across serverless or multi-instance deployments. The database remains the source of truth.
- Sign-in uses shared IP and email rate limits. Cookies are HttpOnly and SameSite=Lax; Secure is set for production/HTTPS. The sign-in, session, sign-out, profile, and admin paths were reviewed with the existing security checks.
- **Fix:** `src/app/HomeClient.tsx` previously retried every 5xx response, including the definitive `session_secret_required` response from `/api/auth/session`. Added `src/lib/sessionRestore.ts` with a pure, bounded retry decision; deterministic configuration errors and client errors do not retry, transient 5xx responses get at most two retries (with the existing 0.5s / 1.0s backoff), and network exceptions remain capped by the existing three-attempt loop. `scripts/check-security.ts` covers the policy and verifies that the client uses it.

## Database, RLS, seed, and credential review

- No service-role key exposure was found. `SUPABASE_SERVICE_ROLE_KEY` appears only in server-side code / the admin branding-upload route, not in a client component or `NEXT_PUBLIC_*` variable. `src/lib/supabase/server.ts` has no client-side call site found in `src/`.
- `ensureCoreSchema()` is process-memoized and coalesces concurrent first calls; after success, further calls in that process return without DB reads or DDL. On a cold process it checks `information_schema`, then may run additive DDL. This path is a deliberate fallback because deployment docs say production does not run `drizzle-kit push`; no safe replacement migration/startup path was identified, so it was not removed or relocated.
- **Residual schema risk (static code fact; deployed impact unknown):** `src/lib/core/ddl.ts` generates a missing core table from its columns and selected ordinary indexes. It does not emit every table-level foreign-key / composite-unique constraint, and it does not install the separate RLS/grant policy. Therefore a wholly missing table repaired by this fallback may not be equivalent to the complete schema in `supabase/full_schema.sql`. `npm run test:schema-repair` tests the full-schema SQL repair, not this runtime core-table creation path. No evidence that a production core table is missing was available. Because a fix must reconcile constraints and Supabase RLS/grants without weakening policy, this was left unchanged pending an operator-approved, live-schema-informed migration plan rather than broadening request-time DDL in Stage 1.
- The checked-in RLS script and authorization are covered locally: `test:portability` executes `supabase/enable_rls.sql` twice against Supabase-like roles and checks anon/authenticated denial for private data, public catalog reads, and app-owner access. This says nothing about deployed RLS state.
- Seed review found guarded bootstrap-admin behavior (existing passwords are not replaced; an ownership transfer blocks re-promotion), process-level seed memoization, conflict-safe catalog/program insertions, and scholarship-cycle refresh restricted to named seeded titles whose verification status remains `unverified`. No seed changes were warranted. No production rows were inspected.

## CI review

- `.github/workflows/ci.yml` is the active main verification workflow and includes dependency gates, typecheck, schema/security, AI, embedded-Postgres, i18n, lint, responsive, dark-mode, and production-build checks.
- `ci/security-ci.yml` is a mirror/template outside `.github/workflows/`; it is not a second active workflow. The workflow bodies are behavior-equivalent; their introductory comments differ. `ci/supabase-verify.yml` is likewise a mirror for the active read-only Supabase verification workflow. No consolidation was made because these copies support the documented manual GitHub-workflow installation path.
- The current workflow already runs `test:portability`; its teardown failure has been fixed without reducing its assertions. The new session retry regression runs inside the existing `test:security` job, so no workflow expansion was needed.

## Verification results

Tests were run locally; embedded-Postgres suites use temporary databases only. No test connected to production or called a live external provider.

| Command | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run lint:baseline` | Passed; 0 issues, 0 warnings, 0 baseline findings |
| `npm run build` with dummy localhost `DATABASE_URL` | Passed; 76 pages generated and Proxy compiled |
| `npm run test:security` | Passed, 81 assertions (includes new session retry policy and client-wiring regression checks) |
| `npm run test:portability` | Passed, 57 assertions; no teardown exception, exit 0 |
| `npm run test:ownership` | Passed, 83 assertions |
| `npm run test:telegram-integration` | Passed, 131 assertions |
| `npm run test:integration` | Passed, 318 assertions (Stage 0 baseline; temporary embedded Postgres) |
| `npm run test:journey` | Passed, 115 assertions |
| `npm run test:chancing` | Passed, 27 assertions |
| `npm run test:recommend` | Passed, 88 assertions |
| `npm run test:career-discovery` | Passed, 90 assertions |
| `npm run test:arrival` | Passed, 66 assertions |
| `npm run test:match` | Passed, 99 assertions |
| `npm run test:payments` | Passed, 114 assertions |
| `npm run test:differentiators` | Passed, 724 assertions |
| `npm run test:schema` | Passed offline coverage: 95 tables, 1,053 columns; live check skipped without DB credentials |
| `npm run test:schema-repair` | Passed, 18 assertions against temporary embedded Postgres |
| `npm run test:schema-apply-safety` | Passed; refusal cases do not connect and explicit-ack safeguards remain |

Stage 0 baseline tests and dependency audit results are recorded in `docs/STAGE_0_REPOSITORY_BASELINE_2026-10-21.md`. The Stage 1 edits did not change dependencies, application schema, or translations.

## Risks that require deployment/operator access

1. Live database schema, grants, RLS policies, and whether any core table is missing or partially drifted.
2. Whether production deployment configuration has a valid `SESSION_SECRET`, appropriate DB privileges for the existing additive repair, and the expected Supabase/service-role environment. Presence checks in the sandbox found no configured secrets; values were never printed.
3. Real multi-instance revocation timing and behavior under DB outage. Code checks revocation/current role on every request, but production topology and failure modes were not available.
4. Real browser/session restoration behavior across locale routes, production cookies/proxies, and browser history. No production browser session or deployed E2E run was performed.
5. Production CI/GitHub Actions result and live Supabase verification result. No push/PR was made and no Actions run was triggered.
6. Seed outcomes on the actual production dataset. No production read or mutation was performed.

## Instructions-file availability and stop

The requested `ScholarBridgeAI_Staged_Master_Prompt.md` was not present in the checkout (searched repository/parent) and is not listed in the repository's GitHub `main` tree. I followed the shared and Stage 1 instructions included in the user message; any additional contract that exists outside this repository was not available to inspect.

**Stage 1 complete. Stop here; no Stage 2 work is authorized by this report.**
