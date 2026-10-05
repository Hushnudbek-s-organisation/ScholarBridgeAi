# Verification round — 2026-10-05

**Branch:** `arena/01a10cd6-scholarbridgeai` · **Base:** `main`@`7f6e7e5`
**Scope:** end-to-end consistency of the product (nothing may contradict anything
else; all data complementary and accurate) + a full correctness check of the
landing page.

---

## 1. How it was verified

| Layer | Evidence |
| --- | --- |
| Every test suite | 37/37 `npm run test:*` green (see §5) |
| Types | `npx tsc --noEmit` → clean |
| Production build | `npm run build` → rc 0 |
| i18n parity | `node scripts/check-i18n.mjs` → passed (1 652 `t()` call sites) |
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
* **AI provider credentials are absent in this environment**, so AI routes
  serve their grounded fallbacks (`aiUsed: false`). This is the designed
  behaviour, not a defect — and every fallback is verified to carry the same
  numbers as the deterministic engines.
* `ApplicationTracker.tsx` is dead code (only its types are imported).

## 6. Suite results

`test:ai-settings` 83 · `ai-format` 40 · `groq` 27 · `schema` ✓ ·
`security` 68 · `match` 74 · `api-security` 236 handlers refused anonymously ·
`chancing` 64 · `roadmap` 52 · `documents` 35 · `essays` 36 · `visa` 50 ·
`costs` 44 · `cv` 44 · `compare` 43 · `mentors` 37 · `parent` 41 ·
`dataset` 50 · `render` 144 · `essay-adapter` 39 · `rec-letter` 28 ·
`country-compare` 17 · `countries` ✓ · `opportunities` 14 · `essay-reviews` 16 ·
`integration` 246 · `growth` 28 · `telegram` 27 · `telegram-integration` 119 ·
`ownership` 83 · `portability` 57 · `journey` 91 · `dark` ✓ ·
`schema-repair` 15 · `provenance` ✓ · `recommend` 74 · `study-interests` 35
— **37/37 PASS**, `tsc` clean, `build` rc 0, lint gate passed.

Re-run after this pass (dev DB rebuilt from scratch, profile 2 = Alex Chen):
`ai-settings`, `ai-format` (40), `groq` (27), `schema`, `security` (68), `match`
(74), `chancing` (64), `roadmap` (52), `documents` (35), `essays` (36), `visa`
(50), `costs` (44), `cv` (44), `compare` (43), `mentors` (37), `parent` (41),
`dataset` (50), `render` (144), `essay-adapter` (39), `rec-letter` (28),
`country-compare` (17), `countries`, `opportunities` (14), `essay-reviews` (16),
`integration` (246), `growth` (28), `telegram` (27), `telegram-integration`
(119), `ownership` (83), `portability` (57), `journey` (91), `dark`,
`schema-repair` (15), `provenance`, `recommend` (74), `study-interests` (35).
`api-security`: **236 handlers across 131 route files refused anonymous access** —
run in slices (`PROBE_START`/`PROBE_END`), because a single 236-request burst
exhausts the sandbox's dev server; every slice exits green.
`check:i18n` passed; `ChancingPanel` SSR-renders in en/uz/ru with no key leaks.
