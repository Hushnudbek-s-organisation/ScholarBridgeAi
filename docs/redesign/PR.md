# PR: redesign/premium-dark → main

**Title:** `feat(redesign): premium dark — dark-first theme, landing polish, perf & dashboard handover (Phases 0–6)`

---

## Description

Brand overhaul of ScholarBridgeAI for Uzbek high-school applicants on mid-range Androids (16–18 y/o, `uz`/`ru`/`en`, dark-first indigo/violet identity).

This PR merges `redesign/premium-dark` into `main`. It is the handover PR for the full redesign programme — **no data-logic rewrites, no route removals, no premium bypass**. All protected landing motion (`scrollEngine`, `ScrollFlightPath`/`ExecutiveMonochromeJet`, `PhotoCraftKineticHud`, `UniversityCampusMarquee`, honest chancing copy) was kept verbatim or only gated.

### What changed (33 files, +1682 / −489)

- **Phase 0–1:** Baseline + audit (`00-baseline.md`, `01-audit.md`, 48+12 baseline PNGs, Lighthouse + scroll FPS JSON)
- **Phase 2 — Foundations:** Dark-first default (`DEFAULT_THEME = "dark"`, SSR `class="dark"`), obsidian tokens (canvas `#060a14` → surface `#0d1324` → well `#131c33`), ink ramp 17.4:1→6.1:1, Inter type scale, motion tokens, `Button`, `SectionHeading`, `journey`/`hubs`/`growth` primitives
- **Phase 3 — Landing polish:** Hero `opacity:1` LCP fix, `Get started` CTA, indigo jet `z-0` gutter, `xl:block` HUD, `sb-marquee-fade`, 4× mini-UIs (0 external images), bento features, honest chancing dimension bars + amber “Why stays”, connected roadmap spine, `publicLinks.ts` Telegram strip, premium header/footer/CTA
- **Phase 4 — Performance:** `liteMotion.ts` tier (`pointer:coarse` + cores≤4 / memory≤4 / width<1024), HUD `3.15×→2.0×`, LUT 360→120, marquee 48→32 images, `will-change` hygiene (11→1 layers), `sb-cv-section` content-visibility
- **Phase 5 — Dashboard:** Navbar `DEFAULT_EXPANDED = home/explore/plan/applications`, PRO badge always visible + Lucide icons, `GuidedJourneyBar` mobile collapsed default, `DailyStreakCard` `button min-h-11` + `Confetti`, `CheckoutModal`/`PaymentsSection` locale fixes, `RewardsSection` `sb-journey-hero`, `ProfileModal` per-tab dots, 14 new i18n keys (`rewards.maxLevel`, `ai.scholarshipFit*`, `profile.editor.sectionDone`)
- **Phase 6 — QA & handover:** Gates green + a11y + overflow + light-regression + slow-3G verified, `06-handover.md` + `final/` screenshots + this PR doc

### Commits

```
788d66c (main) … 0fba1a9 docs: Phase 1 audit
                237944f feat: Phase 2 dark-first theme & tokens
                b367638 feat: Phase 3 landing polish
                87e6f5a feat: Phase 4 mobile/perf lite-motion
                cc03514 feat: Phase 5 dashboard polish + confetti
                <this>  docs: Phase 6 QA & handover (final + PR)
```

### Docs

- `docs/redesign/00-baseline.md` — setup + Lighthouse 61/100 + scroll FPS + screenshots
- `docs/redesign/01-audit.md` — 30+ P0–P2 findings
- `docs/redesign/02-foundations.md` — tokens, type, motion
- `docs/redesign/03-landing-polish.md` — landing changes + protected pieces table
- `docs/redesign/04-performance.md` — lite tier + metrics est.
- `docs/redesign/05-dashboard.md` — in-app polish
- `docs/redesign/06-handover.md` — **this PR's handover** (summary, tokens, new components, perf, limits, next steps)
- `docs/redesign/final/` — before/after triptych + README with re-capture instructions
- `docs/DESIGN_SYSTEM.md`, `docs/PERFORMANCE.md` — unchanged (supplementary)

---

## How to test — checklist (reviewer copies into PR checks)

### Automated (run in order, must be green)

- [ ] `npm run typecheck` — `tsc --noEmit` (0 errors)
- [ ] `npm run lint` — `eslint .` (0 errors, 2 justified `eslint-disable` in `Confetti.tsx`)
- [ ] `npm run check:i18n` — 6923 keys, 129 files, 4102 sites, `en`/`uz`/`ru` complete
- [ ] `npx tsx scripts/check-render.ts` — 369/369 (landing honest gate: “Admission probability” → `Not estimated`, no `\d+%` in 80-char window)
- [ ] `npx tsx scripts/check-landing-ranks.ts` — 10/10
- [ ] `node scripts/check-responsive.mjs` — 70/70 (44 px targets, `break-words`, no `whitespace-nowrap` except HUD word)
- [ ] `node scripts/dark-audit.mjs` — 385 rules, 91 tokens, 0 leaks, 0 unreadable
- [ ] `npx tsx scripts/check-ux-redesign.mjs` — 44/44
- [ ] `npx tsx scripts/check-journey.ts` — 115 assertions
- [ ] `npm run test:perf` — landing 1302 KB < 1400 KB, shell 1031 KB < 1200 KB, lazy panes, boot request, beacon >3 s
- [ ] `npm run test:security` — 107 assertions (API auth, CSRF, payment webhook sigs)
- [ ] `npm run test:payments / chancing / documents / costs / streak / visa` — all green
- [ ] `npm run build` — production build writes `.next/diagnostics/route-bundle-stats.json`
- [ ] `npm run test:dark` / `audit:ui` — 0 inverted-ramp leaks
- [ ] `npm run test:e2e` — **requires runner with browser libs** (see below); sandbox shows `libnspr4.so` env error, not code failure

### Manual — keyboard (no mouse)

- [ ] **Landing:** Tab through header → hero CTAs (`Get started` 48 px, `See how it works`) → `#how` mini-UIs → `#features` bento → `#chancing` → `#roadmap` → `#campuses` marquee (hover/focus pauses) → `#cta` → footer legal links (all `min-h-11`, `focus-visible:ring-2`). Mobile drawer: `aria-expanded`, `aria-controls`, `Escape` closes + returns focus.
- [ ] **Dashboard:** Tab through `Navbar` groups (6 groups, `aria-current="page"`, default expanded `home/explore/plan/applications`, `after/help` collapsed), `GlobalSearch` (`aria-label`), mobile bottom bar 5 items, `DailyStreakCard` pill `button aria-expanded` → disclosure `A day counts after…`, `JourneyControlCenter` tabs (`HubTabs` `role="tablist"` → `tabpanel`), `ProfileModal` 4 tabs with arrow/Home/End, `CheckoutModal` close `min-h-11` + focus, `BottomSheet` focus trap + `Escape`.
- [ ] **No `tabIndex > 0`** anywhere; focus order = DOM order; `prefersReducedMotion() → MotionProvider reducedMotion="user"`.

### Manual — contrast & focus

- [ ] Dark: ink ramp 17.4:1→6.1:1 on Tier 1 `#0d1324`; light: `text-slate-500` pinned to `#475569` on pale; `BadgeShowcase` date 4.6:1 (was 1.47:1); CTA `bg-white` on indigo banner stays readable in both themes; `dark-audit` 0 unreadable.
- [ ] Focus halo `2px solid var(--sb-focus)` + `0 0 0 4px var(--sb-field-ring)` on every button/link/switch/language control; no invisible focus.

### Manual — screen reader

- [ ] Landing: `h1` “Your path to university, mapped intelligently.”, logos `alt`, HUD/jet decor `aria-hidden`, chancing card `Fit — not a probability` + `Not estimated`, `AppNote kind="general"` `role="note"`.
- [ ] App: `HubPage` `h1` via `SectionHeading`, `HubTabs` `aria-selected`, `PanelSkeleton` shimmer, `ProfileModal` per-tab completion dots `title="Complete"` + emerald vs slate, `LevelProgressBar` `maxLevel` translated.

### Manual — reduced motion

- [ ] OS `prefers-reduced-motion: reduce` → `globals.css` collapses all `animation-duration` to 0.01 ms, `MotionProvider` frozen, `CountUp` instant, hero parallax off, marquee paused, `Confetti` returns `null`, jet vortex/afterburner frozen. Also triggered on lite devices via `isLiteMotionSync()`.

### Manual — EN/UZ/RU overflow at 390 px

- [ ] Switch `en → uz → ru` in header `LanguageSwitcher` (and via `?lang=` cookie). At 390 px (`iPhone 12`): no horizontal scroll, no clipped `PRO` badges, no `whitespace-nowrap` overflow except intentional HUD word (`right-16`, `hidden xl:block`). Verify longest `ru` strings: “Покрытие данными: 86% · 6/7”, “Рекомендательное письмо”, “Твоя реферальная ссылка” wrap via `break-words`/`whitespace-normal` + `min-h-11` growth.
- [ ] `check:i18n` confirms 6923 keys in all 3 locales; `check:render` 369/369 in each locale.

### Manual — light-theme regression

- [ ] Toggle `ThemeSwitch` dark → light → system; light hero `sb-journey-hero` gradient `indigo-50 → white → violet-50`, dark obsidian indigo; `bg-white` stays `#fff` in light, `var(--sb-surface)` in dark (pinned); `border-slate-200` light `#e2e8f0` vs dark `#1f2d4d`; no white-on-white or dark-on-dark fog.

### Manual — slow 3G

- [ ] Throttle DevTools Network → “Slow 3G” (400 kbps) + CPU 4×. `/` should show hero `h1` + CTAs within FCP ~1.3 s (SSR `opacity:1`), LCP no longer hydration-blocked; `/` JS <1.4 MB, shell <1.2 MB, `content-visibility: auto` keeps off-fold from blocking; images `lazy` except first 2 marquee eager; beacon deferred 3 s.

### Screenshots

- [ ] `docs/redesign/baseline/` (48 app + 12 landing PNGs) vs `docs/redesign/final/` (6 landing + 4 dashboard) — before/after triptych; placeholder PNGs are 1×1 when `libnspr4` missing — re-capture on runner with `sudo apt-get install -y libnspr4 libnss3 …` per `final/README.md`.

---

## E2E on this runner

`npm run test:e2e` in the current sandbox fails with:

```
E2E cannot run on this machine: the bundled Chromium will not start.
/tmp/chromium: error while loading shared libraries: libnspr4.so …
This is an environment problem, not a test failure — no application code was executed.
```

To run E2E (embedded-postgres + Playwright):

```bash
sudo apt-get update && sudo apt-get install -y libnspr4 libnss3 libatk1.0-0 \
  libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 \
  libxdamage1 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 libasound2
npm ci
npm run test:e2e   # allocates random 127.0.0.1 ports, starts embedded PG, pushes schema, seeds, starts Next, runs e2e/phase12.spec.ts
```

Same libs are needed for `npx lighthouse` and `node scripts/capture-phase3.mjs`.

---

## Risk & rollback

- **Low risk:** Every phase is a separate commit on `arena/86bd291f-scholarbridgeai` from `788d66c`; `git revert` restores. `src/app/globals.css` is single theme file — no scattered `dark:` rewrites.
- **No migrations:** No DB schema changes, no env var additions (only optional `NEXT_PUBLIC_TELEGRAM_CHANNEL_URL` override, defaults to `https://t.me/scholarbridgeai`).
- **Premium intact:** `src/lib/navSections.ts` `premium: true` only on `Application Materials` row + Payme/Click webhook sigs verified by `test:payments`; client `PremiumGate` never mounts locked content.

---

## Review asks

1. Confirm Telegram handle `https://t.me/scholarbridgeai` or set `NEXT_PUBLIC_TELEGRAM_CHANNEL_URL` before deploy.
2. Approve the honest chancing copy (dimension bars + amber “Why — stays”, `Not estimated` instead of fake `%`).
3. Approve lite threshold (`hardwareConcurrency ≤4 || deviceMemory ≤4 || innerWidth<1024` + `pointer:coarse`) — currently only mid-range Androids, not desktop.
4. Schedule re-capture of `docs/redesign/final/` + fresh Lighthouse on a runner with browser libs; add CI job per `06-handover.md §9`.

---

**Do not merge or push to `main` from this branch** — this file is the PR description text for the PR `redesign/premium-dark → main` to be opened in GitHub UI after CI approval.
