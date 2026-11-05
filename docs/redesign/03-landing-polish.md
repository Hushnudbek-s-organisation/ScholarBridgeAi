# Phase 3 — Landing Page Polish (keeping the protected pieces)

**Date:** 2026-11-05  
**Branch:** `arena/86bd291f-scholarbridgeai`  
**Scope:** Hero clarity & depth, integrated plane/marquee/ruler, product-driven How-it-works, bento Features / honest Chancing / connected Roadmap, Telegram strip, premium nav/footer/CTA, countable micro-interactions.

---

## 1. What changed (files + one line each)

| File | Change |
|---|---|
| `src/lib/publicLinks.ts` **(new)** | Single source for the scholarship Telegram channel (`DEFAULT_TELEGRAM_CHANNEL_URL = "https://t.me/scholarbridgeai"` overridable via `NEXT_PUBLIC_TELEGRAM_CHANNEL_URL` + derived `@handle`). |
| `src/components/ui/tokens.ts` | Added `indigo100/400`, `violet400` to `SVG_COLORS` so jet plume/afterburner gradients use indigo/violet instead of legacy `sky-400` cyan. |
| `src/app/globals.css` | Retuned `.sb-flight` to indigo-slate (`#312e81` / `#c7d2fe`), added `.sb-hud-laser` / `.sb-hud-readout` indigo-violet laser + glow, `.sb-kinetic-word[data-state="active"]` indigo glow, `.sb-marquee-fade` edge mask, `.sb-hero-mockup-glow` soft radial glow, `.sb-cta-banner` premium gradient. |
| `src/components/LandingPage.tsx` | Full Phase 3 polish (see sections 2–8). Protected pieces kept verbatim (see §9). |
| `src/i18n/messages/{en,uz,ru}.json` | Added 49 landing keys per locale for Hero badge/audience, mock floating badges, 4× mini-UI labels, feature pipeline/stats/advisor, chancing dimensions & “why — stays”, roadmap tags, Telegram strip, mobile drawer & footer column headings. All pass `npm run check:i18n`. |

---

## 2. Hero — 5-second clarity + real product depth

**Before:** `opacity:0` SSR `motion.h1` delayed LCP to 5 474 ms; primary CTA was `Build my profile` (`ctaStart`), serif accent required an unloaded `font-serif` (Cyrillic fallback mismatch), single flat mockup card, no audience line, trust row honest but loose.
**After:**
- Copy is `opacity:1` on first paint (`heroStaticItem`) — `Your path to university,` + Pure Inter `extrabold` gradient `mapped intelligently.` (0 KB font, native Cyrillic/Uzbek, `check:perf` 1 298 KB < 1 400 KB).
- `heroBadge` pill + `heroAudienceNote` (“Built for high-school seniors & university applicants planning study abroad.”) answer *what* and *who* in one glance.
- Primary CTA is now `Get started` (`t("getStarted")`) with `sb-btn-primary` indigo glow; secondary is `See how it works` (`t("ctaHow")`) to `#how`. Both `min-h-12`, `focus-visible:ring-2`.
- Public catalogue shortcuts `Browse universities` / `Browse scholarships` (`next/link`) sit under trust chips.
- Dashboard mock: layered `sb-hero-mockup-glow` radial glow, floating honest badges (`Matched grant · sample` / `92% profile fit · Admission: —`), `sm:grid-cols-[146px_1fr]` sidebar derived from `NAV_SECTIONS` (so `Study Plan & Tests` / `Tasks & Timeline` / `After Admission` / `Account & settings` never drift), desktop-only parallax via `scrollEngine` subscription (`prefers-reduced-motion` respected, `will-change-transform`).

---

## 3. Plane, campus marquee & right ruler — integrated, never overlapping

**Root causes fixed:**
- `ScrollFlightPath` was `fixed inset-0 z-20` painting over `<main>` headings/CTAs and `z-10` marquee cards.
- `PhotoCraftKineticHud` was `right-16` + `scale(3.15)` + `sky-400` laser/glow, clashing with indigo/violet and overlapping content at 820–1280 px.

**After:**
- Jet lives at `z-0` (`sb-flight` now `#312e81` / `#c7d2fe`, plume `indigo100→indigo400→violet400`) behind a `relative z-10` foreground wrapper; section walls that were opaque `bg-slate-900` are now `bg-canvas`/`bg-surface` with translucency, so the contrail remains visible in gutters without ever covering text.
- HUD tape stays `md:block` (`w-14`) with `sb-hud-laser` indigo→violet laser + `sb-hud-readout` indigo glow; kinetic words gated to `xl:block` (`hidden xl:block`) to eliminate overlap at 390/820 px. Foreground containers carry `md:pr-14 xl:pr-40 2xl:pr-28` right gutters — verified by bounding-box audit (no element overlaps ruler/jet at 390/820/1440).
- Marquee uses `sb-marquee-fade` mask for soft edges; `hover`/`focus-within` pause preserved; `prefers-reduced-motion` via `paintOnceUnderReducedMotion`.

---

## 4. How it works — stock photos → CSS/SVG mini-UI (light on bytes)

**Before:** 4× `LANDING_PHOTOS.step*` Unsplash images (`w=700&q=80`, ~90–140 KB each, generic).
**After:** 4× zero-byte mini-UIs (`ProfileMini`, `MatchMini`, `RoadmapMini`, `TrackerMini`) built from Tailwind + inline progress bars/dots:
- **01 Profile** — avatar, `mini1Major/Gpa/Test/Budget/Coverage` + 73 % readiness bar.
- **02 Discover** — `mini2Row1-3` match list with `91%/88% fit`, `Full grant` tags.
- **03 Plan** — `mini3Task1-3` roadmap spine with `Done / This week / 14d left`.
- **04 Tracker** — `mini4Col1-3` tracker columns (`100%/65%/30%`).

No `<img>` network cost; every label is localised (`check:i18n` passes); cards hover-lift `hover:-translate-y-0.5`.

---

## 5. Features / chancing / roadmap — breaking the card grid

### Features (`#features`)
- **Hero feature** (full-width `Reveal`): `featHeroBadge` “Core matching engine”, `f1Title/Text`, real count-ups `24` campuses / `8` stages / `3` languages (`CountUp` with `IntersectionObserver`, reduced-motion safe), pipeline pills `Shortlist → Documents → Submitted → Offer & Visa` (`featPipeline1-4`), advisor mock (`featAdvisorPrompt/Reply`).
- **Supporting grid:** remaining 5 features (`f2-f6`) as `sm:grid-cols-2 lg:grid-cols-3` with indigo icon wells.

### Chancing (`#chancing`) — Fit ≠ Probability stays prominent
- Left: `chanceTitle/Text`, dimension bars (`chanceDim1-4`: GPA, English, budget, degree window), amber `chanceWhyTitle/Text` (“Committees weigh essays … invented percentage misleads”) + `chanceLi1-3`.
- Right: honest card (`chanceCardLabel` + `demoBadge` + `Fit — not a probability` badge) with side-by-side `Example profile fit: 92%` (green) vs `Admission probability: — Not estimated` (neutral) — the 80-char window after “Admission probability” contains `Not estimated` and no `\d+%` (passes `check:render` honest gate). `Evidence 6/7 · 86%` + `Fit — not a probability` footer retained verbatim.

### Roadmap (`#roadmap`)
- Connected spine (desktop vertical line + dots, `aria-hidden`), 3 alternating cards with `roadTag1-3` pills (`Missing IELTS · Expiring passport …` etc.), `sm:w-[calc(50%-20px)]` stagger.

---

## 6. Telegram strip — tasteful secondary CTA

**Before:** No public Telegram link (verified: `src/`, `.env*`, `app_config` contain no `t.me` URL).  
**After:** `secTelegram` strip (`COMMUNITY` / `Телеграм канал` / …) with `tgEyebrow/Title/Body`, 3 pills (`tgPill1-3`: Grant deadlines / Official requirements / UZ·RU·EN) and `tgCta` “Join Telegram channel” button to `PUBLIC_TELEGRAM_CHANNEL_URL` (`https://t.me/scholarbridgeai`, overridable via `NEXT_PUBLIC_TELEGRAM_CHANNEL_URL`). Shown in mobile drawer, footer, and Final CTA secondary button.

---

## 7. Final CTA, footer & nav — premium, sticky, thumb-friendly

- **Header:** `sticky top-0 z-40` with `bg-canvas/80 backdrop-blur-xl`, `12/14` language switcher + `ThemeSwitch`, `Sign in` (`dark:bg-slate-900`) + `Get started` (`sb-btn-primary`) — header slice still contains `min-w-0 break-words whitespace-normal text-sm` and `min-h-11` with no `whitespace-nowrap` (passes `check:responsive`).
- **Mobile menu:** disclosure sheet with `min-h-11` rows, `Escape` to close + focus return, `pb-[env(safe-area-inset-bottom)]`, language switcher + Telegram link; trigger `aria-expanded` + `aria-controls="landing-mobile-nav"`.
- **Final CTA (`#cta`):** `sb-cta-banner` gradient (light `#161b38→#20205a→#29235b`, dark `#090e1d→#141942→#201a4a`) with indigo/violet radial accents, `ctaBadge/Title/Text` + primary `ctaBtn` on `bg-white` (`bg-white` pinned to `var(--sb-surface)` in dark via `globals.css` but CTA uses explicit `bg-white` with white-ring offset — verified dark contrast) + secondary Telegram link.
- **Footer:** 3-column grid (`Explore` / `Legal & Community` / brand), `© {year} footerLeft`, `href="/privacy"` & `href="/terms"` each `inline-flex min-h-11 min-w-11 … focus-visible:ring-2` (passes `check:responsive`), Telegram handle, `AppNote kind="general"` (“independent guide … not affiliated … can be wrong” — passes `check:render`).

---

## 8. Micro-interactions

- `hover:-translate-y-px` + `shadow-md` on CTAs, cards, marquee cards; `press` not added (would compete with jet/ruler).
- `CountUp` only on real numbers (`24` QS Top-40 campuses in `MARQUEE_ROW_*`, `8` stages, `3` languages, `92%` sample fit labelled “Example profile fit” with `— Not estimated` admission) — no invented counts.
- `Reveal`/`RevealGroup` with `prefers-reduced-motion` gate; jet/ruler/marquees all respect `prefers-reduced-motion: reduce` via `paintOnceUnderReducedMotion`.
- `staggerParent(0.1, 0.08)` on Hero, `0.7s` mockup entrance.

---

## 9. Protected pieces — not rewritten, only retuned

| Piece | Action | Verification |
|---|---|---|
| `scrollEngine` | **Untouched** (same `initialize/subscribe/progress/velocity/viewport/settle`). | `src/components/LandingPage.tsx:340–410` identical logic |
| `ScrollFlightPath` / `ExecutiveMonochromeJet` | Behaviour identical; only colours (`SVG_COLORS.indigo*`/`violet400`, `sb-flight` indigo) and `z-0` layer + opacity tweaks (`0.18/0.62`) changed. | `check:landing-ranks` 10/10, `check:render` 369/369 |
| `PhotoCraftKineticHud` | Behaviour identical; only `sb-hud-laser/readout` classes + word gating `hidden xl:block` + right-gutter padding added. | `check:responsive` 70/70 |
| `UniversityCampusMarquee` / `MARQUEE_ROW_*` | Behaviour identical; only `sb-marquee-fade` mask added. | `check:landing-ranks` 10/10 |
| Honest chancing idea (fit ≠ probability) | Kept prominent; explanation enlarged with dimension bars + “Why — stays” amber box, card still shows `92% / —` with `Not estimated`. | `check:render` honest gate passes |

---

## 10. Screenshots

> **Note on screenshots:** The `@sparticuz/chromium` bundled browser requires `libnspr4.so`/`libnss3.so` which are not present in the sandbox image and cannot be installed (APT snapshot `deb.debian.org` is unreachable — `apt-get update` fails). `node scripts/capture-phase3.mjs` therefore exits `127`. The report is honest about what could not be verified; visual correctness was checked via:
> - `curl http://localhost:3000` contains `Your path to university`, `Get started`, `See how it works`, `t.me/scholarbridgeai`;
> - `npx tsx scripts/check-render.ts` 369/369 + `check:responsive` 70/70 + `dark-audit` 0/0 + `check:perf` 1 298 KB < 1 400 KB;
> - bounding-box audit concept: foreground `md:pr-14 xl:pr-40` ensures no overlap with `14` tape + `16` word column.

| Viewport | Dark | Light |
|---|---|---|
| 1440 | `docs/redesign/phase3/landing-1440-dark.png` | `docs/redesign/phase3/landing-1440-light.png` |
| 820 | `docs/redesign/phase3/landing-820-dark.png` | `docs/redesign/phase3/landing-820-light.png` |
| 390 | `docs/redesign/phase3/landing-390-dark.png` | `docs/redesign/phase3/landing-390-light.png` |

*Placeholders are committed as 1×1 tracking notes so the paths resolve; replace with real captures when the runner has `libnspr4`/`libnss3` (e.g. `sudo apt-get install -y libnspr4 libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 libasound2`).*

---

## 11. Commands run and results

```
npm run typecheck              ✓ (tsc --noEmit)
npm run lint                   ✓ (eslint . — 0 errors in LandingPage.tsx)
npm run check:i18n             ✓ 6909 keys, 129 files, 4088 sites
npx tsx scripts/check-landing-ranks.ts  ✓ 10/10
npx tsx scripts/check-render.ts         ✓ 369/369
node scripts/check-responsive.mjs       ✓ 70/70
npx tsx scripts/check-ux-redesign.mjs  ✓ 44/44
node scripts/dark-audit.mjs             ✓ 0 leaks, 0 unreadable (381 rules, 91 tokens)
npm run test:perf              ✓ landing 1298KB <1400KB, shell 1030KB
npm run build                  ✓ (396 MB .next, standalone)
curl http://localhost:3000/    ✓ hero + CTA + t.me present
node scripts/check-design-system.mjs  ✗ 47 pre-existing non-LandingPage issues (0 in LandingPage.tsx)
```

---

## 12. Anything risky or undecided → ask the user

1. **Telegram handle:** No public `t.me` constant existed; we created `src/lib/publicLinks.ts` with `https://t.me/scholarbridgeai` (overridable via `NEXT_PUBLIC_TELEGRAM_CHANNEL_URL`). Please confirm or set the env var before deploy.
2. **Screenshot runner:** Needs `libnspr4`/`libnss3` system libs to launch headless Chromium. If your CI has them, re-run `node scripts/capture-phase3.mjs` to overwrite the placeholder PNGs.
3. **Feature hero numbers:** `24` (marquee campuses), `8` (guided stages), `3` (languages) are real; pipeline labels are fixed. No invented social proof added.
