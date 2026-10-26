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
* **A smaller, faster pool.** `max` is now 5 per instance (was 15) and
  configurable with `PG_POOL_MAX`; connect timeout 8 s instead of 10 s, idle
  timeout 10 s, TCP keepalive on, `application_name=scholarbridge` so pool
  dashboards attribute the connections. In production only, statements are
  capped at `PG_QUERY_TIMEOUT_MS` (default 20 000) so a request can never hang
  the page forever.

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
