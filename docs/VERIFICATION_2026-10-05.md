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

## 4. Known remaining gap (not hidden)

The **engine prose and five live panes are still English-only**: match/issue
sentences from `matching.ts` / `chancing.ts` / `opportunities.ts`, and the
Chancing, Tasks roadmap, Deadline center, Planning studio and
Students-like-me panels (`ChancingPanel.tsx`, `TaskRoadmap.tsx`,
`DeadlineCenter.tsx`, `PlanningStudio.tsx`, `SimilarProfiles.tsx`). Fixing it
properly means returning reason codes (with parameters) from the engines and
translating them in the UI — an own pass, tracked as the next item.
`ApplicationTracker.tsx` is dead code (only its types are imported); it was left
untouched rather than deleted inside a data-consistency pass.

## 5. Suite results

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
