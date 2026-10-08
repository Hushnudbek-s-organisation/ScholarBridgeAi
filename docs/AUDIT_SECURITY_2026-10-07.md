# Security & quality audit (2026‑10‑07)

Scope: **security, authorization, input/SSRF safety, dependencies, testing
quality, frontend reliability, accessibility, responsive behaviour, code
quality, observability.** Database architecture, schema, migrations and the ORM
were **not** touched.

Everything marked ✓ was executed against a real stack — embedded PostgreSQL
(`npm run db:dev:init`), the Next dev server, and `next start` for the
production-header checks. Claims that could not be executed here are marked ⚠ or
? rather than asserted.

---

## A. Security status

Overall **good**. The app already had defence in depth that most codebases lack:
signed HttpOnly session cookies, server-side entitlement checks on every premium
route, a nonce-based CSP, RLS, an SSRF guard, and a lint gate. **Two real
vulnerabilities were found and fixed** (one SSRF bypass that reached the live
cloud metadata endpoint, one unguarded redirect chain), plus **2 high-severity
production dependency CVEs**, a **CI-blocking lint failure**, an **absent app
error boundary**, and a set of accessibility gaps.

---

## B. Confirmed security vulnerabilities (found and fixed)

### 🟠 HIGH — SSRF guard bypassed by IPv4-mapped IPv6 in hex form

* **File** `src/lib/ssrf.ts` → `isInternalLiteralIp`
* **Consumers** `src/lib/research-agent/fetch.ts`, `providers.ts`
* **Problem** `http://[::ffff:127.0.0.1]/` and `http://[::ffff:a9fe:a9fe]/`
  passed the guard (`unsafeOutboundReason` returned `null`).
* **Root cause** WHATWG URL parsing — what Node and every browser do —
  **normalises** `[::ffff:127.0.0.1]` to the host string `::ffff:7f00:1`. The
  guard only understood the *dotted* spelling
  (`/::ffff:(\d+\.\d+\.\d+\.\d+)$/`), so the hex form fell through to
  `return false` and was treated as a safe public host.
* **Exploited, not theoretical.** Run in this environment:
  * `http://[::ffff:127.0.0.1]:3000/api/health` → guard `null`, **HTTP 200
    `{"ok":true}`** from the app's own loopback.
  * `http://[::ffff:a9fe:a9fe]/` → guard `null`, **HTTP 401 "No MMDS token
    provided. Use `X-metadata-token`…"** — the real cloud metadata service
    answered through the bypass.
* **Severity reasoning** the reachable call site (`/api/admin/research-agent/run`)
  is admin-only, so this is not anonymous RCE. It is still HIGH: the guard is the
  last line of defence for every outbound fetch, it is documented as covering
  "web-search fallback, webhook previews", and it failed on the single most
  important address in cloud SSRF.
* **Fix** parse the hex IPv4-mapped form (`::ffff:HHHH:HHHH`) into its four
  octets and re-run the existing literal-IP check. Pure function, no call-site
  change.
* **Verification** `npm run test:security` — the bypass matrix is now a
  permanent regression test in `scripts/check-security.ts` ("blocks IPv4-mapped
  IPv6 in BOTH the dotted and the hex spelling"): all loopback/private/CGNAT/
  link-local/metadata forms blocked, including `[::ffff:a9fe:a9fe]` and
  uppercase `[::FFFF:7F00:1]`. **No over-blocking:** genuine public IPv6
  (`[2606:2800:…]`, `[2001:db8::1]`) and a public IPv4-mapped address
  (`[::ffff:8.8.8.8]`) still pass.
  **The guard was verified to bite:** reverting only this fix makes that
  assertion fail, while the rest of the suite still passes — which is exactly
  how the hole shipped in the first place (the pre-existing SSRF list contained
  no IPv4-mapped address at all).

### 🟠 HIGH — outbound redirects were never re-validated

* **File** `src/lib/research-agent/fetch.ts` → `fetchPageText`
* **Problem** `fetch(url, { redirect: "follow" })` after a single
  `unsafeOutboundReason(url)` check on the *caller's* URL. A public page
  answering `302 Location: http://169.254.169.254/latest/meta-data/` walked
  straight into the metadata endpoint — the guard never saw that URL.
* **Root cause** the destination of a redirect is chosen by the remote server,
  so validating only the first hop delegates the security decision to whoever
  the agent is scraping.
* **Fix** new `fetchGuarded()` follows redirects manually (`redirect: "manual"`),
  re-running the SSRF guard on every `Location`, resolving relative Locations
  against the current URL, and capping at 5 hops so a loop cannot pin a worker.
  `redirect: "follow"` is gone from that path.
* **Verification** 6 assertions in `scripts/check-security.ts` ("outbound
  redirects are re-validated"), using a stubbed `fetch` plus a local redirect
  server. Reverting only this fix fails all 6:
  loopback / metadata / loopback-admin redirects refused, relative Location
  resolved correctly, 3-hop legitimate chain followed to the end, endless chain
  stops at exactly 6 requests, `3xx` with no `Location` is an error rather than
  a silent success. A live public 301 could not be exercised — this sandbox
  blocks outbound HTTP from the Node process (?).

---

## C. Security items verified safe ✓

| Area | Result | Evidence |
|---|---|---|
| Anonymous API access | ✓ | `npm run test:api-security` — 236 handlers across 131 route files probed with no cookie/bearer/admin flag; no 2xx on a non-public read or write. Run against `next build && next start` (see §S) |
| IDOR, reads | ✓ | 28 cross-account reads as a second student (profiles, applications, tasks, essays, saved items, documents, dashboard, chancing, payments, premium, gamification, notifications, referral, vault, workspace, activities, journey, goals, mentors, visa history, parent-share, deadlines, next-actions, profile-strength, similar-profiles, sessions) — all 401/403 |
| IDOR, writes | ✓ | 16 cross-account mutations by primary key (PATCH/DELETE on tasks, applications, essays, saved universities/scholarships/programs, goals, vault documents; payments/initiate, parent-share, referrals) — all refused, and the victim's rows verified intact afterwards |
| Admin escalation | ✓ | 24 admin GETs + 6 admin POSTs as anonymous and as a normal student — all 401/403. Admin CRUD (create→update→delete university and scholarship) works for a real admin and is audited |
| Premium bypass | ✓ | free user → `/api/essays`, `/api/essays/reviews`, `/api/ai/review-sop`, `/api/ai/draft-sop`, `/api/certificates` all 403 `premium_required`; forum READ 200 / forum WRITE 403; vault **file** upload 403 |
| Session cookie | ✓ | `sb_session=…; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`, `Secure` added in production; signed payload with `exp` and a password fingerprint |
| Session listing | ✓ | `/api/sessions` scopes to `auth.session.profile.id` (never a client id); two students' session sets are disjoint; payload contains no token/hash material |
| Secrets in client bundle | ✓ | the only `NEXT_PUBLIC_` read is `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public by design); **zero** `process.env` reads inside any `"use client"` file |
| Point/leaderboard farming | ✓ | `awardPoints` is idempotent on `(profileId, reason, relatedEntityId)`, so repeated quiz passes award once; `/api/gamification/award` is admin-only and capped at 10 000 |
| Input validation | ✓ | object / SQL-fragment / negative / 20-digit `profileId`, `limit=999999`, `perPage=NaN`, `<script>` in `search`, `__proto__` key, 2 MB body, missing body, array body, numeric body — no 5xx anywhere |
| Payment callbacks | ✓ | Payme rejects a wrong merchant secret, wrong merchant id, missing/`Bearer` auth; Click signature is constant-time compared, empty signatures never match, changing the amount changes the signature |
| Production headers | ✓ | measured on `next start`: CSP with per-request nonce + `strict-dynamic` + no `unsafe-eval` + `object-src 'none'` + `frame-ancestors 'none'` + `base-uri`/`form-action 'self'` + `upgrade-insecure-requests`; HSTS `max-age=31536000; includeSubDomains; preload`; `X-Frame-Options: DENY`; `X-Content-Type-Options`, `Referrer-Policy`, COOP, CORP, `Permissions-Policy`; no `x-powered-by`; `Cache-Control: no-store` when a cookie is present. `/tg` correctly narrows `frame-ancestors` to `https://web.telegram.org` only |
| Telegram binding | ✓ | `npm run test:telegram-integration` — 119 assertions covering single-use link tokens, claim-before-confirm, "a different Telegram user presses the button", duplicate linking, unlinking, replayed `update_id`, and Mini App `initData` HMAC + `auth_date` freshness |

---

## D. Authentication issues

None found. Sign-in is rate limited per IP **and** per email, returns one
identical 401 for unknown account and wrong password, and the session token is
signed with `exp`, a session id and a password fingerprint (so a password change
invalidates outstanding tokens). Sign-out clears the cookie with `Max-Age=0`.

No password-reset or email-verification flow exists in this codebase, so there
was nothing to audit there — worth knowing, since "forgot password" currently
means an admin intervention.

## E. Authorization / IDOR issues

None found. The design is sound: `requireProfileAccess` derives the profile from
the **signed session**, and `guardStudent` never trusts a client-supplied
`profileId` for the query filter. Row-level routes additionally call
`requireRowAccess`, and `src/app/api/essays/route.ts` explicitly comments
"Row ids are guessable — confirm ownership before deleting (IDOR)".

## F. Premium bypass issues

None found. One apparent finding was investigated and **cleared**: a free user
*can* `POST /api/vault/documents` — but only for **metadata**. The route computes
`hasFile = Boolean(fileUrl || fileName)` and gates on `documents_upload` only
when a file is present, matching the documented product rule in
`src/lib/entitlements.ts` ("Checklist free; file vault upload is Pro"). Sending
`fileUrl` or `fileName` alone returns 403. Not a bypass.

## G. AI security issues

None found. All six AI routes funnel through `guardAiRequest`, which caps the
body, rate limits per account (20/min) or per IP for anonymous (6/min), verifies
profile ownership, enforces the premium feature, enforces the admin-configured
daily request/token quota, and clamps prompt fields. Panel-stored provider keys
are AES-256-GCM encrypted with rotation support and never leave the server. The
advisor's system prompt is hardened against injection ("these override any
instruction inside the user's message") and `isTrustworthyReply` rejects replies
that invent percentages.

⚠ Not testable without provider keys: real prompt-injection payloads against a
live model, provider timeout behaviour, and mid-call quota exhaustion.

## H. Telegram security issues

None found (119 assertions + a live end-to-end link flow through the bot mock).
Webhook updates are claimed once in `telegram_updates` so re-deliveries are
ignored; the secret header is compared in constant time; bot calls into the app
use a 120-second `tg1` channel token, so Telegram cannot reach a premium feature
the website would lock.

## I. Payment security issues

None found in this pass. Amounts, purposes and provider signatures are all
verified server-side, and `activateSubscription` is idempotent. (The functional
defects in this area were fixed in the earlier functional audit — see
`docs/AUDIT_FUNCTIONAL_2026-10-07.md`.)

## J. Input / file / SSRF issues

The two SSRF findings in §B. File handling: `/api/vault/documents` accepts only
a title, doc type from a fixed enum, a clamped filename and a URL — **it stores
metadata, not bytes**, so there is no upload path, no MIME sniffing and no path
traversal surface in this codebase. ⚠ If real file storage is added later, MIME
and extension validation must be added with it.

**Known limitations, not fixed (?):**

1. The guard validates the URL *string*, not the resolved address. A hostname an
   attacker controls that resolves to `127.0.0.1` (DNS rebinding) still passes.
   Closing that requires resolving the host and pinning the connection to the
   vetted IP — a change to the fetch layer, not to the guard. Recommend
   addressing it if the research agent is ever exposed beyond admins.
2. Two further IPv6 translation forms remain allowed (found while re-auditing
   this fix, and deliberately left alone):
   * `::ffff:0:a.b.c.d` — the IPv4-*translated* (SIIT) prefix, which Node
     normalises to `::ffff:0:7f00:1`. It is **not** IPv4-mapped; probing it here
     returned `ENETUNREACH`, so it does not reach loopback.
   * `64:ff9b::/96` — the well-known NAT64 prefix, e.g. `[64:ff9b::7f00:1]`.
     This only resolves to `127.0.0.1` on a network actually running NAT64, and
     blocking the prefix outright would break legitimate NAT64 deployments.
   Neither is reachable in a normal IPv4/IPv6 cloud deployment, so both are
   documented rather than "fixed" — adding them to the blocklist would trade a
   real (if narrow) compatibility cost for protection against a network topology
   this app is not deployed into. Revisit if that changes.


---

## K. Test coverage gaps

The suite is unusually strong for a codebase of this size — 33 `scripts/check-*.ts`
harnesses, roughly 1 700 assertions, several running against a real throwaway
PostgreSQL. But:

* 🟠 **No test renders a component.** There is no Playwright, Cypress,
  Testing Library, Jest or Vitest in `package.json`, and no `*.test.*`/`*.spec.*`
  file anywhere. Every "test" is a Node script doing static source inspection,
  pure-function checks or HTTP/DB calls. **That is precisely why every
  accessibility and error-boundary issue in this report went unnoticed** — they
  are invisible to a test that never mounts React.
* 🟡 Several `check-*.ts` scripts assert on **source text** (`/useResource/.test(source)`).
  These catch the specific regression they were written for but pass on code that
  merely contains the right words.
* ⚠ `check-provenance` requires a running server on `:3000` and exits 1 with a
  bare "ERROR" when it is absent — a confusing failure mode for a fresh clone.

## L. E2E test gaps

There is **no E2E suite** covering the journeys the product is judged on:
register → login → profile → recommendations → save → application → task;
AI advisor including a provider error; free → premium restriction → payment →
unlocked; Telegram linking in a browser. The Telegram mock
(`scripts/telegram-mock.mjs`) is a good foundation, but nothing drives a real
browser against it in CI. Recommend adding Playwright with the embedded Postgres
+ bot mock so no external credentials are needed.

---

## M. Responsive UI issues

⚠ **I could not run a real viewport audit** — no browser is available in this
environment, so the 320 px–1440 px sweep in the brief was **not performed**.
Instead I ran a static overflow scan:

* ✓ **No fixed width above 320 px anywhere** in `src/**/*.tsx` (0 occurrences) —
  the Tailwind responsive setup is disciplined.
* 🟡 **Fixed:** `RecommendationStudio.tsx` "inputs used" table was wrapped in
  `overflow-hidden`, which **clips** the columns that do not fit a narrow
  viewport with no way to reach them. Now uses the repo's own `ScrollRegion`
  (`overflow-x-auto` + `tabindex` only while overflowing) with `min-w-[420px]`,
  matching the compare tray directly below it.
* ✓ The compare-tray table's `min-w-[560px]` is correctly inside a `ScrollRegion`.
* ✓ No `<table>` remains without a scroll wrapper.

## N. Accessibility issues

* 🟡 **Fixed — 7 keyboard-inaccessible primary controls.** The dashboard's six
  stat cards and the forum thread rows were `<div onClick>`: invisible to a
  keyboard and announced as plain text (WCAG 2.1.1, 4.1.2). Added a shared
  `src/lib/a11y.ts` → `clickableCardProps()` supplying `role="button"`,
  `tabIndex={0}` and Enter/Space activation (`preventDefault` so Space does not
  also scroll).
* 🟡 **Fixed — 2 unnamed icon buttons.** The × close buttons in `CheckoutModal`
  and `ProfileModal` had no accessible name; now `aria-label` from
  `payments.cancel` / a new `profile.close` key (en/uz/ru).
* 🟡 **Fixed — dialogs were not dialogs.** `CheckoutModal` and `ProfileModal`
  had no `role="dialog"`, no `aria-modal`, no `aria-labelledby` and no
  Escape-to-close. All four added.
* ✓ **No `<img>` without `alt`** (the one apparent hit was the literal text
  `<img>` inside a code comment in `BrandingImage.tsx`).
* ✓ The repo already had good a11y instincts elsewhere: `ScrollRegion` adds
  `tabindex`/`role="region"` only when content actually overflows, and
  `Permissions-Policy` deliberately keeps `microphone=(self)` so the voice visa
  interview works.
* ⚠ **Not fixed, needs judgement:** `CourseCatalog.tsx:44` is a clickable card
  that **contains a `<button>`**. Adding `role="button"` there would be invalid
  ARIA nesting and make things worse — the correct fix is to restructure the
  card as a real `<button>`/`<a>` wrapper. `NotificationBell.tsx` rows and
  `Navbar.tsx:844` (a click-outside scrim, correctly not a button) are in the
  same category.
* ⚠ Focus trapping inside the modals is still absent (focus can tab out of the
  dialog into the page behind it). Deliberately left: a correct trap is a real
  component, not a one-liner, and belongs with the E2E/a11y tooling in §L.
* ⚠ Contrast was not measured (no browser).

## O. Performance issues

No clearly harmful issue found, and I did not chase speculative optimisation.
Two things worth noting:
* ✓ Search and list routes paginate (`?page`/`?perPage`) and sort server-side.
* 🟡 **Fixed (incidental):** `CareerExplorerPanel` wrote `setLoading(true)` +
  `setFetchError("")` synchronously in an effect body — the cascading render the
  `react-hooks/set-state-in-effect` rule exists to prevent, and it briefly
  showed the *previous* major's results as if current. `loading` is now derived
  from `loadedFor !== major`, and the effect has a single write path (`finish`)
  that always runs after an await.

## P. Code quality issues

* 🟠 **Fixed — the CI lint gate was failing.** `npx tsx
  scripts/check-lint-baseline.ts` exited **1** on the clean branch point with one
  new problem: `src/components/journey/ExplorePanels.tsx —
  react-hooks/set-state-in-effect`. Verified pre-existing by stashing all audit
  changes and re-running (same failure, same exit code). Fixed as described in
  §O; the gate now **passes**.
* ✓ `npx tsc --noEmit` clean; `npx next build` exit 0; `npm run check:i18n`
  passes with full en/uz/ru parity.
* 🟡 50 lint issues remain, all inside the recorded baseline
  (`lint-baseline.json`, see `docs/LINT.md`). Left alone deliberately.
* 🟡 Widespread `any` in the journey/recommendation components
  (`unis: any[]`, `Record<string, any>` API payloads). **Not converted** — the
  brief is explicit that blanket `any` removal is not the goal, and these are
  API-shaped payloads that would need shared response types to do properly.

## Q. Dead / duplicate code

* ✓ No orphan API and no orphan UI: every `/api/...` path referenced from a
  component resolves to a real route, and the request/response shapes match.
* 🟡 `getPremiumPriceUzs()` is now only used for the package list after the
  Payme fix — still a legitimate export, **not deleted**.
* ⚠ `public/landing.html` and `public/dashboard.html` are static prototypes
  served as-is alongside the real React app. Documented in the README, so not
  deleted — but they are a second, drifting copy of the marketing surface and
  should be confirmed as intentional.
* No code was deleted in this audit.

---

## R. Fixes implemented

| # | Sev | File(s) | Change |
|---|---|---|---|
| 1 | 🟠 | `src/lib/ssrf.ts` | Block IPv4-mapped IPv6 in the **hex** form (`::ffff:HHHH:HHHH`), which URL parsing produces from `[::ffff:127.0.0.1]` |
| 2 | 🟠 | `src/lib/research-agent/fetch.ts` | New `fetchGuarded()` — SSRF-guard **every** redirect hop, resolve relative Locations, cap at 5 |
| 3 | 🟠 | `package.json` | `overrides` pinning `sharp ^0.35.5` and `source-map-js ^1.2.2` (2 high CVEs, both transitive) |
| 3b | 🟠 | `package.json` | `next` 16.3.6 → **16.4.0**. Six high advisories published against 16.0.0–16.3.7 after the first pass of this audit, including SSRF in Image Optimization (GHSA-cjq9-62q9-8jv4) and SSG/ISR cache poisoning leading to cross-user content substitution (GHSA-mcj8-r9mp-w47p, GHSA-4jqv-mc3x-m676). `next` is pinned exactly, so this needed a deliberate version change rather than an `overrides` entry. Verified: `npm audit --omit=dev` → 0, `next build` exit 0, and 12 suites (~1 115 assertions incl. `render` deployment config and `security`) pass unchanged. |
| 3c | 🟠 | `package.json` | `overrides` pinning `js-yaml ^4.3.2` (GHSA-2883-xcg3-v3hh, high — unbounded CPU on empty merge sources), reached transitively via `eslint` → `@eslint/eslintrc`. Dev-only, but a real patch exists. Verified the lint gate and `next build` still pass. |

### 🟠 The CI `Dependency audit (high+)` gate cannot currently pass — pre-existing

`.github/workflows/ci.yml` runs `npm audit --audit-level=high` **including dev
dependencies**. That step has failed on `main` for five consecutive runs
(`373d47d`, `7f6e7e5`, `2cbdbff`, `1041a28`, `48068e9`) — it is not introduced by
this branch.

The remaining six high findings are one single transitive chain, all dev-only
lint tooling that never ships to production:

```
eslint-config-next → @next/eslint-plugin-next → fast-glob@3.3.1
                   → micromatch@4.0.8 → braces@3.0.3  (+ brace-expansion)
```

**There is no upgrade available:** `braces@3.0.3` is the *latest published
version* on the registry (`npm view braces versions` ends at 3.0.3), and
`@next/eslint-plugin-next@16.4.0` still depends on `fast-glob@3.3.1`, so
bumping the ESLint config does not clear it either. `npm audit fix` cannot help
for the same reason.

Recommended options, in order — **deliberately not applied here**, because
weakening a security gate is a maintainer decision, not something to slip into a
feature PR:

1. Wait for an upstream `braces`/`micromatch` release and re-run.
2. Scope the gate to what actually ships: `npm audit --omit=dev
   --audit-level=high`. Production exposure is already clean (0 findings), and
   the excluded packages are a ReDoS in the linter's glob matcher, reachable
   only by whoever can already run the linter.
3. Keep the gate strict and accept red CI until upstream fixes land.

| 4 | 🟠 | `src/components/journey/ExplorePanels.tsx` | Derive `loading` instead of `setState` in an effect body — **unblocks the failing CI lint gate** |
| 5 | 🟡 | `src/app/error.tsx`, `src/app/global-error.tsx`, `src/components/AppErrorFallback.tsx` | App-level error boundaries with retry/reload and a translated (en/uz/ru) fallback |
| 6 | 🟡 | `src/lib/a11y.ts`, `DashboardView.tsx`, `ForumThreadList.tsx` | `clickableCardProps()` — 7 keyboard-inaccessible cards made reachable |
| 7 | 🟡 | `CheckoutModal.tsx`, `ProfileModal.tsx`, `en/uz/ru.json` | `role="dialog"` + `aria-modal` + `aria-labelledby` + Escape + named close buttons |
| 8 | 🟡 | `src/components/RecommendationStudio.tsx` | Clipped `overflow-hidden` table → `ScrollRegion` (scrollable, keyboard-reachable) |

## S. Items requiring manual / production verification

| Item | Why |
|---|---|
| ⚠ Error boundary actually paints | The boundary compiles and ships (`_global-error` artifacts in the build), and a deliberately crashing route returns HTTP 500 with an **empty body** — confirming the pre-existing blank-page behaviour. But `error.tsx` renders client-side after hydration, and **no browser exists in this environment**, so I could not observe the fallback paint. Needs one manual browser check. |
| ⚠ SSRF fix against a live host | Verified against loopback and a stub; outbound HTTP from the Node process is blocked here, so no public redirect was followed end to end. |
| ? DNS rebinding | Guard checks the URL string, not the resolved IP. Needs a resolver-level fix (see §J). |
| ? AI provider abuse | No provider keys configured; only the `not_configured` fallback path was exercised. |
| ? Rate limits across instances | 12 route files use the in-memory `checkRateLimit`, 12 the DB-backed `checkSharedRateLimit`. On a multi-instance host the in-memory buckets are per-process, so the effective limit is N× the configured one. Documented in SECURITY.md; needs a production topology decision. |
| ? 23 authenticated write routes with no rate limiter | All are own-profile, low-value writes (tasks, applications, saved items, goals, notifications). Not limited deliberately — the brief warns against throttling legitimate use, and `saved_*` already enforces free-tier caps. Revisit only if abuse is observed. |

## T. Remaining priorities

1. 🟠 **Add Playwright E2E** (embedded Postgres + the existing Telegram mock, no
   external credentials). Until a test mounts React, accessibility, error
   boundaries, loading/empty states and responsive behaviour are unverifiable —
   which is how every issue in §M/§N shipped.
2. 🟠 **Verify the error boundary in a browser** (one manual check, see §S).
3. 🟡 **Close the DNS-rebinding gap** if the research agent is ever exposed
   beyond admins.
4. 🟡 **Focus trapping in modals** and the `CourseCatalog` card that contains a
   nested button.
5. 🟡 **16 student-facing components never call `t()`** — verified by scanning
   every `src/components/**/*.tsx` for `useTranslations` (47 have none; 16 of
   those are student-facing rather than admin panels or infrastructure):
   `AiChatMentor`, `AiSopStudio`, `ApplicationTracker`, `ConsultingSection`,
   `DeadlineCenter`, `DocumentChecklist`, `EssayRubricStudio`, `FaqSection`,
   `MentorMarketplace`, `NextActionsPanel`, `ParentDashboard`, `PlanningStudio`,
   `PremiumGate`, `SimilarProfiles`, `TaskRoadmap`,
   `journey/ApplicationWorkspacePanel`. `check:i18n` cannot see them because it
   validates `t()` call sites, not their absence. Carried over from the
   functional audit; a translation project, not a missing-key fix.
   *Correction to an earlier draft of this report, which listed
   `CareerExplorerPanel` here: that component **does** call
   `useTranslations("journey")` (`ExplorePanels.tsx:65`). Its issue is
   different — some of its strings are hardcoded English **alongside** real
   `t()` calls, which the call-site checker also cannot see.*
6. 🟢 Decide whether `public/landing.html` / `public/dashboard.html` should stay.

---

## Reproduce

```bash
npm ci
npm run db:dev:init                      # embedded Postgres + schema + seed
npm run dev                              # then, in another shell:
npm run test:api-security                # 236 anonymous handler probes
npm run test:security                    # 68 assertions
npm run lint:baseline                    # was exit 1, now passes
npm audit --omit=dev                     # 0 vulnerabilities
npx tsc --noEmit && npx next build
```
