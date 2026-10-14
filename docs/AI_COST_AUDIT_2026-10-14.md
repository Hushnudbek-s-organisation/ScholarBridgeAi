# AI cost, budgets, quotas, voice and Premium — audit and changes (2026-10-14)

Branch `arena/e9ee0017-scholarbridgeai` (from `main` @ `4da309f`). Nothing was deployed, no
production data was touched, no real payment setting or price was changed, and no external
billing account was modified. The database changes are additive and must be applied by the
operator (see §B.7).

Legend — **Implemented** = code changed and covered by a test that ran here. **Verified** =
checked against an official source on the date above. **Estimate** = arithmetic on stated
assumptions, not a measurement. **Not done** = deliberately left for the operator or a later task.

---

## A. Audit findings (before the change)

| # | Area | Finding | Evidence |
|---|---|---|---|
| A1 | Cost accounting | `costEstimate: 0` was hard-coded in the OpenAI-compatible and Anthropic adapters. Every row was a fabricated zero. | `src/lib/ai/index.ts` (pre-change) |
| A2 | Cost reporting | The admin dashboard showed "AI xarajati" as `$0` — a verified-looking zero that was never measured. | `AnalyticsDashboard.tsx` |
| A3 | Usage rows | Written by callers, only on success. Failed attempts, retries, and budget refusals left no trace. Visa routes and `callAI` each wrote their own row. | `src/lib/ai.ts`, `visa/chat`, `visa/analyze` |
| A4 | Usage fields | Only prompt and completion tokens. Cached-input tokens were dropped; audio was not represented. | adapters |
| A5 | Bypass | The research agent called OpenAI-compatible endpoints directly (`createAIProvider` + `fetch`): no usage row, no budget, no pricing. | `research-agent/run-university.ts`, `ai/openrouter.ts` |
| A6 | Quotas | Read-then-write: concurrent requests all read "under the limit" and all proceeded. | `ai/quota.ts` (pre-change) |
| A7 | Budgets | None. No platform daily/monthly ceiling and no per-provider cap. | — |
| A8 | Free-plan bypass | `visa/analyze` enforced the free practice cap only when the body contained `profileId`. Omitting it skipped the cap. | `visa/analyze/route.ts` |
| A9 | Anonymous visa AI | `visa/chat` and `visa/analyze` throttled with an in-process limiter (per instance). Anonymous calls had no daily ceiling. | `rate-limit.ts` |
| A10 | Live voice | `POST /api/visa/live-token` had no plan entitlement, no daily allowance, no usage row, and no kill switch. Any signed-in account got unlimited Live tokens. | `visa/live-token/route.ts` |
| A11 | Live voice errors | Provider error text and config state (e.g. "Gemini API key is not configured") were returned to the browser. | `live-token` (pre-change) |
| A12 | Live voice prompt | The applicant name/degree/major in the officer's system prompt came from the request body (client-controlled). `visa/chat` did the same. | both routes |
| A13 | Live reconnect | The Live token is `uses: 1`, but the client reconnected with the same token. Reconnects could not succeed. | `VisaSpeakingAssistant.tsx` |
| A14 | Prices | `PaymentsSection.tsx` and `CheckoutModal.tsx` hard-coded 59 000 / 149 000 / 499 000 UZS as fallbacks. `payments.ts` and `premium/status` duplicated the defaults. | grep |
| A15 | Currency | `payment_currency` was validated (3 letters) but unused; checkout is UZS-only, so `USD` would be a setting that does nothing. | `configPortability.ts`, `payments.ts` |
| A16 | Price validation | A price or duration of `0` was accepted. | `configPortability.ts` |
| A17 | Config staleness | `getConfig` cached for the lifetime of a process. A budget or quota changed on one instance could stay stale on others indefinitely. | `config.ts` |
| A18 | Defaults | `claude-3-5-sonnet-latest` is the Anthropic default. The official deprecation table lists the Claude 3.5 Sonnet models as retired on 2025-10-28. | **Verified** — https://platform.claude.com/docs/en/about-claude/model-deprecations |
| A19 | Admin UX | No screen for quotas, budgets, Live limits or Premium prices. Only the raw config API. | `AdminPanel.tsx` |
| A20 | Typo | `USZ` (prompt) — **not present** in the working tree or in any git history (`git log --all -S USZ` empty). | — |
| A21 | Subscriptions | Period end is fixed at activation (`currentPeriodEnd` written when paid). A price change does not alter existing subscriptions. | `payments.ts` `activateSubscription` |

Model/provider inventory (code defaults, active in code):

| Provider | Default model (code) | Status of that model ID |
|---|---|---|
| openrouter | `meta-llama/llama-3.3-70b-instruct` | Not verified here (OpenRouter prices not fetched) |
| openai | `gpt-4o-mini` | Not verified here |
| anthropic | `claude-3-5-sonnet-latest` → **changed to `claude-sonnet-4-6`** | Old: retired (A18). New: Active in the official table |
| groq | `openai/gpt-oss-120b` | Price `$0.15/$0.60` per 1M from third-party listings (not the Groq page itself) |
| google (chat) | `gemini-3.8-flash` | **Verified** as an official model ID; paid $0.75/$3.75 per 1M through 2026-12-31, then $1.50/$7.50 from 2027-01-01 |
| gemini (voice) | `gemini-3.1-flash-live-preview` | **Verified** as an official model ID; audio $3.00 input / $12.00 output per 1M (= $0.005 / $0.018 per minute) |
| custom | env `AI_CUSTOM_BASE_URL` | Operator-defined |

Tasks → providers: admissions, essay, general, search, document, visa. Routing priority: admin
value → env → auto. Explicit fallback only (`ai_fallback_provider` / `AI_PROVIDER_FALLBACK`).
Per-task *model* selection does **not** exist (the model is per provider).

---

## B. Changes implemented

### B.1 Cost accounting (Implemented; tests: `check-ai-cost` 58 assertions, `check-integration` §13)

- `src/lib/ai/pricing.ts` (new, pure). Prices are an admin-entered JSON table in `app_config`
  (`ai_model_pricing`, USD per 1M tokens, optional cached-input price). **No price is shipped**;
  the default is `{}`, so until an administrator enters one, cost is reported as
  *no price configured* — never as zero.
- Every logical request ends with one of four statuses: `provider_reported` (OpenRouter
  `usage.cost`, requested with `usage: {include: true}`), `estimated` (tokens × configured price),
  `unknown_pricing`, `usage_unreported` (no usage metadata; tokens and cost unknown).
- Adapters return usage only. `costEstimate: 0` is removed. The router decides cost in one place
  (`costForUsage`). Anthropic cache reads and writes are folded into the prompt total; cache
  reads are priced at the cached rate. Cache writes are billed at the input rate in estimates,
  which **underestimates** Anthropic's cache-write premium (documented limitation).
- **Single usage writer.** `callAI`, `visa/chat` and `visa/analyze` no longer write `ai_usage`
  rows; the router writes exactly one row per logical request — success, failure, or a budget
  refusal — with `attempts`, `fallback_used`, `error_category`, `cached_prompt_tokens`, `cost_status`.
  Retries therefore never duplicate a row.
- Research agent: its AI calls now go through `aiChat` (task `document`) — priced, budget-gated and
  logged (A5).
- Analytics: the cost total sums only known costs. Successful requests without a known cost are
  counted separately, and the dashboard shows "N requests without a price" instead of `$0`.
  Rounding keeps 4 decimals (one decimal turned real small costs into 0).
- Migration `supabase/add_ai_cost_accounting.sql` — additive (`ADD COLUMN IF NOT EXISTS`,
  `CREATE INDEX IF NOT EXISTS`). Legacy rows get `cost_status = 'unknown'`, so their 0 is not
  presented as a measured zero. Rollback notes are inside the file.

### B.2 Budgets (Implemented; tests: `check-ai-cost` + `check-integration` §13)

- Keys (Admin → AI → Cost, budgets & quotas): `ai_budget_daily_usd` (UTC day),
  `ai_budget_monthly_usd` (UTC month), `ai_budget_provider_daily_usd` (JSON per provider),
  `ai_budget_warn_percent`. Value semantics: `""` = no limit, `0` = block paid AI in that scope,
  `n` = block once counted spend reaches `n` USD.
- Enforced by the router **before every paid attempt**, including retries and the fallback, so a
  retry chain cannot keep spending after the limit is crossed.
- Refusal is `budget_exhausted` (HTTP 503). Students see a neutral message with no amounts or
  billing words. The refusal is recorded as a usage row (`error_category = budget_exhausted`).
- Warnings are logged (structured, throttled to once a minute per process) when a scope reaches
  the warn percentage.
- Failure mode (documented, deliberate): if the budget or usage tables cannot be read, the gate
  **allows** the call and logs `ai_budget_unavailable`. Usage rows cannot be written in that state
  either; blocking would turn a database outage into a full AI outage.
- Defaults `10 USD/day` and `150 USD/month` are **placeholders** for the operator to replace before
  launch. Spend counts only known costs, so the budget protects nothing until prices are entered
  (see §J).

### B.3 Quotas and concurrency (Implemented; tests: `check-integration` §13 "10 concurrent → exactly 3")

- Request admission is **exact under concurrency**. The per-account check reads committed usage
  first, then reserves one slot with `reserveSharedSlot`: a per-key transaction-scoped advisory
  lock serialises count-and-insert. At most `limit` admissions per window, however many requests
  race. A rejected attempt is not recorded, so it cannot use up the allowance.
- Token quotas are checked against committed usage. A burst can overshoot the token limit by at
  most the tokens of requests in flight. The platform budget is the hard cost ceiling. This is
  documented, not eliminated.
- Admitted requests count, including ones that fail after admission. This bounds paid attempts.
- Limits are unchanged: free 5 req / 20 000 tokens per day; premium 200 req / 500 000 tokens per
  day (see §E for the recommended test values).

### B.4 Voice — Gemini Live (Implemented; tests: `check-integration` §13, `check-ai-cost` wiring)

- Entitlement: Live voice is a Premium feature. Free default **0**; premium default **2 sessions/day**
  (admin-editable). One session = one minted token.
- Platform-wide daily cap `ai_live_global_sessions_per_day` (default 30; 0 = off for everyone).
  Live spend is invisible to the token budget, so this cap is the control that bounds it.
- Kill switch `ai_live_voice_enabled`. When off, the browser uses text practice (existing fallback).
- Session cap `ai_live_session_max_minutes` (default 10). The browser ends the Live session at
  the cap and continues in text practice. **Server-side session length cannot be enforced by a
  Gemini token** (it bounds session start, not duration).
- Allowance is checked read-only before minting, and reserved only after a token exists. A failed
  attempt (no key, Gemini error) does not use up the allowance.
- Reconnect requests a **new** token. Quota and capacity refusals stop reconnect loops and fall
  back to text with a localized reason (en/ru/uz keys added).
- Applicant context is taken from the signed-in profile, not the request body (A12), in both
  `visa/chat` and `live-token`.
- Errors are generic (no provider text, no config state) (A11). Provider detail goes to logs only.
- Each admitted session writes one `ai_usage` row (`task = visa_live`, `cost_status =
  usage_unreported`), because audio billing is not visible in the response.
- Visa practice: the free cap is keyed on the **session**, not the request body (A8). Visa
  throttles moved to the shared store (A9).

### B.5 Premium pricing — single source, validation (Implemented; tests: `check-ai-cost`, `check-portability`, `check-payments`)

- Single source of defaults: `CONFIG_DEFAULTS` in `src/lib/config.ts`. The duplicated literals in
  `payments.ts` and `premium/status` now read from it. No other file contains a price literal.
- Checkout UI (`PaymentsSection`, `CheckoutModal`) shows only server-provided prices. If none are
  loaded, purchase is disabled and nothing is shown as a price (A14).
- `payment_currency` must be `UZS` (A15). Premium prices must be 1 … 100 000 000 UZS and days
  1 … 3650 (A16).
- Existing prices are **unchanged**: monthly 59 000 / 30 d, season 149 000 / 90 d, yearly 499 000 /
  365 d. The test hypothesis (39 000 / 99 000 / 329 000) was **not** applied (see §F).
- Config staleness: `getConfig` / `getStoredConfig` now expire after 30 s, so a change reaches every
  instance within that window (A17). The saving instance updates immediately.

### B.6 Admin UX (Implemented; tests: structural only)

- Admin → AI tab: **Spend & budgets** (today / month vs limits, known USD vs. requests without a
  price, per-provider and per-task tables, unpriced models in use, failure categories), **Platform
  budgets**, **Model prices** (JSON with client pre-check, server validation on save), **Quotas &
  voice**.
- Admin → Premium tab: **Premium prices** (UZS, positive integers, server-validated).
- Every save goes through `PUT /api/admin/config` (allowlisted and validated server-side). No secret
  is returned by the new `GET /api/admin/ai-costs`.
- **Not verified in a browser.** The panels typecheck and lint, but I did not open the admin
  screens. The panel text is English, matching the AI tab; the analytics tile is in Uzbek like the
  rest of that dashboard.

### B.7 Database — operator action required

Run `supabase/add_ai_cost_accounting.sql` once (additive). The schema tests build the database
from `src/db/schema.ts`; production uses the SQL patch. Nothing was applied to any database
outside the embedded test instances.

---

## C. Providers, models and routing

- Verified against official sources (2026-10-14): Gemini model IDs `gemini-3.8-flash` and
  `gemini-3.1-flash-live-preview`, with their paid prices (see the table in §A); Anthropic's
  deprecation status for Claude 3.5 Sonnet (retired) and Sonnet 4.6 (Active).
- Changed default: Anthropic `claude-3-5-sonnet-latest` → `claude-sonnet-4-6`. Same tier as before
  (Sonnet). The `anthropic` provider is only used when an administrator selects it or it is
  auto-selected with a key present. **This is a default change for deployments that rely on the
  default; confirm it.**
- Not verified here: OpenAI `gpt-4o-mini` and OpenRouter default-model prices and availability.
  No prices were invented for them.
- Routing: admin value → env → auto, unchanged. Explicit fallback only; fallback replies are labelled
  `…:fallback` and recorded (`fallback_used`).
- Not done: a per-task *model* override. Models are still chosen per provider. Adding per-task
  models is a small follow-up, but it changes the admin contract, so I did not do it here.
- Not done: automatic fallback on budget exhaustion. A budget-blocked request does not reach
  another provider, by design.

---

## D. Cost accounting — what the numbers mean

| Status | Meaning | Counts in USD totals |
|---|---|---|
| provider_reported | Provider billed this USD amount (OpenRouter) | yes |
| estimated | Tokens × admin-entered price | yes |
| unknown_pricing | Tokens known; no price entered | no — counted separately |
| usage_unreported | No usage metadata, or failed before the provider replied | no — counted separately |
| unknown (legacy) | Row written before this change | no |

Live voice rows are `usage_unreported`. Their real cost is **not** in the USD totals. §H estimates
it, and §J lists it as the largest residual gap.

---

## E. Quotas and budgets — recommendations

| Setting | Code default (unchanged) | Your test value | Recommendation |
|---|---|---|---|
| Free AI requests / day | 5 | 5 | keep |
| Free tokens / day | 20 000 | 20 000 | keep |
| Premium AI requests / day | 200 | 30 | **decide.** 200 is generous; 30 is the test value |
| Premium tokens / day | 500 000 | 100 000 | **decide.** At the cheapest listed text price, 500k tokens/day is about $5.6 per 30 days worst case (≈ the monthly price). 100k is about $1.1 |
| Platform daily budget | 10 USD (placeholder) | — | set from your real prices and expected traffic |
| Platform monthly budget | 150 USD (placeholder) | — | same |

I did **not** change the premium quota defaults. Changing a paying entitlement is a product decision.
They are one admin edit away (Admin → AI → Quotas & voice).

---

## F. Premium configuration

- **Authoritative source:** `app_config` (saved by an administrator). Repo fallback:
  `CONFIG_DEFAULTS`. Nothing else holds a price.
- **Current active values** (repo defaults, used until an administrator saves a change):
  monthly 59 000 UZS / 30 d; season 149 000 / 90 d; yearly 499 000 / 365 d; currency UZS.
- **Test hypothesis** (not applied): monthly 39 000 / 30 d; 3 months 99 000 / 90 d; yearly 329 000 / 365 d.
  Enter them in Admin → Premium → Premium prices only after the owner approves, and expect them to
  change what new customers pay.
- **`USZ`:** not found anywhere in the repository or its history. Nothing to fix.
- Subscriptions keep their period (A21), so a price change affects new payments only.
- Plans not yet live must not be shown as purchasable. The UI shows only the plans the server sends.
  Nothing new was made purchasable.
- Payment gateway fees, VAT and any merchant commission are **not in this repository**. They are
  excluded from §H and must be taken from the Payme/Click merchant contracts.

---

## G. Voice — browser vs. Gemini Live

- **Ordinary chat:** no voice input or output was added. The app uses typed chat only.
- **Visa practice:** browser speech recognition and synthesis remain the fallback for every
  failure path (kill switch, quota, plan, provider error, session cap). Text practice remains
  available. Gemini Live is server-minted, short-lived, single-session, and gated by plan,
  allowance, a platform cap and an hourly per-account limit. Live spend is not in the budget (§J).

---

## H. Financial scenarios (estimates — read the assumptions)

**Assumptions (all stated, none measured):**

- FX: **11 899.09 UZS per USD**, Central Bank of Uzbekistan, shown on cbu.uz for 13 Oct 2026.
- Revenue per paying user: **59 000 UZS per 30 days = $4.96/month** (current monthly plan). The
  season and yearly plans average $4.17 and $3.45 per month respectively.
- Text AI (typical): 60 requests/month × (1 000 prompt + 500 completion tokens) on
  `openai/gpt-oss-120b` at $0.15 / $0.60 per 1M (third-party listing) = **$0.027/month**.
- Text AI (heavy): 500 000 tokens/day, blended 1:1 prompt/completion, same model = **$5.63/month**.
- Live voice: $0.005/min audio input + $0.018/min audio output (official paid-tier row) = **$0.115
  per 10-minute session** at a 50/50 split. Typical user = 1 session/week (4.33/month) =
  **$0.50/month**. Heavy user = 2 sessions/day = **$6.90/month**.
- Excluded: payment gateway and merchant fees, VAT/tax, refunds, hosting, storage, support, staff,
  and every model other than the one above. Break-even on fixed costs cannot be computed without
  those.

| Registered | Conversion | Paying users | Revenue / month (USD) | AI cost, typical (USD) | AI cost, heavy (USD) | Contribution, typical (USD) |
|---:|---:|---:|---:|---:|---:|---:|
| 100 | 2 % | 2 | 9.92 | 1.05 | 25.05 | 8.87 |
| 100 | 3 % | 3 | 14.88 | 1.57 | 37.58 | 13.30 |
| 500 | 2 % | 10 | 49.58 | 5.25 | 125.25 | 44.33 |
| 500 | 3 % | 15 | 74.38 | 7.87 | 187.88 | 66.50 |
| 1 000 | 2 % | 20 | 99.17 | 10.50 | 250.50 | 88.67 |
| 1 000 | 3 % | 30 | 148.75 | 15.75 | 375.75 | 133.00 |

**Reading the table:**

- Typical use leaves a large contribution margin *before* gateway fees and fixed costs.
- A **heavy** premium user (full daily token quota plus two Live sessions a day) costs about
  **$12.5/month** against $4.96 revenue. That loss is the reason to set the premium quotas and the
  Live allowance deliberately.
- **Free-account Live exposure:** had the free Live allowance stayed at 1/day, 10 % of ~980 free
  accounts using it daily would cost about **$338/month** (`980 × 0.10 × 30 × $0.115`). This is why
  the free default is now 0.
- **Break-even:** paying users needed = fixed monthly cost ÷ (price − variable AI cost). At typical
  use the denominator is about $4.4 per user. Fixed costs are not in this repository.
- Model-price sensitivity: text AI costs scale with the price you enter. A premium-tier text model
  can cost one to two orders of magnitude more than `gpt-oss-120b`. Re-run these numbers with your
  real model prices before choosing quotas.

---

## I. Test results (this branch, 2026-10-14)

All commands run in this sandbox against the code at HEAD of the working tree.

| Command | Result |
|---|---|
| `npm run typecheck` (`tsc --noEmit`) | pass |
| `npm run lint:baseline` | pass — no new or worsened problems (39 pre-existing baselined) |
| `npm run build` (production) | pass |
| `npm run test:ai-cost` (new) | **58/58 pass** |
| `npm run test:ai-settings` | pass (83) |
| `npm run test:ai-format` | pass (40) |
| `npm run test:security` | pass (76) |
| `npm run test:schema` | pass (offline; documents all 1 046 columns) |
| `npm run test:schema-apply-safety` | pass |
| `npm run test:portability` | pass (57) |
| `npm run test:integration` (embedded Postgres) | **289/289 pass** (baseline before changes: 267/267) |
| `npm run test:payments` | pass (82) |
| `npm run test:groq`, `test:calculations`, `test:costs`, `test:referral` | pass |
| `npm run test:responsive`, `test:dark`, `check:i18n`, `test:match` | pass |
| `test:ownership`, `test:telegram-integration`, `test:journey`, `test:chancing`, `test:recommend`, `test:opportunities`, `test:career-discovery`, `test:arrival`, `test:streak` (embedded Postgres) | all pass |
| `scripts/research-agent-ai-tests.ts` (not wired to an npm script) | pass |
| `API_BASE_URL=… npm run test:api-security` against `next start` **without a database** | pass, 244 handlers probed (many answer 503 before auth — weaker than a full run) |

**Test changes (no assertions weakened):**

- Two existing `check-integration` analysis calls were using the student's cookie by accident
  (the `call()` helper always attaches it). They made a free account exceed its practice cap, which
  is the bypass that A8 describes. They are now true anonymous requests. Their assertions are
  unchanged.
- The §13 quota and Live assertions were written for the final semantics (rejected or failed
  attempts do not count).

**Known gaps in the test evidence:**

- No browser test of the voice flow or the admin panels.
- The Gemini Live path was tested only up to the key check (no key in tests, no network).
- The budget **block** path was tested with a real priced mock provider, but concurrency at the
  budget edge (in-flight overshoot) was not tested.

---

## J. Remaining risks (ranked)

1. **Live voice spend is invisible to the budget.** Live audio is billed by Gemini per second and
   is not returned in responses. The platform budget does not see it. Mitigations: free allowance 0,
   daily platform cap of 30, session length cap of 10 minutes (browser-enforced). A monthly Live
   cap and a per-session cost estimate are the next controls to add.
2. **Prices are empty by default.** Until an administrator enters them, every cost is "no price
   configured" and the budgets are inert. **Enter prices before launch.**
3. **Budget placeholders** (10 USD/day, 150 USD/month) are not a decision. Set real values.
4. **Token quota overshoot under bursts** is bounded by in-flight tokens, not eliminated.
5. **Server-side session length** for Live cannot be enforced by a Gemini token. The cap is
   browser-enforced.
6. **Fail-open budget gate** when the database is unreachable (deliberate; logged).
7. **Anonymous visa practice** (chat/analyze) has per-IP limits and the platform budget, but no daily
   per-IP ceiling.
8. **Entitlement inconsistency, unresolved:** `evaluate-profile` (the dashboard's "AI audit") has no
   feature gate, while the product matrix in `entitlements.ts` describes "deep profile audit" as
   Premium. This is a product decision. I did not change it.
9. **Anthropic cache writes** are billed at the input rate in estimates. The real rate is higher.
10. **Admin visibility gaps:** no per-plan (free vs. premium) split in the report (the plan at request
    time is not stored); no count of quota denials (only logs).
11. **Multi-instance:** config changes take up to 30 s to reach other instances; the in-process
    limiters still exist for ordinary writes (by design, as documented in `rate-limit.ts`).
12. **Payment fees and taxes** are not modelled.

---

## K. Next steps

**Operator decisions (before launch):**

1. Enter model prices in Admin → AI → Model prices, from current provider price lists (verify each).
2. Set platform daily and monthly budgets from the prices and expected traffic.
3. Decide the premium AI and token quotas (§E) and the Live allowance (§B.4).
4. Confirm the Anthropic default change (§C).
5. Confirm the Live default change (free 0, premium 2/day, platform 30/day, 10-minute cap).
6. Apply `supabase/add_ai_cost_accounting.sql`. Verify the admin AI tab renders with real data.
7. Verify the Premium prices and decide whether to adopt the test hypothesis (§F).

**Engineering follow-ups (not in this change):**

- Per-task model override (admin contract change).
- Monthly Live minutes cap and a per-session Live cost estimate fed into the budget.
- Per-plan split in the cost report (store the plan on each usage row).
- Browser end-to-end test of the voice path and the admin panels.
- Decide the `evaluate-profile` entitlement (§J.8).

No deploy, no production data change, no external billing change was made.
