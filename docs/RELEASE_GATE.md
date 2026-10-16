# Release gate — what CI enforces and what the operator must configure

This document separates two things that are easy to confuse:

1. **What the repository enforces automatically** — the GitHub Actions
   workflow (`.github/workflows/ci.yml`, mirrored in `ci/security-ci.yml`).
   These checks run on every push to `main` and every pull request.
2. **What only a human with repo admin rights can enforce** — branch
   protection on `main` and Render deployment policy. Nothing in this
   repository can force those; this page lists the exact settings so an
   operator can apply them in minutes.

> **Status note (2026-10-16):** the workflow is live and runs on every pull
> request. Until this date it never got past its first step: `npm audit
> --audit-level=high` failed on every branch, including `main`, because
> GHSA-vfj7-8cjw-p6xm (dev-toolchain `braces`, no released fix) is unpatched —
> so the other 22 gates never executed and every run looked like a red build.
> The audit is now split into a hard production-dependency gate and a
> reviewed-exception gate (see the table above and `audit-exceptions.json`);
> the exception list can only shrink, because the gate fails on a stale entry.
> Still read CI status off the Actions run for the commit in question. The
> operator steps to make the gate *blocking* are in
> [Activate the gate](#activate-the-gate).

---

## 1. What CI runs (automatic)

| Step | Command | What it protects |
| --- | --- | --- |
| Dependency audit — production (high+) | `npm audit --omit=dev --audit-level=high` | Known high/critical vulns in **shipped** dependencies. No exceptions, no `continue-on-error`. |
| Dependency audit — all deps (high+) | `npm run audit:check` | High/critical vulns anywhere, including the dev toolchain. Fails on any advisory that is not listed in the committed `audit-exceptions.json`, and fails again when a listed exception is no longer needed. Every finding is printed, excepted or not. |
| Typecheck | `npm run typecheck` | Compile errors |
| Security regression tests | `npm run test:security` | Auth, rate limits, quotas, injection, SSRF (68 assertions) |
| AI settings tests | `npm run test:ai-settings` | Provider config, key encryption, defaults (83) |
| AI format tests | `npm run test:ai-format` | Model output formatting contracts (40) |
| Ownership tests | `npm run test:ownership` | Row-level ownership across every endpoint (83, embedded Postgres) |
| Portability, config and RLS tests | `npm run test:portability` | Schema portability, RLS policies, config (57, embedded Postgres) |
| Telegram integration tests | `npm run test:telegram-integration` | Telegram bot + sign-in codes (119, embedded Postgres) |
| API integration tests | `npm run test:integration` | Ownership, Premium, AI quota, chancing policy (191, embedded Postgres) |
| E2E journey tests | `npm run test:journey` | Student journey end-to-end (84, embedded Postgres) |
| Chancing + probability-policy tests | `npm run test:chancing` | Fit-only surfaces; admission probability never exposed (64, embedded Postgres) |
| Recommender tests — engine + API | `npm run test:recommend` | Dimension separation, provenance, ownership (62, embedded Postgres) |
| Opportunities feed tests | `npm run test:opportunities` | Feed correctness (14, embedded Postgres) |
| i18n message parity | `npm run check:i18n` | en/uz/ru key parity + ICU validity + all `t()` call sites |
| Lint (baseline gate) | `npm run lint:baseline` | Fails on any NEW or WORSENED lint problem; debt is tracked in the committed `lint-baseline.json` (see `docs/LINT.md`). No `continue-on-error`, no rule disabling. |
| Dark-mode contrast audit | `npm run test:dark` | Unreadable bg/text pairs in light and dark themes |
| Build | `npm run build` | Production build compiles |

### Secrets and credentials in CI

CI uses **no secrets at all**: the DB-backed suites start their own throwaway
embedded PostgreSQL instances (initdb in `/tmp`, wiped after each run) and use
hardcoded throwaway credentials (`test:test`, `ci:ci`) that exist nowhere
else. **No production `DATABASE_URL`, `SESSION_SECRET`, or provider keys are
stored in the workflow, in the repository, or in repository secrets.**

---

## 2. Branch protection on `main` (operator-only)

GitHub → repository → **Settings → Rules → Rulesets** (or the legacy
*Branch protection*). Create a ruleset that applies to `main` and add:

1. **Require status checks to pass before merging** — tick the single check
   `verify` (the whole job is one job named `verify`; its steps are the
   checks in §1). If you prefer per-step granularity, tick every step name
   listed in §1.
2. **Require branches to be up to date before merging** (optional but
   recommended).
3. **Do not allow force pushes** — main.
4. **Do not allow deletions** — main.
5. **Require a pull request before merging** with at least **1 approving
   review** (adjust to your team).
6. **Include administrators** — decide explicitly; the secure default is to
   include them so the gate can't be bypassed by an admin push.

While the ruleset is not in place, anyone with write access can push straight
to `main` and deploy. That is the gap this step closes.

## 3. Render deployment policy (operator-only)

The blueprint in `render.yaml` provisions a web service + managed Postgres.
In the **Render dashboard** (not in this repository) verify:

1. **Deploy source**: `main` branch only. Turn **off** auto-deploy for pull
   requests (preview deploys with production env vars are a credential leak
   vector). Keep "Auto-deploy" on for `main` pushes.
2. **Environment variables** (set once, in the dashboard — the blueprint
   marks which are `sync: false`):
   - `SESSION_SECRET` — required, ≥ 32 random chars:
     `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
   - `AI_KEYS_ENCRYPTION_SECRET` — ≥ 16 random chars (same generator).
   - `ADMIN_EMAIL` / `ADMIN_NAME` / `ADMIN_PASSWORD` — bootstrap admin only
     (used while no platform owner exists). **Never reuse the dev values from
     `docs/HANDOVER.md` or any report; generate a fresh password and treat
     any previously disclosed dev password as compromised and rotate it.**
   - `DATABASE_URL` — from the Render-managed Postgres (`fromDatabase` in the
     blueprint) **or** your Supabase connection string (the documented source
     of truth in `docs/SUPABASE_SCHEMA.md`). Both work; pick one and keep it.
   - `APP_URL` — canonical `https://` URL, no trailing slash.
   - Provider keys (`GROQ_API_KEY`, optional payment keys) only if the
     feature is actually enabled in production.
3. **Database**: keep the managed Postgres **private** (no public network
   access), enable point-in-time backups, and note that schema changes to a
   production database are **manual and deliberate** — the build command
   intentionally does NOT run `db:push` (`render.yaml` documents this).
   Production schema procedure: see `docs/SUPABASE_SCHEMA.md` §operations.
4. **Health check**: `/api/health` (configured in the blueprint) — verify it
   responds 200 after the first production deploy.

## 4. Activate the gate (exact first-run steps)

1. Push the session branch only after authorization:
   `git push origin arena/fbee4986-scholarbridgeai`, then open a PR from that
   branch. The branch name is fixed by the Arena session.
2. Watch the first Actions run for the PR — it must not have run before, so
   this is the genuine first signal. If a step fails for environmental
   reasons (e.g. `npm ci` network), re-run from the failed step; if it fails
   on a test, do **not** mark the check optional — fix the failure.
3. Apply the ruleset from §2.
4. Apply the Render settings from §3.
5. After the PR merges, confirm the `main` push ran the same workflow and
   that Render deployed only from `main`.

## 5. Known limitations (stated, not hidden)

- The workflow's first run is **unverified in this session** (no push made).
- Branch protection and Render policy are **not enforceable from the
  repository** — until an operator applies §2/§3, `main` is unprotected.
- `npm audit --audit-level=high` covers the lockfile's declared tree;
  transitive advisories below "high" are tracked but do not block (by design,
  to keep the gate signal-to-noise reasonable).
- The dark-mode audit is a static contrast lint, not a visual test.
