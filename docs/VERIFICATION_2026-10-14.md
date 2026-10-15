# ScholarBridgeAI — Universal Verification, Gap-Detection & Auto-Completion

**Date:** 2026-10-14 · **Branch:** `arena/925c9ae4-scholarbridgeai` · **Base commit:** `0aa16b5f0f80ecab589f08a7a395786d205e8601`
**Method:** INSPECT → REPRODUCE → ROOT CAUSE → SMALLEST FIX → VALIDATE → REPORT.
Every row below was checked against the file on disk (backend/pure function, route wiring + guard, React component mounted in the live hub tree, en/uz/ru keys). Nothing is marked VERIFIED from memory.

**ID mapping (stated once, so the table can't be read as more than it is):** the audit letter groups follow the master execution prompt's phase numbering — **A1–A11 = Phase 1 items 1.1–1.11**, **B1–B5 = Phase 2 items 2.1–2.5**, **C1–C5 = Phase 3 items 3.1–3.5**, **D1–D8 = Phase 4 UI/UX system**, **E1–E3 = Phase 5 growth pillars**, **F1–F3 = Phase 6 unit economics**, **G1–G4 = Phases 7–8 (sample library + admin god-mode)**. Requirement text is the phase-item text; where an item is a bundle (A9, A10, C3) the bundle is named in full.

---

## 1. Checkpoint table (42 rows)

| ID | Requirement (phase item) | Initial Status | Exact file(s) & line(s) | Final Status |
|----|--------------------------|----------------|-------------------------|--------------|
| **A1** | 1.1 cost-line key alignment + a funding plan that never drops a cost line | PARTIAL | `src/app/api/funding/route.ts:6,77` (`COST_LINES`, `fundingLinesFromCosts`); `src/lib/journey/funding.ts:340,383` | ✅ 100% COMPLETE |
| **A2** | 1.2 per-line coverage allocation (an item can never cover more than its own amount) | VERIFIED | `src/lib/journey/funding.ts:200` (`parseCovers` per-line split), `:397` | ✅ 100% COMPLETE |
| **A3** | 1.3 chancing double-count of `researchPublications` removed + sanitised | VERIFIED | `src/lib/chancing.ts:146–150,340` | ✅ 100% COMPLETE |
| **A4** | 1.4 readiness monotonicity (more data never scores lower) | VERIFIED | `src/lib/journey/readiness.ts:82`; asserted in `scripts/check-journey.ts` (`profile completeness` block) | ✅ 100% COMPLETE |
| **A5** | 1.5 single canonical `gpaTo40Scale` — unknown scale is `null`, never 4.0 | VERIFIED | `src/lib/gpa.ts:13–19` | ✅ 100% COMPLETE |
| **A6** | 1.6 TOEFL↔IELTS ETS concordance (comparison aid, not a requirement) | VERIFIED | `src/lib/englishTests.ts:24,44,52` | ✅ 100% COMPLETE |
| **A7** | 1.7 degree-level alias matching + next-upcoming cycle selection | VERIFIED | `src/lib/degreeLevels.ts:9,31,82`; `src/lib/recommend.ts:451,547` | ✅ 100% COMPLETE |
| **A8** | 1.8 currency-safe cost resolution; `familyIncomeUsd` is not a confirmed contribution | VERIFIED | `src/lib/costs.ts:95,147,185`; `src/app/api/funding/route.ts:67` | ✅ 100% COMPLETE |
| **A9** | 1.9 workspace progress overflow + application-scoped essay/funding queries + one unified `readyToSubmit` | VERIFIED | `src/app/api/workspace/route.ts:8,115–116,209`; `src/lib/journey/workspace.ts:119,209,240` | ✅ 100% COMPLETE |
| **A10** | 1.10 unused `uniType` filter wired, guidance panels hide per component, public SEO pages on canonical award fields | **BROKEN → fixed** | API had `type=` (`src/app/api/universities/route.ts:40,118–120`) but **no control ever sent it**. Fix: `src/components/UniversityExplorer.tsx` state `selectedType`, `params.set("type", selectedType)`, Public/Private select, `selectedType` in the refetch deps; SEO: `src/app/scholarships/page.tsx:113–139` reads canonical `amountUsdValue`/`awardAmount`; guidance tabs filter via `hiddenPanes` in `HubPage`. New assertion in `scripts/check-journey.ts` (“the public/private catalogue filter is wired end to end”) | ✅ 100% COMPLETE |
| **A11** | 1.11 remaining lint-baseline debt, and schema-repair expectations that cannot go stale | **PARTIAL → fixed** | `scripts/check-schema-repair.ts` now derives `EXPECTED_TABLES`/`EXPECTED_FKS` from `supabase/full_schema.sql` (95 tables / 117 FKs / RLS 95/95) → **15 passed, 0 failed**; lint baseline 39/26 vs allowed 45/30 → **PASS** | ✅ 100% COMPLETE |
| **B1** | 2.1 cross-test English signalling (`english_alternative_recorded`, 0 points, never a penalty) | VERIFIED | `src/lib/matching.ts` (evidence keys) + `scripts/check-match.ts` 90/0 | ✅ 100% COMPLETE |
| **B2** | 2.2 per-match `evidenceCoveragePct` + `confidenceTier` with a UI evidence pill | VERIFIED | `src/lib/matching.ts`; `src/components/MatchBreakdownStrip.tsx`; `scripts/check-render.ts` fixture | ✅ 100% COMPLETE |
| **B3** | 2.3 what-if simulator reachable from the shortlist (never a probability) | **MISSING → fixed** | Simulator existed only in `JourneyControlCenter.tsx`; now imported and mounted in `src/components/ChancingPanel.tsx` (`<WhatIfSimulator profileId={profileId ?? null} />`, after the signed-out early return). Assertions added in `scripts/check-panel-placement.ts` (29/0) | ✅ 100% COMPLETE |
| **B4** | 2.4 essay rubric: paragraph flow, agency (action vs weak verbs), prompt sub-question coverage | **MISSING → fixed** | `src/lib/essay.ts` (`splitPromptParts`, `analyzeFlow`, `analyzeAgency`, `analyzePromptCoverage`; total folded with a −2…+2 clamp; issues `paragraph_jump`/`weak_agency`/`prompt_gap`); `src/app/api/essays/route.ts` POST+PUT accept `prompt`; `src/components/EssayRubricStudio.tsx` prompt textarea + three panels; `ai.*` keys ×3; `scripts/check-essays.ts` **45/0** | ✅ 100% COMPLETE |
| **B5** | 2.5 visa rubric: per-turn coaching + profile-contradiction check | **PARTIAL → fixed** | Lib+route were done (`src/lib/visaScoring.ts` `buildTurnFeedback`/`checkProfileConsistency`; `src/app/api/visa/analyze/route.ts` `profileSnapshot`), the **client was not**: `src/components/VisaSpeakingAssistant.tsx` now sends `profile` in the analyze body and renders the per-turn coaching list + the contradiction banner; `visa.turn*` keys ×3; `scripts/check-visa-similar.ts` **90/0** | ✅ 100% COMPLETE |
| **C1** | 3.1 one canonical next-actions ordering for `/api/dashboard`, `/api/next-actions` and the AI advisor | **BROKEN → fixed** | New `src/lib/rankedActions.ts` (score bands `ACTION_SCORE`, `deadlineScore`, `actionUrgencyFromScore`, `compareRanked`, `rankActions`, `dedupeRanked`); `src/lib/nextActions.ts:96–102,234` and `src/lib/journey/nextSteps.ts:17,74,231` both delegate to it. Assertions in `scripts/check-journey.ts` (shared brain + “both engines call the shared ranking module”) → **127 assertions** | ✅ 100% COMPLETE |
| **C2** | 3.2 side-by-side offer & net-cost matrix (ranks nothing) | VERIFIED | `src/components/journey/OfferComparisonMatrix.tsx`; `src/components/journey/AfterAdmissionPanels.tsx:34,104`; `src/lib/journey/funding.ts:340,383` (`secured`, `netAnnualUsd`) | ✅ 100% COMPLETE |
| **C3** | 3.3 application-scoped materials — the selected application reaches document/essay/LOR panels and auto-links | **MISSING → fixed** | `src/components/hubs/index.tsx` (keeps `universityId`, resolves `selectedApplication`/`selectedLabel`, passes `applicationId`/`applicationLabel`/`universityId` down); `src/components/journey/PreparePanels.tsx` (`applicationIds: [applicationId]` on create + scope note, `journey.dvScopeLinked` ×3); `src/components/journey/AfterAdmissionPanels.tsx` (`visibleRequests`, `targetApplicationId` pre-fill); `src/components/EssayRubricStudio.tsx` (`universityId` on save + scope note, `ai.essayScopeLinked` ×3). Assertion in `scripts/check-journey.ts` | ✅ 100% COMPLETE |
| **C4** | 3.4 print / PDF export system | VERIFIED | `src/components/PrintSummaryButton.tsx`; `.no-print`/`.print-only`/`@media print` in `src/app/globals.css`; mounted in `src/components/PlanningStudio.tsx:365,409` and `src/components/journey/AfterAdmissionPanels.tsx:579,588` | ✅ 100% COMPLETE |
| **C5** | 3.5 workspace submission gate — one honest “ready to submit” verdict with named blockers | VERIFIED | `src/lib/journey/workspace.ts:214,240` (`submissionGate`, `ready`/`blockers`), surfaced as `readyToSubmit` at `src/lib/journey/workspace.ts:209` and `src/app/api/workspace/route.ts:90,209`; asserted in `scripts/check-journey.ts` | ✅ 100% COMPLETE |
| **D1** | 4.1 breadcrumb bar on every destination page | **MISSING → fixed** | New `HubBreadcrumb` in `src/components/hubs/ui.tsx` (nav with `aria-label`, `aria-current="page"`, Home as a real button, section crumb from the active pane label) rendered by `HubPage`; all 13 `<HubPage>` call sites in `src/components/hubs/index.tsx` pass `onHome`; `hubs.breadcrumbLabel`/`breadcrumbHome` ×3 | ✅ 100% COMPLETE |
| **D2** | 4.2 catalogue skeletons instead of a collapsing “Loading…” line | **MISSING → fixed** | `src/components/UniversityExplorer.tsx` loading branch: `aria-busy`, 6 placeholder cards (`animate-pulse`), `sr-only role="status"` keeping the translated label, no fabricated figures | ✅ 100% COMPLETE |
| **D3** | 4.3 nested-interactive fix in the course catalogue | **BROKEN → fixed** | `src/components/CourseCatalog.tsx`: clickable `<div>` wrapping a `<button>` replaced by a card with one full-size overlay button (`absolute inset-0 z-10`, `aria-label`) and a non-interactive `<span>` CTA | ✅ 100% COMPLETE |
| **D4** | 4.4 nested-interactive fix in the notification bell + notifications actually open their destination | **BROKEN → fixed** | `src/components/NotificationBell.tsx`: a row carrying `link` is now an `<a href>` (no nested control) that closes the panel and PATCHes `/api/notifications {profileId, notificationId}` — the row-level, ownership-checked contract (`src/app/api/notifications/route.ts:68–75`) | ✅ 100% COMPLETE |
| **D5** | 4.5 focus trap in `ProfileModal` | **PARTIAL → fixed** | New `src/components/useFocusTrap.ts` (Tab/Shift+Tab wrap, escaped focus pulled back, focus restored to the opener, visibility resolved from the DOM); wired `src/components/ProfileModal.tsx` (`dialogRef`, `tabIndex={-1}`) | ✅ 100% COMPLETE |
| **D6** | 4.6 focus trap in `CheckoutModal` | **PARTIAL → fixed** | same hook, `src/components/CheckoutModal.tsx` (`dialogRef`, `tabIndex={-1}`) | ✅ 100% COMPLETE |
| **D7** | 4.7 dark-mode contrast — no unreadable pairs | VERIFIED | `node scripts/dark-audit.mjs` → **0 unreadable pairs, 0 distinct**; new classes reuse the token-inverted patterns | ✅ 100% COMPLETE |
| **D8** | 4.8 responsive layout pass | VERIFIED | `node scripts/check-responsive.mjs` → **59/59**; new UI uses `min-h-11`, wrapped tab/breadcrumb rows, no new fixed-width overflow | ✅ 100% COMPLETE |
| **E1** | 5.4 research-agent diff & approval queue (field-by-field old→new, 1-click approve) | **MISSING → fixed** | New `src/lib/research-agent/approvalQueue.ts` (stable `<entity>.<field>` ids, `mergeQueues` keeps decisions, `queueSummary`, `approvedFieldKeys`); gate honoured by `src/lib/research-agent/persist.ts` (`fieldIsApproved`) via `RunRequest.approvedFields` (`types.ts`, `run-batch.ts`, `run/route.ts`); new admin route `src/app/api/admin/research-agent/queue/route.ts` (GET/POST, `requireAdmin` both); UI panel + “Apply approved” in `src/components/admin/ResearchAgent.tsx`; asserted in `scripts/check-growth.ts` | ✅ 100% COMPLETE |
| **E2** | 5.5 admission-outcome flywheel rewards (deterministic mapping, XP/badge/quota) | **MISSING → fixed** | New `src/lib/flywheel.ts` (`rewardForOutcome`, `flywheelStanding`, `FLYWHEEL_POINTS` 25/50 — **identical for every result**, no reward for a withdrawal, one per application, nothing for a detail-free click); hooked into `src/app/api/applications/outcome/route.ts` (idempotent via `awardPoints`, badge row keyed by criteria, best-effort so it can never fail the student's write); UI: decided-date field + reward banner in `src/components/ApplicationCenter.tsx` (`applications.formDecidedAt` ×3); asserted in `scripts/check-growth.ts` (44) | ✅ 100% COMPLETE |
| **E3** | 5.1–5.3 & 5.6 growth pillars still intact (focus mode, 10-second onboarding, Uzbekistan superpowers, Telegram micro-actions) | VERIFIED | `src/components/useStoredFlag.ts` + focus-mode checks in `scripts/check-journey.ts`; `src/components/ProfileAutoFillCard.tsx` + `src/app/api/ai/extract-profile/route.ts` with the numeric honesty filter; `src/lib/regionalScholarships.ts`/`visaChecklists.ts` + `src/components/RegionalSuperpowers.tsx`; Telegram stack `scripts/check-telegram*` **34/0** and **136/0** | ✅ 100% COMPLETE |
| **F1** | 6.1 regionally calibrated quota defaults | VERIFIED | `src/lib/config.ts:36,62–67` (`ai_free_live_sessions_per_day: 0`, `ai_premium_live_sessions_per_day: 1`), `src/lib/ai/quota.ts:48,59` | ✅ 100% COMPLETE |
| **F2** | 6.2 three-tier UZS pricing | VERIFIED | `src/lib/config.ts:26,28,30` (59 000 / 139 000 / 399 000), consumed by the payments flow (`scripts/check-payments.ts` 91/0) | ✅ 100% COMPLETE |
| **F3** | 6.3 monthly live-session ceiling enforced server-side | VERIFIED | `src/app/api/visa/live-token/route.ts:244` (`ai_premium_live_sessions_per_month`, default 8) + `src/lib/config.ts:64` | ✅ 100% COMPLETE |
| **G1** | 7.1 exemplars are STATIC content in `src/lib` — never auto-written to a profile, essay, vault or application | VERIFIED | `src/lib/samples/exemplars.ts` (registry, `SAMPLE_STRUCTURE_NOTE:68`); `scripts/check-samples.ts` **17/0** incl. the no-write assertion | ✅ 100% COMPLETE |
| **G2** | 7.2 a sample enters an editor only on an explicit user click | VERIFIED | `src/components/samples/SampleExemplarBar.tsx` (load only from `onLoad`, hosts: SOP studio, essay studio, LOR panel, visa assistant, answer vault, onboarding/auto-fill, CV reference panel, document vault, activity portfolio) | ✅ 100% COMPLETE |
| **G3** | 7.3 the integrity banner is shown wherever a sample is viewed or loaded | VERIFIED | `SAMPLE_STRUCTURE_NOTE` rendered by `SampleExemplarBar` (all 9 hosts), `src/lib/samples/exemplars.ts:14,68` | ✅ 100% COMPLETE |
| **G4** | 8 Admin God-Mode (session admin bypasses gates; `admin_all`/`pro_user`/`free_user` switcher) | VERIFIED | `src/lib/premium.ts:50–69` (`isAdmin → isPremium`, plan `admin`); `src/components/AdminModeContext.tsx`; `src/components/admin/AdminPanel.tsx`; asserted in `scripts/check-security.ts` (76) | ✅ 100% COMPLETE |

**Summary:** 6 rows were **MISSING/BROKEN/PARTIAL at the start of this round** and were implemented and wired in this round: **A10, A11, B3, B4, B5, C1, C3, D1–D6, E1, E2** (the previous round had already closed A1–A9, B1–B2, C2, C4, C5, D7–D8, E3, F1–F3, G1–G4). Every row now ends ✅ 100% COMPLETE with a file/line citation, a mounted UI where the requirement is UI-facing, and en/uz/ru keys where new copy was added.

---

## 2. Gate results — exact terminal output

Mandated order, all run at the end of this round on the working tree (no new commit; base `0aa16b5`).

```
### npm run typecheck
> tsc --noEmit
                                              → 0 errors (no output)

### npm run check:i18n
  t() call sites checked: 2671
i18n check passed.

### npm run test:dark
0 unreadable pairs, 0 distinct.

### npm run test:responsive
59 source-level checks passed.

### npm run lint:baseline
Lint gate PASSED — no new or worsened problems. 39 pre-existing issues remain
baselined (see docs/LINT.md).                                  [allowed: 45 / 30]

### npm run test:security           → security test passed (76 assertions)
### npm run test:calculations       → calculation test passed (55 assertions)
### npm run test:match              → ✅ 90 passed, 0 failed
### npm run test:chancing           → ✅ 19 passed, 0 failed
### npm run test:recommend          → ✅ 94 passed, 0 failed
### npm run test:costs              → ✅ 52 passed, 0 failed
### npm run test:compare            → ✅ 43 passed, 0 failed
### npm run test:country-compare    → ✅ 24 passed, 0 failed
### npm run test:essays             → ✅ 45 passed, 0 failed
### npm run test:essay-adapter      → ✅ 43 passed, 0 failed
### npm run test:visa               → ✅ 90 passed, 0 failed
### npm run test:roadmap            → ✅ 67 passed, 0 failed
### npm run test:journey            → journey test passed (127 assertions)
### npm run test:growth             → growth test passed (44 assertions)
### npm run test:ai-cost            → AI cost test passed (59 assertions)
### npm run test:payments           → ✅ 91 passed, 0 failed

### npm run build   (rm -rf .next; DATABASE_URL=<dummy>)
✓ Compiled successfully in 17.9s
✓ Generating static pages using 1 worker (79/79) in 136ms     → exit 0
```

Additional suites run in the same round (all green):

```
test:render 307/0 · test:samples 17/0 · test:regional 12 sections · test:documents 35/0
test:cv 59/0 · test:panel-placement 29/0 · test:schema-repair 15/0 · test:telegram 34/0
test:telegram-integration 136/0 · test:study-interests 35/0 · test:referral 56/0
test:streak 10 assertions · test:ownership 83/0 · test:ui 37/0  (new script, `npm run test:ui`)
```

Environment-gated (unchanged, not code failures): `test:api-security` and `test:provenance` need a running dev server + database.

---

## 3. Invariants preserved in this round

- Security boundaries untouched: `requireSession`, `requireProfileAccess`, `requireRowAccess`, `guardStudent`, `guardAiRequest`, `premiumGate`, SSRF guard, constant-time webhook checks. The two new routes (`research-agent/queue`, `applications/outcome` reward) are admin-guarded / owner-guarded respectively; the queue's row-level contract keeps `requireAdmin` on both verbs.
- **NULL stays unknown**: the queue renders `NULL` (not 0) for an unrecorded catalogue value; the flywheel pays nothing for a detail-free record; the visa profile check skips null fields; the what-if simulator still returns requirement-verdict flips, never a probability.
- **No reward for being admitted**: `rewardForOutcome` pays the same for accepted / rejected / waitlisted, nothing for a withdrawal, and once per application (ledger-idempotent).
- Existing assertions were only *updated* where they encoded a fixed defect (schema counts, TOEFL concordance, PremiumGate admin bypass); none were weakened or deleted. New assertions were added for every new behaviour.
- Dark mode stayed at **0 unreadable pairs** and responsive at **59/59** after all UI edits; every new string was added to en/uz/ru simultaneously (i18n PASS, 2 671 call sites).
- No destructive SQL, no schema change: the approval queue lives in the existing keyed `app_config` row.
