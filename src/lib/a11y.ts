import type { KeyboardEvent } from "react";

/**
 * Props that make a clickable card reachable without a mouse.
 *
 * The dashboard stat cards and the forum thread rows are the primary way into
 * those sections, but they were `<div onClick>` — invisible to a keyboard and
 * announced as plain text by a screen reader (WCAG 2.1.1 Keyboard, 4.1.2 Name,
 * Role, Value). Spreading these props turns the existing element into a real
 * button for assistive technology without touching its styling or markup.
 *
 * ONLY use this on a container that holds no other interactive element:
 * `role="button"` must not wrap a `<button>` or `<a>` (that is invalid nesting
 * and confuses screen readers). Where a card does contain a control, make the
 * card itself a `<button>`/`<a>` instead.
 *
 * @param onActivate the same handler the element's onClick already uses
 * @param label      accessible name, when the card's visible text alone is not
 *                   a clear description of the action
 */
export function clickableCardProps(onActivate: () => void, label?: string) {
  return {
    role: "button" as const,
    tabIndex: 0,
    ...(label ? { "aria-label": label } : {}),
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      // Enter and Space activate a button; Space must not also scroll the page.
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onActivate();
      }
    },
  };
}
