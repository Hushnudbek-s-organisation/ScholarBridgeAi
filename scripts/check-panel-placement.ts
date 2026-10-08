/**
 * Deterministic checks for dropdown panel placement (src/lib/panelPlacement.ts).
 *
 * WHY THIS EXISTS
 * ---------------
 * The notification bell in the desktop sidebar FOOTER opens its panel with
 * `placement` defaulting to "down". The panel is up to max-h-96 (384px) tall and
 * the bell sits near the bottom of a full-height (h-screen) sidebar, so the
 * panel rendered below the fold and its bottom — the newest notifications — was
 * simply not on screen. The user-visible symptom: "the notification window's
 * bottom is invisible".
 *
 * The panel now measures the room above and below the bell and clamps its
 * height. That logic is a pure function so it can be asserted here without a
 * browser (none is available in CI).
 *
 * Run: npm run test:panel-placement
 */

import { computePanelGeometry, type TriggerRect, type Viewport } from "../src/lib/panelPlacement";

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(title: string) {
  console.log(`\n── ${title}`);
}

const MARGIN = 8;
const DEFAULT_MAX_HEIGHT = 384;
const MIN_USABLE = 160;

/**
 * The invariant that actually matters: the panel must end up fully inside the
 * viewport. Returns the offending edge, or null when it fits.
 */
function overflowEdge(rect: TriggerRect, vp: Viewport, up: boolean, maxHeight: number | null) {
  const h = maxHeight ?? DEFAULT_MAX_HEIGHT;
  if (up) {
    const top = rect.top - MARGIN - h;
    return top < 0 ? `top edge ${Math.round(top)}px above the viewport` : null;
  }
  const bottom = rect.bottom + MARGIN + h;
  return bottom > vp.height ? `bottom edge ${Math.round(bottom - vp.height)}px below the viewport` : null;
}

// ---------------------------------------------------------------------------
section("1. The reported bug — bell in the desktop sidebar footer");

// 1440×900 desktop, sidebar is w-72 (288px) and the bell is in its footer.
const sidebarBell: TriggerRect = { top: 790, bottom: 830, left: 216, right: 264 };
const desktop: Viewport = { width: 1440, height: 900 };

const requested = computePanelGeometry(sidebarBell, desktop, true);
check("placement='up' opens upward", requested.openUp === true, `openUp=${requested.openUp}`);
check("…and the panel is not clipped at the bottom", overflowEdge(sidebarBell, desktop, requested.openUp, requested.maxHeight) === null);
check("a full-height panel is allowed (782px of room above)", requested.maxHeight === null, `maxHeight=${requested.maxHeight}`);

// The pre-fix behaviour: the same bell with NO placement prop, i.e. "down".
const oldDefault = computePanelGeometry(sidebarBell, desktop, false);
check(
  "the OLD default ('down') would have clipped the panel",
  overflowEdge(sidebarBell, desktop, false, null) !== null,
  "expected the un-clamped downward panel to overflow"
);
check(
  "…and it now self-corrects by flipping upward",
  oldDefault.openUp === true,
  `openUp=${oldDefault.openUp}`
);
check(
  "the flipped panel is fully visible",
  overflowEdge(sidebarBell, desktop, oldDefault.openUp, oldDefault.maxHeight) === null,
  overflowEdge(sidebarBell, desktop, oldDefault.openUp, oldDefault.maxHeight) ?? ""
);

// ---------------------------------------------------------------------------
section("2. Mobile top header still opens downward");

const headerBell: TriggerRect = { top: 12, bottom: 52, left: 300, right: 340 };
const phone: Viewport = { width: 390, height: 844 };
const mobile = computePanelGeometry(headerBell, phone, false);
check("a bell in a top bar opens downward", mobile.openUp === false, `openUp=${mobile.openUp}`);
check("…with a full-height panel", mobile.maxHeight === null, `maxHeight=${mobile.maxHeight}`);
check("…and it is not clipped", overflowEdge(headerBell, phone, mobile.openUp, mobile.maxHeight) === null);
check("a left-of-centre bell anchors left", computePanelGeometry({ top: 12, bottom: 52, left: 20, right: 60 }, phone, false).anchor === "left");
check("a right-of-centre bell anchors right", mobile.anchor === "right", `anchor=${mobile.anchor}`);

// ---------------------------------------------------------------------------
section("3. Short viewports clamp the height instead of overflowing");

const shortViewport: Viewport = { width: 1440, height: 400 };
const midBell: TriggerRect = { top: 180, bottom: 220, left: 216, right: 264 };
const short = computePanelGeometry(midBell, shortViewport, true);
check("a short viewport clamps maxHeight", short.maxHeight !== null && short.maxHeight < DEFAULT_MAX_HEIGHT, `maxHeight=${short.maxHeight}`);
check("…to the room that is actually there", short.maxHeight === Math.round(midBell.top - MARGIN), `maxHeight=${short.maxHeight} expected ${midBell.top - MARGIN}`);
check("…and the panel fits", overflowEdge(midBell, shortViewport, short.openUp, short.maxHeight) === null, overflowEdge(midBell, shortViewport, short.openUp, short.maxHeight) ?? "");

// ---------------------------------------------------------------------------
section("4. Narrow viewports shrink the width");

const narrow: Viewport = { width: 320, height: 568 };
const narrowBell: TriggerRect = { top: 480, bottom: 520, left: 16, right: 56 };
const n = computePanelGeometry(narrowBell, narrow, true);
check("a 320px viewport keeps the panel on screen", n.width === null || n.width <= narrow.width - MARGIN * 2, `width=${n.width}`);
check("it still opens upward from a bottom bell", n.openUp === true, `openUp=${n.openUp}`);
check("…and is not clipped", overflowEdge(narrowBell, narrow, n.openUp, n.maxHeight) === null, overflowEdge(narrowBell, narrow, n.openUp, n.maxHeight) ?? "");

const rightEdge: TriggerRect = { top: 12, bottom: 52, left: 1380, right: 1420 };
check("a bell at the right edge anchors right", computePanelGeometry(rightEdge, desktop, false).anchor === "right");

// ---------------------------------------------------------------------------
section("5. Property: the panel is on screen for every viewport we ship");

// Every breakpoint the app is designed for, with the bell in each of the three
// positions it actually appears in (sidebar footer, top header, mid-screen).
const viewports: Viewport[] = [
  { width: 320, height: 568 },
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 820, height: 1180 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];
let offScreen = 0;
let firstBad = "";
for (const vp of viewports) {
  // The bell cannot be closer to an edge than a real control can be.
  const positions: TriggerRect[] = [
    { top: 12, bottom: 52, left: Math.max(8, vp.width - 60), right: Math.max(48, vp.width - 20) }, // top header
    { top: vp.height - 110, bottom: vp.height - 70, left: 216, right: 264 }, // sidebar footer
    { top: Math.round(vp.height / 2), bottom: Math.round(vp.height / 2) + 40, left: 20, right: 60 }, // mid, left
  ];
  for (const rect of positions) {
    for (const up of [true, false]) {
      const g = computePanelGeometry(rect, vp, up);
      const bad = overflowEdge(rect, vp, g.openUp, g.maxHeight);
      if (bad) {
        offScreen++;
        if (!firstBad) firstBad = `${vp.width}x${vp.height} bell@${Math.round(rect.top)} requested=${up ? "up" : "down"} → ${bad}`;
      }
    }
  }
}
check(
  `${viewports.length} viewports × 3 bell positions × 2 requests = ${viewports.length * 6} cases all fully on screen`,
  offScreen === 0,
  `${offScreen} off-screen; first: ${firstBad}`
);

// ---------------------------------------------------------------------------
section("6. The height floor only applies when both sides are unusable");

// A viewport so short that neither direction can hold MIN_USABLE. The panel
// keeps a readable minimum rather than collapsing to a sliver, which means it
// can exceed the available room — assert that this ONLY happens in that case.
const tiny: Viewport = { width: 1440, height: 300 };
const tinyBell: TriggerRect = { top: 140, bottom: 180, left: 216, right: 264 };
const tg = computePanelGeometry(tinyBell, tiny, true);
check("an unusably short viewport keeps the readable floor", tg.maxHeight === MIN_USABLE, `maxHeight=${tg.maxHeight}`);
check("…and picks the roomier side", tg.openUp === true, `openUp=${tg.openUp} (room above ${tinyBell.top - MARGIN} vs below ${tiny.height - tinyBell.bottom - MARGIN})`);

let floorViolations = 0;
for (const vp of viewports) {
  const rect: TriggerRect = { top: vp.height - 110, bottom: vp.height - 70, left: 216, right: 264 };
  const g = computePanelGeometry(rect, vp, true);
  if (g.maxHeight !== null && g.maxHeight > rect.top - MARGIN) floorViolations++;
}
check("on every real viewport the clamp never exceeds the room available", floorViolations === 0, `${floorViolations} violations`);

// ---------------------------------------------------------------------------
section("7. Determinism and no-DOM purity");

check(
  "same input → same output",
  JSON.stringify(computePanelGeometry(sidebarBell, desktop, true)) ===
    JSON.stringify(computePanelGeometry(sidebarBell, desktop, true))
);
check(
  "the module needs no DOM",
  typeof document === "undefined" || computePanelGeometry(sidebarBell, desktop, true).openUp === true
);

// ---------------------------------------------------------------------------
section("8. Exhaustive sweep — the panel never escapes the viewport");

// The property in section 5 only covered 10 hand-picked viewports. Sweep the
// bell's vertical position across every height from 240px to 1200px so the
// claim is about the whole space, not a sample of it.
let worstOverflow = 0;
let worstCase = "";
let swept = 0;
for (let vh = 240; vh <= 1200; vh += 20) {
  for (const vw of [320, 360, 390, 430, 768, 1024, 1280, 1440, 1920]) {
    for (let top = 4; top <= vh - 48; top += 12) {
      const rect: TriggerRect = { top, bottom: top + 40, left: 20, right: 60 };
      for (const up of [true, false]) {
        const g = computePanelGeometry(rect, { width: vw, height: vh }, up);
        const h = g.maxHeight ?? DEFAULT_MAX_HEIGHT;
        const avail = g.openUp ? rect.top - MARGIN : vh - rect.bottom - MARGIN;
        swept++;
        if (h - avail > worstOverflow) {
          worstOverflow = h - avail;
          worstCase = `${vw}x${vh} bellTop=${top} openUp=${g.openUp} maxHeight=${h} available=${avail}`;
        }
      }
    }
  }
}
check(`${swept.toLocaleString("en-US")} swept cases: height never exceeds the room by more than the readable floor`, worstOverflow <= 68, `worst=${worstOverflow}px at ${worstCase}`);
check(
  "…and on any viewport ≥ 400px tall the panel fits exactly",
  (() => {
    for (let vh = 400; vh <= 1200; vh += 20) {
      for (const vw of [320, 768, 1440]) {
        for (let top = 4; top <= vh - 48; top += 12) {
          const rect: TriggerRect = { top, bottom: top + 40, left: 20, right: 60 };
          for (const up of [true, false]) {
            const g = computePanelGeometry(rect, { width: vw, height: vh }, up);
            const h = g.maxHeight ?? DEFAULT_MAX_HEIGHT;
            const avail = g.openUp ? rect.top - MARGIN : vh - rect.bottom - MARGIN;
            if (h > avail) return false;
          }
        }
      }
    }
    return true;
  })(),
  "a viewport ≥ 400px tall always has room for the clamped panel"
);

// ---------------------------------------------------------------------------
console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
