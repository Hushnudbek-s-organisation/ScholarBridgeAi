import assert from "node:assert/strict";
import { scheduleWhenIdle } from "../src/lib/idle";
// Fake clock: an idle browser is ready immediately; the minimum-delay contract
// must still wait, and unmount must cancel both timer and subsequent idle work.
const originalWindow = globalThis.window;
let nextId = 0;
const timers = new Map<number, { callback: () => void; delay: number }>();
const idle = new Map<number, () => void>();
const fake = {
  setTimeout(callback: () => void, delay: number) { const id = ++nextId; timers.set(id, { callback, delay }); return id; },
  clearTimeout(id: number) { timers.delete(id); },
  requestIdleCallback(callback: () => void) { const id = ++nextId; idle.set(id, callback); return id; },
  cancelIdleCallback(id: number) { idle.delete(id); },
};
Object.defineProperty(globalThis, "window", { configurable: true, value: fake });
try {
  let calls = 0;
  const cancel = scheduleWhenIdle(() => calls++, 3000, 3000);
  assert.equal(idle.size, 0); assert.equal(calls, 0);
  assert.equal([...timers.values()][0].delay, 3000);
  const timer = [...timers.values()][0]; timers.clear(); timer.callback();
  assert.equal(idle.size, 1); assert.equal(calls, 0);
  cancel(); assert.equal(idle.size, 0);
  const cancelBefore = scheduleWhenIdle(() => calls++, 3000, 3000);
  cancelBefore(); assert.equal(timers.size, 0); assert.equal(calls, 0);
  const cancelPlain = scheduleWhenIdle(() => calls++, 1000);
  assert.equal(idle.size, 1);
  const callback = [...idle.values()][0]; idle.clear(); callback();
  assert.equal(calls, 1); cancelPlain();
  console.log("Idle scheduling: 10 assertions passed (real minimum delay + both cancellation paths).");
} finally { Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow }); }
