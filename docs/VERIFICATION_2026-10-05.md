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
| Live API probes | `/api/universities`, `/api/universities/[id]`, `/api/saved-universities`, `/api/chancing`, `/api/scholarships`, `/api/opportunities`, `/api/programs/recommend`, `/api/referral` (rules + status), `/api/premium/status`, `/api/admin/premium` (grant → revoke), `/api/visa/chat` (5-question scripted interview) and `/api/visa/analyze` (rubric without AI) against the dev database |
| HTTP headers | `curl -D -` on an HTML page and an API route: `Permissions-Policy: camera=(), microphone=(self), geolocation=(), payment=(), usb=()` — the microphone the voice interview needs is allowed for this origin |
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

## 4d. Fifth pass — the visa interview's microphone (reported broken)

Reported by the user: *"in the visa chat, after the officer's question, voice
input does not work — only typing is possible."* Reproduced by reading the
request path, and it was the app's own fault, three times over.

1. **The site's security header forbade the microphone.** Every response carried
   `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(),
   usb=()` — an empty allowlist disables the feature **for the page itself**, so
   `getUserMedia` and `SpeechRecognition` were refused no matter what the
   student allowed in the browser. The feature that asks the student to SPEAK
   could never have worked, in any browser, on any device. Now
   `microphone=(self)` (the app's own origin only) while the four genuinely
   unused features stay off. Proven live: the running server now answers
   `permissions-policy: camera=(), microphone=(self), geolocation=(), payment=(), usb=()`
   on both HTML and API responses; `test:visa` asserts both places that set the
   header (next.config.ts and src/proxy.ts) so it cannot silently regress.
2. **A single hiccup killed voice for the whole interview.**
   `SpeechRecognition.start()` throws `InvalidStateError` while the previous
   session is still winding down; the catch treated ANY start failure as "this
   browser cannot listen" (`setSttSupported(false)`) — which also revealed the
   typing box, exactly the state the user described. Start failures are now
   classified (`blocked` / `transient` / `fatal`) and retried up to 3 times
   (350 ms apart); only a genuinely missing Web Speech API marks STT
   unsupported.
3. **The officer's turn could never end, and then the mic never reopened.**
   The fallback officer speaks through `speechSynthesis`; if the browser fires
   neither `onend` nor `onerror` (no user activation, throttled tab, cancelled
   utterance), the state stayed "speaking" forever and the microphone button
   stayed disabled. There is now a watchdog (`speakWatchdogMs`, sized from the
   question length, 5–60 s) that always finishes the turn, `onerror` resumes
   listening too, and a stalled Gemini Live turn has its own watchdog
   (`LIVE_SPEAK_WATCHDOG_MS`) so live mode cannot silently mute the student.
4. **The answer was dropped when the student paused.** Chrome ends a
   recognition session on silence; the interim transcript (what the student had
   just said) was thrown away instead of submitted — speak, nothing happens,
   type instead. `shouldSubmitInterimOnEnd()` now sends it.
5. **A blocked microphone was a dead end.** The typing box offered no way back
   to voice. It now has an explicit "Try the microphone again" button (which
   clears the denial and re-requests permission), a hint about the address-bar
   lock icon, and — when the app is embedded in someone else's frame (where the
   PARENT must grant `allow="microphone"`) — a one-click "open the interview in
   its own tab". All three strings are localised in en/uz/ru.
6. **Without AI keys the interview could not even start.** `/api/visa/chat`
   answered 503 when no provider was configured, so there was no officer
   question at all — and the final score never needed the model: it is the
   deterministic rubric over the student's own transcript. The route now asks
   that country's standard consular questions (the list already shipped for the
   setup screen) in order, marks the payload `source: "script"`, and the UI says
   plainly that the AI officer is offline. Verified live: five questions in
   order, then a closing line, and `/api/visa/analyze` still returns the full
   rubric (`aiAvailable: false`, scores + named risk grounds).

Two quality gates caught the new UI while it was being added, and both were
fixed properly rather than baselined away: `test:dark` flagged the retry
button's ink on `bg-emerald-500` (2.47:1 — the button now carries the app's
`.sb-ink-on-bright` class, 0 unreadable pairs) and `lint:baseline` flagged the
embedding probe as state-set-from-effect (it is now read through
`useSyncExternalStore` with a server snapshot of "not embedded"; no rule was
disabled).

`test:visa` grew from 50 to **80 asserts** covering all of the above (the pure
rules in `src/lib/visa-mic.ts` plus guards on the component, the header and the
route).

## 4e. Sixth pass — "check EVERYTHING again, is it all working?"

Requested after the visa-voice fix: re-verify the whole product end-to-end, not
just the part that was reported. Everything below was found by driving the live
app with three real profiles (the bootstrap admin with an empty profile, the
seeded demo student, and a brand-new account created through the sign-up
endpoint), not by reading code.

1. **The demo data was permanently stale.** `src/db/seed.ts` shipped FIXED
   task dates (`2025-05-01` … `2025-06-01`), so a fresh install showed the demo
   student with three application tasks ~510 days overdue and the dashboard
   announced *"3 deadlines need you today"*. Scholarship dates had already been
   fixed with a roll-forward pass; tasks had not. Seed dates are now RELATIVE
   to the moment of seeding (−30 / +12 / +26 / +40 days), so the demo is
   coherent whenever it runs. Verified on a wiped cluster: the tasks land at
   those offsets.
2. **"Today" was not today.** `/api/dashboard` and the reminder engine compute
   whole calendar days (`Date.UTC(y,m,d)`), but `/api/next-actions` and
   `/api/deadlines` rounded a raw millisecond difference — so at any hour past
   midnight a deadline **due today** reported `-1` and was labelled "Overdue",
   while **tomorrow** reported `0` and read "Due in 0 days". Caught live by
   creating tasks for yesterday/today/tomorrow and reading the answers back.
   `daysUntil()` is now calendar arithmetic and `/api/deadlines` uses the same
   helper, so the same date reports the same number everywhere.
3. **The dashboard said "needs you today" about a date that had passed.**
   `buildNextActions` treated every critical item as due-today. Overdue and
   due-soon are now counted separately and the headline says which it means
   ("1 deadline already passed and 4 need you within two weeks — clear the
   passed ones first"), a deadline dated today reads "Due today" (not "Due in
   0 days", and never "Overdue").
4. **A dead design page was answering 500.** `/preview` was a leftover
   "hero redesign — before/after" scratch page: unlinked from the app, absent
   from the sitemap, and it threw a 500 for anyone who typed the URL (it
   rendered `UniversityDetail` outside the intl provider). Removed; the route
   is a clean 404 and `test:render` now asserts the file cannot come back.
5. **The sitemap listed one URL.** `/universities` and `/scholarships` serve
   full server-rendered catalogues — the two pages a student searching for
   either thing should land on — and neither was listed. The sitemap now names
   the landing page, both catalogues and the legal pages (5 URLs), and the
   suite asserts each listed page exists as a route and that nothing behind
   sign-in is advertised.
6. **The programme recommender ignored the degree level.** A brand-new
   Master's applicant asking for "Mechanical Engineering, Robotics" got
   **"Bachelor of Engineering in Robotics" as result #1** — its subject match
   was exact and the wrong level only cost −4 on a 0–100 score. Degree level is
   the hard constraint, so it is now the primary ranking key (matches first,
   then unknown, then mismatches), mismatches sort below every match, and each
   card states it: *"This is a Bachelor program while your profile says Master
   — check that you are eligible to apply"*. Verified live: the 8 mismatching
   programmes moved to the bottom of the 24, contiguous.
7. **Three different "profile completeness" numbers existed.** The journey bar
   read 44 %, the dashboard 42 %, the readiness pane 42 %, and the journey's
   own profile step displayed 63 % — the same student, at the same moment, from
   two separate 9-check and 12-check scoring lists, with the referral
   activation bar and the chancing confidence fed by a third path. There is now
   ONE definition (`profileCompletenessRatio`) that every surface calls, it
   counts the Activities-pane portfolio rows too, and the four numbers read
   42/42/42/42 for the same profile (and 58/58/58 for the demo student).

Every fix above carries an assert so it cannot silently regress:
`test:roadmap` 52 → **61** (calendar-day arithmetic at 23:59, quiet wording,
due-today vs overdue, mixed lists), `test:render` 158 → **162** (no scratch
page, sitemap ↔ routes), `test:recommend` 74 → **81** (level decides before
subject fit, mismatch explained), `test:growth` 28 → **33** (one definition,
shared with chancing).

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
`security` 68 · `match` 74 · `chancing` 64 · `roadmap` 61 · `documents` 35 ·
`essays` 36 · `visa` 80 · `costs` 44 · `cv` 44 · `compare` 43 · `mentors` 37 ·
`parent` 41 · `dataset` 50 · `render` 162 · `essay-adapter` 39 · `rec-letter`
28 · `country-compare` 17 · `countries` ✓ · `opportunities` 14 ·
`essay-reviews` 16 · `integration` 246 · `growth` 33 · `telegram` 27 ·
`telegram-integration` 119 · `ownership` 83 · `portability` 57 · `journey` 91 ·
`dark` ✓ · `schema-repair` 15 · `provenance` ✓ (needs :3000 running) ·
`recommend` 81 · `study-interests` 35 · **`referral` 56** ·
`api-security` **236 handlers across 131 route files refused anonymous access**
(401/403 everywhere).

Two runs needed the right conditions, both re-verified green: `integration`
flaked once *in teardown* after a neighbouring suite (246 passed, 0 failed,
crash while closing the pool) and `provenance` only passes with the dev server
up. `npx tsc --noEmit` rc 0 · `npm run build` rc 0 · `check-i18n` passed
(1 743 `t()` sites) · `lint:baseline` passed (50 pre-existing, baselined).

## 7. Environment state after the run

The sandbox drops `node_modules`, `.env.local` and the embedded Postgres
cluster between sessions (twice during this work), so the run was reproduced
end-to-end from a WIPED cluster — which is the only way the two data bugs in
§4e could surface at all.

* `node scripts/dev-db.mjs --init` = cluster + `drizzle-kit push` + the real
  seeder. Result: 93 tables, 12 universities, 24 programmes, 8 scholarships,
  16 opportunities, 5 forum categories, 1 course, 4 levels, 5 badges; a second
  run inserts nothing;
* two profiles, both honest: the bootstrap operator (`admin@local.test`) with
  an EMPTY student profile (strength `overall 0`, `completeness 0`, all three
  scored sections flagged `unknown`, 0 recommendations, `personalised: false`,
  `fitScore: null`, `plan: null`, and the dashboard headline "Your profile is
  still thin"), and the seeded demo student Alex Chen (`completeness 58`,
  not an admin — `/api/admin/*` answers 403);
* the demo student's four application tasks are now seeded RELATIVE to the
  moment of seeding, verified live on the fresh cluster: −30 (completed),
  +12, +26, +40 days; `/api/next-actions` answers "One deadline needs you
  today." and `/api/deadlines` reports the same day counts;
* scholarship deadlines were already rolled to the next annual occurrence at
  seed time (2026-10-08 … 2027-09-30, all eight in the future, marked
  `recurring` + `unverified`);
* no `app_config` rows for the referral keys, so the code defaults apply
  (5 referrals → 30 days, 100/50 points, 50 % activation bar).

The signed-in walk-through (sign-up → profile → save → task → application →
plan → chat) was driven with real session cookies; every row it created was on
a scratch cluster that was then wiped, so the canonical database above carries
no E2E leftovers.

Superseded by this run: the admin-owned `.pgdata` written here, and the
`tmp-*.mts` scratch scripts used to mint session cookies and read the database
directly — none of them are committed.
