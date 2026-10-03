# Navigation & responsive restructure — audit + fixes (October 2026)

Branch: `arena/01a100ca-scholarbridgeai` (based on `1bdfc14`).
Scope: collapse ~40 sidebar sections / 8 groups into **6 groups / 14 destinations**, rebuild the
desktop sidebar, the phone/tablet bottom navigation, the destination ("hub") pages, move every
existing feature into the new destinations **without deleting anything**, and fix the responsive /
accessibility defects found while auditing the real app and the two static prototypes.

Everything below was run against the local stack (Next dev + embedded Postgres) with a real
signed-in student account. Commands and their real output are listed in §9.

---

## 1. Reproduced issues and their causes

| # | Issue (reproduced) | Where | Cause | Status |
|---|---|---|---|---|
| 1 | Sidebar had 8 groups / ~40 rows; the active section was often below the fold on a 768 px-tall window | app shell sidebar | flat list grew with every feature | **fixed** — 6 groups / 14 rows, collapsible, active group auto-expands |
| 2 | Landing prototype: phone nav was a horizontal scroller; at 320 px "Planning" was off-screen and only reachable by drag; a scrollbar gutter was visible | `public/landing.html` | `overflow-x-auto` pill strip with no menu | **fixed** — disclosure menu (all 4 links + Sign in/Get started), 44 px rows, Escape returns focus |
| 3 | Landing prototype: header crowded at 768 px, "How it works" wrapped to a second line | `public/landing.html` | desktop nav shown from `md` (768 px) while the brand + 3 controls need ~820 px | **fixed** — desktop nav from `lg`, tablets use the menu; measured 1 row / 73 px at 768 px |
| 4 | Landing prototype: no keyboard-accessible menu (no `aria-expanded`, no Escape, no focus return) | `public/landing.html` | nav links were anchors only | **fixed** |
| 5 | Dashboard prototype: 250 px fixed sidebar vs `md:ml-20` (80 px) → sidebar overlapped content from 768–1023 px | `public/dashboard.html` | sidebar never collapsed at `md` | **fixed** — the sidebar becomes an 80 px icon rail at `md`, 250 px from `lg`; content left edge now equals the sidebar width (80/80, 250/250) |
| 6 | Dashboard prototype: stale sample data presented as current ("Fall 2024", "in 5 days") | `public/dashboard.html` | hard-coded literals | **fixed** — cycle label and deadlines are computed from today; every block carries a "sample data — static prototype" marker |
| 7 | Prototype notice was Uzbek-only on an English page (and missing on the landing prototype) | both prototypes | single hard-coded string | **fixed** — notice localized en/uz/ru from `navigator.language`, on both pages |
| 8 | Dashboard prototype: phone order put four metric cards above status/next steps; the applications table (min 560 px) sat in an unlabelled `overflow-x-auto` box on a 320 px screen; the floating help button covered the last card | `public/dashboard.html` | source order + `pb-` too small | **fixed** — flex `order` (status/next steps before metrics below `lg`), labelled scrollable region with a "swipe" hint, `pb-24` keeps content clear of the FAB (measured gap 20 px at the page bottom) |
| 9 | Sign-in / profile-picker modal: **Escape did nothing**, the page behind could still scroll, focus was not moved into the dialog nor restored | `src/components/ProfilePicker.tsx` | modal had `role="dialog" aria-modal` but no behaviour | **fixed** — Escape closes, body scroll locked, focus moves in and is trapped, focus returns to the trigger (verified at 390 and 1024) |
| 10 | Onboarding wizard: **save-and-resume broken on step 1** — after creating the account and continuing to step 2, a reload sent the student back to *Step 1* with empty fields even though the profile existed | `src/app/api/profiles/route.ts` + `OnboardingWizard` | `POST /api/profiles` never stored `onboardingStep` (only `PUT` did), so the server had step 0 | **fixed** — POST stores the clamped step; reload now resumes at Step 2 (verified in the browser) |
| 11 | Onboarding step 1: required fields were marked only with a visual `*`; no `required` / `aria-required` / `aria-describedby`; validation message had no `role="alert"`; the terms + password helper text was 11 px | `src/components/OnboardingWizard.tsx` | markup written before the a11y pass | **fixed** — `required` + `aria-required` + `aria-invalid`, `aria-describedby` on the password help, `role="alert"` error, a "what is required" line while the button is disabled, helper text 11 → 12 px |
| 12 | Phone footer quick links ("University Matcher", …) were clickable `<span>`s — not tabbable, not announced as controls; the row also overflowed by 9 px at 200 % zoom | `src/app/page.tsx` | `onClick` on spans, no wrap | **fixed** — real `<button>`s with focus rings, `flex-wrap`; 200 % zoom now clean at 390 and 1440 |
| 13 | Group headings in the sidebar announced as "Explore 2" (count glued to the name); hub tabs announced as "Recommended for youNew" | `src/components/Navbar.tsx`, `src/components/hubs/ui.tsx` | badges inside the accessible name | **fixed** — badges `aria-hidden`; `getByRole("button", { name: "Explore", exact: true })` now resolves, tabs read clean names |
| 14 | `text-slate-400` (2.5:1 on white) used for meaningful small text in the nav, hub shell and both prototypes | nav / hubs / prototypes | palette misuse | **fixed** in the files this task owns — 400-level text replaced with 500-level (4.76:1) in light mode, `dark:` variants kept |
| 15 | A search for a feature name (e.g. "Answer Vault") returned only 14 destination hits, not the tab the feature now lives in | `src/app/api/search/route.ts` | the search index listed sections only | **fixed** — every destination *and every tab* is indexed (`materials/documents`, …), so old feature names land on the right tab |

---

## 2. Final navigation: 6 groups / 14 destinations

| Group | Destinations (tabs) |
|---|---|
| **HOME** | **Dashboard** (direct link, not a disclosure) |
| **EXPLORE** | **Universities & Programs** (Universities & programs · Careers & majors · Program match · Admission outlook · Country compare)<br>**Scholarships** (Browse scholarships · Recommended for you · Opportunities) |
| **MY PLAN** | **Study Plan & Tests** (Study plan · Tests & preparation · Cost & CV tools)<br>**Tasks & Timeline** (Tasks & roadmap · Deadlines)<br>**Profile & Goals** (Readiness · Goals · Activities · Stories · Students like me · Profile details)<br>**Financial Plan** |
| **APPLICATIONS** | **My Applications** (Applications · Workspace)<br>**Application Materials** (Requirements · Documents & saved answers · Essays & recommendations · Interview preparation) |
| **AFTER ADMISSION** | **Offers & Decisions**<br>**Funding & Deposits**<br>**Visa & Departure** (Visa · Departure checklist) |
| **HELP & LEARNING** | **Guidance** (AI guidance · Talk to a person · FAQ)<br>**Community & Learning** (Discussions · Courses) |
| **ACCOUNT & SETTINGS** (utility cluster, not a seventh journey group) | Premium · Telegram & alerts · Rewards & Referrals · Parents (Premium) · Admin panel (admin only) |

Source of truth: `src/lib/navSections.ts` (`NAV_GROUPS`, `NAV_SECTIONS`, `NAV_UTILITY_SECTIONS`).
Maximum depth is 2 (group → destination); tabs inside a destination are one flat row and never nest.

---

## 3. Where every original feature moved

| Old section (~40) | New home |
|---|---|
| Dashboard & Audit / Journey control center | Dashboard (unchanged component) |
| University Explorer | Universities & Programs → *Universities & programs* |
| Career & Major Explorer | Universities & Programs → *Careers & majors* |
| Program recommender (`recommend`) | Universities & Programs → *Program match* |
| My Chances (`chancing`) | Universities & Programs → *Admission outlook* (renamed for students) |
| Compare Countries (`compare`, hidden by default) | Universities & Programs → *Country compare* |
| Scholarships Hub | Scholarships → *Browse scholarships* |
| Autopilot (`autopilot`) | Scholarships → *Recommended for you* (NEW) |
| Opportunities (`opportunities`, hidden by default) | Scholarships → *Opportunities* |
| My Study Plan (`planning` → plan phases) | Study Plan & Tests → *Study plan* |
| Test Planner | Study Plan & Tests → *Tests & preparation* |
| Cost calculator / Scholarship portfolio / CV tools (`planning`) | Study Plan & Tests → *Cost & CV tools* |
| Tasks & Roadmap | Tasks & Timeline → *Tasks & roadmap* |
| Deadline Center | Tasks & Timeline → *Deadlines* |
| Profile Strength | Profile & Goals → *Readiness* |
| Goal Planner (`goals`) | Profile & Goals → *Goals* (NEW) |
| My Activities | Profile & Goals → *Activities* |
| Admission Stories (`stories`) | Profile & Goals → *Stories* (NEW) |
| Similar Profiles (`similar`) | Profile & Goals → *Students like me* |
| Profile details / Complete profile / Sessions | Profile & Goals → *Profile details* |
| Financial Plan / budget planner | Financial Plan |
| Applications (tracker) | My Applications → *Applications* |
| Application Workspace (`workspace`) | My Applications → *Workspace* (opened from a tracker row; the selected program is shown) |
| Application Requirements | Application Materials → *Requirements* |
| Document Checklist + Answer Vault (`vault`) | Application Materials → *Documents & saved answers* |
| AI SOP & Essays + Recommendation letters | Application Materials → *Essays & recommendations* |
| Interview Center + visa interview practice | Application Materials → *Interview preparation* |
| Offers & decisions | Offers & Decisions (accessible before an offer, with an explanation of when it becomes useful) |
| Post-admission funding / deposits | Funding & Deposits (reuses the Financial Plan budget — no re-entry, no conflicting totals) |
| Visa requirements + Visa speaking assistant | Visa & Departure → *Visa* |
| Departure checklist | Visa & Departure → *Departure checklist* (NEW) |
| AI Mentor / Admissions Advisor (`advisor`) | Guidance → *AI guidance* (quota + "guidance, not official advice" stated in the intro) |
| Consulting / Mentor marketplace (`mentors`) | Guidance → *Talk to a person* (prices and Premium shown before booking) |
| FAQ | Guidance → *FAQ* |
| Community Forum | Community & Learning → *Discussions* |
| Courses / certificates | Community & Learning → *Courses* (course permissions + Premium badges untouched) |
| Premium / payments | Account & settings → Premium |
| Telegram & alerts (NEW) | Account & settings |
| Rewards & Referrals, Parents (Premium), Admin panel | Account & settings |
| Command palette (Ctrl/⌘+K), section search | unchanged; its grammar is still `"<section>/<pane>"` |

**Badges:** `NEW` travels with the feature to its new tab (Recommended for you, Goals, Stories,
Documents & saved answers, Departure checklist, Telegram & alerts). `PRO` still marks Premium
destinations/tabs and **never creates a destination of its own**.

---

## 4. Program recommender: how it works and how it explains uncertainty

`POST /api/programs/recommend` (client: `RecommendationStudio`, shown as the *Program match* tab):

* **Inputs are all optional and provenance-labelled.** The response echoes every input with a
  `source` (`"request"` or `"profile"`), so a value taken from the saved profile is never
  presented as something the student typed in this session.
* **Four separate dimensions per program** — subject/interests fit, published-requirement
  met/unmet/unknown, affordability (budget vs published cost + matching scholarships) and
  provenance (verification status, source URL, last-verified date, stale flag). Ranking uses a
  0–100 **match** score built from those dimensions; unknown inputs score *neutral* and are
  returned in `missingInputs` so the student knows what would sharpen the result.
* **Never a probability.** `probability: { available: false }` (`ADMISSION_PROBABILITY`) is
  returned; the UI labels the score as a match score and states that no admission probability is
  shown until a validated method exists.
* **No fabricated data.** Only catalog rows can appear. A missing deadline/cost stays "unknown";
  a database failure returns **503 `data_unavailable`** instead of mock results.
* Every requirement chip carries its **official source link + last-checked date**; stale
  verification (>180 days) is labelled, and "unknown" is never rendered as "not met".

---

## 5. How routes, permissions, Premium, badges, data and deep links were preserved

* **No API route was renamed or removed**; no schema/table/column change. The only API edits are
  additive: `POST /api/profiles` now stores `onboardingStep`, and `/api/search` returns more
  (index) rows.
* **Deep links & internal ids.** `resolveNavTarget(id, pane?)` accepts a destination
  (`materials`), a tab deep link (`materials/essays`), a bare pane (`outlook`), a utility screen
  (`payments`) or **36 legacy ids** through `LEGACY_SECTION_ALIASES` (`chancing→universities/outlook`,
  `vault→materials/documents`, `sop→materials/essays`, `workspace→applications/workspace`,
  `departure→visa/departure`, `advisor→guidance/mentor`, `autopilot→scholarships/recommended`, …).
  Verified: all 36 legacy hashes land on the expected destination **and tab**.
* **Back/Forward + bookmarks.** The shell keeps `#section` / `#section/pane` in the URL
  (`pushState`, `popstate` + `hashchange`), restores both parts, and ignores unknown ids instead of
  dumping the student on the dashboard (a stray `#totally-unknown` leaves the current page open).
* **Journey/growth deep links** that used to emit `tab: "profile"` now emit `profile/details`
  (`journey/stages.ts`, `journey/nextSteps.ts`, `journey/planning.ts`, `growth/defaults.ts`);
  Telegram `APP_TABS` all still resolve (checked in `check-telegram-integration.ts`).
* **Auth/permissions unchanged:** every panel keeps its own session/`guardStudent` checks; role
  access to Admin, Parents, Premium and forum-write is untouched. Premium gates preserved:
  `ai_essay`, `parent_dashboard`, `forum_write` (plus the existing Premium gates inside Courses,
  Mentors, Payments, Rewards).
* **Feature visibility settings preserved:** Admin → Navigation can still hide/show destinations,
  and now also individual **tabs** and the account screens; hidden tabs disappear from the row and
  cannot be selected, but hiding a tab never removes its destination. Hubs honour `hiddenNav` from
  `/api/config/nav` and the `scholarbridge:nav-updated` event.
* **Data untouched:** saved universities/scholarships/tasks/applications/documents all live in the
  same tables and are read by the same components; the dashboard still renders
  `JourneyControlCenter`.

---

## 6. Viewports and locales checked

Viewports: **320×740, 360×800, 390×844, 430×932, 768×1024, 820×1180, 1024×768, 844×390
(landscape phone), 1024×600 (short), 1440×900**.
Locales: **en, uz, ru** (locale cookie `scholarbridge_locale`), **light + dark** (app theme switcher
and `colorScheme`).

Checked per viewport: page-level horizontal overflow, fixed bottom bar + content clearance,
bottom-nav tap targets (78×64 px), sidebar scroll at short heights, drawer open/scroll-lock/Escape/
focus, tab wrapping, and console errors.

---

## 7. Commands run (real results)

| Command | Result |
|---|---|
| `npx tsc --noEmit` | **0 errors** |
| `npx eslint <touched files>` | clean |
| `npm run lint:baseline` | **PASSED** — no new or worsened problems (50 pre-existing, 33 files) |
| `npm run check:i18n` | **passed** — en 2307 keys, 61 translated files, 1482 `t()` sites |
| `npm run test:journey` | **90 assertions passed** (now asserts 6 groups, 14 destinations, pane uniqueness, legacy aliases, hidden-id validity) |
| `npm run test:growth` | **28 assertions passed** (NEW badges no longer require the feature to be its own section) |
| `npm run test:telegram-integration` | **119 passed, 0 failed** (`APP_TABS` still resolve) |
| `npm run test:dark` | `0 unreadable pairs` |
| `npm run build` | **succeeded** (full route table emitted, no errors) |
| Other suites re-run: `chancing 64`, `render 121`, `portability 57`, `ownership 83`, `documents 35`, `essays 36`, `visa 50`, `costs 44`, `cv 44`, `compare 43`, `mentors 37`, `parent 41`, `dataset 50`, `essay-adapter 39`, `rec-letter 28`, `country-compare 17`, `opportunities 14`, `essay-reviews 16`, `ai-settings 83`, `ai-format 40`, `integration 246`, `provenance PASS` | all passed (run with `DATABASE_URL` pointing at the local dev DB) |

Browser evidence produced during the audit (in `/home/user/verify-shots/`): `navdesk2-1440.png`,
`nav14-desktop.png`, `vp-390x844.png`, `vp-320x740.png`, `more-390x844.png`, `landing-menu-320.png`,
`proto-dashboard-768.png`, `qa-wizard-resume2-390.png`, `qa-signin-390.png`.
**The sandbox was reset before the finalization pass, so those files no longer exist**; the
finalization pass re-took every screenshot it relies on and the current names are listed in §10.

---

## 8. What could not be verified, and why

* **Real screen readers (NVDA/JAWS/VoiceOver/TalkBack)** — no screen reader is installed in this
  Linux sandbox. What *was* verified: the accessibility tree (roles/names/expanded/current via
  Chromium), `role=tablist/tab/tabpanel` with roving `tabindex`, `aria-label`s on both `<nav>`
  landmarks, `role="alert"` on errors, one `<h1>` per page, `lang` on `<html>`, and a full
  keyboard-only tab walk with a visible focus indicator on every stop.
* **Physical devices / real mobile keyboards** — verified by emulated viewports and touch-sized
  targets (≥44 px), not on hardware; the on-screen-keyboard resize behaviour was approximated with a
  short viewport (1024×600, 844×390).
* **Prototype Tailwind fidelity** — `public/landing.html` / `dashboard.html` load Tailwind's Play
  CDN, which is unreachable from the sandbox; they were rendered with a locally generated Tailwind
  build (`/tmp/tw/out.css`) of the same class list, so class-level layout is faithful but the CDN
  runtime itself was not exercised.
* **Third-party imagery** — `images.unsplash.com` is blocked in the sandbox (console
  `ERR_CONNECTION_CLOSED`); it does not affect layout assertions.
* **Offers/Funding/Visa with real post-admission data** — the test account has no offer yet, so
  those pages were verified for structure, empty states and navigation, not with live offer rows.

---

## 9. Remaining limitations

* **Account note (superseded 2026-10-03):** the accounts listed in the first draft of this section
  (`Resume Check*`, `QA Nav Tester`, `QA Wizard`, `student@local.test`) belonged to an earlier
  dev database and no longer exist — the environment was rebuilt from scratch (see §10). Current
  local accounts: id 1 `admin@local.test / localdev1234` (admin, seeded from `.env.local`),
  id 2 Alex Chen (seeded, no password), id 3 `qa.student@local.test / localpass123`
  (onboarded student — the account used for every measurement in §10).
* Sign-up is rate-limited to 5/hour/IP; the local counter (`rate_limit_hits`) was cleared once
  during the audit to continue the sign-up tests. That table is a dev fixture, not app data.
* `text-slate-400` still appears elsewhere in the codebase (other components outside this task's
  ownership). The nav, hub shell, wizard, picker and both prototypes were cleaned; a repo-wide
  sweep is a separate change.
* Visual regression is asserted through measurements (no page scroll, no overlap, order, target
  sizes) plus screenshots — there is no pixel-diff baseline in the repository.

---

# 10. Finalization audit — independent re-verification (2026-10-03)

This pass re-checked every requirement against the **real repository state** and the **running
app**, not against the prose above. Nothing was reset or discarded: all earlier work is still in the
working tree (§10.10).

Environment used: Next dev server on `0.0.0.0:3000`, embedded PostgreSQL 18.4 on
`127.0.0.1:5433` (`.pgdata/`, git-ignored), browser = Chromium 153 driven by Playwright with
`@sparticuz/chromium`. Logins: id 1 `admin@local.test / localdev1234`,
id 3 `qa.student@local.test / localpass123` (onboarded student).

## 10.1 Requirement checklist

| # | Requirement | Status | Evidence (file / test / measurement) |
|---|---|---|---|
| 1 | 6 groups / 14 destinations, ≤2 levels | **DONE** | `src/lib/navSections.ts`; `npm run test:journey` → 90 assertions; browser: 84/84 destination resolves across 320×740, 390×844, 430×932, 768×1024, 1024×600, 1440×900 (earlier this session: 140/140 across all 10 viewports) |
| 2 | Desktop sidebar: Dashboard direct link, 5 collapsible groups, auto-expand active, short viewport heights | **DONE** | `src/components/Navbar.tsx` (`aside hidden lg:flex w-64 xl:w-72`); measured at 1024×600 and 1440×900 — sidebar 256/288 px, content offset 256/288 px (equal), no overflow |
| 3 | Phone/tablet: 4 bottom-nav destinations + labelled More, no hidden horizontal strip | **DONE** | measured bottom nav = Home / Explore / My Plan / Applications / More at 320, 390, 430, 768, 820, 844×390; `hScrollStrip=false` everywhere |
| 4 | Hub pages: title, one-line explanation, one primary action, tabs, loading/empty/error states | **DONE** | `src/components/hubs/ui.tsx` `HubPage`; every destination h1 + intro observed in the browser sweep; empty states observed for programs/offers before fixtures |
| 5 | Feature placement (Explorer+Career+Chances, Scholarships Browse/Recommended, Study Plan, Tasks, Profile, Financial, Applications+Workspace, Materials ≤4 tabs, After Admission, Guidance split, Community tabs) | **DONE** | `src/lib/navSections.ts` pane lists + `src/components/hubs/index.tsx` wiring; `npm run test:journey` asserts pane uniqueness and that no feature lost its home |
| 6 | NEW/PRO badges on features, never as destinations | **DONE** | `isNewBadgeActive()` in `src/lib/navSections.ts`; tabs render badges inside the tab label with `aria-hidden`; `npm run test:growth` → 28 assertions |
| 7 | Legacy IDs / deep links / Back-Forward / saved records / notifications / roles / Premium preserved | **DONE** | 36 `LEGACY_SECTION_ALIASES`; earlier this session: 18/18 legacy hashes rewrite <1 s, 3× Back/Forward restores hash+h1, `#totally-unknown` keeps the previous screen; Premium gates `ai_essay`, `parent_dashboard`, `forum_write` unchanged |
| 8 | **Item 1** — phone dashboard keeps next action / urgent deadline / journey progress prominent without a long stack | **DONE (fixed this pass)** | order at 390 = journey bar → At-a-glance (2×2) → Next steps → Upcoming deadlines → Application progress → Profile readiness; readiness tiles 7×1 col (721 px, before) → **2 cols (565 px at 320, 482 px at 390)**, desktop still 3 cols; no clipped labels |
| 9 | **Item 2** — phone applications readable/reachable; stacked cards on phones, clear columns on tablets | **DONE (fixed this pass)** | `src/components/ApplicationCenter.tsx`: no `<table>` anywhere; card at 390 = 366×260 px showing university, program · intake · deadline, status, "Open workspace"; metric strip 2 cols/phone (363 px), 3 cols/768, 6 cols/≥1024 with **0 clipped labels** after the wrap fix |
| 10 | **Item 3** — recommender end-to-end | **DONE** | 14 inputs incl. interests, degree, GPA+scale, IELTS/TOEFL/Duolingo/SAT/ACT, budget, funding need, language, start year, countries; POST with only interests → 200, `probability:{available:false,reason:"no-validated-methodology"}`; eligibility `2 met · 0 not met · 1 unknown`; compare table columns PROGRAM / UNIVERSITY / SUBJECT FIT / REQUIREMENTS / AFFORDABILITY / MATCH SCORE / NEXT DEADLINE; Save → 200; Create application plan → 200 → row in My Applications ("MIT | Computer Science (local QA fixture) · Fall · deadline 2027-01-15"); `npm run test:recommend` → **74 passed / 0 failed** |
| 11 | **Item 4** — onboarding: required marking, explanations, skip allowed, save-and-resume | **DONE (one rule fixed this pass)** | `src/components/OnboardingWizard.tsx`: 3 fields `required` + `aria-required=true`, `aria-invalid` on error, `role="alert"`, hint "…a password of at least 8 characters"; 6-char password now blocks Next (was accepted client-side, then rejected by the server), 8 chars proceeds; reload resumes "Step 2 / 8" |
| 12 | **Item 5** — sign-in / picker / account switch / dialog / validation at phone + tablet | **DONE (focus return fixed this pass)** | 390 and 768: dialog `role=dialog aria-modal=true` labelled `picker-title`, body scroll locked, focus moves inside, Escape closes, body unlocked, **focus returns to the menu toggle** (`activeIsMenuToggle=true`); wrong password → HTTP 401 + `role="alert" "Incorrect email or password"`; correct password → 200 and the QA profile loads |
| 13 | **Item 6** — QA data safety | **DONE** | see §10.6 |
| 14 | **Item 7** — prototypes: no stale cycle/deadline shown as current; warning matches the selected language | **DONE (two defects fixed this pass)** | `#cycleLabel` computes `Fall 2027` from the real date; sample due dates are computed (`2026-10-08 (in 5 days)` = today+5); notice localizes by `navigator.language` **and** now re-renders on switching to UZ/RU (with `<html lang>` updated); the corrupted trailing markup in `public/landing.html` was removed |
| 15 | Prototype `dashboard.html` sidebar must not overlap content at 768–1023 px | **DONE** | rendered with a locally compiled Tailwind build: sidebar 250 px / content 0 at <768 (off-canvas), **80 px / 80 px at 768, 820, 1023**, 250 px / 250 px at 1024 → overlap 0 px everywhere |
| 16 | Landing phone nav discoverable (not a scroller), brand readable, tablet header not crowded, keyboard menu | **DONE** | 320/360/390/768/820: header 73 px, brand 156 px (320–390) / 181 px (768+), `overflow=false`, `hScrollStrip=false`, menu button 44×44 with `aria-expanded`/`aria-controls`, opens by keyboard, closes with Escape and returns focus; the phone menu contains **Planning**, Sign in, Get started |
| 17 | Drawer open/close/scroll-lock/Escape/focus trap | **DONE** | `Navbar.tsx` + `ProfilePicker.tsx`; verified pre-reset at 390/1024 and re-verified for the picker at 390/768 this pass |
| 18 | Fixed/sticky/floating elements never cover content | **DONE** | at page bottom the last content sits 233 px (320), 208 px (390), 168 px (844×390) above the fixed bottom bar |
| 19 | Keyboard focus visible, correct names/states, progress not colour-alone, dark mode, reduced motion | **DONE** | focus cue on 9/9 controls (390) and 14/14 (1440); tabs are a labelled `tablist` with roving tabindex; progress bars carry text labels; `npm run test:dark` → 0 unreadable pairs; reduced motion honoured (animation duration 1e-05 s) |
| 20 | Horizontal scroll regions reachable by keyboard (WCAG 2.1.1) | **DONE (fixed this pass)** | new `ScrollRegion` in `src/components/hubs/ui.tsx`, applied to 4 tables; measured live: `role=region tabindex=0 aria-label="Compare"`, ArrowRight scrolled it 0 → 80; `unlabeledScrollers=0` on every destination |
| 21 | Touch targets ≥24×24 (WCAG 2.5.8) | **DONE (fixed this pass)** | footer links/buttons 16 px → 24 px; remaining smaller controls are 24 px (footer) and 28 px (forum sort) → all ≥24 px; nothing below 24 px except the 1×1 visually-hidden skip link |
| 22 | Long translations/labels must not truncate or hide controls | **DONE (fixed this pass)** | `.truncate` inside a grid track forced a 644 px page at 320/360/390 — fixed with `min-w-0` on `JourneyCard`; page width now equals the viewport at 320/360/390; "Scholarship matches" label no longer clips at 1024 |
| 23 | All new/changed nav, tab and hub text in en/uz/ru | **DONE** | `src/components/hubs/*` use `next-intl` (17 `t()` sites in `index.tsx`); uz/ru group + tab labels verified earlier this session; `npm run check:i18n` → 61 translated files, 1489 `t()` sites, parity OK |
| 24 | Destination *bodies* localized | **INCOMPLETE** | `JourneyControlCenter.tsx` (dashboard), `ApplicationCenter.tsx` (My Applications), `PlanningStudio.tsx`, `OnboardingWizard.tsx`, `ProfileModal.tsx` hard-code English (the picker's own validation is Uzbek). Pre-existing, not a regression: the navigation shell, hub titles/intros/tabs and the other destinations are translated. Fixing it means extracting ~100+ strings × 3 locales — a mechanical but large change, deliberately not made here. |
| 25 | Offers / Funding / Visa with populated post-admission data | **DONE (this pass, local fixtures)** | local offer (`accepted`, deposit 500, deadline) + 2 funding items: Offers & Decisions renders "1 ACCEPTED"; Funding & Deposits renders "My funding plan · MIT · Computer Science (local QA fixture) · $84,250 PER YEAR"; Visa & Departure renders both tabs and "DESTINATION COUNTRY"; no page overflow at 390 |
| 26 | Real screen readers, physical devices, real mobile keyboards | **UNVERIFIED** | no screen reader or hardware in this sandbox — see §10.9. Accessibility was checked through the Chromium accessibility tree, computed styles and real key events only. |
| 27 | Pixel-diff visual regression baseline | **UNVERIFIED** | the repository has no visual baseline; verification is measurement-based plus screenshots (§10.7). |

## 10.2 Fixes made in this pass

| # | Defect found by re-verification | File | Fix |
|---|---|---|---|
| F1 | A long university name in a `truncate` (nowrap) paragraph pushed the dashboard's grid track to 644 px → **horizontal page scroll on every phone** (320/360/390). Only reproducible once a realistic long title existed. | `src/components/journey/ui.tsx` | `min-w-0` on the `JourneyCard` root (grid items default to `minmax(auto,1fr)`); page width now equals the viewport at 320/360/390 and the title truncates with an ellipsis |
| F2 | Password rule mismatch: the UI accepted 6–7 characters, the server requires 8 (`MIN_PASSWORD_LENGTH`), so the user only learned about it from a server error. | `src/components/OnboardingWizard.tsx`, `src/components/ProfileModal.tsx`, new `src/lib/passwordPolicy.ts` | one client-safe constant, imported by the server module and both components; 6 chars now blocks, 8 proceeds |
| F3 | Four table scroll regions were not keyboard reachable (Chrome does not focus `overflow-x:auto` containers) — hidden columns were unreachable without a mouse. | `src/components/hubs/ui.tsx` + `UniversityExplorer`, `RecommendationStudio`, `CountryComparePanel`, `PlanningStudio` | new `ScrollRegion` adds `tabindex=0` + `role=region` + label **only while content overflows**; verified ArrowRight scrolls the compare table |
| F4 | `public/landing.html` leaked 47 lines of raw JavaScript source (and a second `</html>`) after the footer — user-visible junk text, present at HEAD before this task. | `public/landing.html` | removed the duplicated tail; file now has one `</html>`, 3/3 script tags, and the page ends at its footer |
| F5 | The dashboard prototype's language switcher changed the label but never re-rendered the prototype warning, so uz/ru users still saw the English notice. | `public/dashboard.html` | the switcher now calls `renderNotice()`; uz/ru/en notices + `<html lang>` verified |
| F6 | Seven full-width "Profile readiness" tiles stacked ~721 px on phones. | `src/components/journey/JourneyControlCenter.tsx` | 2 columns on phones (565 px at 320 / 482 px at 390), unchanged 3 columns on desktop |
| F7 | Seven full-width metric tiles stacked ~560 px on the phone applications page; the "Scholarship matches" label clipped at 1024. | `src/components/ApplicationCenter.tsx` | 2 columns on phones (363 px), `break-words` on the labels → 0 clipped labels at 1024/1440 |
| F8 | Footer links/buttons were only 16 px tall (below the 24×24 WCAG 2.5.8 minimum). | `src/app/page.tsx` | `inline-flex min-h-6 items-center` → 24 px, keyboard focus ring kept |
| F9 | Focus was lost to `<body>` when the sign-in dialog was opened from the phone menu (the menu closed and unmounted the opener). | `src/components/LandingPage.tsx` | activating a menu item returns focus to the menu toggle first, so the dialog has a live opener to restore focus to (verified at 390 and 768) |

No feature, API, database schema, permission or Premium rule was changed by any fix above.

## 10.3 Phone dashboard + applications layout (summary)

* **Dashboard @320/390:** journey bar/stepper → "At a glance" (2×2) → **Next steps first** → Upcoming
  deadlines → Application progress → Profile readiness (now 2 columns). "Next steps" is the first
  actionable block; the urgent deadline pill stays on the same screen.
* **Applications @320/390:** no table; each application is a stacked card (366×260 px at 390) whose
  first line is the university, the second the program · intake · deadline, followed by status and an
  "Open workspace" button. The metric strip is 2 columns (363 px) instead of 7 stacked tiles.
* **Tablets (768/820):** cards widen to 720 px with all fields on one line; the strip becomes
  3 columns; every table in the app is wrapped in a labelled, keyboard-scrollable region.

## 10.4 Recommender requirement status

All points verified: inputs optional and skippable (unknown ≠ unmet, provenance per input);
catalog-backed (no invented rows — the local DB had no programs at all until the labelled QA
fixtures were inserted, and the API returns 503 `data_unavailable` rather than mock data);
subject fit / eligibility / affordability / match score are separate dimensions;
`probability: {available:false, reason:"no-validated-methodology"}` with the UI stating the score is
not an admission probability and no numeric probability anywhere in the payload or copy;
official source + last-checked + stale flag per program; save → compare → "Create application plan";
the created plan carries university + program + intake + deadline into the workspace.
Evidence: `npm run test:recommend` (74/0) and the browser flow above.

## 10.5 Exact viewports and locales exercised in this pass

* Full destination sweep (14 destinations each): **320×740, 390×844, 430×932, 768×1024, 1024×600,
  1440×900** → **84/84** resolved, `scrollWidth == innerWidth` at every one.
* Additional layout measurements: **360×800, 820×1180, 844×390** (landscape phone, fixed bottom bar
  not covering content), **1024×768**.
* Locales: **en** (default), **uz**, **ru** via the `scholarbridge_locale` cookie for nav/hub text;
  the two static prototypes verified in en/uz/ru by `navigator.language` and by the language switcher.
* Themes: light + dark. Reduced motion: `prefers-reduced-motion: reduce`.

## 10.6 QA data safety

* The database is the sandbox-local embedded PostgreSQL: `select current_database(), inet_server_addr(), inet_server_port()`
  → `scholarbridge, 127.0.0.1, 5433`. `.pgdata/` is git-ignored.
* `.env.local` contains only `DATABASE_URL`, `SESSION_SECRET`, `APP_URL`, `ADMIN_NAME`,
  `ADMIN_EMAIL`, `ADMIN_PASSWORD` with throwaway dev values; no Supabase/Groq/production host is
  configured; the file is ignored by `.gitignore:24 (.env*.local)`.
* Rows written during this audit (local only): profiles 1 (Local Admin, seeded), 2 (Alex Chen,
  seeded), 3 (`qa.student@local.test`, created for QA); 5 programs, 4 program requirements and
  3 application cycles **all named "(local QA fixture)" with `example.com` sources**; 1 saved
  program; 1 application (id 1); 1 admission offer; 2 funding items. A throwaway sign-up probe
  account was deleted afterwards.
* No production credentials exist in the workspace, nothing was deployed, and no `git push` was run
  (§10.10). **Residual risk to state honestly:** the fixtures are *illustrative test data* in a local
  database — they are visibly labelled as such in the UI and must never be imported anywhere real.

## 10.7 Commands run in this pass (real output)

| Command | Result |
|---|---|
| `npm ci --no-audit --no-fund` | 477 packages installed |
| `node scripts/dev-db.mjs --init` | PostgreSQL 18.4 initialised, drizzle "Changes applied", 93 tables |
| `npx tsc --noEmit -p tsconfig.json` | **0 errors** (re-run after every edit, including the final one) |
| `npm run lint:baseline` | **PASSED — no new or worsened problems. 50 pre-existing issues remain baselined** |
| `npm run lint` | 50 problems (45 errors, 5 warnings) — identical to the recorded baseline |
| `npm run check:i18n` | **passed** — 61 translated component files, 1489 `t()` call sites |
| `npm run test:journey` | **90 assertions passed** |
| `npm run test:growth` | **28 assertions passed** |
| `npm run test:telegram` | **27 passed, 0 failed** |
| `npm run test:dark` | **0 unreadable pairs** |
| `npm run test:recommend` | **74 passed, 0 failed** |
| `npm run build` | **succeeded** (route table emitted) |

Browser scripts (Playwright + `@sparticuz/chromium`, Chromium 153) live in `/tmp/pw/` and are
scratch tooling, not part of the repository. Screenshots from this pass are in
`/home/user/verify-shots/` (e.g. `audit-320x740.png`, `item1b-390x844.png`,
`item2b-applications-390x844.png`, `rec-2-results.png`, `rec-6-compare-table.png`,
`onb-2-six-chars.png`, `item5c-390-badpw.png`, `proto3-dashboard-768.png`, `postadmin-offers-390.png`).

## 10.8 Honest limits of this evidence

* Measurements are Chromium-only. Firefox/Safari were not exercised.
* Screen-reader output, real touch interaction and on-screen-keyboard resizing are **not** verified —
  the accessibility tree, computed styles, key events and short viewports are the stand-ins used.
* The two static prototypes are rendered with a locally compiled Tailwind build of the same class
  list because the Play CDN is unreachable from the sandbox; class-level layout is faithful, the CDN
  runtime is not exercised.
* Offer/funding/visa states were verified with **labelled local fixtures**, not with real admission
  data (none exists in this environment).

## 10.9 Remaining manual QA checklist

1. **Screen reader pass** — NVDA/Firefox and VoiceOver/Safari: navigate the sidebar groups, the
   bottom nav "More" drawer, the tab lists, the profile dialog and the recommender results; confirm
   group names, `aria-expanded`, tab roles/selection, error alerts and the "not a guarantee" copy.
2. **Physical phones** — iPhone (Safari) and an Android (Chrome): bottom-nav thumb reach and
   safe-area spacing, the fixed bar over real browser chrome, the onboarding wizard with the
   on-screen keyboard open, and a long university name in the dashboard deadline card (regression
   test for F1).
3. **Real mobile keyboard** — focus the GPA/IELTS fields in the recommender and the step-0 password
   field: confirm the bottom bar does not cover the focused input when the keyboard is open.
4. **Tablets** — iPad Safari at 768/820: landscape rotation with the drawer open, and horizontal
   scrolling of the compare table by keyboard and touch.
5. **Zoom** — a real browser at 200 % (not the CSS `zoom` emulation): dashboard, applications and
   the recommender.
6. **Prototype review** — open `public/landing.html` and `public/dashboard.html` with the real
   Tailwind CDN to confirm visual fidelity beyond the class-level check.

## 10.10 Branch, commit and working-tree status

* Branch: **`arena/01a100ca-scholarbridgeai`**, HEAD: **`1bdfc14`** (the upstream merge commit).
* **The navigation work is NOT committed.** `git status --porcelain` lists 22 modified files plus
  the untracked `src/components/hubs/` and `docs/REPORT_NAV_2026-10.md`. `git reflog` shows only the
  clone and the branch checkout, `git fsck` reports no dangling commits, and the repository has **no
  upstream configured** — so any earlier statement that this work was committed as `c97896d` was
  wrong: that object does not exist in this repository. Nothing was reset or discarded; the working
  tree is the single source of truth for the changes. This finalization pass committed them
  **locally only**, as commit **`0416113`** ("Restructure navigation into 6 groups / 14 destinations
  + responsive & a11y fixes") on top of `1bdfc14` — the pre-existing commit was not amended or
  rewritten.
* **Nothing was pushed and nothing was deployed.** No remote-write command was executed in this
  session.
