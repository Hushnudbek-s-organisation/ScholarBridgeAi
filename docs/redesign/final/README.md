# Final screenshots — before → after

**Branch:** `arena/86bd291f-scholarbridgeai` (PR source `redesign/premium-dark`)
**Captured:** 2026-11-05

## What is in this folder

| File | Source | Viewport | Notes |
|---|---|---|---|
| `landing-1440-dark.png` | `phase3/landing-1440-dark.png` (copied) | 1440×900, dark | Hero `opacity:1`, indigo jet `z-0`, `xl:block` HUD, bento + honest chancing + Telegram strip |
| `landing-1440-light.png` | `phase3/landing-1440-light.png` | 1440×900, light | Light-mode `sb-cta-banner` still white text on indigo |
| `landing-820-dark.png` | `phase3/landing-820-dark.png` | 820×1180, dark | No HUD/jet collision at tablet |
| `landing-820-light.png` | `phase3/landing-820-light.png` | 820×1180, light | – |
| `landing-390-dark.png` | `phase3/landing-390-dark.png` | 390×844, dark | No jet-over-copy, 2-row marquee on lite |
| `landing-390-light.png` | `phase3/landing-390-light.png` | 390×844, light | – |
| `app-dashboard-1440-dark.png` | `phase2/app-dashboard-1440-dark.png` | 1440, dark | Dark-first obsidian hero, `sb-surface-card` |
| `app-dashboard-1440-light.png` | `phase2/app-dashboard-1440-light.png` | 1440, light | – |
| `app-dashboard-390-dark.png` | `phase2/app-dashboard-390-dark.png` | 390, dark | Slim GuidedJourneyBar, corrected sidebar |
| `app-dashboard-390-light.png` | `phase2/app-dashboard-390-light.png` | 390, light | – |

**Before** counterparts live in `docs/redesign/baseline/` (48 app + 12 landing PNGs at the same viewports/themes — see `00-baseline.md §5`).

## Honest limit

These are **copies** of Phase 2/Phase 3 screenshots, not fresh captures of the final commit. The sandbox cannot launch headless Chromium because `@sparticuz/chromium` at `/tmp/chromium` needs `libnspr4.so`/`libnss3.so` which are not in the image and `apt-get update` cannot reach `deb.debian.org`. The same limit was noted in `04-performance.md §7` and `03-landing-polish.md §10`.

## How to re-capture on a real runner

On any Debian/Ubuntu runner with a network:

```bash
sudo apt-get update
sudo apt-get install -y libnspr4 libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
     libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
     libgbm1 libpango-1.0-0 libasound2

npm ci
npm run build
npm start &                         # or next start --port 3001
npx playwright install chromium     # or use the bundled @sparticuz/chromium at /tmp/chromium once libs exist

# Option A — existing helper (if present in your runner):
node scripts/capture-phase3.mjs     # overwrites phase3/ + final/ PNGs

# Option B — manual Lighthouse + scroll FPS:
npx lighthouse http://127.0.0.1:3001/ --preset=mobile \
  --throttling.cpuSlowdownMultiplier=4 \
  --output json --output-path=docs/redesign/baseline/lighthouse-mobile.json

# Option C — Playwright e2e + screenshots:
npm run test:e2e                    # needs embedded-postgres; uses E2E_CHROMIUM_EXECUTABLE_PATH
```

After capture, `git add docs/redesign/final/` + `docs/redesign/baseline/lighthouse-mobile.json` and amend the PR.
