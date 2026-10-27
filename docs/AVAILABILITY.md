# When the database is briefly unreachable

The screen **"Boshqaruv paneli vaqtincha ishlamayapti" / "Dashboard temporarily
unavailable"** with *"Authentication is temporarily unavailable"* is not a
sign-in problem. It means `GET /api/auth/session` answered **503**, which
`src/lib/auth.ts` only does when a database lookup itself failed. The session
cookie was never invalid.

## Why it appeared

1. `authenticate()` runs `ensureCoreSchema()`, then reads the profile row, then
   the server-side session record. If any of those queries throws, the request
   answers `503 { code: "unavailable" }`.
2. The browser retried three times over ~3 s. A database that was still waking
   up (Supabase unpausing a free project, a pooler refusing connections during a
   restart, a Render instance that just booted) needs longer than that.
3. On the last failure the app replaced **the entire site** with a blocking
   error screen. A visitor with a valid cookie could not reach the landing page,
   the catalogue, or sign-in. That is the "sayt ochilmayapti" symptom.

Common triggers, in order of likelihood:

| Trigger | Signature in the logs |
| --- | --- |
| Connection pool exhausted (many instances × `max`) | `53300 too many clients already` |
| Provider paused/restarted the instance | `57P03 cannot connect now`, `08006` |
| Idle connection reaped by the provider | `57P01 terminating connection…` |
| Network blip to the pooler | `ECONNRESET`, `ETIMEDOUT` |
| Cold start slower than the connect timeout | request takes exactly the timeout |

## What changed

* **The public site never blocks.** A failed restore now renders the landing
  page plus a dismissible banner ("Seansingizni tekshirib bo'lmadi…") with a
  retry button, in uz/ru/en. The cookie is left untouched, so the next
  successful check restores the same session. There is no `restore-error` view
  any more.
* **Longer, bounded retry.** `SESSION_RESTORE_MAX_ATTEMPTS = 5` with backoff
  `400 / 800 / 1600 / 2500 ms` (`src/lib/sessionRestore.ts`), so a waking
  database gets ~5 s instead of ~3 s.
* **One retry inside the request.** `withDbRetry()` (`src/db/retry.ts`) retries
  exactly once, after 120 ms, and only for connection-class errors. A missing
  column or a syntax error is still thrown immediately.
* **Honest 503s.** The route sends `Retry-After: 3`, so proxies and the client
  loop back off instead of hammering a database that is already struggling.
* **A smaller, faster pool.** `max` is 10 per instance (was 15; 5 in the first
  availability pass) and configurable with `PG_POOL_MAX`; connect timeout 8 s,
  idle timeout 30 s so a warm connection survives a normal traffic gap, TCP
  keepalive on, `application_name=scholarbridge` so pool dashboards attribute
  the connections, and connections are retired after 1 800 s / 7 500 uses so the
  app never keeps a client the pooler has already forgotten. In production only,
  statements are capped at `PG_QUERY_TIMEOUT_MS` (default 20 000) so a request
  can never hang the page forever. See `docs/BACKEND_PERFORMANCE.md`.
* **Schema repair and seeding are not request work.** With
  `SCHEMA_AUTO_REPAIR=off` a request never runs DDL (it verifies, once per
  process), and with `SEED_ON_REQUEST=auto` a production request never seeds.
  `npm run db:schema` / `npm run db:seed` / Admin → Diagnostics → Retry apply
  both deliberately.

## What to check when it happens

```bash
curl -i https://<site>/api/health                 # 200 {"ok":true} | 503
curl -i https://<site>/api/auth/session           # 503 ⇒ this document
```

* `/api/health` failing too ⇒ the database, not auth. Check the provider's
  status page and the connection count in its dashboard.
* Set `PG_POOL_MAX` to `2`–`3` if the plan's connection limit is small, and
  prefer the provider's **pooler** connection string (Supabase port `6543`,
  `?pgbouncer=true`) over the direct one for serverless deployments.
* A deployment without `SESSION_SECRET` (≥32 chars) answers a different,
  permanent error: `code: "session_secret_required"`. That one is never retried.

## Regression tests

`npm run test:security` covers the retry policy, the backoff curve, the
transient-vs-permanent database error classification, the single retry, and
asserts that `HomeClient` no longer contains a blocking restore screen.
`npm run test:channel`, `npm run check:i18n` and the lint/typecheck gates stay
green.

---

# "Telegram features are temporarily unavailable" (bot + channel at once)

That sentence comes from one place: `tgTablesOr503()`
(`src/lib/telegram/http.ts`), which returns **503** when
`ensureTelegramTables()` could not run the idempotent DDL. The channel panel has
the same guard with `ensureChannelTables()`.

It is **not** a Telegram problem. Telegram was never called. The bot goes quiet
at the same time for the same reason: every update needs a `telegram_updates`
row, so a database that refuses writes swallows the message.

## Why both die together

| Layer | Needs | Breaks as |
| --- | --- | --- |
| Auth (sign-in, panel) | `SELECT` on profiles/sessions | works — reads still work |
| Telegram/channel panels | `CREATE TABLE IF NOT EXISTS …` | 503 "temporarily unavailable" |
| Bot webhook | `INSERT` into `telegram_updates` | silence (no reply at all) |
| Test posts / publishing | `INSERT` into `channel_*` | same 503 |

So "the panel loads but Telegram is unavailable, and the bot does not answer
`/id`" is the signature of **a database that reads fine and writes not at all**.

Most likely causes, in order:

1. `DATABASE_URL` points at a **read-only** endpoint or role (a replica, a
   read-only pooler, Supabase's read-only connection string).
2. The role is missing `CREATE` on the schema (or `INSERT` on the tables).
3. The project is **paused / over quota** and the provider put it in
   read-only mode.
4. The Render service is **asleep** (free plan): Telegram's webhook POST lands on
   Render's "Application loading" page and the update is lost. `/api/health`
   returns an HTML loading page instead of JSON.

## What the admin panel now tells you

Admin → System → **Telegram bot** (or **Kanal**) shows a **System diagnostics**
card that survives the failure, because it reads
`GET /api/admin/diagnostics` — an endpoint that needs a session and nothing
else (no `telegram_*` table, no bootstrap).

It reports:

* **Database** — reachable? read-only? `CREATE` allowed? `INSERT` allowed?
* **Bot tables / Channel tables** — `ready`, `failed` with a stable reason
  (`read_only`, `permission_denied`, `auth_failed`, `unreachable`,
  `schema_missing`, `unknown`) and one line of advice.
* **Bot token** — `admin` / `env` / `missing` (never the value).
* **Retry** button → `POST /api/admin/diagnostics {action:"retry"}` clears the
  memoised failure and runs the DDL again immediately instead of waiting the
  usual 60 s.

The same reason/hint is now included in the 503 body of the Telegram endpoints,
so the toast is no longer a dead end.

## What still works during that outage

`/id` and `/chatid` are answered **before** any database access
(`answerChatId()` in `src/lib/telegram/service.ts`, `isStaticCommand()` in
`core.ts`, and the matching short-circuit in the webhook route). As long as the
bot token is readable — ideally also set `TELEGRAM_BOT_TOKEN` in the host's
environment as a fallback — an operator can still get the admin chat id while
everything else is broken.

For any other command the bot answers
"⚙️ The database is unreachable right now…" instead of silence.

## Fix, step by step

```bash
curl -i https://<site>/api/health                  # 200 {"ok":true} | 503
```

* **503** → the database, not Telegram. Open the diagnostics card, read the
  reason, and fix the connection string / role.
* **An HTML page ("Application loading")** → the host is asleep. Ping
  `/api/health` every ~10 minutes (`.github/workflows/keepalive.yml`, enabled by
  setting the repository variable `SITE_URL`) or upgrade the instance type.
* `{"ok":true}` **and** schema `failed: read_only` → replace `DATABASE_URL`
  with the read-write string (Supabase: the *session pooler* on port `5432`, not
  the read-replica string).
* `permission_denied` → grant `CREATE` on the schema, or apply
  `supabase/*.sql` once as the owner; afterwards press **Retry**.

## Regression tests

`npm run test:telegram` covers the error classification (`read_only`,
`permission_denied`, `auth_failed`, `unreachable`, `unknown`), the bootstrap
state machine (idle → failed(+reason) → retry → ready), the `/id` fast path, and
asserts that no hint can leak a DSN or a role name. `npm run test:security`
keeps `/api/admin/diagnostics` behind `requireAdmin`.

## Guards during a database outage

Two guards sit in front of every expensive request, and both had a failure
mode of their own during an outage. Both are now bounded:

**AI budget gate (`src/lib/ai/budget-gate.ts`).** Before any paid provider
call the router reads the budget limits and the spend snapshot. During an
outage every AI request used to pay for two *failing* reads before it could be
refused — the outage multiplied its own load. A breaker now remembers the
failed read: for `AI_BUDGET_OUTAGE_BACKOFF_MS` (default `15 000`, `0` disables)
further requests skip the store and take the degraded path directly, which
still refuses every paid call and still caps free models at 20/minute per
process. The breaker re-probes on its own after the window, so recovery needs
no restart. `budgetGateOutageState()` reports whether it is open.

**The in-process rate limiter (`src/lib/rate-limit.ts`)** keeps counters per
key in memory. It had two unbounded behaviours:

* a caller flooding ONE key grew that key's timestamp array for the whole
  window (limit × 10⁶ requests = 10⁶ retained numbers). Each key now keeps at
  most `limit + 1` timestamps — the oldest ones, which are the ones that decide
  when the block lifts, so the verdict, `remaining` and `Retry-After` are
  unchanged;
* the sweep only deleted buckets whose array was already empty, and arrays were
  pruned on access, so a bucket that had ever been hit never became empty. Idle
  keys piled up until the 50 000-entry hard cap deleted arbitrary buckets —
  possibly ones that were still blocking an attacker. Buckets now expire by
  `lastHitAt + max(window, 10 min)`.

`rateLimitBucketStats()` returns `{ buckets, hits }` for diagnostics, and
`npm run test:security` asserts both bounds.

The shared limiter (`src/lib/rate-limit-shared.ts`, Postgres-backed) already
degrades to the in-process limiter if its insert/select fails, so sign-in and
AI budgets keep working with a weaker per-process budget instead of locking
everyone out.
