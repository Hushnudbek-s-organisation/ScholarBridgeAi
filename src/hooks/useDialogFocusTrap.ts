"use client";

import { useEffect, type RefObject } from "react";

/** Shared keyboard/focus behaviour for modal dialogs. */
export function useDialogFocusTrap<T extends HTMLElement>(options: {
  open: boolean;
  dialogRef: RefObject<T | null>;
  onEscape?: () => void;
  lockScroll?: boolean;
}): void {
  const { open, dialogRef, onEscape, lockScroll = true } = options;

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    if (lockScroll) document.body.style.overflow = "hidden";

    const focusables = () => Array.from(dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter((element) => element.getAttribute("aria-hidden") !== "true" && element.getClientRects().length > 0);

    const focusInitial = window.requestAnimationFrame(() => {
      (focusables()[0] ?? dialog).focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && onEscape) {
        event.preventDefault();
        event.stopPropagation();
        onEscape();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    const onFocusIn = (event: FocusEvent) => {
      if (event.target instanceof Node && !dialog.contains(event.target)) {
        (focusables()[0] ?? dialog).focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("focusin", onFocusIn, true);
    return () => {
      window.cancelAnimationFrame(focusInitial);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("focusin", onFocusIn, true);
      if (lockScroll) document.body.style.overflow = previousOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [open, dialogRef, onEscape, lockScroll]);
}
