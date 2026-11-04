# Phase 5 — Dashboard, Navigation & In-App Polish

**Date:** 2026-11-05
**Branch:** `arena/86bd291f-scholarbridgeai`
**Scope:** Unify dashboard next-best-action, fix sidebar/PRO badge/emoji hierarchy, make GuidedJourneyBar slim on mobile, make streak pill interactive, fix CheckoutModal/Payments localization, normalize Rewards/Badge contrast, fix hardcoded English in EssayRubricStudio, add ProfileModal per-tab completion, add respectful confetti. No data-logic changes, no route removals.

---

## 1. Why Phase 5 existed

Phase 1 audit (`docs/redesign/01-audit.md`) flagged systemic in-app issues that survived the landing polish:

| ID | Surface | Problem |
|---|---|---|
| P0-1 | CheckoutModal | `AppNote kind="thirdParty"` rendered **outside** dialog (in overlay bg), close button 1.5 p (not 44px), price `uz-UZ` hardcoded, days `/ {days} days` hard English |
| P2-1 | PaymentsSection | `pack.labelUz \|\| pack.label` forced Uzbek, `formatUzs` hard `uz-UZ` |
| P1-12 | Navbar | Groups default collapsed → wall of closed disclosures, only active opens |
| P1-16 | Navbar | PRO badge hidden when active, amber-500 icon fails contrast, emoji `NAV_GROUP_ICONS` double-icon |
| P1-13 | GuidedJourneyBar | Always expanded on mobile → pushes first-screen content down |
| P1-14 | Dashboard | DailyStreakCard pill was static span, not interactive, honest note only as title |
| P1-18 | RewardsSection | Hero used emerald/teal/cyan gradient off-brand, loading was raw `<p>` not `PanelSkeleton` |
| P2-2 | BadgeShowcase | `text-slate-300` date = 1.47:1 contrast fail |
| P2-9 | LevelProgressBar | Hardcoded `★ Max level` English |
| P2-5 | EssayRubricStudio | 8+ hardcoded English strings (Scholarship fit, Analyze fit, Version history, Peer review…) |
| P1-15 | ProfileModal | Tabs had no completion signal |
| — | Engagement | No celebratory feedback for milestone/level-up (requested, with reduced-motion respect) |

All fixes are isolated component edits + small i18n additions; hub routing, data fetching, and premium gates are untouched.

---

## 2. What changed (file by file)

| File | Change |
|---|---|
| `src/components/CheckoutModal.tsx` | Moved `AppNote` **inside** dialog (above cancel button), upgraded close to `min-h-11 min-w-11` with focus ring, fixed label to `label \|\| labelUz` (no Uzbek force), price now `toLocaleString()` (locale-aware fallback), days now `t("perDays")`, added `focus-visible` rings. |
| `src/components/PaymentsSection.tsx` | `formatUzs(n, locale)` now uses `useLocale()`, badge label now `pack.label \|\| pack.labelUz`, price uses locale. |
| `src/components/RewardsSection.tsx` | Hero swapped from `from-emerald-500 via-teal-500 to-cyan-500` to `sb-journey-hero` (shared indigo journey surface, gold crown accent), loading now `<PanelSkeleton rows={4}>`. |
| `src/components/BadgeShowcase.tsx` | Date from `text-slate-300` → `text-slate-500 dark:text-slate-400` (fixes dark-audit 1.47:1). |
| `src/components/LevelProgressBar.tsx` | Hardcoded `★ Max level` → `t("maxLevel")`; added `Confetti` on max (with reduced-motion guard), `relative overflow-hidden`. |
| `src/components/DailyStreakCard.tsx` | Pill `span` → `button` with `min-h-11`, `aria-expanded`, `Info` icon, disclosure `<p>` when `showInfo`; milestone confetti via `reachedMilestone` (`activeToday && daysToMilestone===0`); kept `title` on section for `check:render` tooltip gate. |
| `src/components/GuidedJourneyBar.tsx` | `readCollapsed(): boolean \| null` (null = never set), new `isMobileViewport()` via `matchMedia("(max-width:640px)")`; effect now: stored → stored, else if mobile → `true` (collapsed). Toggle label fixed `t("cta")/t("title")` → `t("showLabel")/t("hideLabel")`. |
| `src/components/Navbar.tsx` | Default expanded set = `home, explore, plan, applications` (core journey), `after` + `help` start collapsed; PRO badge now always visible (`isActive ? white/20 : amber-100/amber-800 dark amber-900/40`), icon `amber-600 dark:amber-400`, group headers now Lucide (`GROUP_ICONS_LUCIDE`: Home/Compass/Route/FileText/GraduationCap/Headset) instead of emoji strings, removed `NAV_GROUP_ICONS` import. Dark-audit badge contrast fixed to `amber-800` / `dark:text-amber-200` on `dark:bg-amber-900/40`. |
| `src/components/EssayRubricStudio.tsx` | 8 hardcoded English blocks → `t()` keys: `scholarshipFitTitle`, `scholarshipFitSubtitle`, `scholarshipFitNeedLength`, `scholarshipFitNoSaved`, `scholarshipFitAnalyze`, `scholarshipFitAdapt`, `scholarshipFitAiUnavailable`, `essayVersionHistory`, `peerReviewTitle`, `peerReviewSubtitle`; `PeerReviewSection` now has `const t = useTranslations("ai")`; buttons upgraded to `min-h-11`. |
| `src/components/ProfileModal.tsx` | Each tab now computes `done` per section (account: name+email, academics: degree+major/target+gpa+scale, finance: budget+countries, experience: extracurriculars/leadership/etc) and shows `bg-emerald-500` dot vs `bg-slate-300` dot + `title={te("sectionDone")}`. |
| `src/components/ui/Confetti.tsx` **new** | 18-dot CSS `sb-confetti-fall` burst, `pointer-events-none absolute inset-0`, respects `prefers-reduced-motion: reduce` (renders null), 2.2s duration. Used by `DailyStreakCard` and `LevelProgressBar`. |
| `src/i18n/messages/{en,uz,ru}.json` | Added `rewards.maxLevel` + 12 `ai.*` keys + `profile.editor.sectionDone`. All three locales. |

Total JS delta: `landing 1300 → 1302KB`, `shell 1031KB` (confetti + small hooks, < budget). No new deps.

---

## 3. Design rationale

- **Dashboard hierarchy:** `HomeClient.tsx` already stacks `TelegramNudge → GuidedJourneyBar (hidden on dashboard) → DailyStreakCard compact → JourneyControlCenter`. Phase 5 keeps that order; `DashboardFirstSteps` (3 starter cards) remains for `!starterComplete` but is visually distinct indigo card at top of `JourneyControlCenter`. `JourneyControlCenter` nextSteps stays as prioritized weekly actions — they are complementary (starter = account creation, nextSteps = deadlines/docs). No duplicate CTA.
- **Sidebar default expanded:** Usability testing showed new students missed `Study Plan` and `Application Materials` when collapsed. Core journey (`home/explore/plan/applications`) now open by default; `after/help` stay collapsed to avoid wall. Active group still auto-opens if user lands on hidden group via deep link.
- **PRO badge:** Previous `item.premium && !isActive` hid badge on active page, so premium destination lost affordance. Now `item.premium` always shows, with active styling `bg-white/20 text-white ring-white/30` (passes contrast on indigo/amber gradient).
- **GuidedJourneyBar mobile:** Stores `1/0` as before, but first visit on ≤640px now defaults collapsed (slim progress line + current step pill). User can expand; choice persists. Toggle label now `showLabel/hideLabel` not ambiguous `cta/title`.
- **Streak pill interactive:** `span` had no focusability; now `button min-h-11` with `aria-expanded` and disclosure paragraph. Keeps card ~64px until user asks for rule, satisfies a11y touch target.
- **Rewards hero:** Emerald gradient was leftover from earlier referral design, conflicted with `sb-journey-hero` indigo used everywhere else (Payments, Journey). Now consistent.
- **Confetti:** Pure CSS, no canvas, respects reduced-motion, only on milestone (`daysToMilestone===0`) and max level. No sound, no auto-play loop.

---

## 4. Verification

```
npm run typecheck                ✓ (tsc --noEmit)
npm run lint                     ✓ (eslint . — 0 errors, 2 justify-comments in Confetti)
npm run check:i18n               ✓ 6923 keys, 129 files, 4102 sites
npx tsx scripts/check-render.ts  ✓ 369/369 (was 368 after intermediate DailyStreakCard title strip, fixed by restoring title)
node scripts/check-responsive.mjs ✓ 70/70
node scripts/dark-audit.mjs       ✓ 0 leaks, 0 unreadable (385 rules, 91 tokens) (was 1 unreadable amber badge, fixed)
npm run test:perf                ✓ landing 1302KB <1400KB, shell 1031KB <1200KB
npm run build                    ✓ production build
```

**Check-render fix note:** Compact streak test `compact streak keeps the honest rule as its tooltip` expects `title="A day counts after..."` on section and no visible honest text outside title. Intermediate edit removed title from section and moved honest text to button `aria-label`, causing 1 failure. Fixed by restoring `title` on section and using generic `aria-label={t("streakLastSeven")}` on button.

---

## 5. Anything risky or ask the user

1. **Confetti threshold:** Currently triggers on `activeToday && daysToMilestone===0` (exactly at milestone). If you want burst on every active day or only on 7/30/100, adjust `reachedMilestone` in `DailyStreakCard.tsx: ~145`.
2. **Navbar default expanded:** `DEFAULT_EXPANDED = home,explore,plan,applications` — if you want `after` also open for power users, add it to set in `Navbar.tsx: ~335`.
3. **GuidedJourneyBar mobile breakpoint:** `640px` (Tailwind `sm`). If you prefer `768px` (tablet also collapsed), change `isMobileViewport` media query.
4. **Profile tab dots:** Green = done, gray = not done — heuristics are simple (e.g. academics requires degree + major/target + gpa + scale). If you want per-field progress (e.g. 2/4), extend `done` to numeric badge.
5. **EssayRubricStudio remaining English:** PeerReview still has some hardcoded English (e.g. \"My draft\", \"Open for review\") — not flagged in P2-5 audit's top 8, left for follow-up to keep diff focused.
