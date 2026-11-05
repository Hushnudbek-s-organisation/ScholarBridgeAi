# Phase 2 — Design Foundations (Tokens, Dark-First Theme, Typography & Motion)

**Date:** 2026-11-04  
**Branch:** `arena/86bd291f-scholarbridgeai`  
**Direction:** *Polished Indigo, Dark-First* — implemented at the CSS custom-property & UI primitive layer (`src/app/globals.css`, `src/components/ui/tokens.ts`, `src/lib/theme.ts`, `src/app/layout.tsx`, `src/components/ThemeProvider.tsx`, `src/components/motion/*`, `src/components/ui/*`).

---

## 1. Dark-First Theme Pipeline (Zero Flash on Load)

First-time visitors (no saved `localStorage["scholarbridge_theme"]` and no `scholarbridge_theme_hint` cookie) now receive **dark mode immediately on byte 1** with zero flash of light mode:

| Stage | Before (`Phase 0`) | After (`Phase 2`) |
| --- | --- | --- |
| **Default choice (`DEFAULT_THEME`)** | `"system"` (rendered light when OS was light) | **`"dark"`** (`src/lib/theme.ts:18`) |
| **SSR `<html>` element (`layout.tsx`)** | `<html lang={lang}>` (relied solely on inline script to add `.dark`) | `<html lang={lang} className={ssrDark ? "dark" : undefined}>` — dark class is already present in raw server HTML for all first-time & dark-mode visitors |
| **Blocking `<head>` `themeInitScript()`** | Read `localStorage`, fell back to `"system"` (`catch` left `<html>` light) | Reads `localStorage` (`"light"` \| `"dark"` \| `"system"`), falls back to `"dark"`, reads `prefers-color-scheme` **only** when `"system"` is chosen, and forces `"dark"` even in `catch` (strict private WebViews) |
| **User override (`ThemeToggle` / `ThemeSwitch`)** | Persists `"light"` / `"system"` / `"dark"` in `localStorage` + `scholarbridge_theme_hint` cookie | Preserved 100% — returning users who picked `"light"` or `"system"` get their exact saved theme with zero flash |

Verified in headless Chromium with `colorScheme: "light"` and empty storage/cookies (`docs/redesign/phase2/landing-390-default-first-visit.png`):
`{"hasDarkClass": true, "colorScheme": "dark", "bodyBg": "rgb(6, 10, 20)"}`.

---

## 2. Colour, Surface & Elevation Token Table (Before vs. After)

### 2.1 Dark Mode Surface Tiers & Borders (`src/app/globals.css`, `src/components/ui/tokens.ts`)

| Token | Role | Before (`Phase 0`) | After (`Phase 2`) | Rationale |
| --- | --- | --- | --- | --- |
| `--sb-canvas` / `--color-slate-50` | Tier 0 — App & page canvas | `#090e1a` | **`#060a14`** | Deeper midnight blue-obsidian base so cards float cleanly without muddy navy cast |
| `--sb-surface` | Tier 1 — Cards, sidebar, header | `#111a2e` | **`#0d1324`** | Crisp elevated card surface paired with `inset 0 1px 0 rgb(255 255 255 / 0.045)` (`.sb-surface-card`) |
| `--sb-surface-hero` | Dark hero / command panels | `#0c1324` | **`#090e1d`** | Deep indigo-obsidian hero ground |
| `--sb-well` / `--color-slate-100` | Tier 2 — Inner wells, chips | `#17233b` | **`#131c33`** | Clear 3-tier hierarchy (`#060a14` → `#0d1324` → `#131c33`) |
| `--sb-control` | Tier 3 — Hover / active control | `#1f2f4d` | **`#1a2644`** | Restrained interactive lift (`--sb-control-strong: #223156`) |
| `--sb-field-bg` | Form input well | `#0d1526` | **`#090f1d`** | Recessed below Tier 1 cards with `#243456` → `#364b78` hover hairline |
| `--sb-border-subtle` | 1px subtle inner divider | `#1b2842` | **`#162038`** | Quiet structural separation |
| `--sb-border` / `--color-slate-200` | 1px card & control hairline | `#24324f` | **`#1f2d4d`** | Clean cool-indigo 1px border |
| `--sb-border-strong` / `--color-slate-300` | Emphasized border | `#33425f` | **`#2d3f68`** | Distinct interactive boundary |
| `--sb-border-stronger` | Checkbox / input high-contrast edge | `#5b6b88` | **`#5c6f91`** | `3.4:1` non-text contrast on Tier 1 |
| `TELEGRAM_NATIVE_COLORS.darkCanvas` | Native Telegram WebView bg | `#0f172a` | **`#060a14`** | Matches `--sb-canvas` |

### 2.2 Brand, Glow, Focus & Accessible Ink Tokens

| Token | Theme | Before (`Phase 0`) | After (`Phase 2`) | Contrast on Dark Tier 1 (`#0d1324`) |
| --- | --- | --- | --- | --- |
| `--sb-ink-display` | Dark | `#f8fafc` | **`#f8fafc`** | **`17.4:1`** |
| `--sb-ink-heading` | Dark | `#f1f5f9` | **`#f1f5f9`** | **`16.5:1`** |
| `--sb-ink-body` | Dark | `#e2e8f0` | **`#e2e8f0`** | **`14.6:1`** |
| `--sb-ink-secondary` | Dark | `#cbd5e1` | **`#cbd5e1`** | **`12.1:1`** |
| `--sb-ink-muted` | Dark | `#94a3b8` | **`#94a3b8`** | **`7.1:1`** (WCAG AAA) |
| `--sb-ink-dim` / `--color-slate-400` | Dark | `#8496b3` | **`#8699b8`** | **`6.1:1`** on Tier 1 (`4.85:1` even on Tier 3 `#1a2644`) |
| `--sb-primary` | Light / Dark | `#4f46e5` / `#818cf8` | **`#4f46e5` / `#818cf8`** | Primary brand indigo |
| `--sb-violet` | Light / Dark | `#7c3aed` / `#a78bfa` | **`#7c3aed` / `#a78bfa`** | Restrained secondary accent |
| `--sb-focus` | Light / Dark | `#6366f1` / `#6366f1` | **`#4f46e5` / `#818cf8`** | Brighter pastel focus outline on dark obsidian |
| `--sb-glow` *(new)* | Light / Dark | *(none)* | **`0 0 0 1px rgb(99 102 241 / 0.14), 0 10px 28px -8px rgb(79 70 229 / 0.18)`** / **`0 0 0 1px rgb(129 140 248 / 0.24), 0 14px 36px -10px rgb(99 102 241 / 0.34)`** | Single soft glow token for interactive card lift & hero focus |
| `--sb-glow-button` *(new)* | Light / Dark | *(none)* | **`inset 0 1px 0 rgb(255 255 255 / 0.18..0.20)` + indigo ambient shadow** | Gives primary `indigo-600` CTAs tactile specular depth (`6.29:1` white text contrast preserved) |
| `--sb-success` | Light / Dark | `#10b981` / `#34d399` | **`#059669` / `#34d399`** | Higher light-mode text contrast (`>= 4.5:1`) + luminous dark mint |
| `--sb-warning` | Light / Dark | `#f59e0b` / `#fbbf24` | **`#d97706` / `#fbbf24`** | Higher light-mode amber readability |
| `--sb-danger` | Light / Dark | `#f43f5e` / `#fb7185` | **`#e11d48` / `#fb7185`** | Single `rose` error family |

`npm run test:dark` (`scripts/dark-audit.mjs`) result across all `372` rules and `91` dark tokens: **`0` inverted-ramp/state leaks, `0` unreadable pairs**.

---

## 3. Typography Scale & Display Serif Option Evaluation

### 3.1 Semantic Inter Scale (`globals.css` & `TYPOGRAPHY_TOKENS` in `ui/tokens.ts`)
UI font remains self-hosted variable **Inter** (`--font-inter-latin` + `--font-inter-cyrillic`), with `font-black` / `800–900` restricted to display headlines and hero numerals:

| Token / Class | Size | Line Height | Tracking | Weight | Usage |
| --- | --- | --- | --- | --- | --- |
| `.sb-type-display` | `clamp(2.25rem, 5vw, 3.875rem)` (`36–62px`) | `1.02` | `-0.04em` | `800` (`extrabold`) | Marketing hero display headline only |
| `.sb-type-h1` | `clamp(1.375rem, 2.2vw, 1.875rem)` (`22–30px`) | `1.18` | `-0.026em` | `700` (`bold`) | Destination page `<h1>` (`HubPage`, `PageHeader level="h1"`) — *was `font-black`* |
| `.sb-type-h2` | `clamp(1.125rem, 1.5vw, 1.3125rem)` (`18–21px`) | `1.26` | `-0.018em` | `700` (`bold`) | Major section `<h2>` (`SectionHeading`, `PageHeader level="h2"`) |
| `.sb-type-h3` | `1rem` (`16px`) | `1.35` | `-0.012em` | `600` (`semibold`) | Card titles (`JourneyCard` header) — *was `font-bold`* |
| `.sb-type-h4` | `0.875rem` (`14px`) | `1.40` | `-0.006em` | `600` (`semibold`) | Sub-group titles & list headers |
| `.sb-type-body` | `0.875rem` (`14px`) | `1.60` | `-0.003em` | `400` (`normal`) | Default body copy |
| `.sb-type-caption` | `0.75rem` (`12px`) | `1.45` | `+0.005em` | `500` (`medium`) | Secondary timestamps, helper notes |
| `.sb-type-eyebrow` | `0.75rem` (`12px`, uppercase) | `1.35` | `+0.08em` | `600` (`semibold`) | Section & stat eyebrows — *was `font-black` / `font-bold`* |

### 3.2 Display Serif vs. Pure Inter Option (Evaluated — Not Applied Yet)
Per Requirement 3, we captured side-by-side renders of the Hero accent phrase in both **English** and **Cyrillic Russian** (`LandingPage.tsx` was left untouched in Phase 2 so Phase 3 can apply the chosen treatment):

- **Current (`font-serif italic` fallback — `Georgia` / `Times New Roman` / `Droid Serif`):**
  - EN: `docs/redesign/phase2/type-option-fallback-serif-en.png`
  - RU: `docs/redesign/phase2/type-option-fallback-serif-ru.png`
- **Option B (Pure Inter `700` indigo→violet gradient, `0 KB` extra font download):**
  - EN: `docs/redesign/phase2/type-option-pure-inter-en.png`
  - RU: `docs/redesign/phase2/type-option-pure-inter-ru.png`

**Evaluation & Recommendation for Phase 3:**  
In Cyrillic Russian (`умно проложен.`), the unloaded `font-serif` fallback drops to system `Times New Roman` / `Liberation Serif` with mismatched x-height and jagged underline metrics, whereas **Pure Inter** (`type-option-pure-inter-ru.png`) matches the headline geometry seamlessly, supports Uzbek (`oʻ`, `gʻ`) and Russian Cyrillic natively, and adds **`0 KB`** to mobile first-load payload (versus `+28–40 KB` for a Latin + Cyrillic display serif webfont). We therefore did **not** add a serif font dependency in Phase 2 and recommend applying the Pure Inter gradient accent in Phase 3.

---

## 4. Motion Tokens, Tactile Feedback & Zero-Cost Depth

### 4.1 Motion Tokens (`globals.css` & `MOTION_TOKENS` in `ui/tokens.ts` / `components/motion/*`)

| Token | Before (`Phase 0`) | After (`Phase 2`) | Purpose |
| --- | --- | --- | --- |
| `--sb-duration-instant` / `instant` | *(ad-hoc)* | **`100ms`** (`0.10s`) | Button `:active` press scale (`0.985`) |
| `--sb-duration-fast` / `fast` | `150–200ms` scattered | **`160ms`** (`0.16s`) | Hover colour/border/glow & exit transitions |
| `--sb-duration-base` / `base` | `220–300ms` scattered | **`240ms`** (`0.24s`) | Card hover lift (`.sb-card-hover`) & plain fades |
| `MOTION_TOKENS.duration.page` | `0.32–0.34s` | **`0.30s`** | `MotionProvider`, `PageTransition`, `RevealItem` |
| `--sb-duration-slow` / `reveal` | `0.42–0.45s` | **`400ms`** (`0.40s`) | Scroll-into-view `Reveal` (`once: true`) & `.sb-rise` |
| `--sb-ease-out` / `ease.out` | `[0.16, 1, 0.3, 1]` | **`cubic-bezier(0.16, 1, 0.3, 1)`** | Unified quick-out, long-settle entrance curve |
| `--sb-ease-standard` / `ease.standard` | `ease` | **`cubic-bezier(0.2, 0, 0, 1)`** | Hover & state transitions |
| Focus ring (`.sb-focus`, `.sb-button`, `.sb-focus-within`) | `2px solid #6366f1` (missing on `LanguageSwitcher`) | **`2px solid var(--sb-focus)` + `0 0 0 4px var(--sb-field-ring)`** | High-contrast double halo across buttons, links & `LanguageSwitcher` |
| Reduced motion helpers | CSS media query + `MotionConfig` | Added **`prefersReducedMotion()`** & **`preferredScrollBehavior()`** + disabled `:active`/`:hover` transforms under `prefers-reduced-motion: reduce` | Complete motion-sensitivity coverage |

### 4.2 Zero-Cost Depth & GPU Savings
- **`.dark .sb-canvas-bg`:** Adds two subtle, scroll-attached (`background-attachment: scroll`, painted once, `0 ms/frame`) radial washes (`indigo` at `50% -90px` and `violet` at `88% 36px`) for quiet atmospheric depth on dark pages.
- **`.sb-aurora` (`JourneyCard tone="hero"`):** Replaced `inset: -30%; filter: blur(6px); animation: sb-aurora 16s ease-in-out infinite` with a **static pre-softened radial gradient mesh** (`filter: none`, `animation: none`), eliminating continuous blurred layer recompositing on every in-app Hub and Dashboard hero.

---

## 5. Refined `components/ui/*` Primitives (100% Prop-Compatible)

- **`src/components/ui/Button.tsx`:** Added `.sb-btn-primary` specular/glow elevation on `primary`, added `secondary` soft-indigo variant, refined `outline` and `ghost` dark borders/inks, and wired tactile `:active` press scale + unified focus ring via `.sb-button`.
- **`src/components/ui/SectionHeading.tsx` *(new)*:** Reusable `h1` / `h2` / `h3` heading with `.sb-type-eyebrow`, `.sb-type-h1..h3`, subtitle, and action slot.
- **`src/components/ui/journey.tsx` (`JourneyCard` / `SurfaceCard`, `Pill` / `Badge`, `SkeletonCard`, `StatTile`):** Added `.sb-surface-card` top specular highlight, added `well` card tone and `violet` pill tone, replaced shouty `font-bold uppercase` pills with crisp `1px`-bordered `font-semibold` glass chips, and calmed `StatTile` weights.
- **`src/components/ui/hubs.tsx` (`HubPage`, `HubTabs`, `ShowMoreToggle`, `PanelSkeleton`):** Switched `HubPage` `<h1>` from `font-black` to `.sb-type-h1`, upgraded `ShowMoreToggle` to `44px` (`min-h-11`), and upgraded `PanelSkeleton` from flat `animate-pulse` blocks to structured `.sb-surface-card` + `.sb-skeleton` shimmer cards.
- **`src/components/ui/growth.tsx` (`PageHeader`, `StatCard`, `Segmented`):** Aligned headings and stat numerals onto `.sb-type-h1/h2/eyebrow` and `font-bold tabular-nums` (removing `font-black`/`font-extrabold`).
- **`src/components/LanguageSwitcher.tsx`:** Added `.sb-focus-within` and `min-h-11` on both compact and full variants so keyboard users see a clear focus halo.
