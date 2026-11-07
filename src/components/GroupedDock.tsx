"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type KeyboardEvent,
} from "react";
import { House, Menu } from "lucide-react";
import { createPortal } from "react-dom";
import { Button } from "./ui/Button";

export interface DockGroup {
  id: string;
  label: string;
  shortLabel?: string;
  icon: ReactNode;
  active: boolean;
  count: number;
  content: ReactNode;
}
const focusable = 'a[href],button:not([disabled]),[tabindex="0"]';

/** Anchored disclosure navigation (not a menu). Bridge portal focus into dock order. */
export function GroupedDock({
  groups,
  dashboardLabel,
  dashboardShortLabel,
  dashboardActive,
  onDashboard,
  moreLabel,
  onMore,
}: {
  groups: DockGroup[];
  dashboardLabel: string;
  dashboardShortLabel?: string;
  dashboardActive: boolean;
  onDashboard: () => void;
  moreLabel: string;
  onMore: () => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [box, setBox] = useState({
    left: 0,
    bottom: 100,
    width: 340,
    maxHeight: 500,
  });
  const nav = useRef<HTMLElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const triggers = useRef(new Map<string, HTMLButtonElement>());
  const focusOnOpen = useRef(false);

  const close = useCallback((restore = false) => {
    const trigger = open ? triggers.current.get(open) : null;
    setOpen(null);
    if (restore) trigger?.focus();
  }, [open]);
  function panelItems() {
    return Array.from(
      panel.current?.querySelectorAll<HTMLElement>(focusable) ?? [],
    ).filter((el) => el.getClientRects().length);
  }
  function triggerKey(event: KeyboardEvent<HTMLButtonElement>, id: string) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (open === id) panelItems()[0]?.focus();
      else {
        focusOnOpen.current = true;
        setOpen(id);
      }
    } else if (
      event.key === "Tab" &&
      !event.shiftKey &&
      open === id &&
      panelItems().length
    ) {
      event.preventDefault();
      panelItems()[0].focus();
    }
  }

  useLayoutEffect(() => {
    const root=document.documentElement;
    const element=nav.current;
    const header=document.querySelector("[data-sb-shell-header]");
    if(!element)return;
    const measure=()=>{
      if(header)root.style.setProperty("--sb-header-height",`${Math.ceil(header.getBoundingClientRect().height)}px`);
      root.style.setProperty("--sb-dock-height",`${Math.ceil(element.getBoundingClientRect().height)}px`);
      const viewport=window.visualViewport;
      root.style.setProperty("--sb-keyboard-offset",`${viewport?Math.max(0,innerHeight-viewport.height-viewport.offsetTop):0}px`);
    };
    const observer=new ResizeObserver(measure);
    observer.observe(element);
    if(header)observer.observe(header);
    measure();
    window.visualViewport?.addEventListener("resize",measure);
    window.visualViewport?.addEventListener("scroll",measure);
    return ()=>{
      observer.disconnect();
      window.visualViewport?.removeEventListener("resize",measure);
      window.visualViewport?.removeEventListener("scroll",measure);
      root.style.removeProperty("--sb-dock-height");
      root.style.removeProperty("--sb-header-height");
      root.style.removeProperty("--sb-keyboard-offset");
    };
  },[]);

  useLayoutEffect(() => {
    if (!open) return;
    function update() {
      const rect = triggers.current.get(open!)?.getBoundingClientRect();
      if (!rect) return;
      const viewport=window.visualViewport;
      const leftEdge=viewport?.offsetLeft??0;
      const viewportWidth=viewport?.width??innerWidth;
      const width = Math.min(360, viewportWidth - 24);
      const bottom = innerHeight - rect.top + 12;
      setBox({
        left: Math.max(
          leftEdge + 12,
          Math.min(
            leftEdge + viewportWidth - width - 12,
            rect.left + rect.width / 2 - width / 2,
          ),
        ),
        bottom,
        width,
        maxHeight: Math.max(44, rect.top - (viewport?.offsetTop??0) - 24),
      });
    }
    update();
    if (focusOnOpen.current) {
      panelItems()[0]?.focus();
      focusOnOpen.current = false;
    }
    window.visualViewport?.addEventListener("resize",update);
    window.visualViewport?.addEventListener("scroll",update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.visualViewport?.removeEventListener("resize",update);
      window.visualViewport?.removeEventListener("scroll",update);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (
        !panel.current?.contains(event.target as Node) &&
        !nav.current?.contains(event.target as Node)
      )
        close();
    };
    const key = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(true);
      }
    };
    const focus = (event: FocusEvent) => {
      if (
        !panel.current?.contains(event.target as Node) &&
        !nav.current?.contains(event.target as Node)
      )
        close();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", key);
    document.addEventListener("focusin", focus);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", key);
      document.removeEventListener("focusin", focus);
    };
  }, [open, close]);

  const current = groups.find((group) => group.id === open);
  return (
    <>
      <nav
        ref={nav}
        data-testid="grouped-dock"
        aria-label={dashboardLabel}
        className="sb-grouped-dock print:hidden"
      >
        <a
          href="#dashboard"
          onClick={(event) => {
            event.preventDefault();
            close();
            onDashboard();
          }}
          aria-label={dashboardLabel}
          aria-current={dashboardActive ? "page" : undefined}
          className="sb-dock-trigger"
        >
          <House aria-hidden className="h-5 w-5"/>
          <span>{dashboardShortLabel??dashboardLabel}</span>
        </a>
        {groups.map((group, index) => (
          <Button
            key={group.id}
            ref={(element) => {
              if (element) triggers.current.set(group.id, element);
              else triggers.current.delete(group.id);
            }}
            variant="unstyled"
            aria-label={group.label}
            aria-expanded={open === group.id}
            aria-controls={`dock-panel-${group.id}`}
            data-active={group.active || undefined}
            onKeyDown={(event) => triggerKey(event, group.id)}
            onClick={() => setOpen(open === group.id ? null : group.id)}
            className={`sb-dock-trigger ${index > 1 ? "hidden md:flex" : "flex"}`}
          >
            {group.icon}
            <span>{group.shortLabel??group.label}</span>
            <span aria-hidden className="sb-dock-count tabular-nums">
              {group.count}
            </span>
          </Button>
        ))}
        <Button
          variant="unstyled"
          onClick={() => {
            close();
            onMore();
          }}
          className="sb-dock-trigger md:hidden"
        >
          <Menu aria-hidden className="h-5 w-5"/><span>{moreLabel}</span>
        </Button>
      </nav>
      {current &&
        createPortal(
          <div
            id={`dock-panel-${current.id}`}
            ref={panel}
            role="region"
            aria-label={current.label}
            style={{ position: "fixed", ...box }}
            className="sb-dock-popover print:hidden"
            onKeyDown={(event) => {
              if (event.key !== "Tab") return;
              const items = panelItems();
              if (event.shiftKey && document.activeElement === items[0]) {
                event.preventDefault();
                triggers.current.get(current.id)?.focus();
              } else if (
                !event.shiftKey &&
                document.activeElement === items.at(-1)
              ) {
                const navItems = Array.from(
                  nav.current?.querySelectorAll<HTMLElement>(focusable) ?? [],
                ).filter((el) => el.getClientRects().length);
                const index = navItems.indexOf(
                  triggers.current.get(current.id)!,
                );
                if (navItems[index + 1]) {
                  event.preventDefault();
                  close();
                  navItems[index + 1].focus();
                } else {
                  // Let the browser leave the final portal item normally.
                  // Returning to its trigger would create an endless Tab loop.
                  close();
                }
              }
            }}
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("button,a")) close();
            }}
          >
            <h2 className="px-3 py-2 text-sm font-bold">{current.label}</h2>
            {current.content}
          </div>,
          document.body,
        )}
    </>
  );
}
