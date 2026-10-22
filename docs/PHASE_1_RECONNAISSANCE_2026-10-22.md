# Phase 1 — Repository reconnaissance and execution plan

**Date:** 2026-10-22 (Asia/Tashkent)
**Repository:** `Hushnudbek-s-organisation/ScholarBridgeAi`
**Branch / baseline:** `arena/d38a15d5-scholarbridgeai` at `707dc846d1b95efc739d4bcf110cf42ddae06082`
**Scope:** Reconnaissance and baseline checks only. No application, schema, SQL, seed, configuration, dependency-manifest, or deployment changes were made. This report is the only intentional repository change.

## Executive summary

The current tree is a Next.js 16 App Router application using React 19, TypeScript, PostgreSQL through Drizzle/node-postgres, Supabase-compatible SQL/RLS operations, signed-cookie sessions, English/Uzbek/Russian translations, and a broad student-planning product with AI, scholarships, deadlines, and Visa Speaking workflows. The checkout was clean at the start; no production URL, database, credentials, external provider, or deployment was contacted.

The current target-file list and remediation brief are **not available** in this workspace. The three reference PDFs and `ScholarBridgeAI_Staged_Master_Prompt.md` were not found under `/home/user` or in the repository. Thus a one-to-one, brief-specific target mapping and the requested authoritative phase names cannot be confirmed. This report maps the likely feature areas to existing code paths without asserting that they are the brief’s full scope.

Most runnable offline CI gates passed, including build, typecheck, schema-coverage/safety, security, i18n, and accessibility source audits. Several checks requiring an app/database could not run in this environment; the embedded Postgres ownership suite is specifically blocked because the bundled `initdb` cannot load `libpq.so.5`. One standalone video rendering test fails when a component calls `next-intl` outside an Intl provider. These are baseline observations, not grounds for changing product code in Phase 1.

## Confirmed architecture and target map

| Area | Current implementation paths | Reconnaissance notes / probable target mapping |
| --- | --- | --- |
| Web/runtime and CI | `src/app/`, `.github/workflows/ci.yml`, `ci/`, `package.json` | Next.js App Router; Node engine `>=20 <23`; CI uses Node 22. Actual scripts are listed in `package.json`. |
| Persistence and schema | `src/db/schema.ts`, `src/db/index.ts`, `drizzle.config.ts`, `supabase/*.sql`, `docs/SUPABASE_SCHEMA.md` | Drizzle schema declares 95 tables and is documented against 1,053 column names by the offline schema gate. SQL history includes additive feature files plus full-schema/repair/RLS operations. `src/db/index.ts` requires `DATABASE_URL`; `drizzle.config.ts` has a local fallback. Do not run `db:push`, `db:apply-full-schema`, or `db:verify` with an unknown URL. No migration or live query was attempted. |
| Auth, authorization, request safety | `src/lib/auth.ts`, `src/proxy.ts`, `src/lib/security.ts`, `src/lib/ai/quota.ts`, route-level `requireSession`/`requireAdmin` and ownership helpers | Signed `sb_session` HttpOnly cookie, server-side revocation, role/session guards, profile ownership checks, CSRF/origin and API body-size protection, security headers, rate limiting, and AI quota controls are present. Preserve all guards and their tests. |
| I18n and theme | `src/i18n/messages/{en,uz,ru}.json`, `src/i18n/`, `src/app/layout.tsx`, `src/app/globals.css`, `src/lib/theme.ts` | `next-intl` plus a repository LocaleProvider; theme is initialized before paint and dark mode remaps shared CSS tokens. Any UI change needs synchronized en/uz/ru keys and light/dark accessibility checks. |
| AI settings/routing | `src/lib/ai/`, `src/app/api/ai/`, `src/app/api/admin/ai-settings/route.ts`, `src/components/admin/AiSettingsManager.tsx` | Task/provider configuration and central chat router are in `src/lib/ai/settings.ts` and `src/lib/ai/index.ts`; provider/model registry is in `openrouterModelIds.ts`. Admin credentials are masked/encrypted and settings are server-side. Provider/model availability and price are time-sensitive and were not live-verified. |
| Visa Speaking | `src/components/VisaSpeakingAssistant.tsx`, `src/components/visa/`, `src/lib/visa-*`, `src/app/api/visa/{analyze,chat,history,live-token,requirements,tts}/route.ts` | UI, deterministic scoring/similarity helpers, history/requirements, live token, and TTS/chat routes are present. `chat`/`analyze` use the central AI router; live-token records usage; TTS makes a direct OpenRouter speech request. This request-level inventory is not a complete provider-budget or legal-policy audit. |
| Scholarship/deadline data | `src/app/api/{scholarships,deadlines}/route.ts`, `src/lib/scholarshipStatus.ts`, `src/db/seedScholarshipCycles.ts` | Scholarship and deadline surfaces are separated. Deadline route filters scholarship dates to `verificationStatus === "verified"`. Schema provides date/period, verification status, `lastVerifiedAt`, source URL and related provenance fields. Current-cycle facts still require official-source checks. |
| Seeds/catalog data | `src/db/seed.ts`, `seedScholarshipCycles.ts`, `seedOpportunities.ts`, `seedOutcomesAndStories.ts`, `seedProgramCatalog.ts`, `seedRichPlatformData.ts`; related `scripts/seed-*.ts` | Several seed families exist. A cycle-refresh path is described in code as non-mutating. Reconcile each seed’s upsert/ownership behavior against live intended policy before any data mutation; no seeder was run. |
| Probable data/catalog targets | `src/db/schema.ts`, `src/app/api/{universities,programs,scholarships,opportunities,deadlines}/`, relevant seeders, `src/lib/*Status*`, admin catalogue components, `src/i18n/messages/*` | Candidate mapping only. Exact brief target filenames and requested behavior are unknown until the brief/PDFs are supplied. |
| Probable auth/AI/Visa/UI targets | Auth/security paths above; AI paths above; Visa paths above; UI components and matching locale dictionaries | Candidate mapping only; do not infer scope or weaken auth, privacy, quotas, consent, or validation. |

### Migration and change risks

- The Drizzle source schema, numerous shipped SQL files, `full_schema.sql`, repair SQL, and Supabase RLS SQL form a history that must be reconciled before proposing DDL. Offline coverage passing does **not** prove a deployed database matches.
- `supabase/enable_rls.sql` and grant/policy changes can affect public access. `full_schema.sql` has an explicit safety gate; destructive repair/drop operations require separate review and authorization. No SQL should be applied in this phase.
- Seeders can affect catalogue and user-related records; determine idempotency, conflict keys, and whether a path is startup-triggered before changing or running them.
- Time-sensitive catalogue and legal facts need a provenance/expiry policy; do not convert unknown or stale values into asserted facts.
- Provider credentials, personal data, uploaded documents, and prompts must not enter logs or client bundles. Direct provider paths must be checked for budget/quota and privacy policy before changing them.

## Time-sensitive claims requiring official primary-source verification

No external source was fetched in this phase; none of the following is represented here as independently current or confirmed. Before publishing or updating such claims, record the official URL, checked-at timestamp, applicable cycle/jurisdiction, and uncertainty in the relevant schema/content where supported.

1. Scholarship opening/closing dates, recurring cycles, award amounts, eligibility, and application requirements — scholarship rows, seed cycles, admin-published catalogue data, and deadline APIs.
2. University rankings, tuition/fees, programme admission and language requirements — university/programme schema and seed/catalog sources. Licensing and the scope/year of each ranking matter.
3. Visa requirements, financial thresholds, quotas, work rights, and post-study terms — `visa_requirements`, Visa Speaking samples/prompts, arrival guidance, and any country-specific UI content.
4. AI model IDs, endpoint/modality support, retirement/availability, provider pricing/terms, and data handling — `src/lib/ai/openrouterModelIds.ts`, provider adapters, and admin labels/help. The registry’s recorded documentation date is not a live check.
5. Any policy or payment price/term presented as current — admin configuration and payment/UI content, verified against the applicable official provider/operator documentation.

A fast repository search surfaced dated QS research and official tuition source URLs in `docs/QS_2026_TOP_10-20_TADQIQOT.md`, and prior stage notes include a model-variant retirement date. These are leads for verification, not live-source confirmation. No time-sensitive statement is being endorsed by this report.

## Documentation drift and unconfirmed assumptions

- `PROJECT_DEFINITION.md` contains statements such as “No auth system” and “Real auth would be the next step,” which conflict with current `src/lib/auth.ts`, `src/proxy.ts`, and guarded API routes. Treat that project document as stale until reconciled; do not treat its architecture/phase text as current truth.
- `IMPLEMENTATION_PLAN.md` is explicitly archival (2026-08) and describes historical phases. It is not a substitute for the missing remediation brief.
- Older audit/stage reports in `docs/` include branch-specific findings and test results. The Stage 0 report identifies its baseline as another branch/commit; its results are not this branch’s baseline and its findings need source re-verification before being carried forward.
- It is unknown whether the missing brief targets only the major feature areas above, includes unrelated product work, or expects exact changes to specific files. No such assumption was made.

## Baseline checks on this branch

Dependency install: `npm ci --ignore-scripts --no-audit --no-fund` — passed (477 packages). Node observed: `v22.22.3`. The CI `DATABASE_URL` used for build was a dummy localhost URL; it was not contacted.

| Check | Result |
| --- | --- |
| `npm audit --omit=dev --audit-level=high` | Passed; 0 vulnerabilities reported. |
| `npm run audit:check` | Passed; no unreviewed high/critical advisories. One documented exception covers five paths for GHSA-vfj7-8cjw-p6xm; 4 moderate advisories are below the gate. |
| `npm run typecheck` | Passed. |
| `npm run test:schema` | Passed offline: every app table/column covered by repository DDL; all 95 tables / 1,053 columns matched schema documentation. Live check skipped. |
| `npm run test:schema-apply-safety` | Passed; refusal cases do not connect without explicit acknowledgement. |
| `npm run test:security` | Passed, 81 assertions. |
| `npm run test:match` | Passed. |
| `npm run test:ai-settings` | Passed, 92 assertions; expected DB-unavailable warning, used environment fallback. |
| `npm run test:ai-format` | Passed, 40 assertions. |
| `npm run test:ai-cost` | Passed, 58 assertions. |
| `npm run test:visa` | Passed: similar-profile and scoring suites, including 91 + 67 checks. |
| `npm run test:visa-render` | Passed. |
| `npm run check:i18n` | Passed: en/uz/ru parity; 5,785 English keys, 118 translated component files, 3,293 `t()` call sites. |
| `npm run lint:baseline` | Passed: 0 current issues across 0 files; no remaining baseline debt. |
| `npm run test:responsive` | Passed, 65 source-level checks; script explicitly does not render a browser viewport. |
| `npm run test:dark` | Passed: 326 rules parsed, 77 dark tokens, zero reported leaks/unreadable pairs. |
| `npm run build` with dummy CI `DATABASE_URL` | Passed: optimized Next build, TypeScript, 76 static pages; no live DB used. |
| Additional pure suites | Passed: `test:chancing`, `test:roadmap`, `test:documents`, `test:essays`, `test:samples`, `test:costs`, `test:cv`, `test:compare`, `test:mentors`, `test:parent`, `test:dataset`, `test:render`, `test:essay-adapter`, `test:rec-letter`, `test:country-compare`, `test:panel-placement`, `test:countries`, `test:opportunities`, `test:essay-reviews`, `test:growth`, `test:telegram`, `test:journey`, `test:differentiators`, `test:study-interests`, `test:career-discovery`, `test:arrival`, `test:calculations`, `test:streak`, `test:stage7-seed-safety`, and `test:task-sync`. |
| `npm run test:ownership` | **Could not complete:** 12 pure state-machine checks passed, then embedded Postgres `initdb` exited 127 because `libpq.so.5` is missing. No DB was started. Other embedded-Postgres CI suites (`test:portability`, `test:telegram-integration`, `test:integration`, and `test:recommend`) were not run for the same environment limitation. |
| `npm run test:api-security` | **Not a valid baseline run:** requires a running app and DB; no server was started. Probe requests were unreachable (`fetch failed`). |
| `npm run test:provenance` | **Unavailable:** requires a running app and local dev DB; returned `ECONNREFUSED`. Its pure stale-date boundary checks passed before fixture setup. |
| `npm run test:video` | **Failed at SSR setup:** `SmartVideoPlayer` calls `useTranslations("courses")`, but this script renders without an Intl provider; React/next-intl throws before rendering assertions. No product change was attempted. Retest with an Intl provider or explicitly fix the harness in an authorized phase. |

**CI baseline status:** all completed offline CI checks passed. CI’s embedded-Postgres gates are blocked/not run in this sandbox; do not summarize the full workflow as passed. `test:provenance`, `test:api-security`, and `test:video` are additional script findings, not the CI workflow’s main acceptance gates listed above.

## Provisional execution order for later phases

This is a dependency-aware workstream map, **not** a reconstruction of the unavailable brief’s exact phase names or acceptance criteria.

1. **Obtain and reconcile scope.** Supply the three PDFs, staged master prompt, and remediation brief/target list. Compare each stated target against current files and this baseline; resolve conflicts with the owner before implementation.
2. **Verify facts and policy.** Inventory data/content claims by source, cycle/jurisdiction, recency, and privacy/terms; verify time-sensitive items against official primary sources. Decide provenance/unknown/stale behavior before changing catalogue data or visa guidance.
3. **Design schema/data changes only if required.** Inspect actual Drizzle columns and existing SQL/RLS before proposing migration; define additive migration, backfill, rollback, seed behavior, and staging verification. Obtain approval before any live/staging mutation; production remains explicitly out of scope absent authorization.
4. **Implement server/domain behavior.** Make only brief-authorized changes in APIs/services/seeds, retaining authentication, ownership, quotas, validation, privacy, CSRF, schema safety, and deterministic fallback behavior. Add focused tests alongside each behavior change.
5. **Implement UI/content.** Update consuming components after API/schema contracts settle; synchronize en/uz/ru and preserve keyboard/mobile/dark-light accessibility.
6. **Verify and hand off.** Run focused tests, full feasible CI, supported embedded-Postgres checks in a suitable environment, live-source review where needed, `git diff --check`, and review migration/deployment plan. No deployment or production operation without explicit authorization.

**Dependencies:** scope/source confirmation precedes implementation; schema and API contract precede UI consuming new fields; locale additions accompany UI copy; migrations are reviewed before seeds or live data changes; database-dependent tests need PostgreSQL runtime dependencies. The remediation brief may require a different ordering once received.

## Changed/missing files and next step

- **Changed:** `docs/PHASE_1_RECONNAISSANCE_2026-10-22.md` only (this report).
- **Behavior changed:** none. No schema, seed data, runtime configuration, or production data changed.
- **Missing inputs:** three reference PDFs; `ScholarBridgeAI_Staged_Master_Prompt.md`; remediation brief and its exact target-file/phase list. They were not present in the repository/workspace search.
- **Risks/unavailable scope:** no live database/official source/provider verification, no embedded Postgres suites due missing `libpq.so.5`, no app-backed probes, and no browser-rendered visual testing.
- **Exact next step:** provide the missing PDFs/master prompt and remediation brief (or paste the target files and phase requirements). Then re-map exact targets and acceptance criteria before authorizing any feature implementation.
