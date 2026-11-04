# Phase 1 — Full Product Audit (Landing Page & In-App Experience)

**Date:** 2026-11-04  
**Branch:** `arena/86bd291f-scholarbridgeai` (audited at commit `8ae744a` / `src/` at `788d66c`)  
**Code changes in this phase:** **None** (report-only audit)  
**Target persona & device:** 16–18-year-old Uzbek high-school applicants on mid-range Android phones (`390×844`, 4× throttled CPU, variable mobile data, `uz` / `ru` / `en`), dark-first indigo/violet identity.

---

## Executive Summary

ScholarBridgeAI has strong engineering bones — a real profile-to-catalogue fit engine, honest separation of fit vs. admission probability, comprehensive localization coverage (`6,850` keys across `en`/`uz`/`ru`), token-driven dark mode, and distinctive signature landing motion (`ScrollFlightPath`, `ExecutiveMonochromeJet`, `PhotoCraftKineticHud`, `UniversityCampusMarquee`).

However, five systemic issues currently prevent the product from feeling **premium, effortless, and fast** for a 17-year-old student on an Android phone:

1. **Wrong first impression & slow mobile paint:** Clean first visits default to **light mode** instead of dark (`LCP = 5,474 ms`, Lighthouse mobile `61/100`), because the entire above-the-fold Hero is SSR-rendered at `opacity: 0` behind a `1.52 MB` (uncompressed) JS bundle that ships the entire 6,850-key dictionary and authenticated shell to anonymous visitors.
2. **Broken & mixed-language trust surfaces (`P0`):** `CheckoutModal` renders its `<AppNote>` as a horizontal flex sibling *outside* the modal dialog; the Landing final CTA button (`bg-white`) turns dark navy (`#111a2e`) on a dark navy banner in dark mode; `PaymentsSection` hardcodes Uzbek plan titles (`OYLIK`, `ARIZA MAVSUMI`) in English/Russian; and `EssayRubricStudio` + the in-app footer contain large blocks of untranslated English.
3. **Typography & era fragmentation:** `95.3%` (`2,378 / 2,496`) of explicit font-weight classes across `src/` are `semibold`–`black` (`600–900`), flattening visual hierarchy; the Hero accent uses `font-serif` without loading a serif webfont (falling back to system `Georgia` / `Times New Roman`); and screens span five distinct visual eras (neon teal gradients on Rewards vs. amber gradients on Premium vs. aurora hero cards on Hubs).
4. **Information overload & buried flagship features:** On first login to `#dashboard`, **all 5 sidebar groups start collapsed**, hiding every tool; `AI SOP Studio` is buried 4 levels deep behind a misleading sidebar `PRO` badge; and on `390px` phones, the expanded `GuidedJourneyBar` consumes ~55% of the viewport above every tab.
5. **Scroll compositing cost (`33.6 FPS` on 4× CPU at `1440px`) & HUD/Jet text collisions:** `PhotoCraftKineticHud`'s scaled active word (`SCHOLARBRIDGE`) collides directly with the Hero Dashboard Mock cards at `1440px`/`820px`, while simultaneous full-screen SVG `stroke-dashoffset` repaint + HUD scaling + 48-card marquee tracks cut desktop 4×-CPU frame rates in half.

---

## 1. Findings Overview Matrix

| ID | Severity | Area | Short Summary | Primary Location |
| --- | --- | --- | --- | --- |
| **P0-1** | **P0** | Bugs / In-App UX | `CheckoutModal` places `<AppNote>` outside `role="dialog"` inside a `flex-row` backdrop, squishing checkout horizontally | `src/components/CheckoutModal.tsx:71–145` |
| **P0-2** | **P0** | Visual System / Landing | Final `#cta` primary button (`bg-white`) inverts to dark `#111a2e` on a dark `#171b47` banner in dark mode | `src/components/LandingPage.tsx:1517`, `src/app/globals.css:234` |
| **P0-3** | **P0** | Visual System | Default first-visit theme resolves to `"system"` (light on light OS) instead of dark-first | `src/lib/theme.ts:33`, `src/app/layout.tsx:128`, `src/components/ThemeProvider.tsx:114` |
| **P0-4** | **P0** | i18n | `PaymentsSection` & `CheckoutModal` force Uzbek `labelUz` (`OYLIK`, `ARIZA MAVSUMI`) & `so'm` in `en`/`ru` + hardcoded `days` | `src/components/PaymentsSection.tsx:52–54, 192–194`, `src/components/CheckoutModal.tsx:39, 103` |
| **P0-5** | **P0** | i18n | Untranslated hardcoded English across in-app footer, `EssayRubricStudio` (Fit & Peer Review), `PlanningStudio`, `hubs`, `LevelProgressBar` | `src/app/HomeClient.tsx:1313–1336`, `src/components/EssayRubricStudio.tsx:675–1070` |
| **P1-1** | **P1** | Performance / Mobile | Hero `<motion.div initial="hidden">` renders above-the-fold `<h1>` & CTAs at `opacity: 0` in SSR, causing **5.5 s mobile LCP** | `src/components/LandingPage.tsx:14–22, 991–1058` |
| **P1-2** | **P1** | Performance / Mobile | Anonymous `/` loads `1,518 KB` uncompressed JS (`HomeClient` app shell + full `390 KB` `en.json`) + `610–824 KB` inline SSR HTML for `uz`/`ru` | `src/app/page.tsx:36–41`, `src/app/HomeClient.tsx:5–33`, `src/i18n/LocaleProvider.tsx:12` |
| **P1-3** | **P1** | Landing Structure | `PhotoCraftKineticHud` active word (`scale(3.15)`) collides over Hero Dashboard Mock cards (`1440`/`820`); Jet overlaps Hero copy at `390px` | `src/components/LandingPage.tsx:575–625, 990–1135, 1940–2055` |
| **P1-4** | **P1** | Landing Structure | Hero CTAs (`"Build my profile"` + `"See how it works"`) miss owner hierarchy: primary `"Get started"` + secondary Telegram channel | `src/components/LandingPage.tsx:1016–1034`, `src/i18n/messages/*.json` |
| **P1-5** | **P1** | Landing Structure | Generic Unsplash stock photos in `"How it works"` cheapen the product and bypass same-origin caching | `src/components/LandingPage.tsx:321–328, 1241–1249` |
| **P1-6** | **P1** | Landing Structure | Back-to-back uniform card grids (`03 How it works` 4-grid → `04 Capabilities` 6-grid with ASCII icons → `06 Roadmap` 3-grid) create visual monotony | `src/components/LandingPage.tsx:744–757, 1235–1490` |
| **P1-7** | **P1** | Performance / Mobile | `1440px` 4×-CPU scroll drops to **`33.6 FPS`** (`p95 = 66.6 ms`) due to full-viewport SVG `stroke-dashoffset` repaint + HUD scale + marquee | `src/components/LandingPage.tsx:1940–2055`, `src/app/globals.css:1073–1115` |
| **P1-8** | **P1** | Performance / Mobile | `UniversityCampusMarquee` mounts `48` `<img>` nodes; `onWikimediaThumbError` falls back to unproxied multi-MB Wikimedia originals | `src/components/LandingPage.tsx:2109–2145`, `src/lib/wikimediaThumb.ts:36–44` |
| **P1-9** | **P1** | Visual System | Extreme bold inflation (`95.3%` of weight utilities are `600–900`) + unloaded `font-serif` fallback (`Georgia`/`Times New Roman`) in Hero & Quote | `src/app/layout.tsx:45–65`, `src/components/LandingPage.tsx:1007, 1495` |
| **P1-10** | **P1** | Visual System / A11y | WCAG AA contrast failure (`1.47:1`) on badge dates (`text-slate-300` on `bg-slate-50`) and borderline `4.34:1` `slate-500` on `slate-100` | `src/components/BadgeShowcase.tsx:41`, `src/components/LanguageSwitcher.tsx:28` |
| **P1-11** | **P1** | Visual System / In-App UX | Five conflicting visual eras across in-app screens (neon teal Rewards banner vs. amber gradient Pro vs. aurora Hubs vs. bare Settings) | `src/components/RewardsSection.tsx:101`, `src/components/PaymentsSection.tsx:136`, `src/components/ui/hubs.tsx:220` |
| **P1-12** | **P1** | In-App UX | All 5 sidebar groups start collapsed on `#dashboard`; `AI SOP Studio` & `AI Audit` are buried 3–4 clicks deep behind a misleading `PRO` label | `src/components/Navbar.tsx:379`, `src/lib/navSections.ts:95–260`, `src/components/hubs/index.tsx:580–650` |
| **P1-13** | **P1** | In-App UX / Mobile | Expanded `GuidedJourneyBar` consumes `~460px` (55% of `390×844` viewport) on every non-dashboard screen + fires 2 uncached fetches per mount | `src/components/GuidedJourneyBar.tsx:57, 81–137, 195–260` |
| **P1-14** | **P1** | Engagement / Mobile | Dashboard competes with 4 overlapping "what next?" blocks; `DailyStreakCard` `"Start today"` looks like a button pill but is a dead `<span>` | `src/components/DailyStreakCard.tsx:82–97, 155–185`, `src/components/journey/JourneyControlCenter.tsx:960–1180` |
| **P1-15** | **P1** | In-App UX / Mobile | 7 wide `<table>` views (`min-w-[640px]` to `min-w-[920px]`) force cramped horizontal scrolling on `390px` phones | `src/components/journey/AfterAdmissionPanels.tsx:346`, `src/components/CountryComparePanel.tsx:287`, `src/components/UniversityExplorer.tsx:1504` |
| **P1-16** | **P1** | Accessibility | `LanguageSwitcher` `<select>` suppresses focus outline (`focus:outline-none`) with zero `:focus-within` / `:focus-visible` ring; hidden in drawer on `<1024px` | `src/components/LanguageSwitcher.tsx:33, 52`, `src/components/Navbar.tsx:909–946` |
| **P1-17** | **P1** | Accessibility | Sub-44px interactive controls on desktop (`16px` HUD buttons, `32px` modal close, `36px` `ShowMoreToggle`, `28px` `SessionNotice` buttons) | `src/components/LandingPage.tsx:642–656`, `src/components/CheckoutModal.tsx:82`, `src/components/ui/hubs.tsx:148`, `src/app/HomeClient.tsx:167–182` |
| **P1-18** | **P1** | i18n / Visual System | `84` i18n keys embed raw Unicode emojis alongside Lucide icons (creating double icons / missing-glyph boxes) + Windows flag-letter bug on marquee | `src/components/GuidedJourneyBar.tsx:144–172`, `src/components/LandingPage.tsx:76–285, 2135` |
| **P2-1** | **P2** | In-App UX | Loading & empty states vary across eras (`PanelSkeleton` vs. plain text `"Loading…"` vs. inline spinners) | `src/components/PaymentsSection.tsx:225`, `src/components/RewardsSection.tsx:94` |
| **P2-2** | **P2** | In-App UX (Forms) | `ProfileModal` exposes ~38 fields across 4 tabs without per-tab completion badges or progressive disclosure | `src/components/ProfileModal.tsx:38–68, 108–210` |
| **P2-3** | **P2** | Engagement | Zero celebratory feedback on completing onboarding, checking off roadmap tasks, or advancing a journey stage; Rewards hidden in bottom utility cluster | `src/components/TaskRoadmap.tsx`, `src/components/OnboardingWizard.tsx`, `src/components/Navbar.tsx:702` |
| **P2-4** | **P2** | Accessibility / Motion | Programmatic `scrollIntoView({ behavior: "smooth" })` and `window.scrollTo({ behavior: "smooth" })` ignore `prefers-reduced-motion` | `src/components/LandingPage.tsx:341, 947`, `src/app/HomeClient.tsx:314` |
| **P2-5** | **P2** | Performance | `.sb-aurora` (`filter: blur(6px)`, `inset: -30%`, `16s infinite`) runs continuously on every `HubPage` and Dashboard hero card | `src/app/globals.css:936–948`, `src/components/ui/journey.tsx:65` |
| **P2-6** | **P2** | Visual System | Minor radius drift (`16` `rounded-xl`, `4` `rounded-2xl`, `3` `rounded-lg`) outside semantic `--radius-control/surface/overlay` tokens | `src/components/*` (`23` occurrences) |
| **P2-7** | **P2** | i18n | `1.9×–2.8×` UZ/RU string expansion wraps compact pills/buttons awkwardly (`Check fit` → `Проверить совместимость`, `2.56×`) | `src/i18n/messages/uz.json`, `src/i18n/messages/ru.json` |
| **P2-8** | **P2** | i18n | Public `/privacy` and `/terms` pages and `HomeClient` `sessionCopy` bypass `next-intl` dictionaries | `src/app/privacy/page.tsx:29–155`, `src/app/terms/page.tsx:30–158`, `src/app/HomeClient.tsx:96–128` |
| **P2-9** | **P2** | Dead Code | `JourneyGuide.tsx` (`100%` unused), `8` unused `LANDING_PHOTOS` entries, plus `3` dead app components still coupled only to legacy check scripts | `src/components/JourneyGuide.tsx`, `src/components/LandingPage.tsx:289–330`, `src/components/DashboardView.tsx` |

---

## 2. Detailed Findings by Severity & Area

### Severity P0 — Broken Layout, Theme Default, or Broken Trust/Language

#### P0-1 · [Bugs / In-App UX] `CheckoutModal` renders `<AppNote>` outside the dialog in a horizontal flex container
- **Where:** `src/components/CheckoutModal.tsx:71–77, 142–145`
- **What:** The modal backdrop `<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">` defaults to `flex-direction: row`. `<AppNote kind="thirdParty" className="mt-2" />` is placed at line `143` **after** the closing `</div>` of `role="dialog"` (`dialogRef`).
- **Why it matters:** When a student or parent clicks **Upgrade** to pay via Payme or Click, `<AppNote>` renders side-by-side next to the dialog on top of the translucent black backdrop, squishing the payment dialog on `390px` phones and leaving `<AppNote>` outside `dialogRef`'s focus trap and `aria-modal` container.
- **Proposed fix:** Move `<AppNote kind="thirdParty" className="mt-2" />` **inside** `<div ref={dialogRef} role="dialog" ...>` right below the Cancel button.

#### P0-2 · [Visual System / Landing] Final `#cta` primary button (`bg-white`) turns dark navy on dark navy in dark mode
- **Where:** `src/components/LandingPage.tsx:1517` + `src/app/globals.css:234`
- **What:** The final CTA button uses `className="... bg-white px-7 py-3 text-sm font-black text-indigo-700 shadow-xl ..."`. Because it has no explicit `dark:bg-*` class, `globals.css:234` (`html:where(.dark) .bg-white:where(:not([class*="dark:bg-"])) { background-color: var(--sb-surface); }`) rewrites its background to `#111a2e` (obsidian navy) on top of the `#171b47 → #241d50` dark CTA banner, with no border.
- **Why it matters:** On dark mode (our primary design target), the bottom conversion button loses its high-contrast white focal point and sinks into the dark banner.
- **Proposed fix:** Style the button explicitly as a luminous primary CTA in both themes (e.g., `bg-indigo-500 text-white hover:bg-indigo-400` with subtle inner highlight, or an explicit pinned white/pastel surface that passes `npm run test:dark`).

#### P0-3 · [Visual System] Dark theme is NOT the default first impression
- **Where:** `src/lib/theme.ts:10, 33`, `src/app/layout.tsx:128`, `src/components/ThemeProvider.tsx:114`
- **What:** `themeInitScript()` falls back to `stored || "system"`, and `RootLayout` passes `defaultTheme="system"`. On any device whose OS is in daytime/light mode (common on Android phones during school hours), first-time visitors see the **light** landing page (`docs/redesign/baseline/landing-390-default-first-visit.png`).
- **Why it matters:** Directly contradicts the product requirement (*"Dark theme must be the default first impression"*). The Flight HUD, glowing laser altimeter, and indigo/violet atmosphere are far more striking on dark obsidian surfaces, while light mode must remain 100% supported when chosen via `ThemeToggle`.
- **Proposed fix:** Change the fallback when no `scholarbridge_theme` cookie/localStorage preference exists from `"system"` to `"dark"` in `src/lib/theme.ts`, `src/app/layout.tsx`, and `src/components/ThemeProvider.tsx`, while keeping explicit `"light"`, `"dark"`, and `"system"` choices fully working in `ThemeToggle`.

#### P0-4 · [i18n] Premium pricing & checkout force Uzbek labels in English/Russian and mix hardcoded English
- **Where:** `src/components/PaymentsSection.tsx:52–54, 187–197`, `src/components/CheckoutModal.tsx:39, 100–103`
- **What:**
  1. `PaymentsSection.tsx:193` and `CheckoutModal.tsx:39` evaluate `pack.labelUz || pack.label`. Since `labelUz` is populated (`"OYLIK"`, `"ARIZA MAVSUMI (3 OY)"`, `"YILLIK"`), English and Russian users always see Uzbek package names (`docs/redesign/baseline/app-premium-1440-dark.png`).
  2. Conversely, `pack.badge` (`"Best for applicants"`, `"Save more"`) renders in English even when the student selects Uzbek or Russian.
  3. `PaymentsSection.tsx:53` hardcodes `so'm` (`59,000 so'm`), whereas `CheckoutModal.tsx:100` hardcodes `UZS`, and `CheckoutModal.tsx:103` hardcodes `/ {days ?? "—"} days` in English.
- **Why it matters:** Payment screens are the highest-trust moment in the entire app (often reviewed with parents). Mixed Uzbek/English/Russian text on a pricing screen immediately undermines credibility.
- **Proposed fix:** Translate plan titles (`monthly`, `season`, `yearly`), badges, currency unit, and duration (`perDays`) through `next-intl` (`payments` namespace in `en.json`, `uz.json`, `ru.json`) keyed by `pack.id` and active `locale`, without touching `/api/payments/*` or payment logic.

#### P0-5 · [i18n] Large blocks of untranslated hardcoded English inside student-facing screens
- **Where:**
  - `src/app/HomeClient.tsx:1313–1336` — Entire in-app footer (`"© 2026 ScholarBridgeAI • Democratizing Global Higher Education Access"`, `"Terms"`, `"Privacy"`, `"University Matcher"`, `"Scholarship Discovery"`, `"AI Mentor"`).
  - `src/components/EssayRubricStudio.tsx:674–745` (`"Scholarship fit"`, `"Score this essay against your saved scholarships…"`, `"Analyze fit"`, `"Write at least 50 characters first."`, `"No saved scholarships yet…"`) and `1031–1160` (`"My draft"`, `"Save an essay first, then open it here for peer review."`, `"Open for peer review"`, `"Close for review"`, `"OPEN"`, `"Average of N reviews"`).
  - `src/components/PlanningStudio.tsx:657, 1093, 1131` (`"University"`, `"Measure"`, `"Missing data"`).
  - `src/components/hubs/index.tsx:167` (`"Choose a profile"`, `"Sign in and pick a student profile to open this section."`).
  - `src/components/LevelProgressBar.tsx:50` (`"★ Max level"`).
- **Why it matters:** `scripts/check-i18n.mjs` validates `t("...")` keys, so raw JSX literals slip past CI undetected and break Uzbek and Russian students out of their language mid-workflow.
- **Proposed fix:** Extract every user-facing string above into `en.json`, `uz.json`, and `ru.json` under the corresponding namespaces (`common`, `ai`, `planning`, `hubs`, `rewards`) and wire via `useTranslations`.

---

### Severity P1 — Hurts Trust, Usability, Accessibility, or Mobile Performance

#### P1-1 · [Performance / Mobile] SSR `opacity: 0` on Hero causes a `5,474 ms` mobile LCP
- **Where:** `src/components/LandingPage.tsx:14–22, 991–1058, 1061–1070`
- **What:** Both the Hero text column (`<motion.div initial="hidden" animate="visible" variants={heroGroup}>`, where `heroItem.hidden = { opacity: 0, y: 22 }`) and the Hero Dashboard Mock (`initial={{ opacity: 0, y: 28, scale: 0.98 }}`) serialize with `style="opacity:0;transform:..."` in server HTML.
- **Why it matters:** On a throttled mid-range Android phone (`Slow 4G + 4× CPU`), First Contentful Paint happens at `1.3 s` (header bar only), while the **entire Hero stays blank** until `447 KB` (`1.52 MB` uncompressed) of JS downloads, parses, and hydrates at **`5.5 s` (`LCP = 5,474 ms`)**. If a script chunk stalls on flaky mobile data, the headline never appears.
- **Proposed fix:** Render above-the-fold Hero `<h1>`, lead copy, and primary CTAs visible immediately in SSR (`opacity: 1`), using lightweight CSS `@keyframes` entrance (progressive enhancement that degrades to visible text) or `initial={false}` on the LCP element, reserving Framer Motion staggered entrance for secondary adornments.

#### P1-2 · [Performance / Mobile] Anonymous landing page downloads the in-app shell + full 6,850-key dictionary
- **Where:** `src/app/page.tsx:36–41`, `src/app/HomeClient.tsx:5–33`, `src/i18n/LocaleProvider.tsx:12`, `src/i18n/messages.ts:1–30`
- **What:**
  1. `en.json` (`390.1 KB` uncompressed / `127.3 KB` compressed — all `6,850` keys including `admin*`, `visa`, `forum`, `courses`, `parentDashboard`) is statically bundled into the initial `/` JS payload for every visitor.
  2. When a visitor arrives with `uz` or `ru` cookie, `clientMessagesFor(initialLocale)` serializes all `6,850` keys inline into the `/` HTML response (**`609.9 KB` HTML for `uz`**, **`823.7 KB` HTML for `ru`**) *on top of* the bundled `390.1 KB` English JS fallback.
  3. `HomeClient.tsx` (`1,370` lines) statically imports `Navbar` (`1,047` lines), `PremiumGate`, `DailyStreakCard`, `TelegramNudge`, and `SectionIntro` even when `view === "landing"`.
- **Why it matters:** Drives `Total Blocking Time = 763 ms` and `Time to Interactive = 5.5 s` on 4× throttled mobile CPUs, and costs ~1 MB of mobile data on first Uzbek/Russian visit before the student even taps "Get started".
- **Proposed fix:** Split public landing dictionary namespaces (`landing`, `meta`, `nav`, `dashboard`, `disclaimers`, `language`, `theme` — < 5% of total keys) for initial `/` SSR/hydration when `hasSessionCookie === false`, lazy-load full app messages + `Navbar` / authenticated shell chunks only when entering `wizard` or `app`.

#### P1-3 · [Landing Structure] `PhotoCraftKineticHud` & `ExecutiveMonochromeJet` collide with Hero UI/copy
- **Where:** `src/components/LandingPage.tsx:575–625` (`PhotoCraftKineticHud`), `990–1135` (Hero layout), `1940–2055` (`ScrollFlightPath`)
- **What:**
  - At `1440×900` and `820×1180` (`docs/redesign/baseline/landing-1440-dark-hero.png`), `PhotoCraftKineticHud` (`z-30`, `right-16`) scales the active section word **`SCHOLARBRIDGE`** to `scale(3.15)`, painting bright glowing white letters directly on top of the Hero Dashboard Mock's stat cards (`Scholarships Tracked` / `Pending Milestones` / `AI SOP & Review Ready`).
  - At `390×844` (`docs/redesign/baseline/landing-390-dark-hero.png`), `ExecutiveMonochromeJet` (`z-20`) sits at `scrollY = 0` directly across the Hero paragraph (`"and turn a [JET] complicated admissions process"`).
- **Why it matters:** Both `PhotoCraftKineticHud` and `ScrollFlightPath` / `ExecutiveMonochromeJet` are signature **PROTECTED** features — right now they fight the Hero content instead of framing it cleanly, hurting 5-second comprehension.
- **Proposed fix:** Keep `ScrollFlightPath`, `ExecutiveMonochromeJet`, `PhotoCraftKineticHud`, and `scrollEngine` behaviour intact, and adjust Hero right-gutter clearance (`md:pr-20 lg:pr-24` or container positioning) + subtle backdrop/opacity harmony when HUD words overlap content columns so the ruler/words frame the right edge cleanly without colliding with card text.

#### P1-4 · [Landing Structure] Landing CTA hierarchy misses `"Get started"` primary & Telegram channel secondary
- **Where:** `src/components/LandingPage.tsx:1016–1034, 1517–1523`
- **What:**
  - Header button says `"Get started"`, Hero primary button says `"Build my profile"`, Hero secondary button says `"See how it works"`, and Final CTA says `"Get started for free"`.
  - There is **zero link or secondary CTA to the ScholarBridge Telegram channel** anywhere on the landing page, even though high-school Uzbek students live in Telegram and many prefer joining the channel before creating a full account.
- **Why it matters:** Inconsistent primary CTA verbs create friction, and omitting the Telegram channel loses warm top-of-funnel students who aren't ready to register in-browser yet.
- **Proposed fix:** Unify primary landing CTA wording around `"Get started"` (`landing.getStarted` in EN/UZ/RU) and add a clear, honest secondary Telegram channel CTA (driven by configured channel URL / boot config, never a hardcoded fake follower count) in the Hero / Final CTA, while keeping a subtle anchor scroll link to `#how`.

#### P1-5 · [Landing Structure] Generic stock Unsplash photos in `"How it works"` break the premium dark identity
- **Where:** `src/components/LandingPage.tsx:321–328, 1241–1249`
- **What:** All 4 step cards in `"03 / How it works"` render `h-28` generic Unsplash stock photos (`photo-1434030216411...` notebook, graduation caps, fountain pen, group laughing) loaded directly from `images.unsplash.com` (`w=700&q=80`).
- **Why it matters:** Stock photography looks generic next to ScholarBridge's real UI, clashes with dark obsidian surfaces, adds 4 third-party TLS connections on mobile, and fails completely on networks where Unsplash is throttled/blocked.
- **Proposed fix:** Replace the 4 generic stock photos with crisp, theme-aware mini UI previews / bespoke vector-styled step visuals built with CSS + Lucide + real translated UI micro-components (0 external image requests, instant paint, razor-sharp on retina screens).

#### P1-6 · [Landing Structure] Card-grid monotony & raw ASCII icons across sections `03`, `04`, and `06`
- **Where:** `src/components/LandingPage.tsx:744–757, 1235–1310, 1450–1490`
- **What:**
  - Three sections in near-succession use the exact same centered-header + uniform-box-grid formula: `03 How it works` (4 uniform boxes), `04 Capabilities` (6 uniform boxes), and `06 Roadmap` (3 uniform boxes that largely repeat `"How it works"`).
  - `04 Capabilities` (`lines 744–751`) uses raw Unicode/ASCII strings (`"⌕"`, `"%"`, `"✦"`, `"AI"`, `"✓"`, `"↗"`) as icons despite Lucide icons already being imported in the same file.
  - Meanwhile, `04 Capabilities` forces a light-ignoring `bg-slate-900` dark slab in light mode while blending flatly into dark mode.
- **Why it matters:** A 17-year-old scrolling on a phone tunes out after the second identical wall of text boxes; raw `"⌕"` / `"%"` characters look unfinished rather than crafted.
- **Proposed fix:** Give each section a distinct editorial layout: bespoke interactive/visual 4-step timeline for `03 How it works`, an asymmetric bento showcase with real Lucide icons and subtle indigo/violet glass accents for `04 Capabilities`, the protected 2-column `05 Honest Chancing` comparison card, and a tighter visual progression for `06 Roadmap`.

#### P1-7 · [Performance / Mobile] Desktop/tablet 4×-CPU scroll drops to `33.6 FPS` (`p95 = 66.6 ms`)
- **Where:** `src/components/LandingPage.tsx:1940–2055` (`ScrollFlightPath`), `575–625` (`PhotoCraftKineticHud`), `src/app/globals.css:1073–1115`
- **What:** Under 4× CPU throttling at `1440×900`, `81 / 150` scroll frames exceed `17.5 ms` and `27 / 150` exceed `34 ms` (`max = 99.9 ms`, `33.6 avg FPS`). On `390×844` (where `PhotoCraftKineticHud` is `hidden md:block`), scroll averages `57.3 FPS`.
- **Why it matters:** Every scroll tick mutates `stroke-dashoffset` on a `1440×900` fixed `<svg>` path (`trailEl.style.strokeDashoffset = ...`) — which triggers main-thread SVG stroke re-rasterization across the entire viewport — at the same time `.sb-jet-plumes` pulses opacity infinitely, `PhotoCraftKineticHud` scales text with `text-shadow: 0 0 22px ... 0 0 44px ...`, and `Reveal` (`whileInView`) observers fire.
- **Proposed fix:** Without changing `ScrollFlightPath`, `ExecutiveMonochromeJet`, `PhotoCraftKineticHud`, or `scrollEngine` behaviour: isolate layer bounds (`contain: layout paint` on fixed overlays), avoid unnecessary style writes when values haven't changed beyond sub-pixel thresholds, and keep glow pre-composited rather than repainting huge blurred text-shadows per frame.

#### P1-8 · [Performance / Mobile] `UniversityCampusMarquee` mounts `48` `<img>` nodes and falls back to multi-MB raw originals
- **Where:** `src/components/LandingPage.tsx:2109–2145`, `src/lib/wikimediaThumb.ts:36–44`
- **What:**
  1. Three rows × 8 universities × 2 copies = **`48` `<img>` nodes** inside `width: max-content` flex rows. Because horizontal flex tracks lay out off-screen X coordinates at `y ≈ 700px`, Chromium's `loading="lazy"` viewport distance heuristic eagerly triggers **38+ campus image requests** on initial `/` load before the user scrolls.
  2. `onWikimediaThumbError(university.url)` sets `img.src = originalUrl` — pointing the browser directly at unproxied `https://upload.wikimedia.org/wikipedia/commons/...` camera scans (3–8 MB each, and blocked/throttled on Uzbek ISPs).
- **Why it matters:** Wastes bandwidth on mid-range Android phones, competes with JS/font downloads during initial page load, and risks multi-MB image downloads or hung sockets if a thumbnail 404s.
- **Proposed fix:** Keep `UniversityCampusMarquee` and all 24 `MARQUEE_ROW_1..3` universities intact (PROTECTED), add `decoding="async"` consistently, replace the unproxied raw-original `onError` fallback with a graceful styled gradient/crest placeholder (never falling back to unproxied multi-MB originals), and ensure off-screen rows don't stampede initial Hero network priority.

#### P1-9 · [Visual System] Heavy weight inflation (`95.3%` bold/extrabold/black) & unloaded `font-serif` fallback
- **Where:** Codebase-wide (`src/components/*`, `src/app/*`), `src/app/layout.tsx:45–65`, `src/components/LandingPage.tsx:1007, 1495`
- **What:**
  - Across `src/components` and `src/app`, explicit font-weight classes break down as: `font-black` (`83`), `font-extrabold` (`321`), `font-bold` (`1,194`), `font-semibold` (`780`) vs. `font-medium` (`94`) and `font-normal` (`24`).
  - `LandingPage.tsx:1007` (`"mapped intelligently."`) and `1495` (product principle quote) use `font-serif italic`, but `layout.tsx` only loads `Inter` (`--font-inter-latin` / `--font-inter-cyrillic`), so `font-serif` resolves to `Georgia` / `Times New Roman` / `Droid Serif` depending on OS.
- **Why it matters:** When badges, tabs, eyebrows, buttons, body callouts, and titles all use `700–900` weight in a single geometric sans-serif, nothing stands out and dense student screens feel shouty. Meanwhile, `Times New Roman` on Windows/Android breaks the modern editorial look of the Hero headline.
- **Proposed fix:** Establish a disciplined typographic scale using Inter (`display: 700/800` tight tracking, `section h2: 700`, `card h3: 600`, `UI control/pill: 500/600`, `body/metadata: 400/500`), and either style the Hero accent in crisp Inter italic/gradient without `Times New Roman` fallback or pair a tiny self-hosted subset if editorial serif is desired (see Decision #3).

#### P1-10 · [Visual System / Accessibility] WCAG AA contrast failures (`1.47:1` on `BadgeShowcase` dates; borderline light pills)
- **Where:** `src/components/BadgeShowcase.tsx:41`, `src/components/LanguageSwitcher.tsx:28, 46`
- **What:**
  - `BadgeShowcase.tsx:41` renders earned dates in `text-slate-300` (`#cbd5e1`) on `bg-slate-50` (`#f8fafc`) = **`1.47:1` contrast** in light mode (nearly invisible; WCAG AA requires `4.5:1`).
  - Muted `text-slate-500` (`#64748b`) on `bg-slate-100` (`#f1f5f9`) controls/pills achieves `4.34:1` in light mode (just shy of `4.5:1`).
- **Why it matters:** Fails WCAG 1.4.3 Contrast (Minimum) and makes secondary metadata unreadable outdoors on mid-brightness phone screens.
- **Proposed fix:** Replace `text-slate-300` with `text-slate-500 dark:text-slate-400` (`>= 4.6:1` in light, `>= 6.8:1` in dark) and bump `slate-500`-on-`slate-100` control labels to `text-slate-600`.

#### P1-11 · [Visual System / In-App UX] Five conflicting visual eras across in-app destinations
- **Where:**
  - Era A: `src/components/RewardsSection.tsx:101` (`bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 shadow-xl`)
  - Era B: `src/components/PaymentsSection.tsx:136, 217` (`bg-gradient-to-br from-amber-50 to-orange-50` + `from-amber-500 to-orange-500`)
  - Era C: `src/components/DailyStreakCard.tsx:158` (`bg-gradient-to-r from-orange-50 via-amber-50 to-white`)
  - Era D: `src/components/ui/hubs.tsx:220` (`HubPage` with breadcrumb + `.sb-journey-hero` + `.sb-aurora` + `HubTabs`)
  - Era E: `src/app/HomeClient.tsx:1265–1270` (`#notifications` bare stacked `TelegramSettings` + `SessionsPanel` with no page header at all)
- **Why it matters:** Navigating from Dashboard → Universities → Rewards → Premium → Telegram feels like jumping between four different apps built at different times rather than one cohesive indigo/violet product.
- **Proposed fix:** Unify every top-level destination under one shared indigo/violet surface language (`.sb-journey-hero` / refined dark glass header + semantic accent tokens for gold Pro / emerald achievement accents, never full-bleed neon cyan/orange banners), and add a proper `PageHeader` to `#notifications`.

#### P1-12 · [In-App UX] Collapsed sidebar groups + misleading `PRO` badge bury AI Audit, SOP Studio, and Scholarships
- **Where:** `src/components/Navbar.tsx:314–320, 378–381, 510–530`, `src/lib/navSections.ts:95–260`
- **What:**
  1. On `#dashboard` (`activeGroup === "home"`), `collapsedGroups` initializes **all 5 sidebar groups (`EXPLORE`, `MY PLAN`, `APPLICATIONS`, `AFTER ADMISSION`, `HELP & LEARNING`) to collapsed** (`docs/redesign/baseline/app-dashboard-1440-dark.png`). A new user sees zero feature links in the left sidebar until they click group headers.
  2. `Application Materials` carries `premium: true` in `navSections.ts`, painting the entire sidebar row amber with a `PRO` pill — even though 3 of its 4 tabs (`Requirements`, `Documents & Answer Vault`, `Interview Center`) are free, and its `AI SOP & Essays` tab sits 4 levels deep (`APPLICATIONS → Application Materials → AI SOP & Essays → SubPills`).
  3. On mobile (`< 768px`), the bottom bar (`Home | Explore | My Plan | Apps | More`) maps `Explore` only to `Universities`; `Scholarships`, `AI Mentor`, and `Materials` require opening `More` or discovering hub cross-links.
- **Why it matters:** High-school students won't hunt through collapsed accordions or click a `PRO`-locked-looking menu item to find free checklists, SOP tools, or AI Profile Audit.
- **Proposed fix:** Default `EXPLORE` and `MY PLAN` (and `APPLICATIONS`) to expanded on desktop so core tools (`Universities`, `Scholarships`, `Study Plan`, `Profile & Readiness`, `My Applications`, `Materials & SOP`) are immediately visible; reserve `PRO` badges for the actual gated pane/studio rather than tinting the entire `Application Materials` destination amber; and surface quick-launch cards/shortcuts for **AI Profile Audit**, **SOP Studio**, **Scholarships**, and **Application Tracker** on the Dashboard/Explore header.

#### P1-13 · [In-App UX / Mobile] Expanded `GuidedJourneyBar` consumes 55% of mobile viewport + fires duplicate fetches
- **Where:** `src/components/GuidedJourneyBar.tsx:57, 81–137, 168–280`, `src/app/HomeClient.tsx:1066–1075`
- **What:**
  - `collapsed` defaults to `false`, rendering a 4-row vertical stack of step cards + header + bottom `"Current step: ... [Continue]"` bar above every non-dashboard tab (`~460px` tall on `390×844` — see `docs/redesign/baseline/app-universities-390-dark.png`). The student has to scroll past half a screen of chrome before seeing even the title of Universities or Scholarships.
  - Every mount fetches `/api/tasks?profileId=...` and `/api/applications?profileId=...` without client caching, duplicating fetches that `TasksHub` and `ApplicationsHub` immediately make right underneath.
- **Why it matters:** Crushes above-the-fold usability on Android phones and adds redundant network chatter on every tab switch.
- **Proposed fix:** Default `GuidedJourneyBar` to its **compact 1-line slim bar** on mobile viewports (`< 768px`) with one-tap expand (`aria-expanded`), while keeping desktop compact/horizontal, and share a short-TTL client cache (`clientCatalogSwr` / shell state) for task/application counts.

#### P1-14 · [Engagement / Mobile] Four competing "what next?" blocks on Dashboard + non-interactive `"Start today"` streak pill
- **Where:** `src/components/journey/JourneyControlCenter.tsx:960–1180`, `src/components/DailyStreakCard.tsx:82–97, 155–185`
- **What:**
  1. A student opening `#dashboard` faces **four** separate progression frameworks stacked vertically: (a) `DailyStreakCard` (`"0 days · Start today"`), (b) `"Start with these three steps"` (`3` cards), (c) `"YOUR STUDY ABROAD JOURNEY"` (`8` stages + `"29% · 2 of 8 stages done"`), (d) `"Next steps"` (`3–5` rows), plus `"10 Study Plan phases"` further down (`8 stages` vs `4 guided steps` vs `3 starter steps` vs `10 phases`!).
  2. In `DailyStreakCard.tsx:82–97`, `"Start today"` / `"Continue today"` is styled identically to an action chip (`rounded-full bg-white text-orange-700 ring-1`) but is a plain `<span>` with **no `onClick`**, and the explanation of how streaks work lives in `title={t("streakHonestNote")}` (`line 157`), which cannot be opened by touch on phones.
- **Why it matters:** For a 16–18-year-old, seeing `3 steps`, `4 steps`, `8 stages`, and `10 phases` simultaneously creates decision paralysis instead of momentum, and tapping `"Start today"` does nothing.
- **Proposed fix:** Make the Dashboard hero crystal clear around **one primary "Next Best Action"** CTA, make the streak CTA pill interactive (scrolling to / triggering today's highest-priority action or opening an accessible info popover on tap), and visually subordinate secondary breakdowns below the fold.

#### P1-15 · [In-App UX / Mobile] Seven wide `<table>` views force awkward horizontal scrolling on `390px` phones
- **Where:**
  - `src/components/journey/AfterAdmissionPanels.tsx:346` (`min-w-[920px]` post-admission offer matrix)
  - `src/components/CountryComparePanel.tsx:287` (`min-w-[640px]`)
  - `src/components/RecommendationStudio.tsx:817, 864` (`min-w-[420px]`, `min-w-[560px]`)
  - `src/components/UniversityExplorer.tsx:1504` (side-by-side university compare table)
  - `src/components/PlanningStudio.tsx:1090`, `src/components/AdmissionsStatisticsCard.tsx:16`
- **Why it matters:** Comparing 3 countries or 3 university offers inside a `920px`-wide table on a `390px` Android viewport hides 60% of columns off-screen without sticky first-column labels or mobile stacked comparison cards.
- **Proposed fix:** Add responsive mobile card stacks (`md:hidden` cards + `hidden md:block` table) or sticky first-column headers + horizontal scroll shadows so comparisons are effortless one-handed on a `390px` phone.

#### P1-16 · [Accessibility] `LanguageSwitcher` lacks a keyboard focus ring and is hidden inside the mobile/tablet drawer
- **Where:** `src/components/LanguageSwitcher.tsx:27–36, 46–56`, `src/components/Navbar.tsx:909–946`
- **What:**
  - Both compact and full `<select>` elements set `focus:outline-none` without `focus-visible:ring-2` or wrapper `focus-within:ring-2`. Live Chromium inspection confirmed `outline: none 3px` and `box-shadow: none` when focused via Tab.
  - Inside the app (`Navbar.tsx`), phones (`< 768px`) and tablets (`768–1023px`) have **no language switcher in the top header or tablet rail** — users must open the slide-over drawer and scroll to its footer to switch between `UZ`, `RU`, and `EN`.
- **Why it matters:** Violates WCAG 2.4.7 Focus Visible, and makes language switching unnecessarily hard on mobile in a trilingual Uzbek/Russian/English product.
- **Proposed fix:** Add `focus-within:ring-2 focus-within:ring-indigo-500` on `LanguageSwitcher`'s wrapper and place the compact `UZ / RU / EN` switcher directly in the mobile top header (`Navbar.tsx:935`) alongside Search and Notifications.

#### P1-17 · [Accessibility] Sub-44px click/touch targets across HUD, modals, banners, and list toggles
- **Where:**
  - `src/components/LandingPage.tsx:642–656` (`PhotoCraftKineticHud` bottom-right jump buttons measure `80–124 × 16 px` on desktop)
  - `src/components/CheckoutModal.tsx:80–87` (close button `p-1.5` = `32×32 px` on `>=1024px`)
  - `src/components/ui/hubs.tsx:148` (`ShowMoreToggle` uses `min-h-9` = `36 px`)
  - `src/app/HomeClient.tsx:167–182` (`SessionNotice` retry/dismiss buttons `px-3 py-1.5` = `~28 px`)
  - `src/app/globals.css:989` (`@media (max-width: 1023px)` forces `44px` on `<button>`/`<input>`, but excludes `<a>` links and does not apply at `>=1024px` touch laptops/iPads Pro)
- **Why it matters:** Small targets cause mis-taps on touchscreens and hurt motor accessibility.
- **Proposed fix:** Use `min-h-11 min-w-11` (`44px`) on modal close, `SessionNotice`, and `ShowMoreToggle` controls, and add comfortable vertical hit padding on HUD jump buttons without altering the visual ruler aesthetic.

#### P1-18 · [i18n / Visual System] Raw Unicode emojis embedded in translations cause double icons & missing-glyph boxes
- **Where:** `src/components/GuidedJourneyBar.tsx:144–172` + `src/i18n/messages/*.json` (`84` keys), `src/lib/navSections.ts` (`NAV_GROUP_ICONS`), `src/components/LandingPage.tsx:76–285, 2135`
- **What:**
  - `GuidedJourneyBar` renders a Lucide icon (`<User>`, `<GraduationCap>`, `<FileText>`, `<Briefcase>`) **and** `t("step1..4")`, whose JSON strings *also* start with Unicode emojis (`"👤 Profile & Goals"`), producing double icons (and tofu boxes `[]` on systems without color-emoji fonts — visible in `app-universities-390-dark.png`).
  - Sidebar group headers (`🔎 EXPLORE`, `🧭 MY PLAN`) and stage headers (`🧭 Prepare`) use raw Unicode emojis instead of Lucide icons.
  - `MARQUEE_ROW_1..3` (`LandingPage.tsx:76–285`) hardcodes English country labels with regional-indicator flag emojis (`"🇺🇸 USA"`, `"🇬🇧 UK"`) without `.sb-flag-emoji` or `<CountryFlag>`, which renders as `"US USA"` / `"GB UK"` on Windows Chrome/Edge and stays English in `uz`/`ru`.
- **Why it matters:** Hurts visual polish across Android skins, Windows laptops, and Linux desktops, and mixes English country names into Uzbek/Russian landing pages.
- **Proposed fix:** Replace raw UI structural emojis in sidebar groups, `GuidedJourneyBar`, and stage pills with crisp Lucide vector icons; render `<CountryFlag>` + localized country names on `UniversityCampusMarquee` cards while keeping `MARQUEE_ROW_1..3` university data untouched.

---

### Severity P2 — Polish, Consistency, Motion Hygiene & Code Cleanliness

#### P2-1 · [In-App UX] Inconsistent loading and empty states across feature generations
- **Where:** `src/components/PaymentsSection.tsx:225`, `src/components/RewardsSection.tsx:94`, `src/components/BadgeShowcase.tsx:30`, vs. `src/components/ui/hubs.tsx` (`PanelSkeleton`, `HubEmpty`)
- **What:** Newer hubs render shimmer `PanelSkeleton` and structured `Empty` cards with next-step hints, whereas `PaymentsSection` and `RewardsSection` render plain centered `<p className="text-sm text-slate-500">{t("loading")}</p>` boxes that jump in height when data arrives.
- **Why it matters:** Layout jumps and plain text loaders make utility screens feel unfinished compared to the rest of the app.
- **Proposed fix:** Use shared `PanelSkeleton` and `Empty` primitives across `PaymentsSection`, `RewardsSection`, and `BadgeShowcase`.

#### P2-2 · [In-App UX — Forms] `ProfileModal` presents ~38 fields across 4 tabs without completion cues
- **Where:** `src/components/ProfileModal.tsx:38–68, 108–210`
- **What:** Unlike the clean 3-step `OnboardingWizard` (`Identity → Direction → Destinations`), opening **Edit Profile** drops a 17-year-old into a dense modal with ~38 inputs (AP, IB, A-Levels, SAT, ACT, GRE, IELTS, TOEFL, Duolingo, family income, 10 activity/award text inputs) with no per-tab completion indicator or collapsible "Optional / Advanced tests" grouping.
- **Why it matters:** Overwhelms high-school students who usually only have GPA + IELTS/SAT + 2–3 activities, leading to abandoned profile edits.
- **Proposed fix:** Add subtle per-tab filled counts (e.g. `Academics · 3/5`), highlight the 5 core matching fields at the top, and group specialized tests (GRE/ACT/IB/AP) into a clean expandable disclosure.

#### P2-3 · [Engagement] Missing micro-celebrations & buried Rewards/Level feedback
- **Where:** `src/components/Navbar.tsx:702`, `src/components/TaskRoadmap.tsx`, `src/components/OnboardingWizard.tsx`
- **What:** Completing onboarding, checking off a milestone task, shortlisting the 3rd university, or leveling up happens silently with no tactile micro-celebration, and the student's points/level only live inside `Rewards & Referrals` at the bottom of the sidebar.
- **Why it matters:** 16–18-year-olds stay engaged over a 6-month application season when small wins feel rewarding and visible (without gamifying honest chancing).
- **Proposed fix:** Add subtle, `prefers-reduced-motion`-safe completion micro-interactions (spring checkmark pop + concise toast/progress pulse on milestone completion) and a quiet compact level/streak chip linking to Rewards.

#### P2-4 · [Accessibility / Motion] Programmatic `behavior: "smooth"` bypasses `prefers-reduced-motion`
- **Where:** `src/components/LandingPage.tsx:341, 947`, `src/app/HomeClient.tsx:314`
- **What:** `el.scrollIntoView({ behavior: "smooth" })` and `window.scrollTo({ top: 0, behavior: "smooth" })` hardcode `"smooth"` regardless of `window.matchMedia("(prefers-reduced-motion: reduce)").matches`.
- **Why it matters:** Vestibular-sensitive users who enable OS reduced motion still get animated full-page smooth scrolls on anchor clicks and tab transitions.
- **Proposed fix:** Use a tiny helper `prefersReducedMotion() ? "auto" : "smooth"` for all programmatic scroll calls.

#### P2-5 · [Performance] Always-running `.sb-aurora` blurred backdrop animation on every Hub & Dashboard hero
- **Where:** `src/app/globals.css:936–948`, `src/components/ui/journey.tsx:65`, `src/components/ui/hubs.tsx:223`
- **What:** `.sb-aurora` places an `inset: -30%` layer with `filter: blur(6px)` and `animation: sb-aurora 16s ease-in-out infinite` behind every `HubPage` header and Dashboard `JourneyCard` hero.
- **Why it matters:** Continuous blurred layer recompositing drains battery on mid-range Android GPUs for an almost imperceptible 16-second drift.
- **Proposed fix:** Render `.sb-aurora` as a rich static multi-radial mesh gradient by default (or animate once on entrance only), saving continuous GPU compositing for user-driven interactions.

#### P2-6 · [Visual System] Minor border-radius drift (`rounded-xl`, `rounded-2xl`, `rounded-lg`)
- **Where:** `23` occurrences across `src/components/*` vs. `1,788` uses of semantic `rounded-surface` / `rounded-control` / `rounded-overlay`
- **What:** Most of the codebase cleanly uses `--radius-control` (`8px`), `--radius-surface` (`12px`), and `--radius-overlay` (`16px`), but 23 older elements still hardcode `rounded-lg`/`xl`/`2xl`.
- **Why it matters:** Small visual inconsistencies between adjacent cards and modals.
- **Proposed fix:** Align remaining cards/controls onto `rounded-control`, `rounded-surface`, and `rounded-overlay`.

#### P2-7 · [i18n] `1.9×–2.8×` Uzbek and Russian string expansion cramps compact action pills
- **Where:** `src/i18n/messages/uz.json` & `src/i18n/messages/ru.json` (e.g., `journey.ccActionCheckFit`: `"Check fit"` → `"Проверить совместимость"` `2.56×`; `landing.footerPrivacy`: `"Privacy"` → `"Конфиденциальность"` `2.57×`; `guidedJourney.title`: `"Guided journey"` → `"Yo'nalish bo'yicha qo'llanma"` `2.0×`)
- **What:** While `min-w-0 break-words` prevents horizontal document overflow (`docOverflow = 0` verified in Playwright across `en`/`uz`/`ru` at `390px`), several compact action pills and sidebar 3-column profile buttons (`Edit / Switch / Add` in `Navbar.tsx:741–778`) wrap onto 2–3 tight lines in Russian and Uzbek.
- **Proposed fix:** Provide concise idiomatic button/pill phrasing in `uz`/`ru` where appropriate and ensure compact button rows allow clean flex wrapping rather than cramped 3-column micro-grids.

#### P2-8 · [i18n] Public `/privacy` & `/terms` pages and `HomeClient` `sessionCopy` bypass `next-intl`
- **Where:** `src/app/privacy/page.tsx:29–155`, `src/app/terms/page.tsx:30–158`, `src/app/HomeClient.tsx:96–128`
- **What:** `sessionCopy` uses an inline 3-locale TS object instead of `next-intl`, and `/privacy` + `/terms` contain hardcoded English headings/clauses.
- **Why it matters:** Breaks Hard Rule 2 consistency (*"All user-facing text goes through `next-intl`"*), leaving Uzbek/Russian visitors with English legal headers when clicking footer links.
- **Proposed fix:** Move `sessionCopy` into `common`/`sessions` in `en.json`/`uz.json`/`ru.json`; localize `/privacy` and `/terms` UI chrome (or confirm legal-text scope in Decision #7).

#### P2-9 · [Dead Code] Unused components & dead photo constants (with CI script coupling note)
- **Where:**
  - `src/components/JourneyGuide.tsx` — **100% dead** (`0` imports in `src/` and `0` in `scripts/`).
  - `src/components/LandingPage.tsx:289–330` — `8` of `12` `LANDING_PHOTOS` keys (`heroCampusGraduation`, `campusUsa`, `campusUk`, `campusGermany`, `campusSwiss`, `campusCanada`, `campusAsia`, `ctaAirplaneSunset`) are unused anywhere.
  - `src/components/DashboardView.tsx`, `src/components/DocumentChecklist.tsx`, `src/components/NextActionsPanel.tsx` — **0 imports in `src/`** (unreachable in production app), **but still imported/read by `scripts/check-render.ts`, `scripts/check-responsive.mjs`, `scripts/check-ux-redesign.mjs`, and `scripts/check-ai-format.ts`**.
- **Why it matters:** Dead components confuse maintenance, and deleting the 3 script-coupled files without updating test scripts would break CI suites.
- **Proposed fix:** Remove unused `LANDING_PHOTOS` entries when reworking `LandingPage.tsx`; leave script-coupled legacy files untouched unless you want them retired alongside their test assertions.

---

## 3. Coverage Cross-Check by Audit Area

- **Visual System:** Covered in **P0-2** (`#cta` dark inversion), **P0-3** (dark default first impression), **P1-9** (`95.3%` bold weight inflation + `font-serif` fallback), **P1-10** (`1.47:1` WCAG contrast bug), **P1-11** (5 visual eras & gradient overuse), **P2-6** (radius drift).
- **Landing Structure:** Covered in **P1-3** (HUD/Jet Hero collisions), **P1-4** (`"Get started"` + Telegram CTA hierarchy), **P1-5** (Unsplash stock photos in `"How it works"`), **P1-6** (3× card-grid monotony & ASCII icons). Protected `ScrollFlightPath`, `ExecutiveMonochromeJet`, `PhotoCraftKineticHud`, `scrollEngine`, `UniversityCampusMarquee`, and Honest Chancing (`—`) are preserved.
- **In-App UX:** Covered in **P0-1** (`CheckoutModal` layout), **P1-11** (era consistency), **P1-12** (collapsed sidebar groups & buried AI Audit / SOP Studio / Scholarships), **P1-13** (`GuidedJourneyBar` mobile fold crowding), **P1-15** (7 wide mobile tables), **P2-1** (loading/empty states), **P2-2** (`ProfileModal` 38-field form density).
- **Engagement:** Covered in **P1-14** (4 competing "what next?" blocks + dead `"Start today"` streak pill & touch-inaccessible tooltip), **P2-3** (celebration micro-interactions & buried Rewards/Level visibility).
- **Accessibility:** Covered in **P1-10** (WCAG AA contrast), **P1-16** (`LanguageSwitcher` missing focus ring & hidden in mobile/tablet drawer), **P1-17** (`< 44px` targets), **P2-4** (`prefers-reduced-motion` programmatic scroll).
- **Performance & Mobile:** Covered in **P1-1** (`5,474 ms` mobile LCP from SSR `opacity: 0`), **P1-2** (`1,518 KB` JS + full dictionary shipping on `/` + `610–824 KB` UZ/RU HTML), **P1-7** (`33.6 FPS` 4×-CPU scroll compositing), **P1-8** (`48` marquee `<img>` nodes + unproxied multi-MB fallback), **P2-5** (always-running `.sb-aurora` blur).
- **i18n:** Covered in **P0-4** (forced Uzbek `labelUz` on EN/RU pricing), **P0-5** (hardcoded English in Footer, `EssayRubricStudio`, `PlanningStudio`, `hubs`, `LevelProgressBar`), **P1-18** (84 embedded emojis + double icons + Windows flag bug), **P2-7** (`1.9×–2.8×` UZ/RU expansion), **P2-8** (`sessionCopy` & `/privacy`/`/terms`).
- **Bugs & Dead Code:** Covered in **P0-1**, **P0-2**, **P1-8**, **P1-13**, **P2-9**.

---

## 4. Prioritised Redesign Plan

1. **Phase 2 — Design System, Dark-First Default & Typography Foundation (`globals.css`, `theme.ts`, `layout.tsx`, `ui/*`):**
   - Make **dark theme** the default first impression (`P0-3`) while keeping Light & System 100% functional and passing `npm run test:dark`.
   - Refine obsidian/indigo/violet surface tokens, border hairlines, subtle elevation glows, typographic weight hierarchy (`P1-9`), WCAG AA contrast fixes (`P1-10`), `LanguageSwitcher` focus ring (`P1-16`), and reduced-motion scroll/aurora hygiene (`P2-4`, `P2-5`).
2. **Phase 3 — Landing Page Redesign & Mobile LCP/Scroll Optimization (`LandingPage.tsx`, public i18n split):**
   - Eliminate SSR `opacity: 0` on above-the-fold Hero (`P1-1`) and slim initial `/` payload (`P1-2`) to cut mobile LCP from `5.5 s` toward `< 2.5 s`.
   - Keep **all 5 PROTECTED elements** intact (`ScrollFlightPath`, `ExecutiveMonochromeJet`, `PhotoCraftKineticHud`, `scrollEngine`, `UniversityCampusMarquee` + Honest Chancing `—`), while fixing HUD/Jet Hero collisions (`P1-3`), desktop scroll FPS (`P1-7`), marquee fallback/flag polish (`P1-8`, `P1-18`), `#cta` dark-mode button (`P0-2`), `"Get started"` + secondary Telegram CTA hierarchy (`P1-4`), bespoke UI step visuals replacing stock Unsplash photos (`P1-5`), and varied bento/editorial section rhythm (`P1-6`).
3. **Phase 4 — In-App Shell, Navigation, Dashboard Clarity & Engagement (`Navbar.tsx`, `GuidedJourneyBar.tsx`, `JourneyControlCenter.tsx`, `DailyStreakCard.tsx`):**
   - Expand core sidebar groups by default, surface AI Audit / SOP Studio / Scholarships / Tracker clearly (`P1-12`), put compact `LanguageSwitcher` in the mobile top bar (`P1-16`), collapse `GuidedJourneyBar` to a slim 1-line bar by default on phones (`P1-13`), unify Dashboard around one clear "Next Best Action" + interactive streak CTA (`P1-14`), and add subtle reduced-motion-safe completion celebrations (`P2-3`).
4. **Phase 5 — Core Screens Unification, Mobile Tables, Forms & Full i18n/Bug Sweep (`PaymentsSection`, `CheckoutModal`, `RewardsSection`, `ProfileModal`, `EssayRubricStudio`, mobile tables):**
   - Fix `CheckoutModal` layout bug (`P0-1`), localize `PaymentsSection` / `CheckoutModal` / `EssayRubricStudio` / `HomeClient` footer / `PlanningStudio` / `LevelProgressBar` across `EN` / `UZ` / `RU` (`P0-4`, `P0-5`), unify Rewards & Premium headers into the shared dark-indigo design language (`P1-11`, `P2-1`), add mobile comparison cards/sticky columns for wide tables (`P1-15`), and add progressive disclosure + completion cues to `ProfileModal` (`P2-2`).
5. **Phase 6 — Final QA, Before/After Screenshots & Performance Re-Benchmark:**
   - Re-capture Playwright screenshots across `1440`, `820`, `390` (dark & light), re-run Lighthouse mobile + 4× CPU scroll FPS + `typecheck` + `lint` + `check:i18n` + `test:dark` + `test:perf`, and publish the final comparison report.

---

## 5. Decisions Needed From Owner (7 Questions, With Recommendations)

1. **Secondary Telegram CTA URL on Landing (`P1-4`):**  
   *Question:* Which Telegram URL should the landing page's secondary CTA open (e.g., the public channel configured in Admin/bootConfig, or a specific `https://t.me/...` handle fallback when none is configured in DB)?  
   **Recommendation:** Read the public channel link from existing boot config (`config.branding` / channel config) with a clean fallback constant (please share your official `t.me/...` handle if you want a default when DB config is empty), and hide the button rather than linking to `#` if unset.

2. **Hero Headline Accent Font (`P1-9`):**  
   *Question:* `"mapped intelligently."` currently uses `font-serif italic` without a loaded serif font (rendering as `Times New Roman` / `Georgia`). Should we style the accent in **pure Inter** (italic/gradient/editorial underline, `0 KB` font cost, full Cyrillic `RU` + `UZ` apostrophe support) or self-host a small Latin+Cyrillic serif display subset (~`25–35 KB` woff2)?  
   **Recommendation:** **Pure Inter** with refined weight contrast (`800` headline + `500/600` indigo→violet gradient accent) — zero extra font bytes on mobile and 100% consistent across English, Uzbek, and Cyrillic Russian.

3. **Replacing Stock Unsplash Photos in `"How it works"` (`P1-5`):**  
   *Question:* Should we replace the 4 generic Unsplash stock photos in `"How it works"` with **coded mini UI previews** (themed glass cards showing Profile → University Fit → Roadmap → Application Tracker in the user's active language)?  
   **Recommendation:** **Yes — coded mini UI previews.** Zero external image bytes, instant load on Uzbek mobile networks, auto-localized in EN/UZ/RU, and looks genuinely premium in both dark and light themes.

4. **Mobile Bottom Navigation Bar (`P1-12`):**  
   *Question:* Phone bottom bar is currently `Home | Explore | My Plan | Apps | More` (where `Scholarships` is inside `More` or switching hubs). Keep these 5 group tabs (and add a fast `Universities ↔ Scholarships` switcher at the top of `Explore`), or replace `My Plan` with `Grants`?  
   **Recommendation:** **Keep the 5 group tabs** (`Home | Explore | My Plan | Apps | More`) so existing mental models stay stable, and add a prominent 1-tap `Universities` / `Scholarships` switcher strip at the top of `Explore` plus collapse `GuidedJourneyBar` to 1 line on mobile (`P1-13`).

5. **Sidebar `PRO` Badge on `"Application Materials"` (`P1-12`):**  
   *Question:* `"Application Materials"` contains 3 free tabs (`Requirements`, `Documents & Answer Vault`, `Interviews`) and 1 Pro-gated tab (`AI SOP & Essays`), yet the whole sidebar item is badged `PRO` in amber. May we remove the amber `PRO` tint from the parent sidebar item and keep `PRO` only on the gated `AI SOP & Essays` tab?  
   **Recommendation:** **Yes** — dramatically improves discoverability of both the free document/interview tools and the SOP Studio preview without touching any entitlement/paywall logic.

6. **Localizing Public `/privacy` and `/terms` Pages (`P2-8`):**  
   *Question:* `/privacy` and `/terms` are currently English-only static pages. Should we localize their UI chrome + text into `en`/`uz`/`ru` via `next-intl`, or keep the legal prose in English with a localized header note ("Official legal text is provided in English")?  
   **Recommendation:** **Translate the navigation chrome + add an honest localized summary banner**, or translate full text if you want full UZ/RU legal copy (translating 300 lines of legal prose adds dictionary weight, whereas a localized header + summary stays lean and legally unambiguous).

7. **Retiring Dead Components Coupled to Legacy Check Scripts (`P2-9`):**  
   *Question:* `JourneyGuide.tsx` has zero references anywhere, while `DashboardView.tsx`, `DocumentChecklist.tsx`, and `NextActionsPanel.tsx` are unused by the app (`src/`) but still imported by `scripts/check-render.ts` and `scripts/check-responsive.mjs`. Leave those 3 script-coupled files untouched for safety, or delete them and update the scripts?  
   **Recommendation:** Delete `JourneyGuide.tsx` + unused `LANDING_PHOTOS` keys in later phases, and **leave the 3 script-coupled files untouched** unless you explicitly want `scripts/*` cleaned up too.
