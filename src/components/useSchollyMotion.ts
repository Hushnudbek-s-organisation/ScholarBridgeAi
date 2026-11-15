"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Higher values interrupt lower ones. Keep this order aligned with the
// companion contract: drag > shake > celebrate/proud > happy > point >
// talk/think > notice > wave > concern > look > sleep > idle.
export const SCHOLLY_MOTION_PRIORITY = {
  idle: 0, sleep: 1, look: 2, concern: 3, dock: 3, wave: 4, notice: 5,
  talk: 6, think: 6, point: 7, happy: 8, easter: 8,
  celebrate: 9, proud: 9, levelup: 9, shake: 10, drag: 11,
} as const;

const states = {
  idle: [SCHOLLY_MOTION_PRIORITY.idle, 0], sleep: [SCHOLLY_MOTION_PRIORITY.sleep, 0],
  look: [SCHOLLY_MOTION_PRIORITY.look, 0], concern: [SCHOLLY_MOTION_PRIORITY.concern, 800],
  wave: [SCHOLLY_MOTION_PRIORITY.wave, 900], notice: [SCHOLLY_MOTION_PRIORITY.notice, 350],
  talk: [SCHOLLY_MOTION_PRIORITY.talk, 1400], think: [SCHOLLY_MOTION_PRIORITY.think, 1400],
  point: [SCHOLLY_MOTION_PRIORITY.point, 1200], happy: [SCHOLLY_MOTION_PRIORITY.happy, 600],
  celebrate: [SCHOLLY_MOTION_PRIORITY.celebrate, 1500], proud: [SCHOLLY_MOTION_PRIORITY.proud, 2500],
  levelup: [SCHOLLY_MOTION_PRIORITY.levelup, 1000], shake: [SCHOLLY_MOTION_PRIORITY.shake, 1400],
  drag: [SCHOLLY_MOTION_PRIORITY.drag, 0], dock: [SCHOLLY_MOTION_PRIORITY.dock, 200],
  easter: [SCHOLLY_MOTION_PRIORITY.easter, 700],
} as const;

export type SchollyMotion = keyof typeof states;
type Options = { priority?: number; durationMs?: number };
type Cue = { name: SchollyMotion; priority: number };
type Controls = { setState(name: SchollyMotion, options?: Options): boolean };

export function canEnterSchollyMotion(name: SchollyMotion, requestedPriority: number, currentPriority: number, livePriority: number): boolean {
  return name === "idle" || requestedPriority >= Math.max(currentPriority, livePriority);
}

export function useSchollyMotion(live: SchollyMotion, quiet: boolean, docked: boolean) {
  const [cue, setCue] = useState<Cue | null>(null);
  const [sleeping, setSleeping] = useState(false);
  const [hidden, setHidden] = useState(false);
  const current = useRef<Cue | null>(null);
  const context = useRef({ live, quiet });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { context.current = { live, quiet }; }, [live, quiet]);

  const setState = useCallback((name: SchollyMotion, options: Options = {}) => {
    if (!Object.hasOwn(states, name)) return false;
    const { priority = states[name][0], durationMs = states[name][1] } = options;
    const active = context.current;
    if (active.quiet || !Number.isFinite(priority) || !Number.isFinite(durationMs)) return false;
    if (!canEnterSchollyMotion(name, priority, current.current?.priority ?? 0, states[active.live][0])) return false;
    if (timer.current) clearTimeout(timer.current);
    current.current = name === "idle" ? null : { name, priority };
    setCue(current.current);
    if (current.current && durationMs > 0) {
      timer.current = setTimeout(() => {
        current.current = null;
        setCue(null);
      }, Math.min(durationMs, 60_000));
    }
    return true;
  }, []);

  useEffect(() => {
    if (cue && (quiet || states[live][0] > cue.priority)) {
      if (timer.current) clearTimeout(timer.current);
      current.current = null;
      setCue(null);
    }
  }, [live, quiet, cue]);

  useEffect(() => {
    const target = window as Window & { scholly?: Controls };
    const previous = target.scholly;
    const controls = { setState };
    target.scholly = controls;
    const visibility = () => setHidden(document.hidden);
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      if (timer.current) clearTimeout(timer.current);
      if (target.scholly === controls) target.scholly = previous;
    };
  }, [setState]);

  useEffect(() => {
    if (!docked || quiet) {
      setSleeping(false);
      return;
    }
    const clock = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tashkent", hour: "numeric", hourCycle: "h23" });
    let lastActivity = Date.now();
    function check() {
      if (document.hidden) return;
      const hour = Number(clock.format(Date.now()));
      setSleeping(hour >= 22 || hour < 6 || Date.now() - lastActivity >= 300_000);
    }
    function interact() {
      if (Date.now() - lastActivity < 500) return;
      lastActivity = Date.now();
      check();
    }
    check();
    const interval = setInterval(check, 1000);
    const events = ["pointerdown", "pointermove", "keydown", "scroll"] as const;
    for (const event of events) window.addEventListener(event, interact, { passive: true, capture: true });
    return () => {
      clearInterval(interval);
      for (const event of events) window.removeEventListener(event, interact, true);
    };
  }, [docked, quiet]);

  const state = quiet ? "idle" : cue && cue.priority >= states[live][0] ? cue.name : live === "idle" && sleeping ? "sleep" : live;
  return { state, setState, hidden };
}
