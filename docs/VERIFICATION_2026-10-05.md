# Verification round — 2026-10-05

**Branch:** `arena/01a10cd6-scholarbridgeai` · **Base:** `main`@`7f6e7e5`
**Scope:** end-to-end consistency of the product (nothing may contradict anything
else; all data complementary and accurate) + a full correctness check of the
landing page. Everything the site shows a student must be based on that
student's OWN profile — no invented, default-filled or stale numbers anywhere.

---

## 1. How it was verified

| Layer | Evidence |
| --- | --- |
| Every test suite | 38/38 `npm run test:*` green, including the new `test:referral` (56 asserts; see §6) |
| Types | `npx tsc --noEmit` → clean |
| Production build | `npm run build` → rc 0 |
| i18n parity | `node scripts/check-i18n.mjs` → passed (1 743 `t()` call sites) |
| Lint gate | `npm run lint:baseline` → no new or worsened problems |
| Live API probes | `/api/universities`, `/api/universities/[id]`, `/api/saved-universities`, `/api/chancing`, `/api/scholarships`, `/api/opportunities`, `/api/programs/recommend` against the dev database |
| Landing page | server-rendered HTML fetched in en / uz / ru, plus the SSR harness in `scripts/check-render.ts` (144 asserts) |

## 2. Contradictions found and fixed

1. **Stored fit score could contradict the live score.** `saved_universities`
   keeps `match_score` / `match_category` from save time; the tracker rendered
   that number while the Explorer and the Chancing pane recompute. The GET
   route now recomputes the pair with the shared `calculateUniversityMatch`
   engine and returns the stored values only for audit
   (`storedMatchScore` / `storedMatchCategory`). Live check for profile 3:
   stored `99/Safety`, live `99/Safety`, both endpoints agree.
2. **Two names for one score.** The dashboard ring and the landing mock said
   "Readiness" while the panel itself said "Profile Strength". Both now use the
   pane's own label (`Readiness` / `Tayyorlik` / `Готовность`), and the note
   "readiness from your saved profile — not a chance of admission" travels with
   it.
3. **Hardcoded AI provider in student-facing copy.** The AI layer routes between
   OpenRouter, OpenAI, Anthropic, Groq, Google Gemini and a custom endpoint, but
   the dashboard button said "Run Groq AI Audit", the report title "… Groq AI
   Strategic Evaluation", the visa hint "Groq is scoring…" and the meta badge
   "Groq AI". All four are provider-neutral now (en/uz/ru); the privacy page
   lists the full provider set; the admin hint about the visa task keeping Groq
   stays because that IS the configured routing.
4. **Empty opportunities feed.** The `opportunities` table had 0 rows on a
   fresh install, so the pane advertised a feature with no data. A 16-entry
   curated catalogue (`src/db/seedOpportunities.ts`) is seeded idempotently from
   both `seedDatabase()` and `npm run db:seed:catalog`: real providers, no
   invented deadlines (`deadlineDate: null` → "recurring or date not published —
   check the official page"), `isVerified: false`. Live feed for profile 3:
   16 items, per-type counts 5/5/3/3, field-mismatch flags only where honest.
5. **Undergraduate tests applied to graduate applicants.** SAT/ACT are now
   gated by `undergraduateTestApplies()` in matching, chancing, requirements and
   the university detail; the invented 1300-fallback bar is gone.
6. **Field relatedness existed in three engines.** One source of truth
   (`src/lib/subjectAffinity.ts`, word-level synonym bridge) is now used by
   matching, chancing, the recommender and the essay adapter, which removed the
   "your major is a shift from …" contradiction.
7. **Test data polluted the student-facing feed.** `test:integration` inserted
   fixtures into `opportunities` and asserted absolute totals, so it broke once
   the real catalogue existed and left fixture rows behind. Fixtures are now
   marked, cleaned before insertion and deleted afterwards, and the assertions
   are catalogue-agnostic.
8. **`test:integration` could not re-run after an interrupted run** (leftover
   `/tmp/sb-it-pg` made `initdb` fail). The throwaway directory is removed
   first, like the other embedded-Postgres suites.

## 3. Landing page — what was checked, what was wrong

Checked against the app, not just for looks:

- **Every label is the string the real app uses.** The mock sidebar is derived
  from `NAV_GROUPS` / `NAV_SECTIONS` / `NAV_UTILITY_SECTIONS`, and the panel
  titles come from the `dashboard` namespace; all 17 `td()` keys, 88 `landing`
  keys and the `nav` key exist in en/uz/ru (verified programmatically). No raw
  i18n key can leak (asserted by `check-render`).
- **Sample data is labelled as sample data**: the dashboard mock carries the
  "Demo · sample data" badge; the readiness ring (47 %) uses the same bands as
  the dashboard (≥85 / ≥70 / ≥55 / below).
- **No "Admissions Index"** anywhere on the landing page or in the dashboard
  (asserted for all three locales).
- **Sections and links:** `#how`, `#features`, `#chancing`, `#roadmap` all
  exist; the mobile disclosure menu repeats the same order and the CTA, with
  `aria-expanded`/`aria-controls`/focus return; `/privacy` and `/terms` exist;
  the honest small print (`AppNote`) sits above them.
- **The chancing card contradicted the product (fixed).** It showed a "Hybrid
  estimate" badge and "Evidence strength: Building" — words that appear nowhere
  in the app, whose own vocabulary is "Fit — not a probability",
  "Admission probability: unavailable" and "Signals based on published
  university data". The card now reads exactly that, carries the demo badge,
  and row 3 is "Data basis → Published university data". The section copy no
  longer implies an admission estimate already exists.
- **The landing was invisible to crawlers (fixed).** The route rendered a
  spinner shell and decided between landing and app only on the client, and the
  locale was applied after hydration. `src/app/page.tsx` is now a server entry
  that reads the session and language cookies and renders the landing in the
  visitor's language; the client half moved to `src/app/HomeClient.tsx`
  (`initialLocale` on `LocaleProvider`). Result: `/` returns ~72 KB of real
  markup — English "Your path to university", Uzbek "Tayyorlik", Russian
  "Готовность" — with no raw keys. A visitor never signed in can no longer be
  shown "Dashboard temporarily unavailable" when the session endpoint fails.

## 4. Contradictions found and fixed in this second pass

The first pass fixed eight contradictions (§2). The finish pass below fixed
the ones that survived, all found by driving the real APIs, not by reading code.

9. **Two different numbers called "Profile readiness".** `/api/dashboard`
   returned `readiness.overall` 33 (a checklist count of documents, applications
   and funding) while `/api/profile-strength` returned 45 (the profile score),
   and `JourneyControlCenter` printed the first under the label "Profile
   readiness" while the dashboard ring and the Readiness pane showed the second.
   Now `/api/dashboard` returns them as two explicitly named things:
   `readiness.overall` (+ `categories`) is the **Application checklist** and
   `readiness.profile.overall` is the shared **profile readiness** — the same
   engine and therefore the same number as Profile & Goals → Readiness
   (`profileStrength` in `src/lib/chancing.ts`). The tile and the checklist card
   say which is which. Live (profile 2): checklist 43, profile readiness 69,
   `/api/profile-strength` 69.
10. **Two different profile-completeness percentages on one screen.** The
    dashboard's `profile.completeness` came from `growth/logic` (different
    checks) and the next-actions badge from a hand-built profile object that
    ignored saved activity rows — 42 % vs 50 % for the same student. Both now
    read `profileStrength(...).completeness` through the shared mapping layer;
    live (profile 2) every surface reports **58 %**.
11. **The fit score disappeared when you opened a university.** `/api/universities/[id]`
    returned no match fields at all, so the detail view could not show the same
    fit the explorer card showed. The route now computes it with the same
    `calculateUniversityMatch` engine and the same row shape (extracted to
    `src/lib/universities.ts`, shared with the list route) and returns `match`
    privately (owner/admin only, like the list). The hero shows
    "Profile fit: {score}% • {category}" plus the honest note that fit is not an
    admission chance. Live: TUM is **99 Safety** in both the list and the detail.
12. **"Signals based on published university data" was false for ranked-only
    rows.** The chancing engine falls back to ranking tiers when no acceptance
    rate is published, but the panel still claimed published data. The engine
    now exposes `basisSource`, and the panel says either "published acceptance
    rate" or "no acceptance rate published — signals use the published ranking
    tier".
13. **Probability/guarantee wording in three locales.** "Admission Chancing",
    "Check your chances", "Scholarship Match **Guarantee**" and the
    "Match (50-60 %)" reach/match/safety chips contradicted the product policy
    that no admission probability is published. They are now "Admission
    outlook", "Check your fit", "Scholarships matching your profile", and the
    portfolio tiers carry the real fit bands (`Reach < 68`, `Match 68–84`,
    `Safety 85+`) with the note that tiers describe fit, not admission chances.
    The `nav.strength` label now matches the pane title it opens ("Readiness",
    not "Profile Strength"). 15 dead `landing.mock*` keys were deleted.
14. **The Chancing pane was English-only while its numbers were not.** The panel
    that renders the chancing API had no `next-intl` at all. It now has a
    `chancing` namespace in en/uz/ru (verified by SSR-rendering it in all three
    locales — no key leaks).
15. **The AI profile report lost its renderer contract.** The rewritten
    `evaluate-profile` prompt had a shortened format rule; `test:ai-format`
    asserts all four AI routes carry the full FORMAT RULES block that
    `AiFormattedText` can render (no HTML, no tables). Restored and re-verified.

## 4b. Third pass — the referral chain and the premium lifecycle

Everything below was found by driving the RUNNING site (dev server on :3000 +
the same Postgres the preview uses), not by reading code.

1. **The signup response contradicted the database.** `POST /api/profiles` mints
   the referral code and applies `?ref=` *after* the insert, then returned the
   pre-update row — so a student who had just been credited to an inviter was
   handed `referredBy: null`, and the client stores that payload as its active
   profile. The route now re-reads the row before answering (and signs the
   session cookie with the same fresh row). Verified live: probe signup id 5 →
   response `referredBy: 2`, database `referred_by = 2`.
2. **Two different "completeness" numbers existed.** The referral activation bar
   used `computeProfileCompleteness` (gamification, 14 boolean checks) while the
   profile page showed `profileCompletenessRatio` (chancing, 12 checks) — the
   same student saw 43 % in one place and 58 % in the other. The engine now uses
   the chancing number (`referralCompleteness()`), so the bar, the profile card
   and the referral list can never disagree. Default bar lowered 60 → 50 (= 6 of
   the 12 checks) so a genuinely filled profile passes, while a bare signup with
   `onboardingCompleted` still earns nothing.
3. **A paid or admin-gifted subscription did not reach the profile columns.**
   `activateSubscription()` wrote only the `subscriptions` row, and the admin
   gift endpoint wrote only its own rows, while the dashboard badge, readiness
   gates and the admin table read `is_premium` / `premium_until`. A student who
   PAID saw "free" on their own dashboard while `/api/premium/status` said
   Premium. Both now mirror the window onto the profile, and the mirror is the
   UNION of paid + referral time (paying never shortens an earned window).
4. **Admin "revoke premium" could not revoke a referral-earned premium**, and
   the grant response returned the pre-update row (`isPremium: false` right
   after a successful grant). Revoke now clears both sources and recomputes; the
   grant returns the fresh profile. Verified live end-to-end: grant → status
   `subscription`/`premium`, dashboard `premium`, admin table
   "Premium (subscription)"; revoke → `none`/`free` in all three places.
5. **The admin table could not tell the two sources apart.** It reported only
   the subscription, so a referral-earned Premium showed as free, and after the
   mirror fix it labelled gifts as "referral". It now checks the subscription
   first and reports `premiumSource: subscription | referral` (the student list
   renders "Premium (referral)").
6. **Referral rewards were invisible.** Activating a referral paid points and
   Premium but wrote nothing the student could see. Both sides now get a
   localised notification (`referralRewarded` / `referralWelcome`, en/uz/ru)
   with the friend's name and the exact reward. Verified live for referrer 3 →
   "🎉 Your invite paid off! Dilnoza Ref completed their profile. You earned
   +40 points." (40 = the admin-set value at that moment).
7. **The referral share link could name `localhost:3000`.** `absolutizeLink`
   completed relative links with the browser origin but passed through an
   absolute loopback link built from the server's own `APP_URL`, so a link
   copied in a tunnel/preview/staging session pointed at the recipient's own
   machine. It now rewrites a loopback origin to the origin the browser is on.
8. **The premium window and the referral window were checked in the wrong
   order** in `getPremiumStatus`, so a student with both could be told the wrong
   source/end date. Subscription wins the label, the profile window is the
   fallback.
9. **Legacy rows still carried the seed's fabricated answers.** Profile 1
   (bootstrap operator) had a 3.5 GPA, $25 000 budget, "Master / Computer
   Science", the four-country wish list and the invented activity list that
   nobody had typed — every match and chance score was computed from it — and
   the seeded demo student was flagged `is_admin`. Fixed in three places: the
   seed (new installs), `supabase/relax_profile_fabricated_defaults.sql`
   (schema defaults) and the new `supabase/repair_seeded_fabricated_values.sql`
   (data), which only touches rows that still match the old defaults exactly.
   Applied to the dev database: profile 1 is now honestly empty
   (`completeness 0`, `personalised: false`, 0 recommendations) and still the
   only admin; profile 2 keeps its real demo answers and lost `is_admin`
   (admin API: 403).
10. **Extra live proof of the whole chain** (dev DB, admin defaults restored
    afterwards): signup with `?ref=` → activation bar blocks a bare profile →
    fill past 50 % → referrer `+1`, no Premium before the 5th → 5th activation
    grants 30 days and stacks. `GET /api/referral` carried
    `{premiumMultiple: 5, premiumDays: 30, referrerPoints: 100, referredPoints:
    50, activationCompleteness: 50}`; an admin edit to 3/21/25/10 changed the
    payload immediately, then the shipped defaults were restored and the cached
    config values reloaded (server restart) so the site is back to spec.

## 4c. Fourth pass — "is EVERYTHING based on the user's own profile?"

Re-read every place a profile is written or read, asking one question: *could a
student see a number, a score or a sentence that comes from something they did
not type?*

1. **The Edit Profile form pre-answered four questions.** It opened with
   `degreeLevel: "Master"`, `targetMajor: "Computer Science"`, `gpaScale: 4.0`
   and `needScholarship: true` — so a student who opened the modal, changed
   anything and saved also wrote "Master / Computer Science / 4.0 / needs a
   scholarship" into their profile, and every score built on that profile (and
   the chancing engine's financial-need branch, and `matching.ts`'s scholarship
   weighting) used those invented answers. All four are gone: empty stays empty,
   the GPA scale has an explicit "—" option and is saved as NULL when unset
   (so it no longer counts as a completed field), and the "+" new-profile form
   got the same treatment. The onboarding wizard likewise no longer pre-ticks
   the scholarship step, and the SOP studio no longer writes a statement for
   "Computer Science" when the profile names no major.
   Guarded by 5 new asserts in `test:render` (158 total) so it cannot come back.
2. **`npm run db:dev:init` never seeded anything.** It ran
   `tsx src/db/seed.ts` — a module with no CLI entry point — so a fresh install
   got the schema and an empty catalogue while the README promised a seed; the
   universities/scholarships/programmes then "appeared" only if an API route
   happened to be hit. There is now a real entry point (`npm run db:seed`,
   `scripts/seed-db.ts`) that seeds the base catalogue, the programme catalogue,
   scholarship cycles, opportunities, forum, courses and gamification, and
   `db:dev:init` calls it. Verified from scratch: 12 universities, 24 programmes,
   8 scholarships, 16 opportunities, 5 forum categories, 1 course, 4 levels,
   5 badges; re-running is a no-op.
3. **The bootstrap admin is not a student.** After the repair, a fresh seed
   creates the operator account with identity only (no GPA/major/budget) —
   confirmed live: `completeness 0`, `personalised: false`, 0 recommendations —
   while still being the only account that can open the admin panel, and the
   seeded demo student is not an admin (admin API → 403).
4. **The whole referral chain was re-driven on the rebuilt database** (not just
   asserted in the suite): `?ref=` capture → signup response carries
   `referredBy` → the bar refuses a bare profile (`0 %`) → filling it to 58 %
   pays the referrer `+1` and both sides `+100`/`+50` points (ledger rows tied
   to the invited profile) → both get the localised notification naming the
   friend → referral Premium appears as `subscription`/`premium` on
   `/api/premium/status`, the dashboard and the admin table → revoke returns all
   three to `free`/`none` simultaneously.
5. **Landing page re-read in en/uz/ru** after the changes: 200 in all three,
   no provider names, no `undefined`/`NaN`/`null`, and the demo panel is
   labelled "Demo · sample data" with "no invented probabilities" / "Fit — not a
   probability" stated next to the example numbers.

## 5. Known remaining gaps (not hidden)

* **Engine prose and the remaining journey panes are English-only.** Match/issue
  sentences from `matching.ts` / `chancing.ts` / `opportunities.ts` and
  `TaskRoadmap`, `DeadlineCenter`, `PlanningStudio`, `SimilarProfiles`,
  `AfterAdmissionPanels`, `ApplicationWorkspacePanel`, `NextActionsPanel` and
  the admin/Telegram components have no translations yet. Fixing it properly
  means returning reason codes with parameters from the engines and translating
  in the UI — that is the next pass, and it is the largest remaining item.
* **The profile readiness score averages only the sections that have data.**
  An empty section (0) is excluded from the average rather than dragging it
  down, so the score answers "how strong is what you have filled in" and the
  completeness % next to it answers "how much have you filled in". Both are
  shown together for exactly that reason.
* **Empty-by-design feeds for a brand-new account:** stories, students-like-me,
  mentors, offers and saved-* lists are empty until the student (or the
  consented cohort) creates data. The panes explain the empty state; no sample
  rows are injected.
* **The profile editors' remaining decimal defaults are input affordances, not
  data** — an empty number field is sent as NULL, and the suites assert that.
* **AI provider credentials are absent in this environment**, so AI routes
  serve their grounded fallbacks (`aiUsed: false`). This is the designed
  behaviour, not a defect — and every fallback is verified to carry the same
  numbers as the deterministic engines.
* `ApplicationTracker.tsx` is dead code (only its types are imported).

## 6. Suite results

**38/38 suites green.** New this pass: `test:referral` — 56 asserts against a
real PostgreSQL (embedded, port 55442, its own database): every rule read from
`app_config`, code mint/reuse/refusal, the activation bar (bare signup refused,
33 % refused, 58 % pays), idempotency, both-side points, premium multiples and
stacking, notification creation + localisation, the paid/subscription mirror,
and static guards on the card/route/engine.

Counts this run: `ai-settings` 83 · `ai-format` 40 · `groq` 27 · `schema` ✓ ·
`security` 68 · `match` 74 · `chancing` 64 · `roadmap` 52 · `documents` 35 ·
`essays` 36 · `visa` 50 · `costs` 44 · `cv` 44 · `compare` 43 · `mentors` 37 ·
`parent` 41 · `dataset` 50 · `render` 158 · `essay-adapter` 39 · `rec-letter`
28 · `country-compare` 17 · `countries` ✓ · `opportunities` 14 ·
`essay-reviews` 16 · `integration` 246 · `growth` 28 · `telegram` 27 ·
`telegram-integration` 119 · `ownership` 83 · `portability` 57 · `journey` 91 ·
`dark` ✓ · `schema-repair` 15 · `provenance` ✓ (needs :3000 running) ·
`recommend` 74 · `study-interests` 35 · **`referral` 56** ·
`api-security` **236 handlers across 131 route files refused anonymous access**
(401/403 everywhere).

Two runs needed the right conditions, both re-verified green: `integration`
flaked once *in teardown* after a neighbouring suite (246 passed, 0 failed,
crash while closing the pool) and `provenance` only passes with the dev server
up. `npx tsc --noEmit` rc 0 · `npm run build` rc 0 · `check-i18n` passed
(1 743 `t()` sites) · `lint:baseline` passed (50 pre-existing, baselined).

The dev database was rebuilt from scratch during this round (the sandbox lost
its `.pgdata`, `node_modules` and `.env.local` between turns, which is also how
the "db:dev:init does not seed" bug surfaced) and left in a canonical,
self-consistent state:

* schema pushed, catalogue seeded through the NEW `npm run db:seed`: 12
  universities, 24 programmes, 8 scholarships, 16 opportunities, 5 forum
  categories, 1 course, 4 levels, 5 badges — re-running is a no-op;
* two profiles: the bootstrap operator (`admin@local.test`) with an honestly
  EMPTY student profile (`completeness 0`, `personalised: false`, 0
  recommendations, `fitScore: null`, `plan: null`, but still the only admin) and
  the seeded demo student Alex Chen (not an admin; the admin API answers 403);
* no `app_config` rows for the referral keys, so the code defaults apply — live
  `/api/referral` payload: `{premiumMultiple: 5, premiumDays: 30,
  referrerPoints: 100, referredPoints: 50, activationCompleteness: 50}`;
* one referral E2E left in place so the mechanic is visible in the UI: profile 3
  ("Rebuild Probe") was invited with Alex's code, crossed the 50 % bar (58 %), so
  Alex shows `1 / 5` on the referral card with both notifications delivered and
  the 100/50-point ledger rows written. No premium window is left active
  (the grant/revoke test ended in `revoke`), so no student is premium by
  accident.

Everything that was mutated only for a test was reverted through the app's own
endpoints (premium grant → revoke, config edit → defaults restored) or deleted
(the 3 generic roadmap tasks the empty-profile probe generated).

## 6. Suite results

**38/38 suites green.** New this pass: `test:referral` — 56 asserts against a
real PostgreSQL (embedded, port 55442, its own database): every rule read from
`app_config`, code mint/reuse/refusal, the activation bar (bare signup refused,
33 % refused, 58 % pays), idempotency, both-side points, premium multiples and
stacking, notification creation + localisation, the paid/subscription mirror,
and static guards on the card/route/engine.

Counts this run: `ai-settings` 83 · `ai-format` 40 · `groq` 27 · `schema` ✓ ·
`security` 68 · `match` 74 · `chancing` 64 · `roadmap` 52 · `documents` 35 ·
`essays` 36 · `visa` 50 · `costs` 44 · `cv` 44 · `compare` 43 · `mentors` 37 ·
`parent` 41 · `dataset` 50 · `render` 158 · `essay-adapter` 39 · `rec-letter`
28 · `country-compare` 17 · `countries` ✓ · `opportunities` 14 ·
`essay-reviews` 16 · `integration` 246 · `growth` 28 · `telegram` 27 ·
`telegram-integration` 119 · `ownership` 83 · `portability` 57 · `journey` 91 ·
`dark` ✓ · `schema-repair` 15 · `provenance` ✓ (needs :3000 running) ·
`recommend` 74 · `study-interests` 35 · **`referral` 56** ·
`api-security` **236 handlers across 131 route files refused anonymous access**
(401/403 everywhere).

Two runs needed the right conditions, both re-verified green: `integration`
flaked once *in teardown* after a neighbouring suite (246 passed, 0 failed,
crash while closing the pool) and `provenance` only passes with the dev server
up. `npx tsc --noEmit` rc 0 · `npm run build` rc 0 · `check-i18n` passed
(1 743 `t()` sites) · `lint:baseline` passed (50 pre-existing, baselined).

The dev database was left in a canonical, self-consistent state:

* no `app_config` rows for the referral keys, so the code defaults apply
  (5 referrals → 30 days, 100/50 points, 50 % bar). Live payload:
  `{premiumMultiple: 5, premiumDays: 30, referrerPoints: 100, referredPoints:
  50, activationCompleteness: 50}`;
* the bootstrap operator (profile 1, `admin@local.test`) has an honestly empty
  student profile (`completeness 0`, `personalised: false`, no recommendations)
  and is still the only admin — the seeded demo student (profile 2) lost
  `is_admin` and now gets 403 from `/api/admin/*`;
* the premium grants used for the live test were revoked through the app's own
  endpoint, so no window survives a revoked source (profile 2: `free`/`none`,
  dashboard `free`);
* profile 2 keeps the two activations from the verification run (points 2 of 5,
  both invited rows active) — consistent with the rules shown on its card — and
  profiles 5/6 are those activated referrals.
