/**
 * Pure geometry for dropdown panels anchored to a trigger element.
 *
 * Kept free of React/DOM so it can be unit-tested: the notification panel used
 * to hardcode `max-h-96` and open in the direction its `placement` prop said,
 * which meant a bell sitting at the bottom of the full-height desktop sidebar
 * opened DOWNWARD and its bottom ran off the viewport — invisible, with no way
 * to read the newest notifications. The panel now measures and clamps.
 */

export interface TriggerRect {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export interface PanelGeometry {
  /** Which horizontal edge of the trigger the panel aligns to. */
  anchor: "left" | "right";
  /** Opens above the trigger when true, below it when false. */
  openUp: boolean;
  /** Explicit width, or null to fall back to the CSS default (w-80). */
  width: number | null;
  /** Explicit max height, or null to fall back to the CSS default (max-h-96). */
  maxHeight: number | null;
}

/** Gutter kept between the panel and the viewport edge. */
const MARGIN = 8;
/** Tailwind `w-80`. */
const DEFAULT_WIDTH = 320;
/** Tailwind `max-h-96`. */
const DEFAULT_MAX_HEIGHT = 384;
/** Below this a panel is not worth showing — flip to the roomier side instead. */
const MIN_USABLE = 160;

/**
 * Work out where a panel anchored to `rect` should go so that it is fully
 * visible in `viewport`.
 *
 * @param requestedUp the direction the caller prefers (true for a trigger near
 *   the bottom of the screen, false for one in a top bar). Honoured unless that
 *   side cannot hold a usable panel and the other side can.
 */
export function computePanelGeometry(
  rect: TriggerRect,
  viewport: Viewport,
  requestedUp: boolean
): PanelGeometry {
  const { width: vw, height: vh } = viewport;

  // ---- vertical -----------------------------------------------------------
  const roomAbove = rect.top - MARGIN;
  const roomBelow = vh - rect.bottom - MARGIN;
  const roomRequested = requestedUp ? roomAbove : roomBelow;
  const roomOther = requestedUp ? roomBelow : roomAbove;
  // Prefer the requested direction; flip only when it is unusably small AND the
  // other side has more room (so a short viewport still gets a readable panel).
  const openUp = roomRequested >= MIN_USABLE || roomRequested >= roomOther ? requestedUp : !requestedUp;
  const available = openUp ? roomAbove : roomBelow;
  const maxHeight =
    available < DEFAULT_MAX_HEIGHT ? Math.max(MIN_USABLE, Math.round(available)) : null;

  // ---- horizontal ---------------------------------------------------------
  const desired = Math.min(DEFAULT_WIDTH, vw - MARGIN * 2);
  const fitsLeft = rect.left + desired <= vw - MARGIN;
  const fitsRight = rect.right - desired >= MARGIN;
  let anchor: "left" | "right";
  if (fitsLeft && fitsRight) anchor = rect.left < vw / 2 ? "left" : "right";
  else if (fitsLeft) anchor = "left";
  else if (fitsRight) anchor = "right";
  else {
    // Neither side fits the full width (very narrow screens) — take the roomier
    // side and shrink the panel to fit.
    const roomLeft = vw - MARGIN - rect.left;
    const roomRight = rect.right - MARGIN;
    anchor = roomLeft >= roomRight ? "left" : "right";
  }
  const room = anchor === "left" ? vw - MARGIN - rect.left : rect.right - MARGIN;
  const width = Math.min(desired, room);

  return {
    anchor,
    openUp,
    width: width < DEFAULT_WIDTH ? Math.round(width) : null,
    maxHeight,
  };
}
