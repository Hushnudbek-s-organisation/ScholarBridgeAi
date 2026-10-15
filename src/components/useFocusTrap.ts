"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Keeps keyboard focus inside an open dialog.
 *
 * WHY THIS EXISTS
 * ---------------
 * `ProfileModal` and `CheckoutModal` already close on Escape and declare
 * `role="dialog"` + `aria-modal="true"`. Without a trap, though, Tab walked
 * straight out of the dialog into the page behind it: a keyboard or
 * screen-reader user could end up in the nav bar of a UI that is visually
 * inert, and had to shift-tab back through every hidden control to reach the
 * form again. On close, focus was dropped to `<body>`, so the next Tab started
 * from the top of the document instead of the button that opened the dialog.
 *
 * This hook fixes both halves:
 *   1. Tab / Shift+Tab cycle through the dialog's own focusable elements.
 *   2. Focus is moved into the dialog on open and returned to the previously
 *      focused element on close.
 *
 * It is deliberately tiny and dependency-free — the project has no headless-UI
 * library and does not need one for two dialogs. Focusability is computed from
 * the DOM (not a hand-maintained list) so it keeps working as the forms grow.
 */

export const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/** Focusable descendants that are actually visible (skips hidden panes/tabs). */
export function focusableWithin(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => {
    if (el.hasAttribute("disabled") || el.getAttribute("aria-hidden") === "true") return false;
    if (el.offsetParent === null && el.getClientRects().length === 0) return false;
    return true;
  });
}

export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  onEscape?: () => void,
): void {
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    // Remember who had focus so it can be handed back on close.
    restoreRef.current = (document.activeElement as HTMLElement | null) ?? null;

    // Move focus in on the next frame — the dialog's contents are mounted by
    // the same commit that flipped `active`, so the first focusable element may
    // not exist yet at effect time.
    const frame = window.requestAnimationFrame(() => {
      const first = focusableWithin(container)[0] ?? container;
      first.focus({ preventScroll: true });
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && onEscape) {
        event.preventDefault();
        onEscape();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = focusableWithin(container);
      if (focusable.length === 0) {
        event.preventDefault();
        container.focus({ preventScroll: true });
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement as HTMLElement | null;
      // Focus that escaped the dialog (or never entered) is pulled back in.
      if (!current || !container.contains(current)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus({ preventScroll: true });
        return;
      }
      if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown, true);
      const restore = restoreRef.current;
      restoreRef.current = null;
      // Only hand focus back if the opener is still on the page.
      if (restore && document.contains(restore)) restore.focus({ preventScroll: true });
    };
  }, [active, containerRef, onEscape]);
}
