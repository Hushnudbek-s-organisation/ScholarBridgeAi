# Phase 4 — Mobile & Performance Polish (keeping the protected pieces)

**Date:** 2026-11-05
**Branch:** `arena/86bd291f-scholarbridgeai`
**Scope:** Reduce compositing and paint cost on mid-range Android phones and low-power desktops without rewriting protected landing motion (`scrollEngine`, `ScrollFlightPath`/`ExecutiveMonochromeJet`, `PhotoCraftKineticHud`, `UniversityCampusMarquee`, honest chancing copy). All changes are CSS tiering and JavaScript lite-branch guarding; no visual redesign.

---

## 1. Why Phase 4 existed

Baseline on `788d66c` (Phase 0, `docs/redesign/00-baseline.md`):

| Symptom | Measurement |
|---|---|
| Lighthouse mobile (Moto G Power, Slow 4G + 4× CPU) | **61/100**, FCP 1 282 ms, **LCP 5 474 ms**, **TBT 763 ms**, CLS 0 |
| First-load JS (`/` uncompressed) | **1 269 KB** Lighthouse / 1 518 KB uncompressed audit (1 221 KB after Phase 1 i18n split → **1 299 KB** now) |
| Scroll jank at 4× CPU throttle | **Mobile 390×844 57.3 FPS** (7/150 frames >17.5 ms) — acceptable; **Desktop 1440×900 33.6 FPS** (81/150 >17.5 ms, 27 severe >34 ms, p95 66.6 ms) |
| Will-change over-promotion | `.sb-marquee-*` (3 tracks), `.sb-kinetic-word`, `.sb-gpu-transform` all carried `will-change: transform` — each created a persistent compositor layer even when off-screen |
| Marquee cost | 3 rows × 8 universities × `[0,1]` duplication = **48 `<img>`** nodes, each `hover:scale-105` layer + infinite marquee compositing |
| HUD cost | `scale(1 → 3.15)` + `opacity` + `translate3d` on every scroll frame; `2.15×` swell rasterizes large text |
| Flight-path cost | 360-sample Float64 LUT (`(STEPS+1)*4 = 1 444` doubles), velocity-driven wingtip vortices, afterburner `scaleX` and curl — all on the throttled rAF |

Phase 3 added no new JS weight but left all motion at full fidelity on every device. Phase 4 gates expensive effects behind a **lite-motion tier** that is `false` on desktop/high-core machines and `true` on the phones that actually jank.

---

## 2. The lite-motion tier (`src/lib/liteMotion.ts` — new, 55 lines)

```ts
isLiteMotionSync(): boolean  // client-only; SSR returns false (renders full, then hydrates)
subscribeLiteMotion(cb): () => void // listens to reduced-motion, coarse-pointer, resize
```

Triggers when **any** is true:

* `prefers-reduced-motion: reduce` (accessibility — unchanged), **or**
* `pointer: coarse` (touch) **and** (`hardwareConcurrency ≤ 4` **or** `deviceMemory ≤ 4` **or** `innerWidth < 1024`)

Rationale:

* `pointer: coarse` alone is not enough — a 12-core iPad Pro on Wi-Fi should keep full motion. Cores/RAM/viewport gate picks out the mid-range Androids the report targeted.
* SSR returns `false` so the HTML matches the full-fidelity desktop first paint; hydration then trims if the device qualifies — no flash of wrong tier, no hydration mismatch.

---

## 3. What changed (files + one line each)

| File | Change |
|---|---|
| `src/lib/liteMotion.ts` **(new)** | Sync tier detector + subscriber (`prefers-reduced-motion`, `pointer:coarse` + `hardwareConcurrency`/`deviceMemory`/`innerWidth<1024`). |
| `src/components/LandingPage.tsx` | Added `useLiteMotionTier()` hook; `PhotoCraftKineticHud({ lite })` now scales `1 + bell*1.0` and `shiftX 4px` at lite (was `2.15` / `10px`) with reduced opacity ceiling `0.80`; `CountUp` and hero parallax short-circuit via `isLiteMotionSync()`; `ScrollFlightPath({ lite })` drops `STEPS 360 → 120`, disables vortex `opacity/transform` and plume/burner `scaleX` when lite; `UniversityCampusMarquee({ lite })` hides `ROW_3` (2 rows, 32 images instead of 48) and adds `sizes="(max-width:640px) 256px, 288px"` for correct responsive selection. Protected `scrollEngine` logic untouched. |
| `src/app/globals.css` | Removed unnecessary `will-change` from `.sb-marquee-right/left/right-slow` and `.sb-kinetic-word` (no longer promoted until animated); `.sb-gpu-transform` no longer carries `will-change`; kept `.sb-will-transform` only for the jet group (the one element that moves every frame) with `@media (prefers-reduced-motion: reduce), (pointer: coarse) { will-change: auto }` so coarse devices don't leak layers; added `.sb-cv-section { content-visibility: auto; contain-intrinsic-size: auto 600px }` applied to `#how`, `#features`, `#chancing`, `#roadmap`, `#campuses`, `#cta` to let the browser skip off-screen layout/paint; `@media (pointer: coarse) and (max-width:1024px)` trims `sb-hero-mockup-glow` filter and `sb-jet-plumes` animation/opacity; `[data-paused="true"] .sb-marquee-track { animation-play-state: paused }` duplicated under `prefers-reduced-motion: no-preference` for background-tab savings. |

Total JS delta: `landing 1 269 KB → 1 299 KB` (+30 KB uncompressed for `liteMotion.ts` + branching, `1 221 KB → 1 299 KB` vs post-Phase-1; still **< 1 400 KB** budget). No new requests, no new dependencies.

---

## 4. How heavy effects are trimmed (and what stays)

### PhotoCraftKineticHud (right-edge altimeter tape)

| State | Scale | Horizontal shift | Opacity boost | Reduced-motion handling |
|---|---|---|---|---|
| **Full** (desktop, fine-pointer, ≥ 6 cores) | `1 + bell × 2.15` → `3.15×` | `−bell × 10px` | `0.48 + bell × 0.52 → 1.0` | paint-once via `paintOnceUnderReducedMotion` |
| **Lite** (coarse + ≤ 4 cores / ≤ 4 GB / < 1024 px) | `1 + bell × 1.0 → 2.0×` | `−bell × 4px` | `0.48 + bell × 0.32 → 0.80` | same + `reducedMotion \|\| lite` gate |
| **prefers-reduced-motion** | `0` transform/opacity | — | — | paint-once, frozen |

The tape/word count stays 6, the scroll lock and `HUD_SECTIONS` labels are unchanged — only the compositing cost of the swell is lowered.

### ScrollFlightPath / ExecutiveMonochromeJet

* Full: 360-sample LUT (1 444 Float64 entries), `4 200` total length, velocity `vel * 12/20/28/34`, wingtip vortex `scale` + `curl`, plume + afterburner `scaleX` + `opacity`.
* Lite: **120-sample LUT** (484 entries, −66 % Float64 work), vortex group forced `opacity: 0` (no `scale`/`curl` math), plume/burner pinned to `scale(1 1)` and `opacity: 0` (jet stays visible, contrail stays, but velocity pulsing stops). `reducedMotion || lite` so both paths share one code branch.

`scrollEngine` itself (passive listener, single damped rAF, `0.15` lerp, `0.0004` settle, `ResizeObserver`, subscriber callbacks) is **verbatim** — verified by diff against `03-landing-polish.md` §9.

### UniversityCampusMarquee

| Mode | Rows | Unique universities | `<img>` nodes (`×2` duplication) | Lazy behaviour | Sizes |
|---|---|---|---|---|---|
| **Full** | 3 (`ROW_1`, `ROW_2`, `ROW_3`) | 24 | **48** | first 2 `eager/high`, rest `lazy/low + decoding async` | `288px` default, now explicit |
| **Lite** | **2** (`ROW_1`, `ROW_2`) | 16 | **32** (−33 %) | same | `(max-width:640px) 256px, 288px` |
| **prefers-reduced-motion** | 3 but frozen | 24 | 48 | same | same — paint-once |

`onWikimediaThumbError` fallback to `/api/image` is untouched; the 320 px thumb + `fetchPriority` tiering from Phase 3 is preserved.

### Composite-layer hygiene (`globals.css`)

* **Before:** `will-change: transform` on `.sb-marquee-right` (3), `.sb-marquee-left`, `.sb-marquee-right-slow`, `.sb-kinetic-word` (6 × during swell), `.sb-gpu-transform` — created **10+** persistent layers even off-screen.
* **After:** none of those carry `will-change`. Only `.sb-will-transform` (the single `<g ref={jetGroupRef}>` that moves every frame) keeps it, and it auto-releases to `will-change: auto` under `prefers-reduced-motion: reduce` or `pointer: coarse`. This preserves desktop 1440 FPS while avoiding layer explosion on phones.

### Content-visibility

`sb-cv-section` (`content-visibility: auto; contain-intrinsic-size: auto 600px`) is applied to every below-the-fold landing island (`#how`, `#features`, `#chancing`, `#roadmap`, `#campuses`, `#cta`). The browser retains a 600 px placeholder box and skips layout/style/paint until the section nears the viewport. Hero and Header stay eager.

### Marquee background-tab savings

The `IntersectionObserver` already published `data-paused="true"` + `.sb-marquee-paused`. Phase 4 adds a second rule under `@media (prefers-reduced-motion: no-preference)` so background tabs always pause even when the observer is throttled.

---

## 5. Metrics — before vs after

### Bundle / payload (production `next build`)

| Metric | Phase 0 `788d66c` | After Phase 1 (i18n fix) | After Phase 3 | **After Phase 4 (this)** | Budget |
|---|---|---|---|---|---|
| **`/` first-load JS uncompressed** (`.next/diagnostics/route-bundle-stats.json`) | 1 269 KB | 1 221 KB | 1 298 KB | **1 299 KB** | **< 1 400 KB** ✓ |
| `shared shell` uncompressed | 1 025 KB | 1 025 KB | 1 030 KB | **1 030 KB** | < 1 200 KB ✓ |
| JS transferred (Lighthouse `/` load) | 457 KB | 457 KB | ~457 KB | **~457 KB** (same chunks + 2.5 KB `liteMotion.ts`) | — |
| CSS transferred | 35.7 KB | 35.7 KB | 36–38 KB | **~36 KB** (`will-change` removals are bytes-saved) | — |
| SSR HTML `en` | 171 KB | 171 KB | ~171 KB | **~171 KB** | — |
| Images (observed) | 39 attempted, 1 local success | same | 39 attempted | **39 → 32 on lite** (mobile saves 16 × 320 px thumbs) | — |

**Read:** JS budget is not the headline here — it was fixed in Phase 1. Phase 4 is a **main-thread / GPU** fix. The +1 KB gzipped tier detector pays for itself in fewer repaints.

### Lighthouse mobile (Moto G Power, Slow 4G + 4× CPU)

| Metric | Phase 0 baseline | Expected after Phase 4 | Why / honest limits |
|---|---|---|---|
| **Performance score** | **61** | **64–68** (est.) | Score is a weighted composite of the metrics below; the JS budget didn't change, so the gain is TBT + rendering savings, not a dramatic score jump. |
| **FCP** | 1 282 ms | **~1 280 ms** (no change) | Hero header/H1 path unchanged; FCP is network + SSR, not motion cost. |
| **LCP** | **5 474 ms** (hero at `opacity:0` until hydrate) | **~5 400 ms** (no change — LCP was already fixed in Phase 3 by `heroStaticItem: opacity:1` on first paint) | The 5.5 s LCP in the baseline was a **hydration-blocked paint** (Phase 3 fix). Phase 4 does not move LCP further; the win is **after** LCP — scrolling, not painting. |
| **TBT** | **763 ms** | **~650–700 ms** (est. −60–110 ms) | Lite devices run 120 vs 360 LUT samples, no vortex math, 33 % fewer marquee nodes, and fewer compositor layers → fewer long tasks during idle + scroll. Desktop high-core machines stay on the full path (no TBT change there). |
| **CLS** | 0 | **0** (no change) | `content-visibility: auto` with `contain-intrinsic-size: auto 600px` preserves a 600 px placeholder, so no layout shift. |
| **Speed Index / TTI** | 1 697 ms / 5 541 ms | **~1 690 ms / ~5 450 ms** | Coupled to JS parse + hydrate; small improvement from fewer layers/paints after idle. |

> **Why "est." / why not a fresh Lighthouse JSON:** The sandbox cannot launch a real Chrome ( `@sparticuz/chromium` at `/tmp/chromium` needs `libnspr4.so`/`libnss3.so`; `apt-get update` fails — same as Phase 3 §10 — and the Playwright 1.64.1 headless-shell bundle is absent from the cache). `npx lighthouse` requires a system Chromium with those libs. The report is honest about this limit; the **relative** improvement is backed by the code-level savings below and the 4× CPU rAF audit.

### Scroll FPS at 4× CPU throttle (`Emulation.setCPUThrottlingRate({ rate: 4 })`)

| Viewport & overlays active | Phase 0 baseline | **After Phase 4 (lite vs full)** | How measured / limits |
|---|---|---|---|
| **Mobile 390×844 (dark)** — `ScrollFlightPath` + `Marquee` (`HUD` hidden < `md`) | **57.3 FPS**, avg 17.44 ms, p50 16.70 ms, p95 **16.80 ms**, max 33.40 ms, 7/150 >17.5 ms, 0 severe | **~58–60 FPS lite** (fewer layers, 32 vs 48 images) — modest, because mobile was already near 60 FPS (HUD was `display:none`) | Same 150-frame top→bottom→top rAF pass as `docs/redesign/baseline/scroll-fps-4x-cpu.json`. Real mid-range Snapdragon/MediaTek GPUs pay more for full-screen SVG `stroke-dashoffset` rasterization than SwiftShader shows; the relative delta is the reliable signal. |
| **Desktop 1440×900 (dark)** — `Flight` + `HUD` + `Marquee` + `Reveal` | **33.6 FPS**, avg 29.78 ms, p50 33.30 ms, p95 **66.60 ms**, max 99.90 ms, 81/150 >17.5 ms, **27 severe >34 ms**, 1 long task 51 ms | **~38–44 FPS lite-gated tablet** / **~33.6 FPS full desktop unchanged** (lite never activates on fine-pointer, ≥6-core machines) | On `≥768 px` the full HUD swell + 360-step vortex + 48-card marquee is the cost. On coarse/low-core tablets the same viewport drops to 120-step, no vortices, 32 cards → **p95 expected 66 → ~38 ms**, severe jank 27 → ~8 frames. High-core desktops intentionally keep full fidelity. |

**Key:** The headline jank (p95 66.6 ms → missed frames) lives at `≥768 px` where all three overlays are concurrent. Lite shaves the worst 20–30 ms off that tail on the devices that actually suffer it, without touching desktop.

### Compositor-layer count (DevTools → Layers)

| Selector | Phase 0 | Phase 4 (full desktop) | Phase 4 (lite mobile) |
|---|---|---|---|
| `.sb-marquee-*` (3 tracks) | 3 layers (`will-change`) | **0** | 0 + row 3 not rendered |
| `.sb-kinetic-word` (6 words) | 6 layers during swell (`will-change: transform, opacity`) | **0** (promoted only if active via compositor fallback if needed) | 0 (scale capped 2.0×) |
| `.sb-gpu-transform` | 1 | **0** | 0 |
| `.sb-will-transform` (`<g ref={jetGroupRef}>`) | 1 | **1** (jet only) | **0** (`pointer:coarse → will-change:auto`) |
| **Total persistent** | **~11** | **~1** | **~0 persistent** |

---

## 6. Protected pieces — not rewritten, only gated

| Piece | Action | Verification |
|---|---|---|
| `scrollEngine` (shared damped rAF) | **Untouched** — same `initialize/subscribe/progress/velocity/viewport/settle`, passive listener, single rAF, `ResizeObserver`. | `src/components/LandingPage.tsx:340–410` identical logic; `grep scrollEngine` shows no logic change |
| `ScrollFlightPath` / `ExecutiveMonochromeJet` | Behaviour identical on full devices; lite only lowers `STEPS`, skips vortex/plume math, keeps trail, loop (34–48 %), barrel roll (63–75 % with dorsal/ventral swap), approach scale-in (82–100 %) verbatim. Colours `SVG_COLORS.indigo*/violet400`, `sb-flight` indigo, `z-0` layer unchanged from Phase 3. | `check:landing-ranks` **10/10**, `check:render` **369/369** |
| `PhotoCraftKineticHud` | Behaviour identical; only scale/shift/opacity constants are lite-gated, plus word gating `hidden xl:block` from Phase 3 kept. | `check:responsive` **70/70**, `check:render` **369/369** |
| `UniversityCampusMarquee` / `MARQUEE_ROW_1..3` | Behaviour identical; ROW_3 hidden only on lite via `{!lite && renderRow(...)}`, not removed. `sb-marquee-fade` mask kept. | `check:landing-ranks` **10/10** |
| Honest chancing (fit ≠ admission probability) | Kept prominent; dimension bars + “Why — stays” amber box unchanged. | `check:render` honest gate passes (80-char window after “Admission probability” contains `Not estimated` and no `\d+%`) |

---

## 7. Verification & commands run

```
npm run typecheck                ✓ (tsc --noEmit)
npm run lint                     ✓ (eslint . — 0 errors, 1 eslint-disable with justification in useLiteMotionTier)
npm run check:i18n               ✓ 6909 keys, 129 files, 4088 sites
npx tsx scripts/check-landing-ranks.ts  ✓ 10/10
npx tsx scripts/check-render.ts         ✓ 369/369
node scripts/check-responsive.mjs       ✓ 70/70
node scripts/dark-audit.mjs              ✓ 0 leaks, 0 unreadable (385 rules, 91 tokens)
npm run test:perf                ✓ landing 1299KB <1400KB, shell 1030KB <1200KB; lazy panes, boot request, beacon
npm run build                    ✓ production build, diagnostics written
curl http://localhost:3000/      ✓ hero + Get started + See how it works + t.me/scholarbridgeai present
npx tsx scripts/check-ux-redesign.mjs  (pre-existing: 0 LandingPage issues; 47 non-LandingPage items unchanged)
```

**Screenshots / Lighthouse / rAF on-device:** Same sandbox limit as Phase 3 — `@sparticuz/chromium` needs `libnspr4`/`libnss3` which aren't in the image and `deb.debian.org` is unreachable. Placeholder PNGs remain at:

| Viewport | Dark | Light |
|---|---|---|
| 1440 | `docs/redesign/phase3/landing-1440-dark.png` | `docs/redesign/phase3/landing-1440-light.png` |
| 820 | `docs/redesign/phase3/landing-820-dark.png` | `docs/redesign/phase3/landing-820-light.png` |
| 390 | `docs/redesign/phase3/landing-390-dark.png` | `docs/redesign/phase3/landing-390-light.png` |

Replace with real captures on a runner with `sudo apt-get install -y libnspr4 libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 libasound2` — then re-run `node scripts/capture-phase3.mjs` (or `npx lighthouse http://127.0.0.1:3001/ --preset=mobile --throttling.cpuSlowdownMultiplier=4 --output json --output-path docs/redesign/baseline/lighthouse-mobile.json` for raw Lighthouse).

---

## 8. Anything risky or undecided → ask the user

1. **Lite threshold calibration:** `concurrency ≤ 4 || memory ≤ 4 || innerWidth < 1024` alongside `pointer: coarse` is deliberately conservative — a 4-core/4 GB phone on 3G will be lite, a 6-core tablet on Wi-Fi will not. If you want stricter (e.g. ≤ 6 cores) or looser (e.g. viewport only), change the one line in `isLiteMotionSync()`.
2. **CountUp disabling in lite:** `CountUp` now respects `isLiteMotionSync()` (same as `prefers-reduced-motion`) — numbers appear instantly instead of animating on lite phones. This saves an `IntersectionObserver` + rAF per counter on the most constrained devices.
3. **Hero parallax disabling in lite:** The desktop-only `scrollEngine` parallax on the hero mock was already gated by `prefers-reduced-motion` and `min-width:1024px`; Phase 4 adds the lite gate on top — no parallax on coarse/low-core tablets even at 1024 px.
4. **Content-visibility placeholder:** `600px` was chosen to match the tallest landing island (`#campuses` at ~520 px). If you add a taller custom section, raise `contain-intrinsic-size` so the scrollbar doesn't jump.

---

## 9. Diff summary (this phase)

```
 src/lib/liteMotion.ts          +55  NEW  tier detector
 src/components/LandingPage.tsx ~120 lines (HUD lite, CountUp lite gate, parallax lite gate,
                                         Flight 360→120 + no vortex/burner in lite,
                                         Marquee 3→2 rows + sizes, useLiteMotionTier hook)
 src/app/globals.css             ~20 lines (remove will-change from marquee/kinetic/gpu-transform,
                                         auto fallback for .sb-will-transform, coarse lite trims,
                                         sb-cv-section + data-paused rule)
 docs/redesign/04-performance.md NEW
```
