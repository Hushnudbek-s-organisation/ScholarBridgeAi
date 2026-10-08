# Functional audit — payments, premium & integrations (2026‑10‑07)

Scope: **functional correctness** — API ↔ frontend contracts, real user journeys,
AI integration, university/scholarship matching, Telegram, payments, production
configuration. Database architecture, schema, migrations and ORM were **not
touched**.

Everything below was verified against a real running stack, not by reading code:
an embedded PostgreSQL (`npm run db:dev:init`), the Next.js dev server on
:3000, and the repository's own Telegram Bot API mock
(`scripts/telegram-mock.mjs`). Every "reproduced" claim below names the request
that produced it.

---

## 1. What was verified working

Legend — ✓ verified · ⚠ partially verified · ? needs a real external service · ✗ broken

### User journeys driven end to end over HTTP

| Flow | Result | Evidence |
|---|---|---|
| A — register → profile → dashboard → universities → scholarships → save → application → task → complete task → deadline center → next actions | ✓ | every step returned 2xx; dashboard progress and `next-actions` updated after the activity |
| B — profile → AI chat → AI admissions advisor → profile evaluation | ✓ | all three return 200 with no provider key configured, and each labels its output honestly (`offline: true`, `aiUsed: false`) |
| C — essay version → SOP draft → review | ✓ | `POST /api/essays` → `{version:{id:1,…}}`, `POST /api/ai/draft-sop` returns a deterministic draft with no provider |
| D — free → Premium-gated → Payme season purchase → unlocked | ✓ | see §2 below; 12/12 assertions |
| E — website link → Telegram → account identified → search → notification delivered | ✓ | full round trip through the bot mock, including a real delivered reminder |
| F — scholarship matching → save → deadline → tracking | ✓ | 8 scholarships scored, saved item appears in the deadline center, sweep + cron produce notifications |

### API surface

All 131 route modules were exercised. Every GET route reachable by a signed-in
student returns 2xx except where a gate or a required parameter applies:

* `403 premium_required` — `/api/essays`, `/api/essays/reviews` (`ai_essay`),
  `/api/certificates` (`courses_full`). Correct, and the corresponding UI
  (`MyCertificatesPanel`) renders an honest upgrade state for exactly this code.
* `400` — `/api/parent-share` (needs a real share token), `/api/requirements`
  (needs `applicationId`). Correct.
* `405` — `/api/deadlines`, `/api/essay-adapter`, `/api/programs/recommend`,
  `/api/roadmap/generate`, `/api/track`: these are POST/PUT-only. The frontend
  never GETs them, so there is no broken call.

No orphan UI and no orphan API were found. Every `/api/...` path referenced from
a component resolves to an existing route, and the request/response shapes match
(e.g. `POST /api/essays` → `version`, read by `EssayRubricStudio`;
`POST /api/vault/documents` → `title`, sent by `PreparePanels`;
`POST /api/admin/universities` → `{ adminProfileId, university }`, sent by
`UniversitiesManager`).

### Matching, chancing, scholarship engines

* `npm run test:match` — 74 assertions ✓
* `npm run test:chancing` — 64 assertions ✓
* **Unknown never becomes false.** Live check with a completely empty profile:
  it still receives 12 universities, is never *credited* with a requirement it
  never answered (0 false "meets/above/eligible" reasons), and is never told it
  fails a requirement the *university* left unpublished.
* **Explanations match the scoring.** For a filled profile, every emitted reason
  was checked against the underlying data: `GPA 3.90` (profile = 3.9),
  `IELTS 8` (profile = 8), `SAT 1500` (profile = 1500), and every
  "fits your budget" claim against `tuition + living ≤ budget`. No invented
  reason was produced.
* **Admission probability stays unavailable.** `ADMISSION_PROBABILITY.available`
  is `false`, `/api/chancing` exposes no numeric admission range, and the advisor
  brief/prompt/guard all forbid it (`test:chancing` asserts this).
* Degree-level filtering is correct: the seeded catalog is 4 Master-only +
  8 "All", so a `Bachelor` profile correctly sees 8, not 12.

> **Note on a rule that looks like a bug but is not.** A student with no English
> test is told *"IELTS 7.5 required — you don't have an IELTS score yet"* and
> scored down. That is deliberate and documented in `src/lib/matching.ts`: the
> university's requirement is known, the student's test genuinely does not
> exist, and the alternative-test case (TOEFL/Duolingo) is handled separately
> with a much smaller penalty. `scripts/check-match.ts:114` pins this behaviour.

### Telegram

Verified live through the bot mock (no real Telegram account needed):

* website `POST /api/auth/telegram/start` → one-time deep link with a token
* bot `/start link_<token>` → "Connect to **Name** (e•••@mail)?" + Connect/Cancel
* `[Connect]` → link created, website poll reports `status: "used"`
* `/universities` → the same match scores as the website (99% / 97% / …)
* `/account` → `Plan: Premium`, identical to `/api/premium/status`
* `/advisor` → answered, labelled offline
* admin `POST /api/admin/telegram {action:"setWebhook"}` → registered, audited
* sweep + `GET /api/cron/notifications` → a real notification **delivered to the
  linked chat**; the cron rejects a missing secret with 401

**No premium leak over Telegram.** Every data command goes through
`src/lib/telegram/appAdapter.ts`, which calls the *same* route handlers with a
short-lived `tg1` channel token, so entitlements, quotas and rate limits are the
website's. `/advisor` returned the same offline-labelled answer the website gets.

### Admin

Sign-in, `overview`, `profiles`, `audit`, `telegram` (status/setWebhook) and
full catalog CRUD all verified: create → update → delete a university and a
scholarship, with the change appearing in the audit log. A non-admin gets 403 and
an anonymous caller 401 on the same routes.

### Production configuration

* `npx next build` — succeeds (exit 0), all 131 routes compiled.
* `npm run test:render` — 162 assertions ✓ (deployment/env portability)
* No hardcoded localhost in a user-facing path. `APP_URL` →
  `NEXT_PUBLIC_APP_URL` → `RENDER_EXTERNAL_URL` → `VERCEL_PROJECT_PRODUCTION_URL`
  → `""` with graceful degradation; `src/lib/clientUrl.ts` rewrites a loopback
  origin to the origin the browser is actually on.
* `npm run check:i18n` — 2788 keys, full en/uz/ru parity, 1752 `t()` call sites
  all resolving.

---

## 2. Bugs found and fixed

### 2.1 Payme could not sell the season or yearly package — HIGH ✗→✓

* **File** `src/lib/payments.ts` → `handlePaymeRequest`
* **Route** `POST /api/payments/payme/webhook`
* **Reproduced** `POST /api/payments/initiate {package:"season"}` creates a
  149 000 UZS pending payment; Payme's next call
  `CheckPerformTransaction {amount: 14900000}` returned
  `{"error":{"code":-31001,"message":"Invalid amount"}}`. Same for `yearly`.
  Only `monthly` (59 000) was accepted.
* **Root cause** `CheckPerformTransaction` compared the callback amount against
  `getPremiumPriceUzs()` — the *monthly* price only. Payme sends no package id,
  so the amount *is* the package identifier and must be matched against every
  configured price. Because `PaymentsSection` defaults to the **season**
  package, the website's default Payme checkout failed outright.
* **Second defect, same handler** `CreateTransaction` hardcoded
  `purpose: "premium"`. Even if the amount check had passed, a yearly payment
  would have granted 30 days instead of 365 (`activateSubscription` →
  `periodDaysForPurpose`).
* **Third defect, same flow** `CreateTransaction` always inserted a *new* row
  while the row from `/api/payments/initiate` stayed `pending` with an empty
  `provider_transaction_id` forever — one permanent phantom "pending" line in the
  payment history per purchase.
* **Fix** (smallest safe change, no schema/provider change)
  * `allPremiumPackages()` / `packageForAmountUzs()` — resolve the package from
    the live, admin-configurable prices.
  * `ORDER_KEY = "order_id"` added to the checkout `account` object in
    `POST /api/payments/initiate`, and `findPendingInitiatedPayment()` links the
    callback back to that exact row (strict: same profile, still pending, same
    amount). This preserves the chosen `purpose` and removes the phantom row.
  * `CheckPerformTransaction` accepts any configured package price and echoes the
    real `purpose`; `CreateTransaction` keeps the initiate row's purpose, falling
    back to the amount-derived package when no `order_id` is present.
* **Verification** `npm run test:payments` — 82 assertions, plus a live FLOW D run
  (12/12): season checkout → `allow: true` → paid → 90-day subscription → the
  gated `/api/essays` and `/api/certificates` open → history shows one paid row
  and no pending twin. **Click was already correct** for all three packages
  (verified before and after) and is unchanged.
* **Regression guard proven real**: reverting only the buggy behaviour (keeping
  the new helpers) makes the suite fail **31** assertions, at exactly
  `-31001`, `purpose: "premium"` for a yearly payment, and 30-days-instead-of-365.

### 2.2 Stacked purchases reported the shortest window — HIGH ✗→✓

* **File** `src/lib/payments.ts` → `findActiveSubscription`
* **Consumers** `src/lib/premium.ts` (`getPremiumStatus`),
  `GET /api/payments`, `GET /api/admin/profiles`, Telegram `/account`
* **Reproduced** one account with 4 active subscriptions of 30 / 30 / 90 / 365
  days; `student_profiles.premium_until` correctly held the 365-day date, but
  `GET /api/premium/status` returned
  `"premiumUntil":"2026-11-06T15:47:21.436Z"` — 30 days.
* **Root cause** the query ordered by `subscriptions.id`, i.e. the **oldest**
  row, so the first (shortest) purchase defined the visible expiry. A student who
  bought the yearly plan on top of a monthly one was told Premium ended in
  30 days.
* **Fix** order by `current_period_end DESC, id DESC` — the window that ends
  last. This is exactly the `Math.max` union `activateSubscription` already
  mirrors onto `student_profiles.premium_until`, so the three consumers now agree
  with the profile column instead of contradicting it.
* **Verification** `test:payments` §6; live `GET /api/premium/status` now returns
  the 365-day date; `test:referral` (56 assertions) still passes, since the
  referral path shares this helper.

### 2.3 One hardcoded string inside an already-translated component — LOW ✗→✓

* **File** `src/components/CheckoutModal.tsx:47,61`
* **Root cause** the modal is fully translated through `useTranslations("payments")`
  except its checkout-failure message, which was an English literal — an Uzbek- or
  Russian-speaking student saw one English line in an otherwise translated dialog.
* **Fix** new `payments.checkoutFailed` key in `en/uz/ru` (one line per file) and
  `t("checkoutFailed")` at both call sites. Existing precedence
  (`data.error || fallback`) is unchanged.
* **Verification** `npm run check:i18n` — passes, key parity intact, call sites
  1750 → 1752.

---

## 3. Known gaps reported, deliberately not changed

### 3.1 16 student-facing components never call `t()` — HIGH (remaining work)

`npm run check:i18n` passes because every `t()` **call site** resolves; it cannot
see components that contain no `t()` at all. These are English-only for en/uz/ru
users:

`AiChatMentor`, `AiSopStudio`, `ApplicationTracker`, `ConsultingSection`,
`DeadlineCenter`, `DocumentChecklist`, `EssayRubricStudio`, `FaqSection`,
`MentorMarketplace`, `NextActionsPanel`, `ParentDashboard`, `PlanningStudio`,
`PremiumGate`, `SimilarProfiles`, `TaskRoadmap`, `journey/ApplicationWorkspacePanel`

Not fixed here: this is ~hundreds of new keys × 3 locales across 16 components —
a translation *project*, not a missing-translation fix, and it would collide with
the UI/UX workstream. The admin components in the same list were left alone on
the assumption that the admin panel is intentionally English-only (no such policy
is written down — worth confirming).

### 3.2 `npm run lint:baseline` fails on pristine HEAD — MEDIUM (not from this audit)

`npx tsx scripts/check-lint-baseline.ts` exits **1** with exactly one new-or-worsened
problem:

```
✗ src/components/journey/ExplorePanels.tsx — react-hooks/set-state-in-effect: 0 → 1  (NEW FILE)
```

Verified by stashing this audit's changes and re-running the gate on the clean
branch point `48068e9`: **the same failure, same exit code**. `ExplorePanels.tsx`
is untouched here and is not mentioned in `lint-baseline.json` (it arrived with
PR #56 without a baseline update). The other 50 issues are inside the recorded
baseline. This audit's own changes add **zero** new lint problems (51 before, 51
after). Left alone: it is a React-hooks code-quality item in a journey panel,
outside this scope.

### 3.3 Overlapping paid windows overlap rather than extend — MEDIUM (product call)

`activateSubscription` starts each new subscription at *now*, so buying a second
monthly plan a week before the first expires yields two overlapping 30-day
windows, not 60 consecutive days. `student_profiles.premium_until` takes the
`Math.max`, so the student loses the unused days. This is a **product decision**
(extend-on-renew vs. restart), not an unambiguous defect, so it was left alone.
§2.2 already removed the wrong *display*; changing the grant semantics needs a
product answer first.

---

## 4. Requires real external services (code-verified only)

| Item | Status |
|---|---|
| Payme production callbacks | ⚠ Code-verified against Payme's documented JSON-RPC contract with a locally signed Basic-auth header. **The `account.order_id` echo-back is the one assumption that needs a real merchant sandbox** — if Payme ever strips unknown `account` fields, the amount-based fallback still resolves the correct package and length, so the failure mode is a phantom pending row, never a wrong grant. |
| Click callbacks | ✓ Code-verified with correctly MD5-signed `prepare`/`complete` for all three packages. Needs a real merchant for the live 2-step redirect. |
| Telegram Bot API | ✓ Verified against `scripts/telegram-mock.mjs`. A real bot is needed only for webhook reachability over public HTTPS and Mini App `initData` signed by Telegram. |
| AI providers | ⚠ No provider key was configured, so only the `not_configured` → fallback path was exercised (it is correct and honestly labelled). Model replies, timeouts, quota exhaustion mid-call and provider fallback need real keys. |
| Supabase RLS / production DB | ⚠ `test:portability` (57) and `test:schema-repair` (15) pass against embedded Postgres; the live Supabase project was not reachable. |

---

## 5. How to reproduce

```bash
npm ci
npm run db:dev:init          # embedded Postgres + schema + seed
npm run dev                  # in another terminal
npm run test:payments        # the new suite: 82 assertions
node scripts/check-i18n.mjs
npx tsc --noEmit && npx next build
```

`scripts/telegram-mock.mjs` provides the fake Bot API used for the Telegram
flows (`TELEGRAM_API_BASE=http://127.0.0.1:8099`,
`TG_MOCK_FORWARD_TO=http://127.0.0.1:3000`).
