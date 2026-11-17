"use client";

import { Button } from "@/components/ui/Button";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Scan, X } from "lucide-react";
import { pickPageElement } from "@/lib/scholly-page-guide";

export function SchollyInspector({ selecting, selected, instruction, cancel, onCancel, onSelect }: {
  selecting: boolean;
  selected: Element | null;
  instruction: string;
  cancel: string;
  onCancel: () => void;
  onSelect: (element: Element) => void;
}) {
  const outline = useRef<HTMLDivElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const callbacks = useRef({ onCancel, onSelect });
  useEffect(() => { callbacks.current = { onCancel, onSelect }; }, [onCancel, onSelect]);

  useEffect(() => {
    if (!selecting && !selected) return;
    const frame = outline.current;
    let target = selected;
    let point: { x: number; y: number } | null = null;
    let usingKeyboard = false;
    let pointerDown: { x: number; y: number } | null = null;

    function draw() {
      if (!frame) return;
      const bounds = target?.isConnected ? target.getBoundingClientRect() : null;
      frame.hidden = !bounds || !bounds.width || !bounds.height;
      if (!bounds || frame.hidden) return;
      frame.style.transform = `translate(${bounds.left}px, ${bounds.top}px)`;
      frame.style.width = `${bounds.width}px`;
      frame.style.height = `${bounds.height}px`;
    }

    function refresh() {
      if (selecting && point && !usingKeyboard) {
        target = pickPageElement(document.elementFromPoint(point.x, point.y));
      }
      draw();
    }

    function move(event: PointerEvent) {
      if (event.pointerType === "touch") return;
      usingKeyboard = false;
      point = { x: event.clientX, y: event.clientY };
      refresh();
    }

    function focus(event: FocusEvent) {
      usingKeyboard = true;
      target = pickPageElement(event.target);
      draw();
    }

    function inInspector(target: EventTarget | null) {
      return target instanceof Element && Boolean(target.closest(".sb-scholly-inspector"));
    }

    function down(event: PointerEvent) {
      if (inInspector(event.target)) return;
      event.stopImmediatePropagation();
      if (event.button !== 0) return;
      pointerDown = { x: event.clientX, y: event.clientY };
      if (event.pointerType !== "touch") event.preventDefault();
    }

    function up(event: PointerEvent) {
      const start = pointerDown;
      pointerDown = null;
      if (inInspector(event.target)) return;
      event.stopImmediatePropagation();
      if (!start || Math.hypot(start.x - event.clientX, start.y - event.clientY) > 12) return;
      const element = pickPageElement(document.elementFromPoint(event.clientX, event.clientY));
      // Disabled native controls can omit click entirely.
      if (element?.matches(":disabled")) {
        event.preventDefault();
        callbacks.current.onSelect(element);
      }
    }

    function click(event: MouseEvent) {
      if (inInspector(event.target)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const element = pickPageElement(event.target);
      if (element) callbacks.current.onSelect(element);
    }

    function key(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        callbacks.current.onCancel();
      } else if (["Enter", " "].includes(event.key) && !inInspector(event.target)) {
        const element = pickPageElement(event.target);
        if (!element && event.key === " ") return;
        event.preventDefault();
        event.stopImmediatePropagation();
        if (element) callbacks.current.onSelect(element);
      }
    }

    draw();
    window.addEventListener("scroll", refresh, { capture: true, passive: true });
    window.addEventListener("resize", refresh);
    if (selecting) {
      cancelButton.current?.focus({ preventScroll: true });
      window.addEventListener("pointermove", move, { passive: true });
      window.addEventListener("focusin", focus);
      window.addEventListener("pointerdown", down, true);
      window.addEventListener("pointerup", up, true);
      window.addEventListener("click", click, true);
      window.addEventListener("keydown", key, true);
    }
    return () => {
      window.removeEventListener("scroll", refresh, true);
      window.removeEventListener("resize", refresh);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("focusin", focus);
      window.removeEventListener("pointerdown", down, true);
      window.removeEventListener("pointerup", up, true);
      window.removeEventListener("click", click, true);
      window.removeEventListener("keydown", key, true);
    };
  }, [selecting, selected]);

  if (!selecting && !selected) return null;
  return createPortal(
    <div className="sb-scholly-inspector print:hidden" data-selecting={selecting || undefined}>
      <div className="sb-scholly-inspector-outline" aria-hidden="true" ref={outline} hidden />
      {selecting && <div className="sb-scholly-inspector-bar">
        <Scan size={18} aria-hidden />
        <span role="status" id="scholly-inspector-instruction">{instruction}</span>
        <Button variant="unstyled" ref={cancelButton} type="button" aria-describedby="scholly-inspector-instruction" onClick={onCancel}>
          <X size={15} aria-hidden />{cancel}
        </Button>
      </div>}
    </div>,
    document.body,
  );
}
