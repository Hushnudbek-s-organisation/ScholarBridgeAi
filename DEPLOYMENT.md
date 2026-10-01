# Deploying ScholarBridge

ScholarBridge is a standard Next.js (Node) server plus a PostgreSQL database.
Nothing in the code is tied to one host, domain, database project, bot or AI
vendor: every such value comes from environment variables or the admin
panel. Render is the documented default (`render.yaml`), but any Node host
works — see [Moving to another host](#moving-to-another-host-or-domain).

- **Owner handover** (people and accounts): [`docs/HANDOVER.md`](./docs/HANDOVER.md)
- **Security model**: [`SECURITY.md`](./SECURITY.md)
- **All variables with examples**: [`.env.example`](./.env.example)

---

## 1. Website

### Render (blueprint)

1. Render dashboard → **New → Blueprint** → connect this GitHub repository.
2. Render reads `render.yaml` and creates the managed PostgreSQL database and
   the web service (`npm install && npm run build`, `npm start`, health check
   `/api/health`).
3. Open the web service → **Environment** and fill every variable marked
   `sync: false` (see the table below). At minimum: `SESSION_SECRET`,
   `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `AI_KEYS_ENCRYPTION_SECRET`.
4. Save → Render redeploys.

`db:push` is intentionally **not** part of the build: the database is the
source of truth. Additive tables used by newer features (analytics,
Telegram, ownership, growth features) are created on first use with
`CREATE TABLE IF NOT EXISTS`; if your database user may not create tables,
run the matching `supabase/add_*.sql` file once instead.

The app also repairs *additive drift* of the core tables it owns on first use
(`ensureCoreSchema`, `src/lib/core/db.ts`): a column or table that exists in
`src/db/schema.ts` but not yet in the database — for example
`student_profiles.is_admin` — is added with `ADD COLUMN IF NOT EXISTS` /
`CREATE TABLE IF NOT EXISTS` before it is queried. Nothing runs when the
database is already up to date, and nothing is ever dropped or renamed. An old
database that cannot be repaired automatically keeps answering as before. The
same statements are mirrored in `supabase/add_core_repair.sql` (regenerate with
`npm run db:core-repair-sql`) for owners who prefer to run the SQL by hand.

### Any other Node host (Railway, Fly.io, a VPS, Docker, …)

| Setting | Value |
| --- | --- |
| Build | `npm ci && npm run build` |
| Start | `npm start` (binds `$PORT`, default 3000) |
| Node | 22 |
| Health check | `GET /api/health` |

Hosting assumptions (all portable):

- **No persistent local disk is needed.** Uploads (logo/favicon) go to
  Supabase Storage; everything else lives in PostgreSQL.
- **Reminders** run in-process every few hours on long-running servers
  (`NOTIFICATION_SCHEDULER`). On serverless hosts or when running several
  instances, set `CRON_SECRET` and call `GET /api/cron/notifications` (and
  optionally `/api/cron/refresh`) from an external scheduler with
  `Authorization: Bearer <CRON_SECRET>`. A database marker prevents double
  sweeps.
- **Rate limits are per process** (in memory). With several instances each
  enforces its own window — acceptable, but not a global limit.
- Behind a proxy/CDN set `TRUSTED_PROXY_HOPS` / `CLIENT_IP_HEADER` so per-IP
  limits see the real client address.

## 2. Database (Supabase or any PostgreSQL 14+)

1. Create the database and copy its connection string into `DATABASE_URL`
   (Supabase: *Project settings → Database*; add `?sslmode=require` if the
   host requires SSL).
2. **Run the canonical schema once** — one file covers everything the app
   reads or writes (93 tables, every column, indexes, FKs, RLS lockdown):
   paste [`supabase/full_schema.sql`](./supabase/full_schema.sql) into the
   Supabase SQL Editor and Run. It is **additive and idempotent** — safe on a
   fresh database and safe to re-run on an existing one (it only creates
   missing tables/columns/indexes/constraints and never drops or renames).
   Terminal alternative: `npm run db:apply-full-schema`.
   Then verify that the app's expectations match the live database:
   `npm run db:verify` (exits non-zero and lists every gap if something is
   off). Full table/column reference: [`docs/SUPABASE_SCHEMA.md`](./docs/SUPABASE_SCHEMA.md).
   The older `supabase/add_*.sql` patches remain safe (all `IF NOT EXISTS`),
   but the one file above replaces running them one by one.
3. First start: visiting `/api/universities` runs the seed (demo catalogue
   and the bootstrap admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD`).
4. **Supabase only — public API roles are locked down.**
   [`supabase/full_schema.sql`](./supabase/full_schema.sql) already enables RLS
   on every table and revokes `anon`/`authenticated` (keeping read-only access
   to the `universities` / `scholarships` catalogue). If you skip step 2 and
   create tables another way, run
   [`supabase/enable_rls.sql`](./supabase/enable_rls.sql) instead, as the same
   role the app uses. Verified by `npm run test:portability`.
5. The daily AI limits index (`ai_usage(profile_id, created_at)`) is part of
   the canonical schema; standalone it is
   [`supabase/add_ai_usage_quota_index.sql`](./supabase/add_ai_usage_quota_index.sql).

## 3. Domain and canonical URL

Set `APP_URL=https://your-domain` (no trailing slash). It is used for
Telegram buttons, the Mini App address, referral links, `sitemap.xml`,
`robots.txt` and OpenGraph tags. When unset, the app uses
`NEXT_PUBLIC_APP_URL`, then the host's own `RENDER_EXTERNAL_URL` /
`VERCEL_PROJECT_PRODUCTION_URL`; if none exists, page metadata falls back to
the request host and outgoing links are left relative. No absolute site URL
is stored in the database except the Telegram webhook address you register
(see below).

Google Search Console: either keep `public/googleddb3ece94dc2926a.html`
(HTML-file method, tied to the current property) or set
`GOOGLE_SITE_VERIFICATION` to the meta-tag token of your property.

## 4. AI providers

Admin → **AI Settings**: choose provider + model per task (admissions, essay,
general, search, document, visa), paste API keys (encrypted at rest with
`AI_KEYS_ENCRYPTION_SECRET`, shown masked `••••abcd`), **Test connection**
(checks key, model, a basic request and structured output), optionally set an
explicit fallback provider or disable providers. Supported: Groq, OpenAI,
Anthropic, Google (Gemini via its OpenAI-compatible endpoint), OpenRouter
and any OpenAI-compatible endpoint (`AI_CUSTOM_BASE_URL`, e.g. a local
model server). Env keys (`GROQ_API_KEY`, …) work too; a key saved in the
panel takes precedence. Only admins can change providers; keys never reach
the browser, logs or API responses.

Key rotation: set the new `AI_KEYS_ENCRYPTION_SECRET`, put the old one in
`AI_KEYS_ENCRYPTION_SECRET_PREVIOUS`, redeploy, press **Re-encrypt keys** in
Admin → AI Settings (the panel-stored Telegram token is re-encrypted
automatically on first use), then remove the previous secret.

## 5. Telegram bot, webhook and Mini App

1. Create a bot with [@BotFather](https://t.me/BotFather) (or reuse one) and
   copy its token.
2. Admin → **Telegram bot** → paste the token (stored encrypted) — or set
   `TELEGRAM_BOT_TOKEN` (a token saved in the panel takes precedence).
3. Press **Connect webhook**. The panel shows which base URL it will use
   (`APP_URL` and its source) and warns when the saved address differs from
   `APP_URL`. Telegram requires a public **https** URL. The webhook is
   authenticated with a secret header (`TELEGRAM_WEBHOOK_SECRET`, or derived
   from `SESSION_SECRET` + bot id).
4. Registering also sets the command list and, over https, the menu button
   that opens the Mini App (`TELEGRAM_MINI_APP_URL`, default `<APP_URL>/tg`).
5. Optional in BotFather: `/setuserpic`, `/setdescription`.

After a domain change, press **Connect webhook** again — Telegram keeps
calling the old address until you do.

## 6. Moving to another host or domain

1. Admin → Settings → **Export (JSON)** on the old deployment. The file
   holds prices, limits, AI provider/model choices, navigation and guide
   texts — **never** API keys, tokens or passwords.
2. Point the new host at the database (same `DATABASE_URL`) or restore a
   dump into a new one.
3. Copy all secrets to the new host's environment (same `SESSION_SECRET`
   keeps users signed in; same `AI_KEYS_ENCRYPTION_SECRET` keeps stored AI
   keys readable — otherwise re-enter them in Admin → AI Settings).
4. Set `APP_URL` to the new address, deploy, check `/api/health`.
5. With a new database: Admin → Settings → **Import…**, review the dry run,
   **Apply**. Unknown, secret or invalid keys are rejected and reported.
6. Admin → Telegram bot → **Connect webhook** (new URL).
7. Update DNS, Search Console, payment-provider
   callback URLs (`/api/payments/payme`, `/api/payments/click`).

## 7. Environment

Scope: **server** = read only on the server; **public** = inlined into the
browser bundle (`NEXT_PUBLIC_*`) or rendered into HTML. Secret = treat like a
password, never commit.

| Variable | Required | Scope | Secret | Purpose / example |
| --- | :-: | :-: | :-: | --- |
| `DATABASE_URL` | yes | server | yes | PostgreSQL connection string |
| `SESSION_SECRET` | yes (prod) | server | yes | Signs `sb_session`; ≥ 32 random chars |
| `APP_URL` | recommended | server | no | `https://your-domain` — canonical URL for links |
| `NEXT_PUBLIC_APP_URL` | no | public | no | Legacy name of `APP_URL` |
| `ADMIN_EMAIL` | first start | server | no | Bootstrap admin (only while no owner exists) |
| `ADMIN_NAME` | no | server | no | Display name for the bootstrap admin (unset keeps the existing name) |
| `ADMIN_PASSWORD` | first start | server | yes | ≥ 8 chars; applied only while the admin has no password |
| `PLATFORM_OWNER_EMAIL` | no | server | no | Initial platform owner (defaults to `ADMIN_EMAIL`) |
| `OWNERSHIP_TRANSFER_TTL_HOURS` | no | server | no | Transfer lifetime, 1–168, default 72 |
| `AI_KEYS_ENCRYPTION_SECRET` | yes (prod) | server | yes | Encrypts panel-stored AI keys (≥ 16 chars) |
| `AI_KEYS_ENCRYPTION_SECRET_PREVIOUS` | no | server | yes | Old secret during rotation |
| `AI_PROVIDER_DEFAULT` / `AI_PROVIDER_<TASK>` | no | server | no | `groq`, `openai`, … (panel overrides) |
| `AI_PROVIDER_FALLBACK` | no | server | no | Explicit fallback provider |
| `AI_PROVIDERS_DISABLED` | no | server | no | `openrouter,anthropic` |
| `GROQ_API_KEY` / `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GOOGLE_AI_API_KEY` / `OPENROUTER_API_KEY` | one AI key for AI features | server | yes | Provider keys (or set them in the panel) |
| `*_MODEL` (e.g. `GROQ_MODEL`) | no | server | no | Model override per provider |
| `AI_CUSTOM_BASE_URL` / `AI_CUSTOM_API_KEY` / `AI_CUSTOM_MODEL` / `AI_CUSTOM_CAPABILITIES` | no | server | key: yes | Any OpenAI-compatible endpoint |
| `GEMINI_API_KEY` / `GEMINI_LIVE_MODEL` / `GEMINI_LIVE_API_VERSION` | no | server | key: yes | Visa voice assistant (Gemini Live) |
| `OPENROUTER_SITE_URL` / `OPENROUTER_APP_NAME` | no | server | no | Attribution headers (default `APP_URL`) |
| `TELEGRAM_BOT_TOKEN` | no | server | yes | Bot token (or set it in the panel) |
| `TELEGRAM_WEBHOOK_SECRET` | no | server | yes | Webhook header secret |
| `TELEGRAM_MINI_APP_URL` | no | server | no | Default `<APP_URL>/tg` |
| `TELEGRAM_LINK_TTL_SECONDS` / `TELEGRAM_INIT_DATA_MAX_AGE_SECONDS` | no | server | no | Link / initData lifetimes |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | for uploads | server | key: yes | Branding uploads to Supabase Storage |
| `SUPABASE_BRANDING_BUCKET` | no | server | no | Bucket name, default `LOGO` |
| `SUPABASE_ANON_KEY` | no | server | no | SSR catalogue pages when no service key |
| `GOOGLE_SITE_VERIFICATION` | no | public | no | Search Console meta-tag token |
| `PAYME_*` / `CLICK_*` | for real payments | server | yes | Merchant credentials (webhooks fail closed without them) |
| `CRON_SECRET` | serverless/multi-instance | server | yes | Bearer token for `/api/cron/*` |
| `REMINDER_TIMEZONE` | no | server | no | e.g. `Asia/Tashkent` (default UTC) |
| `NOTIFICATION_SCHEDULER` / `NOTIFICATION_SWEEP_HOURS` | no | server | no | In-process reminders on/off, interval |
| `TRUSTED_PROXY_HOPS` / `CLIENT_IP_HEADER` | no | server | no | Real client IP behind proxies |
| `CSP_REPORT_ONLY` | no | server | no | `1` = CSP report-only |
| `RESEARCH_SEARCH_ENDPOINT` / `RESEARCH_SEARCH_API_KEY` | no | server | key: yes | Research agent web-search fallback |

## Security checklist (once per environment)

- [ ] `SESSION_SECRET` and `AI_KEYS_ENCRYPTION_SECRET` set to long random values.
- [ ] Admin signed in with a real password; `ADMIN_PASSWORD` removed afterwards.
- [ ] Supabase: `supabase/enable_rls.sql` executed (all tables `rls_enabled = true`).
- [ ] `supabase/add_ai_usage_quota_index.sql` executed; daily AI limits reviewed in Admin → Settings.
- [ ] `APP_URL` set; Telegram webhook registered against it.
- [ ] `PAYME_*` / `CLICK_*` set **or** payments knowingly disabled.
- [ ] `CRON_SECRET` set if an external scheduler is used.
- [ ] `npm run test:security` and `npm audit --audit-level=high` green.

## Admin → Analytics

The admin panel opens on **Analytics** (visitors, views, signups, premium,
revenue, engagement; 7/30/90 days; CSV export). Traffic is counted in
`site_visits` (anonymous `sb_vid` cookie, no IP stored), created on first use
or via `supabase/add_analytics.sql`.

## 8. Releases: CI gate + production checklist

### CI gate (before any deploy)

The workflow in [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) (kept
in sync with [`ci/security-ci.yml`](./ci/security-ci.yml)) runs on every push
to `main` and every pull request:

- `npm audit --audit-level=high` — no known high/critical dependency issues;
- `npm run typecheck` — 0 TypeScript errors;
- `npm run test:security`, `test:api-security`, `test:ai-settings`,
  `test:ai-format` — security and AI-configuration regressions;
- `npm run test:ownership`, `test:portability`, `test:telegram-integration`,
  `test:integration`, `test:journey` — full API/E2E suites against embedded
  Postgres (the integration suite contains the 2026-10 re-audit checks:
  rate limiting, visa usage, sessions, deadlines policy, instructors guard);
- `npm run check:i18n` — every user-facing string exists in all 3 languages;
- `npm run lint:baseline` — lint gate (see [docs/LINT.md](./docs/LINT.md)):
  fails on any NEW file with lint problems or any WORSENED rule count; the
  50 pre-existing issues are pinned in `lint-baseline.json` and shrink as
  debt is fixed (never hidden);
- `npm run test:dark` — dark-mode contrast audit (0 unreadable pairs);
- `npm run build` — the production bundle compiles.

> `npm run test:api-security` (anonymous-caller probe of every route) is a
> **local** check that needs a running server + seeded dev DB, so it is not a
> CI step. Run it in a PR review when auth/routing changes.

**Enforcement (the part this repository cannot do for you).** The workflow
only *runs*; making it a *gate* is configured in the live service, and these
settings are **not** stored in the repo, so they cannot be verified from
here. The exact operator steps:

1. **GitHub branch protection (this is the actual gate).**
   Repo → *Settings* → *Branches* → *Add branch protection rule* →
   branch name `main`. Tick:
   - **Require status checks to pass before merging**, then select the
     `verify` job of the **CI** workflow (the single job above). With only
     this job selected, a merge is blocked until every step is green.
   - Recommended: also tick **Require pull request reviews before merging**
     and **Include administrators** (otherwise admins can bypass it).
2. **Render auto-deploy.** `render.yaml` already sets `autoDeploy: true` on
   the web service, so Render deploys `main` automatically right after a
   merge. No extra Render setting is needed — the safety comes entirely from
   step 1 (nothing reaches `main` without passing CI). **If you ever flip
   `autoDeploy` off or add manual deploys, re-add a required check or manual
   gate accordingly.**

> ⚠️ Because `autoDeploy: true`, a *direct* push to `main` that skips the PR /
> required-check (e.g. by an admin) would deploy immediately. Step 1, with
> **Include administrators** on, is what closes that hole.

The workflow cannot be verified from inside a sandbox, so after wiring the
repository to GitHub the first run must be watched to completion by an
operator before it is treated as the gate.

### Production operator checklist (each release)

The application code is stateless; the database is the source of truth. A
release therefore touches the live database at most once:

1. Watch the CI on `main` go fully green (gate above).
2. **Apply the canonical schema to the production database** —
   [`supabase/full_schema.sql`](./supabase/full_schema.sql) in the Supabase
   SQL Editor (or `npm run db:apply-full-schema` with the production
   `DATABASE_URL`). It is additive and idempotent: it creates only what is
   missing — new tables, columns, indexes, FKs and UNIQUE constraints — and
   never drops, renames or backfills data. Existing rows that violate a new
   uniqueness rule produce a NOTICE, not an error (the app keeps working).
3. **Verify** the live database matches the app's expectations:
   `npm run db:verify` (exits non-zero and lists every gap).
4. Deploy the new build (Render: automatic on `main`; other hosts: your
   normal deploy step). The app reads schema on every request, so step 2
   before step 4 means there is no incompatible window.
5. Smoke test against production (read-only checks, no writes):
   - `GET /api/health` → 200
   - homepage → 200
   - one signed-in call you control (e.g. `GET /api/sessions`) → 200
   - `GET /api/certificates/verify?code=BOGUS` → 404 (public endpoint up)
6. Watch logs for 10–15 minutes for `[auth]`, `[ai]` and 5xx spikes.

**Never** run the integration/E2E test suites against the production
database — they create throwaway accounts and mutate state. They only ever
run against embedded/dev databases (CI and `npm run db:dev`).

### Rollback

Because schema changes are additive, a code rollback (redeploy the previous
tag) is always safe against a newer schema: older code simply does not read
the new tables/columns. The only irreversible case is a data backfill you
run manually — do not do those inside this workflow.
