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
2. First start: visiting `/api/universities` runs the seed (demo catalogue
   and the bootstrap admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD`).
3. **Supabase only — lock down the public API roles (important).** Supabase
   exposes every `public` table to its `anon`/`authenticated` roles by
   default, so anyone with the anon key could read e.g. password hashes.
   Run [`supabase/enable_rls.sql`](./supabase/enable_rls.sql) in the SQL
   Editor as the same role the app uses. It enables RLS on every table that
   role owns, revokes the public roles, and keeps read-only access to the
   `universities` / `scholarships` catalogue. The app is the table owner, so
   it is unaffected. Re-run it after adding tables. Verified by
   `npm run test:portability`.

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
- [ ] `APP_URL` set; Telegram webhook registered against it.
- [ ] `PAYME_*` / `CLICK_*` set **or** payments knowingly disabled.
- [ ] `CRON_SECRET` set if an external scheduler is used.
- [ ] `npm run test:security` and `npm audit --audit-level=high` green.

## Admin → Analytics

The admin panel opens on **Analytics** (visitors, views, signups, premium,
revenue, engagement; 7/30/90 days; CSV export). Traffic is counted in
`site_visits` (anonymous `sb_vid` cookie, no IP stored), created on first use
or via `supabase/add_analytics.sql`.
