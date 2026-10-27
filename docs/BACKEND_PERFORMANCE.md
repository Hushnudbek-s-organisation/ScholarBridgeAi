# Backend speed — request path, schema, seeding and caches

Phase 1 of the speed programme: **what a request is allowed to do on the server**.
The frontend half is in `docs/PERFORMANCE.md`.

The target was "remove the database work that happens *because a user opened a
page*". Three things were doing that: schema repair, catalogue seeding, and a
60-second cache that forced a full catalogue re-read four times a minute.

## 1. Schema repair: once per process, and never in production requests

**What was already true (checked, not assumed).** Every area already had an
idempotent, additive bootstrap (`src/lib/{core,journey,growth,ownership,channel,telegram}/db.ts`)
that was *memoised*. So the "runs `CREATE TABLE` on every request" problem had
already been fixed.

**What was still wrong.**

* the memo was a **module-level variable**, and Next.js can evaluate a module
  once per route bundle — so several routes repeated the same DDL round trip;
* there was no way to say "this deployment's schema is managed, do not touch it
  from a request". A `CREATE TABLE` takes an ACCESS EXCLUSIVE lock and can queue
  behind a long transaction, which is exactly the "first page after a deploy
  hangs" symptom.

**What changed.**

* new `src/lib/schemaGate.ts` — the memo lives on `globalThis`, so it is once per
  **Node process**, not once per bundle. A failure is remembered for 60 s (a
  broken database is not hammered); a success is remembered for the process.
* `SCHEMA_AUTO_REPAIR`:
  * `auto` (default) — repair once per process, as before;
  * `off` (recommended in production, set in `render.yaml`) — a request **never
    runs DDL**. It runs one cheap read-only check instead
    (`to_regclass` / `information_schema`), memoised, and logs precisely what is
    missing. Nothing becomes unreachable: the DDL is applied by
    `npm run db:schema`, `npm run db:seed`, or **Admin → Diagnostics → Retry**,
    which force-repairs all six areas.
* the six modules now share the gate, and each exports a `force…Repair()` for the
  operator paths.

## 2. Seeding: a deploy step, not a page render

`seedDatabase()` was called from `GET /api/universities` and
`GET /api/scholarships`. It was memoised, but the "database already has data"
branch still fired the whole catalogue top-up — regional universities, verified
facts, program catalogue, scholarship cycles, opportunities, growth/journey DDL,
rich platform data, forum, courses, gamification — in the background of a
student's request. `/api/mentors`, `/api/chancing`, `/api/similar-profiles`,
`/api/stories`, `/api/courses` and `/api/forum/*` seeded on first use as well.

* new `src/lib/db/requestSeeding.ts` — `SEED_ON_REQUEST`:
  * `auto` (default) — a request may seed outside production (`next dev`, tests),
    and never in production;
  * `on` / `off` — force either behaviour.
* `seedDatabase()` returns immediately on a production request path; the
  non-empty-database top-up now always runs **awaited** (it is only reached by an
  explicit `force`, i.e. the CLI or an admin action).
* `ensureRichPlatformDataSeeded()`, `seedCourses()`, `seedForum()` call sites in
  routes honour the same policy, and the course seeding is memoised on the
  process gate instead of a route-module flag.
* `npm run db:seed` sets the policy to `on` and applies the schema first, so the
  CLI is the single, complete seeding step. `SEED_ON_REQUEST=on` restores the old
  behaviour for a small self-hosted install.

## 3. Pool and retry

`src/db/index.ts`:

| Setting | Before | After |
| --- | --- | --- |
| `max` | 5 | 10 (`PG_POOL_MAX`, 1–20) |
| `idleTimeoutMillis` | 10 000 | 30 000 (`PG_IDLE_TIMEOUT_MS`) |
| `connectionTimeoutMillis` | 8 000 | 8 000 (`PG_CONNECT_TIMEOUT_MS`) |
| `maxUses` | — | 7 500 (`PG_MAX_USES`) |
| `maxLifetimeSeconds` | — | 1 800 (`PG_MAX_LIFETIME_S`) |

A warm connection survives a normal traffic gap (no TLS handshake per request),
and a connection is retired before a pooler/DNS has already forgotten it — the
classic `57P03 cannot connect now`. Statement timeout in production is unchanged
(`PG_QUERY_TIMEOUT_MS`, 20 s).

`src/db/retry.ts` keeps its tested defaults (two attempts, 120 ms) and gains
`PG_RETRY_ATTEMPTS` (≤ 4) / `PG_RETRY_BASE_MS` for a busier install.

## 4. Caches and headers

* `catalogCache.ts`: catalogue snapshot TTL **60 s → 300 s**
  (`CATALOG_CACHE_TTL_MS`, 5 s–15 min). The snapshot is language-neutral —
  localisation happens per response — and admin writes still call
  `invalidateCatalogCache()`, so an edit shows on the next request of the
  instance that served it. Profile match inputs keep their intentionally short
  TTL (`PROFILE_MATCH_CACHE_TTL_MS`, 15 s default).
* `/api/config/{branding,nav,guide}` now send
  `public, max-age=0, s-maxage=300, stale-while-revalidate=600` through the new
  `publicCacheJson()` helper (`src/lib/apiResponse.ts`). `guide` and `nav` answer
  with a short 30 s window when the config read fails.
* `/api/universities` and `/api/scholarships` stay `private, no-store` **on
  purpose**: their payload carries per-profile match scores and `saved` flags, so
  a shared cache could hand one student another's numbers. Making them publicly
  cacheable would require splitting the anonymous and signed-in payloads — a
  product change, not a header change.
* `/api/health`, `/api/auth/*` and every other API response keep the `no-store`
  that the proxy sets for `/api/*`.

## 5. How to verify

```bash
npm run typecheck
npm run db:schema            # all six areas, idempotent, exit code = state
SEED_ON_REQUEST=off SCHEMA_AUTO_REPAIR=off npm run db:seed   # CLI still seeds
npm run test:security        # retry policy, cache headers, public reads
npm run test:integration     # route behaviour (dev/test seeding still allowed)
```

Admin → System → **Diagnostics** reports `schema.gate` — which areas were
resolved, whether by real DDL or by verification, and which tables a verification
found missing — plus the active seeding policy. `POST` with
`{"action":"retry"}` force-repairs everything.

## Deployment note (Render)

1. Deploy, then run `npm run db:schema` (or press Retry in Diagnostics) **once**.
2. Keep `SCHEMA_AUTO_REPAIR=off` and `SEED_ON_REQUEST=auto`.
3. `/api/health` → `commit` must match the deployed sha; that, not a green CI run,
   is the proof.
