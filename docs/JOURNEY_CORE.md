# ScholarBridgeAi — "Study Abroad Journey" reorganisation

Date: 2026-09-29
Base commit: `69e7fc4` (branch `arena/01a0ebf7-scholarbridgeai`)

---

## 1. What already exists (audit result)

The product was **not** a blank sheet. Before changing anything I mapped the 41
requested sections onto what is already in the repository. The rule applied
throughout: **extend, never duplicate**.

| Requested area | Existing implementation | Decision |
| --- | --- | --- |
| Authentication / profiles | `student_profiles` + scrypt `password_hash`, HttpOnly signed session cookie (`sb_session`), `/api/auth/*`, `requireProfileAccess` / `requireRowAccess` | **Reuse untouched.** Every new route goes through the same guards. |
| University Explorer | `UniversityExplorer.tsx`, `UniversityDetail.tsx`, `/api/universities`, `/api/universities/[id]`, `universities` + `programs` + `program_requirements` + `application_cycles` + `sources` tables | Extend: add the missing filters, surface the existing `source_url` / `last_verified_at` / `verification_status` columns on every fact. |
| Scholarship Hub | `ScholarshipHub.tsx`, `scholarships` table (already has `tuition_coverage`, `accommodation`, `living_allowance`, `travel_allowance`, `required_documents`, `verification_status`) | Extend: show exact coverage, never a vague "full scholarship" label. |
| Scholarship Autopilot | `src/components/growth/ScholarshipAutopilot.tsx`, `/api/autopilot` | Extend: add the explicit "why it matches" breakdown. |
| Opportunities / Country compare | `OpportunitiesPanel`, `CountryComparePanel` | Reuse. |
| My Chances / Profile Strength | `chancing.ts` (deterministic), `ChancingPanel`, `ProfileStrengthPanel`, `/api/profile-strength` | Reuse the scorer; add the *readiness* category view on top. |
| Goals | `student_goals` + `goal_templates` (Goal Planner) | Keep. **My Study Plan** is a different object (a dated, phase-based plan) → new table, linked to goals. |
| My Activities | profile free-text columns (`leadership`, `volunteering`, `sports`, …) | Keep for the quick form; add a real **Activity Portfolio** table with evidence. |
| Admission Stories / Students like me | `success_stories`, `SimilarProfiles`, `similarProfiles.ts` (consent-gated) | Reuse the consent gate. |
| Applications | `applications`, `application_outcomes`, `application_documents`, `application_tasks`, `ApplicationCenter` | **Extend** — the workspace, requirements, offers and submission all hang off the existing `applications` row. |
| Documents | `application_documents` (per-entity checklist) + `src/lib/documents.ts` checker + `DocumentChecklist.tsx` | Add a **profile-level vault** (`user_documents`) that the per-application checklist links to — one upload, many applications. The existing checker keeps working. |
| Tests | `test_bookings` (dates only) | Add `test_plans` / `test_attempts` / `test_tasks`. |
| Financial Plan | `costs.ts` + `PlanningStudio` (calculator + portfolio) | Extend into a persisted **Funding Plan** (`funding_items`) with a funding gap. |
| Answer Vault / AI SOP | `answer_vault`, `essay_versions`, `essayAdapter.ts`, `AiSopStudio`, `EssayRubricStudio` | Reuse untouched. |
| Tasks & Roadmap | `application_tasks`, `TaskRoadmap`, `nextActions.ts`, `/api/roadmap/generate` | Reuse the ordering engine; feed it the new requirement/deadline sources. |
| Deadline engine | `/api/deadlines` merges applications + scholarships + test dates + milestones | **Extend** into `journey_deadlines` with a *reverse planning* generator. |
| Visa | `VisaSpeakingAssistant`, `visa-interview.ts`, `visaScoring.ts`, `/api/visa/*` | Reuse; add the case tracker + country requirement records (admin-published, never AI-invented). |
| Departure | `growth/DepartureChecklist.tsx`, `/api/departure` | Reuse; auto-activate on acceptance. |
| Parents | `parentShareEnabled` + `ParentDashboard` + `parentSummary.ts` | Reuse the explicit-consent model. |
| AI Advisor | `/api/ai/chat`, `advisor.ts`, `groq.ts`, `gemini.ts`, `ai_usage` | Reuse. Add a **role** layer (Admission / Scholarship / Essay / Document / Visa / Planning / Mentor) + claim labelling. |
| Telegram | full bot + mini app + webhook | Reuse. |
| Payments / Premium | `payments`, `subscriptions`, `entitlements.ts` (config-driven feature→plan map) | Reuse; the new Premium tiers are added as `FeatureKey`s, enforced server-side. |
| Admin panel | `AdminPanel.tsx` + 18 managers, `app_config` key/value | Reuse; add managers for the new tables + a generic catalogue editor. |
| Search | `CommandPalette.tsx` (Ctrl+K, sections only) | Extend: search the real entities, not just the nav. |
| Notifications | `notifications`, `notificationPreferences`, `notificationSweep.ts`, `notificationTexts.ts` | Reuse; add the new types + a non-disableable `security` type. |
| Future IELTS partner | nothing | **Not implemented.** Only a generic `External Learning Provider` contract + admin registry. |

### Tables that are explicitly **not** created
`users`, `profiles`, `universities`, `scholarships`, `applications`,
`notifications`, AI config and Telegram config are all reused as-is.

---

## 2. New, additive data model

All created lazily and idempotently by `src/lib/journey/db.ts` (same pattern as
`ensureGrowthTables`), mirrored in `supabase/add_journey_core.sql` and in
`src/db/schema.ts`. No existing table is altered or dropped.

```
student_profiles
  ├── study_plans ── study_plan_phases            (§12 My Study Plan, 10 phases)
  ├── user_documents ── activity_evidence         (§7 Document Vault, §14 evidence)
  │        └── application_document_links
  ├── test_plans ── test_attempts / test_tasks    (§8 Test Planner)
  ├── student_activities                         (§14 Activity Portfolio)
  ├── funding_items                               (§9, §24 My Funding Plan)
  ├── journey_deadlines                          (§21 Deadline engine)
  ├── learning_provider_links ── learning_scores (§32 generic provider contract)
  └── applications
        ├── application_requirements              (§5 Requirements engine)
        ├── recommendation_requests               (§19 Recommendation manager)
        └── admission_offers                      (§23 Offers & Decisions)

requirement_templates   (university/program level, admin-published, sourced)
learning_providers      (admin registry — empty by default, no partner hardcoded)
visa_requirements       (country × visa type, admin-published, sourced)
```

### Why `application_requirements` is a real table and not computed JSON
The requirements engine (§5) must be *editable by the student* (I uploaded it),
*writable by the admin* (university-specific templates) and *auditable* (source
+ last verified on every row). A computed structure cannot carry those three
properties, so the row is persisted and the template is the seed.

---

## 3. Journey model

Eight stages, one active stage, one progress number:

```
discover → match → prepare → apply → accepted → fund → visa → depart
```

The stage is **derived from the student's own data** on every request
(`src/lib/journey/stages.ts`, pure + unit-tested) — it is never stored, so it
can never drift from reality.

`TRACK` from the original spec sentence is folded into the `apply` stage
(the applications tracker *is* the tracking), and `FUND` is a stage of its own
because §24 needs a home after acceptance.

---

## 4. Honesty rules enforced in code

* Every requirement carries `sourceUrl` / `sourceName` / `sourceType` /
  `lastVerifiedAt` / `verificationStatus`; an unsourced row is rendered as
  "Not specified", never as a fact.
* `requirement_templates` and `visa_requirements` are written **only** by admins.
  The AI research agent may propose; it may not publish (existing
  `verificationStatus` workflow is reused).
* The AI layer labels every statement `verified_fact` | `user_provided` |
  `ai_suggestion` | `uncertain` and the UI renders the label.
* No admission-probability claim is derived from an English score delta
  (`src/lib/journey/readiness.ts` states the gap, it does not re-score chances).
* New tables are all `ON DELETE CASCADE` from `student_profiles`, and every
  route uses `requireProfileAccess` — a student can only ever read their own rows.

---

## 5. Navigation

`src/lib/navSections.ts` becomes the single source of truth for **8 groups**
(`home`, `discover`, `journey`, `prepare`, `apply`, `after`, `help`, `account`).
`Navbar` renders collapsible groups on mobile and a flat grouped rail on desktop;
the group containing the active tab is forced open, so the active page is always
visible. The admin toggle (Admin → Navigation) keeps working on the new ids, and
`DEFAULT_HIDDEN_NAV_ITEMS` is preserved so an existing install does not suddenly
show six sections it had deliberately hidden.

---

## 6. Look & motion (2026-09-29 polish)

The journey screens share one motion vocabulary instead of each panel inventing
its own. Everything is **transform/opacity only** and is switched off globally by
the `prefers-reduced-motion` rule in `src/app/globals.css`.

**Reusable pieces**

| Where | What it gives you |
| --- | --- |
| `src/components/motion/` | `MotionProvider` (`reducedMotion="user"`), `PageTransition`, `SectionTransition`, `Reveal` / `RevealGroup` / `RevealItem`, `AnimatedNumber` / `AnimatedBar` / `AnimatedRing`, and the shared springs/variants. |
| `src/components/journey/ui.tsx` | `JourneyCard` (entrance + `tone="hero"` aurora + `interactive` hover lift), `ProgressBar` (draws its fill, sheen while incomplete), `Loading` (shimmer skeleton), `SkeletonCard`, `StatTile` (counting number, state-tinted), `ProgressRing`, `Pill`, `Empty`, `SourceTag`. |
| `src/app/globals.css` → “JOURNEY POLISH” | `sb-skeleton`, `sb-shimmer`, `sb-rise`, `sb-card-hover`, `sb-progress-sheen`, `sb-gradient-text`, `sb-aurora`, `sb-pop`, `sb-fade-in`. |

**Conventions**

- Animate on scroll **once** (`viewport={{ once: true }}`) — re-animating on the
  way back up looks restless and costs CPU on long pages.
- Stagger with `RevealGroup`/`RevealItem` or an index-multiplied `delay`
  (0.04–0.07 s per row); never more than ~0.4 s total.
- A card animates its *entrance*; only genuinely interactive cards
  (`interactive`, or the shared `sb-card-hover` class) lift on hover.
- Numbers the student is waiting on count up (`AnimatedNumber`); numbers that
  update while they type (search, filters) do not.
- The NEW badge in the sidebar retires itself on `NEW_BADGE_UNTIL`
  (`src/lib/navSections.ts`) — it is a release date, not a feature flag.
