# Telegram channel publisher — Phase 0 reconnaissance (2026-10-26)

Scope: what already exists in the repo, what the channel publisher will reuse
verbatim, and which data the spec assumes but the database does not actually
have. **No product code has been written yet.** Phase 1 starts only after this
report is accepted.

---

## 1. What already exists (and gets reused, not re-written)

| Existing module | What it does today | How the channel publisher uses it |
| --- | --- | --- |
| `src/lib/telegram/api.ts` | `tgCall()` — HTML `sendMessage`, `editMessageText`, `answerCallbackQuery`, `sendChatAction`; honours `429 retry_after` (≤ 5 s) and backs off on 5xx/network for `MAX_TG_ATTEMPTS = 3`; `TELEGRAM_API_BASE` env override for stubs; `toInlineKeyboard()` | Extended with `sendPoll` / `stopPoll`. **Not** duplicated. `TELEGRAM_API_BASE` means the whole publisher is testable without Telegram. |
| `src/lib/telegram/db.ts` + `ddl.ts` | `ensureTelegramTables()` — lazy, idempotent DDL run once per process, 60 s retry on failure; `TELEGRAM_UNAVAILABLE` 503 payload | Same pattern for the six `channel_*` tables: `src/lib/channel/db.ts` + `ddl.ts`, statements split on `;`, mirrored in `supabase/add_channel.sql`, drift-checked by a test (exactly like `scripts/check-telegram.ts` does for `add_telegram.sql`). |
| `src/lib/telegram/settings.ts` | `getBotToken()` (admin-stored encrypted token wins over env), `webhookSecret()` | Channel reads the token through `getBotToken()`; `TELEGRAM_CHANNEL_ID` / `CHANNEL_*` stay env-only as the spec requires. |
| `src/lib/telegram/messaging.ts` | `sendToChat()` (logs to `telegram_messages`, marks 403-blocked chats), `publicSiteUrl()` | Channel keeps its own message log (`channel_posts`), but reuses `publicSiteUrl()` for `CHANNEL_SITE_URL` fallback behaviour. |
| `src/lib/telegram/reminders.ts` | Pure date maths: `localDay(now, tz)`, `calendarDaysUntil(due, now, tz)`, `reminderBucket()`, `DEFAULT_REMINDER_DAYS = [30,14,7,3,1,0]`, `reminderTimezone()` | Urgency rungs 30/14/7/3 are computed with `calendarDaysUntil(..., "Asia/Tashkent")` — no new date library. **Note:** `reminderTimezone()` defaults to UTC, so the channel passes the literal `"Asia/Tashkent"` rather than reading that env var. |
| `src/lib/scholarshipStatus.ts` | `computeScholarshipStatus()`, `statusLabel()`, `expectedPeriodLabel()` — the canonical open/closed/upcoming/rolling/not-announced logic; already renders "oldingi yillar asosida kutilayotgan muddat: taxminan …" in uz | Source of truth for the deadline-quality split. Only change: an optional `now` argument so planning is deterministic and testable (backwards compatible). |
| `src/lib/countries.ts` | Alias registry + ISO/flag map (`EXTRA_COUNTRY_META`, `QS_TOP_200_COUNTRIES`), `countriesMatch()`, `normalizeCountryAlias()` | `country_spotlight` grouping and the "is Uzbekistan eligible?" check. Also the reason no `iso2` fallback is needed. |
| `src/lib/notificationSweep.ts` | `withSweepLock()` — `pg_try_advisory_xact_lock` guard, plus `recordSweep()` marker in `app_config` | Same lock/marker approach for the daily plan and for "one send per planned row" (concurrent cron runs). |
| `src/app/api/cron/notifications/route.ts` | Bearer `CRON_SECRET` via `safeEqual`, 503 when unset, `GET` + `POST`, `maxDuration` | Copy for `GET /api/cron/channel`. |
| `src/app/api/admin/telegram/route.ts` + `src/components/AdminPanel.tsx` (mounts `src/components/admin/TelegramManager.tsx`) | `requireAdmin` + `writeAudit` + rate limiting; admin UI is section managers inside `AdminPanel.tsx` | Read-only channel view: new `src/app/api/admin/channel/route.ts` + `src/components/admin/ChannelManager.tsx` registered as one more section. |
| `scripts/check-telegram.ts` (no DB: pure logic, route-shape security checks, DDL drift, i18n coverage) and `scripts/check-telegram-integration.ts` (embedded Postgres on :55442, `drizzle-kit push`, `fetch` stub capturing every Bot API call) | Two proven harnesses | New `test:channel` (pure) and `test:channel-integration` (DB + stub) follow both, so 429 handling, `<4096` limits, idempotency and concurrency are tested against the real code path. |
| `docs/DEPLOYMENT.md` | Already documents `CRON_SECRET` and the `/api/cron/*` scheduler contract | Gets the channel cron line added. |

### Gaps in the existing Telegram layer that Phase 2/3 must fill

1. **`sendPoll` / `stopPoll` do not exist** in `api.ts` — the poll deck needs both.
2. **`429` with `retry_after > 5` is treated as a hard failure** (`retryDelayMs` returns `null`). Fine for interactive chat, wrong for a bulk channel sender: channel flood-waits are routinely 20–60 s. The channel sender wraps `tgCall` with its own bounded wait (capped at the cron `maxDuration`) instead of changing behaviour the bot's tests already rely on.
3. **Webhook `allowed_updates` is `["message","callback_query","my_chat_member"]`** (`src/app/api/admin/telegram/route.ts:196`). Channel polls are **always anonymous**, so per-user `poll_answer` updates are not available to the bot anyway — the design reads aggregate `voter_count`s from `stopPoll`, which needs no new update type and stores no per-user vote. (`my_chat_member` for the channel is still worth adding so the publisher can detect being demoted.)
4. **`/start` payloads are parsed by `parseStartPayload()`** which only accepts `login|link` + a 16–48 char token. `start=remind_<id>` therefore needs a small, additive extension of the parser and its unit tests — not a second parser.
5. **`computeScholarshipStatus()` reads `new Date()` internally** → optional `now` parameter (see table above).

---

## 2. The data we actually have (`scholarships` in `src/db/schema.ts`)

**Gating columns (all present):** `isActive` (bool), `verificationStatus` (`verified` | `unverified` …),
`lastVerifiedAt` (timestamp), `sourceUrl`, `sourceReliability`, `applicationStatus`.

**Facts (present):** `title`, `provider`, `country`, `description`, `requirements`, `websiteUrl`,
`applicationUrl`, `degreeLevels` (JSON), `eligibleMajors` (JSON), `minGpa`, `minIelts`,
`englishRequirements`, `financialNeedBased`, `meritBased`, `requiredDocuments` (JSON),
`universityId`.

**Money (present):** `coverageType` (free text: `Full Tuition + Stipend`, `Unspecified`, …),
`awardAmount` / `awardCurrency` / `awardPeriod` / `awardBasis`
(`fixed|range|full_tuition|need_based|variable`), `amountUsdValue` (legacy USD only),
`fundingType`, `tuitionCoverage`, `livingAllowance`, `travelAllowance`, `accommodation`,
`applicationFee`.

**Dates (present):** `deadlineDate` (typed `date`), `openingDate`, `deadlineType`
(`exact|range|rolling|multiple_rounds|not_announced|recurring|unknown`),
`deadlineRangeStart/End`, `rounds` (JSON), `recurrence`, `expectedOpeningPeriod`,
`expectedDeadlinePeriod` — plus the legacy free-text `deadline`, which the channel will
**never** parse (typed columns only).

### The four questions the spec left open

| Question | Answer found | Consequence |
| --- | --- | --- |
| Reliable **"fully funded"** field? | **No dedicated column.** The closest documented signal is `awardBasis = "full_tuition"`; `coverageType` is free text (`"Full Tuition + Stipend"` appears in seeds). `fundingType` / `tuitionCoverage` are empty strings everywhere in the seed data. `amountUsdValue` is legacy and explicitly not to be inferred from. | `fully_funded` kind and the `quiz_data` funding quiz are implemented but **self-disabling**: a single strict predicate (`isFullyFunded()` — verified + `awardBasis === "full_tuition"`, optionally `coverageType` matching `/^full tuition/i`) gates them. With today's data that predicate is empty for most rows, so the kind simply produces no posts. If you want it live, the right fix is a new nullable `is_fully_funded` column + admin field — flag it and I will add it as its own small migration. **No guessing from text.** |
| `iso2` | Not a column anywhere. | Flags/ISO come from `src/lib/countries.ts` (`EXTRA_COUNTRY_META`, `QS_TOP_200_COUNTRIES`). Country names for Uzbek text come from `src/i18n/messages/uz.json` → `countryNames` (42 entries) + `countryCompare`/alias registry. Unknown country → the country line is dropped, never transliterated by a heuristic. |
| **Uzbekistan eligibility** | `eligibleCountries` JSON (`[]` = not specified / open to all). Matched with `countriesMatch()`; UZ aliases (`Uzbekistan`, `O'zbekiston`, `Узбекистан`) already exist. | Three-state model: `open` (empty list), `uz_eligible` (list contains UZ), `not_eligible`. Only `open` and `uz_eligible` may be published; a post never says "O'zbekistonliklar uchun" unless the list actually contains Uzbekistan. |
| **slug** | No slug column. | All deep links use `/scholarships/<id>`. Click tracking uses `/r/<opaque code>` → a row in `channel_clicks` resolving to an allow-listed internal path. No user-supplied URL is ever redirected to (no open redirect). |

**Freshness reality check:** in a fresh `npm run seed` DB every scholarship is `unverified`
with `lastVerifiedAt = null`, so the publisher would post nothing — correct, but it means
dev/dryrun needs a seeded verified fixture (Phase 1 test fixture + a `--verified` demo row
in the dev seed helper, not in production seeds). Production-style Supabase patches do set
`verification_status = 'verified'` + recent `last_verified_at` (≈40 rows dated 2026-10-25,
25 dated 2026-10-26 in `supabase/*.sql`), so the real channel has material to work with.

---

## 3. Publishability + deadline-quality model (derived, no new columns)

```
publishable(s) =
      s.isActive
  AND s.verificationStatus === "verified"
  AND s.lastVerifiedAt != null  AND  utcDay(s.lastVerifiedAt) >= today(tz) - 60
  AND s.title / s.provider / s.country non-empty
  AND deadlineQuality(s) !== "stale_exact"        // see below
  AND uzEligibility(s) !== "not_eligible"
```

`deadlineQuality(s)`:

| Case | Classification | Which kinds may use it |
| --- | --- | --- |
| `deadlineDate` set, `deadlineType` `exact` / `range` / `multiple_rounds` with a future end | **exact** | single, fully-funded, urgency rungs 30/14/7/3 + last-day, digest, spotlight, weekly |
| `deadlineType = "rolling"` | **evergreen** | tip/checklist/spotlight/weekly only |
| `not_announced` / `recurring` with `expectedDeadlinePeriod` | **estimated** → text must say `taxminan` / "oldingi yillar asosida" | evergreen + digest with explicit estimate wording; **never** urgency rungs, never "shoshiling" |
| nothing usable, or an exact date in the past | **unknown** | excluded from deadline-driven kinds entirely |

Urgency rungs and the "last day" (`shoshiling`) post require **exact** quality and are
computed with `calendarDaysUntil(deadlineDate, now, "Asia/Tashkent")`, so month/year
boundaries are handled by the existing helper rather than ad-hoc `Date` maths.

---

## 4. What gets built (file layout, first pass)

```
supabase/add_channel.sql                 six tables, identical to the TS DDL
src/lib/channel/ddl.ts, db.ts            lazy bootstrap + drift-checked DDL
src/lib/channel/config.ts                CHANNEL_AUTOPOST / ids / site url, env-only
src/lib/channel/model.ts                 publishable(), deadlineQuality(), isFullyFunded(), uzEligibility()
src/lib/channel/templates/templates.uz.ts  per-kind renderers (HTML escaped, <4096 guard)
src/lib/channel/templates/tips.uz.ts       ≥5 variants
src/lib/channel/templates/checklist.uz.ts  ≥5 variants
src/lib/channel/templates/polls.uz.ts      poll deck (pref, multi, self_assess, this_or_that,
                                           struggle, stage, feedback, quiz_data)
src/lib/channel/lint.ts                  forbidden wording ("kafolat", "100%", …, win promises)
src/lib/channel/plan.ts                  deterministic daily plan + jitter + quiet day
src/lib/channel/select.ts                kind/topic rotation + prefs & click weighting
src/lib/channel/prefs.ts                 0.7*weight + 0.3*(share*optionCount), clamp, budget_bias
src/lib/channel/sender.ts                claim row → send → record, 429/backoff, admin alert
src/lib/channel/redirect.ts              /r/<code> resolution, allow-list
src/app/api/cron/channel/route.ts        Bearer CRON_SECRET
src/app/r/[code]/route.ts                click redirect (counts, never open)
src/app/api/admin/channel/route.ts       read-only view
src/components/admin/ChannelManager.tsx  the view
docs/CHANNEL.md                          ops + the list of uz string files to proofread
scripts/check-channel.ts, check-channel-integration.ts
```

---

## 5. Environment (env-only, added to `.env.example`, documented in `docs/CHANNEL.md`)

`TELEGRAM_BOT_TOKEN` (already), `TELEGRAM_CHANNEL_ID`, `TELEGRAM_ADMIN_CHAT_ID`,
`CHANNEL_AUTOPOST=off|dryrun|on`, `CHANNEL_SITE_URL`,
`CHANNEL_DISCUSSION_ENABLED`, `CRON_SECRET` (already).
Default `CHANNEL_AUTOPOST=off`; `dryrun` sends only to `TELEGRAM_ADMIN_CHAT_ID` and prefixes
`[DRYRUN]`. Nothing is ever posted to the channel until an operator sets `on`.

---

## 6. Test plan mapped onto the existing harnesses

* `npm run test:channel` (no DB, no network — like `check-telegram.ts`): plan determinism,
  urgency across month/year boundaries, gating (inactive / unverified / stale verification /
  `not_eligible`), template lint over **every** variant × partial-data combinations,
  `<4096` + escaping, rotation, poll deck cooldown, quiz correctness (the correct index is
  stored once and re-checked against the text), forbidden wording, prefs formula clamping.
* `npm run test:channel-integration` (embedded Postgres + Bot API stub — like
  `check-telegram-integration.ts`): pending-row-before-send idempotency, two concurrent
  cron runs produce one send, 429 `retry_after` retry, permanent failure → `failed` +
  admin alert, `/r/<code>` abuse (unknown code, external URL, `//evil`, `javascript:`),
  poll update → prefs clamped to 0.5–2.0, `start=remind_<id>` deep link.
* Existing gates stay green: `tsc --noEmit`, `lint`, `check:i18n`, `test:security`.

---

## 7. Decisions taken by default (say the word to change any of them)

1. `fully_funded` ships **gated on `awardBasis === "full_tuition"`** and therefore silent on
   today's data; a dedicated `is_fully_funded` column is a separate, opt-in migration.
2. Poll results come from **`stopPoll` aggregate counts**, not per-user votes (channel polls
   are always anonymous, and this keeps the publisher free of personal data).
3. The channel's clock is the literal `Asia/Tashkent`, independent of `REMINDER_TIMEZONE`.
4. `/r/<code>` redirects **only** to internal paths derived from a stored
   `(kind, scholarship_id)` pair — never to a URL taken from a request parameter.
5. Phase 1 stops at **dryrun**: planning, rendering and logging are live, sending is not.
