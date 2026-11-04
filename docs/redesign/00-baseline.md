# Phase 0 — Setup & Baseline Report

**Date:** 2026-11-04  
**Base commit (`main`):** `788d66c105d4fa7bd7a9d0d56426db7d58f76c40`  
**Working branch:** `arena/86bd291f-scholarbridgeai` *(session-locked Arena branch; never pushing to `main`)*  
**Application code changes in Phase 0:** **None** (`0` lines changed in `src/`)

---

## 1. Local Environment & Setup

- **Database:** Embedded PostgreSQL (`embedded-postgres` on `127.0.0.1:5433`, database `scholarbridge`), schema pushed and seeded (`Admin #1` + student fixture `Alex Chen #2`, `Computer Science & Data Science`, GPA `3.72`).
- **App Server:** Next.js `16.4.2` (Turbopack), React `19`, Tailwind CSS `4`, `framer-motion`, `next-intl` (`en` / `uz` / `ru`).
- **Browser & Audit Tooling:**
  - Playwright `1.64.1` driving headless Chromium `153.0.8010.0`
  - Google Lighthouse `13.6.0` (mobile preset, simulated Moto G Power / Slow 4G + 4× CPU throttling)
  - Chrome DevTools Protocol (`Emulation.setCPUThrottlingRate({ rate: 4 })`) rAF scroll profiler

---

## 2. Architecture & Protected Components Inventory

### Protected Landing Components (Do Not Rewrite / Remove / Change Behaviour)
All five owner-protected elements in `src/components/LandingPage.tsx` and `src/app/globals.css` were audited and verified untouched:

| Protected Element | Location | Current Mechanism & Baseline Notes |
| --- | --- | --- |
| **`scrollEngine`** | `src/components/LandingPage.tsx:346–415` | Shared passive scroll listener + single damped `requestAnimationFrame` loop (`smooth += (target - smooth) * 0.15`), `ResizeObserver(document.documentElement)`, direct DOM subscriber callbacks, zero React state per frame. Parks itself when `Math.abs(delta) <= 0.0004`. |
| **`ScrollFlightPath` & `ExecutiveMonochromeJet`** | `src/components/LandingPage.tsx:1545–2061`, `src/app/globals.css` (`.sb-flight`, `.sb-jet-plumes`) | Fixed full-viewport `<svg viewBox="0 0 1200 1000">` (`z-20`, `pointer-events-none`) with 360-sample Float64 LUT over `FLIGHT_PATH_D` (S-banks, 34–48% victory loop, 63–75% barrel roll with dorsal/ventral shade swap, 82–100% approach scale-in), wingtip vortices, velocity-driven afterburner (`SVG_COLORS.sky400`), and forward-only `stroke-dashoffset` trail. Respects `prefers-reduced-motion` via `paintOnceUnderReducedMotion`. |
| **`PhotoCraftKineticHud`** | `src/components/LandingPage.tsx:460–675` | Desktop/tablet (`hidden md:block`, `z-30`) right-edge 0–100 altimeter tape (`24px` per unit), glowing sky-400 laser cursor + `000 %` readout, and 6 localized kinetic section words (`HUD_SECTIONS`) that peel from bottom-right, swell up to `3.15×`, and dock at top-right. |
| **`UniversityCampusMarquee` & `MARQUEE_ROW_1..3`** | `src/components/LandingPage.tsx:76–320, 2063–2172` | 3 rows × 8 unique QS 2026 universities (`24` total, duplicated `[0, 1]` per CSS marquee track = `48` `<img>` nodes; first `2` eager, `46` lazy `320px` Wikimedia thumbs with `/api/image` fallback). Pauses via `IntersectionObserver` (`sb-marquee-paused`, `data-paused`). |
| **Honest Chancing (`fit` ≠ admission probability)** | `src/components/LandingPage.tsx:1360–1445` | Explicitly separates profile-to-catalogue fit (`chanceMatch`) from admission probability (`chanceAdmission` = `—` + `chanceNote`, never a `%`). Reinforced by `<AppNote kind="general" />` in the footer. |

### Theme, Motion & UI Primitives Audited
- **Theme pipeline (`src/lib/theme.ts`, `src/components/ThemeProvider.tsx`, `src/components/ThemeToggle.tsx`, `src/app/layout.tsx`, `src/app/globals.css`):**
  - **Critical finding vs Goal:** `themeInitScript()` (`src/lib/theme.ts:33`), `RootLayout` (`src/app/layout.tsx:128`), and `ThemeProvider` (`src/components/ThemeProvider.tsx:114`) currently default to `"system"` (`false` when OS is light). A first-time visitor on an Android phone in light OS mode gets **light theme first** (`landing-390-default-first-visit.png`), not dark theme.
  - `globals.css` implements a token-level dark mode: `.dark` inverts `--color-slate-50..950`, turns `*-50/100` accents into `15%/22%` translucent washes, defines `--sb-*` surface tiers (`#090e1a` canvas → `#111a2e` surface → `#17233b` well → `#1f2f4d` control), and pins explicit `bg-white` / `dark:*` utilities inside `@layer utilities` (validated by `npm run test:dark`).
- **Motion primitives (`src/components/motion/*`):**
  - `MotionProvider` sets `<MotionConfig reducedMotion="user" transition={{ duration: 0.32 }}>`.
  - Shared primitives: `Reveal`, `RevealGroup`, `RevealItem`, `PageTransition`, `SectionTransition`, `AnimatedNumber`, `AnimatedBar`, `AnimatedRing`, and `variants.ts`.
- **UI primitives (`src/components/ui/*`):**
  - `Button` (single native button wrapper with `primary`, `success`, `danger`, `outline`, `ghost`, `unstyled` and `44px` touch minimums), `MotionButton`, `BottomSheet`, `ProgressBar`, `LoadingStages`, `JourneyCard` / `Pill` (`journey.tsx`), `HubTabs` / `ShowMoreToggle` (`hubs.tsx`), `PageHeader` / `StatCard` / `Segmented` (`growth.tsx`), and `tokens.ts`.

---

## 3. Baseline Performance Metrics

### 3.1 Google Lighthouse 13.6.0 — Landing Page `/` (Mobile, Throttled)
Measured against `next build` + `next start` (`NODE_ENV=production`), mobile form factor (`Moto G Power`, simulated Slow 4G + 4× CPU slowdown). Raw summary saved at `docs/redesign/baseline/lighthouse-mobile.json`.

| Metric | Baseline Value | Target / Assessment |
| --- | --- | --- |
| **Performance Score** | **61 / 100** | Needs substantial improvement on mobile |
| **First Contentful Paint (FCP)** | **1,282 ms** (`1.3 s`) | Good initial shell paint |
| **Largest Contentful Paint (LCP)** | **5,474 ms** (`5.5 s`) | **Poor (> 4.0 s)** — Hero `<motion.div initial="hidden">` renders above-the-fold `<h1>`, copy, CTAs, and preview at `opacity: 0` until all client JS downloads, parses, and hydrates |
| **Total Blocking Time (TBT)** | **763 ms** (`760 ms`) | **High (> 600 ms)** — hydrating full `HomeClient` shell + Framer Motion + 2,172-line `LandingPage` on 4× throttled mobile CPU |
| **Cumulative Layout Shift (CLS)** | **0** | Excellent (`0.0000`) |
| **Speed Index** | **1,697 ms** (`1.7 s`) | Good |
| **Time to Interactive (TTI)** | **5,541 ms** (`5.5 s`) | Coupled to JS bundle execution |

### 3.2 JavaScript, CSS, HTML & Image Payload Breakdown

| Asset Category | Requests | Transfer Size | Uncompressed Size | Notes |
| --- | ---: | ---: | ---: | --- |
| **JavaScript (Lighthouse `/` load)** | 19 | **446.9 KB** (`457,660 B`) | **1,517.8 KB** (`1,554,217 B`) | `.next/diagnostics/route-bundle-stats.json` reports `/` first-load JS = **`1,269 KB`** (`shared shell /privacy` = `1,025 KB`) |
| **CSS** | 2 | **34.9 KB** (`35,753 B`) | **228.9 KB** (`234,425 B`) | Tailwind 4 + `.dark` pin layer |
| **Fonts (self-hosted Inter woff2)** | 1 | **47.7 KB** (`48,818 B`) | **47.7 KB** | `inter-latin-wght-normal.woff2` (`inter-cyrillic` loads on demand) |
| **SSR HTML (`en` cookie)** | 1 | **21.2 KB** (`gzip`) | **166.9 KB** (`170,947 B`) | English dictionary is bundled in JS, so `initialMessages` is `null` |
| **SSR HTML (`uz` cookie)** | 1 | — | **609.9 KB** (`624,564 B`) | Full ~6,200-key Uzbek dictionary is serialized inline into `/` HTML |
| **SSR HTML (`ru` cookie)** | 1 | — | **823.7 KB** (`843,454 B`) | Full ~6,200-key Russian dictionary is serialized inline into `/` HTML |
| **Images (observed in sandbox)** | 39 initiated | **24.2 KB** (`24,815 B` local) | — | `1` local image (`/logo.png`) succeeded; `38` external CDN/proxy image requests failed fast due to sandbox network egress policy (see §6) |

### 3.3 Scroll FPS on 4× CPU Throttle (`Emulation.setCPUThrottlingRate({ rate: 4 })`)
Measured over a continuous 150-frame top → bottom → top scroll pass in headless Chromium `153` (`docs/redesign/baseline/scroll-fps-4x-cpu.json`):

| Viewport & Active Overlays | Avg FPS | Avg Frame | p50 Frame | p95 Frame | Max Frame | Frames > 17.5 ms | Severe Jank (> 34 ms) | Long Tasks |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **Mobile `390×844` (dark)** — `ScrollFlightPath` + `Marquee` (`PhotoCraftKineticHud` hidden below `md`) | **57.3 FPS** | `17.44 ms` | `16.70 ms` | `16.80 ms` | `33.40 ms` | `7 / 150` (4.7%) | `0` | `0` |
| **Desktop `1440×900` (dark)** — `ScrollFlightPath` + `PhotoCraftKineticHud` + `Marquee` + `Reveal` all active | **33.6 FPS** | `29.78 ms` | `33.30 ms` | **`66.60 ms`** | **`99.90 ms`** | **`81 / 150` (54.0%)** | **`27 / 150` (18.0%)** | `1` (`51 ms`) |

**Scroll-feel diagnosis:**
- On `390×844`, `PhotoCraftKineticHud` is `display: none` (`hidden md:block`), so frame times stay near `16.7 ms` once hydrated, though real mid-range Android GPUs still pay full-screen SVG rasterization cost for `stroke-dashoffset` on `FLIGHT_PATH_D` + continuous `.sb-jet-plumes` opacity animation.
- On `>= 768px` (`820px` tablet and `1440px` desktop), `ScrollFlightPath` SVG `stroke-dashoffset` repaint + `PhotoCraftKineticHud` `scale()` text rasterization + `UniversityCampusMarquee` CSS tracks drop 4×-CPU frame pacing to **~33.6 FPS** (`p95 = 66.6 ms`, visible stutter during fast scroll).

---

## 4. Visual & UX Baseline Findings (From Captured Screenshots)

1. **Dark theme is NOT the default first impression (`landing-390-default-first-visit.png`):** New visitors without `localStorage.scholarbridge_theme` follow OS `prefers-color-scheme`, rendering light mode by default on light-OS phones.
2. **Landing CTA hierarchy mismatch (`landing-*-hero.png`):**
   - Header CTA says `"Get started"`, but Hero primary CTA says `"Build my profile"` and secondary says `"See how it works"`.
   - There is **no secondary Telegram channel action** on the landing hero/CTA despite Telegram being the secondary student acquisition channel.
3. **`PhotoCraftKineticHud` text collision at `1440px` & `820px` (`landing-1440-dark-hero.png`, `landing-820-dark-hero.png`):**
   - When active (`scale(3.15)` at `right-16`), the kinetic word **`SCHOLARBRIDGE`** renders directly across the Hero Dashboard Mock's metric cards (`Scholarships Tracked` / `AI SOP & Review Ready`), making both hard to read.
4. **Mobile Landing Jet overlap (`landing-390-dark-hero.png`):**
   - At `scrollY = 0` on `390px`, `ExecutiveMonochromeJet` sits directly over the hero body copy (`"turn a [JET] complicated admissions process"`).
5. **Mobile In-App vertical crowding (`app-universities-390-dark.png`, `app-scholarships-390-dark.png`, `app-my-plan-390-dark.png`):**
   - The expanded **Guided Journey** card (`4` stacked step cards + progress header + Continue bar) consumes ~`460 px` (>54% of an `844 px` screen) on every non-dashboard tab, pushing the actual destination content and search filters below the fold.
6. **System emoji dependency in navigation & badges (`app-dashboard-1440-dark.png`, `app-universities-390-dark.png`):**
   - Sidebar group headers (`NAV_GROUP_ICONS`: `🔎`, `🧭`, `📝`, `🎓`, `🤝`) and stage headers rely on platform emoji fonts, which render inconsistently across Android OEM skins (and as tofu boxes when color-emoji fonts are absent).
7. **Mixed-language strings on Premium (`app-premium-1440-dark.png`):**
   - Under `en` locale, plan cards at the bottom of `PaymentsSection` still display Uzbek literals (`OYLIK`, `ARIZA MAVSUMI (3 OY)`, `YILLIK`, `so'm`).

---

## 5. Baseline Artifact Index (`docs/redesign/baseline/`)

### Performance Data
- `docs/redesign/baseline/lighthouse-mobile.json` — Lighthouse 13.6.0 mobile throttled metrics, chunk sizes, and locale HTML byte sizes
- `docs/redesign/baseline/scroll-fps-4x-cpu.json` — 4× CPU throttled rAF frame-time distribution (`390×844` & `1440×900`)

### Landing Page Screenshots (`1440×900`, `820×1180`, `390×844` — Dark & Light)
- Default clean first visit (`390×844`, OS light): `landing-390-default-first-visit.png`
- Desktop `1440`: `landing-1440-dark-hero.png`, `landing-1440-dark.png`, `landing-1440-light-hero.png`, `landing-1440-light.png`
- Tablet `820`: `landing-820-dark-hero.png`, `landing-820-dark.png`, `landing-820-light-hero.png`, `landing-820-light.png`
- Mobile `390`: `landing-390-dark-hero.png`, `landing-390-dark.png`, `landing-390-light-hero.png`, `landing-390-light.png`

### Main In-App Screens (`1440×900`, `820×1180`, `390×844` — Dark & Light, student `Alex Chen`)
- **Dashboard (`#dashboard`):** `app-dashboard-{1440,820,390}-{dark,light}.png`
- **Universities (`#universities`):** `app-universities-{1440,820,390}-{dark,light}.png`
- **Scholarships (`#scholarships`):** `app-scholarships-{1440,820,390}-{dark,light}.png`
- **My Plan (`#study-plan`):** `app-my-plan-{1440,820,390}-{dark,light}.png`
- **Applications (`#applications`):** `app-applications-{1440,820,390}-{dark,light}.png`
- **Profile (`#profile`):** `app-profile-{1440,820,390}-{dark,light}.png`
- **Premium (`#payments`):** `app-premium-{1440,820,390}-{dark,light}.png`
- **Community (`#community`):** `app-community-{1440,820,390}-{dark,light}.png`

---

## 6. Honest Verification Limits

1. **External image CDN bytes (`upload.wikimedia.org` & `images.unsplash.com`):** The sandbox environment restricts outbound internet egress to `github.com`, `registry.npmjs.org`, and `pypi.org`. Consequently, the `38` external campus/step image requests on `/` failed fast (`ERR_CONNECTION_CLOSED` / `/api/image` `404`), so live over-the-wire byte weight of third-party Wikimedia/Unsplash JPEGs could not be measured inside the sandbox (`24.2 KB` local `/logo.png` transferred; `39` total image requests recorded).
2. **Real hardware GPU vs SwiftShader:** Headless Chromium in Linux runs software WebGL/compositing (`SwiftShader`) with CDP `4×` CPU throttling rather than a physical Snapdragon/MediaTek mobile GPU, so relative frame-time deltas (`ms/frame` before vs after) are the most reliable cross-phase benchmark.
3. **System color-emoji font:** The Linux container does not have `Noto Color Emoji` installed, so Unicode emojis (`🔎`, `🧭`) appear as monochrome fallback glyphs in screenshots (which also highlights where vector icons are safer than raw Unicode emojis).
