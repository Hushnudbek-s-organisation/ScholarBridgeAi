# Stage 0 — Repository Baseline & Audit

**Audit date:** 2026-10-21
**Repository:** `Hushnudbek-s-organisation/ScholarBridgeAi`
**Branch / baseline:** `arena/873c0621-scholarbridgeai` at `5a187900754a791e6451a53f8e5b0b6efdeb20ea`
**Scope:** Read-only verification and planning. No application code, configuration, SQL, production system, deployment, or pull request was changed or touched. This report is the sole intentional repository change from this audit.

## Executive summary

The checked-out application is a Next.js 16 / React 19 student scholarship-planning platform with a broad API surface, PostgreSQL/Drizzle persistence, Supabase-related RLS operations, provider-backed AI, and Payme/Click payments. The baseline is healthy across typecheck, lint, production build, i18n, focused checks, security, offline schema coverage, and a 318-assertion embedded-Postgres integration suite.

Two substantiated areas deserve first review in any authorized Stage 1:

1. **Provider-cost governance is not end-to-end.** The centralized AI router and its budget/usage tests are sound for the routed chat/research-agent flows, but direct TTS and embedding calls are outside central usage/cost logging. Document readiness can trigger multimodal embedding calls from authenticated document GET/POST/PATCH workflows. The standalone embeddings endpoint has a shared rate limit, but it too calls the provider outside central accounting. Public catalog/search flows also need a focused check for whether semantic embedding work can be triggered anonymously and how it is bounded. Provider charges were not measured; model price/availability was not independently verified.
2. **The portability/RLS test's assertions pass but the command exits nonzero during embedded-Postgres teardown.** Repeated runs report all 57 assertions passing, followed by an uncaught PostgreSQL `57P01` termination error from a pool as the temporary server shuts down. This is a test-harness cleanup issue to diagnose separately, not evidence that the 57 assertions failed.

No deployed database state, production credentials, external-provider behavior, browser rendering, or live payment/Telegram/Supabase integrations was verified. No schema redesign, route removal, UI redesign, or product-policy change is recommended by this baseline alone.

## Repository and product baseline

### Runtime and CI

- npm lockfile v3; package engine declares Node `>=20 <23`.
- Package versions: Next `^16.4.0`, React / React DOM `19.2.6`, TypeScript `5.9.3`; installed versions during audit were Next `16.4.0`, React `19.2.6`, TypeScript `5.9.3` (Node `22.22.3`).
- Next 16's `src/proxy.ts` convention is supported by the installed package/build template; production build reports the proxy as active.
- Active workflow files include `.github/workflows/ci.yml` and `.github/workflows/supabase-verify.yml`. `ci/security-ci.yml` is a manually copied workflow template, not a byte-identical active workflow under `.github/workflows/`.
- `npm ci --no-audit --no-fund` completed. Dependency/build outputs are ignored; no application changes resulted.

### Main user journeys and API shape

The shell defines six student journey groups (Home, Explore, My Plan, Applications, After Admission, Help & Learning) and 14 navigation destinations. Payments, Rewards, Notifications, Parent, and Admin are utility screens outside those groups. `HomeClient.tsx` renders the hubs and utilities. `DashboardView.tsx` has no source caller located in this checkout; that does not establish that it is safe to remove or externally unused.

The production build enumerated 76 static pages and the current API route surface. Several superficially similar routes are distinct, not duplicates:

- `/api/referral`: legacy referral status and activation; `/api/referrals`: overview and referral-code application.
- `/api/documents` and `/api/vault/documents`: separate document/checklist workflows; `/api/vault`: answer vault.

`OpportunitiesPanel` exposes a type filter and requests `/api/opportunities?type=...`; it has no search input, so there is no disconnected search box in that panel. Whether a broader search capability is a product requirement remains unknown.

### Data, startup, and operations

- `src/instrumentation.ts` starts best-effort asynchronous, process-memoized seeding at Node startup. University, scholarship, and profile routes also retain a `seedDatabase()` fallback. This is not evidence that each request performs a full seed; cold start and database-recovery behavior are reasonable Stage 1 review topics.
- `src/app/api/dashboard/route.ts` is a large aggregation route; a service/repository/projection split is an architectural option, not a confirmed defect or an authorized redesign.
- Schema and RLS references include `docs/SUPABASE_SCHEMA.md`, `docs/SUPABASE_SCHEMA_REVIEW.md`, and `supabase/enable_rls.sql`. Repository documentation warns that schema application can affect grants/RLS and requires staging, backup, and operator approval. The live database schema/policies were not queried.
- `supabase/enable_rls.sql` enables RLS and revokes anon/authenticated access for owned public tables, while restoring anon SELECT on university/scholarship catalogs. A Supabase-like embedded-role test covers these behaviors. The script was not executed against any hosted database.
- `supabase/remove_profile_match_tiers.sql` contains an explicit destructive `DROP COLUMN`; repository documentation describes it as prepared but unapplied and requiring separate approval. No SQL was executed during this audit.
- Public HTML scan found `public/googleddb3ece94dc2926a.html`, a likely domain-verification artifact; no stale app-page HTML shadow was found.

## Verified findings and confidence

### Confirmed in current source

**AI usage/cost paths are not uniformly routed through central accounting.**

- `src/app/api/visa/tts/route.ts` makes direct OpenRouter/OpenAI speech requests and returns audio without a `logAIUsage` / `costForUsage` call in that handler. The OpenAI fallback can use a stored provider credential; therefore absence of an environment key alone does not prove the path can never incur a provider cost. The handler has timeout handling and falls back to browser speech, but that is distinct from budget accounting.
- `src/lib/ai/embeddings.ts` calls OpenRouter embedding APIs directly without central usage/cost accounting.
- `src/app/api/documents/route.ts` can call `matchMultimodalDocumentReadiness` for up to five documents on GET with `checkReadiness=1`, and on POST/PATCH when `checkReadiness=true`. These call sites do not use the separately guarded `/api/ai/embeddings` endpoint. The source comments say only document metadata—not uploaded bytes, file URLs, or private document contents—is sent for the optional readiness check. This remains a repeatable provider-call surface for an authenticated user.
- `/api/ai/embeddings` requires a session and uses a shared rate limit, but calls the embedding provider directly. Its rate limit is not itself central AI budget/cost accounting.
- Current defaults in `src/lib/ai/openrouterModelIds.ts` use model IDs labelled `:free`; environment overrides and the OpenAI TTS fallback exist. This audit did **not** verify current upstream model availability, actual provider pricing, or whether a particular configured model is billable. Do not infer charges from the model ID alone.
- The central router remains the single writer for routed AI-reply `ai_usage` rows, and `scripts/check-ai-cost.ts` passes checks for budget decisions, usage parsing, and routing. The confirmed gaps concern direct provider paths outside that router; they do not invalidate the router's own tests.

**Related risks to verify before changing behavior:** determine whether public catalog/search GETs invoke semantic embeddings and whether those requests have effective shared rate limiting; confirm whether TTS and embeddings are intended to consume the AI quota/budget or have separate policy. No abuse simulation or live provider call was made. This is a Stage 1 verification item, not a claim of measured loss or a confirmed exploitable incident.

### Historical suspicions not confirmed as defects

- Similar route names do not make the referral/document routes duplicates (see route distinctions above).
- Seed fallback does not establish per-request full reseeding.
- `DashboardView.tsx` lacking a source caller does not establish it can be removed.
- No disconnected search control was found in `OpportunitiesPanel`; broader search expectations are unspecified.
- A large dashboard route is an observed maintenance concern, not a failed behavior or mandate for architectural change.
- The stale-public-HTML concern was not substantiated beyond the likely domain-verification file.

## Baseline checks

All commands below were run against the checked-out baseline; tests that start a database used temporary embedded PostgreSQL and did not connect to production.

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run lint:baseline` | Passed; 0 current issues across 0 files, 0 baselined findings |
| `npm run build` with a dummy localhost `DATABASE_URL` | Passed; optimized Next build, TypeScript, and page generation completed; 76 pages enumerated |
| `npm run check:i18n` | Passed; en/uz/ru, 5,684 keys, 115 translated component files, 3,186 `t()` sites |
| `npm run test:ai-settings` | Passed, 83 assertions; expected DB-unavailable warning and environment fallback |
| `npm run test:ai-cost` | Passed, 58 assertions |
| `npm run test:ai-format` | Passed, 40 assertions |
| `npm run test:visa` | Passed, 87 similar-profile and 67 scoring assertions |
| `npm run test:visa-render` | Passed, 24 SSR locale/profile cases |
| `npm run test:responsive` | Passed, 59 source-level checks only; no browser/viewport rendering |
| `npm run test:dark` | Passed; 326 CSS rules, zero reported leaks/unreadable pairs |
| `npm run test:opportunities` | Passed, 14 assertions |
| `npm run test:growth` | Passed, 39 assertions |
| `npm run test:security` | Passed, 77 assertions |
| `npm run test:payments` | Passed, 114 assertions using temporary embedded Postgres |
| `npm run test:schema` | Offline DDL coverage passed: 95 Drizzle tables, 1,053 columns, 32 SQL files plus 4 lazy-DDL sources. Live check skipped because no `DATABASE_URL` was configured. |
| `npm run test:integration` | Passed, 318 assertions using embedded temporary Postgres; schema pushed from source, no production connection |
| `npm run test:portability` | **Nonzero exit after 57 assertions passed.** Two isolated runs both printed `57 passed, 0 failed`, then ended with an uncaught `pg-pool` error / PostgreSQL SQLSTATE `57P01` (“terminating connection due to administrator command”) during temporary server teardown. Track as harness cleanup failure; do not report the command as fully passing. |
| `npm run audit:check` | Passed with 0 critical, 5 high, 4 moderate advisories; the gate documents an exception for five `braces` advisory paths in the ESLint-only toolchain, with no patched release listed |
| `npm audit --omit=dev --audit-level=high` | Passed; 0 production vulnerabilities reported |

The security, payments, portability, schema, and integration checks are local code tests; they are not live-provider or deployed-database certifications.

## Dependency, security, and configuration posture

- Production dependency audit: 0 vulnerabilities. Full audit: 5 high and 4 moderate advisories, with the documented reviewed `braces` exception in the ESLint-only development toolchain. Preserve the exception rationale and recheck on dependency updates; do not casually suppress or weaken the gate.
- The security suite covers session/password/rate-limit/SSRF/redirect/body-limit/payment/CSP and API structure. Passing tests do not substitute for a production configuration review or a live penetration test.
- `.env.example` declares `DATABASE_URL`, `SESSION_SECRET`, `APP_URL`, `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `AI_KEYS_ENCRYPTION_SECRET`. Code also references Supabase, AI provider/custom-provider, Telegram, cron, Payme, Click, and other task-specific variables. Presence checks in this shell found all checked names absent; values were not printed. This is a sandbox observation only, not evidence of production configuration.
- No production DB, session/encryption secret, provider, Supabase, Telegram, cron, Payme, or Click credential was available in the shell. No values were logged or exposed.

## Stage 1 proposal — dependency-aware, subject to explicit authorization

This is a plan only. It does not authorize implementation, schema application, production access, deployment, or a PR.

1. **Confirm policy and runtime facts first (no schema change).** With the owner/operator, identify which semantic-search, document-readiness, embedding, and speech paths are expected to be public/authenticated, which provider credentials/models are configured in the intended environment, and which paths must count against per-user quota, global/provider budgets, and usage analytics. Confirm acceptable fail-open/fail-closed behavior. Do not infer this from the sandbox's empty environment.
2. **Trace and test each direct provider path.** Map callers and existing auth, shared rate-limit, cache, timeout, and input/body limits for embeddings, document readiness, public catalog semantic search (if used), and TTS. Add focused mocked tests first; do not send real provider traffic. Decide policy for anonymous search and unmetered requests before changing its behavior.
3. **Close approved metering/abuse-control gaps with minimal changes.** If approved, route calls through a shared provider/usage accounting seam or add an explicitly compatible equivalent; include accurate provider/model/usage and an honest unknown-cost state. Apply shared limits/budget decisions appropriate to authenticated and anonymous contexts, with bounded concurrency and caching where behavior permits. Keep existing product/model defaults and fallback UX unless separately approved. Verify no secrets/prompts leak in logs and test provider failures/timeouts.
4. **Repair and gate the portability test teardown.** Diagnose the pool/server shutdown order behind the repeated `57P01`; make teardown deterministic without weakening any of the 57 assertions. Re-run `test:portability`, `test:payments`, `test:integration`, and the full baseline.
5. **Review seed cold-start/recovery behavior only if operational evidence warrants it.** Exercise startup and a DB-recovery scenario against a disposable local database; avoid altering seed semantics based only on route fallback presence.
6. **Live staging/production validation only by separate explicit authorization.** First obtain a backup/rollback plan and operator approval, inspect deployed schema/RLS read-only, and test on staging. Any migration—including existing prepared destructive SQL—requires its own approval. No production mutation or deployment is included here.

### Suggested acceptance gates for authorized Stage 1 work

- Exact call paths and auth/rate-limit behavior covered by tests; public vs authenticated policy explicitly agreed.
- Provider usage/cost is logged once, with unreported/unknown values remaining unknown (never fabricated as zero); budget behavior tested for each approved path.
- Mock tests prove no live-provider calls; rate-limit tests cover concurrent/repeated requests and fallback behavior.
- Existing typecheck, lint, i18n, relevant focused checks, full security/payment/integration suites, production build, and dependency gate remain green; no weakening of existing assertions.
- Live schema/RLS changes, if ever separately approved, are tested and reviewed on staging with backup/rollback; production is untouched absent a specific deployment authorization.

## Limitations and stop point

- No official provider documentation was consulted. External provider documentation/model endpoints were outside the available network allowlist for this audit, so model-ID existence, current availability, and provider-specific billing/endpoint compatibility remain unverified. Installed Next package sources were used only to confirm the local proxy convention.
- No browser/e2e visual test was performed; responsive checks are source-level.
- No live database, hosted Supabase/RLS state, production environment, external AI, payment, or Telegram service was accessed. The dummy `DATABASE_URL` supplied to `next build` points at localhost and was not used for live DB validation.
- `test:ai-settings` used its documented environment fallback when no DB was configured. The `test:portability` cleanup issue is recorded above.
- Initial worktree was clean. The only intentional change is this audit report; generated `node_modules` and `.next` outputs are ignored. No commit or PR was created.

**Stage 0 is complete. Stop here and wait for explicit Stage 1 authorization.**
